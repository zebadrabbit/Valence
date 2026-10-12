import { describe, expect, it } from 'vitest'
import { ACTIVITIES, CABBAGE_PROGRESS } from './app/activities'
import { cabbageData } from './chem-data/cabbage/data'
import { CANNOT_SAY, CLASSES, modelFrom } from './engine/cabbage/model'
import { PINNED_MODEL } from './engine/cabbage/pinnedModel'
import { sampleView } from './engine/cabbage/select'
import { labSetup, readingTenths } from './engine/cabbage/setup'
import { createLab, MAX_TRIES, POWERS, unitQuestions } from './engine/cabbage/state'
import { wholeLab, wholeSample, wholeScale } from './engine/cabbage/testkit'

// A stored lab holds the seed, what the learner did at the rack, at each household thing and at the closing
// questions, and where the probe was last. It holds no pH, no colour and no mark: those are worked out again from
// the seed each time the lab is loaded, and every answer is judged again against the model. So a change to the
// draw, to a thing's range or the order of the things, to the table of colours or its edges, to what an unrinsed
// probe reads, to what makes a sample count, to how the closing questions are drawn or to the stored shape would
// regrade a lab that is already stored, or refuse it, unless the stored entry's version changes with it.
describe('the red cabbage pH lab', () => {
  it("pins the model, the draw, the unrinsed reading, the closing questions, the stored shape and the stored entry's version together: changing any of them means raising the red cabbage entry's version in src/app/activities.ts", () => {
    const careful = wholeLab(PINNED_MODEL, createLab('challenge', 1))
    const unrinsed = wholeSample(PINNED_MODEL, wholeSample(PINNED_MODEL, wholeScale(PINNED_MODEL, createLab('challenge', 1)), 'lemon-juice'), 'drain-cleaner', { rinse: false })
    expect({
      ...CABBAGE_PROGRESS,
      model: modelFrom(cabbageData),
      lab: [labSetup(PINNED_MODEL, 1), labSetup(PINNED_MODEL, 2)],
      unrinsed: [readingTenths(PINNED_MODEL, labSetup(PINNED_MODEL, 1), 'drain-cleaner', 'lemon-juice'), sampleView(PINNED_MODEL, unrinsed, 'drain-cleaner').reasons, unrinsed.samples['drain-cleaner']],
      questions: unitQuestions(PINNED_MODEL, careful)!.map((q) => `${q.items.map((item) => (item.kind === 'thing' ? `${item.id} ${item.tenths}` : `buffer ${item.ph}`)).join(' / ')}: ${q.units}`),
      choices: [CANNOT_SAY, CLASSES, POWERS, MAX_TRIES],
      careful: { ...careful, samples: { vinegar: careful.samples.vinegar, bleach: careful.samples.bleach, 'epsom-salt': careful.samples['epsom-salt'] } },
      fresh: { ...createLab('guided', 1), samples: { vinegar: createLab('guided', 1).samples.vinegar } },
    }).toEqual({
      entry: 'lab:red-cabbage-ph',
      version: 1,
      model: PINNED_MODEL,
      lab: [
        { vinegar: 30, 'lemon-juice': 20, 'apple-juice': 37, ammonia: 114, shampoo: 68, conditioner: 35, 'laundry-detergent': 101, 'lab-detergent': 95, mouthwash: 68, antacid: 90, aspirin: 35, bleach: 97, 'drain-cleaner': 122, 'epsom-salt': 63 },
        { vinegar: 32, 'lemon-juice': 22, 'apple-juice': 35, ammonia: 113, shampoo: 67, conditioner: 35, 'laundry-detergent': 100, 'lab-detergent': 95, mouthwash: 76, antacid: 72, aspirin: 35, bleach: 96, 'drain-cleaner': 124, 'epsom-salt': 77 },
      ],
      unrinsed: [102, ['probe-unrinsed'], { tries: 0, indicator: true, looked: true, estimate: 13, is: 'basic', warned: false, reading: 'lemon-juice', checked: true }],
      questions: ['vinegar 30 / lemon-juice 20: 1', 'conditioner 35 / lab-detergent 95: 6'],
      choices: ['cannot-say', ['acid', 'neutral', 'basic'], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 99],
      careful: {
        mode: 'challenge',
        seed: 1,
        status: 'completed',
        scale: { tries: 0, indicator: true, looked: true, answers: { 'acid-end': 'red', neutral: 'dark blue', 'same-pair': 11 }, checked: true },
        samples: {
          vinegar: { tries: 0, indicator: true, looked: true, estimate: 3, is: 'acid', warned: false, reading: 'rinsed', checked: true },
          bleach: { tries: 0, indicator: false, looked: false, estimate: null, is: null, warned: false, reading: null, checked: false },
          'epsom-salt': { tries: 0, indicator: false, looked: false, estimate: null, is: null, warned: false, reading: null, checked: false },
        },
        probe: 'lab-detergent',
        counted: ['vinegar', 'lemon-juice', 'apple-juice', 'ammonia', 'shampoo', 'conditioner', 'laundry-detergent', 'lab-detergent'],
        unit: { tries: 0, answers: [{ more: 1, power: 1 }, { more: 0, power: 6 }], checked: true },
      },
      fresh: {
        mode: 'guided',
        seed: 1,
        status: 'in-progress',
        scale: { tries: 0, indicator: false, looked: false, answers: { 'acid-end': null, neutral: null, 'same-pair': null }, checked: false },
        samples: { vinegar: { tries: 0, indicator: false, looked: false, estimate: null, is: null, warned: false, reading: null, checked: false } },
        probe: null,
        counted: [],
        unit: { tries: 0, answers: [null, null], checked: false },
      },
    })
    // Guided stores the same lab: it adds each check by itself where Challenge is asked for it.
    expect({ ...wholeLab(PINNED_MODEL, createLab('guided', 1)), mode: 'challenge' }).toEqual(careful)
  })

  it('is not yet among the activities Home lists: it has no page', () => {
    expect(ACTIVITIES.map((activity): string => activity.entry)).not.toContain(CABBAGE_PROGRESS.entry)
  })
})
