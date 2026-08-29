# Agent Rules

This repository is a static public site plus a local Studio tool. Treat `LEMONTEED_ENGINE.md` as the architecture source before making broad changes.

## Do

- Preserve the static public-site architecture.
- Follow `lemonteed-brand-system.md` for all voice, copy, layout, and component styling.
- Frame copy and status labels in a dry, self-aware, deadpan workshop/lab tone ("on the bench", "in the drawer", "STATUS: OFF CLOCK").
- Standardize all pills/tags to single-weight outlined uppercase mono rectangles (`[ CATEGORY ]`).
- Limit CTAs to max 1 primary solid-fill button per section; use outlined styles for secondary actions.
- Give Lemmy (the mascot) a functional Operator quote/guidance job when present, rather than floating decoration.
- Inspect the ENTIRE viewport (including sidebars, navigation rails, headers, and footers) during visual checks—do not inspect main content in isolation.
- Explicitly override `background`, `color`, `border`, and `box-shadow` on all shared global chrome elements (`.category-link`, `.sidebar`, `.junk-drawer-module`, `.random-artifact`) when creating dark mode or theme variant CSS overrides to prevent light-theme styles from leaking through.
- Prefer existing plain HTML, CSS, and JavaScript patterns.
- Put public tool pages inside the shared site shell/sidebar when practical so navigation, mobile chrome, and archive context stay consistent.
- Use `content/projects.json` and `content/categories.json` as content source of truth.
- Rebuild generated gallery data with `node scripts/build-gallery.js` after content JSON changes that affect the public gallery.
- Keep Studio local/private unless the owner explicitly approves a public admin architecture.
- Validate JSON before and after manual data edits.
- Preserve stable artifact `id` values.
- Treat category `slug` values as references used by project records, filtering, paths, and image folders.
- Use the canonical Studio statuses: `Draft`, `Ready`, `Published`, `Hidden`, `Archived`, and `Deleted`.
- Keep Memetic Warfare game data consistent with referenced gallery artifact IDs.
- Strictly convert all new images, screenshots, review frames, and media uploads to WebP (`.webp`) format with high quality (`-quality 85` / `webp:method=6`) before committing or saving to disk to maintain minimal storage footprint and maximum performance.
- Always follow a Progressive Enhancement & SEO-First mindset: render core catalog data, tables, and explanations in static semantic HTML with heading hierarchy and Schema.org metadata so search crawlers index content directly. Use semantic `<a href="...">` links with deep anchors (`#skills`, `#models`, `#prompts`, etc.) instead of `<button>` modals to preserve internal link equity, and layer JS interactions purely as progressive enhancement.
- Check for existing user changes before editing files.
- Treat page-specific behavior requests as applying to that page's main content by default. Header, sidebar, navigation, mobile chrome, drawers, and footer are shared/global chrome and should only be changed when the user explicitly asks for a global or navigation-level change.

## Do Not

- Do not perform partial or premature redesigns on pages not currently scheduled for work (follow `lemonteed-brand-system.md` Section 7 incremental migration).
- Do not commit or store raw `.png`, `.jpg`, `.jpeg`, or uncompressed images on the site for content, review frames, screenshots, or gallery items (standard browser compliance favicons under `images/favicons/` excepted). All content images must be `.webp`.
- Do not write generic corporate/SaaS marketing copy or hedged disclaimers.
- Do not manually edit `assets/js/gallery-data.js` or `assets/js/gallery-categories.js` as source data.
- Do not replace the public site with a frontend framework.
- Do not introduce a public server requirement for the deployed site.
- Do not add a database for public content unless the owner approves an architecture change.
- Do not rename project IDs casually.
- Do not rename slugs without considering public URLs, hashes, image paths, and related references.
- Do not delete image files unless the corresponding project metadata change is intentional.
- Do not deploy or expose `scripts/studio-server.js` as a public CMS.
- Do not treat `memetic-warfare/index.html` as a normal gallery-only page.
- Do not attach page-specific click interception or coming-soon behavior to `<body>` when the intent is page content only. Scope it to `main`, `article`, or a page-owned content container.
- Do not use accent-colored borders, border-left stripes, or decorative border accents on cards anywhere in the public site. Use neutral hairlines, surface contrast, whitespace, typography, or non-border state treatments instead.

