(function () {
  const config = window.mdrConfig || {};
  const statsSnapshot = window.mdrStats || {};
  const apiBase = String(config.apiBase || "").trim();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stats = { ...config.mockStats, recent: config.mockReceipts || [] };
  let checkoutPhase = "idle";
  let animationTimers = [];
  let archiveCursor = 0;
  let archiveItems = [];
  let lastReceipt = null;

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function formatMoney(cents) {
    return `$${(Number(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatReceiptNumber(number) {
    return `#${String(number).padStart(6, "0")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tierForNumber(number) {
    const tiers = config.tiers || [];
    const match = tiers.find((tier) => number >= tier.min && number <= tier.max);
    return match ? match.label : "Internet Witnesses";
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function clearTimers() {
    animationTimers.forEach(clearTimeout);
    animationTimers = [];
  }

  function schedule(fn, delay) {
    const id = window.setTimeout(fn, delay);
    animationTimers.push(id);
    return id;
  }

  async function apiFetch(path, options) {
    const base = apiBase || "http://127.0.0.1:8787";
    const response = await fetch(`${base.replace(/\/$/, "")}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function loadStats() {
    if (apiBase) {
      try {
        stats = await apiFetch("/stats");
        return stats;
      } catch {
        stats = { ...config.mockStats, recent: config.mockReceipts || [], source: "fallback" };
      }
    } else if (statsSnapshot && statsSnapshot.count) {
      stats = statsSnapshot;
    }

    return stats;
  }

  function renderCounter() {
    const total = stats.totalCents ?? config.mockStats.totalCents;
    const count = stats.count ?? config.mockStats.count;
    const remaining = stats.remaining ?? config.mockStats.remaining;
    const goal = config.goalCount * config.priceCents;

    $("mdr-counter-total").textContent = `${formatMoney(total)} / ${formatMoney(goal)}`;
    $("mdr-counter-meta").textContent = `${count.toLocaleString()} people have bought nothing. ${remaining.toLocaleString()} spots remain.`;
    $("mdr-counter-bar").style.width = `${Math.min(100, (count / config.goalCount) * 100)}%`;

    const tierPreview = $("mdr-tier-preview");
    if (tierPreview) {
      tierPreview.textContent = `Next tier: ${tierForNumber(count + 1)}`;
    }

    const buyersEl = $("mdr-terminal-buyers");
    const remainingEl = $("mdr-terminal-remaining");
    const statusEl = $("mdr-terminal-status");

    if (buyersEl) {
      buyersEl.textContent = count.toLocaleString();
    }

    if (remainingEl) {
      remainingEl.textContent = remaining.toLocaleString();
    }

    if (statusEl) {
      statusEl.textContent = remaining > 0 ? "AVAILABLE" : "SOLD OUT";
    }
  }

  function renderReceiptLine(receipt, options) {
    const opts = options || {};
    const message =
      receipt.messageStatus === "pending"
        ? "(message pending moderation)"
        : receipt.message
          ? `"${receipt.message}"`
          : "";
    const tier = receipt.tier || tierForNumber(receipt.number);

    return `
      <article class="mdr-receipt-line${opts.highlight ? " mdr-highlight" : ""}" data-number="${receipt.number}">
        <div class="mdr-receipt-line__head">
          <span>${formatReceiptNumber(receipt.number)} &nbsp; ${escapeHtml(receipt.alias)} bought NOTHING</span>
          <span>$1.00</span>
        </div>
        ${message ? `<p class="mdr-receipt-line__message">${escapeHtml(message)}</p>` : ""}
        <span class="mdr-receipt-line__tier">${escapeHtml(tier)}</span>
        <p class="mdr-receipt-line__message">${escapeHtml(formatDate(receipt.purchasedAt))}</p>
      </article>
    `;
  }

  function renderRecent() {
    const recent = stats.recent || config.mockReceipts || [];
    $("mdr-recent").innerHTML = recent.slice(0, 8).map((item) => renderReceiptLine(item)).join("");
  }

  function renderStaticSections() {
    document.title = config.title || document.title;
    $("mdr-tagline").textContent = config.tagline || "";
    $("mdr-footer-tagline").textContent = config.tagline || "";

    $("mdr-how-list").innerHTML = (config.howItWorks || [])
      .map((step) => `<li>${escapeHtml(step)}</li>`)
      .join("");

    $("mdr-faq-list").innerHTML = (config.faq || [])
      .map((item) => `<div><dt>${escapeHtml(item.q)}</dt><dd>${escapeHtml(item.a)}</dd></div>`)
      .join("");

    $("mdr-legal-copy").innerHTML = `
      <p>${escapeHtml(config.legal?.disclaimer || "")}</p>
      <p>${escapeHtml(config.legal?.moderation || "")}</p>
    `;

    if (config.moneyModel) {
      $("mdr-allocation").innerHTML = `
        <p><strong>${escapeHtml(config.moneyModel.label)}</strong></p>
        <table>
          <thead><tr><th>Use</th><th>Percent</th></tr></thead>
          <tbody>
            ${(config.moneyModel.allocations || [])
              .map((row) => `<tr><td>${escapeHtml(row.use)}</td><td>${row.percent}%</td></tr>`)
              .join("")}
          </tbody>
        </table>
      `;
    }

    $("mdr-tier-filter").innerHTML =
      `<option value="">All tiers</option>` +
      (config.tiers || [])
        .map((tier) => `<option value="${escapeHtml(tier.label)}">${escapeHtml(tier.label)}</option>`)
        .join("");

    $("mdr-milestone-list").innerHTML = (config.milestones || [])
      .map((milestone) => {
        const unlocked = (stats.totalCents ?? 0) >= milestone.cents;
        return `
          <li class="mdr-milestone-row ${unlocked ? "is-unlocked" : "is-locked"}">
            <span class="mdr-milestone-row__status">${unlocked ? "UNLOCKED" : "LOCKED"}</span>
            <span class="mdr-milestone-row__amount">${formatMoney(milestone.cents)}</span>
            <span class="mdr-milestone-row__label">${escapeHtml(milestone.unlock)}</span>
            <span class="mdr-milestone-row__module">${escapeHtml(milestone.key || "module")}</span>
          </li>
        `;
      })
      .join("");

    $("mdr-wall-grid").innerHTML = (config.wallOfRegret || [])
      .map(
        (entry) => `
          <article class="mdr-specimen">
            <header class="mdr-specimen__head">
              <span class="mdr-specimen__tag">SPECIMEN ${String(entry.number).padStart(4, "0")}</span>
              <span class="mdr-specimen__receipt">${formatReceiptNumber(entry.number)}</span>
            </header>
            <blockquote class="mdr-specimen__quote">${escapeHtml(entry.message)}</blockquote>
            <footer class="mdr-specimen__foot">
              <cite>${escapeHtml(entry.alias)}</cite>
              <span>ARCHIVED REGRET</span>
            </footer>
          </article>
        `
      )
      .join("");

    if (config.nothingReport) {
      $("mdr-report-title").textContent = config.nothingReport.title;
      $("mdr-report-body").innerHTML = `
        <p>${escapeHtml(config.nothingReport.summary)}</p>
        ${(config.nothingReport.sections || [])
          .map((section) => `<h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.body)}</p>`)
          .join("")}
      `;
    }

    renderReceiptHeaderFooter();
    updateMilestoneFeatures();
  }

  function updateMilestoneFeatures() {
    const total = stats.totalCents ?? config.mockStats.totalCents;
    const milestones = config.milestones || [];
    const unlocked = new Set(
      milestones.filter((milestone) => total >= milestone.cents).map((milestone) => milestone.key)
    );

    $("mdr-physical").hidden = !unlocked.has("physicalPrint");
    $("mdr-printer-sfx").hidden = !unlocked.has("printerSfx");
  }

  function playPrinterSound() {
    if (prefersReducedMotion) {
      return;
    }

    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.03;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
    } catch {
      // Audio optional.
    }
  }

  function renderReceiptHeaderFooter() {
    const total = stats.totalCents ?? config.mockStats.totalCents;
    const count = stats.count ?? config.mockStats.count;
    const complete = count >= config.goalCount;
    const showBarcode = total >= 10000;

    $("mdr-receipt-header").textContent =
      `THE MILLION DOLLAR RECEIPT\n--------------------------------\nITEM: NOTHING\nQTY GOAL: 1,000,000\nPRICE EACH: $1.00\nTOTAL GOAL: $1,000,000.00\n--------------------------------`;

    $("mdr-receipt-footer").textContent = complete
      ? `--------------------------------\nSUBTOTAL: $1,000,000.00\nTAX: EMOTIONALLY COMPLICATED\nTOTAL: INTERNET HISTORY\n--------------------------------\n\n1,000,000 PEOPLE BOUGHT NOTHING TOGETHER.`
      : `--------------------------------\nCURRENT COUNT: ${count.toLocaleString()}\nSTATUS: ACCEPTING BAD DECISIONS\n--------------------------------`;

    if (showBarcode && !$("mdr-receipt-footer").querySelector(".mdr-barcode")) {
      const barcode = document.createElement("div");
      barcode.className = "mdr-barcode";
      barcode.setAttribute("aria-hidden", "true");
      $("mdr-receipt-footer").append(barcode);
    }
  }

  async function loadArchive(reset) {
    if (reset) {
      archiveCursor = 0;
      archiveItems = [];
    }

    let batch;

    if (apiBase) {
      const params = new URLSearchParams({
        cursor: String(archiveCursor),
        limit: "50"
      });
      const q = $("mdr-search").value.trim();
      const tier = $("mdr-tier-filter").value;

      if (q) {
        params.set("q", q);
      }

      if (tier) {
        params.set("tier", tier);
      }

      batch = await apiFetch(`/receipts?${params.toString()}`);
      archiveItems = reset ? batch.items : archiveItems.concat(batch.items);
      archiveCursor = batch.nextCursor ?? archiveCursor + batch.items.length;
      $("mdr-load-more").hidden = batch.nextCursor == null;
    } else {
      let source = [...(config.mockReceipts || [])];

      const q = $("mdr-search").value.trim().toLowerCase();
      const tier = $("mdr-tier-filter").value;

      if (q) {
        source = source.filter(
          (item) =>
            String(item.number).includes(q) ||
            item.alias.toLowerCase().includes(q) ||
            (item.message && item.message.toLowerCase().includes(q))
        );
      }

      if (tier) {
        source = source.filter((item) => tierForNumber(item.number) === tier);
      }

      if (reset) {
        archiveItems = source;
      }

      batch = { items: archiveItems, nextCursor: null };
      $("mdr-load-more").hidden = true;
    }

    $("mdr-receipt-body").innerHTML = archiveItems.map((item) => renderReceiptLine(item)).join("");
  }

  function hideFlowPanels() {
    $("mdr-machine-section").hidden = true;
    $("mdr-checkout").hidden = true;
    $("mdr-confirmation").hidden = true;
  }

  function revealCheckout() {
    checkoutPhase = "checkoutReady";
    $("mdr-machine-section").hidden = false;
    $("mdr-checkout").hidden = false;
    $("mdr-checkout").classList.add("is-revealed");
    $("mdr-checkout").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  function runConveyorSequence() {
    clearTimers();
    hideFlowPanels();
    checkoutPhase = "preparing";

    const conveyor = document.querySelector(".mdr-conveyor");
    const lemonTag = $("mdr-lemon-tag");
    const scanner = $("mdr-scanner");
    const stamp = $("mdr-stamp");
    const box = $("mdr-box");
    const skip = $("mdr-skip-animation");

    $("mdr-machine-section").hidden = false;
    $("mdr-machine-copy").textContent = "Preparing your nothing…";
    skip.hidden = false;

    conveyor.className = "mdr-conveyor";
    lemonTag.hidden = true;
    scanner.hidden = true;
    stamp.hidden = true;
    stamp.classList.remove("is-slammed");
    box.hidden = true;

    if (prefersReducedMotion) {
      revealCheckout();
      return;
    }

    conveyor.classList.add("is-dropping");
    schedule(() => {
      conveyor.classList.remove("is-dropping");
      conveyor.classList.add("is-riding");
      $("mdr-machine-copy").textContent = "Routing through the Nothing Factory…";
    }, 300);

    schedule(() => {
      scanner.hidden = false;
      $("mdr-machine-copy").textContent = "Scanning for utility…";
    }, 1500);

    schedule(() => {
      stamp.hidden = false;
      stamp.classList.add("is-slammed");
      lemonTag.hidden = false;
      $("mdr-machine-copy").textContent = "Certified nothing detected.";
    }, 1900);

    schedule(() => {
      box.hidden = false;
      $("mdr-machine-copy").textContent = "Packaging your bad decision…";
    }, 2200);

    schedule(revealCheckout, 2700);
  }

  function skipAnimation() {
    clearTimers();
    revealCheckout();
  }

  function basicProfanityCheck(value) {
    const blocked = ["spam", "hate"];
    const lower = value.toLowerCase();
    return !blocked.some((word) => lower.includes(word));
  }

  function renderShareCard(receipt) {
    const card = `
      <p class="mdr-share-card__title">THE MILLION DOLLAR RECEIPT</p>
      <p class="mdr-share-card__number">${formatReceiptNumber(receipt.number)}</p>
      <p class="mdr-share-card__line">${escapeHtml(receipt.alias)} bought NOTHING for $1.00</p>
      <p class="mdr-share-card__line">${escapeHtml(receipt.tier || tierForNumber(receipt.number))}</p>
      <p class="mdr-share-card__footer">1 of 1,000,000 · ${escapeHtml(config.tagline || "")}</p>
    `;
    $("mdr-share-card").innerHTML = card;

    const shareText = `I'm officially part of The Million Dollar Receipt.\n${receipt.alias} bought nothing for $1.\nReceipt ${formatReceiptNumber(receipt.number)}.`;
    $("mdr-share-text").value = shareText;
  }

  function showConfirmation(receipt) {
    lastReceipt = receipt;
    hideFlowPanels();
    $("mdr-confirmation").hidden = false;
    $("mdr-conf-number").textContent = formatReceiptNumber(receipt.number);
    $("mdr-conf-tier").textContent = receipt.tier || tierForNumber(receipt.number);
    renderShareCard(receipt);
    $("mdr-confirmation").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  async function submitCheckout(form) {
    const formData = new FormData(form);
    const alias = String(formData.get("alias") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const errorEl = $("mdr-checkout-error");
    errorEl.textContent = "";

    if (!alias) {
      errorEl.textContent = "Alias is required.";
      return;
    }

    if (!basicProfanityCheck(alias) || !basicProfanityCheck(message)) {
      errorEl.textContent = "Please revise your submission.";
      return;
    }

    try {
      const result = await apiFetch("/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, message })
      });

      if (result.mode === "mock" && result.receipt) {
        showConfirmation(result.receipt);
        await loadStats();
        renderCounter();
        renderRecent();
        await loadArchive(true);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      const nextNumber = (stats.count ?? config.mockStats.count) + 1;
      const mockReceipt = {
        number: nextNumber,
        alias,
        message,
        messageStatus: message ? "pending" : "published",
        tier: tierForNumber(nextNumber),
        amountCents: 100,
        purchasedAt: new Date().toISOString()
      };

      if (!apiBase) {
        showConfirmation(mockReceipt);
        stats.count = nextNumber;
        stats.totalCents = nextNumber * 100;
        stats.remaining = Math.max(0, config.goalCount - nextNumber);
        stats.recent = [mockReceipt, ...(stats.recent || config.mockReceipts || [])].slice(0, 20);
        renderCounter();
        renderRecent();
        await loadArchive(true);
        return;
      }

      errorEl.textContent = error.message;
    }
  }

  async function handleReturnFromPayment() {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    const mockNumber = params.get("number");

    if (!paid) {
      return;
    }

    if (paid === "mock" && mockNumber) {
      const receipt = await apiFetch(`/receipts/${mockNumber}`);
      showConfirmation(receipt);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    try {
      const list = await apiFetch("/receipts?limit=1");
      if (list.items && list.items[0]) {
        showConfirmation(list.items[0]);
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      // Payment return without API — user can find receipt in archive.
    }
  }

  async function copyShareText() {
    const text = $("mdr-share-text").value;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      $("mdr-share-text").hidden = false;
      $("mdr-share-text").select();
      document.execCommand("copy");
    }
  }

  function downloadShareCard() {
    if (!lastReceipt) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f4efe3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#12110f";
    ctx.font = "700 28px Courier New, monospace";
    ctx.fillText("THE MILLION DOLLAR RECEIPT", 48, 72);
    ctx.font = "700 64px Courier New, monospace";
    ctx.fillText(formatReceiptNumber(lastReceipt.number), 48, 170);
    ctx.font = "24px Courier New, monospace";
    ctx.fillText(`${lastReceipt.alias} bought NOTHING for $1.00`, 48, 240);
    ctx.fillText(lastReceipt.tier || tierForNumber(lastReceipt.number), 48, 290);
    ctx.fillText("1 of 1,000,000", 48, 340);
    ctx.fillText(config.tagline || "", 48, 420);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `million-dollar-receipt-${lastReceipt.number}.png`;
    link.click();
  }

  function bindEvents() {
    $("mdr-buy-button").addEventListener("click", runConveyorSequence);
    $("mdr-skip-animation").addEventListener("click", skipAnimation);

    $("mdr-checkout-form").addEventListener("submit", (event) => {
      event.preventDefault();
      submitCheckout(event.currentTarget);
    });

    $("mdr-view-line").addEventListener("click", () => {
      if (!lastReceipt) {
        return;
      }

      window.location.href = `/million-dollar-receipt/receipt/?id=${lastReceipt.number}`;
    });

    $("mdr-download-card").addEventListener("click", downloadShareCard);
    $("mdr-share-button").addEventListener("click", copyShareText);
    $("mdr-challenge-button").addEventListener("click", () => {
      copyShareText();
      $("mdr-buy-button").focus();
    });

    $("mdr-load-more").addEventListener("click", () => loadArchive(false));
    $("mdr-play-printer").addEventListener("click", playPrinterSound);

    $("mdr-search").addEventListener(
      "input",
      debounce(() => loadArchive(true), 250)
    );

    $("mdr-tier-filter").addEventListener("change", () => loadArchive(true));

    $("mdr-jump-number").addEventListener("change", (event) => {
      const value = Number(event.target.value);
      if (value > 0) {
        window.location.href = `/million-dollar-receipt/receipt/?id=${value}`;
      }
    });

    $("mdr-random-button").addEventListener("click", async () => {
      try {
        const receipt = await apiFetch("/receipts/random");
        window.location.href = `/million-dollar-receipt/receipt/?id=${receipt.number}`;
      } catch {
        const mock = (config.mockReceipts || [])[Math.floor(Math.random() * (config.mockReceipts || []).length)];
        if (mock) {
          window.location.href = `/million-dollar-receipt/receipt/?id=${mock.number}`;
        }
      }
    });
  }

  function debounce(fn, wait) {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  async function initLanding() {
    els.root = document.querySelector(".mdr-page");
    if (!els.root || !config.title) {
      return;
    }

    bindEvents();
    await loadStats();
    renderCounter();
    renderStaticSections();
    renderRecent();
    await loadArchive(true);
    await handleReturnFromPayment();
  }

  async function initReceiptPage() {
    const params = new URLSearchParams(window.location.search);
    const number = Number(params.get("id"));
    const root = $("mdr-receipt-root");

    if (!root || !number) {
      if (root) {
        root.innerHTML = "<p class=\"mdr-error\">Receipt not found.</p>";
      }
      return;
    }

    let receipt;

    try {
      receipt = await apiFetch(`/receipts/${number}`);
    } catch {
      receipt = (config.mockReceipts || []).find((item) => item.number === number) || null;
    }

    if (!receipt) {
      root.innerHTML = "<p class=\"mdr-error\">Receipt not found.</p>";
      return;
    }

    document.title = `${formatReceiptNumber(receipt.number)} | The Million Dollar Receipt`;

    root.innerHTML = `
      <article class="mdr-receipt-detail">
        <p class="mdr-kicker">THE MILLION DOLLAR RECEIPT</p>
        <h1>${formatReceiptNumber(receipt.number)}</h1>
        <p class="mdr-tagline">${escapeHtml(receipt.alias)} bought NOTHING for $1.00</p>
        <p class="mdr-tier-badge">${escapeHtml(receipt.tier || tierForNumber(receipt.number))}</p>
        ${
          receipt.message
            ? `<p class="mdr-hero-copy">Message: "${escapeHtml(receipt.message)}"</p>`
            : receipt.messageStatus === "pending"
              ? `<p class="mdr-hero-copy">Message pending moderation.</p>`
              : ""
        }
        <p class="mdr-hero-copy">Purchased: ${escapeHtml(formatDate(receipt.purchasedAt))}</p>
        <div class="mdr-share-card" id="mdr-share-card"></div>
        <div class="mdr-confirmation-actions">
          <button class="mdr-button" type="button" id="mdr-share-button">Share</button>
          <button class="mdr-button" type="button" id="mdr-download-card">Download Receipt Card</button>
          <a class="mdr-button mdr-button--primary" href="/million-dollar-receipt/">Buy nothing too</a>
        </div>
        <textarea class="mdr-share-text" id="mdr-share-text" readonly hidden aria-label="Share text"></textarea>
      </article>
    `;

    lastReceipt = receipt;
    renderShareCard(receipt);
    $("mdr-share-button").addEventListener("click", copyShareText);
    $("mdr-download-card").addEventListener("click", downloadShareCard);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.classList.contains("mdr-receipt-page")) {
      initReceiptPage();
      return;
    }

    initLanding();
  });
})();
