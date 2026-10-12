import { describe, expect, it } from 'vitest'
import { PART_IDS, type PartId } from '@/chem-data/density/data'
import { exactOf, toNumber, type Figures } from '../figures'
import { mulberry32 } from '../rng'
import { can, reduce, warnings, type Action } from './actions'
import type { Candidate } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { formatReading, nearEnough, parseReading, stepE3, type Position, type ScaleView } from './readings'
import { partView, runOutcome } from './select'
import { unknownLiquid, unknownMetal } from './setup'
import { createLab, currentRun, densityStateSchema, type DensityState } from './state'
import { readingOf, run, scaleOf, takeReadings, wholeRun, workedValue, workOut } from './testkit'
import { FIELDS, kindOf, READ_FROM, type Field } from './worksheet'

// Spec 22.6, line by line, as far as an engine can show it. The description of each instrument's reading in
// words is the app's and is tested there (src/app/lab/density/messages.test.ts); what is held here is that the
// words can be made from what a view hands over.

const seeds = Array.from({ length: 100 }, (_, i) => i + 1)
const MODES = ['guided', 'challenge'] as const
const lab = (seed: number, mode: (typeof MODES)[number] = 'challenge') => createLab(seed, mode)
const unknown = (seed: number, part: 'liquid' | 'metal') => (part === 'liquid' ? unknownLiquid(m, seed) : unknownMetal(m, seed))
const outcome = (state: DensityState, part: PartId) => partView(m, state, part).outcome
const reasons = (state: DensityState, part: PartId) => {
  const o = outcome(state, part)
  return o.state === 'does-not-count' ? o.reasons : o.state
}

describe('for seeds 1 to 100, a careful learner', () => {
  it('has every reading count and every entry follow, finds each unknown, and completes the lab, in both modes', () => {
    for (const mode of MODES) {
      for (const seed of seeds) {
        let state = lab(seed, mode)
        for (const part of PART_IDS) {
          state = wholeRun(m, state, part)
          const view = partView(m, state, part)
          expect(view.notebook.every((e) => e.verdict?.follows === true), `seed ${seed} ${part}`).toBe(true)
          expect(view.outcome, `seed ${seed} ${part}`).toMatchObject({ state: 'counts' })
          expect(view.done).toBe(true)
          if (part !== 'reading') expect(view.expected).toEqual({ kind: 'unknown', id: unknown(seed, part).id, density: unknown(seed, part).densityE3 / 1000 })
        }
        expect(state.status).toBe('completed')
      }
    }
  })

  it('comes out within the tolerance of the stored density: at most 0.2% from it when every level is read where it stands', () => {
    let worst = { percent: 0, seed: 0, part: '' }
    for (const seed of seeds) {
      for (const part of ['liquid', 'metal'] as const) {
        const o = outcome(wholeRun(m, lab(seed), part), part)
        if (o.state !== 'counts' || o.percentOff === null) throw new Error(`seed ${seed} ${part} did not count`)
        if (Math.abs(o.percentOff) > worst.percent) worst = { percent: Math.abs(o.percentOff), seed, part }
      }
    }
    expect(worst.percent).toBeLessThan(0.2)
    expect(worst.percent).toBeLessThan(m.tolerancePercent)
  })

  it('still counts with every level read at the edge of the allowance, high or low: at most 1.0% out for the liquid and 2.8% for the metal', () => {
    const worst = { liquid: 0, metal: 0 }
    for (const seed of seeds) {
      for (const off of [-m.readingAllowance, m.readingAllowance]) {
        // The metal's two levels read the opposite ways is the worst a rise can be: the first high and the last low.
        for (const part of ['liquid', 'metal'] as const) {
          let state = run(m, lab(seed), [{ type: 'moveEye', part, eye: 'level' }])
          if (part === 'liquid') state = takeReadings(m, state, part, { off })
          else {
            state = run(m, state, [{ type: 'weigh', part }])
            state = run(m, state, [{ type: 'enter', part, field: 'piecesMass', value: readingOf(m, state, part, 'piecesMass') }, { type: 'enter', part, field: 'waterLevel', value: readingOf(m, state, part, 'waterLevel', -off) }, { type: 'addPieces', part, how: 'slide' }])
            state = run(m, state, [{ type: 'enter', part, field: 'finalLevel', value: readingOf(m, state, part, 'finalLevel', off) }])
          }
          state = run(m, workOut(m, state, part), [{ type: 'check', part }])
          const o = outcome(state, part)
          expect(o, `seed ${seed} ${part} ${off}`).toMatchObject({ state: 'counts' })
          worst[part] = Math.max(worst[part], Math.abs((o as { percentOff: number }).percentOff))
        }
      }
    }
    expect(worst.liquid).toBeLessThanOrEqual(1.0)
    expect(worst.metal).toBeLessThanOrEqual(2.81)
    expect(worst.metal).toBeLessThan(m.tolerancePercent)
  })

  it('reads a note of three figures and two on the centimetre ruler, and so an area of two; of four and three on the millimetre ruler, and an area of three', () => {
    for (const seed of seeds) {
      const state = wholeRun(m, lab(seed), 'reading')
      const figures = Object.fromEntries(partView(m, state, 'reading').notebook.map((e) => [e.field, e.figures]))
      expect(figures, `seed ${seed}`).toMatchObject({ lengthCm: 3, widthCm: 2, areaCm: 2, lengthMm: 4, widthMm: 3, areaMm: 3, firstVolume: 3, firstMass: 4 })
    }
  })

  it('finds a volume by difference of three figures and masses of four or more, so every density has three', () => {
    for (const seed of seeds) {
      for (const part of ['liquid', 'metal'] as const) {
        const state = wholeRun(m, lab(seed), part)
        const figures = Object.fromEntries(partView(m, state, part).notebook.map((e) => [e.field, e.figures]))
        if (part === 'liquid') expect(figures, `seed ${seed}`).toMatchObject({ liquidVolume: 3, liquidMass: 4, liquidDensity: 3 })
        else expect(figures, `seed ${seed}`).toMatchObject({ metalVolume: 3, metalDensity: 3 })
        expect(figures[part === 'liquid' ? 'emptyMass' : 'piecesMass']).toBeGreaterThanOrEqual(4)
      }
    }
  })
})

