#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_DIR = path.join(ROOT, '.orchestration-local');
const ORCHESTRATE = path.join(ROOT, 'scripts', 'orchestrate.js');

const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_ESCALATION_MODEL = 'gpt-5.6-terra';
const DEFAULT_MAX_MODEL = 'gpt-5.6-luna';
const DEFAULT_PROVIDER = 'codex-cli';
const PROVIDERS = new Set(['codex-cli', 'openai-api']);
const MODEL_RANK = {
  'gpt-5.6-luna': 1,
  'gpt-5.6-terra': 2
};
const SUPPORTED_MODELS = new Set(Object.keys(MODEL_RANK));

const ORCHESTRATOR_PROVIDER = (process.env.ORCHESTRATOR_PROVIDER || DEFAULT_PROVIDER).trim();
const REVIEWER_PROVIDER = (process.env.REVIEWER_PROVIDER || DEFAULT_PROVIDER).trim();
const WORKER_PROVIDER = (process.env.WORKER_PROVIDER || DEFAULT_PROVIDER).trim();
const CONFIGURED_MODEL = (process.env.ORCHESTRATOR_MODEL || DEFAULT_MODEL).trim();
const CONFIGURED_REVIEWER_MODEL = (process.env.REVIEWER_MODEL || DEFAULT_MODEL).trim();
const WORKER_MODEL = (process.env.WORKER_MODEL || DEFAULT_MODEL).trim();
const ESCALATION_MODEL = (process.env.ORCHESTRATOR_ESCALATION_MODEL || DEFAULT_ESCALATION_MODEL).trim();
const MAX_MODEL = (process.env.ORCHESTRATOR_MAX_MODEL || DEFAULT_MAX_MODEL).trim();
const REASONING = (process.env.ORCHESTRATOR_REASONING || 'high').trim();
const MAX_REPAIRS = Number(process.env.ORCHESTRATOR_MAX_REPAIRS || 2);
const MAX_DIFF_CHARS = Number(process.env.ORCHESTRATOR_MAX_DIFF_CHARS || 120000);
const MAX_CODEX_OUTPUT_CHARS = Number(process.env.ORCHESTRATOR_MAX_CODEX_OUTPUT_CHARS || 2000000);
const API_TIMEOUT_MS = Number(process.env.ORCHESTRATOR_API_TIMEOUT_MS || 120000);
const CODEX_TIMEOUT_MS = Number(process.env.ORCHESTRATOR_CODEX_TIMEOUT_MS || 1800000);
const MAX_REASON_CHARS = 20000;

let ACTIVE_PLANNER_MODEL = null;
let ACTIVE_REVIEWER_MODEL = null;
let CLI_INFO = null;
let INVOCATION_COUNTER = 0;

function die(message) {
  console.error(`orchestrator-adapter: ${message}`);
  process.exit(1);
}

function validateBoundedInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    die(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}

function validateProvider(value, name) {
  if (!PROVIDERS.has(value)) {
    die(`${name} must be one of ${[...PROVIDERS].join(', ')}`);
  }
}

function validateModel(value, name) {
  if (!SUPPORTED_MODELS.has(value)) {
    die(`${name} must be one of ${[...SUPPORTED_MODELS].join(', ')}; gpt-5.6-sol and unknown models are prohibited`);
  }
}

function configureModel(explicitEscalation) {
  validateProvider(ORCHESTRATOR_PROVIDER, 'ORCHESTRATOR_PROVIDER');
  validateProvider(REVIEWER_PROVIDER, 'REVIEWER_PROVIDER');
  validateProvider(WORKER_PROVIDER, 'WORKER_PROVIDER');
  if (WORKER_PROVIDER !== 'codex-cli') {
    die('WORKER_PROVIDER must be codex-cli; worker execution is never routed through the Responses API');
  }

  validateModel(CONFIGURED_MODEL, 'ORCHESTRATOR_MODEL');
  validateModel(CONFIGURED_REVIEWER_MODEL, 'REVIEWER_MODEL');
  validateModel(WORKER_MODEL, 'WORKER_MODEL');
  validateModel(ESCALATION_MODEL, 'ORCHESTRATOR_ESCALATION_MODEL');
  validateModel(MAX_MODEL, 'ORCHESTRATOR_MAX_MODEL');

  if (!explicitEscalation) {
    if (MODEL_RANK[CONFIGURED_MODEL] > MODEL_RANK[MAX_MODEL]) {
      die('ORCHESTRATOR_MODEL exceeds ORCHESTRATOR_MAX_MODEL');
    }
    if (MODEL_RANK[CONFIGURED_REVIEWER_MODEL] > MODEL_RANK[MAX_MODEL]) {
      die('REVIEWER_MODEL exceeds ORCHESTRATOR_MAX_MODEL');
    }
    if (CONFIGURED_MODEL !== DEFAULT_MODEL) {
      die('higher-cost ORCHESTRATOR_MODEL values require the explicit --escalate path');
    }
    if (CONFIGURED_REVIEWER_MODEL !== DEFAULT_MODEL) {
      die('higher-cost REVIEWER_MODEL values require the explicit --escalate path');
    }
    ACTIVE_PLANNER_MODEL = CONFIGURED_MODEL;
    ACTIVE_REVIEWER_MODEL = CONFIGURED_REVIEWER_MODEL;
  } else {
    ACTIVE_PLANNER_MODEL = ESCALATION_MODEL;
    ACTIVE_REVIEWER_MODEL = ESCALATION_MODEL;
  }
}

