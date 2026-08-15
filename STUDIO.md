# Lemonteed Studio

This repo stays a static HTML/CSS/JS site, but `scripts/studio-server.js` adds a local editing layer for uploads and project management.

## Start

```powershell
cd C:\Users\JP\Desktop\portfol
node scripts/studio-server.js
```

Open:

```text
http://localhost:5173/studio/
```

The same server also serves the public site:

```text
http://localhost:5173/
```

## What It Does

- Uploads one or many PNG, JPG, or WebP images.
- Suggests project titles from filenames before upload.
- Creates one editable queue row per selected image.
- Adds new series/categories from the Studio UI.
- Converts uploads into WebP.
- Generates `-640`, `-1024`, and `-1600` responsive variants.
- Writes project records to `content/projects.json`.
- Rebuilds `assets/js/gallery-data.js`.
- Lets you hide/show projects without deleting files.
- Supports workflow states: `Draft`, `Ready`, `Published`, `Hidden`, `Archived`, and `Deleted`.
- Lets you edit gallery metadata for existing projects, including title, category, series, alt text, description, origin, date, tags, danger level, tools used, related IDs, featured state, and image/thumbnail paths.
- Lets you delete a project and its generated image set.
- Writes category records to `content/categories.json`.
- Runs archive validation from the Studio toolbar.
- Shows validation errors and warnings in Studio before changes are allowed to rebuild.
- Runs media health checks from the Studio toolbar, including missing referenced images and unused gallery files.
- Provides a Lemmy workspace with a deterministic, read-only archive health report backed by `GET /api/lemmy/health`.
- Lemmy health reports structured issue codes, project targets, bounded issue output, and links into the existing Library, Media Health, and Build Report workspaces.
- Lemmy exposes only the approved `validate-archive`, `refresh-health`, `rebuild-gallery`, and `regenerate-project-variants` operations through `POST /api/lemmy/actions`.
- Deletes reviewed unused gallery files from the media health report after writing backups.
- Filters the archive by visibility, status, category, missing media, and text search.
- Filters the archive by featured state and missing metadata.
- Groups list view by category, status, featured state, or metadata completeness.
- Bulk edits selected projects for status, category, visibility, featured state, added tags, and added tools.
- Bulk edits selected projects for series and related-item additions/removals.
- Exports selected projects as a focused JSON file.
- Exports include a schema version and category metadata.
- Edits slugs deliberately with duplicate-slug protection and a confirmation prompt before slug changes are saved.
- Adds related items from the edit drawer with a project picker.
- Suggests related items by shared category, series, and tags.
- Manages curation fields for homepage collection, featured rank, and random artifact weighting.
- Provides tag and series manager chips for fast archive filtering.
- Shows per-project media inventory with file paths, file sizes, and dimensions.
- Regenerates responsive variants for one project or selected projects.
- Replaces a project image while preserving the artifact ID and slug.
- Edits the Live Experiment Cloud Flip dossier from `content/live-experiment.json` and rebuilds `assets/js/live-experiment-data.js`.
- Edits Lemonteed FM playlist tracks and manages audio/artwork uploads from the Studio UI.
- Queries operator log schedules and triggers mutation promotions from the Studio backend.
- Edits meta titles, descriptions, Open Graph data, and OG images for every registered public static page from the SEO Manager workspace.
- Generates themed, psychology-driven 1200×630 WebP OG cards automatically with 1-click `✨ Auto-Generate Card` or uploads custom images directly into `images/og/`.
- Saves SEO data to `content/seo.json` and patches the HTML files in place through `scripts/build-seo.js`.
- Manages external Junk Drawer tools in `content/junk-drawer.json`, including name, description, URL, WebP preview image uploads, and affiliate disclosure, then rebuilds `junk-drawer/index.html`.

## Requirements

- Node.js
- ImageMagick available as `magick`

This is meant as a local/private studio, not a public production admin panel.

## Lemmy Health

`GET /api/lemmy/health` combines canonical project/category loading with `validateContent()`, `mediaHealth()`, and responsive-width inspection. It never writes files and accepts an optional bounded `limit` query parameter from 1 to 100. Its deterministic issue codes and summary are intended for the Studio Lemmy workspace, not a public API.

## Lemmy Actions

`POST /api/lemmy/actions` is a local/private, allowlisted dispatcher. It accepts exact operation and argument keys, validates project IDs against canonical project data, and continues through the existing same-origin and optional `STUDIO_WRITE_TOKEN` authorization boundary.

`validate-archive` and `refresh-health` are read-only. `rebuild-gallery` and `regenerate-project-variants` preserve the existing backup/rebuild helpers and require confirmation in the Studio UI. `open-record` is client-only navigation and is never sent to the server. Arbitrary paths, commands, URLs, bulk rewrites, and deletion are not accepted by this route.
