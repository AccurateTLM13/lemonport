const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");
const outputFile = path.join(root, "assets", "js", "gallery-data.js");
const categoriesOutputFile = path.join(root, "assets", "js", "gallery-categories.js");

function readProjects() {
  if (!fs.existsSync(contentFile)) {
    throw new Error(`Missing ${path.relative(root, contentFile)}. Run scripts/import-gallery-data.js first.`);
  }

  return JSON.parse(fs.readFileSync(contentFile, "utf8"));
}

function readCategories() {
  if (!fs.existsSync(categoriesFile)) {
    throw new Error(`Missing ${path.relative(root, categoriesFile)}.`);
  }

  return JSON.parse(fs.readFileSync(categoriesFile, "utf8"));
}

function publicProject(project) {
  const categorySlug = project.category || "";
  const categoryLabel = project.categoryLabel || categorySlug;
  const image = project.image || (project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small)) || "";
  const thumbnail = project.thumbnail || (Array.isArray(project.variants)
    && ((project.variants.find((variant) => Number(variant.width) === 768) || project.variants[0] || {}).url))
    || image;

  return {
    id: project.id,
    title: project.title,
    category: categoryLabel,
    categorySlug,
    categoryLabel,
    series: project.series || "",
    image,
    thumbnail,
    alt: project.alt,
    description: project.description || "Experimental visual artifact from the Lemonteed archive.",
    origin: project.origin || "",
    dateCreated: project.dateCreated || (project.createdAt ? project.createdAt.slice(0, 10) : ""),
    tags: Array.isArray(project.tags) ? project.tags : [],
    dangerLevel: project.dangerLevel || "",
    toolsUsed: Array.isArray(project.toolsUsed) ? project.toolsUsed : [],
    related: Array.isArray(project.related) ? project.related : [],
    featured: project.featured === true,
    width: project.width,
    height: project.height,
    sizes: project.sizes,
    variants: Array.isArray(project.variants) ? project.variants : []
  };
}

function hasPublishableImage(project) {
  const image = project.image || (project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small));
  const thumbnail = project.thumbnail || (Array.isArray(project.variants) && project.variants.length);
  return Boolean(image && thumbnail);
}

function effectiveStatus(project) {
  if (project.status) {
    return project.status;
  }

  return hasPublishableImage(project) ? "Published" : "Draft";
}

function build() {
  const projects = readProjects()
    .filter((project) => project.visible !== false && effectiveStatus(project) === "Published")
    .map(publicProject);
  const categories = readCategories()
    .filter((category) => category.visible !== false)
    .map((category) => ({
      slug: category.slug,
      label: category.label,
      path: category.path || `/?category=${category.slug}`
    }));

  const output = `const galleryItems = ${JSON.stringify(projects, null, 2)};\n\nwindow.galleryItems = galleryItems;\n\nfunction normalizeGalleryValue(value) {\n  return String(value || \"\").trim().toLowerCase();\n}\n\nfunction galleryCategoryMatches(item, category) {\n  const requested = normalizeGalleryValue(category);\n\n  if (!requested || requested === \"all\") {\n    return true;\n  }\n\n  return normalizeGalleryValue(item.categorySlug) === requested\n    || normalizeGalleryValue(item.category) === requested\n    || normalizeGalleryValue(item.categoryLabel) === requested;\n}\n\nfunction getItemById(id) {\n  return galleryItems.find((item) => item.id === id) || null;\n}\n\nfunction getItemsByCategory(category) {\n  return galleryItems.filter((item) => galleryCategoryMatches(item, category));\n}\n\nfunction getItemsByTag(tag) {\n  const requested = normalizeGalleryValue(tag);\n  return galleryItems.filter((item) => Array.isArray(item.tags) && item.tags.some((itemTag) => normalizeGalleryValue(itemTag) === requested));\n}\n\nfunction getFeaturedItems() {\n  return galleryItems.filter((item) => item.featured === true);\n}\n\nfunction getRelatedItems(id) {\n  const item = getItemById(id);\n\n  if (!item || !Array.isArray(item.related)) {\n    return [];\n  }\n\n  return item.related.map(getItemById).filter(Boolean);\n}\n\nwindow.getItemById = getItemById;\nwindow.getItemsByCategory = getItemsByCategory;\nwindow.getItemsByTag = getItemsByTag;\nwindow.getFeaturedItems = getFeaturedItems;\nwindow.getRelatedItems = getRelatedItems;\nwindow.galleryHelpers = {\n  getItemById,\n  getItemsByCategory,\n  getItemsByTag,\n  getFeaturedItems,\n  getRelatedItems\n};\n`;
  const categoriesOutput = `window.galleryCategories = ${JSON.stringify(categories, null, 2)};\n`;
  fs.writeFileSync(outputFile, output);
  fs.writeFileSync(categoriesOutputFile, categoriesOutput);
  return { projectCount: projects.length, categoryCount: categories.length };
}

if (require.main === module) {
  const result = build();
  console.log(`Built ${path.relative(root, outputFile)} with ${result.projectCount} visible projects.`);
  console.log(`Built ${path.relative(root, categoriesOutputFile)} with ${result.categoryCount} visible categories.`);
}

module.exports = { build };
