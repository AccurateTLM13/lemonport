const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { build } = require("./build-gallery");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");
const studioDir = path.join(root, "studio");
const port = Number(process.env.PORT || 5173);
const maxBodyBytes = 80 * 1024 * 1024;
const galleryWidths = [320, 480, 640, 768, 900, 1024, 1600];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(response, status, data) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
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

function saveCategories(categories) {
  fs.mkdirSync(path.dirname(categoriesFile), { recursive: true });
  fs.writeFileSync(categoriesFile, `${JSON.stringify(categories, null, 2)}\n`);
  build();
}

function saveProjects(projects) {
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

  return `${meta.prefix}-${String(max + 1).padStart(3, "0")}`;
}

function assertCategory(category) {
  if (!loadCategories().some((item) => item.slug === category && item.visible !== false)) {
    throw new Error("Choose a valid category.");
  }
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Upload a valid image file.");
  }

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function publicImagePath(category, filename) {
  return `/images/${category}/${encodeURIComponent(filename).replace(/%2F/g, "/")}`;
}

function imageDimensions(filePath) {
  const output = execFileSync("magick", ["identify", "-format", "%w %h", filePath], { encoding: "utf8" });
  const [width, height] = output.trim().split(/\s+/).map(Number);
  return { width, height };
}

function makeWebpSet(sourcePath, imageDir, slug) {
  const original = path.join(imageDir, `${slug}.webp`);

  execFileSync("magick", [sourcePath, "-auto-orient", "-strip", "-quality", "84", "-define", "webp:method=6", original]);
  const dimensions = imageDimensions(original);
  const variants = [];

  galleryWidths.forEach((width) => {
    if (width >= dimensions.width) {
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
    ]);
    variants.push({ width, url: publicImagePath(path.basename(imageDir), `${slug}-${width}.webp`) });
  });

  variants.push({ width: dimensions.width, url: publicImagePath(path.basename(imageDir), `${slug}.webp`) });

  return {
    original,
    dimensions,
    variants
  };
}

function removeImageSet(project) {
  const source = project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small);

  if (!source || !source.startsWith("/images/")) {
    return;
  }

  const decoded = decodeURIComponent(source.replace(/^\//, ""));
  const absolute = path.resolve(root, decoded);
  const imageDir = path.dirname(absolute);
  const ext = path.extname(absolute);
  const base = path.basename(absolute, ext);

  [absolute, ...galleryWidths.map((width) => path.join(imageDir, `${base}-${width}${ext}`))]
    .forEach((file) => {
      if (file.startsWith(root) && fs.existsSync(file)) {
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
  const project = {
    id: nextId(projects, category),
    title,
    slug,
    category,
    categoryLabel: categoryMeta.label,
    year: String(body.year || "").trim(),
    description: String(body.description || "").trim(),
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

  ["title", "year", "description", "alt"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      project[field] = String(body[field] || "").trim();
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, "visible")) {
    project.visible = Boolean(body.visible);
  }

  if (Object.prototype.hasOwnProperty.call(body, "featured")) {
    project.featured = Boolean(body.featured);
  }

  project.updatedAt = new Date().toISOString();
  saveProjects(projects);
  sendJson(response, 200, { project });
}

function deleteProject(response, id) {
  const projects = loadProjects();
  const index = projects.findIndex((item) => item.id === id);

  if (index < 0) {
    sendJson(response, 404, { error: "Project not found." });
    return;
  }

  const [project] = projects.splice(index, 1);
  removeImageSet(project);
  saveProjects(projects);
  sendJson(response, 200, { deleted: id });
}

function serveFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname === "/studio/" ? "/studio/index.html" : decodeURIComponent(url.pathname);
  const base = pathname.startsWith("/studio/") ? studioDir : root;
  const relative = pathname.startsWith("/studio/") ? pathname.replace(/^\/studio\//, "") : pathname.replace(/^\//, "");
  const filePath = path.resolve(base, relative);

  if (!filePath.startsWith(base) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(response, 404, "Not found");
    return;
  }

  response.writeHead(200, { "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}

async function route(request, response) {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/projects") {
      sendJson(response, 200, { projects: loadProjects(), categories: loadCategories() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/categories") {
      sendJson(response, 200, { categories: loadCategories() });
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

    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);

    if (projectMatch && request.method === "PATCH") {
      await updateProject(request, response, projectMatch[1]);
      return;
    }

    if (projectMatch && request.method === "DELETE") {
      deleteProject(response, projectMatch[1]);
      return;
    }

    serveFile(request, response);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

http.createServer(route).listen(port, () => {
  console.log(`Lemonteed Studio: http://localhost:${port}/studio/`);
  console.log(`Public site:       http://localhost:${port}/`);
});