function ensureLocalDir() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

function redactText(value) {
  let output = String(value);
  const secrets = Object.entries(process.env)
    .filter(([name, secret]) => /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name) && typeof secret === 'string' && secret.length >= 8)
    .map(([, secret]) => secret);
  for (const secret of secrets) output = output.split(secret).join('[REDACTED]');
  return output;
}

function writeAudit(name, value) {
  ensureLocalDir();
  const output = typeof value === 'string'
    ? redactText(value)
    : `${JSON.stringify(value, (key, child) => typeof child === 'string' ? redactText(child) : child, 2)}\n`;
  fs.writeFileSync(path.join(LOCAL_DIR, name), output);
}

function boundedText(value, limit) {
  const text = String(value || '');
  return text.length > limit ? `${text.slice(0, limit)}\n[truncated]` : text;
}

function runNode(args, options = {}) {
  try {
    return execFileSync(process.execPath, [ORCHESTRATE, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
      ...options
    }).trim();
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message;
    die(detail || `failed: node scripts/orchestrate.js ${args.join(' ')}`);
  }
}

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
  } catch (error) {
    return `[git unavailable: ${error.message}]`;
  }
}

function argsFrom(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function readConfiguredCodexPath() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const configPath = path.join(codexHome, 'config.toml');
  if (!fs.existsSync(configPath)) return null;
  const config = fs.readFileSync(configPath, 'utf8');
  const match = config.match(/^\s*CODEX_CLI_PATH\s*=\s*(['"])(.*?)\1\s*$/mi);
  return match ? match[2].trim() : null;
}

function windowsCodexCandidates(localAppData = process.env.LOCALAPPDATA, appData = process.env.APPDATA) {
  const candidates = [];
  if (localAppData) {
    const binRoot = path.join(localAppData, 'OpenAI', 'Codex', 'bin');
    if (fs.existsSync(binRoot)) {
      for (const entry of fs.readdirSync(binRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(binRoot, entry.name, 'codex.exe');
        if (fs.existsSync(candidate)) candidates.push(candidate);
      }
    }
  }
  if (appData) {
    const npmWrapper = path.join(appData, 'npm', 'codex.cmd');
    if (fs.existsSync(npmWrapper)) candidates.push(npmWrapper);
  }
  return candidates;
}

function pathCandidatesFromPath(pathValue = process.env.PATH, executableName = 'codex') {
  if (!pathValue) return [];
  const candidates = [];
  for (const directory of pathValue.split(path.delimiter)) {
    if (!directory) continue;
    const names = process.platform === 'win32' ? [`${executableName}.exe`, `${executableName}.cmd`, executableName] : [executableName];
    for (const name of names) {
      const candidate = path.join(directory, name);
      if (fs.existsSync(candidate)) candidates.push(candidate);
    }
  }
  return candidates;
}

function chooseCodexCandidate({ explicit = null, configured = null, candidates = [] }) {
  const preferred = explicit || configured;
  if (preferred) return { path: preferred, source: explicit ? 'CODEX_CLI_PATH' : 'CODEX_HOME/config.toml' };
  const unique = [...new Set(candidates.map((value) => path.resolve(value)))];
  if (unique.length === 1) return { path: unique[0], source: 'deterministic-default' };
  if (!unique.length) throw new Error('no Codex CLI executable found; set CODEX_CLI_PATH to an executable Codex CLI path');
  throw new Error(`conflicting Codex CLI installations found (${unique.join(', ')}); set CODEX_CLI_PATH explicitly`);
}

function normaliseCodexExecutable(selected) {
  const selectedPath = path.resolve(selected.path);
  if (!fs.existsSync(selectedPath)) throw new Error(`configured Codex CLI executable does not exist: ${selectedPath}`);
  const extension = path.extname(selectedPath).toLowerCase();
  if (extension === '.js') {
    return { command: process.execPath, argsPrefix: [selectedPath], configuredPath: selectedPath, source: selected.source };
  }
  if (extension === '.cmd' || extension === '.bat') {
    const script = path.join(path.dirname(selectedPath), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (!fs.existsSync(script)) {
      throw new Error(`Codex wrapper ${selectedPath} has no adjacent @openai/codex script; set CODEX_CLI_PATH to the native codex.exe`);
    }
    return { command: process.execPath, argsPrefix: [script], configuredPath: selectedPath, source: selected.source };
  }
  return { command: selectedPath, argsPrefix: [], configuredPath: selectedPath, source: selected.source };
}

function resolveCodexExecutable(options = {}) {
  const explicit = options.explicit === undefined ? (process.env.CODEX_CLI_PATH || null) : options.explicit;
  const configured = options.configured === undefined ? readConfiguredCodexPath() : options.configured;
  const candidates = options.candidates || (process.platform === 'win32'
    ? windowsCodexCandidates()
    : pathCandidatesFromPath());
  const selected = chooseCodexCandidate({ explicit, configured, candidates });
  return normaliseCodexExecutable(selected);
}

function safeCliEnvironment() {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (/(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name)) delete env[name];
  }
  return env;
}

function getCodexVersion(info, runner = spawnSync) {
  const result = runner(info.command, [...info.argsPrefix, '--version'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: safeCliEnvironment(),
    timeout: 30000,
    maxBuffer: 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Codex CLI version check failed for ${info.configuredPath}: ${result.error ? result.error.message : boundedText(result.stderr, 2000)}`);
  }
  const version = boundedText(result.stdout, 2000).trim();
  if (!version) throw new Error(`Codex CLI returned no version for ${info.configuredPath}`);
  return version;
}

function ensureCliInfo() {
  if (CLI_INFO) return CLI_INFO;
  const info = resolveCodexExecutable();
  const version = getCodexVersion(info);
  CLI_INFO = { ...info, actualExecutable: [info.command, ...info.argsPrefix].join(' '), version };
  return CLI_INFO;
}

function parseCodexArgs() {
  let prefix;
  try {
    prefix = process.env.CODEX_ARGS_JSON ? JSON.parse(process.env.CODEX_ARGS_JSON) : ['exec'];
  } catch (error) {
    die(`CODEX_ARGS_JSON must be valid JSON: ${error.message}`);
  }
  if (!Array.isArray(prefix) || prefix.length !== 1 || prefix[0] !== 'exec') {
    die('CODEX_ARGS_JSON is restricted to ["exec"] so the adapter can enforce model, sandbox, and output safety');
  }
  return prefix;
}

function buildCodexArgs({ role, model, sandbox, schemaPath = null, outputPath = null }) {
  const args = [
    ...parseCodexArgs(),
    '--model', model,
    '--sandbox', sandbox,
    '--ephemeral',
    '--ignore-user-config',
    '--cd', ROOT,
    '--color', 'never'
  ];
  args.push('-c', sandbox === 'workspace-write' ? 'approval_policy="on-request"' : 'approval_policy="never"');
  if (schemaPath) args.push('--output-schema', schemaPath);
  if (outputPath) args.push('--output-last-message', outputPath);
  args.push('-');
  return args;
}

function invocationMeta({ role, provider, model, result, finalOutput = '', finalOutputTruncated = false, cliInfo = CLI_INFO }) {
  return {
    role,
    provider,
    requestedModel: model,
    verdict: null,
    actualExecutable: provider === 'codex-cli' && cliInfo ? cliInfo.actualExecutable : null,
    codexCliVersion: provider === 'codex-cli' && cliInfo ? cliInfo.version : null,
    exitStatus: result && result.status !== undefined ? result.status : null,
    signal: result ? result.signal || null : null,
    stdout: boundedText(result && result.stdout, MAX_CODEX_OUTPUT_CHARS),
    stderr: boundedText(result && result.stderr, MAX_CODEX_OUTPUT_CHARS),
    stdoutTruncated: Boolean(result && result.stdout && String(result.stdout).length > MAX_CODEX_OUTPUT_CHARS),
    stderrTruncated: Boolean(result && result.stderr && String(result.stderr).length > MAX_CODEX_OUTPUT_CHARS),
    finalOutput: boundedText(finalOutput, MAX_CODEX_OUTPUT_CHARS),
    finalOutputTruncated,
    error: result && result.error ? result.error.message || String(result.error) : null,
    timedOut: Boolean(result && result.error && result.error.code === 'ETIMEDOUT')
  };
}

function cliFailureMessage(role, model, result) {
  const detail = boundedText(`${result && result.error ? result.error.message || result.error : ''}\n${result && result.stderr ? result.stderr : ''}\n${result && result.stdout ? result.stdout : ''}`, 4000).trim();
  if (/(model|deployment).*(not found|not available|unavailable|unknown|unsupported)|unknown.*model|invalid.*model/i.test(detail)) {
    return `${role} requested Codex CLI model ${model}, but that model is unavailable; no fallback was selected. ${detail}`.trim();
  }
  if (result && result.error && result.error.code === 'ETIMEDOUT') {
    return `${role} Codex CLI invocation timed out after ${CODEX_TIMEOUT_MS}ms`;
  }
  return `${role} Codex CLI invocation failed with exit status ${result && result.status !== null ? result.status : 'unknown'}: ${detail || 'no diagnostic output'}`;
}

function parseStructuredJson(text, label) {
  const bounded = boundedText(text, MAX_CODEX_OUTPUT_CHARS).trim();
  if (!bounded) throw new Error(`${label} returned no structured output`);
  try {
    return JSON.parse(bounded);
  } catch (error) {
    throw new Error(`${label} returned malformed structured output: ${error.message}`);
  }
}

function invokeCodexCli({ role, model, instructions, input, schemaName, schema, timeoutMs = CODEX_TIMEOUT_MS, runner = spawnSync, cliInfo = null }) {
  const info = cliInfo || ensureCliInfo();
  ensureLocalDir();
  const id = `${role}-${Date.now()}-${INVOCATION_COUNTER += 1}`;
  const schemaPath = path.join(LOCAL_DIR, `${id}.schema.json`);
  const outputPath = path.join(LOCAL_DIR, `${id}.output.json`);
  fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
  const prompt = [
    instructions,
    'Return exactly one JSON object matching the supplied output schema.',
    'Do not return markdown, commentary, status text, or additional keys.',
    'INPUT_JSON_BEGIN',
    input,
    'INPUT_JSON_END'
  ].join('\n');
  const args = buildCodexArgs({ role, model, sandbox: 'read-only', schemaPath, outputPath });
  const result = runner(info.command, [...info.argsPrefix, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: safeCliEnvironment(),
    input: prompt,
    timeout: timeoutMs,
    killSignal: 'SIGTERM',
    maxBuffer: MAX_CODEX_OUTPUT_CHARS
  });
  let finalOutput = '';
  if (fs.existsSync(outputPath)) finalOutput = fs.readFileSync(outputPath, 'utf8');
  const meta = invocationMeta({
    role,
    provider: 'codex-cli',
    model,
    result,
    finalOutput,
    finalOutputTruncated: finalOutput.length > MAX_CODEX_OUTPUT_CHARS,
    cliInfo: info
  });
  writeAudit(`${id}.audit.json`, meta);
  if (result.error || result.status !== 0) throw new Error(cliFailureMessage(role, model, result));
  if (!finalOutput) throw new Error(`${role} Codex CLI invocation succeeded without an output-last-message file`);
  return { output: parseStructuredJson(finalOutput, role), invocation: meta };
}

function extractResponseText(data) {
  if (!data || typeof data !== 'object') throw new Error('Responses API returned a malformed response');
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const pieces = [];
  for (const item of Array.isArray(data.output) ? data.output : []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') pieces.push(content.text);
    }
  }
  if (!pieces.length) throw new Error('Responses API returned no output text');
  return pieces.join('\n').trim();
}

async function openAIJson({ role, model, instructions, input, schemaName, schema }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) throw new Error(`OPENAI_API_KEY is required only when ${role} provider is openai-api`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: REASONING },
        store: false,
        instructions,
        input,
        text: {
          format: {
            type: 'json_schema',
            name: schemaName,
            strict: true,
            schema
          }
        }
      }),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error && error.name === 'AbortError') throw new Error(`Responses API request timed out after ${API_TIMEOUT_MS}ms`);
    throw error;
  }

  let bodyText;
  try {
    bodyText = await response.text();
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error(`Responses API request timed out after ${API_TIMEOUT_MS}ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const metaResult = { status: response.status, signal: null, stdout: '', stderr: response.ok ? '' : bodyText };
  const meta = invocationMeta({ role, provider: 'openai-api', model, result: metaResult });
  if (!response.ok) throw new Error(`Responses API ${response.status}: ${boundedText(bodyText, MAX_CODEX_OUTPUT_CHARS)}`);
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (error) {
    throw new Error(`Responses API returned invalid JSON: ${error.message}`);
  }
  let output;
  try {
    output = parseStructuredJson(extractResponseText(data), role);
  } catch (error) {
    throw new Error(`${role} Responses API returned invalid structured output: ${error.message}`);
  }
  return { output, responseId: data.id, usage: data.usage || null, invocation: meta };
}

async function invokeStructured(options) {
  const { provider } = options;
  if (provider === 'codex-cli') return invokeCodexCli(options);
  if (provider === 'openai-api') return openAIJson(options);
  throw new Error(`unsupported structured provider: ${provider}`);
}

const taskSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: { type: 'string' },
    worker: { type: 'string' },
    mission: { type: 'string' },
    currentState: { type: 'string' },
    inScope: { type: 'array', items: { type: 'string' } },
    outOfScope: { type: 'array', items: { type: 'string' } },
    requirements: { type: 'array', items: { type: 'string' } },
    acceptanceCriteria: { type: 'array', items: { type: 'string' } },
    verification: { type: 'array', items: { type: 'string' } },
    evidenceRequired: { type: 'array', items: { type: 'string' } },
    stopConditions: { type: 'array', items: { type: 'string' } },
    codexPrompt: { type: 'string' }
  },
  required: [
    'taskId', 'worker', 'mission', 'currentState', 'inScope', 'outOfScope',
    'requirements', 'acceptanceCriteria', 'verification', 'evidenceRequired',
    'stopConditions', 'codexPrompt'
  ]
};

const reviewSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'REPAIR', 'BLOCKED', 'HUMAN_DECISION'] },
    summary: { type: 'string' },
    reason: { type: 'string' },
    designRequired: { type: ['boolean', 'null'] },
    repairInstructions: { type: 'array', items: { type: 'string' } },
    humanQuestion: { type: ['string', 'null'] }
  },
  required: ['verdict', 'summary', 'reason', 'designRequired', 'repairInstructions', 'humanQuestion']
};

