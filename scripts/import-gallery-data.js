const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const galleryDataFile = path.join(root, "assets", "js", "gallery-data.js");
const contentDir = path.join(root, "content");
const contentFile = path.join(contentDir, "projects.json");

function importGalleryData() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(galleryDataFile, "utf8"), sandbox, { filename: galleryDataFile });

  const projects = (sandbox.window.galleryItems || []).map((project) => ({
    ...project,
    slug: project.slug || project.id,
    year: project.year || "",
    description: project.description || "",
    featured: project.featured || false,
    visible: project.visible !== false,
    createdAt: project.createdAt || "",
    updatedAt: project.updatedAt || ""
  }));

  fs.mkdirSync(contentDir, { recursive: true });
  fs.writeFileSync(contentFile, `${JSON.stringify(projects, null, 2)}\n`);
  return projects.length;
}

if (require.main === module) {
  const count = importGalleryData();
  console.log(`Imported ${count} projects into ${path.relative(root, contentFile)}.`);
}

module.exports = { importGalleryData };
