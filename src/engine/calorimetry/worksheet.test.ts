import { describe, expect, it } from 'vitest'
import type { PartId } from '@/chem-data/calorimetry/data'
import { parseSig3, type Sig3 } from './entries'
import { PINNED_MODEL as m } from './pinnedModel'
import type { RunSetup } from './setup'
import { FIELDS, NO_ENTRIES, percentOff, verdictOf, withinTolerance, type Entries, type Field, type Shown } from './worksheet'

// The rounding convention, at its edges. Every number here can be worked on paper from the bench's figures: a
// specific heat of 4.18 J/(g·°C), 100.0 g of mixed solutions, 50.0 g of water, 80.044 g/mol.

const sig = (text: string): Sig3 => parseSig3(text)!
const FOLLOWS = { follows: true, slip: null }
const not = (slip: string | null = null) => ({ follows: false, slip })

/** A bench: 4.03 g of salt; a 51.37 g piece from a bath at 99.6 °C. */
const bench: RunSetup = { startTenths: 221, saltCg: 403, metalCg: 5137, bathTenths: 996 }
const verdict = (part: PartId, shown: Shown, entries: Partial<Entries>, field: Field, run: RunSetup = bench) => verdictOf(m, part, run, shown, { ...NO_ENTRIES, ...entries }, field)

describe('the order of the entries', () => {
  it('is the order they are worked out in, with the heat for each mole last in parts 1 and 2 and the metal last in part 3', () => {
    expect(FIELDS.neutralisation).toEqual(['start', 'extreme', 'change', 'heat', 'direction', 'moles', 'perMole'])
    expect(FIELDS.dissolving).toEqual(FIELDS.neutralisation)
    expect(FIELDS.metal).toEqual(['start', 'extreme', 'change', 'heat', 'specificHeat', 'metal'])
  })

  it('gives no verdict on an empty entry, or on one whose entries above are empty', () => {
    const shown = { start: 221, extreme: 164 }
    for (const field of FIELDS.dissolving) expect(verdict('dissolving', shown, {}, field), field).toBeNull()
    expect(verdict('dissolving', shown, { change: 57 }, 'change')).toBeNull()
    expect(verdict('dissolving', shown, { heat: sig('1290') }, 'heat')).toBeNull()
    expect(verdict('dissolving', shown, { heat: sig('1290'), moles: sig('0.0503'), perMole: sig('25.6') }, 'perMole')).toBeNull()
    expect(verdict('metal', shown, { specificHeat: sig('0.363') }, 'specificHeat')).toBeNull()
    expect(verdict('metal', shown, { metal: 'zinc-piece' }, 'metal')).toBeNull()
  })
})

describe('the two temperatures', () => {
  const shown = { start: 221, extreme: 164 }

  it('must be ones the logger shows, to within 0.1 °C, the edge included', () => {
    for (const [typed, follows] of [[221, true], [220, true], [222, true], [219, false], [223, false], [164, false]] as const) expect(verdict('dissolving', shown, { start: typed }, 'start'), String(typed)).toEqual(follows ? FOLLOWS : not())
    for (const [typed, follows] of [[164, true], [163, true], [165, true], [162, false], [166, false], [221, false]] as const) expect(verdict('dissolving', shown, { extreme: typed }, 'extreme'), String(typed)).toEqual(follows ? FOLLOWS : not())
  })
})

describe('the change in temperature', () => {
  it("is the difference of the learner's own two temperatures, exactly", () => {
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, change: 57 }, 'change')).toEqual(FOLLOWS)
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, change: 56 }, 'change')).toEqual(not())
    // It follows from what was typed, not from what the logger showed: 22.2 and 16.5 give 5.7 too.
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 222, extreme: 165, change: 57 }, 'change')).toEqual(FOLLOWS)
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 222, extreme: 164, change: 57 }, 'change')).toEqual(not())
  })

  it('needs no sign, takes a minus for a fall, and names a minus for a rise as the wrong sign', () => {
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, change: -57 }, 'change')).toEqual(FOLLOWS)
    expect(verdict('neutralisation', { start: 200, extreme: 268 }, { start: 200, extreme: 268, change: 68 }, 'change')).toEqual(FOLLOWS)
    expect(verdict('neutralisation', { start: 200, extreme: 268 }, { start: 200, extreme: 268, change: -68 }, 'change')).toEqual(not('wrong-sign'))
    expect(verdict('neutralisation', { start: 200, extreme: 200 }, { start: 200, extreme: 200, change: 0 }, 'change')).toEqual(FOLLOWS)
  })
})

