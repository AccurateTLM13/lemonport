(function () {
  const ARCHIVE_PATH = "/archive/";
  const pageElement = document.querySelector("[data-gallery-page]");
  const page = window.galleryPage || {
    category: pageElement ? pageElement.dataset.galleryCategory : "all",
    title: pageElement ? pageElement.dataset.galleryTitle : "All Work"
  };
  const allItems = Array.isArray(window.galleryItems) ? window.galleryItems : [];
  const allCategories = Array.isArray(window.galleryCategories) ? window.galleryCategories : [];
  const gallery = document.querySelector("[data-gallery]");
  const categoryNav = document.querySelector(".category-nav");
  let categoryLinks = Array.from(document.querySelectorAll("[data-category-link]"));
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  const artifactDetails = document.querySelector("[data-artifact-details]");
  const randomButtons = Array.from(document.querySelectorAll("[data-random-artifact]"));
  const lightboxCloseButtons = Array.from(document.querySelectorAll("[data-lightbox-close]"));
  const lightboxPrev = document.querySelector("[data-lightbox-prev]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");
  const lightboxDialog = document.querySelector(".lightbox__dialog");
  const infoOpen = document.querySelector("[data-info-open]");
  const infoDrawer = document.querySelector("[data-info]");
  const infoPanel = document.querySelector("[data-info-panel]");
  const infoCloseButtons = Array.from(document.querySelectorAll("[data-info-close]"));

  let activeCategory = page.category || "all";
  let activeItems = [];
  let activeIndex = 0;
  let lastFocusedElement = null;
  let lastInfoFocusedElement = null;

  function shuffled(items, keepFirst) {
    const shuffledItems = keepFirst ? items.slice(1) : items.slice();

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
    }

    return keepFirst && items.length ? [items[0], ...shuffledItems] : shuffledItems;
  }

  const shuffledItems = shuffled(allItems, true);

  function categoryFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");

    if (category && allCategories.some((item) => item.slug === category)) {
      return category;
    }

    return page.category || "all";
  }

  activeCategory = categoryFromLocation();

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function placeholderSvg(item) {
    const width = item.width || 1200;
    const height = item.height || 1500;
    const tone = item.tone || "#d8d6cf";
    const text = escapeHtml(item.title);
    const label = escapeHtml(item.categoryLabel || item.category);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${tone}"/>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(255,255,255,0.16)"/>
        <circle cx="${width * 0.78}" cy="${height * 0.18}" r="${Math.min(width, height) * 0.18}" fill="rgba(255,255,255,0.18)"/>
        <rect x="${width * 0.1}" y="${height * 0.62}" width="${width * 0.72}" height="${height * 0.1}" fill="rgba(0,0,0,0.16)"/>
        <rect x="${width * 0.16}" y="${height * 0.18}" width="${width * 0.28}" height="${height * 0.54}" fill="rgba(0,0,0,0.12)"/>
        <text x="${width * 0.08}" y="${height - 116}" fill="rgba(255,255,255,0.92)" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${text}</text>
        <text x="${width * 0.08}" y="${height - 64}" fill="rgba(255,255,255,0.76)" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${label}</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function variantFor(url, width) {
    const extensionIndex = url.lastIndexOf(".webp");

    if (extensionIndex < 0) {
      return url;
    }

    return `${url.slice(0, extensionIndex)}-${width}${url.slice(extensionIndex)}`;
  }

  function imageCandidates(item) {
    if (Array.isArray(item.variants) && item.variants.length) {
      return item.variants
        .filter((variant) => variant && variant.url && variant.width)
        .map((variant) => ({
          targetWidth: Number(variant.width),
          descriptorWidth: Number(variant.width),
          url: variant.url
        }))
        .sort((a, b) => a.descriptorWidth - b.descriptorWidth);
    }

    const sizes = item.sizes || {};
    const source = item.image || item.thumbnail || sizes.large || sizes.medium || sizes.small;
    const intrinsicWidth = item.width || 1600;
    const widths = Array.isArray(window.galleryWidths) && window.galleryWidths.length
      ? window.galleryWidths
      : [320, 480, 640, 768, 900, 1024, 1600];
    const seen = new Set();

    return widths.reduce((candidates, targetWidth) => {
      const descriptorWidth = Math.min(targetWidth, intrinsicWidth);

      if (!seen.has(descriptorWidth)) {
        seen.add(descriptorWidth);
        candidates.push({
          targetWidth,
          descriptorWidth,
          url: variantFor(source, targetWidth)
        });
      }

      return candidates;
    }, []);
  }

  function sourcesFor(item) {
    const candidates = imageCandidates(item);
    const sizes = item.sizes || {};
    const fallback = item.image || item.thumbnail || sizes.large || sizes.medium || sizes.small;
    const preferred = candidates.find((candidate) => candidate.descriptorWidth === 768)
      || candidates.find((candidate) => candidate.descriptorWidth === 900)
      || candidates.find((candidate) => candidate.descriptorWidth >= 640)
      || candidates[candidates.length - 1];
    const large = candidates[candidates.length - 1];

    return {
      candidates,
      fallback,
      medium: preferred ? preferred.url : fallback,
      large: large ? large.url : fallback
    };
  }

  function srcsetFor(item) {
    return imageCandidates(item)
      .map((candidate) => `${candidate.url} ${candidate.descriptorWidth}w`)
      .join(", ");
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab" || !container) {
      return;
    }

    const focusable = Array.from(container.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"))
      .filter((element) => element.offsetParent !== null || element === document.activeElement);

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

  function getItemById(id) {
    if (typeof window.getItemById === "function") {
      return window.getItemById(id);
    }

    return allItems.find((item) => item.id === id) || null;
  }

  function getCurrentItem() {
    return activeItems[activeIndex] || null;
  }

  function getRelatedItems(id) {
    if (typeof window.getRelatedItems === "function") {
      return window.getRelatedItems(id);
    }

    const item = getItemById(id);

    if (!item || !Array.isArray(item.related)) {
      return [];
    }

    return item.related.map(getItemById).filter(Boolean);
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "";
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatTags(tags) {
    return Array.isArray(tags) ? tags.filter(Boolean).join(", ") : "";
  }

  function formatTools(tools) {
    return Array.isArray(tools) ? tools.filter(Boolean).join(", ") : "";
  }

  function hasRecordValue(value) {
    return Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());
  }

  function appendRecordField(container, label, value) {
    if (!hasRecordValue(value)) {
      return;
    }

    const field = document.createElement("div");
    field.className = "artifact-record__field";

    const labelElement = document.createElement("dt");
    labelElement.textContent = label;

    const valueElement = document.createElement("dd");
    valueElement.textContent = value;

    field.append(labelElement, valueElement);
    container.append(field);
  }

  function relatedThumbnail(item) {
    const variants = Array.isArray(item.variants) ? item.variants : [];
    const preferred = variants.find((variant) => Number(variant.width) === 320) || variants[0];
    const sizes = item.sizes || {};
    return item.thumbnail || (preferred && preferred.url) || sizes.small || item.image || "";
  }

  function renderRelatedItems(container, item) {
    const relatedItems = getRelatedItems(item.id);

    if (!relatedItems.length) {
      return;
    }

    const section = document.createElement("section");
    section.className = "artifact-related";

    const heading = document.createElement("h3");
    heading.textContent = "Related Artifacts";
    section.append(heading);

    const list = document.createElement("div");
    list.className = "artifact-related__list";

    relatedItems.forEach((relatedItem) => {
      const control = document.createElement("a");
      control.className = "artifact-related__button";
      control.href = relatedItem.href || `/artifacts/${encodeURIComponent(relatedItem.id)}/`;
      control.dataset.relatedId = relatedItem.id;

      const thumbnail = relatedThumbnail(relatedItem);

      if (thumbnail) {
        const img = document.createElement("img");
        img.src = thumbnail;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        control.append(img);
      }

      const title = document.createElement("span");
      title.textContent = relatedItem.title;
      control.append(title);
      list.append(control);
    });

    section.append(list);
    container.append(section);
  }

  function renderArtifactDetails(item) {
    if (!artifactDetails || !item) {
      return;
    }

    artifactDetails.textContent = "";

    const eyebrow = document.createElement("p");
    eyebrow.className = "artifact-record__eyebrow";
    eyebrow.textContent = "Artifact Record";

    const title = document.createElement("h2");
    title.id = "lightbox-title";
    title.textContent = item.title;

    const record = document.createElement("dl");
    record.className = "artifact-record";

    appendRecordField(record, "Category", item.categoryLabel || item.category);
    appendRecordField(record, "Series", item.series);
    appendRecordField(record, "Date Created", formatDate(item.dateCreated));
    appendRecordField(record, "Description", item.description);
    appendRecordField(record, "Origin", item.origin);
    appendRecordField(record, "Danger Level", item.dangerLevel);
    appendRecordField(record, "Tags", formatTags(item.tags));
    appendRecordField(record, "Tools Used", formatTools(item.toolsUsed));

    artifactDetails.append(eyebrow, title, record);

    const vaultCards = Array.isArray(window.vrgVaultCards) ? window.vrgVaultCards : [];
    const hasVaultEntry = vaultCards.some((card) => card.id === item.id);

    if (hasVaultEntry && item.categorySlug === "vrg-cards") {
      const vaultLink = document.createElement("button");
      vaultLink.type = "button";
      vaultLink.className = "artifact-record__vault-link";
      vaultLink.dataset.openVrgVault = item.id;
      vaultLink.textContent = "Open in Vault";
      artifactDetails.append(vaultLink);
    }

    renderRelatedItems(artifactDetails, item);
  }

  function renderCategoryNav() {
    if (!categoryNav || !allCategories.length) {
      return;
    }

    categoryNav.textContent = "";

    const label = document.createElement("span");
    label.className = "nav-label";
    label.textContent = "Categories";
    categoryNav.append(label);

    const allLink = document.createElement("a");
    allLink.className = "category-link";
    allLink.href = ARCHIVE_PATH;
    allLink.dataset.categoryLink = "all";
    allLink.textContent = "All";
    categoryNav.append(allLink);

    allCategories.forEach((category) => {
      const link = document.createElement("a");
      link.className = "category-link";
      link.href = category.path || `${ARCHIVE_PATH}?category=${encodeURIComponent(category.slug)}`;
      link.dataset.categoryLink = category.slug;
      link.textContent = category.label;
      categoryNav.append(link);
    });

    categoryLinks = Array.from(document.querySelectorAll("[data-category-link]"));
  }

  function itemsFor(category) {
    if (category === "all") {
      return shuffledItems;
    }

    return shuffled(allItems.filter((item) => item.categorySlug === category || item.category === category || item.categoryLabel === category), true);
  }

  function setActiveControls(category) {
    categoryLinks.forEach((link) => {
      const isActive = link.dataset.categoryLink === category;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function render(category) {
    if (!gallery) {
      return;
    }

    activeCategory = category;
    activeItems = itemsFor(category);
    gallery.textContent = "";
    setActiveControls(category);

    const fragment = document.createDocumentFragment();

    activeItems.forEach((item, index) => {
      const figure = document.createElement("figure");
      figure.className = "gallery__item";
      figure.dataset.id = item.id;
      figure.dataset.category = item.categorySlug || item.category || "";
      figure.dataset.series = item.series || "";
      figure.dataset.tags = Array.isArray(item.tags) ? item.tags.join(" ") : "";

      const control = item.href ? document.createElement("a") : document.createElement("button");
      control.className = "gallery__button";
      if (item.href) {
        control.href = item.href;
      } else {
        control.type = "button";
      }
      control.dataset.index = String(index);
      control.dataset.id = item.id;
      control.dataset.category = item.categorySlug || item.category || "";
      control.dataset.series = item.series || "";
      control.dataset.tags = Array.isArray(item.tags) ? item.tags.join(" ") : "";
      control.setAttribute("aria-label", item.href ? `Open ${item.title} page` : `Open ${item.title}`);

      const frame = document.createElement("span");
      frame.className = "gallery__frame";

      const img = document.createElement("img");
      const sources = sourcesFor(item);
      img.className = "gallery__image";
      img.src = sources.medium;
      img.srcset = srcsetFor(item);
      img.sizes = "(max-width: 700px) 100vw, (max-width: 1050px) 45vw, (max-width: 1500px) 30vw, 22vw";
      img.alt = item.alt;
      img.width = item.width;
      img.height = item.height;
      img.decoding = "async";

      if (index === 0) {
        img.fetchPriority = "high";
        img.loading = "eager";
      } else {
        img.fetchPriority = "auto";
        img.loading = "lazy";
      }

      img.addEventListener("error", () => {
        img.removeAttribute("srcset");
        img.src = sources.fallback || placeholderSvg(item);

        img.addEventListener("error", () => {
          img.src = placeholderSvg(item);
        }, { once: true });
      }, { once: true });

      const caption = document.createElement("span");
      caption.className = "gallery__caption";
      caption.textContent = `${item.title} / ${item.categoryLabel || item.category}`;

      const screenReaderCaption = document.createElement("figcaption");
      screenReaderCaption.className = "visually-hidden";
      screenReaderCaption.textContent = `${item.title} / ${item.categoryLabel || item.category}`;

      frame.append(img, caption);
      control.append(frame);
      figure.append(control, screenReaderCaption);
      fragment.append(figure);
    });

    gallery.append(fragment);
  }

  function setLightboxImage(item) {
    const sources = sourcesFor(item);
    lightboxImage.removeAttribute("srcset");
    lightboxImage.src = sources.large;
    lightboxImage.alt = item.alt;
    lightboxImage.width = item.width;
    lightboxImage.height = item.height;
    lightboxCaption.textContent = `${item.title} / ${item.categoryLabel || item.category}`;

    lightboxImage.onerror = () => {
      lightboxImage.onerror = null;
      lightboxImage.src = sources.fallback || placeholderSvg(item);
    };
  }

  function setLightboxItem(item) {
    setLightboxImage(item);
    renderArtifactDetails(item);
  }

  function hashItemId() {
    const hash = window.location.hash.slice(1);

    if (!hash) {
      return "";
    }

    if (hash.startsWith("artifact=")) {
      return decodeURIComponent(hash.replace(/^artifact=/, ""));
    }

    return decodeURIComponent(hash);
  }

  function setHashForItem(item) {
    history.replaceState(null, "", `#${encodeURIComponent(item.id)}`);
  }

  function indexInActiveItems(id) {
    return activeItems.findIndex((item) => item.id === id);
  }

  function openItem(item) {
    if (!lightbox || !item) {
      return;
    }

    const visibleIndex = indexInActiveItems(item.id);

    if (visibleIndex >= 0) {
      activeIndex = visibleIndex;
    } else {
      activeItems = shuffledItems;
      activeIndex = indexInActiveItems(item.id);
    }

    if (activeIndex < 0) {
      return;
    }

    if (lightbox.hidden) {
      lastFocusedElement = document.activeElement;
    }

    const openedItem = activeItems[activeIndex];
    setLightboxItem(openedItem);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightbox.querySelector(".lightbox__button--close").focus();
    setHashForItem(openedItem);
    document.dispatchEvent(new CustomEvent("lemonteed:artifact-opened", {
      detail: {
        id: openedItem.id,
        category: openedItem.category
      }
    }));
  }

  function openLightbox(index) {
    if (!lightbox || !activeItems[index]) {
      return;
    }

    openItem(activeItems[index]);
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) {
      return;
    }

    lightbox.hidden = true;
    document.body.style.overflow = "";
    history.replaceState(null, "", window.location.pathname + window.location.search);

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function openInfoPanel() {
    if (!infoDrawer || !infoPanel) {
      return;
    }

    lastInfoFocusedElement = document.activeElement;
    infoDrawer.hidden = false;
    infoPanel.focus();
  }

  function closeInfoPanel() {
    if (!infoDrawer || infoDrawer.hidden) {
      return;
    }

    infoDrawer.hidden = true;

    if (lastInfoFocusedElement && typeof lastInfoFocusedElement.focus === "function") {
      lastInfoFocusedElement.focus();
    }
  }

  function moveLightbox(step) {
    if (!activeItems.length) {
      return;
    }

    activeIndex = (activeIndex + step + activeItems.length) % activeItems.length;
    setLightboxItem(activeItems[activeIndex]);
    setHashForItem(activeItems[activeIndex]);
  }

  function openFromHash() {
    const id = hashItemId();

    if (!id) {
      return;
    }

    const item = getItemById(id);

    if (item) {
      openItem(item);
    }
  }

  function isTypingTarget(target) {
    return Boolean(target && target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function openRandomArtifact() {
    const pool = activeItems.length ? activeItems : allItems;

    if (!pool.length) {
      return;
    }

    const current = getCurrentItem();
    let candidates = pool;

    if (current && pool.length > 1) {
      candidates = pool.filter((item) => item.id !== current.id);
    }

    const weighted = candidates.map((item) => ({
      item,
      weight: Math.max(0, Number(item.curation && item.curation.randomWeight ? item.curation.randomWeight : 1))
    }));
    const totalWeight = weighted.reduce((total, entry) => total + entry.weight, 0);
    let item = candidates[Math.floor(Math.random() * candidates.length)];

    if (totalWeight > 0) {
      let cursor = Math.random() * totalWeight;
      const selected = weighted.find((entry) => {
        cursor -= entry.weight;
        return cursor <= 0;
      });
      item = selected ? selected.item : item;
    }

    openItem(item);
  }

  function consumeRandomParam() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has("random")) {
      return;
    }

    params.delete("random");
    const query = params.toString();
    history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }

  function bindCategoryLinks() {
    categoryLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (page.category !== "all" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        const href = link.getAttribute("href") || "";
        const category = link.dataset.categoryLink;
        const shouldStayOnGallery = href === ARCHIVE_PATH || href.startsWith(`${ARCHIVE_PATH}?category=`);

        if (!shouldStayOnGallery) {
          return;
        }

        event.preventDefault();
        const nextUrl = category === "all" ? ARCHIVE_PATH : `${ARCHIVE_PATH}?category=${encodeURIComponent(category)}`;
        history.replaceState(null, "", nextUrl);
        render(category);
      });
    });
  }

  if (gallery) {
    gallery.addEventListener("click", (event) => {
      const button = event.target.closest(".gallery__button");

      if (!button) {
        return;
      }

      if (button.tagName === "A") {
        return;
      }

      openLightbox(Number(button.dataset.index));
    });
  }

  lightboxCloseButtons.forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

  randomButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openRandomArtifact();
    });
  });

  if (artifactDetails) {
    artifactDetails.addEventListener("click", (event) => {
      const button = event.target.closest("[data-related-id]");

      if (!button) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      openItem(getItemById(button.dataset.relatedId));
    });
  }

  if (infoOpen) {
    infoOpen.addEventListener("click", openInfoPanel);
  }

  infoCloseButtons.forEach((button) => {
    button.addEventListener("click", closeInfoPanel);
  });

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => moveLightbox(-1));
  }

  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => moveLightbox(1));
  }

  document.addEventListener("keydown", (event) => {
    if ((event.key === "r" || event.key === "R") && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
      event.preventDefault();
      openRandomArtifact();
      return;
    }

    if (lightbox && !lightbox.hidden) {
      trapFocus(event, lightboxDialog);

      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        moveLightbox(-1);
      }

      if (event.key === "ArrowRight") {
        moveLightbox(1);
      }

      return;
    }

    if (infoDrawer && !infoDrawer.hidden && event.key === "Escape") {
      closeLightbox();
      closeInfoPanel();
    }

    if (infoDrawer && !infoDrawer.hidden) {
      trapFocus(event, infoPanel);
    }
  });

  renderCategoryNav();
  bindCategoryLinks();
  render(activeCategory);
  openFromHash();

  if (!window.location.hash && new URLSearchParams(window.location.search).has("random")) {
    openRandomArtifact();
    consumeRandomParam();
  }
}());
