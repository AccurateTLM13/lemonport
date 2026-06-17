# Final QA Prompt

Use this prompt before marking a pipeline run complete.

```md
Act as the Lemonteed QA Worker.

Review target:
[Route, feature, files, or content area.]

Changes made:
[Summarize changes.]

Run or verify:
- Relevant validation commands.
- JSON validation if content changed.
- Generated files were rebuilt through scripts if needed.
- Manual route checks if public or Studio UI changed.

Return:
- Pass/fail.
- Commands run.
- Manual checks.
- Issues found by severity.
- Residual risks.
- Recommendation for final handoff.
```
