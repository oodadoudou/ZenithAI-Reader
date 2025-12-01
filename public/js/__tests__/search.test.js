import { describe, expect, it } from 'vitest';
import { buildSearchIndex, searchIndex } from '../utils/search.js';

describe('advanced search index', () => {
  const paragraphs = [
    'Reading stories calms the mind and readers feel immersed.',
    'Calm lakes reflected shimmering light during readings.',
    'Acentuación y zoología requieren búsquedas con diacríticos.',
  ];
  const index = buildSearchIndex(paragraphs);

  it('stems words so "reading" matches "readers" and "readings"', () => {
    const results = searchIndex(index, 'reading');
    const matched = results.map((result) => result.index);
    expect(matched).toContain(0);
    expect(matched).toContain(1);
  });

  it('removes diacritics so Spanish queries still match', () => {
    const results = searchIndex(index, 'acentuacion zoologia');
    expect(results[0]?.index).toBe(2);
  });

  it('limits stop words so common terms do not return anything', () => {
    const results = searchIndex(index, 'the and of');
    expect(results).toHaveLength(0);
  });
});
