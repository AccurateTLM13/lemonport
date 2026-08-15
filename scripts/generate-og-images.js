#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const seoFile = path.join(root, "content", "seo.json");
const ogDir = path.join(root, "images", "og");

// Ensure ogDir exists
fs.mkdirSync(ogDir, { recursive: true });

/**
 * Rich page configuration for psychological OG card generation.
 * Each entry configures archetype, eyebrow, custom punchy title, subtitle, badges, and visual asset.
 */
const PAGE_CONFIGS = {
  home: {
    archetype: "minimal-punch",
    eyebrow: "[ UNIVERSE ATLAS / SECTOR 00 ]",
    title: "Lemonteed",
    subtitle: "A pure static web universe of tools, games, songs, artifacts, and experimental internet objects.",
    badges: ["100% STATIC", "ZERO TRACKING", "VANILLA JS"],
    pose: "wave",
    statusText: "SYSTEMS ONLINE",
    statusColor: "#2e7d32",
    accentColor: "#ffc83b",
  },
  archive: {
    archetype: "zone-atlas",
    eyebrow: "[ ZONE 00 / ARCHIVE CAVERN ]",
    title: "Lemonteed Archive",
    subtitle: "The complete visual archive: VRG Cards, What If, Misc Gens, and experimental internet artifacts.",
    badges: ["80+ ARTIFACTS", "IMMUTABLE RECORD", "DEEP VAULT"],
    pose: "curious",
    statusText: "VAULT OPEN",
    statusColor: "#2e7d32",
    accentColor: "#ffc83b",
  },
  "vrg-cards": {
    archetype: "zone-atlas",
    eyebrow: "[ ZONE 05 / VRG VAULT ]",
    title: "VRG Cards",
    subtitle: "Procedural holographic card generator and speculative rarity artifacts.",
    badges: ["PROCEDURAL SHADERS", "INTERACTIVE 3D", "SPECULATIVE ASSETS"],
    pose: "working",
    statusText: "ACTIVE GENERATOR",
    statusColor: "#2e7d32",
    accentColor: "#3b82f6",
  },
  "what-if": {
    archetype: "zone-atlas",
    eyebrow: "[ ZONE 01 / WHAT IF WOODS ]",
    title: "What If Woods",
    subtitle: "Visual anomalies, cursed design forks, and speculative alternate universe interfaces.",
    badges: ["EXPLORATORY", "VISUAL EXPERIMENTS", "NO REGRETS"],
    pose: "thinking",
    statusText: "ANOMALIES DETECTED",
    statusColor: "#d97706",
    accentColor: "#ffc83b",
  },
  "misc-gens": {
    archetype: "zone-atlas",
    eyebrow: "[ ZONE 02 / MISC GENS ]",
    title: "Misc Gens",
    subtitle: "Specialized generative toys, procedural patterns, and browser-native canvas experiments.",
    badges: ["CANVAS EXPERIMENTS", "GENERATIVE LAB", "MATH & CHAOS"],
    pose: "working",
    statusText: "DISPATCHING",
    statusColor: "#2e7d32",
    accentColor: "#10b981",
  },
  "memetic-warfare": {
    archetype: "zone-atlas",
    eyebrow: "[ ZONE 03 / MEMETIC ARENA ]",
    title: "Memetic Warfare",
    subtitle: "Build a cursed ancient technology loadout and survive the tactical dungeon run.",
    badges: ["ROGUE-LITE", "CURSED HARDWARE", "ZERO FRAMEWORKS"],
    pose: "jump",
    statusText: "DUNGEON LIVE",
    statusColor: "#dc2626",
    accentColor: "#ef4444",
  },
  "junk-drawer": {
    archetype: "workbench",
    eyebrow: "[ DISTRICT 04 / JUNK DRAWER ]",
    title: "Junk Drawer",
    subtitle: "Free, private, browser-only utilities and oddities. The drawer that never quite closes.",
    badges: ["CLIENT-SIDE ONLY", "NO SERVERS", "ZERO TELEMETRY"],
    screenshot: "images/junk/free-source.webp",
    pose: "point",
    statusText: "UTILITIES READY",
    statusColor: "#2e7d32",
    accentColor: "#ffc83b",
  },
  "junk-drawer-image-converter": {
    archetype: "workbench",
    eyebrow: "[ JUNK DRAWER / TOOL 01 ]",
    title: "Browser Image Converter",
    subtitle: "Batch convert HEIC, PNG, JPEG, AVIF, SVG, and WebP instantly in your browser. 100% private.",
    badges: ["NO FILE UPLOADS", "CLIENT-SIDE WASM", "BATCH PROCESSING"],
    screenshot: "images/junk/image-converter.webp",
    statusText: "FAST & PRIVATE",
    statusColor: "#2e7d32",
    accentColor: "#3b82f6",
  },
  "junk-drawer-image-compressor": {
    archetype: "workbench",
    eyebrow: "[ JUNK DRAWER / TOOL 02 ]",
    title: "Browser Image Compressor",
    subtitle: "Squish image files down directly in your browser without shipping them to mystery servers.",
    badges: ["CLIENT-SIDE ONLY", "PNG / JPG / WEBP / AVIF", "ZERO QUALITY LOSS"],
    screenshot: "images/junk/image-compressor.webp",
    statusText: "PRIVATE SQUISH",
    statusColor: "#2e7d32",
    accentColor: "#10b981",
  },
  "junk-drawer-character-supply": {
    archetype: "workbench",
    eyebrow: "[ JUNK DRAWER / UTILITY ]",
    title: "Character Supply",
    subtitle: "A fast, ad-free HTML special character library, entities, unicode points, and CSS escapes.",
    badges: ["ONE-CLICK COPY", "HTML / UNICODE / CSS", "AD-FREE CHEATSHEET"],
    screenshot: "images/junk/character-supply.webp",
    statusText: "INSTANT COPY",
    statusColor: "#2e7d32",
    accentColor: "#8b5cf6",
  },
  "junk-drawer-list-mechanic": {
    archetype: "workbench",
    eyebrow: "[ JUNK DRAWER / REPAIR BENCH ]",
    title: "List Mechanic",
    subtitle: "Paste a messy list, repair and clean it locally in your browser, then copy or export clean results.",
    badges: ["DEDUPLICATE", "SORT & RE-INDEX", "ZERO SERVER TRIPS"],
    screenshot: "images/junk/list-mechanic.webp",
    statusText: "BENCH ONLINE",
    statusColor: "#2e7d32",
    accentColor: "#f59e0b",
  },
  "lighthouse-handoff": {
    archetype: "workbench",
    eyebrow: "[ DISTRICT 04 / DEV UTILITY ]",
    title: "Lighthouse Handoff",
    subtitle: "Turn PageSpeed Insights reports into structured, coding-agent-ready Markdown in one click.",
    badges: ["CHROME EXTENSION", "AI AGENT READY", "ZERO CONFIG"],
    screenshot: "images/lighthouse-handoff/lighthouse-handoff-card.webp",
    pose: "working",
    statusText: "SHIPPED V1.0",
    statusColor: "#2e7d32",
    accentColor: "#3b82f6",
  },
  "free-source": {
    archetype: "workbench",
    eyebrow: "[ LAB BENCH / PUBLIC LICENSE ]",
    title: "FreeSource License",
    subtitle: "A radically simple license: use the work for whatever you want. No permission. No payment. No strings.",
    badges: ["RADICALLY SIMPLE", "ZERO PERMISSION", "UNCONDITIONAL FREE"],
    screenshot: "images/junk/free-source.webp",
    pose: "point",
    statusText: "PUBLIC DOMAIN SPIRIT",
    statusColor: "#2e7d32",
    accentColor: "#10b981",
  },
  "lemon-dom": {
    archetype: "workbench",
    eyebrow: "[ LAB BENCH / UI EFFECTS ]",
    title: "Lemon DOM",
    subtitle: "Juicy UI effects for plain old websites: glass, glow, squeeze, zest, and peel. Zero dependencies.",
    badges: ["NO BUILD STEP", "VANILLA CSS/JS", "TINY FOOTPRINT"],
    screenshot: "images/junk/lemon-dom.webp",
    statusText: "FRESH JUICE",
    statusColor: "#2e7d32",
    accentColor: "#ffc83b",
  },
  "studio-lab": {
    archetype: "operator-log",
    eyebrow: "[ WORKSHOP / ACTIVE BENCH ]",
    title: "Studio Lab",
    subtitle: "Active builds, operator logs, shipped tools, and live experiments across the Lemonteed universe.",
    badges: ["WORKBENCH HUB", "DISPATCH LOGS", "PROJECT REGISTER"],
    pose: "working",
    statusText: "BENCH ACTIVE",
    statusColor: "#2e7d32",
    accentColor: "#ffc83b",
  },
  "lemonteed-fm": {
    archetype: "zone-atlas",
    eyebrow: "[ ZONE 06 / FM TOWER ]",
    title: "Lemonteed FM",
    subtitle: "A tiny static music discovery player for free-to-use tracks and questionable taste.",
    badges: ["FREE-TO-USE AUDIO", "CASSETTE DIAL", "NO SUBSCRIPTIONS"],
    pose: "celebrate",
    statusText: "BROADCASTING",
    statusColor: "#2e7d32",
    accentColor: "#ec4899",
  },
  benchmark: {
    archetype: "operator-log",
    eyebrow: "[ BENCHMARK ARCHIVE / BASELINE 001 ]",
    title: "Design Skill Benchmark",
    subtitle: "Inspectable evidence archive: 32 generated sites, 6 LLM models, 3 design systems, and 64 review frames.",
    badges: ["32 RECORDS", "64 REVIEW FRAMES", "100% AUDITABLE"],
    statusText: "BASELINE RECORDED",
    statusColor: "#3b82f6",
    accentColor: "#ffc83b",
  },
};

