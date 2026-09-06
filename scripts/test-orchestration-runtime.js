#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const adapter = require('./orchestrator-adapter.js');

const ROOT = adapter.ROOT;
const STATE_PATH = path.join(ROOT, 'agents', 'runtime', 'state.json');
const LOCAL_DIR = path.join(ROOT, '.orchestration-local');
const MOCK_CLI = path.join(LOCAL_DIR, 'mock-codex-cli.js');
const originalState = fs.readFileSync(STATE_PATH, 'utf8');

function expectThrow(fn, pattern) {
  assert.throws(fn, pattern);
}

function writeMockCli() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const source = [
    "const fs = require('fs');",
    "const args = process.argv.slice(2);",
    "if (args.includes('--version')) { process.stdout.write('mock-codex-cli 1.0.0\\\\n'); process.exit(0); }",
    "const prompt = fs.readFileSync(0, 'utf8');",
    "const outputIndex = args.indexOf('--output-last-message');",
    "const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;",
    "const writeOutput = (value) => { if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(value)); };",
    "const fail = (message, code = 1) => { process.stderr.write(message + '\\\\n'); process.exit(code); };",
    "if (process.env.MOCK_SLEEP_MS) { const until = Date.now() + Number(process.env.MOCK_SLEEP_MS); while (Date.now() < until) {} }",
    "if (prompt.startsWith('You are the Lemonteed orchestration planner.')) {",
    "  if (process.env.MOCK_PLANNER_EXIT) fail('planner mock failure', Number(process.env.MOCK_PLANNER_EXIT));",
    "  if (process.env.MOCK_MODEL_UNAVAILABLE) fail('model gpt-5.6-luna is not available');",
    "  const match = prompt.match(/\"currentWorker\"\\s*:\\s*\\{[\\s\\S]*?\"worker\"\\s*:\\s*\"([^\"]+)\"/);",
    "  writeOutput({ taskId: 'mock-task', worker: match ? match[1] : 'QA_WORKER.md', mission: 'Mock harmless task', currentState: 'Mock state', inScope: ['mock'], outOfScope: ['deploy'], requirements: ['run mock'], acceptanceCriteria: ['mock passes'], verification: ['mock verification'], evidenceRequired: ['actual git evidence'], stopConditions: ['stop on failure'], codexPrompt: 'Return the bounded mock worker result.' });",
    "  process.exit(0);",
    "}",
    "if (prompt.startsWith('You are the Lemonteed orchestration reviewer.')) {",
    "  if (process.env.MOCK_REVIEW_MALFORMED) { if (outputPath) fs.writeFileSync(outputPath, '{malformed'); process.exit(0); }",
    "  const reviewFile = process.env.MOCK_REVIEW_FILE;",
    "  let index = 0;",
    "  if (reviewFile && fs.existsSync(reviewFile)) index = Number(fs.readFileSync(reviewFile, 'utf8'));",
    "  if (reviewFile) fs.writeFileSync(reviewFile, String(index + 1));",
    "  const sequence = (process.env.MOCK_REVIEW_SEQUENCE || 'PASS').split(',');",
    "  const verdict = sequence[Math.min(index, sequence.length - 1)];",
    "  writeOutput({ verdict, summary: 'Mock reviewer result', reason: 'Mock evidence result', designRequired: null, repairInstructions: verdict === 'REPAIR' ? ['Run the mock repair.'] : [], humanQuestion: verdict === 'HUMAN_DECISION' ? 'Confirm the mock decision.' : null });",
    "  process.exit(0);",
    "}",
    "if (process.env.MOCK_WORKER_EXIT) fail('worker mock failure', Number(process.env.MOCK_WORKER_EXIT));",
    "writeOutput({ result: 'worker complete', evidence: ['mock'] });",
    "process.stdout.write('mock worker complete\\\\n');",
    "process.exit(0);"
  ].join('\n');
  fs.writeFileSync(MOCK_CLI, source);
}

function baseEnv(extra = {}) {
  return {
    ...process.env,
    CODEX_CLI_PATH: MOCK_CLI,
    CODEX_ARGS_JSON: '["exec"]',
    ORCHESTRATOR_PROVIDER: 'codex-cli',
    REVIEWER_PROVIDER: 'codex-cli',
    WORKER_PROVIDER: 'codex-cli',
    ORCHESTRATOR_MODEL: 'gpt-5.6-luna',
    REVIEWER_MODEL: 'gpt-5.6-luna',
    WORKER_MODEL: 'gpt-5.6-luna',
    ORCHESTRATOR_MAX_MODEL: 'gpt-5.6-luna',
    ORCHESTRATOR_MAX_REPAIRS: '2',
    ...extra
  };
}

