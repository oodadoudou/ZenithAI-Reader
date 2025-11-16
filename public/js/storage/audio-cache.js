const CACHE_KEY = 'paperread-audio-cache-index';

function readIndex() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function writeIndex(index) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(index));
}

export function recordAudioUrl(bookId, provider, url) {
  if (!bookId || !url) return;
  const index = readIndex();
  const entry = index[bookId] || { offline: [], online: [] };
  const bucket = provider === 'online' ? entry.online : entry.offline;
  if (!bucket.includes(url)) {
    bucket.push(url);
  }
  index[bookId] = entry;
  writeIndex(index);
}

export function consumeAudioUrls(bookId) {
  const index = readIndex();
  const entry = index[bookId] || { offline: [], online: [] };
  delete index[bookId];
  writeIndex(index);
  return entry;
}
