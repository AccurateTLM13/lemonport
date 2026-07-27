# Decisions Log

Record durable production decisions here so later agents do not have to rediscover them.

## Decision Template

```md
### YYYY-MM-DD - [Decision Title]

- Decision:
- Context:
- Alternatives considered:
- Consequences:
- Applies to:
- Revisit when:
```

## Current Decisions

### 2026-07-26 - Lemmy Has Two Authority Levels

- Decision: Public Lemmy is a deterministic browser-only guide; Studio Lemmy is a local/private operator limited to structured health data and approved operations.
- Context: The same character should connect Lemonteed's public world and private engine without exposing public AI infrastructure or unsafe file authority.
- Alternatives considered: A public chatbot, a single shared assistant runtime, or a decorative mascot with no Studio role.
- Consequences: Public behavior remains static and authored. Studio capabilities require explicit server-side allowlisting and user confirmation.
- Applies to: Public Lemmy and Studio Lemmy.
- Revisit when: A local model provider or public authenticated service is explicitly approved.

### 2026-07-26 - Lemmy Uses Separate Canonical Configuration

- Decision: Author Lemmy behavior in `content/lemmy.json` and generate `assets/js/lemmy-data.js`; do not add Lemmy to gallery records or hand-edit gallery-generated data.
- Context: Lemmy is a site character and operator, not a gallery artifact.
- Alternatives considered: Hardcoded per-page behavior, runtime JSON fetches, or adding Lemmy to `content/projects.json`.
- Consequences: Public pages remain static while behavior stays centrally validated and rebuildable.
- Applies to: Public Lemmy configuration and builds.
- Revisit when: The public content build pipeline is redesigned.

### 2026-07-26 - Studio Lemmy Starts Deterministic

- Decision: Ship read-only health summaries and approved button-driven operations before considering a conversational model.
- Context: The current Studio has no model provider or model-operation threat boundary, but it already has useful structured validation and media operations.
- Alternatives considered: Add an open-ended chatbot in the first Studio pass.
- Consequences: Initial value is testable without model cost, privacy exposure, or free-form tool authority.
- Applies to: Studio Lemmy Passes 4 and 5.
- Revisit when: A separate model integration architecture decision is approved.

### 2026-07-26 - Codex Pet Library Is Lemmy's Public Art Source

- Decision: Use the supplied Codex Pet lemon renders as the approved public Lemmy art direction, extracting transparent named pose assets under `images/lemmy/poses/`.
- Context: Slice 2 needs distinct visual states without introducing a new character language or silently inventing artwork.
- Alternatives considered: Reuse one static homepage image, generate new unrelated poses, or ship the turquoise matte renders directly.
- Consequences: Public state changes remain authored and deterministic while the matte background is removed for clean placement. Additional poses can be added as explicit state assets later.
- Applies to: Public Lemmy artwork and `content/lemmy.json` state mappings.
- Revisit when: The owner approves a replacement Lemmy art direction or a different asset pipeline.

### 2026-07-26 - Studio Lemmy Uses a Structured Action Boundary

- Decision: Keep Studio Lemmy's server authority behind one exact-contract dispatcher and reuse existing validated Studio helpers.
- Context: Health triage is useful, but free-form model or filesystem authority would exceed the local Studio boundary.
- Alternatives considered: Direct UI calls to arbitrary scripts, path-bearing requests, bulk metadata mutation, or an open-ended assistant.
- Consequences: The UI can validate, refresh, rebuild, or regenerate only through named operations; mutating operations remain confirmed and authorized.
- Applies to: `scripts/lemmy-actions.js`, `POST /api/lemmy/actions`, and the Studio Lemmy workspace.
- Revisit when: A separately reviewed local model and audit-log architecture is approved.

### 2026-06-17 - Local-First Pipeline Folder

- Decision: Keep the Lemonteed Production Pipeline in `/agents` as local workflow documentation.
- Context: The project needs a repeatable planning, execution, review, and handoff system before connecting similar workflows to LocAIly and Leymons.
- Alternatives considered: Embedding the workflow only in root agent instructions or public Studio pages.
- Consequences: The workflow is visible to local agents and maintainers without changing public site behavior.
- Applies to: Lemonteed development, design, content, and QA work.
- Revisit when: The workflow is integrated with external project systems or automation.
