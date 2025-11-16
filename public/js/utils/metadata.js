import { extractTxtMetadata } from '../parser/txt.js';
import { extractEpubMetadata } from '../parser/epub.js';

export async function extractMetadata(fileName, buffer) {
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  if (extension === 'txt') {
    return extractTxtMetadata(fileName, buffer);
  }
  if (extension === 'epub') {
    return extractEpubMetadata(buffer);
  }
  throw new Error('Unsupported file type');
}
