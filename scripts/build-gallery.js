const fs = require("node:fs");
const path = require("node:path");
const { backupFiles } = require("./file-backup");
const { assertValidContent, formatValidationResult } = require("./content-validation");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const categoriesFile = path.join(root, "content", "categories.json");
const outputFile = path.join(root, "assets", "js", "gallery-data.js");
const categoriesOutputFile = path.join(root, "assets", "js", "gallery-categories.js");
const vrgVaultFile = path.join(root, "content", "vrg-vault.json");
const vrgVaultOutputFile = path.join(root, "assets", "js", "vrg-vault-data.js");

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

  const publicData = {
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
    curation: project.curation && typeof project.curation === "object" ? {
      homepage: project.curation.homepage === true,
      featuredRank: Number(project.curation.featuredRank || 0),
      randomWeight: Number(project.curation.randomWeight || 1)
    } : {
      homepage: false,
      featuredRank: 0,
      randomWeight: 1
    },
    width: project.width,
    height: project.height,
    sizes: project.sizes,
    variants: Array.isArray(project.variants) ? project.variants : []
  };

  if (project.href) {
    publicData.href = project.href;
  }

  return publicData;
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

function buildVrgVaultPayload(sourceProjects) {
  if (!fs.existsSync(vrgVaultFile)) {
    return null;
  }

  const config = JSON.parse(fs.readFileSync(vrgVaultFile, "utf8"));
  const projectMap = new Map(sourceProjects.map((project) => [project.id, project]));
  const cards = (Array.isArray(config.cards) ? config.cards : [])
    .map((entry) => {
      const project = projectMap.get(entry.projectId);
      const imagePath = project?.image || entry.imagePath || "";

      if (!imagePath) {
        return null;
      }

      return {
        id: entry.projectId,
        title: entry.title || project?.title || "",
        series: entry.series || "Creator Series",
        edition: entry.edition || "1/1",
        role: entry.role || "Creator",
        business: entry.business || "",
        category: entry.category || "",
        knownFor: entry.knownFor || project?.description || "",
        badges: entry.badges || "",
        gradeText: entry.gradeText || "Rare Pull",
        gradeNumber: entry.gradeNumber || "9.8",
        cert: entry.cert || `VRG-${String(entry.projectId || "").toUpperCase()}`,
        seed: entry.seed || "13",
        rarity: entry.rarity || "Rare",
        imagePath
      };
    })
    .filter(Boolean);

  return {
    cards,
    series: Array.isArray(config.series) ? config.series : []
  };
}

function build() {
  const sourceProjects = readProjects();
  const sourceCategories = readCategories();
  const validation = assertValidContent(sourceProjects, sourceCategories);
  const projects = sourceProjects
    .filter((project) => project.visible !== false && effectiveStatus(project) === "Published")
    .map(publicProject);
  const categories = sourceCategories
    .filter((category) => category.visible !== false)
    .map((category) => ({
      slug: category.slug,
      label: category.label,
      path: category.path || `/archive/?category=${category.slug}`
    }));

  const generatedWarning = "/* Generated by scripts/build-gallery.js. Do not edit directly; update content/*.json and rebuild. */";
  const output = `${generatedWarning}\nconst galleryItems = ${JSON.stringify(projects, null, 2)};\n\nwindow.galleryItems = galleryItems;\n\nfunction normalizeGalleryValue(value) {\n  return String(value || \"\").trim().toLowerCase();\n}\n\nfunction galleryCategoryMatches(item, category) {\n  const requested = normalizeGalleryValue(category);\n\n  if (!requested || requested === \"all\") {\n    return true;\n  }\n\n  return normalizeGalleryValue(item.categorySlug) === requested\n    || normalizeGalleryValue(item.category) === requested\n    || normalizeGalleryValue(item.categoryLabel) === requested;\n}\n\nfunction getItemById(id) {\n  return galleryItems.find((item) => item.id === id) || null;\n}\n\nfunction getItemsByCategory(category) {\n  return galleryItems.filter((item) => galleryCategoryMatches(item, category));\n}\n\nfunction getItemsByTag(tag) {\n  const requested = normalizeGalleryValue(tag);\n  return galleryItems.filter((item) => Array.isArray(item.tags) && item.tags.some((itemTag) => normalizeGalleryValue(itemTag) === requested));\n}\n\nfunction getFeaturedItems() {\n  return galleryItems.filter((item) => item.featured === true);\n}\n\nfunction getRelatedItems(id) {\n  const item = getItemById(id);\n\n  if (!item || !Array.isArray(item.related)) {\n    return [];\n  }\n\n  return item.related.map(getItemById).filter(Boolean);\n}\n\nwindow.getItemById = getItemById;\nwindow.getItemsByCategory = getItemsByCategory;\nwindow.getItemsByTag = getItemsByTag;\nwindow.getFeaturedItems = getFeaturedItems;\nwindow.getRelatedItems = getRelatedItems;\nwindow.galleryHelpers = {\n  getItemById,\n  getItemsByCategory,\n  getItemsByTag,\n  getFeaturedItems,\n  getRelatedItems\n};\n`;
  const categoriesOutput = `${generatedWarning}\nwindow.galleryCategories = ${JSON.stringify(categories, null, 2)};\n`;
  const vrgVaultPayload = buildVrgVaultPayload(sourceProjects);
  const vrgVaultOutput = vrgVaultPayload
    ? `${generatedWarning}\nwindow.vrgVaultCards = ${JSON.stringify(vrgVaultPayload.cards, null, 2)};\nwindow.vrgVaultSeries = ${JSON.stringify(vrgVaultPayload.series, null, 2)};\n`
    : "";
  const backupTargets = [outputFile, categoriesOutputFile];

  if (vrgVaultOutput) {
    backupTargets.push(vrgVaultOutputFile);
  }

  backupFiles(backupTargets);
  fs.writeFileSync(outputFile, output);
  fs.writeFileSync(categoriesOutputFile, categoriesOutput);

  if (vrgVaultOutput) {
    fs.writeFileSync(vrgVaultOutputFile, vrgVaultOutput);
  }

  return {
    projectCount: projects.length,
    categoryCount: categories.length,
    vrgVaultCount: vrgVaultPayload ? vrgVaultPayload.cards.length : 0,
    warnings: validation.warnings
  };
}

if (require.main === module) {
  const result = build();
  console.log(`Built ${path.relative(root, outputFile)} with ${result.projectCount} visible projects.`);
  console.log(`Built ${path.relative(root, categoriesOutputFile)} with ${result.categoryCount} visible categories.`);

  if (result.vrgVaultCount) {
    console.log(`Built ${path.relative(root, vrgVaultOutputFile)} with ${result.vrgVaultCount} vault cards.`);
  }

  if (result.warnings.length) {
    console.log(formatValidationResult({ errors: [], warnings: result.warnings }));
  }
}

module.exports = { build };
