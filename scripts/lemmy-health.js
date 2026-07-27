const fs = require("node:fs");
const path = require("node:path");
const { validateContent } = require("./content-validation");
const { mediaHealth } = require("./media-health");
const { galleryWidths, statuses } = require("./site-config");

const ROOT = path.resolve(__dirname, "..");
const PROJECTS_FILE = path.join(ROOT, "content", "projects.json");
const CATEGORIES_FILE = path.join(ROOT, "content", "categories.json");
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

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

function effectiveStatus(project) {
  if (hasText(project.status) && statuses.includes(project.status)) {
    return project.status;
  }

  return imageValue(project) && thumbnailValue(project) ? "Published" : "Draft";
}

function expectedVariantWidths(project) {
  const width = Number(project.width || 0);
  return width ? galleryWidths.filter((candidate) => candidate < width) : [];
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_LIMIT;
  }

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${MAX_LIMIT}.`);
  }

  return limit;
}

function addIssue(issues, issue) {
  issues.push({
    code: issue.code,
    severity: issue.severity,
    ...(issue.projectId ? { projectId: issue.projectId } : {}),
    ...(issue.field ? { field: issue.field } : {}),
    message: issue.message,
    ...(issue.suggestedAction ? { suggestedAction: issue.suggestedAction } : {})
  });
}

function sortIssues(issues) {
  return issues.sort((a, b) => {
    const severityDelta = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (severityDelta) {
      return severityDelta;
    }

    const projectDelta = String(a.projectId || "").localeCompare(String(b.projectId || ""));
    if (projectDelta) {
      return projectDelta;
    }

    const codeDelta = a.code.localeCompare(b.code);
    return codeDelta || a.message.localeCompare(b.message);
  });
}

function collectLemmyHealth({ projects, categories, validation, media, limit, generatedAt } = {}) {
  const records = Array.isArray(projects) ? projects : [];
  const categoryRecords = Array.isArray(categories) ? categories : [];
  const validationResult = validation && typeof validation === "object" ? validation : {};
  const mediaResult = media && typeof media === "object" ? media : {};
  const issues = [];
  const summary = {
    drafts: 0,
    ready: 0,
    published: 0,
    missingAlt: 0,
    missingDescription: 0,
    brokenRelated: 0,
    missingMedia: 0,
    missingVariants: 0,
    validationErrors: asArray(validationResult.errors).length,
    validationWarnings: asArray(validationResult.warnings).length
  };
  const projectIds = new Set(records.filter((project) => project && typeof project === "object").map((project) => project.id));

  records.forEach((project) => {
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      return;
    }

    const projectId = String(project.id || "").trim();
    const title = String(project.title || projectId || "Untitled project").trim();
    const status = effectiveStatus(project);
    const action = projectId ? { type: "open-record", projectId } : null;

    if (status === "Draft") {
      summary.drafts += 1;
      addIssue(issues, { code: "PROJECT_DRAFT", severity: "info", projectId, message: `${title} is still a draft.`, suggestedAction: action });
    } else if (status === "Ready") {
      summary.ready += 1;
      addIssue(issues, { code: "PROJECT_READY", severity: "info", projectId, message: `${title} is ready for publication.`, suggestedAction: action });
    } else if (status === "Published") {
      summary.published += 1;
    }

    if (!hasText(project.alt)) {
      summary.missingAlt += 1;
      addIssue(issues, { code: "PROJECT_MISSING_ALT", severity: status === "Published" ? "error" : "warning", projectId, field: "alt", message: `${title} is missing alt text.`, suggestedAction: action });
    }

    if (!hasText(project.description)) {
      summary.missingDescription += 1;
      addIssue(issues, { code: "PROJECT_MISSING_DESCRIPTION", severity: status === "Published" ? "error" : "warning", projectId, field: "description", message: `${title} is missing a description.`, suggestedAction: action });
    }

    const brokenRelated = asArray(project.related).filter((relatedId) => !projectIds.has(relatedId));
    if (brokenRelated.length) {
      summary.brokenRelated += 1;
      addIssue(issues, { code: "PROJECT_BROKEN_RELATED", severity: "error", projectId, field: "related", message: `${title} references missing related record(s): ${brokenRelated.join(", ")}.`, suggestedAction: action });
    }

    const image = imageValue(project);
    const thumbnail = thumbnailValue(project);
    if (!image) {
      addIssue(issues, { code: "PROJECT_MISSING_IMAGE", severity: status === "Published" ? "error" : "warning", projectId, field: "image", message: `${title} is missing its source image.`, suggestedAction: action });
    }
    if (!thumbnail) {
      addIssue(issues, { code: "PROJECT_MISSING_THUMBNAIL", severity: status === "Published" ? "error" : "warning", projectId, field: "thumbnail", message: `${title} is missing its thumbnail.`, suggestedAction: action });
    }
    if (!image || !thumbnail) {
      summary.missingMedia += 1;
    }

    const expectedWidths = expectedVariantWidths(project);
    const actualWidths = new Set(asArray(project.variants).map((variant) => Number(variant && variant.width)).filter(Boolean));
    const missingWidths = expectedWidths.filter((width) => !actualWidths.has(width));
    if (missingWidths.length) {
      summary.missingVariants += 1;
      addIssue(issues, { code: "PROJECT_MISSING_VARIANT", severity: "warning", projectId, field: "variants", message: `${title} is missing responsive variant width(s): ${missingWidths.join(", ")}.`, suggestedAction: action });
    }
  });

  asArray(validationResult.errors).forEach((message) => {
    addIssue(issues, { code: "ARCHIVE_VALIDATION_ERROR", severity: "error", field: "archive", message: String(message) });
  });
  asArray(validationResult.warnings).forEach((message) => {
    addIssue(issues, { code: "ARCHIVE_VALIDATION_WARNING", severity: "warning", field: "archive", message: String(message) });
  });
  asArray(mediaResult.missingReferencedImages).forEach((file) => {
    addIssue(issues, { code: "ARCHIVE_VALIDATION_ERROR", severity: "error", field: "media", message: `Referenced image is missing: ${String(file)}.` });
  });

  const sortedIssues = sortIssues(issues);
  const resolvedLimit = normalizeLimit(limit);
  const mediaHealth = {
    ok: mediaResult.ok !== false,
    referencedImageCount: Number(mediaResult.referencedImageCount || 0),
    galleryImageCount: Number(mediaResult.galleryImageCount || 0),
    missingReferencedImages: asArray(mediaResult.missingReferencedImages),
    unusedGalleryImageCount: asArray(mediaResult.unusedGalleryImages).length
  };
  const hasErrors = summary.validationErrors > 0 || mediaHealth.missingReferencedImages.length > 0 || sortedIssues.some((issue) => issue.severity === "error");

  return {
    generatedAt: generatedAt || new Date().toISOString(),
    ok: !hasErrors,
    status: hasErrors ? "needs-attention" : sortedIssues.length ? "review" : "clear",
    summary: {
      ...summary,
      projectCount: records.length,
      categoryCount: categoryRecords.length,
      issueCount: sortedIssues.length
    },
    mediaHealth,
    issues: sortedIssues.slice(0, resolvedLimit),
    issueCount: sortedIssues.length,
    limit: resolvedLimit
  };
}

function loadArchiveHealth(limit) {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"));
  const categories = JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf8"));
  const validation = validateContent(projects, categories);
  const media = mediaHealth(projects, categories);
  return collectLemmyHealth({ projects, categories, validation, media, limit });
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(loadArchiveHealth(process.argv[2]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  collectLemmyHealth,
  effectiveStatus,
  expectedVariantWidths,
  loadArchiveHealth,
  normalizeLimit
};
