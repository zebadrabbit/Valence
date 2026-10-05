import { describe, expect, it } from 'vitest'
import { equivalenceUl } from './flask'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, trialSetup } from './setup'

describe('what the seed fixes', () => {
  it('pins seed 1 and its first four trials', () => {
    expect(labSetup(m, 1)).toEqual({ hclE4: 976, naohE5: 9502 })
    expect([0, 1, 2, 3].map((index) => trialSetup(m, 1, index))).toEqual([
      { aliquotUl: 25002, fillLevelUl: 1963 },
      { aliquotUl: 25029, fillLevelUl: 562 },
      { aliquotUl: 25007, fillLevelUl: 1442 },
      { aliquotUl: 24995, fillLevelUl: 1990 },
    ])
  })

  it('pins seeds 2, 11, 1384 and the largest seed', () => {
    expect(labSetup(m, 2)).toEqual({ hclE4: 997, naohE5: 9825 })
    expect(trialSetup(m, 2, 0)).toEqual({ aliquotUl: 24987, fillLevelUl: 1076 })
    expect(labSetup(m, 11)).toEqual({ hclE4: 952, naohE5: 10030 })
    expect(trialSetup(m, 11, 0)).toEqual({ aliquotUl: 25007, fillLevelUl: 1180 })
    expect(labSetup(m, 1384)).toEqual({ hclE4: 972, naohE5: 9959 })
    expect(trialSetup(m, 1384, 0)).toEqual({ aliquotUl: 24988, fillLevelUl: 612 })
    expect(trialSetup(m, 1384, 1)).toEqual({ aliquotUl: 24975, fillLevelUl: 963 })
    expect(labSetup(m, 4294967295)).toEqual({ hclE4: 1030, naohE5: 9689 })
    expect(trialSetup(m, 4294967295, 0)).toEqual({ aliquotUl: 25013, fillLevelUl: 1889 })
  })

  it('reaches both ends of each range of spec 7.1 over seeds 1 to 20 000, and nothing outside them', () => {
    const seen = { hcl: new Set<number>(), naoh: new Set<number>(), aliquot: new Set<number>(), fill: new Set<number>() }
    for (let seed = 1; seed <= 20000; seed++) {
      const lab = labSetup(m, seed)
      const trial = trialSetup(m, seed, 0)
      seen.hcl.add(lab.hclE4)
      seen.naoh.add(lab.naohE5)
      seen.aliquot.add(trial.aliquotUl)
      seen.fill.add(trial.fillLevelUl)
    }
    const ends = (set: Set<number>) => [Math.min(...set), Math.max(...set)]
    expect(ends(seen.hcl)).toEqual([850, 1050])
    expect(ends(seen.naoh)).toEqual([9500, 10500])
    expect(ends(seen.aliquot)).toEqual([24970, 25030])
    expect(ends(seen.fill)).toEqual([0, 2000])
  })

  it('keeps the equivalence volume between 20.21 and 27.67 mL at the corners of the ranges', () => {
    const volumes = m.hclRangeE4.flatMap((hclE4) =>
      m.naohRangeE5.flatMap((naohE5) =>
        [-m.pipetteOffsetUl, m.pipetteOffsetUl].map((offset) =>
          equivalenceUl({
            hclE4,
            naohE5,
            aliquotUl: m.pipetteNominalUl + offset,
            aliquotPercent: 100,
            titrantPercent: 100,
            indicatorDrops: 2,
            waterUl: 0,
            deliveredUl: 0,
          }),
        ),
      ),
    )
    // 0.0850 x 24.97 / 0.10500 = 20.2138 mL; 0.1050 x 25.03 / 0.09500 = 27.6647 mL
    expect([Math.min(...volumes).toFixed(1), Math.max(...volumes).toFixed(1)]).toEqual(['20213.8', '27664.7'])
    expect(Math.min(...volumes)).toBeGreaterThanOrEqual(20210)
    expect(Math.max(...volumes)).toBeLessThanOrEqual(27670)
  })
})
