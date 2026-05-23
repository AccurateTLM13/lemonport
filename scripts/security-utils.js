const path = require("node:path");

const UNSAFE_URL_SCHEMES = /^(javascript|data|vbscript):/i;

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafePublicUrl(value, options = {}) {
  const allowEmpty = options.allowEmpty === true;
  const allowFragment = options.allowFragment !== false;
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return allowEmpty;
  }

  if (allowFragment && trimmed.startsWith("#") && !trimmed.startsWith("#/")) {
    return true;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return true;
  }

  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch (error) {
    return false;
  }

  if (UNSAFE_URL_SCHEMES.test(parsed.protocol)) {
    return false;
  }

  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

function assertSafePublicUrl(value, label, options = {}) {
  if (!isSafePublicUrl(value, options)) {
    throw new Error(`${label} must be a safe http(s), site-relative, or fragment URL.`);
  }

  return String(value ?? "").trim();
}

function isSafeRelativeAssetPath(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.includes("\\")) {
      return false;
    }

    const segments = trimmed.split("/").filter(Boolean);
    return !segments.some((segment) => segment === "." || segment === "..");
  }

  if (trimmed.includes("\\") || trimmed.includes("://")) {
    return false;
  }

  const segments = trimmed.split("/").filter(Boolean);
  return segments.length > 0 && !segments.some((segment) => segment === "." || segment === "..");
}

function assertSafeRelativeAssetPath(value, label) {
  if (!isSafeRelativeAssetPath(value)) {
    throw new Error(`${label} must be a safe site-relative or content-relative path.`);
  }

  return String(value ?? "").trim();
}

function resolvePathWithinRoot(rootDir, relativePath) {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, relativePath);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (resolved !== root && !resolved.startsWith(rootPrefix)) {
    return null;
  }

  return resolved;
}

module.exports = {
  assertSafePublicUrl,
  assertSafeRelativeAssetPath,
  hasText,
  isSafePublicAssetPath: isSafeRelativeAssetPath,
  isSafePublicUrl,
  resolvePathWithinRoot
};
