import { describe, expect, it } from 'vitest'
import { GRAPH, PLOT_EDGE, axesOf, columns, degreeMarks, keyTarget, stepTarget, timeMarks, xOf, yOf } from './graphGeometry'

// A logger that reads every 15 seconds, as the lab's does: four steps to the minute.
const SECONDS = 15
const level = (count: number, tenths = 200) => Array.from({ length: count }, () => tenths)
/** A careful cup of part 1 at seed 1, as the version test pins it. */
const CURVE = [200, 200, 200, 258, 267, 268, 268, 267, 267, 267, 266]

describe('the axes', () => {
  it('span two minutes at the least, end on a whole minute, and leave a step of room after the latest reading', () => {
    expect([1, 2, 8, 9, 12, 13, 241].map((count) => axesOf(level(count), SECONDS).steps)).toEqual([8, 8, 8, 12, 12, 16, 244])
    for (const count of [1, 5, 8, 9, 40, 241]) {
      const axes = axesOf(level(count), SECONDS)
      expect(axes.steps % 4).toBe(0)
      expect(axes.steps).toBeGreaterThan(count - 1)
    }
  })

  it('take in every reading with room over and under, on marks of whole degrees, and never span less than two degrees', () => {
    expect(axesOf(level(3), SECONDS)).toMatchObject({ low: 190, high: 210, degreeMark: 10 })
    expect(axesOf(level(3, 205), SECONDS)).toMatchObject({ low: 200, high: 220 })
    expect(axesOf(CURVE, SECONDS)).toMatchObject({ low: 190, high: 280, degreeMark: 10 })
    // A fall, and a rise too large for a mark at every degree.
    expect(axesOf([221, 221, 173, 166, 165, 166], SECONDS)).toMatchObject({ low: 160, high: 230, degreeMark: 10 })
    expect(axesOf([239, 239, 380], SECONDS)).toMatchObject({ low: 220, high: 400, degreeMark: 20 })
    for (const readings of [level(1), CURVE, [239, 239, 380], [221, 165, 166]]) {
      const axes = axesOf(readings, SECONDS)
      // Half a degree of room or more, over and under.
      expect(axes.low).toBeLessThanOrEqual(Math.min(...readings) - 5)
      expect(axes.high).toBeGreaterThanOrEqual(Math.max(...readings) + 5)
      expect([axes.low % axes.degreeMark, axes.high % axes.degreeMark]).toEqual([0, 0])
      expect(degreeMarks(axes).length).toBeLessThanOrEqual(11)
    }
  })

  it('mark the time axis at whole minutes, fewer of them as the run grows long', () => {
    expect(timeMarks(axesOf(level(3), SECONDS), SECONDS).map((mark) => mark.minutes)).toEqual([0, 1, 2])
    expect(timeMarks(axesOf(level(25), SECONDS), SECONDS).map((mark) => mark.minutes)).toEqual([0, 2, 4, 6])
    expect(timeMarks(axesOf(level(241), SECONDS), SECONDS).map((mark) => mark.minutes)).toEqual([0, 20, 40, 60])
  })
})

describe('where a reading is drawn', () => {
  const axes = axesOf(CURVE, SECONDS)

  it('puts time along the plot from just inside its left edge, so that the first point is off the axis, and temperature up it from its foot, every reading inside the plot', () => {
    expect(xOf(axes, 0)).toBe(PLOT_EDGE.left + 10)
    expect(xOf(axes, axes.steps)).toBe(PLOT_EDGE.right)
    expect(yOf(axes, axes.low)).toBe(PLOT_EDGE.bottom)
    expect(yOf(axes, axes.high)).toBe(PLOT_EDGE.top)
    expect(yOf(axes, 268)).toBeLessThan(yOf(axes, 200))
    CURVE.forEach((tenths, step) => {
      expect(xOf(axes, step)).toBeLessThan(PLOT_EDGE.right)
      expect(yOf(axes, tenths)).toBeGreaterThan(PLOT_EDGE.top)
      expect(yOf(axes, tenths)).toBeLessThan(PLOT_EDGE.bottom)
    })
  })

  it('leaves room at the head of the picture for a callout, and at its left and its foot for the numbers and the names of the axes', () => {
    expect(GRAPH).toMatchObject({ width: 480, height: 280 })
    expect(PLOT_EDGE.top).toBeGreaterThanOrEqual(32)
    expect(PLOT_EDGE.left).toBeGreaterThanOrEqual(40)
    expect(GRAPH.height - PLOT_EDGE.bottom).toBeGreaterThanOrEqual(40)
  })
})

describe("the readings' buttons", () => {
  it('are columns that meet with no gap and no overlap, each about its own reading, the whole of them inside the picture', () => {
    for (const count of [1, 7, 11, 60, 241]) {
      const readings = level(count)
      const axes = axesOf(readings, SECONDS)
      const areas = columns(count, axes)
      expect(areas).toHaveLength(count)
      areas.forEach((area, step) => {
        expect(area.from).toBeLessThan(xOf(axes, step))
        expect(area.to).toBeGreaterThan(xOf(axes, step))
        expect(area.from).toBeGreaterThanOrEqual(0)
        expect(area.to).toBeLessThanOrEqual(GRAPH.width)
        if (step > 0) expect(area.from).toBeCloseTo(areas[step - 1]!.to, 9)
      })
    }
  })

  it('are a finger wide where the picture is at its narrowest for as long as the run is two minutes or less, and narrower after: the two buttons under the graph are for those', () => {
    /** The narrowest column of a run of so many readings. */
    const wide = (count: number) => Math.min(...columns(count, axesOf(level(count), SECONDS)).map((area) => area.to - area.from))
    // 447 px is what the narrowest window that shows a bench leaves the picture.
    expect((wide(8) * 447) / GRAPH.width).toBeGreaterThanOrEqual(44)
    expect((wide(1) * 447) / GRAPH.width).toBeGreaterThanOrEqual(44)
    expect((wide(9) * 447) / GRAPH.width).toBeLessThan(44)
  })
})

describe('moving along the graph', () => {
  it('goes one reading back or on with the arrow keys and to the first or the last with Home and End, and nowhere at an end or for any other key', () => {
    expect(['ArrowLeft', 'ArrowRight', 'Home', 'End'].map((key) => keyTarget(key, 3, 9))).toEqual([2, 4, 0, 8])
    expect(['ArrowLeft', 'Home'].map((key) => keyTarget(key, 0, 9))).toEqual([null, null])
    expect(['ArrowRight', 'End'].map((key) => keyTarget(key, 8, 9))).toEqual([null, null])
    expect(['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Tab', 'a'].map((key) => keyTarget(key, 3, 9))).toEqual([null, null, null, null, null, null])
    expect(keyTarget('ArrowRight', 0, 1)).toBeNull()
  })

  it('steps from the reading last looked at; from none, on to the first and back to the latest', () => {
    expect([stepTarget(1, null, 9), stepTarget(-1, null, 9)]).toEqual([0, 8])
    expect([stepTarget(1, 3, 9), stepTarget(-1, 3, 9)]).toEqual([4, 2])
    expect([stepTarget(-1, 0, 9), stepTarget(1, 8, 9)]).toEqual([null, null])
  })
})
