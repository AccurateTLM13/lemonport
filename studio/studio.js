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
  const importFile = document.querySelector("[data-import-file]");
  const importMode = document.querySelector("[data-import-mode]");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const viewButtons = Array.from(document.querySelectorAll("[data-view]"));
  const dangerLevels = ["", "Low", "Medium", "High", "Cursed", "Forbidden"];
  const statuses = ["Draft", "Ready", "Published"];

  let projects = [];
  let categories = [];
  let activeFilter = "all";
  let viewMode = "cards";
  let pendingItems = [];
  let activeEditorId = "";

  function setStatus(message) {
    status.textContent = message || "";
  }

  function escapeHtml(value) {
    return String(value || "")
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

  function csvValue(value) {
    return Array.isArray(value) ? value.join(", ") : "";
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
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function filteredProjects() {
    if (activeFilter === "visible") {
      return projects.filter((project) => project.visible !== false);
    }

    if (activeFilter === "hidden") {
      return projects.filter((project) => project.visible === false);
    }

    return projects;
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
    return `
      <span class="status-badge status-${escapeHtml(entryStatus(project).toLowerCase())}">${escapeHtml(entryStatus(project))}</span>
      ${warning ? `<span class="warning-badge">${escapeHtml(warning)}</span>` : ""}
    `;
  }

  function renderCard(project) {
    const active = project.id === activeEditorId;
    const editing = Boolean(activeEditorId);

    return `
      <article class="project-card${project.visible === false ? " is-hidden" : ""}${active ? " is-active" : ""}${editing && !active ? " is-muted" : ""}" data-card-id="${escapeHtml(project.id)}">
        ${renderThumb(project, "project-thumb")}
        <div class="project-card-body">
          <div class="project-card-title-row">
            <h3>${escapeHtml(project.title)}</h3>
            ${renderBadges(project)}
          </div>
          <div class="project-meta">${metaLine(project)}</div>
          ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ""}
        </div>
        <div class="project-actions">
          <button type="button" data-edit="${escapeHtml(project.id)}"${editing ? " disabled" : ""}>Quick Edit</button>
          <button type="button" data-toggle="${escapeHtml(project.id)}"${editing ? " disabled" : ""}>${project.visible === false ? "Show" : "Hide"}</button>
          <button class="delete-button" type="button" data-delete="${escapeHtml(project.id)}"${editing ? " disabled" : ""}>Delete</button>
        </div>
      </article>
    `;
  }

  function groupedProjects() {
    return filteredProjects().reduce((groups, project) => {
      const label = categoryLabel(project.category) || "Uncategorized";
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

  function render() {
    const visibleProjects = filteredProjects();
    count.textContent = String(projects.length);

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

  async function loadProjects() {
    const data = await api("/api/projects");
    projects = data.projects || [];
    categories = data.categories || [];
    renderCategoryOptions();
    render();
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

  function openEditor(id) {
    const project = projects.find((item) => item.id === id);

    if (!project || activeEditorId) {
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
        </div>

        <label>
          <span>Title</span>
          <input name="title" type="text" value="${escapeHtml(project.title)}" required>
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
        <label>
          <span>Date created</span>
          <input name="dateCreated" type="date" value="${escapeHtml(project.dateCreated || "")}">
        </label>
        <label>
          <span>Danger level</span>
          ${renderSelect("dangerLevel", dangerLevels, project.dangerLevel || "", "Unset")}
        </label>
        <label class="checkbox-row">
          <input name="featured" type="checkbox"${project.featured ? " checked" : ""}>
          <span>Featured</span>
        </label>
        <label>
          <span>Description</span>
          <textarea name="description" rows="4">${escapeHtml(project.description)}</textarea>
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
        <label>
          <span>Related IDs</span>
          <input name="related" type="text" value="${escapeHtml(csvValue(project.related))}" placeholder="other-id, another-id">
        </label>
        <label>
          <span>Image path</span>
          <input name="image" type="text" value="${escapeHtml(sourceImage(project))}">
        </label>
        <label>
          <span>Thumbnail path</span>
          <input name="thumbnail" type="text" value="${escapeHtml(sourceThumbnail(project))}">
        </label>
        <label>
          <span>Alt text</span>
          <textarea name="alt" rows="3" required>${escapeHtml(project.alt)}</textarea>
        </label>

        <div class="drawer-actions">
          <button type="submit">Save</button>
          <button type="button" data-cancel-drawer>Cancel</button>
        </div>
      </form>
    `;
    editDrawer.querySelector("input[name='title']").focus();
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

    if (!String(formData.get("title") || "").trim()) {
      throw new Error("Title is required.");
    }

    if ((nextStatus === "Ready" || nextStatus === "Published") && (!image || !thumbnail)) {
      throw new Error("Image required before this entry can be published.");
    }

    return {
      title: formData.get("title"),
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
      featured: formData.get("featured") === "on"
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
      const payload = projectPayloadFromForm(drawerForm);
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
      setStatus(error.message);
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
      setStatus(error.message);
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
      setStatus(error.message);
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleListClick(event) {
    const edit = event.target.closest("[data-edit]");
    const toggle = event.target.closest("[data-toggle]");
    const remove = event.target.closest("[data-delete]");

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
      await api(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visible: project.visible === false })
      });
      await loadProjects();
      setStatus("Visibility updated and gallery rebuilt.");
    }

    if (remove) {
      const project = projects.find((item) => item.id === remove.dataset.delete);

      if (!project || !window.confirm(`Delete "${project.title}" and its generated image files?`)) {
        return;
      }

      setStatus(`Deleting ${project.title}...`);
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      await loadProjects();
      setStatus("Project deleted and gallery rebuilt.");
    }
  }

  function exportData() {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      exportedAt: new Date().toISOString(),
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
      setStatus(error instanceof SyntaxError ? "Invalid JSON file." : error.message);
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
  editDrawer.addEventListener("submit", saveEditor);
  editDrawer.addEventListener("click", (event) => {
    if (event.target.closest("[data-cancel-drawer]")) {
      closeEditor();
      setStatus("Edit cancelled.");
    }
  });
  exportButton.addEventListener("click", exportData);
  importButton.addEventListener("click", importData);

  renderPending();
  loadProjects().catch((error) => setStatus(error.message));
}());
