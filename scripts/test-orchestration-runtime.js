#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const adapter = require('./orchestrator-adapter.js');
const repositorySearch = require('./repository-search.js');

const ROOT = adapter.ROOT;
const STATE_PATH = path.join(ROOT, 'agents', 'runtime', 'state.json');
const LOCAL_DIR = path.join(ROOT, '.orchestration-local');
const MOCK_CLI = path.join(LOCAL_DIR, 'mock-codex-cli.js');
const REVIEW_INPUT_CAPTURE = path.join(LOCAL_DIR, 'mock-review-input.txt');
const originalState = fs.readFileSync(STATE_PATH, 'utf8');
const originalStateObject = JSON.parse(originalState);
const originalLocalFiles = new Map(
  fs.existsSync(LOCAL_DIR)
    ? fs.readdirSync(LOCAL_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => [entry.name, fs.readFileSync(path.join(LOCAL_DIR, entry.name))])
    : []
);

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
    "const bump = (file) => { if (file) { const current = fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8')) : 0; fs.writeFileSync(file, String(current + 1)); } };",
    "if (process.env.MOCK_SLEEP_MS) { const until = Date.now() + Number(process.env.MOCK_SLEEP_MS); while (Date.now() < until) {} }",
    "if (prompt.startsWith('You are the Lemonteed orchestration planner.')) {",
    "  bump(process.env.MOCK_PLANNER_COUNT_FILE);",
    "  if (process.env.MOCK_PLANNER_EXIT) fail('planner mock failure', Number(process.env.MOCK_PLANNER_EXIT));",
    "  if (process.env.MOCK_MODEL_UNAVAILABLE) fail('model gpt-5.6-luna is not available');",
    "  const match = prompt.match(/\"currentWorker\"\\s*:\\s*\\{[\\s\\S]*?\"worker\"\\s*:\\s*\"([^\"]+)\"/);",
    "  writeOutput({ taskId: 'mock-task', worker: match ? match[1] : 'QA_WORKER.md', mission: 'Mock harmless task', currentState: 'Mock state', inScope: ['mock'], outOfScope: ['deploy'], requirements: ['run mock'], acceptanceCriteria: ['mock passes'], verification: ['mock verification'], evidenceRequired: ['actual git evidence'], stopConditions: ['stop on failure'], codexPrompt: 'Return the bounded mock worker result.' });",
    "  process.exit(0);",
    "}",
    "if (prompt.startsWith('You are the Lemonteed orchestration reviewer.')) {",
    "  bump(process.env.MOCK_REVIEW_COUNT_FILE);",
    "  if (process.env.MOCK_REVIEW_EXIT) fail('reviewer mock failure', Number(process.env.MOCK_REVIEW_EXIT));",
    "  if (process.env.MOCK_REVIEW_MALFORMED) { if (outputPath) fs.writeFileSync(outputPath, '{malformed'); process.exit(0); }",
    "  if (process.env.MOCK_CAPTURE_REVIEW_INPUT) fs.writeFileSync(process.env.MOCK_CAPTURE_REVIEW_INPUT, prompt);",
    "  const reviewFile = process.env.MOCK_REVIEW_FILE;",
    "  let index = 0;",
    "  if (reviewFile && fs.existsSync(reviewFile)) index = Number(fs.readFileSync(reviewFile, 'utf8'));",
    "  if (reviewFile) fs.writeFileSync(reviewFile, String(index + 1));",
    "  const sequence = (process.env.MOCK_REVIEW_SEQUENCE || 'PASS').split(',');",
    "  const verdict = sequence[Math.min(index, sequence.length - 1)];",
    "  const isStructure = /\"phase\"\\s*:\\s*\"Structure\"/.test(prompt);",
    "  const illegalDesign = process.env.MOCK_REVIEW_ILLEGAL_DESIGN && index < Number(process.env.MOCK_REVIEW_ILLEGAL_DESIGN);",
    "  writeOutput({ verdict, summary: 'Mock reviewer result', reason: 'Mock evidence result', designRequired: illegalDesign ? true : (isStructure ? true : null), repairInstructions: verdict === 'REPAIR' ? ['Run the mock repair.'] : [], humanQuestion: verdict === 'HUMAN_DECISION' ? 'Confirm the mock decision.' : null });",
    "  process.exit(0);",
    "}",
    "if (process.env.MOCK_WORKER_SLEEP_MS) { const until = Date.now() + Number(process.env.MOCK_WORKER_SLEEP_MS); while (Date.now() < until) {} }",
    "bump(process.env.MOCK_WORKER_COUNT_FILE);",
    "if (process.env.MOCK_WORKER_EXIT) fail('worker mock failure', Number(process.env.MOCK_WORKER_EXIT));",
    "if (process.env.MOCK_HUGE_OUTPUT) { process.stdout.write('s'.repeat(900000)); process.stderr.write('e'.repeat(900000)); }",
    "writeOutput({ status: 'completed', summary: 'worker complete', filesChanged: ['scripts/example.js'], commandsRun: ['node scripts/example.js'], verification: [{ check: 'mock', result: 'pass', evidence: 'mock verification' }], scopeDeviations: [], residualRisks: ['mock risk'], blockers: [], recommendedNextAction: '' });",
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
  for (const name of ['mock-review-count.txt', 'mock-review-count-env.txt', 'mock-planner-count.txt', 'mock-worker-count.txt']) {
    const file = path.join(LOCAL_DIR, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  if (fs.existsSync(REVIEW_INPUT_CAPTURE)) fs.unlinkSync(REVIEW_INPUT_CAPTURE);
}

function startQa() {
  const result = runNode(path.join(ROOT, 'scripts', 'orchestrate.js'), [
    'start', '--goal', 'Mock orchestration task', '--target', '/mock/', '--track', 'qa-review-track', '--force'
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
}

function runAdapter(extra = {}) {
  return runNode(path.join(ROOT, 'scripts', 'orchestrator-adapter.js'), ['run', '--allow-dirty'], baseEnv(extra));
}

function runAdapterAll(extra = {}) {
  return runNode(path.join(ROOT, 'scripts', 'orchestrator-adapter.js'), ['run', '--all', '--allow-dirty'], baseEnv(extra));
}

function runAdapterCommand(command, extra = {}) {
  return runNode(path.join(ROOT, 'scripts', 'orchestrator-adapter.js'), [command, '--allow-dirty'], baseEnv(extra));
}

function counterPath(name) {
  return path.join(LOCAL_DIR, name);
}

function counterValue(name) {
  const file = counterPath(name);
  return fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8')) : 0;
}

function startFeatureStructure() {
  const result = runNode(path.join(ROOT, 'scripts', 'orchestrate.js'), [
    'start', '--goal', 'Mock feature structure task', '--target', '/mock-feature/', '--track', 'feature-build-track', '--force'
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
}

function restoreLocalArtifacts() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  for (const entry of fs.readdirSync(LOCAL_DIR, { withFileTypes: true })) {
    if (entry.isFile() && !originalLocalFiles.has(entry.name)) fs.unlinkSync(path.join(LOCAL_DIR, entry.name));
  }
  for (const [name, content] of originalLocalFiles) fs.writeFileSync(path.join(LOCAL_DIR, name), content);
}

function assertStatus(expected) {
  const result = runNode(path.join(ROOT, 'scripts', 'orchestrate.js'), ['status']);
  assert.strictEqual(result.status, 0, result.stderr);
  const state = JSON.parse(result.stdout);
  assert.strictEqual(state.status, expected, result.stdout);
  return state;
}

function reviewerFixture() {
  return {
    packet: {
      state: {
        objective: 'Fixture objective',
        target: '/fixture/',
        track: 'qa-review-track',
        phase: 'QA',
        currentWorker: { phase: 'QA', worker: 'QA_WORKER.md' },
        constraints: ['Keep the public architecture static.']
      }
    },
    contract: {
      taskId: 'fixture-task',
      worker: 'QA_WORKER.md',
      mission: 'Verify the fixture',
      currentState: 'Fixture state',
      inScope: ['scripts/example.js'],
      outOfScope: ['Deployment'],
      requirements: ['Run the fixture check.'],
      acceptanceCriteria: ['The fixture check passes.'],
      verification: ['node scripts/example.js'],
      evidenceRequired: ['Worker result and git evidence'],
      stopConditions: ['Stop on missing evidence.'],
      codexPrompt: 'Run the fixture check and return the Worker Result.'
    },
    evidence: {
      branch: 'orchestration-runtime-v1',
      head: 'abc1234',
      status: ' M scripts/example.js',
      diffCheck: 'clean',
      diffStat: ' scripts/example.js | 1 +',
      changedFiles: ['scripts/example.js'],
      diff: 'diff --git a/scripts/example.js b/scripts/example.js\n+fixture',
      diffTruncated: false,
      untrackedFiles: [],
      untrackedTruncated: false
    }
  };
}

function successfulWorkerResult(overrides = {}) {
  return {
    role: 'worker',
    exitCode: 0,
    signal: null,
    stdout: '',
    stderr: '',
    stdoutTruncated: false,
    stderrTruncated: false,
    finalOutput: JSON.stringify({
      status: 'completed',
      summary: 'Fixture complete',
      filesChanged: ['scripts/example.js'],
      commandsRun: ['node scripts/example.js'],
      verification: [{ check: 'fixture', result: 'pass', evidence: 'fixture passed' }],
      scopeDeviations: [],
      residualRisks: [],
      blockers: [],
      recommendedNextAction: ''
    }),
    finalOutputTruncated: false,
    parsedWorkerFinalResult: {
      status: 'completed',
      summary: 'Fixture complete',
      filesChanged: ['scripts/example.js'],
      commandsRun: ['node scripts/example.js'],
      verification: [{ check: 'fixture', result: 'pass', evidence: 'fixture passed' }],
      scopeDeviations: [],
      residualRisks: [],
      blockers: [],
      recommendedNextAction: ''
    },
    workerFinalResultParseError: null,
    error: null,
    timedOut: false,
    provider: 'codex-cli',
    requestedModel: 'gpt-5.6-luna',
    ...overrides
  };
}

function reviewResult(overrides = {}) {
  return {
    verdict: 'PASS',
    summary: 'Fixture review passed',
    reason: 'Fixture evidence is sufficient',
    designRequired: null,
    repairInstructions: [],
    humanQuestion: null,
    ...overrides
  };
}

function packetForPhase(track, phase, worker) {
  const fixture = reviewerFixture();
  return {
    ...fixture.packet,
    state: {
      ...fixture.packet.state,
      track,
      phase,
      currentWorker: { phase, worker }
    }
  };
}

function gitValue(...args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function testPhaseAwareReviewerSchemas() {
  const structure = packetForPhase('feature-build-track', 'Structure', 'STRUCTURE_WORKER.md');
  assert.strictEqual(adapter.reviewerSchemaFor(structure).properties.designRequired.type, 'boolean');
  assert.doesNotThrow(() => adapter.validateReview(reviewResult({ designRequired: false }), structure));
  expectThrow(() => adapter.validateReview(reviewResult(), structure), /must return boolean designRequired/);

  for (const [phase, worker] of [
    ['Design', 'DESIGN_WORKER.md'],
    ['Implementation', 'IMPLEMENTATION_WORKER.md'],
    ['Experience Review', 'EXPERIENCE_DIRECTOR.md'],
    ['QA', 'QA_WORKER.md']
  ]) {
    const packet = packetForPhase('feature-build-track', phase, worker);
    assert.strictEqual(adapter.reviewerSchemaFor(packet).properties.designRequired.type, 'null');
    assert.doesNotThrow(() => adapter.validateReview(reviewResult(), packet));
    expectThrow(() => adapter.validateReview(reviewResult({ designRequired: true }), packet), /outside feature Structure/);
  }
}

function testPreservedEvidenceCompatibility() {
  const branch = gitValue('branch', '--show-current');
  const head = gitValue('rev-parse', 'HEAD');
  const state = {
    status: 'active',
    objective: 'Fixture objective',
    target: '/fixture/',
    track: 'qa-review-track',
    phase: 'QA',
    workerSequence: [{ phase: 'QA', worker: 'QA_WORKER.md' }],
    currentWorkerIndex: 0,
    completedWorkers: []
  };
  const base = reviewerFixture();
  const packet = {
    ...base.packet,
    repository: { branch, head },
    state: { ...base.packet.state, completedWorkers: [] }
  };
  const evidence = { ...base.evidence, branch, head, changedFiles: [], implementationStatus: '', diffStat: '', diff: '' };
  assert.doesNotThrow(() => adapter.validatePreservedCompatibility({
    state, packet, contract: base.contract, codexResult: successfulWorkerResult(), evidence
  }));
  assert.throws(() => adapter.validatePreservedCompatibility({
    state: { ...state, objective: 'Different objective' }, packet, contract: base.contract, codexResult: successfulWorkerResult(), evidence
  }), (error) => error.code === 'PRESERVED_EVIDENCE_INCOMPATIBLE' && /objective/.test(error.message));
  assert.throws(() => adapter.validatePreservedCompatibility({
    state: { ...state, phase: 'Design' }, packet, contract: base.contract, codexResult: successfulWorkerResult(), evidence
  }), (error) => error.code === 'PRESERVED_EVIDENCE_INCOMPATIBLE' && /phase/.test(error.message));
}

function readCapturedReviewerInput() {
  const prompt = fs.readFileSync(REVIEW_INPUT_CAPTURE, 'utf8');
  const begin = prompt.indexOf('INPUT_JSON_BEGIN\n') + 'INPUT_JSON_BEGIN\n'.length;
  const end = prompt.lastIndexOf('\nINPUT_JSON_END');
  assert(begin > 0 && end > begin, 'reviewer input markers missing');
  return JSON.parse(prompt.slice(begin, end));
}

function testReviewerPayloadBoundaries() {
  const fixture = reviewerFixture();
  const hugeWorker = successfulWorkerResult({
    stdout: 'stdout-noise-'.repeat(80000),
    stderr: 'stderr-noise-'.repeat(80000)
  });
  const payload = adapter.buildReviewerPayload(fixture.packet, fixture.contract, hugeWorker, fixture.evidence);
  const prepared = adapter.compactReviewerInput(payload, 250000);
  assert(prepared.serializedChars <= 250000);
  assert.strictEqual(prepared.compacted, false);
  assert.deepStrictEqual(prepared.payload.parsedWorkerFinalResult, hugeWorker.parsedWorkerFinalResult);
  assert(!prepared.input.includes('stdout-noise-'));
  assert(!prepared.input.includes('stderr-noise-'));
  assert(!prepared.input.includes('workerOutput'));
  assert(!prepared.input.includes('commandResults'));

  const failedWorker = successfulWorkerResult({
    exitCode: 7,
    parsedWorkerFinalResult: null,
    workerFinalResultParseError: 'worker final result was not valid JSON',
    finalOutput: '',
    stdout: 'stdout-prefix-'.repeat(4000),
    stderr: 'stderr-prefix-'.repeat(4000),
    error: 'worker failed'
  });
  const failedPayload = adapter.buildReviewerPayload(fixture.packet, fixture.contract, failedWorker, fixture.evidence);
  const failedText = JSON.stringify(failedPayload);
  assert(failedText.includes('stderr-prefix-'));
  assert(failedPayload.workerDiagnostics.stderrTail.length < failedWorker.stderr.length);
  assert(failedPayload.workerDiagnostics.stdoutTail.length < failedWorker.stdout.length);

  const diff = adapter.boundedDiffText('diff-line\n'.repeat(30000), 10000);
  assert.strictEqual(diff.truncated, true);
  assert.match(diff.text, /\[diff truncated\]/);

  const largeOptional = adapter.buildReviewerPayload(
    fixture.packet,
    fixture.contract,
    failedWorker,
    { ...fixture.evidence, diff: 'diff-line\n'.repeat(30000), diffTruncated: true, untrackedFiles: Array.from({ length: 20 }, (_, index) => ({ path: `file-${index}.txt`, size: 10000, content: 'untracked\n'.repeat(2000) })) }
  );
  const compactA = adapter.compactReviewerInput(largeOptional, 8000);
  const compactB = adapter.compactReviewerInput(largeOptional, 8000);
  assert(compactA.compacted);
  assert(compactA.serializedChars <= 8000);
  assert.strictEqual(compactA.input, compactB.input);
  assert(compactA.compactionSteps.length > 0);

  const irreducible = adapter.buildReviewerPayload(
    fixture.packet,
    { ...fixture.contract, codexPrompt: 'critical-contract-'.repeat(1000) },
    hugeWorker,
    fixture.evidence
  );
  expectThrow(() => adapter.compactReviewerInput(irreducible, 1024), /exceeds configured budget/);
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

function unavailableResult() {
  return { status: null, signal: null, stdout: '', stderr: '', error: { code: 'ENOENT', message: 'not found' } };
}

function testRepositorySearchFallbacks() {
  const run = (mode) => (command) => {
    if (command === 'rg.exe' && mode === 'rg') return { status: 0, signal: null, stdout: 'scripts/example.js:1:match\n', stderr: '', error: null };
    if (command === 'git' && mode === 'git') return { status: 0, signal: null, stdout: 'scripts/example.js:2:match\n', stderr: '', error: null };
    if (command === 'powershell.exe' && mode === 'powershell') return { status: 0, signal: null, stdout: 'C:\\repo\\scripts\\example.js:3:match\n', stderr: '', error: null };
    return unavailableResult();
  };

  assert.strictEqual(repositorySearch.searchRepository({ root: ROOT, pattern: 'match', platform: 'win32', runner: run('rg') }).method, 'rg');
  assert.strictEqual(repositorySearch.searchRepository({ root: ROOT, pattern: 'match', platform: 'win32', runner: run('git') }).method, 'git-grep');
  assert.strictEqual(repositorySearch.searchRepository({ root: ROOT, pattern: 'match', platform: 'win32', runner: run('powershell') }).method, 'powershell-select-string');

  let observed = null;
  const untrustedPattern = 'literal; Remove-Item -Recurse';
  repositorySearch.searchRepository({
    root: ROOT,
    pattern: untrustedPattern,
    platform: 'win32',
    runner(command, args, options) {
      observed = { command, args, options };
      return { status: 0, signal: null, stdout: '', stderr: '', error: null };
    }
  });
  assert.strictEqual(observed.options.shell, false);
  assert(observed.args.includes(untrustedPattern));
  assert.throws(() => repositorySearch.searchRepository({ root: ROOT, pattern: 'match', path: '..', platform: 'win32', runner: run('rg') }), /inside the repository root/);

  const nodeFallback = repositorySearch.searchRepository({
    root: ROOT,
    pattern: 'function executeCodex',
    path: 'scripts',
    platform: 'win32',
    runner: run('none')
  });
  assert.strictEqual(nodeFallback.method, 'node');
  assert.match(nodeFallback.output, /scripts\/orchestrator-adapter\.js:/);

  assert.throws(() => repositorySearch.searchRepository({
    root: ROOT,
    pattern: 'match',
    platform: 'win32',
    runner: run('none'),
    fileSystem: {
      readdirSync() { throw Object.assign(new Error('filesystem unavailable'), { code: 'EACCES' }); }
    }
  }), (error) => error.code === 'SEARCH_UNAVAILABLE' && error.blocked === true);
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

function testReviewerReceivesCompactPayload() {
  resetState();
  startQa();
  const result = runAdapter({ MOCK_HUGE_OUTPUT: '1', MOCK_CAPTURE_REVIEW_INPUT: REVIEW_INPUT_CAPTURE });
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assertStatus('complete');
  const input = readCapturedReviewerInput();
  assert.strictEqual(input.objective, 'Mock orchestration task');
  assert.strictEqual(input.currentWorker.worker, 'QA_WORKER.md');
  assert.strictEqual(input.taskContract.worker, 'QA_WORKER.md');
  assert.strictEqual(input.parsedWorkerFinalResult.status, 'completed');
  assert.deepStrictEqual(input.filesChanged.reportedByWorker, ['scripts/example.js']);
  assert(Array.isArray(input.filesChanged.detectedByGit));
  assert(!Object.prototype.hasOwnProperty.call(input, 'packet'));
  assert(!Object.prototype.hasOwnProperty.call(input, 'workerOutput'));
  assert(!Object.prototype.hasOwnProperty.call(input, 'commandResults'));
  assert(!Object.prototype.hasOwnProperty.call(input, 'stdout'));
  assert(!Object.prototype.hasOwnProperty.call(input, 'stderr'));
  const review = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, 'review-0.json'), 'utf8'));
  assert(review._meta.reviewerInput.serializedChars <= 250000);
  assert.strictEqual(review._meta.reviewerInput.compacted, false);
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
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assertStatus('blocked');
  assert.match(result.stderr, /STRUCTURED_OUTPUT_FAILURE/);
  assert.match(result.stderr, /retrying reviewer only/);
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
  const timeout = runAdapter({ MOCK_WORKER_SLEEP_MS: '1100', ORCHESTRATOR_CODEX_TIMEOUT_MS: '1000' });
  assert.strictEqual(timeout.status, 0, timeout.stderr + timeout.stdout);
  assertStatus('blocked');
}

function testReviewerTransportAndBudgetFailures() {
  resetState();
  startQa();
  const transport = runAdapter({ MOCK_REVIEW_EXIT: '9' });
  assert.strictEqual(transport.status, 0, transport.stderr + transport.stdout);
  assertStatus('blocked');
  assert.match(transport.stderr, /TRANSPORT_FAILURE/);
  assert.doesNotMatch(transport.stderr, /orchestrator-adapter\.js:\d+/);
  assert(fs.existsSync(path.join(LOCAL_DIR, 'codex-0.json')));
  assert(fs.existsSync(path.join(LOCAL_DIR, 'evidence-0.json')));

  resetState();
  startQa();
  const overBudget = runAdapter({ ORCHESTRATOR_MAX_REVIEWER_INPUT_CHARS: '1024' });
  assert.strictEqual(overBudget.status, 0, overBudget.stderr + overBudget.stdout);
  const state = assertStatus('blocked');
  assert.match(state.blocker, /reviewer input exceeds configured budget/i);
  assert.match(overBudget.stderr, /REVIEWER_INPUT_FAILURE/);
}

function testReviewerOnlyRetryPassesWithoutWorkerRerun() {
  resetState();
  startQa();
  const result = runAdapter({
    MOCK_REVIEW_ILLEGAL_DESIGN: '1',
    MOCK_REVIEW_FILE: counterPath('mock-review-count.txt'),
    MOCK_PLANNER_COUNT_FILE: counterPath('mock-planner-count.txt'),
    MOCK_WORKER_COUNT_FILE: counterPath('mock-worker-count.txt'),
    MOCK_REVIEW_COUNT_FILE: counterPath('mock-review-count-env.txt')
  });
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assertStatus('complete');
  assert.strictEqual(counterValue('mock-planner-count.txt'), 1);
  assert.strictEqual(counterValue('mock-worker-count.txt'), 1);
  assert.strictEqual(counterValue('mock-review-count-env.txt'), 2);
  const review = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, 'review-0.json'), 'utf8'));
  assert.strictEqual(review._meta.reviewerAttempts, 2);
  assert.strictEqual(review._meta.failureClass, adapter.FAILURE_CLASSES.REVIEWER_VERDICT);
}

function testReviewerOnlyRetryRepairRunsRepairWorkerOnce() {
  resetState();
  startQa();
  const result = runAdapter({
    MOCK_REVIEW_ILLEGAL_DESIGN: '1',
    MOCK_REVIEW_SEQUENCE: 'REPAIR,REPAIR,PASS',
    MOCK_REVIEW_FILE: counterPath('mock-review-count.txt'),
    MOCK_PLANNER_COUNT_FILE: counterPath('mock-planner-count.txt'),
    MOCK_WORKER_COUNT_FILE: counterPath('mock-worker-count.txt'),
    MOCK_REVIEW_COUNT_FILE: counterPath('mock-review-count-env.txt')
  });
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assertStatus('complete');
  assert.strictEqual(counterValue('mock-planner-count.txt'), 2);
  assert.strictEqual(counterValue('mock-worker-count.txt'), 2);
  assert.strictEqual(counterValue('mock-review-count-env.txt'), 3);
}

function testSecondReviewerContractFailureBlocksCleanly() {
  resetState();
  startQa();
  const result = runAdapter({
    MOCK_REVIEW_ILLEGAL_DESIGN: '2',
    MOCK_REVIEW_FILE: counterPath('mock-review-count.txt'),
    MOCK_PLANNER_COUNT_FILE: counterPath('mock-planner-count.txt'),
    MOCK_WORKER_COUNT_FILE: counterPath('mock-worker-count.txt'),
    MOCK_REVIEW_COUNT_FILE: counterPath('mock-review-count-env.txt')
  });
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  const state = assertStatus('blocked');
  assert.match(state.blocker, /REVIEWER_CONTRACT_FAILURE/);
  assert.strictEqual(counterValue('mock-planner-count.txt'), 1);
  assert.strictEqual(counterValue('mock-worker-count.txt'), 1);
  assert.strictEqual(counterValue('mock-review-count-env.txt'), 2);
  assert.doesNotMatch(state.blocker, /transport/i);
}

function testFeatureStructureRequiresDesignBoolean() {
  resetState();
  startFeatureStructure();
  const result = runAdapter();
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  const state = assertStatus('active');
  assert.strictEqual(state.phase, 'Design');
  assert.strictEqual(state.completedWorkers[0].phase, 'Structure');
}

function testResumeUsesPreservedWorkerEvidence() {
  resetState();
  startQa();
  const counterEnv = {
    MOCK_REVIEW_FILE: counterPath('mock-review-count.txt'),
    MOCK_PLANNER_COUNT_FILE: counterPath('mock-planner-count.txt'),
    MOCK_WORKER_COUNT_FILE: counterPath('mock-worker-count.txt'),
    MOCK_REVIEW_COUNT_FILE: counterPath('mock-review-count-env.txt')
  };
  const failedReview = runAdapter({ ...counterEnv, MOCK_REVIEW_EXIT: '9' });
  assert.strictEqual(failedReview.status, 0, failedReview.stderr + failedReview.stdout);
  assertStatus('blocked');
  const resumed = runAdapterCommand('resume', counterEnv);
  assert.strictEqual(resumed.status, 0, resumed.stderr + resumed.stdout);
  assertStatus('complete');
  assert.strictEqual(counterValue('mock-planner-count.txt'), 1);
  assert.strictEqual(counterValue('mock-worker-count.txt'), 1);
  assert.strictEqual(counterValue('mock-review-count-env.txt'), 2);
}

function testRunAllResumesPreservedWorkerEvidence() {
  resetState();
  startQa();
  const counterEnv = {
    MOCK_REVIEW_FILE: counterPath('mock-review-count.txt'),
    MOCK_PLANNER_COUNT_FILE: counterPath('mock-planner-count.txt'),
    MOCK_WORKER_COUNT_FILE: counterPath('mock-worker-count.txt'),
    MOCK_REVIEW_COUNT_FILE: counterPath('mock-review-count-env.txt')
  };
  const failedReview = runAdapter({ ...counterEnv, MOCK_REVIEW_EXIT: '9' });
  assert.strictEqual(failedReview.status, 0, failedReview.stderr + failedReview.stdout);
  assertStatus('blocked');
  const resumed = runAdapterAll(counterEnv);
  assert.strictEqual(resumed.status, 0, resumed.stderr + resumed.stdout);
  assertStatus('complete');
  assert.strictEqual(counterValue('mock-planner-count.txt'), 1);
  assert.strictEqual(counterValue('mock-worker-count.txt'), 1);
  assert.strictEqual(counterValue('mock-review-count-env.txt'), 2);
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
    testRepositorySearchFallbacks();
    testPhaseAwareReviewerSchemas();
    testPreservedEvidenceCompatibility();
    testReviewerPayloadBoundaries();
    writeMockCli();
    testPlannerAndReviewerSuccess();
    testReviewerReceivesCompactPayload();
    testPlannerFailure();
    testReviewerMalformed();
    testUnavailableModel();
    testWorkerFailureAndTimeout();
    testReviewerTransportAndBudgetFailures();
    testReviewerOnlyRetryPassesWithoutWorkerRerun();
    testReviewerOnlyRetryRepairRunsRepairWorkerOnce();
    testSecondReviewerContractFailureBlocksCleanly();
    testFeatureStructureRequiresDesignBoolean();
    testResumeUsesPreservedWorkerEvidence();
    testRunAllResumesPreservedWorkerEvidence();
    testRepairHumanBlocked();
    resetState();
    const finalState = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    assert.strictEqual(finalState.status, originalStateObject.status);
    assert.strictEqual(finalState.phase, originalStateObject.phase);
    console.log('orchestration runtime mocked tests: PASS');
  } finally {
    fs.writeFileSync(STATE_PATH, originalState);
    restoreLocalArtifacts();
  }
}

main();
