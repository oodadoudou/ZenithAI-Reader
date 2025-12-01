import '../css/main.css';
import { applySavedTheme, toggleTheme, setTheme } from './utils/theme.js';
import { getBook, readBookBlob, updateBook } from './storage/library.js';
import { parseBook } from './parser/index.js';
import { TTSClient } from './tts.js';
import { loadConfig } from './utils/config.js';
import { recordAudioUrl } from './storage/audio-cache.js';
import { PageFlipController } from './ui/page-flip.js';
import { isFeatureEnabled } from './utils/feature-flags.js';
import { DiagnosticsPanel } from './ui/diagnostics-panel.js';
import { DEFAULT_VOICES } from './services/voice/providers.js';
import { measureMetric } from './utils/telemetry.js';
import { buildBookmarkSnippet, normalizeBookmarks, filterBookmarksBySnippet, sortBookmarks } from './utils/bookmarks.js';
import { normalizeAnnotations } from './utils/annotations.js';
import { buildCfi } from './utils/cfi.js';
import { activateFocusTrap, deactivateFocusTrap } from './utils/focus-trap.js';
import { buildSearchIndex as buildSearchCorpus, searchIndex as querySearchIndex } from './utils/search.js';
import { TranslationService } from './services/translation.js';

applySavedTheme();
registerServiceWorker();
void mountDiagnosticsPanel('reader');

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
const progressLabel = document.getElementById('reader-progress-label');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');
const fontSizeDown = document.getElementById('font-size-down');
const fontSizeUp = document.getElementById('font-size-up');
const fontSizeLabel = document.getElementById('font-size-label');
const columnModeButtons = document.querySelectorAll('.column-toggle');
const lineHeightRange = document.getElementById('line-height-range');
const lineHeightValue = document.getElementById('line-height-value');
const voiceSelect = document.getElementById('voice-select');
const voiceLanguageFilter = document.getElementById('voice-language-filter');
const voiceDownloadButton = document.getElementById('voice-download');
const voiceStatus = document.getElementById('voice-status');
const ttsToggle = document.getElementById('tts-toggle');
const ttsIcon = document.getElementById('tts-icon');
const prevBtn = document.getElementById('prev-paragraph');
const nextBtn = document.getElementById('next-paragraph');
const backButton = document.getElementById('back-button');
const bookStage = document.querySelector('[data-book-stage]');
const navButton = document.getElementById('reader-nav-button');
const navDrawer = document.getElementById('nav-drawer');
const navBackdrop = document.getElementById('nav-backdrop');
const navClose = document.getElementById('nav-close');
const bookmarkToggle = document.getElementById('reader-bookmark-toggle');
const bookmarkList = document.getElementById('bookmark-list');
const bookmarkEmpty = document.getElementById('bookmark-empty');
const bookmarkSearch = document.getElementById('bookmark-search');
const bookmarkSort = document.getElementById('bookmark-sort');
const chapterList = document.getElementById('chapter-list');
const progressScrubber = document.getElementById('progress-scrubber');
const progressScrubberLabel = document.getElementById('progress-scrubber-label');
const quickSettingsButton = document.getElementById('reader-quick-settings');
const quickSettingsPanel = document.getElementById('quick-settings-panel');
const quickSettingsBackdrop = document.getElementById('quick-settings-backdrop');
const quickSettingsClose = document.getElementById('quick-settings-close');
const brightnessControl = document.getElementById('brightness-control');
const autoNightToggle = document.getElementById('auto-night-toggle');
const orientationLockToggle = document.getElementById('orientation-lock-toggle');
const goalProgressLabel = document.getElementById('goal-progress-label');
const goalProgressBar = document.getElementById('goal-progress-bar');
const goalTargetInput = document.getElementById('goal-target-input');
const sleepTimerInput = document.getElementById('sleep-timer-input');
const sleepTimerStart = document.getElementById('sleep-timer-start');
const sleepTimerCancel = document.getElementById('sleep-timer-cancel');
const sleepTimerStatus = document.getElementById('sleep-timer-status');
const searchButton = document.getElementById('reader-search-button');
const searchPanel = document.getElementById('search-panel');
const searchBackdrop = document.getElementById('search-backdrop');
const searchClose = document.getElementById('search-close');
const searchInput = document.getElementById('reader-search-input');
const searchResults = document.getElementById('search-results');
const searchEmpty = document.getElementById('search-empty');
const annotationsButton = document.getElementById('reader-annotations-button');
const annotationsPanel = document.getElementById('annotations-panel');
const annotationsBackdrop = document.getElementById('annotations-backdrop');
const annotationsClose = document.getElementById('annotations-close');
const annotationsList = document.getElementById('annotations-list');
const annotationsEmpty = document.getElementById('annotations-empty');
const annotationsSearch = document.getElementById('annotations-search');
const selectionToolbar = document.getElementById('selection-toolbar');
const notePanel = document.getElementById('note-panel');
const noteBackdrop = document.getElementById('note-backdrop');
const noteClose = document.getElementById('note-close');
const noteInput = document.getElementById('note-input');
const noteSave = document.getElementById('note-save');
const dictionaryPanel = document.getElementById('dictionary-panel');
const dictionaryBackdrop = document.getElementById('dictionary-backdrop');
const dictionaryClose = document.getElementById('dictionary-close');
const dictionaryWord = document.getElementById('dictionary-word');
const dictionaryDefinition = document.getElementById('dictionary-definition');
const dictionaryTranslation = document.getElementById('dictionary-translation');
const dictionaryAddVocab = document.getElementById('dictionary-add-vocab');
const dictionaryTranslate = document.getElementById('dictionary-translate');
const dictionaryOpenVocab = document.getElementById('dictionary-open-vocab');
const quotePanel = document.getElementById('quote-panel');
const quoteBackdrop = document.getElementById('quote-backdrop');
const quoteClose = document.getElementById('quote-close');
const quoteCardText = document.getElementById('quote-card-text');
const quoteCardMeta = document.getElementById('quote-card-meta');
const quoteCopy = document.getElementById('quote-copy');
const quoteShare = document.getElementById('quote-share');
const listenAdd = document.getElementById('listen-add');
const listenPlay = document.getElementById('listen-play');
const selectionNote = document.getElementById('selection-note');
const selectionDefine = document.getElementById('selection-define');
const selectionQuote = document.getElementById('selection-quote');
const selectionShare = document.getElementById('selection-share');
const sketchToggle = document.getElementById('sketch-toggle');
const sketchLayer = document.getElementById('sketch-layer');
const vocabPanel = document.getElementById('vocab-panel');
const vocabBackdrop = document.getElementById('vocab-backdrop');
const vocabClose = document.getElementById('vocab-close');
const vocabList = document.getElementById('vocab-list');
const vocabEmpty = document.getElementById('vocab-empty');
const vocabSearch = document.getElementById('vocab-search');
const vocabFilter = document.getElementById('vocab-filter');
const translationConsentPanel = document.getElementById('translation-consent-panel');
const translationConsentBackdrop = document.getElementById('translation-consent-backdrop');
const translationConsentClose = document.getElementById('translation-consent-close');
const translationConsentAccept = document.getElementById('translation-consent-accept');
const translationConsentDecline = document.getElementById('translation-consent-decline');

const PANEL_FOCUS_TARGETS = {
  nav: '#nav-close',
  qs: '#quick-settings-close',
  search: '#reader-search-input',
  annotations: '#annotations-search',
  note: '#note-input',
  dictionary: '#dictionary-close',
  quote: '#quote-close',
  vocab: '#vocab-search',
  'translation-consent': '#translation-consent-accept',
};

const ttsClient = new TTSClient();
const PROVIDER_KEY = 'paperread-provider';
const SETTINGS_KEY = 'paperread-reader-settings';
const GOAL_KEY = 'paperread-reading-goal';
const VOCAB_KEY = 'paperread-vocabulary';
const TRANSLATION_CONSENT_KEY = 'paperread-translation-consent';
const VOCAB_STATUSES = ['new', 'learning', 'mastered'];
const DEFAULT_SETTINGS = {
  fontScale: 1,
  lineHeight: 1.6,
  columnMode: 'two',
  voiceId: 'en_US',
  playbackRate: 1,
  brightness: 1,
  autoNight: false,
  orientationLock: false,
};

