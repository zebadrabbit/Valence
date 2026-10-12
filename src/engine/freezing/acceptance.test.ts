import { describe, expect, it } from 'vitest'
import { freezingData } from '@/chem-data/freezing/data'
import { PART_IDS, type PartId } from '@/chem-data/freezing/data'
import { mulberry32 } from '../rng'
import { can, reduce, warnings, type Action } from './actions'
import { formatSig3, sizeOf, type Sig3 } from './entries'
import { modelFrom } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { doneParts, partView, runOutcome, runOutcomes } from './select'
import { labSetup } from './setup'
import { createLab, currentRun, freezingStateSchema, statesOf, type FreezingState } from './state'
import { entryActions, looks, run, sig, typed, valueOf, wholeLab, wholeRun, workCup, worksheetText, type Arithmetic, type Technique } from './testkit'
import { FIELDS, kindOf, type Field, type Value } from './worksheet'

// What the lab is accepted on (spec 23.6), each line with the seeds 1 to 100 where it says so. Every learner here
// is scripted through the reducer, works from the views alone, and types each entry as text.
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const SALTS = m.solutes.filter((s) => s.idealParticles > 1).map((s) => s.id)
const reload = (state: FreezingState): FreezingState => freezingStateSchema(m).parse(JSON.parse(JSON.stringify(state)))
const range = (values: number[]) => [Number(Math.min(...values).toFixed(2)), Number(Math.max(...values).toFixed(2))]
const outcome = (state: FreezingState, part: PartId) => runOutcome(m, state, part, currentRun(state, part))
const reasons = (state: FreezingState, part: PartId) => {
  const o = outcome(state, part)
  return o.state === 'does-not-count' ? o.reasons : o.state
}
const liquidOf = (seed: number) => m.liquids[labSetup(m, seed).liquidIndex]!

describe('the model the lab runs on', () => {
  it('is the pinned model: the stored record gives the numbers every expected value here is worked from', () => {
    expect(modelFrom(freezingData)).toEqual(m)
  })
})

describe('a careful run (spec 23.6, first item)', () => {
  it('of part 1 counts at every seed in both modes, and the part then says what this probe reads in ice and water', () => {
    for (const seed of SEEDS) {
      for (const mode of ['guided', 'challenge'] as const) {
        const done = wholeRun(m, createLab(seed, mode), 'water')
        expect(outcome(done, 'water'), `${seed} ${mode}`).toEqual({ state: 'counts', percentOff: null })
        expect(partView(m, done, 'water').expected, `${seed}`).toEqual({ kind: 'probe', hundredths: labSetup(m, seed).probeHundredths })
        expect(currentRun(done, 'water').entries.water).toBe(labSetup(m, seed).probeHundredths)
      }
    }
  })

  it('of part 2 counts at every seed, in both modes and by both chains: the molar mass is within 1.5% of the stored one and the liquid named is the one it was', () => {
    const offs: Record<string, number[]> = {}
    for (const seed of SEEDS) {
      for (const mode of ['guided', 'challenge'] as const) {
        for (const chain of ['rounded', 'unrounded'] as const) {
          const done = wholeRun(m, createLab(seed, mode), 'unknown', { chain })
          const o = outcome(done, 'unknown')
          expect(o.state, `${seed} ${mode} ${chain}`).toBe('counts')
          expect(currentRun(done, 'unknown').entries.liquid, `${seed}`).toBe(liquidOf(seed).id)
          expect(partView(m, done, 'unknown').expected, `${seed}`).toEqual({ kind: 'liquid', liquidId: liquidOf(seed).id, molarMass: liquidOf(seed).molarMassE2 / 100 })
          ;(offs[liquidOf(seed).id] ??= []).push((o as { percentOff: number }).percentOff)
        }
      }
    }
    for (const by of Object.values(offs).flat()) expect(Math.abs(by)).toBeLessThanOrEqual(m.molarMassTolerancePerMille / 10)
    // How near a careful learner comes, in percent of the stored molar mass, for each liquid over the hundred seeds.
    expect(Object.fromEntries(Object.entries(offs).map(([id, by]) => [id, range(by)]))).toEqual(NEAR.unknown)
    // Half of what parts acetone from 2-propanol is 1.74%: no careful result is a third of the way there.
    expect(Math.max(...Object.values(offs).flat().map(Math.abs))).toBeLessThan(0.58)
  }, 120_000)

  it('of part 3 counts at every seed with urea and with each of the three salts: urea is close to one, and each salt close to its stored figure', () => {
    const offs: Record<string, number[]> = {}
    for (const seed of SEEDS) {
      for (const solute of m.solutes) {
        for (const chain of ['rounded', 'unrounded'] as const) {
          const done = wholeRun(m, createLab(seed, seed % 2 ? 'guided' : 'challenge'), 'particles', { solute: solute.id, chain })
          const o = outcome(done, 'particles')
          expect(o.state, `${seed} ${solute.id} ${chain}`).toBe('counts')
          expect(partView(m, done, 'particles').expected, `${seed}`).toEqual({ kind: 'particles', counted: [{ soluteId: solute.id, particles: solute.particlesE2 / 100 }] })
          ;(offs[solute.id] ??= []).push((o as { percentOff: number }).percentOff)
        }
      }
    }
    for (const by of Object.values(offs).flat()) expect(Math.abs(by)).toBeLessThanOrEqual(m.particlesTolerancePerMille / 10)
    expect(Object.fromEntries(Object.entries(offs).map(([id, by]) => [id, range(by)]))).toEqual(NEAR.particles)
  }, 120_000)

  it('levels within a few presses of Run on: nine at the most for a whole cup, at every seed, with ice left when it is strained', () => {
    for (const seed of SEEDS) {
      for (const part of ['unknown', 'particles'] as const) {
        const cup = workCup(m, createLab(seed, 'challenge'), part)
        const { steps } = currentRun(cup, part)
        expect(steps / m.runOnSteps, `${seed} ${part}`).toBeLessThanOrEqual(9)
        expect(partView(m, cup, part).cup.ice, `${seed}`).toBe('plenty')
      }
    }
  })

  it('completes the lab when all three parts count, part 3 with urea and with one salt of the learner\'s choosing', () => {
    for (const seed of [1, 2, 3, 57]) {
      for (const salt of SALTS) {
        const done = wholeLab(m, createLab(seed, 'guided'), salt)
        expect(done.status, `${seed} ${salt}`).toBe('completed')
        expect(doneParts(m, done)).toEqual([...PART_IDS])
        expect(partView(m, done, 'particles').wanted).toEqual({ molecule: false, salt: false })
      }
    }
    // Urea alone, or a salt alone, does not finish part 3.
    const urea = wholeRun(m, createLab(1, 'guided'), 'particles')
    expect(partView(m, urea, 'particles')).toMatchObject({ done: false, wanted: { molecule: false, salt: true } })
    const salt = wholeRun(m, createLab(1, 'guided'), 'particles', { solute: 'kcl' })
    expect(partView(m, salt, 'particles')).toMatchObject({ done: false, wanted: { molecule: true, salt: false } })
  })

  it('leaves the other two salts there to try, before the lab is complete and after it', () => {
    let state = wholeLab(m, createLab(4, 'guided'), 'nacl')
    expect(state.status).toBe('completed')
    for (const salt of ['kcl', 'nabr']) {
      state = run(m, state, [{ type: 'runAgain', part: 'particles' }])
      state = wholeRun(m, state, 'particles', { solute: salt })
      expect(outcome(state, 'particles').state, salt).toBe('counts')
      expect(state.status).toBe('completed')
    }
    expect((partView(m, state, 'particles').expected as { counted: unknown[] }).counted).toHaveLength(4)
    // The other two parts are read and not worked once the lab is complete.
    expect(can(m, state, { type: 'runAgain', part: 'unknown' })).toBe('lab-completed')
    expect(can(m, state, { type: 'runAgain', part: 'water' })).toBe('lab-completed')
  })
})

