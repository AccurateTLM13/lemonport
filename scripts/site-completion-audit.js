#!/usr/bin/env node
/**
 * Site Completion + SEO Readiness Audit
 *
 * Reusable multi-track auditor for the Lemonteed static site.
 * Tracks: inventory, interactions, content, SEO, code reality, validation.
 *
 * Usage:
 *   node scripts/site-completion-audit.js
 *   node scripts/site-completion-audit.js --base http://127.0.0.1:5173
 *   node scripts/site-completion-audit.js --json
 */

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");

const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const baseIndex = args.indexOf("--base");
const baseUrl = baseIndex >= 0 ? args[baseIndex + 1] : "http://127.0.0.1:5173";

const PUBLIC_HTML_GLOBS = [
  "index.html",
  "archive/index.html",
  "vrg-cards/index.html",
  "what-if/index.html",
  "misc-gens/index.html",
  "memetic-warfare/index.html",
  "memetic-warfare/live-experiment/index.html",
  "live-experiment/index.html",
  "junk-drawer/index.html",
  "junk-drawer/image-converter/index.html",
  "junk-drawer/image-compressor/index.html",
  "junk-drawer/character-supply/index.html",
  "junk-drawer/list-mechanic/index.html",
  "studio-lab/index.html",
  "ai-license/index.html",
  "ai-access/index.html",
  "lemonteed-fm/index.html",
  "lighthouse-handoff/index.html",
  "lemon-dom/index.html",
  "lemon-dom-repo/index.html",
  "lemon-lab/clanker-cloud-run/index.html",
  "million-dollar-receipt/index.html",
  "million-dollar-receipt/receipt/index.html",
  "operator-log/index.html",
  "hashbrownpro/wafflehousepro.html"
];

const findings = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  unverified: []
};

function add(severity, issue) {
  findings[severity].push(issue);
}

function readFile(relPath) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) {
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        timeout: 8000
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
    req.end();
  });
}

