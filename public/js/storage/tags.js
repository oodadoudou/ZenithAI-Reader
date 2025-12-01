const TAGS_KEY = 'paperread-tags'
const TAG_INDEX_KEY = 'paperread-tag-index'

export function loadTags() {
  try {
    const raw = localStorage.getItem(TAGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveTags(tags) {
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(Array.from(new Set(tags)))) } catch {}
}

export function getTagIndex() {
  try {
    const raw = localStorage.getItem(TAG_INDEX_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveTagIndex(index) {
  try { localStorage.setItem(TAG_INDEX_KEY, JSON.stringify(index)) } catch {}
}

export function getTagsForBook(bookId) {
  const index = getTagIndex()
  return Array.isArray(index[bookId]) ? index[bookId] : []
}

export function setTagsForBook(bookId, tags) {
  const index = getTagIndex()
  index[bookId] = Array.from(new Set(tags || []))
  saveTagIndex(index)
}

export function addTag(name) {
  const tags = loadTags()
  if (!tags.includes(name)) { tags.push(name); saveTags(tags) }
}

export function removeTag(name) {
  const tags = loadTags().filter((t) => t !== name)
  saveTags(tags)
  const index = getTagIndex()
  for (const bid of Object.keys(index)) {
    index[bid] = (index[bid] || []).filter((t) => t !== name)
  }
  saveTagIndex(index)
}

export function listBooksByTag(books, tag) {
  if (!tag) return books
  const index = getTagIndex()
  return books.filter((b) => (index[b.id] || []).includes(tag) || (b.tags || []).includes(tag))
}