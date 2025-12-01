const FORWARD_KEYS = new Set(['ArrowRight', 'PageDown']);
const BACKWARD_KEYS = new Set(['ArrowLeft', 'PageUp']);
const SPACE_KEYS = new Set([' ', 'Spacebar']);

function isInteractiveElement(target) {
  if (!target) return false;
  const interactive = target.closest('input, button, select, textarea, [contenteditable="true"]');
  return Boolean(interactive);
}

function isLowPowerDevice() {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 0;
  return cores > 0 && cores <= 2;
}

export class PageFlipController {
  constructor(stageElement, { onNavigate, duration = 750 } = {}) {
    this.stage = stageElement;
    this.turnLayer = stageElement?.querySelector('[data-page-turn]');
    this.onNavigate = onNavigate;
    this.duration = duration;
    this.inFlight = false;
    this.pointerStart = null;
    this.pointerId = null;
    this.lowPower = isLowPowerDevice();
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionQuery.addEventListener('change', this.handleMotionChange);
    this.animationsEnabled = this.shouldAnimate();
    this.attachEvents();
  }

  shouldAnimate() {
    const reduceMotion = this.motionQuery?.matches ?? false;
    return Boolean(this.turnLayer) && !reduceMotion && !this.lowPower;
  }

  handleMotionChange = (event) => {
    this.animationsEnabled = Boolean(this.turnLayer) && !event.matches && !this.lowPower;
    if (!this.animationsEnabled) {
      this.resetAnimationState();
    }
  };

  attachEvents() {
    if (this.stage) {
      this.stage.addEventListener('pointerdown', this.handlePointerDown);
      this.stage.addEventListener('pointerup', this.handlePointerUp);
      this.stage.addEventListener('pointercancel', this.handlePointerCancel);
      this.stage.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }
    window.addEventListener('keydown', this.handleKeydown);
  }

  handleTouchMove = (event) => {
    if (this.pointerId !== null) {
      event.preventDefault();
    }
  };

  handleKeydown = (event) => {
    if (event.defaultPrevented || isInteractiveElement(event.target)) {
      return;
    }
    if (FORWARD_KEYS.has(event.key) || (SPACE_KEYS.has(event.key) && !event.repeat)) {
      event.preventDefault();
      this.handleInternalNavigation('forward');
      return;
    }
    if (BACKWARD_KEYS.has(event.key)) {
      event.preventDefault();
      this.handleInternalNavigation('backward');
    }
  };

  handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    this.pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
    this.pointerId = event.pointerId;
    if (typeof event.target.setPointerCapture === 'function') {
      event.target.setPointerCapture(this.pointerId);
    }
  };

  handlePointerUp = (event) => {
    if (this.pointerId === null || event.pointerId !== this.pointerId || !this.pointerStart) {
      return;
    }
    if (typeof event.target.releasePointerCapture === 'function') {
      event.target.releasePointerCapture(this.pointerId);
    }
    const dx = event.clientX - this.pointerStart.x;
    const dy = Math.abs(event.clientY - this.pointerStart.y);
    const dt = performance.now() - this.pointerStart.time;
    const fastGesture = dt < 600;
    const traveledEnough = Math.abs(dx) > 45 && dy < 80;
    this.resetPointerTracking();
    if (!traveledEnough || !fastGesture) {
      return;
    }
    this.handleInternalNavigation(dx < 0 ? 'forward' : 'backward');
  };

  handlePointerCancel = () => {
    if (this.stage && typeof this.stage.releasePointerCapture === 'function' && this.pointerId !== null) {
      this.stage.releasePointerCapture(this.pointerId);
    }
    this.resetPointerTracking();
  };

  resetPointerTracking() {
    this.pointerStart = null;
    this.pointerId = null;
  }

  runWithAnimation(delta, action) {
    if (this.animationsEnabled && this.inFlight) {
      return false;
    }
    const direction = delta >= 0 ? 'forward' : 'backward';
    if (this.animationsEnabled) {
      this.startAnimation(direction);
    }
    action?.();
    return true;
  }

  handleInternalNavigation(direction) {
    if (this.animationsEnabled) {
      if (this.inFlight) {
        return;
      }
      this.startAnimation(direction);
    }
    if (typeof this.onNavigate === 'function') {
      this.onNavigate(direction);
    }
  }

  startAnimation(direction) {
    if (!this.turnLayer || !this.stage) {
      return;
    }
    this.inFlight = true;
    this.stage.classList.add('is-flipping');
    this.stage.setAttribute('data-flip-direction', direction);
    this.turnLayer.classList.remove('flip-forward', 'flip-backward');
    if (direction === 'forward') {
      this.turnLayer.classList.add('flip-forward');
    } else {
      this.turnLayer.classList.add('flip-backward');
    }
    window.clearTimeout(this.resetTimeout);
    this.resetTimeout = window.setTimeout(() => {
      this.resetAnimationState();
      emitMetric({ label: 'page-turn', durationMs: this.duration });
    }, this.duration);
  }

  resetAnimationState() {
    if (!this.stage || !this.turnLayer) {
      this.inFlight = false;
      return;
    }
    this.stage.classList.remove('is-flipping');
    this.stage.removeAttribute('data-flip-direction');
    this.turnLayer.classList.remove('flip-forward', 'flip-backward');
    this.inFlight = false;
  }
}
import { emitMetric } from '../utils/telemetry.js';
