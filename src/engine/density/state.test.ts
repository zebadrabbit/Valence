import { describe, expect, it } from 'vitest'
import { PART_IDS } from '@/chem-data/density/data'
import { PINNED_MODEL as m } from './pinnedModel'
import { runSetup } from './setup'
import { balanceOf, benchOf, createLab, currentRun, cylinderOf, densityStateSchema, isBench, judge, newRun, type DensityState, type Run } from './state'
import { takeReadings, wholeRun } from './testkit'

const schema = densityStateSchema(m)
const roundTrip = (state: DensityState): DensityState => JSON.parse(JSON.stringify(state))
const changed = (state: DensityState, edit: (copy: DensityState) => void) => {
  const copy = roundTrip(state)
  edit(copy)
  return schema.safeParse(copy)
}
const messages = (result: ReturnType<typeof schema.safeParse>) => (result.success ? [] : result.error.issues.map((i) => i.message))

describe('the stored record', () => {
  it('begins as three untouched benches, the eye above each cylinder', () => {
    expect(createLab(7, 'guided')).toEqual({ seed: 7, mode: 'guided', status: 'in-progress', parts: { reading: [newRun(0)], liquid: [newRun(0)], metal: [newRun(0)] } })
    expect(newRun(2)).toMatchObject({ index: 2, eye: 'above', bench: [], closed: false })
    expect(createLab(-1, 'challenge').seed).toBe(4294967295)
    expect(schema.safeParse(createLab(7, 'guided')).success).toBe(true)
  })

  it('round-trips through JSON and the schema after every action of a whole lab, in both modes', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      let state = createLab(11, mode)
      const through = (s: DensityState) => {
        const back = schema.parse(roundTrip(s))
        expect(back).toEqual(s)
        return back
      }
      for (const part of PART_IDS) state = wholeRun(m, state, part, {}, through)
      expect(state.status).toBe('completed')
    }
  })

  it('round-trips the runs that do not count, and the runs left behind', () => {
    let state = createLab(3, 'challenge')
    const through = (s: DensityState) => schema.parse(roundTrip(s))
    state = wholeRun(m, state, 'metal', { weigh: 'after', add: 'drop', eye: 'below', slip: 'figures-too-few' }, through)
    state = through({ ...state, parts: { ...state.parts, metal: [...state.parts.metal, newRun(1)] } })
    state = takeReadings(m, state, 'metal', {}, through)
    expect(state.parts.metal.length).toBe(2)
  })

  it('refuses what the reducer would not have stored', () => {
    const state = wholeRun(m, wholeRun(m, createLab(5, 'challenge'), 'liquid'), 'metal')
    expect(schema.safeParse(roundTrip(state)).success).toBe(true)
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.index = 1)))).toContain("a run's index is its place in the list")
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.bench = ['pour', 'weigh', 'weigh'])))).toContain('the bench was worked in no order the lab allows')
    expect(messages(changed(state, (s) => (s.parts.metal[0]!.bench = ['weigh', 'slide', 'drop'])))).toContain('the bench was worked in no order the lab allows')
    expect(messages(changed(state, (s) => (s.parts.reading[0]!.bench = ['weigh'])))).toContain('the bench was worked in no order the lab allows')
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.entries.metal = 'zinc')))).toContain("only the part's own entries")
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.entries.liquid = 'mercury')))).toContain('"liquid" holds what its field cannot')
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.entries.liquidVolume = { value: 600, eye: 'level' })))).toContain('"liquidVolume" holds what its field cannot')
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.bench = ['weigh', 'pour'])))).toContain('"fullMass" was read before the bench showed it')
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.entries.emptyMass = null)))).toEqual(expect.arrayContaining(['"liquidMass" has nothing to be worked from', "the liquid was poured before the empty cylinder's mass was read"]))
    expect(messages(changed(state, (s) => (s.parts.metal[0]!.entries.waterLevel = null)))).toContain("the pieces went in before the water's level was read")
    expect(messages(changed(state, (s) => (s.parts.liquid[0]!.entries.liquid = null)))).toEqual(expect.arrayContaining(['a notebook is checked when every entry is made']))
    expect(messages(changed(state, (s) => (s.status = 'completed')))).toContain('the status is not the one the runs give')
    expect(changed(state, (s) => ((s.parts.liquid[0] as Run & { more?: number }).more = 1)).success).toBe(false)
    expect(changed(state, (s) => (s.parts.liquid[0]!.entries.liquidDensity = { mantissa: 0.5, exponent: -3 })).success).toBe(false)
    expect(changed(state, (s) => (s.parts.liquid = [])).success).toBe(false)
    expect(changed(state, (s) => ((s as { seed: number }).seed = 2 ** 32)).success).toBe(false)
    // Negative zero would come back from JSON as zero: it is not stored.
    expect(schema.safeParse({ ...state, parts: { ...state.parts, reading: [{ ...newRun(0), entries: { ...newRun(0).entries, temperature: -0 } }] } }).success).toBe(false)
  })

  it('refuses pieces taken out to be weighed before the last level was read', () => {
    const state = takeReadings(m, createLab(5, 'challenge'), 'metal', { weigh: 'after' })
    expect(schema.safeParse(roundTrip(state)).success).toBe(true)
    expect(messages(changed(state, (s) => (s.parts.metal[0]!.entries.finalLevel = null)))).toContain('the pieces were taken out before the last level was read')
  })

  it('holds a completed status to runs that count', () => {
    let state = createLab(9, 'guided')
    for (const part of PART_IDS) state = wholeRun(m, state, part)
    expect(schema.safeParse(roundTrip(state)).success).toBe(true)
    expect(messages(changed(state, (s) => (s.status = 'in-progress')))).toContain('the status is not the one the runs give')
    expect(messages(changed(state, (s) => (s.parts.metal[0]!.entries.metal = 'iron')))).toContain('the status is not the one the runs give')
  })
})