describe('the candidates in each table', () => {
  const gaps = (table: readonly Candidate[]) => [...table].sort((a, b) => a.densityE3 - b.densityE3).map((c, i, all) => (i === 0 ? null : ((c.densityE3 - all[i - 1]!.densityE3) / all[i - 1]!.densityE3) * 100)).filter((g): g is number => g !== null)

  it('are far enough apart to tell at the figures the instruments give: the tolerance on either side of one never reaches the tolerance on either side of another', () => {
    for (const table of [m.liquids, m.metals]) {
      const sorted = [...table].sort((a, b) => a.densityE3 - b.densityE3)
      sorted.slice(1).forEach((upper, i) => expect(sorted[i]!.densityE3 * (100 + m.tolerancePercent), `${sorted[i]!.id} and ${upper.id}`).toBeLessThan(upper.densityE3 * (100 - m.tolerancePercent)))
    }
    expect(Math.min(...gaps(m.liquids))).toBeCloseTo(7.21, 2)
    expect(Math.min(...gaps(m.metals))).toBeCloseTo(10.22, 2)
  })

  it('so a density within the tolerance of the unknown is nearest the unknown, and naming it follows', () => {
    for (const [part, table, unknowns] of [['liquid', m.liquids, m.unknownLiquids], ['metal', m.metals, m.unknownMetals]] as const) {
      for (const id of unknowns) {
        const stored = table.find((c) => c.id === id)!.densityE3
        for (const density of [Math.ceil(stored * (1 - m.tolerancePercent / 100)), stored, Math.floor(stored * (1 + m.tolerancePercent / 100))]) {
          const nearest = [...table].sort((a, b) => Math.abs(a.densityE3 - density) - Math.abs(b.densityE3 - density))[0]!
          expect(nearest.id, `${part} ${density}`).toBe(id)
        }
      }
    }
  })
})

