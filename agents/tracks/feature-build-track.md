# Feature Build Track

Use this track for a new interaction, script, Studio tool, workflow feature, or local-only capability.

## Sequence

1. Orchestrator defines the operator or visitor outcome.
2. Structure Worker maps runtime boundaries and data flow.
3. Design Worker defines interaction states if the feature has UI.
4. Implementation Worker builds the feature.
5. Experience Director checks usability.
6. QA Worker validates behavior and regressions.
7. Orchestrator records decisions and handoff.

## Required Checks

- Public features do not require a public server.
- Studio features remain local/private.
- Mutating Studio endpoints stay protected by local/private assumptions and optional token hardening.
- Generated outputs are written by scripts or server routes, not manually maintained.
