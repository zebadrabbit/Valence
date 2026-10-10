import { describe, expect, it } from 'vitest'
import { LECHATELIER_PROGRESS } from './app/activities'
import { CAUSES, SYSTEM_IDS, WAYS, lechatelierData } from './chem-data/lechatelier/data'
import { modelFrom, type StageModel } from './engine/lechatelier/model'
import { PINNED_MODEL } from './engine/lechatelier/pinnedModel'
import { FIELDS, LOOKS } from './engine/lechatelier/run'
import { createLab, currentRun, MAX_EVENTS, MAX_RUNS } from './engine/lechatelier/state'
import { wholeSystem } from './engine/lechatelier/testkit'

// A stored run holds the list of what the learner did, not what a tube showed or whether anything was right: those
// are worked out again from the list each time the run is loaded, and every observation and answer is judged
// again against the model. So a change to a disturbance's portions, to what a tube shows at a stage, to a right
// answer, to a choice, to the order of the disturbances or to the stored shape would regrade a run that is already
// stored, or refuse it, unless the stored entry's version changes with it.
describe("the Le Chatelier's principle lab", () => {
  it("pins the model, what a careful run stores, the stored shape and the stored entry's version together: changing any of them means raising the Le Chatelier entry's version in src/app/activities.ts", () => {
    const state = createLab('guided')
    const stage = (s: StageModel) => `${s.liquid}/${s.solid} ${s.microlitres}${s.temperature === 'room' ? '' : ` ${s.temperature}`}`
    const model = modelFrom(lechatelierData)
    const careful = (mode: 'guided' | 'challenge') =>
      Object.fromEntries(
        SYSTEM_IDS.map((systemId) => [
          systemId,
          currentRun(wholeSystem(PINNED_MODEL, createLab(mode), systemId), systemId)
            .events.map((event) => (event.t === 'predict' ? `predict ${event.way}` : event.t === 'look' ? `look ${event.at}` : event.t === 'observe' ? `observe ${event.solid}/${event.liquid}` : event.t === 'answer' ? `answer ${event.is}` : event.t))
            .join(', '),
        ]),
      )
    expect({
      ...LECHATELIER_PROGRESS,
      choices: [model.solidChoices, model.liquidChoices],
      answers: [WAYS, CAUSES],
      fields: FIELDS,
      looks: LOOKS,
      limits: [MAX_RUNS, MAX_EVENTS],
      model: model.systems.map((system) => [system.id, ...system.disturbances.map((d) => `${d.id} in ${d.tube}: ${d.kind} x${d.portions}, ${stage(d.before)} -> ${d.stages.map(stage).join(' -> ')}; ${d.ask}: ${d.right}`)]),
      careful: careful('challenge'),
      state,
    }).toEqual({
      entry: 'lab:le-chatelier',
      version: 1,
      choices: [
        ['none', 'white'],
        ['colourless', 'yellow', 'between blue and yellow', 'blue', 'violet', 'pink'],
      ],
      answers: [
        ['left', 'right', 'none'],
        ['hydroxide', 'ammonia', 'nothing'],
      ],
      fields: ['solid', 'liquid'],
      looks: ['liquid', 'bottom'],
      limits: [200, 500],
      model: [
        [
          'lead-chloride',
          'lead-acid in lead: add x3, colourless/none 1500 -> colourless/none 1600 -> colourless/white 1700 -> colourless/white 1800; direction: right',
          'lead-heat in lead: heat x1, colourless/white 1800 -> colourless/none 1800 hot; direction: left',
          'lead-cool in lead: cool x1, colourless/none 1800 hot -> colourless/white 1800 cold; direction: right',
          'lead-water in lead: add x1, colourless/white 1800 cold -> colourless/none 4800; direction: left',
        ],
        [
          'methyl-violet',
          'indicator-acid in indicator: add x2, violet/none 1100 -> between blue and yellow/none 1250 -> yellow/none 1400; direction: left',
          'indicator-base in indicator: add x2, yellow/none 1400 -> between blue and yellow/none 1550 -> violet/none 1700; direction: right',
        ],
        [
          'cobalt',
          'cobalt-water in cobalt: add x1, blue/none 1500 -> violet/none 2500; direction: left',
          'cobalt-heat in cobalt: heat x1, violet/none 2500 -> blue/none 2500 hot; direction: right',
          'cobalt-cool in cobalt: cool x1, blue/none 2500 hot -> pink/none 2500 cold; direction: left',
        ],
        [
          'hydroxides',
          'zinc-drop in zinc: add x1, colourless/none 3000 -> colourless/white 3050; direction: right',
          'zinc-acid in zinc-acid: add x1, colourless/white 500 -> colourless/none 550; direction: left',
          'zinc-base in zinc-base: add x1, colourless/white 500 -> colourless/none 1500; cause: hydroxide',
          'zinc-ammonia in zinc-ammonia: add x1, colourless/white 500 -> colourless/none 4500; cause: ammonia',
          'magnesium-drop in magnesium: add x1, colourless/none 3000 -> colourless/white 3050; direction: right',
          'magnesium-acid in magnesium-acid: add x1, colourless/white 500 -> colourless/none 550; direction: left',
          'magnesium-base in magnesium-base: add x1, colourless/white 500 -> colourless/white 1500; cause: nothing',
          'magnesium-ammonia in magnesium-ammonia: add x1, colourless/white 500 -> colourless/white 4500; cause: nothing',
        ],
      ],
      careful: {
        'lead-chloride':
          'predict none, act, look liquid, look bottom, act, look liquid, look bottom, act, look liquid, look bottom, observe white/colourless, answer right, predict none, act, look liquid, look bottom, observe none/colourless, answer left, predict none, act, look liquid, look bottom, observe white/colourless, answer right, predict none, act, look liquid, look bottom, observe none/colourless, answer left, check',
        'methyl-violet': 'predict none, act, look liquid, look bottom, act, look liquid, look bottom, observe none/yellow, answer left, predict none, act, look liquid, look bottom, act, look liquid, look bottom, observe none/violet, answer right, check',
        cobalt: 'predict none, act, look liquid, look bottom, observe none/violet, answer left, predict none, act, look liquid, look bottom, observe none/blue, answer right, predict none, act, look liquid, look bottom, observe none/pink, answer left, check',
        hydroxides:
          'predict none, act, look liquid, look bottom, observe white/colourless, answer right, predict none, act, look liquid, look bottom, observe none/colourless, answer left, predict none, act, look liquid, look bottom, observe none/colourless, answer hydroxide, predict none, act, look liquid, look bottom, observe none/colourless, answer ammonia, predict none, act, look liquid, look bottom, observe white/colourless, answer right, predict none, act, look liquid, look bottom, observe none/colourless, answer left, predict none, act, look liquid, look bottom, observe white/colourless, answer nothing, predict none, act, look liquid, look bottom, observe white/colourless, answer nothing, check',
      },
      state: { mode: 'guided', status: 'in-progress', systems: { 'lead-chloride': [{ index: 0, events: [] }], 'methyl-violet': [{ index: 0, events: [] }], cobalt: [{ index: 0, events: [] }], hydroxides: [{ index: 0, events: [] }] } },
    })
    // Guided stores the same run: it adds the check by itself where Challenge is asked for it.
    expect(careful('guided')).toEqual(careful('challenge'))
    // The model the tests are pinned against is the one the stored record gives.
    expect(model).toEqual(PINNED_MODEL)
  })
})
