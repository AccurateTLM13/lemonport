const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "projects.json");
const outputFile = path.join(root, "assets", "js", "gallery-data.js");

function readProjects() {
  if (!fs.existsSync(contentFile)) {
    throw new Error(`Missing ${path.relative(root, contentFile)}. Run scripts/import-gallery-data.js first.`);
  }

  return JSON.parse(fs.readFileSync(contentFile, "utf8"));
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

  const output = `window.galleryItems = ${JSON.stringify(projects, null, 2)};\n`;
  fs.writeFileSync(outputFile, output);
  return projects.length;
}

if (require.main === module) {
  const count = build();
  console.log(`Built ${path.relative(root, outputFile)} with ${count} visible projects.`);
}

module.exports = { build };
