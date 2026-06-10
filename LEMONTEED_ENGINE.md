# Lemonteed Static Engine

Lemonteed is a static visual portfolio and experimental artifact archive built with plain HTML, CSS, and JavaScript.

The public site is intentionally static. The local tooling can become more powerful, but the deployed output should remain portable files that can be hosted without a public application server.

## Core Architecture

The public site is composed of static HTML pages that load shared CSS and generated JavaScript data files.

Static public pages include:

- `index.html`
- `vrg-cards/index.html`
- `what-if/index.html`
- `misc-gens/index.html`
- `memetic-warfare/index.html`
- `junk-drawer/index.html`
- `junk-drawer/image-converter/index.html`
- `live-experiment/index.html`
- `lemonteed-fm/index.html`
- `million-dollar-receipt/index.html`
- `operator-log/index.html` (hidden; noindex; not in sitemap)

Shared public assets include:

- `assets/css/style.css`
- `assets/css/memetic-game.css`
- `assets/js/gallery.js`
- `assets/js/memetic-game.js`
- `images/**`

## Source Of Truth

The content source of truth is:

- `content/projects.json`
- `content/categories.json`
- `content/live-experiment.json`
- `content/lemonteed-fm.json`
- `content/million-dollar-receipt.json`
- `content/vrg-vault.json`
- `content/operator-log/schedule.json`

These files define artifact metadata, category profiles, audio tracks, and mutation parameters. Agents should update these files through Lemonteed Studio when possible, or by careful direct JSON edits when explicitly needed.

## Generated Files

The generated browser data files are:

- `assets/js/gallery-data.js`
- `assets/js/gallery-categories.js`
- `assets/js/live-experiment-data.js`
- `assets/js/vrg-vault-data.js`
- `assets/js/mdr-config.js`
- `assets/js/mdr-stats.js`
- `lemonteed-fm/tracks.js`

These files are produced by respective build scripts under `scripts/`. Do not manually edit them as the source of truth. Update the corresponding content JSON file and rebuild.

Responsive image variants under `images/**` are also generated assets. Keep them tied to the metadata in `content/projects.json`.

## Build Pipeline

`scripts/build-gallery.js` reads `content/projects.json` and `content/categories.json`, filters public data, and writes browser globals used by the public gallery.

`scripts/promote-operator-mutation.js` reads `content/operator-log/schedule.json`, selects the newest eligible phase, clears `operator-log/data/`, copies the active fragment, and writes `operator-log/manifest.json`. Run this whenever a new mutation phase should go live.

The gallery build currently publishes projects where:

- `visible !== false`
- effective status is `Published`
- required image and thumbnail data exists

If a project has no `status`, `scripts/build-gallery.js` treats it as `Published` only when it has publishable image data. Otherwise it is treated as `Draft`.

`assets/js/gallery.js` renders the browser gallery UI. It handles category filtering, randomized ordering, responsive image candidates, lightbox navigation, artifact details, related items, info drawer behavior, URL query category selection, and random artifact navigation.

`assets/js/mobile-header.js` adapts the shared archive chrome on mobile. It creates the compact hamburger/category drawer pattern from the existing sidebar markup, so global navigation changes should account for both desktop sidebar behavior and generated mobile controls.

`assets/js/coming-soon.js` can intercept links and buttons either directly with `data-coming-soon` or by scope with `data-coming-soon-scope`. Scoped use should be applied to page-owned content containers such as `main` or `article`, not the document body, unless the requested behavior is explicitly meant to include global chrome.

Junk Drawer tools should keep their tool-specific logic local, but should use the shared `site-shell`, `sidebar`, `category-nav`, and mobile header script when the page is part of the public archive experience.

## Lemonteed Studio

`scripts/studio-server.js` serves the local Studio interface at:

```text
http://localhost:5173/studio/
```

It also serves the public site locally at:

```text
http://localhost:5173/
```

Studio is a local-only content management layer for artifact metadata, category records, image uploads, WebP conversion, responsive variants, visibility, import/export, and gallery rebuilds.

Studio is not a public production admin panel. Do not deploy it publicly unless the project is explicitly redesigned with authentication, authorization, upload hardening, rate limiting, backup strategy, and general server security.

## Image Pipeline

Image handling depends on ImageMagick being available as `magick`.

Studio uploads are converted to WebP and responsive variants are generated at these target widths when smaller than the source image:

- `320`
- `480`
- `640`
- `768`
- `900`
- `1024`
- `1600`

`scripts/generate-image-variants.js` can regenerate responsive variants for gallery roots and then rebuild the generated gallery data.

## Categories

Categories are defined in `content/categories.json`.

Each category should have:

- `slug`
- `label`
- `prefix`
- `path`
- `visible`

The category `slug` is the stable identifier used by project records and gallery filtering. The category `prefix` is used by Studio when creating project IDs.

## Memetic Warfare

`memetic-warfare/index.html` is not only a standard gallery page. It also loads a browser-only loadout mini-game.

The game uses:

- `assets/js/memetic-game-data.js`
- `assets/js/memetic-game.js`
- `assets/css/memetic-game.css`

`assets/js/memetic-game-data.js` is currently separate from `content/projects.json`. Weapon records point back to gallery artifacts with `artifactId`.

Scores are stored locally in `localStorage`. There is no public leaderboard and no trusted score validation.

## Architecture Rule

The public site should remain HTML, CSS, and JavaScript only.

Do not introduce React, Vue, Svelte, Astro, Next.js, Eleventy, PHP, WordPress, a database-backed public CMS, or server-rendered public pages unless the project owner explicitly approves an architecture change.

The goal is to push static web experiences while keeping the public output simple, fast, portable, and easy to deploy.

## Interaction Scope Rule

When a request names a specific page and a behavior on that page, assume it refers to the page's main content area. Header, sidebar, navigation, mobile header/drawer, and footer behavior are shared chrome. Change shared chrome only when the request explicitly calls out those areas or asks for a site-wide/global behavior.
