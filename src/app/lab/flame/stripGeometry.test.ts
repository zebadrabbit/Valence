import { describe, expect, it } from 'vitest'
import { flameData as data } from '@/chem-data/flame/data'
import { HANDLING, createLab, stationView, type Action, type Seen } from '@/engine/flame'
import { run } from '@/engine/flame/testkit'
import { HIT_MIN, MIN_WIDTH_PX, STRIP, brightness, hitAreas, ticks, xOf } from './stripGeometry'

const ids = data.salts.map((s) => s.id)
/** What the strip shows at a station once a loop that carries these, and then the station's own salt, is held in the flame. */
const seen = (stationId: string, before: readonly string[] = []): Seen[] => {
  const actions: Action[] = [...(before.includes(HANDLING) ? [] : [{ type: 'cleanLoop' } as const]), ...before.filter((id) => id !== HANDLING).map((id): Action => ({ type: 'dipLoop', stationId: id })), { type: 'dipLoop', stationId }, { type: 'holdInFlame', stationId }]
  return stationView(data, run(data, createLab(data, 'challenge'), actions), stationId).spectrum
}
const extents = (spectrum: readonly Seen[]) => spectrum.map((one) => ({ from: xOf(data.scale, one.fromNm), to: xOf(data.scale, one.toNm) }))
const px = (units: number) => (units * MIN_WIDTH_PX) / STRIP.width

describe('the scale of the strip', () => {
  it('runs from 400 nm to 780 nm inside the picture, with room either side of it', () => {
    expect(xOf(data.scale, 400)).toBe(STRIP.pad)
    expect(xOf(data.scale, 780)).toBe(STRIP.width - STRIP.pad)
    expect(xOf(data.scale, 590)).toBe(STRIP.width / 2)
  })

  it('has a mark every 20 nm and a number at every 100 nm and at its end', () => {
    const marks = ticks(data.scale)
    expect(marks.map((mark) => mark.nm)).toEqual(Array.from({ length: 20 }, (_, i) => 400 + 20 * i))
    expect(marks.filter((mark) => mark.numbered).map((mark) => mark.nm)).toEqual([400, 500, 600, 700, 780])
    // Two marks are far enough apart to be told from each other where the picture is at its narrowest.
    expect(px(marks[1]!.x - marks[0]!.x)).toBeGreaterThan(20)
  })

  it('draws the brightest thing of a salt whole and the others fainter, by rank', () => {
    expect([1, 2, 3].map(brightness)).toEqual([1, 0.75, 0.55])
    for (const salt of data.salts) expect(Math.max(...salt.features.map((feature) => feature.prominence)), salt.id).toBeLessThanOrEqual(3)
  })
})

