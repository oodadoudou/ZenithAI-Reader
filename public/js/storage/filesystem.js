import { openDB } from 'idb';

const DB_NAME = 'paperread';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('books')) {
      const store = db.createObjectStore('books', { keyPath: 'id' });
      store.createIndex('byTitle', 'title');
      store.createIndex('byAdded', 'addedAt');
    }
    if (!db.objectStoreNames.contains('files')) {
      db.createObjectStore('files', { keyPath: 'id' });
    }
  },
});

async function getBooksDirectory(create = true) {
  if (!navigator.storage?.getDirectory) return null;
  const root = await navigator.storage.getDirectory();
  try {
    return await root.getDirectoryHandle('books', { create });
  } catch (err) {
    if (!create) return null;
    throw err;
  }
}

async function getBookDirectory(id, create = true) {
  const booksDir = await getBooksDirectory(create);
  if (!booksDir) return null;
  try {
    return await booksDir.getDirectoryHandle(id, { create });
  } catch (err) {
    if (!create) return null;
    throw err;
  }
}

export const storageAdapters = {
  async opfsAvailable() {
    return !!navigator.storage?.getDirectory;
  },
  async saveToOPFS(id, file) {
    const bookDir = await getBookDirectory(id, true);
    const fileHandle = await bookDir.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
    return { kind: 'opfs', path: `books/${id}/${file.name}` };
  },
  async readFromOPFS(path) {
    const root = await navigator.storage.getDirectory();
    const segments = path.split('/');
    let handle = root;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      if (i === segments.length - 1) {
        const fileHandle = await handle.getFileHandle(segment);
        return fileHandle.getFile();
      }
      handle = await handle.getDirectoryHandle(segment);
    }
    throw new Error('File not found');
  },
  async deleteFromOPFS(path) {
    const root = await navigator.storage.getDirectory();
    const segments = path.split('/');
    let dir = root;
    for (let i = 0; i < segments.length - 1; i++) {
      dir = await dir.getDirectoryHandle(segments[i]);
    }
    await dir.removeEntry(segments.at(-1));
  },
  async saveMetadataToOPFS(id, record) {
    const bookDir = await getBookDirectory(id, true);
    const fileHandle = await bookDir.getFileHandle('metadata.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(record));
    await writable.close();
  },
  async readMetadataFromOPFS(id) {
    try {
      const bookDir = await getBookDirectory(id, false);
      if (!bookDir) return null;
      const fileHandle = await bookDir.getFileHandle('metadata.json');
      const file = await fileHandle.getFile();
      return JSON.parse(await file.text());
    } catch (err) {
      return null;
    }
  },
  async listMetadataFromOPFS() {
    const booksDir = await getBooksDirectory(false);
    if (!booksDir || !booksDir.entries) return [];
    const records = [];
    for await (const [name, handle] of booksDir.entries()) {
      if (handle.kind !== 'directory') continue;
      try {
        const fileHandle = await handle.getFileHandle('metadata.json');
        const file = await fileHandle.getFile();
        records.push(JSON.parse(await file.text()));
      } catch (err) {
        continue;
      }
    }
    return records;
  },
  async deleteMetadataFromOPFS(id) {
    try {
      const bookDir = await getBookDirectory(id, false);
      if (!bookDir) return;
      await bookDir.removeEntry('metadata.json');
    } catch (err) {
      /* noop */
    }
  },
  async saveToIDB(id, file) {
    const db = await dbPromise;
    await db.put('files', { id, blob: file });
    return { kind: 'idb', path: id };
  },
  async readFromIDB(id) {
    const db = await dbPromise;
    const entry = await db.get('files', id);
    if (!entry) throw new Error('File missing');
    return entry.blob;
  },
  async deleteFromIDB(id) {
    const db = await dbPromise;
    await db.delete('files', id);
  },
};

export async function saveBookRecord(record) {
  const db = await dbPromise;
  await db.put('books', record);
}

export async function listBooks() {
  const db = await dbPromise;
  const all = await db.getAll('books');
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getBook(id) {
  const db = await dbPromise;
  return db.get('books', id);
}

export async function updateBook(id, updates) {
  const record = await getBook(id);
  if (!record) throw new Error('Book not found');
  const updated = { ...record, ...updates, updatedAt: Date.now() };
  await saveBookRecord(updated);
  return updated;
}

export async function deleteBook(id) {
  const db = await dbPromise;
  const record = await getBook(id);
  if (!record) return;
  await db.delete('books', id);
  if (record.storage?.kind === 'opfs') {
    await storageAdapters.deleteFromOPFS(record.storage.path);
  } else if (record.storage?.kind === 'idb') {
    await storageAdapters.deleteFromIDB(record.storage.path);
  }
}
