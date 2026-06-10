const CHECKOUT_PATH = "/million-dollar-receipt/";

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body, status = 200, headers = {}) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

function parseBody(raw) {
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function validateAlias(alias) {
  const value = String(alias || "").trim();

  if (!value || value.length > 32) {
    throw new Error("Alias is required and must be 32 characters or fewer.");
  }

  if (!/^[a-zA-Z0-9_\-. ]+$/.test(value)) {
    throw new Error("Alias contains invalid characters.");
  }

  return value;
}

function getEnv(env, key) {
  if (env && env[key] !== undefined) {
    return env[key];
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return "";
}

async function stripeRequest(pathname, options = {}, env) {
  const stripeSecret = String(getEnv(env, "STRIPE_SECRET_KEY") || "").trim();
  if (!stripeSecret) {
    throw new Error("Stripe is not configured.");
  }

  const response = await fetch(`https://api.stripe.com/v1${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: options.body
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Stripe request failed.");
  }

  return data;
}

function encodeForm(fields) {
  return new URLSearchParams(fields).toString();
}

async function createCheckoutSession({ alias, message }, store, env) {
  const stripeSecret = String(getEnv(env, "STRIPE_SECRET_KEY") || "").trim();
  const siteUrl = String(getEnv(env, "MDR_SITE_URL") || "http://localhost:5173").replace(/\/$/, "");

  const safeAlias = validateAlias(alias);
  const safeMessage = String(message || "").trim().slice(0, 120);
  const stats = await store.getStats();

  if (stats.remaining <= 0) {
    throw new Error("All receipt slots are sold out.");
  }

  if (!stripeSecret) {
    const receipt = await store.createReceipt({ alias: safeAlias, message: safeMessage });
    return {
      mode: "mock",
      receipt,
      url: `${siteUrl}${CHECKOUT_PATH}?paid=mock&number=${receipt.number}`
    };
  }

  const session = await stripeRequest("/checkout/sessions", {
    method: "POST",
    body: encodeForm({
      mode: "payment",
      success_url: `${siteUrl}${CHECKOUT_PATH}?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${CHECKOUT_PATH}?cancelled=1`,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": "Nothing, Standard Edition",
      "line_items[0][price_data][product_data][description]": "One public receipt line. Zero utility.",
      "line_items[0][price_data][unit_amount]": String(store.PRICE_CENTS),
      "line_items[0][quantity]": "1",
      "metadata[alias]": safeAlias,
      "metadata[message]": safeMessage
    })
  }, env);

  return {
    mode: "stripe",
    url: session.url,
    sessionId: session.id
  };
}

async function handleStripeWebhook(rawBody, signature, store, env) {
  const stripeWebhookSecret = String(getEnv(env, "STRIPE_WEBHOOK_SECRET") || "").trim();
  if (!stripeWebhookSecret) {
    throw new Error("Webhook secret is not configured.");
  }

  const parts = String(signature || "")
    .split(",")
    .reduce((acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});

  const timestamp = parts.t;
  const payload = `${timestamp}.${rawBody}`;
  const expected = await hmacSha256(stripeWebhookSecret, payload);

  if (expected !== parts.v1) {
    throw new Error("Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody);

  if (!(await store.markEventProcessed(event.id))) {
    return { received: true, duplicate: true };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await store.createReceipt({
      alias: session.metadata?.alias,
      message: session.metadata?.message,
      stripeSessionId: session.id
    });
  }

  return { received: true };
}

async function routeRequest({ method, pathname, searchParams, rawBody, headers }, store, env) {
  if (method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && pathname === "/stats") {
    return jsonResponse(await store.getStats());
  }

  if (method === "GET" && pathname === "/receipts/random") {
    const receipt = await store.getRandomReceipt();

    if (!receipt) {
      return jsonResponse({ error: "No receipts yet." }, 404);
    }

    return jsonResponse(receipt);
  }

  if (method === "GET" && pathname === "/receipts") {
    return jsonResponse(
      await store.listReceipts({
        cursor: searchParams.get("cursor"),
        limit: searchParams.get("limit"),
        q: searchParams.get("q"),
        tier: searchParams.get("tier")
      })
    );
  }

  const receiptMatch = pathname.match(/^\/receipts\/(\d+)$/);

  if (method === "GET" && receiptMatch) {
    const receipt = await store.getReceipt(Number(receiptMatch[1]));

    if (!receipt) {
      return jsonResponse({ error: "Receipt not found." }, 404);
    }

    return jsonResponse(receipt);
  }

  if (method === "POST" && pathname === "/checkout/create") {
    const body = parseBody(rawBody);
    const result = await createCheckoutSession(body, store, env);
    return jsonResponse(result, 201);
  }

  if (method === "POST" && pathname === "/webhooks/stripe") {
    const result = await handleStripeWebhook(rawBody, headers["stripe-signature"], store, env);
    return jsonResponse(result);
  }

  if (method === "GET" && (pathname === "/moderation" || pathname === "/api/moderation")) {
    const adminToken = String(getEnv(env, "MDR_ADMIN_TOKEN") || "").trim();
    if (adminToken) {
      const authHeader = String(headers["authorization"] || "");
      if (authHeader !== `Bearer ${adminToken}`) {
        return jsonResponse({ error: "Unauthorized." }, 401);
      }
    }
    const status = searchParams ? searchParams.get("status") : null;
    const receipts = await store.listModerationReceipts({ status });
    return jsonResponse(receipts);
  }

  if (method === "POST" && (pathname === "/moderation/status" || pathname === "/api/moderation/status")) {
    const adminToken = String(getEnv(env, "MDR_ADMIN_TOKEN") || "").trim();
    if (adminToken) {
      const authHeader = String(headers["authorization"] || "");
      if (authHeader !== `Bearer ${adminToken}`) {
        return jsonResponse({ error: "Unauthorized." }, 401);
      }
    }
    const body = parseBody(rawBody);
    const number = Number(body.number);
    const status = String(body.status || "").trim();

    if (Number.isNaN(number)) {
      return jsonResponse({ error: "Invalid receipt number." }, 400);
    }
    try {
      const receipt = await store.updateMessageStatus(number, status);
      if (!receipt) {
        return jsonResponse({ error: "Receipt not found." }, 404);
      }
      return jsonResponse(receipt);
    } catch (e) {
      return jsonResponse({ error: e.message }, 400);
    }
  }

  return jsonResponse({ error: "Not found." }, 404);
}

module.exports = {
  routeRequest,
  jsonResponse,
  createCheckoutSession,
  handleStripeWebhook
};