describe('a careful cup whose every entry is taken (as the calorimetry lab\'s, spec 16.6)', () => {
  // The two sizes of three figures next to a size, with the size itself: every value a rounding could give.
  const near = (size: Sig3): Sig3[] => {
    const step = (by: number): Sig3 => {
      const mantissa = size.mantissa + by
      return mantissa === 1000 ? { mantissa: 100, exponent: size.exponent + 1 } : mantissa === 99 ? { mantissa: 999, exponent: size.exponent - 1 } : { ...size, mantissa }
    }
    return [step(-1), size, step(1)]
  }

  it.each(['unknown', 'particles'] as const)('of %s counts at every seed from 1 to 100, whichever way the rounding rule lets each entry be worked: no such run fails on the tolerance alone', (part) => {
    const offs: number[] = []
    let chains = 0
    for (const seed of SEEDS) {
      let ready = workCup(m, createLab(seed, 'guided'), part, { solute: m.solutes[seed % m.solutes.length]!.id })
      ready = run(m, ready, looks(m, ready, part))
      const careful = worksheetText(m, ready, part)
      // The two temperatures are the logger's own: Guided takes nothing a hundredth off.
      const first = entryActions(part, careful)
      for (const by of [-1, 1]) expect(can(m, ready, { type: 'enter', part, field: 'water', value: (typed('water', careful.water) as number) + by }), `${seed}`).toBe('not-the-logger')
      ready = run(m, ready, first.slice(0, 4))
      const walk = (state: FreezingState, fields: readonly Field[]): void => {
        const [field, ...rest] = fields
        if (field === undefined) {
          const o = runOutcome(m, state, part, currentRun(state, part))
          expect(o.state, `${part} ${seed} ${JSON.stringify(currentRun(state, part).entries)}`).toBe('counts')
          chains++
          return void offs.push((o as { percentOff: number }).percentOff)
        }
        const candidates: Value[] = kindOf(field) === 'choice' ? m.liquids.map((c) => c.id) : near(typed(field, careful[field]) as Sig3)
        for (const value of candidates) {
          const action: Action = { type: 'enter', part, field, value }
          if (can(m, state, action) === null) walk(reduce(m, state, action), rest)
        }
      }
      walk(ready, FIELDS[part].slice(4))
    }
    expect(chains).toBeGreaterThan(SEEDS.length)
    const tolerance = (part === 'unknown' ? m.molarMassTolerancePerMille : m.particlesTolerancePerMille) / 10
    for (const by of offs) expect(Math.abs(by)).toBeLessThanOrEqual(tolerance)
    expect(range(offs)).toEqual(WORST[part])
  }, 240_000)
})

