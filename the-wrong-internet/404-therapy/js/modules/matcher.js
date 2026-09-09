/**
 * 404 Therapy — Clinician Compatibility Matcher Module
 * Allows interactive filtering of clinical needs to recommend matching therapists.
 */

export function initMatcher() {
  const options = document.querySelectorAll('.matcher-option-row');
  const matchBtn = document.querySelector('.matcher-submit-btn');
  const resultsContainer = document.querySelector('.matcher-results');
  const formContainer = document.querySelector('.matcher-step-form');
  const resetBtn = document.querySelector('.matcher-reset-btn');

  if (!options.length || !matchBtn) return;

  // Toggle selection
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      opt.classList.toggle('selected');
      updateMatchButton();
    });
  });

  // Keyboard shortcut listener for options [1], [2], [3], [4]
  document.addEventListener('keydown', (e) => {
    // Only if not typing in an input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const key = e.key;
    if (['1', '2', '3', '4'].includes(key)) {
      const idx = parseInt(key, 10) - 1;
      if (options[idx]) {
        options[idx].classList.toggle('selected');
        updateMatchButton();
      }
    }
  });

  function updateMatchButton() {
    const selectedCount = document.querySelectorAll('.matcher-option-row.selected').length;
    if (selectedCount > 0) {
      matchBtn.removeAttribute('disabled');
      matchBtn.textContent = `Match with clinician (${selectedCount} selected) [↵]`;
    } else {
      matchBtn.textContent = 'Select at least one focus area';
    }
  }

  matchBtn.addEventListener('click', () => {
    const selectedOptions = Array.from(document.querySelectorAll('.matcher-option-row.selected'))
      .map(el => el.getAttribute('data-value'));

    if (selectedOptions.length === 0) return;

    // Determine best therapist match based on primary selected tag
    let recommended = {
      name: 'Dr. Maya Chen, PhD',
      role: 'Licensed Clinical Psychologist (Stanford)',
      specialty: 'High-Functioning Anxiety & Boundary Architecture',
      matchScore: '98% Compatibility',
      photo: './assets/therapist-maya.webp',
      id: 'dr-maya-chen'
    };

    if (selectedOptions.includes('burnout') && !selectedOptions.includes('anxiety')) {
      recommended = {
        name: 'Dr. Elena Rostova, PsyD',
        role: 'Cognitive Science & Occupational Burnout Specialist',
        specialty: 'Executive Exhaustion, Depletion & Life Transitions',
        matchScore: '96% Compatibility',
        photo: './assets/therapist-elena.webp',
        id: 'dr-elena-rostova'
      };
    } else if (selectedOptions.includes('relationships')) {
      recommended = {
        name: 'Marcus Vance, LMFT',
        role: 'Licensed Marriage & Family Therapist',
        specialty: 'Systemic Relationship Loops & Attachment Dynamics',
        matchScore: '97% Compatibility',
        photo: './assets/therapist-marcus.webp',
        id: 'marcus-vance'
      };
    }

    if (resultsContainer && formContainer) {
      const resultCard = resultsContainer.querySelector('.matched-clinician-preview');
      if (resultCard) {
        resultCard.innerHTML = `
          <div style="display: flex; gap: 18px; align-items: center; margin-bottom: 16px;">
            <img src="${recommended.photo}" alt="${recommended.name}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-violet);">
            <div>
              <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-emerald); margin-bottom: 4px;">● ${recommended.matchScore}</div>
              <h4 style="font-size: 1.15rem; color: #fff; margin-bottom: 2px;">${recommended.name}</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">${recommended.role}</p>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Specialized in: <strong style="color: var(--text-primary);">${recommended.specialty}</strong></p>
          <div style="display: flex; gap: 10px;">
            <a href="./book.html?therapist=${recommended.id}" class="btn btn-primary btn-sm" style="flex-grow: 1;">Book Handshake Call [↵]</a>
            <button class="btn btn-secondary btn-sm matcher-reset-btn" type="button">Reset</button>
          </div>
        `;

        const newResetBtn = resultCard.querySelector('.matcher-reset-btn');
        if (newResetBtn) {
          newResetBtn.addEventListener('click', () => {
            resultsContainer.classList.remove('active');
            formContainer.style.display = 'block';
          });
        }
      }

      formContainer.style.display = 'none';
      resultsContainer.classList.add('active');
    }
  });
}
