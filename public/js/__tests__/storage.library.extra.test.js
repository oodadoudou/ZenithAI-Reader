import { describe, it, expect, vi } from 'vitest'

vi.mock('../storage/filesystem.js', () => {
  const storageAdapters = {
    opfsAvailable: vi.fn(),
    listMetadataFromOPFS: vi.fn(),
    readMetadataFromOPFS: vi.fn(),
    deleteMetadataFromOPFS: vi.fn(),
  }
  return {
    storageAdapters,
    listBooks: vi.fn().mockResolvedValue([{ id: 'idb1', addedAt: 1 }]),
    getBook: vi.fn().mockResolvedValue({ id: 'idb1' }),
    deleteBook: vi.fn(),
  }
})

import * as fs from '../storage/filesystem.js'
import { listBooks, getBook, deleteBook } from '../storage/library.js'

describe('storage library list/get/delete branches', () => {
  it('listBooks prefers OPFS when available and non-empty', async () => {
    fs.storageAdapters.opfsAvailable.mockResolvedValue(true)
    fs.storageAdapters.listMetadataFromOPFS.mockResolvedValue([{ id: 'opfs1', addedAt: 2 }])
    const items = await listBooks()
    expect(items[0].id).toBe('opfs1')
  })

  it('listBooks falls back to IDB when OPFS empty', async () => {
    fs.storageAdapters.opfsAvailable.mockResolvedValue(true)
    fs.storageAdapters.listMetadataFromOPFS.mockResolvedValue([])
    const items = await listBooks()
    expect(items[0].id).toBe('idb1')
  })

  it('getBook falls back to IDB when OPFS miss', async () => {
    fs.storageAdapters.opfsAvailable.mockResolvedValue(true)
    fs.storageAdapters.readMetadataFromOPFS.mockResolvedValue(null)
    const rec = await getBook('x')
    expect(rec.id).toBe('idb1')
  })

  it('deleteBook attempts OPFS delete when available', async () => {
    fs.storageAdapters.opfsAvailable.mockResolvedValue(true)
    await deleteBook('x')
    expect(fs.storageAdapters.deleteMetadataFromOPFS).toHaveBeenCalled()
  })
})