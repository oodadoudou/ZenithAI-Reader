import { extractTxtMetadata } from '../parser/txt.js';
import { extractEpubMetadata } from '../parser/epub.js';
import { extractPdfMetadata } from '../parser/pdf.js';

export async function extractMetadata(fileName, buffer) {
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  if (extension === 'txt') {
    return extractTxtMetadata(fileName, buffer);
  }
  if (extension === 'epub') {
    return extractEpubMetadata(buffer);
  }
  if (extension === 'pdf') {
    return extractPdfMetadata(buffer);
  }
  throw new Error('Unsupported file type');
}
