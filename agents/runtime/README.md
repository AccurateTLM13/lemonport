# Lemonteed Orchestration Runtime

This folder turns the existing Lemonteed Production Pipeline from documentation-only coordination into explicit machine-readable state and an executable planner → Codex → reviewer loop.

The runtime does not replace `agents/PIPELINE.md`, `agents/SHARED_CONTEXT.md`, track docs, worker docs, or repository rules. It compiles them into a consistent control loop.

## Control Loop

1. Start or resume an objective.
2. Read repository rules, shared context, selected track, current state, and the active worker contract.
3. Compile an orchestrator packet.
4. The orchestrator model converts that packet into a focused Codex work order.
5. Codex executes only that work order.
6. The adapter captures Codex output plus git evidence.
7. The orchestrator reviews the evidence and returns `PASS`, `REPAIR`, `BLOCKED`, or `HUMAN_DECISION`.
8. `PASS` advances state; `REPAIR` automatically generates a bounded repair contract; the other verdicts stop the pipeline.
9. Continue until the current worker is accepted or, with `--all`, until the pipeline completes or hits a stop condition.

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
- interpreting Codex output and git evidence
- deciding `PASS / REPAIR / BLOCKED / HUMAN_DECISION`
- deciding whether the conditional Design Worker is required after a feature Structure pass

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

## Requirements

- Node.js with built-in `fetch` support (Node 18+; Lemonteed local tooling already targets modern Node).
- Codex CLI installed and authenticated (`codex --version` must succeed).
- `OPENAI_API_KEY` for the default orchestrator provider.

Default orchestrator model: `gpt-5.6-sol`.

Override with:

```bash
set ORCHESTRATOR_MODEL=gpt-5.6-sol
set ORCHESTRATOR_REASONING=high
set ORCHESTRATOR_MAX_REPAIRS=2
```

On PowerShell use `$env:NAME="value"`; on macOS/Linux use `export NAME=value`.

`CODEX_ARGS_JSON` can override the Codex CLI argument prefix. The default is:

```json
["exec"]
```

Example:

```bash
set CODEX_ARGS_JSON=["exec"]
```

## Commands

Inspect state:

```bash
node scripts/orchestrate.js status
```

Start an objective:

```bash
node scripts/orchestrate.js start --goal "Improve the Specimen Vault filtering experience" --target "/specimens/" --track feature-build-track
```

Compile the current packet without executing anything:

```bash
node scripts/orchestrate.js next
```

Run one worker through planner → Codex → reviewer:

```bash
node scripts/orchestrate.js run
```

Run continuously through the remaining pipeline until complete, blocked, or awaiting a human decision:

```bash
node scripts/orchestrate.js run --all
```

The adapter refuses unrelated dirty worktrees by default. Use `--allow-dirty` only when the existing changes are intentional and understood.

Manual state commands remain available for recovery/testing:

```bash
node scripts/orchestrate.js complete --summary "..." --design-required true
node scripts/orchestrate.js block --reason "..." --verdict BLOCKED
node scripts/orchestrate.js unblock
```

For `feature-build-track`, the Structure completion must explicitly resolve whether Design is required. The automated adapter gets that decision from the reviewer. Manual completion uses `--design-required true|false`.

## Adapter Evidence

Local adapter audit artifacts are written to:

```text
.orchestration-local/
```

This folder is gitignored. It contains the last packet, generated task contracts, Codex stdout/stderr, git evidence, and reviewer verdicts so an orchestration failure can be inspected without polluting the repository.

## Repair Policy

`REPAIR` does not advance the worker. The adapter asks the orchestrator for a repair-only work order and sends it back to Codex. The default maximum is two repair attempts (`ORCHESTRATOR_MAX_REPAIRS=2`). If the limit is exceeded the runtime blocks instead of looping indefinitely.

`HUMAN_DECISION` is recorded as a blocked state with the decision question preserved in `lastResult`; work does not continue until the owner resolves it and explicitly unblocks/restarts the appropriate objective.

## Tracks

Supported tracks map to the existing worker documents:

- `page-build-track`: Structure → Content → Design → Implementation → Experience Review → QA
- `feature-build-track`: Structure → **conditional Design** → Implementation → Experience Review → QA
- `content-polish-track`: Content → Experience Review → QA
- `qa-review-track`: QA

The runtime is deliberately conservative. It will not silently invent a track, skip a required experience review, deploy, or mutate public architecture.