describe('a reading with the wrong number of figures', () => {
  it('is refused with the reason, at every instrument, for what each seed shows', () => {
    for (const seed of seeds.slice(0, 30)) {
      let state = run(m, lab(seed), [{ type: 'moveEye', part: 'reading', eye: 'level' }])
      state = wholeRun(m, state, 'reading')
      for (const field of FIELDS.reading.filter((f) => kindOf(f) === 'reading')) {
        const instrument = READ_FROM[field]!
        const entry = currentRun(state, 'reading').entries[field]!
        const text = formatReading(m, instrument, typeof entry === 'number' ? entry : (entry as { value: number }).value)
        expect(parseReading(m, instrument, text).problem, `${field} ${text}`).toBeUndefined()
        expect(parseReading(m, instrument, text.slice(0, -1).replace(/\.$/, '')), `${field} ${text} cut short`).toEqual({ problem: 'too-few-figures' })
        expect(parseReading(m, instrument, `${text}0`), `${field} ${text}0`).toEqual({ problem: 'too-many-figures' })
      }
    }
  })
})

describe('a level read from above or below', () => {
  it('does not count at any seed, from either side, in either mode: Guided warns first', () => {
    for (const seed of seeds) {
      for (const eye of ['above', 'below'] as const) {
        for (const mode of MODES) {
          for (const part of PART_IDS) {
            const state = wholeRun(m, lab(seed, mode), part, { eye })
            const o = outcome(state, part)
            expect(o.state, `seed ${seed} ${part} ${eye}`).toBe('does-not-count')
            expect((o as { reasons: string[] }).reasons).toContain('eye-not-level')
          }
        }
      }
    }
  })

  it('is warned of in Guided at the reading, and not in Challenge', () => {
    for (const seed of seeds.slice(0, 20)) {
      for (const mode of MODES) {
        const state = lab(seed, mode)
        const action: Action = { type: 'enter', part: 'reading', field: 'firstVolume', value: readingOf(m, state, 'reading', 'firstVolume') }
        expect(warnings(m, state, action)).toEqual(mode === 'guided' ? ['eye-above'] : [])
      }
    }
  })

  it('counts when the eye is brought level and the level read again', () => {
    let state = lab(4, 'guided')
    state = run(m, state, [{ type: 'enter', part: 'reading', field: 'firstVolume', value: readingOf(m, state, 'reading', 'firstVolume') }])
    expect(partView(m, state, 'reading').notebook.find((e) => e.field === 'firstVolume')!.verdict).toEqual({ follows: false, slip: 'eye-above' })
    state = wholeRun(m, state, 'reading')
    expect(outcome(state, 'reading')).toMatchObject({ state: 'counts' })
  })
})

