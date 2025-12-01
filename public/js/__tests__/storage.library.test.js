import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../storage/filesystem.js', () => {
  const storageAdapters = {
    opfsAvailable: vi.fn(),
    saveToOPFS: vi.fn(),
    saveMetadataToOPFS: vi.fn(),
    saveToIDB: vi.fn(),
    readFromIDB: vi.fn(),
    readMetadataFromOPFS: vi.fn(),
  }
  return {
    storageAdapters,
    saveBookRecord: vi.fn(),
    getBook: vi.fn(),
  }
})

import * as fs from '../storage/filesystem.js'
import { importBook, updateBook, readBookBlob } from '../storage/library.js'

describe('storage library double-write and fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('imports to IDB when OPFS unavailable', async () => {
    fs.storageAdapters.opfsAvailable.mockResolvedValue(false)
    fs.storageAdapters.saveToIDB.mockResolvedValue({ kind: 'idb', path: 'b1' })
    const file = { name: 'demo.txt', arrayBuffer: async () => new TextEncoder().encode('text') }
    const rec = await importBook(file)
    expect(rec.storage.kind).toBe('idb')
  })

  it('updateBook writes metadata to OPFS when available', async () => {
    fs.getBook.mockResolvedValue({ id: 'x', title: 't', storage: { kind: 'opfs', path: 'books/x/file' } })
    fs.storageAdapters.opfsAvailable.mockResolvedValue(true)
    fs.storageAdapters.readMetadataFromOPFS.mockResolvedValue({ id: 'x', title: 't', storage: { kind: 'opfs', path: 'books/x/file' } })
    const updated = await updateBook('x', { title: 't2' })
    expect(fs.storageAdapters.saveMetadataToOPFS).toHaveBeenCalled()
    expect(updated.title).toBe('t2')
  })

  it('readBookBlob reads from IDB when storage.kind is idb', async () => {
    fs.storageAdapters.readFromIDB.mockResolvedValue(new Blob(['abc']))
    const blob = await readBookBlob({ storage: { kind: 'idb', path: 'b1' } })
    expect(blob).toBeInstanceOf(Blob)
  })
})