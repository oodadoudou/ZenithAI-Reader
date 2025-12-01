const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const traps = new Map();

function isVisible(element) {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter((el) =>
    !el.hasAttribute('disabled') &&
    el.getAttribute('aria-hidden') !== 'true' &&
    isVisible(el)
  );
}

function resolveInitialFocus(container, target) {
  if (!target) return null;
  if (typeof target === 'string') {
    return container.querySelector(target);
  }
  if (target instanceof HTMLElement) {
    return target;
  }
  return null;
}

export function activateFocusTrap(container, options = {}) {
  if (!container) return;
  if (!container.hasAttribute('tabindex')) {
    container.setAttribute('tabindex', '-1');
  }
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const handleKeydown = (event) => {
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = getFocusable(container);
    if (!focusable.length) {
      event.preventDefault();
      container.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (!active || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', handleKeydown);
  const initialTarget = resolveInitialFocus(container, options.initialFocus) || getFocusable(container)[0];
  window.requestAnimationFrame(() => {
    if (initialTarget) {
      initialTarget.focus({ preventScroll: true });
    } else {
      container.focus({ preventScroll: true });
    }
  });
  traps.set(container, { handleKeydown, previouslyFocused });
}

export function deactivateFocusTrap(container) {
  if (!container) return;
  const trap = traps.get(container);
  if (!trap) return;
  container.removeEventListener('keydown', trap.handleKeydown);
  const { previouslyFocused } = trap;
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus({ preventScroll: true });
  }
  traps.delete(container);
}