describe('a bench as it stands', () => {
  it('is worked in the orders the lab allows, and no other', () => {
    expect([[], ['weigh'], ['weigh', 'pour'], ['weigh', 'pour', 'weigh']].map((b) => isBench('liquid', b as Run['bench']))).toEqual([true, true, true, true])
    expect([['pour'], ['weigh', 'weigh'], ['weigh', 'slide']].map((b) => isBench('liquid', b as Run['bench']))).toEqual([false, false, false])
    expect([[], ['weigh'], ['slide'], ['drop'], ['weigh', 'slide'], ['weigh', 'drop'], ['slide', 'weigh'], ['drop', 'weigh']].map((b) => isBench('metal', b as Run['bench']))).toEqual([true, true, true, true, true, true, true, true])
    expect([['pour'], ['slide', 'drop'], ['weigh', 'weigh'], ['weigh', 'slide', 'weigh']].map((b) => isBench('metal', b as Run['bench']))).toEqual([false, false, false, false])
    expect(isBench('reading', [])).toBe(true)
    expect(benchOf('metal', { bench: ['drop', 'weigh'] })).toMatchObject({ weighed: 'wet', added: 'dropped' })
    expect(benchOf('metal', { bench: ['weigh', 'slide'] })).toMatchObject({ weighed: 'dry', added: 'slid' })
    expect(benchOf('liquid', { bench: ['weigh', 'pour'] })).toMatchObject({ emptyWeighed: true, poured: true, fullWeighed: false })
  })

  it('shows on the balance and in the cylinder what the seed fixes, at every stage of part 3', () => {
    const seed = 1
    const setup = runSetup(m, seed, 0)
    const at = (bench: Run['bench']) => ({ ...newRun(0), bench })
    const pieces = Math.round((2700 * setup.piecesTenthMl) / 100) // seed 1's metal is aluminium
    expect(balanceOf(m, seed, 'metal', at([]))).toBeNull()
    expect(balanceOf(m, seed, 'metal', at(['weigh']))).toEqual({ cg: pieces, holds: 'pieces' })
    expect(balanceOf(m, seed, 'metal', at(['weigh', 'slide']))).toBeNull()
    expect(balanceOf(m, seed, 'metal', at(['slide', 'weigh']))).toEqual({ cg: pieces + setup.wetWaterCg, holds: 'wet-pieces' })
    expect(cylinderOf(m, seed, 'metal', at([]))).toEqual({ tenthMl: setup.waterTenthMl, holds: 'water', pieces: false })
    expect(cylinderOf(m, seed, 'metal', at(['weigh', 'slide']))).toEqual({ tenthMl: setup.waterTenthMl + setup.piecesTenthMl, holds: 'water', pieces: true })
    expect(cylinderOf(m, seed, 'metal', at(['drop']))).toEqual({ tenthMl: setup.waterTenthMl + setup.piecesTenthMl - setup.splashTenthMl, holds: 'water', pieces: true })
    expect(cylinderOf(m, seed, 'metal', at(['slide', 'weigh']))).toEqual({ tenthMl: setup.waterTenthMl - Math.round(setup.wetWaterCg / 10), holds: 'water', pieces: false })
    expect(cylinderOf(m, seed, 'liquid', at([]))).toBeNull()
    expect(cylinderOf(m, seed, 'liquid', at(['weigh', 'pour']))).toEqual({ tenthMl: setup.liquidTenthMl, holds: 'unknown-liquid', pieces: false })
    expect(balanceOf(m, seed, 'reading', at([]))).toEqual({ cg: setup.firstMassCg, holds: 'object' })
  })

  it('judges no run before its notebook is checked', () => {
    const state = takeReadings(m, createLab(1, 'challenge'), 'liquid')
    expect(judge(m, 1, 'liquid', currentRun(state, 'liquid'))).toBeNull()
  })
})
