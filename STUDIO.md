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

- Uploads PNG, JPG, or WebP images.
- Converts uploads into WebP.
- Generates `-640`, `-1024`, and `-1600` responsive variants.
- Writes project records to `content/projects.json`.
- Rebuilds `assets/js/gallery-data.js`.
- Lets you hide/show projects without deleting files.
- Lets you delete a project and its generated image set.

## Requirements

- Node.js
- ImageMagick available as `magick`

This is meant as a local/private studio, not a public production admin panel.