describe('each error of technique alone (spec 23.6, second item)', () => {
  const guidedAsks = (state: FreezingState, action: Action) => warnings(m, { ...state, mode: 'guided' }, action)

  it('reading before the temperature has levelled off: a cup strained a press after the solute does not count at any seed, its cause is named, and Guided warns first', () => {
    const offs: number[] = []
    for (const seed of SEEDS) {
      for (const part of ['unknown', 'particles'] as const) {
        const soon = wholeRun(m, createLab(seed, 'challenge'), part, { after: 1 })
        expect(reasons(soon, part), `${seed} ${part}`).toContain('solution-not-level')
        expect(reasons(soon, part)).not.toContain('water-not-level')
        expect(reasons(soon, part)).not.toContain('ice-melted')
        expect(outcome(soon, part).state).toBe('does-not-count')
        // The warning is raised at the strainer, before the error is made.
        let cup = createLab(seed, 'guided')
        cup = run(m, cup, [{ type: 'fill', part }, { type: 'putLidOn', part }, { type: 'stir', part }, { type: 'startLogger', part }, ...Array.from({ length: 5 }, (): Action => ({ type: 'runOn', part }))])
        if (part === 'particles') cup = run(m, cup, [{ type: 'chooseSolute', part, solute: 'urea' }])
        expect(warnings(m, cup, { type: 'addSolute', part }), `${seed}`).toEqual([])
        cup = run(m, cup, [{ type: 'addSolute', part }, { type: 'runOn', part }])
        expect(warnings(m, cup, { type: 'strain', part }), `${seed}`).toEqual(['not-level'])
        cup = run(m, cup, Array.from({ length: 4 }, (): Action => ({ type: 'runOn', part })))
        expect(warnings(m, cup, { type: 'strain', part }), `${seed}`).toEqual([])
      }
      // How far out the molar mass is when the reading was taken a press after the solute.
      const early = wholeRun(m, createLab(seed, 'challenge'), 'unknown', { after: 1 })
      offs.push(((valueOf(currentRun(early, 'unknown').entries.molarMass!) - liquidOf(seed).molarMassE2 / 100) / (liquidOf(seed).molarMassE2 / 100)) * 100)
    }
    expect(range(offs)).toEqual(ERRORS.soon)
  }, 120_000)

  it('the same before the solute, and in part 1: a solute added, or a reading entered, a press after the logger is started is named as the water not level', () => {
    for (const seed of SEEDS) {
      expect(reasons(wholeRun(m, createLab(seed, 'challenge'), 'unknown', { before: 1 }), 'unknown'), `${seed}`).toContain('water-not-level')
      expect(reasons(wholeRun(m, createLab(seed, 'challenge'), 'water', { before: 1 }), 'water'), `${seed}`).toEqual(['water-not-level', 'outside-tolerance'])
      let cup = workCup(m, createLab(seed, 'guided'), 'water', { before: 1 })
      cup = run(m, cup, looks(m, cup, 'water'))
      const entry = entryActions('water', worksheetText(m, cup, 'water'))[0]!
      // Guided takes the reading, since it is the logger's own, and warns of it first.
      expect(can(m, cup, entry), `${seed}`).toBeNull()
      expect(warnings(m, cup, entry), `${seed}`).toEqual(['not-level'])
      expect(guidedAsks(run(m, createLab(seed, 'guided'), [{ type: 'fill', part: 'unknown' }, { type: 'putLidOn', part: 'unknown' }, { type: 'stir', part: 'unknown' }, { type: 'startLogger', part: 'unknown' }, { type: 'runOn', part: 'unknown' }]), { type: 'addSolute', part: 'unknown' })).toEqual(['not-level'])
    }
  })

  it('a cup that is not stirred never levels: it is named at every seed however long the learner waits, and Guided warns when the logger is started', () => {
    for (const seed of SEEDS) {
      const still = wholeRun(m, createLab(seed, 'challenge'), 'unknown', { stir: false, before: 12, after: 12 })
      expect(reasons(still, 'unknown'), `${seed}`).toEqual(expect.arrayContaining(['water-not-level', 'solution-not-level']))
      const empty = run(m, createLab(seed, 'guided'), [{ type: 'fill', part: 'unknown' }, { type: 'putLidOn', part: 'unknown' }])
      expect(warnings(m, empty, { type: 'startLogger', part: 'unknown' })).toEqual(['not-stirring'])
    }
  })

  it('letting all the ice melt: a cup left with its lid off for thirteen presses has no ice, the run does not count at any seed, its cause is named, and Guided warns first', () => {
    for (const seed of SEEDS) {
      for (const part of ['unknown', 'particles'] as const) {
        const melted = wholeRun(m, createLab(seed, 'challenge'), part, { lid: false, before: 4, after: 9 })
        expect(partView(m, melted, part).cup.ice, `${seed}`).toBe('none')
        expect(reasons(melted, part), `${seed} ${part}`).toContain('ice-melted')
        expect(reasons(melted, part)).not.toContain('solution-not-level')
        expect(reasons(melted, part)).not.toContain('water-not-level')
      }
      // Guided: the lid when the logger is started, then that little ice is left, then that none is.
      let cup = run(m, createLab(seed, 'guided'), [{ type: 'fill', part: 'unknown' }, { type: 'stir', part: 'unknown' }])
      expect(warnings(m, cup, { type: 'startLogger', part: 'unknown' }), `${seed}`).toEqual(['lid-off'])
      cup = run(m, cup, [{ type: 'startLogger', part: 'unknown' }, ...Array.from({ length: 4 }, (): Action => ({ type: 'runOn', part: 'unknown' })), { type: 'addSolute', part: 'unknown' }])
      const asked: string[] = []
      while (partView(m, cup, 'unknown').cup.ice !== 'none') {
        asked.push(...warnings(m, cup, { type: 'runOn', part: 'unknown' }))
        cup = run(m, cup, [{ type: 'runOn', part: 'unknown' }])
      }
      expect(asked, `${seed}`).toEqual(['little-ice'])
      expect(warnings(m, cup, { type: 'strain', part: 'unknown' }), `${seed}`).toEqual(['no-ice'])
      expect(warnings(m, cup, { type: 'runOn', part: 'unknown' }), `${seed}`).toEqual([])
    }
  }, 120_000)

  it('warns that little ice is left once in a run: at the first press of Run on made with little left, again if that press is not made, and at no press after it while a little is left', () => {
    let told = 0
    for (const seed of SEEDS) {
      // The lid left off until the ice is little, then put on: the ice then goes slowly, and a little is left for many presses.
      let cup = run(m, createLab(seed, 'guided'), [{ type: 'fill', part: 'water' }, { type: 'stir', part: 'water' }, { type: 'startLogger', part: 'water' }])
      while (partView(m, cup, 'water').cup.ice === 'plenty') {
        expect(warnings(m, cup, { type: 'runOn', part: 'water' }), `${seed}`).toEqual([])
        cup = run(m, cup, [{ type: 'runOn', part: 'water' }])
      }
      expect(partView(m, cup, 'water').cup.ice, `${seed}`).toBe('little')
      expect(warnings(m, cup, { type: 'runOn', part: 'water' }), `${seed}`).toEqual(['little-ice'])
      // Nothing is stored of a warning: until the press is made it is asked about again, whatever else is done.
      cup = run(m, cup, [{ type: 'putLidOn', part: 'water' }])
      expect(warnings(m, cup, { type: 'runOn', part: 'water' }), `${seed}`).toEqual(['little-ice'])
      for (let press = 0; press < 5; press++) {
        cup = run(m, cup, [{ type: 'runOn', part: 'water' }])
        expect(partView(m, cup, 'water').cup.ice, `${seed}`).toBe('little')
        expect(warnings(m, cup, { type: 'runOn', part: 'water' }), `${seed} press ${press}`).toEqual([])
        told++
      }
      // Challenge is not told at all.
      expect(warnings(m, { ...cup, mode: 'challenge' }, { type: 'runOn', part: 'water' })).toEqual([])
    }
    expect(told).toBe(SEEDS.length * 5)
  })

  it('with the lid off the solution never levels, so a run strained while ice is left is named for that: the lid is how both errors come about', () => {
    for (const seed of SEEDS) {
      const open = wholeRun(m, createLab(seed, 'challenge'), 'unknown', { lid: false, before: 3, after: 2 })
      expect(partView(m, open, 'unknown').cup.ice, `${seed}`).not.toBe('none')
      expect(reasons(open, 'unknown'), `${seed}`).toContain('solution-not-level')
      expect(reasons(open, 'unknown')).not.toContain('ice-melted')
      // Part 1 has no solution to thin: its ice and water level with the lid off, and the run counts if it is read in time.
      expect(reasons(wholeRun(m, createLab(seed, 'challenge'), 'water', { lid: false, before: 4 }), 'water'), `${seed}`).toBe('counts')
    }
  })

  it('weighing the solution without straining out the ice: the run does not count at any seed, its cause is named, the result is far outside the tolerance, and Guided warns first', () => {
    const offs: Record<string, number[]> = { unknown: [], particles: [] }
    for (const seed of SEEDS) {
      for (const part of ['unknown', 'particles'] as const) {
        const iced = wholeRun(m, createLab(seed, 'challenge'), part, { strain: false })
        expect(reasons(iced, part), `${seed} ${part}`).toEqual(['not-strained', 'outside-tolerance'])
        const entries = currentRun(iced, part).entries
        const held = part === 'unknown' ? liquidOf(seed).molarMassE2 / 100 : m.solutes[0]!.particlesE2 / 100
        offs[part]!.push(((valueOf(part === 'unknown' ? entries.molarMass! : entries.ratio!) - held) / held) * 100)
        const cup = workCup(m, createLab(seed, 'guided'), part, { after: 4, strain: true })
        expect(can(m, cup, { type: 'weigh', part })).toBe('cup-weighed')
      }
      let cup = createLab(seed, 'guided')
      cup = run(m, cup, [{ type: 'fill', part: 'unknown' }, { type: 'putLidOn', part: 'unknown' }, { type: 'stir', part: 'unknown' }, { type: 'startLogger', part: 'unknown' }, ...Array.from({ length: 5 }, (): Action => ({ type: 'runOn', part: 'unknown' })), { type: 'addSolute', part: 'unknown' }, ...Array.from({ length: 5 }, (): Action => ({ type: 'runOn', part: 'unknown' }))])
      expect(warnings(m, cup, { type: 'weigh', part: 'unknown' }), `${seed}`).toEqual(['not-strained'])
      expect(warnings(m, run(m, cup, [{ type: 'strain', part: 'unknown' }]), { type: 'weigh', part: 'unknown' }), `${seed}`).toEqual([])
    }
    // The ice counted as water: the molar mass comes out low and the count of particles high, by a seventh and more.
    expect(range(offs.unknown!)).toEqual(ERRORS.icedUnknown)
    expect(range(offs.particles!)).toEqual(ERRORS.icedParticles)
  }, 120_000)

  it('is not warned of in Challenge, and a careful cup raises no warning in Guided', () => {
    for (const seed of [1, 2, 3]) {
      const lazy = run(m, createLab(seed, 'challenge'), [{ type: 'fill', part: 'unknown' }])
      expect(warnings(m, lazy, { type: 'startLogger', part: 'unknown' })).toEqual([])
      const asked: string[] = []
      let state = createLab(seed, 'guided')
      const script: Action[] = [{ type: 'fill', part: 'unknown' }, { type: 'putLidOn', part: 'unknown' }, { type: 'stir', part: 'unknown' }, { type: 'startLogger', part: 'unknown' }, ...Array.from({ length: 5 }, (): Action => ({ type: 'runOn', part: 'unknown' })), { type: 'addSolute', part: 'unknown' }, ...Array.from({ length: 5 }, (): Action => ({ type: 'runOn', part: 'unknown' })), { type: 'strain', part: 'unknown' }, { type: 'weigh', part: 'unknown' }]
      for (const action of script) {
        asked.push(...warnings(m, state, action))
        state = run(m, state, [action])
      }
      expect(asked, `${seed}`).toEqual([])
    }
  })
})

