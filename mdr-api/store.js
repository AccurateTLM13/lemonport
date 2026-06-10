const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");

let DatabaseSync;
try {
  DatabaseSync = require("node:sqlite").DatabaseSync;
} catch (error) {
  console.error("\n=======================================================");
  console.error("ERROR: The 'node:sqlite' module could not be loaded.");
  console.error("Please run the script with the '--experimental-sqlite' flag.");
  console.error("Example: node --experimental-sqlite mdr-api/server.js");
  console.error("=======================================================\n");
  process.exit(1);
}

const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "receipts.db");
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

ensureDataDir();
const db = new DatabaseSync(dbFile);

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS receipts (
    number INTEGER PRIMARY KEY,
    serial TEXT NOT NULL UNIQUE,
    alias TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    message_status TEXT NOT NULL DEFAULT 'published',
    tier TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 100,
    purchased_at TEXT NOT NULL,
    stripe_session_id TEXT UNIQUE
  );
  
  CREATE TABLE IF NOT EXISTS stripe_events (
    event_id TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function tierForNumber(number) {
  const match = TIERS.find((tier) => number >= tier.min && number <= tier.max);
  return match ? match.label : "Internet Witnesses";
}

function serialForNumber(number) {
  return `MDR-${String(number).padStart(6, "0")}-NTH`;
}

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

function getStats() {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM receipts").get();
  const count = countRow ? countRow.count : 0;
  const totalCents = count * PRICE_CENTS;
  
  const recentRows = db.prepare("SELECT * FROM receipts ORDER BY number DESC LIMIT 20").all();
  const recent = recentRows.map(rowToReceipt);
  
  return {
    totalCents,
    count,
    remaining: Math.max(0, GOAL_COUNT - count),
    goalCount: GOAL_COUNT,
    priceCents: PRICE_CENTS,
    recent
  };
}

function getReceipt(number) {
  const row = db.prepare("SELECT * FROM receipts WHERE number = ?").get(number);
  return row ? rowToReceipt(row) : null;
}

function listReceipts(options = {}) {
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
  
  // Get total count matching query
  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) AS total");
  const totalRow = db.prepare(countQuery).get(...params);
  const total = totalRow ? totalRow.total : 0;
  
  // Add sorting, pagination
  query += " ORDER BY number DESC LIMIT ? OFFSET ?";
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const cursor = Number(options.cursor) || 0;
  params.push(limit, cursor);
  
  const rows = db.prepare(query).all(...params);
  
  return {
    items: rows.map(rowToReceipt),
    nextCursor: cursor + rows.length < total ? cursor + rows.length : null,
    total
  };
}

function getRandomReceipt() {
  const row = db.prepare("SELECT * FROM receipts ORDER BY RANDOM() LIMIT 1").get();
  return row ? rowToReceipt(row) : null;
}

function createReceipt({ alias, message, stripeSessionId }) {
  // Check count
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM receipts").get();
  const count = countRow ? countRow.count : 0;
  
  if (count >= GOAL_COUNT) {
    throw new Error("Sold out.");
  }
  
  // Deduplicate by stripeSessionId
  if (stripeSessionId) {
    const existing = db.prepare("SELECT * FROM receipts WHERE stripe_session_id = ?").get(stripeSessionId);
    if (existing) {
      return rowToReceipt(existing);
    }
  }
  
  // Get next number
  const nextRow = db.prepare("SELECT COALESCE(MAX(number), 0) + 1 AS next FROM receipts").get();
  const number = nextRow ? nextRow.next : 1;
  
  const serial = serialForNumber(number);
  const safeAlias = String(alias || "ANONYMOUS").trim().slice(0, 32);
  const safeMessage = String(message || "").trim().slice(0, 120);
  const messageStatus = safeMessage ? "pending" : "published";
  const tier = tierForNumber(number);
  const purchasedAt = new Date().toISOString();
  const safeSessionId = stripeSessionId || null;
  
  const insert = db.prepare(`
    INSERT INTO receipts (
      number, serial, alias, message, message_status, tier, amount_cents, purchased_at, stripe_session_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insert.run(
    number,
    serial,
    safeAlias,
    safeMessage,
    messageStatus,
    tier,
    PRICE_CENTS,
    purchasedAt,
    safeSessionId
  );
  
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
}

function markEventProcessed(eventId) {
  const existing = db.prepare("SELECT 1 FROM stripe_events WHERE event_id = ?").get(eventId);
  if (existing) {
    return false;
  }
  
  const insert = db.prepare("INSERT INTO stripe_events (event_id, processed_at) VALUES (?, ?)");
  insert.run(eventId, new Date().toISOString());
  return true;
}

function seedMockReceipts(configReceipts) {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM receipts").get();
  const count = countRow ? countRow.count : 0;
  
  if (count > 0) {
    return count;
  }
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO receipts (
      number, serial, alias, message, message_status, tier, amount_cents, purchased_at, stripe_session_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Wrap seeding in a transaction to make it extremely fast
  db.exec("BEGIN TRANSACTION;");
  try {
    (configReceipts || []).forEach((entry) => {
      const number = entry.number;
      const serial = serialForNumber(number);
      const alias = entry.alias;
      const message = entry.message || "";
      const messageStatus = entry.messageStatus || "published";
      const tier = tierForNumber(number);
      const purchasedAt = entry.purchasedAt;
      
      insert.run(
        number,
        serial,
        alias,
        message,
        messageStatus,
        tier,
        PRICE_CENTS,
        purchasedAt,
        null
      );
    });
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  
  const finalCountRow = db.prepare("SELECT COUNT(*) AS count FROM receipts").get();
  return finalCountRow ? finalCountRow.count : 0;
}

function listModerationReceipts(options = {}) {
  let query = "SELECT * FROM receipts WHERE message != ''";
  const params = [];
  if (options.status) {
    query += " AND message_status = ?";
    params.push(options.status);
  }
  query += " ORDER BY purchased_at DESC";
  const rows = db.prepare(query).all(...params);
  return rows.map((row) => ({
    number: row.number,
    serial: row.serial,
    alias: row.alias,
    message: row.message,
    messageStatus: row.message_status,
    tier: row.tier,
    amountCents: row.amount_cents,
    purchasedAt: row.purchased_at
  }));
}

function updateMessageStatus(number, status) {
  if (!["pending", "published", "rejected"].includes(status)) {
    throw new Error("Invalid message status.");
  }
  const update = db.prepare("UPDATE receipts SET message_status = ? WHERE number = ?");
  update.run(status, number);
  const row = db.prepare("SELECT * FROM receipts WHERE number = ?").get(number);
  return row ? {
    number: row.number,
    serial: row.serial,
    alias: row.alias,
    message: row.message,
    messageStatus: row.message_status,
    tier: row.tier,
    amountCents: row.amount_cents,
    purchasedAt: row.purchased_at
  } : null;
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
  listModerationReceipts,
  updateMessageStatus
};