/**
 * Helper to encode local image files into base64 data URIs.
 */
function getBase64Asset(relPath) {
  if (!relPath) return null;
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(root, relPath);
  if (!fs.existsSync(absPath)) return null;
  const ext = path.extname(absPath).toLowerCase().replace(".", "");
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const data = fs.readFileSync(absPath).toString("base64");
  return `data:${mime};base64,${data}`;
}

/**
 * Escape text for SVG XML insertion.
 */
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Word wrap helper for SVG text.
 */
function wrapText(text, maxCharsPerLine = 32, maxLines = 3) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Render SVG for the "workbench" archetype (Tools & Utilities).
 */
function renderWorkbenchSvg(config) {
  const titleLines = wrapText(config.title, 24, 2);
  const subtitleLines = wrapText(config.subtitle, 42, 3);
  const screenshotData = getBase64Asset(config.screenshot);
  const poseData = config.pose ? getBase64Asset(`images/lemmy/poses/${config.pose}.webp`) : null;
  const statusColor = config.statusColor || "#2e7d32";
  const accentColor = config.accentColor || "#ffc83b";

  const titleSvg = titleLines
    .map((line, idx) => `<tspan x="70" dy="${idx === 0 ? 0 : 56}">${escapeXml(line)}</tspan>`)
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, idx) => `<tspan x="70" dy="${idx === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`)
    .join("");

  const badgesSvg = (config.badges || [])
    .map((badge, idx) => {
      const x = 70 + idx * 160;
      return `
      <g transform="translate(${x}, 470)">
        <rect width="148" height="28" rx="4" fill="#f4f2ea" stroke="#d7d3c8" stroke-width="1.5"/>
        <text x="74" y="18" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="bold" fill="#555148" text-anchor="middle" letter-spacing="0.5">${escapeXml(badge)}</text>
      </g>`;
    })
    .join("");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#ded9cc" />
    </pattern>
    <filter id="card-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#11100d" flood-opacity="0.16"/>
    </filter>
    <filter id="frame-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#11100d" flood-opacity="0.22"/>
    </filter>
    <clipPath id="browser-clip">
      <rect x="0" y="36" width="480" height="344" rx="0"/>
    </clipPath>
  </defs>

  <!-- Canvas Base -->
  <rect width="1200" height="630" fill="#f4f2ea"/>
  <rect width="1200" height="630" fill="url(#dot-grid)"/>

  <!-- Main Container Card -->
  <g filter="url(#card-shadow)">
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="#fbfaf6" stroke="#11100d" stroke-width="3"/>
  </g>

  <!-- Top Navigation/Header Strip -->
  <line x1="36" y1="96" x2="1164" y2="96" stroke="#e8e4d8" stroke-width="2"/>
  
  <!-- Brand Seal Left -->
  <g transform="translate(68, 56)">
    <rect width="24" height="24" rx="6" fill="${accentColor}" stroke="#11100d" stroke-width="2"/>
    <text x="12" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="900" fill="#11100d" text-anchor="middle">L</text>
    <text x="36" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#11100d" letter-spacing="1">LEMONTEED</text>
    <text x="145" y="17" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070">// WORKBENCH</text>
  </g>

  <!-- URL Watermark Right -->
  <text x="1132" y="73" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070" text-anchor="end">lemonteed.com</text>

  <!-- Left Column: Content -->
  <!-- Eyebrow Pill -->
  <g transform="translate(70, 130)">
    <rect width="240" height="28" rx="4" fill="#ffffff" stroke="#11100d" stroke-width="1.5"/>
    <text x="120" y="18" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" fill="#11100d" text-anchor="middle" letter-spacing="0.8">${escapeXml(config.eyebrow)}</text>
  </g>

  <!-- Title -->
  <text x="70" y="215" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#11100d">
    ${titleSvg}
  </text>

  <!-- Subtitle -->
  <text x="70" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="21" font-weight="400" fill="#5a564c" line-height="1.4">
    ${subtitleSvg}
  </text>

  <!-- Badges -->
  ${badgesSvg}

  <!-- Status Bar Bottom-Left -->
  <g transform="translate(70, 524)">
    <circle cx="8" cy="8" r="5" fill="${statusColor}"/>
    <text x="22" y="12" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="bold" fill="${statusColor}">${escapeXml(config.statusText || "READY")}</text>
  </g>

  <!-- Right Column: Browser Window Mockup -->
  <g transform="translate(640, 134)" filter="url(#frame-shadow)">
    <!-- Browser Outer Frame -->
    <rect width="480" height="380" rx="10" fill="#ffffff" stroke="#11100d" stroke-width="3"/>
    <!-- Browser Titlebar -->
    <rect width="480" height="36" rx="10" fill="#eeece2"/>
    <rect y="26" width="480" height="10" fill="#eeece2"/>
    <line x1="0" y1="36" x2="480" y2="36" stroke="#11100d" stroke-width="2"/>
    <!-- Window Controls -->
    <circle cx="20" cy="18" r="5" fill="#ef4444"/>
    <circle cx="36" cy="18" r="5" fill="#f59e0b"/>
    <circle cx="52" cy="18" r="5" fill="#10b981"/>
    <!-- Mini Address Bar -->
    <rect x="74" y="8" width="330" height="20" rx="4" fill="#ffffff" stroke="#d7d3c8" stroke-width="1"/>
    <text x="84" y="22" font-family="Consolas, 'Courier New', monospace" font-size="10" fill="#888070">lemonteed.com/${escapeXml(config.key || "tool")}</text>

    <!-- Inner Screenshot / Mock Content -->
    ${
      screenshotData
        ? `<image href="${screenshotData}" x="0" y="36" width="480" height="344" preserveAspectRatio="xMidYMid slice" clip-path="url(#browser-clip)"/>`
        : `<rect x="0" y="36" width="480" height="344" fill="#11100d" clip-path="url(#browser-clip)"/>
           <text x="240" y="210" font-family="Consolas, 'Courier New', monospace" font-size="16" fill="#888070" text-anchor="middle">[ TOOL VIEWPORT ]</text>`
    }
  </g>

  <!-- Mascot Accent Over Window -->
  ${
    poseData
      ? `<g transform="translate(1000, 390)">
          <image href="${poseData}" width="160" height="160" />
        </g>`
      : ""
  }