let appConfig;
let paragraphs = [];
let chapters = [];
let paragraphOffsets = [];
let currentIndex = 0;
let playing = false;
let audioRef;
let activeWordIndex = -1;
let activeWordCount = 0;
let activeWordPara = -1;
let wordElapsedMsBase = 0;
let currentBook = null;
let providerPreference = localStorage.getItem(PROVIDER_KEY);
let readerSettings = loadReaderSettings();
let playbackRate = readerSettings.playbackRate ?? parseFloat(speedRange?.value || '1');
let pageFlip = null;
let voiceCatalog = [];
let downloadingVoiceId = null;
let readingGoal = loadReadingGoal();
let goalTimerId = null;
let autoNightIntervalId = null;
const openPanels = new Set();
let annotations = [];
let bookmarks = [];
let bookmarkFilterText = '';
let bookmarkSortMode = 'recent';
let selectionState = null;
let dictionaryData = null;
let vocabulary = loadVocabulary();
let vocabFilterState = 'all';
let vocabSearchState = '';
let sketchActive = false;
let sketchCtx = null;
let sketchStrokes = [];
let currentStroke = null;
let pendingNoteTarget = null;
let lastLookupWord = '';
let searchCorpus = [];
let translationService = null;
let translationConsent = loadTranslationConsent();
let pendingTranslationWord = '';
let sleepTimerId = null;
let sleepEndAt = 0;
const LISTEN_QUEUE_KEY = 'paperread-listen-queue';

if (bookStage) {
  pageFlip = new PageFlipController(bookStage, {
    onNavigate: (direction) => {
      const delta = direction === 'forward' ? 1 : -1;
      handleManualNav(delta, { source: 'controller' });
    },
  });
}

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
    currentBook = book;
    const blob = await readBookBlob(book);
    const buffer = await blob.arrayBuffer();
    const parsed = await parseBook(book, buffer);
    paragraphs = parsed.paragraphs;
    chapters = parsed.chapters || [];
    annotations = normalizeAnnotations(book.annotations || [], paragraphs);
    bookmarks = normalizeBookmarks(book.bookmarks, paragraphs);
    searchCorpus = buildSearchCorpus(paragraphs);
    if (!paragraphs.length) {
      throw new Error('Unable to parse book content.');
    }
    computeParagraphOffsets();
    renderParagraphs(parsed, book);
    applyAnnotations();
    renderChapterList();
    renderBookmarkList();
    updateBookmarkToggle();
    loadingState?.classList.add('hidden');
    columnA?.classList.remove('hidden');
    columnB?.classList.remove('hidden');
    const savedLocation = normalizeLocation(book.lastReadLocation);
    if (savedLocation) {
      currentIndex = Math.min(savedLocation.para, paragraphs.length - 1);
      highlightActive();
    }
    updateProgressUI();
    setupMediaSession();
    updateMediaSessionMetadata();
    startGoalTimer();
    sketchStrokes = loadSketchStrokes(bookId);
    initSketchLayer();
    updateSketchToggleUI();
  } catch (err) {
    console.error(err);
    showError(err.message);
  }
}

async function setupControls() {
  appConfig = await loadConfig();
  translationService = new TranslationService(appConfig);
  const onlineBase = appConfig.ONLINE_TTS_BASE_URL;
  const onlineOption = providerSelect?.querySelector('option[value="online"]');
  if (!onlineBase && onlineOption) {
    onlineOption.disabled = true;
    if (providerPreference === 'online') providerPreference = 'offline';
  }
  let offlineAvailable = true;
  try {
    const base = (appConfig.OFFLINE_TTS_URL || '').replace(/\/$/, '');
    if (!base) throw new Error('no offline base');
    await fetch(`${base}/status`, { method: 'GET' });
  } catch {
    offlineAvailable = false;
  }
  if (!offlineAvailable) {
    const offlineOption = providerSelect?.querySelector('option[value="offline"]');
    if (offlineOption) offlineOption.disabled = true;
    if (onlineBase) {
      providerPreference = 'online';
    }
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
  prevBtn?.addEventListener('click', () => navigateChapter(-1));
  nextBtn?.addEventListener('click', () => navigateChapter(1));
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
  voiceSelect?.addEventListener('change', (event) => {
    persistReaderSettings({ voiceId: event.target.value });
    updateVoiceDownloadState();
  });
  voiceLanguageFilter?.addEventListener('change', () => {
    populateVoiceOptions();
  });
  voiceDownloadButton?.addEventListener('click', () => {
    void handleVoiceDownload();
  });
  ttsToggle?.addEventListener('click', togglePlayback);
  ttsToggle?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePlayback();
    }
  });
  navButton?.addEventListener('click', () => openNavDrawer());
  navClose?.addEventListener('click', () => closeNavDrawer());
  navBackdrop?.addEventListener('click', () => closeNavDrawer());
  bookmarkToggle?.addEventListener('click', () => toggleBookmarkAtCurrent());
  bookmarkSearch?.addEventListener('input', (event) => {
    bookmarkFilterText = (event.target.value || '').toLowerCase();
    renderBookmarkList();
  });
  bookmarkSort?.addEventListener('change', (event) => {
    bookmarkSortMode = event.target.value || 'recent';
    renderBookmarkList();
  });
  progressScrubber?.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    updateScrubberLabel(value);
  });
  progressScrubber?.addEventListener('change', (event) => {
    goToIndex(Number(event.target.value));
  });
  quickSettingsButton?.addEventListener('click', () => openQuickSettingsPanel());
  quickSettingsClose?.addEventListener('click', () => closeQuickSettingsPanel());
  quickSettingsBackdrop?.addEventListener('click', () => closeQuickSettingsPanel());
  brightnessControl?.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      persistReaderSettings({ brightness: Number(value.toFixed(2)) });
    }
  });
  autoNightToggle?.addEventListener('click', () => {
    persistReaderSettings({ autoNight: !readerSettings.autoNight });
  });
  orientationLockToggle?.addEventListener('click', () => {
    const nextState = !readerSettings.orientationLock;
    const updates = { orientationLock: nextState };
    if (nextState) {
      updates.columnMode = 'one';
    }
    persistReaderSettings(updates);
  });
  goalTargetInput?.addEventListener('change', (event) => {
    const value = Number(event.target.value);
    const minutes = Math.min(240, Math.max(5, Number.isFinite(value) ? value : readingGoal.dailyMinutesTarget));
    persistReadingGoal({ ...readingGoal, dailyMinutesTarget: minutes });
    goalTargetInput.value = minutes.toString();
  });
  sleepTimerStart?.addEventListener('click', () => startSleepTimer());
  sleepTimerCancel?.addEventListener('click', () => cancelSleepTimer());
  searchButton?.addEventListener('click', () => openSearchPanel());
  searchClose?.addEventListener('click', () => closeSearchPanel());
  searchBackdrop?.addEventListener('click', () => closeSearchPanel());
  searchInput?.addEventListener('input', (event) => handleSearchInput(event.target.value));
  reader?.addEventListener('click', (event) => {
    const highlight = event.target.closest('[data-annotation-id]');
    if (!highlight) return;
    const id = highlight.getAttribute('data-annotation-id');
    const annotation = annotations.find((entry) => entry.id === id);
    if (annotation) {
      openAnnotationsPanel();
      window.setTimeout(() => scrollToAnnotation(annotation.id), 100);
    }
  });
  annotationsButton?.addEventListener('click', () => openAnnotationsPanel());
  annotationsClose?.addEventListener('click', () => closeAnnotationsPanel());
  annotationsBackdrop?.addEventListener('click', () => closeAnnotationsPanel());
  annotationsSearch?.addEventListener('input', (event) => renderAnnotationsList(event.target.value));
  noteClose?.addEventListener('click', () => closeNotePanel());
  noteBackdrop?.addEventListener('click', () => closeNotePanel());
  noteSave?.addEventListener('click', () => saveNote());
  dictionaryClose?.addEventListener('click', () => closeDictionaryPanel());
  dictionaryBackdrop?.addEventListener('click', () => closeDictionaryPanel());
  dictionaryAddVocab?.addEventListener('click', () => addVocabularyEntry(lastLookupWord));
  dictionaryTranslate?.addEventListener('click', () => requestTranslation(lastLookupWord));
  dictionaryOpenVocab?.addEventListener('click', () => openVocabularyPanel());
  vocabClose?.addEventListener('click', () => closeVocabularyPanel());
  vocabBackdrop?.addEventListener('click', () => closeVocabularyPanel());
  vocabSearch?.addEventListener('input', (event) => {
    vocabSearchState = event.target.value;
    renderVocabularyList();
  });
  vocabFilter?.addEventListener('change', (event) => {
    vocabFilterState = event.target.value || 'all';
    renderVocabularyList();
  });
  translationConsentClose?.addEventListener('click', () => closeTranslationConsentPanel());
  translationConsentBackdrop?.addEventListener('click', () => closeTranslationConsentPanel());
  translationConsentDecline?.addEventListener('click', () => declineTranslationConsent());
  translationConsentAccept?.addEventListener('click', () => acceptTranslationConsent());
  quoteClose?.addEventListener('click', () => closeQuotePanel());
  quoteBackdrop?.addEventListener('click', () => closeQuotePanel());
  quoteCopy?.addEventListener('click', () => copyQuoteText());
  quoteShare?.addEventListener('click', () => systemShareQuote());
  document.addEventListener('selectionchange', handleSelectionChange);
  document.addEventListener('mouseup', () => window.setTimeout(() => handleSelectionChange(), 0));
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
      hideSelectionToolbar();
    }
  });
  selectionNote?.addEventListener('click', () => openNotePanel());
  selectionDefine?.addEventListener('click', () => lookupSelection());
  selectionQuote?.addEventListener('click', () => openQuotePanel());
  selectionShare?.addEventListener('click', () => shareSelectionText());
  document.querySelectorAll('.selection-toolbar .swatch').forEach((button) => {
    button.addEventListener('click', () => {
      const color = button.getAttribute('data-color') || 'sun';
      createHighlight(color);
    });
  });
  sketchToggle?.addEventListener('click', () => toggleSketchLayer());
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', () => {
    stopGoalTimer();
  });
  updateGoalUI();
  await loadVoiceCatalog();
  listenAdd?.addEventListener('click', () => addToListenQueue(currentIndex));
  listenPlay?.addEventListener('click', () => playListenQueue());
}

