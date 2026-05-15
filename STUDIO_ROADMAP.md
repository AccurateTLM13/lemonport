# Studio Roadmap

Lemonteed Studio should grow from a simple local CMS into a local creative archive manager that outputs a static site.

The public output should remain static. The local tooling can become more powerful without changing the deployment model.

## Phase 1: Stabilize The Engine

Implemented foundation:

- Add and maintain root architecture docs.
- Add validation before rebuild.
- Add generated-file warnings.
- Add backup-before-save and backup-before-rebuild behavior.
- Validate related item references.
- Validate category references.
- Detect duplicate IDs and duplicate slugs.
- Validate published image and thumbnail file existence.
- Validate variant records and referenced variant files.
- Warn when published projects are missing expected responsive variant widths.
- Add readable Studio validation output and a Validate Archive toolbar action.
- Add media health reporting for missing referenced images and unused gallery files.
- Clean deleted project IDs out of remaining related-item references.

Remaining:

- Validate Memetic Warfare `artifactId` references when the game module gets its dedicated pass.
- Add explicit reviewed cleanup action for unused image files.

## Phase 2: Improve Content Management

Complete:

- Add text search across titles, IDs, slugs, categories, descriptions, tags, tools, related IDs, and origin text.
- Add Studio filters for visibility, status, category, and missing media.
- Add Studio filters for featured state and missing metadata.
- Show filtered archive counts.
- Add list grouping by category, status, featured state, and metadata completeness.
- Add selected-record bulk editing for status, category, visibility, featured state, appended tags, and appended tools.
- Add selected-record bulk editing for series and related-item additions/removals.
- Add selected-record JSON export.
- Add slug editing with duplicate protection and slug-change confirmation.
- Add a related-item picker in the edit drawer.
- Formalize workflow states as `Draft`, `Ready`, `Published`, `Hidden`, `Archived`, and `Deleted`.
- Keep the right-side edit drawer as the fast metadata editor and add a metadata summary.
- Improve exports with schema version and category metadata.

Deferred to later phases:

- Image regeneration belongs to Phase 3 media management.
- Game eligibility belongs to Phase 5 experience modules.
- Stronger slug migration tooling is only needed if slugs become public URL components.

## Phase 3: Improve Media Management

Complete:

- Show original image and generated WebP variants.
- Show image file sizes and dimensions.
- Warn about missing variants through validation.
- Add a regenerate-variants button per artifact.
- Add selected-project variant regeneration.
- Add replace-image behavior that preserves artifact ID and slug.
- Detect unused image files.
- Detect missing referenced images.
- Add a media health report.
- Add reviewed unused-file cleanup with backups.

Deferred to later phases:

- Advanced compression controls can be added if the archive needs quality presets.
- Game-specific media rules belong to Phase 5 experience modules.

## Phase 4: Build Curation Tools

Complete:

- Add a related item editor.
- Auto-suggest related items by category, tags, and series.
- Add tags manager filtering.
- Add series manager filtering.
- Add featured artifact controls.
- Add random artifact weighting.
- Add homepage collection controls.
- Add featured rank controls.

Deferred to later phases:

- Visual-universe-specific related suggestions can be added when a dedicated field exists.
- Public homepage collection rendering can be expanded when the public home layout needs a curated section.
- Max-related-count warnings can be tuned after archive curation patterns settle.

## Phase 5: Add Experience-Specific Modules

- Add a Memetic Warfare manager.
- Add loadout weapon stat editor.
- Add local high-score viewer.
- Add share-card generator.
- Add category-specific layout controls.
- Add experience-specific validation panels.

## Line Not To Cross Yet

Do not turn Studio into a public hosted CMS without an explicit architecture decision.

A public Studio would require authentication, authorization, upload security, input sanitization, rate limiting, server hardening, backups, and likely a database. That is a separate product and threat model.

The intended architecture remains:

```text
Local Studio
    |
content/projects.json + content/categories.json
    |
validation
    |
image processing
    |
scripts/build-gallery.js
    |
static public site
    |
deploy
```
