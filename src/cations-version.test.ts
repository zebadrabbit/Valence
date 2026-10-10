import { describe, expect, it } from 'vitest'
import { CATIONS_PROGRESS } from './app/activities'
import { cationsData } from './chem-data/cations/data'
import { modelFrom } from './engine/cations/model'
import { PINNED_MODEL } from './engine/cations/pinnedModel'
import { FIELDS, LOOKS, STEP_TUBES } from './engine/cations/run'
import { partView } from './engine/cations/select'
import { sampleOf, unknownOrder } from './engine/cations/setup'
import { createLab, currentRun, MAX_EVENTS, MAX_RUNS } from './engine/cations/state'
import { wholeRun } from './engine/cations/testkit'

// A stored run holds a seed and the list of what the learner did, not which ions the sample holds, what a tube
// held or showed, or whether anything was right: those are worked out again from the seed and the list each time
// the run is loaded, and every observation is judged again against what the tube shows. So a change to the draw
// of the unknowns, to a rule of the tubes, to the bench's amounts, to a look or a choice, to the flow chart, to the
// order of a step or to the stored shape would regrade a run that is already stored, or refuse it, unless the
// stored entry's version changes with it.
describe('the Group I cations lab', () => {
  it("pins the model, the draw, what each sample shows, the stored shape and the stored entry's version together: changing any of them means raising the cations entry's version in src/app/activities.ts", () => {
    const state = createLab(1, 'guided')
    // A careful run of part 1 and, for each of the seven unknowns in the order seed 1 deals them, what a careful run records.
    const known = wholeRun(PINNED_MODEL, state, 'known')
    let lab = state
    const unknowns: string[] = []
    for (let index = 0; index < 7; index++) {
      lab = wholeRun(PINNED_MODEL, lab, 'unknown')
      unknowns.push(`${sampleOf(1, 'unknown', index).join('+')}: ${partView(PINNED_MODEL, lab, 'unknown').steps.map((step) => step.observation!.solid).join(', ')}`)
      lab = { ...lab, parts: { ...lab.parts, unknown: [...lab.parts.unknown, { index: index + 1, events: [] }] } }
    }
    const cold = wholeRun(PINNED_MODEL, createLab(1, 'challenge'), 'unknown', { heat: false })
    expect({
      ...CATIONS_PROGRESS,
      model: modelFrom(cationsData),
      order: unknownOrder(1),
      second: unknownOrder(2),
      tubes: STEP_TUBES,
      fields: FIELDS,
      looks: LOOKS,
      limits: [MAX_RUNS, MAX_EVENTS],
      known: currentRun(known, 'known').events.map((event) => (event.t === 'observe' ? `observe ${event.solid}/${event.liquid}` : event.t === 'place' ? `place ${event.place}:${event.tile}` : event.t === 'look' ? `look ${event.at}` : event.t)),
      unknowns,
      cold: partView(PINNED_MODEL, cold, 'unknown').steps.map((step) => `${step.observation!.solid}/${step.observation!.liquid}`),
      state,
    }).toEqual({
      entry: 'lab:cations',
      version: 1,
      model: {
        leadChlorideColdPerMillilitre: 35958,
        leadChlorideHotPerMillilitre: 120460,
        solidLook: { 'silver-chloride': 'white', 'lead-chloride': 'white', 'mercury-i-chloride': 'white', 'lead-chromate': 'yellow', 'mercury-and-amidochloride': 'grey to black', 'lead-hydroxide': 'white' },
        plainLook: 'colourless',
        chromateLook: 'yellow to orange',
        solidChoices: ['none', 'white', 'yellow', 'grey to black'],
        liquidChoices: ['colourless', 'yellow to orange'],
        sampleMicrolitres: 1500,
        ionNanomoles: 50000,
        hydrochloricAcidMicrolitres: 200,
        chlorideNanomoles: 1200000,
        waterMicrolitres: 750,
        aceticAcidMicrolitres: 50,
        chromateMicrolitres: 200,
        chromateNanomoles: 100000,
        ammoniaMicrolitres: 750,
        ammoniaNanomoles: 4500000,
        nitricAcidMicrolitres: 400,
        nitricAcidNanomoles: 2400000,
        nitricAcidAdditions: 4,
        tiles: ['silver-chloride', 'lead-chloride', 'mercury-i-chloride', 'lead-chromate', 'mercury-and-amidochloride', 'silver-ion', 'lead-ion', 'mercury-i-ion', 'silver-ammonia-ion'],
        places: [
          { id: 'precipitate-solid', step: 0, layer: 'solid', holds: ['silver-chloride', 'lead-chloride', 'mercury-i-chloride'] },
          { id: 'extract-lead-solid', step: 1, layer: 'solid', holds: ['silver-chloride', 'mercury-i-chloride'] },
          { id: 'extract-lead-liquid', step: 1, layer: 'liquid', holds: ['lead-ion'] },
          { id: 'confirm-lead-solid', step: 2, layer: 'solid', holds: ['lead-chromate'] },
          { id: 'separate-solid', step: 3, layer: 'solid', holds: ['mercury-and-amidochloride'] },
          { id: 'separate-liquid', step: 3, layer: 'liquid', holds: ['silver-ammonia-ion'] },
          { id: 'confirm-silver-solid', step: 4, layer: 'solid', holds: ['silver-chloride'] },
        ],
      },
      order: [1, 5, 6, 3, 2, 0, 4],
      second: [0, 4, 3, 2, 6, 1, 5],
      tubes: ['a', 'a', 'b', 'a', 'c'],
      fields: ['solid', 'liquid'],
      looks: ['liquid', 'bottom'],
      limits: [200, 500],
      known: [
        ...['add', 'spin', 'look liquid', 'look bottom', 'observe white/colourless', 'place precipitate-solid:silver-chloride', 'place precipitate-solid:lead-chloride', 'place precipitate-solid:mercury-i-chloride', 'check', 'pour'],
        ...['add', 'heat', 'spin', 'look liquid', 'look bottom', 'observe white/colourless', 'place extract-lead-solid:silver-chloride', 'place extract-lead-solid:mercury-i-chloride', 'place extract-lead-liquid:lead-ion', 'check', 'pour'],
        ...['add', 'spin', 'look liquid', 'look bottom', 'observe yellow/yellow to orange', 'place confirm-lead-solid:lead-chromate', 'check'],
        ...['add', 'spin', 'look liquid', 'look bottom', 'observe grey to black/colourless', 'place separate-solid:mercury-and-amidochloride', 'place separate-liquid:silver-ammonia-ion', 'check', 'pour'],
        ...['add', 'litmus', 'add', 'litmus', 'spin', 'look liquid', 'look bottom', 'observe white/colourless', 'place confirm-silver-solid:silver-chloride', 'check'],
      ],
      unknowns: [
        'lead: white, none, yellow, none, none',
        'lead+mercury-i: white, white, yellow, grey to black, none',
        'silver+lead+mercury-i: white, white, yellow, grey to black, white',
        'silver+lead: white, white, yellow, none, white',
        'mercury-i: white, white, none, grey to black, none',
        'silver: white, white, none, none, white',
        'silver+mercury-i: white, white, none, grey to black, white',
      ],
      // The first unknown of seed 1, lead alone, with the water of step 2 poured off cold: the white solid is still there at step 4.
      cold: ['white/colourless', 'white/colourless', 'yellow/yellow to orange', 'white/colourless', 'none/colourless'],
      state: { seed: 1, mode: 'guided', status: 'in-progress', parts: { known: [{ index: 0, events: [] }], unknown: [{ index: 0, events: [] }] } },
    })
    // The model the tests are pinned against is the one the stored record gives.
    expect(modelFrom(cationsData)).toEqual(PINNED_MODEL)
  })
})
