import { describe, expect, it } from 'vitest'
import { ENERGY_PANEL, energyAt, energyCurves, hclNahco3 as mechanism, overallEnergy } from '@/mechanisms'
import { CHART, chartScale, curveLabels, curvePath } from './energyChart'
import { PLAY_MS, SLIDER_STEP, TRACK, entersChapter, fromSlider, playedTo, sliderValue, ways } from './timeline'

describe('the slider', () => {
  it('holds the track in whole numbers, and gives back the very position a chapter starts at', () => {
    for (const chapter of mechanism.chapters) {
      expect(fromSlider(sliderValue(chapter.range[0]))).toBe(chapter.range[0])
      // Every chapter starts on a step of the slider, so the arrow keys can land on it.
      expect(sliderValue(chapter.range[0]) % SLIDER_STEP).toBe(0)
    }
    expect(sliderValue(1)).toBe(TRACK)
    expect(fromSlider(TRACK)).toBe(1)
    // A keyframe inside a step is on a step of the slider too.
    for (const keyframe of mechanism.keyframes) expect(sliderValue(keyframe.t) % SLIDER_STEP).toBe(0)
  })
})

describe('Previous and Next', () => {
  const go = (t: number) => {
    const { previous, next } = ways(mechanism, t)
    return [previous && [previous.to, previous.chapter?.id ?? null], next && [next.to, next.chapter?.id ?? null]]
  }
  it('go to the start of the chapter before the one the timeline is in, and of the one after', () => {
    expect(go(0.16)).toEqual([[0.06, 'prologue'], [0.32, 'proton-transfer']])
    expect(go(0.4)).toEqual([[0.16, 'dissolving'], [0.52, 'decomposition']])
    expect(go(0.94)).toEqual([[0.76, 'gas-escapes'], [1, null]])
  })

  it('go to the two ends of the track from inside the first and the last chapter, and nowhere from the ends themselves', () => {
    expect(go(0)).toEqual([null, [0.06, 'prologue']])
    expect(go(0.05)).toEqual([[0, null], [0.06, 'prologue']])
    // The last press of Next is the one that reaches the end, where the timeline is completed.
    expect(go(0.97)).toEqual([[0.76, 'gas-escapes'], [1, null]])
    expect(go(1)).toEqual([[0.76, 'gas-escapes'], null])
  })
})

describe('playing', () => {
  it('moves the timeline forward at one steady pace, and takes a minute for the whole track', () => {
    expect(playedTo(0, 16)).toBeCloseTo(16 / PLAY_MS, 12)
    expect(playedTo(0.5, 16) - 0.5).toBeCloseTo(playedTo(0.1, 16) - 0.1, 12)
    expect(PLAY_MS).toBe(60_000)
    let t = 0
    let frames = 0
    while (t < 1) {
      t = playedTo(t, 1000 / 60)
      frames++
    }
    expect(Math.abs(frames - 3600)).toBeLessThanOrEqual(1)
  })

  it('stops at the end, exactly', () => {
    expect(playedTo(0.9999, 50)).toBe(1)
    expect(playedTo(1, 16)).toBe(1)
  })

  it('does not leap after a frame that came late: a tab that was hidden, a page that was busy', () => {
    expect(playedTo(0.2, 30_000)).toBe(playedTo(0.2, 100))
  })
})

describe('saving while playing', () => {
  it('writes a frame that has entered another chapter, and no other: playing is saved by the chapter, and when it stops', () => {
    expect(entersChapter(mechanism, 0.1, 0.1003)).toBe(false)
    expect(entersChapter(mechanism, 0.1598, 0.16)).toBe(true)
    expect(entersChapter(mechanism, 0.16, 0.1603)).toBe(false)
    expect(entersChapter(mechanism, 0.9399, 0.9401)).toBe(true)
    // Over the whole track at the pace of playing, sixty frames a second: six frames are written, of 3,600.
    let [t, written, frames] = [0, 0, 0]
    while (t < 1) {
      const next = playedTo(t, 1000 / 60)
      if (entersChapter(mechanism, t, next)) written++
      frames++
      t = next
    }
    expect(written).toBe(mechanism.chapters.length - 1)
    expect(frames).toBeGreaterThan(3000)
  })
})

describe('the energy chart', () => {
  const scale = chartScale(mechanism)

  it('has room for every point of both curves, the top of the highest barrier too', () => {
    for (let i = 0; i <= 1000; i++) {
      const { g, h } = energyAt(mechanism, i / 1000)
      for (const value of [g, h]) {
        expect(scale.y(value)).toBeGreaterThanOrEqual(CHART.top)
        expect(scale.y(value)).toBeLessThanOrEqual(CHART.height - CHART.bottom)
      }
    }
    expect(scale.x(0)).toBe(CHART.left)
    expect(scale.x(1)).toBe(CHART.width - CHART.right)
    // Higher energy is higher on the page.
    expect(scale.y(40)).toBeLessThan(scale.y(-40))
    expect(scale.ticks).toEqual([-60, -40, -20, 0, 20, 40, 60])
  })

  it('draws each curve from zero at the start of the track to the total of the four steps at its end', () => {
    const ends = (path: string) => {
      const points = path.replace(/^M /, '').split(' L ').map((point) => point.split(' ').map(Number))
      return [points[0]!, points.at(-1)!, points.length] as const
    }
    const { deltaG, deltaH } = overallEnergy(mechanism)
    for (const [which, total] of [['g', deltaG], ['h', deltaH]] as const) {
      const [first, last, count] = ends(curvePath(mechanism, which, scale))
      expect(first).toEqual([scale.x(0), scale.y(0)])
      expect(last[0]).toBeCloseTo(scale.x(1), 6)
      expect(last[1]).toBeCloseTo(scale.y(total), 6)
      expect(count).toBe(201)
    }
  })

  it('passes through the very top of each barrier', () => {
    const path = curvePath(mechanism, 'g', scale)
    for (const stretch of energyCurves(mechanism).g) {
      if (!stretch.barrier) continue
      expect(path).toContain(`${scale.x(stretch.barrier.top)} ${scale.y(stretch.from + stretch.barrier.height)}`)
    }
  })

  it('says in words, at the place on the curve, which barrier is not to scale and what is derived', () => {
    expect(curveLabels(mechanism)).toEqual([
      { t: 0.47, value: 2.325 + 10, text: `${ENERGY_PANEL.notToScale}`, on: 'barrier' },
      { t: 0.69, value: -17.595000000000002 + 66, text: ENERGY_PANEL.basis.derived, on: 'barrier' },
      { t: 0.76, value: -34.014, text: ENERGY_PANEL.basis.derived, on: 'level' },
    ])
  })
})
