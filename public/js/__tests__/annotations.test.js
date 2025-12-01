import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeAnnotations } from '../utils/annotations.js';
import { buildCfi } from '../utils/cfi.js';

describe('normalizeAnnotations', () => {
  const paragraphs = ['Alpha beta gamma', 'Delta epsilon'];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills in CFI, start, and end based on paragraph text', () => {
    const annotations = [
      { paraIndex: 0, start: 6, end: 10, text: 'beta' },
    ];
    const normalized = normalizeAnnotations(annotations, paragraphs);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].cfi).toContain('para-0');
    expect(normalized[0].start).toBe(6);
    expect(normalized[0].end).toBe(10);
    expect(normalized[0].text).toBe('beta');
  });

  it('derives paragraph index from CFI when paraIndex missing', () => {
    const cfi = buildCfi(1, 3);
    const normalized = normalizeAnnotations([
      { cfi, text: 'eps', createdAt: 111 },
    ], paragraphs);
    expect(normalized[0].paraIndex).toBe(1);
    expect(normalized[0].start).toBe(3);
    expect(normalized[0].cfi).toBe(cfi);
    expect(normalized[0].createdAt).toBe(111);
  });

  it('skips entries referencing paragraphs that do not exist', () => {
    const normalized = normalizeAnnotations([
      { paraIndex: 42, start: 0, end: 3 },
    ], paragraphs);
    expect(normalized).toHaveLength(0);
  });
});
