(function () {
  const cards = Array.isArray(window.vrgVaultCards) ? window.vrgVaultCards : [];
  const seriesConfigs = Array.isArray(window.vrgVaultSeries) ? window.vrgVaultSeries : [];

  if (!cards.length || !seriesConfigs.length) {
    return;
  }

  const dom = {
    intro: document.getElementById("vrgIntro"),
    stage: document.getElementById("vrgStage"),
    focusLayer: document.getElementById("vrgFocusLayer"),
    focusCard: document.getElementById("vrgFocusCard"),
    focusScan: document.querySelector(".vrg-focus__scan"),
    inspectionBackdrop: document.querySelector("[data-vrg-inspection-close]"),
    inspectionStatus: document.querySelector('[data-vrg-system="inspection"]'),
    closeButton: document.getElementById("vrgCloseButton"),
    prevButton: document.getElementById("vrgPrevButton"),
    nextButton: document.getElementById("vrgNextButton"),
    focusTitle: document.getElementById("vrgFocusTitle"),
    focusSubline: document.getElementById("vrgFocusSubline"),
    rarityPill: document.getElementById("vrgRarityPill"),
    gradePill: document.getElementById("vrgGradePill"),
    statusPill: document.getElementById("vrgStatusPill"),
    metaGrid: document.getElementById("vrgMetaGrid"),
    certCode: document.getElementById("vrgCertCode"),
    seedCode: document.getElementById("vrgSeedCode"),
    collectionMeta: document.getElementById("vrgCollectionMeta")
  };

  const seriesDecks = Object.create(null);
  const state = {
    activeSeriesSlug: seriesConfigs[0]?.slug || "founders",
    focusSeriesSlug: seriesConfigs[0]?.slug || "founders",
    focusLocalIndex: 0,
    lastFocusedButton: null,
    initialized: false,
    bound: false
  };

  const caseStatus = {
    founders: "Sealed Storage",
    creators: "Intake Bay"
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getDeck(slug) {
    return seriesDecks[slug];
  }

  function positionIdFor(config) {
    return String(config.countId || "").replace("Count", "Position");
  }

  function formatRetrieval(index, total) {
    const current = String(index + 1).padStart(2, "0");
    const max = String(total).padStart(2, "0");
    return `Retrieval ${current} / ${max}`;
  }

  function createSlab(card, compact) {
    const shell = document.createElement(compact ? "div" : "button");
    shell.className = compact ? "vrg-focus-card-shell" : "vrg-pile__card vault-artifact-card";
    if (!compact) {
      shell.type = "button";
      shell.setAttribute("aria-label", `Inspect ${card.title} artifact`);
    }
    shell.innerHTML = `
      <div class="vrg-slab">
        <img class="vrg-slab__media" src="${escapeHtml(card.imagePath)}" alt="${escapeHtml(card.title)} graded artifact" loading="${compact ? "eager" : "lazy"}" decoding="async" />
        <span class="vault-artifact-card__glare" aria-hidden="true"></span>
      </div>
      <div class="vrg-slab__reflection" aria-hidden="true"></div>`;
    return shell;
  }

  function getSlabElement(shell) {
    return shell.querySelector(".vrg-slab");
  }

  function setCollectionMeta() {
    if (!dom.collectionMeta) {
      return;
    }

    const founders = cards.filter((card) => card.role === "Founder").length;
    const creators = cards.length - founders;
    const slabs = dom.collectionMeta.querySelector('[data-vrg-stat="slabs"]');
    const foundersEl = dom.collectionMeta.querySelector('[data-vrg-stat="founders"]');
    const creatorsEl = dom.collectionMeta.querySelector('[data-vrg-stat="creators"]');

    if (slabs) slabs.textContent = String(cards.length);
    if (foundersEl) foundersEl.textContent = String(founders);
    if (creatorsEl) creatorsEl.textContent = String(creators);
  }

  function setActiveSeries(slug) {
    state.activeSeriesSlug = slug;
    Object.values(seriesDecks).forEach((deck) => {
      const isCurrent = deck.slug === slug;
      deck.section.classList.toggle("vrg-case--current", isCurrent);
      deck.section.classList.toggle("vault-case--current", isCurrent);
    });
  }

  function setSeriesIndex(slug, targetIndex) {
    const deck = getDeck(slug);
    if (!deck) {
      return false;
    }

    const nextIndex = clamp(targetIndex, 0, deck.cards.length - 1);
    if (nextIndex === deck.activeIndex) {
      return false;
    }

    deck.activeIndex = nextIndex;
    updateSeriesDeck(slug);
    return true;
  }

  function updateSeriesDeck(slug) {
    const deck = getDeck(slug);
    if (!deck) {
      return;
    }

    const total = deck.cards.length;
    deck.count.textContent = `${total} Artifact${total === 1 ? "" : "s"}`;
    if (deck.position) {
      deck.position.textContent = formatRetrieval(deck.activeIndex, total);
    }
    deck.prev.disabled = deck.activeIndex === 0;
    deck.next.disabled = deck.activeIndex === total - 1;

    const sideOffset = window.innerWidth < 720 ? 224 : 268;

    deck.shells.forEach((shell, localIndex) => {
      const delta = localIndex - deck.activeIndex;
      const direction = Math.sign(delta);
      const distance = Math.abs(delta);
      const depth = Math.max(0, distance - 1);
      const limitedDepth = Math.min(depth, 4);

      shell.classList.remove("vrg-pile__card--center", "vrg-pile__card--queued", "vrg-pile__card--archived", "vrg-pile__card--peek");

      if (delta === 0) {
        shell.classList.add("vrg-pile__card--center");
        shell.style.setProperty("--pile-x", "0px");
        shell.style.setProperty("--pile-y", "-18px");
        shell.style.setProperty("--pile-z", "320px");
        shell.style.setProperty("--pile-rz", "0deg");
        shell.style.setProperty("--pile-ry", "0deg");
        shell.style.setProperty("--pile-scale", "1");
        shell.style.setProperty("--pile-opacity", "1");
        shell.style.setProperty("--pile-filter", "brightness(1.04) saturate(1.02)");
        shell.style.zIndex = "6";
        return;
      }

      const xBase = direction > 0 ? -sideOffset : sideOffset;
      shell.classList.add(direction > 0 ? "vrg-pile__card--queued" : "vrg-pile__card--archived");
      if (distance <= 3) {
        shell.classList.add("vrg-pile__card--peek");
      }

      shell.style.setProperty("--pile-x", `${xBase + (direction > 0 ? -1 : 1) * (limitedDepth * 18)}px`);
      shell.style.setProperty("--pile-y", `${10 + limitedDepth * 5}px`);
      shell.style.setProperty("--pile-z", `${-36 - limitedDepth * 34}px`);
      shell.style.setProperty("--pile-rz", `${(direction > 0 ? -11 : 11) + direction * limitedDepth * 1.6}deg`);
      shell.style.setProperty("--pile-ry", `${(direction > 0 ? 16 : -16) - direction * limitedDepth * 2}deg`);
      shell.style.setProperty("--pile-scale", `${Math.max(0.82, 0.92 - limitedDepth * 0.03)}`);
      shell.style.setProperty("--pile-opacity", `${Math.max(0.1, 0.5 - limitedDepth * 0.12)}`);
      shell.style.setProperty("--pile-filter", "saturate(.42) brightness(.52) blur(.8px)");
      shell.style.zIndex = String(Math.max(1, 4 - limitedDepth));
    });
  }

  function navigateSeries(slug, direction) {
    const deck = getDeck(slug);
    if (!deck) {
      return;
    }

    setSeriesIndex(slug, deck.activeIndex + direction);
  }

  function handleTilt(event) {
    const shell = event.currentTarget;
    if (!shell.classList.contains("vrg-pile__card--center") || prefersReducedMotion()) {
      return;
    }

    const slab = getSlabElement(shell);
    if (!slab) {
      return;
    }

    const rect = shell.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    slab.style.transform = `rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg) translateZ(20px)`;
    slab.style.setProperty("--mx", `${px * 100}%`);
    slab.style.setProperty("--my", `${py * 100}%`);
    slab.style.setProperty("--glint-opacity", "0.48");
  }

  function resetTilt(event) {
    const slab = getSlabElement(event.currentTarget);
    if (!slab) {
      return;
    }

    slab.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
    slab.style.setProperty("--glint-opacity", "0.14");
  }

  function cardStatus(card) {
    return card.series === "Founder Series" ? caseStatus.founders : caseStatus.creators;
  }

  function renderMetadata(card) {
    dom.focusTitle.textContent = card.title;
    dom.focusSubline.textContent = `${card.series} / ${card.edition} / VRG ${card.gradeNumber}`;
    dom.rarityPill.textContent = card.rarity;
    dom.gradePill.textContent = `${card.gradeText} · ${card.gradeNumber}`;
    dom.statusPill.textContent = cardStatus(card);
    dom.certCode.textContent = `CERT ${card.cert}`;
    dom.seedCode.textContent = `SEED ${card.seed}`;

    const rows = [
      ["Artifact ID", card.id],
      ["Series", card.series],
      ["Archive Class", card.category],
      ["Preservation Status", cardStatus(card)],
      ["Origin", card.business],
      ["Tags", card.badges],
      ["Rarity", card.rarity],
      ["Grade", `VRG ${card.gradeNumber} · ${card.gradeText}`],
      ["Cert", card.cert],
      ["Role", card.role],
      ["Known For", card.knownFor],
      ["Edition", card.edition]
    ];

    dom.metaGrid.innerHTML = rows
      .filter(([, value]) => String(value || "").trim())
      .map(([label, value]) => `<div class="vrg-meta__item"><div class="vrg-meta__label">${escapeHtml(label)}</div><div class="vrg-meta__value">${escapeHtml(value)}</div></div>`)
      .join("");
  }

  function renderFocusSlab(card) {
    dom.focusCard.textContent = "";
    const shell = createSlab(card, true);
    const slab = shell.querySelector(".vrg-slab");
    if (slab) {
      slab.classList.add("vrg-slab--focus");
      dom.focusCard.appendChild(slab);
    }
  }

  function triggerFocusScan() {
    if (!dom.focusScan || prefersReducedMotion()) {
      return;
    }

    dom.focusScan.classList.remove("vrg-focus__scan--active");
    void dom.focusScan.offsetWidth;
    dom.focusScan.classList.add("vrg-focus__scan--active");
  }

  function updateFocusSpot(sourceButton) {
    if (!sourceButton || window.innerWidth < 980) {
      dom.focusLayer.style.setProperty("--spot-x", "50%");
      dom.focusLayer.style.setProperty("--spot-y", "24%");
      return;
    }

    const rect = sourceButton.getBoundingClientRect();
    dom.focusLayer.style.setProperty("--spot-x", `${(((rect.left + rect.width / 2) / window.innerWidth) * 100).toFixed(1)}%`);
    dom.focusLayer.style.setProperty("--spot-y", `${Math.min(62, Math.max(24, ((rect.top + rect.height / 2) / window.innerHeight) * 100)).toFixed(1)}%`);
  }

  function updateFocusNavButtons() {
    const deck = getDeck(state.focusSeriesSlug);
    if (!deck) {
      return;
    }

    dom.prevButton.disabled = state.focusLocalIndex === 0;
    dom.nextButton.disabled = state.focusLocalIndex === deck.cards.length - 1;
  }

  function setInspectionStatus(active) {
    if (dom.inspectionStatus) {
      dom.inspectionStatus.textContent = active ? "Active" : "Standby";
    }
  }

  function openFocus(slug, localIndex, sourceButton) {
    const deck = getDeck(slug);
    if (!deck) {
      return;
    }

    const card = deck.cards[localIndex];
    state.focusSeriesSlug = slug;
    state.focusLocalIndex = localIndex;
    setSeriesIndex(slug, localIndex);
    state.lastFocusedButton = sourceButton || deck.shells[localIndex];
    renderFocusSlab(card);
    renderMetadata(card);
    updateFocusSpot(state.lastFocusedButton);
    updateFocusNavButtons();
    dom.focusLayer.classList.add("vrg-focus--open", "vault-inspection--open");
    dom.focusLayer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-vrg-focus-open", "is-vrg-inspection-open");
    setInspectionStatus(true);
    triggerFocusScan();
    dom.closeButton.focus({ preventScroll: true });
  }

  function closeFocus() {
    dom.focusLayer.classList.remove("vrg-focus--open", "vault-inspection--open");
    dom.focusLayer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-vrg-focus-open", "is-vrg-inspection-open");
    setInspectionStatus(false);

    if (state.lastFocusedButton) {
      state.lastFocusedButton.focus({ preventScroll: true });
    }
  }

  function goToFocusCard(direction) {
    const deck = getDeck(state.focusSeriesSlug);
    if (!deck) {
      return;
    }

    const targetIndex = clamp(state.focusLocalIndex + direction, 0, deck.cards.length - 1);
    if (targetIndex === state.focusLocalIndex) {
      return;
    }

    openFocus(state.focusSeriesSlug, targetIndex, deck.shells[targetIndex]);
  }

  function bindSwipe(deck) {
    deck.pile.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) {
        return;
      }

      setActiveSeries(deck.slug);
      deck.touchStartX = event.touches[0].clientX;
      deck.touchStartY = event.touches[0].clientY;
    }, { passive: true });

    deck.pile.addEventListener("touchend", (event) => {
      if (deck.touchStartX === null || event.changedTouches.length !== 1) {
        return;
      }

      const deltaX = event.changedTouches[0].clientX - deck.touchStartX;
      const deltaY = event.changedTouches[0].clientY - deck.touchStartY;
      deck.touchStartX = null;
      deck.touchStartY = null;

      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      navigateSeries(deck.slug, deltaX < 0 ? 1 : -1);
    }, { passive: true });
  }

  function bindShellInteractions(deck, shell, localIndex) {
    shell.addEventListener("pointermove", handleTilt);
    shell.addEventListener("pointerleave", resetTilt);
    shell.addEventListener("focus", () => setActiveSeries(deck.slug));
    shell.addEventListener("click", () => {
      setActiveSeries(deck.slug);
      if (localIndex === deck.activeIndex) {
        openFocus(deck.slug, localIndex, shell);
        return;
      }

      setSeriesIndex(deck.slug, localIndex);
    });
  }

  function initializeSeriesDeck(config) {
    const deck = {
      ...config,
      section: document.querySelector(`[data-vrg-series="${config.slug}"]`),
      pile: document.getElementById(config.pileId),
      count: document.getElementById(config.countId),
      position: document.getElementById(positionIdFor(config)),
      prev: document.getElementById(config.prevId),
      next: document.getElementById(config.nextId),
      cards: cards.filter((card) => card.series === config.seriesName),
      shells: [],
      activeIndex: 0,
      touchStartX: null,
      touchStartY: null
    };

    if (!deck.section || !deck.pile || !deck.count || !deck.prev || !deck.next) {
      return;
    }

    seriesDecks[config.slug] = deck;

    deck.section.addEventListener("pointerenter", () => setActiveSeries(deck.slug));
    deck.section.addEventListener("focusin", () => setActiveSeries(deck.slug));
    deck.prev.addEventListener("click", () => {
      setActiveSeries(deck.slug);
      navigateSeries(deck.slug, -1);
    });
    deck.next.addEventListener("click", () => {
      setActiveSeries(deck.slug);
      navigateSeries(deck.slug, 1);
    });
    bindSwipe(deck);

    deck.cards.forEach((card, localIndex) => {
      const shell = createSlab(card, false);
      shell.dataset.localIndex = String(localIndex);
      shell.dataset.cardId = card.id;
      bindShellInteractions(deck, shell, localIndex);
      deck.shells.push(shell);
      deck.pile.appendChild(shell);
    });

    updateSeriesDeck(deck.slug);
  }

  function bindChipScroll() {
    document.querySelectorAll("[data-vrg-scroll]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const slug = chip.dataset.vrgScroll;
        const targetId = slug === "founders" ? "vrgCaseFounders" : "vrgCaseCreators";
        const target = document.getElementById(targetId);
        setActiveSeries(slug);
        target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function runIntro(options) {
    if (!dom.intro || !dom.stage) {
      return;
    }

    const vaultRoot = dom.intro.closest(".vrg-vault");
    const forceSkip = options?.forceSkip === true;
    const skipIntro = forceSkip || sessionStorage.getItem("vrgVaultIntroSeen") === "1";

    if (skipIntro || prefersReducedMotion()) {
      dom.intro.classList.add("vrg-intro--hidden");
      dom.stage.classList.add("vrg-stage--ready");
      vaultRoot?.classList.add("vrg-vault--ready");
      return;
    }

    window.setTimeout(() => {
      dom.intro.classList.add("vrg-intro--hidden");
      dom.stage.classList.add("vrg-stage--ready");
      vaultRoot?.classList.add("vrg-vault--ready");
      sessionStorage.setItem("vrgVaultIntroSeen", "1");
    }, 3600);
  }

  function bindGlobalEvents() {
    if (state.bound) {
      return;
    }

    dom.closeButton?.addEventListener("click", closeFocus);
    dom.inspectionBackdrop?.addEventListener("click", closeFocus);
    dom.prevButton?.addEventListener("click", () => goToFocusCard(-1));
    dom.nextButton?.addEventListener("click", () => goToFocusCard(1));

    dom.focusLayer?.addEventListener("click", (event) => {
      if (event.target === dom.focusLayer || event.target === dom.inspectionBackdrop) {
        closeFocus();
      }
    });

    window.addEventListener("resize", () => {
      if (!dom.focusLayer?.classList.contains("vrg-focus--open")) {
        return;
      }

      const deck = getDeck(state.focusSeriesSlug);
      if (!deck) {
        return;
      }

      updateFocusSpot(deck.shells[state.focusLocalIndex]);
    });

    window.addEventListener("keydown", (event) => {
      if (!document.body.classList.contains("is-vrg-vault-mode")) {
        return;
      }

      if (dom.focusLayer?.classList.contains("vrg-focus--open")) {
        if (event.key === "Escape") {
          closeFocus();
        }
        if (event.key === "ArrowLeft") {
          goToFocusCard(-1);
        }
        if (event.key === "ArrowRight") {
          goToFocusCard(1);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        navigateSeries(state.activeSeriesSlug, -1);
      }
      if (event.key === "ArrowRight") {
        navigateSeries(state.activeSeriesSlug, 1);
      }
    });

    state.bound = true;
  }

  function findCardTarget(cardId) {
    for (const slug of Object.keys(seriesDecks)) {
      const deck = getDeck(slug);
      const localIndex = deck.cards.findIndex((card) => card.id === cardId);
      if (localIndex >= 0) {
        return { slug, localIndex, deck };
      }
    }

    return null;
  }

  function openSlab(cardId) {
    const target = findCardTarget(cardId);
    if (!target) {
      return false;
    }

    setActiveSeries(target.slug);
    setSeriesIndex(target.slug, target.localIndex);
    openFocus(target.slug, target.localIndex, target.deck.shells[target.localIndex]);
    return true;
  }

  function init(options) {
    if (state.initialized) {
      if (options?.slabId) {
        openSlab(options.slabId);
      }
      return;
    }

    seriesConfigs.forEach(initializeSeriesDeck);
    setCollectionMeta();
    setActiveSeries(state.activeSeriesSlug);
    bindChipScroll();
    bindGlobalEvents();
    runIntro({ forceSkip: options?.forceSkipIntro === true });
    state.initialized = true;

    if (options?.slabId) {
      openSlab(options.slabId);
    }
  }

  window.VrgVault = {
    init,
    openSlab,
    closeFocus
  };
})();
