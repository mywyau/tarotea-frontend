import { describe, it, expect } from 'vitest'
import { readPage } from './pageTestUtils'

describe('patch notes page contracts', () => {
  it('patch notes page keeps pagination and metadata contract', () => {
    const source = readPage('patch-notes.vue')

    expect(source).toContain("title: 'What’s new · TaroTea'")
    expect(source).toContain('NOTES_PER_PAGE = 5')
    expect(source).toContain('Patch notes pagination')
    expect(source).toContain('Page {{ currentPage }} of {{ totalPages }}')
  })
})