describe('an entry rounded by the wrong rule, or not following from the learner’s own numbers', () => {
  const SLIPS = [
    ['figures-too-many', 'figures-too-many'],
    ['figures-too-few', 'figures-too-few'],
    ['decimals-too-few', 'decimals-too-few'],
    ['upside-down', 'upside-down'],
  ] as const

  it('is refused in Guided with which, at every seed', () => {
    for (const seed of seeds) {
      for (const part of ['liquid', 'metal'] as const) {
        const read = takeReadings(m, lab(seed, 'guided'), part)
        for (const [slip, blocked] of SLIPS) {
          let state = read
          for (const field of FIELDS[part].filter((f) => kindOf(f) !== 'reading')) {
            const wrong = workedValue(m, state, part, field, slip)
            const right = workedValue(m, state, part, field)
            if (JSON.stringify(wrong) !== JSON.stringify(right)) {
              expect(can(m, state, { type: 'enter', part, field, value: wrong }), `seed ${seed} ${field} ${slip}`).toBe(blocked)
              expect(reduce(m, state, { type: 'enter', part, field, value: wrong })).toBe(state)
            }
            state = run(m, state, [{ type: 'enter', part, field, value: right }])
          }
        }
      }
    }
  })

  it('is marked in Challenge with which, and the run does not count, at every seed', () => {
    for (const seed of seeds) {
      for (const part of PART_IDS) {
        for (const slip of ['figures-too-many', 'figures-too-few', 'decimals-too-few'] as const) {
          const state = wholeRun(m, lab(seed), part, { slip })
          expect(reasons(state, part), `seed ${seed} ${part} ${slip}`).toContain('entries-do-not-follow')
          const marked = partView(m, state, part).notebook.filter((e) => e.verdict?.follows === false)
          expect(marked.length, `seed ${seed} ${part} ${slip}`).toBeGreaterThan(0)
          // The entry the slip was made in says which rule it broke; an entry worked from it may follow or not.
          expect(marked.some((e) => e.verdict!.slip === slip), `seed ${seed} ${part} ${slip}`).toBe(true)
        }
      }
    }
  })

  it('is marked without a slip when it follows from nothing: another liquid named, a density from other numbers', () => {
    for (const seed of seeds.slice(0, 30)) {
      const named = wholeRun(m, lab(seed), 'liquid', { slip: 'wrong-name' })
      expect(partView(m, named, 'liquid').notebook.find((e) => e.field === 'liquid')!.verdict).toEqual({ follows: false, slip: null })
      expect(reasons(named, 'liquid')).toEqual(['entries-do-not-follow'])
      let state = takeReadings(m, lab(seed), 'metal')
      state = run(m, state, [{ type: 'enter', part: 'metal', field: 'metalVolume', value: workedValue(m, state, 'metal', 'metalVolume') }, { type: 'enter', part: 'metal', field: 'metalDensity', value: { mantissa: 555, exponent: -2 } }])
      state = run(m, state, [{ type: 'enter', part: 'metal', field: 'metal', value: workedValue(m, state, 'metal', 'metal') }, { type: 'check', part: 'metal' }])
      expect(partView(m, state, 'metal').notebook.find((e) => e.field === 'metalDensity')!.verdict).toEqual({ follows: false, slip: null })
    }
  })

  it('holds a cut-off density to be cut off, where cutting and rounding differ', () => {
    let seen = 0
    for (const seed of seeds) {
      const read = takeReadings(m, lab(seed, 'guided'), 'liquid')
      const state = run(m, read, [{ type: 'enter', part: 'liquid', field: 'liquidMass', value: workedValue(m, read, 'liquid', 'liquidMass') }])
      const [cut, right] = [workedValue(m, state, 'liquid', 'liquidDensity', 'cut-off'), workedValue(m, state, 'liquid', 'liquidDensity')]
      if (JSON.stringify(cut) === JSON.stringify(right)) continue
      seen++
      expect(can(m, state, { type: 'enter', part: 'liquid', field: 'liquidDensity', value: cut }), `seed ${seed}`).toBe('cut-off')
    }
    expect(seen).toBeGreaterThan(15)
  })
})

