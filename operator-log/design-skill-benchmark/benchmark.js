(function () {
  "use strict";

  const resultsRoot = document.getElementById("benchmark-results");
  const controls = document.getElementById("benchmark-controls");
  const countLabel = document.getElementById("benchmark-result-count");
  const modelFilter = document.getElementById("filter-model");
  const skillFilter = document.getElementById("filter-skill");
  const classificationFilter = document.getElementById("filter-classification");
  const sortControl = document.getElementById("sort-results");

  if (!resultsRoot || !controls || !countLabel || !modelFilter || !skillFilter || !classificationFilter || !sortControl) {
    return;
  }

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
    resultsRoot.setAttribute("aria-busy", "false");
    resultsRoot.replaceChildren(element("p", "benchmark-data-error", "The baseline could not be loaded. The JSON and CSV downloads remain available below."));
    countLabel.textContent = "Baseline unavailable";
  }

  controls.addEventListener("change", render);
  controls.addEventListener("reset", () => window.setTimeout(render, 0));

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
})();
