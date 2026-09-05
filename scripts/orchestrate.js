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

function die(message) {
  console.error(`orchestrate: ${message}`);
  process.exit(1);
}

function readText(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) die('missing agents/runtime/state.json');
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
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
  if (!goal || !target || !track) {
    die('start requires --goal, --target, and --track');
  }
  if (!TRACKS[track]) die(`unsupported track: ${track}`);

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
  if (state.status === 'idle' || !state.objective) {
    die('no active objective; run start first');
  }
  if (state.status === 'blocked') {
    die(`pipeline is blocked: ${state.blocker || 'reason not recorded'}`);
  }
  if (state.status === 'complete') {
    die('pipeline is complete');
  }

  const worker = currentWorker(state);
  if (!worker) die('no current worker is configured');

  const trackPath = `agents/tracks/${state.track}.md`;
  const workerPath = `agents/workers/${worker.worker}`;

  const payload = {
    role: 'Lemonteed orchestrator model',
    instruction: 'Interpret this packet, inspect only the context supplied here plus repository files needed for the task, and produce ONE detailed Codex work order. Do not execute the implementation yourself. The Codex work order must include mission, current state, in-scope files/surfaces, out-of-scope boundaries, exact requirements, acceptance criteria, verification, evidence required, stop conditions, and return format.',
    verdictPolicy: 'After Codex returns, review evidence against the same contract and classify it as PASS, REPAIR, BLOCKED, or HUMAN_DECISION. Never advance on a worker self-claim alone.',
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

function complete(state, args) {
  if (state.status !== 'active') die(`cannot complete while status=${state.status}`);
  const worker = currentWorker(state);
  if (!worker) die('no current worker');
  const summary = args.summary;
  if (!summary) die('complete requires --summary');

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
  if (!reason) die('block requires --reason');
  state.status = 'blocked';
  state.blocker = reason;
  state.lastResult = { verdict: 'BLOCKED', summary: reason };
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

function usage() {
  console.log(`Lemonteed orchestration runtime\n\nCommands:\n  status\n  start --goal "..." --target "..." --track <track>\n  next\n  complete --summary "..."\n  block --reason "..."\n  unblock\n\nTracks:\n  ${Object.keys(TRACKS).join('\n  ')}\n`);
}

const parsed = argsFrom(process.argv.slice(2));
const command = parsed._[0] || 'help';
const state = loadState();

switch (command) {
  case 'status': printStatus(state); break;
  case 'start': start(state, parsed); break;
  case 'next': packet(state); break;
  case 'complete': complete(state, parsed); break;
  case 'block': block(state, parsed); break;
  case 'unblock': unblock(state); break;
  case 'help':
  case '--help':
  default: usage();
}
