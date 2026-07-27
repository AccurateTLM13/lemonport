# Lemonteed Production Pipeline

This folder defines the local-first workflow system for planning, building, reviewing, and polishing Lemonteed development, design, and content tasks.

The core principle is:

- The orchestrator owns outcomes.
- Workers own execution.

The pipeline is documentation and coordination infrastructure only. It does not change the public site architecture, does not expose Studio, and does not introduce a framework or public CMS.

## Use This Folder When

- Starting a new Lemonteed page, feature, content pass, or QA pass.
- Coordinating multiple focused agent runs.
- Capturing decisions that future agents need to respect.
- Creating a clean handoff after partial progress.

## Start Here

1. Read `SHARED_CONTEXT.md`.
2. Pick a track from `tracks/`.
3. Use `prompts/start-project.md` to define the outcome.
4. Let `workers/ORCHESTRATOR.md` assign execution to the right worker docs.
5. Update `STATUS.md`, `DECISIONS.md`, and `HANDOFF_TEMPLATE.md` as work progresses.

## Project Plans

- `../docs/LEMMY_TWO_LAYER_IMPLEMENTATION_PLAN.md` defines the staged public mascot and local Studio assistant build, including authority boundaries, agent ownership, acceptance criteria, and rollback.

## Non-Negotiable Lemonteed Constraints

- Preserve the static public-site architecture.
- Use plain HTML, CSS, and JavaScript.
- Do not introduce React, Vue, Svelte, Astro, Next.js, PHP, WordPress, a database-backed public CMS, or server-rendered public pages.
- Do not modify generated files directly.
- Treat `content/projects.json` and `content/categories.json` as source of truth when content/gallery data changes.
- Keep Studio local/private.
- Do not expose Studio as a public CMS.

## Future Direction

Lemonteed is the testing ground for a local-first production workflow that can later connect to LocAIly and Leymons. Keep the pipeline reusable, but make every current instruction faithful to Lemonteed first.
