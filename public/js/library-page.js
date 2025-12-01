import '../css/main.css';
import { applySavedTheme, toggleTheme } from './utils/theme.js';
import { importBook, listBooks, deleteBook } from './storage/library.js';
import { loadConfig } from './utils/config.js';
import { consumeAudioUrls } from './storage/audio-cache.js';
import { isFeatureEnabled } from './utils/feature-flags.js';
import { DiagnosticsPanel } from './ui/diagnostics-panel.js';
import { measureMetric } from './utils/telemetry.js';
import { exportSelected } from './export/backup.js';
import { setFeatureFlag } from './utils/feature-flags.js';

import { loadTags, saveTags, listBooksByTag, getTagsForBook, setTagsForBook, addTag, removeTag, getTagIndex, saveTagIndex } from './storage/tags.js';

applySavedTheme();
registerServiceWorker();
void mountDiagnosticsPanel('library');

const fileInput = document.getElementById('file-input');
const fileTrigger = document.getElementById('file-trigger');
const dropZone = document.querySelector('[aria-label="Upload books"]');
const libraryGrid = document.getElementById('library-grid');
const libraryEmpty = document.getElementById('library-empty');
const searchInput = document.getElementById('library-search');
const sortSelect = document.getElementById('sort-select');
const themeToggle = document.getElementById('theme-toggle');
const syncBanner = document.getElementById('sync-banner');
const viewToggle = document.getElementById('view-toggle');
const tagFilter = document.getElementById('tag-filter');
const stateFilter = document.getElementById('state-filter');
const tagManageBtn = document.getElementById('tag-manage');
const batchBtn = document.getElementById('batch-actions');
const selectNoneBtn = document.getElementById('select-none');
const selectedCountEl = document.getElementById('selected-count');
const mdBackdrop = document.getElementById('metadata-backdrop');
const mdModal = document.getElementById('metadata-modal');
const mdTitle = document.getElementById('md-title');
const mdAuthor = document.getElementById('md-author');
const mdSeries = document.getElementById('md-series');
const mdDescription = document.getElementById('md-description');
const mdSave = document.getElementById('md-save');
const mdCancel = document.getElementById('md-cancel');
const mdSample = document.getElementById('md-sample');
const mdWishlist = document.getElementById('md-wishlist');
/* importBackup button removed */
const syncToggle = document.getElementById('sync-toggle');
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastUndo = document.getElementById('toast-undo');
const toastClose = document.getElementById('toast-close');
const importBackdrop = document.getElementById('import-backdrop');
const importModal = document.getElementById('import-modal');
const importList = document.getElementById('import-list');
const importConfirm = document.getElementById('import-confirm');
const importCancel = document.getElementById('import-cancel');
const tagBackdrop = document.getElementById('tag-backdrop');
const tagModal = document.getElementById('tag-modal');
const tagInput = document.getElementById('tag-input');
const tagAdd = document.getElementById('tag-add');
const tagList = document.getElementById('tag-list');
const tagAssignList = document.getElementById('tag-assign-list');
const tagClose = document.getElementById('tag-close');

let books = [];
let filterText = '';
let sortMode = 'recent';
let backendBase = 'http://localhost:8750';
let viewMode = (localStorage.getItem('paperread-library-view') || 'grid');
let tagFilterValue = '';
let stateFilterValue = 'all';
let selectedIds = new Set();
let editingId = null;
let lastTagAction = null;
const GOAL_KEY = 'paperread-reading-goal';

loadConfig().then((cfg) => {
  backendBase = (cfg.OFFLINE_TTS_URL || 'http://localhost:8750').replace(/\/$/, '');
});

init();
window.addEventListener('online', () => { void setupSyncBanner(); });
window.addEventListener('offline', () => { void setupSyncBanner(); });

