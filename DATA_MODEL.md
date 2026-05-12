# Data Model

The canonical content data lives in:

- `content/projects.json`
- `content/categories.json`

Generated browser data lives in:

- `assets/js/gallery-data.js`
- `assets/js/gallery-categories.js`

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
| `visible` | boolean | Whether the item can be emitted to public gallery data. |
| `status` | string | Studio workflow state. Current values are `Draft`, `Ready`, and `Published`. |
| `createdAt` | string | ISO creation timestamp. |
| `updatedAt` | string | ISO update timestamp. |

## Status Rules

The current Studio server accepts:

- `Draft`
- `Ready`
- `Published`

`Ready` and `Published` require image and thumbnail data.

`scripts/build-gallery.js` currently emits only visible projects whose effective status is `Published`.

Future roadmap discussions may introduce `hidden`, `archived`, or `deleted` states, but those are not the current implemented Studio statuses.

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
