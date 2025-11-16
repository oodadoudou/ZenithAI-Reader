import {
  storageAdapters,
  saveBookRecord as saveBookRecordIDB,
  listBooks as listBooksFromIDB,
  getBook as getBookFromIDB,
  deleteBook as deleteBookFromIDB,
} from './filesystem.js';
import { extractMetadata } from '../utils/metadata.js';

const LAST_READ_DEFAULT = null;

export async function importBook(file) {
  if (!file) throw new Error('No file provided');
  const id = crypto.randomUUID();
  const buffer = await file.arrayBuffer();
  const metadata = await extractMetadata(file.name, buffer);
  const supportsOPFS = await storageAdapters.opfsAvailable();
  const normalizedFile = new File([buffer], file.name, { type: file.type });
  const storage = supportsOPFS
    ? await storageAdapters.saveToOPFS(id, normalizedFile)
    : await storageAdapters.saveToIDB(id, normalizedFile);
  const record = {
    id,
    title: metadata.title,
    author: metadata.author,
    addedAt: Date.now(),
    fileName: file.name,
    fileSize: file.size,
    mediaType: metadata.mediaType,
    cover: metadata.cover,
    storage,
    lastReadLocation: LAST_READ_DEFAULT,
  };
  if (supportsOPFS) {
    await storageAdapters.saveMetadataToOPFS(id, record);
  }
  await saveBookRecordIDB(record);
  return record;
}

function sortBooks(records) {
  return [...records].sort((a, b) => b.addedAt - a.addedAt);
}

export async function listBooks() {
  const supportsOPFS = await storageAdapters.opfsAvailable();
  if (supportsOPFS) {
    const opfsRecords = await storageAdapters.listMetadataFromOPFS();
    if (opfsRecords.length) {
      return sortBooks(opfsRecords);
    }
  }
  return listBooksFromIDB();
}

export async function getBook(id) {
  const supportsOPFS = await storageAdapters.opfsAvailable();
  if (supportsOPFS) {
    const record = await storageAdapters.readMetadataFromOPFS(id);
    if (record) return record;
  }
  return getBookFromIDB(id);
}

export async function updateBook(id, updates) {
  const existing = await getBook(id);
  if (!existing) throw new Error('Book not found');
  const updated = { ...existing, ...updates, updatedAt: Date.now() };
  const supportsOPFS = await storageAdapters.opfsAvailable();
  if (supportsOPFS) {
    await storageAdapters.saveMetadataToOPFS(id, updated);
  }
  await saveBookRecordIDB(updated);
  return updated;
}

export async function deleteBook(id) {
  await deleteBookFromIDB(id);
  const supportsOPFS = await storageAdapters.opfsAvailable();
  if (supportsOPFS) {
    await storageAdapters.deleteMetadataFromOPFS(id);
  }
}

export async function readBookBlob(book) {
  if (!book?.storage) throw new Error('Book storage missing');
  if (book.storage.kind === 'opfs') {
    return storageAdapters.readFromOPFS(book.storage.path);
  }
  return storageAdapters.readFromIDB(book.storage.path);
}