</svg>`;
}

/**
 * Render SVG for the "operator-log" archetype (Articles, Logs, Benchmarks).
 */
function renderOperatorLogSvg(config) {
  const titleLines = wrapText(config.title, 26, 2);
  const subtitleLines = wrapText(config.subtitle, 44, 3);
  const poseData = config.pose ? getBase64Asset(`images/lemmy/poses/${config.pose}.webp`) : null;
  const statusColor = config.statusColor || "#ffc83b";
  const accentColor = config.accentColor || "#ffc83b";

  const titleSvg = titleLines
    .map((line, idx) => `<tspan x="74" dy="${idx === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`)
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, idx) => `<tspan x="74" dy="${idx === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`)
    .join("");

  const badgesSvg = (config.badges || [])
    .map((badge, idx) => {
      const x = 74 + idx * 165;
      return `
      <g transform="translate(${x}, 470)">
        <rect width="152" height="30" rx="4" fill="#1c1a16" stroke="#38352e" stroke-width="1.5"/>
        <text x="76" y="19" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="bold" fill="#d7d3c8" text-anchor="middle" letter-spacing="0.5">${escapeXml(badge)}</text>
      </g>`;
    })
    .join("");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dark-grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1d1b17" stroke-width="1.2"/>
    </pattern>
    <filter id="dark-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Dark Canvas Base -->
  <rect width="1200" height="630" fill="#0d0c0a"/>
  <rect width="1200" height="630" fill="url(#dark-grid)"/>

  <!-- Main Container Card -->
  <g filter="url(#dark-shadow)">
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="#141310" stroke="#2b2822" stroke-width="2.5"/>
  </g>

  <!-- Top Terminal Header -->
  <line x1="36" y1="96" x2="1164" y2="96" stroke="#26231d" stroke-width="2"/>
  
  <!-- Brand Badge Left -->
  <g transform="translate(74, 56)">
    <rect width="24" height="24" rx="4" fill="${accentColor}"/>
    <text x="12" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="900" fill="#11100d" text-anchor="middle">L</text>
    <text x="36" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#f4f2ea" letter-spacing="1">LEMONTEED</text>
    <text x="145" y="17" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#ffc83b">// OPERATOR LOG</text>
  </g>

  <!-- Watermark Right -->
  <text x="1126" y="73" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070" text-anchor="end">lemonteed.com</text>

  <!-- Eyebrow Tag -->
  <g transform="translate(74, 130)">
    <rect width="290" height="28" rx="4" fill="#1f1d18" stroke="#ffc83b" stroke-width="1.5"/>
    <text x="145" y="18" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" fill="#ffc83b" text-anchor="middle" letter-spacing="0.8">${escapeXml(config.eyebrow)}</text>
  </g>

  <!-- Main Headline -->
  <text x="74" y="218" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="50" font-weight="800" fill="#f4f2ea">
    ${titleSvg}
  </text>

  <!-- Subtitle -->
  <text x="74" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="400" fill="#a8a396" line-height="1.4">
    ${subtitleSvg}
  </text>

  <!-- Badges -->
  ${badgesSvg}

  <!-- Status Line Bottom -->
  <g transform="translate(74, 526)">
    <circle cx="8" cy="8" r="5" fill="${statusColor}"/>
    <text x="22" y="12" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="bold" fill="${statusColor}">${escapeXml(config.statusText || "DISPATCH VERIFIED")}</text>
  </g>

  <!-- Technical Wireframe Window Right -->
  <g transform="translate(750, 134)">
    <rect width="370" height="380" rx="10" fill="#1a1814" stroke="#333028" stroke-width="2"/>
    <rect width="370" height="32" rx="10" fill="#22201b"/>
    <rect y="22" width="370" height="10" fill="#22201b"/>
    <line x1="0" y1="32" x2="370" y2="32" stroke="#333028" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="4" fill="#ff5f56"/>
    <circle cx="28" cy="16" r="4" fill="#ffbd2e"/>
    <circle cx="40" cy="16" r="4" fill="#27c93f"/>
    <text x="185" y="21" font-family="Consolas, 'Courier New', monospace" font-size="10" fill="#888070" text-anchor="middle">terminal_stdout.log</text>

    <!-- Terminal Lines -->
    <text x="24" y="70" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#ffc83b">&gt; operator --verify-dispatch</text>
    <text x="24" y="96" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#27c93f">[OK] Static artifacts compiled</text>
    <text x="24" y="122" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#a8a396">[OK] Evidence hashes validated</text>
    <text x="24" y="148" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#a8a396">[OK] Zero framework runtime</text>
    <text x="24" y="174" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#666154">---------------------------------</text>
    <text x="24" y="200" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#f4f2ea">READINESS: 100% COMPLETE</text>
    <text x="24" y="226" font-family="Consolas, 'Courier New', monospace" font-size="12" fill="#f4f2ea">STATUS: IMMUTABLE AUDIT</text>

    <!-- Mascot Graphic in terminal -->
    ${
      poseData
        ? `<g transform="translate(180, 200)">
            <image href="${poseData}" width="170" height="170" />
          </g>`
        : ""
    }
  </g>
