(function () {
  const page = window.galleryPage || { category: "all", title: "All Work" };
  const allItems = Array.isArray(window.galleryItems) ? window.galleryItems : [];
  const allCategories = Array.isArray(window.galleryCategories) ? window.galleryCategories : [];
  const gallery = document.querySelector("[data-gallery]");
  const categoryNav = document.querySelector(".category-nav");
  let categoryLinks = Array.from(document.querySelectorAll("[data-category-link]"));
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
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
    const label = escapeHtml(item.categoryLabel);
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

    const source = item.sizes.large || item.sizes.medium || item.sizes.small;
    const intrinsicWidth = item.width || 1600;
    const widths = [320, 480, 640, 768, 900, 1024, 1600];
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
    const fallback = item.sizes.large || item.sizes.medium || item.sizes.small;
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
    allLink.href = "/";
    allLink.dataset.categoryLink = "all";
    allLink.textContent = "All";
    categoryNav.append(allLink);

    allCategories.forEach((category) => {
      const link = document.createElement("a");
      link.className = "category-link";
      link.href = category.path || `/?category=${encodeURIComponent(category.slug)}`;
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

    return shuffled(allItems.filter((item) => item.category === category), true);
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

      const button = document.createElement("button");
      button.className = "gallery__button";
      button.type = "button";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", `Open ${item.title}`);

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
      caption.textContent = `${item.title} / ${item.categoryLabel}`;

      const screenReaderCaption = document.createElement("figcaption");
      screenReaderCaption.className = "visually-hidden";
      screenReaderCaption.textContent = `${item.title} / ${item.categoryLabel}`;

      frame.append(img, caption);
      button.append(frame);
      figure.append(button, screenReaderCaption);
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
    lightboxCaption.textContent = `${item.title} / ${item.categoryLabel}`;

    lightboxImage.onerror = () => {
      lightboxImage.onerror = null;
      lightboxImage.src = sources.fallback || placeholderSvg(item);
    };
  }

  function openLightbox(index) {
    if (!lightbox || !activeItems[index]) {
      return;
    }

    activeIndex = index;
    lastFocusedElement = document.activeElement;
    setLightboxImage(activeItems[activeIndex]);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightbox.querySelector(".lightbox__button--close").focus();
    history.replaceState(null, "", `#${activeItems[activeIndex].id}`);
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
    setLightboxImage(activeItems[activeIndex]);
    history.replaceState(null, "", `#${activeItems[activeIndex].id}`);
  }

  function openFromHash() {
    const id = window.location.hash.slice(1);

    if (!id) {
      return;
    }

    const index = activeItems.findIndex((item) => item.id === id);

    if (index >= 0) {
      openLightbox(index);
    }
  }

  function bindCategoryLinks() {
    categoryLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (page.category !== "all" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        event.preventDefault();
        const category = link.dataset.categoryLink;
        const nextUrl = category === "all" ? "/" : `/?category=${encodeURIComponent(category)}`;
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

      openLightbox(Number(button.dataset.index));
    });
  }

  lightboxCloseButtons.forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

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
}());
