import type { Scale } from '@/app/lab/graphGeometry'
import { LoggerGraph } from '@/app/lab/LoggerGraph'
import type { FreezingModel, GraphView } from '@/engine/freezing'
import { PAGE_TEXT, pointCallout, pointLabel } from './messages'

/**
 * How the temperature axis is cut for this lab's readings, which are hundredths of a degree. A cup starts a few
 * degrees over zero, settles a little under it, and falls a degree or two when the solute goes in: so the axis
 * ends on half degrees, close about the readings, and is marked in whole degrees while it spans less than eight.
 * Room of three tenths of a degree is left over and under, and more where the readings span so much that three
 * tenths would be less than the ring about a reading that is looked at (a cup whose ice has all melted climbs
 * toward the room's temperature).
 */
export function scaleOf(readings: readonly number[]): Scale {
  const spread = Math.max(...readings) - Math.min(...readings)
  return { room: Math.max(30, Math.ceil(spread * 0.06)), leastSpan: 200, marks: [50, 100, 200, 500, 1000, 2000], ends: 50 }
}

/** A mark of the temperature axis, in degrees, with a true minus sign: "−1.5". */
export const degreeText = (hundredths: number) => String(hundredths / 100).replace('-', '−')

export interface GraphProps {
  m: FreezingModel
  /** The logger's readings so far, with which of them have been looked at. At least one reading. */
  graph: GraphView
  /** The ids of the lines that say what to do with the picture. */
  describedBy: string
  /** A reading has come to be looked at, by its step. */
  onLook(step: number): void
}

/**
 * The freezing point depression lab's graph: the shell's logger graph (../LoggerGraph.tsx), which the calorimetry
 * lab draws too, with this lab's readings in hundredths of a degree, a dashed line where the solute went in and a
 * dotted one where the cup was strained or weighed, and this lab's words. A point's callout gives its reading to
 * the hundredth; the axis does not, and is not meant to: a reading is found by looking at its point.
 */
export function Graph({ m, graph, describedBy, onLook }: GraphProps) {
  return (
    <LoggerGraph
      readings={graph.readings}
      looked={graph.looked}
      stepSeconds={m.stepSeconds}
      scale={scaleOf(graph.readings)}
      degree={degreeText}
      marks={[
        ...(graph.addedAt === null ? [] : [{ step: graph.addedAt, dash: 'dashed' as const, text: PAGE_TEXT.soluteMark }]),
        ...(graph.endedAt === null ? [] : [{ step: graph.endedAt, dash: 'dotted' as const, text: PAGE_TEXT.endMark }]),
      ]}
      describedBy={describedBy}
      text={{ picture: PAGE_TEXT.graphPicture, temperatureAxis: PAGE_TEXT.temperatureAxis, timeAxis: PAGE_TEXT.timeAxis, lookedAt: PAGE_TEXT.lookedAt, notLookedAt: PAGE_TEXT.notLookedAt, earlier: PAGE_TEXT.earlier, later: PAGE_TEXT.later }}
      pointLabel={(step, looked) => pointLabel(m, step, looked)}
      callout={(step, reading) => pointCallout(m, step, reading)}
      onLook={onLook}
    />
  )
}
