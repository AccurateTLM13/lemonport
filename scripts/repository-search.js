#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const POWERSHELL_SCRIPT = path.join(__dirname, 'repository-search.ps1');
const MAX_OUTPUT_CHARS = 200000;
const SKIP_DIRECTORIES = new Set(['.git', '.orchestration-local', 'node_modules']);

class SearchUnavailableError extends Error {
  constructor(causes) {
    super('all safe repository search methods failed');
    this.name = 'SearchUnavailableError';
    this.code = 'SEARCH_UNAVAILABLE';
    this.blocked = true;
    this.causes = causes;
  }
}

function boundedText(value) {
  const text = String(value || '');
  return text.length > MAX_OUTPUT_CHARS ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n[truncated]` : text;
}

function normalizeTarget(root, requestedPath = '.') {
  const repoRoot = path.resolve(root || ROOT);
  const target = path.resolve(repoRoot, requestedPath || '.');
  if (target !== repoRoot && !target.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error('search path must remain inside the repository root');
  }
  return { repoRoot, target, relativeTarget: path.relative(repoRoot, target) || '.' };
}

function isUnavailable(error) {
  return error && ['ENOENT', 'EACCES', 'EPERM', 'ENOEXEC'].includes(error.code);
}

function execute(command, args, options, runner) {
  try {
    return runner(command, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      shell: false,
      maxBuffer: MAX_OUTPUT_CHARS,
      ...options
    });
  } catch (error) {
    return { status: null, signal: null, stdout: '', stderr: '', error };
  }
}

function commandFailure(method, result) {
  const error = result && result.error;
  if (isUnavailable(error)) return { method, available: false, reason: error.code };
  const detail = boundedText(result && result.stderr).trim() || (error ? error.message : `exit ${result && result.status}`);
  return { method, available: true, reason: detail };
}

function commandSuccess(method, command, args, result) {
  const output = boundedText(result.stdout);
  return {
    status: 'PASS',
    method,
    command: [command, ...args],
    output,
    truncated: output.endsWith('[truncated]')
  };
}

function tryCommand(method, command, args, options, runner) {
  const result = execute(command, args, options, runner);
  if (!result.error && (result.status === 0 || (method === 'rg' || method === 'git-grep') && result.status === 1)) {
    return commandSuccess(method, command, args, result);
  }
  return { failure: commandFailure(method, result) };
}

function globToRegExp(glob) {
  const escaped = String(glob || '*')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function nodeSearch({ target, relativeTarget, pattern, glob, regex = false, fileSystem = fs }) {
  const matcher = regex ? new RegExp(pattern, 'm') : null;
  const globMatcher = globToRegExp(glob);
  const matches = [];
  const failures = [];

  function visit(current) {
    let entries;
    try {
      entries = fileSystem.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      failures.push(`${current}: ${error.message}`);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = path.relative(target, absolute).replace(/\\/g, '/');
      if (!globMatcher.test(relative)) continue;
      let content;
      try {
        content = fileSystem.readFileSync(absolute, 'utf8');
      } catch (error) {
        failures.push(`${absolute}: ${error.message}`);
        continue;
      }
      content.split(/\r?\n/).forEach((line, index) => {
        const found = matcher ? matcher.test(line) : line.includes(pattern);
        if (found) matches.push(`${path.relative(ROOT, absolute).replace(/\\/g, '/')}:${index + 1}:${line}`);
      });
    }
  }

  visit(target);
  if (failures.length && !matches.length) {
    const error = new Error(failures.slice(0, 5).join('\n'));
    error.code = 'SEARCH_READ_FAILED';
    throw error;
  }
  const output = matches.join('\n');
  return {
    status: 'PASS',
    method: 'node',
    command: ['node', 'filesystem traversal'],
    output: boundedText(output),
    truncated: output.length > MAX_OUTPUT_CHARS,
    warnings: failures.slice(0, 5),
    relativeTarget
  };
}

function searchRepository(options = {}) {
  const root = options.root || ROOT;
  const pattern = typeof options.pattern === 'string' ? options.pattern : '';
  if (!pattern) throw new Error('search requires a non-empty pattern');
  const glob = options.glob || '*';
  const regex = options.regex === true;
  const platform = options.platform || process.platform;
  const runner = options.runner || spawnSync;
  const { repoRoot, target, relativeTarget } = normalizeTarget(root, options.path || '.');
  const failures = [];
  const rgCommand = platform === 'win32' ? 'rg.exe' : 'rg';
  const rgArgs = ['--line-number', '--with-filename', '--no-heading', '--color', 'never', '--glob', glob, '--', pattern, target];
  const rg = tryCommand('rg', rgCommand, rgArgs, { cwd: repoRoot }, runner);
  if (!rg.failure) return { ...rg, relativeTarget };
  failures.push(rg.failure);

  const gitArgs = ['-C', repoRoot, 'grep', '--line-number', '--no-color', regex ? '--extended-regexp' : '--fixed-strings', '--', pattern];
  if (relativeTarget !== '.') gitArgs.push(relativeTarget);
  const git = tryCommand('git-grep', 'git', gitArgs, { cwd: repoRoot }, runner);
  if (!git.failure) return { ...git, relativeTarget };
  failures.push(git.failure);

  if (platform === 'win32') {
    const powershell = options.powershellCommand || 'powershell.exe';
    const powershellArgs = [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', POWERSHELL_SCRIPT,
      '-Root', target,
      '-Pattern', pattern,
      '-Glob', glob
    ];
    if (regex) powershellArgs.push('-Regex');
    const ps = tryCommand('powershell-select-string', powershell, powershellArgs, { cwd: repoRoot }, runner);
    if (!ps.failure) return { ...ps, relativeTarget };
    failures.push(ps.failure);
  }

  try {
    return nodeSearch({ target, relativeTarget, pattern, glob, regex, fileSystem: options.fileSystem || fs });
  } catch (error) {
    failures.push({ method: 'node', available: true, reason: error.message });
  }
  throw new SearchUnavailableError(failures);
}

function parseArgs(argv) {
  const args = { path: '.', glob: '*', regex: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--regex') {
      args.regex = true;
    } else if (token === '--pattern' || token === '--path' || token === '--glob') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${token} requires a value`);
      args[token.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`unknown argument: ${token}`);
    }
  }
  if (!args.pattern) throw new Error('--pattern is required');
  return args;
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(searchRepository(parseArgs(process.argv.slice(2))))}\n`);
  } catch (error) {
    const payload = {
      status: error.blocked ? 'BLOCKED' : 'ERROR',
      code: error.code || 'SEARCH_FAILED',
      reason: error.message,
      causes: error.causes || []
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
    process.exitCode = error.blocked ? 2 : 1;
  }
}

module.exports = {
  ROOT,
  SearchUnavailableError,
  normalizeTarget,
  nodeSearch,
  searchRepository,
  parseArgs
};
