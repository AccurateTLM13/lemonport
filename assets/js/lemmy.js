(function () {
  "use strict";

  function initLemmy() {
    const data = window.LEMMY_DATA;
    let trigger = document.querySelector(".lemmy-trigger");
    const zone = document.body.dataset.lemmyZone || "";

    if (!data || !data.character || !data.zones || !zone) {
      return;
    }

    const zoneConfig = data.zones[zone];
    if (!zoneConfig || zoneConfig.enabled !== true) {
      return;
    }

    if (!trigger) {
      // Allow pages to suppress the floating trigger (e.g. Studio Lab which uses an inline host station)
      if (document.body.dataset.lemmySuppressTrigger === "1") {
        // Still wire up the panel but don't inject the page trigger
        trigger = null;
      } else {
        trigger = document.createElement("button");
        trigger.className = "lemmy-trigger lemmy-page-trigger";
        trigger.type = "button";
        trigger.setAttribute("aria-label", "Open Lemmy, the Lemonteed groundskeeper");
        trigger.setAttribute("aria-expanded", "false");
        trigger.innerHTML = '<img src="" alt="" aria-hidden="true" width="220" height="220">';
        document.body.append(trigger);
      }
    }

    const panel = document.createElement("section");
    panel.className = "lemmy-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "lemmy-panel-title");
    panel.innerHTML = [
      '<div class="lemmy-panel__header">',
      '  <div>',
      '    <p class="lemmy-panel__eyebrow">LEMONTEED GROUNDSKEEPER</p>',
      '    <h2 id="lemmy-panel-title"></h2>',
      "  </div>",
      '  <button class="lemmy-panel__close" type="button" aria-label="Close Lemmy">×</button>',
      "</div>",
      '  <p class="lemmy-panel__message" role="status"></p>',
      '  <nav class="lemmy-panel__destinations" aria-label="Lemmy destinations"></nav>',
      '  <button class="lemmy-panel__minimize" type="button">Minimize Lemmy</button>'
    ].join("\n");
    const panelMount = document.querySelector(".lemon-world") || document.body;
    panelMount.append(panel);

    const title = panel.querySelector("#lemmy-panel-title");
    const message = panel.querySelector(".lemmy-panel__message");
    const destinations = panel.querySelector(".lemmy-panel__destinations");
    const closeButton = panel.querySelector(".lemmy-panel__close");
    const minimizeButton = panel.querySelector(".lemmy-panel__minimize");
    const storageKey = data.preferences && data.preferences.storageKey;
    const stateAssets = data.character.stateAssets || {};
    const triggerImage = trigger ? trigger.querySelector("img") : null;
    let lastFocus = trigger;
    let lastReactionAt = 0;
    let reactionResetTimer = 0;

    title.textContent = data.character.name;
    message.textContent = zoneConfig.messages[0];
    if (trigger) {
      trigger.removeAttribute("aria-hidden");
      trigger.setAttribute("aria-expanded", "false");
    }

    function setVisualState(state) {
      const asset = stateAssets[state] || data.character.defaultAsset;
      if (!triggerImage || !asset) {
        return;
      }
      triggerImage.src = asset;
      triggerImage.dataset.lemmyState = state;
    }

    function resetReaction() {
      if (reactionResetTimer) {
        window.clearTimeout(reactionResetTimer);
        reactionResetTimer = 0;
      }
      delete message.dataset.lemmyReaction;
      message.textContent = zoneConfig.messages[0];
      setVisualState("idle");
    }

    function scheduleReactionReset() {
      if (reactionResetTimer) {
        window.clearTimeout(reactionResetTimer);
      }
      reactionResetTimer = window.setTimeout(() => {
        reactionResetTimer = 0;
        if (!document.hidden) {
          resetReaction();
        }
      }, 2200);
    }

    function readPreferences() {
      if (!storageKey) {
        return {};
      }

      try {
        const value = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
      } catch (error) {
        return {};
      }
    }

    function writePreferences(preferences) {
      if (!storageKey) {
        return;
      }

      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ minimized: preferences.minimized === true }));
      } catch (error) {
        // Local preferences are optional and must never block the guide.
      }
    }

    function destinationForId(destinationId) {
      return data.destinations.find((destination) => destination.id === destinationId);
    }

    function chooseHref(destination) {
      const hrefs = destination && Array.isArray(destination.hrefs) ? destination.hrefs : [];
      if (!hrefs.length) {
        return "#";
      }
      return hrefs[Math.floor(Math.random() * hrefs.length)];
    }

    zoneConfig.destinationIds.forEach((destinationId) => {
      const destination = destinationForId(destinationId);
      if (!destination) {
        return;
      }

      const link = document.createElement("a");
      link.className = "lemmy-panel__destination";
      link.href = chooseHref(destination);
      link.textContent = destination.label;
      destinations.append(link);
    });

    function closePanel({ restoreFocus = true } = {}) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      setVisualState("idle");
      if (restoreFocus && lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }

    function openPanel() {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      const openingState = zoneConfig.states.includes("wave") ? "wave" : (zoneConfig.states[0] || "idle");
      setVisualState(openingState);
      closeButton.focus();
    }

    function setMinimized() {
      writePreferences({ minimized: true });
      closePanel();
    }

    if (trigger) trigger.addEventListener("click", openPanel);
    if (closeButton) closeButton.addEventListener("click", () => closePanel());
    if (minimizeButton) minimizeButton.addEventListener("click", setMinimized);
    Object.entries(zoneConfig.reactions || {}).forEach(([eventName, reaction]) => {
      document.addEventListener(eventName, () => {
        const now = Date.now();
        const cooldownMs = data.preferences && data.preferences.dialogueCooldownMs;
        if (cooldownMs && now - lastReactionAt < cooldownMs) {
          return;
        }
        lastReactionAt = now;
        message.dataset.lemmyReaction = "true";
        message.textContent = reaction.message;
        setVisualState(zoneConfig.states.includes(reaction.state) ? reaction.state : "idle");
        scheduleReactionReset();
      });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && reactionResetTimer) {
        window.clearTimeout(reactionResetTimer);
        reactionResetTimer = 0;
      } else if (!document.hidden && message.dataset.lemmyReaction) {
        resetReaction();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        closePanel();
      }
    });

    if (readPreferences().minimized === true) {
      panel.hidden = true;
    }

    setVisualState("idle");
  }

  document.addEventListener("DOMContentLoaded", initLemmy);
}());
