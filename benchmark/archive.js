(() => {
  const dialog = document.querySelector(".data-viewer");
  const open = document.querySelector("[data-open-viewer]");
  if (!dialog || !open) return;
  const close = dialog.querySelector("[data-close-viewer]");
  const panels = Object.fromEntries([...dialog.querySelectorAll("[data-panel]")].map((node) => [node.dataset.panel, node]));
  const tabs = [...dialog.querySelectorAll("[data-tab]")];
  const label = (value) => String(value || "Unmapped").split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
  const table = (headers, rows) => {
    const element = document.createElement("table");
    const head = document.createElement("thead"); const headRow = document.createElement("tr");
    headers.forEach((text) => { const cell = document.createElement("th"); cell.textContent = text; headRow.append(cell); });
    head.append(headRow); element.append(head);
    const body = document.createElement("tbody");
    rows.forEach((row) => { const tr = document.createElement("tr"); row.forEach((text) => { const cell = document.createElement("td"); cell.textContent = text; tr.append(cell); }); body.append(tr); });
    element.append(body); return element;
  };
  const activate = (name) => { tabs.forEach((tab) => { const active = tab.dataset.tab === name; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; panels[tab.dataset.tab].hidden = !active; }); };
  tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab.dataset.tab)));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  close.addEventListener("click", () => dialog.close());
  open.addEventListener("click", async () => {
    dialog.showModal(); close.focus();
    if (dialog.dataset.ready) return;
    try {
      const baseline = await fetch("data/baseline.json").then((r) => r.json());
      panels.results.append(table(["Title", "Model", "Skill", "Score", "Class"], baseline.results.map((r) => [r.title, r.model, label(r.skillId), String(r.total), r.classification + (r.provisional ? " · provisional" : "")] )));
      panels.models.append(table(["Model", "Outputs", "Overall", "Responsive", "Design"], baseline.aggregates.models.map((r) => [r.name, String(r.count), String(r.overall), String(r.dimensions.responsiveQuality) + " / 10", String(r.dimensions.designQuality) + " / 20"])));
      panels.skills.append(table(["Skill", "Outputs", "Overall", "Skill fidelity", "Prompt fidelity"], baseline.aggregates.skills.map((r) => [label(r.name), String(r.count), String(r.overall), String(r.dimensions.skillFidelity) + " / 25", String(r.dimensions.promptFidelity) + " / 25"])));
      dialog.dataset.ready = "true";
    } catch (error) { panels.results.textContent = "The data snapshot could not be loaded. The direct downloads remain available."; }
  });
})();
