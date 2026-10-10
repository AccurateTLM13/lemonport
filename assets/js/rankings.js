/* Lemmy's Rankings zone behavior (progressive enhancement).
   Static HTML carries every episode link; this only adds the Lemmy
   "episode opened" reaction and a keyboard-friendly focus return. */
(function () {
  "use strict";

  const EPISODE_OPENED = "lemonteed:episode-opened";

  function announceEpisodeOpened(link) {
    if (!link || typeof window.CustomEvent !== "function") {
      return;
    }
    document.dispatchEvent(new CustomEvent(EPISODE_OPENED, {
      detail: { href: link.getAttribute("href") || "" }
    }));
  }

  function init() {
    const links = Array.from(document.querySelectorAll(".rankings-episode__link"));

    links.forEach((link) => {
      link.addEventListener("click", () => announceEpisodeOpened(link));

      // Middle-click never leaves this page, so it needs its own trigger.
      link.addEventListener("auxclick", (event) => {
        if (event.button === 1) {
          announceEpisodeOpened(link);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();