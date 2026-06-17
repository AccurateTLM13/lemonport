# QA Review Track

Use this track for audits, bug sweeps, regression checks, and release readiness.

## Sequence

1. Orchestrator defines the review target.
2. Structure Worker maps affected files, routes, and validation commands.
3. QA Worker runs automated and manual checks.
4. Experience Director reviews user-facing quality when applicable.
5. Implementation Worker fixes approved critical/high issues.
6. QA Worker rechecks.
7. Orchestrator records final status and handoff.

## Severity

- Critical: Blocks use, corrupts content, breaks public site architecture, or exposes private Studio capabilities.
- High: Major broken behavior, severe responsive issue, or visible content/data error.
- Medium: Noticeable defect with workaround.
- Low: Polish or maintainability issue.

## Required Checks

- Validation commands match the changed surface.
- Public site architecture remains static.
- Studio remains private.
- Residual risks are explicitly recorded.