describe('an entry that does not follow (spec 23.6, third item)', () => {
  const slipped = (seed: number, part: PartId, how: Arithmetic & Technique) => {
    let state = workCup(m, createLab(seed, 'challenge'), part, how)
    state = run(m, state, looks(m, state, part))
    if (how.slip === 'wrong-point') state = run(m, state, [{ type: 'look', part, step: partView(m, state, part).graph.addedAt! + 1 }])
    const actions = entryActions(part, worksheetText(m, state, part, how))
    const marked = run(m, state, [...actions, { type: 'check', part }])
    // Guided refuses the same entry where it is made.
    let refusal: string | null = null
    let walked: FreezingState = { ...state, mode: 'guided' }
    for (const action of actions) {
      refusal = can(m, walked, action)
      if (refusal !== null) break
      walked = reduce(m, walked, action)
    }
    return { reasons: reasons(marked, part), verdicts: partView(m, marked, part).worksheet, refusal }
  }

  it('is marked in Challenge and refused in Guided when a reading that is not the level one is taken, at every seed', () => {
    for (const seed of SEEDS) {
      const { reasons: why, refusal } = slipped(seed, 'unknown', { slip: 'wrong-point' })
      expect(why, `${seed}`).toEqual(['solution-not-shown'])
      expect(refusal, `${seed}`).toBe('not-the-logger')
    }
  })

  it('is marked and refused when the solute is left in the mass of water, when the last relation is worked the wrong way up, and when another liquid is named, each named as what it is', () => {
    for (const seed of SEEDS) {
      for (const part of ['unknown', 'particles'] as const) {
        const left = slipped(seed, part, { slip: 'solute-not-taken-off' })
        expect(left.reasons, `${seed}`).toEqual(['entries-do-not-follow'])
        expect(left.refusal, `${seed}`).toBe('solute-not-taken-off')
        expect(left.verdicts.find((entry) => entry.field === 'waterKg')!.verdict).toEqual({ follows: false, slip: 'solute-not-taken-off' })
        // Urea's ratio is so near 1 that it reads the same either way up; a salt's does not.
        const up = slipped(seed, part, { slip: 'upside-down', solute: 'nacl' })
        expect(up.reasons, `${seed} ${part}`).toEqual(['entries-do-not-follow'])
        expect(up.refusal, `${seed} ${part}`).toBe('upside-down')
      }
      const named = slipped(seed, 'unknown', { slip: 'wrong-name' })
      expect(named.reasons, `${seed}`).toEqual(['entries-do-not-follow'])
      expect(named.refusal, `${seed}`).toBe('does-not-follow')
    }
  }, 120_000)

  it('is marked and refused when the result is cut off where it should be rounded, wherever cutting off and rounding differ', () => {
    let differ = 0
    for (const seed of SEEDS) {
      const careful = wholeRun(m, createLab(seed, 'challenge'), 'unknown')
      const cut = slipped(seed, 'unknown', { slip: 'cut-off' })
      if (cut.reasons === 'counts') continue
      differ++
      expect(cut.reasons, `${seed}`).toEqual(['entries-do-not-follow'])
      expect(cut.refusal, `${seed}`).toBe('cut-off')
      expect(outcome(careful, 'unknown').state).toBe('counts')
    }
    expect(differ).toBeGreaterThan(20)
  })

  it('marks nothing and refuses nothing of a careful notebook, in either chain', () => {
    for (const seed of SEEDS) for (const chain of ['rounded', 'unrounded'] as const) expect(slipped(seed, seed % 2 ? 'unknown' : 'particles', { chain })).toMatchObject({ reasons: 'counts', refusal: null })
  })

  it('names the tolerance alone where a result is too far off and nothing else is amiss, which takes a tolerance tighter than the lab\'s own', () => {
    const tight = { ...m, molarMassTolerancePerMille: 0 }
    const off = SEEDS.map((seed) => wholeRun(tight, createLab(seed, 'challenge'), 'unknown')).map((state) => runOutcome(tight, state, 'unknown', currentRun(state, 'unknown')))
    expect(off.some((o) => o.state === 'does-not-count' && o.reasons.join() === 'outside-tolerance')).toBe(true)
    for (const o of off) if (o.state === 'does-not-count') expect(o.reasons).toEqual(['outside-tolerance'])
  })
})

