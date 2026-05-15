(function () {
  const sidebar = document.querySelector(".sidebar");

  if (!sidebar || sidebar.dataset.mobileHeaderReady === "true") {
    return;
  }

  const topRow = sidebar.querySelector(".sidebar__top");
  const categoryNav = sidebar.querySelector(".category-nav");

  if (!topRow || !categoryNav) {
    return;
  }

  sidebar.dataset.mobileHeaderReady = "true";

  const menuButton = document.createElement("button");
  menuButton.className = "mobile-menu-toggle";
  menuButton.type = "button";
  menuButton.setAttribute("aria-label", "Open navigation menu");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.textContent = "\u2630";
  topRow.append(menuButton);

  const categoryButton = document.createElement("button");
  categoryButton.className = "mobile-category-toggle";
  categoryButton.type = "button";
  categoryButton.setAttribute("aria-label", "Open category menu");
  categoryButton.setAttribute("aria-expanded", "false");
  categoryButton.innerHTML = '<span data-mobile-category-label>All</span><span aria-hidden="true">\u25be</span>';
  topRow.after(categoryButton);

  const drawer = document.createElement("div");
  drawer.className = "mobile-nav-sheet";
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="mobile-nav-sheet__backdrop" data-mobile-nav-close></div>
    <section class="mobile-nav-sheet__panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
      <div class="mobile-nav-sheet__head">
        <span data-mobile-sheet-title>Artifact Terminal</span>
        <button class="mobile-nav-sheet__close" type="button" data-mobile-nav-close aria-label="Close navigation">X</button>
      </div>
      <div class="mobile-nav-sheet__actions" data-mobile-nav-actions></div>
      <nav class="mobile-nav-sheet__categories" data-mobile-nav-categories aria-label="Portfolio categories"></nav>
    </section>
  `;
  document.body.append(drawer);

  const title = drawer.querySelector("[data-mobile-sheet-title]");
  const actions = drawer.querySelector("[data-mobile-nav-actions]");
  const categories = drawer.querySelector("[data-mobile-nav-categories]");
  const closeButtons = Array.from(drawer.querySelectorAll("[data-mobile-nav-close]"));
  const label = categoryButton.querySelector("[data-mobile-category-label]");
  let lastFocusedElement = null;

  function activeCategoryLabel() {
    const active = categoryNav.querySelector(".category-link.is-active, .category-link[aria-current]");

    if (active) {
      return active.textContent.trim();
    }

    const pageElement = document.querySelector("[data-gallery-page]");

    if (pageElement && pageElement.dataset.galleryTitle) {
      return pageElement.dataset.galleryTitle;
    }

    return "All";
  }

  function updateActiveLabel() {
    label.textContent = activeCategoryLabel();
  }

  function buildActions() {
    actions.textContent = "";

    const info = topRow.querySelector(".info-link");

    if (info && (info.tagName !== "BUTTON" || document.querySelector("[data-info]"))) {
      if (info.tagName === "BUTTON") {
        const button = document.createElement("button");
        button.className = "mobile-nav-sheet__action";
        button.type = "button";
        button.textContent = info.textContent.trim() || "Info";
        button.addEventListener("click", () => {
          closeDrawer();
          info.click();
        });
        actions.append(button);
      } else {
        const link = info.cloneNode(true);
        link.classList.add("mobile-nav-sheet__action");
        actions.append(link);
      }
    }

    const junk = sidebar.querySelector(".junk-drawer-module");
    if (junk) {
      const link = document.createElement("a");
      link.className = "mobile-nav-sheet__action";
      link.href = junk.getAttribute("href") || "/junk-drawer/";
      link.textContent = "Junk Drawer";
      actions.append(link);
    }

    const operator = sidebar.querySelector(".op-status-badge");
    if (operator) {
      const link = document.createElement("a");
      link.className = "mobile-nav-sheet__action";
      link.href = operator.getAttribute("href") || "/operator-log/";
      link.textContent = "Operator Log";
      actions.append(link);
    }

    actions.hidden = actions.children.length === 0;
  }

  function sourceForLink(link) {
    const href = link.getAttribute("href");
    const key = link.dataset.categoryLink;
    const links = Array.from(categoryNav.querySelectorAll(".category-link"));

    return links.find((item) => {
      if (key && item.dataset.categoryLink === key) {
        return true;
      }

      return item.getAttribute("href") === href && item.textContent.trim() === link.textContent.trim();
    });
  }

  function buildCategories() {
    categories.textContent = "";

    Array.from(categoryNav.querySelectorAll(".category-link")).forEach((source) => {
      const link = source.cloneNode(true);
      link.classList.add("mobile-nav-sheet__category");
      link.addEventListener("click", (event) => {
        const original = sourceForLink(link);

        if (original) {
          event.preventDefault();
          closeDrawer();
          original.click();
          window.setTimeout(updateActiveLabel, 0);
        }
      });
      categories.append(link);
    });
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || drawer.hidden) {
      return;
    }

    const focusable = Array.from(drawer.querySelectorAll("a[href], button:not([disabled])"))
      .filter((item) => item.offsetParent !== null || item === document.activeElement);

    if (!focusable.length) {
      return;
    }

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

  function openDrawer(mode) {
    updateActiveLabel();
    buildActions();
    buildCategories();
    title.textContent = mode === "categories" ? "Categories" : "Artifact Terminal";
    lastFocusedElement = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add("mobile-nav-open");
    menuButton.setAttribute("aria-expanded", "true");
    categoryButton.setAttribute("aria-expanded", "true");
    const first = mode === "categories"
      ? drawer.querySelector(".mobile-nav-sheet__category")
      : drawer.querySelector(".mobile-nav-sheet__action, .mobile-nav-sheet__category");

    if (first) {
      first.focus();
    }
  }

  function closeDrawer() {
    if (drawer.hidden) {
      return;
    }

    drawer.hidden = true;
    document.body.classList.remove("mobile-nav-open");
    menuButton.setAttribute("aria-expanded", "false");
    categoryButton.setAttribute("aria-expanded", "false");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function syncCompactState() {
    sidebar.classList.toggle("is-mobile-compact", window.scrollY > 54);
  }

  menuButton.addEventListener("click", () => openDrawer("menu"));
  categoryButton.addEventListener("click", () => openDrawer("categories"));
  closeButtons.forEach((button) => button.addEventListener("click", closeDrawer));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }

    trapFocus(event);
  });

  if (categoryNav) {
    const observer = new MutationObserver(updateActiveLabel);
    observer.observe(categoryNav, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  window.addEventListener("scroll", syncCompactState, { passive: true });
  updateActiveLabel();
  syncCompactState();
}());
