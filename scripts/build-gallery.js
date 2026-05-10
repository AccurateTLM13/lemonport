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
  return {
    id: project.id,
    title: project.title,
    category: project.category,
    categoryLabel: project.categoryLabel,
    description: project.description || "",
    alt: project.alt,
    width: project.width,
    height: project.height,
    sizes: project.sizes
  };
}

function build() {
  const projects = readProjects()
    .filter((project) => project.visible !== false)
    .map(publicProject);
  const categories = readCategories()
    .filter((category) => category.visible !== false)
    .map((category) => ({
      slug: category.slug,
      label: category.label,
      path: category.path || `/?category=${category.slug}`
    }));

  const output = `window.galleryItems = ${JSON.stringify(projects, null, 2)};\n`;
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
