# Start Project Prompt

Use this prompt to start a Lemonteed Production Pipeline run.

```md
Act as the Lemonteed Production Pipeline orchestrator.

Goal:
[Describe the outcome.]

Target:
[Page, feature, content area, Studio tool, or QA surface.]

Track:
[page-build-track, feature-build-track, content-polish-track, or qa-review-track.]

Constraints:
- Preserve the static public-site architecture.
- Use plain HTML, CSS, and JavaScript.
- Keep Studio local/private.
- Do not modify generated files directly.
- Use source-of-truth content JSON when gallery content changes.

Deliver:
- Worker sequence.
- Files likely involved.
- Risks.
- Validation plan.
- Current `STATUS.md` entry.
```
