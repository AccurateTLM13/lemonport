# Lemonteed Studio

This repo stays a static HTML/CSS/JS site, but `scripts/studio-server.js` adds a local editing layer for uploads and project management.

## Start

```powershell
cd C:\Users\JP\Desktop\portfol
node scripts\studio-server.js
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

## Requirements

- Node.js
- ImageMagick available as `magick`

This is meant as a local/private studio, not a public production admin panel.
