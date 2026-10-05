import { describe, expect, it } from 'vitest'
import { titrationData } from '@/chem-data/titration/data'
import { modelFrom } from '@/engine/titration'
import { READING, readingGraduations, readingWindowTopUl, readingY, STAND, standGraduations, standY } from './buretteGeometry'

describe('the reading window', () => {
  it('starts five and a half graduations above the graduation at or just above the meniscus', () => {
    expect([24370, 24300, 24399].map(readingWindowTopUl)).toEqual([23750, 23750, 23750])
    expect(readingWindowTopUl(24400)).toBe(23850)
  })

  it('runs past both ends of the scale', () => {
    expect([0, 370, 2000].map(readingWindowTopUl)).toEqual([-550, -250, 1450])
    expect([49999, 50000].map(readingWindowTopUl)).toEqual([49350, 49450])
  })
})

describe('where a volume is drawn in the reading view', () => {
  it('puts the meniscus at its own level, to 0.001 mL', () => {
    expect(readingY(24370, 24370)).toBe(297.6)
    expect(readingY(24371, 24370)).toBe(298.08)
  })

  it('puts a larger volume lower down', () => {
    expect([24300, 24400, 24000, 24390, 24350].map((ul) => readingY(ul, 24370))).toEqual([264, 312, 120, 307.2, 288])
  })

  it('puts the level at the top of the middle gap at both ends of the scale', () => {
    expect(readingY(0, 0)).toBe(264)
    expect(readingY(50000, 50000)).toBe(264)
  })

  it('gives 0.01 mL 4.8 units, so the 0.02 mL allowed is 9.6 units either side', () => {
    const at = readingY(24370, 24370)
    expect(readingY(24380, 24370) - at).toBeCloseTo(4.8, 9)
    expect(readingY(24390, 24370) - at).toBeCloseTo(9.6, 9)
    expect(readingY(24350, 24370) - at).toBeCloseTo(-9.6, 9)
  })

  it('keeps the meniscus in the one gap in the middle of the view, at every level', () => {
    for (let level = 0; level <= 50000; level++) {
      const y = readingY(level, level)
      expect(y).toBeGreaterThanOrEqual(264)
      expect(y).toBeLessThan(312)
    }
  })

  it('fits the window in the view exactly', () => {
    expect((READING.spanUl * READING.unitsPerMl) / 1000).toBe(READING.height)
    expect(readingY(readingWindowTopUl(24370) + READING.spanUl, 24370)).toBe(READING.height)
  })
})

describe('the graduations in the reading view', () => {
  it.each([0, 370, 1999, 24370, 24950, 49999])('are at whole units, 48 apart, at level %i', (level) => {
    const ys = readingGraduations(level).map((g) => g.y)
    expect(ys.every(Number.isInteger)).toBe(true)
    expect(ys.slice(1).map((y, i) => y - ys[i]!)).toEqual(ys.slice(1).map(() => 48))
  })

  it('are twelve round a meniscus in the middle of the scale, one of them numbered', () => {
    const marks = readingGraduations(24370)
    expect(marks.map((g) => g.ul)).toEqual([23800, 23900, 24000, 24100, 24200, 24300, 24400, 24500, 24600, 24700, 24800, 24900])
    expect(marks.map((g) => g.y)).toEqual([24, 72, 120, 168, 216, 264, 312, 360, 408, 456, 504, 552])
    expect(marks.filter((g) => g.label !== null)).toEqual([{ ul: 24000, y: 120, kind: 'ml', label: '24' }])
    expect(marks.find((g) => g.ul === 24500)?.kind).toBe('half')
    expect(marks.find((g) => g.ul === 24300)?.kind).toBe('tenth')
  })

  const labels = (level: number) => readingGraduations(level).flatMap((g) => g.label ?? [])

  it('show two numbers when the meniscus is near a half', () => {
    expect(labels(24520)).toEqual(['24', '25'])
    expect(labels(24460)).toEqual(['24', '25'])
  })

  it('always include a numbered mark to count from', () => {
    for (let level = 0; level <= 50000; level++) expect(labels(level).length).toBeGreaterThanOrEqual(1)
  })

  it('number a whole-mL mark and no other', () => {
    for (const level of [0, 370, 24370, 49999, 50000])
      for (const g of readingGraduations(level)) expect(g.label).toBe(g.kind === 'ml' ? String(g.ul / 1000) : null)
  })

  it('leave the tube bare above the 0 mark', () => {
    const marks = readingGraduations(120)
    expect(marks.map((g) => g.ul)).toEqual([0, 100, 200, 300, 400, 500, 600, 700])
    expect(marks[0]).toEqual({ ul: 0, y: 216, kind: 'ml', label: '0' })
  })

  it('leave the tube bare below the 50 mark', () => {
    expect(readingGraduations(49950).map((g) => g.ul)).toEqual([49400, 49500, 49600, 49700, 49800, 49900, 50000])
  })
})

describe('the whole burette on its stand', () => {
  it('has the 0 mark at 40 and the 50 mark at 460', () => {
    expect([0, 50000, 25000].map(standY)).toEqual([40, 460, 250])
    expect(standY(24370)).toBeCloseTo(244.708, 9)
    expect(standY(50000)).toBeLessThan(STAND.height)
  })

  it('has a mark at every mL, longer at every 5 and numbered at every 10', () => {
    const marks = standGraduations()
    expect(marks.map((g) => g.ul)).toEqual(Array.from({ length: 51 }, (_, ml) => ml * 1000))
    expect(marks.flatMap((g) => g.label ?? [])).toEqual(['0', '10', '20', '30', '40', '50'])
    expect(marks.filter((g) => g.kind === 'half').map((g) => g.ul)).toEqual([5000, 15000, 25000, 35000, 45000])
    for (const g of marks) expect(g.y).toBeCloseTo(standY(g.ul), 9)
  })

  it("ends where the model's burette does, so a capacity changed in the record cannot leave the drawing false", () => {
    expect(standGraduations().at(-1)?.ul).toBe(modelFrom(titrationData).buretteCapacityUl)
    expect(readingGraduations(50000).at(-1)?.ul).toBe(modelFrom(titrationData).buretteCapacityUl)
  })
})
