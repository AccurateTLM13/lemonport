# Lemonteed Orchestration Runtime

This folder turns the existing Lemonteed Production Pipeline from documentation-only coordination into explicit machine-readable state and an executable planner → Codex → reviewer loop.

The runtime does not replace `agents/PIPELINE.md`, `agents/SHARED_CONTEXT.md`, track docs, worker docs, or repository rules. It compiles them into a consistent control loop.

## Control Loop

1. Start or resume an objective.
2. Read repository rules, shared context, selected track, current state, and the active worker contract.
3. Compile an orchestrator packet.
4. The orchestrator model converts that packet into a focused Codex work order.
5. Codex executes only that work order and returns one structured Worker Result with the phase-owned deliverable in `deliverable.content`.
6. The adapter captures worker output plus git evidence and compiles a bounded reviewer evidence package.
7. The orchestrator reviews the compact package and returns `PASS`, `REPAIR`, `BLOCKED`, or `HUMAN_DECISION`. Reviewer schemas are phase-aware: `feature-build-track` Structure requires boolean `designRequired`; every other phase requires `designRequired: null`.
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
- Codex CLI installed and authenticated. The adapter resolves `CODEX_CLI_PATH` first, then the configured `CODEX_CLI_PATH` in `CODEX_HOME/config.toml`, then one unambiguous platform installation. It records the resolved executable and version.

Default transport for planner, worker, and reviewer: `codex-cli`.
Default planner, worker, and reviewer model: `gpt-5.6-luna`.
The optional `openai-api` provider remains available for planner/reviewer only and requires `OPENAI_API_KEY` when explicitly selected.

Override with:

```bash
set ORCHESTRATOR_PROVIDER=codex-cli
set ORCHESTRATOR_MODEL=gpt-5.6-luna
set REVIEWER_PROVIDER=codex-cli
set REVIEWER_MODEL=gpt-5.6-luna
set WORKER_PROVIDER=codex-cli
set WORKER_MODEL=gpt-5.6-luna
set ORCHESTRATOR_ESCALATION_MODEL=gpt-5.6-terra
set ORCHESTRATOR_MAX_MODEL=gpt-5.6-luna
set ORCHESTRATOR_REASONING=high
set ORCHESTRATOR_MAX_REPAIRS=2
set ORCHESTRATOR_MAX_WORKER_DELIVERABLE_CHARS=120000
set ORCHESTRATOR_MAX_REVIEWER_INPUT_CHARS=250000
set CODEX_CLI_PATH=C:\Users\<user>\AppData\Local\OpenAI\Codex\bin\<version>\codex.exe
```

On PowerShell use `$env:NAME="value"`; on macOS/Linux use `export NAME=value`.

`CODEX_ARGS_JSON` is retained as a compatibility check and must remain the safe default:

`["exec"]`. The adapter owns the model, sandbox, output-schema, and output-file flags and rejects overrides that could weaken those boundaries.

The adapter uses Luna for all roles by default. `run --escalate` explicitly selects the configured Terra escalation model for planner/reviewer. Automatic Sol usage and silent model fallback are prohibited. Planner and reviewer use `--sandbox read-only`, `--ephemeral`, and schema-backed final output; the worker uses `--sandbox workspace-write` and receives only the generated contract plus repository instructions. The adapter loads the authenticated Codex user profile so Codex CLI account transport works without `OPENAI_API_KEY`; explicit model, sandbox, approval, and output-schema flags remain adapter-owned.

For transport-only verification, `node scripts/orchestrator-adapter.js smoke-planner` runs a read-only planner invocation and `node scripts/orchestrator-adapter.js smoke-reviewer` runs a read-only reviewer invocation against a harmless in-memory fixture. Neither command executes a worker or advances runtime state.

Repository inspection is portable: `node scripts/repository-search.js --pattern <pattern> --path <path>` prefers `rg`, then falls back to `git grep`, PowerShell `Select-String`, and Node traversal. Missing `rg` alone must not block Structure or QA work; those workers still need concrete paths, line numbers, command results, and sufficient evidence.

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

Use the explicit configured escalation path only when needed:

```bash
node scripts/orchestrate.js run --escalate
```

