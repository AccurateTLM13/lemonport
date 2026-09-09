/**
 * Lemonteed Wayfinder Dock
 * Injected persistent edge navigation for concept sites under "The Wrong Internet".
 */
(function () {
  "use strict";

  if (document.querySelector(".wayfinder-dock")) return;

  // Auto-inject CSS if not present
  if (!document.querySelector('link[href*="wayfinder-dock.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/css/wayfinder-dock.css";
    document.head.appendChild(link);
  }

  function initDock() {
    const dock = document.createElement("div");
    dock.className = "wayfinder-dock";
    dock.setAttribute("role", "region");
    dock.setAttribute("aria-label", "Lemonteed Wayfinder Navigation");

    dock.innerHTML = `
      <div class="wayfinder-panel" id="wayfinderPanel" role="dialog" aria-labelledby="wayfinderTitle">
        <div class="wayfinder-panel__header">
          <span class="wayfinder-panel__zone">The Wrong Internet</span>
          <span class="wayfinder-panel__status">Live Exhibit</span>
        </div>
        <h3 class="wayfinder-panel__title" id="wayfinderTitle">404 Therapy</h3>
        <p class="wayfinder-panel__desc">A serious private therapy practice for analytical minds and developer burnout.</p>
        <div class="wayfinder-panel__actions">
          <a class="wayfinder-btn wayfinder-btn--primary" href="/vrg-cards/">
            <span>&larr; More Fake Sites</span>
            <span style="font-family: var(--wayfinder-font-mono); font-size: 10px;">[DIR]</span>
          </a>
          <a class="wayfinder-btn wayfinder-btn--secondary" href="/">
            <span>&larr; Lemonteed World Map</span>
            <span>&map;</span>
          </a>
        </div>
      </div>

      <button class="wayfinder-pill" id="wayfinderPill" type="button" aria-expanded="false" aria-controls="wayfinderPanel" title="The Wrong Internet — Return to Lemonteed">
        <span class="wayfinder-pill__icon" aria-hidden="true">&#x1F34B;</span>
        <span class="wayfinder-pill__label">Wrong Internet</span>
        <span class="wayfinder-pill__badge">&larr; Return</span>
        <span class="wayfinder-pill__chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </span>
      </button>
    `;

    document.body.appendChild(dock);

    const pill = dock.querySelector("#wayfinderPill");
    let isOpen = false;

    function toggle(open) {
      isOpen = typeof open === "boolean" ? open : !isOpen;
      dock.classList.toggle("is-open", isOpen);
      pill.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    pill.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });

    // Close when clicking outside
    document.addEventListener("click", function (e) {
      if (isOpen && !dock.contains(e.target)) {
        toggle(false);
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        toggle(false);
        pill.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDock);
  } else {
    initDock();
  }
})();
