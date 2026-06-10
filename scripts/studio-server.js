const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
// TODO: Mutation Desk — import full promotion logic when the Mutation Desk UI is built.
// For now, the promotion script (scripts/promote-operator-mutation.js) handles CLI promotion.
const MUTATION_SCHEDULE_FILE = path.resolve(__dirname, "..", "content", "operator-log", "schedule.json");
const MUTATION_PUBLIC_DATA_DIR = path.resolve(__dirname, "..", "operator-log", "data");
const MUTATION_FRAGMENTS_DIR = path.resolve(__dirname, "..", "content", "operator-log", "fragments");
const MUTATION_MANIFEST_FILE = path.resolve(__dirname, "..", "operator-log", "manifest.json");
const { execFileSync } = require("node:child_process");
const { build } = require("./build-gallery");
const { backupFile } = require("./file-backup");
const { assertValidContent, validateContent } = require("./content-validation");
const { mediaHealth } = require("./media-health");
const { variantsForProject, absoluteFromPublicUrl } = require("./generate-image-variants");
const { contentFile: liveExperimentFile, validateLiveExperiment, buildLiveExperiment } = require("./build-live-experiment");
const { contentFile: lemonteedFmFile, validateLemonteedFm, buildLemonteedFm } = require("./build-lemonteed-fm");
const { resolvePathWithinRoot } = require("./security-utils");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");
const studioDir = path.join(root, "studio");
const port = Number(process.env.PORT || 5173);
const allowRemote = process.env.STUDIO_ALLOW_REMOTE === "1";
const studioHost = allowRemote ? "0.0.0.0" : String(process.env.STUDIO_HOST || "127.0.0.1");
const studioWriteToken = String(process.env.STUDIO_WRITE_TOKEN || "").trim();
const mutatingMethods = new Set(["POST", "PATCH", "DELETE", "PUT"]);
const maxBodyBytes = 80 * 1024 * 1024;
const galleryWidths = [320, 480, 640, 768, 900, 1024, 1600];
const statuses = ["Draft", "Ready", "Published", "Hidden", "Archived", "Deleted"];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm"
};

const audioMimeExtensions = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm"
};

