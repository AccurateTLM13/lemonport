(function () {
  const config = window.mdrConfig || {};
  const statsSnapshot = window.mdrStats || {};
  const apiBase = String(config.apiBase || "").trim();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stats = { ...config.mockStats, recent: config.mockReceipts || [] };
  let animationTimers = [];
  let lastReceipt = null;

  function $(id) {
    return document.getElementById(id);
  }

  function formatMoney(cents, decimals) {
    const value = Number(cents) / 100;
    if (decimals) {
      return `$${value.toFixed(2)}`;
    }
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatReceiptNumber(number) {
    return String(number).padStart(6, "0");
  }

  function serialForNumber(number) {
    return `MDR-${formatReceiptNumber(number)}-NTH`;
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

  function clearTimers() {
    animationTimers.forEach(clearTimeout);
    animationTimers = [];
  }

  function schedule(fn, delay) {
    const id = window.setTimeout(fn, delay);
    animationTimers.push(id);
    return id;
  }

  function setKioskPhase(phase) {
    const kiosk = $("mdr-kiosk");
    if (kiosk) {
      kiosk.dataset.phase = phase;
    }
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
    const latest = (stats.recent || config.mockReceipts || [])[0];
    const counterBar = $("mdr-counter-bar");

    if ($("mdr-counter-total")) {
      $("mdr-counter-total").textContent = formatMoney(total);
    }

    if ($("mdr-counter-meta")) {
      $("mdr-counter-meta").textContent = `${count.toLocaleString()} buyers · ${remaining.toLocaleString()} spots left`;
    }

    if (counterBar) {
      counterBar.style.width = `${Math.min(100, (count / config.goalCount) * 100)}%`;
    }

    if ($("mdr-hero-total")) {
      $("mdr-hero-total").textContent = `${formatMoney(total)} / ${formatMoney(goal)}`;
    }

    if ($("mdr-hero-meta")) {
      $("mdr-hero-meta").textContent = `${count.toLocaleString()} receipts · ${remaining.toLocaleString()} remaining`;
    }

    if ($("mdr-museum-total")) {
      $("mdr-museum-total").textContent = formatMoney(total);
    }

    if ($("mdr-museum-serial")) {
      $("mdr-museum-serial").textContent = latest ? serialForNumber(latest.number) : "—";
    }

    const tierPreview = $("mdr-tier-preview");
    if (tierPreview) {
      tierPreview.textContent = `Next tier: ${tierForNumber(count + 1)}`;
    }

    if ($("mdr-terminal-buyers")) {
      $("mdr-terminal-buyers").textContent = count.toLocaleString();
    }

    if ($("mdr-terminal-remaining")) {
      $("mdr-terminal-remaining").textContent = remaining.toLocaleString();
    }

    if ($("mdr-terminal-status")) {
      $("mdr-terminal-status").textContent = remaining > 0 ? "STILL ABSURD" : "SOLD OUT";
    }

    if ($("mdr-kiosk-status")) {
      $("mdr-kiosk-status").textContent = remaining > 0 ? "STATUS: READY" : "STATUS: FULL";
    }
  }

  function renderSacredReceipt() {
    const total = stats.totalCents ?? config.mockStats.totalCents;
    const count = stats.count ?? config.mockStats.count;
    const remaining = stats.remaining ?? config.mockStats.remaining;
    const latest = (stats.recent || config.mockReceipts || [])[0];

    $("mdr-sacred-receipt").innerHTML = `
      <div class="mdr-thermal__store">
        LEMONTEED NOTHING WORKS<br>
        PUBLIC INTERNET REGISTER 01
      </div>
      <hr class="mdr-thermal__rule">
      <p class="mdr-thermal__title">THE MILLION DOLLAR RECEIPT</p>
      <hr class="mdr-thermal__rule">
      <div class="mdr-thermal__row mdr-thermal__row--head">
        <span>ITEM</span><span>PRICE</span>
      </div>
      <div class="mdr-thermal__row">
        <span>NOTHING, STANDARD</span><span>$1.00</span>
      </div>
      <hr class="mdr-thermal__rule">
      <p class="mdr-thermal__label">CURRENT TOTAL</p>
      <p class="mdr-thermal__value">${formatMoney(total)}</p>
      <p class="mdr-thermal__label">BUYERS</p>
      <p class="mdr-thermal__value">${count.toLocaleString()}</p>
      <p class="mdr-thermal__label">REMAINING</p>
      <p class="mdr-thermal__value">${remaining.toLocaleString()}</p>
      ${
        latest
          ? `
      <hr class="mdr-thermal__rule">
      <p class="mdr-thermal__label">LATEST LINE</p>
      <p class="mdr-thermal__value">${escapeHtml(latest.alias)}</p>
      <p class="mdr-thermal__label">RECEIPT NO</p>
      <p class="mdr-thermal__value">${serialForNumber(latest.number)}</p>
      ${
        latest.message
          ? `<p class="mdr-thermal__label">MESSAGE</p><p class="mdr-thermal__message">"${escapeHtml(latest.message)}"</p>`
          : ""
      }
      `
          : ""
      }
      <hr class="mdr-thermal__rule">
      <div class="mdr-thermal__row"><span>SUBTOTAL</span><span>${formatMoney(total, true)}</span></div>
      <div class="mdr-thermal__row"><span>UTILITY</span><span>$0.00</span></div>
      <div class="mdr-thermal__row"><span>REGRET</span><span>INCLUDED</span></div>
      <div class="mdr-thermal__row"><span>TOTAL</span><span>${formatMoney(total, true)}</span></div>
      <hr class="mdr-thermal__rule">
      <p class="mdr-thermal__foot">${count.toLocaleString()} OF 1,000,000</p>
      <div class="mdr-thermal__barcode" aria-hidden="true"></div>
    `;
  }

  function renderConfirmReceipt(receipt) {
    $("mdr-confirm-receipt").innerHTML = `
      <div class="mdr-thermal__store">
        LEMONTEED NOTHING WORKS<br>
        PUBLIC INTERNET REGISTER 01
      </div>
      <hr class="mdr-thermal__rule">
      <p class="mdr-thermal__title">PURCHASE CONFIRMED</p>
      <hr class="mdr-thermal__rule">
      <div class="mdr-thermal__row mdr-thermal__row--head">
        <span>ITEM</span><span>PRICE</span>
      </div>
      <div class="mdr-thermal__row">
        <span>NOTHING, STANDARD</span><span>$1.00</span>
      </div>
      <p class="mdr-thermal__label">PURCHASED BY</p>
      <p class="mdr-thermal__value">${escapeHtml(receipt.alias)}</p>
      <p class="mdr-thermal__label">RECEIPT NO</p>
      <p class="mdr-thermal__value">${serialForNumber(receipt.number)}</p>
      <p class="mdr-thermal__label">TIER</p>
      <p class="mdr-thermal__value">${escapeHtml(receipt.tier || tierForNumber(receipt.number))}</p>
      ${
        receipt.message
          ? `<p class="mdr-thermal__label">MESSAGE</p><p class="mdr-thermal__message">"${escapeHtml(receipt.message)}"</p>`
          : ""
      }
      <hr class="mdr-thermal__rule">
      <div class="mdr-thermal__row"><span>SUBTOTAL</span><span>$1.00</span></div>
      <div class="mdr-thermal__row"><span>UTILITY</span><span>$0.00</span></div>
      <div class="mdr-thermal__row"><span>REGRET</span><span>INCLUDED</span></div>
      <div class="mdr-thermal__row"><span>TOTAL</span><span>$1.00</span></div>
      <hr class="mdr-thermal__rule">
      <p class="mdr-thermal__foot">${receipt.number.toLocaleString()} OF 1,000,000</p>
      <div class="mdr-thermal__barcode" aria-hidden="true"></div>
    `;
  }

  function renderArchivePreview() {
    const recent = (stats.recent || config.mockReceipts || []).slice(0, 5);
    $("mdr-recent").innerHTML = recent
      .map(
        (item) => `
      <div class="mdr-log-line" data-number="${item.number}">
        <span class="mdr-log-line__num">#${formatReceiptNumber(item.number)}</span>
        <span class="mdr-log-line__alias">${escapeHtml(item.alias)}</span>
        <span class="mdr-log-line__price">$1.00</span>
      </div>
    `
      )
      .join("");
  }

  function renderStaticSections() {
    document.title = config.title || document.title;
    $("mdr-tagline").textContent = config.tagline || "";
    $("mdr-footer-tagline").textContent = config.tagline || "";

    $("mdr-faq-list").innerHTML = (config.faq || [])
      .map((item) => `<div><dt>${escapeHtml(item.q)}</dt><dd>${escapeHtml(item.a)}</dd></div>`)
      .join("");

    $("mdr-legal-copy").innerHTML = `
      <p>${escapeHtml(config.legal?.disclaimer || "")}</p>
      <p>${escapeHtml(config.legal?.moderation || "")}</p>
    `;

    if (config.moneyModel) {
      $("mdr-allocation").innerHTML = `
        <table>
          <thead><tr><th>Use</th><th>%</th></tr></thead>
          <tbody>
            ${(config.moneyModel.allocations || [])
              .map((row) => `<tr><td>${escapeHtml(row.use)}</td><td>${row.percent}%</td></tr>`)
              .join("")}
          </tbody>
        </table>
      `;
    }

    $("mdr-milestone-list").innerHTML = (config.milestones || [])
      .slice(0, 6)
      .map((milestone) => {
        const unlocked = (stats.totalCents ?? 0) >= milestone.cents;
        return `
          <li class="mdr-module ${unlocked ? "is-unlocked" : ""}">
            <span class="mdr-module__light" aria-hidden="true"></span>
            <span class="mdr-module__name">${escapeHtml(milestone.unlock)}</span>
            <span class="mdr-module__amt">${formatMoney(milestone.cents)}</span>
          </li>
        `;
      })
      .join("");

    const wallHtml = (config.wallOfRegret || [])
      .map(
        (entry) => `
          <div class="mdr-wall-item">
            "${escapeHtml(entry.message)}"
            <cite>${escapeHtml(entry.alias)} · #${formatReceiptNumber(entry.number)}</cite>
          </div>
        `
      )
      .join("");

    if ($("mdr-wall-grid")) {
      $("mdr-wall-grid").innerHTML = wallHtml;
    }

    if ($("mdr-wall-regret")) {
      $("mdr-wall-regret").innerHTML = wallHtml;
    }

    if (config.nothingReport) {
      $("mdr-report-body").innerHTML = `
        <p>${escapeHtml(config.nothingReport.summary)}</p>
        ${(config.nothingReport.sections || [])
          .map((section) => `<h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.body)}</p>`)
          .join("")}
      `;
    }

    renderSacredReceipt();
  }

  function openCheckoutDrawer() {
    $("mdr-checkout").hidden = false;
    $("mdr-skip-animation").hidden = !prefersReducedMotion;
    $("mdr-checkout").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  function beginCheckoutSequence() {
    clearTimers();
    $("mdr-confirmation").hidden = true;

    if (prefersReducedMotion) {
      setKioskPhase("checkout");
      openCheckoutDrawer();
      return;
    }

    setKioskPhase("awake");
    $("mdr-skip-animation").hidden = false;

    schedule(() => setKioskPhase("conveyor"), 200);
    schedule(() => setKioskPhase("scan"), 700);
    schedule(() => setKioskPhase("stamp"), 1100);
    schedule(() => setKioskPhase("print"), 1400);
    schedule(() => {
      setKioskPhase("checkout");
      openCheckoutDrawer();
    }, 1700);
  }

  function skipAnimation() {
    clearTimers();
    setKioskPhase("checkout");
    openCheckoutDrawer();
  }

  function basicProfanityCheck(value) {
    const blocked = ["spam", "hate"];
    const lower = value.toLowerCase();
    return !blocked.some((word) => lower.includes(word));
  }

  function showConfirmation(receipt) {
    lastReceipt = receipt;
    $("mdr-checkout").hidden = true;
    $("mdr-confirmation").hidden = false;
    renderConfirmReceipt(receipt);
    setKioskPhase("idle");

    const shareText = `I'm officially part of The Million Dollar Receipt.\n${receipt.alias} bought nothing for $1.\nReceipt ${serialForNumber(receipt.number)}.`;
    $("mdr-share-text").value = shareText;

    $("mdr-confirmation").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  async function submitCheckout(form) {
    const formData = new FormData(form);
    const alias = String(formData.get("alias") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const errorEl = $("mdr-checkout-error");
    errorEl.textContent = "";

    if (!alias) {
      errorEl.textContent = "Alias required.";
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
        await refreshData();
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch {
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
        await refreshData();
        return;
      }

      errorEl.textContent = "Checkout unavailable.";
    }
  }

  async function refreshData() {
    renderCounter();
    renderSacredReceipt();
    renderArchivePreview();
    renderStaticSections();
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
    canvas.width = 640;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f3ecdf";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f0e0d";
    ctx.font = "700 22px Courier New, monospace";

    const lines = [
      "LEMONTEED NOTHING WORKS",
      "THE MILLION DOLLAR RECEIPT",
      "",
      `RECEIPT: ${serialForNumber(lastReceipt.number)}`,
      `${lastReceipt.alias} bought NOTHING`,
      "$1.00",
      "",
      `${lastReceipt.number.toLocaleString()} OF 1,000,000`
    ];

    lines.forEach((line, index) => {
      ctx.fillText(line, 40, 60 + index * 36);
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `mdr-${lastReceipt.number}.png`;
    link.click();
  }

  function setMobilePath(path) {
    document.body.dataset.mobilePath = path;

    document.querySelectorAll(".mdr-path-nav__btn").forEach((btn) => {
      const isActive = btn.dataset.path === path;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function switchDockTab(tabId) {
    document.querySelectorAll(".mdr-dock__tab").forEach((tab) => {
      const isActive = tab.dataset.tab === tabId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    document.querySelectorAll(".mdr-dock__panel").forEach((panel) => {
      const isActive = panel.id === `mdr-tab-${tabId}`;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  function scrollToReceipt() {
    setMobilePath("read");
    $("mdr-receipt-section")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  function bindEvents() {
    $("mdr-buy-button")?.addEventListener("click", beginCheckoutSequence);
    $("mdr-buy-button-machine")?.addEventListener("click", beginCheckoutSequence);
    $("mdr-skip-animation")?.addEventListener("click", skipAnimation);

    $("mdr-checkout-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitCheckout(event.currentTarget);
    });

    $("mdr-read-receipt-btn")?.addEventListener("click", () => {
      setMobilePath("read");
      scrollToReceipt();
    });

    $("mdr-explain-after-buy")?.addEventListener("click", () => {
      setMobilePath("read");
      $("mdr-receipt-section")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });

    $("mdr-buy-from-read")?.addEventListener("click", () => {
      setMobilePath("buy");
      beginCheckoutSequence();
    });

    document.querySelectorAll(".mdr-path-nav__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setMobilePath(btn.dataset.path);
        if (btn.dataset.path === "buy") {
          window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
      });
    });

    document.querySelectorAll(".mdr-dock__tab").forEach((tab) => {
      tab.addEventListener("click", () => switchDockTab(tab.dataset.tab));
    });

    $("mdr-view-line")?.addEventListener("click", () => {
      if (lastReceipt) {
        window.location.href = `/million-dollar-receipt/receipt/?id=${lastReceipt.number}`;
      }
    });

    $("mdr-download-card")?.addEventListener("click", downloadShareCard);
    $("mdr-share-button")?.addEventListener("click", copyShareText);

    $("mdr-random-button")?.addEventListener("click", async () => {
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

  async function initLanding() {
    if (!$("mdr-kiosk") || !config.title) {
      return;
    }

    bindEvents();
    await loadStats();
    renderCounter();
    renderStaticSections();
    renderArchivePreview();
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

    document.title = `${serialForNumber(receipt.number)} | The Million Dollar Receipt`;

    root.innerHTML = `
      <div class="mdr-sacred__frame">
        <div class="mdr-thermal" id="mdr-confirm-receipt"></div>
      </div>
      <div class="mdr-confirmation__actions" style="margin-top:16px">
        <button class="mdr-utility-btn" type="button" id="mdr-share-button">Share</button>
        <button class="mdr-utility-btn" type="button" id="mdr-download-card">Download</button>
        <a class="mdr-utility-btn" href="/million-dollar-receipt/">Buy nothing too</a>
      </div>
      <textarea class="mdr-share-text" id="mdr-share-text" readonly hidden aria-label="Share text"></textarea>
    `;

    lastReceipt = receipt;
    renderConfirmReceipt(receipt);
    $("mdr-share-text").value = `${receipt.alias} bought nothing. Receipt ${serialForNumber(receipt.number)}.`;
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
