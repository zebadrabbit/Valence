import { describe, expect, it } from 'vitest'
import { CLOCK_PROGRESS } from './app/activities'
import { clockData } from './chem-data/clock/data'
import { modelFrom } from './engine/clock/model'
import { PINNED_MODEL } from './engine/clock/pinnedModel'
import { fieldsOf } from './engine/kinetics/notebook'
import { temperatureView, timesTable } from './engine/kinetics/select'
import { labSetup, scatterOf } from './engine/kinetics/setup'
import { createLab, MAX_ATTEMPTS } from './engine/kinetics/state'
import { makeBathRuns, makeRoomRuns, makeRun, wholeSheet } from './engine/kinetics/testkit'

// A stored lab holds a seed, what the learner did at each run (with the time on the watch and the delay that the
// page handed in) and what the learner entered, not the room's temperature or the baths', the time a run ends, the
// times in the table, the points and the line of the graph, or whether anything counts: those are worked out again
// from the seed each time the lab is loaded, and every run and every entry is judged again against the model. So a
// change to the draw, to the rate record or to a mixture, to how a time is worked or rounded, to how the notebook
// fills a figure or draws its line, to a tolerance or a limit, or to the stored shape would regrade a lab that is
// already stored, or refuse it, unless the stored entry's version changes with it.
describe('the clock reaction lab', () => {
  it("pins the model, the draw, the times, the notebook's figures, the stored shape and the stored entry's version together: changing any of them means raising the clock entry's version in src/app/activities.ts", () => {
    const state = createLab(PINNED_MODEL, 1, 'guided')
    // Every run of seed 1 stopped at the change, and one stopped by a hand three tenths of a second late.
    const timed = makeBathRuns(PINNED_MODEL, makeRoomRuns(PINNED_MODEL, createLab(PINNED_MODEL, 1, 'challenge'), { stop: 'end' }), { stop: 'end' })
    const byHand = makeRun(PINNED_MODEL, createLab(PINNED_MODEL, 1, 'challenge'), 'bath-warm')
    const graph = temperatureView(PINNED_MODEL, wholeSheet(PINNED_MODEL, timed, 'rate-law')).graph!
    expect({
      ...CLOCK_PROGRESS,
      model: modelFrom(clockData),
      lab: labSetup(PINNED_MODEL, 1),
      scatter: PINNED_MODEL.runs.map((run) => scatterOf(PINNED_MODEL, 1, run.id, 0)),
      second: PINNED_MODEL.runs.map((run) => scatterOf(PINNED_MODEL, 1, run.id, 1)),
      times: timesTable(PINNED_MODEL, timed).map((row) => `${row.runId} ${row.temperatureTenths} ${row.tenths} ${row.by}`),
      byHand: byHand.runs['bath-warm'],
      fields: [fieldsOf(PINNED_MODEL, 'rate-law'), fieldsOf(PINNED_MODEL, 'temperature')],
      points: graph.points.map((p) => `${p.runId} ${p.xMicro} ${p.yMilli}`),
      places: graph.places.map((p) => `${p.xMicro} ${p.yMilli}`),
      limit: MAX_ATTEMPTS,
      state: { ...state, runs: { 'mixture-1': state.runs['mixture-1'] } },
    }).toEqual({
      entry: 'lab:clock-reaction',
      version: 1,
      model: {
        solutions: [
          { id: 'ki-0.01m', microMolar: 10000 },
          { id: 'na2s2o3-0.001m', microMolar: 1000 },
          { id: 'kbro3-0.04m', microMolar: 40000 },
          { id: 'hcl-0.1m', microMolar: 100000 },
          { id: 'starch', microMolar: null },
          { id: 'water', microMolar: null },
        ],
        reactants: [
          { id: 'iodide', solutionId: 'ki-0.01m', order: 1 },
          { id: 'bromate', solutionId: 'kbro3-0.04m', order: 1 },
          { id: 'hydrogen-ion', solutionId: 'hcl-0.1m', order: 2 },
        ],
        end: { solutionId: 'na2s2o3-0.001m', per: 6, indicatorId: 'starch' },
        rateConstant: 50.26,
        referenceCentiKelvin: 29815,
        activationJ: 50000,
        gasConstantE9: 8314462618,
        zeroCelsiusCentiKelvin: 27315,
        mixtures: [
          { id: 'mixture-1', tenthMl: { 'ki-0.01m': 100, 'na2s2o3-0.001m': 100, water: 100, 'kbro3-0.04m': 100, 'hcl-0.1m': 100 } },
          { id: 'mixture-2', tenthMl: { 'ki-0.01m': 200, 'na2s2o3-0.001m': 100, water: 0, 'kbro3-0.04m': 100, 'hcl-0.1m': 100 } },
          { id: 'mixture-3', tenthMl: { 'ki-0.01m': 100, 'na2s2o3-0.001m': 100, water: 0, 'kbro3-0.04m': 200, 'hcl-0.1m': 100 } },
          { id: 'mixture-4', tenthMl: { 'ki-0.01m': 100, 'na2s2o3-0.001m': 100, water: 0, 'kbro3-0.04m': 100, 'hcl-0.1m': 200 } },
          { id: 'mixture-5', tenthMl: { 'ki-0.01m': 80, 'na2s2o3-0.001m': 100, water: 120, 'kbro3-0.04m': 50, 'hcl-0.1m': 150 } },
        ],
        runs: [
          { id: 'mixture-1', mixtureId: 'mixture-1', bathId: null },
          { id: 'mixture-2', mixtureId: 'mixture-2', bathId: null },
          { id: 'mixture-3', mixtureId: 'mixture-3', bathId: null },
          { id: 'mixture-4', mixtureId: 'mixture-4', bathId: null },
          { id: 'mixture-5', mixtureId: 'mixture-5', bathId: null },
          { id: 'bath-ice', mixtureId: 'mixture-1', bathId: 'ice' },
          { id: 'bath-cool', mixtureId: 'mixture-1', bathId: 'cool' },
          { id: 'bath-warm', mixtureId: 'mixture-1', bathId: 'warm' },
        ],
        referenceRunId: 'mixture-1',
        orderRuns: { iodide: ['mixture-1', 'mixture-2'], bromate: ['mixture-1', 'mixture-3'], 'hydrogen-ion': ['mixture-1', 'mixture-4'] },
        baths: [
          { id: 'ice', rangeTenths: [5, 20] },
          { id: 'cool', rangeTenths: [90, 110] },
          { id: 'warm', rangeTenths: [380, 420] },
        ],
        roomRangeTenths: [200, 240],
        orderChoices: [0, 1, 2],
        unitPowers: [0, -1, -2, -3, -4],
        scatterPerTenThousand: 100,
        delayLimitMs: 2000,
        watchLimitMs: 1800000,
        rateConstantTolerancePercent: 5,
        activationTolerancePercent: 5,
        places: { fromMicro: 3150, stepMicro: 50, count: 12 },
      },
      lab: { roomTenths: 225, bathTenths: { ice: 5, cool: 101, warm: 420 } },
      scatter: [94, -44, 23, 44, -15, 99, -9, -2],
      second: [-73, -19, -51, -69, -2, -87, -21, 54],
      times: ['mixture-1 225 1241 end', 'mixture-2 225 612 end', 'mixture-3 225 616 end', 'mixture-4 225 309 end', 'mixture-5 225 1363 end', 'bath-ice 5 6368 end', 'bath-cool 101 2991 end', 'bath-warm 420 349 end'],
      byHand: [{ index: 0, indicator: true, bath: 2, read: true, poured: true, stop: { by: 'hand', elapsedMs: 35204, delayMs: 300 } }],
      fields: [
        ['concentration:iodide', 'concentration:bromate', 'concentration:hydrogen-ion', 'rate', 'order:iodide', 'order:bromate', 'order:hydrogen-ion', 'rateConstant', 'unit'],
        ['first', 'second', 'slope', 'energy'],
      ],
      points: ['mixture-1 3382 3737', 'bath-ice 3654 2102', 'bath-cool 3530 2857', 'bath-warm 3173 5006'],
      places: ['3150 5142', '3200 4841', '3250 4539', '3300 4238', '3350 3937', '3400 3635', '3450 3334', '3500 3032', '3550 2731', '3600 2429', '3650 2128', '3700 1826'],
      limit: 100,
      state: {
        seed: 1,
        mode: 'guided',
        status: 'in-progress',
        runs: { 'mixture-1': [{ index: 0, indicator: false, bath: 0, read: false, poured: false, stop: null }] },
        sheets: {
          'rate-law': [{ entries: { 'concentration:iodide': null, 'concentration:bromate': null, 'concentration:hydrogen-ion': null, rate: null, 'order:iodide': null, 'order:bromate': null, 'order:hydrogen-ion': null, rateConstant: null, unit: null }, looked: [], closed: false }],
          temperature: [{ entries: { first: null, second: null, slope: null, energy: null }, looked: [], closed: false }],
        },
      },
    })
    // The model the tests are pinned against is the one the stored record gives.
    expect(modelFrom(clockData)).toEqual(PINNED_MODEL)
  })
})
