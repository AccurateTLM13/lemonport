(function () {
  const popupImage = "/images/TLM13TEED.webp";
  const defaultMessage = "This page or feature is coming soon. Follow along with me on X.com/accuratetlm13 for updates and what I am doing with this experiment.";

  let popup = null;
  let messageElement = null;

  function createPopup() {
    if (popup) {
      return popup;
    }

    popup = document.createElement("div");
    popup.className = "coming-soon-popup";
    popup.hidden = true;
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("aria-labelledby", "coming-soon-title");

    const card = document.createElement("div");
    card.className = "coming-soon-popup__card";

    const image = document.createElement("img");
    image.className = "coming-soon-popup__image";
    image.src = popupImage;
    image.width = 260;
    image.height = 325;
    image.alt = "Lemonteed lemon person";

    const body = document.createElement("div");
    body.className = "coming-soon-popup__body";

    const close = document.createElement("button");
    close.className = "coming-soon-popup__close";
    close.type = "button";
    close.setAttribute("aria-label", "Close coming soon note");
    close.textContent = "x";

    const logo = document.createElement("img");
    logo.className = "coming-soon-popup__logo";
    logo.src = "/images/lemonteedlogo-250.webp";
    logo.srcset = "/images/lemonteedlogo-250.webp 250w, /images/lemonteedlogo-456.webp 456w";
    logo.sizes = "(max-width: 700px) 210px, 250px";
    logo.width = 456;
    logo.height = 96;
    logo.alt = "Lemonteed";

    const title = document.createElement("h2");
    title.id = "coming-soon-title";
    title.textContent = "COMING SOON";

    messageElement = document.createElement("p");
    messageElement.className = "coming-soon-popup__copy";

    body.append(close, logo, title, messageElement);
    card.append(image, body);
    popup.append(card);
    document.body.append(popup);

    close.addEventListener("click", hidePopup);
    popup.addEventListener("click", (event) => {
      if (event.target === popup) {
        hidePopup();
      }
    });

    return popup;
  }

  function setMessage(message) {
    const text = message || defaultMessage;
    const linkText = "X.com/accuratetlm13";
    const linkIndex = text.indexOf(linkText);

    messageElement.textContent = "";

    if (linkIndex < 0) {
      messageElement.textContent = text;
      return;
    }

    messageElement.append(document.createTextNode(text.slice(0, linkIndex)));

    const link = document.createElement("a");
    link.href = "https://x.com/accuratetlm13";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.dataset.comingSoonIgnore = "true";
    link.textContent = linkText;
    messageElement.append(link);
    messageElement.append(document.createTextNode(text.slice(linkIndex + linkText.length)));
  }

  function showPopup(message) {
    createPopup();
    setMessage(message);
    popup.hidden = false;
    popup.querySelector(".coming-soon-popup__close").focus();
  }

  function hidePopup() {
    if (popup) {
      popup.hidden = true;
    }
  }

  function shouldIgnore(target) {
    return Boolean(target.closest(".coming-soon-popup, .skip-link, [data-coming-soon-ignore]"));
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("a, button, [data-coming-soon]");

    if (!target || shouldIgnore(target)) {
      return;
    }

    const scopedTrigger = target.closest("[data-coming-soon-scope] a, [data-coming-soon-scope] button");
    const directTrigger = target.closest("[data-coming-soon]");
    const trigger = directTrigger || scopedTrigger;

    if (!trigger) {
      return;
    }

    const scope = trigger.closest("[data-coming-soon-scope]");
    const message = trigger.dataset.comingSoonMessage || (scope && scope.dataset.comingSoonMessage) || defaultMessage;

    event.preventDefault();
    showPopup(message);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hidePopup();
    }
  });
}());
