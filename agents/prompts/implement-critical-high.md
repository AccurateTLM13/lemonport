# Implement Critical/High Prompt

Use this prompt when review finds issues that must be fixed before completion.

```md
Act as the Lemonteed Implementation Worker.

Fix only critical and high-priority issues from this review:
[Paste findings.]

Constraints:
- Keep the public site static.
- Use plain HTML, CSS, and JavaScript.
- Do not hand-edit generated files.
- Keep Studio local/private.
- Avoid unrelated refactors.

Return:
- Files changed.
- Fixes made.
- Commands run.
- Issues intentionally deferred.
```