function init() {
  fileTrigger?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', handleFiles);
  dropZone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('ring-4', 'ring-primary/60');
  });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('ring-4', 'ring-primary/60'));
  dropZone?.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('ring-4', 'ring-primary/60');
    const files = event.dataTransfer?.files;
    if (files?.length) {
      void handleFiles({ target: { files } });
    }
  });
  searchInput?.addEventListener('input', (event) => {
    filterText = event.target.value.toLowerCase();
    renderLibrary();
  });
  sortSelect?.addEventListener('change', (event) => {
    sortMode = event.target.value;
    renderLibrary();
  });
  themeToggle?.addEventListener('click', () => toggleTheme());
  tagFilter?.addEventListener('change', (event) => {
    tagFilterValue = event.target.value || '';
    renderLibrary();
  });
  stateFilter?.addEventListener('change', (event) => {
    stateFilterValue = event.target.value || 'all';
    renderLibrary();
  });
  tagManageBtn?.addEventListener('click', () => openTagManager());
  tagAdd?.addEventListener('click', () => { const name = tagInput.value.trim(); if (name) { addTag(name); tagInput.value = ''; populateTagFilter(); renderTagLists(); } });
  tagClose?.addEventListener?.('click', () => closeTagManager());
  batchBtn?.addEventListener('click', () => openBatchActions());
  selectNoneBtn?.addEventListener('click', () => { selectedIds.clear(); updateSelectedCount(); renderLibrary(); });
  mdCancel?.addEventListener('click', () => closeMetadataModal());
  mdSave?.addEventListener('click', () => saveMetadata());
  /* importBackup removed */
  syncToggle?.addEventListener('click', () => {
    setFeatureFlag('syncScaffolding', true);
    void setupSyncBanner();
    alert('Sync beta flag enabled (local override).');
  });
  toastClose?.addEventListener('click', () => hideToast());
  viewToggle?.addEventListener('click', () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    const pressed = viewMode === 'list';
    viewToggle.setAttribute('aria-pressed', String(pressed));
    const icon = viewToggle.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = pressed ? 'view_list' : 'view_module';
    applyViewClass();
    renderLibrary();
    try { localStorage.setItem('paperread-library-view', viewMode); } catch { }
  });
  void setupSyncBanner();
  loadBooks();
  populateTagFilter();
}

async function handleFiles(event) {
  const files = event.target?.files;
  if (!files?.length) return;
  for (const file of files) {
    if (!/\.(epub|pdf|txt)$/i.test(file.name)) {
      alert('Unsupported file type. Please select .epub, .pdf, or .txt');
      continue;
    }
    try {
      const record = await importBook(file);
      books.unshift(record);
      renderLibrary();
    } catch (err) {
      console.error(err);
      alert(`Failed to import ${file.name}: ${err.message}`);
    }
  }
  fileInput.value = '';
}

async function loadBooks() {
  books = await measureMetric('library-load', () => listBooks());
  renderLibrary();
  renderContinueReading();
  renderTimeline();
  renderAnalyticsCards();
  void backfillMissingOrInvalidCovers();
}

function renderLibrary() {
  measureMetric('library-render', () => {
    libraryGrid.innerHTML = '';
    applyViewClass();
    let filtered = books
      .filter((book) => {
        if (!filterText) return true;
        return (
          book.title?.toLowerCase().includes(filterText) ||
          book.author?.toLowerCase().includes(filterText)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'az') return a.title.localeCompare(b.title);
        if (sortMode === 'za') return b.title.localeCompare(a.title);
        return b.addedAt - a.addedAt;
      });
    filtered = listBooksByTag(filtered, tagFilterValue);
    if (stateFilterValue === 'samples') filtered = filtered.filter((b) => b.isSample);
    if (stateFilterValue === 'wishlist') filtered = filtered.filter((b) => b.isWishlist);
    if (!filtered.length) {
      libraryEmpty.classList.remove('hidden');
      return;
    }
    libraryEmpty.classList.add('hidden');
    filtered.forEach((book) => libraryGrid.appendChild(viewMode === 'list' ? renderBookListItem(book) : renderBookCard(book)));
    updateSelectedCount();
  });
}

