// The phase's first test (spec 14): the endpoint acceptance of spec 7.4 on the flask chemistry alone, before any state machine.
import { describe, expect, it } from 'vitest'
import { compareToEquivalence, equivalenceUl, flaskChemistry, isOvershot, isPink, plume, type Flask } from './flask'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, trialSetup } from './setup'

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const DROPS = [2, 3]
const SEED_LOOP_TIMEOUT = 60_000

/** The flask of a seed's first trial, with clean glassware and nothing delivered yet. */
function seededFlask(seed: number, indicatorDrops: number): Flask {
  return {
    ...labSetup(m, seed),
    aliquotUl: trialSetup(m, seed, 0).aliquotUl,
    aliquotPercent: 100,
    titrantPercent: 100,
    indicatorDrops,
    waterUl: 0,
    deliveredUl: 0,
  }
}

const pinkAt = (flask: Flask, deliveredUl: number) => flaskChemistry(m, { ...flask, deliveredUl }).pinkConcentration

/**
 * The careful run of spec 7.4 on the microlitre grid: stream while the addition stays 2.00 mL short of equivalence,
 * drops while it stays 0.20 mL short, then half-drops until the mixed flask is pink. Returns the delivered volume
 * after each addition.
 */
function carefulVolumes(flask: Flask): number[] {
  const volumes: number[] = []
  let v = 0
  const staysShort = (addUl: number, marginUl: number) => compareToEquivalence({ ...flask, deliveredUl: v + addUl }, -marginUl) <= 0
  while (staysShort(m.streamUl, 2000)) volumes.push((v += m.streamUl))
  while (staysShort(m.dropUl, 200)) volumes.push((v += m.dropUl))
  do {
    volumes.push((v += m.halfDropUl))
    if (v > m.buretteCapacityUl) throw new Error('no endpoint')
  } while (!isPink(m, { ...flask, deliveredUl: v }))
  return volumes
}

describe('the pinned model', () => {
  it('gives the two derived concentrations', () => {
    expect(m.indicatorMolarity.toExponential(4)).toBe('1.5708e-2')
    expect(m.dissolvedCo2.toExponential(4)).toBe('1.4663e-5')
  })
})

describe('equivalence, in whole numbers', () => {
  const flask = seededFlask(1, 2) // 0.0976 M x 25.002 mL / 0.09502 M

  it("gives the flask's own equivalence volume", () => {
    expect(equivalenceUl(flask).toFixed(2)).toBe('25680.86')
    expect(equivalenceUl({ ...flask, titrantPercent: 98 }).toFixed(2)).toBe('26204.96')
    expect(equivalenceUl({ ...flask, aliquotPercent: 98 }).toFixed(2)).toBe('25167.24')
    expect(equivalenceUl({ ...flask, waterUl: 30000, indicatorDrops: 3 })).toBe(equivalenceUl(flask))
  })

  it('compares a delivered volume with it exactly', () => {
    expect([25675, 25700].map((deliveredUl) => compareToEquivalence({ ...flask, deliveredUl }))).toEqual([-1, 1])
    // 0.1000 M x 25.000 mL / 0.10000 M is 25 000 uL exactly
    const exact: Flask = { ...flask, hclE4: 1000, naohE5: 10000, aliquotUl: 25000 }
    expect([24999, 25000, 25001].map((deliveredUl) => compareToEquivalence({ ...exact, deliveredUl }))).toEqual([-1, 0, 1])
    expect([25100, 25101].map((deliveredUl) => isOvershot(m, { ...exact, deliveredUl }))).toEqual([false, true])
  })
})

