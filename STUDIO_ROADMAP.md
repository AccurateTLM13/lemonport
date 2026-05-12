# Studio Roadmap

Lemonteed Studio should grow from a simple local CMS into a local creative archive manager that outputs a static site.

The public output should remain static. The local tooling can become more powerful without changing the deployment model.

## Phase 1: Stabilize The Engine

- Add and maintain root architecture docs.
- Add validation before rebuild.
- Add generated-file warnings.
- Add clearer error messages.
- Add backup-before-save and backup-before-rebuild behavior.
- Validate related item references.
- Validate category references.
- Validate Memetic Warfare `artifactId` references.
- Detect duplicate IDs and duplicate slugs.

## Phase 2: Improve Content Management

- Formalize workflow states beyond the current `Draft`, `Ready`, and `Published` model.
- Consider future states such as `hidden`, `archived`, and soft-deleted records.
- Add a stronger metadata editor.
- Add a right-side edit drawer for fast list editing.
- Add list views by category, status, featured state, and missing metadata.
- Improve bulk import/export.
- Add bulk edit for category, tags, visibility/status, featured state, related items, and game eligibility.
- Add slug-change warnings.

## Phase 3: Improve Media Management

- Show original image and generated WebP variants.
- Show image file sizes and dimensions.
- Warn about missing variants.
- Add a regenerate-variants button per artifact.
- Add replace-image behavior that preserves artifact ID.
- Detect unused image files.
- Detect orphaned generated variants.
- Add an image health report.
- Add selected-asset compression/regeneration workflows.

## Phase 4: Build Curation Tools

- Add a related item editor.
- Auto-suggest related items by category, tags, series, and visual universe.
- Add tags manager.
- Add series manager.
- Add featured artifact controls.
- Add random artifact weighting.
- Add homepage collection controls.
- Add max-related-count warnings.

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
