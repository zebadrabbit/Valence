import type { FreezingModel, Solute } from './model'
import type { RunSetup } from './setup'

// The cup's physics (spec 23.3), as a recurrence on whole numbers. The liquid water and the ice are kept in
// milligrams and the temperature in millionths of a degree from the freezing point of water. In each 30-second
// step: heat from the room melts a little ice (little with the lid on, much more with it off); then, while ice is
// left, the temperature goes a share of the way to the freezing point of what is dissolved in the water there is
// now (a large share when stirred, a small one when not), and where that cools the liquid, ice melts to do it. So
// the solution grows more dilute as ice melts and its freezing point creeps up. Once no ice is left the liquid
// warms toward the room. Only + - x / and rounding are used, on doubles that hold whole numbers or one quotient
// of them: those give the same bits in every engine, which no exp or pow is promised to. Nothing here reads a
// clock. scripts/freezing-lib.mjs steps the same recurrence for the build's checks, and a test holds the two to
// one another.
//
// This file works on the hidden values (which liquid, where the curve will level) and is not part of the public surface.

/** What is dissolved in a run: a solute and how much of it was weighed out, in hundredths of a gram. */
export interface Dissolved extends Solute {
  cg: number
}

/** What a run did to its cup, in steps of the logger: when the lid went on and the stirrer started (null: never), the step after whose reading the solute went in (null: not yet), and how many steps have passed. */
export interface Timeline {
  lidFrom: number | null
  stirFrom: number | null
  addedAt: number | null
  steps: number
}

/** The cup at one reading. */
export interface CupState {
  waterMg: number
  iceMg: number
  /** The temperature, in millionths of a degree from the freezing point of water. */
  micro: number
  /**
   * Levelled off: ice is left, the temperature is within the model's band of the freezing point of what is
   * dissolved, and the logger's last three readings are within a hundredth of a degree of one another. The band
   * alone is not enough: a temperature on its way past the freezing point is inside it for a moment.
   */
  level: boolean
}

/** True when something done at `from` was in force over the whole of step `step`, which runs from reading `step - 1` to reading `step`. */
const during = (from: number | null, step: number) => from !== null && from < step

/**
 * The freezing point of the solution, in millionths of a degree under that of water: the constant times the
 * particles each formula unit gives times the moles dissolved over the kilograms of water.
 */
export const targetMicro = (m: FreezingModel, solute: Dissolved, waterMg: number) => -Math.round((m.kfE2 * solute.particlesE2 * solute.cg * 1e8) / (solute.molarMassE2 * waterMg))

/** The cup at every reading from the logger's first, at step 0, to step `timeline.steps`. `solute` is null where nothing is to be dissolved. */
export function cupStates(m: FreezingModel, run: RunSetup, solute: Dissolved | null, timeline: Timeline): CupState[] {
  let water = run.waterCg * 10
  let ice = m.iceCg * 10
  let micro = run.startHundredths * 1e4
  const out: CupState[] = []
  const shown: number[] = []
  for (let step = 0; step <= timeline.steps; step++) {
    const dissolved = solute !== null && timeline.addedAt !== null && step > timeline.addedAt ? solute : null
    if (step > 0) {
      const lid = during(timeline.lidFrom, step)
      if (ice > 0) {
        const leak = Math.min(ice, lid ? m.leakLidOnMg : m.leakLidOffMg)
        ice -= leak
        water += leak
      }
      if (ice > 0) {
        const target = dissolved ? targetMicro(m, dissolved, water) : 0
        const given = Math.round(((target - micro) * (during(timeline.stirFrom, step) ? m.mixStirredPpm : m.mixStillPpm)) / 1e6)
        micro += given
        if (given < 0) {
          const melt = Math.min(ice, Math.round((water * -given) / (m.meltGramDegreesPerGram * 1e6)))
          ice -= melt
          water += melt
        }
      } else {
        micro += Math.round(((m.roomHundredths * 1e4 - micro) * (lid ? m.warmLidOnPpm : m.warmLidOffPpm)) / 1e6)
      }
    }
    const target = dissolved ? targetMicro(m, dissolved, water) : 0
    shown.push(Math.round(micro / 1e4))
    const last = shown.slice(-3)
    const steady = last.length === 3 && Math.max(...last) - Math.min(...last) <= 1
    out.push({ waterMg: water, iceMg: ice, micro, level: ice > 0 && steady && Math.abs(micro - target) <= m.levelBandMicro })
  }
  return out
}

/** What the logger shows for a state of the cup, in hundredths of a degree, on a probe that is so many hundredths off. */
export const readingOf = (state: CupState, probeHundredths: number) => Math.round((probeHundredths * 1e4 + state.micro) / 1e4)

/** What the balance shows for the liquid of a state of the cup with what is dissolved in it, in hundredths of a gram; with the ice too where it was not strained out. */
export const solutionCg = (state: CupState, solute: Dissolved, strained: boolean) => Math.round((state.waterMg + (strained ? 0 : state.iceMg)) / 10) + solute.cg
