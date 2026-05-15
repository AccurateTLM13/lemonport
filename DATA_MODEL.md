# Data Model

The canonical content data lives in:

- `content/projects.json`
- `content/categories.json`

Generated browser data lives in:

- `assets/js/gallery-data.js`
- `assets/js/gallery-categories.js`
- `assets/js/live-experiment-data.js`

Page-specific source data lives in:

- `content/live-experiment.json`

## Projects

`content/projects.json` is an array of artifact records.

Common project fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Permanent internal artifact identity. Should not change casually. |
| `title` | string | Display title. |
| `slug` | string | Public/file-friendly identity. Changing it can affect paths and links. |
| `category` | string | Category slug from `content/categories.json`. |
| `categoryLabel` | string | Human-readable category label. |
| `series` | string | Optional grouping within or across categories. |
| `year` | string | Optional year label. |
| `description` | string | Artifact description shown in the UI. |
| `origin` | string | Optional origin or source context. |
| `dateCreated` | string | Artifact creation date, usually `YYYY-MM-DD`. |
| `tags` | string[] | Search, grouping, and curation tags. |
| `dangerLevel` | string | Flavor/status metadata used by artifact details. |
| `toolsUsed` | string[] | Tools used to create the artifact. |
| `related` | string[] | Related project IDs. |
| `image` | string | Main public image URL. |
| `thumbnail` | string | Thumbnail public image URL. |
| `alt` | string | Required accessible image alt text. |
| `width` | number | Intrinsic image width. |
| `height` | number | Intrinsic image height. |
| `sizes` | object | Legacy/main image URL grouping. |
| `variants` | object[] | Responsive image candidates. |
| `featured` | boolean | Whether the item is featured. |
| `curation` | object | Optional curation controls for homepage placement, featured ordering, and random weighting. |
| `visible` | boolean | Whether the item can be emitted to public gallery data. |
| `status` | string | Studio workflow state. Current values are `Draft`, `Ready`, `Published`, `Hidden`, `Archived`, and `Deleted`. |
| `createdAt` | string | ISO creation timestamp. |
| `updatedAt` | string | ISO update timestamp. |

## Status Rules

The current Studio server accepts:

- `Draft`
- `Ready`
- `Published`
- `Hidden`
- `Archived`
- `Deleted`

`Ready` and `Published` require image and thumbnail data.

`scripts/build-gallery.js` currently emits only visible projects whose effective status is `Published`.

Studio normalizes edited slugs and rejects duplicate slugs. Slug changes require confirmation in the local UI.

`Hidden`, `Archived`, and `Deleted` records remain in `content/projects.json` but are not emitted to the public gallery unless explicitly moved back to `Published` and made visible.

## Image Fields

The preferred image shape is:

```json
{
  "image": "/images/category/example.webp",
  "thumbnail": "/images/category/example-768.webp",
  "sizes": {
    "small": "/images/category/example.webp",
    "medium": "/images/category/example.webp",
    "large": "/images/category/example.webp"
  },
  "variants": [
    {
      "width": 320,
      "url": "/images/category/example-320.webp"
    },
    {
      "width": 1600,
      "url": "/images/category/example.webp"
    }
  ]
}
```

Variant records should be sorted from smallest width to largest width when possible.

Validation checks published entries for missing image files, missing thumbnail files, invalid variant records, missing variant files, duplicate variant widths, and expected responsive widths.

Studio media management can regenerate variants, replace the source image while preserving the artifact ID and slug, report file sizes/dimensions, and clean up reviewed unused gallery files after backing them up.

## Curation Fields

Optional project curation metadata:

```json
{
  "curation": {
    "homepage": true,
    "featuredRank": 10,
    "randomWeight": 2
  }
}
```

`homepage` marks an item for local homepage collection controls. `featuredRank` is a non-negative sort hint. `randomWeight` is a non-negative number used by public random artifact navigation; `0` removes an item from weighted random selection while keeping it visible in the gallery.

## Categories

`content/categories.json` is an array of category records.

| Field | Type | Purpose |
| --- | --- | --- |
| `slug` | string | Stable category identifier. |
| `label` | string | Display label. |
| `prefix` | string | Project ID prefix used by Studio. |
| `path` | string | Public category page path. |
| `visible` | boolean | Whether the category appears in generated public category data. |
| `createdAt` | string | Optional ISO creation timestamp. |

Current category slugs:

- `vrg-cards`
- `what-if`
- `misc-gens`
- `memetic-warfare`

## Generated Gallery Shape

`scripts/build-gallery.js` maps each public project into a browser object with:

- `id`
- `title`
- `category`
- `categorySlug`
- `categoryLabel`
- `series`
- `image`
- `thumbnail`
- `alt`
- `description`
- `origin`
- `dateCreated`
- `tags`
- `dangerLevel`
- `toolsUsed`
- `related`
- `featured`
- `width`
- `height`
- `sizes`
- `variants`

It also exposes gallery helper functions on `window`.

## Memetic Warfare Game Data

The Memetic Warfare game currently uses `assets/js/memetic-game-data.js`.

Weapon records include `artifactId`, which should match a project ID in `content/projects.json`.

If Memetic Warfare metadata is later moved into `content/projects.json`, keep it contained under a dedicated nested field such as:

```json
{
  "game": {
    "enabled": true,
    "weaponClass": "chaos",
    "rarity": "legendary",
    "attack": 87,
    "defense": 42,
    "speed": 68,
    "absurdity": 99,
    "specialMove": "Comment Section Collapse"
  }
}
```

## Live Experiment Data

`content/live-experiment.json` is the canonical source for the `$100 Cloud Flip` page. It is edited in Studio from the `Live Experiment` workspace.

Run this to rebuild the public browser data after direct JSON edits:

```powershell
node scripts\build-live-experiment.js
```

The generated file is:

- `assets/js/live-experiment-data.js`

Do not edit the generated file directly.