describe('the heat of the cup\'s contents', () => {
  it('is mass x 4.18 x the change entered, rounded to three figures: 100.0 g x 4.18 x 6.8 = 2842.4, so 2840', () => {
    const heat = (text: string) => verdict('neutralisation', { start: 200, extreme: 268 }, { change: 68, heat: sig(text) }, 'heat')
    expect(heat('2840')).toEqual(FOLLOWS)
    expect(heat('2850')).toEqual(not())
    expect(heat('2830')).toEqual(not())
    expect(heat('284')).toEqual(not())
    expect(heat('-2840')).toEqual(not('wrong-sign'))
  })

  it('takes either neighbour at an exact tie, and no other: 100.0 g x 4.18 x 7.5 = 3135', () => {
    const heat = (text: string) => verdict('neutralisation', { start: 200, extreme: 275 }, { change: 75, heat: sig(text) }, 'heat')
    expect([heat('3130'), heat('3140')]).toEqual([FOLLOWS, FOLLOWS])
    expect([heat('3120'), heat('3150')]).toEqual([not(), not()])
  })

  it('names a value cut off where it should be rounded: 2758.8 is 2760, and 2750 is cut off', () => {
    const heat = (text: string) => verdict('neutralisation', { start: 200, extreme: 266 }, { change: 66, heat: sig(text) }, 'heat')
    expect(heat('2760')).toEqual(FOLLOWS)
    expect(heat('2750')).toEqual(not('cut-off'))
    expect(heat('2740')).toEqual(not())
  })

  it('takes the mass in the cup in full or to 0.1 g: 54.03 g and 54.0 g both give 1290', () => {
    const heat = (text: string, run = bench) => verdict('dissolving', { start: 221, extreme: 164 }, { change: 57, heat: sig(text) }, 'heat', run)
    // 54.03 x 4.18 x 5.7 = 1287.3 and 54.0 x 4.18 x 5.7 = 1286.6.
    expect(heat('1290')).toEqual(FOLLOWS)
    expect(heat('1280')).toEqual(not('cut-off'))
    // 3.86 g: 53.86 x 4.18 x 5.7 = 1283.3 and 53.9 x 4.18 x 5.7 = 1284.2, on one side of the tie at 1285.
    expect(heat('1280', { ...bench, saltCg: 386 })).toEqual(FOLLOWS)
    expect(heat('1290', { ...bench, saltCg: 386 })).toEqual(not())
    // 3.94 g: 53.94 g gives 1285.17 and 53.9 g gives 1284.22, one on each side of the tie: both roundings are someone's correct answer.
    expect([heat('1280', { ...bench, saltCg: 394 }), heat('1290', { ...bench, saltCg: 394 })]).toEqual([FOLLOWS, FOLLOWS])
  })

  it("names the salt's mass left out of the mass that cooled: 50.0 g x 4.18 x 5.7 = 1191.3", () => {
    const heat = (text: string) => verdict('dissolving', { start: 221, extreme: 164 }, { change: 57, heat: sig(text) }, 'heat')
    expect(heat('1190')).toEqual(not('salt-left-out'))
    expect(heat('1180')).toEqual(not())
    // In part 3 the water alone is what the heat is worked for.
    expect(verdict('metal', { start: 239, extreme: 301 }, { change: 62, heat: sig('1300') }, 'heat')).toEqual(FOLLOWS)
  })
})

