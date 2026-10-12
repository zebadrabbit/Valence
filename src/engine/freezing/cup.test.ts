import { describe, expect, it } from 'vitest'
import { cupStates, readingOf, solutionCg, targetMicro, type Dissolved, type Timeline } from './cup'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, runSetup } from './setup'

// The cup stepped through time (spec 23.3) and the draw that sets a run up. Everything here is whole numbers.
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const careful = (addedAt: number | null, steps: number): Timeline => ({ lidFrom: 0, stirFrom: 0, addedAt, steps })
const unknown = (seed: number): Dissolved => ({ ...m.liquids[labSetup(m, seed).liquidIndex]!, cg: runSetup(m, seed, 'unknown', 0).unknownCg })

describe('the draw', () => {
  it('gives every seed a liquid, a probe that is off by 0.05 to 0.25 °C either way, and amounts inside their ranges', () => {
    const liquids = new Set<number>()
    const signs = new Set<number>()
    for (const seed of SEEDS) {
      const lab = labSetup(m, seed)
      liquids.add(lab.liquidIndex)
      signs.add(Math.sign(lab.probeHundredths))
      expect(Math.abs(lab.probeHundredths), `${seed}`).toBeGreaterThanOrEqual(m.probeOffRangeHundredths[0])
      expect(Math.abs(lab.probeHundredths), `${seed}`).toBeLessThanOrEqual(m.probeOffRangeHundredths[1])
      for (const part of ['water', 'unknown', 'particles'] as const) {
        const run = runSetup(m, seed, part, 0)
        const within = (value: number, [low, high]: readonly [number, number]) => Number.isInteger(value) && value >= low && value <= high
        expect(within(run.startHundredths, m.startRangeHundredths) && within(run.waterCg, m.waterRangeCg) && within(run.unknownCg, m.unknownRangeCg), `${seed} ${part}`).toBe(true)
        for (const solute of m.solutes) expect(within(run.soluteCg[solute.id]!, m.soluteRangesCg[solute.id]!), `${seed} ${solute.id}`).toBe(true)
      }
    }
    expect([...liquids].sort()).toEqual([0, 1, 2])
    expect([...signs].sort()).toEqual([-1, 1])
  })

  it('is the same for the same seed, differs between runs of a part, and weighs out the unknown without regard to which liquid it is', () => {
    expect(runSetup(m, 7, 'unknown', 3)).toEqual(runSetup(m, 7, 'unknown', 3))
    expect(runSetup(m, 7, 'unknown', 0)).not.toEqual(runSetup(m, 7, 'unknown', 1))
    expect(labSetup(m, 4294967295)).toEqual(labSetup(m, 4294967295))
    // The masses of the same run index are one draw, whichever part asks, and the unknown's has one range.
    expect(runSetup(m, 7, 'water', 2).unknownCg).toBe(runSetup(m, 7, 'particles', 2).unknownCg)
    const byLiquid = [0, 1, 2].map((index) => SEEDS.filter((seed) => labSetup(m, seed).liquidIndex === index).map((seed) => runSetup(m, seed, 'unknown', 0).unknownCg))
    for (const masses of byLiquid) {
      expect(Math.min(...masses)).toBeLessThan(m.unknownRangeCg[0] + 15)
      expect(Math.max(...masses)).toBeGreaterThan(m.unknownRangeCg[1] - 15)
    }
  })
})

describe('ice and water in a stirred cup with its lid on', () => {
  it('fall to the freezing point of water and stay there: level within eight readings at every seed, and the probe then reads what it is off by', () => {
    for (const seed of SEEDS) {
      const states = cupStates(m, runSetup(m, seed, 'water', 0), null, careful(null, 20))
      expect(states[0]!.micro, `${seed}`).toBe(runSetup(m, seed, 'water', 0).startHundredths * 1e4)
      expect(states[0]!.level).toBe(false)
      expect(states.findIndex((state) => state.level), `${seed}`).toBeLessThanOrEqual(8)
      for (const state of states.slice(8)) expect(readingOf(state, labSetup(m, seed).probeHundredths), `${seed}`).toBe(labSetup(m, seed).probeHundredths)
    }
  })

  it('melt ice to chill the water, and then only by the slow leak: 60 mg in each step', () => {
    const run = runSetup(m, 1, 'water', 0)
    const states = cupStates(m, run, null, careful(null, 30))
    expect(states[0]!.iceMg).toBe(m.iceCg * 10)
    for (const [i, state] of states.entries()) expect(state.waterMg + state.iceMg, `${i}`).toBe(run.waterCg * 10 + m.iceCg * 10)
    expect(states[29]!.iceMg - states[30]!.iceMg).toBe(m.leakLidOnMg)
    // About a gram of ice for each 80 gram-degrees of cooling.
    const chilled = states[0]!.iceMg - states[10]!.iceMg - 10 * m.leakLidOnMg
    expect(chilled / ((run.waterCg * 10 * run.startHundredths) / 100 / m.meltGramDegreesPerGram)).toBeCloseTo(1, 1)
  })
})