function renderContinueReading() {
  const card = document.getElementById('continue-reading');
  const contentEl = document.getElementById('continue-reading-content');
  if (!card || !contentEl) return;
  const candidate = books.find((b) => b.lastReadLocation || (b.stats && b.stats.last_session_at)) || books[0];
  if (!candidate) { card.classList.add('hidden'); return; }
  const loc = candidate.lastReadLocation ? `para ${candidate.lastReadLocation.para}` : 'start';
  contentEl.textContent = `${candidate.title} — ${candidate.author || ''} · ${loc}`;
  card.classList.remove('hidden');
}

function renderTimeline() {
  const section = document.getElementById('timeline-section');
  const list = document.getElementById('timeline-list');
  if (!section || !list) return;
  if (!books.length) { section.classList.add('hidden'); return; }
  const groups = new Map();
  for (const b of books) {
    const ts = (b.stats && b.stats.last_session_at) || b.addedAt || Date.now();
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const html = Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([day, items]) => {
    const rows = items.map((b) => `<li class="flex items-center justify-between"><span class="text-xs">${b.title}</span><span class="text-[10px] text-[#333333]/60 dark:text-gray-400">${(b.author || '')}</span></li>`).join('');
    return `<li class="rounded-2xl border border-gray-200 bg-white/80 p-3 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"><div class="mb-2 font-semibold">${day}</div><ul class="space-y-1">${rows}</ul></li>`;
  }).join('');
  list.innerHTML = html;
  section.classList.remove('hidden');
}

function readGoal() {
  try {
    return JSON.parse(localStorage.getItem(GOAL_KEY) || 'null') || null;
  } catch {
    return null;
  }
}

function renderAnalyticsCards() {
  const container = document.getElementById('analytics-cards');
  const minutesEl = document.getElementById('analytics-minutes');
  const goalEl = document.getElementById('analytics-goal');
  const lastEl = document.getElementById('analytics-last-session');
  if (!container || !minutesEl || !goalEl || !lastEl) return;
  const goal = readGoal();
  const todayMinutes = Number(goal?.minutesToday || 0);
  const target = Number(goal?.dailyMinutesTarget || 20);
  minutesEl.textContent = String(todayMinutes);
  const percent = target ? Math.min(100, Math.round((todayMinutes / target) * 100)) : 0;
  goalEl.textContent = `${percent}%`;
  const recent = books.find((b) => b.stats && b.stats.last_session_at);
  if (recent) {
    const d = new Date(recent.stats.last_session_at);
    lastEl.textContent = `${recent.title} · ${d.toLocaleString()}`;
  } else {
    lastEl.textContent = '—';
  }
  container.classList.remove('hidden');
}

