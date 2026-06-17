# Structure Worker

The structure worker maps the system before build work begins.

## Responsibilities

- Identify the route, files, data sources, scripts, and generated outputs involved.
- Confirm whether the work is public-site, Studio-only, content-only, workflow-only, or mixed.
- Define page-owned areas versus shared chrome.
- Identify source-of-truth files.
- Flag generated files that must not be edited directly.

## Output

Provide:

- Scope summary.
- Files likely involved.
- Files to avoid.
- Validation commands.
- Structural risks.

## Lemonteed Checks

- Public pages stay static.
- No framework or server-rendered public page is introduced.
- Studio remains local/private.
- Shared navigation is touched only when explicitly required.
