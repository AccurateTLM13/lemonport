/**
 * gallery-transitions.js (loaded as portal-lightbox.js)
 * ─────────────────────────────────────────────────────
 * Two focused effects on top of the existing gallery — no
 * overlays, no clones, no pre-lightbox interruptions.
 *
 * 1. Gallery click feedback
 *    When a gallery button is clicked the rest of the grid
 *    dims out briefly and the clicked card flares — gives
 *    the click a sense of weight without delaying anything.
 *
 * 2. Lightbox entrance
 *    Watches for the lightbox becoming visible and animates
 *    the image (scale + fade up) and artifact panel (slide
 *    from right) each time it opens or navigates.
 *    Navigation (prev/next) re-triggers with a lighter ease.
 *
 * Respects prefers-reduced-motion throughout.
 * Does not modify gallery.js or any data file.
 * ─────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var FLASH_MS      = 300;   // how long the grid stays dimmed
  var NAV_DELAY_MS  = 60;    // brief pause before re-animating on nav

  var gallery       = document.querySelector('[data-gallery]');
  var lightbox      = document.querySelector('[data-lightbox]');
  var lightboxImg   = document.querySelector('[data-lightbox-image]');
  var artifactPanel = document.querySelector('[data-artifact-details]');
  var lightboxPrev  = document.querySelector('[data-lightbox-prev]');
  var lightboxNext  = document.querySelector('[data-lightbox-next]');

  if (!gallery && !lightbox) { return; }

  /* ─────────────────────────────────────────────────────
     1. Gallery click feedback
     Dims the grid and flares the clicked card. Uses capture
     so it fires at the same time as gallery.js without
     interfering with its event handling.
  ───────────────────────────────────────────────────── */
  var flashTimer = null;

  function clearFlash() {
    clearTimeout(flashTimer);
    flashTimer = null;
    if (gallery) {
      gallery.classList.remove('gallery--flash');
      var prev = gallery.querySelector('.gallery__item--flash-target');
      if (prev) { prev.classList.remove('gallery__item--flash-target'); }
    }
  }

  if (gallery) {
    gallery.addEventListener('click', function (event) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

      var button = event.target.closest('.gallery__button');
      if (!button) { return; }

      var item = button.closest('.gallery__item');
      if (!item) { return; }

      clearFlash();
      gallery.classList.add('gallery--flash');
      item.classList.add('gallery__item--flash-target');

      flashTimer = setTimeout(clearFlash, FLASH_MS);
    }, true);
  }

  /* ─────────────────────────────────────────────────────
     2. Lightbox entrance animation
     MutationObserver watches the hidden attribute.
     Separate lighter animation is used on prev/next nav.
  ───────────────────────────────────────────────────── */
  function reduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function resetClass(el, cls) {
    if (!el) { return; }
    el.classList.remove(cls);
    /* force reflow so the browser registers the removal */
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function triggerEntrance() {
    if (reduceMotion()) { return; }
    resetClass(lightboxImg,   'lb-img--entering');
    resetClass(artifactPanel, 'lb-panel--entering');
  }

  function triggerNav() {
    if (reduceMotion()) { return; }
    /* on prev/next the image cross-fades rather than scaling up */
    resetClass(lightboxImg,   'lb-img--navigating');
    resetClass(artifactPanel, 'lb-panel--navigating');
  }

  if (lightbox) {
    /* watch for lightbox becoming visible */
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'hidden' && !lightbox.hidden) {
          triggerEntrance();
          return;
        }
      }
    });
    observer.observe(lightbox, { attributes: true });
  }

  /* hook prev/next for the nav cross-fade */
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function () {
      setTimeout(triggerNav, NAV_DELAY_MS);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener('click', function () {
      setTimeout(triggerNav, NAV_DELAY_MS);
    });
  }

}());