function routeFromHtmlPath(relPath) {
  if (relPath === "index.html") {
    return "/";
  }
  if (relPath.endsWith("/index.html")) {
    return `/${relPath.slice(0, -"index.html".length)}`;
  }
  return `/${relPath}`;
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<title>([^<]*)</title>`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']`, "i"),
    new RegExp(`<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return "";
}

function extractInternalHrefs(html) {
  const hrefs = [];
  const re = /<a\b[^>]*href=["']([^"'#?][^"']*)["']/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    if (href.startsWith("/")) {
      hrefs.push(href);
    }
  }
  return hrefs;
}

function normalizeRoute(href) {
  if (!href.startsWith("/")) {
    return href;
  }
  const noQuery = href.split("?")[0].split("#")[0];
  if (noQuery.endsWith(".html")) {
    return noQuery;
  }
  if (!noQuery.endsWith("/")) {
    return `${noQuery}/`;
  }
  return noQuery;
}

async function trackPageInventory() {
  const inventory = [];
  for (const rel of PUBLIC_HTML_GLOBS) {
    const html = readFile(rel);
    if (!html) {
      add("critical", {
        track: "page-inventory",
        file: rel,
        issue: "Expected public HTML file is missing from repo",
        element: "page",
        fix: `Restore or remove references to ${rel}`
      });
      continue;
    }

    const route = routeFromHtmlPath(rel);
    const links = extractInternalHrefs(html).length;
    const buttons = (html.match(/<button\b/gi) || []).length;
    const forms = (html.match(/<form\b/gi) || []).length;
    const scripts = (html.match(/<script[^>]+src=/gi) || []).length;
    const comingSoonScope = /data-coming-soon-scope/.test(html);
    const comingSoonDirect = /data-coming-soon(?!-scope|-ignore|-message)/.test(html);
    const noindex = /noindex/i.test(html);

    inventory.push({
      file: rel,
      route,
      links,
      buttons,
      forms,
      scripts,
      comingSoonScope,
      comingSoonDirect,
      noindex
    });

    if (comingSoonScope) {
      add("high", {
        track: "interaction-audit",
        file: rel,
        route,
        issue: "Page uses data-coming-soon-scope — all scoped links/buttons show a popup instead of navigating",
        element: "main[data-coming-soon-scope]",
        fix: "Remove scope when page is live, or mark only unfinished CTAs with data-coming-soon"
      });
    }

    const hasInfoOpen = /data-info-open/.test(html);
    const hasInfoDrawer = /data-info\b/.test(html);
    const loadsGalleryJs = /gallery\.js/.test(html);
    if (hasInfoOpen && (!hasInfoDrawer || !loadsGalleryJs)) {
      add("high", {
        track: "interaction-audit",
        file: rel,
        route,
        issue: "+ INFO button present but info drawer markup or gallery.js handler is missing",
        element: "[data-info-open]",
        fix: "Add info drawer markup and gallery.js, or remove the dead button"
      });
    }
  }
  return inventory;
}

async function trackInteractionAudit(inventory) {
  const knownRoutes = new Set(inventory.map((page) => page.route));
  knownRoutes.add("/site.webmanifest");

  for (const page of inventory) {
    const html = readFile(page.file);
    const hrefs = extractInternalHrefs(html);
    for (const href of hrefs) {
      const route = normalizeRoute(href);
      if (route.startsWith("/images/") || route.startsWith("/assets/") || route.startsWith("/content/")) {
        continue;
      }

      const asFile = route.endsWith("/") ? `${route.slice(1)}index.html` : route.slice(1);
      const exists =
        knownRoutes.has(route) ||
        fs.existsSync(path.join(root, asFile)) ||
        fs.existsSync(path.join(root, route.slice(1)));

      if (!exists) {
        const severity = page.file === "live-experiment/index.html" ? "critical" : "high";
        add(severity, {
          track: "interaction-audit",
          file: page.file,
          route: page.route,
          issue: `Broken internal link: ${href}`,
          element: `a[href="${href}"]`,
          fix: `Create route ${route} or update link target`
        });
      }
    }
  }

  const worldMap = readFile("assets/js/world-map.js");
  if (worldMap && /event\.preventDefault\(\)/.test(worldMap) && !/drawerZoneId\s*===\s*zone\.id/.test(worldMap)) {
    add("medium", {
      track: "interaction-audit",
      file: "assets/js/world-map.js",
      route: "/",
      issue: "Homepage zone clicks are intercepted; navigation requires opening drawer then clicking Enter CTA",
      element: ".zone[data-zone]",
      fix: "Allow direct navigation on second click, or add visible instruction that zones open a preview drawer first"
    });
  }

  const mdrConfig = readFile("assets/js/mdr-config.js");
  const mdrLaunched = mdrConfig && /"launched":\s*true/.test(mdrConfig);
  if (mdrConfig && /"apiBase":\s*""/.test(mdrConfig) && mdrLaunched) {
    add("critical", {
      track: "code-reality",
      file: "assets/js/mdr-config.js",
      route: "/million-dollar-receipt/",
      issue: "Production MDR apiBase is empty; client falls back to http://127.0.0.1:8787 for checkout and stats",
      element: "window.mdrConfig.apiBase",
      fix: "Set apiBase to deployed Worker/API URL in content/million-dollar-receipt.json and rebuild"
    });
  }
}

function trackContentCompleteness(inventory) {
  for (const page of inventory) {
    const html = readFile(page.file);
    if (!html) {
      continue;
    }

    const emptyAltImages = html.match(/<img[^>]+alt=["']\s*["'][^>]*>/gi) || [];
    const emptyAlts = emptyAltImages.filter((tag) => {
      return !/\baria-hidden=["']true["']/i.test(tag) &&
        !/\brole=["']presentation["']/i.test(tag) &&
        !/\bdata-lightbox-image\b/i.test(tag) &&
        !/\bdata-player-art\b/i.test(tag);
    }).length;
    if (emptyAlts > 0 && !page.noindex) {
      add("medium", {
        track: "content-completeness",
        file: page.file,
        route: page.route,
        issue: `${emptyAlts} image(s) with empty alt text on indexable page`,
        element: "img[alt=\"\"]",
        fix: "Add descriptive alt text or aria-hidden for decorative images"
      });
    }

    if (/Setup Phase|coming soon|COMING SOON|starts in June 2026/i.test(html) && page.route === "/live-experiment/" && !page.noindex) {
      add("medium", {
        track: "content-completeness",
        file: page.file,
        route: page.route,
        issue: "Live Experiment page is publicly indexed but content states setup phase / pre-launch",
        element: ".experiment-intro, .metadata-strip",
        fix: "Either launch content and remove coming-soon scope, or add noindex until experiment is live"
      });
    }

    if (/Local AI experiment in progress/i.test(html)) {
      add("low", {
        track: "content-completeness",
        file: page.file,
        route: page.route,
        issue: "Lighthouse Handoff badge says experiment in progress while Chrome Web Store CTA is live",
        element: ".lh-badge--status",
        fix: "Update status badge to reflect published extension state"
      });
    }
  }
}

function trackSeoReadiness(inventory) {
  const sitemap = readFile("sitemap.xml") || "";
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    try {
      return new URL(m[1]).pathname;
    } catch {
      return m[1];
    }
  });

  const redirectPages = new Set(["/memetic-warfare/live-experiment/"]);
  const indexablePages = inventory.filter((p) => !p.noindex && !redirectPages.has(p.route));
  for (const page of indexablePages) {
    const html = readFile(page.file);
    const title = extractMeta(html, "title");
    const description = extractMeta(html, "description");
    const canonical = extractMeta(html, "canonical");
    const hasOgImage = /og:image/i.test(html);
    const hasTwitter = /twitter:card/i.test(html);
    const hasSchema = /application\/ld\+json|schema\.org/i.test(html);

    if (!title) {
      add("high", { track: "seo", file: page.file, route: page.route, issue: "Missing <title>", element: "head", fix: "Add unique title" });
    }
    if (!description) {
      add("high", { track: "seo", file: page.file, route: page.route, issue: "Missing meta description", element: "meta[name=description]", fix: "Add page-specific description" });
    }
    if (!canonical) {
      add("high", { track: "seo", file: page.file, route: page.route, issue: "Missing canonical URL", element: "link[rel=canonical]", fix: "Add canonical link" });
    }
    if (!hasOgImage) {
      add("medium", { track: "seo", file: page.file, route: page.route, issue: "Missing Open Graph image tags", element: "meta[property=og:image]", fix: "Add og:image and twitter:image" });
    }
    if (!hasTwitter) {
      add("medium", { track: "seo", file: page.file, route: page.route, issue: "Missing Twitter card tags", element: "meta[name=twitter:card]", fix: "Add twitter:card metadata" });
    }
    if (!hasSchema) {
      add("low", { track: "seo", file: page.file, route: page.route, issue: "No JSON-LD structured data", element: "head", fix: "Add WebSite, SoftwareApplication, or CollectionPage schema where appropriate" });
    }

    const normalized = page.route.endsWith("/") ? page.route : `${page.route}/`;
    if (!sitemapUrls.includes(normalized) && !sitemapUrls.includes(page.route)) {
      add("high", {
        track: "seo",
        file: page.file,
        route: page.route,
        issue: "Indexable public page missing from sitemap.xml",
        element: "sitemap.xml",
        fix: `Add https://lemonteed.com${normalized} to sitemap.xml`
      });
    }
  }

  const robots = readFile("robots.txt") || "";
  if (!/Sitemap:/i.test(robots)) {
    add("high", { track: "seo", file: "robots.txt", issue: "robots.txt missing Sitemap directive", fix: "Add Sitemap: https://lemonteed.com/sitemap.xml" });
  }

  if (sitemapUrls.includes("/live-experiment/")) {
    add("high", {
      track: "seo",
      file: "sitemap.xml",
      issue: "live-experiment/ is archived and should not appear in sitemap.xml",
      fix: "Remove /live-experiment/ from sitemap.xml"
    });
  }
}

