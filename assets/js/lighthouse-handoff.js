/**
 * Lighthouse Handoff page — progressive enhancements.
 * Works without JS: anchors, form layout, and static content remain functional.
 */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Smooth scroll for in-page anchor links */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        var id = anchor.getAttribute("href");

        if (!id || id === "#") {
          return;
        }

        var target = document.querySelector(id);

        if (!target) {
          return;
        }

        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start"
        });

        if (typeof target.focus === "function") {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      });
    });
  }

  /* Copy example report to clipboard */
  function initCopyReport() {
    var button = document.getElementById("lh-copy-report");

    if (!button) {
      return;
    }

    var targetId = button.getAttribute("data-copy-target");
    var source = targetId ? document.getElementById(targetId) : null;

    if (!source) {
      return;
    }

    var originalLabel = button.textContent;

    button.addEventListener("click", function () {
      var text = source.textContent || "";

      function onSuccess() {
        button.textContent = "Copied";
        button.classList.add("is-copied");
        button.setAttribute("aria-label", "Example report copied to clipboard");

        window.setTimeout(function () {
          button.textContent = originalLabel;
          button.classList.remove("is-copied");
          button.removeAttribute("aria-label");
        }, 2000);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.trim()).then(onSuccess).catch(fallbackCopy);
        return;
      }

      fallbackCopy();

      function fallbackCopy() {
        var textarea = document.createElement("textarea");
        textarea.value = text.trim();
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
          document.execCommand("copy");
          onSuccess();
        } catch (error) {
          button.textContent = "Copy failed";
        }

        document.body.removeChild(textarea);
      }
    });
  }

  /* Expand/collapse roadmap phases */
  function initRoadmapToggle() {
    var items = document.querySelectorAll(".lh-timeline__item");

    items.forEach(function (item) {
      var toggle = item.querySelector(".lh-timeline__toggle");
      var detail = item.querySelector(".lh-timeline__detail");

      if (!toggle || !detail) {
        return;
      }

      toggle.addEventListener("click", function () {
        var isExpanded = toggle.getAttribute("aria-expanded") === "true";
        var nextExpanded = !isExpanded;

        toggle.setAttribute("aria-expanded", String(nextExpanded));
        detail.hidden = !nextExpanded;
        item.classList.toggle("is-expanded", nextExpanded);
      });
    });
  }

  /* Optional typing effect for hero preview */
  function initHeroTyping() {
    if (prefersReducedMotion) {
      return;
    }

    var preview = document.getElementById("lh-hero-preview");
    var code = preview && preview.querySelector("code");

    if (!code) {
      return;
    }

    var fullHtml = code.innerHTML;
    code.innerHTML = "";
    code.classList.add("lh-md--typing");

    var index = 0;
    var chunkSize = 3;

    function typeNext() {
      if (index >= fullHtml.length) {
        code.classList.remove("lh-md--typing");
        return;
      }

      index += chunkSize;
      code.innerHTML = fullHtml.slice(0, index);
      window.requestAnimationFrame(function () {
        window.setTimeout(typeNext, 16);
      });
    }

    window.setTimeout(typeNext, 400);
  }

  /*
   * Tester signup form — static placeholder until backend is wired.
   * TODO: Replace action URL and remove preventDefault when endpoint is ready.
   * Example: form.action = "https://formspree.io/f/xxxxx";
   */
  function initTesterForm() {
    var form = document.getElementById("lh-tester-form");
    var status = document.getElementById("lh-form-status");

    if (!form) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();

        if (status) {
          status.textContent = "Please fill in the required fields.";
          status.className = "lh-form__status is-error";
        }

        return;
      }

      if (status) {
        status.textContent = "Thanks — form endpoint not connected yet. Your interest is noted locally.";
        status.className = "lh-form__status is-success";
      }

      form.reset();
    });
  }

  function init() {
    initSmoothScroll();
    initCopyReport();
    initRoadmapToggle();
    initHeroTyping();
    initTesterForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
