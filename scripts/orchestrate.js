#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'agents', 'runtime', 'state.json');

const TRACKS = {
  'page-build-track': [
    ['Structure', 'STRUCTURE_WORKER.md'],
    ['Content', 'CONTENT_WORKER.md'],
    ['Design', 'DESIGN_WORKER.md'],
    ['Implementation', 'IMPLEMENTATION_WORKER.md'],
    ['Experience Review', 'EXPERIENCE_DIRECTOR.md'],
    ['QA', 'QA_WORKER.md']
  ],
  'feature-build-track': [
    ['Structure', 'STRUCTURE_WORKER.md'],
    ['Implementation', 'IMPLEMENTATION_WORKER.md'],
    ['Experience Review', 'EXPERIENCE_DIRECTOR.md'],
    ['QA', 'QA_WORKER.md']
  ],
  'content-polish-track': [
    ['Content', 'CONTENT_WORKER.md'],
    ['Experience Review', 'EXPERIENCE_DIRECTOR.md'],
    ['QA', 'QA_WORKER.md']
  ],
  'qa-review-track': [['QA', 'QA_WORKER.md']]
};

const VALID_STATUSES = new Set(['idle', 'active', 'blocked', 'complete']);
const VALID_BLOCK_VERDICTS = new Set(['BLOCKED', 'HUMAN_DECISION']);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function expectedWorkerSequence(track) {
  return TRACKS[track].map(([phase, worker]) => ({ phase, worker }));
}

function sequenceMatches(state) {
  const expected = expectedWorkerSequence(state.track);
  const actual = state.workerSequence;
  if (JSON.stringify(actual) === JSON.stringify(expected)) return true;

  if (state.track === 'feature-build-track') {
    const conditionalDesign = [
      expected[0],
      { phase: 'Design', worker: 'DESIGN_WORKER.md' },
      ...expected.slice(1)
    ];
    return JSON.stringify(actual) === JSON.stringify(conditionalDesign);
  }

  return false;
}

function die(message) {
  console.error(`orchestrate: ${message}`);
  process.exit(1);
}

function readText(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}

function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) die('state must be a JSON object');
  if (state.schemaVersion !== 1) die(`unsupported state schemaVersion: ${state.schemaVersion}`);
  if (typeof state.project !== 'string' || !state.project.trim()) die('state.project must be a non-empty string');
  if (!VALID_STATUSES.has(state.status)) die(`invalid state.status: ${state.status}`);
  if (!Array.isArray(state.workerSequence)) die('state.workerSequence must be an array');
  if (!Array.isArray(state.completedWorkers)) die('state.completedWorkers must be an array');
  if (!Array.isArray(state.constraints)) die('state.constraints must be an array');
  if (!Array.isArray(state.validationCommands)) die('state.validationCommands must be an array');

  if (!state.constraints.every(nonEmptyString)) die('state.constraints must contain non-empty strings');
  if (!state.validationCommands.every(nonEmptyString)) die('state.validationCommands must contain non-empty strings');
  if (!nonEmptyString(state.phase)) die('state.phase must be a non-empty string');
  if (state.updatedAt !== null && !nonEmptyString(state.updatedAt)) die('state.updatedAt must be null or a non-empty string');
  if (state.blocker !== null && !nonEmptyString(state.blocker)) die('state.blocker must be null or a non-empty string');
  if (state.lastResult !== null) {
    if (!state.lastResult || typeof state.lastResult !== 'object' || Array.isArray(state.lastResult)) {
      die('state.lastResult must be null or an object');
    }
    if (!nonEmptyString(state.lastResult.verdict) || !nonEmptyString(state.lastResult.summary)) {
      die('state.lastResult requires non-empty verdict and summary');
    }
  }

  if (state.track !== null && !TRACKS[state.track]) die(`invalid state.track: ${state.track}`);

  if (state.status === 'idle') {
    if (
      state.objective !== null ||
      state.target !== null ||
      state.track !== null ||
      state.phase !== 'Intake' ||
      state.workerSequence.length ||
      state.completedWorkers.length ||
      state.currentWorkerIndex !== null ||
      state.blocker !== null ||
      state.lastResult !== null
    ) {
      die('idle state must be reset to the canonical Intake shape');
    }
    return state;
  }

  if (!nonEmptyString(state.objective)) die(`${state.status} state requires a non-empty objective`);
  if (!nonEmptyString(state.target)) die(`${state.status} state requires a non-empty target`);
  if (!state.track || !TRACKS[state.track]) die(`${state.status} state requires a supported track`);
  if (!sequenceMatches(state)) die(`${state.status} state has an unexpected workerSequence`);

  for (let i = 0; i < state.completedWorkers.length; i += 1) {
    const completed = state.completedWorkers[i];
    const expected = state.workerSequence[i];
    if (
      !completed ||
      typeof completed !== 'object' ||
      completed.phase !== expected.phase ||
      completed.worker !== expected.worker ||
      !nonEmptyString(completed.summary) ||
      !nonEmptyString(completed.completedAt)
    ) {
      die('state.completedWorkers contains a malformed or out-of-order entry');
    }
  }

  if (state.status === 'active' || state.status === 'blocked') {
    if (!state.workerSequence.length) die(`${state.status} state requires a non-empty workerSequence`);
    if (!Number.isInteger(state.currentWorkerIndex)) die(`${state.status} state requires integer currentWorkerIndex`);
    if (state.currentWorkerIndex < 0 || state.currentWorkerIndex >= state.workerSequence.length) {
      die('currentWorkerIndex is outside workerSequence');
    }
    const worker = state.workerSequence[state.currentWorkerIndex];
    if (!worker || typeof worker.phase !== 'string' || typeof worker.worker !== 'string') {
      die('current worker entry is malformed');
    }
    if (state.completedWorkers.length !== state.currentWorkerIndex) {
      die(`${state.status} state completedWorkers must match the current worker index`);
    }
    if (state.status === 'active' && state.blocker !== null) die('active state cannot have a blocker');
    if (state.status === 'blocked' && !nonEmptyString(state.blocker)) die('blocked state requires a blocker');
  }

  if (state.status === 'complete') {
    if (state.currentWorkerIndex !== null) die('complete state must have currentWorkerIndex=null');
    if (state.phase !== 'Handoff') die('complete state must have phase=Handoff');
    if (state.completedWorkers.length !== state.workerSequence.length) {
      die('complete state must contain a completed entry for every worker');
    }
    if (state.blocker !== null) die('complete state cannot have a blocker');
  }

  return state;
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) die('missing agents/runtime/state.json');
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (error) {
    die(`invalid JSON in state file: ${error.message}`);
  }
  return validateState(state);
}

