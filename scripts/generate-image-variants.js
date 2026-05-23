const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { build } = require("./build-gallery");
const { backupFile } = require("./file-backup");
const { assertValidContent } = require("./content-validation");
const { resolvePathWithinRoot } = require("./security-utils");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");
const galleryWidths = [320, 480, 640, 768, 900, 1024, 1600];
const galleryRoots = new Set(["vrg-cards", "what-if", "misc-gens", "memetic-warfare"]);
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

function publicImagePath(category, filename) {
  return `/images/${category}/${encodeURIComponent(filename).replace(/%2F/g, "/")}`;
}

function absoluteFromPublicUrl(url) {
  if (!url || !url.startsWith("/images/")) {
    return null;
  }

  return resolvePathWithinRoot(root, decodeURIComponent(url.replace(/^\//, "")));
}

function imageDimensions(filePath) {
  const output = execFileSync("magick", ["identify", "-format", "%w %h", filePath], { encoding: "utf8" });
  const [width, height] = output.trim().split(/\s+/).map(Number);
  return { width, height };
}

function makeVariant(sourcePath, targetPath, width) {
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
    targetPath
  ]);
}

function variantPath(sourcePath, width) {
  const ext = path.extname(sourcePath);
  const base = path.basename(sourcePath, ext);
  return path.join(path.dirname(sourcePath), `${base}-${width}${ext}`);
}

function variantUrl(category, sourcePath, width) {
  const ext = path.extname(sourcePath);
  const base = path.basename(sourcePath, ext);
  return publicImagePath(category, `${base}-${width}${ext}`);
}

function variantsForProject(project, options = {}) {
  const shouldForce = Object.prototype.hasOwnProperty.call(options, "force") ? options.force : force;
  const shouldDryRun = Object.prototype.hasOwnProperty.call(options, "dryRun") ? options.dryRun : dryRun;
  const sourceUrl = project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small);
  const sourcePath = absoluteFromPublicUrl(sourceUrl);

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { variants: Array.isArray(project.variants) ? project.variants : [], generated: [] };
  }

  const parts = sourceUrl.split("/").filter(Boolean);
  const category = parts[1];

  if (!galleryRoots.has(category)) {
    return { variants: Array.isArray(project.variants) ? project.variants : [], generated: [] };
  }

  const sourceDimensions = imageDimensions(sourcePath);
  const intrinsicWidth = project.width || sourceDimensions.width;
  const candidates = [];
  const generated = [];

  galleryWidths.forEach((width) => {
    if (width >= intrinsicWidth) {
      return;
    }

    const targetPath = variantPath(sourcePath, width);

    if (shouldForce || !fs.existsSync(targetPath)) {
      generated.push(path.relative(root, targetPath));

      if (!shouldDryRun) {
        makeVariant(sourcePath, targetPath, width);
      }
    }

    if (!shouldDryRun || fs.existsSync(targetPath)) {
      candidates.push({ width, url: variantUrl(category, sourcePath, width) });
    }
  });

  if (!candidates.some((candidate) => candidate.width === intrinsicWidth)) {
    candidates.push({ width: intrinsicWidth, url: sourceUrl });
  }

  candidates.sort((a, b) => a.width - b.width);
  return { variants: candidates, generated };
}

function generateLogo() {
  const sourcePath = path.join(root, "images", "lemonteedlogo.webp");
  const generated = [];

  if (!fs.existsSync(sourcePath)) {
    return generated;
  }

  [
    { width: 250, file: path.join(root, "images", "lemonteedlogo-250.webp") },
    { width: 456, file: path.join(root, "images", "lemonteedlogo-456.webp") }
  ].forEach((target) => {
    if (force || !fs.existsSync(target.file)) {
      generated.push(path.relative(root, target.file));

      if (!dryRun) {
        makeVariant(sourcePath, target.file, target.width);
      }
    }
  });

  return generated;
}

function run() {
  const projects = JSON.parse(fs.readFileSync(contentFile, "utf8"));
  const generated = [];

  projects.forEach((project) => {
    if (project.visible === false) {
      return;
    }

    const result = variantsForProject(project);
    project.variants = result.variants;
    generated.push(...result.generated);
  });

  generated.push(...generateLogo());

  if (!dryRun) {
    const categories = JSON.parse(fs.readFileSync(categoriesFile, "utf8"));
    assertValidContent(projects, categories);
    backupFile(contentFile);
    fs.writeFileSync(contentFile, `${JSON.stringify(projects, null, 2)}\n`);
    build();
  }

  if (generated.length) {
    console.log(`${dryRun ? "Would generate" : "Generated"} ${generated.length} files:`);
    generated.forEach((file) => console.log(`- ${file}`));
  } else {
    console.log("No image variants needed.");
  }

  if (dryRun) {
    console.log("Dry run only; content and gallery data were not changed.");
  }
}

if (require.main === module) {
  run();
}

module.exports = { galleryWidths, publicImagePath, absoluteFromPublicUrl, imageDimensions, makeVariant, variantsForProject };
