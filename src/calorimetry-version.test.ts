import { describe, expect, it } from 'vitest'
import { CALORIMETRY_PROGRESS } from './app/activities'
import { calorimetryData, PART_IDS } from './chem-data/calorimetry/data'
import { readings } from './engine/calorimetry/cup'
import { modelFrom } from './engine/calorimetry/model'
import { PINNED_MODEL } from './engine/calorimetry/pinnedModel'
import { labSetup, runSetup } from './engine/calorimetry/setup'
import { createLab } from './engine/calorimetry/state'
import { FIELDS } from './engine/calorimetry/worksheet'

// A stored run holds a seed, what the learner did to each cup and what the learner typed, not the masses, the
// temperatures or the metal: those are worked out again from the seed each time the run is loaded, the logger's
// readings with them, and every entry is judged again against the model. So a change to the draw, to the cup's
// physics, to a stored value a result is held to or to the stored shape would regrade a run that is already
// stored, or refuse it, unless the stored entry's version changes with it.
describe('the calorimetry lab', () => {
  it("pins the model, the draw, the cup's curve, the worksheet, the stored shape and the stored entry's version together: changing any of them means raising the calorimetry entry's version in src/app/activities.ts", () => {
    const state = createLab(1, 'guided')
    expect({
      ...CALORIMETRY_PROGRESS,
      model: modelFrom(calorimetryData),
      lab: labSetup(PINNED_MODEL, 1),
      runs: PART_IDS.map((part) => runSetup(PINNED_MODEL, 1, part, 0)),
      second: runSetup(PINNED_MODEL, 1, 'metal', 1),
      // A careful cup of each part, and one with neither lid nor stirrer: the change started after the third reading.
      curves: PART_IDS.flatMap((part) => [2, null].map((from) => readings(PINNED_MODEL, part, labSetup(PINNED_MODEL, 1), runSetup(PINNED_MODEL, 1, part, 0), { lidFrom: from, stirFrom: from, changedAt: 2, steps: 10 }).join(' '))),
      fields: FIELDS,
      state: { ...state, parts: { neutralisation: state.parts.neutralisation } },
    }).toEqual({
      entry: 'lab:calorimetry',
      version: 1,
      model: {
        specificHeatE2: 418,
        densityE2: 100,
        neutralisationJ: -57706,
        solutionJ: 24405,
        saltMolarMassE3: 80044,
        candidates: [
          { id: 'aluminium-piece', specificHeatE3: 902 },
          { id: 'iron-piece', specificHeatE3: 449 },
          { id: 'zinc-piece', specificHeatE3: 388 },
          { id: 'tin-piece', specificHeatE3: 227 },
        ],
        acidTenthMl: 500,
        baseTenthMl: 500,
        molarityE2: 100,
        waterTenthMl: 500,
        stepSeconds: 15,
        runOnSteps: 2,
        maxSteps: 240,
        mixStirredPpm: 850000,
        mixStillPpm: 150000,
        lossLidOnPpm: 5000,
        lossLidOffPpm: 40000,
        startRangeTenths: [200, 240],
        saltRangeCg: [380, 420],
        metalRangeCg: [4800, 5200],
        bathRangeTenths: [990, 1000],
        readingToleranceTenths: 1,
        tolerancePercent: 5,
      },
      lab: { metalIndex: 2 },
      runs: [
        { startTenths: 200, saltCg: 420, metalCg: 4912, bathTenths: 996 },
        { startTenths: 221, saltCg: 420, metalCg: 4912, bathTenths: 996 },
        { startTenths: 239, saltCg: 420, metalCg: 4912, bathTenths: 996 },
      ],
      second: { startTenths: 218, saltCg: 420, metalCg: 4996, bathTenths: 991 },
      curves: [
        '200 200 200 258 267 268 268 267 267 267 266',
        '200 200 200 210 218 224 230 234 237 239 241',
        '221 221 221 173 166 165 166 166 166 166 167',
        '221 221 221 213 206 201 197 193 191 189 188',
        '239 239 239 293 300 301 301 301 300 300 300',
        '239 239 239 248 255 261 266 270 273 275 276',
      ],
      fields: {
        neutralisation: ['start', 'extreme', 'change', 'heat', 'direction', 'moles', 'perMole'],
        dissolving: ['start', 'extreme', 'change', 'heat', 'direction', 'moles', 'perMole'],
        metal: ['start', 'extreme', 'change', 'heat', 'specificHeat', 'metal'],
      },
      state: {
        seed: 1,
        mode: 'guided',
        status: 'in-progress',
        parts: {
          neutralisation: [
            {
              index: 0,
              lidFrom: null,
              stirFrom: null,
              logger: false,
              changedAt: null,
              steps: 0,
              looked: [],
              entries: { start: null, extreme: null, change: null, heat: null, direction: null, moles: null, perMole: null, specificHeat: null, metal: null },
              closed: false,
            },
          ],
        },
      },
    })
    // The model the tests are pinned against is the one the stored record gives.
    expect(modelFrom(calorimetryData)).toEqual(PINNED_MODEL)
  })
})
