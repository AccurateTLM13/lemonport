#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_DIR = path.join(ROOT, '.orchestration-local');
const ORCHESTRATE = path.join(ROOT, 'scripts', 'orchestrate.js');
const MODEL = process.env.ORCHESTRATOR_MODEL || 'gpt-5.6-sol';
const REASONING = process.env.ORCHESTRATOR_REASONING || 'high';
const MAX_REPAIRS = Number(process.env.ORCHESTRATOR_MAX_REPAIRS || 2);
const MAX_DIFF_CHARS = Number(process.env.ORCHESTRATOR_MAX_DIFF_CHARS || 120000);

function die(message) {
  console.error(`orchestrator-adapter: ${message}`);
  process.exit(1);
}

function ensureLocalDir() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

function writeAudit(name, value) {
  ensureLocalDir();
  fs.writeFileSync(path.join(LOCAL_DIR, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
}

function runNode(args, options = {}) {
  try {
    return execFileSync(process.execPath, [ORCHESTRATE, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
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

function preflight(allowDirty) {
  const version = spawnSync('codex', ['--version'], { cwd: ROOT, encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    die('Codex CLI is unavailable. Install/sign in to Codex CLI before running the adapter.');
  }

  const dirty = git('status', '--porcelain')
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.endsWith(' agents/runtime/state.json') && !line.includes('.orchestration-local/'));
  if (dirty.length && !allowDirty) {
    die(`worktree has unrelated changes; commit/stash them or rerun with --allow-dirty:\n${dirty.join('\n')}`);
  }
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const pieces = [];
  for (const item of data.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') pieces.push(content.text);
    }
  }
  if (!pieces.length) throw new Error('Responses API returned no output text');
  return pieces.join('\n').trim();
}

async function openAIJson({ instructions, input, schemaName, schema }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) die('OPENAI_API_KEY is required for the default orchestrator provider');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
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
    })
  });

  const bodyText = await response.text();
  if (!response.ok) throw new Error(`Responses API ${response.status}: ${bodyText}`);
  const data = JSON.parse(bodyText);
  const output = JSON.parse(extractResponseText(data));
  return { output, responseId: data.id, usage: data.usage || null };
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

async function createContract(packet, repairContext = null) {
  const instructions = [
    'You are the Lemonteed orchestration planner.',
    'You do not edit code. Convert the supplied runtime packet into one tightly-scoped Codex work order.',
    'Preserve repository constraints and worker boundaries. Do not broaden scope.',
    'The codexPrompt must be complete enough to execute without the human re-explaining context.',
    'Require concrete evidence, exact commands, changed files, and explicit stop conditions.',
    repairContext ? 'This is a repair pass. Address only the reviewer-identified failures; preserve already-correct work.' : ''
  ].filter(Boolean).join('\n');

  const input = JSON.stringify({ packet, repairContext }, null, 2);
  return openAIJson({ instructions, input, schemaName: 'lemonteed_codex_task', schema: taskSchema });
}

function executeCodex(contract) {
  const prefix = process.env.CODEX_ARGS_JSON ? JSON.parse(process.env.CODEX_ARGS_JSON) : ['exec'];
  if (!Array.isArray(prefix)) die('CODEX_ARGS_JSON must decode to an array');

  const result = spawnSync('codex', [...prefix, contract.codexPrompt], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 40 * 1024 * 1024
  });

  return {
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : null
  };
}

function collectEvidence() {
  const diff = git('diff', '--', '.', ':(exclude)agents/runtime/state.json');
  return {
    branch: git('branch', '--show-current'),
    head: git('rev-parse', 'HEAD'),
    status: git('status', '--short'),
    diffCheck: git('diff', '--check') || 'clean',
    diffStat: git('diff', '--stat', '--', '.', ':(exclude)agents/runtime/state.json'),
    diff: diff.length > MAX_DIFF_CHARS ? `${diff.slice(0, MAX_DIFF_CHARS)}\n[diff truncated]` : diff
  };
}

async function reviewWork(packet, contract, codexResult, evidence) {
  const instructions = [
    'You are the Lemonteed orchestration reviewer.',
    'Judge the Codex work against the original packet and task contract, not against Codex self-claims.',
    'Use PASS only when the evidence supports the acceptance criteria and scope boundaries.',
    'Use REPAIR for bounded correctable failures, BLOCKED for external/technical blockers, and HUMAN_DECISION for product, destructive, deployment, or ambiguous authority decisions.',
    'For feature-build-track Structure phase, designRequired MUST be true when the feature includes meaningful visitor/operator UI or interaction-state design, otherwise false. For every other phase return null.'
  ].join('\n');

  const input = JSON.stringify({ packet, contract, codexResult, evidence }, null, 2);
  return openAIJson({ instructions, input, schemaName: 'lemonteed_review_verdict', schema: reviewSchema });
}

function blockFromReview(review) {
  const reason = review.verdict === 'HUMAN_DECISION'
    ? `${review.summary}${review.humanQuestion ? ` Human decision: ${review.humanQuestion}` : ''}`
    : `${review.summary}: ${review.reason}`;
  runNode(['block', '--reason', reason, '--verdict', review.verdict]);
}

function completeFromReview(packet, review) {
  const args = ['complete', '--summary', review.summary];
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

async function runWorker() {
  const packet = JSON.parse(runNode(['next']));
  writeAudit('packet.json', packet);

  let repairContext = null;
  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt += 1) {
    console.log(`\n[orchestrator] planning ${packet.state.phase}${attempt ? ` repair ${attempt}` : ''} with ${MODEL}`);
    const planned = await createContract(packet, repairContext);
    const contract = planned.output;
    writeAudit(`contract-${attempt}.json`, { ...contract, _meta: { responseId: planned.responseId, usage: planned.usage } });

    console.log(`[codex] executing ${contract.taskId}: ${contract.mission}`);
    const codexResult = executeCodex(contract);
    writeAudit(`codex-${attempt}.json`, codexResult);

    const evidence = collectEvidence();
    writeAudit(`evidence-${attempt}.json`, evidence);

    console.log('[orchestrator] reviewing evidence');
    const reviewed = await reviewWork(packet, contract, codexResult, evidence);
    const review = reviewed.output;
    writeAudit(`review-${attempt}.json`, { ...review, _meta: { responseId: reviewed.responseId, usage: reviewed.usage } });
    console.log(`[orchestrator] verdict: ${review.verdict} — ${review.summary}`);

    if (review.verdict === 'PASS') {
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
        `Repair limit reached after ${MAX_REPAIRS} repair attempts. Last review: ${review.summary}: ${review.reason}`,
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
  if (!Number.isInteger(MAX_REPAIRS) || MAX_REPAIRS < 0 || MAX_REPAIRS > 10) die('ORCHESTRATOR_MAX_REPAIRS must be an integer from 0 to 10');

  preflight(Boolean(args['allow-dirty']));
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

main().catch((error) => {
  console.error(`orchestrator-adapter: ${error.stack || error.message}`);
  process.exit(1);
});