describe('the same seed and the same actions (spec 23.6, fourth item)', () => {
  it('give the same run, reading for reading and outcome for outcome', () => {
    for (const seed of [1, 2, 57, 4294967295]) {
      for (const part of PART_IDS) {
        const [a, b] = [wholeRun(m, createLab(seed, 'challenge'), part), wholeRun(m, createLab(seed, 'challenge'), part)]
        expect(a).toEqual(b)
        expect(partView(m, a, part)).toEqual(partView(m, b, part))
      }
    }
  })

  it('give a run numbers that do not depend on what was done in the runs before it, or in the other parts', () => {
    const fresh = wholeRun(m, run(m, createLab(9, 'challenge'), [{ type: 'fill', part: 'unknown' }, { type: 'runAgain', part: 'unknown' }]), 'unknown')
    const later = wholeRun(m, run(m, wholeLab(m, createLab(9, 'challenge')), [{ type: 'runAgain', part: 'particles' }]), 'particles', { solute: 'kcl' })
    const afterSlip = wholeRun(m, run(m, wholeRun(m, createLab(9, 'challenge'), 'unknown', { strain: false }), [{ type: 'runAgain', part: 'unknown' }]), 'unknown')
    expect(partView(m, afterSlip, 'unknown').graph).toEqual(partView(m, fresh, 'unknown').graph)
    expect(partView(m, afterSlip, 'unknown').bench).toEqual(partView(m, fresh, 'unknown').bench)
    expect(later.status).toBe('completed')
  })

  it('give different seeds different numbers', () => {
    const benches = new Set(SEEDS.map((seed) => JSON.stringify([partView(m, workCup(m, createLab(seed, 'challenge'), 'unknown'), 'unknown').bench, labSetup(m, seed)])))
    expect(benches.size).toBe(SEEDS.length)
  })
})

