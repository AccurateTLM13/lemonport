/**
 * Lemonteed Studio V2 — Router
 *
 * Declarative route table. Each route is { method, path, handler }.
 * - method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "*"
 * - path:   exact string or RegExp (capture groups become req.params)
 * - handler: async (req, res, ctx) => void
 *
 * Usage:
 *   const router = createRouter();
 *   router.add("GET", "/api/projects", getProjects);
 *   router.add("PATCH", /^\/api\/projects\/([^/]+)$/, updateProject);
 *   router.handle(req, res, serverCtx);
 */

"use strict";

function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    routes.push({ method: method.toUpperCase(), path, handler });
  }

  async function handle(req, res, ctx) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const method = req.method.toUpperCase();

    for (const route of routes) {
      if (route.method !== "*" && route.method !== method) continue;

      if (typeof route.path === "string") {
        if (pathname !== route.path) continue;
        req.params = [];
        await route.handler(req, res, ctx);
        return true;
      }

      if (route.path instanceof RegExp) {
        const match = pathname.match(route.path);
        if (!match) continue;
        req.params = match.slice(1);
        await route.handler(req, res, ctx);
        return true;
      }
    }

    return false; // no route matched — caller falls through to static file serving
  }

  return { add, handle, routes };
}

module.exports = { createRouter };
