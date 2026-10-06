import { describe, expect, it } from 'vitest'
import { titrationData } from '@/chem-data/titration/data'
import { createLab, modelFrom, type Action, type TitrationState } from '@/engine/titration'
import { honestReading, learner } from '@/engine/titration/testkit'
import { benchViewOf } from './benchView'
import { decide, readingAction } from './controller'

// The page's decisions on the stored record's model, seed 1.
const m = modelFrom(titrationData)
const { run, prepared, titrateCarefully } = learner()
const FILL: Action = { type: 'fillBurette' }
const PIPETTE: Action = { type: 'pipetteAliquot' }
const initial = (readingUl: number): Action => ({ type: 'recordInitialReading', readingUl })
const lab = (mode: TitrationState['mode']) => createLab(1, mode)
/** Filled without conditioning, the bubble still in the tip. */
const filled = (mode: TitrationState['mode']) => run(m, lab(mode), [FILL])

describe('decide', () => {
  it('in Challenge does an action that skips a technique step, and never asks', () => {
    expect(decide(m, lab('challenge'), FILL, false)).toEqual({ kind: 'do', action: FILL })
    expect(decide(m, lab('challenge'), PIPETTE, false)).toEqual({ kind: 'do', action: PIPETTE })
    const honest = initial(honestReading(filled('challenge').burette.levelUl))
    expect(decide(m, filled('challenge'), honest, false)).toEqual({ kind: 'do', action: honest })
  })

  it('in Guided asks before a fill of a burette that is not conditioned, and does it once the learner has gone on', () => {
    expect(decide(m, lab('guided'), FILL, false)).toEqual({ kind: 'ask', action: FILL, warnings: ['burette-not-conditioned'] })
    expect(decide(m, lab('guided'), FILL, true)).toEqual({ kind: 'do', action: FILL })
    // Conditioned: nothing to ask.
    expect(decide(m, run(m, lab('guided'), [{ type: 'conditionBurette' }]), FILL, false)).toEqual({ kind: 'do', action: FILL })
  })

  it('in Guided asks before pipetting with a pipette that is not rinsed', () => {
    expect(decide(m, lab('guided'), PIPETTE, false)).toEqual({ kind: 'ask', action: PIPETTE, warnings: ['pipette-not-rinsed'] })
    expect(decide(m, run(m, lab('guided'), [{ type: 'rinsePipette' }]), PIPETTE, false)).toEqual({ kind: 'do', action: PIPETTE })
  })

  it('in Guided asks once, with both warnings and the burette first, before an honest reading of a burette filled dilute with its bubble', () => {
    const state = filled('guided')
    const honest = initial(honestReading(state.burette.levelUl))
    expect(decide(m, state, honest, false)).toEqual({ kind: 'ask', action: honest, warnings: ['burette-not-conditioned', 'tip-bubble'] })
    expect(decide(m, state, honest, true)).toEqual({ kind: 'do', action: honest })
  })

  it('in Guided refuses a reading 30 µL from the meniscus, confirmed or not', () => {
    const state = filled('guided')
    const off = initial(honestReading(state.burette.levelUl) + 30)
    expect(decide(m, state, off, false)).toEqual({ kind: 'refuse', reason: 'reread' })
    expect(decide(m, state, off, true)).toEqual({ kind: 'refuse', reason: 'reread' })
    // Challenge takes it: the misread is named afterwards.
    expect(decide(m, filled('challenge'), off, false)).toEqual({ kind: 'do', action: off })
  })

  it('refuses in either mode what the engine has blocked, with its reason', () => {
    for (const mode of ['guided', 'challenge'] as const) {
      expect(decide(m, lab(mode), { type: 'deliver', amount: 'drop' }, false)).toEqual({ kind: 'refuse', reason: 'burette-empty' })
      expect(decide(m, lab(mode), { type: 'deliver', amount: 'drop' }, true)).toEqual({ kind: 'refuse', reason: 'burette-empty' })
    }
  })
})

describe('readingAction', () => {
  it('is the initial reading until NaOH has run into the flask, and the final reading from then', () => {
    const ready = prepared(m, 1)
    expect(readingAction(benchViewOf(m, ready), 2560)).toEqual({ type: 'recordInitialReading', readingUl: 2560 })
    const { state } = titrateCarefully(m, ready)
    expect(readingAction(benchViewOf(m, state), 28260)).toEqual({ type: 'recordFinalReading', readingUl: 28260 })
  })

  it('is null while no reading can be recorded', () => {
    // An empty burette; a titration whose pink has not lasted a swirl and wait.
    expect(readingAction(benchViewOf(m, lab('guided')), 2560)).toBeNull()
    expect(readingAction(benchViewOf(m, run(m, prepared(m, 1), [{ type: 'deliver', amount: 'stream' }])), 2810)).toBeNull()
  })
})