function runNode(script, args, env = process.env) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
}

function resetState() {
  fs.writeFileSync(STATE_PATH, originalState);
  const reviewFile = path.join(LOCAL_DIR, 'mock-review-count.txt');
  if (fs.existsSync(reviewFile)) fs.unlinkSync(reviewFile);
}

function startQa() {
  const result = runNode(path.join(ROOT, 'scripts', 'orchestrate.js'), [
    'start', '--goal', 'Mock orchestration task', '--target', '/mock/', '--track', 'qa-review-track'
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
}

function runAdapter(extra = {}) {
  return runNode(path.join(ROOT, 'scripts', 'orchestrator-adapter.js'), ['run', '--allow-dirty'], baseEnv(extra));
}

function assertStatus(expected) {
  const result = runNode(path.join(ROOT, 'scripts', 'orchestrate.js'), ['status']);
  assert.strictEqual(result.status, 0, result.stderr);
  const state = JSON.parse(result.stdout);
  assert.strictEqual(state.status, expected, result.stdout);
  return state;
}

function testPureTransportBoundaries() {
  const info = { command: process.execPath, argsPrefix: [], actualExecutable: 'mock-codex', version: 'mock-codex 1.0.0' };
  const packet = { state: { currentWorker: { worker: 'QA_WORKER.md' }, track: 'qa-review-track', phase: 'QA' } };
  const validContract = {
    taskId: 'task', worker: 'QA_WORKER.md', mission: 'mission', currentState: 'state', codexPrompt: 'prompt',
    inScope: [], outOfScope: [], requirements: [], acceptanceCriteria: [], verification: [], evidenceRequired: [], stopConditions: []
  };
  let mode = 'success';
  const runner = (command, args) => {
    const outputPath = args[args.indexOf('--output-last-message') + 1];
    if (mode === 'failure') return { status: 1, signal: null, stdout: '', stderr: 'planner failed', error: null };
    if (mode === 'timeout') return { status: null, signal: 'SIGTERM', stdout: '', stderr: '', error: { code: 'ETIMEDOUT', message: 'timed out' } };
    fs.writeFileSync(outputPath, JSON.stringify(validContract));
    return { status: 0, signal: null, stdout: '', stderr: '', error: null };
  };
  const success = adapter.invokeCodexCli({ role: 'planner', model: 'gpt-5.6-luna', instructions: 'planner', input: '{}', schemaName: 'task', schema: adapter.taskSchema, runner, cliInfo: info });
  assert.strictEqual(success.output.taskId, 'task');
  mode = 'failure';
  expectThrow(() => adapter.invokeCodexCli({ role: 'planner', model: 'gpt-5.6-luna', instructions: 'planner', input: '{}', schemaName: 'task', schema: adapter.taskSchema, runner, cliInfo: info }), /invocation failed/);
  mode = 'timeout';
  expectThrow(() => adapter.invokeCodexCli({ role: 'planner', model: 'gpt-5.6-luna', instructions: 'planner', input: '{}', schemaName: 'task', schema: adapter.taskSchema, runner, cliInfo: info }), /timed out/);
  const malformedRunner = (command, args) => {
    fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], '{malformed');
    return { status: 0, signal: null, stdout: '', stderr: '', error: null };
  };
  expectThrow(() => adapter.invokeCodexCli({ role: 'reviewer', model: 'gpt-5.6-luna', instructions: 'reviewer', input: '{}', schemaName: 'review', schema: adapter.reviewSchema, runner: malformedRunner, cliInfo: info }), /malformed structured output/);
  const unavailableRunner = () => ({ status: 1, signal: null, stdout: '', stderr: 'model gpt-5.6-luna is unavailable', error: null });
  expectThrow(() => adapter.invokeCodexCli({ role: 'planner', model: 'gpt-5.6-luna', instructions: 'planner', input: '{}', schemaName: 'task', schema: adapter.taskSchema, runner: unavailableRunner, cliInfo: info }), /model gpt-5\.6-luna.*unavailable/);
  expectThrow(() => adapter.resolveCodexExecutable({ explicit: path.join(LOCAL_DIR, 'missing-codex.exe'), configured: null, candidates: [] }), /does not exist/);
  expectThrow(() => adapter.chooseCodexCandidate({ candidates: ['C:\\\\codex-a.exe', 'C:\\\\codex-b.exe'] }), /conflicting Codex CLI installations/);
  assert.strictEqual(adapter.codexSucceeded({ exitCode: 7, signal: null, error: null, timedOut: false, stdoutTruncated: false, stderrTruncated: false }), false);
  assert.strictEqual(adapter.safeCliEnvironment().OPENAI_API_KEY, undefined);
  const args = adapter.buildCodexArgs({ role: 'planner', model: 'gpt-5.6-luna', sandbox: 'read-only', schemaPath: 'schema.json', outputPath: 'output.json' });
  assert(args.includes('--sandbox') && args.includes('read-only'));
  assert(!args.includes('--ignore-user-config'));
  assert(args.includes('--output-schema') && args.includes('--output-last-message'));
}