function validateTaskContract(output, packet) {
  const requiredStrings = ['taskId', 'worker', 'mission', 'currentState', 'codexPrompt'];
  const arrayFields = ['inScope', 'outOfScope', 'requirements', 'acceptanceCriteria', 'verification', 'evidenceRequired', 'stopConditions'];
  if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('planner returned a non-object task contract');
  if (Object.keys(output).length !== taskSchema.required.length || Object.keys(output).some((key) => !taskSchema.required.includes(key))) {
    throw new Error('planner returned an unexpected task contract shape');
  }
  if (requiredStrings.some((key) => typeof output[key] !== 'string' || !output[key].trim())) {
    throw new Error('planner returned empty or invalid task contract fields');
  }
  if (arrayFields.some((key) => !Array.isArray(output[key]) || output[key].some((item) => typeof item !== 'string'))) {
    throw new Error('planner returned invalid task contract arrays');
  }
  if (output.worker !== packet.state.currentWorker.worker) {
    throw new Error('planner task contract worker does not match the runtime packet');
  }
}

async function createContract(packet, repairContext = null) {
  const instructions = [
    'You are the Lemonteed orchestration planner.',
    'You are read-only. Convert the supplied runtime packet into one tightly-scoped Codex work order and do not edit files.',
    'Preserve repository constraints and worker boundaries. Do not broaden scope.',
    'Never instruct Codex to deploy, merge, push, publish, or change public Lemonteed architecture; owner approval remains required.',
    'The codexPrompt must be complete enough to execute without the human re-explaining context.',
    'Require concrete evidence, exact commands, changed files, and explicit stop conditions.',
    repairContext ? 'This is a repair pass. Address only the reviewer-identified failures; preserve already-correct work.' : ''
  ].filter(Boolean).join('\n');

  const input = JSON.stringify({ packet, repairContext }, null, 2);
  const planned = await invokeStructured({
    role: 'planner',
    provider: ORCHESTRATOR_PROVIDER,
    model: ACTIVE_PLANNER_MODEL,
    instructions,
    input,
    schemaName: 'lemonteed_codex_task',
    schema: taskSchema
  });
  validateTaskContract(planned.output, packet);
  return planned;
}

