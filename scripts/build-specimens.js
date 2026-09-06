/**
 * Specimen Vault build pipeline.
 *
 * Source of truth: content/specimens.json
 * Generates:
 *   - specimens/index.html            (the whole public zone: card grid + info drawers)
 *
 * There are no per-specimen record pages. Cards link straight to the archived
 * HTML at specimens/source/<id>.html; metadata lives in statically-rendered
 * <dialog> elements that vault.js opens as slide-out drawers.
 *
 * Raw specimen HTML is written by the Studio server through
 * sanitizeSpecimenHtml(). Card images (desktop screenshots) are written by the
 * Studio server under specimens/images/<id>.webp; page photo assets under
 * specimens/assets/<id>/.
 *
 * CLI:
 *   node scripts/build-specimens.js
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "specimens.json");
const specimensDir = path.join(root, "specimens");
const SITE_URL = "https://lemonteed.com";

const STATUSES = ["Draft", "Ready", "Published", "Hidden", "Archived"];
const PUBLIC_STATUS = "Published";

/* ─── Helpers ────────────────────────────────────────────── */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadSpecimens() {
  if (!fs.existsSync(contentFile)) {
    return { records: [] };
  }
  const parsed = JSON.parse(fs.readFileSync(contentFile, "utf8"));
  if (!Array.isArray(parsed.records)) {
    throw new Error("content/specimens.json must contain a records array.");
  }
  return parsed;
}

function asText(value) {
  return String(value ?? "").trim();
}

function asTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => asText(tag)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((tag) => asText(tag)).filter(Boolean);
  }
  return [];
}

function snippet(value, max = 150) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/* ─── Validation ─────────────────────────────────────────── */

