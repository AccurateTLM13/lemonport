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

function makeD1Store(db) {
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

      // Get total count matching query
      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) AS total");
      const totalRow = await db.prepare(countQuery).bind(...params).first();
      const total = totalRow ? totalRow.total : 0;

      // Add sorting, pagination
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
      // Check count
      const countRow = await db.prepare("SELECT COUNT(*) AS count FROM receipts").first();
      const count = countRow ? countRow.count : 0;

      if (count >= GOAL_COUNT) {
        throw new Error("Sold out.");
      }

      // Deduplicate by stripeSessionId
      if (stripeSessionId) {
        const existing = await db.prepare("SELECT * FROM receipts WHERE stripe_session_id = ?").bind(stripeSessionId).first();
        if (existing) {
          return rowToReceipt(existing);
        }
      }

      // Get next number
      const nextRow = await db.prepare("SELECT COALESCE(MAX(number), 0) + 1 AS next FROM receipts").first();
      const number = nextRow ? nextRow.next : 1;

      const serial = serialForNumber(number);
      const safeAlias = String(alias || "ANONYMOUS").trim().slice(0, 32);
      const safeMessage = String(message || "").trim().slice(0, 120);
      const messageStatus = safeMessage ? "pending" : "published";
      const tier = tierForNumber(number);
      const purchasedAt = new Date().toISOString();
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
        await db.prepare("INSERT INTO stripe_events (event_id, processed_at) VALUES (?, ?)")
          .bind(eventId, new Date().toISOString())
          .run();
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
    },

    async listModerationReceipts(options = {}) {
      let query = "SELECT * FROM receipts WHERE message != ''";
      const params = [];
      if (options.status) {
        query += " AND message_status = ?";
        params.push(options.status);
      }
      query += " ORDER BY purchased_at DESC";
      const result = await db.prepare(query).bind(...params).all();
      const rows = result.results || [];
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
    },

    async updateMessageStatus(number, status) {
      if (!["pending", "published", "rejected"].includes(status)) {
        throw new Error("Invalid message status.");
      }
      await db.prepare("UPDATE receipts SET message_status = ? WHERE number = ?").bind(status, number).run();
      const row = await db.prepare("SELECT * FROM receipts WHERE number = ?").bind(number).first();
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
  };
}

module.exports = {
  makeD1Store
};
