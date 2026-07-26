#!/usr/bin/env node
/**
 * build-artifact-pages.js
 * ───────────────────────
 * Generates a static HTML page for every published artifact.
 *
 * Reads content/projects.json + content/categories.json, applies the
 * templates/artifact-page.html template, and writes one file per artifact:
 *   artifacts/<slug>/index.html
 *
 * Usage:
 *   node scripts/build-artifact-pages.js             # full build
 *   node scripts/build-artifact-pages.js --dry-run    # preview without writing
 *   node scripts/build-artifact-pages.js --clean      # remove all generated pages first
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");
const templateFile = path.join(root, "templates", "artifact-page.html");
const outputDir = path.join(root, "artifacts");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clean = args.includes("--clean");

const SITE_URL = "https://lemonteed.com";

/* ─── Data helpers ───────────────────────────────────────── */

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${path.relative(root, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/* ─── Category paths ─────────────────────────────────────── */

function buildCategoryMap(categories) {
  const map = new Map();
  categories.forEach((cat) => {
    map.set(cat.slug, {
      label: cat.label,
      path: cat.path || `/archive/?category=${encodeURIComponent(cat.slug)}`
    });
  });
  return map;
}

/* ─── Image helpers ──────────────────────────────────────── */

function primaryImage(project) {
  const sizes = project.sizes || {};
  return project.image || sizes.large || sizes.medium || sizes.small || "";
}

function buildSrcset(project) {
  const variants = Array.isArray(project.variants) ? project.variants : [];
  if (variants.length) {
    return variants
      .filter((v) => v && v.url && v.width)
      .map((v) => `${v.url} ${v.width}w`)
      .join(", ");
  }
  const src = primaryImage(project);
  return src ? `${src} ${project.width || 1200}w` : "";
}

function ogImage(project) {
  /* Use the full-size image as the OG image */
  return primaryImage(project);
}

/* ─── Record fields ──────────────────────────────────────── */

function recordFieldHtml(label, value) {
  if (!value || (Array.isArray(value) && !value.length)) {
    return "";
  }
  const display = Array.isArray(value) ? value.join(", ") : value;
  return [
    `            <div class="artifact-record__field">`,
    `              <dt>${escapeHtml(label)}</dt>`,
    `              <dd>${escapeHtml(display)}</dd>`,
    `            </div>`
  ].join("\n");
}

function buildRecordFields(project) {
  const fields = [
    recordFieldHtml("Category", project.categoryLabel || project.category),
    recordFieldHtml("Series", project.series),
    recordFieldHtml("Date Created", formatDate(project.dateCreated)),
    recordFieldHtml("Description", project.description),
    recordFieldHtml("Origin", project.origin),
    recordFieldHtml("Danger Level", project.dangerLevel),
    recordFieldHtml("Tags", project.tags),
    recordFieldHtml("Tools Used", project.toolsUsed)
  ];
  return fields.filter(Boolean).join("\n");
}

/* ─── Related artifacts ──────────────────────────────────── */

function relatedThumbnail(project) {
  const variants = Array.isArray(project.variants) ? project.variants : [];
  const preferred = variants.find((v) => Number(v.width) === 320) || variants[0];
  const sizes = project.sizes || {};
  return project.thumbnail || (preferred && preferred.url) || sizes.small || project.image || "";
}

function buildRelatedHtml(project, projectMap) {
  const relatedIds = Array.isArray(project.related) ? project.related : [];
  const relatedItems = relatedIds
    .map((id) => projectMap.get(id))
    .filter((item) => item && item.slug);

  if (!relatedItems.length) {
    return "";
  }

  const items = relatedItems.map((item) => {
    const thumb = relatedThumbnail(item);
    const thumbHtml = thumb
      ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async">`
      : "";
    return [
      `              <a class="artifact-related__link" href="/artifacts/${encodeURIComponent(item.slug)}/">`,
      `                ${thumbHtml}`,
      `                <span>${escapeHtml(item.title)}</span>`,
      `              </a>`
    ].join("\n");
  });

  return [
    `          <section class="artifact-related artifact-related--page">`,
    `            <h2>Related Artifacts</h2>`,
    `            <div class="artifact-related__list">`,
    items.join("\n"),
    `            </div>`,
    `          </section>`
  ].join("\n");
}

/* ─── JSON-LD structured data ────────────────────────────── */

function buildJsonLd(project, categoryInfo) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    url: `${SITE_URL}/artifacts/${project.slug}/`,
    description: project.description || "Experimental visual artifact from the Lemonteed archive.",
    image: `${SITE_URL}${primaryImage(project)}`,
    creator: {
      "@type": "Person",
      name: "TLM13 / JP"
    },
    isPartOf: {
      "@type": "CollectionPage",
      name: categoryInfo.label,
      url: `${SITE_URL}${categoryInfo.path}`
    }
  };

  if (project.dateCreated) {
    ld.dateCreated = project.dateCreated;
  }

  if (Array.isArray(project.tags) && project.tags.length) {
    ld.keywords = project.tags.join(", ");
  }

  return JSON.stringify(ld, null, 6);
}

