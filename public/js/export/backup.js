import { listBooks, getBook, importBook, updateBook, readBookBlob } from '../storage/library.js'
import { getTagIndex, loadTags } from '../storage/tags.js'

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function buildManifests() {
  const books = await listBooks()
  const tagIndex = getTagIndex()
  const tags = loadTags()
  const annotations = []
  const bookmarks = []
  const vocabulary = []
  const metadata = []
  for (const b of books) {
    metadata.push({ id: b.id, title: b.title, author: b.author, mediaType: b.mediaType, fileSize: b.fileSize, addedAt: b.addedAt, tags: tagIndex[b.id] || b.tags || [] })
    ;(b.annotations || []).forEach((a) => annotations.push({ bookId: b.id, ...a }))
    ;(b.bookmarks || []).forEach((m) => bookmarks.push({ bookId: b.id, ...m }))
    ;(b.vocabulary || []).forEach((v) => vocabulary.push({ bookId: b.id, ...v }))
  }
  const manifest = { createdAt: Date.now(), tags, counts: { books: books.length, annotations: annotations.length, bookmarks: bookmarks.length, vocabulary: vocabulary.length } }
  const payload = { manifest, metadata, annotations, bookmarks, vocabulary }
  const json = JSON.stringify(payload)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  const signature = toHex(digest)
  payload.signature = signature
  return payload
}

async function blobToUint8Array(blob) {
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

export async function exportSelected(bookIds = [], includeFiles = true) {
  const payload = await buildManifests()
  // filter when selection provided
  if (bookIds?.length) {
    const set = new Set(bookIds)
    payload.metadata = payload.metadata.filter((m) => set.has(m.id))
    const byBook = (item) => set.has(item.bookId)
    payload.annotations = payload.annotations.filter(byBook)
    payload.bookmarks = payload.bookmarks.filter(byBook)
    payload.vocabulary = payload.vocabulary.filter(byBook)
    payload.manifest.counts = { books: payload.metadata.length, annotations: payload.annotations.length, bookmarks: payload.bookmarks.length, vocabulary: payload.vocabulary.length }
  }
  const { zipSync, strFromU8 } = await import('fflate')
  const files = {
    'meta/manifest.json': new TextEncoder().encode(JSON.stringify(payload.manifest, null, 2)),
    'meta/signature.txt': new TextEncoder().encode(payload.signature),
    'data/metadata.json': new TextEncoder().encode(JSON.stringify(payload.metadata, null, 2)),
    'data/annotations.json': new TextEncoder().encode(JSON.stringify(payload.annotations, null, 2)),
    'data/bookmarks.json': new TextEncoder().encode(JSON.stringify(payload.bookmarks, null, 2)),
    'data/vocabulary.json': new TextEncoder().encode(JSON.stringify(payload.vocabulary, null, 2)),
  }
  if (includeFiles) {
    for (const m of payload.metadata) {
      try {
        const book = await getBook(m.id)
        const blob = await readBookBlob(book)
        const ext = m.mediaType === 'application/epub+zip' ? 'epub' : (m.mediaType === 'application/pdf' ? 'pdf' : 'txt')
        files[`files/${m.id}.${ext}`] = await blobToUint8Array(blob)
      } catch {}
    }
  }
  const zipped = zipSync(files, { level: 6 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `paperread_backup_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.paperread`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 0)
}

export async function importBackup(file, strategy = 'merge') {
  const { unzipSync, strFromU8 } = await import('fflate')
  const buf = new Uint8Array(await file.arrayBuffer())
  const zip = unzipSync(buf)
  function read(path) { const e = zip[path]; if (!e) throw new Error(`Missing ${path}`); return strFromU8(e) }
  const manifest = JSON.parse(read('meta/manifest.json'))
  const signature = read('meta/signature.txt').trim()
  const metadata = JSON.parse(read('data/metadata.json'))
  const annotations = JSON.parse(read('data/annotations.json'))
  const bookmarks = JSON.parse(read('data/bookmarks.json'))
  const vocabulary = JSON.parse(read('data/vocabulary.json'))
  const payload = { manifest, metadata, annotations, bookmarks, vocabulary }
  const json = JSON.stringify(payload)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  const calc = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (calc !== signature) throw new Error('Signature mismatch')
  const existing = await listBooks()
  const existingIds = new Set(existing.map((b) => b.id))
  for (const m of metadata) {
    let record
    if (!existingIds.has(m.id)) {
      const ext = m.mediaType === 'application/epub+zip' ? 'epub' : (m.mediaType === 'application/pdf' ? 'pdf' : 'txt')
      const fileEntry = zip[`files/${m.id}.${ext}`]
      if (!fileEntry) continue
      const blob = new Blob([fileEntry], { type: m.mediaType })
      const imported = await importBook(new File([blob], `${m.title || m.id}.${ext}`, { type: m.mediaType }))
      record = imported
    } else {
      record = existing.find((b) => b.id === m.id)
      const mode = typeof strategy === 'string' ? strategy : (strategy?.[m.id] || 'merge')
      if (mode === 'replace') {
        await updateBook(m.id, { title: m.title, author: m.author })
      }
      if (mode === 'skip') {
        continue
      }
    }
    const anns = annotations.filter((a) => a.bookId === m.id)
    const bms = bookmarks.filter((a) => a.bookId === m.id)
    const voc = vocabulary.filter((a) => a.bookId === m.id)
    const merged = {
      annotations: Array.from(new Set([...(record.annotations || []), ...anns].map((x) => JSON.stringify(x)))).map((s) => JSON.parse(s)),
      bookmarks: Array.from(new Set([...(record.bookmarks || []), ...bms].map((x) => JSON.stringify(x)))).map((s) => JSON.parse(s)),
      vocabulary: Array.from(new Set([...(record.vocabulary || []), ...voc].map((x) => JSON.stringify(x)))).map((s) => JSON.parse(s)),
    }
    await updateBook(m.id, merged)
  }
}