"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { backupFile } = require("./file-backup");

const root = path.resolve(__dirname, "..");
const seoFile = path.join(root, "content", "seo.json");

// The canonical list of pages managed by the SEO tool.
// key must be unique; htmlPath is relative to repo root.
const REGISTERED_PAGES = [
  { key: "home", label: "Home (The Atlas)", htmlPath: "index.html", canonicalUrl: "https://lemonteed.com/" },
  { key: "archive", label: "Archive", htmlPath: "archive/index.html", canonicalUrl: "https://lemonteed.com/archive/" },
  { key: "vrg-cards", label: "VRG Cards", htmlPath: "vrg-cards/index.html", canonicalUrl: "https://lemonteed.com/vrg-cards/" },
  { key: "what-if", label: "What If", htmlPath: "what-if/index.html", canonicalUrl: "https://lemonteed.com/what-if/" },
  { key: "misc-gens", label: "Misc Gens", htmlPath: "misc-gens/index.html", canonicalUrl: "https://lemonteed.com/misc-gens/" },
  { key: "memetic-warfare", label: "Memetic Warfare", htmlPath: "memetic-warfare/index.html", canonicalUrl: "https://lemonteed.com/memetic-warfare/" },
  { key: "junk-drawer", label: "Junk Drawer", htmlPath: "junk-drawer/index.html", canonicalUrl: "https://lemonteed.com/junk-drawer/" },
  { key: "junk-drawer-image-converter", label: "Junk Drawer: Image Converter", htmlPath: "junk-drawer/image-converter/index.html", canonicalUrl: "https://lemonteed.com/junk-drawer/image-converter/" },
  { key: "junk-drawer-image-compressor", label: "Junk Drawer: Image Compressor", htmlPath: "junk-drawer/image-compressor/index.html", canonicalUrl: "https://lemonteed.com/junk-drawer/image-compressor/" },
  { key: "junk-drawer-character-supply", label: "Junk Drawer: Character Supply", htmlPath: "junk-drawer/character-supply/index.html", canonicalUrl: "https://lemonteed.com/junk-drawer/character-supply/" },
  { key: "junk-drawer-list-mechanic", label: "Junk Drawer: List Mechanic", htmlPath: "junk-drawer/list-mechanic/index.html", canonicalUrl: "https://lemonteed.com/junk-drawer/list-mechanic/" },
  { key: "lighthouse-handoff", label: "Lighthouse Handoff", htmlPath: "lighthouse-handoff/index.html", canonicalUrl: "https://lemonteed.com/lighthouse-handoff/" },
  { key: "free-source", label: "FreeSource", htmlPath: "free-source/index.html", canonicalUrl: "https://lemonteed.com/free-source/" },
  { key: "lemon-dom", label: "Lemon DOM", htmlPath: "lemon-dom/index.html", canonicalUrl: "https://lemonteed.com/lemon-dom/" },
  { key: "studio-lab", label: "Studio Lab", htmlPath: "studio-lab/index.html", canonicalUrl: "https://lemonteed.com/studio-lab/" },
  { key: "lemonteed-fm", label: "Lemonteed FM", htmlPath: "lemonteed-fm/index.html", canonicalUrl: "https://lemonteed.com/lemonteed-fm/" },
  { key: "benchmark", label: "Design Skill Benchmark Archive", htmlPath: "benchmark/index.html", canonicalUrl: "https://lemonteed.com/benchmark/" },
  { key: "specimens", label: "Specimen Vault", htmlPath: "specimens/index.html", canonicalUrl: "https://lemonteed.com/specimens/" },
];

const CANONICAL_ORIGIN = "https://lemonteed.com";

/**
 * Extract a meta tag content value from raw HTML.
 * Handles both property= and name= attributes.
 */