function renderBookCard(book) {
  const button = document.createElement('button');
  button.className = 'group relative flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/40 dark:border-zinc-800 dark:bg-zinc-900/80';
  button.type = 'button';
  button.setAttribute('aria-label', `Open ${book.title}`);
  const coverStyle = book.cover ? `background-image:url(${book.cover}); background-size:cover; background-position:center;` : '';
  button.innerHTML = `
    <div class="flex items-center gap-3">
      <input type="checkbox" class="h-4 w-4 rounded border-gray-300" data-select="${book.id}" ${selectedIds.has(book.id) ? 'checked' : ''} aria-label="Select" />
      <div class="h-14 w-14 rounded-xl bg-gray-200 text-2xl font-black text-[#333333] flex items-center justify-center uppercase" style="${coverStyle}">${book.cover ? '' : book.title.slice(0, 2)}</div>
      <div class="flex flex-col">
        <span class="text-base font-bold text-[#333333] dark:text-gray-100">${book.title}</span>
        <span class="text-sm text-[#333333]/60 dark:text-gray-400">${book.author || 'Unknown author'}</span>
        <span class="text-xs text-[#333333]/50 dark:text-gray-500">Tags: ${(getTagsForBook(book.id).join(', ')) || '-'}</span>
        <div class="mt-1 flex flex-wrap gap-1">
          ${book.series ? `<span class=\"rounded-full bg-[#333333]/10 px-2 py-0.5 text-[10px] text-[#333333]\">Series</span>` : ''}
          ${book.isSample ? `<span class=\"rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700\">Sample</span>` : ''}
          ${book.isWishlist ? `<span class=\"rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700\">Wishlist</span>` : ''}
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between text-xs text-[#333333]/60 dark:text-gray-400">
      <span>${formatBytes(book.fileSize)}</span>
      <span>${formatMediaType(book.mediaType)}</span>
    </div>
    <div class="flex items-center justify-between text-xs text-[#333333]/60 dark:text-gray-400">
      <span>${formatProgress(book)}</span>
      <div class="flex items-center gap-2">
        <button data-edit="${book.id}" class="rounded-full px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50" type="button">Edit</button>
        <button data-delete="${book.id}" class="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" type="button">Delete</button>
      </div>
    </div>
  `;
  button.addEventListener('click', (event) => {
    if (event.target.closest('button[data-delete]')) return;
    if (event.target.closest('button[data-edit]')) { openMetadataModal(book.id); return; }
    if (event.target.matches('input[type="checkbox"][data-select]')) {
      const id = event.target.getAttribute('data-select');
      event.stopPropagation();
      if (event.target.checked) selectedIds.add(id); else selectedIds.delete(id);
      updateSelectedCount();
      return;
    }
    openReader(book.id);
  });
  button.querySelector('[data-delete]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    confirmDelete(book.id);
  });
  button.querySelector('[data-edit]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openMetadataModal(book.id);
  });
  return button;
}

function renderBookListItem(book) {
  const item = document.createElement('button');
  item.className = 'group grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-gray-200 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/40 dark:border-zinc-800 dark:bg-zinc-900/80';
  item.type = 'button';
  item.setAttribute('aria-label', `Open ${book.title}`);
  item.innerHTML = `
    <div class="flex items-center gap-3">
      <input type="checkbox" class="h-4 w-4 rounded border-gray-300" data-select="${book.id}" ${selectedIds.has(book.id) ? 'checked' : ''} aria-label="Select" />
      <div class="h-10 w-10 rounded-lg bg-gray-200 text-base font-black text-[#333333] flex items-center justify-center uppercase" style="${book.cover ? `background-image:url(${book.cover}); background-size:cover; background-position:center;` : ''}">${book.cover ? '' : (book.title || '').slice(0, 2)}</div>
      <div class="flex flex-col">
        <span class="text-sm font-bold text-[#333333] dark:text-gray-100">${book.title}</span>
        <span class="text-xs text-[#333333]/60 dark:text-gray-400">${book.author || 'Unknown author'}</span>
        <span class="text-xs text-[#333333]/50 dark:text-gray-500">Tags: ${(getTagsForBook(book.id).join(', ')) || '-'}</span>
        <div class="mt-1 flex flex-wrap gap-1">
          ${book.series ? `<span class=\"rounded-full bg-[#333333]/10 px-2 py-0.5 text-[10px] text-[#333333]\">Series</span>` : ''}
          ${book.isSample ? `<span class=\"rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700\">Sample</span>` : ''}
          ${book.isWishlist ? `<span class=\"rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700\">Wishlist</span>` : ''}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3 text-xs text-[#333333]/60 dark:text-gray-400">
      <span>${formatProgress(book)}</span>
      <span>${formatMediaType(book.mediaType)}</span>
      <span>${formatBytes(book.fileSize)}</span>
      <button data-edit="${book.id}" class="rounded-full px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50" type="button">Edit</button>
      <button data-delete="${book.id}" class="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" type="button">Delete</button>
    </div>
  `;
  item.addEventListener('click', (event) => {
    if (event.target.closest('button[data-delete]')) return;
    if (event.target.closest('button[data-edit]')) { openMetadataModal(book.id); return; }
    if (event.target.matches('input[type="checkbox"][data-select]')) {
      const id = event.target.getAttribute('data-select');
      event.stopPropagation();
      if (event.target.checked) selectedIds.add(id); else selectedIds.delete(id);
      updateSelectedCount();
      return;
    }
    openReader(book.id);
  });
  item.querySelector('[data-delete]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    confirmDelete(book.id);
  });
  item.querySelector('[data-edit]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openMetadataModal(book.id);
  });
  return item;
}

function applyViewClass() {
  if (!libraryGrid) return;
  if (viewMode === 'list') {
    libraryGrid.className = 'mt-2 flex flex-col gap-2';
  } else {
    libraryGrid.className = 'mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';
  }
}

async function confirmDelete(id) {
  const ok = confirm('Delete this book and its audio cache?');
  if (!ok) return;
  await deleteBook(id);
  purgeCachedAudio(id);
  try {
    await fetch(`${backendBase}/library/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('backend delete skipped', err);
  }
  books = books.filter((book) => book.id !== id);
  renderLibrary();
}

function openReader(id) {
  const url = new URL('reading.html', window.location.href);
  url.searchParams.set('bookId', id);
  window.location.href = url.toString();
}

function formatProgress(book) {
  if (!book.lastReadLocation) return 'Not started';
  if (typeof book.lastReadLocation === 'string') return `Last read ${book.lastReadLocation}`;
  const para = Number(book.lastReadLocation?.para);
  if (Number.isFinite(para)) {
    return `Paragraph ${para + 1}`;
  }
  return 'In progress';
}

function purgeCachedAudio(bookId) {
  const payload = consumeAudioUrls(bookId);
  if (!payload.offline?.length && !payload.online?.length) return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: 'DELETE_AUDIO', payload }))
      .catch(() => { });
  }
}