function saveState(state) {
  validateState(state);
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
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

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '[unavailable]';
  }
}

function currentWorker(state) {
  if (!Array.isArray(state.workerSequence) || state.currentWorkerIndex == null) return null;
  return state.workerSequence[state.currentWorkerIndex] || null;
}

function printStatus(state) {
  const worker = currentWorker(state);
  console.log(JSON.stringify({
    project: state.project,
    status: state.status,
    objective: state.objective,
    target: state.target,
    track: state.track,
    phase: state.phase,
    currentWorker: worker,
    completedWorkers: state.completedWorkers,
    blocker: state.blocker,
    lastResult: state.lastResult,
    updatedAt: state.updatedAt,
    git: {
      branch: git('branch', '--show-current'),
      head: git('rev-parse', '--short', 'HEAD'),
      status: git('status', '--short') || 'clean'
    }
  }, null, 2));
}

function start(state, args) {
  const goal = args.goal;
  const target = args.target;
  const track = args.track;
  if (!nonEmptyString(goal) || !nonEmptyString(target) || !nonEmptyString(track)) {
    die('start requires non-empty --goal, --target, and --track values');
  }
  if (!TRACKS[track]) die(`unsupported track: ${track}`);
  if ((state.status === 'active' || state.status === 'blocked') && args.force !== true) {
    die(`cannot replace status=${state.status} objective without --force`);
  }

  state.status = 'active';
  state.track = track;
  state.objective = goal;
  state.target = target;
  state.workerSequence = TRACKS[track].map(([phase, worker]) => ({ phase, worker }));
  state.currentWorkerIndex = 0;
  state.completedWorkers = [];
  state.phase = state.workerSequence[0].phase;
  state.blocker = null;
  state.lastResult = null;
  saveState(state);
  printStatus(state);
}

function packet(state) {
  if (state.status === 'idle' || !state.objective) die('no active objective; run start first');
  if (state.status === 'blocked') die(`pipeline is blocked: ${state.blocker || 'reason not recorded'}`);
  if (state.status === 'complete') die('pipeline is complete');

  const worker = currentWorker(state);
  if (!worker) die('no current worker is configured');

  const trackPath = `agents/tracks/${state.track}.md`;
  const workerPath = `agents/workers/${worker.worker}`;

  const payload = {
    role: 'Lemonteed orchestrator model',
    instruction: 'Interpret this packet, inspect only the context supplied here plus repository files needed for the task, and produce ONE detailed Codex work order. Do not execute the implementation yourself. The Codex work order must include mission, current state, in-scope files/surfaces, out-of-scope boundaries, exact requirements, acceptance criteria, verification, evidence required, stop conditions, and return format.',
    verdictPolicy: 'After Codex returns, review evidence against the same contract and classify it as PASS, REPAIR, BLOCKED, or HUMAN_DECISION. Never advance on a worker self-claim alone.',
    featureTrackPolicy: 'For feature-build-track Structure review, explicitly decide whether a Design Worker is required. Design is required when the feature has visitor/operator UI or meaningful interaction-state design; it is not required for non-UI scripts/workflow-only changes.',
    state: {
      project: state.project,
      objective: state.objective,
      target: state.target,
      track: state.track,
      phase: state.phase,
      currentWorker: worker,
      completedWorkers: state.completedWorkers,
      constraints: state.constraints,
      validationCommands: state.validationCommands,
      lastResult: state.lastResult
    },
    repository: {
      branch: git('branch', '--show-current'),
      head: git('rev-parse', 'HEAD'),
      status: git('status', '--short') || 'clean'
    },
    context: {
      agentRules: readText('AGENT_RULES.md'),
      sharedContext: readText('agents/SHARED_CONTEXT.md'),
      pipeline: readText('agents/PIPELINE.md'),
      selectedTrack: readText(trackPath),
      orchestratorContract: readText('agents/workers/ORCHESTRATOR.md'),
      workerContract: readText(workerPath),
      currentStatus: readText('agents/STATUS.md')
    }
  };

  console.log(JSON.stringify(payload, null, 2));
}

