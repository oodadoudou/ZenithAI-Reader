import { describe, it, expect } from 'vitest';
import { parseTxt, extractTxtMetadata } from '../parser/txt.js';
import { chunkText } from '../tts.js';

describe('TXT parser', () => {
  it('extracts metadata from filename when text lacks heading', () => {
    const buffer = new TextEncoder().encode('\n\nStory content');
    const meta = extractTxtMetadata('My-Story.txt', buffer);
    expect(meta.title).toBe('My Story');
  });

  it('splits paragraphs on blank lines', () => {
    const buffer = new TextEncoder().encode('Para one\n\nPara two');
    const paragraphs = parseTxt(buffer);
    expect(paragraphs).toEqual(['Para one', 'Para two']);
  });
});

describe('TTS chunking', () => {
  it('chunks large text respecting sentence boundaries', () => {
    const text = 'Sentence one. '.repeat(500);
    const chunks = chunkText(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].endsWith('.')).toBe(true);
  });
});