function sendJson(response, status, data) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function sendError(response, error) {
  console.error("SERVER ERROR:", error);
  const validation = error.validation || null;
  const status = error.statusCode || 400;
  sendJson(response, status, {
    error: error.message,
    errors: validation ? validation.errors : undefined,
    warnings: validation ? validation.warnings : undefined
  });
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function assertWriteAuthorized(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (!mutatingMethods.has(request.method) || !isApiPath(url.pathname)) {
    return;
  }

  // CSRF validation: Validate Origin and Referer headers against Host origin
  const host = request.headers.host;
  const origin = request.headers.origin;
  const referer = request.headers.referer;

  if (origin) {
    let originUrl;
    try {
      originUrl = new URL(origin);
    } catch (e) {
      const error = new Error("CSRF check failed: Malformed Origin.");
      error.statusCode = 403;
      throw error;
    }
    if (originUrl.host !== host) {
      const error = new Error("CSRF check failed: Invalid Origin.");
      error.statusCode = 403;
      throw error;
    }
  }

  if (referer) {
    let refererUrl;
    try {
      refererUrl = new URL(referer);
    } catch (e) {
      const error = new Error("CSRF check failed: Malformed Referer.");
      error.statusCode = 403;
      throw error;
    }
    if (refererUrl.host !== host) {
      const error = new Error("CSRF check failed: Invalid Referer.");
      error.statusCode = 403;
      throw error;
    }
  }

  if (!studioWriteToken) {
    if (allowRemote) {
      const error = new Error("Write API disabled. Set STUDIO_WRITE_TOKEN when STUDIO_ALLOW_REMOTE=1.");
      error.statusCode = 403;
      throw error;
    }

    return;
  }

  const header = String(request.headers.authorization || "");
  const expected = `Bearer ${studioWriteToken}`;

  if (header !== expected) {
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    throw error;
  }
}

function absoluteFromPublicPath(publicPath) {
  const relative = decodeURIComponent(String(publicPath || "").replace(/^\//, ""));
  return resolvePathWithinRoot(root, relative);
}

function sendText(response, status, text) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on("data", (chunk) => {
      total += chunk.length;

      if (total > maxBodyBytes) {
        reject(new Error("Upload is too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function readJsonBody(request) {
  return readBody(request).then((body) => JSON.parse(body.toString("utf8") || "{}"));
}

function loadProjects() {
  if (!fs.existsSync(contentFile)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(contentFile, "utf8"));
}

function loadCategories() {
  if (!fs.existsSync(categoriesFile)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(categoriesFile, "utf8"));
}

function loadLiveExperiment() {
  if (!fs.existsSync(liveExperimentFile)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(liveExperimentFile, "utf8"));
}

function loadLemonteedFm() {
  if (!fs.existsSync(lemonteedFmFile)) {
    return { tracks: [] };
  }

  return JSON.parse(fs.readFileSync(lemonteedFmFile, "utf8"));
}

function saveLemonteedFm(data) {
  const normalized = validateLemonteedFm(data);
  backupFile(lemonteedFmFile);
  fs.mkdirSync(path.dirname(lemonteedFmFile), { recursive: true });
  fs.writeFileSync(lemonteedFmFile, `${JSON.stringify({
    ...normalized,
    updatedAt: new Date().toISOString()
  }, null, 2)}\n`);
  buildLemonteedFm();
  return loadLemonteedFm();
}

function saveLiveExperiment(data) {
  const result = validateLiveExperiment(data);

  if (result.errors.length) {
    const error = new Error("Live experiment validation failed.");
    error.validation = result;
    throw error;
  }

  backupFile(liveExperimentFile);
  fs.mkdirSync(path.dirname(liveExperimentFile), { recursive: true });
  fs.writeFileSync(liveExperimentFile, `${JSON.stringify({
    ...data,
    updatedAt: new Date().toISOString()
  }, null, 2)}\n`);
  buildLiveExperiment();
}

function saveCategories(categories) {
  assertValidContent(loadProjects(), categories);
  backupFile(categoriesFile);
  fs.mkdirSync(path.dirname(categoriesFile), { recursive: true });
  fs.writeFileSync(categoriesFile, `${JSON.stringify(categories, null, 2)}\n`);
  build();
}

function saveProjects(projects) {
  assertValidContent(projects, loadCategories());
  backupFile(contentFile);
  fs.mkdirSync(path.dirname(contentFile), { recursive: true });
  fs.writeFileSync(contentFile, `${JSON.stringify(projects, null, 2)}\n`);
  build();
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "untitled";
}

function uniqueSlug(projects, baseSlug) {
  let slug = baseSlug;
  let suffix = 2;

  while (projects.some((project) => project.slug === slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function nextId(projects, category) {
  const meta = loadCategories().find((item) => item.slug === category);
  const max = projects.reduce((highest, project) => {
    if (project.category !== category) {
      return highest;
    }

    const match = String(project.id).match(/-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  let nextNum = max + 1;
  let next = `${meta.prefix}-${String(nextNum).padStart(3, "0")}`;
  
  while (projects.some((p) => p.id === next)) {
    nextNum += 1;
    next = `${meta.prefix}-${String(nextNum).padStart(3, "0")}`;
  }
  
  return next;
}

function assertCategory(category) {
  if (!loadCategories().some((item) => item.slug === category && item.visible !== false)) {
    throw new Error("Choose a valid category.");
  }
}

function categoryMetaFor(category) {
  const meta = loadCategories().find((item) => item.slug === category && item.visible !== false);

  if (!meta) {
    throw new Error("Choose a valid category.");
  }

  return meta;
}

function arrayField(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeArrayField(current, additions) {
  const values = arrayField(current);
  const seen = new Set(values.map((item) => item.toLowerCase()));

  arrayField(additions).forEach((item) => {
    const key = item.toLowerCase();

    if (!seen.has(key)) {
      values.push(item);
      seen.add(key);
    }
  });

  return values;
}

function removeArrayField(current, removals) {
  const removed = new Set(arrayField(removals).map((item) => item.toLowerCase()));
  return arrayField(current).filter((item) => !removed.has(item.toLowerCase()));
}

function normalizeCuration(value) {
  const source = value && typeof value === "object" ? value : {};
  const randomWeight = Number(source.randomWeight || 1);
  const featuredRank = Number(source.featuredRank || 0);

  if (!Number.isFinite(randomWeight) || randomWeight < 0) {
    throw new Error("Random weight must be a non-negative number.");
  }

  if (!Number.isFinite(featuredRank) || featuredRank < 0) {
    throw new Error("Featured rank must be a non-negative number.");
  }

  return {
    homepage: source.homepage === true,
    featuredRank,
    randomWeight
  };
}

function imageValue(project) {
  return project.image || (project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small)) || "";
}

function thumbnailValue(project) {
  return project.thumbnail || (Array.isArray(project.variants) && project.variants.length ? project.variants[0].url : "") || "";
}

function hasRequiredImages(project) {
  return Boolean(imageValue(project) && thumbnailValue(project));
}

function normalizeStatus(status, project) {
  const value = String(status || "").trim();
  const requested = statuses.includes(value) ? value : "";

  if (value && !requested) {
    throw new Error(`Invalid status "${value}". Expected ${statuses.join(", ")}.`);
  }

  if (!value) {
    return hasRequiredImages(project) ? "Published" : "Draft";
  }

  if ((requested === "Ready" || requested === "Published") && !hasRequiredImages(project)) {
    throw new Error("Image required before this entry can be published.");
  }

  return requested;
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid data URL.");
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error("Uploaded image exceeds the maximum size limit of 15MB.");
  }

  return {
    mime,
    buffer
  };
}

function publicImagePath(category, filename) {
  return `/images/${category}/${encodeURIComponent(filename).replace(/%2F/g, "/")}`;
}

function publicFmAudioPath(filename) {
  return `/lemonteed-fm/audio/${encodeURIComponent(filename).replace(/%2F/g, "/")}`;
}

function imageDimensions(filePath) {
  const output = execFileSync("magick", ["identify", "-format", "%w %h", filePath], { encoding: "utf8", timeout: 5000 });
  const [width, height] = output.trim().split(/\s+/).map(Number);
  if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
    throw new Error("Invalid image dimensions parsed.");
  }
  return { width, height };
}

function makeWebpSet(sourcePath, imageDir, slug) {
  // Preflight dimension check
  const dimensions = imageDimensions(sourcePath);
  if (dimensions.width > 10000 || dimensions.height > 10000) {
    throw new Error("Uploaded image dimensions are too large (max 10,000 x 10,000 pixels).");
  }

  const original = path.join(imageDir, `${slug}.webp`);

  execFileSync("magick", [sourcePath, "-auto-orient", "-strip", "-quality", "84", "-define", "webp:method=6", original], { timeout: 15000 });
  const convertedDimensions = imageDimensions(original);
  const variants = [];

  galleryWidths.forEach((width) => {
    if (width >= convertedDimensions.width) {
      return;
    }

    const file = path.join(imageDir, `${slug}-${width}.webp`);
    execFileSync("magick", [
      sourcePath,
      "-auto-orient",
      "-resize",
      `${width}x>`,
      "-strip",
      "-quality",
      "82",
      "-define",
      "webp:method=6",
      file
    ], { timeout: 15000 });
    variants.push({ width, url: publicImagePath(path.basename(imageDir), `${slug}-${width}.webp`) });
  });

  variants.push({ width: convertedDimensions.width, url: publicImagePath(path.basename(imageDir), `${slug}.webp`) });

  return {
    original,
    dimensions: convertedDimensions,
    variants
  };
}

function removeImageSet(project) {
  const source = project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small);

  if (!source || !source.startsWith("/images/")) {
    return;
  }

  const absolute = absoluteFromPublicPath(source);

  if (!absolute) {
    return;
  }

  const imageDir = path.dirname(absolute);
  const ext = path.extname(absolute);
  const base = path.basename(absolute, ext);

  [absolute, ...galleryWidths.map((width) => path.join(imageDir, `${base}-${width}${ext}`))]
    .forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
}

async function createProject(request, response) {
  const body = await readJsonBody(request);
  const projects = loadProjects();
  const categoryMeta = loadCategories().find((item) => item.slug === body.category);
  const category = body.category;
  assertCategory(category);

  const title = String(body.title || "").trim();
  const alt = String(body.alt || "").trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!alt) {
    throw new Error("Alt text is required.");
  }

  const { buffer } = decodeDataUrl(body.imageData);
  const baseSlug = slugify(body.slug || title);
  const slug = uniqueSlug(projects, baseSlug);
  const imageDir = path.join(root, "images", category);
  const uploadDir = path.join(root, ".studio-uploads");
  const tempFile = path.join(uploadDir, `${slug}-upload`);

  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(tempFile, buffer);

  const now = new Date().toISOString();
  const image = makeWebpSet(tempFile, imageDir, slug);
  fs.unlinkSync(tempFile);

  const imageUrl = publicImagePath(category, `${slug}.webp`);
  const thumbnail = image.variants.find((variant) => Number(variant.width) === 768) || image.variants[0];
  const project = {
    id: nextId(projects, category),
    title,
    slug,
    category,
    categoryLabel: categoryMeta.label,
    series: String(body.series || "").trim(),
    year: String(body.year || "").trim(),
    description: String(body.description || "").trim(),
    origin: String(body.origin || "").trim(),
    dateCreated: String(body.dateCreated || "").trim(),
    tags: arrayField(body.tags),
    dangerLevel: String(body.dangerLevel || "").trim(),
    toolsUsed: arrayField(body.toolsUsed),
    related: arrayField(body.related),
    image: imageUrl,
    thumbnail: thumbnail ? thumbnail.url : imageUrl,
    alt,
    width: image.dimensions.width,
    height: image.dimensions.height,
    sizes: {
      small: imageUrl,
      medium: imageUrl,
      large: imageUrl
    },
    variants: image.variants,
    featured: Boolean(body.featured),
    status: "Published",
    visible: body.visible !== false,
    createdAt: now,
    updatedAt: now
  };

  projects.unshift(project);
  saveProjects(projects);
  sendJson(response, 201, { project });
}

async function createCategory(request, response) {
  const body = await readJsonBody(request);
  const categories = loadCategories();
  const label = String(body.label || "").trim();
  const slug = slugify(body.slug || label);
  const prefix = slugify(body.prefix || slug).replace(/-/g, "").slice(0, 8) || "cat";

  if (!label) {
    throw new Error("Category name is required.");
  }

  if (categories.some((category) => category.slug === slug)) {
    throw new Error("That category already exists.");
  }

  const category = {
    slug,
    label,
    prefix,
    path: "",
    visible: true,
    createdAt: new Date().toISOString()
  };

  categories.push(category);
  saveCategories(categories);
  fs.mkdirSync(path.join(root, "images", slug), { recursive: true });
  sendJson(response, 201, { category });
}

async function updateProject(request, response, id) {
  const body = await readJsonBody(request);
  const projects = loadProjects();
  const project = projects.find((item) => item.id === id);

  if (!project) {
    sendJson(response, 404, { error: "Project not found." });
    return;
  }

  if (Object.prototype.hasOwnProperty.call(body, "category")) {
    const category = String(body.category || "").trim();
    const categoryMeta = categoryMetaFor(category);
    project.category = category;
    project.categoryLabel = categoryMeta.label;
  }

  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    const slug = slugify(body.slug || project.title);

    if (projects.some((item) => item.id !== id && item.slug === slug)) {
      throw new Error(`Slug already exists: ${slug}`);
    }

    project.slug = slug;
  }

  [
    "title",
    "series",
    "image",
    "thumbnail",
    "alt",
    "description",
    "origin",
    "dateCreated",
    "dangerLevel",
    "year"
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      project[field] = String(body[field] || "").trim();
    }
  });

  ["tags", "toolsUsed", "related"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      project[field] = arrayField(body[field]);
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, "visible")) {
    project.visible = Boolean(body.visible);
  }

  if (Object.prototype.hasOwnProperty.call(body, "featured")) {
    project.featured = Boolean(body.featured);
  }

  if (Object.prototype.hasOwnProperty.call(body, "curation")) {
    project.curation = normalizeCuration(body.curation);
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    project.status = normalizeStatus(String(body.status || "").trim(), project);
  } else if (project.status) {
    project.status = normalizeStatus(project.status, project);
  }

  project.updatedAt = new Date().toISOString();
  saveProjects(projects);
  sendJson(response, 200, { project });
}

function imageSetFiles(project) {
  const source = project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small);

  if (!source || !source.startsWith("/images/")) {
    return [];
  }

  const absolute = absoluteFromPublicPath(source);

  if (!absolute) {
    return [];
  }

  const imageDir = path.dirname(absolute);
  const ext = path.extname(absolute);
  const base = path.basename(absolute, ext);

  return [absolute, ...galleryWidths.map((width) => path.join(imageDir, `${base}-${width}${ext}`))]
    .filter((file) => fs.existsSync(file));
}

function backupImageSet(project) {
  imageSetFiles(project).forEach((file) => backupFile(file));
}

function syncProjectThumbnail(project) {
  const thumbnail = Array.isArray(project.variants)
    ? project.variants.find((variant) => Number(variant.width) === 768) || project.variants[0]
    : null;

  if (thumbnail && thumbnail.url) {
    project.thumbnail = thumbnail.url;
  }
}

function regenerateProjectVariants(project, options = {}) {
  const result = variantsForProject(project, options);
  project.variants = result.variants;
  syncProjectThumbnail(project);
  project.updatedAt = new Date().toISOString();
  return result;
}

function cleanupStaleImageSet(project) {
  const keep = new Set([
    imageValue(project),
    thumbnailValue(project),
    ...(Array.isArray(project.variants) ? project.variants.map((variant) => variant.url) : [])
  ].filter(Boolean).map((url) => absoluteFromPublicUrl(url)).filter(Boolean));

  imageSetFiles(project).forEach((file) => {
    if (!keep.has(file)) {
      backupFile(file);
      fs.unlinkSync(file);
    }
  });
}

function mediaFileInfo(label, url) {
  const filePath = absoluteFromPublicUrl(url);

  if (!filePath) {
    return { label, url, exists: false };
  }

  if (!fs.existsSync(filePath)) {
    return { label, url, exists: false, path: path.relative(root, filePath) };
  }

  let dimensions = null;

  try {
    dimensions = imageDimensions(filePath);
  } catch (error) {
    dimensions = null;
  }

  return {
    label,
    url,
    exists: true,
    path: path.relative(root, filePath).replace(/\\/g, "/"),
    bytes: fs.statSync(filePath).size,
    width: dimensions ? dimensions.width : null,
    height: dimensions ? dimensions.height : null
  };
}

function uniqueImageSlug(imageDir, baseSlug) {
  let slug = baseSlug;
  let suffix = 2;

  while (fs.existsSync(path.join(imageDir, `${slug}.webp`))) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function uniqueAudioFilename(audioDir, baseSlug, extension) {
  let filename = `${baseSlug}${extension}`;
  let suffix = 2;

  while (fs.existsSync(path.join(audioDir, filename))) {
    filename = `${baseSlug}-${suffix}${extension}`;
    suffix += 1;
  }

  return filename;
}

async function uploadLemonteedFmArt(request, response) {
  const body = await readJsonBody(request);
  const { buffer } = decodeDataUrl(body.imageData);
  const imageDir = path.join(root, "images", "lemonteed-fm");
  const uploadDir = path.join(root, ".studio-uploads");
  const baseSlug = slugify(body.slug || body.title || "fm-track-art");
  const slug = uniqueImageSlug(imageDir, baseSlug);
  const tempFile = path.join(uploadDir, `${slug}-fm-art-upload`);

  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(tempFile, buffer);

  const image = makeWebpSet(tempFile, imageDir, slug);
  fs.unlinkSync(tempFile);

  const artworkLarge = publicImagePath("lemonteed-fm", `${slug}.webp`);
  const artworkSmall = (
    image.variants.find((variant) => Number(variant.width) === 480) ||
    image.variants.find((variant) => Number(variant.width) === 320) ||
    image.variants[0]
  );

  sendJson(response, 201, {
    artwork: {
      artworkSmall: artworkSmall ? artworkSmall.url : artworkLarge,
      artworkLarge,
      width: image.dimensions.width,
      height: image.dimensions.height
    }
  });
}

async function uploadLemonteedFmAudio(request, response) {
  const body = await readJsonBody(request);
  const { mime, buffer } = decodeDataUrl(body.audioData);
  const extension = audioMimeExtensions[mime];

  if (!extension) {
    throw new Error("Upload an MP3, OGG, WAV, or WebM audio file.");
  }

  const audioDir = path.join(root, "lemonteed-fm", "audio");
  const kind = slugify(body.kind || "audio");
  const baseSlug = slugify(`${body.title || "fm-track"}-${kind}`);
  const filename = uniqueAudioFilename(audioDir, baseSlug, extension);

  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(path.join(audioDir, filename), buffer);

  sendJson(response, 201, {
    audio: {
      url: `audio/${filename}`,
      publicUrl: publicFmAudioPath(filename),
      filename,
      mime,
      bytes: buffer.length
    }
  });
}

function projectMediaInfo(project) {
  const files = [];
  const seen = new Set();

  function add(label, url) {
    if (!url || seen.has(`${label}:${url}`)) {
      return;
    }

    seen.add(`${label}:${url}`);
    files.push(mediaFileInfo(label, url));
  }

  add("image", imageValue(project));
  add("thumbnail", thumbnailValue(project));

  if (Array.isArray(project.variants)) {
    project.variants.forEach((variant) => add(`variant ${variant.width}`, variant.url));
  }

  return {
    id: project.id,
    title: project.title,
    width: project.width || null,
    height: project.height || null,
    files
  };
}

async function bulkUpdateProjects(request, response) {
  const body = await readJsonBody(request);
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id || "").trim()).filter(Boolean) : [];
  const changes = body.changes && typeof body.changes === "object" ? body.changes : {};

  if (!ids.length) {
    throw new Error("Select at least one project.");
  }

  const projects = loadProjects();
  const selected = new Set(ids);
  const missing = ids.filter((id) => !projects.some((project) => project.id === id));

  if (missing.length) {
    throw new Error(`Unknown project IDs: ${missing.join(", ")}`);
  }

  const knownIds = new Set(projects.map((project) => project.id));
  const relatedAdd = arrayField(changes.relatedAdd);
  const relatedRemove = arrayField(changes.relatedRemove);
  const missingRelated = relatedAdd.filter((id) => !knownIds.has(id));

  if (missingRelated.length) {
    throw new Error(`Unknown related project IDs: ${missingRelated.join(", ")}`);
  }

  let categoryMeta = null;

  if (Object.prototype.hasOwnProperty.call(changes, "category") && changes.category) {
    categoryMeta = categoryMetaFor(String(changes.category || "").trim());
  }

  let updated = 0;

  projects.forEach((project) => {
    if (!selected.has(project.id)) {
      return;
    }

    if (categoryMeta) {
      project.category = categoryMeta.slug;
      project.categoryLabel = categoryMeta.label;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "status") && changes.status) {
      project.status = normalizeStatus(String(changes.status || "").trim(), project);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "visible")) {
      project.visible = Boolean(changes.visible);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "featured")) {
      project.featured = Boolean(changes.featured);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "curation")) {
      project.curation = {
        ...normalizeCuration(project.curation),
        ...normalizeCuration({
          ...project.curation,
          ...changes.curation
        })
      };
    }

    if (Object.prototype.hasOwnProperty.call(changes, "tagsAdd")) {
      project.tags = mergeArrayField(project.tags, changes.tagsAdd);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "toolsUsedAdd")) {
      project.toolsUsed = mergeArrayField(project.toolsUsed, changes.toolsUsedAdd);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "relatedAdd")) {
      project.related = mergeArrayField(project.related, relatedAdd.filter((relatedId) => relatedId !== project.id));
    }

    if (Object.prototype.hasOwnProperty.call(changes, "relatedRemove")) {
      project.related = removeArrayField(project.related, relatedRemove);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "series")) {
      project.series = String(changes.series || "").trim();
    }

    project.updatedAt = new Date().toISOString();
    updated += 1;
  });

  saveProjects(projects);
  sendJson(response, 200, { updated });
}

