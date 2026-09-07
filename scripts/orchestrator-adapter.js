#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_DIR = path.join(ROOT, '.orchestration-local');
const ORCHESTRATE = path.join(ROOT, 'scripts', 'orchestrate.js');
const STATE_PATH = path.join(ROOT, 'agents', 'runtime', 'state.json');

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
const MAX_WORKER_DELIVERABLE_CHARS = Number(process.env.ORCHESTRATOR_MAX_WORKER_DELIVERABLE_CHARS || 120000);
const MAX_REVIEWER_INPUT_CHARS = Number(process.env.ORCHESTRATOR_MAX_REVIEWER_INPUT_CHARS || 250000);
const MAX_UNTRACKED_FILES = Number(process.env.ORCHESTRATOR_MAX_UNTRACKED_FILES || 50);
const MAX_UNTRACKED_FILE_CHARS = Number(process.env.ORCHESTRATOR_MAX_UNTRACKED_FILE_CHARS || 20000);
const MAX_UNTRACKED_TOTAL_CHARS = Number(process.env.ORCHESTRATOR_MAX_UNTRACKED_TOTAL_CHARS || 60000);
const API_TIMEOUT_MS = Number(process.env.ORCHESTRATOR_API_TIMEOUT_MS || 120000);
const CODEX_TIMEOUT_MS = Number(process.env.ORCHESTRATOR_CODEX_TIMEOUT_MS || 1800000);
const MAX_REASON_CHARS = 20000;
const REVIEWER_DIAGNOSTIC_TAIL_CHARS = 12000;
const REVIEWER_RETRY_LIMIT = 1;

const FAILURE_CLASSES = Object.freeze({
  TRANSPORT_FAILURE: 'TRANSPORT_FAILURE',
  STRUCTURED_OUTPUT_FAILURE: 'STRUCTURED_OUTPUT_FAILURE',
  REVIEWER_CONTRACT_FAILURE: 'REVIEWER_CONTRACT_FAILURE',
  REVIEWER_INPUT_FAILURE: 'REVIEWER_INPUT_FAILURE',
  WORKER_PROTOCOL_FAILURE: 'WORKER_PROTOCOL_FAILURE',
  REVIEWER_VERDICT: 'REVIEWER_VERDICT'
});

const WORKER_RESULT_FIELDS = [
  'status',
  'summary',
  'deliverable',
  'filesChanged',
  'commandsRun',
  'verification',
  'scopeDeviations',
  'residualRisks',
  'blockers',
  'recommendedNextAction'
];

const DELIVERABLE_TYPES = Object.freeze({
  Structure: 'structure-handoff',
  Content: 'content-handoff',
  Design: 'design-handoff',
  Implementation: 'implementation-report',
  'Experience Review': 'experience-review',
  QA: 'qa-report'
});

const DELIVERABLE_GUIDANCE = Object.freeze({
  Structure: 'Include the repository architecture, boundaries, data flow, source-of-truth files, generated-file boundaries, validation surface, and structural risks required by the Structure Worker.',
  Content: 'Include the requested content, copy, information structure, source-of-truth implications, and content risks required by the Content Worker.',
  Design: 'Include design intent, layout specification, interaction specification, relevant interaction states, active-filter behavior when applicable, accessibility behavior, responsive/mobile behavior, progressive-enhancement behavior, implementation boundaries, risks, unresolved owner/product decisions, and implementation readiness.',
  Implementation: 'Describe implementation completed, important behavior, files and boundaries changed, verification, and implementation-specific residual concerns. Git evidence remains authoritative for actual changes.',
  'Experience Review': 'Include usability and experience review findings, severity or priority, disposition, unresolved issues, and the recommendation for continuation, revision, or QA.',
  QA: 'Include QA findings, commands and manual checks, regressions, failures or passes, residual risk, and the readiness conclusion.'
});

const PHASE_EVIDENCE_POLICY = Object.freeze({
  Structure: 'Strict repository proof: require concrete inspected paths, exact line evidence for material structural claims, command results where applicable, source-of-truth and generated-file boundaries, and residual risk.',
  Content: 'Fit-for-purpose grounding: require identified source files and concrete support for material content claims; do not demand exhaustive excerpts or line evidence for every secondary reference.',
  Design: 'Fit-for-purpose repository grounding: require exact inspected file paths, line ranges for primary UI and interaction surfaces, source-of-truth identification, and concrete evidence for claims that materially affect design behavior. Do not require stable quoted excerpts from every referenced file, exhaustive line evidence for secondary files, or line-by-line evidence for large JSON data files. For content/specimens.json, confirming it is the source of truth, that relevant fields exist, and representative field/value evidence when a design decision uses it is sufficient. Unsupported material design claims still require REPAIR.',
  Implementation: 'Strict implementation proof: require concrete changed paths, exact line evidence for material implementation claims, command results, git evidence, and residual risk.',
  'Experience Review': 'Fit-for-purpose grounding: require concrete inspected surfaces and evidence sufficient for usability findings and recommendations; do not impose Structure or QA repository-proof exhaustiveness on every observation.',
  QA: 'Strict verification proof: require concrete paths, exact line evidence where relevant, command and manual-check results, regression coverage, failures, and residual risk.'
});

function phaseEvidencePolicy(phase) {
  return PHASE_EVIDENCE_POLICY[phase] || 'Judge evidence according to the current phase responsibility and require concrete support for material claims.';
}

let ACTIVE_PLANNER_MODEL = null;
let ACTIVE_REVIEWER_MODEL = null;
let CLI_INFO = null;
let INVOCATION_COUNTER = 0;

function die(message) {
  console.error(`orchestrator-adapter: ${message}`);
  process.exit(1);
}

function classifiedError(failureClass, message, details = {}) {
  const error = new Error(message);
  error.failureClass = failureClass;
  Object.assign(error, details);
  return error;
}

function errorFailureClass(error) {
  return error && error.failureClass ? error.failureClass : FAILURE_CLASSES.TRANSPORT_FAILURE;
}

function deliverableTypeForPhase(phase) {
  return DELIVERABLE_TYPES[phase] || null;
}

function deliverableTypeForPacket(packet) {
  return deliverableTypeForPhase(packet && packet.state ? packet.state.phase : null);
}

function deliverableTypeForWorker(contract) {
  const worker = contract && contract.worker;
  return {
    'STRUCTURE_WORKER.md': DELIVERABLE_TYPES.Structure,
    'CONTENT_WORKER.md': DELIVERABLE_TYPES.Content,
    'DESIGN_WORKER.md': DELIVERABLE_TYPES.Design,
    'IMPLEMENTATION_WORKER.md': DELIVERABLE_TYPES.Implementation,
    'EXPERIENCE_DIRECTOR.md': DELIVERABLE_TYPES['Experience Review'],
    'QA_WORKER.md': DELIVERABLE_TYPES.QA
  }[worker] || null;
}

