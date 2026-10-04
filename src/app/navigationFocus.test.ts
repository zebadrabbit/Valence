import { describe, expect, it } from 'vitest'
import { focusesHeading } from './navigationFocus'

// After a navigation focus goes to the new page's h1 (v1 spec 11). The periodic table is the one exception
// (periodic table spec 8): opening an element from the table keeps focus on the cell that was chosen.
describe('focusesHeading', () => {
  const keep = { keepFocus: true }

  it('moves focus to the heading after an ordinary navigation', () => {
    expect(focusesHeading('PUSH', null, false)).toBe(true)
    expect(focusesHeading('REPLACE', null, false)).toBe(true)
    expect(focusesHeading('PUSH', undefined, false)).toBe(true)
    expect(focusesHeading('PUSH', { keepFocus: false }, false)).toBe(true)
    expect(focusesHeading('PUSH', { other: true }, false)).toBe(true)
  })

  it('leaves focus where it is when the link that was followed asked to keep it', () => {
    expect(focusesHeading('REPLACE', keep, false)).toBe(false)
    expect(focusesHeading('PUSH', keep, false)).toBe(false)
  })

  it('moves focus to the heading on Back or Forward even to such an address, where no link has focus to keep', () => {
    expect(focusesHeading('POP', keep, false)).toBe(true)
    expect(focusesHeading('POP', null, false)).toBe(true)
  })

  it('does not move focus when the app first loads', () => {
    expect(focusesHeading('POP', null, true)).toBe(false)
    expect(focusesHeading('PUSH', null, true)).toBe(false)
    expect(focusesHeading('POP', keep, true)).toBe(false)
  })
})
