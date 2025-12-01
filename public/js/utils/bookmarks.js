import { buildCfi, parseCfi } from './cfi.js';

const DEFAULT_SNIPPET_LENGTH = 140;

function generateBookmarkId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `bookmark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildBookmarkSnippet(text = '', maxLength = DEFAULT_SNIPPET_LENGTH) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) {
    return normalized;
  }
  const slice = normalized.slice(0, Math.max(0, maxLength - 1)).trim();
  const lastWhitespace = slice.lastIndexOf(' ');
  const truncated = lastWhitespace > 4 ? slice.slice(0, lastWhitespace) : slice;
  return `${truncated.trim()}…`;
}

export function normalizeBookmarks(entries, paragraphs = []) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => {
      const parsedCfi = parseCfi(entry?.cfi);
      const paraIndex = Number.isFinite(entry?.paraIndex) && entry.paraIndex >= 0
        ? Math.floor(entry.paraIndex)
        : parsedCfi?.paraIndex;
      if (!Number.isFinite(paraIndex) || paraIndex < 0) {
        return null;
      }
      const id = typeof entry?.id === 'string' && entry.id ? entry.id : generateBookmarkId();
      const createdAt = Number(entry?.createdAt) || Date.now();
      const rawSnippet = typeof entry?.snippet === 'string' ? entry.snippet : '';
      const snippet = rawSnippet || buildBookmarkSnippet(paragraphs[paraIndex] || '');
      const offset = Number.isFinite(entry?.chars) && entry.chars >= 0 ? Math.floor(entry.chars) : parsedCfi?.offset || 0;
      const cfi = entry?.cfi || buildCfi(paraIndex, offset);
      return {
        id,
        paraIndex,
        createdAt,
        snippet,
        chars: offset,
        cfi,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function filterBookmarksBySnippet(entries = [], query = '') {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [...entries];
  return entries.filter((bm) => (bm?.snippet || '').toLowerCase().includes(q));
}

export function sortBookmarks(entries = [], mode = 'recent') {
  const arr = [...entries];
  if (mode === 'paraAsc') return arr.sort((a, b) => a.paraIndex - b.paraIndex || b.createdAt - a.createdAt);
  if (mode === 'paraDesc') return arr.sort((a, b) => b.paraIndex - a.paraIndex || b.createdAt - a.createdAt);
  return arr.sort((a, b) => b.createdAt - a.createdAt);
}
