import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function looksLikeHeading(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (/^(chapter|part|section|capítulo)\b/i.test(trimmed)) return true;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = trimmed.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > 0.7;
}

function splitParagraphs(text) {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const parts = normalized
    .split(/(?:(?:\r?\n){2,})|(?<=\.|\?|!)\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length) {
    return parts;
  }
  return [normalized];
}

async function withPdf(buffer, handler) {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true,
    useSystemFonts: true,
    standardFontDataUrl: '/static/pdfjs/',
  });
  try {
    const pdf = await loadingTask.promise;
    return await handler(pdf);
  } finally {
    await loadingTask.destroy();
  }
}

export async function extractPdfMetadata(buffer) {
  return withPdf(buffer, async (pdf) => {
    const meta = await pdf.getMetadata().catch(() => ({}));
    const info = meta?.info || {};
    const title = info.Title?.trim() || 'Untitled PDF';
    const author = info.Author?.trim();
    return {
      title,
      author,
      mediaType: 'application/pdf',
    };
  });
}

export async function parsePdf(buffer) {
  return withPdf(buffer, async (pdf) => {
    const paragraphs = [];
    const chapters = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      let page;
      try {
        page = await pdf.getPage(pageNumber);
      } catch (err) {
        console.warn('Failed to load PDF page', pageNumber, err);
        continue;
      }
      let textContent;
      try {
        textContent = await page.getTextContent();
      } catch (err) {
        console.warn('Failed to extract text content from page', pageNumber, err);
        continue;
      }
      const merged = textContent.items.map((item) => item.str).join(' ');
      const pageParagraphs = splitParagraphs(merged);
      if (!pageParagraphs.length) continue;
      const startIndex = paragraphs.length;
      paragraphs.push(...pageParagraphs);
      const headingCandidate = pageParagraphs[0].slice(0, 80);
      if (looksLikeHeading(headingCandidate)) {
        chapters.push({ title: headingCandidate, index: startIndex });
      }
    }
    return { paragraphs, chapters };
  });
}
