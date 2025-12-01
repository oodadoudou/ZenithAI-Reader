const METRIC_EVENT = 'paperread:metric';

function dispatchMetric(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(METRIC_EVENT, { detail: { ...detail, at: Date.now() } }));
}

export function getMetricEventName() {
  return METRIC_EVENT;
}

export function emitMetric(detail) {
  dispatchMetric(detail);
}

export function measureMetric(label, fn) {
  const start = performance.now();
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result.then((value) => {
      dispatchMetric({ label, durationMs: performance.now() - start });
      return value;
    });
  }
  dispatchMetric({ label, durationMs: performance.now() - start });
  return result;
}
