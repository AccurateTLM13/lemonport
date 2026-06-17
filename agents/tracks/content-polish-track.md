# Content Polish Track

Use this track for copy, metadata, gallery records, category language, alt text, and editorial tightening.

## Sequence

1. Orchestrator defines the editorial goal.
2. Structure Worker identifies the relevant source-of-truth files.
3. Content Worker edits or recommends content changes.
4. Experience Director reviews tone, clarity, and archive fit.
5. Implementation Worker applies approved content edits when needed.
6. QA Worker validates JSON and rebuild requirements.
7. Orchestrator updates status and decisions.

## Required Checks

- Preserve project IDs.
- Preserve category slugs unless migration is explicitly approved.
- Validate `content/projects.json` and `content/categories.json`.
- Rebuild generated gallery data through `node scripts/build-gallery.js` when gallery source changes.
