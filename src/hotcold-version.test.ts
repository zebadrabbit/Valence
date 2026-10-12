import { describe, expect, it } from 'vitest'
import { ACTIVITIES, HOTCOLD_PROGRESS } from './app/activities'
import { hotcoldData } from './chem-data/hotcold/data'
import { modelFrom } from './engine/hotcold/model'
import { PINNED_MODEL } from './engine/hotcold/pinnedModel'
import { runSetup } from './engine/hotcold/setup'
import { answerTo, createLab, QUESTIONS } from './engine/hotcold/state'
import { wholeLab } from './engine/hotcold/testkit'
import { CHOICES, FIELDS } from './engine/hotcold/worksheet'

// A stored lab holds the seed, what the learner did to each cup as counts of the logger's steps, what was entered
// in each notebook and the two answers of part 3. It holds no reading, no mark and no answer's rightness: those
// are worked out again from the seed and the model each time the lab is loaded. So a change to an enthalpy, a
// molar mass, the water, a parameter of the cup, a range a seed draws from, the order of the draws, the notebook's
// entries or the stored shape would redraw or regrade a lab that is already stored, or refuse it, unless the
// stored entry's version changes with it.
describe('the endothermic and exothermic lab', () => {
  it("pins the model, the draws of a seed, the notebook, part 3's answers, the stored shape and the stored entry's version together: changing any of them means raising the hotcold entry's version in src/app/activities.ts", () => {
    expect({
      ...HOTCOLD_PROGRESS,
      model: modelFrom(hotcoldData),
      draws: [runSetup(PINNED_MODEL, 1, 'epsom-salt', 0), runSetup(PINNED_MODEL, 1, 'calcium-chloride', 0), runSetup(PINNED_MODEL, 1, 'epsom-salt', 1)],
      notebook: [FIELDS, CHOICES],
      answers: QUESTIONS.map((question) => [question, answerTo(PINNED_MODEL, question)]),
      careful: wholeLab(PINNED_MODEL, createLab(1, 'challenge')),
      fresh: createLab(1, 'guided'),
    }).toEqual({
      entry: 'lab:endothermic-and-exothermic',
      version: 1,
      model: PINNED_MODEL,
      draws: [
        { startTenths: 225, saltCg: 960 },
        { startTenths: 221, saltCg: 420 },
        { startTenths: 239, saltCg: 982 },
      ],
      notebook: [['start', 'extreme', 'change', 'temperature', 'heat', 'word'], { temperature: ['warmer', 'colder'], heat: ['out', 'in'], word: ['exothermic', 'endothermic'] }],
      answers: [
        ['warms', 'calcium-chloride'],
        ['cools', 'epsom-salt'],
      ],
      careful: {
        seed: 1,
        mode: 'challenge',
        status: 'completed',
        runs: {
          'epsom-salt': [{ index: 0, lidFrom: 0, stirFrom: 0, logger: true, changedAt: 2, steps: 10, looked: [2, 4], entries: { start: 225, extreme: 198, change: 27, temperature: 'colder', heat: 'in', word: 'endothermic' }, closed: true }],
          'calcium-chloride': [{ index: 0, lidFrom: 0, stirFrom: 0, logger: true, changedAt: 2, steps: 6, looked: [2, 5], entries: { start: 221, extreme: 349, change: 128, temperature: 'warmer', heat: 'out', word: 'exothermic' }, closed: true }],
        },
        packs: { warms: 'calcium-chloride', cools: 'epsom-salt', checked: true },
      },
      fresh: {
        seed: 1,
        mode: 'guided',
        status: 'in-progress',
        runs: {
          'epsom-salt': [{ index: 0, lidFrom: null, stirFrom: null, logger: false, changedAt: null, steps: 0, looked: [], entries: { start: null, extreme: null, change: null, temperature: null, heat: null, word: null }, closed: false }],
          'calcium-chloride': [{ index: 0, lidFrom: null, stirFrom: null, logger: false, changedAt: null, steps: 0, looked: [], entries: { start: null, extreme: null, change: null, temperature: null, heat: null, word: null }, closed: false }],
        },
        packs: { warms: null, cools: null, checked: false },
      },
    })
    // Guided stores the same lab: it checks each notebook and part 3 by itself where Challenge is asked for it.
    expect({ ...wholeLab(PINNED_MODEL, createLab(1, 'guided')), mode: 'challenge' }).toEqual(wholeLab(PINNED_MODEL, createLab(1, 'challenge')))
  })

  it('has a stored entry of its own, which is the one its row among the activities loads and saves with, at its own address', () => {
    expect({ entry: ACTIVITIES[13].entry, version: ACTIVITIES[13].version }).toEqual(HOTCOLD_PROGRESS)
    expect(ACTIVITIES[13].to).toBe('/lab/endothermic-and-exothermic')
    expect(ACTIVITIES[13].title).toBe('Endothermic and exothermic')
    expect(new Set(ACTIVITIES.map((activity) => activity.entry as string)).size).toBe(ACTIVITIES.length)
  })
})
