(function () {
  const form = document.querySelector("[data-project-form]");
  const categoryForm = document.querySelector("[data-category-form]");
  const categorySelect = document.querySelector("[data-category-select]");
  const list = document.querySelector("[data-project-list]");
  const status = document.querySelector("[data-status]");
  const count = document.querySelector("[data-count]");
  const fileInput = document.querySelector("[data-file-input]");
  const pendingList = document.querySelector("[data-pending-list]");
  const editLayer = document.querySelector("[data-edit-layer]");
  const editDrawer = document.querySelector("[data-edit-drawer]");
  const exportButton = document.querySelector("[data-export]");
  const importButton = document.querySelector("[data-import]");
  const validateButton = document.querySelector("[data-validate]");
  const mediaHealthButton = document.querySelector("[data-media-health]");
  const buildReportButton = document.querySelector("[data-build-report]");
  const importFile = document.querySelector("[data-import-file]");
  const importMode = document.querySelector("[data-import-mode]");
  const exportCsvButton = document.querySelector("[data-export-csv]");
  const importCsvButton = document.querySelector("[data-import-csv]");
  const importCsvFile = document.querySelector("[data-import-csv-file]");
  const validationPanel = document.querySelector("[data-validation-panel]");
  const searchInput = document.querySelector("[data-search]");
  const statusFilter = document.querySelector("[data-status-filter]");
  const archiveCategoryFilter = document.querySelector("[data-category-filter]");
  const groupFilter = document.querySelector("[data-group-filter]");
  const metadataList = document.querySelector("[data-metadata-list]");
  const metadataSearchInput = document.querySelector("[data-metadata-search]");
  const metadataStatusFilter = document.querySelector("[data-metadata-status-filter]");
  const metadataCategoryFilter = document.querySelector("[data-metadata-category-filter]");
  const metadataGroupFilter = document.querySelector("[data-metadata-group-filter]");
  const metadataSort = document.querySelector("[data-metadata-sort]");
  const missingFilterButtons = Array.from(document.querySelectorAll("[data-missing-filter]"));
  const healthDashboard = document.querySelector("[data-health-dashboard]");
  const relationsBoard = document.querySelector("[data-relations-board]");
  const gameManager = document.querySelector("[data-game-manager]");
  const liveEditorForm = document.querySelector("[data-live-editor-form]");
  const liveEditorFields = document.querySelector("[data-live-editor-fields]");
  const liveEditorJson = document.querySelector("[data-live-editor-json]");
  const liveEditorReload = document.querySelector("[data-live-editor-reload]");
  const liveEditorSync = document.querySelector("[data-live-editor-sync]");
  const livePreview = document.querySelector("[data-live-preview]");
  const buildReportPanel = document.querySelector("[data-build-report-panel]");
  const tagManager = document.querySelector("[data-tag-manager]");
  const seriesManager = document.querySelector("[data-series-manager]");
  const bulkForm = document.querySelector("[data-bulk-form]");
  const bulkCategory = document.querySelector("[data-bulk-category]");
  const selectedCount = document.querySelector("[data-selected-count]");
  const clearSelectionButton = document.querySelector("[data-clear-selection]");
  const exportSelectedButton = document.querySelector("[data-export-selected]");
  const regenerateSelectedButton = document.querySelector("[data-regenerate-selected]");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const viewButtons = Array.from(document.querySelectorAll("[data-view]"));
  const workspaceButtons = Array.from(document.querySelectorAll("[data-workspace-nav]"));
  const workspacePanels = Array.from(document.querySelectorAll("[data-workspace]"));
  const workspaceTitle = document.querySelector("[data-workspace-title]");
  const workspaceEyebrow = document.querySelector("[data-workspace-eyebrow]");
  const dashboard = document.querySelector("[data-dashboard]");
  const dangerLevels = ["", "Low", "Medium", "High", "Cursed", "Forbidden"];
  const statuses = ["Draft", "Ready", "Published", "Hidden", "Archived", "Deleted"];
  const workspaceLabels = {
    dashboard: ["Dashboard", "What needs attention"],
    library: ["Library", "Browse and select"],
    metadata: ["Metadata", "Edit at speed"],
    uploads: ["Uploads", "Add new artifacts"],
    bulk: ["Bulk Tools", "Mass changes"],
    health: ["Media Health", "QA checks"],
    relations: ["Relations", "Connection map"],
    game: ["Memetic Game", "Weapon audit"],
    live: ["Live Experiment", "Cloud Flip dossier"],
    report: ["Build Report", "Publish readiness"]
  };

  let projects = [];
  let categories = [];
  let activeFilter = "all";
  let activeStatusFilter = "all";
  let activeCategoryFilter = "all";
  let activeGroupFilter = "category";
  let searchQuery = "";
  let metadataSearchQuery = "";
  let metadataStatus = "all";
  let metadataCategory = "all";
  let metadataGroup = "missing";
  let metadataSortMode = "updated";
  let activeMissingFilter = "all";
  let viewMode = "cards";
  let activeWorkspace = "dashboard";
  let pendingItems = [];
  let activeEditorId = "";
  let selectedIds = new Set();
  let lastMediaHealth = null;
  let liveExperiment = null;

  function setStatus(message, details) {
    status.textContent = message || "";

    if (!details || !details.length) {
      return;
    }

    const list = document.createElement("ul");
    details.forEach((detail) => {
      const item = document.createElement("li");
      item.textContent = detail;
      list.append(item);
    });
    status.append(list);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function titleFromFilename(filename) {
    return String(filename || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((word) => {
        if (word.length <= 3 && word === word.toUpperCase()) {
          return word;
        }

        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function categoryLabel(category) {
    const match = categories.find((item) => item.slug === category);
    return match ? match.label : category || "Uncategorized";
  }

  function sourceImage(project) {
    const sizes = project.sizes || {};
    return project.image || sizes.large || sizes.medium || sizes.small || "";
  }

  function sourceThumbnail(project) {
    if (project.thumbnail) {
      return project.thumbnail;
    }

    const variants = Array.isArray(project.variants) ? project.variants : [];
    const preferred = variants.find((variant) => Number(variant.width) === 768) || variants[0];
    return preferred ? preferred.url : "";
  }

  function hasImage(project) {
    return Boolean(sourceImage(project));
  }

  function hasThumbnail(project) {
    return Boolean(sourceThumbnail(project));
  }

  function hasRequiredImages(project) {
    return hasImage(project) && hasThumbnail(project);
  }

  function entryStatus(project) {
    if (project.status) {
      return project.status;
    }

    return hasRequiredImages(project) ? "Published" : "Draft";
  }

  function missingImageLabel(project) {
    if (!hasImage(project) && !hasThumbnail(project)) {
      return "Missing image + thumbnail";
    }

    if (!hasImage(project)) {
      return "Missing image";
    }

    if (!hasThumbnail(project)) {
      return "Missing thumbnail";
    }

    return "";
  }

  function missingMetadataItems(project) {
    const missing = [];

    if (!String(project.description || "").trim()) {
      missing.push("description");
    }

    if (!String(project.alt || "").trim()) {
      missing.push("alt text");
    }

    if (!String(project.dateCreated || "").trim()) {
      missing.push("date");
    }

    if (!Array.isArray(project.tags) || !project.tags.length) {
      missing.push("tags");
    }

    return missing;
  }

  function missingFieldKeys(project) {
    const missing = [];

    if (!String(project.alt || "").trim()) {
      missing.push("alt");
    }

    if (!String(project.description || "").trim()) {
      missing.push("description");
    }

    if (!String(project.dateCreated || "").trim()) {
      missing.push("date");
    }

    if (!Array.isArray(project.tags) || !project.tags.length) {
      missing.push("tags");
    }

    if (!hasRequiredImages(project)) {
      missing.push("media");
    }

    return missing;
  }

  function csvValue(value) {
    return Array.isArray(value) ? value.join(", ") : "";
  }

  function csvCell(value) {
    const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function splitCsvLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const next = line[index + 1];

      if (character === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        cells.push(current);
        current = "";
      } else {
        current += character;
      }
    }

    cells.push(current);
    return cells;
  }

  function curationFor(project) {
    const curation = project.curation && typeof project.curation === "object" ? project.curation : {};
    return {
      homepage: curation.homepage === true,
      featuredRank: Number(curation.featuredRank || 0),
      randomWeight: Number(curation.randomWeight || 1)
    };
  }

  function parseCsv(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function suggestedAlt(title, category) {
    return `${title} concept image from the Lemonteed ${categoryLabel(category)} archive`;
  }

  async function api(path, options) {
    const response = await fetch(path, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || "Request failed.");
      error.errors = Array.isArray(data.errors) ? data.errors : [];
      error.warnings = Array.isArray(data.warnings) ? data.warnings : [];
      throw error;
    }

    return data;
  }

  function showError(error) {
    const details = error.errors && error.errors.length ? error.errors : [];
    setStatus(error.message || "Request failed.", details);
  }

  function setWorkspace(name) {
    activeWorkspace = workspaceLabels[name] ? name : "dashboard";
    workspaceButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.workspaceNav === activeWorkspace);
    });
    workspacePanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.workspace === activeWorkspace);
    });

    const [title, eyebrow] = workspaceLabels[activeWorkspace];
    workspaceTitle.textContent = title;
    workspaceEyebrow.textContent = eyebrow;
  }

  function dashboardMetric(label, value, note, tone) {
    return `
      <article class="dashboard-card${tone ? ` dashboard-card--${escapeHtml(tone)}` : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(note)}</p>
      </article>
    `;
  }

  function renderDashboard() {
    if (!dashboard) {
      return;
    }

    const missingMedia = projects.filter((project) => !hasRequiredImages(project));
    const missingMetadata = projects.filter((project) => missingMetadataItems(project).length);
    const ready = projects.filter((project) => entryStatus(project) === "Ready" || entryStatus(project) === "Published");
    const drafts = projects.filter((project) => entryStatus(project) === "Draft");
    const visible = projects.filter((project) => project.visible !== false);
    const recent = projects.slice(0, 6);
    const categoryCounts = categories.map((category) => {
      const total = projects.filter((project) => project.category === category.slug).length;
      return `<li><span>${escapeHtml(category.label)}</span><strong>${total}</strong></li>`;
    }).join("");

    dashboard.innerHTML = `
      ${dashboardMetric("Total Artifacts", projects.length, `${visible.length} visible in the public archive`, "")}
      ${dashboardMetric("Needs Media", missingMedia.length, "Missing main image or thumbnail", missingMedia.length ? "danger" : "")}
      ${dashboardMetric("Metadata Gaps", missingMetadata.length, "Missing description, alt text, date, or tags", missingMetadata.length ? "warning" : "")}
      ${dashboardMetric("Ready / Published", ready.length, `${drafts.length} drafts still need review`, "")}
      <section class="dashboard-list">
        <h3>Recently Added</h3>
        ${recent.length ? `<ul>${recent.map((project) => `<li><span>${escapeHtml(project.title)}</span><button type="button" data-edit="${escapeHtml(project.id)}">Open</button></li>`).join("")}</ul>` : "<p>No projects loaded.</p>"}
      </section>
      <section class="dashboard-list">
        <h3>Category Counts</h3>
        ${categoryCounts ? `<ul>${categoryCounts}</ul>` : "<p>No categories loaded.</p>"}
      </section>
    `;
  }

  function projectById(id) {
    return projects.find((project) => project.id === id) || null;
  }

  function relatedCoverage(project) {
    return Array.isArray(project.related) ? project.related.filter((id) => projectById(id)).length : 0;
  }

  function renderHealthDashboard(result) {
    if (!healthDashboard) {
      return;
    }

    const missing = result && Array.isArray(result.missingReferencedImages) ? result.missingReferencedImages : [];
    const unused = result && Array.isArray(result.unusedGalleryImages) ? result.unusedGalleryImages : [];
    const missingMediaProjects = projects.filter((project) => !hasRequiredImages(project));
    const missingVariants = projects.filter((project) => !Array.isArray(project.variants) || project.variants.length < 3);
    const oversized = projects.filter((project) => {
      const variants = Array.isArray(project.variants) ? project.variants : [];
      return variants.some((variant) => Number(variant.width || 0) > 1600);
    });

    healthDashboard.innerHTML = `
      <div class="qa-grid">
        ${dashboardMetric("Missing References", missing.length, "Referenced paths that do not exist", missing.length ? "danger" : "")}
        ${dashboardMetric("Unused Files", unused.length, "Gallery files not referenced by content", unused.length ? "warning" : "")}
        ${dashboardMetric("Missing Media Records", missingMediaProjects.length, "Projects missing image or thumbnail", missingMediaProjects.length ? "danger" : "")}
        ${dashboardMetric("Variant Warnings", missingVariants.length, "Projects with fewer than three variants", missingVariants.length ? "warning" : "")}
      </div>
      <div class="qa-columns">
        <section class="qa-list">
          <h3>Projects Missing Media</h3>
          ${missingMediaProjects.length ? `<ul>${missingMediaProjects.slice(0, 24).map((project) => `<li><span>${escapeHtml(project.title)}</span><button type="button" data-edit="${escapeHtml(project.id)}">Open</button></li>`).join("")}</ul>` : "<p>No projects missing required media.</p>"}
        </section>
        <section class="qa-list">
          <h3>Variant Warnings</h3>
          ${missingVariants.length ? `<ul>${missingVariants.slice(0, 24).map((project) => `<li><span>${escapeHtml(project.title)}</span><button type="button" data-edit="${escapeHtml(project.id)}">Open</button></li>`).join("")}</ul>` : "<p>Variant coverage looks complete.</p>"}
        </section>
      </div>
    `;
  }

  function renderRelationsBoard() {
    if (!relationsBoard) {
      return;
    }

    const entries = projects
      .map((project) => ({
        project,
        related: relatedCoverage(project),
        suggestions: relatedSuggestions(project)
      }))
      .sort((a, b) => a.related - b.related || b.suggestions.length - a.suggestions.length || a.project.title.localeCompare(b.project.title));

    relationsBoard.innerHTML = `
      <div class="qa-grid">
        ${dashboardMetric("No Related Items", entries.filter((entry) => entry.related === 0).length, "Artifacts without valid related links", "")}
        ${dashboardMetric("Has Suggestions", entries.filter((entry) => entry.suggestions.length).length, "Based on shared category, series, or tags", "")}
        ${dashboardMetric("Broken Related IDs", projects.reduce((sum, project) => sum + (Array.isArray(project.related) ? project.related.filter((id) => !projectById(id)).length : 0), 0), "Related IDs that do not resolve", "")}
        ${dashboardMetric("Total Relations", projects.reduce((sum, project) => sum + relatedCoverage(project), 0), "Valid related links across archive", "")}
      </div>
      <div class="relations-list">
        ${entries.slice(0, 48).map(({ project, related, suggestions }) => `
          <article class="relation-row">
            ${renderThumb(project, "entry-row-thumb")}
            <div>
              <strong>${escapeHtml(project.title)}</strong>
              <span>${escapeHtml(categoryLabel(project.category))} / ${related} related</span>
            </div>
            <div class="relation-suggestions">
              ${suggestions.length ? suggestions.slice(0, 4).map((item) => `<button type="button" data-add-related-direct="${escapeHtml(project.id)}" data-related-id="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>`).join("") : "<span>No suggestions</span>"}
            </div>
            <button type="button" data-edit="${escapeHtml(project.id)}">Open</button>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderGameManager() {
    if (!gameManager) {
      return;
    }

    const gameData = window.memeticGameData || {};
    const weapons = Array.isArray(gameData.weapons) ? gameData.weapons : [];
    const weaponRows = weapons.map((weapon) => {
      const artifact = projectById(weapon.artifactId);
      const missing = !artifact || !hasRequiredImages(artifact) || missingMetadataItems(artifact).length;
      return { weapon, artifact, missing };
    });

    gameManager.innerHTML = `
      <div class="qa-grid">
        ${dashboardMetric("Weapons", weapons.length, "Game records loaded from memetic-game-data.js", "")}
        ${dashboardMetric("Linked Artifacts", weaponRows.filter((row) => row.artifact).length, "Weapons with matching gallery records", "")}
        ${dashboardMetric("Needs Attention", weaponRows.filter((row) => row.missing).length, "Missing artifact, media, or metadata", weaponRows.some((row) => row.missing) ? "warning" : "")}
        ${dashboardMetric("Enemy Types", Array.isArray(gameData.enemyTypes) ? gameData.enemyTypes.length : 0, "Runtime encounter records", "")}
      </div>
      <div class="game-table">
        ${weaponRows.map(({ weapon, artifact, missing }) => `
          <article class="game-row${missing ? " has-warning" : ""}">
            ${artifact ? renderThumb(artifact, "entry-row-thumb") : "<div class=\"entry-row-thumb\">Missing</div>"}
            <div>
              <strong>${escapeHtml(weapon.title)}</strong>
              <span>${escapeHtml(weapon.id)} / artifact ${escapeHtml(weapon.artifactId)}</span>
            </div>
            <div class="entry-field"><span>Cost</span>$${escapeHtml(weapon.cost)}</div>
            <div class="entry-field"><span>Class</span>${escapeHtml(Array.isArray(weapon.tags) ? weapon.tags.join(" / ") : "-")}</div>
            <div class="entry-field"><span>Stats</span>ATK ${escapeHtml(weapon.stats && weapon.stats.damage)} / DEF ${escapeHtml(weapon.stats && weapon.stats.defense)} / SPD ${escapeHtml(weapon.stats && weapon.stats.speed)}</div>
            <div class="entry-field"><span>Status</span>${artifact ? renderMissingSummary(artifact) : "<span class=\"warning-badge\">missing artifact</span>"}</div>
            ${artifact ? `<button type="button" data-edit="${escapeHtml(artifact.id)}">Open</button>` : ""}
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderValidationResult(result) {
    const errors = Array.isArray(result.errors) ? result.errors : [];
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    validationPanel.hidden = false;
    validationPanel.innerHTML = `
      <div class="validation-summary${errors.length ? " has-errors" : ""}">
        <strong>${errors.length ? "Validation failed" : "Archive validation passed"}</strong>
        <span>${errors.length} errors / ${warnings.length} warnings</span>
      </div>
      ${errors.length ? `
        <section>
          <h3>Errors</h3>
          <ul>${errors.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      ` : ""}
      ${warnings.length ? `
        <section>
          <h3>Warnings</h3>
          <ul>${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      ` : ""}
    `;
  }

  function limitedList(items, limit) {
    const visibleItems = items.slice(0, limit);
    const hiddenCount = Math.max(0, items.length - visibleItems.length);
    return `
      <ul>${visibleItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      ${hiddenCount ? `<p class="validation-more">+ ${hiddenCount} more</p>` : ""}
    `;
  }

  function renderMediaHealthResult(result) {
    const missing = Array.isArray(result.missingReferencedImages) ? result.missingReferencedImages : [];
    const unused = Array.isArray(result.unusedGalleryImages) ? result.unusedGalleryImages : [];
    validationPanel.hidden = false;
    validationPanel.innerHTML = `
      <div class="validation-summary${missing.length ? " has-errors" : ""}">
        <strong>${missing.length ? "Media health issues found" : "Media health checked"}</strong>
        <span>${result.referencedImageCount || 0} referenced / ${result.galleryImageCount || 0} gallery files</span>
      </div>
      ${missing.length ? `
        <section>
          <h3>Missing Referenced Images</h3>
          ${limitedList(missing, 80)}
        </section>
      ` : ""}
      <section>
        <h3>Unused Gallery Images</h3>
        ${unused.length ? limitedList(unused, 120) : "<p class=\"validation-empty\">No unused gallery images found.</p>"}
      </section>
      ${unused.length ? `
        <div class="validation-actions">
          <button type="button" data-cleanup-unused="all">Delete All Unused Files</button>
          <button type="button" data-cleanup-unused="listed">Delete Listed Files</button>
        </div>
      ` : ""}
    `;
  }

  function countedValues(values) {
    const counts = new Map();

    values.filter(Boolean).forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function renderCurationManagers() {
    const tags = countedValues(projects.flatMap((project) => Array.isArray(project.tags) ? project.tags : []));
    const series = countedValues(projects.map((project) => project.series || "").filter(Boolean));

    tagManager.innerHTML = tags.slice(0, 32)
      .map(([tag, total]) => `<button type="button" data-filter-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span>${total}</span></button>`)
      .join("") || "<p>No tags yet.</p>";
    seriesManager.innerHTML = series.slice(0, 24)
      .map(([name, total]) => `<button type="button" data-filter-series="${escapeHtml(name)}">${escapeHtml(name)} <span>${total}</span></button>`)
      .join("") || "<p>No series yet.</p>";
  }

  function filteredProjects() {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      if (activeFilter === "visible" && project.visible === false) {
        return false;
      }

      if (activeFilter === "hidden" && project.visible !== false) {
        return false;
      }

      if (activeCategoryFilter !== "all" && project.category !== activeCategoryFilter) {
        return false;
      }

      if (activeStatusFilter === "missing-media" && hasRequiredImages(project)) {
        return false;
      }

      if (activeStatusFilter === "missing-metadata" && !missingMetadataItems(project).length) {
        return false;
      }

      if (activeStatusFilter === "featured" && project.featured !== true) {
        return false;
      }

      if (activeStatusFilter === "not-featured" && project.featured === true) {
        return false;
      }

      if (activeStatusFilter !== "all" && activeStatusFilter !== "missing-media" && entryStatus(project) !== activeStatusFilter) {
        if (["missing-metadata", "featured", "not-featured"].includes(activeStatusFilter)) {
          return true;
        }

        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        project.id,
        project.title,
        project.slug,
        project.category,
        project.categoryLabel,
        project.series,
        project.description,
        project.origin,
        project.dangerLevel,
        csvValue(project.tags),
        csvValue(project.toolsUsed),
        csvValue(project.related)
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }

  function renderThumb(project, className) {
    const thumbnail = sourceThumbnail(project) || sourceImage(project);

    if (!thumbnail) {
      return `<div class="${className || "missing-thumb"}">No image</div>`;
    }

    return `<img class="${className || ""}" src="${escapeHtml(thumbnail)}" alt="">`;
  }

  function metaLine(project) {
    const values = [
      project.id,
      categoryLabel(project.category),
      project.series,
      entryStatus(project)
    ].filter(Boolean);

    return values.map((value) => `<span>${escapeHtml(value)}</span>`).join("");
  }

  function renderBadges(project) {
    const warning = missingImageLabel(project);
    const missingMetadata = missingMetadataItems(project);
    const curation = curationFor(project);
    return `
      <span class="status-badge status-${escapeHtml(entryStatus(project).toLowerCase())}">${escapeHtml(entryStatus(project))}</span>
      ${curation.homepage ? "<span class=\"status-badge\">Homepage</span>" : ""}
      ${curation.randomWeight !== 1 ? `<span class="status-badge">Random ${escapeHtml(curation.randomWeight)}</span>` : ""}
      ${warning ? `<span class="warning-badge">${escapeHtml(warning)}</span>` : ""}
      ${missingMetadata.length ? `<span class="warning-badge">${missingMetadata.length} metadata gaps</span>` : ""}
    `;
  }

  function renderHealthDots(project) {
    const checks = [
      ["Image", hasImage(project)],
      ["Thumb", hasThumbnail(project)],
      ["Alt", Boolean(String(project.alt || "").trim())],
      ["Meta", !missingMetadataItems(project).length]
    ];

    return `
      <div class="health-dots" aria-label="Artifact health">
        ${checks.map(([label, ok]) => `<span class="${ok ? "is-ok" : "is-missing"}" title="${escapeHtml(label)}">${escapeHtml(label)}</span>`).join("")}
      </div>
    `;
  }

  function renderSelectBox(project) {
    return `
      <label class="select-box">
        <input type="checkbox" data-select-project="${escapeHtml(project.id)}"${selectedIds.has(project.id) ? " checked" : ""}>
        <span>Select ${escapeHtml(project.title)}</span>
      </label>
    `;
  }

  function renderCard(project) {
    const active = project.id === activeEditorId;
    const editing = Boolean(activeEditorId);

    return `
      <article class="project-card${project.visible === false ? " is-hidden" : ""}${active ? " is-active" : ""}${editing && !active ? " is-muted" : ""}" data-card-id="${escapeHtml(project.id)}">
        ${renderSelectBox(project)}
        ${renderThumb(project, "project-thumb")}
        <div class="project-card-body">
          <div class="project-card-title-row">
            <h3>${escapeHtml(project.title)}</h3>
            ${renderBadges(project)}
          </div>
          <div class="project-meta">${metaLine(project)}</div>
          ${renderHealthDots(project)}
        </div>
        <div class="project-actions">
          <button class="primary-action" type="button" data-edit="${escapeHtml(project.id)}">Open</button>
          <button type="button" data-toggle="${escapeHtml(project.id)}"${editing ? " disabled" : ""}>${project.visible === false ? "Show" : "Hide"}</button>
          <button class="delete-button" type="button" data-delete="${escapeHtml(project.id)}"${editing ? " disabled" : ""}>Delete</button>
        </div>
      </article>
    `;
  }

  function groupedProjects() {
    return filteredProjects().reduce((groups, project) => {
      let label = categoryLabel(project.category) || "Uncategorized";

      if (activeGroupFilter === "status") {
        label = entryStatus(project);
      } else if (activeGroupFilter === "featured") {
        label = project.featured === true ? "Featured" : "Not Featured";
      } else if (activeGroupFilter === "metadata") {
        label = missingMetadataItems(project).length ? "Missing Metadata" : "Metadata Complete";
      }

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push(project);
      return groups;
    }, new Map());
  }

  function renderListView() {
    return Array.from(groupedProjects().entries()).map(([label, entries]) => `
      <section class="list-group">
        <h3>${escapeHtml(label)}</h3>
        <div class="entry-table">
          ${entries.map((project) => {
            const active = project.id === activeEditorId;
            const editing = Boolean(activeEditorId);
            return `
              <article class="entry-row${active ? " is-active" : ""}${editing && !active ? " is-muted" : ""}" data-card-id="${escapeHtml(project.id)}">
                ${renderSelectBox(project)}
                ${renderThumb(project, "entry-row-thumb")}
                <div class="entry-main">
                  <strong>${escapeHtml(project.title)}</strong>
                  <span>${escapeHtml(project.id)} / ${escapeHtml(categoryLabel(project.category))}</span>
                </div>
                <div class="entry-field"><span>Series</span>${escapeHtml(project.series || "-")}</div>
                <div class="entry-field"><span>Status</span>${renderBadges(project)}</div>
                <div class="entry-field"><span>Tags</span>${escapeHtml(csvValue(project.tags) || "-")}</div>
                <div class="entry-field"><span>Danger</span>${escapeHtml(project.dangerLevel || "-")}</div>
                <button type="button" data-edit="${escapeHtml(project.id)}"${editing ? " disabled" : ""}>Edit</button>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `).join("");
  }

  function metadataFilteredProjects() {
    const query = metadataSearchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      if (metadataCategory !== "all" && project.category !== metadataCategory) {
        return false;
      }

      if (metadataStatus === "missing-media" && hasRequiredImages(project)) {
        return false;
      }

      if (metadataStatus === "missing-metadata" && !missingMetadataItems(project).length) {
        return false;
      }

      if (metadataStatus === "featured" && project.featured !== true) {
        return false;
      }

      if (metadataStatus === "not-featured" && project.featured === true) {
        return false;
      }

      if (metadataStatus !== "all" && !["missing-media", "missing-metadata", "featured", "not-featured"].includes(metadataStatus) && entryStatus(project) !== metadataStatus) {
        return false;
      }

      if (activeMissingFilter !== "all" && !missingFieldKeys(project).includes(activeMissingFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        project.id,
        project.title,
        project.slug,
        project.category,
        categoryLabel(project.category),
        project.series,
        project.description,
        project.alt,
        project.origin,
        csvValue(project.tags),
        csvValue(project.toolsUsed)
      ].join(" ").toLowerCase().includes(query);
    }).sort((a, b) => {
      if (metadataSortMode === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }

      if (metadataSortMode === "created") {
        return String(b.dateCreated || "").localeCompare(String(a.dateCreated || ""));
      }

      if (metadataSortMode === "status") {
        return entryStatus(a).localeCompare(entryStatus(b)) || String(a.title || "").localeCompare(String(b.title || ""));
      }

      return String(b.updatedAt || b.dateCreated || "").localeCompare(String(a.updatedAt || a.dateCreated || ""));
    });
  }

  function metadataGroupLabel(project) {
    if (metadataGroup === "category") {
      return categoryLabel(project.category) || "Uncategorized";
    }

    if (metadataGroup === "status") {
      return entryStatus(project);
    }

    if (metadataGroup === "series") {
      return project.series || "No Series";
    }

    if (metadataGroup === "featured") {
      return project.featured === true ? "Featured" : "Not Featured";
    }

    const missing = missingFieldKeys(project);
    return missing.length ? `Missing ${missing[0]}` : "Complete";
  }

  function groupedMetadataProjects() {
    return metadataFilteredProjects().reduce((groups, project) => {
      const label = metadataGroupLabel(project);

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label).push(project);
      return groups;
    }, new Map());
  }

  function renderMissingSummary(project) {
    const missing = missingFieldKeys(project);

    if (!missing.length) {
      return "<span class=\"metadata-complete\">Complete</span>";
    }

    return missing.map((item) => `<span class="warning-badge">${escapeHtml(item)}</span>`).join("");
  }

  function renderMetadata() {
    if (!metadataList) {
      return;
    }

    const groups = Array.from(groupedMetadataProjects().entries());

    metadataList.innerHTML = groups.length ? groups.map(([label, entries]) => `
      <section class="metadata-group">
        <div class="metadata-group__head">
          <h3>${escapeHtml(label)}</h3>
          <span>${entries.length} items</span>
        </div>
        <div class="metadata-table">
          ${entries.map((project) => `
            <article class="metadata-row${project.id === activeEditorId ? " is-active" : ""}" data-card-id="${escapeHtml(project.id)}">
              ${renderSelectBox(project)}
              ${renderThumb(project, "entry-row-thumb")}
              <div class="entry-main">
                <strong>${escapeHtml(project.title)}</strong>
                <span>${escapeHtml(project.id)} / ${escapeHtml(project.slug || "-")}</span>
              </div>
              <div class="entry-field"><span>Category</span>${escapeHtml(categoryLabel(project.category))}</div>
              <div class="entry-field"><span>Series</span>${escapeHtml(project.series || "-")}</div>
              <div class="entry-field"><span>Status</span>${renderSelect("status", statuses, entryStatus(project), "")}</div>
              <div class="entry-field"><span>Featured</span>${project.featured ? "Yes" : "No"}</div>
              <div class="entry-field"><span>Missing</span>${renderMissingSummary(project)}</div>
              <button type="button" data-edit="${escapeHtml(project.id)}">Open</button>
              <button type="button" data-quick-status="${escapeHtml(project.id)}">Save Status</button>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("") : "<p class=\"metadata-empty\">No entries match these metadata filters.</p>";
  }

  function updateSelectedCount() {
    selectedCount.textContent = `${selectedIds.size} selected`;
    bulkForm.classList.toggle("has-selection", selectedIds.size > 0);
  }

  function render() {
    const visibleProjects = filteredProjects();
    const knownIds = new Set(projects.map((project) => project.id));
    selectedIds = new Set(Array.from(selectedIds).filter((id) => knownIds.has(id)));
    count.textContent = visibleProjects.length === projects.length
      ? String(projects.length)
      : `${visibleProjects.length} of ${projects.length}`;
    updateSelectedCount();
    renderMetadata();

    if (viewMode === "list") {
      list.className = "project-list is-list-view";
      list.innerHTML = renderListView();
      return;
    }

    list.className = "project-list is-card-view";
    list.innerHTML = visibleProjects.map(renderCard).join("");
  }

  function renderCategoryOptions(selectedValue) {
    const currentValue = selectedValue || categorySelect.value || "what-if";
    categorySelect.textContent = "";

    categories
      .filter((category) => category.visible !== false)
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = category.label;
        categorySelect.append(option);
      });

    if (Array.from(categorySelect.options).some((option) => option.value === currentValue)) {
      categorySelect.value = currentValue;
    }
  }

  function renderArchiveCategoryOptions() {
    const currentValue = activeCategoryFilter;
    archiveCategoryFilter.textContent = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    archiveCategoryFilter.append(allOption);

    categories
      .filter((category) => category.visible !== false)
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = category.label;
        archiveCategoryFilter.append(option);
      });

    archiveCategoryFilter.value = Array.from(archiveCategoryFilter.options).some((option) => option.value === currentValue)
      ? currentValue
      : "all";
    activeCategoryFilter = archiveCategoryFilter.value;
  }

  function renderMetadataCategoryOptions() {
    const currentValue = metadataCategory;
    metadataCategoryFilter.textContent = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    metadataCategoryFilter.append(allOption);

    categories
      .filter((category) => category.visible !== false)
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = category.label;
        metadataCategoryFilter.append(option);
      });

    metadataCategoryFilter.value = Array.from(metadataCategoryFilter.options).some((option) => option.value === currentValue)
      ? currentValue
      : "all";
    metadataCategory = metadataCategoryFilter.value;
  }

  function renderBulkCategoryOptions() {
    const currentValue = bulkCategory.value;
    bulkCategory.textContent = "";

    const keepOption = document.createElement("option");
    keepOption.value = "";
    keepOption.textContent = "Keep category";
    bulkCategory.append(keepOption);

    categories
      .filter((category) => category.visible !== false)
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = category.label;
        bulkCategory.append(option);
      });

    bulkCategory.value = Array.from(bulkCategory.options).some((option) => option.value === currentValue)
      ? currentValue
      : "";
  }

  async function loadProjects() {
    const data = await api("/api/projects");
    projects = data.projects || [];
    categories = data.categories || [];
    renderCategoryOptions();
    renderArchiveCategoryOptions();
    renderMetadataCategoryOptions();
    renderBulkCategoryOptions();
    renderCurationManagers();
    renderDashboard();
    renderHealthDashboard(lastMediaHealth);
    renderRelationsBoard();
    renderGameManager();
    renderMetadata();
    render();
  }

  async function loadLiveExperiment() {
    if (!liveEditorJson && !liveEditorFields) {
      return;
    }

    const data = await api("/api/live-experiment");
    setLiveExperiment(data.liveExperiment || {});
  }

  async function saveLiveExperiment(event) {
    event.preventDefault();

    if (!liveEditorJson) {
      return;
    }

    syncLiveJsonFromFields();
    const payload = parseLiveJson();

    if (!payload) {
      return;
    }

    try {
      setStatus("Saving live experiment...");
      const result = await api("/api/live-experiment", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ liveExperiment: payload })
      });
      setLiveExperiment(result.liveExperiment || payload);
      setStatus("Live experiment saved and rebuilt.");
    } catch (error) {
      showError(error);
    }
  }

  function parseLiveJson() {
    try {
      return JSON.parse(liveEditorJson.value || "{}");
    } catch (error) {
      setStatus(`Live Experiment JSON is invalid: ${error.message}`);
      return null;
    }
  }

  function setLiveExperiment(data) {
    liveExperiment = data || {};

    if (liveEditorJson) {
      liveEditorJson.value = JSON.stringify(liveExperiment, null, 2);
    }

    renderLiveEditor();
    renderLivePreview();
  }

  function fieldName(path) {
    return `live:${path}`;
  }

  function getPath(source, pathValue) {
    return pathValue.split(".").reduce((value, key) => {
      if (value == null) {
        return "";
      }
      return value[key];
    }, source);
  }

  function setPath(target, pathValue, value) {
    const parts = pathValue.split(".");
    let cursor = target;

    parts.slice(0, -1).forEach((part) => {
      if (!cursor[part] || typeof cursor[part] !== "object") {
        cursor[part] = {};
      }
      cursor = cursor[part];
    });

    cursor[parts[parts.length - 1]] = value;
  }

  function liveField(label, pathValue, type = "text") {
    const value = getPath(liveExperiment, pathValue);
    const name = fieldName(pathValue);

    if (type === "textarea") {
      return `
        <label>
          <span>${escapeHtml(label)}</span>
          <textarea name="${escapeHtml(name)}" rows="4">${escapeHtml(value)}</textarea>
        </label>
      `;
    }

    return `
      <label>
        <span>${escapeHtml(label)}</span>
        <input name="${escapeHtml(name)}" type="text" value="${escapeHtml(value)}">
      </label>
    `;
  }

  function renderLiveEditor() {
    if (!liveEditorFields || !liveExperiment) {
      return;
    }

    liveEditorFields.innerHTML = `
      <section class="live-form-section">
        <h3>Hero</h3>
        <div class="live-form-grid">
          ${liveField("Kicker", "hero.kicker")}
          ${liveField("Headline", "hero.headline", "textarea")}
          ${liveField("Subheadline", "hero.subheadline")}
          ${liveField("Intro", "hero.intro", "textarea")}
          ${liveField("Metadata 1", "hero.metadata.0")}
          ${liveField("Metadata 2", "hero.metadata.1")}
          ${liveField("Metadata 3", "hero.metadata.2")}
        </div>
      </section>

      <section class="live-form-section">
        <h3>Hero Buttons</h3>
        <div class="live-repeat-list">
          ${renderLiveActions(liveExperiment.hero && liveExperiment.hero.actions, "hero.actions")}
        </div>
      </section>

      <section class="live-form-section">
        <h3>Ledger</h3>
        <div class="live-form-grid">
          ${liveField("Title", "ledger.title")}
          ${liveField("Report", "ledger.report")}
          ${liveField("Footer Left", "ledger.footerLeft.0")}
          ${liveField("Footer Left 2", "ledger.footerLeft.1")}
          ${liveField("Footer Brand", "ledger.footerBrand")}
          ${liveField("Footer Right", "ledger.footerRight.0")}
          ${liveField("Footer Right 2", "ledger.footerRight.1")}
        </div>
        <div class="live-repeat-list">
          ${renderLedgerRows(liveExperiment.ledger && liveExperiment.ledger.rows)}
        </div>
      </section>

      <section class="live-form-section">
        <h3>Build Log</h3>
        <div class="live-form-grid">
          ${liveField("Title", "buildLog.title")}
          ${liveField("Label", "buildLog.label")}
          ${liveField("Entries Label", "buildLog.entriesLabel")}
          ${liveField("Button Label", "buildLog.button.label")}
          ${liveField("Button URL", "buildLog.button.href")}
        </div>
        <div class="live-repeat-list">
          ${renderBuildEntries(liveExperiment.buildLog && liveExperiment.buildLog.entries)}
        </div>
      </section>

      <section class="live-form-section">
        <h3>Current Bet</h3>
        <div class="live-form-grid">
          ${liveField("Eyebrow", "currentBet.eyebrow")}
          ${liveField("Title", "currentBet.title")}
          ${liveField("Copy", "currentBet.copy", "textarea")}
          ${liveField("Button Label", "currentBet.button.label")}
          ${liveField("Button URL", "currentBet.button.href")}
          ${liveField("Art Path", "currentBet.art")}
        </div>
      </section>

      <section class="live-form-section">
        <h3>Get Involved</h3>
        <div class="live-form-grid">
          ${liveField("Title", "getInvolved.title")}
          ${liveField("Meta", "getInvolved.meta")}
          ${liveField("Note", "getInvolved.note")}
          ${liveField("Button Label", "getInvolved.button.label")}
          ${liveField("Button URL", "getInvolved.button.href")}
        </div>
        <div class="live-repeat-list">
          ${renderInvolvedItems(liveExperiment.getInvolved && liveExperiment.getInvolved.items)}
        </div>
      </section>

      <section class="live-form-section">
        <h3>Status Strip</h3>
        <div class="live-form-grid">
          ${liveField("Left", "statusStrip.0")}
          ${liveField("Center", "statusStrip.1")}
          ${liveField("Right", "statusStrip.2")}
          ${liveField("Mascot Path", "assets.mascot")}
        </div>
      </section>
    `;
  }

  function renderLiveActions(items, basePath) {
    return (Array.isArray(items) ? items : []).map((item, index) => `
      <article class="live-repeat-row">
        <strong>Button ${index + 1}</strong>
        ${liveField("Label", `${basePath}.${index}.label`)}
        ${liveField("URL", `${basePath}.${index}.href`)}
        ${liveField("Icon", `${basePath}.${index}.icon`)}
      </article>
    `).join("");
  }

  function renderLedgerRows(items) {
    return (Array.isArray(items) ? items : []).map((item, index) => `
      <article class="live-repeat-row">
        <strong>Ledger Row ${index + 1}</strong>
        ${liveField("Label", `ledger.rows.${index}.label`)}
        ${liveField("Value", `ledger.rows.${index}.value`)}
        ${liveField("Tone", `ledger.rows.${index}.tone`)}
      </article>
    `).join("");
  }

  function renderBuildEntries(items) {
    return (Array.isArray(items) ? items : []).map((item, index) => `
      <article class="live-repeat-row">
        <strong>Entry ${index + 1}</strong>
        ${liveField("Number", `buildLog.entries.${index}.number`)}
        ${liveField("Title", `buildLog.entries.${index}.title`)}
        ${liveField("Copy", `buildLog.entries.${index}.copy`)}
        ${liveField("Date", `buildLog.entries.${index}.date`)}
        ${liveField("Datetime", `buildLog.entries.${index}.datetime`)}
      </article>
    `).join("");
  }

  function renderInvolvedItems(items) {
    return (Array.isArray(items) ? items : []).map((item, index) => `
      <article class="live-repeat-row">
        <strong>Item ${index + 1}</strong>
        ${liveField("Icon", `getInvolved.items.${index}.icon`)}
        ${liveField("Title", `getInvolved.items.${index}.title`)}
        ${liveField("Copy", `getInvolved.items.${index}.copy`)}
        ${liveField("URL", `getInvolved.items.${index}.href`)}
        ${liveField("Label", `getInvolved.items.${index}.label`)}
      </article>
    `).join("");
  }

  function syncLiveJsonFromFields() {
    if (!liveEditorForm || !liveExperiment) {
      return;
    }

    const next = JSON.parse(JSON.stringify(liveExperiment));
    const fields = Array.from(liveEditorForm.querySelectorAll("[name^='live:']"));

    fields.forEach((field) => {
      setPath(next, field.name.replace(/^live:/, ""), field.value);
    });

    liveExperiment = next;

    if (liveEditorJson) {
      liveEditorJson.value = JSON.stringify(liveExperiment, null, 2);
    }

    renderLivePreview();
  }

  function renderLivePreview() {
    if (!livePreview || !liveExperiment) {
      return;
    }

    const hero = liveExperiment.hero || {};
    const ledger = liveExperiment.ledger || {};
    const currentBet = liveExperiment.currentBet || {};
    const buildEntries = liveExperiment.buildLog && Array.isArray(liveExperiment.buildLog.entries)
      ? liveExperiment.buildLog.entries
      : [];

    livePreview.innerHTML = `
      <article class="live-preview-card">
        <p>${escapeHtml(hero.kicker || "")}</p>
        <h3>${escapeHtml(hero.headline || "").replace(/\n/g, "<br>")}</h3>
        <strong>${escapeHtml(hero.subheadline || "")}</strong>
        <span>${escapeHtml(hero.intro || "")}</span>
      </article>
      <article class="live-preview-card">
        <p>${escapeHtml(ledger.title || "")} / ${escapeHtml(ledger.report || "")}</p>
        <dl>
          ${(Array.isArray(ledger.rows) ? ledger.rows : []).map((row) => `<div><dt>${escapeHtml(row.label || "")}</dt><dd>${escapeHtml(row.value || "")}</dd></div>`).join("")}
        </dl>
      </article>
      <article class="live-preview-card">
        <p>Current Bet</p>
        <h3>${escapeHtml(currentBet.title || "")}</h3>
        <span>${escapeHtml(currentBet.copy || "")}</span>
      </article>
      <article class="live-preview-card">
        <p>Build Log</p>
        <ol>
          ${buildEntries.map((entry) => `<li>${escapeHtml(entry.number || "")} / ${escapeHtml(entry.title || "")}</li>`).join("")}
        </ol>
      </article>
    `;
  }

  function clearPendingUrls() {
    pendingItems.forEach((item) => URL.revokeObjectURL(item.preview));
  }

  function renderPending() {
    pendingList.textContent = "";

    if (!pendingItems.length) {
      const empty = document.createElement("p");
      empty.className = "pending-empty";
      empty.textContent = "Select images to generate editable project rows.";
      pendingList.append(empty);
      return;
    }

    pendingItems.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "pending-item";
      row.innerHTML = `
        <img src="${escapeHtml(item.preview)}" alt="">
        <div class="pending-fields">
          <p class="pending-name">${escapeHtml(item.file.name)}</p>
          <label>
            <span>Suggested title</span>
            <input type="text" value="${escapeHtml(item.title)}" data-pending-title="${index}" required>
          </label>
          <label>
            <span>Alt text</span>
            <textarea rows="3" data-pending-alt="${index}" required>${escapeHtml(item.alt)}</textarea>
          </label>
        </div>
      `;
      pendingList.append(row);
    });
  }

  function queueFiles(files) {
    const category = form.elements.category.value;
    clearPendingUrls();
    pendingItems = Array.from(files || []).map((file) => {
      const title = titleFromFilename(file.name);
      return {
        file,
        title,
        alt: suggestedAlt(title, category),
        preview: URL.createObjectURL(file)
      };
    });
    renderPending();
  }

  function renderSelect(name, values, selected, emptyLabel) {
    return `
      <select name="${escapeHtml(name)}">
        ${emptyLabel ? `<option value="">${escapeHtml(emptyLabel)}</option>` : ""}
        ${values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}
      </select>
    `;
  }

  function renderCategorySelect(project) {
    return `
      <select name="category" required>
        ${categories
          .filter((category) => category.visible !== false)
          .map((category) => `<option value="${escapeHtml(category.slug)}"${category.slug === project.category ? " selected" : ""}>${escapeHtml(category.label)}</option>`)
          .join("")}
      </select>
    `;
  }

  function renderRelatedPicker(project) {
    const relatedIds = new Set(Array.isArray(project.related) ? project.related : []);
    const options = projects
      .filter((item) => item.id !== project.id && !relatedIds.has(item.id))
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} (${escapeHtml(item.id)})</option>`)
      .join("");

    return `
      <div class="related-picker">
        <select data-related-picker>
          <option value="">Add related item</option>
          ${options}
        </select>
        <button type="button" data-add-related>Add</button>
      </div>
    `;
  }

  function relatedSuggestions(project) {
    const relatedIds = new Set(Array.isArray(project.related) ? project.related : []);
    const tags = new Set(Array.isArray(project.tags) ? project.tags.map((tag) => String(tag).toLowerCase()) : []);

    return projects
      .filter((item) => item.id !== project.id && !relatedIds.has(item.id))
      .map((item) => {
        const sharedTags = Array.isArray(item.tags)
          ? item.tags.filter((tag) => tags.has(String(tag).toLowerCase())).length
          : 0;
        const sameSeries = project.series && item.series && project.series === item.series ? 2 : 0;
        const sameCategory = project.category && item.category === project.category ? 1 : 0;
        return { item, score: sharedTags * 3 + sameSeries + sameCategory };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 8)
      .map((entry) => entry.item);
  }

  function renderRelatedSuggestions(project) {
    const suggestions = relatedSuggestions(project);

    if (!suggestions.length) {
      return "";
    }

    return `
      <div class="related-suggestions">
        <span>Suggested related</span>
        ${suggestions.map((item) => `<button type="button" data-suggest-related="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>`).join("")}
      </div>
    `;
  }

  function renderDrawerSummary(project) {
    const variants = Array.isArray(project.variants) ? project.variants.length : 0;
    const related = Array.isArray(project.related) ? project.related.length : 0;
    const metadataGaps = missingMetadataItems(project).length;

    return `
      <div class="drawer-summary">
        <span><strong>ID</strong>${escapeHtml(project.id)}</span>
        <span><strong>Status</strong>${escapeHtml(entryStatus(project))}</span>
        <span><strong>Related</strong>${related}</span>
        <span><strong>Variants</strong>${variants}</span>
        <span><strong>Metadata Gaps</strong>${metadataGaps}</span>
        <span><strong>Updated</strong>${escapeHtml(project.updatedAt ? project.updatedAt.slice(0, 10) : "-")}</span>
      </div>
    `;
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (!value) {
      return "-";
    }

    if (value < 1024 * 1024) {
      return `${Math.round(value / 1024)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderMediaInfo(info) {
    const rows = Array.isArray(info.files) ? info.files : [];

    return `
      <div class="media-info-table">
        ${rows.map((file) => `
          <div class="media-info-row${file.exists ? "" : " is-missing"}">
            <strong>${escapeHtml(file.label)}</strong>
            <span>${escapeHtml(file.path || file.url || "-")}</span>
            <span>${file.exists ? `${escapeHtml(formatBytes(file.bytes))} / ${escapeHtml(file.width || "-")}x${escapeHtml(file.height || "-")}` : "Missing"}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function loadMediaInfo(id) {
    const target = editDrawer.querySelector("[data-media-info]");

    if (!target) {
      return;
    }

    target.textContent = "Loading media info...";

    try {
      const info = await api(`/api/projects/${id}/media-info`);
      target.innerHTML = renderMediaInfo(info);
    } catch (error) {
      target.textContent = error.message || "Media info failed.";
    }
  }

  function openEditor(id) {
    const project = projects.find((item) => item.id === id);

    if (!project) {
      return;
    }

    activeEditorId = id;
    render();
    editLayer.hidden = false;
    editDrawer.innerHTML = `
      <form class="drawer-form" data-drawer-form="${escapeHtml(project.id)}">
        <div class="drawer-heading">
          <p class="eyebrow">Editing ${escapeHtml(project.id)}</p>
          <h2 id="edit-title">${escapeHtml(project.title)}</h2>
          ${renderBadges(project)}
          ${missingImageLabel(project) ? `<p class="drawer-warning">Image required before this entry can be published.</p>` : ""}
          ${renderDrawerSummary(project)}
        </div>
        <div class="drawer-tabs" role="tablist" aria-label="Editor sections">
          <button type="button" class="is-active" data-drawer-tab="overview">Overview</button>
          <button type="button" data-drawer-tab="metadata">Metadata</button>
          <button type="button" data-drawer-tab="media">Media</button>
          <button type="button" data-drawer-tab="relations">Relations</button>
        </div>

        <section class="drawer-panel is-active" data-drawer-panel="overview">
          ${renderThumb(project, "drawer-preview-image")}
          <h3 class="drawer-section-title">Overview</h3>
          <label>
            <span>Title</span>
            <input name="title" type="text" value="${escapeHtml(project.title)}" required>
          </label>
          <label>
            <span>Slug</span>
            <input name="slug" type="text" value="${escapeHtml(project.slug || "")}" data-original-slug="${escapeHtml(project.slug || "")}" required>
          </label>
          <label>
            <span>Category</span>
            ${renderCategorySelect(project)}
          </label>
          <label>
            <span>Series</span>
            <input name="series" type="text" value="${escapeHtml(project.series)}">
          </label>
          <label>
            <span>Status</span>
            ${renderSelect("status", statuses, entryStatus(project), "")}
          </label>
          <label class="checkbox-row">
            <input name="featured" type="checkbox"${project.featured ? " checked" : ""}>
            <span>Featured</span>
          </label>
          <label class="checkbox-row">
            <input name="homepage" type="checkbox"${curationFor(project).homepage ? " checked" : ""}>
            <span>Homepage collection</span>
          </label>
        </section>

        <section class="drawer-panel" data-drawer-panel="metadata" hidden>
          <h3 class="drawer-section-title">Metadata</h3>
          <label>
            <span>Date created</span>
            <input name="dateCreated" type="date" value="${escapeHtml(project.dateCreated || "")}">
          </label>
          <label>
            <span>Danger level</span>
            ${renderSelect("dangerLevel", dangerLevels, project.dangerLevel || "", "Unset")}
          </label>
          <label>
            <span>Description</span>
            <textarea name="description" rows="5">${escapeHtml(project.description)}</textarea>
          </label>
          <label>
            <span>Alt text</span>
            <textarea name="alt" rows="3" required>${escapeHtml(project.alt)}</textarea>
          </label>
          <label>
            <span>Origin</span>
            <textarea name="origin" rows="3">${escapeHtml(project.origin)}</textarea>
          </label>
          <label>
            <span>Tags</span>
            <input name="tags" type="text" value="${escapeHtml(csvValue(project.tags))}" placeholder="tag-one, tag-two">
          </label>
          <label>
            <span>Tools used</span>
            <input name="toolsUsed" type="text" value="${escapeHtml(csvValue(project.toolsUsed))}" placeholder="ChatGPT, Photoshop">
          </label>
        </section>

        <section class="drawer-panel" data-drawer-panel="media" hidden>
          <h3 class="drawer-section-title">Media</h3>
          <div class="media-actions">
            <button type="button" data-regenerate-project="${escapeHtml(project.id)}">Regenerate Variants</button>
            <label>
              <span>Replacement image</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" data-replace-image-file>
            </label>
            <button type="button" data-replace-image="${escapeHtml(project.id)}">Replace Image</button>
          </div>
          <div class="media-info" data-media-info></div>
          <label>
            <span>Image path</span>
            <input name="image" type="text" value="${escapeHtml(sourceImage(project))}">
          </label>
          <label>
            <span>Thumbnail path</span>
            <input name="thumbnail" type="text" value="${escapeHtml(sourceThumbnail(project))}">
          </label>
        </section>

        <section class="drawer-panel" data-drawer-panel="relations" hidden>
          <h3 class="drawer-section-title">Relations</h3>
          <label>
            <span>Related IDs</span>
            <input name="related" type="text" value="${escapeHtml(csvValue(project.related))}" placeholder="other-id, another-id">
          </label>
          ${renderRelatedPicker(project)}
          ${renderRelatedSuggestions(project)}
          <label>
            <span>Featured rank</span>
            <input name="featuredRank" type="number" min="0" step="1" value="${escapeHtml(curationFor(project).featuredRank)}">
          </label>
          <label>
            <span>Random weight</span>
            <input name="randomWeight" type="number" min="0" step="0.1" value="${escapeHtml(curationFor(project).randomWeight)}">
          </label>
        </section>

        <div class="drawer-actions">
          <button type="submit">Save</button>
          <button type="button" data-cancel-drawer>Cancel</button>
        </div>
      </form>
    `;
    editDrawer.querySelector("input[name='title']").focus();
    loadMediaInfo(project.id);
  }

  function closeEditor() {
    activeEditorId = "";
    editLayer.hidden = true;
    editDrawer.textContent = "";
    render();
  }

  function projectPayloadFromForm(drawerForm) {
    const formData = new FormData(drawerForm);
    const image = String(formData.get("image") || "").trim();
    const thumbnail = String(formData.get("thumbnail") || "").trim();
    const nextStatus = String(formData.get("status") || "Draft").trim();
    const slug = String(formData.get("slug") || "").trim();

    if (!String(formData.get("title") || "").trim()) {
      throw new Error("Title is required.");
    }

    if (!slug) {
      throw new Error("Slug is required.");
    }

    if ((nextStatus === "Ready" || nextStatus === "Published") && (!image || !thumbnail)) {
      throw new Error("Image required before this entry can be published.");
    }

    return {
      title: formData.get("title"),
      slug,
      category: formData.get("category"),
      series: formData.get("series"),
      status: nextStatus,
      image,
      thumbnail,
      alt: formData.get("alt"),
      description: formData.get("description"),
      origin: formData.get("origin"),
      dateCreated: formData.get("dateCreated"),
      tags: parseCsv(formData.get("tags")),
      dangerLevel: formData.get("dangerLevel"),
      toolsUsed: parseCsv(formData.get("toolsUsed")),
      related: parseCsv(formData.get("related")),
      featured: formData.get("featured") === "on",
      curation: {
        homepage: formData.get("homepage") === "on",
        featuredRank: Number(formData.get("featuredRank") || 0),
        randomWeight: Number(formData.get("randomWeight") || 1)
      }
    };
  }

  async function saveEditor(event) {
    const drawerForm = event.target.closest("[data-drawer-form]");

    if (!drawerForm) {
      return;
    }

    event.preventDefault();
    const id = drawerForm.dataset.drawerForm;
    const project = projects.find((item) => item.id === id);

    try {
      const slugInput = drawerForm.querySelector("input[name='slug']");
      const originalSlug = slugInput ? slugInput.dataset.originalSlug : "";
      const payload = projectPayloadFromForm(drawerForm);

      if (originalSlug && payload.slug !== originalSlug && !window.confirm(`Change slug from "${originalSlug}" to "${payload.slug}"?`)) {
        setStatus("Slug change cancelled.");
        return;
      }

      setStatus(`Saving ${project ? project.title : id}...`);
      await api(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      closeEditor();
      await loadProjects();
      setStatus("Metadata saved and gallery rebuilt.");
    } catch (error) {
      showError(error);
    }
  }

  async function submitCategory(event) {
    event.preventDefault();
    const button = categoryForm.querySelector("button[type='submit']");
    const formData = new FormData(categoryForm);
    const label = String(formData.get("label") || "").trim();

    if (!label) {
      setStatus("Name the new series first.");
      return;
    }

    button.disabled = true;
    setStatus(`Adding ${label}...`);

    try {
      const data = await api("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          prefix: formData.get("prefix")
        })
      });

      categoryForm.reset();
      await loadProjects();
      renderCategoryOptions(data.category.slug);
      setStatus(`${data.category.label} added. New uploads can use this series now.`);
    } catch (error) {
      showError(error);
    } finally {
      button.disabled = false;
    }
  }

  async function submitProject(event) {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);

    if (!pendingItems.length) {
      setStatus("Choose one or more images first.");
      return;
    }

    submitButton.disabled = true;
    setStatus(`Uploading 0 of ${pendingItems.length}...`);

    try {
      for (let index = 0; index < pendingItems.length; index += 1) {
        const item = pendingItems[index];
        const title = form.querySelector(`[data-pending-title="${index}"]`).value.trim();
        const alt = form.querySelector(`[data-pending-alt="${index}"]`).value.trim();

        if (!title || !alt) {
          throw new Error("Each queued image needs a title and alt text.");
        }

        setStatus(`Uploading ${index + 1} of ${pendingItems.length}: ${title}`);

        await api("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            category: formData.get("category"),
            year: formData.get("year"),
            description: formData.get("description"),
            alt,
            visible: formData.get("visible") === "on",
            imageName: item.file.name,
            imageData: await readFileAsDataUrl(item.file)
          })
        });
      }

      form.reset();
      form.elements.visible.checked = true;
      clearPendingUrls();
      pendingItems = [];
      renderPending();
      await loadProjects();
      setStatus("Batch uploaded. The static gallery has been rebuilt.");
    } catch (error) {
      showError(error);
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleListClick(event) {
    const select = event.target.closest("[data-select-project]");
    const edit = event.target.closest("[data-edit]");
    const toggle = event.target.closest("[data-toggle]");
    const remove = event.target.closest("[data-delete]");

    if (select) {
      if (select.checked) {
        selectedIds.add(select.dataset.selectProject);
      } else {
        selectedIds.delete(select.dataset.selectProject);
      }

      updateSelectedCount();
      return;
    }

    if (edit) {
      openEditor(edit.dataset.edit);
      return;
    }

    if (toggle) {
      const project = projects.find((item) => item.id === toggle.dataset.toggle);

      if (!project) {
        return;
      }

      setStatus(`Updating ${project.title}...`);
      try {
        const showing = project.visible === false;
        const nextPayload = showing
          ? { visible: true, status: entryStatus(project) === "Hidden" ? "Published" : entryStatus(project) }
          : { visible: false, status: "Hidden" };
        await api(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(nextPayload)
        });
        await loadProjects();
        setStatus("Visibility updated and gallery rebuilt.");
      } catch (error) {
        showError(error);
      }
    }

    if (remove) {
      const project = projects.find((item) => item.id === remove.dataset.delete);

      if (!project || !window.confirm(`Delete "${project.title}" and its generated image files?`)) {
        return;
      }

      setStatus(`Deleting ${project.title}...`);
      try {
        await api(`/api/projects/${project.id}`, { method: "DELETE" });
        await loadProjects();
        setStatus("Project deleted and gallery rebuilt.");
      } catch (error) {
        showError(error);
      }
    }
  }

  function exportData() {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      categories,
      entries: projects
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lemonteed-gallery-data-${today}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Export downloaded.");
  }

  function csvProjectRows(selectedOnly) {
    const source = selectedOnly && selectedIds.size
      ? projects.filter((project) => selectedIds.has(project.id))
      : projects;
    const headers = ["id", "title", "slug", "category", "series", "status", "visible", "featured", "dateCreated", "description", "alt", "tags", "toolsUsed", "related", "image", "thumbnail"];
    return [
      headers.join(","),
      ...source.map((project) => headers.map((header) => {
        if (header === "status") {
          return csvCell(entryStatus(project));
        }

        if (header === "visible") {
          return csvCell(project.visible === false ? "false" : "true");
        }

        return csvCell(project[header]);
      }).join(","))
    ].join("\n");
  }

  function exportCsvData() {
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csvProjectRows(false)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lemonteed-gallery-data-${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("CSV export downloaded.");
  }

  function exportSelectedData() {
    if (!selectedIds.size) {
      setStatus("Select at least one project.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const selectedProjects = projects.filter((project) => selectedIds.has(project.id));
    const payload = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      categories,
      entries: selectedProjects
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lemonteed-selected-${today}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus(`${selectedProjects.length} selected projects exported.`);
  }

  function importedEntriesFromJson(json) {
    const data = JSON.parse(json);
    const entries = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : Array.isArray(data.projects) ? data.projects : null;

    if (!entries) {
      throw new Error("Unsupported structure. Import a JSON array, or an object with entries/projects.");
    }

    const seen = new Set();
    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object" || !entry.id || !entry.title || !(entry.category || entry.categorySlug)) {
        throw new Error("Imported entries require id, title, and category.");
      }

      if (seen.has(entry.id)) {
        throw new Error(`Duplicate imported id: ${entry.id}`);
      }

      seen.add(entry.id);
    });

    return entries;
  }

  function importedEntriesFromCsv(csv) {
    const lines = String(csv || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error("CSV import needs a header row and at least one project row.");
    }

    const headers = splitCsvLine(lines[0]).map((header) => header.trim());
    const required = ["id", "title", "category"];

    required.forEach((header) => {
      if (!headers.includes(header)) {
        throw new Error(`CSV import requires ${header}.`);
      }
    });

    return lines.slice(1).map((line) => {
      const cells = splitCsvLine(line);
      const entry = {};

      headers.forEach((header, index) => {
        entry[header] = cells[index] || "";
      });

      ["tags", "toolsUsed", "related"].forEach((field) => {
        entry[field] = parseCsv(entry[field]);
      });
      entry.visible = String(entry.visible || "true").toLowerCase() !== "false";
      entry.featured = String(entry.featured || "").toLowerCase() === "true";
      return entry;
    });
  }

  async function importData() {
    const file = importFile.files[0];

    if (!file) {
      setStatus("Choose a JSON file to import.");
      return;
    }

    try {
      const text = await readFileAsText(file);
      const entries = importedEntriesFromJson(text);
      const mode = importMode.value === "replace" ? "replace" : "merge";

      if (mode === "replace" && !window.confirm("Replace all existing entries with this import?")) {
        setStatus("Import cancelled.");
        return;
      }

      setStatus(`Importing ${entries.length} entries...`);
      const result = await api("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, data: { entries } })
      });
      importFile.value = "";
      await loadProjects();
      setStatus(`${result.imported} entries imported with ${result.mode} mode.`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setStatus("Invalid JSON file.");
        return;
      }

      showError(error);
    }
  }

  async function importCsvData() {
    const file = importCsvFile.files[0];

    if (!file) {
      setStatus("Choose a CSV file to import.");
      return;
    }

    try {
      const text = await readFileAsText(file);
      const entries = importedEntriesFromCsv(text);
      const mode = importMode.value === "replace" ? "replace" : "merge";

      if (mode === "replace" && !window.confirm("Replace all existing entries with this CSV import?")) {
        setStatus("CSV import cancelled.");
        return;
      }

      setStatus(`Importing ${entries.length} CSV rows...`);
      const result = await api("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, data: { entries } })
      });
      importCsvFile.value = "";
      await loadProjects();
      setStatus(`${result.imported} CSV rows imported with ${result.mode} mode.`);
    } catch (error) {
      showError(error);
    }
  }

  async function validateArchive() {
    validateButton.disabled = true;
    setStatus("Validating archive...");

    try {
      const result = await api("/api/validation");
      renderValidationResult(result);
      setStatus(result.ok ? "Archive validation passed." : "Archive validation found errors.");
    } catch (error) {
      showError(error);
    } finally {
      validateButton.disabled = false;
    }
  }

  async function checkMediaHealth() {
    mediaHealthButton.disabled = true;
    setStatus("Checking media health...");

    try {
      const result = await api("/api/media-health");
      lastMediaHealth = result;
      renderMediaHealthResult(result);
      renderHealthDashboard(result);
      setStatus(result.ok ? "Media health check finished." : "Media health found missing referenced images.");
    } catch (error) {
      showError(error);
    } finally {
      mediaHealthButton.disabled = false;
    }
  }

  async function runBuildReport() {
    if (!buildReportPanel) {
      return;
    }

    buildReportButton.disabled = true;
    setStatus("Running build report...");

    try {
      const [validation, health] = await Promise.all([
        api("/api/validation"),
        api("/api/media-health")
      ]);
      lastMediaHealth = health;
      renderHealthDashboard(health);

      const missingMetadata = projects.filter((project) => missingMetadataItems(project).length);
      const ready = projects.filter((project) => entryStatus(project) === "Ready" || entryStatus(project) === "Published");
      const hidden = projects.filter((project) => project.visible === false || entryStatus(project) === "Hidden");
      const validationErrors = Array.isArray(validation.errors) ? validation.errors : [];
      const validationWarnings = Array.isArray(validation.warnings) ? validation.warnings : [];
      const missingMedia = Array.isArray(health.missingReferencedImages) ? health.missingReferencedImages : [];

      buildReportPanel.innerHTML = `
        <div class="qa-grid">
          ${dashboardMetric("Validation Errors", validationErrors.length, "Must be fixed before publishing", validationErrors.length ? "danger" : "")}
          ${dashboardMetric("Warnings", validationWarnings.length, "Review before deploy", validationWarnings.length ? "warning" : "")}
          ${dashboardMetric("Missing Media", missingMedia.length, "Referenced files not found", missingMedia.length ? "danger" : "")}
          ${dashboardMetric("Ready / Published", ready.length, `${hidden.length} hidden records`, "")}
        </div>
        <div class="qa-columns">
          <section class="qa-list">
            <h3>Validation Errors</h3>
            ${validationErrors.length ? limitedList(validationErrors, 40) : "<p>No validation errors.</p>"}
          </section>
          <section class="qa-list">
            <h3>Metadata Gaps</h3>
            ${missingMetadata.length ? `<ul>${missingMetadata.slice(0, 40).map((project) => `<li><span>${escapeHtml(project.title)}</span><button type="button" data-edit="${escapeHtml(project.id)}">Open</button></li>`).join("")}</ul>` : "<p>No metadata gaps found.</p>"}
          </section>
        </div>
      `;
      setStatus(validation.ok && health.ok ? "Build report passed." : "Build report found issues.");
    } catch (error) {
      showError(error);
    } finally {
      buildReportButton.disabled = false;
    }
  }

  async function addDirectRelated(projectId, relatedId) {
    const project = projectById(projectId);

    if (!project || !relatedId) {
      return;
    }

    const related = Array.isArray(project.related) ? project.related.slice() : [];

    if (related.includes(relatedId)) {
      setStatus("Related item already exists.");
      return;
    }

    related.push(relatedId);

    try {
      setStatus(`Adding related item to ${project.title}...`);
      await api(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ related })
      });
      await loadProjects();
      setStatus("Related item added and gallery rebuilt.");
    } catch (error) {
      showError(error);
    }
  }

  async function cleanupUnusedMedia(mode) {
    if (!lastMediaHealth) {
      setStatus("Run Media Health first.");
      return;
    }

    const unused = Array.isArray(lastMediaHealth.unusedGalleryImages) ? lastMediaHealth.unusedGalleryImages : [];
    const files = mode === "listed" ? unused.slice(0, 120) : unused;

    if (!files.length) {
      setStatus("No unused media files to delete.");
      return;
    }

    if (!window.confirm(`Delete ${files.length} unused media files? Backups will be written first.`)) {
      setStatus("Media cleanup cancelled.");
      return;
    }

    try {
      setStatus(`Deleting ${files.length} unused media files...`);
      const result = await api("/api/media-cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ files })
      });
      setStatus(`${result.deleted.length} unused media files deleted.`);
      await checkMediaHealth();
    } catch (error) {
      showError(error);
    }
  }

  async function regenerateProject(id) {
    try {
      setStatus(`Regenerating variants for ${id}...`);
      const result = await api(`/api/projects/${id}/regenerate-variants`, { method: "POST" });
      await loadProjects();
      setStatus(`Regenerated ${result.variantCount} variants for ${id}.`);
    } catch (error) {
      showError(error);
    }
  }

  async function regenerateSelectedProjects() {
    if (!selectedIds.size) {
      setStatus("Select at least one project.");
      return;
    }

    try {
      const ids = Array.from(selectedIds);
      setStatus(`Regenerating variants for ${ids.length} selected projects...`);
      const result = await api("/api/projects/bulk/regenerate-variants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids })
      });
      selectedIds.clear();
      await loadProjects();
      setStatus(`Regenerated variants for ${result.updated} projects.`);
    } catch (error) {
      showError(error);
    }
  }

  async function quickUpdateProjectStatus(id, nextStatus) {
    const project = projects.find((item) => item.id === id);

    if (!project || !nextStatus) {
      return;
    }

    try {
      setStatus(`Setting ${project.title} to ${nextStatus}...`);
      await api(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus, visible: nextStatus !== "Hidden" })
      });
      await loadProjects();
      setStatus(`${project.title} moved to ${nextStatus}.`);
    } catch (error) {
      showError(error);
    }
  }

  async function quickBulkStatus(nextStatus) {
    if (!selectedIds.size) {
      setStatus("Select at least one project.");
      return;
    }

    try {
      const ids = Array.from(selectedIds);
      setStatus(`Moving ${ids.length} selected projects to ${nextStatus}...`);
      const result = await api("/api/projects/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids,
          changes: {
            status: nextStatus,
            visible: nextStatus !== "Hidden"
          }
        })
      });
      selectedIds.clear();
      await loadProjects();
      setStatus(`${result.updated} projects moved to ${nextStatus}.`);
    } catch (error) {
      showError(error);
    }
  }

  async function replaceProjectImage(id) {
    const fileInput = editDrawer.querySelector("[data-replace-image-file]");
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!file) {
      setStatus("Choose a replacement image first.");
      return;
    }

    if (!window.confirm("Replace this project's image while preserving its ID and slug?")) {
      setStatus("Image replacement cancelled.");
      return;
    }

    try {
      setStatus(`Replacing image for ${id}...`);
      await api(`/api/projects/${id}/replace-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageData: await readFileAsDataUrl(file) })
      });
      closeEditor();
      await loadProjects();
      setStatus("Image replaced and gallery rebuilt.");
    } catch (error) {
      showError(error);
    }
  }

  function bulkPayloadFromForm() {
    const formData = new FormData(bulkForm);
    const changes = {};
    const status = String(formData.get("status") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const visible = String(formData.get("visible") || "").trim();
    const featured = String(formData.get("featured") || "").trim();
    const tagsAdd = parseCsv(formData.get("tagsAdd"));
    const toolsUsedAdd = parseCsv(formData.get("toolsUsedAdd"));
    const series = String(formData.get("series") || "").trim();
    const relatedAdd = parseCsv(formData.get("relatedAdd"));
    const relatedRemove = parseCsv(formData.get("relatedRemove"));

    if (status) {
      changes.status = status;
    }

    if (category) {
      changes.category = category;
    }

    if (visible) {
      changes.visible = visible === "true";
    }

    if (featured) {
      changes.featured = featured === "true";
    }

    if (tagsAdd.length) {
      changes.tagsAdd = tagsAdd;
    }

    if (toolsUsedAdd.length) {
      changes.toolsUsedAdd = toolsUsedAdd;
    }

    if (series) {
      changes.series = series;
    }

    if (relatedAdd.length) {
      changes.relatedAdd = relatedAdd;
    }

    if (relatedRemove.length) {
      changes.relatedRemove = relatedRemove;
    }

    if (!Object.keys(changes).length) {
      throw new Error("Choose at least one bulk change.");
    }

    return {
      ids: Array.from(selectedIds),
      changes
    };
  }

  async function applyBulkEdit(event) {
    event.preventDefault();

    if (!selectedIds.size) {
      setStatus("Select at least one project.");
      return;
    }

    try {
      const payload = bulkPayloadFromForm();
      setStatus(`Updating ${payload.ids.length} selected projects...`);
      const result = await api("/api/projects/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      selectedIds.clear();
      bulkForm.reset();
      await loadProjects();
      setStatus(`${result.updated} projects updated and gallery rebuilt.`);
    } catch (error) {
      showError(error);
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.view;
      viewButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  workspaceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setWorkspace(button.dataset.workspaceNav);
    });
  });

  if (dashboard) {
    dashboard.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit]");

      if (!edit) {
        return;
      }

      setWorkspace("library");
      openEditor(edit.dataset.edit);
    });
  }

  [healthDashboard, relationsBoard, gameManager, buildReportPanel].forEach((panel) => {
    if (!panel) {
      return;
    }

    panel.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit]");
      const directRelated = event.target.closest("[data-add-related-direct]");

      if (edit) {
        openEditor(edit.dataset.edit);
        return;
      }

      if (directRelated) {
        addDirectRelated(directRelated.dataset.addRelatedDirect, directRelated.dataset.relatedId);
      }
    });
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    render();
  });

  statusFilter.addEventListener("change", () => {
    activeStatusFilter = statusFilter.value;
    render();
  });

  archiveCategoryFilter.addEventListener("change", () => {
    activeCategoryFilter = archiveCategoryFilter.value;
    render();
  });

  groupFilter.addEventListener("change", () => {
    activeGroupFilter = groupFilter.value;
    render();
  });

  metadataSearchInput.addEventListener("input", () => {
    metadataSearchQuery = metadataSearchInput.value;
    renderMetadata();
  });

  metadataStatusFilter.addEventListener("change", () => {
    metadataStatus = metadataStatusFilter.value;
    renderMetadata();
  });

  metadataCategoryFilter.addEventListener("change", () => {
    metadataCategory = metadataCategoryFilter.value;
    renderMetadata();
  });

  metadataGroupFilter.addEventListener("change", () => {
    metadataGroup = metadataGroupFilter.value;
    renderMetadata();
  });

  metadataSort.addEventListener("change", () => {
    metadataSortMode = metadataSort.value;
    renderMetadata();
  });

  missingFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeMissingFilter = button.dataset.missingFilter;
      missingFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      renderMetadata();
    });
  });

  fileInput.addEventListener("change", () => queueFiles(fileInput.files));
  categorySelect.addEventListener("change", () => {
    const category = categorySelect.value;
    pendingItems = pendingItems.map((item) => ({
      ...item,
      alt: suggestedAlt(item.title, category)
    }));
    renderPending();
  });

  categoryForm.addEventListener("submit", submitCategory);
  form.addEventListener("submit", submitProject);
  list.addEventListener("click", (event) => {
    handleListClick(event).catch((error) => setStatus(error.message));
  });
  metadataList.addEventListener("click", (event) => {
    const select = event.target.closest("[data-select-project]");
    const edit = event.target.closest("[data-edit]");
    const quickStatus = event.target.closest("[data-quick-status]");

    if (select) {
      if (select.checked) {
        selectedIds.add(select.dataset.selectProject);
      } else {
        selectedIds.delete(select.dataset.selectProject);
      }

      render();
      renderMetadata();
      return;
    }

    if (edit) {
      openEditor(edit.dataset.edit);
      return;
    }

    if (quickStatus) {
      const row = quickStatus.closest(".metadata-row");
      const statusSelect = row ? row.querySelector("select[name='status']") : null;
      quickUpdateProjectStatus(quickStatus.dataset.quickStatus, statusSelect ? statusSelect.value : "");
    }
  });
  editDrawer.addEventListener("submit", saveEditor);
  editDrawer.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-drawer-tab]");

    if (tab) {
      const selected = tab.dataset.drawerTab;
      editDrawer.querySelectorAll("[data-drawer-tab]").forEach((button) => {
        button.classList.toggle("is-active", button === tab);
      });
      editDrawer.querySelectorAll("[data-drawer-panel]").forEach((panel) => {
        const active = panel.dataset.drawerPanel === selected;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
      return;
    }

    const regenerateButton = event.target.closest("[data-regenerate-project]");
    const replaceButton = event.target.closest("[data-replace-image]");

    if (regenerateButton) {
      regenerateProject(regenerateButton.dataset.regenerateProject);
      return;
    }

    if (replaceButton) {
      replaceProjectImage(replaceButton.dataset.replaceImage);
      return;
    }

    const suggestedRelated = event.target.closest("[data-suggest-related]");

    if (suggestedRelated) {
      const input = editDrawer.querySelector("input[name='related']");
      const picked = suggestedRelated.dataset.suggestRelated;

      if (!picked || !input) {
        return;
      }

      const values = parseCsv(input.value);

      if (!values.includes(picked)) {
        values.push(picked);
        input.value = values.join(", ");
      }

      return;
    }

    if (event.target.closest("[data-add-related]")) {
      const picker = editDrawer.querySelector("[data-related-picker]");
      const input = editDrawer.querySelector("input[name='related']");
      const picked = picker ? picker.value : "";

      if (!picked || !input) {
        return;
      }

      const values = parseCsv(input.value);

      if (!values.includes(picked)) {
        values.push(picked);
        input.value = values.join(", ");
      }

      picker.value = "";
      return;
    }

    if (event.target.closest("[data-cancel-drawer]")) {
      closeEditor();
      setStatus("Edit cancelled.");
    }
  });
  tagManager.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-tag]");

    if (!button) {
      return;
    }

    searchInput.value = button.dataset.filterTag;
    searchQuery = searchInput.value;
    render();
  });
  seriesManager.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-series]");

    if (!button) {
      return;
    }

    searchInput.value = button.dataset.filterSeries;
    searchQuery = searchInput.value;
    activeGroupFilter = "category";
    groupFilter.value = "category";
    render();
  });
  exportButton.addEventListener("click", exportData);
  exportCsvButton.addEventListener("click", exportCsvData);
  importButton.addEventListener("click", importData);
  importCsvButton.addEventListener("click", importCsvData);
  validateButton.addEventListener("click", validateArchive);
  mediaHealthButton.addEventListener("click", checkMediaHealth);
  buildReportButton.addEventListener("click", runBuildReport);
  if (liveEditorForm) {
    liveEditorForm.addEventListener("submit", saveLiveExperiment);
    liveEditorForm.addEventListener("input", (event) => {
      if (event.target && event.target.closest("[data-live-editor-json]")) {
        return;
      }
      syncLiveJsonFromFields();
    });
  }
  if (liveEditorReload) {
    liveEditorReload.addEventListener("click", () => {
      loadLiveExperiment()
        .then(() => setStatus("Live experiment reloaded."))
        .catch(showError);
    });
  }
  if (liveEditorSync) {
    liveEditorSync.addEventListener("click", () => {
      syncLiveJsonFromFields();
      setStatus("Live experiment JSON synced from fields.");
    });
  }
  if (liveEditorJson) {
    liveEditorJson.addEventListener("change", () => {
      const parsed = parseLiveJson();
      if (parsed) {
        setLiveExperiment(parsed);
        setStatus("Live experiment fields synced from JSON.");
      }
    });
  }
  bulkForm.addEventListener("submit", applyBulkEdit);
  regenerateSelectedButton.addEventListener("click", regenerateSelectedProjects);
  exportSelectedButton.addEventListener("click", exportSelectedData);
  clearSelectionButton.addEventListener("click", () => {
    selectedIds.clear();
    render();
    renderMetadata();
    setStatus("Selection cleared.");
  });
  document.querySelectorAll("[data-bulk-status-quick]").forEach((button) => {
    button.addEventListener("click", () => quickBulkStatus(button.dataset.bulkStatusQuick));
  });
  validationPanel.addEventListener("click", (event) => {
    const cleanup = event.target.closest("[data-cleanup-unused]");

    if (cleanup) {
      cleanupUnusedMedia(cleanup.dataset.cleanupUnused);
    }
  });

  setWorkspace(activeWorkspace);
  renderPending();
  loadProjects().catch(showError);
  loadLiveExperiment().catch(showError);
}());
