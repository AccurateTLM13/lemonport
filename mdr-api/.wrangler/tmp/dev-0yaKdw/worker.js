var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .wrangler/tmp/bundle-blUodB/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-blUodB/checked-fetch.js"() {
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_modules_watch_stub();
  }
});

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// handlers.js
var require_handlers = __commonJS({
  "handlers.js"(exports, module) {
    init_checked_fetch();
    init_modules_watch_stub();
    var CHECKOUT_PATH = "/million-dollar-receipt/";
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
      return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    __name(hmacSha256, "hmacSha256");
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
    __name(jsonResponse, "jsonResponse");
    function parseBody(raw) {
      if (!raw) {
        return {};
      }
      return JSON.parse(raw);
    }
    __name(parseBody, "parseBody");
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
    __name(validateAlias, "validateAlias");
    function getEnv(env, key) {
      if (env && env[key] !== void 0) {
        return env[key];
      }
      if (typeof process !== "undefined" && process.env) {
        return process.env[key];
      }
      return "";
    }
    __name(getEnv, "getEnv");
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
    __name(stripeRequest, "stripeRequest");
    function encodeForm(fields) {
      return new URLSearchParams(fields).toString();
    }
    __name(encodeForm, "encodeForm");
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
    __name(createCheckoutSession, "createCheckoutSession");
    async function handleStripeWebhook(rawBody, signature, store, env) {
      const stripeWebhookSecret = String(getEnv(env, "STRIPE_WEBHOOK_SECRET") || "").trim();
      if (!stripeWebhookSecret) {
        throw new Error("Webhook secret is not configured.");
      }
      const parts = String(signature || "").split(",").reduce((acc, part) => {
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
      if (!await store.markEventProcessed(event.id)) {
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
    __name(handleStripeWebhook, "handleStripeWebhook");
    async function routeRequest2({ method, pathname, searchParams, rawBody, headers }, store, env) {
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
      return jsonResponse({ error: "Not found." }, 404);
    }
    __name(routeRequest2, "routeRequest");
    module.exports = {
      routeRequest: routeRequest2,
      jsonResponse,
      createCheckoutSession,
      handleStripeWebhook
    };
  }
});

// store-d1.js
var require_store_d1 = __commonJS({
  "store-d1.js"(exports, module) {
    init_checked_fetch();
    init_modules_watch_stub();
    var GOAL_COUNT = 1e6;
    var PRICE_CENTS = 100;
    var TIERS = [
      { min: 1, max: 100, label: "Founding Fools" },
      { min: 101, max: 1e3, label: "Premium Regret" },
      { min: 1001, max: 1e4, label: "Certified Enablers" },
      { min: 10001, max: 5e4, label: "Nothing Investors" },
      { min: 50001, max: 1e5, label: "Receipt Royalty" },
      { min: 100001, max: 5e5, label: "Internet Witnesses" },
      { min: 500001, max: 999999, label: "Late to Nothing" },
      { min: 1e6, max: 1e6, label: "The Final Nothing" }
    ];
    function tierForNumber(number) {
      const match = TIERS.find((tier) => number >= tier.min && number <= tier.max);
      return match ? match.label : "Internet Witnesses";
    }
    __name(tierForNumber, "tierForNumber");
    function serialForNumber(number) {
      return `MDR-${String(number).padStart(6, "0")}-NTH`;
    }
    __name(serialForNumber, "serialForNumber");
    function rowToReceipt(row) {
      if (!row) return null;
      return {
        number: row.number,
        serial: row.serial,
        alias: row.alias,
        message: row.message_status === "published" ? row.message : "",
        messageStatus: row.message_status,
        tier: row.tier,
        amountCents: row.amount_cents,
        purchasedAt: row.purchased_at
      };
    }
    __name(rowToReceipt, "rowToReceipt");
    function makeD1Store2(db) {
      return {
        PRICE_CENTS,
        GOAL_COUNT,
        TIERS,
        tierForNumber,
        serialForNumber,
        async getStats() {
          const countRow = await db.prepare("SELECT COUNT(*) AS count FROM receipts").first();
          const count = countRow ? countRow.count : 0;
          const totalCents = count * PRICE_CENTS;
          const recentResult = await db.prepare("SELECT * FROM receipts ORDER BY number DESC LIMIT 20").all();
          const recent = (recentResult.results || []).map(rowToReceipt);
          return {
            totalCents,
            count,
            remaining: Math.max(0, GOAL_COUNT - count),
            goalCount: GOAL_COUNT,
            priceCents: PRICE_CENTS,
            recent
          };
        },
        async getReceipt(number) {
          const row = await db.prepare("SELECT * FROM receipts WHERE number = ?").bind(number).first();
          return row ? rowToReceipt(row) : null;
        },
        async listReceipts(options = {}) {
          let query = "SELECT * FROM receipts WHERE 1=1";
          const params = [];
          if (options.tier) {
            query += " AND tier = ?";
            params.push(options.tier);
          }
          if (options.q) {
            query += " AND (CAST(number AS TEXT) LIKE ? OR LOWER(alias) LIKE ? OR LOWER(message) LIKE ?)";
            const wildcard = `%${options.q.toLowerCase()}%`;
            params.push(wildcard, wildcard, wildcard);
          }
          const countQuery = query.replace("SELECT *", "SELECT COUNT(*) AS total");
          const totalRow = await db.prepare(countQuery).bind(...params).first();
          const total = totalRow ? totalRow.total : 0;
          query += " ORDER BY number DESC LIMIT ? OFFSET ?";
          const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
          const cursor = Number(options.cursor) || 0;
          const queryParams = [...params, limit, cursor];
          const result = await db.prepare(query).bind(...queryParams).all();
          const rows = result.results || [];
          return {
            items: rows.map(rowToReceipt),
            nextCursor: cursor + rows.length < total ? cursor + rows.length : null,
            total
          };
        },
        async getRandomReceipt() {
          const row = await db.prepare("SELECT * FROM receipts ORDER BY RANDOM() LIMIT 1").first();
          return row ? rowToReceipt(row) : null;
        },
        async createReceipt({ alias, message, stripeSessionId }) {
          const countRow = await db.prepare("SELECT COUNT(*) AS count FROM receipts").first();
          const count = countRow ? countRow.count : 0;
          if (count >= GOAL_COUNT) {
            throw new Error("Sold out.");
          }
          if (stripeSessionId) {
            const existing = await db.prepare("SELECT * FROM receipts WHERE stripe_session_id = ?").bind(stripeSessionId).first();
            if (existing) {
              return rowToReceipt(existing);
            }
          }
          const nextRow = await db.prepare("SELECT COALESCE(MAX(number), 0) + 1 AS next FROM receipts").first();
          const number = nextRow ? nextRow.next : 1;
          const serial = serialForNumber(number);
          const safeAlias = String(alias || "ANONYMOUS").trim().slice(0, 32);
          const safeMessage = String(message || "").trim().slice(0, 120);
          const messageStatus = safeMessage ? "pending" : "published";
          const tier = tierForNumber(number);
          const purchasedAt = (/* @__PURE__ */ new Date()).toISOString();
          const safeSessionId = stripeSessionId || null;
          await db.prepare(`
        INSERT INTO receipts (
          number, serial, alias, message, message_status, tier, amount_cents, purchased_at, stripe_session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
            number,
            serial,
            safeAlias,
            safeMessage,
            messageStatus,
            tier,
            PRICE_CENTS,
            purchasedAt,
            safeSessionId
          ).run();
          return {
            number,
            serial,
            alias: safeAlias,
            message: messageStatus === "published" ? safeMessage : "",
            messageStatus,
            tier,
            amountCents: PRICE_CENTS,
            purchasedAt
          };
        },
        async markEventProcessed(eventId) {
          try {
            await db.prepare("INSERT INTO stripe_events (event_id, processed_at) VALUES (?, ?)").bind(eventId, (/* @__PURE__ */ new Date()).toISOString()).run();
            return true;
          } catch (error) {
            return false;
          }
        },
        async seedMockReceipts(configReceipts) {
          const countRow = await db.prepare("SELECT COUNT(*) AS count FROM receipts").first();
          const count = countRow ? countRow.count : 0;
          if (count > 0) {
            return count;
          }
          const statements = [];
          (configReceipts || []).forEach((entry) => {
            const number = entry.number;
            const serial = serialForNumber(number);
            const alias = entry.alias;
            const message = entry.message || "";
            const messageStatus = entry.messageStatus || "published";
            const tier = tierForNumber(number);
            const purchasedAt = entry.purchasedAt;
            statements.push(
              db.prepare(`
            INSERT OR IGNORE INTO receipts (
              number, serial, alias, message, message_status, tier, amount_cents, purchased_at, stripe_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
                number,
                serial,
                alias,
                message,
                messageStatus,
                tier,
                PRICE_CENTS,
                purchasedAt,
                null
              )
            );
          });
          if (statements.length > 0) {
            await db.batch(statements);
          }
          const finalCountRow = await db.prepare("SELECT COUNT(*) AS count FROM receipts").first();
          return finalCountRow ? finalCountRow.count : 0;
        }
      };
    }
    __name(makeD1Store2, "makeD1Store");
    module.exports = {
      makeD1Store: makeD1Store2
    };
  }
});

// .wrangler/tmp/bundle-blUodB/middleware-loader.entry.ts
init_checked_fetch();
init_modules_watch_stub();

// .wrangler/tmp/bundle-blUodB/middleware-insertion-facade.js
init_checked_fetch();
init_modules_watch_stub();

// worker.js
init_checked_fetch();
init_modules_watch_stub();
var import_handlers = __toESM(require_handlers());
var import_store_d1 = __toESM(require_store_d1());

// ../content/million-dollar-receipt.json
var million_dollar_receipt_default = {
  title: "The Million Dollar Receipt",
  tagline: "1,000,000 people bought nothing together.",
  goalCount: 1e6,
  priceCents: 100,
  launched: false,
  apiBase: "",
  mockStats: {
    totalCents: 1847200,
    count: 18472,
    remaining: 981528
  },
  moneyModel: {
    label: "Transparent split",
    allocations: [
      { use: "Creator/operator", percent: 50 },
      { use: "Weird public internet projects", percent: 25 },
      { use: "Local small business experiments", percent: 15 },
      { use: "Platform/legal/admin/taxes", percent: 10 }
    ]
  },
  tiers: [
    { min: 1, max: 100, label: "Founding Fools" },
    { min: 101, max: 1e3, label: "Premium Regret" },
    { min: 1001, max: 1e4, label: "Certified Enablers" },
    { min: 10001, max: 5e4, label: "Nothing Investors" },
    { min: 50001, max: 1e5, label: "Receipt Royalty" },
    { min: 100001, max: 5e5, label: "Internet Witnesses" },
    { min: 500001, max: 999999, label: "Late to Nothing" },
    { min: 1e6, max: 1e6, label: "The Final Nothing" }
  ],
  milestones: [
    { cents: 1e4, unlock: "Add a barcode to the receipt", key: "barcode" },
    { cents: 5e4, unlock: "Add printer sound effects", key: "printerSfx" },
    { cents: 1e5, unlock: "Release the first Nothing Report", key: "nothingReport" },
    { cents: 5e5, unlock: "Add the Wall of Regret", key: "wallOfRegret" },
    { cents: 1e6, unlock: "Add receipt search", key: "receiptSearch" },
    { cents: 25e5, unlock: "Attempt a physical receipt print", key: "physicalPrint" },
    { cents: 5e6, unlock: "Launch the Nothing Museum", key: "nothingMuseum" },
    { cents: 1e7, unlock: "Create a live receipt printer cam", key: "printerCam" },
    { cents: 25e6, unlock: "Release a downloadable giant receipt PDF", key: "receiptPdf" },
    { cents: 5e7, unlock: "Build the Million Dollar Nothing documentary page", key: "documentary" },
    { cents: 1e8, unlock: "Archive the final receipt forever", key: "finalArchive" }
  ],
  legal: {
    disclaimer: "You are purchasing a $1 novelty listing on a public digital receipt. This is not an investment, donation, raffle, sweepstakes, or promise of future value. You receive a public receipt line and a shareable digital receipt card.",
    moderation: "Messages may be moderated before appearing publicly. Offensive, hateful, illegal, or spammy submissions may be rejected or edited.",
    refund: "Probably not, because refunding nothing creates too much something."
  },
  faq: [
    {
      q: "What am I buying?",
      a: "A $1 public listing on The Million Dollar Receipt."
    },
    {
      q: "Do I get anything useful?",
      a: "No."
    },
    {
      q: "Is this a donation?",
      a: "No. A transparent allocation of funds is published on this page."
    },
    {
      q: "Is this an investment?",
      a: "No."
    },
    {
      q: "Can I get a refund?",
      a: "Probably not, because refunding nothing creates too much something."
    },
    {
      q: "Can I write anything in my message?",
      a: "No. Messages can be moderated."
    },
    {
      q: "What happens at $1,000,000?",
      a: "The final receipt gets archived, celebrated, and turned into a permanent internet artifact."
    }
  ],
  howItWorks: [
    "Click Buy Nothing for $1.",
    "Watch your lemon ride through the Nothing Factory.",
    "Pay one dollar. Receive zero utility.",
    "Get a permanent line on the world's longest receipt for absolutely nothing."
  ],
  wallOfRegret: [
    { alias: "TLM13", message: "Cheaper than therapy.", number: 42 },
    { alias: "VOID_WALKER", message: "I expected nothing and received it.", number: 1337 },
    { alias: "CPA_DAD", message: "My accountant has questions.", number: 9001 },
    { alias: "SUB_HATER", message: "This is still better than most subscriptions.", number: 404 }
  ],
  nothingReport: {
    title: "Q1 Nothing Report",
    date: "2026-05-23",
    summary: "Strong demand for nothing continues as consumers seek alternatives to expensive somethings.",
    sections: [
      { heading: "Nothing sold", body: "18,472 units of certified nothing moved through the factory this quarter." },
      { heading: "Top buyer messages", body: '"Cheaper than therapy." "I expected nothing and received it."' },
      { heading: "Funniest names", body: "VOID_WALKER, CPA_DAD, SUB_HATER" },
      { heading: "Milestones hit", body: "Barcode unlocked. Printer sound effects pending." },
      { heading: "Current absurdity index", body: "Elevated but stable." },
      { heading: "Operational challenges", body: "Existential quality control backlog at the Nothing Factory." }
    ]
  },
  mockReceipts: [
    { number: 18472, alias: "TLM13", message: "Worth every penny. Unfortunately.", purchasedAt: "2026-05-23T14:22:00Z", messageStatus: "published" },
    { number: 18471, alias: "VOID_WALKER", message: "I expected nothing and received it.", purchasedAt: "2026-05-23T14:18:00Z", messageStatus: "published" },
    { number: 18470, alias: "RECEIPT_FAN", message: "", purchasedAt: "2026-05-23T14:15:00Z", messageStatus: "published" },
    { number: 18469, alias: "CPA_DAD", message: "My accountant has questions.", purchasedAt: "2026-05-23T14:10:00Z", messageStatus: "published" },
    { number: 18468, alias: "SUB_HATER", message: "This is still better than most subscriptions.", purchasedAt: "2026-05-23T14:05:00Z", messageStatus: "published" },
    { number: 18467, alias: "LEMON_LOVER", message: "The conveyor got me.", purchasedAt: "2026-05-23T13:58:00Z", messageStatus: "published" },
    { number: 18466, alias: "NOTHING_BETA", message: "Early to nothing.", purchasedAt: "2026-05-23T13:50:00Z", messageStatus: "published" },
    { number: 18465, alias: "REGRET_KING", message: "", purchasedAt: "2026-05-23T13:42:00Z", messageStatus: "published" },
    { number: 18464, alias: "INTERNET_WIT", message: "A million-dollar idea, unfortunately.", purchasedAt: "2026-05-23T13:30:00Z", messageStatus: "published" },
    { number: 18463, alias: "FACTORY_GHOST", message: "Certified by existential QC.", purchasedAt: "2026-05-23T13:22:00Z", messageStatus: "published" },
    { number: 18462, alias: "BAD_DECISION", message: "Complete.", purchasedAt: "2026-05-23T13:15:00Z", messageStatus: "published" },
    { number: 18461, alias: "THERMAL_INK", message: "Print me.", purchasedAt: "2026-05-23T13:08:00Z", messageStatus: "published" },
    { number: 18460, alias: "CHECKOUT_GUY", message: "", purchasedAt: "2026-05-23T13:00:00Z", messageStatus: "published" },
    { number: 18459, alias: "NO_UTILITY", message: "Utility: none detected.", purchasedAt: "2026-05-23T12:55:00Z", messageStatus: "published" },
    { number: 18458, alias: "MUSEUM_GUEST", message: "Put me in the Nothing Museum.", purchasedAt: "2026-05-23T12:48:00Z", messageStatus: "published" },
    { number: 18457, alias: "FRIEND_TAG", message: "Challenge accepted.", purchasedAt: "2026-05-23T12:40:00Z", messageStatus: "published" },
    { number: 18456, alias: "DOT_MATRIX", message: "", purchasedAt: "2026-05-23T12:32:00Z", messageStatus: "published" },
    { number: 18455, alias: "STANDARD_ED", message: "Nothing, Standard Edition.", purchasedAt: "2026-05-23T12:25:00Z", messageStatus: "published" },
    { number: 18454, alias: "PREMIUM_REG", message: "Premium Regret tier unlocked.", purchasedAt: "2026-05-23T12:18:00Z", messageStatus: "published" },
    { number: 18453, alias: "FOUNDING_F", message: "Founding Fool #53.", purchasedAt: "2026-05-23T12:10:00Z", messageStatus: "published" }
  ]
};

// worker.js
var seeded = false;
var worker_default = {
  async fetch(request, env, ctx) {
    const d1Store = (0, import_store_d1.makeD1Store)(env.DB);
    if (!seeded) {
      try {
        const count = await d1Store.seedMockReceipts(million_dollar_receipt_default.mockReceipts);
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
      const result = await (0, import_handlers.routeRequest)(
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

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-blUodB/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-blUodB/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
