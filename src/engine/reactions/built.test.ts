import { describe, expect, it } from 'vitest'
import { STATION_IDS } from '@/chem-data/reactions/data'
import type { Entry } from '../equation'
import { atomsOf, balances, checkBuilt, isBuilt, MAX_COEFFICIENT, sameBuilt } from './built'
import { PINNED_MODEL as m } from './pinnedModel'
import { stationModel } from './state'
import { rightEntry, wrongEntry } from './testkit'

// A built equation and its check (spec 24.2, 24.5): the species on each side, each state, and the balance, which
// the engine works out by counting atoms. What is wrong is named by its kind and never by what would put it right.

const withEquation = STATION_IDS.flatMap((stationId) => stationModel(m, stationId).vessels.filter((v) => v.equation !== null).map((vessel) => ({ where: `${stationId} ${vessel.id}`, stationId, vessel })))
const term = (speciesId: string, coefficient = 1, state: 'aq' | 's' | 'l' | 'g' = 'aq') => ({ speciesId, coefficient, state })

describe('checkBuilt', () => {
  it.each(withEquation)('takes the right equation of $where, and any whole multiple of it', ({ stationId, vessel }) => {
    const right = rightEntry(m, stationId, vessel.id)
    expect(checkBuilt(m, vessel, right)).toBeNull()
    for (const times of [2, 3]) {
      const multiple = { reactants: right.reactants.map((t) => ({ ...t, coefficient: t.coefficient * times })), products: right.products.map((t) => ({ ...t, coefficient: t.coefficient * times })) }
      expect(checkBuilt(m, vessel, multiple)).toBeNull()
    }
    // The order of the terms on a side does not matter.
    expect(checkBuilt(m, vessel, { reactants: [...right.reactants].reverse(), products: [...right.products].reverse() })).toBeNull()
  })

  it.each(withEquation)('names what is wrong with an equation of $where: a species that does not belong, one missing, a state, the balance', ({ stationId, vessel }) => {
    expect(checkBuilt(m, vessel, wrongEntry(m, stationId, vessel.id, 'extra'))).toBe('species-extra')
    expect(checkBuilt(m, vessel, wrongEntry(m, stationId, vessel.id, 'state'))).toBe('state-wrong')
    expect(checkBuilt(m, vessel, wrongEntry(m, stationId, vessel.id, 'unbalanced'))).toBe('not-balanced')
    const right = rightEntry(m, stationId, vessel.id)
    // A species on the wrong side does not belong there.
    expect(checkBuilt(m, vessel, { reactants: right.products, products: right.reactants })).toBe('species-extra')
  })

  it('names a missing species where a side lacks one, and a species that does not belong before one that is missing', () => {
    const { vessel } = withEquation.find((v) => v.where === 'zinc-copper-sulfate tube')!
    expect(checkBuilt(m, vessel, { reactants: [term('zinc', 1, 's'), term('copper-ii-sulfate')], products: [term('copper', 1, 's')] })).toBe('species-missing')
    expect(checkBuilt(m, vessel, { reactants: [term('zinc', 1, 's')], products: [term('copper', 1, 's'), term('hydrogen', 1, 'g')] })).toBe('species-extra')
  })

  it('marks an unbalanced equation whatever its coefficients, and balances by atoms: the peroxide with every coefficient 1 does not balance', () => {
    const { vessel } = withEquation.find((v) => v.where === 'peroxide tube')!
    for (let a = 1; a <= 4; a++) {
      for (let b = 1; b <= 4; b++) {
        for (let c = 1; c <= 4; c++) {
          const built = { reactants: [term('hydrogen-peroxide', a)], products: [term('water', b, 'l'), term('oxygen', c, 'g')] }
          expect(checkBuilt(m, vessel, built), `${a} ${b} ${c}`).toBe(a === b && a === 2 * c ? null : 'not-balanced')
        }
      }
    }
    expect(atomsOf(m, [term('hydrogen-peroxide', 2)])).toEqual({ H: 4, O: 4 })
    expect(balances(m, { reactants: [term('hydrogen-peroxide', 2)], products: [term('water', 2), term('oxygen')] })).toBe(true)
  })

  it('takes hydrogen peroxide as dissolved or as a liquid, and every other species in its own state alone', () => {
    const { vessel } = withEquation.find((v) => v.where === 'peroxide tube')!
    const built = (state: 'aq' | 's' | 'l' | 'g') => ({ reactants: [term('hydrogen-peroxide', 2, state)], products: [term('water', 2, 'l'), term('oxygen', 1, 'g')] })
    expect([checkBuilt(m, vessel, built('aq')), checkBuilt(m, vessel, built('l')), checkBuilt(m, vessel, built('g'))]).toEqual([null, null, 'state-wrong'])
    expect(m.species.filter((s) => s.states.length > 1).map((s) => s.id)).toEqual(['hydrogen-peroxide'])
  })

  it('says of an equation built where nothing reacts only that nothing reacts there', () => {
    const copper = stationModel(m, 'metals-in-acid').vessels.find((v) => v.id === 'copper')!
    expect(checkBuilt(m, copper, { reactants: [term('copper', 1, 's'), term('hydrochloric-acid', 2)], products: [term('copper-ii-chloride'), term('hydrogen', 1, 'g')] })).toBe('no-reaction')
  })

  it('does not put the catalyst in the equation: with iron(III) chloride on both sides it does not belong', () => {
    const { vessel } = withEquation.find((v) => v.where === 'peroxide tube')!
    expect(checkBuilt(m, vessel, { reactants: [term('hydrogen-peroxide', 2), term('iron-iii-chloride')], products: [term('water', 2, 'l'), term('oxygen', 1, 'g'), term('iron-iii-chloride')] })).toBe('species-extra')
  })
})

describe('isBuilt', () => {
  const station = stationModel(m, 'zinc-copper-sulfate')
  const right = rightEntry(m, 'zinc-copper-sulfate', 'tube')

  it('takes two sides of the station\'s tiles, and refuses "No reaction", an empty side, a tile of another station, a tile twice on a side, and a coefficient or a state that is none', () => {
    expect(isBuilt(station, right)).toBe(true)
    expect(isBuilt(station, { ...right, noReaction: true })).toBe(false)
    expect(isBuilt(station, { ...right, products: [] })).toBe(false)
    expect(isBuilt(station, { ...right, products: [term('magnesium-oxide')] })).toBe(false)
    expect(isBuilt(station, { ...right, reactants: [term('zinc'), term('zinc')] })).toBe(false)
    expect(isBuilt(station, { ...right, reactants: [term('zinc', 0)] })).toBe(false)
    expect(isBuilt(station, { ...right, reactants: [term('zinc', 1.5)] })).toBe(false)
    expect(isBuilt(station, { ...right, reactants: [term('zinc', MAX_COEFFICIENT + 1)] })).toBe(false)
    expect(isBuilt(station, { ...right, reactants: [term('zinc', 1, 'x' as never)] })).toBe(false)
    expect(isBuilt(station, { ...right, reactants: [null as never] })).toBe(false)
    expect(isBuilt(station, { noReaction: false } as Entry)).toBe(false)
    expect(isBuilt(station, null as never)).toBe(false)
  })

  it('tells two built equations apart term for term', () => {
    expect(sameBuilt(right, rightEntry(m, 'zinc-copper-sulfate', 'tube'))).toBe(true)
    expect(sameBuilt(right, { ...right, products: [...right.products].reverse() })).toBe(false)
  })
})
