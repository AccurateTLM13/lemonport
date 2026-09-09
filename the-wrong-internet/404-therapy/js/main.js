/**
 * 404 Therapy — Main Entry Point & Global Controllers
 * (Raycast / Resend + Octave Architecture)
 */

import { initDiagnosticConsole } from './modules/diagnostic.js';
import { initArchitectureGraph } from './modules/architecture-graph.js';
import { initMatcher } from './modules/matcher.js';
import { initAccordions } from './modules/accordion.js';
import { initBookingEngine } from './modules/booking.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Console Easter Egg (Per Section 25 of Brief)
  console.log(
    '%cHey.\n%cSince you\'re already inspecting things...\n\n%c404 Therapy%c\nhttps://404therapy.example\n\nYou can inspect your CSS here.\nFor everything else, we know some people.\n\nType %c/help%c to launch the clinical command palette.',
    'font-size: 16px; font-weight: bold; color: #FF625D;',
    'font-size: 12px; color: #A3A7B2;',
    'font-size: 14px; font-weight: bold; color: #A78BFA;',
    'font-size: 12px; color: #6EA8FF;',
    'background: #151821; color: #34D399; padding: 2px 6px; border-radius: 4px; font-family: monospace;',
    'color: #A3A7B2;'
  );

  // 2. Header Scroll Effect
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // 3. Command Palette Engine (Raycast Style)
  initCommandPalette();

  // 4. Initialize Core Modules
  initDiagnosticConsole();
  initArchitectureGraph();
  initMatcher();
  initAccordions();
  initBookingEngine();
});

/**
 * Command Palette Controller
 */
function initCommandPalette() {
  const modalBackdrop = document.querySelector('.command-palette-backdrop');
  const openBtns = document.querySelectorAll('.cmd-hint-btn, .trigger-command-palette');
  const input = document.querySelector('.command-input');
  const resultsList = document.querySelector('.command-results');

  if (!modalBackdrop || !input || !resultsList) return;

  const routes = [
    { name: 'Home — Overview & Diagnostics', url: './index.html', tag: 'PAGE', shortcut: 'H' },
    { name: 'Services — Specialty Tracks', url: './services.html', tag: 'SERVICES', shortcut: 'S' },
    { name: 'Therapists — Clinical Directory', url: './therapists.html', tag: 'TEAM', shortcut: 'T' },
    { name: 'How It Works — The 4-Stage Method', url: './how-it-works.html', tag: 'METHOD', shortcut: 'W' },
    { name: 'About — Practice Manifesto', url: './about.html', tag: 'ABOUT', shortcut: 'A' },
    { name: 'Documentation — Frequently Asked Questions', url: './faq.html', tag: 'DOCS', shortcut: 'F' },
    { name: 'Contact & Intake Triage', url: './contact.html', tag: 'CONTACT', shortcut: 'C' },
    { name: 'Book a Consultation Handshake', url: './book.html', tag: 'ACTION', shortcut: 'B' },
    { name: 'Inspect System Error (404 Page)', url: './404.html', tag: 'EASTER_EGG', shortcut: '404' }
  ];

  function openPalette() {
    modalBackdrop.classList.add('active');
    input.value = '';
    renderResults(routes);
    input.focus();
  }

  function closePalette() {
    modalBackdrop.classList.remove('active');
  }

  function renderResults(items) {
    resultsList.innerHTML = '';
    if (items.length === 0) {
      resultsList.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No matching routes found.</div>';
      return;
    }

    items.forEach((item, index) => {
      const a = document.createElement('a');
      a.href = item.url;
      a.className = `command-item ${index === 0 ? 'selected' : ''}`;
      a.innerHTML = `
        <div class="command-item-left">
          <span class="command-item-tag">${item.tag}</span>
          <span>${item.name}</span>
        </div>
        <kbd>${item.shortcut}</kbd>
      `;
      resultsList.appendChild(a);
    });
  }

  // Event Listeners
  openBtns.forEach(btn => btn.addEventListener('click', openPalette));

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closePalette();
  });

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const filtered = routes.filter(r => r.name.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q));
    renderResults(filtered);
  });

  // Global Keyboard Shortcuts (⌘K, Ctrl+K, /help, Escape)
  let keySequence = '';
  document.addEventListener('keydown', (e) => {
    // ⌘K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modalBackdrop.classList.contains('active')) {
        closePalette();
      } else {
        openPalette();
      }
      return;
    }

    // Escape
    if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
      closePalette();
      return;
    }

    // Arrow navigation in palette
    if (modalBackdrop.classList.contains('active')) {
      const items = resultsList.querySelectorAll('.command-item');
      let currentIndex = Array.from(items).findIndex(i => i.classList.contains('selected'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          if (items[currentIndex]) items[currentIndex].classList.remove('selected');
          items[currentIndex + 1].classList.add('selected');
          items[currentIndex + 1].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          if (items[currentIndex]) items[currentIndex].classList.remove('selected');
          items[currentIndex - 1].classList.add('selected');
          items[currentIndex - 1].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        if (items[currentIndex]) {
          items[currentIndex].click();
        }
      }
    }
  });
}
