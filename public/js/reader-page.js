import '../css/main.css';
import { applySavedTheme, toggleTheme } from './utils/theme.js';
import { getBook, readBookBlob, updateBook } from './storage/library.js';
import { parseBook } from './parser/index.js';
import { TTSClient } from './tts.js';
import { loadConfig } from './utils/config.js';
import { recordAudioUrl } from './storage/audio-cache.js';

applySavedTheme();
registerServiceWorker();

const params = new URLSearchParams(window.location.search);
const bookId = params.get('bookId');
const reader = document.getElementById('reader');
const columnA = document.getElementById('column-a');
const columnB = document.getElementById('column-b');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const providerSelect = document.getElementById('provider-select');
const privacyBanner = document.getElementById('privacy-banner');
const themeToggle = document.getElementById('reader-theme-toggle');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');
const fontSizeDown = document.getElementById('font-size-down');
const fontSizeUp = document.getElementById('font-size-up');
const fontSizeLabel = document.getElementById('font-size-label');
const columnModeButtons = document.querySelectorAll('.column-toggle');
const lineHeightRange = document.getElementById('line-height-range');
const lineHeightValue = document.getElementById('line-height-value');
const voiceSelect = document.getElementById('voice-select');
const ttsToggle = document.getElementById('tts-toggle');
const ttsIcon = document.getElementById('tts-icon');
const prevBtn = document.getElementById('prev-paragraph');
const nextBtn = document.getElementById('next-paragraph');
const backButton = document.getElementById('back-button');

const ttsClient = new TTSClient();
const PROVIDER_KEY = 'paperread-provider';
const SETTINGS_KEY = 'paperread-reader-settings';
const DEFAULT_SETTINGS = {
  fontScale: 1,
  lineHeight: 1.6,
  columnMode: 'two',
  voiceId: 'en_US',
  playbackRate: 1,
};

let appConfig;
let paragraphs = [];
let paragraphOffsets = [];
let currentIndex = 0;
let playing = false;
let audioRef;
let providerPreference = localStorage.getItem(PROVIDER_KEY);
let readerSettings = loadReaderSettings();
let playbackRate = readerSettings.playbackRate ?? parseFloat(speedRange?.value || '1');

if (speedRange && speedValue) {
  speedRange.value = playbackRate.toFixed(1);
  speedValue.textContent = `${playbackRate.toFixed(1)}x`;
}

applyReaderSettings();
init();

async function init() {
  if (!bookId) {
    showError('Missing book identifier.');
    return;
  }
  await setupControls();
  try {
    const book = await getBook(bookId);
    if (!book) throw new Error('Book not found locally.');
    const blob = await readBookBlob(book);
    const buffer = await blob.arrayBuffer();
    const parsed = parseBook(book, buffer);
    paragraphs = parsed.paragraphs;
    if (!paragraphs.length) {
      throw new Error('Unable to parse book content.');
    }
    computeParagraphOffsets();
    renderParagraphs(parsed, book);
    loadingState?.classList.add('hidden');
    columnA?.classList.remove('hidden');
    columnB?.classList.remove('hidden');
    const savedLocation = normalizeLocation(book.lastReadLocation);
    if (savedLocation) {
      currentIndex = Math.min(savedLocation.para, paragraphs.length - 1);
      highlightActive();
    }
  } catch (err) {
    console.error(err);
    showError(err.message);
  }
}

async function setupControls() {
  appConfig = await loadConfig();
  const onlineBase = appConfig.ONLINE_TTS_BASE_URL;
  const onlineOption = providerSelect?.querySelector('option[value="online"]');
  if (!onlineBase && onlineOption) {
    onlineOption.disabled = true;
    if (providerPreference === 'online') providerPreference = 'offline';
  }
  if (!providerPreference) {
    providerPreference = appConfig.TTS_PROVIDER_DEFAULT || 'offline';
  }
  providerSelect.value = providerPreference;
  togglePrivacyNotice(providerPreference === 'online');
  providerSelect.addEventListener('change', (event) => {
    providerPreference = event.target.value;
    localStorage.setItem(PROVIDER_KEY, providerPreference);
    togglePrivacyNotice(providerPreference === 'online');
  });
  themeToggle?.addEventListener('click', () => toggleTheme());
  backButton?.addEventListener('click', () => {
    if (document.referrer) {
      window.history.back();
    } else {
      window.location.assign('/index.html');
    }
  });
  prevBtn?.addEventListener('click', () => navigateParagraph(-1));
  nextBtn?.addEventListener('click', () => navigateParagraph(1));
  speedRange?.addEventListener('input', (event) => {
    playbackRate = parseFloat(event.target.value);
    speedValue.textContent = `${playbackRate.toFixed(1)}x`;
    if (audioRef) audioRef.playbackRate = playbackRate;
    persistReaderSettings({ playbackRate });
  });
  fontSizeDown?.addEventListener('click', () => adjustFontScale(-0.1));
  fontSizeUp?.addEventListener('click', () => adjustFontScale(0.1));
  lineHeightRange?.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    lineHeightValue.textContent = value.toFixed(1);
    persistReaderSettings({ lineHeight: value });
  });
  columnModeButtons.forEach((button) => {
    button.addEventListener('click', () => setColumnMode(button.getAttribute('data-column-mode') === 'one' ? 'one' : 'two'));
  });
  voiceSelect?.addEventListener('change', (event) => persistReaderSettings({ voiceId: event.target.value }));
  ttsToggle?.addEventListener('click', togglePlayback);
  ttsToggle?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePlayback();
    }
  });
}

