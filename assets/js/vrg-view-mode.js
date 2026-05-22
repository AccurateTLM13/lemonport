(function () {
  const gridView = document.querySelector('[data-gallery-view="grid"]');
  const vaultView = document.querySelector('[data-gallery-view="vault"]');
  const toggleButtons = Array.from(document.querySelectorAll("[data-vrg-view]"));

  if (!gridView || !vaultView || !toggleButtons.length) {
    return;
  }

  const defaultView = "vault";
  let activeView = defaultView;

  function viewFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view");
    return requested === "grid" ? "grid" : defaultView;
  }

  function slabFromLocation() {
    const hash = window.location.hash.replace(/^#/, "");

    if (hash.startsWith("slab=")) {
      return decodeURIComponent(hash.slice(5));
    }

    return "";
  }

  function updateUrl(view, slabId) {
    const params = new URLSearchParams(window.location.search);

    if (view === "grid") {
      params.set("view", "grid");
    } else {
      params.delete("view");
    }

    const query = params.toString();
    const hash = view === "vault" && slabId ? `#slab=${encodeURIComponent(slabId)}` : "";
    history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${hash}`);
  }

  function setToggleState(view) {
    toggleButtons.forEach((button) => {
      const isActive = button.dataset.vrgView === view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  function applyView(view, options) {
    const opts = options || {};
    activeView = view;
    const isVault = view === "vault";

    gridView.hidden = isVault;
    vaultView.hidden = !isVault;
    document.body.classList.toggle("is-vrg-vault-mode", isVault);
    setToggleState(view);

    if (isVault && window.VrgVault) {
      window.VrgVault.init({
        forceSkipIntro: opts.forceSkipIntro === true,
        slabId: opts.slabId || ""
      });
    }

    if (!opts.skipUrl) {
      updateUrl(view, opts.slabId || "");
    }
  }

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyView(button.dataset.vrgView || defaultView, {
        forceSkipIntro: button.dataset.vrgView === "vault"
      });
    });
  });

  window.addEventListener("hashchange", () => {
    if (activeView !== "vault") {
      return;
    }

    const slabId = slabFromLocation();
    if (slabId && window.VrgVault) {
      window.VrgVault.openSlab(slabId);
    }
  });

  document.addEventListener("click", (event) => {
    const openVault = event.target.closest("[data-open-vrg-vault]");

    if (!openVault) {
      return;
    }

    event.preventDefault();
    document.querySelector("[data-lightbox-close]")?.click();
    applyView("vault", {
      slabId: openVault.dataset.openVrgVault || "",
      forceSkipIntro: true
    });
  });

  const initialView = viewFromLocation();
  applyView(initialView, {
    slabId: initialView === "vault" ? slabFromLocation() : ""
  });
})();