/* ─── Prev / Next navigation ─────────────────────────────── */

function navLink(item, direction) {
  if (!item) {
    return "";
  }
  const label = direction === "prev" ? `← ${item.title}` : `${item.title} →`;
  const cls = `artifact-nav__link artifact-nav__link--${direction}`;
  return `            <a class="${cls}" href="/artifacts/${encodeURIComponent(item.slug)}/">${escapeHtml(label)}</a>`;
}

/* ─── VRG Vault link ─────────────────────────────────────── */

function buildVaultLink(project) {
  if (project.category !== "vrg-cards") {
    return "";
  }
  const vaultFile = path.join(root, "content", "vrg-vault.json");
  if (!fs.existsSync(vaultFile)) {
    return "";
  }
  try {
    const config = JSON.parse(fs.readFileSync(vaultFile, "utf8"));
    const hasEntry = Array.isArray(config.cards) && config.cards.some((c) => c.projectId === project.id);
    if (hasEntry) {
      return `          <a class="artifact-record__vault-link" href="/vrg-cards/#${encodeURIComponent(project.id)}">Open in VRG Vault</a>`;
    }
  } catch {
    /* ignore */
  }
  return "";
}

/* ─── Page generation ────────────────────────────────────── */

function generatePage(project, template, categoryMap, projectMap, categoryItems) {
  const catSlug = project.category || "";
  const categoryInfo = categoryMap.get(catSlug) || { label: catSlug, path: `/archive/?category=${encodeURIComponent(catSlug)}` };

  /* Find prev/next within same category */
  const items = categoryItems.get(catSlug) || [];
  const idx = items.findIndex((p) => p.id === project.id);
  const prevItem = idx > 0 ? items[idx - 1] : null;
  const nextItem = idx < items.length - 1 ? items[idx + 1] : null;

  const img = primaryImage(project);
  const description = project.description || "Experimental visual artifact from the Lemonteed archive.";
  const shortDesc = description.length > 160
    ? description.slice(0, 157) + "..."
    : description;

  const replacements = {
    "{{TITLE}}": escapeHtml(project.title),
    "{{SLUG}}": encodeURIComponent(project.slug),
    "{{META_DESCRIPTION}}": escapeHtml(shortDesc),
    "{{OG_DESCRIPTION}}": escapeHtml(shortDesc),
    "{{TWITTER_DESCRIPTION}}": escapeHtml(shortDesc),
    "{{OG_IMAGE}}": escapeHtml(ogImage(project)),
    "{{OG_WIDTH}}": String(project.width || 1200),
    "{{OG_HEIGHT}}": String(project.height || 630),
    "{{CATEGORY_PATH}}": escapeHtml(categoryInfo.path),
    "{{CATEGORY_LABEL}}": escapeHtml(categoryInfo.label),
    "{{IMAGE_LARGE}}": escapeHtml(img),
    "{{SRCSET}}": escapeHtml(buildSrcset(project)),
    "{{ALT}}": escapeHtml(project.alt || `${project.title} — Lemonteed artifact`),
    "{{WIDTH}}": String(project.width || 1200),
    "{{HEIGHT}}": String(project.height || 1500),
    "{{RECORD_FIELDS}}": buildRecordFields(project),
    "{{VAULT_LINK}}": buildVaultLink(project),
    "{{RELATED_HTML}}": buildRelatedHtml(project, projectMap),
    "{{PREV_LINK}}": navLink(prevItem, "prev"),
    "{{NEXT_LINK}}": navLink(nextItem, "next"),
    "{{JSON_LD}}": buildJsonLd(project, categoryInfo)
  };

  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.split(token).join(value);
  }

  return html;
}

/* ─── Build ──────────────────────────────────────────────── */

function cleanOutput() {
  if (fs.existsSync(outputDir)) {
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = path.join(outputDir, entry.name, "index.html");
        if (fs.existsSync(indexPath)) {
          fs.rmSync(path.join(outputDir, entry.name), { recursive: true, force: true });
        }
      }
    }
  }
}