describe('which way the heat went', () => {
  it("follows from the learner's own two temperatures: out for a rise, in for a fall", () => {
    expect(verdict('neutralisation', { start: 200, extreme: 268 }, { start: 200, extreme: 268, direction: 'out' }, 'direction')).toEqual(FOLLOWS)
    expect(verdict('neutralisation', { start: 200, extreme: 268 }, { start: 200, extreme: 268, direction: 'in' }, 'direction')).toEqual(not())
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, direction: 'in' }, 'direction')).toEqual(FOLLOWS)
    expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, direction: 'out' }, 'direction')).toEqual(not())
    // Two equal temperatures say neither.
    for (const direction of ['out', 'in'] as const) expect(verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 221, direction }, 'direction')).toEqual(not())
  })
})

describe('the moles', () => {
  it('of water formed are the volume times the molarity: 0.0500 L x 1.00 mol/L, given to three figures', () => {
    const moles = (text: string) => verdict('neutralisation', { start: 200, extreme: 268 }, { moles: sig(text) }, 'moles')
    expect(moles('0.0500')).toEqual(FOLLOWS)
    expect(moles('.0500')).toEqual(FOLLOWS)
    expect(moles('0.0501')).toEqual(not())
    expect(moles('0.100')).toEqual(not())
    expect(moles('50.0')).toEqual(not())
  })

  it('of the salt are its mass over its molar mass, taken in full or to three figures: 4.20 / 80.044 = 0.052471 and 4.20 / 80.0 = 0.0525', () => {
    const moles = (text: string, saltCg: number) => verdict('dissolving', { start: 221, extreme: 164 }, { moles: sig(text) }, 'moles', { ...bench, saltCg })
    expect(moles('0.0525', 420)).toEqual(FOLLOWS)
    expect(moles('0.0524', 420)).toEqual(not('cut-off'))
    expect(moles('0.0526', 420)).toEqual(not())
    // 4.03 g: 0.050347 with the molar mass in full, 0.050375 with it to three figures; the tie at 0.05035 lies between, so both roundings stand.
    expect([moles('0.0503', 403), moles('0.0504', 403)]).toEqual([FOLLOWS, FOLLOWS])
    expect([moles('0.0502', 403), moles('0.0505', 403)]).toEqual([not(), not()])
  })
})

