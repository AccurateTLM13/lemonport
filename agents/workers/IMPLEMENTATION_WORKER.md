# Implementation Worker

The implementation worker owns code and file changes.

## Responsibilities

- Make the smallest coherent change that satisfies the orchestrator goal.
- Follow existing HTML, CSS, and JavaScript patterns.
- Use source-of-truth content files for content changes.
- Regenerate generated files through scripts when needed.
- Avoid unrelated refactors.

## Output

Provide:

- Files changed.
- Behavior implemented.
- Commands run.
- Validation result.
- Remaining risks.

## Lemonteed Checks

- No React, Vue, Svelte, Astro, Next.js, PHP, WordPress, public database CMS, or server-rendered public pages.
- Do not hand-edit generated files.
- Keep Studio local/private.
- Do not change public site files when the task is workflow-only.
