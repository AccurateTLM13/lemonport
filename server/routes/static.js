/**
 * Lemonteed Studio V2 — Static File Server
 *
 * Serves the public site and Studio files.
 * Blocks sensitive directories from direct URL access.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { resolvePathWithinRoot } = require("../../scripts/security-utils.js");
const { sendText } = require("../middleware.js");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm"
};

// Paths blocked from direct URL access
const BLOCKED_PREFIXES = [
  "content/",
  "scripts/",
  "server/",
  ".studio-backups/",
  ".studio-uploads/",
  ".tmp-screenshots/",
  ".git/",
  ".agents/"
];

/**
 * @param {string} root - Absolute path to the repo root
 * @param {string} studioDir - Absolute path to the studio/ directory
 */
function createStaticHandler(root, studioDir) {
  return function serveFile(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const decodedPathname = decodeURIComponent(url.pathname);

    const pathname = decodedPathname === "/"
      ? "/index.html"
      : decodedPathname.endsWith("/")
        ? `${decodedPathname}index.html`
        : decodedPathname;

    const isStudio = pathname.startsWith("/studio/");
    const base = isStudio ? studioDir : root;
    const relative = isStudio
      ? pathname.replace(/^\/studio\//, "")
      : pathname.replace(/^\//, "");

    // Block sensitive paths (non-studio requests only — studio/ is always allowed)
    if (!isStudio && BLOCKED_PREFIXES.some((prefix) => relative.startsWith(prefix))) {
      sendText(res, 404, "Not found");
      return;
    }

    const filePath = resolvePathWithinRoot(base, relative);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "content-type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  };
}

module.exports = { createStaticHandler };
