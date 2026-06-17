# Shared Context

Lemonteed is a static visual portfolio and experimental artifact archive built with plain HTML, CSS, and JavaScript.

The public output should remain portable static files. Local tooling can be powerful, but deployed pages must not depend on a public application server.

## Architecture Context

Primary architecture references:

- `AGENT_RULES.md`
- `LEMONTEED_ENGINE.md`
- `STUDIO.md`

Public-site changes should respect shared chrome, mobile navigation, generated gallery data, and the archive structure already in the repo.

Studio is a local/private editing layer served by `scripts/studio-server.js`. It is not a public CMS.

## Source Of Truth

Use source content files for content changes:

- `content/projects.json`
- `content/categories.json`
- `content/live-experiment.json`
- `content/lemonteed-fm.json`
- `content/million-dollar-receipt.json`
- `content/vrg-vault.json`
- `content/operator-log/schedule.json`

Do not manually edit generated browser data files as source.

## Generated Files

Generated public data includes:

- `assets/js/gallery-data.js`
- `assets/js/gallery-categories.js`
- `assets/js/live-experiment-data.js`
- `assets/js/vrg-vault-data.js`
- `assets/js/mdr-config.js`
- `assets/js/mdr-stats.js`
- `lemonteed-fm/tracks.js`
- `operator-log/manifest.json`
- `operator-log/data/[activeFragment].json`

Responsive image variants under `images/**` are also generated assets.

## Validation Defaults

For content/gallery changes:

```powershell
node scripts/content-validation.js
node scripts/build-gallery.js
```

For local public/Studio review:

```powershell
node scripts/studio-server.js
```

Then check:

```text
http://localhost:5173/
http://localhost:5173/studio/
GET /api/validation
```

## Scope Rule

When a task names a page, assume the requested behavior belongs to that page's main content area unless the user explicitly asks for global navigation, shared chrome, header, sidebar, mobile drawer, or footer changes.