describe('the stored record', () => {
  it('round-trips: a lab reloaded from storage after every action ends where one never reloaded does', () => {
    for (const seed of [1, 2, 57]) {
      for (const mode of ['guided', 'challenge'] as const) {
        const plain = wholeLab(m, createLab(seed, mode))
        const reloaded = wholeLab(m, createLab(seed, mode), undefined, reload)
        expect(reloaded).toEqual(plain)
        expect(reloaded.status).toBe('completed')
      }
    }
  })

  it('holds what the learner did and typed, and nothing that is worked out: no reading, no mass, no verdict, no liquid but the one chosen', () => {
    const done = wholeLab(m, createLab(3, 'challenge'))
    expect(Object.keys(done).sort()).toEqual(['mode', 'parts', 'seed', 'status'])
    for (const part of PART_IDS) for (const stored of done.parts[part]) expect(Object.keys(stored).sort()).toEqual(['addedAt', 'closed', 'entries', 'filled', 'index', 'lidFrom', 'logger', 'looked', 'solute', 'steps', 'stirFrom', 'strainedAt', 'weighedAt'])
    expect(JSON.stringify(done.parts.water)).not.toContain('acetone')
  })
})

describe('no state a learner can reach leaves them unable to go on', () => {
  const every = (state: FreezingState, part: PartId): Action[] => {
    const view = partView(m, state, part)
    const text = view.cup.weighed || part === 'water' ? worksheetTextOrNull(state, part) : null
    const open = view.worksheet.find((entry) => entry.value === null)
    return [
      { type: 'fill', part }, { type: 'putLidOn', part }, { type: 'stir', part }, { type: 'startLogger', part }, { type: 'addSolute', part }, { type: 'runOn', part }, { type: 'strain', part }, { type: 'weigh', part }, { type: 'check', part }, { type: 'runAgain', part },
      ...m.solutes.map((solute): Action => ({ type: 'chooseSolute', part, solute: solute.id })),
      ...view.graph.readings.map((_, step): Action => ({ type: 'look', part, step })).slice(-3),
      ...(view.graph.addedAt === null ? [] : [{ type: 'look', part, step: view.graph.addedAt } as Action]),
      ...(text !== null && open !== undefined && text[open.field] !== '' ? [{ type: 'enter', part, field: open.field, value: typed(open.field, text[open.field]) } as Action] : []),
    ]
  }
  const worksheetTextOrNull = (state: FreezingState, part: PartId) => {
    const { graph } = partView(m, state, part)
    if (graph.readings.length === 0 || (part !== 'water' && graph.endedAt === null)) return null
    return worksheetText(m, state, part)
  }

  it('from four hundred actions taken as they come, in either mode, the lab can still be completed', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const rng = mulberry32(seed * 7919)
      let state = createLab(seed, seed % 2 ? 'guided' : 'challenge')
      for (let i = 0; i < 400; i++) {
        const part = PART_IDS[Math.floor(rng() * 3)]!
        const doable = every(state, part).filter((action) => can(m, state, action) === null)
        if (doable.length === 0) continue
        state = reload(reduce(m, state, doable[Math.floor(rng() * doable.length)]!))
      }
      // Whatever was left behind, each part can be run again or is done, and a careful learner finishes from here.
      for (const part of PART_IDS) {
        if (partView(m, state, part).done && part !== 'particles') continue
        if (can(m, state, { type: 'runAgain', part }) === null) state = run(m, state, [{ type: 'runAgain', part }])
        if (part !== 'particles') state = wholeRun(m, state, part)
        else {
          const wanted = partView(m, state, 'particles').wanted!
          if (wanted.molecule) state = wholeRun(m, state, 'particles')
          if (wanted.molecule && wanted.salt) state = run(m, state, [{ type: 'runAgain', part }])
          if (wanted.salt) state = wholeRun(m, state, 'particles', { solute: 'nabr' })
        }
      }
      expect(state.status, `${seed}`).toBe('completed')
    }
  }, 120_000)

  it('offers a way on from every point of a run: Run again once the cup is filled, and before that the cup itself', () => {
    for (const part of PART_IDS) {
      let state = createLab(11, 'challenge')
      expect(can(m, state, { type: 'fill', part })).toBeNull()
      const script: Action[] = [{ type: 'fill', part }, { type: 'startLogger', part }, ...Array.from({ length: 30 }, (): Action => ({ type: 'runOn', part }))]
      for (const action of script) {
        state = run(m, state, [action])
        expect(can(m, state, { type: 'runAgain', part }), action.type).toBeNull()
      }
      // A logger run to its end with nothing dissolved: Run on is over, and the part is run again.
      expect(can(m, state, { type: 'runOn', part })).toBe('logger-full')
      expect(run(m, state, [{ type: 'runAgain', part }]).parts[part]).toHaveLength(2)
    }
  })

  it('does not let a cup be strained or weighed with no reading of the solution, which would leave a notebook that cannot be filled', () => {
    let state = run(m, createLab(1, 'challenge'), [{ type: 'fill', part: 'unknown' }, { type: 'startLogger', part: 'unknown' }, { type: 'addSolute', part: 'unknown' }])
    expect(can(m, state, { type: 'strain', part: 'unknown' })).toBe('no-reading-since')
    expect(can(m, state, { type: 'weigh', part: 'unknown' })).toBe('no-reading-since')
    state = run(m, state, [{ type: 'runOn', part: 'unknown' }, { type: 'strain', part: 'unknown' }, { type: 'weigh', part: 'unknown' }])
    expect(partView(m, state, 'unknown').worksheet[0]!.blocked).toBe('not-looked')
  })
})

