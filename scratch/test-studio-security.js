const http = require("node:http");

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        let parsed = body;
        try { parsed = JSON.parse(body); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function test() {
  console.log("1. Testing mutating route with NO Origin/Referer (allowed by default for scripting)...");
  const res1 = await fetch("http://127.0.0.1:5173/api/media-cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { files: [] }
  });
  console.log("Status:", res1.status, "Body:", res1.body);

  console.log("\n2. Testing CSRF block: Mutating route with DIFFERENT Origin header...");
  const res2 = await fetch("http://127.0.0.1:5173/api/media-cleanup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://evil-attacker.com"
    },
    body: { files: [] }
  });
  console.log("Status:", res2.status, "Body:", res2.body);

  console.log("\n3. Testing CSRF allow: Mutating route with SAME Origin header...");
  const res3 = await fetch("http://127.0.0.1:5173/api/media-cleanup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://127.0.0.1:5173"
    },
    body: { files: [] }
  });
  console.log("Status:", res3.status, "Body:", res3.body);

  console.log("\n4. Testing 15MB Upload size limit preflight rejection on image replace...");
  // Create a large payload (~24MB base64 string, decodes to ~18MB)
  const largeBase64 = "A".repeat(24 * 1024 * 1024);
  const res4 = await fetch("http://127.0.0.1:5173/api/projects/what-030/replace-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { imageData: `data:image/png;base64,${largeBase64}` }
  });
  console.log("Status:", res4.status, "Body:", res4.body);
}

test().catch(console.error);
