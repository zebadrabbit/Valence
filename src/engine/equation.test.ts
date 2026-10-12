import { describe, expect, it } from 'vitest'
import { sideFault } from './equation'

// The one check of a built equation that the aqueous reactions lab and the types of reactions lab share. It was
// lifted out of the aqueous lab's check, which asked of each side only whether it held each wanted species once
// and nothing else; the test below holds the shared check to that question on every side of up to three terms.

/** The aqueous lab's question as it was written before the check was shared. */
const sameSpecies = (entered: { speciesId: string }[], wanted: { speciesId: string }[]) => entered.length === wanted.length && wanted.every((term) => entered.filter((other) => other.speciesId === term.speciesId).length === 1)

const IDS = ['a', 'b', 'c', 'd']
const sides = (max: number): { speciesId: string }[][] => {
  let all: string[][] = [[]]
  for (let length = 0; length < max; length++) all = [...all, ...all.filter((side) => side.length === length).flatMap((side) => IDS.map((id) => [...side, id]))]
  return all.map((side) => side.map((speciesId) => ({ speciesId })))
}

describe('sideFault', () => {
  it('says which kind of thing is wrong with a side, and nothing of what would put it right', () => {
    const wanted = [{ speciesId: 'a' }, { speciesId: 'b' }]
    expect(sideFault([{ speciesId: 'b' }, { speciesId: 'a' }], wanted)).toBeNull()
    expect(sideFault([{ speciesId: 'a' }], wanted)).toBe('missing')
    expect(sideFault([], wanted)).toBe('missing')
    expect(sideFault([{ speciesId: 'a' }, { speciesId: 'b' }, { speciesId: 'c' }], wanted)).toBe('extra')
    expect(sideFault([{ speciesId: 'a' }, { speciesId: 'a' }, { speciesId: 'b' }], wanted)).toBe('extra')
    // A species that does not belong is named before one that is missing.
    expect(sideFault([{ speciesId: 'a' }, { speciesId: 'c' }], wanted)).toBe('extra')
  })

  it('finds nothing wrong exactly where the aqueous lab found the same species on a side, for every side of up to three terms', () => {
    const wanted = sides(3).filter((side) => side.length > 0 && new Set(side.map((term) => term.speciesId)).size === side.length)
    let checked = 0
    for (const want of wanted) {
      for (const entered of sides(3)) {
        expect(sideFault(entered, want) === null, `${JSON.stringify(entered)} for ${JSON.stringify(want)}`).toBe(sameSpecies(entered, want))
        checked++
      }
    }
    expect(checked).toBeGreaterThan(3000)
  })
})
