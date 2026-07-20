const fs = require("node:fs");
const path = require("node:path");
const { assertSafePublicUrl, assertSafeRelativeAssetPath, hasText } = require("./security-utils");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "junk-drawer.json");
const htmlFile = path.join(root, "junk-drawer", "index.html");
const startMarker = "<!-- EXTERNAL_TOOLS_START -->";
const endMarker = "<!-- EXTERNAL_TOOLS_END -->";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "external-tool";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateExternalTools(data) {
  const errors = [];
  if (!data || typeof data !== "object" || !Array.isArray(data.externalTools)) {
    return { errors: ["externalTools must be an array."] };
  }

  const ids = new Set();
  data.externalTools.forEach((tool, index) => {
    const label = `externalTools[${index}]`;
    if (!tool || typeof tool !== "object") {
      errors.push(`${label} must be an object.`);
      return;
    }
    ["id", "name", "description", "image", "url"].forEach((field) => {
      if (!hasText(tool[field])) errors.push(`${label}.${field} is required.`);
    });
    if (hasText(tool.id)) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(tool.id)) errors.push(`${label}.id must be lowercase kebab-case.`);
      if (ids.has(tool.id)) errors.push(`${label}.id must be unique.`);
      ids.add(tool.id);
    }
    if (hasText(tool.url)) {
      try { assertSafePublicUrl(tool.url, `${label}.url`); } catch (error) { errors.push(error.message); }
    }
    if (hasText(tool.image)) {
      try {
        const safeImage = assertSafeRelativeAssetPath(tool.image, `${label}.image`);
        const relativeImage = safeImage.replace(/^\//, "");
        if (!fs.existsSync(path.join(root, relativeImage))) errors.push(`${label}.image does not exist: ${safeImage}`);
      } catch (error) { errors.push(error.message); }
    }
    if (typeof tool.affiliate !== "boolean") errors.push(`${label}.affiliate must be a boolean.`);
    if (tool.credit) {
      if (typeof tool.credit !== "object" || !hasText(tool.credit.name) || !hasText(tool.credit.url)) {
        errors.push(`${label}.credit requires name and url.`);
      } else {
        try { assertSafePublicUrl(tool.credit.url, `${label}.credit.url`); } catch (error) { errors.push(error.message); }
      }
    }
  });
  return { errors };
}

function loadJunkDrawer() {
  return JSON.parse(fs.readFileSync(contentFile, "utf8"));
}

function renderTool(tool) {
  const rel = tool.affiliate ? "noopener sponsored" : "noopener";
  const type = tool.affiliate ? "Sponsored" : "External Find";
  const affiliateMeta = tool.affiliate ? "<li>Affiliate link</li>" : "";
  const credit = tool.credit
    ? `<p class="junk-drawer-card__credit">Credit: <a href="${escapeHtml(tool.credit.url)}" target="_blank" rel="noopener">${escapeHtml(tool.credit.name)} <span aria-hidden="true">&#8599;</span><span class="visually-hidden">, leaves Lemonteed</span></a></p>`
    : "";
  return `                <article class="junk-drawer-card junk-drawer-card--external${tool.affiliate ? " junk-drawer-card--affiliate" : ""}">
                  <a class="junk-drawer-card__main" href="${escapeHtml(tool.url)}" target="_blank" rel="${rel}" aria-label="Visit ${escapeHtml(tool.name)}, external site">
                    <div class="junk-drawer-card__visual junk-drawer-card__visual--external" aria-hidden="true">
                      <img src="${escapeHtml(tool.image)}" alt="Preview image for ${escapeHtml(tool.name)}" width="400" height="300">
                    </div>
                    <span class="junk-drawer-card__type">${type}</span>
                    <h4>${escapeHtml(tool.name)}</h4>
                    <p>${escapeHtml(tool.description)}</p>
                    <ul class="junk-drawer-card__meta" aria-label="${escapeHtml(tool.name)} notes">${affiliateMeta}</ul>
                    <span class="junk-drawer-card__cta junk-drawer-card__cta--external">Visit external site <span aria-hidden="true">&#8599;</span><span class="visually-hidden">, leaves Lemonteed${tool.affiliate ? ", affiliate link" : ""}</span></span>
                  </a>
                  ${credit}
                </article>`;
}

function buildJunkDrawer() {
  const data = loadJunkDrawer();
  const result = validateExternalTools(data);
  if (result.errors.length) throw new Error(`Junk Drawer validation failed:\n- ${result.errors.join("\n- ")}`);
  const html = fs.readFileSync(htmlFile, "utf8");
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start < 0 || end < 0 || end < start) throw new Error("Junk Drawer external tools markers are missing or out of order.");
  const rendered = data.externalTools.map(renderTool).join("\n\n");
  const next = `${html.slice(0, start + startMarker.length)}\n${rendered}\n              ${html.slice(end)}`;
  if (next !== html) fs.writeFileSync(htmlFile, next);
  return { data, htmlFile, count: data.externalTools.length };
}

if (require.main === module) {
  const result = buildJunkDrawer();
  console.log(`Built ${path.relative(root, result.htmlFile).replace(/\\/g, "/")} with ${result.count} external tool(s).`);
}

module.exports = { contentFile, htmlFile, loadJunkDrawer, validateExternalTools, buildJunkDrawer, slugify };
