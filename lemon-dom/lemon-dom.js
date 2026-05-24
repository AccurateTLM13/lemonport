(function () {
  "use strict";

  var instances = new WeakMap();

  function resolveElements(target) {
    if (!target) return [];
    if (typeof target === "string") {
      return Array.prototype.slice.call(document.querySelectorAll(target));
    }
    if (target.nodeType === 1) return [target];
    if (target.length !== undefined) {
      return Array.prototype.slice.call(target).filter(function (el) {
        return el && el.nodeType === 1;
      });
    }
    return [];
  }

  function getRecord(el) {
    if (!instances.has(el)) {
      instances.set(el, {
        effects: {},
        listeners: [],
        observers: []
      });
    }
    return instances.get(el);
  }

  function trackListener(el, type, handler, options) {
    var record = getRecord(el);
    el.addEventListener(type, handler, options);
    record.listeners.push({ type: type, handler: handler, options: options });
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function alreadyApplied(el, effect) {
    return !!getRecord(el).effects[effect];
  }

  function markApplied(el, effect) {
    getRecord(el).effects[effect] = true;
  }

  function glass(target) {
    resolveElements(target).forEach(function (el) {
      if (alreadyApplied(el, "glass")) return;
      el.classList.add("lemon-glass");
      markApplied(el, "glass");
    });
  }

  function juice(target) {
    resolveElements(target).forEach(function (el) {
      if (alreadyApplied(el, "juice")) return;
      el.classList.add("lemon-juice");

      function setGlow(clientX, clientY) {
        var rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var x = ((clientX - rect.left) / rect.width) * 100;
        var y = ((clientY - rect.top) / rect.height) * 100;
        el.style.setProperty("--lemon-x", x.toFixed(2) + "%");
        el.style.setProperty("--lemon-y", y.toFixed(2) + "%");
      }

      function onPointerMove(event) {
        setGlow(event.clientX, event.clientY);
      }

      function onPointerEnter(event) {
        el.classList.add("is-juicing");
        setGlow(event.clientX, event.clientY);
      }

      function onPointerLeave() {
        el.classList.remove("is-juicing");
      }

      trackListener(el, "pointermove", onPointerMove);
      trackListener(el, "pointerenter", onPointerEnter);
      trackListener(el, "pointerleave", onPointerLeave);
      markApplied(el, "juice");
    });
  }

  function squeeze(target) {
    resolveElements(target).forEach(function (el) {
      if (alreadyApplied(el, "squeeze")) return;
      el.classList.add("lemon-squeeze");

      function setSqueezeVector(clientX, clientY) {
        var rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var dx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        var dy = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        dx = Math.max(-1, Math.min(1, dx));
        dy = Math.max(-1, Math.min(1, dy));
        el.style.setProperty("--lemon-squeeze-dx", dx.toFixed(3));
        el.style.setProperty("--lemon-squeeze-dy", dy.toFixed(3));
      }

      function onPointerDown(event) {
        if (event.button !== 0) return;
        el.classList.add("is-squeezing");
        setSqueezeVector(event.clientX, event.clientY);
      }

      function onPointerMove(event) {
        if (!el.classList.contains("is-squeezing")) return;
        setSqueezeVector(event.clientX, event.clientY);
      }

      function onPointerUp() {
        el.classList.remove("is-squeezing");
      }

      trackListener(el, "pointerdown", onPointerDown);
      trackListener(el, "pointermove", onPointerMove);
      trackListener(el, "pointerup", onPointerUp);
      trackListener(el, "pointercancel", onPointerUp);
      trackListener(el, "pointerleave", onPointerUp);
      markApplied(el, "squeeze");
    });
  }

  function zest(target) {
    resolveElements(target).forEach(function (el) {
      if (alreadyApplied(el, "zest")) return;
      el.classList.add("lemon-zest");
      markApplied(el, "zest");
    });
  }

  function peel(target) {
    resolveElements(target).forEach(function (el) {
      if (alreadyApplied(el, "peel")) return;
      el.classList.add("lemon-peel");
      var record = getRecord(el);

      if (prefersReducedMotion()) {
        el.classList.add("is-peeled");
        markApplied(el, "peel");
        return;
      }

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-peeled");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.15,
          rootMargin: "0px 0px -6% 0px"
        }
      );

      observer.observe(el);
      record.observers.push(observer);
      markApplied(el, "peel");
    });
  }

  function init(options) {
    var root = (options && options.root) || document;
    var scope = root.querySelectorAll ? root : document;

    scope.querySelectorAll("[data-lemon-glass]").forEach(glass);
    scope.querySelectorAll("[data-lemon-juice]").forEach(juice);
    scope.querySelectorAll("[data-lemon-squeeze]").forEach(squeeze);
    scope.querySelectorAll("[data-lemon-zest]").forEach(zest);
    scope.querySelectorAll("[data-lemon-peel]").forEach(peel);
  }

  function destroy() {
    document.querySelectorAll(".lemon-glass, .lemon-juice, .lemon-squeeze, .lemon-zest, .lemon-peel").forEach(function (el) {
      var record = instances.get(el);
      if (record) {
        record.listeners.forEach(function (entry) {
          el.removeEventListener(entry.type, entry.handler, entry.options);
        });
        record.observers.forEach(function (observer) {
          observer.disconnect();
        });
      }

      el.classList.remove(
        "lemon-glass",
        "lemon-juice",
        "lemon-squeeze",
        "lemon-zest",
        "lemon-peel",
        "is-juicing",
        "is-squeezing",
        "is-peeled"
      );
      el.style.removeProperty("--lemon-x");
      el.style.removeProperty("--lemon-y");
      el.style.removeProperty("--lemon-squeeze-dx");
      el.style.removeProperty("--lemon-squeeze-dy");
      instances.delete(el);
    });
  }

  window.LemonDOM = {
    init: init,
    glass: glass,
    juice: juice,
    squeeze: squeeze,
    zest: zest,
    peel: peel,
    destroy: destroy
  };
})();
