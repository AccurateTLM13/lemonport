(function () {
  const form = document.querySelector("[data-project-form]");
  const categoryForm = document.querySelector("[data-category-form]");
  const categorySelect = document.querySelector("[data-category-select]");
  const list = document.querySelector("[data-project-list]");
  const status = document.querySelector("[data-status]");
  const count = document.querySelector("[data-count]");
  const fileInput = document.querySelector("[data-file-input]");
  const pendingList = document.querySelector("[data-pending-list]");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const dangerLevels = ["", "Low", "Medium", "High", "Cursed", "Forbidden"];

  let projects = [];
  let categories = [];
  let activeFilter = "all";
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
    return match ? match.label : "Lemonteed";
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
    return preferred ? preferred.url : sourceImage(project);
  }

  function csvValue(value) {
    return Array.isArray(value) ? value.join(", ") : "";
  }

  function renderCategorySelect(project) {
    return `
      <select name="category" required>
        ${categories
          .filter((category) => category.visible !== false)
          .map((category) => `
            <option value="${escapeHtml(category.slug)}"${category.slug === project.category ? " selected" : ""}>${escapeHtml(category.label)}</option>
          `)
          .join("")}
      </select>
    `;
  }

  function renderDangerSelect(project) {
    return `
      <select name="dangerLevel">
        ${dangerLevels
          .map((level) => `
            <option value="${escapeHtml(level)}"${level === (project.dangerLevel || "") ? " selected" : ""}>${escapeHtml(level || "Unset")}</option>
          `)
          .join("")}
      </select>
    `;
  }

  function suggestedAlt(title, category) {
    return `${title} concept image from the Lemonteed ${categoryLabel(category)} archive`;
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

  function render() {
    count.textContent = String(projects.length);
    list.textContent = "";

    filteredProjects().forEach((project) => {
      const isEditing = project.id === activeEditorId;
      const card = document.createElement("article");
      card.className = `project-card${project.visible === false ? " is-hidden" : ""}`;
      card.innerHTML = `
        <img src="${escapeHtml(sourceThumbnail(project))}" alt="">
        <div>
          <h3>${escapeHtml(project.title)}</h3>
          <div class="project-meta">
            <span>${escapeHtml(project.id)}</span>
            <span>${escapeHtml(project.categoryLabel)}</span>
            ${project.year ? `<span>${escapeHtml(project.year)}</span>` : ""}
            <span>${project.visible === false ? "Hidden" : "Visible"}</span>
          </div>
        </div>
        ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ""}
        <div class="project-actions">
          <button type="button" data-edit="${escapeHtml(project.id)}">${isEditing ? "Close Edit" : "Edit Metadata"}</button>
          <button type="button" data-toggle="${escapeHtml(project.id)}">${project.visible === false ? "Show" : "Hide"}</button>
          <button class="delete-button" type="button" data-delete="${escapeHtml(project.id)}">Delete</button>
        </div>
        ${isEditing ? `
          <form class="project-editor" data-edit-form="${escapeHtml(project.id)}">
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
              <span>Date created</span>
              <input name="dateCreated" type="date" value="${escapeHtml(project.dateCreated || "")}">
            </label>
            <label>
              <span>Danger level</span>
              ${renderDangerSelect(project)}
            </label>
            <label class="checkbox-row">
              <input name="featured" type="checkbox"${project.featured ? " checked" : ""}>
              <span>Featured</span>
            </label>
            <label class="span-2">
              <span>Description</span>
              <textarea name="description" rows="3">${escapeHtml(project.description)}</textarea>
            </label>
            <label class="span-2">
              <span>Origin</span>
              <textarea name="origin" rows="3">${escapeHtml(project.origin)}</textarea>
            </label>
            <label class="span-2">
              <span>Alt text</span>
              <textarea name="alt" rows="3" required>${escapeHtml(project.alt)}</textarea>
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
              <input name="related" type="text" value="${escapeHtml(csvValue(project.related))}" placeholder="other-item-id, another-item-id">
            </label>
            <label>
              <span>Image path</span>
              <input name="image" type="text" value="${escapeHtml(sourceImage(project))}">
            </label>
            <label class="span-2">
              <span>Thumbnail path</span>
              <input name="thumbnail" type="text" value="${escapeHtml(sourceThumbnail(project))}">
            </label>
            <div class="editor-actions">
              <button type="submit">Save Metadata</button>
              <button type="button" data-cancel-edit="${escapeHtml(project.id)}">Cancel</button>
            </div>
          </form>
        ` : ""}
      `;
      list.append(card);
    });
  }

  async function loadProjects() {
    const data = await api("/api/projects");
    projects = data.projects || [];
    categories = data.categories || [];
    renderCategoryOptions();
    render();
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
    const cancelEdit = event.target.closest("[data-cancel-edit]");
    const toggle = event.target.closest("[data-toggle]");
    const remove = event.target.closest("[data-delete]");

    if (edit) {
      activeEditorId = activeEditorId === edit.dataset.edit ? "" : edit.dataset.edit;
      render();
      return;
    }

    if (cancelEdit) {
      activeEditorId = "";
      render();
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

  function parseCsv(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleListSubmit(event) {
    const editForm = event.target.closest("[data-edit-form]");

    if (!editForm) {
      return;
    }

    event.preventDefault();
    const project = projects.find((item) => item.id === editForm.dataset.editForm);

    if (!project) {
      return;
    }

    const formData = new FormData(editForm);
    setStatus(`Saving ${project.title}...`);

    await api(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        category: formData.get("category"),
        series: formData.get("series"),
        image: formData.get("image"),
        thumbnail: formData.get("thumbnail"),
        alt: formData.get("alt"),
        description: formData.get("description"),
        origin: formData.get("origin"),
        dateCreated: formData.get("dateCreated"),
        tags: parseCsv(formData.get("tags")),
        dangerLevel: formData.get("dangerLevel"),
        toolsUsed: parseCsv(formData.get("toolsUsed")),
        related: parseCsv(formData.get("related")),
        featured: formData.get("featured") === "on"
      })
    });

    activeEditorId = "";
    await loadProjects();
    setStatus("Metadata saved and gallery rebuilt.");
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
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
  list.addEventListener("submit", (event) => {
    handleListSubmit(event).catch((error) => setStatus(error.message));
  });

  renderPending();
  loadProjects().catch((error) => setStatus(error.message));
}());
