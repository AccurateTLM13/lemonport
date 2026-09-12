#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const seoFile = path.join(root, "content", "seo.json");
const ogDir = path.join(root, "images", "og");
const tmpDir = path.join(root, ".tmp-screenshots");

fs.mkdirSync(ogDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

/**
 * Locate a Chromium-based browser executable (Edge or Chrome).
 */
function findBrowserPath() {
  const candidates = [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  return candidates.find((c) => fs.existsSync(c)) || "";
}

/**
 * Extra standalone pages not directly listed in content/seo.json.
 */
const EXTRA_PAGES = [
  {
    key: "404-therapy",
    label: "404 Therapy",
    urlPath: "the-wrong-internet/404-therapy/",
    ogImage: "/images/og/404-therapy.webp",
  },
];

/**
 * Asynchronously run an external command using spawn so the Node.js event loop
 * remains free to serve incoming HTTP requests (preventing self-fetch deadlocks).
 */
function runProcessAsync(cmd, args, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "ignore" });
    let timer = setTimeout(() => {
      try {
        proc.kill();
      } catch (_) {}
      reject(new Error(`Process "${cmd}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process "${cmd}" exited with code ${code}`));
      }
    });
  });
}

/**
 * Capture a page with headless Chromium at 1440x900 and convert to a crisp 1200x630 WebP card (Style A).
 */
