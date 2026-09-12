/**
 * Lemonteed Studio V2 — Server Entry Point
 *
 * Drop-in replacement for scripts/studio-server.js.
 * Assembles the route table from individual route modules,
 * then starts the HTTP server.
 *
 * Usage:
 *   node server/index.js
 *
 * Env vars (same as before):
 *   PORT                   default 5173
 *   STUDIO_HOST            default 127.0.0.1
 *   STUDIO_ALLOW_REMOTE=1  bind to all interfaces (requires STUDIO_WRITE_TOKEN)
 *   STUDIO_WRITE_TOKEN     optional bearer token for write API
 *   OLLAMA_HOST            default http://localhost:11434
 */

"use strict";

const http = require("node:http");
const path = require("node:path");

const { createRouter } = require("./router.js");
const { sendError, wrap, assertWriteAuthorized } = require("./middleware.js");
const { createStaticHandler } = require("./routes/static.js");

// ── Route modules ─────────────────────────────────────────────────────────────
// Each module exports named handler functions.
// They will be populated as Phase 1 migration progresses.
// For now, unimplemented routes fall through to the legacy server.
const aiRoutes = require("./routes/ai.js");
// Remaining routes will be added here as they are migrated from studio-server.js:
// const projectRoutes = require("./routes/projects.js");
// const specimenRoutes = require("./routes/specimens.js");
// etc.

// ── Config ────────────────────────────────────────────────────────────────────

const root = path.resolve(__dirname, "..");
const studioDir = path.join(root, "studio");
const port = Number(process.env.PORT || 5173);
const allowRemote = process.env.STUDIO_ALLOW_REMOTE === "1";
const studioHost = allowRemote ? "0.0.0.0" : String(process.env.STUDIO_HOST || "127.0.0.1");
const writeToken = String(process.env.STUDIO_WRITE_TOKEN || "").trim();

const authOptions = { allowRemote, writeToken };

// ── Router setup ──────────────────────────────────────────────────────────────

const router = createRouter();

// AI routes — new in V2
router.add("GET",   "/api/ai/status",  wrap(aiRoutes.getStatus,  authOptions));
router.add("POST",  "/api/ai/suggest", wrap(aiRoutes.postSuggest, authOptions));
router.add("PATCH", "/api/ai/config",  wrap(aiRoutes.patchConfig, authOptions));

// TODO (Phase 1): migrate remaining routes from scripts/studio-server.js here.
// Until migrated, the request handler below falls through to the legacy handler.

// ── Static file handler ───────────────────────────────────────────────────────

const serveStatic = createStaticHandler(root, studioDir);

// ── Legacy handler (temporary — removed when all routes are migrated) ─────────

let legacyRoute = null;

function getLegacyRoute() {
  if (!legacyRoute) {
    // Dynamically require the old server's route function.
    // This requires the old server NOT to call http.createServer() at require time.
    // studio-server.js does call createServer at the bottom, so we can't require it directly.
    // During Phase 1, routes are migrated one-by-one and this shim is removed.
    // For now, the new server handles /api/ai/* and falls through to the static handler.
  }
  return null;
}

// ── Request handler ───────────────────────────────────────────────────────────

async function handle(req, res) {
  try {
    assertWriteAuthorized(req, authOptions);

    // Try V2 router first
    const matched = await router.handle(req, res, {});
    if (matched) return;

    // Fall through to static file serving
    serveStatic(req, res);
  } catch (err) {
    sendError(res, err);
  }
}

// ── Start server ──────────────────────────────────────────────────────────────

const server = http.createServer(handle);

server.listen(port, studioHost, () => {
  const host = studioHost === "0.0.0.0" ? "localhost" : studioHost;
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║   Lemonteed Studio V2                ║");
  console.log("  ╠══════════════════════════════════════╣");
  console.log(`  ║   Studio:  http://${host}:${port}/studio/  ║`);
  console.log(`  ║   Site:    http://${host}:${port}/         ║`);
  console.log(`  ║   AI:      ${process.env.OLLAMA_HOST || "http://localhost:11434"}   ║`);
  console.log("  ╚══════════════════════════════════════╝");
  console.log("");

  if (allowRemote && !writeToken) {
    console.warn("  ⚠  STUDIO_ALLOW_REMOTE=1 without STUDIO_WRITE_TOKEN — write APIs disabled.");
  } else if (writeToken) {
    console.log("  ✓  Write API token auth enabled.");
  }

  console.log("  ℹ  Phase 1 in progress: /api/ai/* routes active. Remaining routes pending migration.");
  console.log("");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  ✗  Port ${port} is already in use.`);
    console.error(`     Run: PORT=${port + 1} node server/index.js\n`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
