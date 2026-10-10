import type { PartId } from '@/chem-data/calorimetry/data'
import type { CalorimetryModel } from './model'
import type { LabSetup, RunSetup } from './setup'

// The cup's physics (spec 16.3), as a recurrence on whole numbers. The temperature is kept in millionths of a
// degree above the start, which is also the room's. In each 15-second step after the change is started, a share
// of the heat still to come is given to the cup's contents (a large share when stirred, a small one when not),
// and a share of the cup's difference from the room is lost to it (a small share with the lid on, a larger one
// with it off). Only + - x / and rounding are used, on doubles that hold whole numbers or one quotient of them:
// those give the same bits in every engine, which no exp or pow is promised to. Nothing here reads a clock.
//
// This file works on the hidden values (which metal, where the curve will end) and is not part of the public surface.

/** The mass of a measured volume, in hundredths of a gram, with every liquid taken as water. */
export const massCg = (m: CalorimetryModel, tenthMl: number) => (tenthMl * m.densityE2) / 10

/** What is in the cup once the change is started, in hundredths of a gram: both solutions; the water and the salt; the water alone (the piece is not part of what the learner's arithmetic warms). */
export function contentsCg(m: CalorimetryModel, part: PartId, run: RunSetup): number {
  if (part === 'neutralisation') return massCg(m, m.acidTenthMl + m.baseTenthMl)
  return massCg(m, m.waterTenthMl) + (part === 'dissolving' ? run.saltCg : 0)
}

/** Part 1: the water formed, in millionths of a mole. The acid and the base react one for one, so it is the smaller of the two amounts. */
export const waterFormedMicromol = (m: CalorimetryModel) => Math.min(m.acidTenthMl, m.baseTenthMl) * m.molarityE2

/**
 * The change in temperature the cup's contents would show if they traded no heat with the room, in millionths of
 * a degree: a rise for the neutralisation and for the hot metal, a fall for the dissolving salt.
 */
export function fullChangeMicro(m: CalorimetryModel, part: PartId, lab: LabSetup, run: RunSetup): number {
  // J/°C x 10 000 of the cup's contents, as their mass times the specific heat of water.
  const contents = contentsCg(m, part, run) * m.specificHeatE2
  if (part === 'neutralisation') return Math.round((-m.neutralisationJ * waterFormedMicromol(m) * 1e4) / contents)
  if (part === 'dissolving') {
    // Moles = mass over molar mass; the heat taken in is theirs times the enthalpy, and it comes out of the contents.
    const micromol = (run.saltCg * 1e7) / m.saltMolarMassE3
    return -Math.round((m.solutionJ * micromol * 1e4) / contents)
  }
  // The piece and the water come to one temperature: the heat the piece gives is the heat the water takes.
  const metal = run.metalCg * m.candidates[lab.metalIndex]!.specificHeatE3 // J/°C x 100 000
  const water = contents * 10
  return Math.round((metal * (run.bathTenths - run.startTenths) * 1e5) / (metal + water))
}

/** What a run did to its cup, in steps of the logger: when the lid went on and the stirrer started (null: never), when the change was started (null: not yet), and how many steps have passed. */
export interface Timeline {
  lidFrom: number | null
  stirFrom: number | null
  changedAt: number | null
  steps: number
}

/** True when something done at `from` was in force over the whole of step `step`, which runs from reading `step - 1` to reading `step`. */
const during = (from: number | null, step: number) => from !== null && from < step

/**
 * The logger's readings from its first, at step 0, to step `steps`, in tenths of a degree. Before the change the
 * cup is at the room's temperature and the line is level.
 */
export function readings(m: CalorimetryModel, part: PartId, lab: LabSetup, run: RunSetup, timeline: Timeline): number[] {
  const startMicro = run.startTenths * 1e5
  let toCome = fullChangeMicro(m, part, lab, run)
  let above = 0
  const out: number[] = []
  for (let step = 0; step <= timeline.steps; step++) {
    if (timeline.changedAt !== null && step > timeline.changedAt) {
      const given = Math.round((toCome * (during(timeline.stirFrom, step) ? m.mixStirredPpm : m.mixStillPpm)) / 1e6)
      toCome -= given
      above += given
      above -= Math.round((above * (during(timeline.lidFrom, step) ? m.lossLidOnPpm : m.lossLidOffPpm)) / 1e6)
    }
    out.push(Math.round((startMicro + above) / 1e5))
  }
  return out
}
