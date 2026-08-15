/**
 * mobile-header.js - Mobile & Tablet Responsive Navigation
 * Transforms the desktop sidebar into a compact 54px header with an accessible slide-over drawer.
 */
(function () {
  const sidebar = document.querySelector(".sidebar");

  if (!sidebar || sidebar.dataset.mobileHeaderReady === "true") {
    return;
  }

  sidebar.dataset.mobileHeaderReady = "true";

  // 1. Locate or normalize the top header row inside the sidebar
  let topRow = sidebar.querySelector(".sidebar__top") || sidebar.querySelector(".sidebar__brand-block");
  if (!topRow) {
    topRow = document.createElement("div");
    topRow.className = "sidebar__top";
    sidebar.prepend(topRow);
    const brand = sidebar.querySelector(".brand");
    if (brand) topRow.append(brand);
  }

  // Ensure topRow has .sidebar__top class for consistent styling
  topRow.classList.add("sidebar__top");

  // 2. Add or find mobile menu toggle button
  let menuButton = sidebar.querySelector(".mobile-menu-toggle");
  if (!menuButton) {
    menuButton = document.createElement("button");
    menuButton.className = "mobile-menu-toggle";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Open navigation menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = '<span class="mobile-menu-toggle__icon" aria-hidden="true">☰</span><span class="mobile-menu-toggle__label">MENU</span>';
    topRow.append(menuButton);
  }

  // 3. Create or attach the mobile navigation sheet / drawer
  let drawer = document.querySelector(".mobile-nav-sheet");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.className = "mobile-nav-sheet";
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="mobile-nav-sheet__backdrop" data-mobile-nav-close></div>
      <section class="mobile-nav-sheet__panel" role="dialog" aria-modal="true" aria-label="Lemonteed Navigation">
        <div class="mobile-nav-sheet__head">
          <div class="mobile-nav-sheet__brand">
            <span class="mobile-nav-sheet__logo-text">LEMONTEED</span>
            <span class="mobile-nav-sheet__tag">NAVIGATION</span>
          </div>
          <button class="mobile-nav-sheet__close" type="button" data-mobile-nav-close aria-label="Close navigation">✕</button>
        </div>
        <div class="mobile-nav-sheet__scroll">
          <div class="mobile-nav-sheet__section">
            <div class="mobile-nav-sheet__section-title">WORKBENCH</div>
            <div class="mobile-nav-sheet__links" data-mobile-workbench></div>
          </div>
          <div class="mobile-nav-sheet__section">
            <div class="mobile-nav-sheet__section-title">DISTRICTS &amp; FILTERS</div>
            <div class="mobile-nav-sheet__links" data-mobile-categories></div>
          </div>
          <div class="mobile-nav-sheet__section">
            <div class="mobile-nav-sheet__section-title">EXPERIMENTS &amp; UTILITIES</div>
            <div class="mobile-nav-sheet__links" data-mobile-utilities></div>
          </div>
        </div>
      </section>
    `;
    document.body.append(drawer);
  }

  const workbenchContainer = drawer.querySelector("[data-mobile-workbench]");
  const categoriesContainer = drawer.querySelector("[data-mobile-categories]");
  const utilitiesContainer = drawer.querySelector("[data-mobile-utilities]");
  const closeButtons = Array.from(drawer.querySelectorAll("[data-mobile-nav-close]"));
  let lastFocusedElement = null;

  function populateDrawer() {
    const rawPath = window.location.pathname;
    const currentPath = rawPath.replace(/\/$/, '') || '/';

    // 1. Workbench links
    const workbenchItems = [
      { name: "Studio Lab", href: "/studio-lab/", badge: "Active Builds" },
      { name: "Operator's Log", href: "/operator-log/", badge: "Build Notes" },
      { name: "Design Benchmark", href: "/benchmark/", badge: "Evidence" }
    ];

    if (workbenchContainer) {
      workbenchContainer.innerHTML = workbenchItems.map(item => {
        const itemPath = item.href.replace(/\/$/, '');
        const isCurrent = currentPath === itemPath || (itemPath !== '' && currentPath.startsWith(itemPath));
        return `
          <a class="mobile-nav-sheet__link ${isCurrent ? 'is-active' : ''}" href="${item.href}" ${isCurrent ? 'aria-current="page"' : ''}>
            <span>${item.name}</span>
            <span class="mobile-nav-sheet__badge">${item.badge}</span>
          </a>
        `;
      }).join('');
    }

    // 2. District & Category links
    const categoryItems = [
      { name: "All Artifacts", href: "/archive/", key: "all" },
      { name: "VRG Cards", href: "/vrg-cards/", key: "vrg-cards" },
      { name: "What If", href: "/what-if/", key: "what-if" },
      { name: "Misc Gens", href: "/misc-gens/", key: "misc-gens" },
      { name: "Memetic Warfare", href: "/memetic-warfare/", key: "memetic-warfare" },
      { name: "Lemonteed FM", href: "/lemonteed-fm/", key: "lemonteed-fm" }
    ];

    if (categoriesContainer) {
      categoriesContainer.innerHTML = categoryItems.map(item => {
        const itemPath = item.href.replace(/\/$/, '');
        const isCurrent = currentPath === itemPath || (itemPath !== '/archive' && itemPath !== '' && currentPath.startsWith(itemPath));
        return `
          <a class="mobile-nav-sheet__link ${isCurrent ? 'is-active' : ''}" href="${item.href}" data-category="${item.key}" ${isCurrent ? 'aria-current="page"' : ''}>
            <span>${item.name}</span>
            <span class="mobile-nav-sheet__arrow">→</span>
          </a>
        `;
      }).join('');
    }

    // 3. Utilities & Actions
    if (utilitiesContainer) {
      utilitiesContainer.innerHTML = `
        <a class="mobile-nav-sheet__action mobile-nav-sheet__action--random" href="/archive/?random=1">
          <span>SUMMON RANDOM ARTIFACT</span>
          <span class="mobile-nav-sheet__sub">RND-???</span>
        </a>
        <a class="mobile-nav-sheet__action" href="/junk-drawer/">
          <span>FREE BROWSER TOOLS</span>
        </a>
      `;
    }
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || drawer.hidden) return;

    const focusable = Array.from(drawer.querySelectorAll("a[href], button:not([disabled])"))
      .filter((item) => item.offsetParent !== null || item === document.activeElement);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDrawer() {
    populateDrawer();
    lastFocusedElement = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add("mobile-nav-open");
    menuButton.setAttribute("aria-expanded", "true");

    const first = drawer.querySelector(".mobile-nav-sheet__link, .mobile-nav-sheet__close");
    if (first) first.focus();
  }

  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.body.classList.remove("mobile-nav-open");
    menuButton.setAttribute("aria-expanded", "false");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  menuButton.addEventListener("click", openDrawer);
  closeButtons.forEach((btn) => btn.addEventListener("click", closeDrawer));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }
    trapFocus(event);
  });
})();
