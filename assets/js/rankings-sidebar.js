/**
 * rankings-sidebar.js - Lemmy's Rankings zone (Zone 06)
 *
 * Progressive enhancement for the workbench sidebar. The sidebar markup is
 * static and crawlable; this script only adds the slide-in behaviour so the
 * navigation never takes space away from the episodes list or the article.
 *
 * - The "WORKBENCH" edge tab opens the panel and a scrim.
 * - Escape, scrim click, or the close button dismiss it.
 * - Focus moves into the panel on open and returns to the tab on close.
 */
(function () {
  "use strict";

  const body = document.body;
  const panel = document.querySelector(".rankings-sidebar");
  const toggle = document.querySelector("[data-rankings-sidebar-toggle]");
  const scrim = document.querySelector("[data-rankings-sidebar-scrim]");
  const closeButton = panel ? panel.querySelector("[data-rankings-sidebar-close]") : null;

  if (!panel || !toggle || !scrim || body.dataset.rankingsSidebarReady === "true") {
    return;
  }

  body.dataset.rankingsSidebarReady = "true";
  body.classList.add("rankings-sidebar-ready");

  let lastFocusedElement = null;

  function isOpen() {
    return body.classList.contains("rankings-sidebar-is-open");
  }

  function focusableItems() {
    return Array.from(
      panel.querySelectorAll("a[href], button:not([disabled])")
    ).filter((item) => item.offsetParent !== null);
  }

  function openSidebar() {
    lastFocusedElement = document.activeElement;
    scrim.hidden = false;
    body.classList.add("rankings-sidebar-is-open");
    toggle.setAttribute("aria-expanded", "true");

    const first = closeButton || focusableItems()[0];
    if (first) {
      first.focus();
    }
  }

  function closeSidebar() {
    if (!isOpen()) {
      return;
    }

    scrim.hidden = true;
    body.classList.remove("rankings-sidebar-is-open");
    toggle.setAttribute("aria-expanded", "false");

    /* Anything still focused inside the panel is about to be hidden, so focus
       always lands back on the tab unless the drawer was opened from elsewhere. */
    const restore = lastFocusedElement && !panel.contains(lastFocusedElement)
      ? lastFocusedElement
      : toggle;
    if (restore && typeof restore.focus === "function") {
      restore.focus();
    }
    lastFocusedElement = null;
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || !isOpen()) {
      return;
    }

    const items = focusableItems();
    if (!items.length) {
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener("click", openSidebar);
  scrim.addEventListener("click", closeSidebar);
  if (closeButton) {
    closeButton.addEventListener("click", closeSidebar);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
      return;
    }
    trapFocus(event);
  });
})();