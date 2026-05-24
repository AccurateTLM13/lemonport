// Minimal state driver for the Nothing Factory machine.
// Wire this to the existing MDR checkout drawer logic.
function runNothingMachine(machine) {
  if (!machine) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    machine.dataset.state = 'checkout';
    machine.dispatchEvent(new CustomEvent('nothing-machine:checkout-ready', { bubbles: true }));
    return;
  }
  const steps = [
    ['intake', 150],
    ['conveyor', 1450],
    ['scan', 780],
    ['print', 650],
    ['checkout', 0]
  ];
  let t = 0;
  steps.forEach(([state, duration]) => {
    window.setTimeout(() => {
      machine.dataset.state = state;
      if (state === 'checkout') {
        machine.dispatchEvent(new CustomEvent('nothing-machine:checkout-ready', { bubbles: true }));
      }
    }, t);
    t += duration;
  });
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('#mdr-buy-button-machine, .nothing-machine__hitbox');
  if (!btn) return;
  const machine = btn.closest('.nothing-machine') || document.getElementById('nothing-machine');
  runNothingMachine(machine);
});