describe('endpoint acceptance (spec 7.4 check 3), flask chemistry only', () => {
  it.each([
    { drops: 2, past: ['11.21', '35.03'], firstOrSecond: [56, 44], largestPinkBefore: '2.54e-12' },
    { drops: 3, past: ['11.21', '36.33'], firstOrSecond: [54, 46], largestPinkBefore: '3.79e-12' },
  ])(
    'seeds 1-100 at $drops drops: colourless before equivalence, pink within 0.05 mL after it, not overshot',
    ({ drops, past, firstOrSecond, largestPinkBefore }) => {
      const pastUl: number[] = []
      const landedOn = [0, 0, 0] // the endpoint as the first, second or a later addition at or past equivalence
      let pinkBefore = 0
      for (const seed of SEEDS) {
        const flask = seededFlask(seed, drops)
        const volumes = carefulVolumes(flask)
        for (const deliveredUl of volumes.slice(0, -1)) expect(isPink(m, { ...flask, deliveredUl })).toBe(false)
        const end = { ...flask, deliveredUl: volumes.at(-1)! }
        expect(isPink(m, end)).toBe(true)
        expect(compareToEquivalence(end)).toBeGreaterThanOrEqual(0)
        expect(isOvershot(m, end)).toBe(false)
        pastUl.push(end.deliveredUl - equivalenceUl(end))
        const before = volumes.filter((deliveredUl) => compareToEquivalence({ ...flask, deliveredUl }) < 0)
        landedOn[Math.min(volumes.length - before.length, 3) - 1]! += 1
        pinkBefore = Math.max(pinkBefore, ...before.map((deliveredUl) => pinkAt(flask, deliveredUl)))
      }
      expect(Math.min(...pastUl)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...pastUl)).toBeLessThanOrEqual(50)
      expect([Math.min(...pastUl).toFixed(2), Math.max(...pastUl).toFixed(2)]).toEqual(past)
      expect(landedOn).toEqual([...firstOrSecond, 0])
      expect(pinkBefore.toExponential(2)).toBe(largestPinkBefore)
    },
    SEED_LOOP_TIMEOUT,
  )

  it(
    'takes 121 to 148 additions, and is nowhere near the threshold at any of them',
    () => {
      const lengths: number[] = []
      let closest = Infinity
      for (const drops of DROPS) {
        for (const seed of SEEDS) {
          const flask = seededFlask(seed, drops)
          const volumes = carefulVolumes(flask)
          lengths.push(volumes.length)
          for (const deliveredUl of volumes) closest = Math.min(closest, Math.abs(pinkAt(flask, deliveredUl) / m.faintPinkConcentration - 1))
        }
      }
      expect([Math.min(...lengths), Math.max(...lengths)]).toEqual([121, 148])
      // Measured 0.0099: the nearest miss is 1% off the threshold, so the last bit of a floating-point number cannot decide a result.
      expect(closest).toBeGreaterThan(0.001)
    },
    SEED_LOOP_TIMEOUT,
  )

  it('pins the flask of seed 1 around its equivalence volume', () => {
    const flask = seededFlask(1, 2)
    const volumes = carefulVolumes(flask)
    expect(volumes).toHaveLength(143)
    expect(volumes.slice(-3)).toEqual([25650, 25675, 25700])
    const at = (deliveredUl: number) => {
      const c = flaskChemistry(m, { ...flask, deliveredUl })
      return [c.pH.toFixed(2), c.pinkConcentration.toExponential(1)]
    }
    expect(at(0)).toEqual(['1.01', '1.9e-21'])
    expect(at(23680)).toEqual(['2.41', '6.0e-19'])
    expect(at(25650)).toEqual(['4.24', '2.6e-15'])
    expect(at(25675)).toEqual(['4.95', '6.9e-14'])
    expect(at(25700)).toEqual(['8.96', '3.5e-6'])
    expect(at(25725)).toEqual(['9.53', '1.4e-5'])
    expect(at(25800)).toEqual(['10.19', '2.5e-5'])
    expect(flaskChemistry(m, { ...flask, deliveredUl: 25700 }).volumeUl).toBe(50802)
  })

  it('more indicator gives a deeper pink at the same excess, and none gives no pink', () => {
    const pink = (indicatorDrops: number) => pinkAt(seededFlask(1, indicatorDrops), 25800)
    expect(pink(3)).toBeGreaterThan(pink(2))
    expect(pink(0)).toBe(0)
    expect(isPink(m, { ...seededFlask(1, 0), deliveredUl: 25800 })).toBe(false)
  })
})

describe('endpoint, whatever the grid offset (spec 7.4 check 4, the corners)', () => {
  /** Microlitres of titrant past equivalence at which the mixed flask reaches the threshold; the volume need not be whole. */
  function excessToThreshold(flask: Flask): number {
    const equivalence = equivalenceUl(flask)
    let lo = -100
    let hi = 100
    expect(isPink(m, { ...flask, deliveredUl: equivalence + lo })).toBe(false)
    expect(isPink(m, { ...flask, deliveredUl: equivalence + hi })).toBe(true)
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2
      if (isPink(m, { ...flask, deliveredUl: equivalence + mid })) hi = mid
      else lo = mid
    }
    return hi
  }

  // HCl outermost, then NaOH, the pipette innermost; low before high in each.
  const corners = (indicatorDrops: number) =>
    m.hclRangeE4.flatMap((hclE4) =>
      m.naohRangeE5.flatMap((naohE5) =>
        [-m.pipetteOffsetUl, m.pipetteOffsetUl].map((offset) =>
          excessToThreshold({
            hclE4,
            naohE5,
            aliquotUl: m.pipetteNominalUl + offset,
            aliquotPercent: 100,
            titrantPercent: 100,
            indicatorDrops,
            waterUl: 0,
            deliveredUl: 0,
          }),
        ),
      ),
    )

  it.each([
    [2, ['10.918', '10.941', '9.644', '9.664', '11.564', '11.589', '10.169', '10.191']],
    [3, ['11.588', '11.611', '10.255', '10.275', '12.215', '12.239', '10.768', '10.789']],
  ])('at %i drops the threshold is reached more than 0 and at most 0.025 mL past equivalence', (drops, expected) => {
    const excess = corners(drops)
    expect(excess.map((x) => x.toFixed(3))).toEqual(expected)
    expect(Math.min(...excess)).toBeGreaterThan(0)
    expect(Math.max(...excess)).toBeLessThanOrEqual(m.halfDropUl)
  })
})

describe('plume', () => {
  it('is the share of the acid still in the flask that the addition neutralised (seed 1)', () => {
    const flask = seededFlask(1, 2) // equivalence at 25 680.86 uL
    const row = (deliveredUl: number, addedUl: number) => {
      const p = plume(m, { ...flask, deliveredUl }, addedUl)
      return [p.fraction.toFixed(3), p.status, p.fadeSeconds === null ? null : p.fadeSeconds.toFixed(1)]
    }
    expect(row(250, m.streamUl)).toEqual(['0.010', 'fades-at-once', '0.1'])
    expect(row(23250, m.streamUl)).toEqual(['0.093', 'fades-at-once', '0.9'])
    expect(row(23500, m.streamUl)).toEqual(['0.103', 'fades-slowly', '1.0'])
    expect(row(23750, m.dropUl)).toEqual(['0.025', 'fades-at-once', '0.3'])
    expect(row(25200, m.dropUl)).toEqual(['0.094', 'fades-at-once', '0.9'])
    expect(row(25250, m.dropUl)).toEqual(['0.104', 'fades-slowly', '1.0'])
    expect(row(25475, m.halfDropUl)).toEqual(['0.108', 'fades-slowly', '1.1'])
    expect(row(25675, m.halfDropUl)).toEqual(['0.810', 'fades-slowly', '8.1'])
    expect(row(25700, m.halfDropUl)).toEqual(['1.000', 'persists', null])
  })
})