</svg>`;
}

/**
 * Render SVG for the "zone-atlas" archetype (Hubs & Experiential Zones).
 */
function renderZoneAtlasSvg(config) {
  const titleLines = wrapText(config.title, 24, 2);
  const subtitleLines = wrapText(config.subtitle, 42, 3);
  const poseData = config.pose ? getBase64Asset(`images/lemmy/poses/${config.pose}.webp`) : getBase64Asset("images/lemmy/poses/wave.webp");
  const statusColor = config.statusColor || "#2e7d32";
  const accentColor = config.accentColor || "#ffc83b";

  const titleSvg = titleLines
    .map((line, idx) => `<tspan x="70" dy="${idx === 0 ? 0 : 60}">${escapeXml(line)}</tspan>`)
    .join("");

  const subtitleSvg = subtitleLines
    .map((line, idx) => `<tspan x="70" dy="${idx === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`)
    .join("");

  const badgesSvg = (config.badges || [])
    .map((badge, idx) => {
      const x = 70 + idx * 165;
      return `
      <g transform="translate(${x}, 470)">
        <rect width="152" height="30" rx="4" fill="#ffffff" stroke="#11100d" stroke-width="1.5"/>
        <text x="76" y="19" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="bold" fill="#11100d" text-anchor="middle" letter-spacing="0.5">${escapeXml(badge)}</text>
      </g>`;
    })
    .join("");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="zone-grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ded9cc" stroke-width="1"/>
    </pattern>
    <filter id="zone-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#11100d" flood-opacity="0.16"/>
    </filter>
  </defs>

  <!-- Canvas Base -->
  <rect width="1200" height="630" fill="#f4f2ea"/>
  <rect width="1200" height="630" fill="url(#zone-grid)"/>

  <!-- Main Card -->
  <g filter="url(#zone-shadow)">
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="#fbfaf6" stroke="#11100d" stroke-width="3"/>
  </g>

  <!-- Top Header Strip -->
  <line x1="36" y1="96" x2="1164" y2="96" stroke="#e8e4d8" stroke-width="2"/>
  
  <!-- Brand Left -->
  <g transform="translate(68, 56)">
    <rect width="24" height="24" rx="6" fill="${accentColor}" stroke="#11100d" stroke-width="2"/>
    <text x="12" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="900" fill="#11100d" text-anchor="middle">L</text>
    <text x="36" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#11100d" letter-spacing="1">LEMONTEED</text>
    <text x="145" y="17" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070">// UNIVERSE ZONE</text>
  </g>

  <!-- URL Watermark Right -->
  <text x="1132" y="73" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070" text-anchor="end">lemonteed.com</text>

  <!-- Left Content -->
  <!-- Zone Eyebrow -->
  <g transform="translate(70, 130)">
    <rect width="260" height="28" rx="4" fill="#ffffff" stroke="#11100d" stroke-width="1.5"/>
    <text x="130" y="18" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" fill="#11100d" text-anchor="middle" letter-spacing="0.8">${escapeXml(config.eyebrow)}</text>
  </g>

  <!-- Title -->
  <text x="70" y="222" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="52" font-weight="800" fill="#11100d">
    ${titleSvg}
  </text>

  <!-- Subtitle -->
  <text x="70" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="400" fill="#5a564c" line-height="1.4">
    ${subtitleSvg}
  </text>

  <!-- Badges -->
  ${badgesSvg}

  <!-- Status Bar Bottom -->
  <g transform="translate(70, 524)">
    <circle cx="8" cy="8" r="5" fill="${statusColor}"/>
    <text x="22" y="12" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="bold" fill="${statusColor}">${escapeXml(config.statusText || "EXPLORE ZONE")}</text>
  </g>

  <!-- Right Visual Stage: Giant Stamp Circle + Mascot -->
  <g transform="translate(850, 290)">
    <!-- Stamp Halo -->
    <circle cx="100" cy="50" r="160" fill="#f4f2ea" stroke="#11100d" stroke-width="3" stroke-dasharray="8 6"/>
    <circle cx="100" cy="50" r="135" fill="${accentColor}" opacity="0.25"/>
    
    <!-- Mascot Asset -->
    ${
      poseData
        ? `<image href="${poseData}" x="-20" y="-70" width="240" height="240" />`
        : ""
    }
    <!-- Badge Below Mascot -->
    <g transform="translate(20, 160)">
      <rect width="160" height="28" rx="6" fill="#11100d"/>
      <text x="80" y="18" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="bold" fill="#ffc83b" text-anchor="middle" letter-spacing="1">ZONE OPERATOR</text>
    </g>
  </g>
