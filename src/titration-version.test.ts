import { describe, expect, it } from 'vitest'
import { ACTIVITIES } from './app/activities'
import { PINNED_MODEL } from './engine/titration/pinnedModel'
import { labSetup, trialSetup } from './engine/titration/setup'

// A stored run holds a seed and what the learner did, not the solutions: those are worked out again from the seed
// each time the run is loaded, and judged against the model. So a change to the draw or to a judged value would
// regrade a run that is already stored, unless the stored entry's version changes with it.
describe('the titration lab', () => {
  it("pins the model, the draw and the stored entry's version together: changing any of them means raising the titration entry's version in src/app/activities.ts", () => {
    const [{ entry, version }] = ACTIVITIES
    expect({ entry, version, model: PINNED_MODEL, lab: labSetup(PINNED_MODEL, 1), trial: trialSetup(PINNED_MODEL, 1, 0) }).toEqual({
      entry: 'lab:titration',
      version: 1,
      model: {
        kw: 1e-14,
        indicatorPKas: [9.05, 9.5],
        indicatorMolarity: 0.015708451146716932,
        indicatorDropUl: 50,
        dissolvedCo2: 0.00001466282181,
        carbonicPKas: [6.35, 10.33],
        faintPinkConcentration: 1e-6,
        hclRangeE4: [850, 1050],
        naohRangeE5: [9500, 10500],
        pipetteNominalUl: 25000,
        pipetteOffsetUl: 30,
        fillLevelMaxUl: 2000,
        buretteCapacityUl: 50000,
        streamUl: 250,
        dropUl: 50,
        halfDropUl: 25,
        unconditionedStrengthPercent: 98,
        wetPipetteStrengthPercent: 98,
        tipBubbleUl: 600,
        tipBubbleEscapeUl: 5000,
        overshootUl: 100,
        slowDownUl: 1000,
        readingToleranceUl: 20,
        gradeTolerancePercent: 1,
        molarityRoundingE6: 50,
        waterStepUl: 10000,
        waterMaxUl: 30000,
        indicatorDrops: [2, 3],
        plumeSlowFrom: 0.1,
        plumeMixSeconds: 10,
        persistSeconds: 30,
        passesToComplete: 3,
      },
      lab: { hclE4: 976, naohE5: 9502 },
      trial: { aliquotUl: 25002, fillLevelUl: 1963 },
    })
  })
})
