import { buildCfi, parseCfi } from './cfi.js';

function generateId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `annotation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), max);
}

function resolveParagraphFromEntry(entry, paragraphsLength) {
  if (Number.isFinite(entry?.paraIndex)) {
    const candidate = Math.floor(entry.paraIndex);
    if (candidate >= 0 && candidate < paragraphsLength) {
      return candidate;
    }
  }
  const parsed = parseCfi(entry?.cfi);
  if (parsed && parsed.paraIndex >= 0 && parsed.paraIndex < paragraphsLength) {
    return parsed.paraIndex;
  }
  return -1;
}

export function normalizeAnnotations(entries, paragraphs = []) {
  if (!Array.isArray(entries)) return [];
  const length = Math.max(0, paragraphs.length);
  return entries
    .map((entry) => {
      if (!length) return null;
      const paraIndex = resolveParagraphFromEntry(entry, length);
      if (paraIndex < 0) return null;
      const paragraphText = paragraphs[paraIndex] || '';
      if (!paragraphText) return null;
      const fallbackStart = parseCfi(entry?.cfi)?.offset ?? entry?.start ?? 0;
      const start = clamp(entry?.start ?? fallbackStart, paragraphText.length);
      const fallbackEnd = entry?.end ?? start + (entry?.text?.length || 0);
      const end = Math.max(start, clamp(fallbackEnd, paragraphText.length));
      const color = typeof entry?.color === 'string' ? entry.color : 'sun';
      const cfi = entry?.cfi || buildCfi(paraIndex, start);
      const note = typeof entry?.note === 'string' ? entry.note : '';
      const createdAt = Number(entry?.createdAt) || Date.now();
      const text = entry?.text && entry.text.trim().length
        ? entry.text
        : paragraphText.slice(start, end);
      return {
        id: entry?.id || generateId(),
        color,
        paraIndex,
        start,
        end,
        text,
        createdAt,
        note,
        cfi,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt);
}
