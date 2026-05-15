const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const projectsFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");

function publicUrlToPath(url) {
  if (!url || typeof url !== "string" || !url.startsWith("/images/")) {
    return null;
  }

  const filePath = path.resolve(root, decodeURIComponent(url.replace(/^\//, "")));
  return filePath.startsWith(root) ? filePath : null;
}

function addImageReference(references, url) {
  const filePath = publicUrlToPath(url);

  if (filePath) {
    references.add(filePath);
  }
}

function referencedImagePaths(projects) {
  const references = new Set();

  projects.forEach((project) => {
    addImageReference(references, project.image);
    addImageReference(references, project.thumbnail);

    if (project.sizes && typeof project.sizes === "object") {
      Object.values(project.sizes).forEach((url) => addImageReference(references, url));
    }

    if (Array.isArray(project.variants)) {
      project.variants.forEach((variant) => addImageReference(references, variant && variant.url));
    }
  });

  return references;
}

function galleryImagePaths(categories) {
  const imagePaths = [];

  categories.forEach((category) => {
    if (!category || !category.slug) {
      return;
    }

    const directory = path.join(root, "images", category.slug);

    if (!fs.existsSync(directory)) {
      return;
    }

    fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webp"))
      .forEach((entry) => imagePaths.push(path.join(directory, entry.name)));
  });

  return imagePaths;
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function mediaHealth(projects, categories) {
  const references = referencedImagePaths(projects);
  const galleryImages = galleryImagePaths(categories);
  const unusedGalleryImages = galleryImages
    .filter((filePath) => !references.has(filePath))
    .map(relative)
    .sort();
  const missingReferencedImages = Array.from(references)
    .filter((filePath) => !fs.existsSync(filePath))
    .map(relative)
    .sort();

  return {
    ok: missingReferencedImages.length === 0,
    referencedImageCount: references.size,
    galleryImageCount: galleryImages.length,
    missingReferencedImages,
    unusedGalleryImages
  };
}

function loadContent() {
  return {
    projects: JSON.parse(fs.readFileSync(projectsFile, "utf8")),
    categories: JSON.parse(fs.readFileSync(categoriesFile, "utf8"))
  };
}

function runCli() {
  const { projects, categories } = loadContent();
  const result = mediaHealth(projects, categories);

  console.log(`Referenced images: ${result.referencedImageCount}`);
  console.log(`Gallery images: ${result.galleryImageCount}`);
  console.log(`Missing referenced images: ${result.missingReferencedImages.length}`);
  result.missingReferencedImages.forEach((item) => console.log(`- ${item}`));
  console.log(`Unused gallery images: ${result.unusedGalleryImages.length}`);
  result.unusedGalleryImages.forEach((item) => console.log(`- ${item}`));

  if (result.missingReferencedImages.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  mediaHealth,
  publicUrlToPath,
  referencedImagePaths,
  galleryImagePaths
};