describe('the heat for each mole', () => {
  const part1 = (heat: string, perMole: string, change = 68) => verdict('neutralisation', { start: 200, extreme: 200 + change }, { start: 200, extreme: 200 + change, change, heat: sig(heat), direction: 'out', moles: sig('0.0500'), perMole: sig(perMole) }, 'perMole')

  it('is the heat over the moles, over 1000, with a minus where heat was given out: 2840 J / 0.0500 mol = -56.8 kJ/mol', () => {
    expect(part1('2840', '-56.8')).toEqual(FOLLOWS)
    expect(part1('2840', '-56.9')).toEqual(not())
    expect(part1('2840', '-56.7')).toEqual(not())
  })

  it('names a result with the wrong sign, and one left in joules for each mole', () => {
    expect(part1('2840', '56.8')).toEqual(not('wrong-sign'))
    expect(part1('2840', '+56.8')).toEqual(not('wrong-sign'))
    expect(part1('2840', '-56800')).toEqual(not('joules-for-kilojoules'))
    const part2 = (perMole: string) => verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, change: 57, heat: sig('1290'), direction: 'in', moles: sig('0.0503'), perMole: sig(perMole) }, 'perMole')
    expect([part2('25.6'), part2('+25.6')]).toEqual([FOLLOWS, FOLLOWS])
    expect(part2('-25.6')).toEqual(not('wrong-sign'))
  })

  it('goes by the direction the learner entered, whatever the temperatures say: the direction is marked on its own', () => {
    const entries = { start: 200, extreme: 268, change: 68, heat: sig('2840'), direction: 'in' as const, moles: sig('0.0500') }
    expect(verdict('neutralisation', { start: 200, extreme: 268 }, { ...entries, perMole: sig('56.8') }, 'perMole')).toEqual(FOLLOWS)
    expect(verdict('neutralisation', { start: 200, extreme: 268 }, { ...entries, perMole: sig('-56.8') }, 'perMole')).toEqual(not('wrong-sign'))
  })

  it('is taken worked from the rounded entries above or from the unrounded values behind them, and from anything between', () => {
    // 4.03 g of salt, a fall of 5.7 °C. Unrounded: 1287.3 J / 0.050347 mol = 25.57. Rounded: 1290 / 0.0503 = 25.65.
    const part2 = (perMole: string, moles = '0.0503') => verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, change: 57, heat: sig('1290'), direction: 'in', moles: sig(moles), perMole: sig(perMole) }, 'perMole')
    expect([part2('25.6'), part2('25.5')]).toEqual([FOLLOWS, FOLLOWS])
    expect([part2('25.7'), part2('25.4')]).toEqual([not(), not()])
    // With the moles entered as 0.0504, the other correct rounding, the same two stand.
    expect([part2('25.6', '0.0504'), part2('25.5', '0.0504'), part2('25.7', '0.0504')]).toEqual([FOLLOWS, FOLLOWS, not()])
  })

  it('carries a tie in the heat through to both of its neighbours: 3135 J entered as 3130 or as 3140', () => {
    expect([part1('3130', '-62.6', 75), part1('3130', '-62.7', 75), part1('3130', '-62.8', 75)]).toEqual([FOLLOWS, FOLLOWS, not()])
    expect([part1('3140', '-62.6', 75), part1('3140', '-62.7', 75), part1('3140', '-62.8', 75)]).toEqual([not(), FOLLOWS, FOLLOWS])
  })

  it('names a value cut off where it should be rounded', () => {
    // 2760 J / 0.0500 mol = 55.2 exactly, and 2758.8 / 0.0500 = 55.176: 55.1 is the second with its figures dropped.
    expect(part1('2760', '-55.2', 66)).toEqual(FOLLOWS)
    expect(part1('2760', '-55.1', 66)).toEqual(not('cut-off'))
  })

  it('follows from an entry above that does not itself follow, as typed, or from the value that entry should have been worked from', () => {
    // The salt left out of the heat: 1190 J where 1287 belongs. 1190 / 0.0503 = 23.66; the unrounded chain still gives 25.6.
    const after = (perMole: string) => verdict('dissolving', { start: 221, extreme: 164 }, { start: 221, extreme: 164, change: 57, heat: sig('1190'), direction: 'in', moles: sig('0.0503'), perMole: sig(perMole) }, 'perMole')
    expect([after('23.7'), after('23.6'), after('25.6')]).toEqual([FOLLOWS, FOLLOWS, FOLLOWS])
    // Nothing between the two is taken: they are not within half a step of each other.
    expect([after('24.5'), after('23.5'), after('25.7')]).toEqual([not(), not(), not()])
  })
})

describe("the metal's specific heat", () => {
  // 50.0 g x 4.18 x 6.2 = 1295.8 J, entered as 1300. The piece fell from 99.6 to 30.1 °C: 69.5 °C.
  const entries = { start: 239, extreme: 301, change: 62, heat: sig('1300') }
  const heat = (text: string, more: Partial<Entries> = {}) => verdict('metal', { start: 239, extreme: 301 }, { ...entries, ...more, specificHeat: sig(text) }, 'specificHeat')

  it('is the heat the water took in over the mass of the piece times its fall: 1295.8 / (51.37 x 69.5) = 0.3629, and 1300 / (51.37 x 69.5) = 0.3641', () => {
    expect([heat('0.363'), heat('0.364'), heat('.363')]).toEqual([FOLLOWS, FOLLOWS, FOLLOWS])
    expect(heat('0.365')).toEqual(not())
    expect(heat('-0.363')).toEqual(not('wrong-sign'))
  })

  it("names the water's change used where the metal's fall belongs: 1295.8 / (51.37 x 6.2) = 4.07", () => {
    expect(heat('4.07')).toEqual(not('water-change-used'))
    expect(heat('4.08')).toEqual(not('water-change-used'))
    expect(heat('4.10')).toEqual(not())
  })

  it('names a value cut off where it should be rounded', () => {
    // A 48.00 g piece: 1295.8 / (48.00 x 69.5) = 0.38843 and 1300 / 3336 = 0.38969: 0.388 and 0.390 are correct roundings, 0.389 lies between them, and 0.387 is nothing.
    const run = { ...bench, metalCg: 4800 }
    const at = (text: string) => verdict('metal', { start: 239, extreme: 301 }, { ...entries, specificHeat: sig(text) }, 'specificHeat', run)
    expect([at('0.388'), at('0.389'), at('0.390')]).toEqual([FOLLOWS, FOLLOWS, FOLLOWS])
    expect(at('0.387')).toEqual(not())
    // The 51.37 g piece: every way of working it gives between 0.3627 and 0.3641, and 0.362 is the low end with its figures dropped.
    expect(heat('0.362')).toEqual(not('cut-off'))
    expect(heat('0.361')).toEqual(not())
  })

  it('does not follow where the highest temperature entered is not below the bath: there is no fall to divide by', () => {
    expect(heat('0.363', { extreme: 996 })).toEqual(not())
    expect(heat('0.363', { extreme: 1200 })).toEqual(not())
  })
})

