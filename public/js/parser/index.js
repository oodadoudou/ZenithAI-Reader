import { parseTxt } from './txt.js';
import { parseEpub } from './epub.js';
import { parsePdf } from './pdf.js';
import { measureMetric } from '../utils/telemetry.js';

function buildFallbackChapters(chapters, paragraphs) {
  if (Array.isArray(chapters) && chapters.length) {
    return chapters;
  }
  if (!Array.isArray(paragraphs) || paragraphs.length < 10) {
    return [];
  }
  const segments = Math.min(6, Math.max(2, Math.floor(paragraphs.length / 40)));
  const step = Math.floor(paragraphs.length / segments);
  const fallback = [];
  for (let i = 1; i < segments; i += 1) {
    const index = i * step;
    fallback.push({ title: `Section ${i + 1}`, index });
  }
  return fallback;
}

export async function parseBook(book, buffer) {
  return measureMetric('parser', async () => {
    const extension = (book.fileName?.split('.').pop() || '').toLowerCase();
    let parsed;
    if (extension === 'txt') {
      parsed = parseTxt(buffer);
    } else if (extension === 'epub') {
      parsed = parseEpub(buffer);
    } else if (extension === 'pdf') {
      parsed = await parsePdf(buffer);
    } else {
      throw new Error('Unsupported book format');
    }
    const paragraphs = parsed?.paragraphs || [];
    const chapters = buildFallbackChapters(parsed?.chapters || [], paragraphs);
    return {
      title: book.title,
      author: book.author,
      paragraphs,
      chapters,
    };
  });
}
