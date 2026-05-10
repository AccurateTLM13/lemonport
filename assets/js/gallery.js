(function () {
  const page = window.galleryPage || { category: "all", title: "All Work" };
  const allItems = Array.isArray(window.galleryItems) ? window.galleryItems : [];
  const gallery = document.querySelector("[data-gallery]");
  const categoryLinks = Array.from(document.querySelectorAll("[data-category-link]"));
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  const lightboxCloseButtons = Array.from(document.querySelectorAll("[data-lightbox-close]"));
  const lightboxPrev = document.querySelector("[data-lightbox-prev]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");

  let activeCategory = page.category || "all";
  let activeItems = [];
  let activeIndex = 0;
  let lastFocusedElement = null;

  function shuffled(items) {
    const shuffledItems = items.slice();

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
    }

    return shuffledItems;
  }

  const shuffledItems = shuffled(allItems);

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

  function srcsetFor(item) {
    return [
      `${item.sizes.small} 480w`,
      `${item.sizes.medium} 960w`,
      `${item.sizes.large} 1600w`
    ].join(", ");
  }

  function itemsFor(category) {
    if (category === "all") {
      return shuffledItems;
    }

    return shuffledItems.filter((item) => item.category === category);
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
      img.className = "gallery__image";
      img.src = item.sizes.medium;
      img.srcset = srcsetFor(item);
      img.sizes = "(max-width: 760px) 100vw, calc((100vw - 260px) / 3)";
      img.alt = item.alt;
      img.width = item.width;
      img.height = item.height;
      img.decoding = "async";

      if (index < 3) {
        img.fetchPriority = "high";
      } else {
        img.loading = "lazy";
      }

      img.addEventListener("error", () => {
        img.removeAttribute("srcset");
        img.src = placeholderSvg(item);
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
    lightboxImage.removeAttribute("srcset");
    lightboxImage.src = item.sizes.large;
    lightboxImage.alt = item.alt;
    lightboxImage.width = item.width;
    lightboxImage.height = item.height;
    lightboxCaption.textContent = `${item.title} / ${item.categoryLabel}`;

    lightboxImage.onerror = () => {
      lightboxImage.onerror = null;
      lightboxImage.src = placeholderSvg(item);
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

  if (page.category === "all") {
    categoryLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        event.preventDefault();
        render(link.dataset.categoryLink);
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

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => moveLightbox(-1));
  }

  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => moveLightbox(1));
  }

  document.addEventListener("keydown", (event) => {
    if (!lightbox || lightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    }

    if (event.key === "ArrowRight") {
      moveLightbox(1);
    }
  });

  render(activeCategory);
  openFromHash();
}());
