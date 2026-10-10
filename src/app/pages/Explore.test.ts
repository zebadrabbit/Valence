import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Explore } from './Explore'

// The library page lists the molecules from the small index. The structure files, 105 of them, are for the page
// of a molecule: this page must not pull them in.
vi.mock('@/chem-data/registry', () => {
  throw new Error('the library page must not load the structure files')
})

const page = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Explore)))
const count = (pattern: RegExp) => (page.match(pattern) ?? []).length

describe('Explore, the library page', () => {
  it('lists the 101 molecules under the six topics, each a link to its page, with its formula', () => {
    expect([...page.matchAll(/<h2 id="topic-[a-z]+"[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])).toEqual([
      'Basics',
      'VSEPR showcase',
      'Organic functional groups',
      'Biomolecules',
      'Everyday molecules',
      'Mechanism species',
    ])
    expect(count(/<a [^>]*href="\/explore\/[a-z-]+"/g)).toBe(101 + 1)
    expect(page).toMatch(/<a [^>]*href="\/explore\/caffeine"[^>]*><span[^>]*>Caffeine<\/span><span[^>]*><span>C<sub>8<\/sub>H<sub>10<\/sub>N<sub>4<\/sub>O<sub>2<\/sub><\/span><\/span><\/a>/)
    // An ion's charge is written on its formula.
    expect(page).toContain('<span>SO<sub>4</sub><sup>2−</sup></span>')
  })

  it('has a labelled search field over the list, with the count of molecules in a status line', () => {
    const field = /<label for="([^"]+)"[^>]*>Filter molecules<\/label>/.exec(page)
    expect(field).not.toBeNull()
    expect(page).toMatch(new RegExp(`<input [^>]*type="search"[^>]*id="${field![1]}"|<input [^>]*id="${field![1]}"[^>]*type="search"`))
    expect(page).toMatch(/<p role="status"[^>]*>101 molecules<\/p>/)
    // Nothing to clear until something is typed.
    expect(page).not.toContain('Clear')
  })
})