</svg>`;
}

/**
 * Render SVG for the "minimal-punch" archetype (Home & Atlas).
 */
function renderMinimalPunchSvg(config) {
  const title = config.title || "Lemonteed";
  const subtitleLines = wrapText(config.subtitle, 48, 3);
  const poseData = config.pose ? getBase64Asset(`images/lemmy/poses/${config.pose}.webp`) : null;
  const statusColor = config.statusColor || "#2e7d32";
  const accentColor = config.accentColor || "#ffc83b";

  const subtitleSvg = subtitleLines
    .map((line, idx) => `<tspan x="74" dy="${idx === 0 ? 0 : 30}">${escapeXml(line)}</tspan>`)
    .join("");

  const badgesSvg = (config.badges || [])
    .map((badge, idx) => {
      const x = 74 + idx * 165;
      return `
      <g transform="translate(${x}, 470)">
        <rect width="152" height="30" rx="4" fill="#ffffff" stroke="#11100d" stroke-width="1.5"/>
        <text x="76" y="19" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="bold" fill="#11100d" text-anchor="middle" letter-spacing="0.5">${escapeXml(badge)}</text>
      </g>`;
    })
    .join("");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="punch-grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#ded9cc" />
    </pattern>
    <filter id="punch-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#11100d" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Canvas Base -->
  <rect width="1200" height="630" fill="#f4f2ea"/>
  <rect width="1200" height="630" fill="url(#punch-grid)"/>

  <!-- Main Container -->
  <g filter="url(#punch-shadow)">
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="#fbfaf6" stroke="#11100d" stroke-width="3"/>
  </g>

  <!-- Top Strip -->
  <line x1="36" y1="96" x2="1164" y2="96" stroke="#e8e4d8" stroke-width="2"/>
  
  <!-- Left Header -->
  <g transform="translate(68, 56)">
    <rect width="24" height="24" rx="6" fill="${accentColor}" stroke="#11100d" stroke-width="2"/>
    <text x="12" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="900" fill="#11100d" text-anchor="middle">L</text>
    <text x="36" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#11100d" letter-spacing="1">LEMONTEED</text>
    <text x="145" y="17" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070">// INTERNET UNIVERSE</text>
  </g>

  <text x="1132" y="73" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold" fill="#888070" text-anchor="end">lemonteed.com</text>

  <!-- Eyebrow -->
  <g transform="translate(74, 130)">
    <rect width="260" height="28" rx="4" fill="#ffffff" stroke="#11100d" stroke-width="1.5"/>
    <text x="130" y="18" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" fill="#11100d" text-anchor="middle" letter-spacing="0.8">${escapeXml(config.eyebrow)}</text>
  </g>

  <!-- Massive Headline -->
  <text x="74" y="240" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="64" font-weight="900" fill="#11100d" letter-spacing="-1">
    ${escapeXml(title)}
  </text>

  <!-- Subtitle -->
  <text x="74" y="315" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="400" fill="#44413c" line-height="1.4">
    ${subtitleSvg}
  </text>

  <!-- Badges -->
  ${badgesSvg}

  <!-- Status Line -->
  <g transform="translate(74, 524)">
    <circle cx="8" cy="8" r="5" fill="${statusColor}"/>
    <text x="22" y="12" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="bold" fill="${statusColor}">${escapeXml(config.statusText || "SYSTEMS ONLINE")}</text>
  </g>

  <!-- Right Visual Feature -->
  ${
    poseData
      ? `<g transform="translate(860, 240)">
          <circle cx="110" cy="110" r="140" fill="${accentColor}" opacity="0.3"/>
          <image href="${poseData}" x="-10" y="-10" width="240" height="240" />
        </g>`
      : ""
  }
</svg>`;
}