function togglePrivacyNotice(show) {
  privacyBanner?.classList.toggle('hidden', !show);
}

async function togglePlayback() {
  playing = !playing;
  ttsToggle?.setAttribute('aria-pressed', String(playing));
  ttsIcon.textContent = playing ? 'pause' : 'play_arrow';
  if (playing) {
    await playFrom(currentIndex);
  } else {
    audioRef?.pause();
  }
}

async function playFrom(index) {
  currentIndex = index;
  highlightActive();
  while (playing && currentIndex < paragraphs.length) {
    const text = paragraphs[currentIndex];
    try {
      const payloads = await ttsClient.synthesize(text, {
        provider: providerPreference,
        voiceId: readerSettings.voiceId,
        rate: playbackRate,
        bookId,
      });
      for (const payload of payloads) {
        if (!playing) return;
        recordAudioUrl(bookId, providerPreference, payload.audioUrl);
        await playAudio(payload.audioUrl);
      }
      await persistProgress(currentIndex);
      currentIndex += 1;
      highlightActive();
    } catch (err) {
      console.error(err);
      showError('TTS playback failed.');
      playing = false;
      ttsIcon.textContent = 'play_arrow';
      break;
    }
  }
  playing = false;
  ttsIcon.textContent = 'play_arrow';
  ttsToggle?.setAttribute('aria-pressed', 'false');
}

function playAudio(url) {
  return new Promise((resolve, reject) => {
    audioRef?.pause();
    audioRef = new Audio(url);
    audioRef.playbackRate = playbackRate;
    audioRef.onended = resolve;
    audioRef.onpause = () => {
      if (!audioRef.ended) resolve();
    };
    audioRef.onerror = () => reject(new Error('Audio error'));
    audioRef.play().catch(reject);
  });
}

async function persistProgress(index) {
  try {
    const chars = paragraphOffsets[index] ?? 0;
    await updateBook(bookId, { lastReadLocation: { para: index, chars } });
  } catch (err) {
    console.warn('progress save failed', err);
  }
}

function navigateParagraph(delta) {
  currentIndex = Math.min(Math.max(0, currentIndex + delta), paragraphs.length - 1);
  highlightActive();
  void persistProgress(currentIndex);
  if (playing) {
    playFrom(currentIndex);
  }
}

function highlightActive() {
  document.querySelectorAll('[data-paragraph-index]').forEach((node) => {
    const index = Number(node.getAttribute('data-paragraph-index'));
    node.classList.toggle('bg-primary/40', index === currentIndex);
    node.classList.toggle('dark:bg-amber-100/20', index === currentIndex);
  });
}

function renderParagraphs(parsed, book) {
  document.title = `${book.title} — PaperRead`;
  const heading = document.createElement('div');
  heading.className = 'mb-8 space-y-1';
  heading.innerHTML = `
    <p class="text-sm uppercase tracking-[0.3em] text-primary">${book.author || 'Unknown Author'}</p>
    <h1 class="text-3xl font-black text-[#333333] dark:text-gray-100">${book.title}</h1>
  `;
  columnA?.appendChild(heading);
  paragraphs.forEach((text, index) => {
    const target = index % 2 === 0 ? columnA : columnB;
    const p = document.createElement('p');
    p.textContent = text;
    p.dataset.paragraphIndex = index;
    p.className = `font-serif text-lg leading-relaxed text-[#333333] dark:text-gray-200 ${index === 0 ? 'drop-cap' : ''}`;
    target?.appendChild(p);
  });
}

function showError(message) {
  loadingState?.classList.add('hidden');
  errorState.textContent = message;
  errorState.classList.remove('hidden');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function loadReaderSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistReaderSettings(updates) {
  readerSettings = { ...readerSettings, ...updates };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(readerSettings));
  applyReaderSettings();
}

function applyReaderSettings() {
  document.documentElement.style.setProperty('--reader-font-scale', readerSettings.fontScale);
  document.documentElement.style.setProperty('--reader-line-height', readerSettings.lineHeight);
  if (fontSizeLabel) {
    fontSizeLabel.textContent = `${Math.round(readerSettings.fontScale * 100)}%`;
  }
  if (lineHeightRange) {
    lineHeightRange.value = readerSettings.lineHeight.toString();
  }
  if (lineHeightValue) {
    lineHeightValue.textContent = readerSettings.lineHeight.toFixed(1);
  }
  if (voiceSelect) {
    voiceSelect.value = readerSettings.voiceId;
  }
  if (reader) {
    reader.classList.toggle('single-column', readerSettings.columnMode === 'one');
  }
  columnModeButtons.forEach((button) => {
    const isActive = button.getAttribute('data-column-mode') === readerSettings.columnMode;
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function adjustFontScale(delta) {
  const next = Math.min(1.6, Math.max(0.8, readerSettings.fontScale + delta));
  persistReaderSettings({ fontScale: Number(next.toFixed(2)) });
}

function setColumnMode(mode) {
  persistReaderSettings({ columnMode: mode });
}

function computeParagraphOffsets() {
  paragraphOffsets = new Array(paragraphs.length).fill(0);
  let total = 0;
  for (let i = 0; i < paragraphs.length; i += 1) {
    paragraphOffsets[i] = total;
    total += paragraphs[i].length + 1;
  }
}

function normalizeLocation(location) {
  if (!location) return null;
  if (typeof location === 'string') {
    const idx = parseInt(location.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(idx)) return null;
    return { para: idx, chars: 0 };
  }
  const para = Number(location.para);
  if (!Number.isFinite(para) || para < 0) return null;
  const chars = Number(location.chars || 0);
  return { para, chars: Math.max(0, chars) };
}
