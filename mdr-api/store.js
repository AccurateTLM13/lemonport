const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const receiptsFile = path.join(dataDir, "receipts.json");
const eventsFile = path.join(dataDir, "stripe-events.json");
const GOAL_COUNT = 1000000;
const PRICE_CENTS = 100;

const TIERS = [
  { min: 1, max: 100, label: "Founding Fools" },
  { min: 101, max: 1000, label: "Premium Regret" },
  { min: 1001, max: 10000, label: "Certified Enablers" },
  { min: 10001, max: 50000, label: "Nothing Investors" },
  { min: 50001, max: 100000, label: "Receipt Royalty" },
  { min: 100001, max: 500000, label: "Internet Witnesses" },
  { min: 500001, max: 999999, label: "Late to Nothing" },
  { min: 1000000, max: 1000000, label: "The Final Nothing" }
];

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file, fallback) {
  ensureDataDir();

  if (!fs.existsSync(file)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function tierForNumber(number) {
  const match = TIERS.find((tier) => number >= tier.min && number <= tier.max);
  return match ? match.label : "Internet Witnesses";
}

function serialForNumber(number) {
  return `MDR-${String(number).padStart(6, "0")}-NTH`;
}

function loadReceipts() {
  return readJson(receiptsFile, { nextNumber: 1, items: [] });
}

function saveReceipts(data) {
  writeJson(receiptsFile, data);
}

function loadEvents() {
  return readJson(eventsFile, { processed: [] });
}

function saveEvents(data) {
  writeJson(eventsFile, data);
}

function getStats() {
  const data = loadReceipts();
  const count = data.items.length;
  const totalCents = count * PRICE_CENTS;
  const recent = data.items.slice(-20).reverse();

  return {
    totalCents,
    count,
    remaining: Math.max(0, GOAL_COUNT - count),
    goalCount: GOAL_COUNT,
    priceCents: PRICE_CENTS,
    recent
  };
}

function formatReceipt(item) {
  return {
    number: item.number,
    serial: item.serial,
    alias: item.alias,
    message: item.messageStatus === "published" ? item.message : "",
    messageStatus: item.messageStatus,
    tier: item.tier,
    amountCents: item.amountCents,
    purchasedAt: item.purchasedAt
  };
}

function getReceipt(number) {
  const data = loadReceipts();
  const item = data.items.find((entry) => entry.number === number);
  return item ? formatReceipt(item) : null;
}

function listReceipts(options = {}) {
  const data = loadReceipts();
  let items = [...data.items];

  if (options.tier) {
    items = items.filter((item) => item.tier === options.tier);
  }

  if (options.q) {
    const query = String(options.q).toLowerCase();
    items = items.filter((item) => {
      return (
        String(item.number).includes(query) ||
        item.alias.toLowerCase().includes(query) ||
        (item.message && item.message.toLowerCase().includes(query))
      );
    });
  }

  items.sort((a, b) => b.number - a.number);

  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const cursor = Number(options.cursor) || 0;
  const slice = items.slice(cursor, cursor + limit);

  return {
    items: slice.map(formatReceipt),
    nextCursor: cursor + slice.length < items.length ? cursor + slice.length : null,
    total: items.length
  };
}

function getRandomReceipt() {
  const data = loadReceipts();

  if (!data.items.length) {
    return null;
  }

  const index = crypto.randomInt(0, data.items.length);
  return formatReceipt(data.items[index]);
}

function createReceipt({ alias, message, stripeSessionId }) {
  const data = loadReceipts();

  if (data.items.length >= GOAL_COUNT) {
    throw new Error("Sold out.");
  }

  if (stripeSessionId && data.items.some((item) => item.stripeSessionId === stripeSessionId)) {
    return formatReceipt(data.items.find((item) => item.stripeSessionId === stripeSessionId));
  }

  const number = data.nextNumber;
  const receipt = {
    number,
    serial: serialForNumber(number),
    alias: String(alias || "ANONYMOUS").trim().slice(0, 32),
    message: String(message || "").trim().slice(0, 120),
    messageStatus: message && message.trim() ? "pending" : "published",
    tier: tierForNumber(number),
    amountCents: PRICE_CENTS,
    purchasedAt: new Date().toISOString(),
    stripeSessionId: stripeSessionId || null
  };

  data.items.push(receipt);
  data.nextNumber += 1;
  saveReceipts(data);

  return formatReceipt(receipt);
}

function markEventProcessed(eventId) {
  const events = loadEvents();

  if (events.processed.includes(eventId)) {
    return false;
  }

  events.processed.push(eventId);
  saveEvents(events);
  return true;
}

function seedMockReceipts(configReceipts) {
  const data = loadReceipts();

  if (data.items.length) {
    return data.items.length;
  }

  (configReceipts || []).forEach((entry) => {
    const number = entry.number;
    data.items.push({
      number,
      serial: serialForNumber(number),
      alias: entry.alias,
      message: entry.message || "",
      messageStatus: entry.messageStatus || "published",
      tier: tierForNumber(number),
      amountCents: PRICE_CENTS,
      purchasedAt: entry.purchasedAt,
      stripeSessionId: null
    });
    data.nextNumber = Math.max(data.nextNumber, number + 1);
  });

  saveReceipts(data);
  return data.items.length;
}

module.exports = {
  GOAL_COUNT,
  PRICE_CENTS,
  TIERS,
  tierForNumber,
  serialForNumber,
  getStats,
  getReceipt,
  listReceipts,
  getRandomReceipt,
  createReceipt,
  markEventProcessed,
  seedMockReceipts,
  loadReceipts
};