/**
 * Generate SVG markup based on config archetype.
 */
function renderOgSvg(config) {
  const archetype = config.archetype || "workbench";
  switch (archetype) {
    case "operator-log":
      return renderOperatorLogSvg(config);
    case "zone-atlas":
      return renderZoneAtlasSvg(config);
    case "minimal-punch":
      return renderMinimalPunchSvg(config);
    case "workbench":
    default:
      return renderWorkbenchSvg(config);
  }
}

/**
 * Generate a single OG image for a page key.
 *
 * @param {string} pageKey - Key in content/seo.json
 * @param {Object} [options] - Override options
 * @returns {Object} Result { url, filename, width, height }
 */
function generateOgImage(pageKey, options = {}) {
  // Load seo.json to get canonical titles and paths
  const seoData = JSON.parse(fs.readFileSync(seoFile, "utf8"));
  const seoEntry = seoData.find((p) => p.key === pageKey);

  const baseConfig = PAGE_CONFIGS[pageKey] || {
    archetype: "workbench",
    eyebrow: `[ PAGE / ${pageKey.toUpperCase()} ]`,
    title: seoEntry ? seoEntry.title.split("|")[0].trim() : pageKey,
    subtitle: seoEntry ? seoEntry.description : "A static web experiment from Lemonteed.",
    badges: ["100% STATIC", "VANILLA JS", "ZERO TRACKING"],
    statusText: "ONLINE",
  };

  const config = {
    key: pageKey,
    ...baseConfig,
    ...options,
  };

  const svgContent = renderOgSvg(config);
  const filename = `${pageKey}.webp`;
  const outFile = path.join(ogDir, filename);
  const tempSvg = path.join(root, `.temp_og_${pageKey}.svg`);

  fs.writeFileSync(tempSvg, svgContent, "utf8");

  try {
    execFileSync("magick", [
      tempSvg,
      "-resize", "1200x630",
      "-quality", "88",
      "-define", "webp:method=6",
      outFile,
    ], { timeout: 20000 });

    const stats = fs.statSync(outFile);
    return {
      success: true,
      key: pageKey,
      filename,
      url: `/images/og/${filename}`,
      width: 1200,
      height: 630,
      sizeBytes: stats.size,
    };
  } finally {
    if (fs.existsSync(tempSvg)) {
      fs.unlinkSync(tempSvg);
    }
  }
}