function build() {
  const projects = readJSON(contentFile);
  const categories = readJSON(categoriesFile);
  const template = fs.readFileSync(templateFile, "utf8");
  const categoryMap = buildCategoryMap(categories);

  const published = projects.filter(
    (p) => p.visible !== false && (p.status === "Published" || (!p.status && (p.image || (p.sizes && (p.sizes.large || p.sizes.medium || p.sizes.small)))))
  );

  /* Build lookup map */
  const projectMap = new Map(published.map((p) => [p.id, p]));

  /* Group by category for prev/next, sorted by dateCreated descending */
  const categoryItems = new Map();
  published.forEach((p) => {
    const cat = p.category || "uncategorized";
    if (!categoryItems.has(cat)) {
      categoryItems.set(cat, []);
    }
    categoryItems.get(cat).push(p);
  });
  for (const [, items] of categoryItems) {
    items.sort((a, b) => {
      const da = a.dateCreated || a.createdAt || "";
      const db = b.dateCreated || b.createdAt || "";
      return db.localeCompare(da);
    });
  }

  if (clean && !dryRun) {
    cleanOutput();
    console.log("[clean] Removed previously generated artifact pages.");
  }

  let generated = 0;
  const slugsSeen = new Set();
  const warnings = [];

  for (const project of published) {
    if (!project.slug) {
      warnings.push(`Skipping project "${project.title || project.id}" — no slug.`);
      continue;
    }
    if (slugsSeen.has(project.slug)) {
      warnings.push(`Duplicate slug "${project.slug}" for project "${project.id}" — skipping.`);
      continue;
    }
    slugsSeen.add(project.slug);

    const html = generatePage(project, template, categoryMap, projectMap, categoryItems);
    const outPath = path.join(outputDir, project.slug, "index.html");

    if (dryRun) {
      console.log(`[dry-run] Would write ${path.relative(root, outPath)} (${html.length} bytes)`);
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, html);
    }

    generated++;
  }

  return { generated, warnings };
}

/* ─── Sitemap generation ─────────────────────────────────── */

function buildSitemap() {
  const projects = readJSON(contentFile);
  const published = projects.filter(
    (p) => p.visible !== false && p.status === "Published" && p.slug
  );

  const sitemapPath = path.join(root, "sitemap.xml");
  let existingSitemap = "";
  if (fs.existsSync(sitemapPath)) {
    existingSitemap = fs.readFileSync(sitemapPath, "utf8");
  }

  /* Build artifact URL entries */
  const artifactEntries = published.map((p) => {
    const lastmod = p.updatedAt ? p.updatedAt.slice(0, 10) : (p.dateCreated || "");
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
    return `  <url>\n    <loc>${SITE_URL}/artifacts/${encodeURIComponent(p.slug)}/</loc>${lastmodTag}\n  </url>`;
  });

  /* Remove existing artifact entries from sitemap */
  const cleanedSitemap = existingSitemap.replace(
    /\s*<url>\s*<loc>https:\/\/lemonteed\.com\/artifacts\/[^<]+<\/loc>[\s\S]*?<\/url>/g,
    ""
  );

  /* Insert before closing </urlset> */
  const newSitemap = cleanedSitemap.replace(
    "</urlset>",
    artifactEntries.join("\n") + "\n</urlset>"
  );

  return { sitemapContent: newSitemap, entryCount: artifactEntries.length };
}

function buildImageSitemap() {
  const projects = readJSON(contentFile);
  const published = projects.filter(
    (p) => p.visible !== false && p.status === "Published" && p.slug
  );

  const entries = published.map((p) => {
    const img = primaryImage(p);
    if (!img) {
      return "";
    }
    const caption = escapeHtml(p.description || p.title || "");
    const title = escapeHtml(p.title || "");
    return [
      `  <url>`,
      `    <loc>${SITE_URL}/artifacts/${encodeURIComponent(p.slug)}/</loc>`,
      `    <image:image>`,
      `      <image:loc>${SITE_URL}${img}</image:loc>`,
      `      <image:caption>${caption}</image:caption>`,
      `      <image:title>${title}</image:title>`,
      `    </image:image>`,
      `  </url>`
    ].join("\n");
  }).filter(Boolean);

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    entries.join("\n"),
    `</urlset>`,
    ``
  ].join("\n");

  return xml;
}

/* ─── Main ───────────────────────────────────────────────── */

if (require.main === module) {
  const result = build();
  const verb = dryRun ? "Would generate" : "Generated";
  console.log(`\n${verb} ${result.generated} artifact pages in artifacts/`);

  if (result.warnings.length) {
    console.log("\nWarnings:");
    result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  if (!dryRun) {
    /* Update sitemap */
    const { sitemapContent, entryCount } = buildSitemap();
    fs.writeFileSync(path.join(root, "sitemap.xml"), sitemapContent);
    console.log(`Updated sitemap.xml with ${entryCount} artifact entries.`);

    /* Generate image sitemap */
    const imageSitemap = buildImageSitemap();
    fs.writeFileSync(path.join(root, "image-sitemap.xml"), imageSitemap);
    console.log(`Generated image-sitemap.xml`);
  }
}

module.exports = { build, buildSitemap, buildImageSitemap };