function populateTagFilter() {
  if (!tagFilter) return;
  const tags = loadTags();
  tagFilter.innerHTML = '<option value="">All</option>' + tags.map((t) => `<option value="${t}">${t}</option>`).join('');
}

function openTagManager() {
  if (!tagModal || !tagBackdrop) return;
  renderTagLists();
  tagBackdrop.classList.remove('hidden');
  tagModal.classList.remove('hidden');
}

function renderTagLists() {
  const tags = loadTags();
  tagList.innerHTML = tags.map((t) => `<li class="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-zinc-800"><span>${t}</span><button data-remove-tag="${t}" class="rounded-full px-2 py-1 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50">Remove</button></li>`).join('');
  tagList.querySelectorAll('[data-remove-tag]').forEach((btn) => {
    btn.addEventListener('click', () => { const name = btn.getAttribute('data-remove-tag'); const snapshot = getTagIndex(); try { removeTag(name); populateTagFilter(); renderTagLists(); renderLibrary(); showToast(`Removed tag ${name}`, () => { saveTagIndex(snapshot); renderTagLists(); renderLibrary(); }); } catch (err) { showToast('Tag remove failed: ' + err.message); } });
  });
  tagAssignList.innerHTML = tags.map((t) => `<div class="flex items-center gap-2"><button data-assign-tag="${t}" class="rounded-full border border-gray-200 px-2 py-1 text-xs font-semibold text-[#333333] hover:border-primary dark:border-zinc-800 dark:text-gray-100" type="button">Assign ${t}</button><button data-unassign-tag="${t}" class="rounded-full border border-gray-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:border-rose-400 dark:border-zinc-800" type="button">Remove ${t}</button></div>`).join('');
  tagAssignList.querySelectorAll('[data-assign-tag]').forEach((btn) => {
    btn.addEventListener('click', () => { const name = btn.getAttribute('data-assign-tag'); const snapshot = getTagIndex(); try { for (const id of selectedIds) { const current = getTagsForBook(id); setTagsForBook(id, Array.from(new Set([...current, name]))); } renderLibrary(); showToast(`Assigned tag ${name} to ${selectedIds.size} items`, () => { saveTagIndex(snapshot); renderLibrary(); }); } catch (err) { showToast('Tag assign failed: ' + err.message); } });
  });
  tagAssignList.querySelectorAll('[data-unassign-tag]').forEach((btn) => {
    btn.addEventListener('click', () => { const name = btn.getAttribute('data-unassign-tag'); const snapshot = getTagIndex(); try { for (const id of selectedIds) { const current = getTagsForBook(id).filter((t) => t !== name); setTagsForBook(id, current); } renderLibrary(); showToast(`Removed tag ${name} from ${selectedIds.size} items`, () => { saveTagIndex(snapshot); renderLibrary(); }); } catch (err) { showToast('Tag remove failed: ' + err.message); } });
  });
}