function trackCodeReality() {
  const grepPatterns = [
    { pattern: /data-coming-soon-scope/, label: "coming-soon scope wrappers" }
  ];

  for (const rel of ["assets/js/mdr-config.js", "content/million-dollar-receipt.json"]) {
    const content = readFile(rel);
    if (!content) {
      continue;
    }
    for (const item of grepPatterns) {
      if (item.pattern.test(content)) {
        add("medium", {
          track: "code-reality",
          file: rel,
          issue: `Config contains ${item.label}`,
          fix: "Verify production deployment config before go-live"
        });
      }
    }
  }

  const lemonDomRepo = readFile("lemon-dom-repo/index.html");
  if (lemonDomRepo && !/noindex/i.test(lemonDomRepo)) {
    add("low", {
      track: "code-reality",
      file: "lemon-dom-repo/index.html",
      issue: "Duplicate Lemon DOM page exists at lemon-dom-repo/ alongside public lemon-dom/",
      fix: "Consolidate or noindex the duplicate if not meant for production"
    });
  }
}

async function trackValidation(inventory) {
  let serverUp = false;
  try {
    const res = await fetchUrl(`${baseUrl}/`);
    serverUp = res.status === 200;
  } catch {
    add("unverified", {
      track: "validation",
      issue: `Could not reach dev server at ${baseUrl} for live route checks`,
      fix: "Run node scripts/studio-server.js and re-run audit"
    });
    return;
  }

  for (const page of inventory) {
    const url = `${baseUrl}${page.route === "/" ? "/" : page.route}`;
    try {
      const res = await fetchUrl(url);
      if (res.status !== 200) {
        add("critical", {
          track: "validation",
          file: page.file,
          route: page.route,
          issue: `Live route returned HTTP ${res.status}`,
          fix: "Fix server routing or restore page file"
        });
      }

      const scriptSrcs = [...(readFile(page.file).matchAll(/<script[^>]+src=["']([^"']+)["']/gi) || [])].map((m) => m[1]);
      for (const src of scriptSrcs) {
        if (!src.startsWith("/")) {
          continue;
        }
        const assetRes = await fetchUrl(`${baseUrl}${src.split("?")[0]}`);
        if (assetRes.status !== 200) {
          add("critical", {
            track: "validation",
            file: page.file,
            route: page.route,
            issue: `Missing script asset ${src} (HTTP ${assetRes.status})`,
            element: `script[src="${src}"]`,
            fix: "Restore asset or update script reference"
          });
        }
      }
    } catch (error) {
      add("unverified", {
        track: "validation",
        file: page.file,
        route: page.route,
        issue: `Route check failed: ${error.message}`
      });
    }
  }
}

