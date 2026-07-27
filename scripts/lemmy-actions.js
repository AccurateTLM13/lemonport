const OPERATION_KEYS = new Map([
  ["validate-archive", []],
  ["refresh-health", []],
  ["rebuild-gallery", []],
  ["regenerate-project-variants", ["projectId"]],
  ["open-record", ["projectId"]]
]);

const PROJECT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

function actionError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw actionError(`${label} must be an object.`);
  }
}

function validateActionRequest(body) {
  assertPlainObject(body, "Request body");
  const topLevelKeys = Object.keys(body);
  const unknownTopLevelKeys = topLevelKeys.filter((key) => key !== "operation" && key !== "arguments");
  if (unknownTopLevelKeys.length) {
    throw actionError(`Unknown request field(s): ${unknownTopLevelKeys.join(", ")}.`);
  }

  const operation = typeof body.operation === "string" ? body.operation.trim() : "";
  if (!OPERATION_KEYS.has(operation)) {
    throw actionError(`Unknown operation: ${operation || "(missing)"}.`);
  }

  const args = body.arguments === undefined ? {} : body.arguments;
  assertPlainObject(args, "arguments");
  const allowedKeys = OPERATION_KEYS.get(operation);
  const unknownKeys = Object.keys(args).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length) {
    throw actionError(`Unknown argument(s) for ${operation}: ${unknownKeys.join(", ")}.`);
  }

  if (allowedKeys.includes("projectId")) {
    const projectId = typeof args.projectId === "string" ? args.projectId.trim() : "";
    if (!PROJECT_ID_PATTERN.test(projectId)) {
      throw actionError("projectId must be a canonical project identifier.");
    }
    return { operation, arguments: { projectId } };
  }

  return { operation, arguments: {} };
}

function resultEnvelope(operation, summary, extra = {}) {
  return {
    operation,
    success: true,
    summary,
    affectedProjectIds: [],
    warnings: [],
    ...extra
  };
}

function executeLemmyAction(body, dependencies) {
  assertPlainObject(dependencies, "dependencies");
  const request = validateActionRequest(body);

  if (request.operation === "open-record") {
    throw actionError("open-record is a client-only navigation action.");
  }

  if (request.operation === "validate-archive") {
    const validation = dependencies.validateArchive();
    return resultEnvelope(
      request.operation,
      validation.ok ? "Archive validation passed." : "Archive validation found errors.",
      { validation, warnings: Array.isArray(validation.warnings) ? validation.warnings : [] }
    );
  }

  if (request.operation === "refresh-health") {
    const health = dependencies.refreshHealth();
    return resultEnvelope(
      request.operation,
      health.ok ? "Lemmy health refreshed without blocking errors." : "Lemmy health found blocking archive issues.",
      { health, warnings: health.mediaHealth && health.mediaHealth.unusedGalleryImageCount ? [`${health.mediaHealth.unusedGalleryImageCount} unused gallery file(s) need review.`] : [] }
    );
  }

  if (request.operation === "rebuild-gallery") {
    const buildResult = dependencies.rebuildGallery();
    const validation = dependencies.validateArchive();
    const health = dependencies.refreshHealth();
    return resultEnvelope(
      request.operation,
      `Gallery rebuilt with ${Number(buildResult.projectCount || 0)} visible project(s).`,
      {
        build: buildResult,
        validation,
        health,
        warnings: Array.isArray(buildResult.warnings) ? buildResult.warnings : []
      }
    );
  }

  if (request.operation === "regenerate-project-variants") {
    const projectId = request.arguments.projectId;
    if (typeof dependencies.hasProject === "function" && !dependencies.hasProject(projectId)) {
      throw actionError(`Unknown project ID: ${projectId}.`);
    }
    const regeneration = dependencies.regenerateProjectVariants(projectId);
    const validation = dependencies.validateArchive();
    const health = dependencies.refreshHealth();
    return resultEnvelope(
      request.operation,
      `Regenerated responsive variants for ${projectId}.`,
      {
        affectedProjectIds: [projectId],
        regeneration,
        validation,
        health,
        warnings: health.mediaHealth && health.mediaHealth.unusedGalleryImageCount ? [`${health.mediaHealth.unusedGalleryImageCount} unused gallery file(s) need review.`] : []
      }
    );
  }

  throw actionError(`Unknown operation: ${request.operation}.`);
}

module.exports = {
  OPERATION_KEYS,
  PROJECT_ID_PATTERN,
  executeLemmyAction,
  validateActionRequest
};