describe('each error of technique', () => {
  it('alone makes a run of part 3 not count, with its cause named, at every seed', () => {
    for (const seed of seeds) {
      const wet = wholeRun(m, lab(seed), 'metal', { weigh: 'after' })
      expect(reasons(wet, 'metal'), `seed ${seed} wet`).toContain('weighed-wet')
      expect(reasons(wet, 'metal')).not.toContain('dropped-in')
      const dropped = wholeRun(m, lab(seed), 'metal', { add: 'drop' })
      expect(reasons(dropped, 'metal'), `seed ${seed} dropped`).toContain('dropped-in')
      expect(reasons(dropped, 'metal')).not.toContain('weighed-wet')
      // Every reading of such a run is what its instrument showed, and every entry follows: the technique alone is the cause.
      for (const state of [wet, dropped]) expect(partView(m, state, 'metal').notebook.filter((e) => kindOf(e.field) !== 'name').every((e) => e.verdict?.follows === true), `seed ${seed}`).toBe(true)
      expect(partView(m, wet, 'metal').done || partView(m, dropped, 'metal').done).toBe(false)
    }
  })

  it('shows in the numbers too: wet pieces weigh more and give a higher density, and a splash makes the rise read low, by more than the tolerance', () => {
    for (const seed of seeds) {
      const density = (state: DensityState) => toNumber(exactOf(currentRun(state, 'metal').entries.metalDensity as Figures))
      const [careful, wet, dropped] = [wholeRun(m, lab(seed), 'metal'), wholeRun(m, lab(seed), 'metal', { weigh: 'after' }), wholeRun(m, lab(seed), 'metal', { add: 'drop' })]
      expect(density(wet), `seed ${seed}`).toBeGreaterThanOrEqual(density(careful))
      const stored = unknown(seed, 'metal').densityE3 / 1000
      expect(((density(dropped) - stored) / stored) * 100, `seed ${seed}`).toBeGreaterThan(m.tolerancePercent)
      expect(reasons(dropped, 'metal')).toContain('outside-tolerance')
    }
  })

  it('is warned of first in Guided, and the run that goes on does not count', () => {
    for (const seed of seeds.slice(0, 20)) {
      let state = run(m, lab(seed, 'guided'), [{ type: 'moveEye', part: 'metal', eye: 'level' }])
      state = run(m, state, [{ type: 'enter', part: 'metal', field: 'waterLevel', value: readingOf(m, state, 'metal', 'waterLevel') }])
      expect(warnings(m, state, { type: 'addPieces', part: 'metal', how: 'drop' })).toEqual(['pieces-not-weighed', 'dropping'])
      // The same action sent again is the way on.
      state = run(m, state, [{ type: 'addPieces', part: 'metal', how: 'drop' }])
      state = run(m, state, [{ type: 'enter', part: 'metal', field: 'finalLevel', value: readingOf(m, state, 'metal', 'finalLevel') }])
      expect(warnings(m, state, { type: 'weigh', part: 'metal' })).toEqual(['pieces-wet'])
      state = run(m, state, [{ type: 'weigh', part: 'metal' }])
      state = run(m, state, [{ type: 'enter', part: 'metal', field: 'piecesMass', value: readingOf(m, state, 'metal', 'piecesMass') }])
      state = workOut(m, state, 'metal')
      expect(reasons(state, 'metal')).toEqual(expect.arrayContaining(['weighed-wet', 'dropped-in']))
    }
  })

  it('leaves the part to be run again with new numbers, and a careful run then counts', () => {
    for (const seed of seeds.slice(0, 30)) {
      for (const mode of MODES) {
        let state = wholeRun(m, lab(seed, mode), 'metal', { weigh: 'after', add: 'drop' })
        expect(partView(m, state, 'metal').done).toBe(false)
        state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'metal' }]), 'metal')
        expect(partView(m, state, 'metal')).toMatchObject({ runs: 2, done: true, outcome: { state: 'counts' } })
        expect(runOutcome(m, state, 'metal', state.parts.metal[0]!).state).toBe('does-not-count')
      }
    }
  })
})