describe('the hit areas of the lines and bands', () => {
  it('are 44 px wide or more at every station with a clean loop, where the picture is at its narrowest, a thin line too', () => {
    expect(px(HIT_MIN)).toBeGreaterThanOrEqual(44)
    for (const id of ids) {
      const drawn = extents(seen(id))
      const areas = hitAreas(drawn)
      expect(areas).toHaveLength(data.salts.find((s) => s.id === id)!.features.length)
      areas.forEach((area, at) => {
        expect(px(area.to - area.from), `${id} ${at}`).toBeGreaterThanOrEqual(44)
        // Inside the picture, and over the thing it is the area of: all of a thing no wider than the area, and the middle of one that is.
        expect(area.from, `${id} ${at}`).toBeGreaterThanOrEqual(0)
        expect(area.to, `${id} ${at}`).toBeLessThanOrEqual(STRIP.width)
        const middle = (drawn[at]!.from + drawn[at]!.to) / 2
        expect(area.from <= middle && middle <= area.to, `${id} ${at}`).toBe(true)
      })
    }
  })

  it('never overlap, whatever the loop carries: the space between two neighbours is split', () => {
    const loops: [string, string[]][] = ids.flatMap((id) => [[id, []], [id, [HANDLING]], ...ids.filter((other) => other !== id).map((other): [string, string[]] => [id, [other]]), [id, [HANDLING, ...ids.filter((other) => other !== id)]]] as [string, string[]][])
    expect(loops.length).toBe(6 * 8)
    for (const [id, before] of loops) {
      const drawn = extents(seen(id, before))
      const areas = hitAreas(drawn)
      const sorted = [...areas].sort((a, b) => a.from - b.from)
      sorted.forEach((area, at) => {
        expect(area.to - area.from, `${id} after ${before.join()}`).toBeGreaterThan(0)
        if (at > 0) expect(area.from, `${id} after ${before.join()}`).toBeGreaterThanOrEqual(sorted[at - 1]!.to)
      })
      // However crowded, as with all six salts and the trace of handling on one loop, the narrowest area is half of the least width: 22 px where the picture is at its narrowest.
      for (const area of areas) expect(px(area.to - area.from), `${id} after ${before.join()}`).toBeGreaterThanOrEqual(22)
    }
  })

  it('lie along the strip in the order the engine counts the lines and bands in, whatever the loop carries: the count from the violet end, the order of the Tab key and the order of the buttons are one', () => {
    // Calcium on a loop that still carries barium chloride: barium's line near 554 nm stands inside calcium's green band.
    const mixed = seen('cacl2-0.1m', ['bacl2-0.1m'])
    const [band, line] = [mixed.findIndex((one) => one.feature.id === 'caoh-green'), mixed.findIndex((one) => one.feature.id === 'ba-553')]
    expect(mixed[band]!.fromNm < mixed[line]!.fromNm && mixed[line]!.toNm < mixed[band]!.toNm).toBe(true)
    const loops: [string, string[]][] = ids.flatMap((id) => [[id, []], [id, [HANDLING]], ...ids.filter((other) => other !== id).map((other): [string, string[]] => [id, [other]]), [id, [HANDLING, ...ids.filter((other) => other !== id)]]] as [string, string[]][])
    for (const [id, before] of loops) {
      const areas = hitAreas(extents(seen(id, before)))
      areas.forEach((area, at) => at > 0 && expect(area.from, `${id} after ${before.join()}, ${at}`).toBeGreaterThanOrEqual(areas[at - 1]!.to))
    }
  })

  it("moves an area off-centre where a neighbour or the picture's edge is in the way: barium's line beside its band, and potassium's two at the ends of the scale", () => {
    const barium = extents(seen('bacl2-0.1m'))
    const [band, line] = hitAreas(barium)
    expect(line!.from).toBeGreaterThanOrEqual(band!.to)
    expect(line!.to - line!.from).toBe(HIT_MIN)
    // The edge between the two stands off from the line, inside the band, so that it is not drawn over the line.
    expect(barium[1]!.from - line!.from).toBeGreaterThanOrEqual(8)
    expect(line!.from).toBeLessThan(barium[0]!.to)
    const [violet, red] = hitAreas(extents(seen('kcl-0.1m')))
    // Each reaches into the room left beside the scale, and stays in the picture.
    expect(violet!.from).toBeLessThan(STRIP.pad)
    expect(violet!.from).toBeGreaterThanOrEqual(0)
    expect(red!.to).toBeGreaterThan(STRIP.width - STRIP.pad)
    expect(red!.to).toBeLessThanOrEqual(STRIP.width)
    expect(red!.to - red!.from).toBe(HIT_MIN)
  })

  it('on a small case of its own: two that would overlap are cut half-way between them, and one alone is centred', () => {
    expect(hitAreas([{ from: 100, to: 100 }], 40, 300)).toEqual([{ from: 80, to: 120 }])
    expect(hitAreas([{ from: 100, to: 100 }, { from: 110, to: 110 }], 40, 300)).toEqual([{ from: 65, to: 105 }, { from: 105, to: 145 }])
    // In the order given, not the order along the scale.
    expect(hitAreas([{ from: 110, to: 110 }, { from: 100, to: 100 }], 40, 300)).toEqual([{ from: 105, to: 145 }, { from: 65, to: 105 }])
    // Three with no room for all: the middle one has half the least width, and the cuts either side of it are moved to leave it that.
    expect(hitAreas([{ from: 100, to: 100 }, { from: 110, to: 110 }, { from: 120, to: 120 }], 40, 300)).toEqual([{ from: 65, to: 105 }, { from: 105, to: 125 }, { from: 125, to: 165 }])
    // One thing inside another: each has a side of its own.
    const [wide, inside] = hitAreas([{ from: 100, to: 200 }, { from: 150, to: 150 }], 40, 300)
    expect(wide!.to).toBeLessThanOrEqual(inside!.from)
    expect(inside!.to - inside!.from).toBeGreaterThanOrEqual(20)
    // More things than the picture has room for at that width: the picture is shared out evenly, and no area is empty.
    expect(hitAreas(Array.from({ length: 4 }, () => ({ from: 50, to: 50 })), 40, 60).map((area) => area.to - area.from)).toEqual([15, 15, 15, 15])
  })
})
