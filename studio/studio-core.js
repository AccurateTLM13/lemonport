/**
 * Lemonteed Studio V2 — Core Host
 *
 * The workspace registry. studio-core.js is the only global script.
 * It sets up the Studio context object (ctx) and passes it to each
 * registered workspace on activation. Workspaces never share scope —
 * they only receive ctx.
 *
 * Usage (in each workspace file):
 *
 *   Studio.register({
 *     id: "specimens",
 *     label: "Specimen Vault",
 *     icon: "🧪",
 *     group: "content",       // "content" | "tools" | "system"
 *     init(ctx) { ... },
 *     teardown() { ... }      // optional cleanup on navigate-away
 *   });
 */

(function () {
  "use strict";

  // ── Internal state ──────────────────────────────────────────────────────────

  const registry = new Map();      // id → workspace definition
  const teardowns = new Map();     // id → teardown function (registered by workspace via ctx.onLeave)
  let activeId = null;
  let dirtyFlag = false;
  let dirtyMessage = "You have unsaved changes. Leave anyway?";

  // Shared data store — single source of truth, never mutated directly by workspaces
  const store = {
    _data: {},
    get(key) { return this._data[key]; },
    set(key, value) { this._data[key] = value; },
    merge(key, updater) {
      this._data[key] = updater(this._data[key]);
    }
  };

  // ── Toast / status system ───────────────────────────────────────────────────

  let toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.getElementById("studio-toasts");
    }
    return toastContainer;
  }

  function setStatus(message, type = "ok") {
    const container = getToastContainer();
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `studio-toast studio-toast--${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;

    // Dismiss on click
    toast.addEventListener("click", () => toast.remove());

    container.appendChild(toast);

    // Auto-expire: errors stay 6s, others 3s
    const ttl = type === "error" ? 6000 : 3000;
    setTimeout(() => toast.remove(), ttl);
  }

  // ── API helper ──────────────────────────────────────────────────────────────

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      ...options,
      body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || `API error ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // ── AI (Ollama) helper ──────────────────────────────────────────────────────

  let aiStatus = null; // cached: { available, models, activeModel, config }

  const ai = {
    async getStatus(force = false) {
      if (!aiStatus || force) {
        try {
          aiStatus = await api("/api/ai/status");
        } catch {
          aiStatus = { available: false, models: [], config: {} };
        }
      }
      return aiStatus;
    },

    isEnabled(workspaceId) {
      if (!aiStatus?.available) return false;
      const ws = aiStatus?.config?.workspaces || {};
      return ws[workspaceId] !== false;
    },

    async suggest({ workspaceId, field, context }) {
      const data = await api("/api/ai/suggest", {
        method: "POST",
        body: { workspaceId, field, context }
      });
      return data.suggestion;
    },

    /**
     * Injects a ✨ button next to a field element.
     * When clicked: shows spinner → calls suggest → shows inline accept/dismiss UI.
     *
     * @param {HTMLElement} fieldEl   The input/textarea to enhance
     * @param {object}      options
     *   workspaceId {string}
     *   field       {string}
     *   context     {() => object}  Function that returns current form values
     *   onAccept    {(value) => void} Called when user accepts suggestion
     */
    renderButton(fieldEl, { workspaceId, field, context, onAccept }) {
      if (!this.isEnabled(workspaceId)) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-suggest-btn";
      btn.title = `Ask AI to suggest ${field}`;
      btn.textContent = "✨";

      fieldEl.parentNode.insertBefore(btn, fieldEl.nextSibling);

      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "…";

        try {
          const suggestion = await ai.suggest({ workspaceId, field, context: context() });
          showSuggestion(fieldEl, suggestion, onAccept, btn);
        } catch (err) {
          setStatus(`AI suggestion failed: ${err.message}`, "error");
          btn.disabled = false;
          btn.textContent = "✨";
        }
      });
    }
  };

  function showSuggestion(fieldEl, suggestion, onAccept, triggerBtn) {
    // Remove any existing suggestion panel
    const existing = fieldEl.parentNode.querySelector(".ai-suggestion");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.className = "ai-suggestion";
    panel.innerHTML = `
      <div class="ai-suggestion__text">${escapeHtml(suggestion)}</div>
      <div class="ai-suggestion__actions">
        <button type="button" class="ai-suggestion__accept">Accept</button>
        <button type="button" class="ai-suggestion__dismiss">Dismiss</button>
      </div>
    `;

    panel.querySelector(".ai-suggestion__accept").addEventListener("click", () => {
      onAccept(suggestion);
      panel.remove();
      triggerBtn.disabled = false;
      triggerBtn.textContent = "✨";
    });

    panel.querySelector(".ai-suggestion__dismiss").addEventListener("click", () => {
      panel.remove();
      triggerBtn.disabled = false;
      triggerBtn.textContent = "✨";
    });

    fieldEl.parentNode.insertBefore(panel, fieldEl.nextSibling);
  }

  // ── Workspace navigation ────────────────────────────────────────────────────

  const mount = () => document.getElementById("studio-mount");
  const navEl = () => document.getElementById("studio-nav");

  function buildNav() {
    const nav = navEl();
    if (!nav) return;

    const groups = { content: [], tools: [], system: [] };
    for (const [, ws] of registry) {
      const group = ws.group || "tools";
      (groups[group] || groups.tools).push(ws);
    }

    nav.innerHTML = "";

    for (const [groupKey, workspaces] of Object.entries(groups)) {
      if (!workspaces.length) continue;

      const section = document.createElement("div");
      section.className = `nav-group nav-group--${groupKey}`;

      if (groupKey !== "content") {
        const label = document.createElement("span");
        label.className = "nav-group__label";
        label.textContent = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
        section.appendChild(label);
      }

      for (const ws of workspaces) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav-btn";
        btn.dataset.workspaceId = ws.id;
        btn.setAttribute("aria-label", ws.label);
        btn.innerHTML = `<span class="nav-btn__icon">${ws.icon || "◆"}</span><span class="nav-btn__label">${escapeHtml(ws.label)}</span>`;
        btn.addEventListener("click", () => navigate(ws.id));
        section.appendChild(btn);
      }

      nav.appendChild(section);
    }
  }

  function updateNavActive(id) {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.workspaceId === id);
    });
  }

  async function navigate(id, force = false) {
    if (id === activeId) return;

    // Dirty state guard
    if (dirtyFlag && !force) {
      if (!window.confirm(dirtyMessage)) return;
      dirtyFlag = false;
    }

    // Teardown current workspace
    if (activeId && teardowns.has(activeId)) {
      try { teardowns.get(activeId)(); } catch (e) { console.warn("Teardown error:", e); }
      teardowns.delete(activeId);
    }

    const ws = registry.get(id);
    if (!ws) {
      console.warn(`Studio: no workspace registered for id="${id}"`);
      return;
    }

    // Animate mount out
    const m = mount();
    if (m) {
      m.classList.add("is-leaving");
      await new Promise((r) => setTimeout(r, 120));
      m.innerHTML = "";
      m.classList.remove("is-leaving");
    }

    activeId = id;
    dirtyFlag = false;
    updateNavActive(id);

    // Update URL state without reload
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", id);
    window.history.replaceState({}, "", url);

    // Build context for this workspace
    const ctx = buildCtx(id);

    // Activate workspace
    try {
      await ws.init(ctx);
    } catch (err) {
      console.error(`Workspace "${id}" init error:`, err);
      if (m) m.innerHTML = `<div class="workspace-error"><p>Failed to load workspace: ${escapeHtml(err.message)}</p></div>`;
    }

    // Animate mount in
    if (m) {
      m.classList.add("is-entering");
      requestAnimationFrame(() => m.classList.remove("is-entering"));
    }
  }

  // ── Context factory ─────────────────────────────────────────────────────────

  function buildCtx(workspaceId) {
    return {
      workspaceId,

      // Data store
      store,

      // API
      api,

      // Status
      setStatus,

      // Navigation
      navigate,

      // Workspace lifecycle
      onLeave(callback) {
        teardowns.set(workspaceId, callback);
      },

      // Dirty state
      markDirty(message) {
        dirtyFlag = true;
        if (message) dirtyMessage = message;
      },
      markClean() {
        dirtyFlag = false;
        dirtyMessage = "You have unsaved changes. Leave anyway?";
      },

      // Mount element — workspace renders into this
      get mount() { return mount(); },

      // AI
      ai: {
        isEnabled: () => ai.isEnabled(workspaceId),
        suggest: (opts) => ai.suggest({ workspaceId, ...opts }),
        renderButton: (fieldEl, opts) => ai.renderButton(fieldEl, { workspaceId, ...opts })
      }
    };
  }

  // ── Boot sequence ───────────────────────────────────────────────────────────

  async function boot() {
    // Load initial data
    try {
      const data = await api("/api/projects");
      store.set("projects", data.projects || []);
      store.set("categories", data.categories || []);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }

    // Warm AI status cache
    ai.getStatus();

    // Build nav from registry
    buildNav();

    // Determine initial workspace from URL or default
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("workspace") || "dashboard";

    await navigate(registry.has(initial) ? initial : "dashboard");
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.Studio = {
    register(definition) {
      if (!definition.id) throw new Error("Studio.register: id is required");
      if (!definition.init) throw new Error("Studio.register: init is required");
      registry.set(definition.id, definition);
    },

    navigate,
    setStatus,
    store,
    get activeId() { return activeId; },

    boot
  };

  // ── Utility (shared by workspaces via closure) ──────────────────────────────

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Make escapeHtml available globally for workspace files
  window.StudioUtils = { escapeHtml };

  // Boot when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
