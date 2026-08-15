(function () {
  "use strict";

  // ─── Interactive Results Table ───────────────────────────────────────────
  const resultsRoot = document.getElementById("benchmark-results");
  const controls = document.getElementById("benchmark-controls");
  const countLabel = document.getElementById("benchmark-result-count");
  const modelFilter = document.getElementById("filter-model");
  const skillFilter = document.getElementById("filter-skill");
  const classificationFilter = document.getElementById("filter-classification");
  const sortControl = document.getElementById("sort-results");

  const dimensionMeta = {
    skillFidelity: { label: "Skill fidelity", max: 25 },
    promptFidelity: { label: "Prompt fidelity", max: 25 },
    designQuality: { label: "Design quality", max: 20 },
    technicalQuality: { label: "Technical quality", max: 15 },
    responsiveQuality: { label: "Responsive quality", max: 10 },
    originality: { label: "Originality", max: 5 }
  };

  const state = { results: [] };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function labelSkill(value) {
    if (!value) return "Unmapped";
    return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function addOptions(select, values, labeler) {
    if (!select) return;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = labeler ? labeler(value) : value;
      select.append(option);
    });
  }

  function renderDimension(key, value) {
    const item = element("div", "benchmark-dimension");
    item.append(element("span", "", dimensionMeta[key].label));
    item.append(element("strong", "", value === null ? "N/A" : `${value}/${dimensionMeta[key].max}`));
    return item;
  }

  function renderResult(result, rank) {
    const details = element("details", "benchmark-result");
    const summary = document.createElement("summary");
    summary.append(element("span", "benchmark-result__rank", String(rank).padStart(2, "0")));
    summary.append(element("span", "benchmark-result__title", result.title));

    const meta = element("span", "benchmark-result__meta");
    meta.append(element("span", "", result.model));
    meta.append(element("span", "", labelSkill(result.skillId)));
    summary.append(meta);

    summary.append(element("span", "benchmark-result__class", result.provisional ? `${result.classification} · provisional` : result.classification));
    summary.append(element("strong", "benchmark-result__score", String(result.total)));
    summary.append(element("span", "benchmark-result__chevron", "+"));
    details.append(summary);

    const body = element("div", "benchmark-result__body");
    const dimensions = element("div", "benchmark-dimensions");
    Object.keys(dimensionMeta).forEach((key) => dimensions.append(renderDimension(key, result.dimensions[key])));
    body.append(dimensions);

    const review = element("div", "benchmark-result__review");
    review.append(element("h4", "", "Review note"));
    review.append(element("p", "", result.notes || "No review note recorded."));

    review.append(element("h4", "", "Violations"));
    if (result.violations && result.violations.length) {
      const list = document.createElement("ul");
      result.violations.forEach((violation) => list.append(element("li", "", violation)));
      review.append(list);
    } else {
      review.append(element("p", "", "No violations recorded."));
    }

    const actions = element("div", "benchmark-result__actions");
    const recordLink = element("a", "benchmark-action-btn benchmark-action-btn--primary", "Inspect Full Evidence Record & Frames \u2192");
    recordLink.href = `/benchmark/records/${result.id}.html`;
    const sourceLink = element("a", "benchmark-action-btn benchmark-action-btn--secondary", "Open Archived Source \u2197");
    sourceLink.href = `/benchmark/source/${result.id}.html`;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener";
    actions.append(recordLink);
    actions.append(sourceLink);
    review.append(actions);

    body.append(review);
    details.append(body);
    return details;
  }

  function render() {
    if (!resultsRoot || !modelFilter || !skillFilter || !classificationFilter || !sortControl || !countLabel) return;
    const model = modelFilter.value;
    const skill = skillFilter.value;
    const classification = classificationFilter.value;
    const sortKey = sortControl.value;

    const filtered = state.results.filter((result) => {
      return (model === "all" || result.model === model)
        && (skill === "all" || result.skillId === skill)
        && (classification === "all" || result.classification === classification);
    }).sort((a, b) => {
      const left = sortKey === "total" ? a.total : a.dimensions[sortKey];
      const right = sortKey === "total" ? b.total : b.dimensions[sortKey];
      if (left === null && right === null) return a.title.localeCompare(b.title);
      if (left === null) return 1;
      if (right === null) return -1;
      return right - left || a.title.localeCompare(b.title);
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach((result, index) => fragment.append(renderResult(result, index + 1)));
    resultsRoot.replaceChildren(fragment);
    resultsRoot.setAttribute("aria-busy", "false");
    countLabel.textContent = `${filtered.length} of ${state.results.length} records shown`;
  }

  function showError() {
    if (resultsRoot && countLabel) {
      resultsRoot.setAttribute("aria-busy", "false");
      resultsRoot.replaceChildren(element("p", "benchmark-data-error", "The baseline could not be loaded. The JSON and CSV downloads remain available below."));
      countLabel.textContent = "Baseline unavailable";
    }
  }

  if (controls) {
    controls.addEventListener("change", render);
    controls.addEventListener("reset", () => window.setTimeout(render, 0));
  }

  if (resultsRoot) {
    fetch("/operator-log/design-skill-benchmark/data/baseline.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data || !Array.isArray(data.results) || data.results.length !== 32) {
          throw new Error("Unexpected baseline shape");
        }
        state.results = data.results;
        addOptions(modelFilter, [...new Set(state.results.map((result) => result.model))].sort());
        addOptions(skillFilter, [...new Set(state.results.map((result) => result.skillId).filter(Boolean))].sort(), labelSkill);
        addOptions(classificationFilter, [...new Set(state.results.map((result) => result.classification))].sort());
        render();
      })
      .catch(showError);
  }

  // ─── Equation Inspector Progressive Enhancement ───────────────────────
  const equationLinks = document.querySelectorAll(".benchmark-equation__item");
  const drawer = document.getElementById("equation-drawer");
  const drawerEyebrow = document.getElementById("eq-drawer-eyebrow");
  const drawerClose = document.getElementById("eq-drawer-close");
  const drawerTitle = document.getElementById("eq-drawer-title");
  const drawerDesc = document.getElementById("eq-drawer-desc");
  const drawerMeta = document.getElementById("eq-drawer-meta");
  const drawerCta = document.getElementById("eq-drawer-cta");

  const equationData = {
    skills: {
      eyebrow: "EQUATION COMPONENT 01 / DESIGN SKILL",
      title: "Three Design Systems, Strict Rules",
      desc: "Three distinct design systems (Blueprint, Field Manual, and Solari) with strict typography, component rules, and negative constraints tested across all models.",
      stats: [
        { val: "Blueprint", label: "5 outputs · 91.3 avg" },
        { val: "Field Manual", label: "12 outputs · 90.9 avg" },
        { val: "Solari", label: "15 outputs · 89.2 avg" }
      ],
      href: "/benchmark/#skills",
      cta: "Inspect Design Skills in Benchmark Archive →"
    },
    prompts: {
      eyebrow: "EQUATION COMPONENT 02 / PROMPT CATALOG",
      title: "Eleven Domain Scenario Prompts",
      desc: "Dense real-world scenarios tested across models with required multi-column telemetry tables, scheduling matrices, and strict responsive layout requirements.",
      stats: [
        { val: "11 Scenarios", label: "Domain Prompts" },
        { val: "25 Pts", label: "Prompt Fidelity Max" },
        { val: "100%", label: "Stored in Dataset" }
      ],
      href: "/benchmark/#prompts",
      cta: "Inspect Test Prompts in Benchmark Archive →"
    },
    models: {
      eyebrow: "EQUATION COMPONENT 03 / EVALUATED MODELS",
      title: "Six Leading LLMs on the Test Bench",
      desc: "Six frontier models evaluated across 32 runs: Grok 4.6 (93.4), GPT-5.6 Sol (93.0), Gemini 3.7 Flash (90.4), MiMo V2.5 (84.6), Sonnet 4.6 Thinking (84.0), Kimi K2.6 (82.4).",
      stats: [
        { val: "6 Models", label: "Tested on Bench" },
        { val: "32 Runs", label: "Graded Outputs" },
        { val: "88.0", label: "Dataset Average" }
      ],
      href: "/benchmark/#models",
      cta: "Inspect Model Scoreboard in Benchmark Archive →"
    },
    records: {
      eyebrow: "EQUATION COMPONENT 04 / OUTPUT RECORDS",
      title: "Thirty-Two Generated Website Outputs",
      desc: "Thirty-two standalone HTML/CSS/JS websites evaluated across 6 viewports (375px to 1920px) to verify responsive scaling, technical quality, and design fidelity.",
      stats: [
        { val: "32 Builds", label: "Sanitized HTML" },
        { val: "6 Sizes", label: "375px to 1920px" },
        { val: "31 / 1", label: "Complete / Prov." }
      ],
      href: "/benchmark/#records",
      cta: "Browse All 32 Records in Archive →"
    },
    evidence: {
      eyebrow: "EQUATION COMPONENT 05 / EVIDENCE ARCHIVE",
      title: "100-Point Evaluation Rubric & Frames",
      desc: "Sixty-four high-resolution desktop and mobile review frames, 6-dimension scoring rubrics, violation logs, and raw JSON/CSV downloads.",
      stats: [
        { val: "64 Frames", label: "Desktop & Mobile" },
        { val: "6 Dim.", label: "100-Pt Rubric" },
        { val: "JSON / CSV", label: "Direct Downloads" }
      ],
      href: "/benchmark/#methodology",
      cta: "Inspect Evidence & Rubric in Archive →"
    }
  };

  if (equationLinks.length && drawer && drawerClose && drawerTitle && drawerDesc && drawerMeta && drawerCta) {
    function showEquationDetail(key, preventScroll) {
      const data = equationData[key];
      if (!data) return;

      equationLinks.forEach((link) => {
        const isSelected = link.dataset.eq === key;
        link.classList.toggle("is-active", isSelected);
        link.setAttribute("aria-expanded", String(isSelected));
      });

      drawerEyebrow.textContent = data.eyebrow;
      drawerTitle.textContent = data.title;
      drawerDesc.textContent = data.desc;
      drawerCta.href = data.href;
      drawerCta.textContent = data.cta;

      drawerMeta.replaceChildren(
        ...data.stats.map((stat) => {
          const item = document.createElement("div");
          item.className = "benchmark-drawer-stat";
          const val = document.createElement("strong");
          val.textContent = stat.val;
          const label = document.createElement("span");
          label.textContent = stat.label;
          item.append(val, label);
          return item;
        })
      );

      drawer.hidden = false;
      if (!preventScroll) {
        drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    equationLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        // Progressive enhancement: if user clicks on desktop/tablet, expand drawer
        // Allow ctrl/cmd+click to open full link in new tab
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          const target = link.dataset.eq;
          if (link.classList.contains("is-active") && !drawer.hidden) {
            drawer.hidden = true;
            link.classList.remove("is-active");
            link.setAttribute("aria-expanded", "false");
          } else {
            showEquationDetail(target);
          }
        }
      });
    });

    drawerClose.addEventListener("click", () => {
      drawer.hidden = true;
      equationLinks.forEach((l) => {
        l.classList.remove("is-active");
        l.setAttribute("aria-expanded", "false");
      });
    });
  }
})();
