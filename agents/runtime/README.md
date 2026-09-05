# Lemonteed Orchestration Runtime

This folder turns the existing Lemonteed Production Pipeline from documentation-only coordination into explicit machine-readable state.

The runtime does not replace `agents/PIPELINE.md`, `agents/SHARED_CONTEXT.md`, track docs, worker docs, or repository rules. It compiles them into a consistent control loop.

## Control Loop

1. Start or resume an objective.
2. Read repository rules, shared context, selected track, current state, and the active worker contract.
3. Compile an orchestrator packet.
4. The orchestrator model converts that packet into a focused Codex work order.
5. Codex executes only that work order.
6. The orchestrator reviews evidence and returns a verdict.
7. Advance, block, repeat, or hand off.
8. Keep `agents/runtime/state.json`, `agents/STATUS.md`, and durable decisions synchronized.

## Runtime Boundary

The runtime owns:

- current objective and phase
- worker sequence
- current worker
- constraints
- validation expectations
- task packet structure
- state transitions

The orchestrator model owns:

- interpreting the objective in context
- selecting/scoping the exact next task
- writing the detailed Codex work order
- interpreting worker evidence
- deciding PASS / REPAIR / BLOCKED / HUMAN_DECISION

Codex owns:

- focused execution
- commands actually run
- changed files
- evidence returned

The owner owns:

- product direction
- subjective approvals
- destructive or deployment decisions
- exceptions to repository constraints

## Initial Commands

```bash
node scripts/orchestrate.js status
node scripts/orchestrate.js start --goal "..." --target "..." --track feature-build-track
node scripts/orchestrate.js next
node scripts/orchestrate.js complete --summary "..."
node scripts/orchestrate.js block --reason "..."
node scripts/orchestrate.js unblock
```

`next` prints an orchestrator packet to stdout. In v1 this packet is intentionally transport-neutral: it can be pasted into a strong planning/orchestrator model, consumed by a future API adapter, or wrapped by another local tool. The packet is not meant to be sent raw to Codex. The orchestrator should turn it into the final Codex task contract.

## Tracks

Supported tracks map to the existing worker documents:

- `page-build-track`: Structure → Content → Design → Implementation → Experience Review → QA
- `feature-build-track`: Structure → Implementation → Experience Review → QA
- `content-polish-track`: Content → Experience Review → QA
- `qa-review-track`: QA

The runtime is deliberately conservative. It will not silently invent a track, skip a required experience review, deploy, or mutate public architecture.
