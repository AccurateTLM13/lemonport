/**
 * 404 Therapy — Hero Diagnostic Console Module
 * Simulates interactive system telemetry and pattern detection.
 */

export function initDiagnosticConsole() {
  const rerunBtn = document.querySelector('.rerun-diagnostic-btn');
  const diagnosticBody = document.querySelector('.diagnostic-body');
  const summaryText = document.querySelector('.diagnostic-summary span');
  const statusTag = document.querySelector('.hero-status-tag .status-text');

  if (!rerunBtn || !diagnosticBody) return;

  const telemetryProfiles = [
    {
      items: [
        { key: 'sleep', val: 'unstable (4.5h avg)', class: 'unstable' },
        { key: 'motivation', val: 'intermittent', class: 'intermittent' },
        { key: 'work-life-boundary', val: 'not found (404)', class: 'not-found' },
        { key: '"i\'m fine"', val: 'deprecated', class: 'deprecated' },
        { key: 'overthinking', val: 'running (37 tabs open)', class: 'running' }
      ],
      patterns: '3 recurring patterns detected',
      advice: 'That might be worth talking about.'
    },
    {
      items: [
        { key: 'emotional-bandwidth', val: 'throttled (12% capacity)', class: 'unstable' },
        { key: 'slack-notifications', val: 'handled with dread', class: 'running' },
        { key: 'boundary-assertions', val: 'followed by 3-paragraph apology', class: 'intermittent' },
        { key: 'relaxation-state', val: 'attempted aggressively', class: 'not-found' },
        { key: 'self-criticism', val: 'high concurrency', class: 'running' }
      ],
      patterns: '4 dependency conflicts detected',
      advice: 'System operating beyond recommended duty cycle.'
    },
    {
      items: [
        { key: 'relationship-arguments', val: 'same conflict, new timestamp', class: 'unstable' },
        { key: 'needs-communication', val: 'delayed until boiling point', class: 'not-found' },
        { key: 'assumed-malice', val: 'heuristic active', class: 'intermittent' },
        { key: 'silence-interpretation', val: 'interpreted as hostility', class: 'running' },
        { key: 'vulnerability-handshake', val: 'timed out', class: 'deprecated' }
      ],
      patterns: 'Loop condition detected in communication sub-routine',
      advice: 'Breaking changes optional; trace dependencies first.'
    }
  ];

  let currentProfileIndex = 0;

  function renderProfile(profile) {
    diagnosticBody.innerHTML = '';
    
    // Animate item insertion sequentially
    profile.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'telemetry-row';
      row.style.opacity = '0';
      row.style.transform = 'translateY(4px)';
      row.style.transition = 'all 0.2s ease ' + (index * 0.08) + 's';
      
      row.innerHTML = `
        <span class="telemetry-key">${item.key}</span>
        <span class="telemetry-val ${item.class}">${item.val}</span>
      `;
      
      diagnosticBody.appendChild(row);
      
      // Trigger animation
      setTimeout(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
      }, 20);
    });

    if (summaryText) {
      summaryText.textContent = `${profile.patterns} — ${profile.advice}`;
    }

    if (statusTag) {
      statusTag.textContent = 'SYSTEM STATUS: human · inspecting';
      setTimeout(() => {
        statusTag.textContent = 'SYSTEM STATUS: human · online';
      }, 1500);
    }
  }

  rerunBtn.addEventListener('click', () => {
    currentProfileIndex = (currentProfileIndex + 1) % telemetryProfiles.length;
    renderProfile(telemetryProfiles[currentProfileIndex]);
  });

  // Listen for Enter key on the command row
  const cmdRow = document.querySelector('.diagnostic-cmd-row');
  if (cmdRow) {
    cmdRow.addEventListener('click', () => {
      rerunBtn.click();
    });
  }
}
