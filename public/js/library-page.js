import '../css/main.css';
import { applySavedTheme, toggleTheme } from './utils/theme.js';
import { importBook, listBooks, deleteBook } from './storage/library.js';
import { loadConfig } from './utils/config.js';
import { consumeAudioUrls } from './storage/audio-cache.js';

applySavedTheme();
registerServiceWorker();

const fileInput = document.getElementById('file-input');
const fileTrigger = document.getElementById('file-trigger');
const dropZone = document.querySelector('[aria-label="Upload books"]');
const libraryGrid = document.getElementById('library-grid');
const libraryEmpty = document.getElementById('library-empty');
const searchInput = document.getElementById('library-search');
const sortSelect = document.getElementById('sort-select');
const themeToggle = document.getElementById('theme-toggle');
const syncBanner = document.getElementById('sync-banner');

let books = [];
let filterText = '';
let sortMode = 'recent';
let backendBase = 'http://localhost:8750';

loadConfig().then((cfg) => {
  backendBase = (cfg.OFFLINE_TTS_URL || 'http://localhost:8750').replace(/\/$/, '');
});

init();

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
  if (!navigator.onLine) {
    syncBanner?.classList.remove('hidden');
  }
  loadBooks();
}

async function handleFiles(event) {
  const files = event.target?.files;
  if (!files?.length) return;
  for (const file of files) {
    if (!/\.(epub|txt)$/i.test(file.name)) {
      alert('Unsupported file type. Please select .epub or .txt');
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
  books = await listBooks();
  renderLibrary();
}

function renderLibrary() {
  libraryGrid.innerHTML = '';
  const filtered = books
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
  if (!filtered.length) {
    libraryEmpty.classList.remove('hidden');
    return;
  }
  libraryEmpty.classList.add('hidden');
  filtered.forEach((book) => libraryGrid.appendChild(renderBookCard(book)));
}

function renderBookCard(book) {
  const button = document.createElement('button');
  button.className = 'group relative flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/40 dark:border-zinc-800 dark:bg-zinc-900/80';
  button.type = 'button';
  button.setAttribute('aria-label', `Open ${book.title}`);
  const coverStyle = book.cover ? `background-image:url(${book.cover}); background-size:cover;` : '';
  button.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/80 to-yellow-200 text-2xl font-black text-[#333333] flex items-center justify-center uppercase" style="${coverStyle}">${book.cover ? '' : book.title.slice(0, 2)}</div>
      <div class="flex flex-col">
        <span class="text-base font-bold text-[#333333] dark:text-gray-100">${book.title}</span>
        <span class="text-sm text-[#333333]/60 dark:text-gray-400">${book.author || 'Unknown author'}</span>
      </div>
    </div>
    <div class="flex items-center justify-between text-xs text-[#333333]/60 dark:text-gray-400">
      <span>${formatBytes(book.fileSize)}</span>
      <span>${book.mediaType === 'application/epub+zip' ? 'EPUB' : 'Text'}</span>
    </div>
    <div class="flex items-center justify-between text-xs text-[#333333]/60 dark:text-gray-400">
      <span>${formatProgress(book)}</span>
      <button data-delete="${book.id}" class="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" type="button">Delete</button>
    </div>
  `;
  button.addEventListener('click', (event) => {
    if (event.target.closest('button[data-delete]')) return;
    openReader(book.id);
  });
  button.querySelector('[data-delete]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    confirmDelete(book.id);
  });
  return button;
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
      .catch(() => {});
  }
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

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('sw failed', err));
  }
}
