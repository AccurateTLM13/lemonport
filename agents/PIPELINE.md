# The Lemonteed Production Pipeline

The Lemonteed Production Pipeline turns an idea into a reviewed, polished, static-site-safe change.

## Operating Model

The orchestrator owns the outcome. It defines success, chooses the track, sequences the workers, manages risks, and decides when the work is ready to ship.

Workers own execution. Each worker performs a focused pass, records what changed or what they found, and hands back clear next steps.

## Pipeline Stages

1. Intake
   - Define the page, feature, content area, or review target.
   - State the desired user outcome.
   - Identify constraints, source files, generated files, and validation commands.

2. Structure
   - Map the route, data source, file boundaries, shared chrome, and page-owned areas.
   - Confirm whether the change is public-site, Studio-only, content-only, or workflow-only.

3. Content
   - Draft or refine copy, metadata, labels, alt text, and content hierarchy.
   - Preserve `content/projects.json` and `content/categories.json` as gallery source of truth.

4. Design
   - Shape layout, visual rhythm, mobile behavior, and interaction states.
   - Keep the public site plain HTML/CSS/JS and consistent with the existing archive language.

5. Implementation
   - Make the smallest coherent code/content changes.
   - Do not modify generated files directly.
   - Rebuild generated assets only through the relevant script.

6. Experience Review
   - Review the result as a visitor experience, not only as code.
   - Check hierarchy, tone, affordances, responsive behavior, and friction.

7. QA
   - Validate content and run relevant scripts.
   - Check local routes manually when the change affects public pages or Studio flows.
   - Record residual risks.

8. Handoff
   - Update `STATUS.md`.
   - Add decisions to `DECISIONS.md`.
   - Fill `HANDOFF_TEMPLATE.md` if the work is incomplete or will continue in another run.

## Track Selection

- Use `tracks/page-build-track.md` for a new static page or substantial page revision.
- Use `tracks/feature-build-track.md` for scripts, Studio capabilities, interactions, or local workflow features.
- Use `tracks/content-polish-track.md` for copy, metadata, gallery content, and editorial passes.
- Use `tracks/qa-review-track.md` for audits, regression checks, and release readiness.

## Quality Gate

Before work is considered done, the orchestrator must confirm:

- The public site remains static.
- Studio remains local/private.
- Generated files were not hand-edited.
- Source-of-truth content files were used when content changed.
- The relevant validation commands were run or explicitly deferred with a reason.
- `STATUS.md` reflects the current state.
