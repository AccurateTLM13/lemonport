/**
 * operator.js
 * Operator Log: Off-Clock Protocol — Public Page Controller
 *
 * Fetches manifest.json → active fragment → renders content blocks.
 * Handles locked/unlocked states, visit tracking, and unlock interaction.
 *
 * localStorage keys:
 *   operatorLogUnlocked  — "true" when clocked out
 *   operatorLogVisits    — visit count integer
 *
 * Security note: localStorage is theatrical personalization only.
 * Do not rely on it for actual content protection.
 */

(function () {
  "use strict";

  // ─── Storage Keys ─────────────────────────────────────────────────────────
  const KEY_UNLOCKED = "operatorLogUnlocked";
  const KEY_VISITS = "operatorLogVisits";

  // ─── Visit Tracking ────────────────────────────────────────────────────────
  function incrementVisits() {
    const current = parseInt(localStorage.getItem(KEY_VISITS) || "0", 10);
    const next = current + 1;
    localStorage.setItem(KEY_VISITS, String(next));
    return next;
  }

  function getFlavorText(visits) {
    if (visits >= 5) return "Fine. Look around.";
    if (visits >= 3) return "You keep coming back.";
    return "Unauthorized personnel detected.";
  }

  // ─── Unlock State ──────────────────────────────────────────────────────────
  function isUnlocked() {
    return localStorage.getItem(KEY_UNLOCKED) === "true";
  }

  function unlock() {
    localStorage.setItem(KEY_UNLOCKED, "true");
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  function showToast(message) {
    const existing = document.querySelector(".op-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "op-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.4s ease";
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // ─── Block Renderers ───────────────────────────────────────────────────────
  function renderTextBlock(block) {
    const el = document.createElement("div");
    el.className = "op-block-text";

    if (block.kicker) {
      const kicker = document.createElement("span");
      kicker.className = "op-block-kicker";
      kicker.textContent = block.kicker;
      el.appendChild(kicker);
    }

    if (block.title) {
      const title = document.createElement("h2");
      title.className = "op-block-title";
      title.textContent = block.title;
      el.appendChild(title);
    }

    if (block.body) {
      const body = document.createElement("p");
      body.className = "op-block-body";
      body.textContent = block.body;
      el.appendChild(body);
    }

    return el;
  }

  function renderQuoteBlock(block) {
    const el = document.createElement("div");
    el.className = "op-block-quote";

    const bq = document.createElement("blockquote");
    bq.textContent = block.body || "";
    el.appendChild(bq);

    return el;
  }

  function renderEvidenceBlock(block) {
    const el = document.createElement("div");
    el.className = "op-block-evidence";

    const header = document.createElement("div");
    header.className = "op-evidence-header";

    const label = document.createElement("span");
    label.className = "op-evidence-label";
    label.textContent = block.title || "Evidence Locker";
    header.appendChild(label);

    const items = Array.isArray(block.items) ? block.items : [];
    if (items.length) {
      const count = document.createElement("span");
      count.className = "op-evidence-count";
      count.textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;
      header.appendChild(count);
    }

    el.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "op-evidence-grid";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "op-evidence-item";

      if (item.image) {
        const img = document.createElement("img");
        img.className = "op-evidence-img";
        img.src = item.image;
        img.alt = item.alt || item.title || "";
        img.loading = "lazy";
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "op-evidence-img-placeholder";
        placeholder.textContent = "[ EXHIBIT ]";
        card.appendChild(placeholder);
      }

      const title = document.createElement("div");
      title.className = "op-evidence-title";
      title.textContent = item.title || "";
      card.appendChild(title);

      const desc = document.createElement("p");
      desc.className = "op-evidence-desc";
      desc.textContent = item.description || "";
      card.appendChild(desc);

      grid.appendChild(card);
    });

    el.appendChild(grid);
    return el;
  }

  function renderBlock(block) {
    switch (block.type) {
      case "text":     return renderTextBlock(block);
      case "quote":    return renderQuoteBlock(block);
      case "evidence": return renderEvidenceBlock(block);
      default:         return null;
    }
  }

  // ─── Locked Panel ──────────────────────────────────────────────────────────
  function renderLockedPanel(fragment, onUnlock) {
    const panel = document.createElement("div");
    panel.className = "op-locked-panel";

    const icon = document.createElement("span");
    icon.className = "op-locked-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⊘";
    panel.appendChild(icon);

    const copy = document.createElement("p");
    copy.className = "op-locked-copy";
    copy.textContent = fragment.lockedCopy || "Most records are unavailable during standard business hours.";
    panel.appendChild(copy);

    const btn = document.createElement("button");
    btn.className = "op-clock-out";
    btn.type = "button";
    btn.id = "op-clock-out-btn";
    btn.setAttribute("aria-label", "Clock out to access this file");
    btn.textContent = "STATUS: OFF CLOCK";
    btn.addEventListener("click", onUnlock);
    panel.appendChild(btn);

    return panel;
  }

  // ─── Main Render ───────────────────────────────────────────────────────────
  function renderPage(fragment, manifest, visits, unlocked) {
    const root = document.getElementById("op-root");
    if (!root) return;

    root.innerHTML = "";

    // File header
    const fileHeader = document.createElement("header");
    fileHeader.className = "op-file-header";

    const stamp = document.createElement("div");
    stamp.className = "op-file-stamp";
    stamp.textContent = manifest.phaseLabel || "File Fragment";
    fileHeader.appendChild(stamp);

    const headline = document.createElement("h1");
    headline.className = "op-headline";
    headline.textContent = fragment.headline || "Operator Log";
    fileHeader.appendChild(headline);

    const subhead = document.createElement("p");
    subhead.className = "op-subhead";
    subhead.textContent = fragment.subhead || "";
    fileHeader.appendChild(subhead);

    const statusLine = document.createElement("span");
    statusLine.className = "op-status-line";
    if (manifest.requiresUnlock && !unlocked) {
      statusLine.classList.add("is-restricted");
    } else if (unlocked || !manifest.requiresUnlock) {
      statusLine.classList.add("is-cleared");
    }
    statusLine.textContent = fragment.statusLine || "ACCESS LEVEL: VISITOR";
    fileHeader.appendChild(statusLine);

    const flavor = document.createElement("span");
    flavor.className = "op-flavor";
    flavor.textContent = `// ${getFlavorText(visits)}`;
    fileHeader.appendChild(flavor);

    root.appendChild(fileHeader);

    // Locked state: show locked panel + blurred preview of first blocks
    if (manifest.requiresUnlock && !unlocked) {
      const blocks = Array.isArray(fragment.blocks) ? fragment.blocks : [];

      // Show a locked panel with clock-out button
      const lockedPanel = renderLockedPanel(fragment, () => {
        unlock();
        showToast(fragment.unlockCopy || "Clock-out confirmed. Personal archive available.");
        renderPage(fragment, manifest, visits, true);
      });
      root.appendChild(lockedPanel);

      // Show blurred preview of first 2 blocks (if any)
      if (blocks.length) {
        const preview = document.createElement("div");
        preview.className = "op-blocks op-blocks--locked";
        preview.setAttribute("aria-hidden", "true");
        blocks.slice(0, 2).forEach((block) => {
          const el = renderBlock(block);
          if (el) preview.appendChild(el);
        });
        root.appendChild(preview);
      }

      return;
    }

    // Unlocked state: render all blocks
    if (unlocked && manifest.requiresUnlock) {
      const confirmBanner = document.createElement("div");
      confirmBanner.className = "op-file-stamp";
      confirmBanner.style.marginBottom = "32px";
      confirmBanner.textContent = fragment.unlockCopy || "Clock-out confirmed. Personal archive available.";
      root.appendChild(confirmBanner);
    }

    const blocksContainer = document.createElement("div");
    blocksContainer.className = "op-blocks";
    blocksContainer.id = "op-content";

    const blocks = Array.isArray(fragment.blocks) ? fragment.blocks : [];
    blocks.forEach((block) => {
      const el = renderBlock(block);
      if (el) blocksContainer.appendChild(el);
    });

    root.appendChild(blocksContainer);

    // Next mutation hint
    if (manifest.nextMutationHint) {
      const hr = document.createElement("hr");
      hr.className = "op-divider";
      root.appendChild(hr);

      const hint = document.createElement("div");
      hint.className = "op-hint-strip";
      hint.textContent = manifest.nextMutationHint;
      root.appendChild(hint);
    }
  }

  function renderError(message) {
    const root = document.getElementById("op-root");
    if (!root) return;

    root.innerHTML = "";

    const box = document.createElement("div");
    box.className = "op-error";
    box.setAttribute("role", "alert");

    const kicker = document.createElement("span");
    kicker.className = "op-error__kicker";
    kicker.textContent = "RETRIEVAL FAILURE";
    box.appendChild(kicker);

    const h2 = document.createElement("h2");
    h2.textContent = "File Unavailable";
    box.appendChild(h2);

    const p = document.createElement("p");
    p.textContent = message || "This record could not be retrieved. Check back later.";
    box.appendChild(p);

    root.appendChild(box);
  }

  function showLoading() {
    const root = document.getElementById("op-root");
    if (!root) return;

    root.innerHTML = `
      <div class="op-loading" role="status" aria-label="Retrieving file">
        <div class="op-loading__spinner" aria-hidden="true"></div>
        <span>RETRIEVING FILE...</span>
      </div>
    `;
  }

  function updateHeaderPhase(manifest) {
    const el = document.getElementById("op-phase-label");
    if (el && manifest && manifest.phaseLabel) {
      el.textContent = manifest.phaseLabel;
    }
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  async function init() {
    showLoading();

    const visits = incrementVisits();
    const unlocked = isUnlocked();

    let manifest;
    try {
      const res = await fetch("/operator-log/manifest.json");
      if (!res.ok) throw new Error(`manifest.json returned ${res.status}`);
      manifest = await res.json();
    } catch (err) {
      renderError("Manifest unavailable. The operator may be running a promotion.");
      return;
    }

    if (!manifest.activeFragment) {
      renderError("No active fragment referenced in manifest.");
      return;
    }

    updateHeaderPhase(manifest);

    let fragment;
    try {
      const res = await fetch(`/operator-log/data/${manifest.activeFragment}`);
      if (!res.ok) throw new Error(`Fragment returned ${res.status}`);
      fragment = await res.json();
    } catch (err) {
      renderError("Active fragment could not be retrieved. The archive may be mid-mutation.");
      return;
    }

    renderPage(fragment, manifest, visits, unlocked);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
