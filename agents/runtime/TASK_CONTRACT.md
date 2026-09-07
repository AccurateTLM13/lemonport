# Codex Task Contract

Every implementation request sent from the Lemonteed orchestrator to Codex should follow this contract. The purpose is to make execution bounded, reviewable, and machine-interpretable.

## Required Work Order

```md
# Mission
One concrete outcome for this worker run.

# Current State
Relevant verified repository/project state only.

# In Scope
Exact files, directories, routes, systems, or behaviors that may be changed or inspected.

# Out of Scope
Explicit boundaries. Include architecture, unrelated features, generated files, deployment, or content areas that must not change.

# Requirements
Specific implementation or analysis requirements.

# Acceptance Criteria
Observable conditions that must all be true for PASS.

# Verification
Commands and manual checks Codex must run when available.

# Evidence Required
- files changed
- concise diff summary
- commands actually run
- pass/fail output
- screenshots or route checks when relevant
- known residual risks
- any deviation from scope

# Stop Conditions
Conditions that require Codex to stop instead of guessing or broadening scope.

# Return Format
Use the Worker Result format below.
```

## Worker Result

Codex must end with a structured result block:

```json
{
  "status": "completed | blocked | partial",
  "summary": "short factual summary",
  "deliverable": {
    "type": "phase-compatible machine-readable type",
    "content": "complete substantive output owned by the current worker"
  },
  "filesChanged": [],
  "commandsRun": [],
  "verification": [
    {
      "check": "name",
      "result": "pass | fail | not-run",
      "evidence": "brief factual evidence"
    }
  ],
  "scopeDeviations": [],
  "residualRisks": [],
  "blockers": [],
  "recommendedNextAction": ""
}
```

`deliverable.content` is the work. `summary` is only a short synopsis and cannot replace the deliverable. The adapter validates a phase-compatible type and non-empty content before allowing a worker result to advance. Stable types are `structure-handoff`, `content-handoff`, `design-handoff`, `implementation-report`, `experience-review`, and `qa-report`.

The worker must return exactly one structured JSON result. Do not put the substantive handoff in prose outside that result. `verification`, `commandsRun`, and `filesChanged` are evidence about the deliverable, not substitutes for it.

A worker `completed` claim is not a pipeline PASS. Only the orchestrator can issue the verdict after checking the contract and evidence.

## Repository Inspection

- Prefer `rg` for repository inspection, but missing `rg` or `rg.exe` is not a blocker. Use `node scripts/repository-search.js --pattern <pattern> --path <path>`, which falls back to `git grep`, PowerShell `Select-String`, then Node filesystem traversal.
- Keep search values as process arguments and never interpolate untrusted values into shell commands.
- Structure, Implementation, and QA use stronger repository-proof standards: concrete paths, exact line evidence for material claims, command results where applicable, and residual risk.
- Content, Design, and Experience Review use fit-for-purpose grounding for the phase's actual responsibility. Design requires exact inspected paths, line ranges for primary UI/interaction surfaces, source-of-truth identification, and concrete support for material behavior claims; it does not require quoted excerpts from every secondary file or exhaustive line evidence for large JSON sources.
- Report BLOCKED only when all safe inspection methods fail or required evidence cannot be gathered.

## Orchestrator Verdict

The orchestrator returns exactly one of:

- `PASS` — acceptance criteria are supported by evidence; advance the state machine.
- `REPAIR` — work is recoverable and should return to Codex with a narrowly scoped repair contract.
- `BLOCKED` — an external dependency or unresolved technical blocker prevents progress.
- `HUMAN_DECISION` — owner judgment, approval, destructive action, deployment, or a product/architecture tradeoff is required.

The orchestrator must not mark PASS merely because Codex says it finished or because a command exited successfully if the acceptance criteria require additional evidence.
