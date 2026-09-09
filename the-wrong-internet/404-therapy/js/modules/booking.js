/**
 * 404 Therapy — Consultation Booking Engine Module
 * Multi-step interactive scheduling flow for initial handshake sessions.
 */

export function initBookingEngine() {
  const wizard = document.querySelector('.booking-wizard');
  if (!wizard) return;

  const steps = wizard.querySelectorAll('.wizard-step');
  const nextBtns = wizard.querySelectorAll('.wizard-next-btn');
  const prevBtns = wizard.querySelectorAll('.wizard-prev-btn');
  const progressIndicators = wizard.querySelectorAll('.wizard-progress-dot');
  const ticketCodeEl = wizard.querySelector('.ticket-ref-code');

  let currentStep = 1;
  const bookingData = {
    track: 'anxiety',
    therapist: 'maya',
    slot: '2026-09-15 10:00 AM EST',
    name: '',
    email: '',
    notes: ''
  };

  // Pre-fill therapist from URL params if present
  const urlParams = new URLSearchParams(window.location.search);
  const therapistParam = urlParams.get('therapist');
  if (therapistParam) {
    const radio = wizard.querySelector(`input[name="therapist"][value="${therapistParam}"]`);
    if (radio) radio.checked = true;
  }

  function goToStep(stepNumber) {
    steps.forEach(step => {
      if (parseInt(step.getAttribute('data-step'), 10) === stepNumber) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    progressIndicators.forEach(dot => {
      const dotStep = parseInt(dot.getAttribute('data-step'), 10);
      if (dotStep === stepNumber) {
        dot.classList.add('active');
        dot.classList.remove('completed');
      } else if (dotStep < stepNumber) {
        dot.classList.add('completed');
        dot.classList.remove('active');
      } else {
        dot.classList.remove('active', 'completed');
      }
    });

    currentStep = stepNumber;
    window.scrollTo({ top: wizard.offsetTop - 80, behavior: 'smooth' });
  }

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Validate current step
      if (currentStep === 4) {
        const nameInput = wizard.querySelector('#client-name');
        const emailInput = wizard.querySelector('#client-email');
        if (!nameInput.value || !emailInput.value) {
          alert('Please provide your name and email to initialize the session.');
          return;
        }
        bookingData.name = nameInput.value;
        bookingData.email = emailInput.value;

        // Generate confirmation ticket code
        const refCode = `DBG-${Math.floor(1000 + Math.random() * 9000)}-OK`;
        if (ticketCodeEl) ticketCodeEl.textContent = refCode;

        const summaryName = wizard.querySelector('.ticket-summary-name');
        if (summaryName) summaryName.textContent = bookingData.name;

        const summarySlot = wizard.querySelector('.ticket-summary-slot');
        if (summarySlot) summarySlot.textContent = bookingData.slot;
      }

      if (currentStep < steps.length) {
        goToStep(currentStep + 1);
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  });

  // Track slot clicks
  const slotOptions = wizard.querySelectorAll('.slot-option');
  slotOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      slotOptions.forEach(s => s.classList.remove('selected'));
      opt.classList.add('selected');
      bookingData.slot = opt.getAttribute('data-slot');
    });
  });
}
