import { describe, expect, it } from 'vitest'
import { ACTIVITIES, FREEZING_PROGRESS } from './app/activities'
import { freezingData } from './chem-data/freezing/data'
import { modelFrom } from './engine/freezing/model'
import { PINNED_MODEL } from './engine/freezing/pinnedModel'
import { labSetup, runSetup } from './engine/freezing/setup'
import { createLab } from './engine/freezing/state'
import { FIELDS, WORKED_FROM } from './engine/freezing/worksheet'

// A stored lab holds a seed, what the learner did to each cup, which solute was chosen and what the learner typed,
// not the readings, the masses, how far the probe is off or which liquid the unknown is: those are worked out
// again from the seed each time the lab is loaded, and every run is judged again against the model. So a change
// to the draw, to a stored molar mass or count of particles, to the constant, to the cup's parameters, the band a
// level stretch is judged by or a tolerance, to the notebook or to the stored shape would regrade a lab that is
// already stored, or refuse it, unless the stored entry's version changes with it.
describe('the freezing point depression lab', () => {
  it("pins the model, the draw, the notebook, the stored shape and the stored entry's version together: changing any of them means raising the freezing entry's version in src/app/activities.ts", () => {
    expect({
      entry: FREEZING_PROGRESS.entry,
      version: FREEZING_PROGRESS.version,
      model: modelFrom(freezingData),
      lab: labSetup(PINNED_MODEL, 1),
      run: runSetup(PINNED_MODEL, 1, 'unknown', 0),
      second: runSetup(PINNED_MODEL, 1, 'particles', 1),
      fields: FIELDS,
      workedFrom: WORKED_FROM,
      state: createLab(1, 'guided'),
    }).toEqual({
      entry: 'lab:freezing-point-depression',
      version: 2,
      model: {
        kfE2: 186,
        liquids: [
          { id: 'acetone', molarMassE2: 5808, particlesE2: 100, idealParticles: 1 },
          { id: 'ethanol', molarMassE2: 4607, particlesE2: 100, idealParticles: 1 },
          { id: 'propan-2-ol', molarMassE2: 6010, particlesE2: 100, idealParticles: 1 },
        ],
        solutes: [
          { id: 'urea', molarMassE2: 6006, particlesE2: 100, idealParticles: 1 },
          { id: 'nacl', molarMassE2: 5844, particlesE2: 182, idealParticles: 2 },
          { id: 'kcl', molarMassE2: 7455, particlesE2: 178, idealParticles: 2 },
          { id: 'nabr', molarMassE2: 10289, particlesE2: 185, idealParticles: 2 },
        ],
        stepSeconds: 30,
        runOnSteps: 2,
        maxSteps: 60,
        mixStirredPpm: 700000,
        mixStillPpm: 20000,
        leakLidOnMg: 60,
        leakLidOffMg: 1500,
        meltGramDegreesPerGram: 80,
        warmLidOnPpm: 10000,
        warmLidOffPpm: 30000,
        roomHundredths: 2200,
        iceCg: 2500,
        iceLowCg: 500,
        levelBandMicro: 2000,
        startRangeHundredths: [200, 400],
        probeOffRangeHundredths: [5, 25],
        waterRangeCg: [9350, 9800],
        unknownRangeCg: [360, 450],
        soluteRangesCg: { urea: [525, 590], nacl: [266, 308], kcl: [339, 393], nabr: [467, 542] },
        molarMassTolerancePerMille: 15,
        particlesTolerancePerMille: 30,
      },
      lab: LAB,
      run: RUN,
      second: SECOND,
      fields: {
        water: ['water'],
        unknown: ['water', 'solution', 'fall', 'waterKg', 'molality', 'moles', 'molarMass', 'liquid'],
        particles: ['water', 'solution', 'fall', 'waterKg', 'moles', 'molality', 'idealFall', 'ratio'],
      },
      workedFrom: {
        unknown: { molality: ['fall'], moles: ['molality', 'waterKg'], molarMass: ['moles'] },
        particles: { moles: [], molality: ['moles', 'waterKg'], idealFall: ['molality'], ratio: ['fall', 'idealFall'] },
      },
      state: {
        seed: 1,
        mode: 'guided',
        status: 'in-progress',
        parts: { water: [RUN_STORED], unknown: [RUN_STORED], particles: [RUN_STORED] },
      },
    })
    // The model the tests are pinned against is the one the stored record gives.
    expect(modelFrom(freezingData)).toEqual(PINNED_MODEL)
  })

  it('has a stored entry of its own, which is the one its row among the activities loads and saves with, at its own address', () => {
    expect({ entry: ACTIVITIES[10].entry, version: ACTIVITIES[10].version }).toEqual(FREEZING_PROGRESS)
    expect(ACTIVITIES[10].to).toBe('/lab/freezing-point-depression')
    expect(new Set(ACTIVITIES.map((activity) => activity.entry as string)).size).toBe(ACTIVITIES.length)
  })
})

const LAB = { liquidIndex: 1, probeHundredths: -16 }
const RUN = { startHundredths: 256, waterCg: 9626, unknownCg: 450, soluteCg: { urea: 555, nacl: 287, kcl: 346, nabr: 497 } }
const SECOND = { startHundredths: 279, waterCg: 9695, unknownCg: 386, soluteCg: { urea: 537, nacl: 267, kcl: 362, nabr: 511 } }
const RUN_STORED = {
  index: 0,
  solute: null,
  filled: false,
  lidFrom: null,
  stirFrom: null,
  logger: false,
  addedAt: null,
  steps: 0,
  strainedAt: null,
  weighedAt: null,
  looked: [],
  entries: { water: null, solution: null, fall: null, waterKg: null, molality: null, moles: null, molarMass: null, liquid: null, idealFall: null, ratio: null },
  closed: false,
}