function closeTagManager() {
  tagBackdrop?.classList.add('hidden');
  tagModal?.classList.add('hidden');
}

function updateSelectedCount() {
  if (selectedCountEl) selectedCountEl.textContent = String(selectedIds.size);
}

function openBatchActions() {
  if (selectedIds.size === 0) { alert('No selection'); return; }
  const action = prompt(`Selected ${selectedIds.size}. Type: delete | export | sample | unsample | wishlist | unwishlist`);
  if (action === 'delete') { for (const id of Array.from(selectedIds)) { confirmDelete(id); } selectedIds.clear(); updateSelectedCount(); renderLibrary(); }
  else if (action === 'export') { void exportSelected(Array.from(selectedIds)); }
  else if (action === 'sample') { for (const id of Array.from(selectedIds)) { void updateBook(id, { isSample: true }); } alert('Marked as sample'); renderLibrary(); }
  else if (action === 'unsample') { for (const id of Array.from(selectedIds)) { void updateBook(id, { isSample: false }); } alert('Unmarked sample'); renderLibrary(); }
  else if (action === 'wishlist') { for (const id of Array.from(selectedIds)) { void updateBook(id, { isWishlist: true }); } alert('Marked wishlist'); renderLibrary(); }
  else if (action === 'unwishlist') { for (const id of Array.from(selectedIds)) { void updateBook(id, { isWishlist: false }); } alert('Unmarked wishlist'); renderLibrary(); }
}

function openMetadataModal(bookId) {
  editingId = bookId;
  const book = books.find((b) => b.id === bookId);
  if (!book || !mdModal || !mdBackdrop) return;
  mdTitle.value = book.title || '';
  mdAuthor.value = book.author || '';
  mdSeries.value = book.series || '';
  mdDescription.value = book.description || '';
  mdBackdrop.classList.remove('hidden');
  mdModal.classList.remove('hidden');
}

function closeMetadataModal() {
  editingId = null;
  mdBackdrop?.classList.add('hidden');
  mdModal?.classList.add('hidden');
}

async function saveMetadata() {
  if (!editingId) return;
  try {
    const updates = { title: mdTitle.value.trim(), author: mdAuthor.value.trim(), series: mdSeries.value.trim(), description: mdDescription.value.trim(), isSample: !!mdSample.checked, isWishlist: !!mdWishlist.checked };
    await updateBook(editingId, updates);
    books = books.map((b) => (b.id === editingId ? { ...b, ...updates } : b));
    closeMetadataModal();
    renderLibrary();
  } catch (err) {
    alert('Failed to save metadata: ' + err.message);
  }
}

function showToast(message, undoHandler) {
  if (!toastEl) return;
  toastMsg.textContent = message;
  toastEl.classList.remove('hidden');
  function reset() { toastEl.classList.add('hidden'); toastUndo?.removeEventListener('click', onUndo); }
  function onUndo() { try { undoHandler && undoHandler(); } finally { reset(); } }
  toastUndo?.addEventListener('click', onUndo)
}

