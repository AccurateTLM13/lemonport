# Agents

See `AGENT_RULES.md` for repository-level agent guidelines (do/don't rules, content change checklist, generated file policy).

See `lemonteed-brand-system.md` for the core brand concept, voice & tone, color roles, typography, component standards (pills, cards, buttons), mascot rules, and incremental page migration guidelines.

See `LEMONTEED_ENGINE.md` for architecture overview, build pipeline, and image pipeline details.

See `STUDIO.md` for Studio features and local start instructions.

See `agents/README.md` for the Lemonteed Production Pipeline, a local workflow system for planning, building, reviewing, and polishing development/design/content tasks without changing the public static-site architecture.

## Cursor Cloud specific instructions

### System dependency

ImageMagick must be available as the `magick` CLI command. The Studio server and image variant scripts call `magick identify` and `magick <input> ... <output>` (ImageMagick 7 syntax). On Ubuntu/Debian where only ImageMagick 6 is packaged, install `imagemagick` and add a wrapper script at `/usr/local/bin/magick` that dispatches to the IM6 binaries (`identify`, `convert`, etc.). The update script handles this automatically.

### Running the dev server

```bash
node scripts/studio-server.js
```

- Public site: `http://localhost:5173/`
- Studio CMS: `http://localhost:5173/studio/`
- The port can be overridden with the `PORT` environment variable.
- By default the server binds to `127.0.0.1` only. Set `STUDIO_ALLOW_REMOTE=1` to listen on all interfaces, which requires `STUDIO_WRITE_TOKEN` for mutating `/api/*` requests.
- Optional hardening: set `STUDIO_WRITE_TOKEN` locally and send `Authorization: Bearer <token>` from Studio write requests.

### Running the MDR API server (SQLite local option)

```bash
node --experimental-sqlite mdr-api/server.js
```

- Local API base: `http://localhost:8787`
- Uses native `node:sqlite` database stored at `mdr-api/data/receipts.db`.
- Requires Node.js v22.12.0+ and the `--experimental-sqlite` flag.

### Running the MDR API server (Cloudflare Worker + D1 option)

For staging/production or local Worker testing:

```bash
# Initialize local D1 database schema
npx wrangler d1 execute DB --local --file=schema.sql --config mdr-api/wrangler.toml

# Start the local worker emulator
npx wrangler dev --local --port 8788 --config mdr-api/wrangler.toml
```

- Worker API base: `http://localhost:8788`
- Requires wrangler CLI. Binding secrets can be set with `wrangler secret put` or inside `wrangler.toml`.
- Automatically lazy-seeds the database from `content/million-dollar-receipt.json` on the first query if the database is empty.

### Key scripts (all run from repo root)

| Command | Purpose |
|---------|---------|
| `node scripts/content-validation.js` | Validate content JSON |
| `node scripts/check.js` | Run standard validation, site audit, and media health checks |
| `node scripts/site-completion-audit.js` | Multi-track site completion + SEO readiness audit |
| `node scripts/build-gallery.js` | Rebuild generated gallery data files |
| `node scripts/generate-image-variants.js` | Regenerate responsive image variants |
| `node scripts/build-live-experiment.js` | Rebuild live experiment data |
| `node scripts/build-lemonteed-fm.js` | Rebuild Lemonteed FM data |
| `node scripts/build-mdr.js` | Rebuild Million Dollar Receipt config |
| `node scripts/build-mdr-stats.js` | Rebuild Million Dollar Receipt stats |
| `node scripts/build-artifact-pages.js` | Generate static pages for all published artifacts + update sitemap |
| `node scripts/build-junk-drawer.js` | Rebuild external Junk Drawer cards |
| `node scripts/build-specimens.js` | Rebuild Specimen Vault index + record pages |
| `node scripts/import-systemform-specimens.js --source <SYSTEMFORM folder> [--dry-run]` | Import the official SYSTEM//FORM five-test/eight-model set into the Specimen Vault; localizes exact imagery as WebP and fails closed on unlisted missing originals |
| `node scripts/generate-og-images.js` | Generate psychology-driven branded 1200×630 WebP OG cards |
| `node scripts/build-seo.js` | Sync SEO metadata and patch HTML files in place |
| `node scripts/promote-operator-mutation.js` | Promote active operator log phase |
| `node --experimental-sqlite mdr-api/server.js` | Start the Million Dollar Receipt SQLite API backend |

### Notes

- There is no `package.json` and no npm dependencies. All scripts use Node.js built-in modules only.
- There are no automated test suites. Validate changes with `node scripts/content-validation.js`, `node scripts/site-completion-audit.js`, and the Studio validation API (`GET /api/validation`).
- There is no linter configured. Code style is vanilla JavaScript following existing patterns in the repo.
- The public site is purely static HTML/CSS/JS. Do not introduce frameworks or build tools for the public output.
- **Mandatory WebP Format Standard**: All content images, review frames, screenshots, and figures across the repository must strictly be `.webp` format with high visual fidelity (`quality: 85`). Storing raw `.png` or `.jpg` raster files on the site is strictly prohibited (standard browser favicons under `images/favicons/` excepted).
- **Mandatory Progressive Enhancement & SEO-First Architecture**: Always approach any new feature, interactive component, or visual widget with a crawlable, SEO-first mindset. Never hide core data, catalog records, or explanatory text exclusively inside client-side JS `fetch()` calls or ephemeral `<button>`-triggered modals. Instead:
  1. Render all primary content, tables, definitions, and data in **semantic static HTML** with clear heading hierarchies and Schema.org structured data so search engine crawlers (Googlebot, Bingbot, LLM search engines) index text, keywords, and long-tail terms directly.
  2. Use real semantic `<a href="...">` links with deep anchor IDs (`#skills`, `#models`, `#prompts`, etc.) instead of `<button>` elements to maintain internal link equity, anchor text signals, and Google sitelink eligibility.
  3. Layer client-side JavaScript on top purely as progressive enhancement (e.g. smooth animated inline drawers, tab activations, interactive filters, modal dialogs), ensuring 100% graceful degradation if JavaScript is disabled.

## Documentation updates & progress tracking

To support concurrent work streams and seamless handoffs between agent runs:
- **Continuous Documentation**: Anytime a new project, subpage, script, or database file is added, update the relevant documentation (`AGENTS.md`, `AGENT_RULES.md`, `LEMONTEED_ENGINE.md`, or `STUDIO.md`) immediately so that the documentation matches the actual codebase state at all times.
- **Incremental Progress Tracking**: When implementing multi-phase or complex features, update the **Active Projects & Feature Progress** section below after completing each phase or sub-feature. Always clearly state:
  1. What was completed in the current phase.
  2. The exact current state of the codebase.
  3. The next steps and pending tasks for the next phase.
  This allows anyone (the owner or a subsequent agent) to pick up right where the previous session ended.

## Active Projects & Feature Progress

### Specimen Vault (Public HTML Filing System)

* **Status: Completed locally; not deployed**
  * **Completed:** Built a generalized version of the benchmark evidence-archive machinery as a standing public zone at `/specimens/`. Studio gained a **Specimen Vault** workspace: upload or paste raw HTML plus metadata (title, model used, skill/system, verbatim prompt, capture date, tags, operator notes, optional 0–100 score, manual `favorite` flag, canonical workflow statuses). On save the server sanitizes the HTML (`scripts/build-specimens.js` exports `sanitizeSpecimenHtml()` — strict injected CSP, `script-src 'none'`, connections off), stores it at `specimens/source/<id>.html`, writes `content/specimens.json` (backed up, validated), and regenerates the single-page `specimens/index.html`.
  * **Single-page architecture:** No per-specimen record pages. Each card links **straight to the archived HTML** (`source/<id>.html`, new tab) — click a specimen, see it in the browser. Metadata lives in statically-rendered per-specimen `<dialog>` elements inside the served HTML (fully crawlable); `specimens/vault.js` opens them as right-side slide-out drawers with backdrop close and focus return — progressive enhancement only.
  * **Card images:** One optional desktop screenshot per specimen (`POST /api/specimens/image`, crop-fitted 1440×900 WebP q85 at `specimens/images/<id>.webp`) shown on the public card and in the Studio list; deleting a specimen removes source file, card image, and asset folder.
  * **Page assets:** Photos used inside a specimen are uploaded through the same workspace (`POST /api/specimens/asset`). Each upload converts to WebP q85 under `specimens/assets/<id>/`, and `applyAssetMap()` rewrites matching `<img src>`/`poster`/CSS `url()` references in the stored source file by filename basename, so archived pages render fully offline. Asset uploads work before or after the HTML is saved.
  * **Registrations:** Zone registered in `content/seo.json` + `build-seo.js` (auto re-sync after every Studio save), OG card via `generate-og-images.js --page=specimens`, sitemap entry via `build-artifact-pages.js`, audit glob via `site-completion-audit.js`, and a Workbench sidebar nav card across all 11 zone pages.
  * **Public favorites rail:** Published records marked `[ FAVORITE ]` in Studio now render in an operator-curated rail between the hero and `JUMP TO`, in existing published-record order. The rail uses static semantic links plus an inert/aria-hidden loop copy, JS-only marquee motion, pause/resume, hover/focus/document-hidden pausing, reduced-motion scrolling, and mobile touch-scroll; unpublished favorites never render and more than eight published favorites warn without blocking.
  * **Codebase State:** Full lifecycle verified end-to-end against the live Studio API (create → card image upload → asset upload with reference rewriting → drawer markup verification → delete → cleanup). Only `Published` specimens appear publicly. The narrow SYSTEM//FORM importer is registered at `scripts/import-systemform-specimens.js`; it preserves the existing sanitizer and schema, writes only exact localized WebP assets, and does not silently repair missing source imagery. The supplied eight-model kit is now applied: 40 official inputs, 1 existing match, 39 additions, 36 Published records, 7 Ready holds, 43 source files, 36 1440×900 card images, and 48 localized WebP page assets. The exact Test 04 `signal_festival_hero_1787607352874.jpg` was supplied and localized; no unexpected holds or duplicate IDs remain. Favorite curation remains an operator content decision; no records are auto-selected. Content validation, standard checks, media health, Studio API validation, and desktop/mobile browser checks pass. No deployment was performed.
  * **Next steps:** The seven planned Ready holds remain blocked on their exact original imagery; supply those originals and rerun the importer when they are available. Select the initial favorite records in Studio when the content decision is made. Existing unrelated specimens remain untouched; do not deploy without explicit approval.

### Psychology-Driven Automated OG Image Generator

* **Status: Completed & Integrated Locally**
  * **Completed:** Created [`scripts/generate-og-images.js`](file:///c:/Users/JP/Desktop/portfol/scripts/generate-og-images.js) supporting CLI batch (`--all`) and single-page (`--page=<key>`) generation using Node.js standard modules and ImageMagick (`magick`). Implemented four psychology-grounded archetypes (`workbench`, `operator-log`, `zone-atlas`, `minimal-punch`) with 3-tier visual hierarchy, pattern interruption, concrete screenshot/terminal/pose anchors, and outlined brand pills. Generated dedicated 1200×630 WebP preview cards for all 17 registered pages in `content/seo.json` and synchronized HTML `<meta>` tags across the site via `scripts/build-seo.js`.
  * **Studio CMS Integration:** Added `POST /api/seo/generate-og` endpoint to `scripts/studio-server.js` and wired up a 1-click `✨ Auto-Generate Card` button and responsive live preview in the Studio SEO Manager workspace (`studio/index.html` & `studio/studio.js`).
  * **Codebase State:** All 17 pages have distinct, high-fidelity WebP OG images in `images/og/`. Zero missing referenced images; validation passes cleanly.
  * **Next steps:** Ready for use in ongoing workflow or additional page rollouts.

### Design Skill Benchmark Case Study & Evidence Archive

* **Status: Completed & Integrated Locally; not deployed**
  * **Completed:** Integrated `/benchmark/` and its 32 record pages into the public site and Operator Log case study (`/operator-log/design-skill-benchmark/`). Added prominent hero CTA, Section 01 callouts, Section 04 review frame callout, and wired every output card in the blog post's interactive table directly to its full evidence record page (`/benchmark/records/<hash>.html`) and live source (`/benchmark/source/<hash>.html`).
  * **SEO & Progressive Enhancement Dual-Layer Integration:** Implemented crawlable semantic `<a href="/benchmark/#...">` equation items on the case study with progressive enhancement inline inspector drawer (with stats for the 3 design systems, 11 prompt scenarios, 6 models, 32 outputs, and 64 review frames). On `/benchmark/`, added structured static indexable sections for `#skills`, `#prompts`, `#models`, `#records`, and `#methodology` with quick-jump navigation chips, plus expanded the Data Viewer with full *Prompts* and *Methodology* tabs and URL parameter support.
  * **SEO & Meta:** Added canonical URLs, Open Graph tags (with desktop review frames per record), Twitter cards, Google Analytics (`analytics.js`), favicons, and schema.org JSON-LD structured data (`Dataset` + `CollectionPage` on archive root, `TechArticle` on all 32 records). Added breadcrumb navigation trails and Lemonteed header/footer nav to `benchmark/index.html` and all records. Registered `benchmark` in `content/seo.json` and `scripts/build-seo.js`.
  * **Discoverability & Sitemaps:** Added Design Benchmark to the **Workbench** section of the global sidebar across `studio-lab/`, `archive/`, `vrg-cards/`, `what-if/`, `misc-gens/`, `memetic-warfare/`, `junk-drawer/`, `lighthouse-handoff/`, and `lemonteed-fm/`. Added direct archive CTA in Studio Lab featured entry `#005` and register item `REG-008`, updated Operator's Log entry card, and added Lemmy destination/message support. Extended `scripts/build-artifact-pages.js` to automatically index `/benchmark/`, all 32 record URLs in `sitemap.xml` (118 total generated URLs), and all 64 desktop/mobile review frames in `image-sitemap.xml`.
  * **Codebase State:** The evaluator remains local in the separate `website-design-skills` workspace. Lemonteed contains a fully integrated, accessible static evidence snapshot and benchmark archive. All standard validation and checks pass with zero missing referenced images.
  * **Next steps:** Compare Baseline 001 against owner grades when available; do not deploy without explicit approval.

### Operator Log: Localhost Watchdog Update 02

* **Status: Completed locally; not deployed**
  * **Completed:** Added `/operator-log/localhost-watchdog-update-02/` using the existing static Operator Log article layout, linked it to the Localhost Watchdog introduction, added the two supplied screenshots with intrinsic dimensions, captions, and descriptive alt text, updated archive metadata and bidirectional entry navigation, and refreshed sitemap/image-sitemap generation so future artifact builds retain the article route and images.
  * **Codebase State:** The article preserves the approved Update 02 wording and limitations: guarded lifecycle management, evidence and revalidation, no force kill or `taskkill`, direct Node/Python support first, unresolved npm/pnpm/yarn wrappers, and outstanding real-project and manual tray acceptance testing. No RSS/Atom feed or separate public article registry exists in this static site.
  * **Next steps:** None for the requested local implementation. Do not deploy without explicit approval.

### Lemmy Two-Layer Integration

* **Status: Slices 1–5 completed**
  * **Completed:** Added the validated `content/lemmy.json` source of truth, `scripts/build-lemmy.js`, generated `assets/js/lemmy-data.js`, reusable public Lemmy behavior/styles, homepage integration with cards left and Lemmy right, and shared Lemmy triggers for `/what-if/`, `/vrg-cards/`, `/junk-drawer/`, `/lemonteed-fm/`, `/memetic-warfare/`, and `/studio-lab/`. Added three authored page events for artifact opens, track starts, and game starts, plus the Studio health collector, Lemmy workspace, and allowlisted action dispatcher.
  * **Art direction:** Integrated 11 transparent 220px WebP pose assets derived from the supplied Codex Pet library under `images/lemmy/poses/`; state changes use these approved assets rather than inventing a second visual language.
  * **Codebase State:** Public Lemmy is deterministic, browser-only, authored-data driven, safe-link only, keyboard accessible, locally preference-aware, cooldown-aware, and inactive on pages without enabled zone config. Studio Lemmy reports bounded structured health and accepts only named, authorized actions; mutating actions retain confirmation and existing backup semantics.
  * **Validation:** Public Lemmy checks, Lemmy build/syntax checks, content validation, standard `scripts/check.js`, Studio health/action endpoint checks, same-origin/token rejection checks, homepage layout verification at 1440×900, 390×844, and 360×800, keyboard/focus checks, six public-zone checks, and Studio browser validation all passed. Existing site audit findings remain unchanged: 78 medium empty-alt findings, one low SEO finding, zero missing referenced images, and 100 unused gallery files.
  * **Next steps:** None for the documented two-layer feature.

### Phased Hardening of Million Dollar Receipt (MDR)

* **Status: Archived (public launch on hold)**
  * Backend phases 1–3 remain in the repo for local/studio use, but public launch is paused while a better launch shape is planned. `content/million-dollar-receipt.json` still has `"launched": false` and empty `apiBase`.
* **Phase 1: Local SQLite Server & Warnings (Completed)**
  * **Completed:** Integrated native `node:sqlite` in `mdr-api/store.js` to store receipts. Added a simulated checkout warning banner and dynamically overridden checkout submit buttons in `assets/js/mdr.js` when running locally or in mock mode.
* **Phase 2: Cloudflare Workers & D1 Integration (Completed)**
  * **Completed:** Implemented the Cloudflare Workers + D1 version of the MDR API backend as a secondary deployable option, refactoring `mdr-api/handlers.js` to use asynchronous global Web Crypto `crypto.subtle` operations. Created `mdr-api/store-d1.js` for async D1 bindings, updated `mdr-api/worker.js` with lazy-seeding, and configured `mdr-api/wrangler.toml` with `nodejs_compat`.
  * **Codebase State:** Fully refactored asynchronous API backend supporting both local Node.js + SQLite (`server.js`) and Cloudflare Workers + D1 (`worker.js`). Local testing verified successfully.
* **Phase 3: Feature Completeness & Moderation (Completed)**
  * **Completed:**
    * **Piet Mode Schedule Cycling:** Replaced manual toggle with visitor-local time checks (11 PM - 5 AM) and automated segment cycling. Provided debug hours query parameters support (`?debug=1&piet_hour=H`) to mock time zones and verify highlights.
    * **Mutation Desk CRUD:** Implemented POST, PATCH, DELETE schedule routes, and list/read/write/delete fragment endpoints in `studio-server.js`. Designed a premium tabbed interface in `mutation-desk.html` allowing visual management of scheduled phases and direct JSON fragment editing.
    * **MDR Moderation Desk:** Added message moderation status support in SQLite (`store.js`) and D1 (`store-d1.js`) stores. Wired moderation list and status toggle endpoints in `handlers.js`. Built a premium moderation panel in `studio/mdr-moderation.html` to approve/reject messages with real-time feedback.
  * **Codebase State:** End-to-end integration verified successfully. All configurations compile cleanly. Public launch archived pending a better idea.

### Studio Lab + Junk Drawer Refresh (Completed)

* **Completed:**
  * **Website Roast archived:** Live Experiment `currentBet` and get-involved links no longer point to missing `/website-roast/`.
  * **Junk Drawer redesign:** Lighthouse Handoff is the premier featured tool. Drawer-style hero, compartment cards, dead `+ INFO` button removed. Added FreeSource (`/free-source/`) as Slot D card in the drawer.
  * **Character Supply added:** Added `/junk-drawer/character-supply/` as a Junk Drawer utility page for HTML special characters, entities, code points, and CSS escapes.
  * **Studio Lab page:** Public `/studio-lab/` hub now leads with the latest Operator Log entries, including Update 02, followed by a compact shipped/archived/planned project register. The log feed uses the Operator Log's dark treatment for contrast. Homepage world-map zone routes here instead of `/operator-log/`, making the build notes discoverable through the public workbench.
  * **Shared workbench navigation:** Public sidebar variants expose crawlable `Studio Lab` and `Operator's Log` links, with custom Lemonteed FM rail and mobile links covered separately. Studio Lab is marked current where appropriate, and Lemonteed FM's rail now aligns with the main hero canvas.
  * **Card border rule:** Removed accent-colored card borders, left stripes, and decorative card border accents across the public CSS variants; neutral hairlines, surface contrast, and typography carry state instead.
  * **Live Experiment archived:** Matches MDR treatment — `noindex`, `robots.txt` disallow, removed from sitemap and public navigation. Studio Lab lists it as archived.
  * **Sitemap:** Added `/studio-lab/`, junk-drawer routes, `/lighthouse-handoff/`, and `/free-source/`.
  * **Junk Drawer Card Visuals:** Replaced CSS/span-based visual card placeholders in `/junk-drawer/` with correlating WebP screenshot/interface images from `/images/junk/` and added responsive CSS styles in `assets/css/junk-drawer.css` to frame the thumbnails.
* **Next steps:**
  * **Bench Radio (later):** Clickable radio on Studio Lab that streams Lemonteed FM while browsing projects.

### External Junk Drawer Tools (Completed)

* **Completed:** Added the `content/junk-drawer.json` source of truth, public-card builder, and local Studio/API wiring for external tools with name, description, URL, WebP image uploads, and affiliate disclosure.
* **Codebase state:** Existing External Finds content is represented in the new source file. Studio save operations rebuild `junk-drawer/index.html`; invalid API payloads are rejected, full checks pass, and browser verification found no console errors.
* **Next steps:** Add external tools through Studio as needed.

### Studio SEO Manager (Completed)

* **Completed:**
  * **`content/seo.json`:** New source-of-truth file holding title, description, OG, and Twitter metadata for all 16 registered public static pages. Bootstrapped by scraping current values from the live HTML files.
  * **`scripts/build-seo.js`:** Build script that reads `content/seo.json` and patches `<title>`, `<meta name="description">`, all `og:*` tags, `twitter:*` tags, and `<link rel="canonical">` in each page's HTML file in place. Backs up files before writing. Supports `--dry-run`. Can be imported as a module by the Studio server.
  * **SEO Manager workspace in Studio:** New "SEO Manager" tab in the Studio nav. Page selector sidebar lists all 16 registered pages. Edit form includes: title tag (60-char counter), meta description (160-char counter), canonical URL, OG title, OG description, OG image path with live preview at 1200×630 aspect ratio, OG image upload (converts to WebP, crop-fits to 1200×630, stores in `images/og/`), OG width/height, Twitter title/description/image. Character counters turn yellow at 85% of limit and red when over. Save button writes `content/seo.json` and triggers `build-seo.js` to patch HTML immediately.
  * **API routes added to `studio-server.js`:** `GET /api/seo`, `PATCH /api/seo`, `POST /api/seo/og-image`.
* **Codebase State:** Fully implemented and validated. `content-validation.js` passes. `build-seo.js --dry-run` correctly identifies pages needing patching without touching files.
* **Next steps:** None. The SEO manager is a complete, standalone tool.

### Artifact Record System (Completed)

* **Completed:**
  * **`templates/artifact-page.html`:** HTML template for individual artifact pages with breadcrumbs, full-res responsive image, artifact record panel (category, series, date, description, origin, danger level, tags, tools), related artifact `<a>` links, prev/next/random navigation, and JSON-LD `CreativeWork` structured data.
  * **`scripts/build-artifact-pages.js`:** Build script that reads `content/projects.json` and generates `artifacts/<slug>/index.html` for every published artifact. Also updates `sitemap.xml` with artifact entries and generates `image-sitemap.xml` with image metadata. Supports `--dry-run` and `--clean` flags.
  * **Live Experiment archived:** Matches MDR treatment — `noindex`, `robots.txt` disallow, removed from sitemap and public navigation. Studio Lab lists it as archived.
  * **Sitemap:** Added `/studio-lab/`, junk-drawer routes, `/lighthouse-handoff/`, and `/free-source/`.
  * **Junk Drawer Card Visuals:** Replaced CSS/span-based visual card placeholders in `/junk-drawer/` with correlating WebP screenshot/interface images from `/images/junk/` and added responsive CSS styles in `assets/css/junk-drawer.css` to frame the thumbnails.
* **Next steps:**
  * **Bench Radio (later):** Clickable radio on Studio Lab that streams Lemonteed FM while browsing projects.

### External Junk Drawer Tools (Completed)

* **Completed:** Added the `content/junk-drawer.json` source of truth, public-card builder, and local Studio/API wiring for external tools with name, description, URL, WebP image uploads, and affiliate disclosure.
* **Codebase state:** Existing External Finds content is represented in the new source file. Studio save operations rebuild `junk-drawer/index.html`; invalid API payloads are rejected, full checks pass, and browser verification found no console errors.
* **Next steps:** Add external tools through Studio as needed.

### Studio SEO Manager (Completed)

* **Completed:**
  * **`content/seo.json`:** New source-of-truth file holding title, description, OG, and Twitter metadata for all 16 registered public static pages. Bootstrapped by scraping current values from the live HTML files.
  * **`scripts/build-seo.js`:** Build script that reads `content/seo.json` and patches `<title>`, `<meta name="description">`, all `og:*` tags, `twitter:*` tags, and `<link rel="canonical">` in each page's HTML file in place. Backs up files before writing. Supports `--dry-run`. Can be imported as a module by the Studio server.
  * **SEO Manager workspace in Studio:** New "SEO Manager" tab in the Studio nav. Page selector sidebar lists all 16 registered pages. Edit form includes: title tag (60-char counter), meta description (160-char counter), canonical URL, OG title, OG description, OG image path with live preview at 1200×630 aspect ratio, OG image upload (converts to WebP, crop-fits to 1200×630, stores in `images/og/`), OG width/height, Twitter title/description/image. Character counters turn yellow at 85% of limit and red when over. Save button writes `content/seo.json` and triggers `build-seo.js` to patch HTML immediately.
  * **API routes added to `studio-server.js`:** `GET /api/seo`, `PATCH /api/seo`, `POST /api/seo/og-image`.
* **Codebase State:** Fully implemented and validated. `content-validation.js` passes. `build-seo.js --dry-run` correctly identifies pages needing patching without touching files.
* **Next steps:** None. The SEO manager is a complete, standalone tool.

### Artifact Record System (Completed)

* **Completed:**
  * **`templates/artifact-page.html`:** HTML template for individual artifact pages with breadcrumbs, full-res responsive image, artifact record panel (category, series, date, description, origin, danger level, tags, tools), related artifact `<a>` links, prev/next/random navigation, and JSON-LD `CreativeWork` structured data.
  * **`scripts/build-artifact-pages.js`:** Build script that reads `content/projects.json` and generates `artifacts/<slug>/index.html` for every published artifact. Also updates `sitemap.xml` with artifact entries and generates `image-sitemap.xml` with image metadata. Supports `--dry-run` and `--clean` flags.
  * **`assets/css/artifact-page.css`:** Standalone CSS for artifact pages matching the existing design system (Courier New monospace, #f4f2ea panel, #d7d3c8 dividers, #11100d dark buttons).
  * **Gallery card links:** `build-gallery.js` now injects `href: "/artifacts/<slug>/"` for all artifacts with a slug. Gallery cards render as `<a>` tags instead of `<button>` elements, making them crawlable.
  * **Related items as links:** Lightbox related-item buttons changed from `<button>` to `<a>` elements with real hrefs, with `preventDefault` for in-lightbox navigation.
  * **Sitemap:** Expanded from 23 to 103 URLs (23 original pages + 80 artifact pages). Added `/free-source/`.
  * **Image sitemap:** New `image-sitemap.xml` with image location, caption, and title for all 80 artifacts. Referenced from `robots.txt`.
  * **SEO registry:** Added `free-source` to `content/seo.json`.
  * **Audit inventory:** `site-completion-audit.js` now dynamically reads artifact pages from `content/projects.json` and operator-log post directories instead of relying on a hardcoded list. Added `free-source/index.html`.
* **Codebase State:** All 80 artifact pages generated. `content-validation.js` passes. `media-health.js` reports 0 missing referenced images. Gallery data rebuilt with hrefs. Sitemap and image sitemap valid.
* **Next steps:** None. To regenerate after adding/editing artifacts, run `node scripts/build-artifact-pages.js`.

### Lemonteed Brand System Integration

* **Status: Active / Incremental Rollout**
* **Completed:**
  * **Brand Document Integration:** Linked [`lemonteed-brand-system.md`](file:///c:/Users/JP/Desktop/portfol/lemonteed-brand-system.md) into [`AGENTS.md`](file:///c:/Users/JP/Desktop/portfol/AGENTS.md) and added non-negotiable brand rules into [`AGENT_RULES.md`](file:///c:/Users/JP/Desktop/portfol/AGENT_RULES.md).
  * **Brand Audit Artifact:** Created comprehensive site audit report [`brand_audit_report.md`](file:///C:/Users/JP/.gemini/antigravity-ide/brain/3d14842d-4144-4bfa-b3f7-ca5bb3832ecc/brand_audit_report.md) detailing evidence of pages and components diverging from brand standards.
  * **Standardized CSS:** Added `.page-header`, `.page-header__meta`, `.page-header__eyebrow`, `.page-header__title`, `.page-header__lede`, and `.lmtd-pill` / `.pill` outlined rectangle styles to `assets/css/style.css`.
  * **What If Zone:** Updated [`what-if/index.html`](file:///c:/Users/JP/Desktop/portfol/what-if/index.html) with standardized page header and `[ ZONE 01 / WHAT IF WOODS ]` mono eyebrow label.
  * **VRG Cards Zone:** Updated [`vrg-cards/index.html`](file:///c:/Users/JP/Desktop/portfol/vrg-cards/index.html) grid view and vault terminal header with `[ ZONE 05 / VRG VAULT ]` mono eyebrow labels; fixed dark theme background leakage on sidebar category links.
  * **Junk Drawer District:** Updated [`junk-drawer/index.html`](file:///c:/Users/JP/Desktop/portfol/junk-drawer/index.html) with `[ DISTRICT 04 / JUNK DRAWER ]` mono eyebrow label, normalized `[ TOP OF THE PILE ]` and label decoder dt pills to outlined mono rectangle format, and fixed `lemmy.js` trigger null safety.
  * **Operator's Log:** Updated [`operator-log/index.html`](file:///c:/Users/JP/Desktop/portfol/operator-log/index.html) with the rich build entry layout and styling from Studio Lab (Featured #005 with Benchmark metrics, #004 with terminal mockup, #003 with Lighthouse handoff report, #002 Locailly, and #001 Watchdog), integrated into the global `.site-shell` with a dedicated dark-themed sidebar matching the page's color palette and active yellow indicators, and added mobile header/drawer support.
* **Codebase State:** What If, VRG Cards, Junk Drawer, Lighthouse Handoff, and Operator's Log pages are updated and visually verified. Standard checks pass with zero missing referenced images.
* **Next steps:** Incrementally migrate remaining zones (FreeSource, Memetic Warfare, FM Tower) as scheduled for work.
