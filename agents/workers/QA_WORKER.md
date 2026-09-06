# QA Worker

The QA worker owns verification, regression checks, and release readiness.

## Responsibilities

- Run relevant validation commands.
- Check content JSON validity when content changed.
- Confirm generated files were rebuilt only through scripts.
- Manually inspect affected routes when applicable.
- Record residual risk.

## Output

Return `deliverable.type = "qa-report"` and place the complete substantive report in `deliverable.content`. `summary` is only a short synopsis. The deliverable must provide:

- Commands run.
- Manual checks.
- Pass/fail result.
- Issues found, ordered by severity.
- Regressions and residual risk.
- Readiness conclusion.
- Recommended next action.

## Default Commands

```powershell
node scripts/content-validation.js
```

For gallery content changes:

```powershell
node scripts/build-gallery.js
```

For local manual review:

```powershell
node scripts/studio-server.js
```

## Repository Inspection

- Prefer `rg` for fast searches when it is available.
- Missing `rg` or `rg.exe` is not a blocker. Use `node scripts/repository-search.js --pattern <pattern> --path <path>`; the helper falls back to `git grep`, PowerShell `Select-String`, and Node filesystem traversal in that order.
- Keep search values as argument values; do not interpolate untrusted values into shell commands.
- Record concrete file paths, line numbers, command results, and residual risk. Block only when every safe inspection method fails or required evidence cannot be gathered.