function assembleReport(inventory) {
  const totalIssues =
    findings.critical.length +
    findings.high.length +
    findings.medium.length +
    findings.low.length;

  const visuallyComplete = totalIssues === 0;
  const summary = visuallyComplete
    ? "Pages appear complete and verified."
    : "Site is visually polished but has hidden completeness, SEO, and interaction gaps before a confident go-live.";

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    pageCount: inventory.length,
    summary,
    visuallyCompleteOnly: !visuallyComplete,
    inventory,
    findings,
    counts: {
      critical: findings.critical.length,
      high: findings.high.length,
      medium: findings.medium.length,
      low: findings.low.length,
      unverified: findings.unverified.length
    }
  };
}

function printReport(report) {
  console.log("=".repeat(72));
  console.log("SITE COMPLETION + SEO READINESS AUDIT");
  console.log("=".repeat(72));
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Pages inventoried: ${report.pageCount}`);
  console.log(`Base URL tested: ${report.baseUrl}`);
  console.log("");
  console.log("SUMMARY");
  console.log(report.summary);
  console.log(`Visually complete only: ${report.visuallyCompleteOnly ? "YES" : "NO"}`);
  console.log("");

  for (const severity of ["critical", "high", "medium", "low", "unverified"]) {
    const items = report.findings[severity];
    if (!items.length) {
      continue;
    }
    console.log("-".repeat(72));
    console.log(`${severity.toUpperCase()} (${items.length})`);
    console.log("-".repeat(72));
    items.forEach((item, index) => {
      console.log(`${index + 1}. [${item.track || "general"}] ${item.issue}`);
      if (item.file) {
        console.log(`   File: ${item.file}`);
      }
      if (item.route) {
        console.log(`   Route: ${item.route}`);
      }
      if (item.element) {
        console.log(`   Element: ${item.element}`);
      }
      if (item.fix) {
        console.log(`   Fix: ${item.fix}`);
      }
      console.log("");
    });
  }
}

async function main() {
  const inventory = await trackPageInventory();
  await trackInteractionAudit(inventory);
  trackContentCompleteness(inventory);
  trackSeoReadiness(inventory);
  trackCodeReality();
  await trackValidation(inventory);

  const report = assembleReport(inventory);

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  process.exit(report.counts.critical > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
