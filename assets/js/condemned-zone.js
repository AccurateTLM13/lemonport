/**
 * Condemned Facility & Renovation Notice
 * Handles caution tape ribbons and the decommissioned exhibit modal.
 */
(function () {
  "use strict";

  function initCondemnedZone() {
    document.body.classList.add("is-condemned-facility");

    // Top caution tape
    const topTape = document.createElement("div");
    topTape.className = "caution-tape caution-tape--top";
    topTape.setAttribute("aria-hidden", "true");
    topTape.innerHTML = `
      <div class="caution-tape__text">
        <span>&#9888;&#65039; CAUTION // FACILITY CLOSED</span>
        <span>PROJECT DECOMMISSIONED</span>
        <span>UNDER RENOVATION</span>
        <span>&#9888;&#65039; DO NOT CROSS</span>
        <span>NEW EXHIBIT COMING SOON</span>
        <span>&#9888;&#65039; THE WRONG INTERNET</span>
      </div>
    `;

    // Bottom caution tape
    const bottomTape = document.createElement("div");
    bottomTape.className = "caution-tape caution-tape--bottom";
    bottomTape.setAttribute("aria-hidden", "true");
    bottomTape.innerHTML = `
      <div class="caution-tape__text">
        <span>&#9888;&#65039; NOTICE // HISTORIC EXHIBIT RETIRED</span>
        <span>ALL SLABS TRANSFERRED TO ARCHIVE</span>
        <span>&#9888;&#65039; THE WRONG INTERNET</span>
        <span>PREVIEW ACTIVE</span>
        <span>&#9888;&#65039; CAUTION</span>
      </div>
    `;

    // Centered modal overlay
    const overlay = document.createElement("div");
    overlay.className = "condemned-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "condemnedTitle");

    overlay.innerHTML = `
      <div class="condemned-modal">
        <div class="condemned-modal__header">
          <span class="condemned-modal__badge">&#9888;&#65039; Facility Notice // Operator Dispatch</span>
          <span class="condemned-modal__code">DISPATCH #044-VRG</span>
        </div>

        <h1 class="condemned-modal__title" id="condemnedTitle">Project is Closed.</h1>
        <div class="condemned-modal__subtitle">New Exhibit Coming Soon: The Wrong Internet</div>

        <div class="condemned-modal__body">
          <p>The <strong>VRG Card Vault</strong> has officially concluded operations. All 20 historical graded slabs have been cataloged and safely transferred into the <strong>Archive Cavern</strong>.</p>
          <p>In its place, a brand-new destination is moving into this lot: <em>concept websites that shouldn't work, but for some funny reason they do.</em></p>
        </div>

        <div class="sneak-peek-box">
          <div class="sneak-peek-box__eyebrow">
            <span class="sneak-peek-box__tag">Exhibit #01 &bull; Sneak Peek</span>
            <span class="sneak-peek-box__live">Fully Functional</span>
          </div>
          <h2 class="sneak-peek-box__title">404 Therapy &mdash; Human Debugging Clinic</h2>
          <p class="sneak-peek-box__desc">A high-effort private therapy practice for analytical minds, burnout loops, and race condition neurosis. Features a working intake diagnostic, clinician matching, and full booking engine.</p>
          <a class="sneak-peek-cta" href="/the-wrong-internet/404-therapy/">
            <span>&#128640; Visit 404 Therapy (Sneak Peek) &rarr;</span>
          </a>
        </div>

        <div class="condemned-modal__actions">
          <a class="condemned-sub-btn" href="/archive/">
            <span>&bull; Browse Slabs in Archive</span>
          </a>
          <a class="condemned-sub-btn" href="/">
            <span>&larr; Return to World Map</span>
          </a>
        </div>
      </div>
    `;

    // Inspect toggle button
    const inspectBtn = document.createElement("button");
    inspectBtn.className = "condemned-inspect-toggle";
    inspectBtn.type = "button";
    inspectBtn.textContent = "[ Inspect Retired Vault ]";

    let inspecting = false;
    inspectBtn.addEventListener("click", function () {
      inspecting = !inspecting;
      document.body.classList.toggle("inspect-mode", inspecting);
      inspectBtn.textContent = inspecting ? "[ Show Renovation Notice ]" : "[ Inspect Retired Vault ]";
    });

    document.body.appendChild(topTape);
    document.body.appendChild(bottomTape);
    document.body.appendChild(overlay);
    document.body.appendChild(inspectBtn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCondemnedZone);
  } else {
    initCondemnedZone();
  }
})();