/**
 * Generate OG images for all registered pages in content/seo.json.
 */
function generateAllOgImages(options = {}) {
  const seoData = JSON.parse(fs.readFileSync(seoFile, "utf8"));
  const results = [];

  for (const page of seoData) {
    try {
      const result = generateOgImage(page.key, options);
      page.ogImage = result.url;
      page.ogImageWidth = 1200;
      page.ogImageHeight = 630;
      if (!page.twitterImage || page.twitterImage.startsWith("/images/og/")) {
        page.twitterImage = result.url;
      }
      results.push(result);
      console.log(`[OG-GEN] ✓ Generated: ${page.key} -> ${result.url} (${(result.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`[OG-GEN] ✗ Failed generating for ${page.key}:`, err.message);
      results.push({ success: false, key: page.key, error: err.message });
    }
  }

  if (!options.dryRun) {
    fs.writeFileSync(seoFile, JSON.stringify(seoData, null, 2) + "\n", "utf8");
    console.log(`[OG-GEN] Updated ${seoFile} with new OG image URLs.`);
  }

  return results;
}

// Module export for Studio server
module.exports = {
  PAGE_CONFIGS,
  generateOgImage,
  generateAllOgImages,
  renderOgSvg,
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const pageArg = args.find((a) => a.startsWith("--page="));
  const isAll = args.includes("--all");
  const isDryRun = args.includes("--dry-run");

  if (pageArg) {
    const pageKey = pageArg.split("=")[1];
    console.log(`[OG-GEN] Generating OG image for page: ${pageKey}...`);
    const res = generateOgImage(pageKey, { dryRun: isDryRun });
    console.log(`[OG-GEN] Done: ${res.url} (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
  } else if (isAll || args.length === 0) {
    console.log("[OG-GEN] Generating OG images for all registered SEO pages...");
    const res = generateAllOgImages({ dryRun: isDryRun });
    console.log(`[OG-GEN] Finished generating ${res.filter((r) => r.success).length} of ${res.length} OG images.`);
  } else {
    console.log("Usage: node scripts/generate-og-images.js [--all | --page=<key>] [--dry-run]");
  }
}
