# Pipeline Status

Use this file to track active Lemonteed production work. Keep entries brief and current.

## Current Active Work

### Lemmy Two-Layer Integration

- Track: Feature Build Track
- Orchestrator: Primary Codex planning agent
- Current phase: Slices 1–5 accepted
- Completed: Repository-grounded architecture plus the Slice 1 homepage MVP, Slice 2 public zones/reactions, Slice 3 structured Studio health, and Slice 4 allowlisted Studio actions. This includes validated config, generated browser data, accessible triggers/panels, safe authored destinations, local minimize preference, approved Codex Pet pose assets, cooldown-aware event reactions, bounded health issues, record/media/report navigation, same-origin/token authorization, UI confirmations, and action-result refreshes.
- Current codebase state: Public Lemmy is deterministic and browser-only across the homepage plus six configured public zones. Studio Lemmy has read-only `GET /api/lemmy/health` and allowlisted `POST /api/lemmy/actions`; the approved pose set lives in `images/lemmy/poses/` and is referenced through `content/lemmy.json`.
- Pending: None for the documented two-layer feature. Future work can add explicitly approved pose states or a separately reviewed model boundary.
- Blockers: None for the current public slice. Additional pose coverage can be added later without changing the public contract.
- Validation run: Lemmy build, all required syntax checks, content validation, standard `scripts/check.js`, served endpoint checks, allowlist/CSRF/token rejection checks, desktop/mobile layout checks, keyboard/focus checks, six public-zone checks, Studio health/action checks, and `git diff --check` passed. Existing site audit findings remain: 78 medium empty-alt findings, one low SEO finding, zero missing referenced images, and 100 unused gallery files.
- Last updated: 2026-07-26

## Status Template

```md
### [Project or Task Name]

- Track:
- Orchestrator:
- Current phase:
- Completed:
- Current codebase state:
- Pending:
- Blockers:
- Validation run:
- Last updated:
```

## Status Values

- `Intake`
- `Structure`
- `Content`
- `Design`
- `Implementation`
- `Experience Review`
- `QA`
- `Handoff`
- `Complete`
- `Blocked`
