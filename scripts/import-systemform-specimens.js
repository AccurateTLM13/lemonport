/**
 * Import the official SYSTEM//FORM output set into the Specimen Vault.
 *
 * The importer is intentionally narrow: it knows the eight supplied model
 * folders and the five supplied prompts, preserves the source HTML, inlines
 * local stylesheets, localizes available images as WebP, and hands the final
 * HTML to the vault sanitizer. It never edits existing records.
 *
 * Usage:
 *   node scripts/import-systemform-specimens.js --source <SYSTEMFORM folder>
 *   node scripts/import-systemform-specimens.js --source <SYSTEMFORM folder> --dry-run
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const {
  contentFile,
  specimensDir,
  PUBLIC_STATUS,
  loadSpecimens,
  validateSpecimens,
  sanitizeSpecimenHtml,
  buildSpecimens
} = require("./build-specimens");

const root = path.resolve(__dirname, "..");
const CANONICAL_GEMINI_TEST_01_ID = "6629fde1";

const TESTS = [
  { number: 1, title: "Kinetic Foundry", subject: "industrial-robotics" },
  { number: 2, title: "Northline Coffee", subject: "coffee-roaster" },
  { number: 3, title: "Great Lakes Industrial Archive", subject: "civic-archive" },
  { number: 4, title: "SIGNAL/26", subject: "music-festival" },
  { number: 5, title: "FIELDNOTE / DAILY 01", subject: "imitation-trap" }
];

// This is deliberately explicit. GPT-5.6-Sol-v2 is the supplied GPT-5.6 Sol
// challenger set; the sibling GPT-5.6-Sol folder is the supplied GPT-5 set.
const MODEL_SETS = [
  { key: "gemini-3-1-pro", label: "Gemini 3.1 Pro", folder: "Gemini Pro 3.1" },
  { key: "gemini-3-7-flash", label: "Gemini 3.7 Flash", folder: "Gemini-3.7-Flash" },
  { key: "gpt-5", label: "GPT-5", folder: "GPT-5.6-Sol" },
  { key: "gpt-5-6-sol", label: "GPT-5.6 Sol", folder: "GPT-5.6-Sol-v2" },
  { key: "cursor-grok-4-6", label: "Cursor Grok 4.6", folder: "Grok-4.6" },
  { key: "mimo-v2-5", label: "MiMo v2.5", folder: "MiMo-v2.5" },
  { key: "muse-spark-1-2", label: "Muse Spark 1.2", folder: "Muse-Spark-1.2" },
  { key: "ox-alpha", label: "ox-alpha", folder: "ox-alpha" }
];

const KNOWN_HOLD_KEYS = new Set([
  "gemini-3-1-pro:2",
  "gemini-3-1-pro:3",
  "gemini-3-1-pro:5",
  "ox-alpha:2",
  "ox-alpha:3",
  "ox-alpha:4",
  "ox-alpha:5"
]);

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const NON_IMAGE_EXTENSIONS = new Set([
  ".css",
  ".eot",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".otf",
  ".ttf",
  ".woff",
  ".woff2"
]);

function parseArgs(argv) {
  const args = { source: "", dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--source") {
      args.source = argv[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--source=")) {
      args.source = arg.slice("--source=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.source) {
    throw new Error("A SYSTEMFORM source directory is required. Use --source <path>.");
  }
  return args;
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isDirectory(directoryPath) {
  try {
    return fs.statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveKitRoot(sourceArg) {
  const source = path.resolve(sourceArg);
  const candidates = [source, path.join(source, "SYSTEMFORM")];
  const kitRoot = candidates.find((candidate) =>
    isDirectory(path.join(candidate, "output")) && isDirectory(path.join(candidate, ".agents", "prompts"))
  );
  if (!kitRoot) {
    throw new Error(
      `Could not find SYSTEMFORM/output and SYSTEMFORM/.agents/prompts under ${source}. ` +
        "Pass the extracted SYSTEMFORM directory or its kit parent."
    );
  }
  return kitRoot;
}

function walkFiles(directoryPath) {
  const files = [];
  if (!isDirectory(directoryPath)) return files;
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function buildFileIndex(kitRoot) {
  const byBasename = new Map();
  for (const filePath of walkFiles(kitRoot)) {
    const key = path.basename(filePath).toLowerCase();
    const entries = byBasename.get(key) || [];
    entries.push(filePath);
    byBasename.set(key, entries);
  }
  return byBasename;
}

function promptFiles(kitRoot) {
  const promptDir = path.join(kitRoot, ".agents", "prompts");
  const files = fs.readdirSync(promptDir).filter((name) => name.toLowerCase().endsWith(".md"));
  const result = new Map();
  for (const test of TESTS) {
    const matches = files.filter((name) => new RegExp(`Test\\s*0${test.number}\\b`, "i").test(name));
    if (matches.length !== 1) {
      throw new Error(`Expected one prompt for Test 0${test.number}; found ${matches.length}.`);
    }
    result.set(test.number, path.join(promptDir, matches[0]));
  }
  return result;
}

function matchesTestFile(name, number) {
  return new RegExp(`Test[\\s-]*0${number}(?:\\b|[-—])`, "i").test(name);
}

function findOutputFile(kitRoot, modelSet, testNumber) {
  const folder = path.join(kitRoot, "output", modelSet.folder);
  if (!isDirectory(folder)) {
    throw new Error(`Model folder is missing: ${folder}`);
  }
  const matches = fs
    .readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith(".html"))
    .filter((name) => name.toLowerCase() !== "index.html")
    .filter((name) => matchesTestFile(name, testNumber));
  if (matches.length !== 1) {
    throw new Error(
      `Expected one Test 0${testNumber} HTML file in ${modelSet.folder}; found ${matches.length}.`
    );
  }
  return path.join(folder, matches[0]);
}

function stableId(modelKey, testNumber) {
  return crypto
    .createHash("sha256")
    .update(`system-form|${modelKey}|test-0${testNumber}`)
    .digest("hex")
    .slice(0, 8);
}

function keyFor(modelKey, testNumber) {
  return `${modelKey}:${testNumber}`;
}

function basenameOf(value) {
  const withoutQuery = String(value || "").split(/[?#]/)[0];
  const segments = withoutQuery.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] || "asset";
}

function stripQuery(value) {
  return String(value || "").split(/[?#]/)[0];
}

function fileUrlToPath(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "file:") return "";
    let filePath = decodeURIComponent(parsed.pathname);
    if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1);
    if (parsed.hostname && parsed.hostname !== "localhost") {
      filePath = `\\\\${parsed.hostname}${filePath}`;
    }
    return path.normalize(filePath.replace(/\//g, path.sep));
  } catch {
    return "";
  }
}

function localReferencePath(reference, baseDir, fileIndex) {
  const value = String(reference || "");
  const directPath = value.toLowerCase().startsWith("file:")
    ? fileUrlToPath(value)
    : path.isAbsolute(value)
      ? path.normalize(stripQuery(value))
      : path.resolve(baseDir, stripQuery(value));

  if (directPath && isFile(directPath)) return directPath;

  // The source HTML can retain a file:// path from the machine that produced
  // it. Resolve an exact basename from the supplied kit, never a semantic or
  // visual substitute.
  const matches = fileIndex.get(basenameOf(value).toLowerCase()) || [];
  if (matches.length === 1 && isFile(matches[0])) return matches[0];
  return "";
}

function isSkippedReference(value) {
  const ref = String(value || "").trim().toLowerCase();
  return (
    !ref ||
    ref.startsWith("#") ||
    ref.startsWith("data:") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("javascript:") ||
    ref.startsWith("tel:")
  );
}

function isLikelyImageReference(value, fromCss = false) {
  if (isSkippedReference(value)) return false;
  const ref = String(value || "").trim();
  let pathname = ref;
  try {
    pathname = new URL(ref).pathname;
  } catch {
    pathname = stripQuery(ref);
  }
  const extension = path.extname(pathname).toLowerCase();
  if (NON_IMAGE_EXTENSIONS.has(extension)) return false;
  if (extension && !IMAGE_EXTENSIONS.has(extension)) return false;
  if (fromCss && /fonts\.(googleapis|gstatic)\.com/i.test(ref)) return false;
  return true;
}

function extractImageReferences(html) {
  const refs = [];
  const add = (value, fromCss = false) => {
    const ref = String(value || "").trim();
    if (isLikelyImageReference(ref, fromCss)) refs.push(ref);
  };

  const attributeRe = /\b(?:src|poster)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(attributeRe)) add(match[2]);

  const srcsetRe = /\bsrcset\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(srcsetRe)) {
    match[2].split(",").forEach((candidate) => add(candidate.trim().split(/\s+/)[0]));
  }

  const cssUrlRe = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
  for (const match of html.matchAll(cssUrlRe)) add(match[2], true);

  return [...new Set(refs)];
}

function extractStylesheetHref(tag) {
  const match = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  return match ? match[2].trim() : "";
}

function inlineCssImports(css, cssFilePath, fileIndex, missingCss, seen = new Set()) {
  if (!cssFilePath || seen.has(cssFilePath)) return css;
  seen.add(cssFilePath);
  const importRe = /@import\s+(?:url\(\s*)?(["']?)([^"')\s]+)\1\s*\)?\s*;/gi;
  return css.replace(importRe, (match, _quote, reference) => {
    if (/^https?:\/\//i.test(reference)) return match;
    const imported = localReferencePath(reference, path.dirname(cssFilePath), fileIndex);
    if (!imported) {
      missingCss.push(reference);
      return match;
    }
    const importedCss = fs.readFileSync(imported, "utf8");
    return inlineCssImports(importedCss, imported, fileIndex, missingCss, seen);
  });
}

function inlineLocalStylesheets(html, htmlFilePath, fileIndex) {
  const missingCss = [];
  const linkRe = /<link\b[^>]*\brel\s*=\s*(["'])stylesheet\1[^>]*>/gi;
  const inlined = html.replace(linkRe, (tag) => {
    const reference = extractStylesheetHref(tag);
    if (!reference || /^https?:\/\//i.test(reference)) return tag;
    const cssPath = localReferencePath(reference, path.dirname(htmlFilePath), fileIndex);
    if (!cssPath) {
      missingCss.push(reference);
      return tag;
    }
    const css = inlineCssImports(fs.readFileSync(cssPath, "utf8"), cssPath, fileIndex, missingCss);
    return `<style data-system-form-inline="${path.basename(cssPath)}">\n${css}\n</style>`;
  });
  return { html: inlined, missingCss: [...new Set(missingCss)] };
}

function sanitizeAssetName(value) {
  const original = basenameOf(value).replace(/\.[^.]+$/, "");
  const cleaned = original.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "asset";
}

function outputAssetName(reference, sourceIdentity, usedNames) {
  const base = `${sanitizeAssetName(reference)}.webp`;
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  const suffix = crypto.createHash("sha1").update(sourceIdentity).digest("hex").slice(0, 8);
  const name = `${sanitizeAssetName(reference)}-${suffix}.webp`;
  usedNames.add(name);
  return name;
}

function convertToWebp(inputFile, outputFile) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  execFileSync(
    "magick",
    [inputFile, "-auto-orient", "-strip", "-quality", "85", "-define", "webp:method=6", outputFile],
    { stdio: "ignore", timeout: 30000 }
  );
  if (!isFile(outputFile)) throw new Error(`ImageMagick did not create ${outputFile}.`);
}

async function downloadRemoteImage(url, tempDir) {
  const response = await fetch(url, {
    headers: { "user-agent": "Lemonteed-SYSTEMFORM-import/1.0" },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("empty response");
  const target = path.join(tempDir, `download-${crypto.createHash("sha1").update(url).digest("hex")}`);
  fs.writeFileSync(target, buffer);
  return target;
}

function rewriteMappedReferences(html, replacements) {
  let output = html;
  const replacementFor = (value) => replacements.get(String(value).trim()) || value;
  output = output.replace(/\b(?:src|poster)\s*=\s*(["'])(.*?)\1/gi, (match, quote, value) => {
    const replacement = replacementFor(value);
    return replacement === value ? match : match.replace(value, replacement);
  });
  output = output.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (match, quote, value) => {
    const rewritten = value
      .split(",")
      .map((candidate) => {
        const parts = candidate.trim().split(/(\s+)/);
        if (!parts[0]) return candidate;
        parts[0] = replacementFor(parts[0]);
        return parts.join("");
      })
      .join(",");
    return `${match.slice(0, match.indexOf(value))}${rewritten}${match.slice(match.indexOf(value) + value.length)}`;
  });
  output = output.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, value) => {
    const replacement = replacementFor(value);
    return replacement === value ? match : `url(${quote}${replacement}${quote})`;
  });
  return output;
}

function makeRecord(input, prompt, status, notes, assets, assetMap, createdAt) {
  return {
    id: input.id,
    title: input.test.title,
    model: input.model.label,
    skill: "SYSTEM//FORM",
    prompt,
    notes,
    date: "",
    tags: ["system-form", `test-0${input.test.number}`, input.test.subject],
    status,
    score: null,
    source: `/specimens/source/${input.id}.html`,
    createdAt,
    updatedAt: createdAt,
    assets,
    assetMap
  };
}

async function prepareInput(input, { fileIndex, prompt, stageRoot, now, dryRun }) {
  const rawHtml = fs.readFileSync(input.file, "utf8");
  const inlined = inlineLocalStylesheets(rawHtml, input.file, fileIndex);
  const references = extractImageReferences(inlined.html);
  const assetDir = path.join(stageRoot, "assets", input.id);
  const sourceDir = path.join(stageRoot, "source");
  const cardDir = path.join(stageRoot, "images");
  const tempDownloads = path.join(stageRoot, "downloads");
  const replacements = new Map();
  const assets = [];
  const assetMap = [];
  const missing = [];
  const preparedSources = new Map();
  const usedNames = new Set();

  fs.mkdirSync(assetDir, { recursive: true });
  fs.mkdirSync(sourceDir, { recursive: true });

  for (const reference of references) {
    const isRemote = /^https?:\/\//i.test(reference);
    let sourceFile = "";
    let sourceIdentity = "";
    try {
      if (isRemote) {
        sourceIdentity = reference;
        fs.mkdirSync(tempDownloads, { recursive: true });
        sourceFile = await downloadRemoteImage(reference, tempDownloads);
      } else {
        sourceFile = localReferencePath(reference, path.dirname(input.file), fileIndex);
        sourceIdentity = sourceFile;
      }
    } catch (error) {
      missing.push({ filename: basenameOf(reference), reference, kind: "remote", error: error.message });
      continue;
    }

    if (!sourceFile) {
      missing.push({ filename: basenameOf(reference), reference, kind: "local", error: "not found" });
      continue;
    }

    let prepared = preparedSources.get(sourceIdentity);
    if (!prepared) {
      const filename = outputAssetName(reference, sourceIdentity, usedNames);
      const targetFile = path.join(assetDir, filename);
      convertToWebp(sourceFile, targetFile);
      prepared = { filename, target: `../assets/${input.id}/${filename}` };
      preparedSources.set(sourceIdentity, prepared);
      assets.push(`/specimens/assets/${input.id}/${filename}`);
      assetMap.push({ from: basenameOf(reference), to: prepared.target });
    }
    replacements.set(reference, prepared.target);
  }

  const sanitized = sanitizeSpecimenHtml(
    rewriteMappedReferences(inlined.html, replacements),
    assetMap
  );
  fs.writeFileSync(path.join(sourceDir, `${input.id}.html`), sanitized);

  const missingNames = [...new Set(missing.map((item) => item.filename))];
  const plannedHold = KNOWN_HOLD_KEYS.has(input.key);
  const unexpectedLocalMissing = missing.filter((item) => item.kind === "local" && !plannedHold);
  if (unexpectedLocalMissing.length || inlined.missingCss.length) {
    // The caller reports this before applying anything. A missing original is
    // evidence to preserve, not permission to repair or substitute the page.
  }

  const effectiveHold = plannedHold || missing.length > 0 || inlined.missingCss.length > 0;
  const status = effectiveHold ? "Ready" : PUBLIC_STATUS;
  const notes = [];
  if (effectiveHold) {
    notes.push("SOURCE HOLD: original referenced files were not available in the supplied kit; no substitute was used.");
    if (missingNames.length) notes.push(`Missing original image filenames: ${missingNames.join(", ")}.`);
    if (inlined.missingCss.length) notes.push(`Missing local stylesheets: ${inlined.missingCss.join(", ")}.`);
  }

  const record = makeRecord(input, prompt, status, notes.join(" "), assets, assetMap, now);
  if (status === PUBLIC_STATUS && !dryRun) {
    const edgePath = findEdgePath();
    if (!edgePath) throw new Error("A Chromium-based browser is required to generate card screenshots.");
    const cardPng = path.join(stageRoot, "card.png");
    captureScreenshot(edgePath, path.join(sourceDir, `${input.id}.html`), cardPng, stageRoot);
    const cardWebp = path.join(cardDir, `${input.id}.webp`);
    convertToWebp(cardPng, cardWebp);
    record.image = `/specimens/images/${input.id}.webp`;
  }

  return {
    input,
    record,
    missing,
    missingCss: inlined.missingCss,
    unexpectedLocalMissing,
    stageRoot
  };
}

function findEdgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);
  return candidates.find(isFile) || "";
}

function captureScreenshot(edgePath, htmlPath, outputPath, stageRoot) {
  const profileDir = path.join(stageRoot, "browser-profile");
  fs.mkdirSync(profileDir, { recursive: true });
  execFileSync(
    edgePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-crash-reporter",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--run-all-compositor-stages-before-draw",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1440,900",
      "--virtual-time-budget=2500",
      `--user-data-dir=${profileDir}`,
      `--screenshot=${outputPath}`,
      pathToFileURL(htmlPath).href
    ],
    { stdio: "ignore", timeout: 45000 }
  );
  const waitUntil = Date.now() + 15000;
  while (!isFile(outputPath) && Date.now() < waitUntil) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  if (!isFile(outputPath)) throw new Error(`Browser did not create ${outputPath}.`);
}

function assertExistingRecord(record, input, prompt) {
  if (!record || record.title !== input.test.title || record.model !== input.model.label || record.skill !== "SYSTEM//FORM") {
    throw new Error(`Deterministic specimen id collision for ${input.id}; existing record does not match the official input.`);
  }
  if (record.prompt !== prompt) {
    throw new Error(`Existing specimen ${input.id} has a different prompt; refusing to overwrite it.`);
  }
}

function copyStage(prepared) {
  const stageRoot = prepared.stageRoot;
  const source = path.join(stageRoot, "source", `${prepared.record.id}.html`);
  const targetSource = path.join(specimensDir, "source", `${prepared.record.id}.html`);
  fs.mkdirSync(path.dirname(targetSource), { recursive: true });
  fs.copyFileSync(source, targetSource);

  const assetSource = path.join(stageRoot, "assets", prepared.record.id);
  if (isDirectory(assetSource)) {
    fs.cpSync(assetSource, path.join(specimensDir, "assets", prepared.record.id), { recursive: true, force: true });
  }

  const imageSource = path.join(stageRoot, "images", `${prepared.record.id}.webp`);
  if (isFile(imageSource)) {
    fs.mkdirSync(path.join(specimensDir, "images"), { recursive: true });
    fs.copyFileSync(imageSource, path.join(specimensDir, "images", `${prepared.record.id}.webp`));
  }
}

function validateUniqueIds(records) {
  const seen = new Set();
  const duplicates = [];
  for (const record of records) {
    if (seen.has(record.id)) duplicates.push(record.id);
    seen.add(record.id);
  }
  return [...new Set(duplicates)];
}

function printSummary({ kitRoot, inputs, existingMatches, additions, prepared, duplicateIds, dryRun }) {
  const published = prepared.filter((item) => item.record.status === PUBLIC_STATUS);
  const held = prepared.filter((item) => item.record.status === "Ready");
  const knownHeld = prepared.filter((item) => KNOWN_HOLD_KEYS.has(item.input.key));
  const unexpectedHeld = held.filter((item) => !KNOWN_HOLD_KEYS.has(item.input.key));

  console.log(`SYSTEM//FORM specimen import${dryRun ? " dry run" : ""}`);
  console.log(`Source: ${kitRoot}`);
  console.log(`Official inputs: ${inputs.length}`);
  console.log(`Existing matches: ${existingMatches}`);
  console.log(`Additions: ${additions.length}`);
  console.log(`Planned Published additions: ${published.length}`);
  console.log(`Planned Ready holds: ${held.length}`);
  console.log(`Known plan holds: ${knownHeld.length}`);
  console.log(`Unexpected holds: ${unexpectedHeld.length}`);
  console.log(`Duplicate IDs: ${duplicateIds.length}`);
  if (duplicateIds.length) duplicateIds.forEach((id) => console.log(`- ${id}`));
  for (const item of held) {
    const names = [...new Set(item.missing.map((entry) => entry.filename))];
    const extra = item.missingCss.length ? [...item.missingCss] : [];
    console.log(
      `HOLD ${item.input.model.label} / Test 0${item.input.test.number}: ${
        [...names, ...extra].join(", ") || "held by import plan"
      }`
    );
  }
  if (unexpectedHeld.length) {
    console.log("The supplied kit has missing files outside the plan's seven known holds; no apply should proceed.");
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const kitRoot = resolveKitRoot(args.source);
  const fileIndex = buildFileIndex(kitRoot);
  const prompts = promptFiles(kitRoot);
  const inputs = [];

  for (const model of MODEL_SETS) {
    for (const test of TESTS) {
      inputs.push({
        key: keyFor(model.key, test.number),
        id: model.key === "gemini-3-1-pro" && test.number === 1
          ? CANONICAL_GEMINI_TEST_01_ID
          : stableId(model.key, test.number),
        model,
        test,
        file: findOutputFile(kitRoot, model, test.number),
        promptFile: prompts.get(test.number)
      });
    }
  }

  const data = loadSpecimens();
  const validation = validateSpecimens(data);
  if (validation.errors.length) throw new Error(`Existing Specimen Vault data is invalid:\n- ${validation.errors.join("\n- ")}`);
  const existingIds = new Map(data.records.map((record) => [record.id, record]));
  const duplicateIds = validateUniqueIds(data.records);
  if (duplicateIds.length) throw new Error(`Existing Specimen Vault has duplicate IDs: ${duplicateIds.join(", ")}`);

  const additions = [];
  let existingMatches = 0;
  for (const input of inputs) {
    const prompt = fs.readFileSync(input.promptFile, "utf8");
    const existing = existingIds.get(input.id);
    if (existing) {
      assertExistingRecord(existing, input, prompt);
      existingMatches += 1;
      continue;
    }
    additions.push({ input, prompt });
  }

  const allIds = new Set(data.records.map((record) => record.id));
  const generatedDuplicates = [];
  for (const { input } of additions) {
    if (allIds.has(input.id)) generatedDuplicates.push(input.id);
    allIds.add(input.id);
  }
  if (generatedDuplicates.length) throw new Error(`Generated duplicate IDs: ${generatedDuplicates.join(", ")}`);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "systemform-import-"));
  const prepared = [];
  try {
    const now = new Date().toISOString();
    for (const { input, prompt } of additions) {
      const stageRoot = path.join(tempRoot, input.id);
      prepared.push(
        await prepareInput(input, { fileIndex, prompt, stageRoot, now, dryRun: args.dryRun })
      );
    }

    const prospectiveRecords = [...data.records, ...prepared.map((item) => item.record)];
    const prospectiveDuplicates = validateUniqueIds(prospectiveRecords);
    printSummary({
      kitRoot,
      inputs,
      existingMatches,
      additions,
      prepared,
      duplicateIds: prospectiveDuplicates,
      dryRun: args.dryRun
    });

    const unlistedMissing = prepared.filter(
      (item) => item.unexpectedLocalMissing.length || item.missingCss.length
    );
    if (!args.dryRun && unlistedMissing.length) {
      throw new Error(
        "Import not applied: one or more publishable inputs have unlisted missing local files. " +
          "Review the dry-run and supply exact originals; no substitution was made."
      );
    }
    if (args.dryRun || additions.length === 0) return;
    if (prospectiveDuplicates.length) throw new Error(`Prospective duplicate IDs: ${prospectiveDuplicates.join(", ")}`);

    for (const item of prepared) copyStage(item);
    const nextData = {
      ...data,
      records: prospectiveRecords,
      updatedAt: new Date().toISOString()
    };
    const nextValidation = validateSpecimens(nextData);
    if (nextValidation.errors.length) {
      throw new Error(`Imported Specimen Vault data is invalid:\n- ${nextValidation.errors.join("\n- ")}`);
    }
    fs.writeFileSync(contentFile, `${JSON.stringify(nextData, null, 2)}\n`);
    const built = buildSpecimens();
    console.log(`Applied ${additions.length} new record(s); ${built.count} published specimen(s) now visible.`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  MODEL_SETS,
  TESTS,
  KNOWN_HOLD_KEYS,
  stableId,
  resolveKitRoot,
  extractImageReferences,
  inlineLocalStylesheets,
  validateUniqueIds
};
