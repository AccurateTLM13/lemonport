(function () {
  const form = document.querySelector("[data-project-form]");
  const list = document.querySelector("[data-project-list]");
  const status = document.querySelector("[data-status]");
  const count = document.querySelector("[data-count]");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));

  let projects = [];
  let activeFilter = "all";

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
      const card = document.createElement("article");
      card.className = `project-card${project.visible === false ? " is-hidden" : ""}`;
      card.innerHTML = `
        <img src="${escapeHtml(project.sizes.small)}" alt="">
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
          <button type="button" data-toggle="${escapeHtml(project.id)}">${project.visible === false ? "Show" : "Hide"}</button>
          <button class="delete-button" type="button" data-delete="${escapeHtml(project.id)}">Delete</button>
        </div>
      `;
      list.append(card);
    });
  }

  async function loadProjects() {
    const data = await api("/api/projects");
    projects = data.projects || [];
    render();
  }

  async function submitProject(event) {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const image = formData.get("image");

    if (!image || !image.size) {
      setStatus("Choose an image first.");
      return;
    }

    submitButton.disabled = true;
    setStatus("Uploading image, generating WebP variants, and rebuilding gallery data...");

    try {
      await api("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          category: formData.get("category"),
          year: formData.get("year"),
          description: formData.get("description"),
          alt: formData.get("alt"),
          visible: formData.get("visible") === "on",
          imageName: image.name,
          imageData: await readFileAsDataUrl(image)
        })
      });

      form.reset();
      form.elements.visible.checked = true;
      await loadProjects();
      setStatus("Project uploaded. The static gallery has been rebuilt.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleListClick(event) {
    const toggle = event.target.closest("[data-toggle]");
    const remove = event.target.closest("[data-delete]");

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

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  form.addEventListener("submit", submitProject);
  list.addEventListener("click", (event) => {
    handleListClick(event).catch((error) => setStatus(error.message));
  });

  loadProjects().catch((error) => setStatus(error.message));
}());