async function capturePageScreenshot(browserPath, pageUrl, outWebpPath, options = {}) {
  const profileDir = path.join(tmpDir, `profile-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  const rawPng = path.join(tmpDir, `raw-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`);

  try {
    fs.mkdirSync(profileDir, { recursive: true });

    // Step 1: Headless capture at desktop width (1440x900)
    await runProcessAsync(
      browserPath,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-crash-reporter",
        "--no-first-run",
        "--no-default-browser-check",
        "--run-all-compositor-stages-before-draw",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1440,900",
        "--virtual-time-budget=3000",
        `--user-data-dir=${profileDir}`,
        `--screenshot=${rawPng}`,
        pageUrl,
      ],
      45000
    );

    if (!fs.existsSync(rawPng) || fs.statSync(rawPng).size === 0) {
      throw new Error(`Browser failed to produce screenshot for ${pageUrl}`);
    }

    // Step 2: Crop & resize with ImageMagick to 1200x630 WebP (quality 85)
    // Scale 1440 down to 1200 width (1200x750), crop top 630px
    await runProcessAsync(
      "magick",
      [
        rawPng,
        "-resize", "1200x",
        "-gravity", "North",
        "-crop", "1200x630+0+0",
        "+repage",
        "-quality", "85",
        outWebpPath,
      ],
      30000
    );

    if (!fs.existsSync(outWebpPath) || fs.statSync(outWebpPath).size === 0) {
      throw new Error(`ImageMagick failed to produce ${outWebpPath}`);
    }

    const stat = fs.statSync(outWebpPath);
    return { success: true, path: outWebpPath, sizeBytes: stat.size };
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(rawPng)) fs.unlinkSync(rawPng);
      if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

/**
 * Capture OG screenshot for a specific page key.
 */
async function captureOgCard(key, options = {}) {
  const browserPath = findBrowserPath();
  if (!browserPath) {
    throw new Error("No Chromium or Edge executable found on this system.");
  }

  const port = options.port || process.env.PORT || 5173;
  const baseUrl = `http://localhost:${port}`;

  let target = null;
  const seoData = JSON.parse(fs.readFileSync(seoFile, "utf8"));
  const seoEntry = seoData.find((p) => p.key === key);

  if (seoEntry) {
    const route = seoEntry.htmlPath === "index.html" ? "" : seoEntry.htmlPath.replace(/index\.html$/, "");
    target = {
      key: seoEntry.key,
      label: seoEntry.label || seoEntry.key,
      url: `${baseUrl}/${route}`,
      ogImage: seoEntry.ogImage,
      twitterImage: seoEntry.twitterImage,
    };
  } else {
    const extra = EXTRA_PAGES.find((p) => p.key === key);
    if (extra) {
      target = {
        key: extra.key,
        label: extra.label,
        url: `${baseUrl}/${extra.urlPath}`,
        ogImage: extra.ogImage,
        twitterImage: extra.ogImage,
      };
    }
  }

  if (!target) {
    throw new Error(`Page key "${key}" not found in seo.json or extra pages.`);
  }

  const primaryOut = path.join(root, target.ogImage.replace(/^\//, ""));
  console.log(`[OG-CAPTURE] Capturing "${target.label}" (${target.url}) -> ${target.ogImage}...`);

  const result = await capturePageScreenshot(browserPath, target.url, primaryOut, options);

  // If twitterImage is defined and points to a different file in /images/og/, keep it updated too
  if (target.twitterImage && target.twitterImage !== target.ogImage) {
    const twitterOut = path.join(root, target.twitterImage.replace(/^\//, ""));
    fs.copyFileSync(primaryOut, twitterOut);
    console.log(`[OG-CAPTURE] Synced twitter:image copy -> ${target.twitterImage}`);
  }

  console.log(`[OG-CAPTURE] ✓ Done: ${(result.sizeBytes / 1024).toFixed(1)} KB`);
  return { success: true, key, url: target.ogImage, sizeBytes: result.sizeBytes };
}

/**
 * Capture OG screenshots for all registered pages.
 */
async function captureAllOgCards(options = {}) {
  const browserPath = findBrowserPath();
  if (!browserPath) {
    throw new Error("No Chromium or Edge executable found on this system.");
  }

  const port = options.port || process.env.PORT || 5173;
  const seoData = JSON.parse(fs.readFileSync(seoFile, "utf8"));

  const allTargets = [
    ...seoData.map((e) => ({
      key: e.key,
      label: e.label || e.key,
      url: `http://localhost:${port}/${e.htmlPath === "index.html" ? "" : e.htmlPath.replace(/index\.html$/, "")}`,
      ogImage: e.ogImage,
      twitterImage: e.twitterImage,
    })),
    ...EXTRA_PAGES.map((e) => ({
      key: e.key,
      label: e.label,
      url: `http://localhost:${port}/${e.urlPath}`,
      ogImage: e.ogImage,
      twitterImage: e.ogImage,
    })),
  ];

  console.log(`[OG-CAPTURE] Starting batch capture for ${allTargets.length} pages on port ${port}...`);
  const results = [];

  for (const target of allTargets) {
    try {
      const primaryOut = path.join(root, target.ogImage.replace(/^\//, ""));
      console.log(`[OG-CAPTURE] (${results.length + 1}/${allTargets.length}) ${target.key}: ${target.url}`);
      const res = await capturePageScreenshot(browserPath, target.url, primaryOut, options);

      if (target.twitterImage && target.twitterImage !== target.ogImage) {
        const twitterOut = path.join(root, target.twitterImage.replace(/^\//, ""));
        fs.copyFileSync(primaryOut, twitterOut);
      }

      results.push({ success: true, key: target.key, sizeBytes: res.sizeBytes });
      console.log(`[OG-CAPTURE]   ✓ ${(res.sizeBytes / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`[OG-CAPTURE]   ✗ Failed:`, err.message);
      results.push({ success: false, key: target.key, error: err.message });
    }
  }

  // Cleanup tmpDir if empty
  try {
    const remaining = fs.readdirSync(tmpDir);
    if (remaining.length === 0) fs.rmdirSync(tmpDir);
  } catch (_) {}

  return results;
}

module.exports = {
  findBrowserPath,
  capturePageScreenshot,
  captureOgCard,
  captureAllOgCards,
};

// CLI execution
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const pageArg = args.find((a) => a.startsWith("--page="));
    const portArg = args.find((a) => a.startsWith("--port="));
    const isAll = args.includes("--all");
    const port = portArg ? parseInt(portArg.split("=")[1], 10) : 5173;

    if (pageArg) {
      const pageKey = pageArg.split("=")[1];
      await captureOgCard(pageKey, { port });
    } else if (isAll || args.length === 0) {
      const results = await captureAllOgCards({ port });
      const successCount = results.filter((r) => r.success).length;
      console.log(`\n[OG-CAPTURE] Completed: ${successCount}/${results.length} captured successfully.`);

      // Run build-seo.js to sync meta tags
      try {
        console.log("\n[OG-CAPTURE] Synchronizing HTML metadata via build-seo.js...");
        execFileSync("node", [path.join(__dirname, "build-seo.js")], { stdio: "inherit" });
      } catch (err) {
        console.error("[OG-CAPTURE] Warning: build-seo failed:", err.message);
      }
    } else {
      console.log("Usage: node scripts/capture-og-screenshots.js [--all | --page=<key>] [--port=5173]");
    }
  })().catch((err) => {
    console.error("[OG-CAPTURE] Error:", err.message);
    process.exit(1);
  });
}
