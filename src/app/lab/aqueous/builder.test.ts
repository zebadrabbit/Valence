import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { FORMS, can, checkEquation, createLab } from '@/engine/aqueous'
import { correctEntry } from '@/engine/aqueous/testkit'
import { EMPTY, MAX_COEFFICIENT, addTerm, changeTerm, entered, formulaParts, removeTerm, sameEntry, setNoReaction } from './builder'

const lab = createLab(data, 'guided')
const takes = (stationId: string, entry: Parameters<typeof entered>[0]) => can(data, lab, { type: 'enterEquation', stationId, form: 'netIonic', entry: entered(entry) })

describe('an equation as it is built', () => {
  it('starts with nothing on either side, which the engine does not take', () => {
    expect(EMPTY).toEqual({ noReaction: false, reactants: [], products: [] })
    expect(takes('aq-01', EMPTY)).toBe('invalid-entry')
  })

  it('adds a species to a side with a coefficient of 1 and as dissolved, after those already there, and not twice to one side', () => {
    let entry = addTerm(EMPTY, 'reactants', 'iron-iii-ion')
    entry = addTerm(entry, 'reactants', 'hydroxide-ion')
    entry = addTerm(entry, 'products', 'iron-iii-hydroxide')
    expect(entry).toEqual({
      noReaction: false,
      reactants: [{ speciesId: 'iron-iii-ion', coefficient: 1, state: 'aq' }, { speciesId: 'hydroxide-ion', coefficient: 1, state: 'aq' }],
      products: [{ speciesId: 'iron-iii-hydroxide', coefficient: 1, state: 'aq' }],
    })
    expect(addTerm(entry, 'reactants', 'iron-iii-ion')).toBe(entry)
    // The same species on the other side is the learner's to write, and the check's to judge.
    expect(addTerm(entry, 'products', 'iron-iii-ion').products).toHaveLength(2)
    expect(takes('aq-01', entry)).toBeNull()
  })

  it('changes the coefficient of a term within 1 to 9, and its state, and leaves the other terms as they are', () => {
    const entry = addTerm(addTerm(EMPTY, 'reactants', 'iron-iii-ion'), 'reactants', 'hydroxide-ion')
    expect(MAX_COEFFICIENT).toBe(9)
    expect(changeTerm(entry, 'reactants', 'hydroxide-ion', { coefficient: 3 }).reactants).toEqual([{ speciesId: 'iron-iii-ion', coefficient: 1, state: 'aq' }, { speciesId: 'hydroxide-ion', coefficient: 3, state: 'aq' }])
    expect(changeTerm(entry, 'reactants', 'hydroxide-ion', { coefficient: 0 })).toBe(entry)
    expect(changeTerm(entry, 'reactants', 'hydroxide-ion', { coefficient: 10 })).toBe(entry)
    expect(changeTerm(entry, 'reactants', 'iron-iii-ion', { state: 's' }).reactants[0]).toEqual({ speciesId: 'iron-iii-ion', coefficient: 1, state: 's' })
    expect(changeTerm(entry, 'products', 'iron-iii-ion', { state: 's' })).toEqual(entry)
  })

  it('removes a term from its side only', () => {
    const entry = addTerm(addTerm(EMPTY, 'reactants', 'water'), 'products', 'water')
    expect(removeTerm(entry, 'reactants', 'water')).toEqual({ noReaction: false, reactants: [], products: [{ speciesId: 'water', coefficient: 1, state: 'aq' }] })
  })

  it('keeps what was built while "No reaction" is chosen, and enters "No reaction" alone', () => {
    const built = addTerm(addTerm(EMPTY, 'reactants', 'cobalt-ii-ion'), 'products', 'cobalt-ii-ion')
    const none = setNoReaction(built, true)
    expect(none.reactants).toEqual(built.reactants)
    expect(entered(none)).toEqual({ noReaction: true, reactants: [], products: [] })
    expect(takes('aq-05', none)).toBeNull()
    expect(entered(setNoReaction(none, false))).toEqual(built)
    expect(entered(built)).toBe(built)
  })

  it('can build every curated equation of every station, tap by tap, to one the check passes', () => {
    for (const station of data.stations) {
      for (const form of FORMS) {
        const wanted = correctEntry(data, station.id, form)
        let entry = EMPTY
        if (wanted.noReaction) entry = setNoReaction(entry, true)
        for (const side of ['reactants', 'products'] as const) {
          for (const term of wanted[side]) {
            expect(station.paletteSpecies, station.id).toContain(term.speciesId)
            expect(term.coefficient).toBeLessThanOrEqual(MAX_COEFFICIENT)
            entry = changeTerm(addTerm(entry, side, term.speciesId), side, term.speciesId, { coefficient: term.coefficient, state: term.state })
          }
        }
        expect(sameEntry(entered(entry), wanted), `${station.id} ${form}`).toBe(true)
        expect(checkEquation(data, station, form, entered(entry)), `${station.id} ${form}`).toBeNull()
      }
    }
  })

  it('tells two entries apart by what they hold', () => {
    const one = addTerm(EMPTY, 'reactants', 'water')
    expect(sameEntry(one, addTerm(EMPTY, 'reactants', 'water'))).toBe(true)
    expect(sameEntry(one, changeTerm(one, 'reactants', 'water', { state: 'l' }))).toBe(false)
    expect(sameEntry(null, null)).toBe(true)
    expect(sameEntry(one, null)).toBe(false)
  })
})

describe('a formula as it is drawn', () => {
  it('is cut into what stands on the line, what goes below it and what goes above it, with plain digits and signs', () => {
    expect(formulaParts('Fe³⁺')).toEqual([{ text: 'Fe', at: 'line' }, { text: '3+', at: 'above' }])
    expect(formulaParts('SO₄²⁻')).toEqual([{ text: 'SO', at: 'line' }, { text: '4', at: 'below' }, { text: '2−', at: 'above' }])
    expect(formulaParts('Fe(OH)₃')).toEqual([{ text: 'Fe(OH)', at: 'line' }, { text: '3', at: 'below' }])
    expect(formulaParts('Co(NO₃)₂')).toEqual([{ text: 'Co(NO', at: 'line' }, { text: '3', at: 'below' }, { text: ')', at: 'line' }, { text: '2', at: 'below' }])
    expect(formulaParts('Cl⁻')).toEqual([{ text: 'Cl', at: 'line' }, { text: '−', at: 'above' }])
    expect(formulaParts('Mg')).toEqual([{ text: 'Mg', at: 'line' }])
  })

  it('draws every formula of the record with no raised or lowered character left on the line, and loses none', () => {
    for (const { formula } of data.species) {
      const parts = formulaParts(formula)
      for (const part of parts) expect(part.text, formula).toMatch(part.at === 'line' ? /^[A-Za-z()]+$/ : part.at === 'below' ? /^\d+$/ : /^\d*[+−]$/)
      expect(parts.map((part) => part.text).join('').length, formula).toBe([...formula].length)
    }
  })
})
