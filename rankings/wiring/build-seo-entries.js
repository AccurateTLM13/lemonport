# Wiring snippet 3 — SEO registration (`scripts/build-seo.js`)

## Anchor — find the end of the REGISTERED_PAGES array (last entry):

  { key: "specimens", label: "Specimen Vault", htmlPath: "specimens/index.html", canonicalUrl: "https://lemonteed.com/specimens/" },
];

## Insert before the closing `];` (note the escaped apostrophe):

  { key: "specimens", label: "Specimen Vault", htmlPath: "specimens/index.html", canonicalUrl: "https://lemonteed.com/specimens/" },
  { key: "rankings", label: "Lemmy\'s Rankings", htmlPath: "rankings/index.html", canonicalUrl: "https://lemonteed.com/rankings/" },
  { key: "rankings-house-shoe-matrix", label: "Rankings: House Shoe Matrix", htmlPath: "rankings/house-shoe-matrix/index.html", canonicalUrl: "https://lemonteed.com/rankings/house-shoe-matrix/" },
];

## Then run (from the repo root):

  node scripts/build-seo.js

This merges the new pages into `content/seo.json` automatically (scraping
title/description/OG tags straight from the new HTML files) — no manual
seo.json editing needed.