function validateSpecimenRecord(record, seenIds) {
  const errors = [];
  const warnings = [];

  if (!record.id || !/^[a-z0-9-]{4,40}$/.test(record.id)) {
    errors.push(`Record id "${record.id || "(missing)"}" must be 4-40 chars of a-z, 0-9, or dashes.`);
  } else if (seenIds.has(record.id)) {
    errors.push(`Duplicate specimen id "${record.id}".`);
  } else {
    seenIds.add(record.id);
  }

  if (!asText(record.title)) errors.push(`Record ${record.id || "?"}: title is required.`);
  if (!asText(record.model)) errors.push(`Record ${record.id}: model is required.`);
  if (!asText(record.skill)) errors.push(`Record ${record.id}: skill is required.`);
  if (!STATUSES.includes(record.status)) {
    errors.push(`Record ${record.id}: status must be one of ${STATUSES.join(", ")}.`);
  }

  if (record.favorite !== undefined && typeof record.favorite !== "boolean") {
    errors.push(`Record ${record.id}: favorite must be a boolean when provided.`);
  }

  if (record.date && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    errors.push(`Record ${record.id}: date must be YYYY-MM-DD.`);
  }

  if (record.score !== undefined && record.score !== null && record.score !== "") {
    const score = Number(record.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      errors.push(`Record ${record.id}: score must be a number between 0 and 100.`);
    }
  }

  const image = asText(record.image);
  if (image && !image.startsWith("/specimens/images/")) {
    errors.push(`Record ${record.id}: image must live under /specimens/images/.`);
  }

  if (record.assets !== undefined && !Array.isArray(record.assets)) {
    errors.push(`Record ${record.id}: assets must be an array of paths.`);
  }
  (record.assets || []).forEach((asset) => {
    if (!asText(asset).startsWith("/specimens/assets/")) {
      errors.push(`Record ${record.id}: asset paths must live under /specimens/assets/.`);
    }
  });

  if (record.assetMap !== undefined && !Array.isArray(record.assetMap)) {
    errors.push(`Record ${record.id}: assetMap must be an array.`);
  }

  if (asText(record.source) && record.status === PUBLIC_STATUS) {
    const absolute = path.join(root, record.source.replace(/^\//, ""));
    if (!fs.existsSync(absolute)) {
      warnings.push(`Record ${record.id}: published source file missing at ${record.source}.`);
    }
  }

  if (!asText(record.prompt) && record.status === PUBLIC_STATUS) {
    warnings.push(`Record ${record.id}: no prompt on file. Prompts are the good stuff; consider adding one.`);
  }

  return { errors, warnings };
}

function validateSpecimens(data) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  if (!data || !Array.isArray(data.records)) {
    return { errors: ["content/specimens.json must contain a records array."], warnings };
  }

  data.records.forEach((record) => {
    const result = validateSpecimenRecord(record || {}, seenIds);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  const publishedFavoriteCount = data.records.filter(
    (record) => record && record.status === PUBLIC_STATUS && record.favorite === true
  ).length;
  if (publishedFavoriteCount > 8) {
    warnings.push(`Favorites rail has ${publishedFavoriteCount} published records; consider keeping it to eight or fewer.`);
  }

  return { errors, warnings };
}

/* ─── Sanitizer (used by the Studio server on ingest) ────── */

const SPECIMEN_CSP =
  "default-src 'none'; style-src 'unsafe-inline' https: http:; img-src * data:; " +
  "font-src * data:; media-src * data:; script-src 'unsafe-inline'; connect-src 'none'; " +
  "object-src 'none'; base-uri 'none'; form-action 'none'";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrites references to uploaded asset files inside specimen HTML so they
 * point at the archived copies under specimens/assets/<id>/. Matching is done
 * on the path's final segment (case-insensitive), covering src/href/poster
 * attributes and CSS url() values.
 */
function applyAssetMap(html, assetMap) {
  let out = String(html ?? "");

  const basenameOf = (value) => {
    const cleaned = String(value || "").split(/[?#]/)[0].trim();
    const segments = cleaned.split(/[/\\]/).filter(Boolean);
    return (segments[segments.length - 1] || "").toLowerCase();
  };

  for (const entry of Array.isArray(assetMap) ? assetMap : []) {
    if (!entry || !asText(entry.from) || !asText(entry.to)) continue;
    const target = basenameOf(entry.from);
    if (!target) continue;

    // Attribute values: src="...", href="...", poster="..."
    const attrRe = new RegExp(`(\\s(?:src|href|poster)\\s*=\\s*)(["'])([^"']*)\\2`, "gi");
    out = out.replace(attrRe, (match, prefix, quote, value) => {
      if (basenameOf(value) !== target) return match;
      return `${prefix}${quote}${entry.to}${quote}`;
    });

    // CSS url(...) values
    const cssRe = new RegExp(`url\\(\\s*(["']?)([^"')]+)\\1\\s*\\)`, "gi");
    out = out.replace(cssRe, (match, quote, value) => {
      if (basenameOf(value) !== target) return match;
      return `url(${quote}${entry.to}${quote})`;
    });
  }

  return out;
}

function sanitizeSpecimenHtml(rawHtml, assetMap = []) {
  let html = String(rawHtml ?? "");

  // Strip any pre-existing CSP policy so ours is the single authority.
  html = html.replace(/<meta\s+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");

  const cspTag = `<meta http-equiv="Content-Security-Policy" content="${SPECIMEN_CSP}">`;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n${cspTag}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, `<html$1>\n<head>${cspTag}</head>`);
  } else {
    html = `<!DOCTYPE html>\n<html lang="en">\n<head>${cspTag}\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body>\n${html}\n</body>\n</html>`;
  }

  return applyAssetMap(html, assetMap);
}

/* ─── Shared page chrome ─────────────────────────────────── */

function favicons() {
  return `  <link rel="icon" href="/images/favicons/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicons/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/images/favicons/favicon-16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/favicons/favicon-180.png">`;
}

function pageHead({ title, description, canonical, ogImage, jsonLd }) {
  const jsonLdBlock = jsonLd
    ? `\n  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2).replace(/^/gm, "    ")}\n  </script>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-CCB0LW648K"></script>
  <script src="/assets/js/analytics.js" defer></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">
  <meta property="og:image:type" content="image/webp">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
${favicons()}
  <link rel="stylesheet" href="vault.css">
  <script src="vault.js" defer></script>${jsonLdBlock}
</head>`;
}

function masthead(activeTitle) {
  return `<a class="skip" href="#content">Skip to content</a>
<header class="masthead">
  <div class="masthead__brand">
    <a class="masthead__home" href="/">&larr; Lemonteed Home</a>
    <a class="masthead__title" href="/specimens/">${activeTitle}</a>
  </div>
  <div class="masthead__nav">
    <a class="masthead__article" href="/studio-lab/">Studio Lab</a>
    <span>SANDBOXED EVIDENCE &middot; FILED BY HAND</span>
  </div>
</header>`;
}

function footer() {
  return `<footer class="vault-footer">
  <div class="footer__left">
    <span>SPECIMEN VAULT / LEMONTEED</span>
    <a href="/studio-lab/">Studio Lab</a>
    <a href="/operator-log/">Operator's Log</a>
    <a href="/benchmark/">Design Benchmark</a>
  </div>
  <div class="footer__right">
    <span>EVERY PAGE FILED AS-IS &middot; SCRIPTS REMOVED AT THE DOOR</span>
  </div>
</footer>`;
}

/* ─── Derived views ──────────────────────────────────────── */

function publishable(records) {
  return records
    .filter((record) => record.status === PUBLIC_STATUS)
    .sort((a, b) => {
      const dateA = `${a.date || ""}${a.createdAt || ""}`;
      const dateB = `${b.date || ""}${b.createdAt || ""}`;
      return dateB.localeCompare(dateA);
    });
}

function tallyBy(records, field) {
  const map = new Map();
  records.forEach((record) => {
    const key = asText(record[field]) || "unfiled";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/* ─── Cards + drawers ────────────────────────────────────── */

function renderCard(record, position) {
  const image = asText(record.image);
  const media = image
    ? `<img src="${escapeHtml(image)}" alt="Screenshot of ${escapeHtml(record.title)}" loading="lazy" width="1440" height="900">`
    : `<span class="card__no-image">NO CARD IMAGE<br>ON FILE</span>`;
  const hasScore = record.score !== undefined && record.score !== null && record.score !== "";
  const score = hasScore
    ? `<span class="card__score">${escapeHtml(String(Number(record.score)))}<small>/100</small></span>`
    : "";
  const metaBits = [
    `[ ${escapeHtml(asText(record.model))} ]`,
    `[ ${escapeHtml(asText(record.skill))} ]`,
    record.date ? `[ ${escapeHtml(record.date)} ]` : ""
  ].filter(Boolean).map((bit) => `<li class="pill">${bit}</li>`).join("");
  return `        <article class="card">
          <a class="card__hit" href="source/${escapeHtml(record.id)}.html" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(record.title)} in your browser"></a>
          <div class="card__media">${media}${score}</div>
          <h3>${escapeHtml(record.title)}</h3>
          <ul class="card__meta">${metaBits}</ul>
          <div class="card__cta-row">
            <span class="card__cta">Open it in your browser <span aria-hidden="true">&#8599;</span></span>
            <button type="button" class="card__info" data-specimen-info="${escapeHtml(record.id)}">INFO<span class="visually-hidden"> about ${escapeHtml(record.title)}</span></button>
          </div>
        </article>`;
}

function renderFavoriteCard(record, { isClone = false } = {}) {
  const image = asText(record.image);
  const keyboardIsolation = isClone ? ' tabindex="-1"' : "";
  const media = image
    ? `<img src="${escapeHtml(image)}" alt="Screenshot of ${escapeHtml(record.title)}" loading="eager" width="1440" height="900">`
    : `<span class="favorites-card__no-image">NO IMAGE</span>`;
  return `        <article class="favorites-card">
          <a class="favorites-card__link" href="source/${escapeHtml(record.id)}.html" target="_blank" rel="noopener"${keyboardIsolation}>
            <span class="favorites-card__media">${media}</span>
            <span class="favorites-card__body">
              <span class="favorites-card__badge">[ FAVORITE ]</span>
              <span class="favorites-card__title">${escapeHtml(record.title)}</span>
              <span class="favorites-card__meta"><span>${escapeHtml(asText(record.model))}</span><span>${escapeHtml(asText(record.skill))}</span></span>
            </span>
          </a>
        </article>`;
}

function renderFavoritesRail(records) {
  const favorites = records.filter((record) => record.favorite === true);
  if (!favorites.length) return "";

  const cards = favorites.map((record) => renderFavoriteCard(record)).join("\n");
  const clonedCards = favorites.map((record) => renderFavoriteCard(record, { isClone: true })).join("\n");
  const multiple = favorites.length > 1;
  const control = multiple
    ? `<button type="button" class="favorites-rail__toggle" data-favorites-toggle aria-pressed="false">PAUSE MOTION</button>`
    : "";
  const clone = multiple
    ? `\n        <div class="favorites-rail__set favorites-rail__set--clone" data-favorites-clone aria-hidden="true" inert>\n${clonedCards}\n        </div>`
    : "";

  return `<section class="favorites-rail favorites-rail--${multiple ? "multiple" : "single"}" data-favorites-rail aria-labelledby="favorites-title">
  <div class="favorites-rail__intro">
    <p class="eyebrow">OPERATOR PICKS</p>
    <h2 id="favorites-title">Favorites from the filing cabinet</h2>
    <p class="favorites-rail__lede">Hand-marked in Studio. The operator may be biased.</p>
    ${control}
  </div>
  <div class="favorites-rail__viewport" data-favorites-viewport tabindex="0" role="region" aria-label="Operator picks">
    <div class="favorites-rail__track" data-favorites-track>
      <div class="favorites-rail__set" data-favorites-set>
${cards}
      </div>${clone}
    </div>
  </div>
</section>`;
}

function renderDrawer(record, position) {
  const tags = asTags(record.tags);
  const assets = Array.isArray(record.assets) ? record.assets.filter(asText) : [];
  const hasScore = record.score !== undefined && record.score !== null && record.score !== "";
  const scoreValue = hasScore ? Number(record.score) : null;

  return `        <dialog class="drawer" id="drawer-${escapeHtml(record.id)}" aria-labelledby="drawer-${escapeHtml(record.id)}-title">
          <div class="drawer__bar">
            <span>SPECIMEN FILE ${String(position).padStart(2, "0")}</span>
            <button type="button" class="drawer__close" data-close-drawer>CLOSE &#10005;<span class="visually-hidden"> specimen file</span></button>
          </div>
          <div class="drawer__body">
            <p class="eyebrow">SPECIMEN ${String(position).padStart(2, "0")} / ${escapeHtml(record.id)}</p>
            <h2 id="drawer-${escapeHtml(record.id)}-title">${escapeHtml(record.title)}</h2>
            <ul class="pill-row">
              <li class="pill">[ MODEL: ${escapeHtml(asText(record.model))} ]</li>
              <li class="pill">[ SKILL: ${escapeHtml(asText(record.skill))} ]</li>
              ${record.date ? `<li class="pill">[ CAPTURED: ${escapeHtml(record.date)} ]</li>` : ""}
              ${assets.length ? `<li class="pill">[ ASSETS: ${assets.length} ]</li>` : ""}
            </ul>
            ${hasScore ? `<section class="score"><span>OPERATOR GRADE</span><strong>${scoreValue}<small> / 100</small></strong></section>` : ""}
            ${asText(record.prompt) ? `<section class="prompt-block"><h3>Prompt, verbatim</h3><pre>${escapeHtml(record.prompt)}</pre></section>` : ""}
            ${asText(record.notes) ? `<section class="review"><h3>Operator notes</h3><p>${escapeHtml(record.notes)}</p></section>` : ""}
            ${tags.length ? `<section class="tag-row"><h3>Tags</h3><ul>${tags.map((tag) => `<li class="pill">[ ${escapeHtml(tag)} ]</li>`).join("")}</ul></section>` : ""}
            <section class="provenance">
              <h3>Evidence provenance</h3>
              <dl>
                <dt>Artifact ID</dt><dd>${escapeHtml(record.id)}</dd>
                <dt>Model</dt><dd>${escapeHtml(asText(record.model))}</dd>
                <dt>Skill / system</dt><dd>${escapeHtml(asText(record.skill))}</dd>
                ${record.date ? `<dt>Captured</dt><dd>${escapeHtml(record.date)}</dd>` : ""}
                ${assets.length ? `<dt>Filed assets</dt><dd>${assets.length} image${assets.length === 1 ? "" : "s"} baked into the archived copy</dd>` : ""}
                <dt>The artifact itself</dt><dd><a href="source/${escapeHtml(record.id)}.html" target="_blank" rel="noopener">Open the actual page</a></dd>
              </dl>
            </section>
          </div>
        </dialog>`;
}

/* ─── Index page ─────────────────────────────────────────── */

function renderIndexPage(data) {
  const records = publishable(data.records);
  const models = tallyBy(records, "model");
  const skills = tallyBy(records, "skill");
  const favoritesRail = renderFavoritesRail(records);

  const stats = `
    <dl class="hero-stats">
      <div><dt>Specimens</dt><dd>${records.length}</dd></div>
      <div><dt>Models</dt><dd>${models.length}</dd></div>
      <div><dt>Skills</dt><dd>${skills.length}</dd></div>
    </dl>`;

  const jumpNav = records.length
    ? `<nav class="jump-nav" aria-label="Direct jump navigation">
    <span class="jump-nav__label">JUMP TO:</span>
    <a class="jump-chip" href="#records">Specimens (${records.length})</a>
    <a class="jump-chip" href="#models">Models (${models.length})</a>
    <a class="jump-chip" href="#skills">Skills (${skills.length})</a>
    <a class="jump-chip" href="#filing">Filing Process</a>
  </nav>`
    : "";

  const cardsSection = records.length
    ? `<section class="section" id="records">
  <h2>The specimens (${records.length})</h2>
  <p class="section-lede">Click a card to open the real thing. INFO slides out the file: prompt, model, skill, provenance.</p>
  <div class="card-grid">
${records.map((record, index) => renderCard(record, index + 1)).join("\n")}
  </div>
</section>
${records.map((record, index) => renderDrawer(record, index + 1)).join("\n")}`
    : `<section class="section" id="records">
  <h2>The specimens (0)</h2>
  <div class="empty-vault">
    <p>VAULT STATUS: EMPTY.</p>
    <p>No specimens on the shelf yet. File the first one through the local Studio workbench, then rebuild.</p>
  </div>
</section>`;

  const modelsSection = models.length
    ? `<section class="section" id="models">
  <h2>Models on record</h2>
  <ul class="tally-list">
${models.map(([name, count]) => `    <li><span class="pill">[ ${escapeHtml(name)} ]</span><strong>${count}</strong></li>`).join("\n")}
  </ul>
</section>`
    : "";

  const skillsSection = skills.length
    ? `<section class="section" id="skills">
  <h2>Skills &amp; systems applied</h2>
  <ul class="tally-list">
${skills.map(([name, count]) => `    <li><span class="pill">[ ${escapeHtml(name)} ]</span><strong>${count}</strong></li>`).join("\n")}
  </ul>
</section>`
    : "";

  const title = "Specimen Vault | Lemonteed";
  const description =
    "The Lemonteed Specimen Vault: generated HTML pages pinned as-is, with the prompt, model, and skill behind each one. Open any specimen straight in the browser.";
  const ogImage = `${SITE_URL}/images/og/specimens.webp`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Lemonteed Specimen Vault",
    description: `Hand-filed generated HTML specimens with prompts, models, and skills. Currently ${records.length} published specimens.`,
    url: `${SITE_URL}/specimens/`,
    creator: {
      "@type": "Organization",
      name: "Lemonteed",
      url: `${SITE_URL}/`
    },
    variableMeasured: ["Prompt", "Model", "Skill", "Sandboxed source"]
  };

  return `${pageHead({ title, description, canonical: `${SITE_URL}/specimens/`, ogImage, jsonLd })}
<body>
${masthead("SPECIMEN VAULT")}
<main id="content">
<section class="hero">
  <p class="eyebrow">THE WORKBENCH / OUTPUT FILING CABINET</p>
  <h1>Every page, pinned to the board.</h1>
  <p>Finished HTML outputs, filed exactly as they came off the bench. The point of the place is the specimen itself &mdash; click one and see how it actually looks in a browser. The file card tells you what went into it.</p>
${stats}
</section>
${favoritesRail}
${jumpNav}
<section class="archive-note">
  <p><strong>What this is:</strong> a public filing cabinet for generated pages &mdash; every card opens the real file in your browser, with the prompt, model, and skill one INFO click away. <strong>What it is not:</strong> a leaderboard, a live demo host, or an endorsement of any model.</p>
</section>
${cardsSection}
${modelsSection}
${skillsSection}
<section class="section" id="filing">
  <h2>Filing process</h2>
  <ol class="process-list">
    <li>An HTML output is dropped into the local Studio workbench.</li>
    <li>The operator files it with a title, the full prompt, the model, and the skill or system used.</li>
    <li>Any photos or art the page needs are filed alongside it; references inside the HTML are rewritten to the archived copies.</li>
    <li>The vault sanitizes the file (strict content-security policy, scripts disabled) and pins it to the board.</li>
    <li>Nothing is edited after filing. Specimens are shown as they shipped.</li>
  </ol>
</section>
</main>
${footer()}
</body>
</html>
`;
}

/* ─── Build ──────────────────────────────────────────────── */

function buildSpecimens() {
  const data = loadSpecimens();
  const result = validateSpecimens(data);
  if (result.errors.length) {
    throw new Error(`Specimen Vault validation failed:\n- ${result.errors.join("\n- ")}`);
  }

  fs.mkdirSync(specimensDir, { recursive: true });

  // Legacy per-record pages are gone — clean them out if present.
  const legacyRecordsDir = path.join(specimensDir, "records");
  if (fs.existsSync(legacyRecordsDir)) {
    fs.rmSync(legacyRecordsDir, { recursive: true, force: true });
  }

  const records = publishable(data.records);

  fs.writeFileSync(path.join(specimensDir, "index.html"), renderIndexPage(data));

  return { count: records.length, indexPage: path.join(specimensDir, "index.html"), warnings: result.warnings };
}

module.exports = {
  contentFile,
  specimensDir,
  STATUSES,
  PUBLIC_STATUS,
  loadSpecimens,
  validateSpecimens,
  sanitizeSpecimenHtml,
  applyAssetMap,
  publishable,
  renderFavoritesRail,
  buildSpecimens,
  asText
};

if (require.main === module) {
  try {
    const result = buildSpecimens();
    console.log(`Specimen Vault built: ${result.count} published specimen(s), index refreshed.`);
    result.warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