describe('the solute', () => {
  it('lowers the temperature to the freezing point of the solution: the constant times the particles times the molality of the water there is then', () => {
    for (const seed of SEEDS) {
      const solute = unknown(seed)
      const states = cupStates(m, runSetup(m, seed, 'unknown', 0), solute, careful(8, 20))
      const end = states[20]!
      expect(end.level, `${seed}`).toBe(true)
      const kelvin = (m.kfE2 / 100) * (solute.particlesE2 / 100) * (solute.cg / solute.molarMassE2 / (end.waterMg / 1e6))
      expect(Math.abs(-targetMicro(m, solute, end.waterMg) / 1e6 - kelvin), `${seed}`).toBeLessThan(1e-6)
      expect(Math.abs(end.micro - targetMicro(m, solute, end.waterMg)), `${seed}`).toBeLessThanOrEqual(m.levelBandMicro)
    }
  })

  it('levels within eight readings of going in at every seed, and then creeps up by no more than 0.01 °C in ten readings as the ice melts', () => {
    for (const seed of SEEDS) {
      const states = cupStates(m, runSetup(m, seed, 'unknown', 0), unknown(seed), careful(8, 30))
      expect(states.findIndex((state, step) => step > 8 && state.level), `${seed}`).toBeLessThanOrEqual(16)
      const [at16, at26] = [readingOf(states[16]!, 0), readingOf(states[26]!, 0)]
      expect(at26 - at16, `${seed}`).toBeGreaterThanOrEqual(0)
      expect(at26 - at16, `${seed}`).toBeLessThanOrEqual(1)
      for (const state of states.slice(16)) expect(state.level, `${seed}`).toBe(true)
    }
  })

  it('gives twice the fall for two particles as for one, at the same molality', () => {
    const run = runSetup(m, 3, 'particles', 0)
    const one: Dissolved = { id: 'x', molarMassE2: 8000, particlesE2: 100, idealParticles: 1, cg: 400 }
    const fall = (solute: Dissolved) => -cupStates(m, run, solute, careful(8, 9))[9]!.micro
    expect(targetMicro(m, { ...one, particlesE2: 200 }, 100000)).toBe(2 * targetMicro(m, one, 100000))
    expect(fall({ ...one, particlesE2: 200 }) / fall(one)).toBeCloseTo(2, 1)
  })
})

describe('the lid and the stirrer', () => {
  it('with the stirrer still the cup never levels, and no two readings running are the same, to the logger\'s last', () => {
    for (const seed of SEEDS) {
      const states = cupStates(m, runSetup(m, seed, 'unknown', 0), unknown(seed), { lidFrom: 0, stirFrom: null, addedAt: 8, steps: m.maxSteps })
      expect(states.some((state) => state.level), `${seed}`).toBe(false)
      const readings = states.map((state) => readingOf(state, 0))
      expect(readings.some((reading, step) => step > 0 && reading === readings[step - 1]), `${seed}`).toBe(false)
    }
  })

  it('with the lid off the ice and water still level, the solution never does, and the ice is gone within eight readings of the solute', () => {
    for (const seed of SEEDS) {
      const states = cupStates(m, runSetup(m, seed, 'unknown', 0), unknown(seed), { lidFrom: null, stirFrom: 0, addedAt: 8, steps: m.maxSteps })
      expect(states[8]!.level, `${seed}`).toBe(true)
      expect(states.some((state, step) => step > 8 && state.level), `${seed}`).toBe(false)
      const gone = states.findIndex((state) => state.iceMg === 0)
      expect(gone, `${seed}`).toBeGreaterThan(8)
      expect(gone, `${seed}`).toBeLessThanOrEqual(16)
      // Once the ice is gone the temperature climbs toward the room at every reading.
      for (let step = gone + 1; step <= m.maxSteps; step++) expect(states[step]!.micro, `${seed} ${step}`).toBeGreaterThan(states[step - 1]!.micro)
    }
  })

  it('with the lid on the ice lasts to the logger\'s last reading at every seed, whatever is dissolved and whenever', () => {
    for (const seed of SEEDS) {
      for (const addedAt of [0, 8, 40]) expect(cupStates(m, runSetup(m, seed, 'unknown', 0), unknown(seed), careful(addedAt, m.maxSteps))[m.maxSteps]!.iceMg, `${seed}`).toBeGreaterThan(10000)
    }
  })

  it('counts a lid or a stirrer only from the step after it is put on or started', () => {
    const run = runSetup(m, 2, 'water', 0)
    const late = cupStates(m, run, null, { lidFrom: 4, stirFrom: 4, addedAt: null, steps: 6 })
    const never = cupStates(m, run, null, { lidFrom: null, stirFrom: null, addedAt: null, steps: 6 })
    expect(late.slice(0, 5)).toEqual(never.slice(0, 5))
    expect(late[5]).not.toEqual(never[5])
  })
})

describe('the balance', () => {
  it('shows the water and the solute for a strained cup, and the ice too for one that was not', () => {
    const solute = unknown(5)
    const end = cupStates(m, runSetup(m, 5, 'unknown', 0), solute, careful(8, 16))[16]!
    expect(solutionCg(end, solute, true)).toBe(Math.round(end.waterMg / 10) + solute.cg)
    expect(solutionCg(end, solute, false) - solutionCg(end, solute, true)).toBe(Math.round((end.waterMg + end.iceMg) / 10) - Math.round(end.waterMg / 10))
    expect(end.iceMg).toBeGreaterThan(15000)
  })
})

describe('the same numbers every time', () => {
  it('pins one run reading for reading: seed 1, the unknown, lid on and stirred, the solute after the eighth reading', () => {
    const states = cupStates(m, runSetup(m, 1, 'unknown', 0), unknown(1), careful(8, 16))
    expect(states.map((state) => readingOf(state, labSetup(m, 1).probeHundredths))).toEqual(PINNED)
    expect(states).toEqual(cupStates(m, runSetup(m, 1, 'unknown', 0), unknown(1), careful(8, 16)))
  })
})
const PINNED = [240, 61, 7, -9, -14, -15, -16, -16, -16, -143, -179, -190, -192, -193, -193, -193, -193]
