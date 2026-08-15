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
    const head = document.createElement("thead"); 
    const headRow = document.createElement("tr");
    headers.forEach((text) => { const cell = document.createElement("th"); cell.textContent = text; headRow.append(cell); });
    head.append(headRow); 
    element.append(head);
    const body = document.createElement("tbody");
    rows.forEach((row) => { 
      const tr = document.createElement("tr"); 
      row.forEach((text) => { const cell = document.createElement("td"); cell.textContent = text; tr.append(cell); }); 
      body.append(tr); 
    });
    element.append(body); 
    return element;
  };

  const activate = (name) => {
    if (!panels[name]) return;
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (panels[tab.dataset.tab]) {
        panels[tab.dataset.tab].hidden = !active;
      }
    });
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab.dataset.tab)));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  close.addEventListener("click", () => dialog.close());

  const populateData = async () => {
    if (dialog.dataset.ready) return;
    try {
      const baseline = await fetch("data/baseline.json").then((r) => r.json());
      panels.results.replaceChildren(table(["Title", "Model", "Skill", "Score", "Class"], baseline.results.map((r) => [r.title, r.model, label(r.skillId), String(r.total), r.classification + (r.provisional ? " · provisional" : "")] )));
      panels.models.replaceChildren(table(["Model", "Outputs", "Overall", "Responsive", "Design"], baseline.aggregates.models.map((r) => [r.name, String(r.count), String(r.overall), String(r.dimensions.responsiveQuality) + " / 10", String(r.dimensions.designQuality) + " / 20"])));
      panels.skills.replaceChildren(table(["Skill", "Outputs", "Overall", "Skill fidelity", "Prompt fidelity"], baseline.aggregates.skills.map((r) => [label(r.name), String(r.count), String(r.overall), String(r.dimensions.skillFidelity) + " / 25", String(r.dimensions.promptFidelity) + " / 25"])));
      
      if (panels.prompts) {
        const promptRows = [
          ["RELAY — AI Agent Deployment", "Field Manual", "4", "25 / 25 prompt fidelity avg"],
          ["Municipal Trail Operations", "Field Manual", "3", "25 / 25 prompt fidelity avg"],
          ["Northstar Observatory", "Field Manual", "3", "25 / 25 prompt fidelity avg"],
          ["Municipal League Baseball", "Solari", "6", "24.5 / 25 prompt fidelity avg"],
          ["Terminal 17 Freight Exchange", "Solari", "4", "25 / 25 prompt fidelity avg"],
          ["Night Shift 91.3 FM", "Solari", "3", "24.8 / 25 prompt fidelity avg"],
          ["ATLAS Distributed Intelligence", "Blueprint", "3", "25 / 25 prompt fidelity avg"],
          ["Halloway Instruments HX-4", "Field Manual", "2", "24.0 / 25 prompt fidelity avg"],
          ["Aeroline R7 Platform", "Blueprint", "1", "25 / 25 prompt fidelity avg"],
          ["Northline Waterworks", "Blueprint", "1", "25 / 25 prompt fidelity avg"],
          ["Analog Cinema Club", "Solari", "2", "23.5 / 25 prompt fidelity avg"]
        ];
        panels.prompts.replaceChildren(table(["Prompt Scenario", "Design Skill", "Runs", "Benchmark Notes"], promptRows));
      }

      if (panels.methodology) {
        const rubricRows = [
          ["01. Skill Fidelity", "25", "Visual language, typography, component rules, prohibitions"],
          ["02. Prompt Fidelity", "25", "Explicit requirement coverage and scenario data points"],
          ["03. Design Quality", "20", "Hierarchy, spacing, readability, rhythm, composition"],
          ["04. Technical Quality", "15", "Semantics, asset health, clean runtime state, weight"],
          ["05. Responsive Quality", "10", "Tested at 375, 430, 768, 1024, 1440, 1920 pixels"],
          ["06. Originality", "5", "Deliberate design feel vs generic template pattern"]
        ];
        panels.methodology.replaceChildren(table(["Dimension", "Max Pts", "Scoring Criteria"], rubricRows));
      }

      dialog.dataset.ready = "true";
    } catch (error) {
      panels.results.textContent = "The data snapshot could not be loaded. The direct downloads remain available.";
    }
  };

  open.addEventListener("click", async () => {
    dialog.showModal();
    close.focus();
    await populateData();
  });

  // Handle URL parameters or hash on load
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get("tab") || urlParams.get("view");
  if (tabParam && panels[tabParam]) {
    populateData().then(() => {
      dialog.showModal();
      activate(tabParam);
    });
  }
})();