describe('nothing of what is expected is shown before a run counts (spec 23.6, fifth item)', () => {
  const surface = (state: FreezingState, part: PartId) => JSON.stringify([partView(m, state, part), runOutcomes(m, state, part), doneParts(m, state)])

  it('in Challenge, at every action of a careful run up to the check, the surface holds no stored figure, no verdict, nothing of which liquid it is, and no reading the logger has not taken', () => {
    for (const seed of SEEDS) {
      for (const part of PART_IDS) {
        const liquid = liquidOf(seed).id
        const seen: FreezingState[] = []
        let state = workCup(m, createLab(seed, 'challenge'), part, {}, (s) => (seen.push(s), s))
        state = run(m, state, looks(m, state, part), (s) => (seen.push(s), s))
        const entries = entryActions(part, worksheetText(m, state, part))
        // Up to the entry that names the liquid, which is the learner's own word.
        run(m, state, part === 'unknown' ? entries.slice(0, -1) : entries, (s) => (seen.push(s), s))
        for (const at of seen) {
          const view = partView(m, at, part)
          expect(view.expected, `${seed} ${part}`).toBeNull()
          expect(view.outcome).toEqual({ state: 'open' })
          expect(view.worksheet.every((entry) => entry.verdict === null)).toBe(true)
          expect(view.graph.readings.length).toBe(currentRun(at, part).logger ? currentRun(at, part).steps + 1 : 0)
          expect(surface(at, part), `${seed} ${part}`).not.toContain(liquid)
          expect(surface(at, part)).not.toMatch(/level|micro|iceMg|waterMg|probe/)
          for (const action of [{ type: 'strain', part }, { type: 'addSolute', part }, { type: 'runOn', part }, { type: 'weigh', part }] as Action[]) expect(warnings(m, at, action)).toEqual([])
        }
      }
    }
  }, 240_000)

  it('shows the same bench whichever of the three liquids the seed makes the unknown: a mass from one range, and no more', () => {
    const masses: Record<string, number[]> = {}
    for (const seed of SEEDS) {
      const view = partView(m, createLab(seed, 'challenge'), 'unknown')
      expect(Object.keys(view.bench).sort()).toEqual(['solute', 'soluteCg', 'solutionCg'])
      expect(view.bench).toMatchObject({ solute: null, solutionCg: null })
      ;(masses[liquidOf(seed).id] ??= []).push(view.bench.soluteCg!)
    }
    for (const [liquid, cg] of Object.entries(masses)) {
      expect(Math.min(...cg), liquid).toBeGreaterThanOrEqual(m.unknownRangeCg[0])
      expect(Math.max(...cg), liquid).toBeLessThanOrEqual(m.unknownRangeCg[1])
      expect(Math.max(...cg) - Math.min(...cg), liquid).toBeGreaterThan(70)
    }
  })

  it('hands nothing over for a run that does not count, in either mode: no stored figure, no liquid, and no figure for how far off the result was', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const mode of ['guided', 'challenge'] as const) {
        const failed = wholeRun(m, createLab(seed, 'challenge'), 'unknown', { strain: false })
        const view = partView(m, { ...failed, mode }, 'unknown')
        expect(view.expected).toBeNull()
        expect(view.outcome).toMatchObject({ state: 'does-not-count', percentOff: null })
        expect(view.done).toBe(false)
      }
    }
  })

  it('says how far off an earlier run was only once a run of the part counts, and in part 3 only for a solute a run has counted with', () => {
    let state = wholeRun(m, createLab(6, 'challenge'), 'unknown', { strain: false })
    expect(runOutcomes(m, state, 'unknown')[0]).toMatchObject({ state: 'does-not-count', percentOff: null })
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'unknown' }]), 'unknown')
    const [first, second] = runOutcomes(m, state, 'unknown')
    expect(second!.state).toBe('counts')
    expect((first as { percentOff: number }).percentOff).toBeLessThan(-10)
    let salts = wholeRun(m, createLab(6, 'challenge'), 'particles', { solute: 'kcl', strain: false })
    salts = wholeRun(m, run(m, salts, [{ type: 'runAgain', part: 'particles' }]), 'particles', { solute: 'nacl' })
    expect(runOutcomes(m, salts, 'particles')[0]).toMatchObject({ state: 'does-not-count', percentOff: null })
    expect(partView(m, salts, 'particles').expected).toEqual({ kind: 'particles', counted: [{ soluteId: 'nacl', particles: 1.82 }] })
  })

  it('keeps the cup\'s hidden state out of every view: a view holds no word of whether the cup has levelled', () => {
    const state = workCup(m, createLab(1, 'guided'), 'unknown')
    expect(statesOf(m, 1, 'unknown', currentRun(state, 'unknown')).at(-1)!.level).toBe(true)
    expect(Object.keys(partView(m, state, 'unknown').cup).sort()).toEqual(['filled', 'ice', 'lidOn', 'loggerStarted', 'soluteAdded', 'stirring', 'strained', 'weighed', 'worksheetBegun'])
    expect(Object.keys(partView(m, state, 'unknown').graph).sort()).toEqual(['addedAt', 'endedAt', 'full', 'looked', 'readings'])
  })
})

