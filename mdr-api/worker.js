import { routeRequest } from "./handlers.js";
import { makeD1Store } from "./store-d1.js";
import mdrConfig from "../content/million-dollar-receipt.json";

let seeded = false;

export default {
  async fetch(request, env, ctx) {
    const d1Store = makeD1Store(env.DB);

    if (!seeded) {
      try {
        const count = await d1Store.seedMockReceipts(mdrConfig.mockReceipts);
        console.log(`Worker D1 lazy seeding check: ${count} receipts in DB.`);
        seeded = true;
      } catch (err) {
        console.error("Worker D1 lazy seeding failed/skipped:", err);
      }
    }

    const url = new URL(request.url);
    const method = request.method;
    const searchParams = url.searchParams;
    const rawBody = method === "POST" ? await request.text() : "";

    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }

    try {
      const result = await routeRequest(
        {
          method,
          pathname: url.pathname,
          searchParams,
          rawBody,
          headers
        },
        d1Store,
        env
      );

      return new Response(result.body, {
        status: result.status,
        headers: result.headers
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal worker error." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }
};