function hideToast() {
  if (!toastEl) return;
  toastEl.classList.add('hidden');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatMediaType(mediaType) {
  if (mediaType === 'application/epub+zip') return 'EPUB';
  if (mediaType === 'application/pdf') return 'PDF';
  return 'Text';
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('sw failed', err));
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

async function setupSyncBanner() {
  if (!syncBanner) return;
  try {
    const syncEnabled = await isFeatureEnabled('syncScaffolding');
    if (syncEnabled) {
      syncBanner.classList.remove('hidden');
      syncBanner.textContent = 'Sync beta flag enabled — connectors will use encrypted e2e links when configured.';
      return;
    }
  } catch (err) {
    console.warn('sync flag unavailable', err);
  }
  if (!navigator.onLine) {
    syncBanner.classList.remove('hidden');
    syncBanner.textContent = 'Offline mode — staying on local storage only.';
  } else {
    syncBanner.classList.add('hidden');
  }
}
async function openImportConflictModal(file) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const buf = new Uint8Array(await file.arrayBuffer())
  const zip = unzipSync(buf)
  function read(path) { const e = zip[path]; if (!e) throw new Error(`Missing ${path}`); return strFromU8(e) }
  const metadata = JSON.parse(read('data/metadata.json'))
  const existing = await listBooks()
  const existingIds = new Set(existing.map((b) => b.id))
  importList.innerHTML = metadata.map((m) => {
    const conflict = existingIds.has(m.id)
    return `
      <li class="rounded-lg border border-gray-200 p-2 text-xs dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold">${m.title || m.id}</div>
            <div class="text-[#333333]/60 dark:text-gray-400">${m.author || ''}</div>
          </div>
          <div class="flex items-center gap-2">
            ${conflict ? `<label><input type="radio" name="imp-${m.id}" value="merge" checked /> Merge</label><label><input type="radio" name="imp-${m.id}" value="replace" /> Replace</label><label><input type="radio" name="imp-${m.id}" value="skip" /> Skip</label>` : `<span class="text-green-600">New</span>`}
          </div>
        </div>
      </li>
    `
  }).join('')
  importCancel.onclick = () => { importBackdrop.classList.add('hidden'); importModal.classList.add('hidden') }
  importConfirm.onclick = async () => {
    const decisions = {}
    metadata.forEach((m) => {
      const el = document.querySelector(`input[name="imp-${m.id}"]:checked`)
      if (el) decisions[m.id] = el.value
    })
    try {
      await import(/* @vite-ignore */ './export/backup.js').then((m) => m.importBackup(file, decisions))
      alert(`Import completed: ${Object.keys(decisions).length} decisions applied`)
      importBackdrop.classList.add('hidden'); importModal.classList.add('hidden')
      await loadBooks()
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
  }
  importBackdrop.classList.remove('hidden');
  importModal.classList.remove('hidden');
}

if (typeof window !== 'undefined') {
  window.__openImportConflictModal = openImportConflictModal;
}
function isCoverDataUrlInvalid(cover) {
  if (!cover || typeof cover !== 'string') return true;
  // quick heuristic: base64 decodes to XHTML/SVG instead of image bytes
  const m = cover.match(/base64,([A-Za-z0-9+/=]+)/);
  if (!m) return false;
  try {
    const sample = atob(m[1].slice(0, 200));
    const head = sample.slice(0, 40).toLowerCase();
    if (head.includes('<html') || head.includes('<svg')) return true;
    return false;
  } catch {
    return false;
  }
}

async function backfillMissingOrInvalidCovers() {
  const targets = books.filter((b) => (b.mediaType || '').toLowerCase().includes('epub') && (!b.cover || isCoverDataUrlInvalid(b.cover)));
  if (!targets.length) return;
  for (const book of targets) {
    try {
      const blob = await readBookBlob(book);
      const buffer = await blob.arrayBuffer();
      const meta = await import('./parser/epub.js').then((m) => m.extractEpubMetadata(buffer));
      if (meta?.cover) {
        await updateBook(book.id, { cover: meta.cover });
      }
    } catch { }
  }
  books = await listBooks();
  renderLibrary();
}
