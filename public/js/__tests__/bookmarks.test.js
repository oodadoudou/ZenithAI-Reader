import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildBookmarkSnippet, normalizeBookmarks, filterBookmarksBySnippet, sortBookmarks } from '../utils/bookmarks.js';

describe('buildBookmarkSnippet', () => {
  it('condenses whitespace and respects max length', () => {
    const text = '  This   is   a   sample\nparagraph with excess   spacing.  ';
    expect(buildBookmarkSnippet(text, 12)).toBe('This is a…');
  });

  it('returns empty string for falsy values', () => {
    expect(buildBookmarkSnippet('', 30)).toBe('');
    expect(buildBookmarkSnippet(null, 30)).toBe('');
  });
});

describe('normalizeBookmarks', () => {
  const paragraphs = ['One fish two fish', 'Red fish blue fish', 'Dr. Seuss forever'];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sorts bookmarks by createdAt descending and keeps valid fields', () => {
    const payload = [
      { id: 'b', paraIndex: 1, createdAt: 2000, snippet: 'Second' },
      { id: 'a', paraIndex: 0, createdAt: 1000, snippet: 'First' },
    ];
    const normalized = normalizeBookmarks(payload, paragraphs);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].id).toBe('b');
    expect(normalized[1].id).toBe('a');
    expect(normalized[0].cfi).toContain('para-1');
  });

  it('generates ids, timestamps, and snippets when missing', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5555);
    const normalized = normalizeBookmarks([
      { paraIndex: 2 },
      { paraIndex: -1 },
    ], paragraphs);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].paraIndex).toBe(2);
    expect(normalized[0].createdAt).toBe(5555);
    expect(normalized[0].snippet).toBe('Dr. Seuss forever');
    expect(typeof normalized[0].id).toBe('string');
    expect(normalized[0].cfi).toContain('para-2');
  });
});

describe('bookmark filtering and sorting', () => {
  const entries = [
    { id: 'a', paraIndex: 2, createdAt: 1000, snippet: 'Alpha paragraph' },
    { id: 'b', paraIndex: 1, createdAt: 2000, snippet: 'Beta snippet' },
    { id: 'c', paraIndex: 5, createdAt: 1500, snippet: 'Gamma text' },
  ];

  it('filters by snippet text (case-insensitive)', () => {
    const filtered = filterBookmarksBySnippet(entries, 'beta');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('b');
  });

  it('sorts by recent default and by paragraph index', () => {
    const recent = sortBookmarks(entries, 'recent').map((e) => e.id);
    expect(recent).toEqual(['b', 'c', 'a']);
    const asc = sortBookmarks(entries, 'paraAsc').map((e) => e.paraIndex);
    expect(asc).toEqual([1, 2, 5]);
    const desc = sortBookmarks(entries, 'paraDesc').map((e) => e.paraIndex);
    expect(desc).toEqual([5, 2, 1]);
  });
});
