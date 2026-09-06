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

A worker `completed` claim is not a pipeline PASS. Only the orchestrator can issue the verdict after checking the contract and evidence.

## Repository Inspection

- Prefer `rg` for repository inspection, but missing `rg` or `rg.exe` is not a blocker. Use `node scripts/repository-search.js --pattern <pattern> --path <path>`, which falls back to `git grep`, PowerShell `Select-String`, then Node filesystem traversal.
- Keep search values as process arguments and never interpolate untrusted values into shell commands.
- Structure and QA evidence must include concrete paths, line numbers, command results, and residual risk. Report BLOCKED only when all safe inspection methods fail or required evidence cannot be gathered.

## Orchestrator Verdict

The orchestrator returns exactly one of:

- `PASS` — acceptance criteria are supported by evidence; advance the state machine.
- `REPAIR` — work is recoverable and should return to Codex with a narrowly scoped repair contract.
- `BLOCKED` — an external dependency or unresolved technical blocker prevents progress.
- `HUMAN_DECISION` — owner judgment, approval, destructive action, deployment, or a product/architecture tradeoff is required.

The orchestrator must not mark PASS merely because Codex says it finished or because a command exited successfully if the acceptance criteria require additional evidence.