function deliverableContractInstruction(packet) {
  const phase = packet && packet.state ? packet.state.phase : null;
  const type = deliverableTypeForPhase(phase);
  const guidance = DELIVERABLE_GUIDANCE[phase];
  if (!type || !guidance) return '';
  return `Required worker protocol: place the complete substantive ${phase} handoff in deliverable.content, use deliverable.type "${type}", and do not substitute summary or prose outside the structured result. ${guidance}`;
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

function readJsonFile(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is unavailable or invalid JSON: ${error.message}`);
  }
}

function boundedText(value, limit) {
  const text = String(value || '');
  return text.length > limit ? `${text.slice(0, limit)}\n[truncated]` : text;
}

function boundedTailText(value, limit) {
  const text = String(value || '');
  if (text.length <= limit) return text;
  return `[tail truncated] original_chars=${text.length}\n${text.slice(-limit)}`;
}

function boundedDiffText(value, limit) {
  const text = String(value || '');
  if (text.length <= limit) return { text, truncated: false };

  const marker = `\n[diff truncated] original_chars=${text.length}; retained_head_and_tail\n`;
  if (marker.length >= limit) return { text: marker.slice(0, limit), truncated: true };

  const available = limit - marker.length;
  const headLength = Math.ceil(available * 0.7);
  const tailLength = available - headLength;
  return {
    text: `${text.slice(0, headLength)}${marker}${text.slice(-tailLength)}`,
    truncated: true
  };
}

function parseWorkerFinalResult(finalOutput) {
  const text = String(finalOutput || '').trim();
  if (!text) return { value: null, error: 'worker returned no final result', extracted: false };
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { value: null, error: 'worker final result must be a JSON object', extracted: false };
    }
    return { value, error: null, extracted: false };
  } catch {
    const candidates = [];
    const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
    let match;
    while ((match = fenced.exec(text))) candidates.push(match[1]);
    for (const candidate of candidates) {
      try {
        const value = JSON.parse(candidate);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return { value, error: null, extracted: true };
        }
      } catch {
        // Continue to the next fenced candidate.
      }
    }
    return {
      value: null,
      error: 'worker final result was not valid JSON and no fenced JSON result was found',
      extracted: false
    };
  }
}

function projectWorkerFinalResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const projected = {};
  for (const field of WORKER_RESULT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) projected[field] = value[field];
  }
  const omittedFields = Object.keys(value).filter((field) => !WORKER_RESULT_FIELDS.includes(field));
  if (omittedFields.length) projected._omittedFields = omittedFields;
  return projected;
}

function workerFinalResultValidationError(value, expectedType = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'worker final result must be an object';
  if (!['completed', 'blocked', 'partial'].includes(value.status)) return 'worker final result has an invalid status';
  if (typeof value.summary !== 'string' || !value.summary.trim()) return 'worker final result summary must be non-empty';
  if (!value.deliverable || typeof value.deliverable !== 'object' || Array.isArray(value.deliverable)) {
    return 'worker final result deliverable is required';
  }
  if (!Object.values(DELIVERABLE_TYPES).includes(value.deliverable.type)) {
    return 'worker final result deliverable.type is not recognized';
  }
  if (expectedType && value.deliverable.type !== expectedType) {
    return `worker final result deliverable.type must be ${expectedType}`;
  }
  if (typeof value.deliverable.content !== 'string' || !value.deliverable.content.trim()) {
    return 'worker final result deliverable.content must be non-empty';
  }
  if (value.deliverable.content.length > MAX_WORKER_DELIVERABLE_CHARS) {
    return `worker final result deliverable.content exceeds ${MAX_WORKER_DELIVERABLE_CHARS} characters`;
  }
  for (const field of ['filesChanged', 'commandsRun', 'verification', 'scopeDeviations', 'residualRisks', 'blockers']) {
    if (!Array.isArray(value[field])) return `worker final result ${field} must be an array`;
  }
  if (typeof value.recommendedNextAction !== 'string') return 'worker final result recommendedNextAction must be a string';
  return null;
}

function validateWorkerFinalResult(value, expectedType = null) {
  const message = workerFinalResultValidationError(value, expectedType);
  if (message) throw classifiedError(FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE, message);
  return value;
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
  if (!bounded) throw classifiedError(FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE, `${label} returned no structured output`);
  try {
    return JSON.parse(bounded);
  } catch (error) {
    throw classifiedError(FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE, `${label} returned malformed structured output: ${error.message}`, { cause: error });
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
  if (result.error || result.status !== 0) {
    throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, cliFailureMessage(role, model, result), { result });
  }
  if (!finalOutput) {
    throw classifiedError(FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE, `${role} Codex CLI invocation succeeded without an output-last-message file`);
  }
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
  if (!apiKey || !apiKey.trim()) throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, `OPENAI_API_KEY is required only when ${role} provider is openai-api`);

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
    if (error && error.name === 'AbortError') throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, `Responses API request timed out after ${API_TIMEOUT_MS}ms`, { cause: error });
    throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, error.message || String(error), { cause: error });
  }

  let bodyText;
  try {
    bodyText = await response.text();
  } catch (error) {
    if (error && error.name === 'AbortError') throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, `Responses API request timed out after ${API_TIMEOUT_MS}ms`, { cause: error });
    throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, error.message || String(error), { cause: error });
  } finally {
    clearTimeout(timeout);
  }
  const metaResult = { status: response.status, signal: null, stdout: '', stderr: response.ok ? '' : bodyText };
  const meta = invocationMeta({ role, provider: 'openai-api', model, result: metaResult });
  if (!response.ok) throw classifiedError(FAILURE_CLASSES.TRANSPORT_FAILURE, `Responses API ${response.status}: ${boundedText(bodyText, MAX_CODEX_OUTPUT_CHARS)}`);
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (error) {
    throw classifiedError(FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE, `Responses API returned invalid JSON: ${error.message}`, { cause: error });
  }
  let output;
  try {
    output = parseStructuredJson(extractResponseText(data), role);
  } catch (error) {
    throw classifiedError(FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE, `${role} Responses API returned invalid structured output: ${error.message}`, { cause: error });
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

const workerResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['completed', 'blocked', 'partial'] },
    summary: { type: 'string', minLength: 1 },
    deliverable: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: Object.values(DELIVERABLE_TYPES) },
        content: { type: 'string', minLength: 1, maxLength: MAX_WORKER_DELIVERABLE_CHARS }
      },
      required: ['type', 'content']
    },
    filesChanged: { type: 'array', items: { type: 'string' } },
    commandsRun: { type: 'array', items: { type: 'string' } },
    verification: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          check: { type: 'string' },
          result: { type: 'string' },
          evidence: { type: 'string' }
        },
        required: ['check', 'result', 'evidence']
      }
    },
    scopeDeviations: { type: 'array', items: { type: 'string' } },
    residualRisks: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    recommendedNextAction: { type: 'string' }
  },
  required: [...WORKER_RESULT_FIELDS]
};

function workerResultSchemaFor(packet, contract = null) {
  const expectedType = deliverableTypeForPacket(packet) || deliverableTypeForWorker(contract);
  return {
    ...workerResultSchema,
    properties: {
      ...workerResultSchema.properties,
      deliverable: {
        ...workerResultSchema.properties.deliverable,
        properties: {
          ...workerResultSchema.properties.deliverable.properties,
          type: {
            type: 'string',
            enum: expectedType ? [expectedType] : Object.values(DELIVERABLE_TYPES)
          }
        }
      }
    }
  };
}

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

function requiresDesignDecision(packet) {
  return Boolean(packet && packet.state && packet.state.track === 'feature-build-track' && packet.state.phase === 'Structure');
}

function reviewerSchemaFor(packet) {
  return {
    ...reviewSchema,
    properties: {
      ...reviewSchema.properties,
      // The shared response shape remains stable, but the phase-specific JSON
      // schema rejects a non-null designRequired before semantic validation.
      designRequired: requiresDesignDecision(packet) ? { type: 'boolean' } : { type: 'null' }
    }
  };
}

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
  const deliverableInstruction = deliverableContractInstruction(packet);
  if (deliverableInstruction && !/deliverable\.content/i.test(output.codexPrompt)) {
    output.codexPrompt = `${output.codexPrompt.trim()}\n\n${deliverableInstruction}`;
  }
  if (deliverableInstruction && !output.requirements.some((item) => /deliverable\.content/i.test(item))) {
    output.requirements.push(deliverableInstruction);
  }
  if (deliverableInstruction && !output.acceptanceCriteria.some((item) => /deliverable\.content/i.test(item))) {
    output.acceptanceCriteria.push(`The structured worker result contains a complete non-empty ${deliverableTypeForPacket(packet)} in deliverable.content.`);
  }
  if (deliverableInstruction && !output.evidenceRequired.some((item) => /deliverable\.content/i.test(item))) {
    output.evidenceRequired.push('The complete substantive worker handoff is present in deliverable.content; summary is only a synopsis.');
  }
}

async function createContract(packet, repairContext = null) {
  const instructions = [
    'You are the Lemonteed orchestration planner.',
    'You are read-only. Convert the supplied runtime packet into one tightly-scoped Codex work order and do not edit files.',
    'Preserve repository constraints and worker boundaries. Do not broaden scope.',
    'Never instruct Codex to deploy, merge, push, publish, or change public Lemonteed architecture; owner approval remains required.',
    'The codexPrompt must be complete enough to execute without the human re-explaining context.',
    'Require concrete evidence, exact commands, changed files, explicit stop conditions, and a complete substantive phase deliverable in deliverable.content. The short summary must not substitute for that deliverable.',
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

function workerPrompt(contract, packet = null) {
  const workerPath = path.join('agents', 'workers', contract.worker);
  const deliverableInstruction = deliverableContractInstruction(packet) || `Place the complete substantive phase output in deliverable.content and use the phase-compatible deliverable.type for ${contract.worker}. Summary is only a short synopsis.`;
  return [
    'You are the Lemonteed Codex worker. Execute only the task contract below.',
    'You may modify repository files within the contract scope using the workspace-write sandbox.',
    'You must not deploy, merge, push, publish, alter remote branches, or expose secrets.',
    'Do not decide PASS. Return the required worker result and evidence; the separate reviewer owns the verdict.',
    'Repository inspection/search policy: prefer rg when available, but never block solely because rg or rg.exe is unavailable.',
    'Use node scripts/repository-search.js --pattern <pattern> --path <path> for portable repository search; it falls back in order to git grep, PowerShell Select-String, then Node filesystem traversal.',
    'Pass search values as process arguments. Do not interpolate untrusted task values into shell commands.',
    'Structure and QA work must include concrete repository paths, line numbers, command results, and residual risk. If every safe inspection method fails or required evidence cannot be gathered, report BLOCKED with the exact failure.',
    'Return exactly one JSON object matching the structured Worker Result schema. Do not put the substantive handoff in summary or prose outside the JSON object.',
    deliverableInstruction,
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

function executeCodex(contract, runner = spawnSync, cliInfo = null, packet = null) {
  const info = cliInfo || ensureCliInfo();
  const id = `worker-${Date.now()}-${INVOCATION_COUNTER += 1}`;
  const schemaPath = path.join(LOCAL_DIR, `${id}.schema.json`);
  const outputPath = path.join(LOCAL_DIR, `${id}.output.txt`);
  fs.writeFileSync(schemaPath, `${JSON.stringify(workerResultSchemaFor(packet, contract), null, 2)}\n`);
  const args = buildCodexArgs({ role: 'worker', model: WORKER_MODEL, sandbox: 'workspace-write', schemaPath, outputPath });
  const result = runner(info.command, [...info.argsPrefix, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: safeCliEnvironment(),
    input: workerPrompt(contract, packet),
    maxBuffer: MAX_CODEX_OUTPUT_CHARS,
    timeout: CODEX_TIMEOUT_MS,
    killSignal: 'SIGTERM'
  });
  const finalOutput = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  const parsedFinalResult = parseWorkerFinalResult(finalOutput);
  const expectedDeliverableType = deliverableTypeForPacket(packet) || deliverableTypeForWorker(contract);
  const validationError = parsedFinalResult.extracted
    ? 'worker final result must be exactly one JSON object without surrounding prose'
    : (parsedFinalResult.value
      ? workerFinalResultValidationError(parsedFinalResult.value, expectedDeliverableType)
      : null);
  return {
    exitCode: result.status,
    signal: result.signal || null,
    stdout: boundedText(result.stdout, MAX_CODEX_OUTPUT_CHARS),
    stderr: boundedText(result.stderr, MAX_CODEX_OUTPUT_CHARS),
    stdoutTruncated: Boolean(result.stdout && String(result.stdout).length > MAX_CODEX_OUTPUT_CHARS),
    stderrTruncated: Boolean(result.stderr && String(result.stderr).length > MAX_CODEX_OUTPUT_CHARS),
    finalOutput: boundedText(finalOutput, MAX_CODEX_OUTPUT_CHARS),
    finalOutputTruncated: finalOutput.length > MAX_CODEX_OUTPUT_CHARS,
    parsedWorkerFinalResult: parsedFinalResult.value,
    workerFinalResultParseError: parsedFinalResult.error,
    workerFinalResultExtracted: parsedFinalResult.extracted,
    workerFinalResultValidationError: validationError,
    expectedDeliverableType,
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
  const untrackedTruncated = names.length > MAX_UNTRACKED_FILES;
  const untrackedFiles = [];
  let totalChars = 0;
  for (const name of names.slice(0, MAX_UNTRACKED_FILES)) {
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
      if (!stats.isFile()) {
        untrackedFiles.push({ path: name, size: stats.size, unavailable: true });
        continue;
      }

      const remainingChars = MAX_UNTRACKED_TOTAL_CHARS - totalChars;
      if (remainingChars <= 0) {
        untrackedFiles.push({
          path: name,
          size: stats.size,
          truncated: true,
          content: '[untracked file content omitted: evidence budget exhausted]'
        });
        continue;
      }

      const contentLimit = Math.min(MAX_UNTRACKED_FILE_CHARS, remainingChars);
      const bytePreviewLimit = Math.max(contentLimit * 4, contentLimit + 1);
      const raw = fs.readFileSync(realPath);
      const preview = raw.length > bytePreviewLimit
        ? raw.subarray(0, bytePreviewLimit).toString('utf8')
        : raw.toString('utf8');
      const truncated = raw.length > bytePreviewLimit || preview.length > contentLimit;
      const content = truncated
        ? `${preview.slice(0, contentLimit)}\n[untracked file truncated] original_bytes=${stats.size}`
        : preview;
      totalChars += content.length;
      untrackedFiles.push({ path: name, size: stats.size, content, truncated });
    } catch {
      untrackedFiles.push({ path: name, unavailable: true });
    }
  }
  if (names.length > MAX_UNTRACKED_FILES) {
    untrackedFiles.push({
      path: '[additional untracked files omitted]',
      truncated: true,
      content: `count=${names.length - MAX_UNTRACKED_FILES}`
    });
  }
  return { untrackedFiles, untrackedUnavailable: false, untrackedTruncated };
}

function collectEvidence() {
  const diff = git('diff', 'HEAD', '--', '.', ':(exclude)agents/runtime/state.json');
  const boundedDiff = boundedDiffText(diff, MAX_DIFF_CHARS);
  const status = git('status', '--short');
  const implementationStatus = status.startsWith('[git unavailable:')
    ? status
    : status.split('\n').filter(Boolean).filter((line) => !line.endsWith(' agents/runtime/state.json') && !line.includes('.orchestration-local/')).join('\n');
  const untrackedEvidence = collectUntrackedEvidence();
  const trackedChangedFiles = git('diff', 'HEAD', '--name-only', '--', '.', ':(exclude)agents/runtime/state.json')
    .split('\n')
    .filter(Boolean);
  const changedFiles = [...new Set([
    ...trackedChangedFiles,
    ...untrackedEvidence.untrackedFiles
      .map((file) => file.path)
      .filter((file) => !file.startsWith('['))
  ])];
  return {
    branch: git('branch', '--show-current'),
    head: git('rev-parse', 'HEAD'),
    status,
    implementationStatus,
    diffCheck: git('diff', 'HEAD', '--check', '--', '.', ':(exclude)agents/runtime/state.json') || 'clean',
    diffStat: git('diff', 'HEAD', '--stat', '--', '.', ':(exclude)agents/runtime/state.json'),
    changedFiles,
    diffTruncated: boundedDiff.truncated,
    diff: boundedDiff.text,
    ...untrackedEvidence
  };
}

function currentRuntimeState() {
  return readJsonFile(STATE_PATH, 'runtime state');
}

function currentWorkerForState(state) {
  return state && Array.isArray(state.workerSequence) && Number.isInteger(state.currentWorkerIndex)
    ? state.workerSequence[state.currentWorkerIndex] || null
    : null;
}

function auditAttemptFiles() {
  if (!fs.existsSync(LOCAL_DIR)) return [];
  const attempts = new Set();
  for (const name of fs.readdirSync(LOCAL_DIR)) {
    const match = name.match(/^(?:codex|evidence|contract)-(\d+)\.json$/);
    if (match) attempts.add(Number(match[1]));
  }
  return [...attempts].sort((a, b) => b - a);
}

function nextAuditAttempt(minimum = 0) {
  const attempts = auditAttemptFiles();
  return Math.max(minimum, attempts.length ? Math.max(...attempts) + 1 : 0);
}

function auditPath(name) {
  return path.join(LOCAL_DIR, name);
}

function stripAuditMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const copy = cloneJson(value);
  delete copy._meta;
  return copy;
}

function preservedEvidenceFailure(message) {
  const error = new Error(`PRESERVED_EVIDENCE_INCOMPATIBLE: ${message}`);
  error.code = 'PRESERVED_EVIDENCE_INCOMPATIBLE';
  error.failureClass = FAILURE_CLASSES.REVIEWER_CONTRACT_FAILURE;
  return error;
}

function evidenceHasNoWorkerChanges(evidence) {
  return Boolean(
    evidence &&
    Array.isArray(evidence.changedFiles) && evidence.changedFiles.length === 0 &&
    Array.isArray(evidence.untrackedFiles) && evidence.untrackedFiles.length === 0 &&
    !evidence.untrackedTruncated &&
    !evidence.diffTruncated &&
    !String(evidence.implementationStatus || '').trim() &&
    !String(evidence.diffStat || '').trim() &&
    !String(evidence.diff || '').trim()
  );
}

function validatePreservedCompatibility({ state, packet, contract, codexResult, evidence }) {
  if (!state || !['active', 'blocked'].includes(state.status)) {
    throw preservedEvidenceFailure(`runtime status ${state && state.status ? state.status : 'unknown'} cannot resume a worker`);
  }
  const worker = currentWorkerForState(state);
  if (!worker) throw preservedEvidenceFailure('current worker is missing from runtime state');
  const packetState = packet && packet.state;
  if (!packetState) throw preservedEvidenceFailure('preserved packet has no runtime state');
  for (const field of ['objective', 'target', 'track', 'phase']) {
    if (packetState[field] !== state[field]) {
      throw preservedEvidenceFailure(`packet ${field} does not match the current objective`);
    }
  }
  if (JSON.stringify(packetState.currentWorker) !== JSON.stringify(worker)) {
    throw preservedEvidenceFailure('packet current worker does not match the runtime state');
  }
  if (JSON.stringify(packetState.completedWorkers || []) !== JSON.stringify(state.completedWorkers || [])) {
    throw preservedEvidenceFailure('packet completed worker history does not match the runtime state');
  }
  if (!contract || contract.worker !== worker.worker) {
    throw preservedEvidenceFailure('preserved task contract targets a different worker');
  }
  const currentBranch = git('branch', '--show-current');
  const currentHead = git('rev-parse', 'HEAD');
  if (!currentBranch || currentBranch.startsWith('[git unavailable:')) {
    throw preservedEvidenceFailure('current git branch could not be verified');
  }
  if (packet.repository && packet.repository.branch !== evidence.branch) {
    throw preservedEvidenceFailure('packet and preserved evidence branches differ');
  }
  if (evidence.branch !== currentBranch) {
    throw preservedEvidenceFailure(`preserved branch ${evidence.branch} does not match current branch ${currentBranch}`);
  }
  let headCompatibility = 'exact';
  if (packet.repository && packet.repository.head !== evidence.head) {
    if (!evidenceHasNoWorkerChanges(evidence)) {
      throw preservedEvidenceFailure('packet and preserved evidence HEADs differ while worker changes are present');
    }
    headCompatibility = 'packet-baseline-only-no-worker-changes';
  }
  if (evidence.head !== currentHead) {
    if (!evidenceHasNoWorkerChanges(evidence)) {
      throw preservedEvidenceFailure(`preserved HEAD ${evidence.head} differs from current HEAD ${currentHead} and worker changes are present`);
    }
    headCompatibility = 'baseline-only-no-worker-changes';
  }
  if (!codexResult || codexResult.role !== 'worker') {
    throw preservedEvidenceFailure('preserved execution result is not a worker result');
  }
  return { headCompatibility, currentBranch, currentHead };
}

function legacyDeliverableContent(finalOutput, expectedType) {
  const text = String(finalOutput || '').trim();
  if (!text || !expectedType) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  let resultFenceIndex = -1;
  while ((match = fenced.exec(text))) {
    try {
      const candidate = JSON.parse(match[1]);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) && typeof candidate.status === 'string' && typeof candidate.summary === 'string' && Array.isArray(candidate.filesChanged)) {
        resultFenceIndex = match.index;
      }
    } catch {
      // Ignore prose/code fences and keep looking for the legacy Worker Result.
    }
  }
  if (resultFenceIndex <= 0) return null;
  const narrative = text.slice(0, resultFenceIndex).trim();
  if (narrative.length < 600) return null;
  const markers = {
    'structure-handoff': ['Inspected', 'Current mechanism', 'Minimal implementation boundary', 'Risks'],
    'content-handoff': ['content', 'copy', 'structure', 'source'],
    'design-handoff': ['Design handoff', 'Proposed interaction', 'State model', 'Responsive direction', 'Accessibility', 'Minimal implementation boundary', 'Risks'],
    'implementation-report': ['implemented', 'behavior', 'files', 'verification', 'residual'],
    'experience-review': ['Experience', 'Critical issues', 'polish', 'disposition', 'Recommendation'],
    'qa-report': ['Commands', 'Manual checks', 'Pass', 'regression', 'readiness']
  }[expectedType] || [];
  const markerCount = markers.filter((marker) => new RegExp(marker, 'i').test(narrative)).length;
  return markerCount >= 3 ? narrative : null;
}

function enrichPreservedWorkerResult(rawResult, packet, contract) {
  const result = cloneJson(rawResult);
  const parsed = parseWorkerFinalResult(result.finalOutput);
  if (!result.parsedWorkerFinalResult || result.workerFinalResultParseError) {
    result.parsedWorkerFinalResult = parsed.value;
    result.workerFinalResultParseError = parsed.error;
  }
  const expectedDeliverableType = deliverableTypeForPacket(packet) || deliverableTypeForWorker(contract);
  if (result.parsedWorkerFinalResult && !result.parsedWorkerFinalResult.deliverable) {
    const content = legacyDeliverableContent(result.finalOutput, expectedDeliverableType);
    if (content) {
      result.parsedWorkerFinalResult = {
        ...result.parsedWorkerFinalResult,
        deliverable: { type: expectedDeliverableType, content }
      };
      result.workerFinalResultParseError = null;
      result.deliverableMigration = {
        source: 'worker final narrative before legacy JSON result',
        type: expectedDeliverableType,
        contentChars: content.length
      };
    }
  }
  result.expectedDeliverableType = expectedDeliverableType;
  result.workerFinalResultValidationError = result.parsedWorkerFinalResult
    ? workerFinalResultValidationError(result.parsedWorkerFinalResult, expectedDeliverableType)
    : null;
  return result;
}

function loadPreservedEvidence({ strict = true } = {}) {
  if (!fs.existsSync(auditPath('packet.json'))) {
    if (strict) throw preservedEvidenceFailure('packet audit is missing');
    return null;
  }

  const manifestPath = auditPath('preserved-worker.json');
  let references = null;
  if (fs.existsSync(manifestPath)) {
    const manifest = readJsonFile(manifestPath, 'preserved worker manifest');
    references = {
      attempt: Number(manifest.attempt),
      contract: manifest.contractAudit,
      worker: manifest.workerAudit,
      evidence: manifest.evidenceAudit
    };
  }
  const candidates = [];
  if (references && Number.isInteger(references.attempt)) candidates.push(references);
  for (const attempt of auditAttemptFiles()) {
    if (candidates.some((candidate) => candidate.attempt === attempt)) continue;
    candidates.push({
      attempt,
      contract: `contract-${attempt}.json`,
      worker: `codex-${attempt}.json`,
      evidence: `evidence-${attempt}.json`
    });
  }

  let lastError = null;
  for (const candidate of candidates) {
    if (!candidate.contract || !candidate.worker || !candidate.evidence) continue;
    const files = [candidate.contract, candidate.worker, candidate.evidence];
    if (!files.every((name) => fs.existsSync(auditPath(name)))) {
      lastError = preservedEvidenceFailure(`audit files for attempt ${candidate.attempt} are incomplete`);
      continue;
    }
    try {
      const packet = readJsonFile(auditPath('packet.json'), 'packet audit');
      const contract = stripAuditMeta(readJsonFile(auditPath(candidate.contract), 'contract audit'));
      const rawWorker = readJsonFile(auditPath(candidate.worker), 'worker audit');
      const codexResult = enrichPreservedWorkerResult(rawWorker, packet, contract);
      const evidence = readJsonFile(auditPath(candidate.evidence), 'evidence audit');
      const state = currentRuntimeState();
      const compatibility = validatePreservedCompatibility({ state, packet, contract, codexResult, evidence });
      if (!codexSucceeded(codexResult)) {
        lastError = preservedEvidenceFailure(`attempt ${candidate.attempt} has no complete phase-compatible worker deliverable`);
        continue;
      }
      return {
        attempt: candidate.attempt,
        packet,
        contract,
        codexResult,
        evidence,
        compatibility
      };
    } catch (error) {
      lastError = error;
      if (references) break;
    }
  }

  if (strict) throw lastError || preservedEvidenceFailure('no preserved worker evidence was found');
  return null;
}

function writePreservedWorkerManifest(attempt, packet, contract, evidence) {
  writeAudit('preserved-worker.json', {
    version: 1,
    attempt,
    packetAudit: 'packet.json',
    contractAudit: `contract-${attempt}.json`,
    workerAudit: `codex-${attempt}.json`,
    evidenceAudit: `evidence-${attempt}.json`,
    objective: packet.state.objective,
    target: packet.state.target,
    track: packet.state.track,
    phase: packet.state.phase,
    worker: packet.state.currentWorker,
    branch: evidence.branch,
    head: evidence.head,
    changedFiles: evidence.changedFiles || []
  });
}

function writeDeliverableMigrationAudit(preserved) {
  if (!preserved || !preserved.codexResult || !preserved.codexResult.deliverableMigration) return;
  writeAudit(`codex-${preserved.attempt}.deliverable-migration.json`, {
    sourceAudit: `codex-${preserved.attempt}.json`,
    packetAudit: 'packet.json',
    migration: preserved.codexResult.deliverableMigration,
    deliverable: preserved.codexResult.parsedWorkerFinalResult.deliverable
  });
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
  const parsedWorker = parsedWorkerResultFrom(result);
  return Boolean(result && result.exitCode === 0 && !result.signal && !result.error && !result.timedOut && !result.stdoutTruncated && !result.stderrTruncated && !result.finalOutputTruncated && !parsedWorker.error && workerFinalResultIsComplete(parsedWorker.value, result.expectedDeliverableType || null));
}

function workerEvidenceField(workerResult, field) {
  return workerResult && Object.prototype.hasOwnProperty.call(workerResult, field)
    ? workerResult[field]
    : [];
}

function workerFinalResultIsComplete(value, expectedType = null) {
  return workerFinalResultValidationError(value, expectedType) === null;
}

function parsedWorkerResultFrom(codexResult) {
  if (Object.prototype.hasOwnProperty.call(codexResult || {}, 'parsedWorkerFinalResult')) {
    return {
      value: codexResult.parsedWorkerFinalResult,
      error: codexResult.workerFinalResultParseError || codexResult.workerFinalResultValidationError || null
    };
  }
  return parseWorkerFinalResult(codexResult && codexResult.finalOutput);
}

function buildReviewerPayload(packet, contract, codexResult, evidence) {
  const parsedWorker = parsedWorkerResultFrom(codexResult);
  const expectedDeliverableType = deliverableTypeForPacket(packet) || deliverableTypeForWorker(contract);
  const workerResult = projectWorkerFinalResult(parsedWorker.value);
  const missingWorkerEvidence = WORKER_RESULT_FIELDS
    .filter((field) => !parsedWorker.value || !Object.prototype.hasOwnProperty.call(parsedWorker.value, field));
  const payload = {
    reviewerPayloadVersion: 1,
    objective: packet.state.objective,
    target: packet.state.target,
    track: packet.state.track,
    phase: packet.state.phase,
    phaseEvidencePolicy: phaseEvidencePolicy(packet.state.phase),
    currentWorker: packet.state.currentWorker,
    repositoryConstraints: packet.state.constraints,
    taskContract: contract,
    parsedWorkerFinalResult: workerResult,
    workerFinalResultParseError: parsedWorker.error,
    workerFinalResultComplete: workerFinalResultIsComplete(parsedWorker.value, expectedDeliverableType),
    expectedDeliverableType,
    filesChanged: {
      reportedByWorker: workerEvidenceField(parsedWorker.value, 'filesChanged'),
      detectedByGit: evidence.changedFiles || []
    },
    commandsRun: workerEvidenceField(parsedWorker.value, 'commandsRun'),
    verificationResults: workerEvidenceField(parsedWorker.value, 'verification'),
    scopeDeviations: workerEvidenceField(parsedWorker.value, 'scopeDeviations'),
    residualRisks: workerEvidenceField(parsedWorker.value, 'residualRisks'),
    blockers: workerEvidenceField(parsedWorker.value, 'blockers'),
    missingWorkerEvidence,
    workerExecution: {
      provider: codexResult.provider || WORKER_PROVIDER,
      requestedModel: codexResult.requestedModel || WORKER_MODEL,
      exitStatus: codexResult.exitCode,
      signal: codexResult.signal || null,
      timedOut: Boolean(codexResult.timedOut),
      error: codexResult.error || null,
      finalResultTruncated: Boolean(codexResult.finalOutputTruncated),
      expectedDeliverableType
    },
    git: {
      branch: evidence.branch,
      head: evidence.head,
      status: evidence.status,
      implementationStatus: evidence.implementationStatus,
      diffCheck: evidence.diffCheck,
      diffStat: evidence.diffStat,
      changedFiles: evidence.changedFiles || [],
      diff: evidence.diff,
      diffTruncated: Boolean(evidence.diffTruncated),
      untrackedFiles: evidence.untrackedFiles || [],
      untrackedTruncated: Boolean(evidence.untrackedTruncated)
    }
  };

  if (!codexSucceeded(codexResult)) {
    payload.workerDiagnostics = buildWorkerDiagnostics(codexResult);
  }

  return payload;
}

function buildWorkerDiagnostics(codexResult) {
  return {
    exitStatus: codexResult.exitCode,
    signal: codexResult.signal || null,
    timedOut: Boolean(codexResult.timedOut),
    error: codexResult.error || null,
    stderrTail: boundedTailText(codexResult.stderr, REVIEWER_DIAGNOSTIC_TAIL_CHARS),
    stdoutTail: boundedTailText(codexResult.stdout, Math.floor(REVIEWER_DIAGNOSTIC_TAIL_CHARS / 2))
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function serialiseReviewerPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

function compactUntrackedFiles(files, perFileLimit, totalLimit, metadataOnly = false) {
  let used = 0;
  return (Array.isArray(files) ? files : []).map((file) => {
    const compacted = { path: file.path };
    if (file.size !== undefined) compacted.size = file.size;
    if (file.unavailable) compacted.unavailable = true;
    if (file.truncated) compacted.truncated = true;
    if (metadataOnly) {
      if (file.content) compacted.content = '[untracked file content omitted by reviewer budget]';
      return compacted;
    }
    if (typeof file.content !== 'string') return compacted;
    const available = Math.max(0, Math.min(perFileLimit, totalLimit - used));
    if (!available) {
      compacted.truncated = true;
      compacted.content = '[untracked file content omitted by reviewer budget]';
      return compacted;
    }
    const content = file.content.length > available
      ? `${file.content.slice(0, available)}\n[untracked file truncated by reviewer budget]`
      : file.content;
    compacted.content = content;
    compacted.truncated = Boolean(file.truncated || file.content.length > available);
    used += content.length;
    return compacted;
  });
}

function setBoundedReviewerDiff(payload, limit) {
  const bounded = boundedDiffText(payload.git.diff, limit);
  payload.git.diff = bounded.text;
  payload.git.diffTruncated = Boolean(payload.git.diffTruncated || bounded.truncated);
}

function setBoundedReviewerStatus(payload, limit) {
  const status = String(payload.git.status || '');
  payload.git.status = status.length > limit
    ? `${status.slice(0, limit)}\n[git status truncated by reviewer budget]`
    : status;
}

function compactReviewerInput(payload, budget = MAX_REVIEWER_INPUT_CHARS) {
  let current = cloneJson(payload);
  const initialInput = serialiseReviewerPayload(current);
  const compactionSteps = [];

  const result = () => {
    const input = serialiseReviewerPayload(current);
    return { payload: current, input, serializedChars: input.length };
  };
  if (initialInput.length <= budget) {
    return {
      ...result(),
      budget,
      initialSerializedChars: initialInput.length,
      compacted: false,
      compactionSteps
    };
  }

  const apply = (name, transform) => {
    current = cloneJson(current);
    transform(current);
    compactionSteps.push(name);
    return result();
  };

  let measured = apply('bound optional diff, untracked content, status, and failed-worker diagnostics', (next) => {
    setBoundedReviewerDiff(next, Math.min(MAX_DIFF_CHARS, 80000));
    next.git.untrackedFiles = compactUntrackedFiles(next.git.untrackedFiles, 8000, 24000);
    setBoundedReviewerStatus(next, 12000);
    if (next.workerDiagnostics) {
      next.workerDiagnostics.stderrTail = boundedTailText(next.workerDiagnostics.stderrTail, 4000);
      next.workerDiagnostics.stdoutTail = boundedTailText(next.workerDiagnostics.stdoutTail, 2000);
    }
  });
  if (measured.input.length <= budget) return { ...measured, budget, initialSerializedChars: initialInput.length, compacted: true, compactionSteps };

  measured = apply('reduce optional evidence previews', (next) => {
    setBoundedReviewerDiff(next, 40000);
    next.git.untrackedFiles = compactUntrackedFiles(next.git.untrackedFiles, 2000, 8000);
    if (next.workerDiagnostics) {
      next.workerDiagnostics.stderrTail = boundedTailText(next.workerDiagnostics.stderrTail, 2000);
      next.workerDiagnostics.stdoutTail = '';
    }
  });
  if (measured.input.length <= budget) return { ...measured, budget, initialSerializedChars: initialInput.length, compacted: true, compactionSteps };

  measured = apply('retain untracked metadata and a small bounded diff', (next) => {
    next.git.untrackedFiles = compactUntrackedFiles(next.git.untrackedFiles, 0, 0, true);
    setBoundedReviewerDiff(next, 16000);
    if (next.workerDiagnostics) next.workerDiagnostics.stderrTail = boundedTailText(next.workerDiagnostics.stderrTail, 1000);
  });
  if (measured.input.length <= budget) return { ...measured, budget, initialSerializedChars: initialInput.length, compacted: true, compactionSteps };

  measured = apply('retain explicit truncation markers only for optional previews', (next) => {
    next.git.untrackedFiles = next.git.untrackedFiles.map((file) => ({
      path: file.path,
      ...(file.size === undefined ? {} : { size: file.size }),
      ...(file.unavailable ? { unavailable: true } : {}),
      ...(file.truncated ? { truncated: true } : {})
    }));
    setBoundedReviewerDiff(next, 4000);
    if (next.workerDiagnostics) next.workerDiagnostics.stderrTail = boundedTailText(next.workerDiagnostics.stderrTail, 1000);
  });
  if (measured.input.length <= budget) return { ...measured, budget, initialSerializedChars: initialInput.length, compacted: true, compactionSteps };

  measured = apply('minimise optional evidence while retaining markers and git identity', (next) => {
    next.git.untrackedFiles = next.git.untrackedFiles.map((file) => ({
      path: file.path,
      ...(file.size === undefined ? {} : { size: file.size }),
      ...(file.unavailable ? { unavailable: true } : {}),
      ...(file.truncated ? { truncated: true } : {})
    }));
    setBoundedReviewerDiff(next, 1000);
    setBoundedReviewerStatus(next, 4000);
    if (next.workerDiagnostics) next.workerDiagnostics.stderrTail = boundedTailText(next.workerDiagnostics.stderrTail, 500);
  });
  if (measured.input.length <= budget) return { ...measured, budget, initialSerializedChars: initialInput.length, compacted: true, compactionSteps };

  const final = result();
  const error = classifiedError(FAILURE_CLASSES.REVIEWER_INPUT_FAILURE, `reviewer input exceeds configured budget after deterministic compaction: ${final.serializedChars} > ${budget} characters`);
  error.code = 'REVIEWER_INPUT_OVER_BUDGET';
  error.reviewerInput = {
    budget,
    initialSerializedChars: initialInput.length,
    serializedChars: final.serializedChars,
    compactionSteps
  };
  throw error;
}

function validateReview(review, packet) {
  const validVerdicts = new Set(['PASS', 'REPAIR', 'BLOCKED', 'HUMAN_DECISION']);
  const contractFailure = (message) => classifiedError(FAILURE_CLASSES.REVIEWER_CONTRACT_FAILURE, message);
  if (!review || typeof review !== 'object' || Array.isArray(review)) throw contractFailure('reviewer returned a non-object verdict');
  if (Object.keys(review).length !== reviewSchema.required.length || Object.keys(review).some((key) => !reviewSchema.required.includes(key))) {
    throw contractFailure('reviewer returned an unexpected verdict shape');
  }
  if (!validVerdicts.has(review.verdict) || typeof review.summary !== 'string' || !review.summary.trim() || typeof review.reason !== 'string' || !review.reason.trim()) {
    throw contractFailure('reviewer returned an invalid verdict, summary, or reason');
  }
  if (!Array.isArray(review.repairInstructions) || review.repairInstructions.some((item) => typeof item !== 'string')) {
    throw contractFailure('reviewer returned invalid repair instructions');
  }
  if (requiresDesignDecision(packet) && typeof review.designRequired !== 'boolean') {
    throw contractFailure('reviewer must return boolean designRequired during feature Structure');
  }
  if (!requiresDesignDecision(packet) && review.designRequired !== null) {
    throw contractFailure('reviewer returned designRequired outside feature Structure');
  }
  if (review.humanQuestion !== null && typeof review.humanQuestion !== 'string') {
    throw contractFailure('reviewer returned an invalid humanQuestion value');
  }
  if (review.verdict === 'REPAIR' && !review.repairInstructions.length) {
    throw contractFailure('reviewer returned REPAIR without repair instructions');
  }
  if (review.verdict === 'HUMAN_DECISION' && (!review.humanQuestion || !review.humanQuestion.trim())) {
    throw contractFailure('reviewer returned HUMAN_DECISION without a humanQuestion');
  }
}

async function reviewWork(packet, contract, codexResult, evidence, retryContext = null) {
  const instructions = [
    'You are the Lemonteed orchestration reviewer.',
    'You are read-only. Judge the worker against the generated task contract and the compact runtime evidence, not against worker self-claims.',
    'The input deliberately excludes normal worker stdout, stderr, session transcripts, echoed prompts, repository instructions, and planner context.',
    'Use the parsed worker final result, especially worker.deliverable.content, together with the short summary, actual git identity, changed files, commands, verification, bounded diff, and bounded untracked evidence. The deliverable is the substantive work; summary is only a synopsis. A truncation marker means the omitted material was not fully reviewed.',
    'If the worker invocation failed, use only the bounded diagnostic tails and classify the runtime conservatively.',
    'Do not approve deployment, merge, push, publishing, or public-architecture changes; classify those as HUMAN_DECISION or BLOCKED.',
    'Use PASS only when the evidence supports the acceptance criteria and scope boundaries.',
    `Apply this phase-specific evidence standard: ${phaseEvidencePolicy(packet.state.phase)}`,
    'Judge whether evidence is sufficient for the current phase actual responsibility. Structure, Implementation, and QA use stronger repository-proof standards; Content, Design, and Experience Review use fit-for-purpose grounding.',
    'Use REPAIR for bounded correctable failures, BLOCKED for external/technical blockers, and HUMAN_DECISION for product, destructive, deployment, or ambiguous authority decisions.',
    'For feature-build-track Structure phase, designRequired MUST be a boolean because the response schema requires it. For every other phase, designRequired MUST be null because the response schema rejects non-null values.',
    retryContext ? `Your prior reviewer output was rejected as ${retryContext.failureClass}: ${retryContext.reason}\n${retryContext.correction}` : ''
  ].filter(Boolean).join('\n');

  const prepared = compactReviewerInput(buildReviewerPayload(packet, contract, codexResult, evidence));
  const reviewed = await invokeStructured({
    role: 'reviewer',
    provider: REVIEWER_PROVIDER,
    model: ACTIVE_REVIEWER_MODEL,
    instructions,
    input: prepared.input,
    schemaName: 'lemonteed_review_verdict',
    schema: reviewerSchemaFor(packet)
  });
  validateReview(reviewed.output, packet);
  if (reviewed.invocation) reviewed.invocation.verdict = reviewed.output.verdict;
  reviewed.failureClass = FAILURE_CLASSES.REVIEWER_VERDICT;
  reviewed.reviewerInput = {
    budget: prepared.budget,
    serializedChars: prepared.serializedChars,
    initialSerializedChars: prepared.initialSerializedChars,
    compacted: prepared.compacted,
    compactionSteps: prepared.compactionSteps
  };
  return reviewed;
}

function isReviewerOutputFailure(error) {
  return Boolean(error && [
    FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE,
    FAILURE_CLASSES.REVIEWER_CONTRACT_FAILURE
  ].includes(errorFailureClass(error)));
}

function reviewerRetryContext(error, packet) {
  const reason = boundedText(error.message || 'reviewer output was invalid', 4000);
  if (!requiresDesignDecision(packet) && /designRequired/i.test(reason)) {
    return {
      failureClass: FAILURE_CLASSES.REVIEWER_CONTRACT_FAILURE,
      reason,
      correction: 'Your prior reviewer output was invalid because designRequired is only legal during feature Structure. Re-evaluate the existing evidence and return a schema-valid phase verdict with designRequired set to null. Do not request new worker execution unless the evidence itself requires REPAIR.'
    };
  }
  return {
    failureClass: errorFailureClass(error),
    reason,
    correction: 'Your prior reviewer output was invalid. Re-evaluate the existing evidence and return exactly one schema-valid verdict. Do not request new worker execution unless the evidence itself requires REPAIR.'
  };
}

async function reviewWithRetry(packet, contract, codexResult, evidence) {
  let retryContext = null;
  for (let reviewerAttempt = 0; reviewerAttempt <= REVIEWER_RETRY_LIMIT; reviewerAttempt += 1) {
    try {
      const reviewed = await reviewWork(packet, contract, codexResult, evidence, retryContext);
      reviewed.reviewerAttempts = reviewerAttempt + 1;
      return reviewed;
    } catch (error) {
      if (!isReviewerOutputFailure(error) || reviewerAttempt >= REVIEWER_RETRY_LIMIT) {
        error.reviewerAttempts = reviewerAttempt + 1;
        throw error;
      }
      retryContext = reviewerRetryContext(error, packet);
      console.error(`[reviewer] ${retryContext.failureClass}; retrying reviewer only (${reviewerAttempt + 1}/${REVIEWER_RETRY_LIMIT})`);
    }
  }
  throw classifiedError(FAILURE_CLASSES.STRUCTURED_OUTPUT_FAILURE, 'reviewer retry loop ended without a result');
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

function conciseReviewerFailure(error) {
  const message = error && error.message ? error.message : String(error || 'unknown reviewer failure');
  return boundedText(message.replace(/\s*at\s+.*$/s, '').trim(), 4000);
}

function blockReviewerFailure(attempt, error, codexResult, evidence) {
  const failureClass = errorFailureClass(error);
  const reason = `${failureClass}: ${conciseReviewerFailure(error)}`;
  writeAudit(`reviewer-failure-${attempt}.json`, {
    verdict: 'BLOCKED',
    failureClass,
    reason,
    reviewerAttempts: error && error.reviewerAttempts ? error.reviewerAttempts : null,
    workerAudit: `codex-${attempt}.json`,
    evidenceAudit: `evidence-${attempt}.json`,
    workerDiagnostics: codexSucceeded(codexResult) ? null : buildWorkerDiagnostics(codexResult),
    reviewerInput: error && error.reviewerInput ? error.reviewerInput : null
  });
  console.error(`[reviewer] ${reason}`);
  runNode(['block', '--reason', boundedText(reason, MAX_REASON_CHARS), '--verdict', 'BLOCKED']);
  return { terminal: true, verdict: 'BLOCKED' };
}

function writeReviewAudit(attempt, reviewed) {
  const review = reviewed.output;
  writeAudit(`review-${attempt}.json`, {
    ...review,
    _meta: {
      responseId: reviewed.responseId || null,
      usage: reviewed.usage || null,
      invocation: reviewed.invocation,
      failureClass: reviewed.failureClass || FAILURE_CLASSES.REVIEWER_VERDICT,
      reviewerAttempts: reviewed.reviewerAttempts || 1,
      reviewerInput: reviewed.reviewerInput
    }
  });
}

async function processReview(packet, contract, codexResult, evidence, auditAttempt, repairAttempt = auditAttempt) {
  const parsedWorker = parsedWorkerResultFrom(codexResult);
  if (codexResult && codexResult.exitCode === 0 && parsedWorker.error) {
    const protocolError = classifiedError(FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE, parsedWorker.error);
    writeAudit(`worker-protocol-failure-${auditAttempt}.json`, {
      verdict: 'BLOCKED',
      failureClass: protocolError.failureClass,
      reason: protocolError.message,
      workerAudit: `codex-${auditAttempt}.json`,
      evidenceAudit: `evidence-${auditAttempt}.json`
    });
    console.error(`[worker] ${protocolError.failureClass}: ${protocolError.message}`);
    runNode(['block', '--reason', boundedText(`${protocolError.failureClass}: ${protocolError.message}`, MAX_REASON_CHARS), '--verdict', 'BLOCKED']);
    return { terminal: true, verdict: 'BLOCKED' };
  }
  console.log(`[reviewer] reviewing evidence with ${ACTIVE_REVIEWER_MODEL} via ${REVIEWER_PROVIDER}`);
  let reviewed;
  try {
    reviewed = await reviewWithRetry(packet, contract, codexResult, evidence);
  } catch (error) {
    return blockReviewerFailure(auditAttempt, error, codexResult, evidence);
  }

  writeReviewAudit(auditAttempt, reviewed);
  const review = reviewed.output;
  console.log(`[orchestrator] verdict: ${review.verdict} — ${review.summary}`);

  if (review.verdict === 'PASS') {
    if (!codexSucceeded(codexResult)) {
      runNode([
        'block',
        '--reason',
        boundedText(`Codex execution failed or returned an incomplete worker result before review: ${codexResult.error || codexResult.workerFinalResultParseError || codexResult.stderr || `exit code ${codexResult.exitCode}`}`, MAX_REASON_CHARS),
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

  if (repairAttempt >= MAX_REPAIRS) {
    runNode([
      'block',
      '--reason',
      boundedText(`Repair limit reached after ${MAX_REPAIRS} repair attempts. Last review: ${review.summary}: ${review.reason}`, MAX_REASON_CHARS),
      '--verdict',
      'BLOCKED'
    ]);
    return { terminal: true, verdict: 'BLOCKED' };
  }

  return {
    terminal: false,
    verdict: 'REPAIR',
    repairContext: {
      previousContract: contract,
      previousCodexResult: codexResult,
      reviewer: review,
      currentEvidence: evidence
    }
  };
}

function preflight(allowDirty) {
  validateBoundedInteger(MAX_REPAIRS, 'ORCHESTRATOR_MAX_REPAIRS', 0, 10);
  validateBoundedInteger(MAX_DIFF_CHARS, 'ORCHESTRATOR_MAX_DIFF_CHARS', 1, 10000000);
  validateBoundedInteger(MAX_CODEX_OUTPUT_CHARS, 'ORCHESTRATOR_MAX_CODEX_OUTPUT_CHARS', 1024, 10000000);
  validateBoundedInteger(MAX_REVIEWER_INPUT_CHARS, 'ORCHESTRATOR_MAX_REVIEWER_INPUT_CHARS', 1024, 1048576);
  validateBoundedInteger(MAX_UNTRACKED_FILES, 'ORCHESTRATOR_MAX_UNTRACKED_FILES', 1, 1000);
  validateBoundedInteger(MAX_UNTRACKED_FILE_CHARS, 'ORCHESTRATOR_MAX_UNTRACKED_FILE_CHARS', 1, 1000000);
  validateBoundedInteger(MAX_UNTRACKED_TOTAL_CHARS, 'ORCHESTRATOR_MAX_UNTRACKED_TOTAL_CHARS', 1, 10000000);
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

function smokePacket() {
  return {
    runtimePacketVersion: 1,
    role: 'Lemonteed orchestration transport smoke test',
    instruction: 'Convert this harmless packet into a no-op task contract. Do not modify files.',
    state: {
      project: 'Lemonteed',
      objective: 'Verify authenticated Codex CLI planner/reviewer transport only',
      target: '/orchestration-runtime/',
      track: 'qa-review-track',
      phase: 'QA',
      currentWorker: { phase: 'QA', worker: 'QA_WORKER.md' },
      completedWorkers: [],
      constraints: ['Read-only smoke test', 'No worker execution', 'No repository changes'],
      validationCommands: [],
      lastResult: null
    },
    repository: {
      branch: git('branch', '--show-current'),
      head: git('rev-parse', 'HEAD'),
      status: git('status', '--short')
    },
    context: {
      source: 'adapter smoke test',
      notes: 'The generated contract must be harmless and scoped to transport verification.'
    }
  };
}

function smokeContract() {
  return {
    taskId: 'transport-smoke-contract',
    worker: 'QA_WORKER.md',
    mission: 'Verify orchestration transport without changing the repository',
    currentState: 'Repository state is supplied as read-only evidence.',
    inScope: ['Transport verification only'],
    outOfScope: ['All file changes', 'Deployment', 'Merge', 'Push', 'Publish'],
    requirements: ['Treat this as a no-op review fixture.'],
    acceptanceCriteria: ['The reviewer receives complete structured evidence.'],
    verification: ['Review the supplied git evidence.'],
    evidenceRequired: ['Actual git evidence from the adapter'],
    stopConditions: ['Stop if evidence is incomplete or the transport is unavailable.'],
    codexPrompt: 'Do not execute a worker. This is a reviewer-only transport smoke test.'
  };
}

function ensureCodexCliSmokeProvider() {
  if (ORCHESTRATOR_PROVIDER !== 'codex-cli' || REVIEWER_PROVIDER !== 'codex-cli') {
    throw new Error('smoke commands require ORCHESTRATOR_PROVIDER and REVIEWER_PROVIDER to be codex-cli');
  }
}

async function plannerSmoke() {
  ensureCodexCliSmokeProvider();
  const packet = smokePacket();
  const planned = await createContract(packet);
  writeAudit('smoke-planner.json', {
    contract: planned.output,
    invocation: planned.invocation
  });
  return planned.output;
}

async function reviewerSmoke() {
  ensureCodexCliSmokeProvider();
  const packet = smokePacket();
  const contract = smokeContract();
  const workerOutput = {
    role: 'worker',
    provider: 'codex-cli',
    requestedModel: WORKER_MODEL,
    exitCode: 0,
    signal: null,
    stdout: '',
    stderr: '',
    finalOutput: JSON.stringify({ result: 'no worker executed; harmless reviewer fixture' }),
    parsedWorkerFinalResult: {
      status: 'completed',
      summary: 'No worker executed; harmless reviewer fixture',
      deliverable: { type: 'qa-report', content: 'Transport smoke fixture; no implementation work was requested.' },
      filesChanged: [],
      commandsRun: [],
      verification: [],
      scopeDeviations: [],
      residualRisks: [],
      blockers: [],
      recommendedNextAction: ''
    },
    stdoutTruncated: false,
    stderrTruncated: false,
    finalOutputTruncated: false,
    error: null,
    timedOut: false,
    verdict: null,
    actualExecutable: CLI_INFO.actualExecutable,
    codexCliVersion: CLI_INFO.version
  };
  const evidence = collectEvidence();
  const reviewed = await reviewWork(packet, contract, workerOutput, evidence);
  writeAudit('smoke-reviewer.json', {
    verdict: reviewed.output,
    invocation: reviewed.invocation,
    reviewerInput: reviewed.reviewerInput,
    evidence
  });
  return reviewed.output;
}

async function runWorker(repairContext = null, packetOverride = null, startingAttempt = 0, startingRepairAttempt = startingAttempt) {
  const packet = packetOverride || JSON.parse(runNode(['next']));
  writeAudit('packet.json', packet);

  for (let attempt = startingAttempt, repairAttempt = startingRepairAttempt; repairAttempt <= MAX_REPAIRS; attempt += 1, repairAttempt += 1) {
    console.log(`\n[orchestrator] planning ${packet.state.phase}${repairAttempt ? ` repair ${repairAttempt}` : ''} with ${ACTIVE_PLANNER_MODEL} via ${ORCHESTRATOR_PROVIDER}`);
    const planned = await createContract(packet, repairContext);
    const contract = planned.output;
    writeAudit(`contract-${attempt}.json`, { ...contract, _meta: { responseId: planned.responseId || null, usage: planned.usage || null, invocation: planned.invocation } });

    console.log(`[codex] executing ${contract.taskId}: ${contract.mission} with ${WORKER_MODEL}`);
    const codexResult = executeCodex(contract, spawnSync, null, packet);
    writeAudit(`codex-${attempt}.json`, codexResult);

    const evidence = collectEvidence();
    writeAudit(`evidence-${attempt}.json`, evidence);
    if (codexSucceeded(codexResult)) writePreservedWorkerManifest(attempt, packet, contract, evidence);

    const outcome = await processReview(packet, contract, codexResult, evidence, attempt, repairAttempt);
    if (outcome.repairContext) {
      repairContext = outcome.repairContext;
      continue;
    }
    return outcome;
  }

  return { terminal: true, verdict: 'BLOCKED' };
}

function reportPreservedEvidenceBlock(error) {
  const reason = conciseReviewerFailure(error);
  console.error(`[orchestrator] BLOCKED: ${reason}`);
  return { terminal: true, verdict: 'BLOCKED', reason };
}

async function resumeCurrentWorker(preserved = null) {
  const evidence = preserved || loadPreservedEvidence({ strict: true });
  writeDeliverableMigrationAudit(evidence);
  const state = currentRuntimeState();
  if (state.status === 'blocked') runNode(['unblock']);

  const migratedLegacyProtocol = Boolean(evidence.codexResult.deliverableMigration);
  const repairAttempt = migratedLegacyProtocol ? 0 : evidence.attempt;
  if (migratedLegacyProtocol) {
    writeAudit(`repair-budget-migration-${evidence.attempt}.json`, {
      rule: 'legacy worker protocol plus successfully migrated compatible deliverable resets the current-phase repair counter',
      preservedAuditAttempt: evidence.attempt,
      effectiveRepairAttempt: repairAttempt,
      phase: evidence.packet.state.phase,
      worker: evidence.packet.state.currentWorker
    });
  }
  const outcome = await processReview(
    evidence.packet,
    evidence.contract,
    evidence.codexResult,
    evidence.evidence,
    evidence.attempt,
    repairAttempt
  );
  if (outcome.repairContext) {
    return runWorker(outcome.repairContext, evidence.packet, nextAuditAttempt(evidence.attempt + 1), repairAttempt + 1);
  }
  return outcome;
}

async function main() {
  const args = argsFrom(process.argv.slice(2));
  const command = args._[0] || 'run';
  if (!['run', 'resume', 'review-current', 'smoke-planner', 'smoke-reviewer'].includes(command)) die(`unsupported command: ${command}`);
  if (args.escalate !== undefined && args.escalate !== true) die('--escalate is a flag and takes no value');
  if (args['allow-dirty'] !== undefined && args['allow-dirty'] !== true) die('--allow-dirty is a flag and takes no value');
  if (args.all !== undefined && args.all !== true) die('--all is a flag and takes no value');
  if (!['run', 'resume', 'review-current'].includes(command) && (args.escalate === true || args.all === true)) die('smoke commands do not support --escalate or --all');
  configureModel(args.escalate === true);
  preflight(args['allow-dirty'] === true);
  ensureLocalDir();

  if (command === 'smoke-planner') {
    console.log(JSON.stringify(await plannerSmoke()));
    return;
  }
  if (command === 'smoke-reviewer') {
    console.log(JSON.stringify(await reviewerSmoke()));
    return;
  }

  if (command === 'resume' || command === 'review-current') {
    try {
      await resumeCurrentWorker();
    } catch (error) {
      reportPreservedEvidenceBlock(error);
    }
    console.log('\n[orchestrator] run complete');
    console.log(runNode(['status']));
    return;
  }

  let count = 0;
  let resumedCurrentWorker = false;
  while (true) {
    count += 1;
    if (count > 20) die('safety stop: exceeded 20 worker passes in one run');
    let result;
    if (!resumedCurrentWorker && args.all === true) {
      const state = currentRuntimeState();
      if (state.status === 'blocked') {
        try {
          result = await resumeCurrentWorker();
        } catch (error) {
          reportPreservedEvidenceBlock(error);
          break;
        }
        resumedCurrentWorker = true;
      } else {
        const preserved = loadPreservedEvidence({ strict: false });
        if (preserved) {
          result = await resumeCurrentWorker(preserved);
          resumedCurrentWorker = true;
        }
      }
    }
    if (!result) result = await runWorker();
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
  workerResultSchema,
  workerResultSchemaFor,
  reviewSchema,
  reviewerSchemaFor,
  requiresDesignDecision,
  FAILURE_CLASSES,
  boundedText,
  boundedTailText,
  boundedDiffText,
  parseWorkerFinalResult,
  projectWorkerFinalResult,
  validateWorkerFinalResult,
  workerFinalResultIsComplete,
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
  collectUntrackedEvidence,
  collectEvidence,
  buildReviewerPayload,
  compactReviewerInput,
  reviewWork,
  reviewWithRetry,
  loadPreservedEvidence,
  nextAuditAttempt,
  validatePreservedCompatibility,
  evidenceHasNoWorkerChanges,
  legacyDeliverableContent,
  phaseEvidencePolicy,
  processReview,
  resumeCurrentWorker,
  resolveCodexExecutable,
  getCodexVersion,
  configureModel,
  main
};
