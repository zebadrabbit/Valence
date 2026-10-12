import { describe, expect, it } from 'vitest'
import { ACTIVITIES, MIXING_PROGRESS } from './app/activities'
import { FAMILIES, mixingData, PAIR_IDS } from './chem-data/mixing/data'
import { modelFrom, STAGES, topOf } from './engine/mixing/model'
import { PINNED_MODEL } from './engine/mixing/pinnedModel'
import { createLab, LAYERS, MAX_TRIES, SOLID_SEEN } from './engine/mixing/state'
import { wholeLab } from './engine/mixing/testkit'

// A stored lab holds what the learner did at each tube and in part 3: which liquid there is more of, how far the
// tube has come, what was recorded of it and whether it was checked. It holds nothing of what a tube shows, no
// family and no mark: those are worked out again from the model each time the lab is loaded, and every answer is
// judged again against it. So a change to whether a pair mixes, to a density, to whether a solid dissolves, to a
// family, to a question's choices or its answer, to the tubes on the bench, to the counts that finish a part or to
// the stored shape would regrade a lab that is already stored, or refuse it, unless the stored entry's version
// changes with it.
describe('the polarity and mixing lab', () => {
  it("pins the model, the liquid on top of each pair, the choices, the stored shape and the stored entry's version together: changing any of them means raising the mixing entry's version in src/app/activities.ts", () => {
    const careful = wholeLab(PINNED_MODEL, createLab('challenge'))
    const fresh = createLab('guided')
    expect({
      ...MIXING_PROGRESS,
      model: modelFrom(mixingData),
      tops: PAIR_IDS.map((id) => `${id}: ${topOf(PINNED_MODEL, id) ?? 'one layer'}`),
      choices: [LAYERS, SOLID_SEEN, FAMILIES, STAGES, MAX_TRIES],
      careful: { ...careful, pairs: { 'water+vegetable-oil': careful.pairs['water+vegetable-oil'], 'vegetable-oil+mineral-oil': careful.pairs['vegetable-oil+mineral-oil'] }, solids: { 'salt-in-water': careful.solids['salt-in-water'], 'sugar-in-mineral-oil': careful.solids['sugar-in-mineral-oil'] } },
      fresh: { ...fresh, pairs: { 'water+vinegar': fresh.pairs['water+vinegar'] }, solids: { 'salt-in-water': fresh.solids['salt-in-water'] } },
      tubes: [Object.keys(fresh.pairs), Object.keys(fresh.solids)],
    }).toEqual({
      entry: 'lab:polarity-and-mixing',
      version: 1,
      model: PINNED_MODEL,
      tops: [
        'water+rubbing-alcohol: one layer',
        'water+vinegar: one layer',
        'water+vegetable-oil: vegetable-oil',
        'water+mineral-oil: mineral-oil',
        'rubbing-alcohol+vinegar: one layer',
        'rubbing-alcohol+vegetable-oil: rubbing-alcohol',
        'vinegar+vegetable-oil: vegetable-oil',
        'vinegar+mineral-oil: mineral-oil',
        'vegetable-oil+mineral-oil: one layer',
      ],
      choices: [['one', 'two'], ['gone', 'left'], ['water', 'oil'], ['empty', 'in', 'shaken', 'stood'], 99],
      careful: {
        mode: 'challenge',
        status: 'completed',
        pairs: {
          'water+vegetable-oil': { tries: 0, more: 'water', shaken: true, stood: true, looked: true, layers: 'two', top: 'vegetable-oil', checked: true },
          'vegetable-oil+mineral-oil': { tries: 0, more: null, shaken: false, stood: false, looked: false, layers: null, top: null, checked: false },
        },
        solids: {
          'salt-in-water': { tries: 0, added: true, shaken: true, stood: true, looked: true, solid: 'gone', checked: true },
          'sugar-in-mineral-oil': { tries: 0, added: false, shaken: false, stood: false, looked: false, solid: null, checked: false },
        },
        rule: { tries: 0, sorted: { water: 'water', 'rubbing-alcohol': 'water', vinegar: 'water', 'vegetable-oil': 'oil', 'mineral-oil': 'oil' }, answers: { grease: 'stays-apart', 'epsom-salt': 'stays-solid' }, checked: true },
      },
      fresh: {
        mode: 'guided',
        status: 'in-progress',
        pairs: { 'water+vinegar': { tries: 0, more: null, shaken: false, stood: false, looked: false, layers: null, top: null, checked: false } },
        solids: { 'salt-in-water': { tries: 0, added: false, shaken: false, stood: false, looked: false, solid: null, checked: false } },
        rule: { tries: 0, sorted: { water: null, 'rubbing-alcohol': null, vinegar: null, 'vegetable-oil': null, 'mineral-oil': null }, answers: { grease: null, 'epsom-salt': null }, checked: false },
      },
      tubes: [
        ['water+rubbing-alcohol', 'water+vinegar', 'water+vegetable-oil', 'water+mineral-oil', 'rubbing-alcohol+vinegar', 'rubbing-alcohol+vegetable-oil', 'vinegar+vegetable-oil', 'vinegar+mineral-oil', 'vegetable-oil+mineral-oil'],
        ['salt-in-water', 'salt-in-vinegar', 'salt-in-vegetable-oil', 'salt-in-mineral-oil', 'sugar-in-water', 'sugar-in-vinegar', 'sugar-in-vegetable-oil', 'sugar-in-mineral-oil'],
      ],
    })
    // Guided stores the same lab: it adds each check by itself where Challenge is asked for it.
    expect({ ...wholeLab(PINNED_MODEL, createLab('guided')), mode: 'challenge' }).toEqual(careful)
  })

  it('has a stored entry of its own, which is the one its row among the activities loads and saves with, at its own address', () => {
    expect({ entry: ACTIVITIES[12].entry, version: ACTIVITIES[12].version }).toEqual(MIXING_PROGRESS)
    expect(ACTIVITIES[12].to).toBe('/lab/polarity-and-mixing')
    expect(ACTIVITIES[12].title).toBe('Polarity and mixing')
    expect(new Set(ACTIVITIES.map((activity) => activity.entry as string)).size).toBe(ACTIVITIES.length)
  })
})
