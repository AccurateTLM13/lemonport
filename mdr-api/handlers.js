const crypto = require("node:crypto");
const store = require("./store");

const STRIPE_SECRET = String(process.env.STRIPE_SECRET_KEY || "").trim();
const STRIPE_WEBHOOK_SECRET = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
const SITE_URL = String(process.env.MDR_SITE_URL || "http://localhost:5173").replace(/\/$/, "");
const CHECKOUT_PATH = "/million-dollar-receipt/";

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

async function stripeRequest(pathname, options = {}) {
  if (!STRIPE_SECRET) {
    throw new Error("Stripe is not configured.");
  }

  const response = await fetch(`https://api.stripe.com/v1${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
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

async function createCheckoutSession({ alias, message }) {
  const safeAlias = validateAlias(alias);
  const safeMessage = String(message || "").trim().slice(0, 120);
  const stats = store.getStats();

  if (stats.remaining <= 0) {
    throw new Error("All receipt slots are sold out.");
  }

  if (!STRIPE_SECRET) {
    const receipt = store.createReceipt({ alias: safeAlias, message: safeMessage });
    return {
      mode: "mock",
      receipt,
      url: `${SITE_URL}${CHECKOUT_PATH}?paid=mock&number=${receipt.number}`
    };
  }

  const session = await stripeRequest("/checkout/sessions", {
    method: "POST",
    body: encodeForm({
      mode: "payment",
      success_url: `${SITE_URL}${CHECKOUT_PATH}?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${CHECKOUT_PATH}?cancelled=1`,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": "Nothing, Standard Edition",
      "line_items[0][price_data][product_data][description]": "One public receipt line. Zero utility.",
      "line_items[0][price_data][unit_amount]": String(store.PRICE_CENTS),
      "line_items[0][quantity]": "1",
      "metadata[alias]": safeAlias,
      "metadata[message]": safeMessage
    })
  });

  return {
    mode: "stripe",
    url: session.url,
    sessionId: session.id
  };
}

async function handleStripeWebhook(rawBody, signature) {
  if (!STRIPE_WEBHOOK_SECRET) {
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
  const expected = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(payload).digest("hex");

  if (expected !== parts.v1) {
    throw new Error("Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody);

  if (!store.markEventProcessed(event.id)) {
    return { received: true, duplicate: true };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    store.createReceipt({
      alias: session.metadata?.alias,
      message: session.metadata?.message,
      stripeSessionId: session.id
    });
  }

  return { received: true };
}

async function routeRequest({ method, pathname, searchParams, rawBody, headers }) {
  if (method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && pathname === "/stats") {
    return jsonResponse(store.getStats());
  }

  if (method === "GET" && pathname === "/receipts/random") {
    const receipt = store.getRandomReceipt();

    if (!receipt) {
      return jsonResponse({ error: "No receipts yet." }, 404);
    }

    return jsonResponse(receipt);
  }

  if (method === "GET" && pathname === "/receipts") {
    return jsonResponse(
      store.listReceipts({
        cursor: searchParams.get("cursor"),
        limit: searchParams.get("limit"),
        q: searchParams.get("q"),
        tier: searchParams.get("tier")
      })
    );
  }

  const receiptMatch = pathname.match(/^\/receipts\/(\d+)$/);

  if (method === "GET" && receiptMatch) {
    const receipt = store.getReceipt(Number(receiptMatch[1]));

    if (!receipt) {
      return jsonResponse({ error: "Receipt not found." }, 404);
    }

    return jsonResponse(receipt);
  }

  if (method === "POST" && pathname === "/checkout/create") {
    const body = parseBody(rawBody);
    const result = await createCheckoutSession(body);
    return jsonResponse(result, 201);
  }

  if (method === "POST" && pathname === "/webhooks/stripe") {
    const result = await handleStripeWebhook(rawBody, headers["stripe-signature"]);
    return jsonResponse(result);
  }

  return jsonResponse({ error: "Not found." }, 404);
}

module.exports = {
  routeRequest,
  jsonResponse,
  createCheckoutSession,
  handleStripeWebhook
};