function togglePrivacyNotice(show) {
  privacyBanner?.classList.toggle('hidden', !show);
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => {
    if (!playing) {
      togglePlayback();
    } else {
      audioRef?.play();
      ms.playbackState = 'playing';
    }
  });
  ms.setActionHandler('pause', () => {
    audioRef?.pause();
    playing = false;
    ttsIcon.textContent = 'play_arrow';
    ttsToggle?.setAttribute('aria-pressed', 'false');
    ms.playbackState = 'paused';
  });
  ms.setActionHandler('previoustrack', () => handleManualNav(-1));
  ms.setActionHandler('nexttrack', () => handleManualNav(1));
}

function updateMediaSessionMetadata() {
  if (!('mediaSession' in navigator) || !currentBook) return;
  const title = currentBook.title || 'Untitled';
  const artist = currentBook.author || '';
  const album = 'PaperRead';
  navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album });
}

async function togglePlayback() {
  playing = !playing;
  ttsToggle?.setAttribute('aria-pressed', String(playing));
  ttsIcon.textContent = playing ? 'pause' : 'play_arrow';
  if (playing) {
    await playFrom(currentIndex);
  } else {
    audioRef?.pause();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}

async function playFrom(index) {
  currentIndex = index;
  highlightActive();
  while (playing && currentIndex < paragraphs.length) {
    const text = paragraphs[currentIndex];
    try {
      const payloads = await measureMetric('audio-queue', () =>
        ttsClient.synthesize(text, {
          provider: providerPreference,
          voiceId: readerSettings.voiceId,
          rate: playbackRate,
          bookId,
        })
      );
      const totalDurationMs = Array.isArray(payloads)
        ? payloads.reduce((sum, p) => sum + (Number(p.duration_ms) || 0), 0)
        : 0;
      ensureWordWrapped(currentIndex);
      activeWordCount = countWords(paragraphs[currentIndex]);
      activeWordPara = currentIndex;
      activeWordIndex = -1;
      wordElapsedMsBase = 0;
      for (const payload of payloads) {
        if (!playing) return;
        recordAudioUrl(bookId, providerPreference, payload.audioUrl);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        const alignment = Array.isArray(payload.words) ? payload.words.map((w) => ({ start: Number(w.start_ms)||0, end: Number(w.end_ms)||0 })) : null;
        const node = document.querySelector(`[data-paragraph-index="${currentIndex}"]`);
        if (node) node.__wordAlignment = alignment;
        await playAudio(payload.audioUrl, Number(payload.duration_ms) || 0, totalDurationMs);
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
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
}

function playAudio(url, segmentDurationMs = 0, totalDurationMs = 0) {
  return new Promise((resolve, reject) => {
    audioRef?.pause();
    audioRef = new Audio(url);
    audioRef.playbackRate = playbackRate;
    audioRef.onended = () => {
      wordElapsedMsBase += segmentDurationMs;
      resolve();
    };
    audioRef.onpause = () => {
      if (!audioRef.ended) {
        wordElapsedMsBase += segmentDurationMs;
        resolve();
      }
    };
    audioRef.onerror = () => reject(new Error('Audio error'));
    audioRef.ontimeupdate = () => {
      const elapsed = (audioRef.currentTime || 0) * 1000;
      updatePositionState(segmentDurationMs, elapsed);
      updateWordHighlight(totalDurationMs, wordElapsedMsBase + elapsed);
    };
    audioRef.onplay = () => {
      updatePositionState(segmentDurationMs, 0);
    };
    audioRef.play().catch(reject);
  });
}

async function persistProgress(index) {
  try {
    const chars = paragraphOffsets[index] ?? 0;
    const now = Date.now();
    await updateBook(bookId, { lastReadLocation: { para: index, chars }, stats: { ...(currentBook?.stats || {}), last_session_at: now, sessions: (currentBook?.stats?.sessions || 0) + 1 } });
  } catch (err) {
    console.warn('progress save failed', err);
  }
}

function handleManualNav(delta, options = {}) {
  const { source = 'button' } = options;
  if (source === 'controller') {
    navigateParagraph(delta);
    return;
  }
  if (pageFlip) {
    const performed = pageFlip.runWithAnimation(delta, () => navigateParagraph(delta));
    if (!performed) {
      return;
    }
    return;
  }
  navigateParagraph(delta);
}

function navigateParagraph(delta) {
  currentIndex = Math.min(Math.max(0, currentIndex + delta), paragraphs.length - 1);
  highlightActive();
  void persistProgress(currentIndex);
  if (playing) {
    playFrom(currentIndex);
  }
}

function navigateChapter(delta) {
  if (!Array.isArray(chapters) || !chapters.length) {
    navigateParagraph(delta);
    return;
  }
  let chapterIdx = 0;
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].index <= currentIndex) chapterIdx = i;
    else break;
  }
  const targetIdx = Math.min(Math.max(0, chapterIdx + delta), chapters.length - 1);
  const targetParaIndex = chapters[targetIdx]?.index ?? 0;
  currentIndex = targetParaIndex;
  highlightActive();
  void persistProgress(currentIndex);
  if (playing) {
    playFrom(currentIndex);
  }
}

function highlightActive() {
  document.querySelectorAll('[data-paragraph-index]').forEach((node) => {
    const index = Number(node.getAttribute('data-paragraph-index'));
    node.classList.toggle('bg-gray-100/40', index === currentIndex);
    node.classList.toggle('dark:bg-zinc-800/30', index === currentIndex);
    if (index !== currentIndex && index === activeWordPara) {
      clearWordHighlight(index);
    }
  });
  updateProgressUI();
  updateBookmarkToggle();
  updateMediaSessionMetadata();
}

function applyAnnotations() {
  document.querySelectorAll('[data-paragraph-index]').forEach((node) => {
    const index = Number(node.getAttribute('data-paragraph-index'));
    if (!Number.isFinite(index) || !paragraphs[index]) return;
    node.innerHTML = renderParagraphContent(paragraphs[index], index);
  });
  renderAnnotationsList(annotationsSearch?.value || '');
}

function applyAnnotationsToParagraph(index) {
  const target = document.querySelector(`[data-paragraph-index="${index}"]`);
  if (target && paragraphs[index]) {
    target.innerHTML = renderParagraphContent(paragraphs[index], index);
  }
}

function renderParagraphs(parsed, book) {
  measureMetric('reader-render', () => {
    document.title = `${book.title} — PaperRead`;
    const heading = document.createElement('div');
    heading.className = 'mb-8 space-y-1';
    heading.innerHTML = `
      <p class="text-sm uppercase tracking-[0.3em] text-[#666666] dark:text-gray-400">${book.author || 'Unknown Author'}</p>
      <h1 class="text-3xl font-black text-[#333333] dark:text-gray-100">${book.title}</h1>
    `;
    columnA?.appendChild(heading);
    paragraphs.forEach((text, index) => {
      const target = index % 2 === 0 ? columnA : columnB;
      const p = document.createElement('p');
      p.innerHTML = renderParagraphContent(text, index);
      p.dataset.paragraphIndex = index;
      p.className = `font-serif text-lg leading-relaxed text-[#333333] dark:text-gray-200 ${index === 0 ? 'drop-cap' : ''}`;
      target?.appendChild(p);
    });
  });
}

function renderParagraphContent(text, index) {
  const safeText = escapeHtml(text).replace(/\n/g, '<br/>');
  const spans = annotations
    .filter((annotation) => annotation.paraIndex === index)
    .map((annotation) => ({
      start: Math.max(0, annotation.start ?? 0),
      end: Math.min(text.length, annotation.end ?? 0),
      color: annotation.color || 'sun',
      id: annotation.id,
    }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);
  if (!spans.length) {
    return safeText;
  }
  let cursor = 0;
  let html = '';
  spans.forEach((span) => {
    if (span.start > text.length) return;
    const start = Math.max(span.start, cursor);
    if (start > cursor) {
      html += escapeHtml(text.slice(cursor, start)).replace(/\n/g, '<br/>');
    }
    const end = Math.min(span.end, text.length);
    const content = escapeHtml(text.slice(start, end)).replace(/\n/g, '<br/>');
    html += `<mark class="highlight-text highlight-${span.color}" data-annotation-id="${span.id}">${content}</mark>`;
    cursor = end;
  });
  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor)).replace(/\n/g, '<br/>');
  }
  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showError(message) {
  loadingState?.classList.add('hidden');
  errorState.textContent = message;
  errorState.classList.remove('hidden');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

async function mountDiagnosticsPanel(context) {
  try {
    const enabled = await isFeatureEnabled('diagnosticsPanel');
    if (!enabled) return;
    const metricsEnabled = await isFeatureEnabled('parserDiagnostics');
    const panel = new DiagnosticsPanel({ context, enableMetrics: metricsEnabled });
    await panel.mount();
  } catch (err) {
    console.warn('diagnostics unavailable', err);
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
  document.documentElement.style.setProperty('--reader-brightness', readerSettings.brightness ?? 1);
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
  if (brightnessControl) {
    brightnessControl.value = (readerSettings.brightness ?? 1).toString();
  }
  const enforceSingleColumn = readerSettings.orientationLock || readerSettings.columnMode === 'one';
  if (reader) {
    reader.classList.toggle('single-column', enforceSingleColumn);
  }
  columnModeButtons.forEach((button) => {
    const isActive = button.getAttribute('data-column-mode') === readerSettings.columnMode;
    button.setAttribute('aria-pressed', String(isActive));
    button.disabled = Boolean(readerSettings.orientationLock);
    button.classList.toggle('control-disabled', Boolean(readerSettings.orientationLock));
  });
  updateVoiceDownloadState();
  updateAutoNightUI();
  updateOrientationLockUI();
  scheduleAutoNightWatcher();
}

function updateAutoNightUI() {
  if (!autoNightToggle) return;
  const active = Boolean(readerSettings.autoNight);
  autoNightToggle.dataset.active = String(active);
  const label = autoNightToggle.querySelector('span:last-child');
  if (label) {
    label.textContent = active ? 'Auto' : 'Off';
  }
}

function updateOrientationLockUI() {
  if (!orientationLockToggle) return;
  const locked = Boolean(readerSettings.orientationLock);
  orientationLockToggle.dataset.active = String(locked);
  const label = orientationLockToggle.querySelector('span:last-child');
  if (label) {
    label.textContent = locked ? 'Locked' : 'Allow rotate';
  }
}

function scheduleAutoNightWatcher() {
  if (autoNightIntervalId) {
    window.clearInterval(autoNightIntervalId);
    autoNightIntervalId = null;
  }
  if (readerSettings.autoNight) {
    applyAutoNightTheme();
    autoNightIntervalId = window.setInterval(() => applyAutoNightTheme(), 60000);
  }
}

function applyAutoNightTheme() {
  if (!readerSettings.autoNight) {
    return;
  }
  const hours = new Date().getHours();
  const useDark = hours >= 19 || hours < 6;
  setTheme(useDark ? 'dark' : 'light');
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

function getActiveVoiceCatalog() {
  return voiceCatalog.length ? voiceCatalog : DEFAULT_VOICES;
}

function findVoiceEntry(voiceId) {
  return getActiveVoiceCatalog().find((voice) => voice.id === voiceId);
}

async function loadVoiceCatalog() {
  if (!voiceSelect) return;
  try {
    const catalog = await ttsClient.listVoices(providerPreference || 'offline');
    voiceCatalog = Array.isArray(catalog) ? catalog : [];
    populateVoiceOptions();
    setVoiceStatus('');
  } catch (err) {
    console.warn('voice catalog unavailable', err);
    voiceCatalog = [];
    populateVoiceOptions();
    setVoiceStatus('Voice catalog unavailable.', 'warning');
  }
  updateVoiceDownloadState();
}

function populateVoiceOptions() {
  if (!voiceSelect) return;
  const available = getActiveVoiceCatalog();
  if (!available.length) return;
  const languages = Array.from(new Set(available.map((v) => v.language).filter(Boolean))).sort();
  if (voiceLanguageFilter) {
    const prevLang = voiceLanguageFilter.value || 'all';
    voiceLanguageFilter.innerHTML = '<option value="all">All languages</option>';
    languages.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = lang;
      voiceLanguageFilter.appendChild(opt);
    });
    if (languages.includes(prevLang)) {
      voiceLanguageFilter.value = prevLang;
    }
  }
  const langFilter = voiceLanguageFilter?.value || 'all';
  const previous = voiceSelect.value || readerSettings.voiceId;
  voiceSelect.innerHTML = '';
  available
    .filter((voice) => langFilter === 'all' || voice.language === langFilter)
    .forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.id;
      const label = voice.name || voice.id;
      option.textContent = voice.installed === false ? `${label} • download required` : label;
      voiceSelect.appendChild(option);
    });
  const nextValue = available.some((voice) => voice.id === previous)
    ? previous
    : available[0]?.id;
  if (nextValue) {
    voiceSelect.value = nextValue;
    if (readerSettings.voiceId !== nextValue) {
      persistReaderSettings({ voiceId: nextValue });
    }
  }
}

