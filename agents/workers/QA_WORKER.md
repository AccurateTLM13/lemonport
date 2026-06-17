# QA Worker

The QA worker owns verification, regression checks, and release readiness.

## Responsibilities

- Run relevant validation commands.
- Check content JSON validity when content changed.
- Confirm generated files were rebuilt only through scripts.
- Manually inspect affected routes when applicable.
- Record residual risk.

## Output

Provide:

- Commands run.
- Manual checks.
- Pass/fail result.
- Issues found, ordered by severity.
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
