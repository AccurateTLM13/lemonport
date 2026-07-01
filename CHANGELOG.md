# Changelog

Major architecture, content, tooling, and experience changes should be recorded here so future agents can understand the project history quickly.

This file is also the working source for a future public development-history page. Keep entries factual, dated, and written as a timeline of what changed.

## 2026-07-01

### Junk Drawer Affiliate Section

- Added a Highly Biased Recommendations affiliate section to the Junk Drawer page (`junk-drawer/index.html`).
- Added Memelord with tracking link `https://signup.memelord.com/lemonteed` and deadpan funny copy.
- Styled sponsor cards (`.junk-drawer-card--sponsor`) in `assets/css/style.css` with a dashed golden border, subtle hover animations, and customized partner slots.

## 2026-05-15

### Responsive System And Mobile Chrome

- Added `RESPONSIVE_SYSTEM.md` with breakpoint, layout, component, media, and verification rules.
- Added shared responsive tokens and layout primitives in `assets/css/style.css`.
- Reworked the shared mobile archive header into compact chrome with a logo/menu row, full-width random artifact trigger, active-category control, and mobile navigation sheet.
- Added `assets/js/mobile-header.js` to generate the mobile menu/category sheet from existing sidebar markup.
- Updated the random artifact trigger copy and styling to `SUMMON RANDOM ARTIFACT`, with `/?random=1` support for opening a random artifact after navigating back to the archive.
- Matched the random artifact trigger width to the Junk Drawer sidebar module.
- Moved the Image Converter page into the shared archive sidebar shell while keeping its converter workspace local to the tool.

### Live Experiment Scope Fix

- Moved Live Experiment coming-soon interception from the document body to the page content container so sidebar, category navigation, and global chrome links remain normal navigation.
- Documented the project convention that page-specific behavior requests apply to main page content by default, while header, sidebar, navigation, mobile chrome, and footer are global chrome unless explicitly mentioned.

## 2026-05-12

### Engine Stabilization

- Added reusable content validation in `scripts/content-validation.js`.
- Added validation before gallery rebuilds and Studio content/category saves.
- Added a Studio validation API endpoint at `/api/validation`.
- Added a Validate Archive toolbar action with readable errors and warnings in Studio.
- Added checks for duplicate project IDs/slugs, duplicate category slugs, missing required fields, invalid categories, invalid statuses, missing publishable images, missing published image files, and broken related-project references.
- Added media-health validation for invalid variant records, missing variant files, duplicate variant widths, and missing expected responsive variant widths.
- Added `scripts/media-health.js` and a Studio Media Health action for missing referenced images and unused gallery files.
- Added generated-file warnings to `assets/js/gallery-data.js` and `assets/js/gallery-categories.js`.
- Added timestamped backups before Studio content/category writes, gallery data rebuild writes, and image-variant content writes.
- Added `.studio-backups/` to `.gitignore`.
- Updated Studio delete behavior so removing a project also removes that project ID from other records' `related` arrays.

### Studio Content Management

- Added archive text search in Studio.
- Added Studio filters for visibility, status, category, and missing media.
- Added Studio filters for featured state and missing metadata.
- Added list grouping by category, status, featured state, and metadata completeness.
- Updated the archive count to show filtered totals when filters are active.
- Added selected-record bulk editing for status, category, visibility, featured state, tags, and tools.
- Added selected-record bulk editing for series and related-item additions/removals.
- Added selected-record JSON export.
- Added guarded slug editing with duplicate-slug rejection and Studio confirmation before slug changes.
- Added an edit-drawer related item picker.
- Formalized Studio workflow states as `Draft`, `Ready`, `Published`, `Hidden`, `Archived`, and `Deleted`.
- Added a metadata summary to the right-side edit drawer.
- Updated Studio exports to include schema version and category metadata.
- Marked Phase 2 content management as complete in the Studio roadmap.

### Studio Media Management