function updateVoiceDownloadState() {
  if (!voiceDownloadButton) return;
  const entry = findVoiceEntry(voiceSelect?.value);
  const installed = entry?.installed ?? true;
  const shouldShowButton = Boolean(voiceCatalog.length && entry && installed === false);
  voiceDownloadButton.classList.toggle('hidden', !shouldShowButton);
  voiceDownloadButton.disabled = downloadingVoiceId !== null;
  if (!voiceCatalog.length) {
    setVoiceStatus('');
  } else if (entry) {
    if (downloadingVoiceId) {
      setVoiceStatus('Downloading voice…', 'warning');
    } else if (installed) {
      setVoiceStatus('Installed', 'positive');
    } else {
      setVoiceStatus('Not installed', 'warning');
    }
  }
}

function setVoiceStatus(message, tone = 'muted') {
  if (!voiceStatus) return;
  voiceStatus.textContent = message || '';
  voiceStatus.classList.remove('text-amber-600', 'text-emerald-600', 'text-rose-600');
  if (!message) return;
  if (tone === 'warning') voiceStatus.classList.add('text-amber-600');
  if (tone === 'positive') voiceStatus.classList.add('text-emerald-600');
  if (tone === 'error') voiceStatus.classList.add('text-rose-600');
}

async function handleVoiceDownload() {
  if (!voiceSelect || !voiceCatalog.length || downloadingVoiceId) return;
  const voiceId = voiceSelect.value;
  const entry = findVoiceEntry(voiceId);
  if (!entry || entry.installed) return;
  downloadingVoiceId = voiceId;
  voiceDownloadButton.disabled = true;
  setVoiceStatus('Downloading voice…', 'warning');
  try {
    await ttsClient.downloadVoice(voiceId, 'offline');
    await loadVoiceCatalog();
    setVoiceStatus('Installed', 'positive');
  } catch (err) {
    console.error('voice download failed', err);
    setVoiceStatus('Download failed', 'error');
  } finally {
    downloadingVoiceId = null;
    updateVoiceDownloadState();
  }
}

function openNavDrawer() {
  setPanelVisibility(navDrawer, navBackdrop, 'nav', true);
  renderChapterList();
}

function closeNavDrawer() {
  setPanelVisibility(navDrawer, navBackdrop, 'nav', false);
}

function openQuickSettingsPanel() {
  setPanelVisibility(quickSettingsPanel, quickSettingsBackdrop, 'qs', true);
}

function closeQuickSettingsPanel() {
  setPanelVisibility(quickSettingsPanel, quickSettingsBackdrop, 'qs', false);
}

function openSearchPanel() {
  setPanelVisibility(searchPanel, searchBackdrop, 'search', true);
  if (searchInput) {
    searchInput.value = '';
    handleSearchInput('');
    searchInput.focus();
  }
}

function closeSearchPanel() {
  setPanelVisibility(searchPanel, searchBackdrop, 'search', false);
}