function readText(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}

function workerPrompt(contract) {
  const workerPath = path.join('agents', 'workers', contract.worker);
  return [
    'You are the Lemonteed Codex worker. Execute only the task contract below.',
    'You may modify repository files within the contract scope using the workspace-write sandbox.',
    'You must not deploy, merge, push, publish, alter remote branches, or expose secrets.',
    'Do not decide PASS. Return the required worker result and evidence; the separate reviewer owns the verdict.',
    'TASK_CONTRACT_BEGIN',
    JSON.stringify(contract, null, 2),
    'TASK_CONTRACT_END',
    'REPOSITORY_INSTRUCTIONS_BEGIN',
    readText('AGENTS.md'),
    readText('AGENT_RULES.md'),
    readText('agents/runtime/TASK_CONTRACT.md'),
    readText(workerPath),
    'REPOSITORY_INSTRUCTIONS_END'
  ].join('\n');
}

function executeCodex(contract, runner = spawnSync, cliInfo = null) {
  const info = cliInfo || ensureCliInfo();
  const id = `worker-${Date.now()}-${INVOCATION_COUNTER += 1}`;
  const outputPath = path.join(LOCAL_DIR, `${id}.output.txt`);
  const args = buildCodexArgs({ role: 'worker', model: WORKER_MODEL, sandbox: 'workspace-write', outputPath });
  const result = runner(info.command, [...info.argsPrefix, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: safeCliEnvironment(),
    input: workerPrompt(contract),
    maxBuffer: MAX_CODEX_OUTPUT_CHARS,
    timeout: CODEX_TIMEOUT_MS,
    killSignal: 'SIGTERM'
  });
  const finalOutput = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  return {
    exitCode: result.status,
    signal: result.signal || null,
    stdout: boundedText(result.stdout, MAX_CODEX_OUTPUT_CHARS),
    stderr: boundedText(result.stderr, MAX_CODEX_OUTPUT_CHARS),
    stdoutTruncated: Boolean(result.stdout && String(result.stdout).length > MAX_CODEX_OUTPUT_CHARS),
    stderrTruncated: Boolean(result.stderr && String(result.stderr).length > MAX_CODEX_OUTPUT_CHARS),
    finalOutput: boundedText(finalOutput, MAX_CODEX_OUTPUT_CHARS),
    finalOutputTruncated: finalOutput.length > MAX_CODEX_OUTPUT_CHARS,
    error: result.error ? result.error.message : null,
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
    role: 'worker',
    provider: WORKER_PROVIDER,
    requestedModel: WORKER_MODEL,
    actualExecutable: info.actualExecutable,
    codexCliVersion: info.version,
    exitStatus: result.status,
    invocationExitStatus: result.status,
    verdict: null
  };
}

