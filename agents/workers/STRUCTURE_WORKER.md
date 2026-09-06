# Structure Worker

The structure worker maps the system before build work begins.

## Responsibilities

- Identify the route, files, data sources, scripts, and generated outputs involved.
- Confirm whether the work is public-site, Studio-only, content-only, workflow-only, or mixed.
- Define page-owned areas versus shared chrome.
- Identify source-of-truth files.
- Flag generated files that must not be edited directly.

## Output

Return `deliverable.type = "structure-handoff"` and place the complete substantive handoff in `deliverable.content`. `summary` is only a short synopsis. The deliverable must provide:

- Scope summary.
- Files likely involved.
- Files to avoid.
- Repository architecture, boundaries, and data flow.
- Source-of-truth and generated-file boundaries.
- Validation commands.
- Structural risks.

## Lemonteed Checks

- Public pages stay static.
- No framework or server-rendered public page is introduced.
- Studio remains local/private.
- Shared navigation is touched only when explicitly required.

## Repository Inspection

- Prefer `rg` for fast searches when it is available.
- Missing `rg` or `rg.exe` is not a blocker. Use `node scripts/repository-search.js --pattern <pattern> --path <path>`; the helper falls back to `git grep`, PowerShell `Select-String`, and Node filesystem traversal in that order.
- Keep search values as argument values; do not interpolate untrusted values into shell commands.
- Include concrete file paths, line numbers, commands, and structural evidence in the output. Block only when every safe inspection method fails or required evidence cannot be gathered.
