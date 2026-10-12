import { describe, expect, it } from 'vitest'
import { ACETONE_PROGRESS, ACTIVITIES } from './app/activities'
import { acetoneData } from './chem-data/acetone/data'
import { modelFrom } from './engine/acetone/model'
import { PINNED_MODEL } from './engine/acetone/pinnedModel'
import { fieldsOf } from './engine/kinetics/notebook'
import { leftAt, rateLawView, timesTable } from './engine/kinetics/select'
import { labSetup, scatterOf } from './engine/kinetics/setup'
import { createLab, MAX_ATTEMPTS } from './engine/kinetics/state'
import { makeRoomRuns, makeRun, wholeSheet } from './engine/kinetics/testkit'

// A stored lab holds a seed, what the learner did at each run (with the time on the watch and the delay that the
// page handed in) and what the learner entered, not the room's temperature, the time a run ends, the times in the
// table, what the notebook fills, or whether anything counts: those are worked out again from the seed each time
// the lab is loaded, and every run and every entry is judged again against the model. So a change to the draw, to
// the rate record or to a mixture, to how a time is worked or rounded, to how the notebook fills a figure, to a
// tolerance or a limit, or to the stored shape would regrade a lab that is already stored, or refuse it, unless
// the stored entry's version changes with it.
describe('the iodination of acetone lab', () => {
  it("pins the model, the draw, the times, the notebook's figures, the stored shape and the stored entry's version together: changing any of them means raising the acetone entry's version in src/app/activities.ts", () => {
    const state = createLab(PINNED_MODEL, 1, 'guided')
    // Every run of seed 1 stopped at the end, and one stopped by a hand three tenths of a second late.
    const timed = makeRoomRuns(PINNED_MODEL, createLab(PINNED_MODEL, 1, 'challenge'), { stop: 'end' })
    const byHand = makeRun(PINNED_MODEL, createLab(PINNED_MODEL, 1, 'challenge'), 'mixture-4')
    const filled = rateLawView(PINNED_MODEL, wholeSheet(PINNED_MODEL, timed, 'rate-law'))
    const figures = ({ mantissa, exponent }: { mantissa: number; exponent: number }) => `${mantissa}e${exponent}`
    expect({
      ...ACETONE_PROGRESS,
      model: modelFrom(acetoneData),
      lab: labSetup(PINNED_MODEL, 1),
      scatter: PINNED_MODEL.runs.map((run) => scatterOf(PINNED_MODEL, 1, run.id, 0)),
      second: PINNED_MODEL.runs.map((run) => scatterOf(PINNED_MODEL, 1, run.id, 1)),
      times: timesTable(PINNED_MODEL, timed).map((row) => `${row.runId} ${row.temperatureTenths} ${row.tenths} ${row.by}`),
      byHand: byHand.runs['mixture-4'],
      left: leftAt(PINNED_MODEL, byHand, 'mixture-4', 0),
      fields: fieldsOf(PINNED_MODEL, 'rate-law'),
      rows: filled.rows!.map((row) => `${row.runId} ${Object.values(row.strengths).map(figures).join(' ')} ${figures(row.rate)}`),
      constants: [...filled.constants!.rows.map((row) => `${row.runId} ${figures(row.constant)}`), `mean ${figures(filled.constants!.mean)}`],
      limit: MAX_ATTEMPTS,
      state: { ...state, runs: { 'mixture-1': state.runs['mixture-1'] } },
    }).toEqual({
      entry: 'lab:iodination-of-acetone',
      version: 1,
      model: {
        solutions: [
          { id: 'acetone-4m', microMolar: 4000000 },
          { id: 'hcl-1m', microMolar: 1000000 },
          { id: 'iodine-0.005m', microMolar: 5000 },
          { id: 'water', microMolar: null },
        ],
        reactants: [
          { id: 'acetone', solutionId: 'acetone-4m', order: 1 },
          { id: 'hydrogen-ion', solutionId: 'hcl-1m', order: 1 },
          { id: 'iodine', solutionId: 'iodine-0.005m', order: 0 },
        ],
        end: { solutionId: 'iodine-0.005m', per: 1, indicatorId: null },
        rateConstant: 0.0000291,
        referenceCentiKelvin: 29815,
        activationJ: 86190,
        gasConstantE9: 8314462618,
        zeroCelsiusCentiKelvin: 27315,
        mixtures: [
          { id: 'mixture-1', tenthMl: { 'acetone-4m': 100, 'hcl-1m': 100, water: 200, 'iodine-0.005m': 100 } },
          { id: 'mixture-2', tenthMl: { 'acetone-4m': 200, 'hcl-1m': 100, water: 100, 'iodine-0.005m': 100 } },
          { id: 'mixture-3', tenthMl: { 'acetone-4m': 100, 'hcl-1m': 200, water: 100, 'iodine-0.005m': 100 } },
          { id: 'mixture-4', tenthMl: { 'acetone-4m': 100, 'hcl-1m': 100, water: 100, 'iodine-0.005m': 200 } },
        ],
        runs: [
          { id: 'mixture-1', mixtureId: 'mixture-1', bathId: null },
          { id: 'mixture-2', mixtureId: 'mixture-2', bathId: null },
          { id: 'mixture-3', mixtureId: 'mixture-3', bathId: null },
          { id: 'mixture-4', mixtureId: 'mixture-4', bathId: null },
        ],
        referenceRunId: 'mixture-1',
        orderRuns: { acetone: ['mixture-1', 'mixture-2'], 'hydrogen-ion': ['mixture-1', 'mixture-3'], iodine: ['mixture-1', 'mixture-4'] },
        baths: [],
        roomRangeTenths: [200, 240],
        orderChoices: [0, 1, 2],
        unitPowers: [0, -1, -2, -3, -4],
        scatterPerTenThousand: 100,
        delayLimitMs: 5000,
        watchLimitMs: 1800000,
        rateConstantTolerancePercent: 5,
        activationTolerancePercent: 0,
        places: { fromMicro: 0, stepMicro: 0, count: 0 },
      },
      lab: { roomTenths: 225, bathTenths: {} },
      scatter: [-100, 6, 97, 94],
      second: [-44, 23, 44, -15],
      times: ['mixture-1 225 2853 end', 'mixture-2 225 1442 end', 'mixture-3 225 1455 end', 'mixture-4 225 5818 end'],
      byHand: [{ index: 0, indicator: false, bath: 0, read: false, poured: true, stop: { by: 'hand', elapsedMs: 582087, delayMs: 300 } }],
      left: { microMolar: 0, ofMicroMolar: 2000 },
      fields: ['concentration:acetone', 'concentration:hydrogen-ion', 'concentration:iodine', 'rate', 'order:acetone', 'order:hydrogen-ion', 'order:iodine', 'rateConstant', 'unit'],
      rows: ['mixture-2 160e-2 200e-3 100e-5 693e-8', 'mixture-3 800e-3 400e-3 100e-5 687e-8', 'mixture-4 800e-3 200e-3 200e-5 344e-8'],
      constants: ['mixture-2 217e-7', 'mixture-3 215e-7', 'mixture-4 215e-7', 'mean 216e-7'],
      limit: 100,
      state: {
        seed: 1,
        mode: 'guided',
        status: 'in-progress',
        runs: { 'mixture-1': [{ index: 0, indicator: false, bath: 0, read: false, poured: false, stop: null }] },
        sheets: {
          'rate-law': [{ entries: { 'concentration:acetone': null, 'concentration:hydrogen-ion': null, 'concentration:iodine': null, rate: null, 'order:acetone': null, 'order:hydrogen-ion': null, 'order:iodine': null, rateConstant: null, unit: null }, looked: [], closed: false }],
          temperature: [],
        },
      },
    })
    // The model the tests are pinned against is the one the stored record gives.
    expect(modelFrom(acetoneData)).toEqual(PINNED_MODEL)
    // The lab's page loads and saves with this entry and this version: it is the eighth of the activities.
    expect({ entry: ACTIVITIES[7].entry, version: ACTIVITIES[7].version }).toEqual(ACETONE_PROGRESS)
  })
})
