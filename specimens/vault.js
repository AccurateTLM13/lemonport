/* Specimen Vault enhancements.
   The index is fully static and readable without JavaScript. This script only
   turns the per-specimen <dialog> files into slide-out drawers. */
(() => {
  const drawers = [...document.querySelectorAll("dialog.drawer")];
  if (!drawers.length) return;

  let lastTrigger = null;

  const openDrawer = (id, trigger) => {
    const drawer = document.getElementById(`drawer-${id}`);
    if (!drawer || typeof drawer.showModal !== "function") return;
    lastTrigger = trigger || null;
    drawer.showModal();
    const close = drawer.querySelector("[data-close-drawer]");
    if (close) close.focus();
  };

  document.addEventListener("click", (event) => {
    const info = event.target.closest("[data-specimen-info]");
    if (info) {
      event.preventDefault();
      openDrawer(info.dataset.specimenInfo, info);
      return;
    }
    const close = event.target.closest("[data-close-drawer]");
    if (close) {
      const drawer = close.closest("dialog");
      if (drawer?.open) drawer.close();
      return;
    }
    // Click on the backdrop closes (native dialog click target is the element
    // itself; compare against the dialog box bounds).
    const dialog = event.target.closest("dialog.drawer");
    if (dialog?.open && event.target === dialog) dialog.close();
  });

  document.addEventListener("close", (event) => {
    if (event.target instanceof HTMLDialogElement && lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }, true);
})();
