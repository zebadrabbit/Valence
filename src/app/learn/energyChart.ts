import { ENERGY_PANEL, energyAt, energyCurves, type Mechanism } from '@/mechanisms'

// The geometry of the energy panel's chart, as plain numbers. The curves are drawn from energyAt, the same
// function the cursor is drawn from. Nothing here is printed: a figure a learner reads is a step's own value.

/** The chart's own units: a unit is a pixel where the panel gives it its full width. */
export const CHART = { width: 360, height: 250, left: 38, right: 10, top: 48, bottom: 28 }
const TICK = 20
const SAMPLES = 200

export type ChartScale = { x(t: number): number; y(value: number): number; ticks: number[] }

/** The whole track across, and up and down the range of both curves, taken out to the next tick. */
export function chartScale(mechanism: Mechanism): ChartScale {
  const values = Array.from({ length: SAMPLES + 1 }, (_, i) => energyAt(mechanism, i / SAMPLES)).flatMap(({ g, h }) => [g, h])
  const min = Math.floor(Math.min(...values) / TICK) * TICK
  const max = Math.ceil(Math.max(...values) / TICK) * TICK
  return {
    x: (t) => CHART.left + t * (CHART.width - CHART.left - CHART.right),
    y: (value) => CHART.top + ((max - value) / (max - min)) * (CHART.height - CHART.top - CHART.bottom),
    ticks: Array.from({ length: (max - min) / TICK + 1 }, (_, i) => min + i * TICK),
  }
}

/** One curve as an SVG path, through 201 points of the track; the top of every barrier is one of them. */
export function curvePath(mechanism: Mechanism, which: 'g' | 'h', scale: ChartScale): string {
  return `M ${Array.from({ length: SAMPLES + 1 }, (_, i) => `${scale.x(i / SAMPLES)} ${scale.y(energyAt(mechanism, i / SAMPLES)[which])}`).join(' L ')}`
}

/**
 * What is written on the free-energy curve itself (spec 9.2): over a barrier, that it is not to scale or that it
 * is derived, and at the level a derived step ends at, that it is derived. A value read from cited values has no
 * label: the table says so of each.
 */
export function curveLabels(mechanism: Mechanism): { t: number; value: number; text: string; on: 'barrier' | 'level' }[] {
  return energyCurves(mechanism).g.flatMap((stretch) => [
    ...(stretch.barrier ? [{ t: stretch.barrier.top, value: stretch.from + stretch.barrier.height, text: stretch.barrier.basis === 'schematic' ? ENERGY_PANEL.notToScale : ENERGY_PANEL.basis[stretch.barrier.basis], on: 'barrier' as const }] : []),
    ...(stretch.basis === 'derived' ? [{ t: stretch.range[1], value: stretch.to, text: ENERGY_PANEL.basis.derived, on: 'level' as const }] : []),
  ])
}
