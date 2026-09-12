/**
 * Lemonteed Studio V2 — Middleware
 *
 * Shared request-handling primitives extracted from studio-server.js.
 * All functions are pure utilities — no global state.
 */

"use strict";

const maxBodyBytes = 80 * 1024 * 1024; // 80 MB
const mutatingMethods = new Set(["POST", "PATCH", "DELETE", "PUT"]);

// ── Response helpers ──────────────────────────────────────────────────────────

function sendJson(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendError(res, error) {
  console.error("SERVER ERROR:", error);
  const validation = error.validation || null;
  const status = error.statusCode || 400;
  sendJson(res, status, {
    error: error.message,
    errors: validation ? validation.errors : undefined,
    warnings: validation ? validation.warnings : undefined
  });
}

// ── Body parsing ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBodyBytes) {
        reject(new Error("Upload is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return readBody(req).then((body) => JSON.parse(body.toString("utf8") || "{}"));
}

// ── Auth / CSRF ───────────────────────────────────────────────────────────────

/**
 * Validates CSRF and optional bearer token for mutating requests.
 * Throws with statusCode on failure, returns silently on success.
 *
 * @param {object} req
 * @param {{ allowRemote: boolean, writeToken: string }} options
 */
function assertWriteAuthorized(req, { allowRemote, writeToken }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (!mutatingMethods.has(req.method) || (!pathname.startsWith("/api/") && pathname !== "/api")) {
    return;
  }

  const host = req.headers.host;
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin) {
    let originUrl;
    try { originUrl = new URL(origin); } catch {
      const err = new Error("CSRF check failed: Malformed Origin.");
      err.statusCode = 403;
      throw err;
    }
    if (originUrl.host !== host) {
      const err = new Error("CSRF check failed: Invalid Origin.");
      err.statusCode = 403;
      throw err;
    }
  }

  if (referer) {
    let refererUrl;
    try { refererUrl = new URL(referer); } catch {
      const err = new Error("CSRF check failed: Malformed Referer.");
      err.statusCode = 403;
      throw err;
    }
    if (refererUrl.host !== host) {
      const err = new Error("CSRF check failed: Invalid Referer.");
      err.statusCode = 403;
      throw err;
    }
  }

  if (!writeToken) {
    if (allowRemote) {
      const err = new Error("Write API disabled. Set STUDIO_WRITE_TOKEN when STUDIO_ALLOW_REMOTE=1.");
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const header = String(req.headers.authorization || "");
  if (header !== `Bearer ${writeToken}`) {
    const err = new Error("Unauthorized.");
    err.statusCode = 401;
    throw err;
  }
}

// ── Data URL decoding ─────────────────────────────────────────────────────────

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL.");
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error("Uploaded image exceeds the maximum size limit of 15 MB.");
  }
  return { mime, buffer };
}

// ── Route wrapper ─────────────────────────────────────────────────────────────

/**
 * Wraps an async route handler with error catching and auth checking.
 * Use this to keep route files clean.
 *
 * @param {Function} handler async (req, res, ctx) => void
 * @param {{ allowRemote, writeToken }} authOptions
 */
function wrap(handler, authOptions) {
  return async function (req, res, ctx) {
    try {
      assertWriteAuthorized(req, authOptions);
      await handler(req, res, ctx);
    } catch (error) {
      sendError(res, error);
    }
  };
}

module.exports = {
  sendJson,
  sendText,
  sendError,
  readBody,
  readJsonBody,
  assertWriteAuthorized,
  decodeDataUrl,
  wrap
};