function collectUntrackedEvidence() {
  const listed = git('ls-files', '--others', '--exclude-standard');
  if (listed.startsWith('[git unavailable:')) {
    return { untrackedFiles: [], untrackedUnavailable: true, untrackedTruncated: false };
  }

  const names = listed.split('\n').filter(Boolean);
  const untrackedTruncated = names.length > 50;
  const untrackedFiles = [];
  for (const name of names.slice(0, 50)) {
    const absolute = path.resolve(ROOT, name);
    if (!absolute.startsWith(`${ROOT}${path.sep}`)) {
      untrackedFiles.push({ path: name, unavailable: true });
      continue;
    }
    try {
      const realPath = fs.realpathSync(absolute);
      const relativeRealPath = path.relative(ROOT, realPath);
      if (relativeRealPath.startsWith('..') || path.isAbsolute(relativeRealPath)) {
        untrackedFiles.push({ path: name, unavailable: true });
        continue;
      }
      const stats = fs.statSync(realPath);
      if (!stats.isFile() || stats.size > MAX_DIFF_CHARS) {
        untrackedFiles.push({ path: name, size: stats.size, truncated: true });
        continue;
      }
      const content = fs.readFileSync(realPath, 'utf8');
      untrackedFiles.push({ path: name, size: stats.size, content });
    } catch {
      untrackedFiles.push({ path: name, unavailable: true });
    }
  }
  return { untrackedFiles, untrackedUnavailable: false, untrackedTruncated };
}

