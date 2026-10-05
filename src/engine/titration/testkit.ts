// Scripted learners, for tests only: nothing in the app imports this file.
import { can, flaskOf, reduce, type Action } from './actions'
import { compareToEquivalence, flaskChemistry, type Flask } from './flask'
import type { TitrationModel } from './model'
import { labSetup } from './setup'
import { createLab, currentTrial, type Mode, type TitrationState } from './state'

/** The reading a careful learner types: the true meniscus to the nearest 0.01 mL. */
export const honestReading = (levelUl: number) => Math.round(levelUl / 10) * 10

/**
 * The molarity a careful learner types: the notebook's HCl molarity x 25.00 mL / titre, rounded to the fourth
 * decimal place. The rounding is of one quotient of two whole numbers, so a value exactly halfway is exactly
 * halfway in floating point too, and Math.round takes it up; followsFromNotebook accepts that neighbour.
 */
export const calculatedMolarityE6 = (m: TitrationModel, hclE6: number, titreUl: number) => Math.round((hclE6 * m.pipetteNominalUl) / (100 * titreUl)) * 100

/** One addition of a scripted run, and the flask as it stood after it. */
export interface Addition {
  amount: 'stream' | 'drop' | 'half'
  deliveredUl: number
  /** compareToEquivalence after it: -1 while the flask is still before its equivalence volume. */
  side: number
  pH: number
  pinkConcentration: number
}

export interface Technique {
  mode?: Mode
  condition?: boolean
  clearBubble?: boolean
  rinse?: boolean
  drops?: number
  /** Number of 10 mL washes of distilled water before titrating. */
  washes?: number
  /** False to go on with what is left in the burette. */
  fill?: boolean
}

/**
 * Scripted learners. `through` is applied to the state after every action: the resume test passes a round trip
 * through storage, so that every action is followed by a reload.
 */
export function learner(through: (state: TitrationState) => TitrationState = (state) => state) {
  /** Applies the actions in order; throws on one that cannot be done, so a script cannot skip a step unseen. */
  function run(m: TitrationModel, state: TitrationState, actions: readonly Action[]): TitrationState {
    for (const action of actions) {
      const blocked = can(m, state, action)
      if (blocked) throw new Error(`${action.type}: ${blocked}`)
      state = through(reduce(m, state, action))
    }
    return state
  }

  /** Takes the current, untouched trial up to an openable stopcock. No technique step is taken unless asked for. */
  function readyTrial(m: TitrationModel, s: TitrationState, t: Technique = {}): TitrationState {
    const { condition = false, clearBubble = false, rinse = false, drops = 2, washes = 0, fill = true } = t
    if (condition) s = run(m, s, [{ type: 'conditionBurette' }])
    if (fill) s = run(m, s, [{ type: 'fillBurette' }])
    if (clearBubble && s.burette.tipAirUl > 0) s = run(m, s, [{ type: 'clearTipBubble' }])
    s = run(m, s, [{ type: 'recordInitialReading', readingUl: honestReading(s.burette.levelUl) }])
    if (rinse && !s.pipetteRinsed) s = run(m, s, [{ type: 'rinsePipette' }])
    s = run(m, s, [{ type: 'pipetteAliquot' }])
    for (let i = 0; i < drops; i++) s = run(m, s, [{ type: 'addIndicatorDrop' }])
    for (let i = 0; i < washes; i++) s = run(m, s, [{ type: 'addWater' }])
    return s
  }

  /** A new lab with the label recorded, up to an openable stopcock. Challenge and careful unless told otherwise. */
  function prepared(m: TitrationModel, seed: number, t: Technique = {}): TitrationState {
    const s = run(m, createLab(seed, t.mode ?? 'challenge'), [{ type: 'recordHclMolarity', molarityE6: labSetup(m, seed).hclE4 * 100 }])
    return readyTrial(m, s, { condition: true, clearBubble: true, rinse: true, ...t })
  }

  /**
   * The careful run of spec 7.4: stream while an addition stays 2.00 mL short of equivalence, drops while one
   * stays 0.20 mL short, then half-drops until the mixed flask is pink, and a swirl and wait to confirm it.
   * Stops as well when the trial ends. Returns the state and every addition.
   */
  function titrateCarefully(m: TitrationModel, s: TitrationState): { state: TitrationState; additions: Addition[] } {
    const additions: Addition[] = []
    const staysShort = (flask: Flask, addUl: number, marginUl: number) => compareToEquivalence({ ...flask, deliveredUl: flask.deliveredUl + addUl }, -marginUl) <= 0
    while (currentTrial(s).end === 'open') {
      const before = flaskOf(m, s)
      const amount = staysShort(before, m.streamUl, 2000) ? 'stream' : staysShort(before, m.dropUl, 200) ? 'drop' : 'half'
      s = run(m, s, [{ type: 'deliver', amount }])
      const flask = flaskOf(m, s)
      const { pH, pinkConcentration } = flaskChemistry(m, flask)
      additions.push({ amount, deliveredUl: flask.deliveredUl, side: compareToEquivalence(flask), pH, pinkConcentration })
      if (pinkConcentration >= m.faintPinkConcentration) {
        if (currentTrial(s).end === 'open') s = run(m, s, [{ type: 'swirlAndWait' }])
        break
      }
    }
    return { state: s, additions }
  }

  /** Reads the burette honestly and types the molarity that follows from the notebook. */
  function finishHonestly(m: TitrationModel, s: TitrationState): TitrationState {
    s = run(m, s, [{ type: 'recordFinalReading', readingUl: honestReading(s.burette.levelUl) }])
    const trial = currentTrial(s)
    return run(m, s, [{ type: 'submitMolarity', molarityE6: calculatedMolarityE6(m, s.hclRecordedE6!, trial.finalReadingUl! - trial.initialReadingUl!) }])
  }

  /** One whole careful trial from an openable stopcock. */
  const carefulTrial = (m: TitrationModel, s: TitrationState) => finishHonestly(m, titrateCarefully(m, s).state)

  return { run, readyTrial, prepared, titrateCarefully, finishHonestly, carefulTrial }
}
