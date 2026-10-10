# Lemmy's Rankings — Episode 001 site package (STEPS 1–4 APPLIED LOCALLY)

Drop-in package for **lemonteed.com/rankings/** (the "Lemmy's Rankings" series)
and **lemonteed.com/rankings/house-shoe-matrix/** (Episode 001: the House Shoe
Matrix). Everything below is resolved.

**Repo state:** Steps 1–4 are applied in the working tree (verified by
`node scripts/content-validation.js`, `node scripts/check.js`, and
`node scripts/site-completion-audit.js`). Step 5 (commit + push) has NOT been
started and is waiting on owner approval.

## Local application notes (differences from the original package)

- **All five PNGs were converted to WebP** (`magick <in>.png -quality 85
  -define webp:method=6 <out>.webp`) to satisfy the repo's mandatory WebP
  standard, and every reference (HTML, wiring, sitemaps, this file) was
  rewritten. The repo previously contained zero non-favicon PNG/JPG files.
- `og:image:type` is now `image/webp` on both pages, matching every other page
  in the repo.
- **A stylesheet was added** (`assets/css/rankings.css`) — the package shipped
  none. `.rankings-mascot` also caps the article mascot at 220px because
  `operator.css` forces `.op-figure img` to 100% width.
- **A small JS file was added** (`assets/js/rankings.js`) to dispatch the
  `lemonteed:episode-opened` Lemmy reaction.
- **Sidebars wired in 12 files**, matching the 12 listed in
  `wiring/sidebar-card.html`. `live-experiment/` was skipped (archived,
  `noindex`, disallowed in `robots.txt`).
- **Homepage drawer button** also needed a matching `mapZones` entry in
  `assets/js/world-map.js` for the mobile dock/drawer.
- **SEO registry:** `node scripts/build-seo.js` patches HTML but does *not*
  write `content/seo.json`; merge it with
  `node -e "const {loadSeo,saveSeoFile}=require('./scripts/build-seo.js');saveSeoFile(loadSeo())"`.
- **Tooling fix:** `scripts/build-seo.js` treated `'` as an attribute delimiter, so
  any meta value containing an apostrophe was truncated and re-appended as a
  duplicate tag. Only `"` now closes a value. See the `build-seo.js` entry in
  `AGENTS.md`.
- Both new pages were added to the page list in `scripts/site-completion-audit.js`.

## Step 1 — Copy files into the repo

Repo root is `C:\Users\JP\Desktop\portfol\`. Copy each package path to the same
repo-relative destination:

| Package path | Repo destination |
|---|---|
| `rankings/index.html` | `rankings/index.html` (new zone index) |
| `rankings/house-shoe-matrix/index.html` | `rankings/house-shoe-matrix/index.html` (new article) |
| `images/rankings/ep001/house-shoe-matrix.webp` | `images/rankings/ep001/house-shoe-matrix.webp` |
| `images/rankings/ep001/og-house-shoe-matrix.webp` | `images/rankings/ep001/og-house-shoe-matrix.webp` (1200×630 social card) |
| `images/rankings/ep001/pin-hero-matrix.webp` | `images/rankings/ep001/pin-hero-matrix.webp` |
| `images/rankings/ep001/pin-warmest-5.webp` | `images/rankings/ep001/pin-warmest-5.webp` |
| `images/rankings/ep001/pin-frugal-cozy.webp` | `images/rankings/ep001/pin-frugal-cozy.webp` |
| `images/home/icons/rankings-row.webp` | `images/home/icons/rankings-row.webp` (128×128 zone icon) |

Referenced Lemmy poses (`/images/lemmy/poses/thinking.webp`, `point.webp`,
`celebrate.webp`, `wave.webp`) already exist in the repo — verified present.

## Step 2 — Wire the zone in (snippets in `wiring/`, copy-paste ready)

1. **Sidebars** (`wiring/sidebar-card.html`): add the Rankings nav card after the
   Lemoteed FM card in every zone sidebar that has one.
2. **Homepage drawer** (`wiring/homepage-drawer.html`): add the RANKINGS ROW zone
   button between the STUDIO LAB button and the coming-soon button in `index.html`.
3. **SEO registry** (`wiring/build-seo-entries.js`): add the two entries to
   `REGISTERED_PAGES` in `scripts/build-seo.js`, then run `node scripts/build-seo.js`
   (merges into `content/seo.json` automatically).

## Step 3 — Sitemaps (`wiring/sitemap-urls.xml`)

Run `node scripts/build-artifact-pages.js --sitemap-only` first, then append the
`<url>` blocks from `wiring/sitemap-urls.xml` to `sitemap.xml` and
`image-sitemap.xml` (the generator preserves unmanaged entries).

## Step 4 — Validate

From the repo root: `node scripts/check.js`. Note: the audit's page list is
hardcoded, so the two new pages simply aren't audited (expected, not an error).
Internal links resolve against the filesystem — no broken-link flags as long as
Step 1 is done.

## Step 5 — Deploy (NOT STARTED — waiting on owner approval)

Commit + push to `main` → GitHub Actions runs validation and rsyncs to Bluehost.
(`content/`, `studio/`, `scripts/` are excluded from prod.)

## What's already decided (nothing left open)

- **Affiliate links:** all 24 resolved — 18 real Amazon ASINs with the
  `lemonteed-20` tag, 6 brand-direct links (The Row, Rothy's, Bombas, Lands' End,
  L.L.Bean ×2 have no Amazon listing; no commission on those rows). Full mapping
  + verification notes in `asins.md`. `rel="sponsored nofollow noopener"` on all.
- **Zone eyebrow:** `[ ZONE 06 / RANKINGS ROW ]` — repo-wide recon shows only
  ZONE 01 (what-if) and ZONE 05 (vrg-cards) in use; 06 is the next free number.
- **og:image:** dedicated 1200×630 social card
  (`images/rankings/ep001/og-house-shoe-matrix.webp`) on both new pages.
- **Zone wiring scope:** sidebars + homepage drawer + SEO registry + sitemaps —
  the full discoverability set, matching how existing zones are wired.
- **Copy accuracy:** Dearfoams Brendan is marketed as a clog, so the article
  calls it a clog (was "moccasin" in the draft).
- **Pin destinations:** `~/workspace/lemmys-rankings/ep001/ep001-pin-copy.md`
  assumes `https://lemonteed.com/rankings/house-shoe-matrix/` — matches this
  package exactly, no changes needed.
- **Disclosure:** affiliate disclosure callout near the top of the article;
  `#affiliate` first line of every pin description.

## After deploy

Once `https://lemonteed.com/rankings/house-shoe-matrix/` is live, the three pin
variants (`pin-hero-matrix.webp`, `pin-warmest-5.webp`, `pin-frugal-cozy.webp`)
can be published to Pinterest spaced 2–4 days apart, using the
titles/descriptions/UTMs in `ep001-pin-copy.md`.

Pinterest does not accept WebP, so re-encode each pin to PNG at upload time and
rename it to `lemmys-rankings-001-<slug>.png` at the same time. Example:

```powershell
magick images\rankings\ep001\pin-hero-matrix.webp -quality 92 lemmys-rankings-001-hero-matrix.png
```
