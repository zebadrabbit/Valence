import { TENTHS } from '@/app/lab/graphGeometry'
import { LoggerGraph } from '@/app/lab/LoggerGraph'
import type { GraphView, HotcoldModel } from '@/engine/hotcold'
import { PAGE_TEXT, pointCallout, pointLabel } from './messages'

export interface GraphProps {
  m: HotcoldModel
  /** The logger's readings so far, with which of them have been looked at. At least one reading. */
  graph: GraphView
  /** The id of the line that says what to do with the picture. */
  describedBy: string
  /** A reading has come to be looked at, by its step: by a pointer over it, by focus on it, by a tap, or by one of the two buttons under the graph. */
  onLook(step: number): void
}

/**
 * The endothermic and exothermic lab's graph: the shell's logger graph (../LoggerGraph.tsx), which the calorimetry
 * lab and the freezing point depression lab draw too, with this lab's readings in tenths of a degree on the
 * calorimetry lab's axis, one dashed line where the salt was added, and this lab's words. Nothing beside it says a
 * temperature: a reading is found by looking at its point.
 */
export function Graph({ m, graph, describedBy, onLook }: GraphProps) {
  return (
    <LoggerGraph
      readings={graph.readings}
      looked={graph.looked}
      stepSeconds={m.stepSeconds}
      scale={TENTHS}
      degree={(tenths) => tenths / 10}
      marks={graph.changedAt === null ? [] : [{ step: graph.changedAt, dash: 'dashed', text: PAGE_TEXT.changeMark }]}
      describedBy={describedBy}
      text={{ picture: PAGE_TEXT.graphPicture, temperatureAxis: PAGE_TEXT.temperatureAxis, timeAxis: PAGE_TEXT.timeAxis, lookedAt: PAGE_TEXT.lookedAt, notLookedAt: PAGE_TEXT.notLookedAt, earlier: PAGE_TEXT.earlier, later: PAGE_TEXT.later }}
      pointLabel={(step, looked) => pointLabel(m, step, looked)}
      callout={(step, reading) => pointCallout(m, step, reading)}
      onLook={onLook}
    />
  )
}