describe('which metal it is', () => {
  const which = (specificHeat: string, metal: string, model = m) => verdictOf(model, 'metal', bench, { start: 239, extreme: 301 }, { ...NO_ENTRIES, specificHeat: sig(specificHeat), metal }, 'metal')

  it("is the one of the four whose specific heat is nearest the learner's own", () => {
    expect(which('0.363', 'zinc-piece')).toEqual(FOLLOWS)
    expect(which('0.363', 'iron-piece')).toEqual(not())
    expect(which('0.430', 'iron-piece')).toEqual(FOLLOWS)
    expect(which('0.418', 'zinc-piece')).toEqual(FOLLOWS)
    expect(which('0.419', 'iron-piece')).toEqual(FOLLOWS)
    expect(which('0.419', 'zinc-piece')).toEqual(not())
    expect(which('0.860', 'aluminium-piece')).toEqual(FOLLOWS)
    expect(which('0.215', 'tin-piece')).toEqual(FOLLOWS)
    expect(which('9.99', 'aluminium-piece')).toEqual(FOLLOWS)
    expect(which('0.363', 'copper-piece')).toEqual(not())
  })

  it('is either of two at an exact tie', () => {
    const model = { ...m, candidates: [{ id: 'a', specificHeatE3: 300 }, { id: 'b', specificHeatE3: 400 }, { id: 'c', specificHeatE3: 900 }] }
    expect([which('0.350', 'a', model), which('0.350', 'b', model), which('0.350', 'c', model)]).toEqual([FOLLOWS, FOLLOWS, not()])
    expect([which('0.351', 'a', model), which('0.351', 'b', model)]).toEqual([not(), FOLLOWS])
  })
})

describe('the tolerance', () => {
  it('takes a result within 5% of the stored value, the edge included, and no result of the other sign', () => {
    // 5% of 57.706 is 2.8853: 54.9 is 2.806 under and 54.8 is 2.906 under.
    expect(withinTolerance(m, sig('-54.9'), m.neutralisationJ, 1000)).toBe(true)
    expect(withinTolerance(m, sig('-54.8'), m.neutralisationJ, 1000)).toBe(false)
    expect(withinTolerance(m, sig('-60.5'), m.neutralisationJ, 1000)).toBe(true)
    expect(withinTolerance(m, sig('-60.6'), m.neutralisationJ, 1000)).toBe(false)
    expect(withinTolerance(m, sig('57.7'), m.neutralisationJ, 1000)).toBe(false)
    // An edge that can be typed: 5% of 0.400 is 0.020.
    expect([withinTolerance(m, sig('0.380'), 400, 1000), withinTolerance(m, sig('0.420'), 400, 1000), withinTolerance(m, sig('0.379'), 400, 1000), withinTolerance(m, sig('0.421'), 400, 1000)]).toEqual([true, true, false, false])
  })

  it('is told beside how far the size of a result is from the stored size, which decides nothing', () => {
    expect(percentOff(sig('-56.8'), m.neutralisationJ, 1000)).toBeCloseTo(-1.57, 2)
    expect(percentOff(sig('24.2'), m.solutionJ, 1000)).toBeCloseTo(-0.84, 2)
    expect(percentOff(sig('0.400'), 388, 1000)).toBeCloseTo(3.09, 2)
  })
})