Run continuously through the remaining pipeline until complete, blocked, or awaiting a human decision:

```bash
node scripts/orchestrate.js run --all
```

Review the latest preserved worker result without rerunning its planner or worker:

```bash
node scripts/orchestrate.js resume
```

`review-current` is an alias. The adapter verifies objective, target, track, phase, worker, branch, and preserved HEAD before reusing evidence. A HEAD change is accepted only when the preserved evidence proves that the worker made no implementation changes. `run --all` uses the same reviewer-only recovery path when compatible current-worker evidence is available.

Run the dependency-free mocked transport/runtime checks:

```bash
node scripts/test-orchestration-runtime.js
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

This folder is gitignored. It contains the last packet, generated task contracts, worker stdout/stderr, git evidence, and reviewer verdicts so an orchestration failure can be inspected without polluting the repository.

The structured Worker Result separates the work from its proof:

- `summary` is a short factual synopsis.
- `deliverable.type` is phase-compatible (`structure-handoff`, `content-handoff`, `design-handoff`, `implementation-report`, `experience-review`, or `qa-report`).
- `deliverable.content` is the complete substantive handoff required by the current worker contract.
- `filesChanged`, `commandsRun`, and `verification` are evidence about that deliverable.

The reviewer does not receive those raw worker streams or the full planner/session context. It receives one compact package containing the objective, target, track, phase, current worker, relevant constraints, the generated task contract, `parsedWorkerFinalResult.deliverable`, the worker summary, worker-reported evidence, git identity/status, diff checks, changed filenames, a bounded diff, and bounded untracked-file evidence. Failed workers additionally provide bounded stderr/stdout tails only. Successful workers never send full stdout, stderr, session transcripts, echoed prompts, or startup noise.

`ORCHESTRATOR_MAX_REVIEWER_INPUT_CHARS` defaults to `250000`. The adapter measures the serialized reviewer package before transport and deterministically compacts optional previews when necessary. Acceptance criteria, the generated contract, parsed worker result, verification, changed files, and git identity are preserved. If the required evidence still cannot fit, the adapter records a concise `BLOCKED` result without invoking the reviewer. Reviewer failures are classified as `TRANSPORT_FAILURE`, `STRUCTURED_OUTPUT_FAILURE`, `REVIEWER_CONTRACT_FAILURE`, `REVIEWER_INPUT_FAILURE`, or `REVIEWER_VERDICT`; malformed or contract-invalid output gets one reviewer-only retry with the violation called out. A transport failure or second invalid response preserves worker/evidence audits, blocks the current worker without advancing it, and exits cleanly.

The adapter validates the worker deliverable before reviewer transport. A successful worker invocation with a missing, empty, or wrong-phase deliverable is a `WORKER_PROTOCOL_FAILURE`; it blocks without consuming a normal worker repair attempt. Preserved legacy worker output can be migrated when a complete substantive handoff is unambiguously present before the legacy JSON result. The original audit remains intact and a compact migration audit is emitted when resume uses that evidence.

## Repair Policy

`REPAIR` does not advance the worker. The adapter asks the orchestrator for a repair-only work order and sends it back to Codex. The default maximum is two repair attempts (`ORCHESTRATOR_MAX_REPAIRS=2`). If the limit is exceeded the runtime blocks instead of looping indefinitely.

Repair counts are phase-local protocol counts. When preserved legacy worker output is successfully and compatibly migrated into the current `deliverable` protocol, repair attempts caused by that superseded protocol reset for the current phase. Normal current-protocol worker or reviewer repairs never reset. Audit attempt numbering remains monotonic so preserved evidence is not overwritten.

`HUMAN_DECISION` is recorded as a blocked state with the decision question preserved in `lastResult`; work does not continue until the owner resolves it and explicitly unblocks/restarts the appropriate objective.

## Tracks

Supported tracks map to the existing worker documents:

- `page-build-track`: Structure → Content → Design → Implementation → Experience Review → QA
- `feature-build-track`: Structure → **conditional Design** → Implementation → Experience Review → QA
- `content-polish-track`: Content → Experience Review → QA
- `qa-review-track`: QA

The runtime is deliberately conservative. It will not silently invent a track, skip a required experience review, deploy, or mutate public architecture.