describe('the scripted learner', () => {
  it('types every number as text that reads back as the number it meant, and can type nothing the page could not', () => {
    for (const x of [0.0611, 58.1, 1, 0.998, 1.905, 46.07, 0.1, 99.95]) expect(valueOf(typed('ratio', formatSig3(sig(x))) as Sig3)).toBeCloseTo(valueOf(sig(x)), 12)
    expect(sizeOf(typed('molarMass', '100') as Sig3)).toEqual(sizeOf({ mantissa: 100, exponent: 0 }))
    expect(() => typed('ratio', '1.9')).toThrow(/is not something the field "ratio" takes/)
    expect(() => typed('waterKg', '0.102')).toThrow()
    expect(() => typed('water', '0.1')).toThrow()
  })
})

// How near a careful learner comes over seeds 1 to 100, in percent of the stored figure: the least and the most.
const NEAR = {
  unknown: { acetone: [-0.31, 0.38], ethanol: [-0.37, 0.28], 'propan-2-ol': [-0.5, 0.5] },
  particles: { urea: [-0.6, 1], nacl: [-0.55, 0.55], kcl: [-0.5, 0.5], nabr: [-0.5, 0.5] },
}
// The same with every entry worked every way the rounding rule allows.
const WORST: Record<'unknown' | 'particles', number[]> = { unknown: [-0.5, 0.5], particles: [-0.6, 1] }
// What each error of technique does to the result, in percent of the stored figure, over seeds 1 to 100.
const ERRORS = { soon: [8.64, 9.82], icedUnknown: [-16.97, -14.04], icedParticles: [16, 20] }
