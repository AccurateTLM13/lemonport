const http = require("node:http");
const { routeRequest } = require("./handlers");
const store = require("./store");
const { loadMdr } = require("../scripts/build-mdr");

const port = Number(process.env.MDR_API_PORT || 8787);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const rawBody = req.method === "POST" ? await readBody(req) : "";
    const result = await routeRequest({
      method: req.method,
      pathname: url.pathname,
      searchParams: url.searchParams,
      rawBody,
      headers: req.headers
    }, store);

    res.writeHead(result.status, result.headers);
    res.end(result.body);
  } catch (error) {
    res.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify({ error: error.message || "Internal server error." }));
  }
}

function seedFromConfig() {
  try {
    const config = loadMdr();
    const count = store.seedMockReceipts(config.mockReceipts);
    console.log(`Seeded ${count} mock receipts.`);
  } catch (error) {
    console.warn(`Seed skipped: ${error.message}`);
  }
}

if (require.main === module) {
  seedFromConfig();
  http.createServer(handleRequest).listen(port, "127.0.0.1", () => {
    console.log("\n=======================================================");
    console.log(`MDR API listening on http://127.0.0.1:${port}`);
    console.log("Database: SQLite (native node:sqlite)");
    console.log("Start command used: node --experimental-sqlite mdr-api/server.js");
    console.log("=======================================================\n");
  });
}

module.exports = {
  handleRequest,
  seedFromConfig
};
