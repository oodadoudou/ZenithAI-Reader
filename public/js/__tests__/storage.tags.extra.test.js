import { describe, it, expect } from 'vitest'

describe('tags storage', () => {
  it('add/remove tags and set/get per book', async () => {
    const mod = await import('../storage/tags.js')
    localStorage.clear()
    mod.addTag('A')
    mod.addTag('B')
    expect(mod.loadTags().length).toBe(2)
    mod.setTagsForBook('b1', ['A','B','A'])
    expect(mod.getTagsForBook('b1')).toEqual(['A','B'])
    const list = mod.listBooksByTag([{ id: 'b1', tags: [] }, { id: 'b2', tags: ['B'] }], 'B')
    expect(list.map(b => b.id)).toEqual(['b1','b2'])
    mod.removeTag('A')
    expect(mod.loadTags()).toEqual(['B'])
    expect(mod.getTagsForBook('b1')).toEqual(['B'])
  })
})