function extractMeta(html, attr, value) {
  const pattern = new RegExp(
    `<meta\\s[^>]*${attr}=["']${escapeRegex(value)}["'][^>]*content=["']([^"']*)["'][^>]*>|` +
    `<meta\\s[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${escapeRegex(value)}["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  if (!match) return "";
  return (match[1] !== undefined ? match[1] : match[2]) || "";
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractCanonical(html) {
  const match = html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
  return match ? match[1].trim() : "";
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttr(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Scrape current SEO values from a page's HTML file.
 */
function scrapePageSeo(htmlPath, pageConfig) {
  const filePath = path.join(root, htmlPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const html = fs.readFileSync(filePath, "utf8");
  return {
    key: pageConfig.key,
    label: pageConfig.label,
    htmlPath: pageConfig.htmlPath,
    title: extractTitle(html),
    description: extractMeta(html, "name", "description"),
    ogTitle: extractMeta(html, "property", "og:title"),
    ogDescription: extractMeta(html, "property", "og:description"),
    ogImage: extractMeta(html, "property", "og:image").replace(CANONICAL_ORIGIN, "") || "",
    ogImageWidth: Number(extractMeta(html, "property", "og:image:width")) || 1200,
    ogImageHeight: Number(extractMeta(html, "property", "og:image:height")) || 630,
    twitterTitle: extractMeta(html, "name", "twitter:title"),
    twitterDescription: extractMeta(html, "name", "twitter:description"),
    twitterImage: extractMeta(html, "name", "twitter:image").replace(CANONICAL_ORIGIN, "") || "",
    canonicalUrl: extractCanonical(html) || pageConfig.canonicalUrl,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Bootstrap initial seo.json from the current state of HTML files.
 */
function bootstrapSeoFromHtml() {
  const pages = REGISTERED_PAGES.map((pageConfig) => {
    const scraped = scrapePageSeo(pageConfig.htmlPath, pageConfig);
    if (!scraped) {
      // File doesn't exist yet — return a minimal placeholder
      return {
        key: pageConfig.key,
        label: pageConfig.label,
        htmlPath: pageConfig.htmlPath,
        title: "",
        description: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        ogImageWidth: 1200,
        ogImageHeight: 630,
        twitterTitle: "",
        twitterDescription: "",
        twitterImage: "",
        canonicalUrl: pageConfig.canonicalUrl,
        updatedAt: new Date().toISOString()
      };
    }
    return scraped;
  });
  return pages;
}

/**
 * Load content/seo.json. Bootstrap from HTML if the file doesn't exist yet.
 */
function loadSeo() {
  if (!fs.existsSync(seoFile)) {
    return bootstrapSeoFromHtml();
  }
  const records = JSON.parse(fs.readFileSync(seoFile, "utf8"));
  // Merge against registered pages so new pages get added automatically
  const byKey = new Map(records.map((r) => [r.key, r]));
  return REGISTERED_PAGES.map((pageConfig) => {
    if (byKey.has(pageConfig.key)) {
      return { ...byKey.get(pageConfig.key), label: pageConfig.label, htmlPath: pageConfig.htmlPath };
    }
    const scraped = scrapePageSeo(pageConfig.htmlPath, pageConfig);
    return scraped || {
      key: pageConfig.key,
      label: pageConfig.label,
      htmlPath: pageConfig.htmlPath,
      title: "", description: "", ogTitle: "", ogDescription: "",
      ogImage: "", ogImageWidth: 1200, ogImageHeight: 630,
      twitterTitle: "", twitterDescription: "", twitterImage: "",
      canonicalUrl: pageConfig.canonicalUrl,
      updatedAt: new Date().toISOString()
    };
  });
}

/**
 * Patch a single meta tag (name= or property= variant).
 * If the tag doesn't exist yet, insert it before </head>.
 */
function patchMeta(html, attrName, attrValue, newContent) {
  const escapedContent = escapeAttr(newContent);

  // Try to replace existing tag — handles both attribute orderings
  const pattern = new RegExp(
    `(<meta\\s[^>]*${attrName}=["']${escapeRegex(attrValue)}["'][^>]*content=["'])([^"']*)("(?:[^>]*)>)` +
    `|(<meta\\s[^>]*content=["'])([^"']*)("["'\\s][^>]*${attrName}=["']${escapeRegex(attrValue)}["'][^>]*>)`,
    "i"
  );

  if (pattern.test(html)) {
    return html.replace(pattern, (match, p1, p2, p3, p4, p5, p6) => {
      if (p1 !== undefined) return `${p1}${escapedContent}${p3}`;
      return `${p4}${escapedContent}${p6}`;
    });
  }

  // Tag not found — insert before </head>
  const newTag = `  <meta ${attrName}="${attrValue}" content="${escapedContent}">\n`;
  return html.replace(/<\/head>/i, `${newTag}</head>`);
}

/**
 * Patch <title> tag.
 */
function patchTitle(html, newTitle) {
  const escaped = newTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (/<title[^>]*>[^<]*<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[^<]*<\/title>/i, `<title>${escaped}</title>`);
  }
  return html.replace(/<\/head>/i, `  <title>${escaped}</title>\n</head>`);
}

/**
 * Patch <link rel="canonical"> tag.
 */
function patchCanonical(html, canonicalUrl) {
  const escaped = escapeAttr(canonicalUrl);
  const pattern = /<link\s[^>]*rel=["']canonical["'][^>]*>/i;
  if (pattern.test(html)) {
    return html.replace(pattern, `<link rel="canonical" href="${escaped}">`);
  }
  return html.replace(/<\/head>/i, `  <link rel="canonical" href="${escaped}">\n</head>`);
}

/**
 * Patch og:image:secure_url to mirror og:image.
 */
function patchOgImageSecureUrl(html, imageUrl) {
  const absoluteUrl = imageUrl.startsWith("http") ? imageUrl : `${CANONICAL_ORIGIN}${imageUrl}`;
  return patchMeta(html, "property", "og:image:secure_url", absoluteUrl);
}

/**
 * Apply all SEO patches for one page record to its HTML string.
 */
function applyPatches(html, record) {
  let out = html;
  const absoluteOgImage = record.ogImage
    ? (record.ogImage.startsWith("http") ? record.ogImage : `${CANONICAL_ORIGIN}${record.ogImage}`)
    : "";
  const absoluteTwitterImage = record.twitterImage
    ? (record.twitterImage.startsWith("http") ? record.twitterImage : `${CANONICAL_ORIGIN}${record.twitterImage}`)
    : "";

  if (record.title) out = patchTitle(out, record.title);
  if (record.description) out = patchMeta(out, "name", "description", record.description);
  if (record.canonicalUrl) out = patchCanonical(out, record.canonicalUrl);
  if (record.ogTitle) out = patchMeta(out, "property", "og:title", record.ogTitle);
  if (record.ogDescription) out = patchMeta(out, "property", "og:description", record.ogDescription);
  if (absoluteOgImage) {
    out = patchMeta(out, "property", "og:image", absoluteOgImage);
    out = patchOgImageSecureUrl(out, absoluteOgImage);
  }
  if (record.ogImageWidth) out = patchMeta(out, "property", "og:image:width", String(record.ogImageWidth));
  if (record.ogImageHeight) out = patchMeta(out, "property", "og:image:height", String(record.ogImageHeight));
  if (record.twitterTitle) out = patchMeta(out, "name", "twitter:title", record.twitterTitle);
  if (record.twitterDescription) out = patchMeta(out, "name", "twitter:description", record.twitterDescription);
  if (absoluteTwitterImage) out = patchMeta(out, "name", "twitter:image", absoluteTwitterImage);

  return out;
}

/**
 * Write content/seo.json.
 */
function saveSeoFile(records) {
  if (fs.existsSync(seoFile)) {
    backupFile(seoFile);
  }
  fs.mkdirSync(path.dirname(seoFile), { recursive: true });
  fs.writeFileSync(seoFile, `${JSON.stringify(records, null, 2)}\n`);
}

/**
 * Build: read seo.json, patch each HTML file in place.
 * Returns a summary of what was written.
 */
function buildSeo(options = {}) {
  const dryRun = options.dryRun === true;
  const pages = loadSeo();
  const results = [];

  pages.forEach((record) => {
    const filePath = path.join(root, record.htmlPath);
    if (!fs.existsSync(filePath)) {
      results.push({ key: record.key, htmlPath: record.htmlPath, status: "skipped", reason: "file not found" });
      return;
    }

    const original = fs.readFileSync(filePath, "utf8");
    const patched = applyPatches(original, record);

    if (patched === original) {
      results.push({ key: record.key, htmlPath: record.htmlPath, status: "unchanged" });
      return;
    }

    if (!dryRun) {
      backupFile(filePath);
      fs.writeFileSync(filePath, patched, "utf8");
    }

    results.push({ key: record.key, htmlPath: record.htmlPath, status: dryRun ? "would-patch" : "patched" });
  });

  return results;
}

module.exports = { loadSeo, saveSeoFile, bootstrapSeoFromHtml, buildSeo, REGISTERED_PAGES, seoFile };

// Run directly: node scripts/build-seo.js [--dry-run]
if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  console.log(dryRun ? "DRY RUN — no files will be written." : "Building SEO meta tags...");

  const results = buildSeo({ dryRun });
  results.forEach((result) => {
    const icon = result.status === "patched" ? "✓" : result.status === "would-patch" ? "~" : result.status === "skipped" ? "!" : " ";
    console.log(`  [${icon}] ${result.htmlPath} — ${result.status}${result.reason ? `: ${result.reason}` : ""}`);
  });

  const patched = results.filter((r) => r.status === "patched" || r.status === "would-patch").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`\n${dryRun ? "Would patch" : "Patched"} ${patched} file(s), ${skipped} skipped.`);
}
