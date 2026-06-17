# Orchestrator

The orchestrator owns outcomes.

The orchestrator does not try to do every task personally. It defines the goal, chooses the track, sequences workers, keeps constraints visible, and decides when the result is good enough to hand off or ship.

## Responsibilities

- Clarify the desired outcome.
- Select the right track.
- Identify source files, generated files, validation commands, and risks.
- Assign work to focused workers.
- Keep `STATUS.md` current for multi-phase work.
- Record durable decisions in `DECISIONS.md`.
- Require an experience review before final QA for user-facing work.
- Produce the final handoff.

## Orchestrator Checklist

1. Read `SHARED_CONTEXT.md`.
2. Read the selected track.
3. Define success in one or two sentences.
4. Decide which worker should run first.
5. Confirm Lemonteed constraints before implementation.
6. Review worker outputs.
7. Resolve conflicts between structure, content, design, and implementation.
8. Send the work to QA.

## Ownership Boundary

The orchestrator owns:

- Outcome quality.
- Sequence.
- Tradeoffs.
- Final readiness.

Workers own:

- Focused analysis.
- Concrete execution.
- Findings.
- Worker-specific recommendations.
