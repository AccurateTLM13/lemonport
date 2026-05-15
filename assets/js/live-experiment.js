(function () {
  const data = window.liveExperimentData;

  if (!data || typeof data !== "object") {
    return;
  }

  function text(selector, value) {
    const element = document.querySelector(selector);

    if (element && value != null) {
      element.textContent = String(value);
    }
  }

  function linkButton(button, config) {
    if (!button || !config) {
      return;
    }

    button.href = config.href || "#";
    button.textContent = config.label || "";
  }

  function iconSvg(type) {
    const icons = {
      clipboard: '<svg viewBox="0 0 36 36" focusable="false"><path d="M13 7h10m-8-3h6l1 4h-8z"/><path d="M10 8h16v23H10z"/><path d="M14 15h8m-8 5h8m-8 5h6"/></svg>',
      vote: '<svg viewBox="0 0 36 36" focusable="false"><path d="M9 15h18v16H9z"/><path d="M13 15l3-8h12l-3 8"/><path d="M16 23l3 3 6-7"/><path d="M13 12h10"/></svg>',
      eye: '<svg viewBox="0 0 36 36" focusable="false"><path d="M4 18s5-8 14-8 14 8 14 8-5 8-14 8S4 18 4 18z"/><circle cx="18" cy="18" r="4"/><path d="M18 14v8"/></svg>'
    };

    return icons[type] || icons.clipboard;
  }

  function renderHero() {
    const hero = data.hero || {};
    const title = document.querySelector("#experiment-title");
    const actions = document.querySelector(".experiment-actions");
    const metadata = document.querySelector(".metadata-strip");

    text(".experiment-kicker", hero.kicker);
    text(".experiment-subhead", hero.subheadline);
    text(".experiment-intro", hero.intro);

    if (title && hero.headline) {
      title.innerHTML = "";
      String(hero.headline).split("\n").forEach((line, index) => {
        if (index) {
          title.append(document.createElement("br"));
        }
        title.append(document.createTextNode(line));
      });
    }

    if (actions && Array.isArray(hero.actions)) {
      actions.textContent = "";
      hero.actions.forEach((item) => {
        const anchor = document.createElement("a");
        anchor.className = "experiment-button";
        anchor.href = item.href || "#";

        if (item.icon) {
          const icon = document.createElement("span");
          icon.setAttribute("aria-hidden", "true");
          icon.textContent = item.icon;
          anchor.append(icon);
        }

        anchor.append(document.createTextNode(item.label || ""));
        actions.append(anchor);
      });
    }

    if (metadata && Array.isArray(hero.metadata)) {
      metadata.textContent = "";
      hero.metadata.forEach((item, index) => {
        if (index === 1) {
          const span = document.createElement("span");
          span.textContent = item;
          metadata.append(span);
          return;
        }

        if (index === 2) {
          const pieces = String(item).split(":");
          metadata.append(document.createTextNode(`${pieces[0]}: `));
          const mark = document.createElement("mark");
          mark.textContent = pieces.slice(1).join(":").trim() || item;
          metadata.append(mark);
          return;
        }

        metadata.append(document.createTextNode(item));
      });
    }
  }

  function renderLedger() {
    const ledger = data.ledger || {};
    const rows = document.querySelector(".ledger-list");
    const foot = document.querySelector(".ledger-foot");

    text(".ledger-head h2", ledger.title);
    text(".ledger-head span", ledger.report);

    if (rows && Array.isArray(ledger.rows)) {
      rows.textContent = "";
      ledger.rows.forEach((row) => {
        const wrapper = document.createElement("div");
        const label = document.createElement("dt");
        const value = document.createElement("dd");
        label.textContent = row.label || "";
        value.textContent = row.value || "";
        if (row.tone === "status") {
          value.className = "ledger-status";
        }
        wrapper.append(label, value);
        rows.append(wrapper);
      });
    }

    if (foot) {
      foot.textContent = "";
      const left = document.createElement("p");
      left.innerHTML = (ledger.footerLeft || []).map((item) => String(item)).join("<br>");
      const brand = document.createElement("strong");
      brand.textContent = ledger.footerBrand || "Lemonteed";
      const right = document.createElement("p");
      right.innerHTML = (ledger.footerRight || []).map((item) => String(item)).join("<br>");
      foot.append(left, brand, right);
    }
  }

  function renderBuildLog() {
    const buildLog = data.buildLog || {};
    const list = document.querySelector(".build-log-list");
    const button = document.querySelector(".build-log-panel .panel-button");

    text("#build-log-title", buildLog.title || "Build Log");

    const title = document.querySelector("#build-log-title");
    if (title && buildLog.label) {
      const span = document.createElement("span");
      span.textContent = `(${buildLog.label})`;
      title.append(document.createTextNode(" "));
      title.append(span);
    }

    text(".build-log-panel .panel-head p", buildLog.entriesLabel);

    if (list && Array.isArray(buildLog.entries)) {
      list.textContent = "";
      buildLog.entries.forEach((entry) => {
        const item = document.createElement("li");
        const number = document.createElement("span");
        const body = document.createElement("div");
        const heading = document.createElement("h3");
        const copy = document.createElement("p");
        const time = document.createElement("time");

        number.className = "entry-number";
        number.textContent = entry.number || "";
        heading.textContent = entry.title || "";
        copy.textContent = entry.copy || "";
        time.dateTime = entry.datetime || "";
        time.textContent = entry.date || "";

        body.append(heading, copy);
        item.append(number, body, time);
        list.append(item);
      });
    }

    linkButton(button, buildLog.button);
  }

  function renderCurrentBet() {
    const currentBet = data.currentBet || {};
    const panel = document.querySelector(".current-bet-panel");
    const button = document.querySelector(".current-bet-panel .panel-button");

    text("#current-bet-title", currentBet.eyebrow);
    text(".current-bet-layout h3", currentBet.title);
    text(".current-bet-layout p", currentBet.copy);
    linkButton(button, currentBet.button);

    if (panel && currentBet.art) {
      panel.style.setProperty("--current-bet-art", `url("${currentBet.art}")`);
    }
  }

  function renderGetInvolved() {
    const involved = data.getInvolved || {};
    const list = document.querySelector(".involved-list");
    const button = document.querySelector(".involved-panel .panel-button");

    text("#get-involved-title", involved.title);
    text(".involved-panel .panel-head p", involved.meta);
    text(".panel-note", involved.note);
    linkButton(button, involved.button);

    if (list && Array.isArray(involved.items)) {
      list.textContent = "";
      involved.items.forEach((entry) => {
        const item = document.createElement("li");
        const icon = document.createElement("span");
        const body = document.createElement("div");
        const heading = document.createElement("h3");
        const copy = document.createElement("p");
        const anchor = document.createElement("a");

        icon.className = `involved-icon involved-icon--${entry.icon || "clipboard"}`;
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = iconSvg(entry.icon);
        heading.textContent = entry.title || "";
        copy.textContent = entry.copy || "";
        anchor.href = entry.href || "#";
        anchor.setAttribute("aria-label", entry.label || entry.title || "Open");
        anchor.textContent = "->";

        body.append(heading, copy);
        item.append(icon, body, anchor);
        list.append(item);
      });
    }
  }

  function renderStatusStrip() {
    const strip = document.querySelector(".experiment-status-strip");

    if (!strip || !Array.isArray(data.statusStrip)) {
      return;
    }

    strip.textContent = "";
    data.statusStrip.forEach((item) => {
      const span = document.createElement("span");
      const parts = String(item).split(":");

      if (parts.length > 1 && parts[0].trim().toLowerCase() === "status") {
        span.append(document.createTextNode(`${parts[0]}: `));
        const strong = document.createElement("strong");
        strong.textContent = parts.slice(1).join(":").trim();
        span.append(strong);
      } else {
        span.textContent = item;
      }

      strip.append(span);
    });
  }

  function renderAssets() {
    const mascot = document.querySelector(".live-mascot");

    if (mascot && data.assets && data.assets.mascot) {
      mascot.src = data.assets.mascot;
    }
  }

  renderHero();
  renderLedger();
  renderBuildLog();
  renderCurrentBet();
  renderGetInvolved();
  renderStatusStrip();
  renderAssets();
}());