function collectEvidence() {
  const diff = git('diff', 'HEAD', '--', '.', ':(exclude)agents/runtime/state.json');
  const diffTruncated = diff.length > MAX_DIFF_CHARS;
  const status = git('status', '--short');
  const implementationStatus = status.startsWith('[git unavailable:')
    ? status
    : status.split('\n').filter(Boolean).filter((line) => !line.endsWith(' agents/runtime/state.json') && !line.includes('.orchestration-local/')).join('\n');
  const untrackedEvidence = collectUntrackedEvidence();
  return {
    branch: git('branch', '--show-current'),
    head: git('rev-parse', 'HEAD'),
    status,
    implementationStatus,
    diffCheck: git('diff', 'HEAD', '--check', '--', '.', ':(exclude)agents/runtime/state.json') || 'clean',
    diffStat: git('diff', 'HEAD', '--stat', '--', '.', ':(exclude)agents/runtime/state.json'),
    diffTruncated,
    diff: diffTruncated ? `${diff.slice(0, MAX_DIFF_CHARS)}\n[diff truncated]` : diff,
    ...untrackedEvidence
  };
}

function evidenceIsComplete(evidence) {
  const unavailable = (value) => typeof value === 'string' && value.startsWith('[git unavailable:');
  return ['branch', 'head', 'status', 'implementationStatus', 'diffCheck', 'diffStat', 'diff']
    .every((key) => !unavailable(evidence[key])) &&
    !evidence.diffTruncated &&
    !evidence.untrackedUnavailable &&
    !evidence.untrackedTruncated &&
    !evidence.untrackedFiles.some((file) => file.unavailable || file.truncated) &&
    Boolean(evidence.branch) &&
    Boolean(evidence.head);
}

function codexSucceeded(result) {
  return result && result.exitCode === 0 && !result.signal && !result.error && !result.timedOut && !result.stdoutTruncated && !result.stderrTruncated;
}