describe('the same seed and actions', () => {
  const script = (seed: number, mode: (typeof MODES)[number], through: (s: DensityState) => DensityState = (s) => s) => {
    let state = lab(seed, mode)
    state = wholeRun(m, state, 'metal', { add: 'drop' }, through)
    state = run(m, state, [{ type: 'runAgain', part: 'metal' }], through)
    for (const part of ['liquid', 'metal', 'reading'] as const) state = wholeRun(m, state, part, {}, through)
    return state
  }

  it('give the same lab', () => {
    for (const seed of seeds.slice(0, 25)) for (const mode of MODES) expect(script(seed, mode)).toEqual(script(seed, mode))
    expect(script(1, 'guided')).not.toEqual(script(2, 'guided'))
  })

  it('give the same lab when the stored record goes through JSON and its schema after every action', () => {
    const schema = densityStateSchema(m)
    const through = (s: DensityState) => schema.parse(JSON.parse(JSON.stringify(s)))
    for (const seed of seeds.slice(0, 25)) for (const mode of MODES) expect(script(seed, mode, through)).toEqual(script(seed, mode))
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  /** Every action a page could send from a state, with values that are valid for their fields. */
  const candidates = (state: DensityState, random: () => number): Action[] => {
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
    return PART_IDS.flatMap((part): Action[] => {
      const entries = FIELDS[part].flatMap((field): Action[] => {
        const instrument = READ_FROM[field]
        if (instrument !== undefined) {
          if (can(m, state, { type: 'enter', part, field, value: 0 }) !== 'invalid-entry' && instrument === 'cylinder') return []
          const scale = scaleOf(m, state, part, field)
          if (instrument !== 'balance' && scale === null) return []
          if (instrument === 'balance' && partView(m, state, part).bench.balance.cg === null) return []
          const shown = readingOf(m, state, part, field, pick([-6, -1, 0, 0, 1, 4]))
          return [{ type: 'enter', part, field, value: shown }]
        }
        if (kindOf(field) === 'name') return [{ type: 'enter', part, field, value: pick(field === 'liquid' ? m.liquids : m.metals).id }]
        return [{ type: 'enter', part, field, value: pick([{ mantissa: 123, exponent: -1 }, { mantissa: 804, exponent: -3 }, { mantissa: -4, exponent: -1 }, { mantissa: 0, exponent: -1 }, { mantissa: 15, exponent: 0 }]) }]
      })
      return [...entries, { type: 'moveEye', part, eye: pick(['above', 'level', 'below'] as const) }, { type: 'weigh', part }, { type: 'pour', part }, { type: 'addPieces', part, how: pick(['slide', 'drop'] as const) }, { type: 'check', part }, { type: 'runAgain', part }]
    })
  }

  it('from wherever a wandering learner gets to, in either mode, every part can still be finished', () => {
    const schema = densityStateSchema(m)
    for (const seed of seeds.slice(0, 12)) {
      for (const mode of MODES) {
        const random = mulberry32(seed * 7919)
        let state = lab(seed, mode)
        for (let step = 0; step < 60 && state.status !== 'completed'; step++) {
          const possible = candidates(state, random).filter((action) => can(m, state, action) === null)
          // Something can always be done: at the least, an eye can be moved or a run begun again.
          expect(possible.length, `seed ${seed} ${mode} step ${step}`).toBeGreaterThan(0)
          state = reduce(m, state, possible[Math.floor(random() * possible.length)]!)
          expect(schema.safeParse(JSON.parse(JSON.stringify(state))).success, `seed ${seed} ${mode} step ${step}`).toBe(true)
        }
        for (const part of PART_IDS) {
          if (partView(m, state, part).done) continue
          if (can(m, state, { type: 'runAgain', part }) === null) state = run(m, state, [{ type: 'runAgain', part }])
          state = wholeRun(m, state, part)
          expect(partView(m, state, part).done, `seed ${seed} ${mode} ${part}`).toBe(true)
        }
        expect(state.status, `seed ${seed} ${mode}`).toBe('completed')
      }
    }
  }, 120000)
})

describe('Challenge shows nothing of what is expected before the entries are made', () => {
  it('gives no verdict, no outcome and no stored figure until the notebook is checked', () => {
    for (const seed of seeds.slice(0, 30)) {
      for (const part of PART_IDS) {
        let state = takeReadings(m, lab(seed), part)
        state = workOut(m, state, part, 'figures-too-many')
        const view = partView(m, state, part)
        expect(view.notebook.map((e) => e.verdict), `seed ${seed} ${part}`).toEqual(view.notebook.map(() => null))
        expect(view.outcome).toEqual({ state: 'open' })
        expect(view.expected).toBeNull()
        expect(warnings(m, state, { type: 'check', part })).toEqual([])
      }
    }
  })

  it('refuses no entry for being wrong: only for being no value its field can hold', () => {
    const state = takeReadings(m, lab(2), 'liquid')
    expect(can(m, state, { type: 'enter', part: 'liquid', field: 'liquidMass', value: { mantissa: 999999, exponent: -2 } })).toBeNull()
    expect(can(m, state, { type: 'enter', part: 'liquid', field: 'liquidMass', value: 'heavy' })).toBe('invalid-entry')
  })
})

describe('nothing says which liquid or metal an unknown is before it is named', () => {
  // Every row of the two tables but water, whose name is also what the cylinder of part 3 holds.
  const ids = [...m.liquids, ...m.metals].map((c) => c.id).filter((id) => id !== 'water')

  it('hands over no row of a table in any view before the name is entered, in either mode, and the stored figure only once a run counts', () => {
    for (const seed of seeds.slice(0, 40)) {
      for (const mode of MODES) {
        for (const part of ['liquid', 'metal'] as const) {
          let state = takeReadings(m, lab(seed, mode), part)
          for (const field of FIELDS[part].filter((f) => kindOf(f) === 'difference' || kindOf(f) === 'quotient')) state = run(m, state, [{ type: 'enter', part, field, value: workedValue(m, state, part, field) }])
          const shown = JSON.stringify([partView(m, state, part), state])
          for (const id of ids) expect(shown.includes(`"${id}"`), `seed ${seed} ${part} ${id}`).toBe(false)
          expect(partView(m, state, part).expected).toBeNull()
        }
      }
    }
  })

  it('gives no figure for how far off a run was until a run of the part counts', () => {
    for (const seed of seeds.slice(0, 30)) {
      let state = wholeRun(m, lab(seed), 'metal', { add: 'drop' })
      expect(outcome(state, 'metal')).toMatchObject({ state: 'does-not-count', percentOff: null })
      expect(partView(m, state, 'metal').expected).toBeNull()
      state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'metal' }]), 'metal')
      expect((runOutcome(m, state, 'metal', state.parts.metal[0]!) as { percentOff: number | null }).percentOff).toBeGreaterThan(m.tolerancePercent)
    }
  })

  it('judges a wrong name as not following, without saying what the unknown is', () => {
    const state = wholeRun(m, lab(1), 'metal', { slip: 'wrong-name' })
    const view = partView(m, state, 'metal')
    expect(view.outcome).toEqual({ state: 'does-not-count', reasons: ['entries-do-not-follow'], percentOff: null })
    expect(view.expected).toBeNull()
  })
})