- Added per-project media inventory with image paths, file sizes, and dimensions.
- Added single-project responsive variant regeneration.
- Added selected-project responsive variant regeneration.
- Added replace-image workflow that preserves artifact ID and slug.
- Added reviewed unused-media cleanup from the media health report, with backups before deletion.
- Added media cleanup safeguards so Studio only deletes files currently reported as unused.
- Marked Phase 3 media management as complete in the Studio roadmap.

### Studio Curation Tools

- Added optional `curation` metadata with homepage collection, featured rank, and random artifact weight controls.
- Added tag and series manager chips for fast Studio filtering.
- Added related-item suggestions based on shared category, series, and tags.
- Updated public random artifact navigation to respect `curation.randomWeight`.
- Emitted curation metadata into generated gallery data.
- Marked Phase 4 curation tools as complete in the Studio roadmap.

### Gallery Metadata Pass

- Enriched public gallery metadata across the archive so artifact pages have stronger titles, descriptions, alt text, tags, related items, origin details, and display context.
- Rebuilt generated gallery data after content updates so the static public site reflects the canonical records in `content/projects.json`.

### Public Experience Polish

- Bumped static asset cache versions so browsers request the latest CSS and JavaScript after the recent gallery and game updates.
- Fixed Memetic Warfare cache behavior and mobile layout issues after the game was added.

## 2026-05-11

### Content Model And Page Configuration

- Expanded gallery metadata and page configuration for richer archive presentation.
- Added publishing workflow support around `Draft`, `Ready`, and `Published` states.
- Updated the gallery build path so only public, publishable entries are emitted to generated browser data.

### Studio Import And Publishing Workflow

- Added Studio import controls for JSON-based content intake.
- Added merge and replace import modes for project data.
- Added validation around imported entries, including required IDs, titles, and categories.
- Connected Studio save/import workflows to the static gallery rebuild process.

### Memetic Warfare Experience

- Added the Memetic Warfare browser game as a dedicated static experience.
- Added separate Memetic Warfare game data and gameplay code under `assets/js/`.
- Connected game weapons back to gallery artifacts through `artifactId` references.
- Added local score persistence in `localStorage`.
- Added share text and result-state rendering for completed runs.

### Static Engine Documentation

- Added root documentation set for the Lemonteed static engine:
  - `LEMONTEED_ENGINE.md`
  - `AGENT_RULES.md`
  - `DATA_MODEL.md`
  - `STUDIO_ROADMAP.md`
  - `CHANGELOG.md`
- Documented the current static public-site architecture, local Studio role, generated gallery files, content data model, image pipeline, Memetic Warfare split, and Studio roadmap.
- Captured the rule that the public site remains static while local Studio tooling can grow.

### Navigation Fixes

- Fixed gallery category link navigation after category pages and generated category data were introduced.

## 2026-05-10

### Gallery Foundation

- Added the masonry-style public gallery and initial asset catalog.
- Established the plain HTML, CSS, and JavaScript public-site architecture.
- Added browser gallery behavior for rendering artifact cards and browsing visual work.

### Studio-Managed Content Source

- Added Studio-managed project gallery data.
- Established `content/projects.json` as the canonical artifact metadata source.
- Added `scripts/build-gallery.js` to generate browser-ready gallery data from content JSON.
- Added generated public data output under `assets/js/gallery-data.js`.

### Categories And Batch Uploads

- Added category data and category-aware gallery behavior.
- Established `content/categories.json` as the canonical category metadata source.
- Added generated category output under `assets/js/gallery-categories.js`.
- Added batch Studio uploads so multiple image artifacts can be added in one local workflow.
- Added category/series creation from Studio.

### Deployment Pipeline

- Added a Bluehost deployment workflow.
- Updated deploy workflow action versions.
- Adjusted deployment behavior to preserve remote files during deploys.

### Responsive Media Pipeline

- Added responsive gallery image generation.
- Added cache headers for static assets.
- Added generated WebP variants for gallery images.

### Editable Artifact Metadata

- Added editable gallery artifact metadata in Studio.
- Added metadata fields for title, category, series, alt text, description, origin, date, tags, danger level, tools used, related IDs, featured state, visibility, and image paths.
- Added hide/show behavior so records can be removed from the public gallery without deleting files.
- Added project deletion behavior for removing a record and its generated image set.