function validateReview(review, packet) {
  const validVerdicts = new Set(['PASS', 'REPAIR', 'BLOCKED', 'HUMAN_DECISION']);
  if (!review || typeof review !== 'object' || Array.isArray(review)) throw new Error('reviewer returned a non-object verdict');
  if (Object.keys(review).length !== reviewSchema.required.length || Object.keys(review).some((key) => !reviewSchema.required.includes(key))) {
    throw new Error('reviewer returned an unexpected verdict shape');
  }
  if (!validVerdicts.has(review.verdict) || typeof review.summary !== 'string' || !review.summary.trim() || typeof review.reason !== 'string' || !review.reason.trim()) {
    throw new Error('reviewer returned an invalid verdict, summary, or reason');
  }
  if (!Array.isArray(review.repairInstructions) || review.repairInstructions.some((item) => typeof item !== 'string')) {
    throw new Error('reviewer returned invalid repair instructions');
  }
  if (review.designRequired !== null && typeof review.designRequired !== 'boolean') {
    throw new Error('reviewer returned an invalid designRequired value');
  }
  if (review.humanQuestion !== null && typeof review.humanQuestion !== 'string') {
    throw new Error('reviewer returned an invalid humanQuestion value');
  }
  if (review.verdict === 'REPAIR' && !review.repairInstructions.length) {
    throw new Error('reviewer returned REPAIR without repair instructions');
  }
  if (review.verdict === 'HUMAN_DECISION' && (!review.humanQuestion || !review.humanQuestion.trim())) {
    throw new Error('reviewer returned HUMAN_DECISION without a humanQuestion');
  }
  if (!(packet.state.track === 'feature-build-track' && packet.state.phase === 'Structure') && review.designRequired !== null) {
    throw new Error('reviewer returned designRequired outside feature Structure');
  }
}

async function reviewWork(packet, contract, codexResult, evidence) {
  const instructions = [
    'You are the Lemonteed orchestration reviewer.',
    'You are read-only. Judge the Codex work against the original packet and task contract, not against Codex self-claims.',
    'The input contains the actual worker output, command results, and git evidence. Treat worker completion claims as untrusted.',
    'Do not approve deployment, merge, push, publishing, or public-architecture changes; classify those as HUMAN_DECISION or BLOCKED.',
    'Use PASS only when the evidence supports the acceptance criteria and scope boundaries.',
    'Use REPAIR for bounded correctable failures, BLOCKED for external/technical blockers, and HUMAN_DECISION for product, destructive, deployment, or ambiguous authority decisions.',
    'For feature-build-track Structure phase, designRequired MUST be true when the feature includes meaningful visitor/operator UI or interaction-state design, otherwise false. For every other phase return null.'
  ].join('\n');

  const input = JSON.stringify({ packet, taskContract: contract, workerOutput: codexResult, commandResults: codexResult, gitEvidence: evidence }, null, 2);
  const reviewed = await invokeStructured({
    role: 'reviewer',
    provider: REVIEWER_PROVIDER,
    model: ACTIVE_REVIEWER_MODEL,
    instructions,
    input,
    schemaName: 'lemonteed_review_verdict',
    schema: reviewSchema
  });
  validateReview(reviewed.output, packet);
  if (reviewed.invocation) reviewed.invocation.verdict = reviewed.output.verdict;
  return reviewed;
}

function blockFromReview(review) {
  const reason = review.verdict === 'HUMAN_DECISION'
    ? `${review.summary}${review.humanQuestion ? ` Human decision: ${review.humanQuestion}` : ''}`
    : `${review.summary}: ${review.reason}`;
  runNode(['block', '--reason', boundedText(reason, MAX_REASON_CHARS), '--verdict', review.verdict]);
}

function completeFromReview(packet, review) {
  const args = ['complete', '--summary', boundedText(review.summary, MAX_REASON_CHARS)];
  if (packet.state.track === 'feature-build-track' && packet.state.phase === 'Structure') {
    if (typeof review.designRequired !== 'boolean') {
      runNode(['block', '--reason', 'Orchestrator did not return the required feature Design Worker decision.', '--verdict', 'HUMAN_DECISION']);
      return false;
    }
    args.push('--design-required', String(review.designRequired));
  }
  runNode(args);
  return true;
}

function preflight(allowDirty) {
  validateBoundedInteger(MAX_REPAIRS, 'ORCHESTRATOR_MAX_REPAIRS', 0, 10);
  validateBoundedInteger(MAX_DIFF_CHARS, 'ORCHESTRATOR_MAX_DIFF_CHARS', 1, 10000000);
  validateBoundedInteger(MAX_CODEX_OUTPUT_CHARS, 'ORCHESTRATOR_MAX_CODEX_OUTPUT_CHARS', 1024, 10000000);
  validateBoundedInteger(API_TIMEOUT_MS, 'ORCHESTRATOR_API_TIMEOUT_MS', 1000, 3600000);
  validateBoundedInteger(CODEX_TIMEOUT_MS, 'ORCHESTRATOR_CODEX_TIMEOUT_MS', 1000, 7200000);
  parseCodexArgs();
  if ([ORCHESTRATOR_PROVIDER, REVIEWER_PROVIDER, WORKER_PROVIDER].includes('codex-cli')) ensureCliInfo();

  const dirty = git('status', '--porcelain')
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.endsWith(' agents/runtime/state.json') && !line.includes('.orchestration-local/'));
  if (dirty.length && !allowDirty) {
    die(`worktree has unrelated changes; commit/stash them or rerun with --allow-dirty:\n${dirty.join('\n')}`);
  }
}