async function regenerateVariants(request, response, id) {
  const projects = loadProjects();
  const project = projects.find((item) => item.id === id);

  if (!project) {
    sendJson(response, 404, { error: "Project not found." });
    return;
  }

  backupImageSet(project);
  const result = regenerateProjectVariants(project, { force: true });
  saveProjects(projects);
  sendJson(response, 200, { id, generated: result.generated, variantCount: project.variants.length });
}

async function bulkRegenerateVariants(request, response) {
  const body = await readJsonBody(request);
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id || "").trim()).filter(Boolean) : [];

  if (!ids.length) {
    throw new Error("Select at least one project.");
  }

  const projects = loadProjects();
  const selected = new Set(ids);
  const missing = ids.filter((id) => !projects.some((project) => project.id === id));

  if (missing.length) {
    throw new Error(`Unknown project IDs: ${missing.join(", ")}`);
  }

  const generated = [];
  let updated = 0;

  projects.forEach((project) => {
    if (!selected.has(project.id)) {
      return;
    }

    backupImageSet(project);
    const result = regenerateProjectVariants(project, { force: true });
    generated.push(...result.generated);
    updated += 1;
  });

  saveProjects(projects);
  sendJson(response, 200, { updated, generated });
}

async function replaceProjectImage(request, response, id) {
  const body = await readJsonBody(request);
  const projects = loadProjects();
  const project = projects.find((item) => item.id === id);

  if (!project) {
    sendJson(response, 404, { error: "Project not found." });
    return;
  }

  const { buffer } = decodeDataUrl(body.imageData);
  const category = project.category;
  const slug = project.slug || slugify(project.title);
  const imageDir = path.join(root, "images", category);
  const uploadDir = path.join(root, ".studio-uploads");
  const tempFile = path.join(uploadDir, `${slug}-replacement`);

  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(tempFile, buffer);

  try {
    backupImageSet(project);
    const image = makeWebpSet(tempFile, imageDir, slug);
    const imageUrl = publicImagePath(category, `${slug}.webp`);
    project.image = imageUrl;
    project.thumbnail = (image.variants.find((variant) => Number(variant.width) === 768) || image.variants[0] || {}).url || imageUrl;
    project.width = image.dimensions.width;
    project.height = image.dimensions.height;
    project.sizes = {
      small: imageUrl,
      medium: imageUrl,
      large: imageUrl
    };
    project.variants = image.variants;
    project.updatedAt = new Date().toISOString();
    cleanupStaleImageSet(project);
    saveProjects(projects);
    sendJson(response, 200, { project });
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function cleanupUnusedMedia(request, response) {
  const body = await readJsonBody(request);
  const requested = Array.isArray(body.files) ? body.files.map((file) => String(file || "").trim()).filter(Boolean) : [];

  if (!requested.length) {
    throw new Error("Choose at least one unused file to delete.");
  }

  const projects = loadProjects();
  const categories = loadCategories();
  const health = mediaHealth(projects, categories);
  const unused = new Set(health.unusedGalleryImages);
  const deleted = [];

  requested.forEach((file) => {
    const normalized = file.replace(/\\/g, "/");

    if (!unused.has(normalized)) {
      throw new Error(`Refusing to delete a file that is not currently unused: ${file}`);
    }

    const absolute = resolvePathWithinRoot(root, normalized);

    if (!absolute || !fs.existsSync(absolute)) {
      return;
    }

    backupFile(absolute);
    fs.unlinkSync(absolute);
    deleted.push(normalized);
  });

  sendJson(response, 200, { deleted });
}

function entriesFromImportPayload(payload) {
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload.entries) ? payload.entries : Array.isArray(payload.projects) ? payload.projects : null;

  if (!entries) {
    throw new Error("Unsupported structure. Import a JSON array, or an object with entries/projects.");
  }

  return entries;
}

function normalizeImportedEntry(entry, categories) {
  if (!entry || typeof entry !== "object") {
    throw new Error("Each imported entry must be an object.");
  }

  const id = String(entry.id || "").trim();
  const title = String(entry.title || "").trim();
  const category = String(entry.category || entry.categorySlug || "").trim();
  const categoryMeta = categories.find((item) => item.slug === category);

  if (!id || !title || !category) {
    throw new Error("Imported entries require id, title, and category.");
  }

  if (!categoryMeta) {
    throw new Error(`Unknown category for ${id}: ${category}. Add the series first.`);
  }

  const normalized = {
    ...entry,
    id,
    title,
    slug: String(entry.slug || slugify(title)).trim(),
    category,
    categoryLabel: categoryMeta.label,
    series: String(entry.series || "").trim(),
    year: String(entry.year || "").trim(),
    description: String(entry.description || "").trim(),
    origin: String(entry.origin || "").trim(),
    dateCreated: String(entry.dateCreated || "").trim(),
    tags: arrayField(entry.tags),
    dangerLevel: String(entry.dangerLevel || "").trim(),
    toolsUsed: arrayField(entry.toolsUsed),
    related: arrayField(entry.related),
    image: String(entry.image || "").trim(),
    thumbnail: String(entry.thumbnail || "").trim(),
    alt: String(entry.alt || `${title} from the Lemonteed archive`).trim(),
    sizes: entry.sizes && typeof entry.sizes === "object" ? entry.sizes : {},
    variants: Array.isArray(entry.variants) ? entry.variants : [],
    featured: entry.featured === true,
    visible: entry.visible !== false,
    createdAt: String(entry.createdAt || "").trim(),
    updatedAt: new Date().toISOString()
  };

  normalized.status = normalizeStatus(String(entry.status || "").trim(), normalized);
  return normalized;
}

async function importProjects(request, response) {
  const body = await readJsonBody(request);
  const mode = body.mode === "replace" ? "replace" : "merge";
  const categories = loadCategories();
  const importedEntries = entriesFromImportPayload(body.data || body);
  const seen = new Set();
  const normalized = importedEntries.map((entry) => {
    const normalizedEntry = normalizeImportedEntry(entry, categories);

    if (seen.has(normalizedEntry.id)) {
      throw new Error(`Duplicate imported id: ${normalizedEntry.id}`);
    }

    seen.add(normalizedEntry.id);
    return normalizedEntry;
  });

  if (mode === "replace") {
    saveProjects(normalized);
    sendJson(response, 200, { imported: normalized.length, mode });
    return;
  }

  const projects = loadProjects();
  const byId = new Map(projects.map((project) => [project.id, project]));

  normalized.forEach((entry) => {
    byId.set(entry.id, {
      ...(byId.get(entry.id) || {}),
      ...entry
    });
  });

  saveProjects(Array.from(byId.values()));
  sendJson(response, 200, { imported: normalized.length, mode });
}

function deleteProject(response, id) {
  const projects = loadProjects();
  const index = projects.findIndex((item) => item.id === id);

  if (index < 0) {
    sendJson(response, 404, { error: "Project not found." });
    return;
  }

  const [project] = projects.splice(index, 1);
  projects.forEach((item) => {
    if (Array.isArray(item.related)) {
      item.related = item.related.filter((relatedId) => relatedId !== id);
    }
  });
  saveProjects(projects);
  removeImageSet(project);
  sendJson(response, 200, { deleted: id });
}

function serveFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const decodedPathname = decodeURIComponent(url.pathname);
  const pathname = decodedPathname === "/"
    ? "/index.html"
    : decodedPathname.endsWith("/")
      ? `${decodedPathname}index.html`
      : decodedPathname;
  const base = pathname.startsWith("/studio/") ? studioDir : root;
  const relative = pathname.startsWith("/studio/") ? pathname.replace(/^\/studio\//, "") : pathname.replace(/^\//, "");

  if (!pathname.startsWith("/studio/") && (relative.startsWith("content/") || relative.startsWith("scripts/"))) {
    sendText(response, 404, "Not found");
    return;
  }

  const filePath = resolvePathWithinRoot(base, relative);

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(response, 404, "Not found");
    return;
  }

  response.writeHead(200, { "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}

async function route(request, response) {
  try {
    assertWriteAuthorized(request);
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/projects") {
      sendJson(response, 200, { projects: loadProjects(), categories: loadCategories() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/categories") {
      sendJson(response, 200, { categories: loadCategories() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/live-experiment") {
      sendJson(response, 200, { liveExperiment: loadLiveExperiment() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/lemonteed-fm") {
      sendJson(response, 200, { lemonteedFm: loadLemonteedFm() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/validation") {
      const result = validateContent(loadProjects(), loadCategories());
      sendJson(response, 200, {
        ok: result.errors.length === 0,
        errors: result.errors,
        warnings: result.warnings
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/media-health") {
      sendJson(response, 200, mediaHealth(loadProjects(), loadCategories()));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/categories") {
      await createCategory(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      await createProject(request, response);
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/live-experiment") {
      const body = await readJsonBody(request);
      saveLiveExperiment(body.liveExperiment || body);
      sendJson(response, 200, { liveExperiment: loadLiveExperiment() });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/lemonteed-fm") {
      const body = await readJsonBody(request);
      const lemonteedFm = saveLemonteedFm(body.lemonteedFm || body);
      sendJson(response, 200, { lemonteedFm });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/lemonteed-fm/art") {
      await uploadLemonteedFmArt(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/lemonteed-fm/audio") {
      await uploadLemonteedFmAudio(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/import") {
      await importProjects(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/projects/bulk") {
      await bulkUpdateProjects(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/projects/bulk/regenerate-variants") {
      await bulkRegenerateVariants(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/media-cleanup") {
      await cleanupUnusedMedia(request, response);
      return;
    }

    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);

    const regenerateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/regenerate-variants$/);

    if (regenerateMatch && request.method === "POST") {
      await regenerateVariants(request, response, regenerateMatch[1]);
      return;
    }

    const replaceImageMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/replace-image$/);

    if (replaceImageMatch && request.method === "POST") {
      await replaceProjectImage(request, response, replaceImageMatch[1]);
      return;
    }

    const mediaInfoMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/media-info$/);

    if (mediaInfoMatch && request.method === "GET") {
      const project = loadProjects().find((item) => item.id === mediaInfoMatch[1]);

      if (!project) {
        sendJson(response, 404, { error: "Project not found." });
        return;
      }

      sendJson(response, 200, projectMediaInfo(project));
      return;
    }

    if (projectMatch && request.method === "PATCH") {
      await updateProject(request, response, projectMatch[1]);
      return;
    }

    if (projectMatch && request.method === "DELETE") {
      deleteProject(response, projectMatch[1]);
      return;
    }

    // ── Mutation Desk API ────────────────────────────────────────────────────
    // POST /api/mutation/schedule (CREATE a phase)
    if (request.method === "POST" && url.pathname === "/api/mutation/schedule") {
      const body = await readJsonBody(request);
      const phaseNum = Number(body.phase);
      if (Number.isNaN(phaseNum)) {
        throw new Error("Phase number is required and must be a number.");
      }
      if (!body.title) {
        throw new Error("Title is required.");
      }
      if (!body.fragment) {
        throw new Error("Fragment filename is required.");
      }
      const cleanFrag = String(body.fragment).trim();
      if (!/^[a-zA-Z0-9_-]+\.json$/.test(cleanFrag)) {
        throw new Error("Fragment filename contains invalid characters. Must end with .json");
      }

      let schedule = [];
      if (fs.existsSync(MUTATION_SCHEDULE_FILE)) {
        schedule = JSON.parse(fs.readFileSync(MUTATION_SCHEDULE_FILE, "utf8"));
      }
      if (schedule.some((p) => Number(p.phase) === phaseNum)) {
        throw new Error(`Phase number ${phaseNum} already exists.`);
      }

      const newPhase = {
        phase: phaseNum,
        title: String(body.title).trim(),
        phaseLabel: String(body.phaseLabel || `File Fragment ${String(phaseNum).padStart(3, "0")}`).trim(),
        publishAt: String(body.publishAt || new Date().toISOString()).trim(),
        fragment: cleanFrag,
        status: String(body.status || "Draft").trim(),
        nextMutationHint: body.nextMutationHint ? String(body.nextMutationHint).trim() : null,
        requiresUnlock: body.requiresUnlock === true
      };

      schedule.push(newPhase);
      schedule.sort((a, b) => Number(a.phase) - Number(b.phase));

      backupFile(MUTATION_SCHEDULE_FILE);
      fs.mkdirSync(path.dirname(MUTATION_SCHEDULE_FILE), { recursive: true });
      fs.writeFileSync(MUTATION_SCHEDULE_FILE, `${JSON.stringify(schedule, null, 2)}\n`);

      sendJson(response, 201, { phase: newPhase });
      return;
    }

    // PATCH /api/mutation/schedule/:phase (UPDATE a phase)
    const scheduleMatch = url.pathname.match(/^\/api\/mutation\/schedule\/(\d+)$/);
    if (scheduleMatch && request.method === "PATCH") {
      const phaseNum = Number(scheduleMatch[1]);
      const body = await readJsonBody(request);

      if (!fs.existsSync(MUTATION_SCHEDULE_FILE)) {
        sendJson(response, 404, { error: "schedule.json not found." });
        return;
      }

      const schedule = JSON.parse(fs.readFileSync(MUTATION_SCHEDULE_FILE, "utf8"));
      const phaseIndex = schedule.findIndex((p) => Number(p.phase) === phaseNum);
      if (phaseIndex === -1) {
        sendJson(response, 404, { error: `Phase ${phaseNum} not found.` });
        return;
      }

      const phaseObj = schedule[phaseIndex];

      if (body.phase !== undefined) {
        const newPhaseNum = Number(body.phase);
        if (Number.isNaN(newPhaseNum)) {
          throw new Error("New phase number must be a number.");
        }
        if (newPhaseNum !== phaseNum && schedule.some((p) => Number(p.phase) === newPhaseNum)) {
          throw new Error(`Phase number ${newPhaseNum} already exists.`);
        }
        phaseObj.phase = newPhaseNum;
      }

      if (body.title !== undefined) {
        phaseObj.title = String(body.title).trim();
      }
      if (body.phaseLabel !== undefined) {
        phaseObj.phaseLabel = String(body.phaseLabel).trim();
      }
      if (body.publishAt !== undefined) {
        phaseObj.publishAt = String(body.publishAt).trim();
      }
      if (body.fragment !== undefined) {
        const cleanFrag = String(body.fragment).trim();
        if (!/^[a-zA-Z0-9_-]+\.json$/.test(cleanFrag)) {
          throw new Error("Fragment filename contains invalid characters. Must end with .json");
        }
        phaseObj.fragment = cleanFrag;
      }
      if (body.status !== undefined) {
        phaseObj.status = String(body.status).trim();
      }
      if (body.nextMutationHint !== undefined) {
        phaseObj.nextMutationHint = body.nextMutationHint ? String(body.nextMutationHint).trim() : null;
      }
      if (body.requiresUnlock !== undefined) {
        phaseObj.requiresUnlock = body.requiresUnlock === true;
      }

      schedule.sort((a, b) => Number(a.phase) - Number(b.phase));
      backupFile(MUTATION_SCHEDULE_FILE);
      fs.writeFileSync(MUTATION_SCHEDULE_FILE, `${JSON.stringify(schedule, null, 2)}\n`);

      sendJson(response, 200, { phase: phaseObj });
      return;
    }

    // DELETE /api/mutation/schedule/:phase (DELETE a phase)
    if (scheduleMatch && request.method === "DELETE") {
      const phaseNum = Number(scheduleMatch[1]);
      if (!fs.existsSync(MUTATION_SCHEDULE_FILE)) {
        sendJson(response, 404, { error: "schedule.json not found." });
        return;
      }

      const schedule = JSON.parse(fs.readFileSync(MUTATION_SCHEDULE_FILE, "utf8"));
      const index = schedule.findIndex((p) => Number(p.phase) === phaseNum);
      if (index === -1) {
        sendJson(response, 404, { error: `Phase ${phaseNum} not found.` });
        return;
      }

      schedule.splice(index, 1);
      backupFile(MUTATION_SCHEDULE_FILE);
      fs.writeFileSync(MUTATION_SCHEDULE_FILE, `${JSON.stringify(schedule, null, 2)}\n`);

      sendJson(response, 200, { deleted: phaseNum });
      return;
    }

    // GET /api/mutation/fragments (LIST all fragment files)
    if (request.method === "GET" && url.pathname === "/api/mutation/fragments") {
      fs.mkdirSync(MUTATION_FRAGMENTS_DIR, { recursive: true });
      const files = fs.readdirSync(MUTATION_FRAGMENTS_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((filename) => {
          const absolute = path.join(MUTATION_FRAGMENTS_DIR, filename);
          const stats = fs.statSync(absolute);
          return {
            filename,
            size: stats.size,
            mtime: stats.mtime.toISOString()
          };
        });
      sendJson(response, 200, { fragments: files });
      return;
    }

    // GET /api/mutation/fragments/:filename (GET specific fragment JSON)
    const fragmentMatch = url.pathname.match(/^\/api\/mutation\/fragments\/([^/]+)$/);
    if (fragmentMatch && request.method === "GET") {
      const filename = decodeURIComponent(fragmentMatch[1]);
      if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) {
        sendJson(response, 400, { error: "Invalid fragment filename." });
        return;
      }
      const absolute = resolvePathWithinRoot(MUTATION_FRAGMENTS_DIR, filename);
      if (!absolute || !fs.existsSync(absolute)) {
        sendJson(response, 404, { error: `Fragment file ${filename} not found.` });
        return;
      }
      const content = JSON.parse(fs.readFileSync(absolute, "utf8"));
      sendJson(response, 200, content);
      return;
    }

    // PUT /api/mutation/fragments/:filename (CREATE or UPDATE specific fragment JSON)
    if (fragmentMatch && request.method === "PUT") {
      const filename = decodeURIComponent(fragmentMatch[1]);
      if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) {
        sendJson(response, 400, { error: "Invalid fragment filename." });
        return;
      }
      const absolute = resolvePathWithinRoot(MUTATION_FRAGMENTS_DIR, filename);
      if (!absolute) {
        sendJson(response, 403, { error: "Access denied." });
        return;
      }
      const body = await readJsonBody(request);
      fs.mkdirSync(MUTATION_FRAGMENTS_DIR, { recursive: true });
      if (fs.existsSync(absolute)) {
        backupFile(absolute);
      }
      fs.writeFileSync(absolute, `${JSON.stringify(body, null, 2)}\n`);
      sendJson(response, 200, { filename, saved: true });
      return;
    }

    // DELETE /api/mutation/fragments/:filename (DELETE specific fragment file)
    if (fragmentMatch && request.method === "DELETE") {
      const filename = decodeURIComponent(fragmentMatch[1]);
      if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) {
        sendJson(response, 400, { error: "Invalid fragment filename." });
        return;
      }
      const absolute = resolvePathWithinRoot(MUTATION_FRAGMENTS_DIR, filename);
      if (!absolute || !fs.existsSync(absolute)) {
        sendJson(response, 404, { error: `Fragment file ${filename} not found.` });
        return;
      }
      backupFile(absolute);
      fs.unlinkSync(absolute);
      sendJson(response, 200, { filename, deleted: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/mutation/schedule") {
      if (!fs.existsSync(MUTATION_SCHEDULE_FILE)) {
        sendJson(response, 404, { error: "schedule.json not found. Run the promotion script first." });
        return;
      }
      const schedule = JSON.parse(fs.readFileSync(MUTATION_SCHEDULE_FILE, "utf8"));
      const manifest = fs.existsSync(MUTATION_MANIFEST_FILE)
        ? JSON.parse(fs.readFileSync(MUTATION_MANIFEST_FILE, "utf8"))
        : null;
      sendJson(response, 200, { schedule, manifest });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/mutation/promote") {
      if (!fs.existsSync(MUTATION_SCHEDULE_FILE)) {
        sendJson(response, 400, { error: "schedule.json not found. Create phases first." });
        return;
      }
      const schedule = JSON.parse(fs.readFileSync(MUTATION_SCHEDULE_FILE, "utf8"));
      const now = new Date();
      const eligible = schedule.filter((p) => {
        const isEligibleStatus = p.status === "Ready" || p.status === "Published";
        const publishTime = new Date(p.publishAt);
        return isEligibleStatus && !Number.isNaN(publishTime.getTime()) && publishTime <= now;
      });
      if (!eligible.length) {
        sendJson(response, 200, { promoted: false, message: "No eligible phase found." });
        return;
      }
      const active = eligible.reduce((best, p) => (p.phase > best.phase ? p : best));
      const sourceFragment = path.join(MUTATION_FRAGMENTS_DIR, active.fragment);
      if (!fs.existsSync(sourceFragment)) {
        sendJson(response, 400, { error: `Fragment not found: ${active.fragment}` });
        return;
      }
      fs.mkdirSync(MUTATION_PUBLIC_DATA_DIR, { recursive: true });
      fs.readdirSync(MUTATION_PUBLIC_DATA_DIR)
        .filter((f) => f.endsWith(".json"))
        .forEach((f) => fs.unlinkSync(path.join(MUTATION_PUBLIC_DATA_DIR, f)));
      fs.copyFileSync(sourceFragment, path.join(MUTATION_PUBLIC_DATA_DIR, active.fragment));
      const manifest = {
        activePhase: active.phase,
        activeFragment: active.fragment,
        phaseLabel: active.phaseLabel || `File Fragment ${String(active.phase).padStart(3, "0")}`,
        publishedAt: new Date(active.publishAt).toISOString(),
        nextMutationHint: active.nextMutationHint || null,
        requiresUnlock: active.requiresUnlock === true
      };
      fs.writeFileSync(MUTATION_MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
      sendJson(response, 200, { promoted: true, manifest });
      return;
    }

    serveFile(request, response);
  } catch (error) {
    sendError(response, error);
  }
}

http.createServer(route).listen(port, studioHost, () => {
  const hostLabel = studioHost === "0.0.0.0" ? "all interfaces" : studioHost;
  console.log(`Lemonteed Studio: http://${studioHost === "0.0.0.0" ? "localhost" : studioHost}:${port}/studio/`);
  console.log(`Public site:       http://${studioHost === "0.0.0.0" ? "localhost" : studioHost}:${port}/`);
  console.log(`MDR (hidden dev):  http://${studioHost === "0.0.0.0" ? "localhost" : studioHost}:${port}/million-dollar-receipt/`);
  console.log(`Listening on:      ${hostLabel}:${port}`);

  if (allowRemote && !studioWriteToken) {
    console.warn("STUDIO_ALLOW_REMOTE=1 is set without STUDIO_WRITE_TOKEN. Write APIs are disabled.");
  } else if (studioWriteToken) {
    console.log("Write API token auth enabled.");
  }
});
