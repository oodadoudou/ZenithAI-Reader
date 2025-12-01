import { loadConfig } from '../utils/config.js';
import { summarizeAudioCache } from '../storage/audio-cache.js';
import { getMetricEventName } from '../utils/telemetry.js';

function formatBytes(value) {
  if (!value && value !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = value;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  const precision = v >= 10 ? 0 : 1;
  return `${v.toFixed(precision)} ${units[idx]}`;
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export class DiagnosticsPanel {
  constructor({ context = 'app', refreshInterval = 6000, enableMetrics = false } = {}) {
    this.context = context;
    this.refreshInterval = refreshInterval;
    this.container = null;
    this.timer = null;
    this.metricsEnabled = enableMetrics;
    this.voiceStats = {
      totalSynths: 0,
      totalCharacters: 0,
      lastProvider: null,
      lastDurationMs: null,
      lastEvent: null,
    };
    this.metricStats = {};
  }

  async mount() {
    if (this.container || !document?.body) return;
    this.container = document.createElement('aside');
    this.container.className = 'diagnostics-panel pointer-events-none fixed bottom-6 right-6 hidden w-80 max-w-[calc(100%-2rem)] rounded-3xl glass-panel px-5 py-4 text-sm shadow-ios-md shadow-black/10 dark:shadow-black/50 sm:block';
    this.container.setAttribute('aria-live', 'polite');
    this.container.innerHTML = `
      <div class="flex items-center justify-between text-xs tracking-wide uppercase text-ink-600/70 dark:text-paper-200/80">
        <span>Diagnostics</span>
        <span class="font-semibold">${this.context}</span>
      </div>
      <dl class="mt-3 space-y-2 text-xs text-ink-600 dark:text-paper-200" data-diag-list>
        <div class="flex justify-between"><dt>App mode</dt><dd data-diag-app>—</dd></div>
        <div class="flex justify-between"><dt>Storage</dt><dd data-diag-storage>—</dd></div>
        <div class="flex justify-between"><dt>OPFS</dt><dd data-diag-opfs>—</dd></div>
        <div class="flex justify-between"><dt>Audio cache</dt><dd data-diag-audio>—</dd></div>
        <div class="flex justify-between"><dt>Last synth</dt><dd data-diag-voice>—</dd></div>
        <div class="flex justify-between"><dt>Parser</dt><dd data-diag-metric="parser">—</dd></div>
        <div class="flex justify-between"><dt>Reader render</dt><dd data-diag-metric="reader-render">—</dd></div>
        <div class="flex justify-between"><dt>Library render</dt><dd data-diag-metric="library-render">—</dd></div>
        <div class="flex justify-between"><dt>Page turn</dt><dd data-diag-metric="page-turn">—</dd></div>
        <div class="flex justify-between"><dt>Search</dt><dd data-diag-metric="search">—</dd></div>
        <div class="flex justify-between"><dt>Audio queue</dt><dd data-diag-metric="audio-queue">—</dd></div>
        <div class="mt-2 flex justify-between"><dt>Budget</dt><dd data-diag-budget>—</dd></div>
      </dl>
    `;
    document.body.appendChild(this.container);
    this.startVoiceListener();
    if (this.metricsEnabled) {
      this.startMetricListener();
    }
    await this.refresh();
    this.startPolling();
  }

  destroy() {
    window.clearInterval(this.timer);
    this.timer = null;
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    window.removeEventListener('paperread:voice-telemetry', this.handleVoiceEvent);
    if (this.metricsEnabled) {
      window.removeEventListener(getMetricEventName(), this.handleMetricEvent);
    }
  }

  startVoiceListener() {
    window.addEventListener('paperread:voice-telemetry', this.handleVoiceEvent);
  }

  startMetricListener() {
    window.addEventListener(getMetricEventName(), this.handleMetricEvent);
  }

  handleVoiceEvent = (event) => {
    const detail = event?.detail;
    if (!detail) return;
    this.voiceStats.totalSynths += 1;
    this.voiceStats.totalCharacters += detail.characters ?? 0;
    this.voiceStats.lastDurationMs = detail.durationMs ?? null;
    this.voiceStats.lastProvider = detail.provider || 'unknown';
    this.voiceStats.lastEvent = new Date();
    this.updateVoiceSummary();
  };

  handleMetricEvent = (event) => {
    const detail = event?.detail;
    if (!detail?.label) return;
    this.metricStats[detail.label] = detail;
    this.updateMetricDisplays();
  };

  startPolling() {
    this.timer = window.setInterval(() => {
      this.refresh();
    }, this.refreshInterval);
  }

  async refresh() {
    if (!this.container) return;
    const [config, storageEstimate] = await Promise.all([
      loadConfig(),
      navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve({}),
    ]);
    const appNode = this.container.querySelector('[data-diag-app]');
    const storageNode = this.container.querySelector('[data-diag-storage]');
    const opfsNode = this.container.querySelector('[data-diag-opfs]');
    const audioNode = this.container.querySelector('[data-diag-audio]');

    if (appNode) {
      appNode.textContent = `${config.APP_MODE ?? 'local'} · ${config.TTS_PROVIDER_DEFAULT ?? 'offline'}`;
    }
    if (storageNode) {
      const usage = storageEstimate?.usage ?? 0;
      const quota = storageEstimate?.quota ?? 0;
      const ratio = quota ? usage / quota : 0;
      storageNode.textContent = `${formatBytes(usage)} / ${formatBytes(quota)} (${formatPercent(ratio)})`;
    }
    if (opfsNode) {
      const opfs = Boolean(navigator.storage?.getDirectory);
      opfsNode.textContent = opfs ? 'available' : 'fallback';
    }
    if (audioNode) {
      const summary = summarizeAudioCache();
      audioNode.textContent = `${summary.booksWithAudio} books · ${summary.offlineEntries}/${summary.onlineEntries} tracks`;
    }
    this.updateVoiceSummary();
    this.updateMetricDisplays(config);
  }

  updateVoiceSummary() {
    if (!this.container) return;
    const voiceNode = this.container.querySelector('[data-diag-voice]');
    if (!voiceNode) return;
    if (!this.voiceStats.totalSynths) {
      voiceNode.textContent = '—';
      return;
    }
    const parts = [`${this.voiceStats.lastProvider}`];
    if (this.voiceStats.lastDurationMs) {
      parts.push(`${Math.round(this.voiceStats.lastDurationMs)}ms`);
    }
    parts.push(`${this.voiceStats.totalSynths}x · ${this.voiceStats.totalCharacters} chars`);
    voiceNode.textContent = parts.join(' · ');
  }

  updateMetricDisplays(config) {
    if (!this.container || !this.metricsEnabled) return;
    const nodes = this.container.querySelectorAll('[data-diag-metric]');
    nodes.forEach((node) => {
      const key = node.getAttribute('data-diag-metric');
      const metric = this.metricStats[key];
      if (!metric) {
        node.textContent = '—';
        return;
      }
      const duration = typeof metric.durationMs === 'number' ? `${Math.round(metric.durationMs)} ms` : '—';
      node.textContent = `${duration}`;
    });
    const budgetNode = this.container.querySelector('[data-diag-budget]');
    if (budgetNode && config?.performanceBudget) {
      const b = config.performanceBudget;
      const p = this.metricStats['reader-render']?.durationMs;
      const t = this.metricStats['page-turn']?.durationMs;
      const s = this.metricStats['search']?.durationMs;
      const aq = this.metricStats['audio-queue']?.durationMs;
      const parts = [];
      if (typeof p === 'number') parts.push(`render ${Math.round(p)}≤${b.readerRenderMs}ms`);
      if (typeof t === 'number') parts.push(`turn ${Math.round(t)}≤${b.pageTurnMs}ms`);
      if (typeof s === 'number') parts.push(`search ${Math.round(s)}≤${b.searchMs}ms`);
      if (typeof aq === 'number') parts.push(`audio ${Math.round(aq)}≤${b.audioQueueMs}ms`);
      budgetNode.textContent = parts.join(' · ') || '—';
    }
  }
}
