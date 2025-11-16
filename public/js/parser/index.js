import { parseTxt } from './txt.js';
import { parseEpub } from './epub.js';

export function parseBook(book, buffer) {
  const extension = (book.fileName?.split('.').pop() || '').toLowerCase();
  if (extension === 'txt') {
    return {
      title: book.title,
      author: book.author,
      paragraphs: parseTxt(buffer),
    };
  }
  if (extension === 'epub') {
    return {
      title: book.title,
      author: book.author,
      paragraphs: parseEpub(buffer),
    };
  }
  throw new Error('Unsupported book format');
}