## Generated File Policy

Current generated public data files:

- `assets/js/gallery-data.js`
- `assets/js/gallery-categories.js`
- `assets/js/live-experiment-data.js`
- `assets/js/vrg-vault-data.js`
- `assets/js/mdr-config.js`
- `assets/js/mdr-stats.js`
- `lemonteed-fm/tracks.js`
- `assets/js/lemmy-data.js`
- `operator-log/manifest.json` (generated by `scripts/promote-operator-mutation.js`)
- `operator-log/data/[activeFragment].json` (generated by `scripts/promote-operator-mutation.js`)
- `specimens/index.html` (generated by `scripts/build-specimens.js` from `content/specimens.json`; includes per-specimen info drawers)
- `sitemap.xml` and `image-sitemap.xml` (generated by `scripts/build-artifact-pages.js`, including Operator Log article routes and figure images)

Current generated media files:

- responsive `*.webp` variants under `images/**`
- resized logo files such as `images/lemonteedlogo-250.webp` and `images/lemonteedlogo-456.webp`

Approved Lemmy pose assets live under `images/lemmy/poses/`. They are transparent WebP project assets referenced by `content/lemmy.json`, not generated gallery output.

## Content Change Checklist

Before finishing a content or Studio-related change:

- Confirm `content/projects.json` is valid JSON.
- Confirm `content/categories.json` is valid JSON.
- Run `node scripts/content-validation.js`.
- Confirm category references use real category slugs.
- Confirm related item references point to existing project IDs.
- Confirm published projects have image and thumbnail data.
- Confirm non-public workflow states are not expected to appear in generated gallery data.
- Run the relevant build or explain why it was not run.

## Visual & Theme Checklist

Before finishing any UI, layout, or page theme modification:

- Perform a full-viewport visual check of the entire page shell (sidebar, navigation rail, top header, main content stage, and footer).
- On pages with theme overrides (e.g. `is-vrg-vault-mode`, dark modes, or custom page palettes), verify that shared navigation links (`.category-link`, `.info-link`, `.random-artifact`, `.junk-drawer-module`) do not inherit light-theme background fills, borders, or text colors.
- Verify hover and active states for all navigation items in both light and dark mode contexts.

## Local Commands

Build Lemmy data:

```powershell
node scripts/build-lemmy.js
```

Start Studio:

```powershell
node scripts/studio-server.js
```

Rebuild gallery data:

```powershell
node scripts/build-gallery.js
```

Validate content data:

```powershell
node scripts/content-validation.js
```

Run the standard local check suite:

```powershell
node scripts/check.js
```

Studio also exposes archive validation at:

```text
GET /api/validation
```

Studio Lemmy exposes bounded read-only archive health at:

```text
GET /api/lemmy/health?limit=40
```

Approved Studio Lemmy actions are exposed at:

```text
POST /api/lemmy/actions
```

The action dispatcher accepts only `validate-archive`, `refresh-health`, `rebuild-gallery`, and `regenerate-project-variants` with exact arguments. The first two are read-only; the latter two require UI confirmation and reuse existing backups/helpers. `open-record` remains client-side navigation.

Media health is separate from validation because unused files need deliberate review before deletion:

```powershell
node scripts/media-health.js
```

Studio exposes the same report at:

```text
GET /api/media-health
```

Regenerate image variants:

```powershell
node scripts/generate-image-variants.js
```

Dry-run image variant generation:

```powershell
node scripts/generate-image-variants.js --dry-run
```

Promote active operator log mutation:

```powershell
node scripts/promote-operator-mutation.js
```

Rebuild Million Dollar Receipt config:

```powershell
node scripts/build-mdr.js
```

Rebuild Million Dollar Receipt live stats:

```powershell
node scripts/build-mdr-stats.js
```

Rebuild the Specimen Vault index and record pages (follow with `node scripts/build-seo.js` to converge meta):

```powershell
node scripts/build-specimens.js
```

Import the official SYSTEM//FORM specimen set (dry-run first; no source output is repaired or substituted):

```powershell
node scripts/import-systemform-specimens.js --source <SYSTEMFORM folder> --dry-run
node scripts/import-systemform-specimens.js --source <SYSTEMFORM folder>
```
