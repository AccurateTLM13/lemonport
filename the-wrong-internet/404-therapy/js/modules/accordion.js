/**
 * 404 Therapy — Documentation Accordion Module
 * Accessible, keyboard-navigable expand/collapse accordions.
 */

export function initAccordions() {
  const headers = document.querySelectorAll('.accordion-header');

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const body = item.querySelector('.accordion-body');
      const isOpen = item.classList.contains('open');

      // Optional: Close other accordions in the same container
      const parentContainer = item.closest('.doc-accordion');
      if (parentContainer) {
        parentContainer.querySelectorAll('.accordion-item').forEach(other => {
          if (other !== item && other.classList.contains('open')) {
            other.classList.remove('open');
            const otherBody = other.querySelector('.accordion-body');
            if (otherBody) otherBody.style.maxHeight = null;
            other.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
          }
        });
      }

      // Toggle current
      if (isOpen) {
        item.classList.remove('open');
        body.style.maxHeight = null;
        header.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        header.setAttribute('aria-expanded', 'true');
      }
    });

    // Keyboard support (Space and Enter handled natively by <button>)
  });
}
