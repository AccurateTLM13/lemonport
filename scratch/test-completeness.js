const http = require("node:http");

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const clientOptions = {
      method: options.method || "GET",
      headers: options.headers || {},
      path: parsed.pathname + parsed.search,
      port: parsed.port,
      host: parsed.hostname
    };
    
    const req = http.request(clientOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const bodyStr = Buffer.concat(chunks).toString("utf8");
        let body;
        try {
          body = JSON.parse(bodyStr);
        } catch(e) {
          body = bodyStr;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
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
  console.log("==================================================");
  console.log("TESTING STUDIO MUTATION DESK CRUD ENDPOINTS");
  console.log("==================================================");

  // 1. Get initial fragments
  console.log("\n1. GET /api/mutation/fragments");
  const getFrags = await fetch("http://127.0.0.1:5173/api/mutation/fragments");
  console.log("Status:", getFrags.status);
  console.log("Fragments count:", getFrags.body.fragments?.length);
  console.log("Files:", getFrags.body.fragments?.map(f => f.filename).join(", "));

  // 2. Put a test fragment
  console.log("\n2. PUT /api/mutation/fragments/test-temp-frag.json");
  const testFragmentData = {
    headline: "TEST HEADLINE",
    blocks: [{ type: "text", title: "Test Block", body: "Hello World" }]
  };
  const putFrag = await fetch("http://127.0.0.1:5173/api/mutation/fragments/test-temp-frag.json", {
    method: "PUT",
    body: testFragmentData
  });
  console.log("Status:", putFrag.status);
  console.log("Response:", JSON.stringify(putFrag.body));

  // 3. Get the test fragment
  console.log("\n3. GET /api/mutation/fragments/test-temp-frag.json");
  const getFragDetail = await fetch("http://127.0.0.1:5173/api/mutation/fragments/test-temp-frag.json");
  console.log("Status:", getFragDetail.status);
  console.log("Headline in file:", getFragDetail.body.headline);

  // 4. Create a phase in schedule
  console.log("\n4. POST /api/mutation/schedule (Create Phase 99)");
  const createPhase = await fetch("http://127.0.0.1:5173/api/mutation/schedule", {
    method: "POST",
    body: {
      phase: 99,
      title: "Test Phase 99",
      phaseLabel: "Evidence Fragment 99",
      publishAt: "2026-12-31T23:59:59Z",
      fragment: "test-temp-frag.json",
      status: "Draft",
      nextMutationHint: "Hint 99",
      requiresUnlock: true
    }
  });
  console.log("Status:", createPhase.status);
  console.log("Created phase:", JSON.stringify(createPhase.body));

  // 5. Update the phase in schedule
  console.log("\n5. PATCH /api/mutation/schedule/99 (Update Phase 99)");
  const updatePhase = await fetch("http://127.0.0.1:5173/api/mutation/schedule/99", {
    method: "PATCH",
    body: {
      title: "Updated Title 99",
      status: "Ready"
    }
  });
  console.log("Status:", updatePhase.status);
  console.log("Updated phase body:", JSON.stringify(updatePhase.body));

  // 6. Get schedule and check if phase 99 exists and is updated
  console.log("\n6. GET /api/mutation/schedule");
  const getSchedule = await fetch("http://127.0.0.1:5173/api/mutation/schedule");
  console.log("Status:", getSchedule.status);
  const foundPhase = getSchedule.body.schedule?.find(p => p.phase === 99);
  console.log("Found Phase 99 in schedule:", foundPhase ? "YES" : "NO");
  if (foundPhase) {
    console.log("Title in schedule:", foundPhase.title);
    console.log("Status in schedule:", foundPhase.status);
  }

  // 7. Delete the phase
  console.log("\n7. DELETE /api/mutation/schedule/99");
  const deletePhase = await fetch("http://127.0.0.1:5173/api/mutation/schedule/99", {
    method: "DELETE"
  });
  console.log("Status:", deletePhase.status);
  console.log("Delete response:", JSON.stringify(deletePhase.body));

  // 8. Delete the test fragment file
  console.log("\n8. DELETE /api/mutation/fragments/test-temp-frag.json");
  const deleteFrag = await fetch("http://127.0.0.1:5173/api/mutation/fragments/test-temp-frag.json", {
    method: "DELETE"
  });
  console.log("Status:", deleteFrag.status);
  console.log("Delete fragment response:", JSON.stringify(deleteFrag.body));

  console.log("\n==================================================");
  console.log("TESTING MDR MODERATION ENDPOINTS");
  console.log("==================================================");

  // Create a receipt with a message first
  console.log("\n1. Create a dummy receipt with a message...");
  const checkoutRes = await fetch("http://127.0.0.1:8787/checkout/create", {
    method: "POST",
    body: { alias: "MOD_TESTER", message: "Moderation validation test message!" }
  });
  const receiptNumber = checkoutRes.body.receipt?.number;
  console.log("Receipt number created:", receiptNumber);
  console.log("Receipt status:", checkoutRes.body.receipt?.messageStatus); // should be pending
  console.log("Public message value in response:", checkoutRes.body.receipt?.message); // should be empty string because it's not published

  // Fetch from public list - should be empty/filtered out
  console.log("\n2. Fetch from public list receipts...");
  const publicList = await fetch("http://127.0.0.1:8787/receipts");
  const publicItem = publicList.body.items?.find(r => r.number === receiptNumber);
  console.log("Found in public list?", publicItem ? "YES" : "NO");
  if (publicItem) {
    console.log("Public message contents:", JSON.stringify(publicItem.message)); // should be empty string
  }

  // Fetch from moderation list - should be in there with raw message
  console.log("\n3. Fetch from /moderation list...");
  const modList = await fetch("http://127.0.0.1:8787/moderation");
  console.log("Status:", modList.status);
  const modItem = modList.body.find(r => r.number === receiptNumber);
  console.log("Found in moderation list?", modItem ? "YES" : "NO");
  if (modItem) {
    console.log("Moderation message value:", JSON.stringify(modItem.message)); // should be raw message
    console.log("Moderation status:", modItem.messageStatus); // should be pending
  }

  // Approve (Publish) the message
  console.log(`\n4. POST /moderation/status (Publish receipt #${receiptNumber})...`);
  const publishRes = await fetch("http://127.0.0.1:8787/moderation/status", {
    method: "POST",
    body: { number: receiptNumber, status: "published" }
  });
  console.log("Status:", publishRes.status);
  console.log("New status returned:", publishRes.body.messageStatus);

  // Fetch from public list again - should now be visible
  console.log("\n5. Fetch from public list receipts again...");
  const publicList2 = await fetch("http://127.0.0.1:8787/receipts");
  const publicItem2 = publicList2.body.items?.find(r => r.number === receiptNumber);
  console.log("Found in public list?", publicItem2 ? "YES" : "NO");
  if (publicItem2) {
    console.log("Public message contents after approval:", JSON.stringify(publicItem2.message)); // should be "Moderation validation test message!"
  }

  // Reject the message
  console.log(`\n6. POST /moderation/status (Reject receipt #${receiptNumber})...`);
  const rejectRes = await fetch("http://127.0.0.1:8787/moderation/status", {
    method: "POST",
    body: { number: receiptNumber, status: "rejected" }
  });
  console.log("Status:", rejectRes.status);
  console.log("New status returned:", rejectRes.body.messageStatus);

  // Fetch from public list again - should be hidden again
  console.log("\n7. Fetch from public list receipts again...");
  const publicList3 = await fetch("http://127.0.0.1:8787/receipts");
  const publicItem3 = publicList3.body.items?.find(r => r.number === receiptNumber);
  console.log("Found in public list?", publicItem3 ? "YES" : "NO");
  if (publicItem3) {
    console.log("Public message contents after rejection:", JSON.stringify(publicItem3.message)); // should be empty string
  }

  console.log("\n==================================================");
  console.log("E2E API TEST RUN COMPLETED");
  console.log("==================================================");
}

test().catch(console.error);