function setPanelVisibility(panel, backdrop, key, visible) {
  if (!panel || !backdrop) return;
  const wasVisible = panel.classList.contains('is-visible');
  const next = typeof visible === 'boolean' ? visible : !wasVisible;
  if (next === wasVisible) {
    return;
  }
  panel.classList.toggle('is-visible', next);
  panel.setAttribute('aria-hidden', String(!next));
  backdrop.classList.toggle('is-visible', next);
  if (next) {
    openPanels.add(key);
    activateFocusTrap(panel, { initialFocus: PANEL_FOCUS_TARGETS[key] });
  } else {
    openPanels.delete(key);
    deactivateFocusTrap(panel);
  }
  if (openPanels.size > 0) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function handleGlobalKeydown(event) {
  const ctrlOrMeta = event.metaKey || event.ctrlKey;
  if (event.key === 'Escape') {
    if (openPanels.size > 0) {
      event.preventDefault();
      closeNavDrawer();
      closeQuickSettingsPanel();
      closeSearchPanel();
      closeAnnotationsPanel();
      closeNotePanel();
      closeDictionaryPanel();
      closeQuotePanel();
    } else {
      hideSelectionToolbar();
    }
    return;
  }
  if (ctrlOrMeta && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    openSearchPanel();
    searchInput?.focus();
    return;
  }
  if (ctrlOrMeta && event.key.toLowerCase() === 'g') {
    event.preventDefault();
    openNavDrawer();
    return;
  }
  if (ctrlOrMeta && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openQuickSettingsPanel();
    return;
  }
  if (ctrlOrMeta && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    openAnnotationsPanel();
    return;
  }
  if (ctrlOrMeta && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    lookupSelection();
    return;
  }
  if (!ctrlOrMeta && event.key === '?' && event.shiftKey) {
    openQuickSettingsPanel();
    return;
  }
  if (event.altKey && event.key === 'ArrowRight') {
    event.preventDefault();
    handleManualNav(1, { source: 'shortcut' });
    return;
  }
  if (event.altKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    handleManualNav(-1, { source: 'shortcut' });
    return;
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopGoalTimer();
  } else {
    startGoalTimer();
  }
}

function startSleepTimer() {
  const value = Number(sleepTimerInput?.value);
  const minutes = Math.min(120, Math.max(5, Number.isFinite(value) ? value : 15));
  const now = Date.now();
  sleepEndAt = now + minutes * 60000;
  if (sleepTimerId) {
    window.clearInterval(sleepTimerId);
  }
  sleepTimerId = window.setInterval(() => tickSleepTimer(), 1000);
  updateSleepStatus();
}

function cancelSleepTimer() {
  if (!sleepTimerId) return;
  window.clearInterval(sleepTimerId);
  sleepTimerId = null;
  sleepEndAt = 0;
  updateSleepStatus();
}

function tickSleepTimer() {
  if (!sleepTimerId) return;
  const now = Date.now();
  if (now >= sleepEndAt) {
    window.clearInterval(sleepTimerId);
    sleepTimerId = null;
    sleepEndAt = 0;
    audioRef?.pause();
    playing = false;
    ttsIcon.textContent = 'play_arrow';
    ttsToggle?.setAttribute('aria-pressed', 'false');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
  updateSleepStatus();
}

function updateSleepStatus() {
  if (!sleepTimerStatus) return;
  if (!sleepTimerId || !sleepEndAt) {
    sleepTimerStatus.textContent = '';
    return;
  }
  const remainingMs = Math.max(0, sleepEndAt - Date.now());
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  sleepTimerStatus.textContent = `Sleep in ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ensureWordWrapped(index) {
  const node = document.querySelector(`[data-paragraph-index="${index}"]`);
  if (!node) return;
  if (node.dataset.wordWrapped === 'true') return;
  const container = document.createElement('div');
  container.innerHTML = node.innerHTML;
  wrapTextNodesWithWordSpans(container);
  node.innerHTML = container.innerHTML;
  node.dataset.wordWrapped = 'true';
}

function wrapTextNodesWithWordSpans(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  let globalWordIndex = 0;
  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue || '';
    if (!text.trim()) return;
    const parts = text.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    parts.forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
      } else {
        const span = document.createElement('span');
        span.setAttribute('data-word-index', String(globalWordIndex));
        span.textContent = part;
        frag.appendChild(span);
        globalWordIndex += 1;
      }
    });
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

function countWords(text) {
  const tokens = (text || '')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.length || 0;
}

function updateWordHighlight(totalDurationMs, elapsedMs) {
  if (activeWordPara !== currentIndex || !activeWordCount || totalDurationMs <= 0) return;
  const paraNode = document.querySelector(`[data-paragraph-index="${activeWordPara}"]`);
  if (!paraNode) return;
  const alignment = paraNode.__wordAlignment;
  let idx;
  if (Array.isArray(alignment) && alignment.length) {
    const t = elapsedMs;
    idx = alignment.findIndex((w) => t >= w.start && t < w.end);
    if (idx < 0) idx = activeWordIndex;
  } else {
    const approxPerWord = totalDurationMs / activeWordCount;
    idx = Math.max(0, Math.min(activeWordCount - 1, Math.floor(elapsedMs / approxPerWord)));
  }
  if (idx === activeWordIndex) return;
  const prev = activeWordIndex >= 0 ? paraNode.querySelector(`[data-word-index="${activeWordIndex}"]`) : null;
  const next = paraNode.querySelector(`[data-word-index="${idx}"]`);
  if (prev) {
    prev.style.backgroundColor = '';
  }
  if (next) {
    next.style.backgroundColor = 'rgba(255, 214, 0, 0.35)';
  }
  activeWordIndex = idx;
}

function clearWordHighlight(index) {
  const paraNode = document.querySelector(`[data-paragraph-index="${index}"]`);
  if (!paraNode) return;
  paraNode.querySelectorAll('[data-word-index]').forEach((node) => {
    node.style.backgroundColor = '';
  });
  activeWordIndex = -1;
  activeWordCount = 0;
  activeWordPara = -1;
  wordElapsedMsBase = 0;
}

function updatePositionState(durationMs, positionMs) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.setPositionState({
      playbackRate,
      duration: Math.max(0, Number(durationMs) || 0) / 1000,
      position: Math.max(0, Number(positionMs) || 0) / 1000,
    });
  } catch {}
}

function renderChapterList() {
  if (!chapterList) return;
  chapterList.innerHTML = '';
  const items = Array.isArray(chapters) ? chapters : [];
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'text-sm text-[#666666] dark:text-gray-400';
    empty.textContent = 'No chapters detected for this book.';
    chapterList.appendChild(empty);
    return;
  }
  items.forEach((chapter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter-button text-sm text-[#333333] dark:text-gray-100';
    button.textContent = chapter.title;
    button.addEventListener('click', () => {
      goToIndex(chapter.index);
      closeNavDrawer();
    });
    chapterList.appendChild(button);
  });
}

function toggleBookmarkAtCurrent() {
  if (!paragraphs.length) return;
  const existing = bookmarks.find((entry) => entry.paraIndex === currentIndex);
  if (existing) {
    deleteBookmark(existing.id);
    return;
  }
  addBookmark(currentIndex);
}

function addBookmark(index) {
  if (!paragraphs[index]) return;
  const offset = 0;
  const bookmark = {
    id: crypto.randomUUID(),
    paraIndex: index,
    createdAt: Date.now(),
    snippet: buildBookmarkSnippet(paragraphs[index]),
    chars: offset,
    cfi: buildCfi(index, offset),
  };
  bookmarks = bookmarks.filter((entry) => entry.paraIndex !== index);
  bookmarks.push(bookmark);
  bookmarks.sort((a, b) => b.createdAt - a.createdAt);
  persistBookmarks();
  renderBookmarkList();
  updateBookmarkToggle();
}

function deleteBookmark(bookmarkId) {
  const next = bookmarks.filter((entry) => entry.id !== bookmarkId);
  if (next.length === bookmarks.length) return;
  bookmarks = next;
  persistBookmarks();
  renderBookmarkList();
  updateBookmarkToggle();
}

async function persistBookmarks() {
  try {
    await updateBook(bookId, { bookmarks });
  } catch (err) {
    console.warn('Failed to persist bookmarks', err);
  }
}

function renderBookmarkList() {
  if (!bookmarkList || !bookmarkEmpty) return;
  bookmarkList.innerHTML = '';
  const query = (bookmarkFilterText || '').trim();
  const entries = sortBookmarks(filterBookmarksBySnippet(bookmarks, query), bookmarkSortMode);
  if (!entries.length) {
    bookmarkEmpty.classList.remove('hidden');
    return;
  }
  bookmarkEmpty.classList.add('hidden');
  entries.forEach((bookmark) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';

    const gotoButton = document.createElement('button');
    gotoButton.type = 'button';
    gotoButton.className = 'bookmark-entry';
    const title = document.createElement('strong');
    title.textContent = `Paragraph ${bookmark.paraIndex + 1}`;
    const meta = document.createElement('span');
    meta.className = 'bookmark-meta';
    const percent = bookmarkPercent(bookmark.paraIndex);
    const snippet = bookmark.snippet || buildBookmarkSnippet(paragraphs[bookmark.paraIndex] || '');
    meta.textContent = `${percent}% · ${snippet}`;
    gotoButton.append(title, meta);
    gotoButton.addEventListener('click', () => {
      goToIndex(bookmark.paraIndex);
      closeNavDrawer();
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'bookmark-remove';
    removeButton.setAttribute('aria-label', 'Remove bookmark');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-base';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'bookmark_remove';
    removeButton.appendChild(icon);
    removeButton.addEventListener('click', () => deleteBookmark(bookmark.id));

    item.append(gotoButton, removeButton);
    bookmarkList.appendChild(item);
  });
}

function bookmarkPercent(index) {
  if (!paragraphs.length) return 0;
  const denominator = Math.max(1, paragraphs.length - 1);
  return Math.max(0, Math.round((index / denominator) * 100));
}

function updateBookmarkToggle() {
  if (!bookmarkToggle) return;
  const bookmarked = bookmarks.some((entry) => entry.paraIndex === currentIndex);
  bookmarkToggle.dataset.active = String(bookmarked);
  bookmarkToggle.setAttribute('aria-pressed', String(bookmarked));
  const icon = bookmarkToggle.querySelector('.material-symbols-outlined');
  if (icon) {
    icon.textContent = bookmarked ? 'bookmark_added' : 'bookmark_add';
  }
}

function updateProgressUI() {
  if (!progressLabel) return;
  if (!paragraphs.length) {
    progressLabel.textContent = '0% read';
    return;
  }
  const denominator = Math.max(1, paragraphs.length - 1);
  const percent = Math.max(0, Math.round((currentIndex / denominator) * 100));
  progressLabel.textContent = `${percent}% read`;
  if (progressScrubber) {
    progressScrubber.max = Math.max(0, paragraphs.length - 1).toString();
    progressScrubber.value = currentIndex.toString();
    updateScrubberLabel(currentIndex);
  }
}

function updateScrubberLabel(value) {
  if (!progressScrubberLabel || !paragraphs.length) return;
  const denominator = Math.max(1, paragraphs.length - 1);
  const percent = Math.max(0, Math.round((value / denominator) * 100));
  progressScrubberLabel.textContent = `${percent}%`;
}

function goToIndex(index) {
  if (!paragraphs.length) return;
  currentIndex = Math.min(Math.max(0, Math.round(index)), paragraphs.length - 1);
  highlightActive();
  void persistProgress(currentIndex);
}

function readListenQueue() {
  try { return JSON.parse(localStorage.getItem(LISTEN_QUEUE_KEY) || '[]') } catch { return [] }
}

function writeListenQueue(list) {
  try { localStorage.setItem(LISTEN_QUEUE_KEY, JSON.stringify(list)) } catch {}
}

function addToListenQueue(index) {
  const list = readListenQueue();
  if (!list.includes(index)) list.push(index);
  writeListenQueue(list);
}

async function playListenQueue() {
  const list = readListenQueue().filter((i) => Number.isFinite(i)).sort((a,b) => a-b);
  if (!list.length) return;
  playing = true;
  ttsToggle?.setAttribute('aria-pressed', 'true');
  ttsIcon.textContent = 'pause';
  for (const idx of list) {
    if (!playing) break;
    await playFrom(idx);
  }
  playing = false;
  ttsIcon.textContent = 'play_arrow';
  ttsToggle?.setAttribute('aria-pressed', 'false');
}

function handleSearchInput(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    if (searchEmpty) {
      searchEmpty.textContent = 'Type to search the current book.';
      searchEmpty.classList.remove('hidden');
    }
    if (searchResults) {
      searchResults.innerHTML = '';
    }
    return;
  }
  const matches = measureMetric('search', () => querySearchIndex(searchCorpus, trimmed, { limit: 25 }));
  renderSearchResults(matches, trimmed);
}

function buildSnippet(text, query) {
  const normalized = text.replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();
  const qLower = query.toLowerCase();
  const hit = lower.indexOf(qLower);
  if (hit === -1) {
    return normalized.slice(0, 140).trim();
  }
  const start = Math.max(0, hit - 60);
  const end = Math.min(normalized.length, hit + qLower.length + 60);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalized.length ? '…' : '';
  return `${prefix}${normalized.slice(start, end).trim()}${suffix}`;
}

function renderSearchResults(results, query) {
  if (!searchResults || !searchEmpty) return;
  searchResults.innerHTML = '';
  if (!results.length) {
    searchEmpty.textContent = `No matches for “${query}”.`;
    searchEmpty.classList.remove('hidden');
    return;
  }
  searchEmpty.classList.add('hidden');
  results.forEach((result) => {
    const text = paragraphs[result.index];
    if (!text) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result text-left';
    const title = document.createElement('p');
    title.className = 'text-sm font-semibold text-[#333333] dark:text-gray-100';
    title.textContent = `Paragraph ${result.index + 1}`;
    const snippet = document.createElement('p');
    snippet.className = 'search-snippet mt-1';
    snippet.innerHTML = highlightSnippet(buildSnippet(text, query), query);
    button.appendChild(title);
    button.appendChild(snippet);
    button.addEventListener('click', () => {
      goToIndex(result.index);
      closeSearchPanel();
    });
    searchResults.appendChild(button);
  });
}

function highlightSnippet(snippet, query) {
  if (!query) return snippet;
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (!terms.length) {
    return snippet;
  }
  const escaped = terms.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regexp = new RegExp(`(${escaped})`, 'gi');
  return snippet.replace(regexp, '<mark>$1</mark>');
}

function loadReadingGoal() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const stored = JSON.parse(localStorage.getItem(GOAL_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      if (stored.lastUpdated !== today) {
        stored.minutesToday = 0;
      }
      return {
        dailyMinutesTarget: stored.dailyMinutesTarget || 20,
        minutesToday: stored.minutesToday || 0,
        lastUpdated: today,
      };
    }
  } catch (err) {
    // ignore
  }
  return { dailyMinutesTarget: 20, minutesToday: 0, lastUpdated: today };
}

function persistReadingGoal(goal) {
  readingGoal = { ...goal, lastUpdated: goal.lastUpdated || new Date().toISOString().slice(0, 10) };
  localStorage.setItem(GOAL_KEY, JSON.stringify(readingGoal));
  updateGoalUI();
}

function updateGoalUI() {
  if (goalProgressLabel) {
    goalProgressLabel.textContent = `${readingGoal.minutesToday} / ${readingGoal.dailyMinutesTarget} min`;
  }
  if (goalProgressBar) {
    const percent = readingGoal.dailyMinutesTarget
      ? Math.min(100, Math.round((readingGoal.minutesToday / readingGoal.dailyMinutesTarget) * 100))
      : 0;
    goalProgressBar.style.width = `${percent}%`;
  }
  if (goalTargetInput) {
    goalTargetInput.value = readingGoal.dailyMinutesTarget.toString();
  }
}

function startGoalTimer() {
  if (goalTimerId || document.hidden) return;
  goalTimerId = window.setInterval(() => incrementGoalMinutes(1), 60000);
}

function stopGoalTimer() {
  if (!goalTimerId) return;
  window.clearInterval(goalTimerId);
  goalTimerId = null;
}

function incrementGoalMinutes(delta) {
  const today = new Date().toISOString().slice(0, 10);
  const minutes = Math.max(0, readingGoal.minutesToday + delta);
  persistReadingGoal({ ...readingGoal, minutesToday: minutes, lastUpdated: today });
}

function handleSelectionChange() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    selectionState = null;
    hideSelectionToolbar();
    return;
  }
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  if (!range || !selectionWithinReader(range)) {
    selectionState = null;
    hideSelectionToolbar();
    return;
  }
  const text = selection.toString().trim();
  if (!text) {
    selectionState = null;
    hideSelectionToolbar();
    return;
  }
  const anchor = range.startContainer?.parentElement?.closest('[data-paragraph-index]');
  if (!anchor) {
    selectionState = null;
    hideSelectionToolbar();
    return;
  }
  const paraIndex = Number(anchor.getAttribute('data-paragraph-index'));
  if (!Number.isFinite(paraIndex) || !paragraphs[paraIndex]) {
    selectionState = null;
    hideSelectionToolbar();
    return;
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  const paragraphText = paragraphs[paraIndex];
  let start = paragraphText.indexOf(normalized);
  if (start === -1) {
    start = Math.max(0, range.startOffset);
  }
  const end = Math.min(paragraphText.length, start + normalized.length);
  selectionState = { paraIndex, text: normalized, start, end };
  showSelectionToolbar(range.getBoundingClientRect());
}

function selectionWithinReader(range) {
  const container = range.commonAncestorContainer;
  if (!(reader && container)) return false;
  const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
  return reader.contains(element);
}

function showSelectionToolbar(rect) {
  if (!selectionToolbar || !rect) return;
  selectionToolbar.style.top = `${Math.max(80, rect.top + window.scrollY - 60)}px`;
  selectionToolbar.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
  selectionToolbar.classList.add('is-visible');
}

function hideSelectionToolbar() {
  selectionToolbar?.classList.remove('is-visible');
}

function createHighlight(color = 'sun') {
  if (!selectionState) return null;
  const { paraIndex, text, start, end } = selectionState;
  const annotation = {
    id: crypto.randomUUID(),
    color,
    paraIndex,
    start,
    end,
    text,
    createdAt: Date.now(),
    note: '',
    cfi: buildCfi(paraIndex, start),
  };
  annotations.push(annotation);
  persistAnnotations();
  applyAnnotationsToParagraph(paraIndex);
  renderAnnotationsList(annotationsSearch?.value || '');
  hideSelectionToolbar();
  selectionState = null;
  return annotation;
}

async function persistAnnotations() {
  try {
    await updateBook(bookId, { annotations });
  } catch (err) {
    console.warn('Failed to persist annotations', err);
  }
}

function openAnnotationsPanel() {
  setPanelVisibility(annotationsPanel, annotationsBackdrop, 'annotations', true);
  renderAnnotationsList(annotationsSearch?.value || '');
  annotationsSearch?.focus();
}

function closeAnnotationsPanel() {
  setPanelVisibility(annotationsPanel, annotationsBackdrop, 'annotations', false);
}

function renderAnnotationsList(filter = '') {
  if (!annotationsList || !annotationsEmpty) return;
  const query = filter.trim().toLowerCase();
  const entries = annotations.filter((annotation) => {
    if (!query) return true;
    return (
      annotation.text.toLowerCase().includes(query) ||
      (annotation.note || '').toLowerCase().includes(query)
    );
  });
  annotationsList.innerHTML = '';
  if (!entries.length) {
    annotationsEmpty.textContent = query ? 'No annotations match that search.' : 'No highlights yet. Select text to create one.';
    annotationsEmpty.classList.remove('hidden');
    return;
  }
  annotationsEmpty.classList.add('hidden');
  entries
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((annotation) => {
      const item = document.createElement('div');
      item.className = 'annotation-chip';
      item.dataset.annotationId = annotation.id;
      const meta = document.createElement('div');
      meta.className = 'annotation-chip__meta flex items-center justify-between gap-2';
      const colorDot = document.createElement('span');
      colorDot.className = `annotation-color highlight-${annotation.color}`;
      meta.appendChild(colorDot);
      const metaText = document.createElement('span');
      metaText.textContent = `Paragraph ${annotation.paraIndex + 1}`;
      meta.appendChild(metaText);
      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-2';
      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.textContent = 'Go';
      goBtn.className = 'text-xs font-semibold';
      goBtn.addEventListener('click', () => {
        goToIndex(annotation.paraIndex);
        closeAnnotationsPanel();
      });
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Note';
      editBtn.className = 'text-xs font-semibold';
      editBtn.addEventListener('click', () => {
        pendingNoteTarget = annotation.id;
        noteInput.value = annotation.note || '';
        setPanelVisibility(notePanel, noteBackdrop, 'note', true);
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'text-xs font-semibold text-rose-500';
      deleteBtn.addEventListener('click', () => deleteAnnotation(annotation.id));
      actions.append(goBtn, editBtn, deleteBtn);
      meta.appendChild(actions);
      const quote = document.createElement('p');
      quote.className = 'mt-2 text-sm text-[#333333] dark:text-gray-100';
      quote.textContent = annotation.text;
      const note = document.createElement('p');
      note.className = 'mt-1 text-xs text-[#666666] dark:text-gray-400';
      note.textContent = annotation.note || '';
      item.append(meta, quote);
      if (annotation.note) {
        item.appendChild(note);
      }
      annotationsList.appendChild(item);
    });
}

function deleteAnnotation(annotationId) {
  const target = annotations.find((entry) => entry.id === annotationId);
  annotations = annotations.filter((entry) => entry.id !== annotationId);
  persistAnnotations();
  if (target) {
    applyAnnotationsToParagraph(target.paraIndex);
  } else {
    applyAnnotations();
  }
  renderAnnotationsList(annotationsSearch?.value || '');
}

function scrollToAnnotation(annotationId) {
  const node = annotationsList?.querySelector(`[data-annotation-id="${annotationId}"]`);
  if (!node) return;
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  node.classList.add('ring-2', 'ring-primary/60');
  window.setTimeout(() => node.classList.remove('ring-2', 'ring-primary/60'), 1200);
}

function openNotePanel() {
  const annotation = createHighlight('sun');
  if (!annotation) return;
  pendingNoteTarget = annotation.id;
  if (noteInput) {
    noteInput.value = annotation.note || '';
  }
  setPanelVisibility(notePanel, noteBackdrop, 'note', true);
}

function closeNotePanel() {
  setPanelVisibility(notePanel, noteBackdrop, 'note', false);
}

function saveNote() {
  if (!pendingNoteTarget) {
    closeNotePanel();
    return;
  }
  const target = annotations.find((entry) => entry.id === pendingNoteTarget);
  if (target) {
    target.note = noteInput?.value.trim() || '';
    persistAnnotations();
    renderAnnotationsList(annotationsSearch?.value || '');
  }
  pendingNoteTarget = null;
  closeNotePanel();
}

async function lookupSelection() {
  if (!selectionState) return;
  await openDictionaryPanel(selectionState.text.split(/\s+/)[0]);
}

async function openDictionaryPanel(word) {
  if (!word) return;
  await loadDictionaryPack();
  const normalized = word.toLowerCase();
  lastLookupWord = normalized;
  const entry = dictionaryData?.[normalized];
  if (dictionaryWord) dictionaryWord.textContent = normalized;
  if (dictionaryDefinition) dictionaryDefinition.textContent = entry?.definition || 'Definition not found in offline pack.';
  if (dictionaryTranslation) dictionaryTranslation.textContent = '';
  setPanelVisibility(dictionaryPanel, dictionaryBackdrop, 'dictionary', true);
}

function closeDictionaryPanel() {
  setPanelVisibility(dictionaryPanel, dictionaryBackdrop, 'dictionary', false);
}

async function loadDictionaryPack() {
  if (dictionaryData || !appConfig?.DICTIONARY_PACK_URL) return;
  try {
    const res = await fetch(appConfig.DICTIONARY_PACK_URL);
    if (!res.ok) throw new Error(res.statusText);
    const payload = await res.json();
    dictionaryData = payload?.entries || payload;
  } catch (err) {
    console.warn('Failed to load dictionary pack', err);
    dictionaryData = {};
  }
}

function addVocabularyEntry(word) {
  const normalized = (word || '').trim();
  if (!normalized) return;
  const sentence = selectionState?.text || quoteCardText?.textContent || '';
  const definition = dictionaryDefinition?.textContent || '';
  const existingIndex = vocabulary.findIndex((entry) => entry.word.toLowerCase() === normalized.toLowerCase());
  if (existingIndex >= 0) {
    vocabulary[existingIndex] = {
      ...vocabulary[existingIndex],
      word: normalized,
      definition,
      sentence,
    };
  } else {
    vocabulary.push({
      id: crypto.randomUUID(),
      word: normalized,
      definition,
      sentence,
      status: 'new',
      createdAt: Date.now(),
    });
  }
  persistVocabulary();
}

function requestTranslation(word) {
  if (!word) return;
  if (!translationService || !translationService.enabled) {
    if (dictionaryTranslation) {
      dictionaryTranslation.textContent = 'Translation provider not configured.';
    }
    return;
  }
  if (!translationConsent) {
    pendingTranslationWord = word;
    openTranslationConsentPanel();
    return;
  }
  void performTranslation(word);
}

async function performTranslation(word) {
  if (!dictionaryTranslation) return;
  dictionaryTranslation.textContent = 'Translating…';
  try {
    const result = await translationService.translate(word);
    dictionaryTranslation.textContent = result || 'No translation available.';
  } catch (err) {
    console.warn('translation failed', err);
    dictionaryTranslation.textContent = err.message || 'Translation failed.';
  }
}

function openTranslationConsentPanel() {
  setPanelVisibility(translationConsentPanel, translationConsentBackdrop, 'translation-consent', true);
}

function closeTranslationConsentPanel() {
  setPanelVisibility(translationConsentPanel, translationConsentBackdrop, 'translation-consent', false);
}

function acceptTranslationConsent() {
  translationConsent = true;
  persistTranslationConsent(true);
  closeTranslationConsentPanel();
  if (pendingTranslationWord) {
    void performTranslation(pendingTranslationWord);
    pendingTranslationWord = '';
  }
}

function declineTranslationConsent() {
  translationConsent = false;
  persistTranslationConsent(false);
  closeTranslationConsentPanel();
  pendingTranslationWord = '';
  if (dictionaryTranslation) {
    dictionaryTranslation.textContent = 'Translation cancelled.';
  }
}

function loadVocabulary() {
  try {
    const stored = JSON.parse(localStorage.getItem(VOCAB_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .map((entry) => {
        const word = (entry.word || '').trim();
        if (!word) return null;
        return {
          id: entry.id || crypto.randomUUID(),
          word,
          definition: entry.definition || '',
          sentence: entry.sentence || '',
          status: VOCAB_STATUSES.includes(entry.status) ? entry.status : 'new',
          createdAt: Number(entry.createdAt) || Date.now(),
        };
      })
      .filter(Boolean);
  } catch (err) {
    return [];
  }
}

function loadTranslationConsent() {
  try {
    return localStorage.getItem(TRANSLATION_CONSENT_KEY) === 'true';
  } catch (err) {
    return false;
  }
}

function persistTranslationConsent(value) {
  try {
    localStorage.setItem(TRANSLATION_CONSENT_KEY, String(Boolean(value)));
  } catch (err) {
    console.warn('Failed to persist translation consent', err);
  }
}

function persistVocabulary() {
  try {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(vocabulary));
    if (openPanels.has('vocab')) {
      renderVocabularyList();
    }
  } catch (err) {
    console.warn('Failed to persist vocabulary', err);
  }
}

function openQuotePanel() {
  const text = selectionState?.text;
  if (!text) return;
  if (quoteCardText) {
    quoteCardText.textContent = text;
  }
  if (quoteCardMeta) {
    quoteCardMeta.textContent = `Paragraph ${selectionState.paraIndex + 1}`;
  }
  setPanelVisibility(quotePanel, quoteBackdrop, 'quote', true);
}

function openVocabularyPanel() {
  renderVocabularyList();
  setPanelVisibility(vocabPanel, vocabBackdrop, 'vocab', true);
}

function closeVocabularyPanel() {
  setPanelVisibility(vocabPanel, vocabBackdrop, 'vocab', false);
}

function renderVocabularyList() {
  if (!vocabList || !vocabEmpty) return;
  vocabList.innerHTML = '';
  const query = (vocabSearchState || '').trim().toLowerCase();
  const filter = vocabFilterState;
  const entries = vocabulary
    .filter((entry) => {
      if (!entry.word) return false;
      if (filter !== 'all' && entry.status !== filter) return false;
      if (!query) return true;
      return (
        entry.word.toLowerCase().includes(query) ||
        entry.definition.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!entries.length) {
    vocabEmpty.classList.remove('hidden');
    return;
  }
  vocabEmpty.classList.add('hidden');
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'vocab-entry';
    const header = document.createElement('div');
    header.className = 'vocab-entry__header';
    const word = document.createElement('h3');
    word.className = 'text-base font-semibold text-[#333333] dark:text-gray-100';
    word.textContent = entry.word;
    header.appendChild(word);
    const status = document.createElement('span');
    status.className = 'vocab-status';
    status.dataset.state = entry.status;
    status.textContent = entry.status;
    header.appendChild(status);
    item.appendChild(header);
    if (entry.definition) {
      const definition = document.createElement('p');
      definition.className = 'text-sm text-[#555555] dark:text-gray-300';
      definition.textContent = entry.definition;
      item.appendChild(definition);
    }
    if (entry.sentence) {
      const sentence = document.createElement('p');
      sentence.className = 'text-xs text-[#777777] dark:text-gray-400';
      sentence.textContent = `“${entry.sentence}”`;
      item.appendChild(sentence);
    }
    const actions = document.createElement('div');
    actions.className = 'vocab-entry__actions';
    const select = document.createElement('select');
    VOCAB_STATUSES.forEach((state) => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state.charAt(0).toUpperCase() + state.slice(1);
      option.selected = entry.status === state;
      select.appendChild(option);
    });
    select.addEventListener('change', (event) => setVocabularyStatus(entry.id, event.target.value));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => deleteVocabularyEntry(entry.id));
    actions.append(select, remove);
    item.appendChild(actions);
    vocabList.appendChild(item);
  });
}

function setVocabularyStatus(id, status) {
  if (!VOCAB_STATUSES.includes(status)) return;
  const target = vocabulary.find((entry) => entry.id === id);
  if (!target) return;
  target.status = status;
  persistVocabulary();
}

function deleteVocabularyEntry(id) {
  const next = vocabulary.filter((entry) => entry.id !== id);
  if (next.length === vocabulary.length) return;
  vocabulary = next;
  persistVocabulary();
}

function closeQuotePanel() {
  setPanelVisibility(quotePanel, quoteBackdrop, 'quote', false);
}

function copyQuoteText() {
  const text = `${quoteCardText?.textContent || ''}\n${quoteCardMeta?.textContent || ''}`.trim();
  navigator.clipboard?.writeText(text).catch(() => {});
}

function systemShareQuote() {
  if (navigator.share) {
    navigator.share({ text: `${quoteCardText?.textContent || ''}\n${quoteCardMeta?.textContent || ''}`.trim() }).catch(() => {});
  } else {
    copyQuoteText();
  }
}

function shareSelectionText() {
  if (!selectionState) return;
  const payload = selectionState.text;
  if (navigator.share) {
    navigator.share({ text: payload }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(payload).catch(() => {});
  }
  hideSelectionToolbar();
}

function toggleSketchLayer() {
  sketchActive = !sketchActive;
  updateSketchToggleUI();
}

function updateSketchToggleUI() {
  if (sketchToggle) {
    sketchToggle.dataset.active = String(sketchActive);
    const label = sketchToggle.querySelector('span:last-child');
    if (label) {
      label.textContent = sketchActive ? 'On' : 'Off';
    }
  }
  reader?.classList.toggle('sketch-layer-active', sketchActive);
  if (sketchLayer) {
    sketchLayer.classList.toggle('pointer-events-none', !sketchActive);
  }
}

function initSketchLayer() {
  if (!sketchLayer || !bookStage) return;
  sketchCtx = sketchLayer.getContext('2d');
  resizeSketchLayer();
  redrawSketch();
  sketchLayer.addEventListener('pointerdown', startStroke);
  sketchLayer.addEventListener('pointermove', drawStroke);
  sketchLayer.addEventListener('pointerup', endStroke);
  sketchLayer.addEventListener('pointerleave', endStroke);
  window.addEventListener('resize', resizeSketchLayer);
}

function resizeSketchLayer() {
  if (!sketchLayer || !bookStage) return;
  const rect = bookStage.getBoundingClientRect();
  sketchLayer.width = rect.width;
  sketchLayer.height = rect.height;
  redrawSketch();
}

function startStroke(event) {
  if (!sketchActive || !sketchCtx) return;
  event.preventDefault();
  currentStroke = { color: '#0a84ff', width: 2, points: [] };
  sketchCtx.beginPath();
  sketchCtx.moveTo(event.offsetX, event.offsetY);
  currentStroke.points.push([event.offsetX, event.offsetY]);
  sketchLayer.setPointerCapture?.(event.pointerId);
}

function drawStroke(event) {
  if (!sketchActive || !sketchCtx || !currentStroke) return;
  event.preventDefault();
  sketchCtx.lineWidth = currentStroke.width;
  sketchCtx.strokeStyle = currentStroke.color;
  sketchCtx.lineCap = 'round';
  sketchCtx.lineTo(event.offsetX, event.offsetY);
  sketchCtx.stroke();
  currentStroke.points.push([event.offsetX, event.offsetY]);
}

function endStroke(event) {
  if (!currentStroke || !currentStroke.points.length) {
    currentStroke = null;
    return;
  }
  sketchStrokes.push(currentStroke);
  persistSketchStrokes();
  currentStroke = null;
  if (event?.pointerId != null) {
    sketchLayer.releasePointerCapture?.(event.pointerId);
  }
}

function redrawSketch() {
  if (!sketchCtx || !sketchLayer) return;
  sketchCtx.clearRect(0, 0, sketchLayer.width, sketchLayer.height);
  sketchCtx.lineCap = 'round';
  sketchStrokes.forEach((stroke) => {
    if (!stroke.points.length) return;
    sketchCtx.beginPath();
    sketchCtx.lineWidth = stroke.width;
    sketchCtx.strokeStyle = stroke.color;
    sketchCtx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    stroke.points.slice(1).forEach((point) => {
      sketchCtx.lineTo(point[0], point[1]);
    });
    sketchCtx.stroke();
  });
}

function persistSketchStrokes() {
  try {
    localStorage.setItem(`paperread-sketch-${bookId}`, JSON.stringify(sketchStrokes));
  } catch (err) {
    console.warn('Failed to persist sketches', err);
  }
}

function loadSketchStrokes(id) {
  try {
    return JSON.parse(localStorage.getItem(`paperread-sketch-${id}`) || '[]');
  } catch (err) {
    return [];
  }
}
