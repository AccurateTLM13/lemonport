/* Specimen Vault enhancements.
   The index is fully static and readable without JavaScript. This script only
   turns the per-specimen <dialog> files into slide-out drawers. */
(() => {
  const drawers = [...document.querySelectorAll("dialog.drawer")];
  const rail = document.querySelector("[data-favorites-rail]");
  if (!drawers.length && !rail) return;

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

  if (!rail) return;

  const viewport = rail.querySelector("[data-favorites-viewport]");
  const track = rail.querySelector("[data-favorites-track]");
  const set = rail.querySelector("[data-favorites-set]");
  const clone = rail.querySelector("[data-favorites-clone]");
  const toggle = rail.querySelector("[data-favorites-toggle]");
  const cards = set ? [...set.querySelectorAll(".favorites-card")] : [];
  if (!viewport || !track || !set || cards.length < 2 || !clone || !toggle) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowViewport = window.matchMedia("(max-width: 720px)");
  const pauseReasons = new Set();
  const loopDuration = Math.max(32000, cards.length * 8000);
  let distance = 0;
  let offset = 0;
  let lastTime = 0;

  const canMarquee = () => !reducedMotion.matches && !narrowViewport.matches;

  const measure = () => {
    const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
    distance = set.getBoundingClientRect().width + gap;
    if (distance > 0) {
      offset %= distance;
      track.style.transform = canMarquee() ? `translate3d(${-offset}px, 0, 0)` : "none";
    }
  };

  const animate = (time) => {
    if (!canMarquee()) {
      rail.classList.remove("is-looping");
      track.style.transform = "none";
    } else {
      rail.classList.add("is-looping");
      if (!lastTime) lastTime = time;
      const elapsed = Math.min(time - lastTime, 100);
      lastTime = time;
      if (!pauseReasons.size && distance > 0) {
        offset = (offset + (distance * elapsed) / loopDuration) % distance;
        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }
    }
    window.requestAnimationFrame(animate);
  };

  const setPauseReason = (reason, paused) => {
    if (paused) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
  };

  setPauseReason("hidden", document.hidden);
  rail.addEventListener("pointerenter", () => setPauseReason("hover", true));
  rail.addEventListener("pointerleave", () => setPauseReason("hover", false));
  rail.addEventListener("focusin", () => setPauseReason("focus", true));
  rail.addEventListener("focusout", (event) => {
    if (!rail.contains(event.relatedTarget)) setPauseReason("focus", false);
  });
  toggle.addEventListener("click", () => {
    const paused = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.textContent = paused ? "RESUME MOTION" : "PAUSE MOTION";
    setPauseReason("manual", paused);
  });
  viewport.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    viewport.scrollBy({ left: event.key === "ArrowRight" ? 180 : -180, behavior: "smooth" });
  });
  document.addEventListener("visibilitychange", () => {
    setPauseReason("hidden", document.hidden);
  });
  window.addEventListener("resize", measure, { passive: true });
  if (typeof ResizeObserver === "function") new ResizeObserver(measure).observe(set);
  window.addEventListener("load", measure, { once: true });
  measure();
  window.requestAnimationFrame(animate);
})();