describe('every instrument’s reading can be put into words', () => {
  /** The tenths a reader makes of whereabouts between two marks something stands; two where the words leave two as likely. */
  const TENTHS: Record<Position, number[]> = { 'on-lower': [0], 'just-past': [1], quarter: [2, 3], half: [5], 'three-quarters': [7, 8], 'just-short': [9], 'on-upper': [10] }
  const fromWords = (view: ScaleView, decimals: number) => TENTHS[view.position].map((tenths) => Math.round((view.lowerE3 + (tenths * view.markE3) / 10) / stepE3(decimals)))

  it('so that a reading made from the two marks and the whereabouts alone counts, at every seed, for every scale and every eye', () => {
    for (const seed of seeds) {
      for (const eye of ['level', 'above', 'below'] as const) {
        const state = run(m, lab(seed, 'guided'), [{ type: 'moveEye', part: 'reading', eye }])
        for (const field of FIELDS.reading.filter((f) => kindOf(f) === 'reading' && READ_FROM[f] !== 'balance')) {
          const instrument = READ_FROM[field]! as Exclude<(typeof READ_FROM)[Field], 'balance' | undefined>
          const view = scaleOf(m, state, 'reading', field)!
          for (const value of fromWords(view, m.scales[instrument].decimals)) {
            expect(nearEnough(m, instrument, value, view.atE3), `seed ${seed} ${field} ${view.position}`).toBe(true)
            // Guided takes it: it is what the scale shows from where the eye is.
            expect(can(m, state, { type: 'enter', part: 'reading', field, value: instrument === 'cylinder' ? { value, eye } : value }), `seed ${seed} ${field}`).toBeNull()
          }
        }
      }
    }
  })

  it('and the balance hands over the figures it shows, every one', () => {
    for (const seed of seeds.slice(0, 30)) {
      const { balance } = partView(m, lab(seed), 'reading').bench
      expect(formatReading(m, 'balance', balance.cg!)).toMatch(/^\d{2}\.\d{2}$/)
    }
    expect(seeds.some((seed) => formatReading(m, 'balance', partView(m, lab(seed), 'reading').bench.balance.cg!).endsWith('0'))).toBe(true)
  })
})
