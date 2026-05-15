const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const statuses = ["Draft", "Ready", "Published", "Hidden", "Archived", "Deleted"];
const responsiveWidths = [320, 480, 640, 768, 900, 1024, 1600];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function imageValue(project) {
  return project.image || (project.sizes && (project.sizes.large || project.sizes.medium || project.sizes.small)) || "";
}

function thumbnailValue(project) {
  return project.thumbnail || (Array.isArray(project.variants) && project.variants.length ? project.variants[0].url : "") || "";
}

function publicPathExists(url) {
  if (!hasText(url) || !url.startsWith("/")) {
    return false;
  }

  const filePath = path.resolve(root, decodeURIComponent(url.replace(/^\//, "")));
  return filePath.startsWith(root) && fs.existsSync(filePath);
}

function expectedVariantWidths(project) {
  const width = Number(project.width || 0);

  if (!width) {
    return [];
  }

  return responsiveWidths.filter((candidate) => candidate < width);
}

function effectiveStatus(project) {
  if (hasText(project.status)) {
    return project.status;
  }

  return imageValue(project) && thumbnailValue(project) ? "Published" : "Draft";
}

function addDuplicateErrors(items, field, label, errors) {
  const seen = new Map();

  items.forEach((item, index) => {
    const value = String(item && item[field] ? item[field] : "").trim();

    if (!value) {
      return;
    }

    if (seen.has(value)) {
      errors.push(`${label} ${field} "${value}" is duplicated at indexes ${seen.get(value)} and ${index}.`);
      return;
    }

    seen.set(value, index);
  });
}

function validateContent(projects, categories, options = {}) {
  const errors = [];
  const warnings = [];
  const checkFiles = options.checkFiles !== false;

  if (!Array.isArray(projects)) {
    errors.push("content/projects.json must contain a JSON array.");
    return { errors, warnings };
  }

  if (!Array.isArray(categories)) {
    errors.push("content/categories.json must contain a JSON array.");
    return { errors, warnings };
  }

  addDuplicateErrors(categories, "slug", "Category", errors);
  addDuplicateErrors(projects, "id", "Project", errors);
  addDuplicateErrors(projects, "slug", "Project", errors);

  const categoriesBySlug = new Map();
  categories.forEach((category, index) => {
    if (!category || typeof category !== "object") {
      errors.push(`Category at index ${index} must be an object.`);
      return;
    }

    ["slug", "label", "prefix"].forEach((field) => {
      if (!hasText(category[field])) {
        errors.push(`Category at index ${index} is missing ${field}.`);
      }
    });

    if (hasText(category.slug)) {
      categoriesBySlug.set(category.slug, category);
    }
  });

  const projectsById = new Map();
  projects.forEach((project) => {
    if (project && hasText(project.id)) {
      projectsById.set(project.id, project);
    }
  });

  projects.forEach((project, index) => {
    if (!project || typeof project !== "object") {
      errors.push(`Project at index ${index} must be an object.`);
      return;
    }

    const label = hasText(project.id) ? project.id : `index ${index}`;
    const status = effectiveStatus(project);
    const image = imageValue(project);
    const thumbnail = thumbnailValue(project);
    const isPublishableStatus = status === "Ready" || status === "Published";

    ["id", "title", "slug", "category"].forEach((field) => {
      if (!hasText(project[field])) {
        errors.push(`Project ${label} is missing ${field}.`);
      }
    });

    if (hasText(project.category) && !categoriesBySlug.has(project.category)) {
      errors.push(`Project ${label} references unknown category "${project.category}".`);
    }

    if (hasText(project.status) && !statuses.includes(project.status)) {
      errors.push(`Project ${label} has invalid status "${project.status}". Expected ${statuses.join(", ")}.`);
    }

    if (isPublishableStatus) {
      if (!hasText(project.alt)) {
        errors.push(`Project ${label} must have alt text before it can be ${status}.`);
      }

      if (!image || !thumbnail) {
        errors.push(`Project ${label} must have image and thumbnail before it can be ${status}.`);
      }
    }

    if (checkFiles && project.visible !== false && status === "Published") {
      if (image && !publicPathExists(image)) {
        errors.push(`Project ${label} image does not exist: ${image}`);
      }

      if (thumbnail && !publicPathExists(thumbnail)) {
        errors.push(`Project ${label} thumbnail does not exist: ${thumbnail}`);
      }
    }

    if (!Array.isArray(project.tags)) {
      warnings.push(`Project ${label} tags should be an array.`);
    }

    if (!Array.isArray(project.toolsUsed)) {
      warnings.push(`Project ${label} toolsUsed should be an array.`);
    }

    if (!Array.isArray(project.related)) {
      warnings.push(`Project ${label} related should be an array.`);
    }

    if (project.curation && typeof project.curation !== "object") {
      errors.push(`Project ${label} curation must be an object.`);
    }

    if (project.curation && typeof project.curation === "object") {
      if (Object.prototype.hasOwnProperty.call(project.curation, "randomWeight")) {
        const randomWeight = Number(project.curation.randomWeight);

        if (!Number.isFinite(randomWeight) || randomWeight < 0) {
          errors.push(`Project ${label} curation.randomWeight must be a non-negative number.`);
        }
      }

      if (Object.prototype.hasOwnProperty.call(project.curation, "featuredRank")) {
        const featuredRank = Number(project.curation.featuredRank);

        if (!Number.isFinite(featuredRank) || featuredRank < 0) {
          errors.push(`Project ${label} curation.featuredRank must be a non-negative number.`);
        }
      }
    }

    asArray(project.related).forEach((relatedId) => {
      if (!projectsById.has(relatedId)) {
        errors.push(`Project ${label} references missing related project "${relatedId}".`);
      }
    });

    if (project.visible !== false && status === "Published" && (!Array.isArray(project.variants) || !project.variants.length)) {
      warnings.push(`Project ${label} is published without responsive image variants.`);
    }

    if (Array.isArray(project.variants)) {
      const variantWidths = new Set();

      project.variants.forEach((variant, variantIndex) => {
        if (!variant || typeof variant !== "object") {
          errors.push(`Project ${label} variant at index ${variantIndex} must be an object.`);
          return;
        }

        const variantWidth = Number(variant.width);

        if (!Number.isFinite(variantWidth) || variantWidth <= 0) {
          errors.push(`Project ${label} variant at index ${variantIndex} has an invalid width.`);
        } else if (variantWidths.has(variantWidth)) {
          warnings.push(`Project ${label} has duplicate variant width ${variantWidth}.`);
        } else {
          variantWidths.add(variantWidth);
        }

        if (!hasText(variant.url)) {
          errors.push(`Project ${label} variant at index ${variantIndex} is missing url.`);
          return;
        }

        if (checkFiles && project.visible !== false && status === "Published" && !publicPathExists(variant.url)) {
          errors.push(`Project ${label} variant file does not exist: ${variant.url}`);
        }
      });

      if (project.visible !== false && status === "Published") {
        expectedVariantWidths(project).forEach((width) => {
          if (!variantWidths.has(width)) {
            warnings.push(`Project ${label} is missing responsive variant width ${width}.`);
          }
        });
      }
    }
  });

  return { errors, warnings };
}

function formatValidationResult(result) {
  const lines = [];

  if (result.errors.length) {
    lines.push("Content validation failed:");
    result.errors.forEach((error) => lines.push(`- ${error}`));
  }

  if (result.warnings.length) {
    lines.push(result.errors.length ? "" : "Content validation warnings:");
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return lines.join("\n");
}

function assertValidContent(projects, categories, options = {}) {
  const result = validateContent(projects, categories, options);

  if (result.errors.length) {
    const error = new Error(formatValidationResult(result));
    error.validation = result;
    throw error;
  }

  return result;
}

function loadContent() {
  return {
    projects: JSON.parse(fs.readFileSync(path.join(root, "content", "projects.json"), "utf8")),
    categories: JSON.parse(fs.readFileSync(path.join(root, "content", "categories.json"), "utf8"))
  };
}

function runCli() {
  const { projects, categories } = loadContent();
  const result = validateContent(projects, categories);

  if (result.errors.length || result.warnings.length) {
    console.log(formatValidationResult(result));
  }

  if (result.errors.length) {
    process.exitCode = 1;
    return;
  }

  if (!result.warnings.length) {
    console.log("Content validation passed.");
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  statuses,
  responsiveWidths,
  validateContent,
  assertValidContent,
  formatValidationResult,
  imageValue,
  thumbnailValue
};