function testPlannerAndReviewerSuccess() {
  resetState();
  startQa();
  const result = runAdapter();
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  const state = assertStatus('complete');
  assert.strictEqual(state.lastResult.verdict, 'PASS');
  const contract = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, 'contract-0.json'), 'utf8'));
  const worker = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, 'codex-0.json'), 'utf8'));
  const review = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, 'review-0.json'), 'utf8'));
  assert.strictEqual(contract._meta.invocation.role, 'planner');
  assert.strictEqual(contract._meta.invocation.provider, 'codex-cli');
  assert.strictEqual(worker.role, 'worker');
  assert.strictEqual(worker.provider, 'codex-cli');
  assert.strictEqual(review._meta.invocation.role, 'reviewer');
  assert.strictEqual(review._meta.invocation.verdict, 'PASS');
  assert.match(review._meta.invocation.codexCliVersion, /mock-codex-cli/);
}

function testPlannerFailure() {
  resetState();
  startQa();
  const result = runAdapter({ MOCK_PLANNER_EXIT: '7' });
  assert.notStrictEqual(result.status, 0);
  assertStatus('active');
}

function testReviewerMalformed() {
  resetState();
  startQa();
  const result = runAdapter({ MOCK_REVIEW_MALFORMED: '1' });
  assert.notStrictEqual(result.status, 0);
  assertStatus('active');
}

function testUnavailableModel() {
  resetState();
  startQa();
  const result = runAdapter({ MOCK_MODEL_UNAVAILABLE: '1' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr + '\n' + result.stdout, /model gpt-5\.6-luna.*unavailable/i);
  assertStatus('active');
}

function testWorkerFailureAndTimeout() {
  resetState();
  startQa();
  const failedWorker = runAdapter({ MOCK_WORKER_EXIT: '7' });
  assert.strictEqual(failedWorker.status, 0, failedWorker.stderr + failedWorker.stdout);
  assertStatus('blocked');

  resetState();
  startQa();
  const timeout = runAdapter({ MOCK_SLEEP_MS: '1100', ORCHESTRATOR_CODEX_TIMEOUT_MS: '1000' });
  assert.notStrictEqual(timeout.status, 0);
  assertStatus('active');
}

function testRepairHumanBlocked() {
  resetState();
  startQa();
  const reviewFile = path.join(LOCAL_DIR, 'mock-review-count.txt');
  const repair = runAdapter({ MOCK_REVIEW_SEQUENCE: 'REPAIR,PASS', MOCK_REVIEW_FILE: reviewFile });
  assert.strictEqual(repair.status, 0, repair.stderr + repair.stdout);
  assertStatus('complete');
  assert.strictEqual(Number(fs.readFileSync(reviewFile, 'utf8')), 2);

  for (const verdict of ['BLOCKED', 'HUMAN_DECISION']) {
    resetState();
    startQa();
    const result = runAdapter({ MOCK_REVIEW_SEQUENCE: verdict });
    assert.strictEqual(result.status, 0, result.stderr + result.stdout);
    const state = assertStatus('blocked');
    assert.strictEqual(state.lastResult.verdict, verdict);
  }
}

function main() {
  try {
    testPureTransportBoundaries();
    writeMockCli();
    testPlannerAndReviewerSuccess();
    testPlannerFailure();
    testReviewerMalformed();
    testUnavailableModel();
    testWorkerFailureAndTimeout();
    testRepairHumanBlocked();
    resetState();
    const finalState = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    assert.strictEqual(finalState.status, 'idle');
    assert.strictEqual(finalState.phase, 'Intake');
    console.log('orchestration runtime mocked tests: PASS');
  } finally {
    fs.writeFileSync(STATE_PATH, originalState);
  }
}

main();