function maybeInsertFeatureDesign(state, args, worker) {
  if (state.track !== 'feature-build-track' || worker.phase !== 'Structure') return;
  const decision = args['design-required'];
  if (decision !== 'true' && decision !== 'false') {
    die('feature-build Structure completion requires --design-required true|false');
  }
  if (decision === 'false') return;

  const alreadyPresent = state.workerSequence.some((entry) => entry.worker === 'DESIGN_WORKER.md');
  if (alreadyPresent) return;
  state.workerSequence.splice(state.currentWorkerIndex + 1, 0, {
    phase: 'Design',
    worker: 'DESIGN_WORKER.md'
  });
}

function complete(state, args) {
  if (state.status !== 'active') die(`cannot complete while status=${state.status}`);
  const worker = currentWorker(state);
  if (!worker) die('no current worker');
  const summary = args.summary;
  if (!summary || summary === true) die('complete requires --summary');

  maybeInsertFeatureDesign(state, args, worker);

  state.completedWorkers.push({
    phase: worker.phase,
    worker: worker.worker,
    summary,
    completedAt: new Date().toISOString()
  });
  state.lastResult = { verdict: 'PASS', summary };

  if (state.currentWorkerIndex >= state.workerSequence.length - 1) {
    state.status = 'complete';
    state.phase = 'Handoff';
    state.currentWorkerIndex = null;
  } else {
    state.currentWorkerIndex += 1;
    state.phase = state.workerSequence[state.currentWorkerIndex].phase;
  }
  saveState(state);
  printStatus(state);
}

function block(state, args) {
  const reason = args.reason;
  if (!reason || reason === true) die('block requires --reason');
  if (state.status !== 'active') die(`cannot block while status=${state.status}`);
  const verdict = args.verdict || 'BLOCKED';
  if (!VALID_BLOCK_VERDICTS.has(verdict)) die(`unsupported block verdict: ${verdict}`);
  state.status = 'blocked';
  state.blocker = reason;
  state.lastResult = { verdict, summary: reason };
  saveState(state);
  printStatus(state);
}

function unblock(state) {
  if (state.status !== 'blocked') die('pipeline is not blocked');
  state.status = 'active';
  state.blocker = null;
  saveState(state);
  printStatus(state);
}

function runAdapter(args, command = 'run') {
  const adapterPath = path.join(ROOT, 'scripts', 'orchestrator-adapter.js');
  if (!fs.existsSync(adapterPath)) die('missing scripts/orchestrator-adapter.js');
  const forwarded = [command];
  if (command === 'run' && args.all === true) forwarded.push('--all');
  if (args['allow-dirty'] === true) forwarded.push('--allow-dirty');
  if (args.escalate === true) forwarded.push('--escalate');
  if (args.escalate !== undefined && args.escalate !== true) die('--escalate is a flag and takes no value');
  execFileSync(process.execPath, [adapterPath, ...forwarded], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
}

function usage() {
  console.log('  run [--escalate] selects the explicitly configured escalation model');
  console.log(`Lemonteed orchestration runtime\n\nCommands:\n  status\n  start --goal "..." --target "..." --track <track> [--force]\n  next\n  run [--all] [--allow-dirty]\n  resume [--allow-dirty]\n  review-current [--allow-dirty] (alias for resume)\n  complete --summary "..." [--design-required true|false]\n  block --reason "..." [--verdict BLOCKED|HUMAN_DECISION]\n  unblock\n\nTracks:\n  ${Object.keys(TRACKS).join('\n  ')}\n`);
}

const parsed = argsFrom(process.argv.slice(2));
const command = parsed._[0] || 'help';
const state = loadState();

switch (command) {
  case 'status': printStatus(state); break;
  case 'start': start(state, parsed); break;
  case 'next': packet(state); break;
  case 'run': runAdapter(parsed); break;
  case 'resume': runAdapter(parsed, 'resume'); break;
  case 'review-current': runAdapter(parsed, 'review-current'); break;
  case 'complete': complete(state, parsed); break;
  case 'block': block(state, parsed); break;
  case 'unblock': unblock(state); break;
  case 'help':
  case '--help':
  default: usage();
}