async function runWorker() {
  const packet = JSON.parse(runNode(['next']));
  writeAudit('packet.json', packet);

  let repairContext = null;
  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt += 1) {
    console.log(`\n[orchestrator] planning ${packet.state.phase}${attempt ? ` repair ${attempt}` : ''} with ${ACTIVE_PLANNER_MODEL} via ${ORCHESTRATOR_PROVIDER}`);
    const planned = await createContract(packet, repairContext);
    const contract = planned.output;
    writeAudit(`contract-${attempt}.json`, { ...contract, _meta: { responseId: planned.responseId || null, usage: planned.usage || null, invocation: planned.invocation } });

    console.log(`[codex] executing ${contract.taskId}: ${contract.mission} with ${WORKER_MODEL}`);
    const codexResult = executeCodex(contract);
    writeAudit(`codex-${attempt}.json`, codexResult);

    const evidence = collectEvidence();
    writeAudit(`evidence-${attempt}.json`, evidence);

    console.log(`[reviewer] reviewing evidence with ${ACTIVE_REVIEWER_MODEL} via ${REVIEWER_PROVIDER}`);
    const reviewed = await reviewWork(packet, contract, codexResult, evidence);
    const review = reviewed.output;
    writeAudit(`review-${attempt}.json`, { ...review, _meta: { responseId: reviewed.responseId || null, usage: reviewed.usage || null, invocation: reviewed.invocation } });
    console.log(`[orchestrator] verdict: ${review.verdict} — ${review.summary}`);

    if (review.verdict === 'PASS') {
      if (!codexSucceeded(codexResult)) {
        runNode([
          'block',
          '--reason',
          boundedText(`Codex execution failed or timed out before review: ${codexResult.error || codexResult.stderr || `exit code ${codexResult.exitCode}`}`, MAX_REASON_CHARS),
          '--verdict',
          'BLOCKED'
        ]);
        return { terminal: true, verdict: 'BLOCKED' };
      }
      if (!evidenceIsComplete(evidence)) {
        runNode([
          'block',
          '--reason',
          'Required git evidence was incomplete or unavailable; state was not advanced.',
          '--verdict',
          'BLOCKED'
        ]);
        return { terminal: true, verdict: 'BLOCKED' };
      }
      return { terminal: !completeFromReview(packet, review), verdict: 'PASS' };
    }

    if (review.verdict === 'BLOCKED' || review.verdict === 'HUMAN_DECISION') {
      blockFromReview(review);
      return { terminal: true, verdict: review.verdict };
    }

    if (attempt >= MAX_REPAIRS) {
      runNode([
        'block',
        '--reason',
        boundedText(`Repair limit reached after ${MAX_REPAIRS} repair attempts. Last review: ${review.summary}: ${review.reason}`, MAX_REASON_CHARS),
        '--verdict',
        'BLOCKED'
      ]);
      return { terminal: true, verdict: 'BLOCKED' };
    }

    repairContext = {
      previousContract: contract,
      previousCodexResult: codexResult,
      reviewer: review,
      currentEvidence: evidence
    };
  }

  return { terminal: true, verdict: 'BLOCKED' };
}

async function main() {
  const args = argsFrom(process.argv.slice(2));
  const command = args._[0] || 'run';
  if (command !== 'run') die(`unsupported command: ${command}`);
  if (args.escalate !== undefined && args.escalate !== true) die('--escalate is a flag and takes no value');
  if (args['allow-dirty'] !== undefined && args['allow-dirty'] !== true) die('--allow-dirty is a flag and takes no value');
  if (args.all !== undefined && args.all !== true) die('--all is a flag and takes no value');
  configureModel(args.escalate === true);
  preflight(args['allow-dirty'] === true);
  ensureLocalDir();

  let count = 0;
  while (true) {
    count += 1;
    if (count > 20) die('safety stop: exceeded 20 worker passes in one run');
    const result = await runWorker();
    if (result.terminal || !args.all) break;

    const status = JSON.parse(runNode(['status']));
    if (status.status !== 'active') break;
  }

  console.log('\n[orchestrator] run complete');
  console.log(runNode(['status']));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`orchestrator-adapter: ${error.stack || error.message}`);
    process.exit(1);
  });
}

module.exports = {
  ROOT,
  taskSchema,
  reviewSchema,
  boundedText,
  chooseCodexCandidate,
  normaliseCodexExecutable,
  parseStructuredJson,
  buildCodexArgs,
  safeCliEnvironment,
  cliFailureMessage,
  codexSucceeded,
  evidenceIsComplete,
  validateTaskContract,
  validateReview,
  invokeCodexCli,
  executeCodex,
  resolveCodexExecutable,
  getCodexVersion,
  configureModel,
  main
};
