import { describe, it, expect } from 'vitest'
import { loadTags, saveTags, getTagsForBook, setTagsForBook, listBooksByTag } from '../storage/tags.js'

describe('tags storage', () => {
  it('saves and loads tags', () => {
    saveTags(['foo','bar'])
    expect(loadTags()).toEqual(['foo','bar'])
  })
  it('assigns tags to book and filters', () => {
    setTagsForBook('b1', ['foo'])
    expect(getTagsForBook('b1')).toEqual(['foo'])
    const books = [{ id: 'b1', title: 't' }, { id: 'b2', title: 'u' }]
    const filtered = listBooksByTag(books, 'foo')
    expect(filtered.map((b)=>b.id)).toEqual(['b1'])
  })
})