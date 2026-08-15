/**
 * Junk Drawer Client Behaviors
 * Handles quick drop modal and local staging bin updates.
 */

(function () {
  'use strict';

  const STORAGE_KEY_STAGING = 'lemonteed_junk_drawer_staging_v1';

  function getStagingItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_STAGING);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStagingItem(item) {
    try {
      const items = getStagingItems();
      items.unshift(item);
      localStorage.setItem(STORAGE_KEY_STAGING, JSON.stringify(items));
    } catch (e) {}
  }

  function renderStagingBin() {
    const stagingShelf = document.getElementById('staging-bin-shelf');
    const stagingContainer = document.getElementById('staging-bin-grid');
    if (!stagingContainer || !stagingShelf) return;

    const items = getStagingItems();

    if (items.length === 0) {
      stagingShelf.style.display = 'none';
      return;
    }

    stagingShelf.style.display = 'block';
    const html = items.map((item) => {
      const safeTitle = escapeHtml(item.title || 'Untitled Drop');
      const safeUrl = escapeHtml(item.url || '#');
      const safeDesc = escapeHtml(item.description || 'Recently dropped into local staging.');
      const safeTray = escapeHtml(item.tray || 'General');

      return `
        <article class="junk-drawer-card junk-drawer-card--staged">
          <span class="junk-drawer-card__type">Staged • Target: ${safeTray}</span>
          <h4>${safeTitle}</h4>
          <p>${safeDesc}</p>
          <a href="${safeUrl}" target="_blank" rel="noopener" class="junk-drawer-card__cta junk-drawer-card__cta--secondary">
            Inspect Drop <span aria-hidden="true">&#8599;</span>
          </a>
        </article>
      `;
    }).join('');

    stagingContainer.innerHTML = html;
  }

  function initDropModal() {
    const modal = document.getElementById('junk-drawer-drop-modal');
    if (!modal) return;

    const form = document.getElementById('junk-drawer-drop-form');
    const closeBtn = document.getElementById('junk-drawer-drop-close');
    const traySelect = document.getElementById('junk-drawer-drop-tray');

    document.querySelectorAll('.junk-drawer-card--add').forEach((addBtn) => {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTray = addBtn.getAttribute('data-target-tray') || '';
        if (traySelect && targetTray) {
          traySelect.value = targetTray;
        }
        modal.classList.add('is-active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        const firstInput = form ? form.querySelector('input') : null;
        if (firstInput) {
          firstInput.focus({ preventScroll: true });
        }
      });
    });

    function closeModal() {
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (form) form.reset();
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-active')) closeModal();
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const urlInput = document.getElementById('junk-drawer-drop-url');
        const titleInput = document.getElementById('junk-drawer-drop-title');
        const descInput = document.getElementById('junk-drawer-drop-desc');
        const trayInput = document.getElementById('junk-drawer-drop-tray');

        if (!urlInput || !urlInput.value.trim()) return;

        const newItem = {
          id: 'drop-' + Date.now(),
          url: urlInput.value.trim(),
          title: titleInput ? titleInput.value.trim() : 'Dropped Tool',
          description: descInput ? descInput.value.trim() : 'Recently dropped link waiting for triage.',
          tray: trayInput ? trayInput.value : 'General',
          date: new Date().toISOString().slice(0, 10).replace(/-/g, '.')
        };

        saveStagingItem(newItem);
        renderStagingBin();
        closeModal();

        const stagingShelf = document.getElementById('staging-bin-shelf');
        if (stagingShelf) {
          stagingShelf.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStagingBin();
    initDropModal();
  });
})();
