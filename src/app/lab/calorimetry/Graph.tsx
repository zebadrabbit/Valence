import { useRef, useState } from 'react'
import { Control } from '@/app/lab/Control'
import { useExplore } from '@/app/lab/useExplore'
import type { CalorimetryModel, GraphView } from '@/engine/calorimetry'
import { GRAPH, PLOT_EDGE, axesOf, columns, degreeMarks, keyTarget, stepTarget, timeMarks, xOf, yOf } from './graphGeometry'
import { PAGE_TEXT, pointCallout, pointLabel } from './messages'

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`
/** The keys that move along the graph: taken from the page, which they would scroll. */
const MOVES = ['ArrowLeft', 'ArrowRight', 'Home', 'End']

/** One mark of the key under the graph, drawn as the graph draws it. */
function KeyMark({ looked }: { looked: boolean | null }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block size-4 align-[-0.2em] text-foreground">
      {looked === null ? <line x1={8} y1={1} x2={8} y2={15} stroke="currentColor" strokeWidth={1.6} strokeDasharray="4 3" /> : <circle cx={8} cy={8} r={4.5} fill={looked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} />}
    </svg>
  )
}

export interface GraphProps {
  m: CalorimetryModel
  /** The logger's readings so far, with which of them have been looked at. At least one reading. */
  graph: GraphView
  /** The id of the line that says what to do with the picture. */
  describedBy: string
  /** A reading has come to be looked at, by its step: by a pointer over it, by focus on it, by a tap, or by one of the two buttons under the graph. */
  onLook(step: number): void
}

/**
 * The logger's graph, to be explored: temperature up the side against time along the bottom, with a point for each
 * reading and a thin line through them, and a dashed line where the change was started. A point that has been
 * looked at is filled, and one that has not is open; the key under the graph says so in words.
 *
 * A button lies over each reading: a column the plot's whole height, so that a pointer or a finger anywhere on the
 * plot is on the reading nearest to it. A mouse pointer over one, keyboard focus on it or a tap looks at it: the
 * point is ringed, and a callout at the head of the picture says its time and its temperature, and stays until
 * another reading is looked at or Escape is pressed, so that it can still be read while the worksheet is typed
 * in. The graph is one stop of the Tab key, on the reading last looked at; the arrow keys move from reading to
 * reading, and Home and End to the first and the last. From the ninth reading a column is narrower than a finger
 * in a narrow window, so two buttons of a finger's size under the graph step one reading back and one on. Nothing
 * here says a temperature that has not been looked at, and nothing moves.
 */
export function Graph({ m, graph, describedBy, onLook }: GraphProps) {
  const { readings, changedAt, looked } = graph
  // The reading last looked at while the page has been open: where the ring and the callout are, and the graph's stop of the Tab key.
  const [last, setLast] = useState<number | null>(null)
  const look = (step: number) => {
    setLast(step)
    onLook(step)
  }
  const { part } = useExplore<string>((step) => look(Number(step)))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const axes = axesOf(readings, m.stepSeconds)
  const areas = columns(readings.length, axes)
  const place = (step: number) => ({ x: xOf(axes, step), y: yOf(axes, readings[step]!) })
  const stepTo = (by: -1 | 1) => {
    const to = stepTarget(by, last, readings.length)
    if (to !== null) look(to)
  }
  return (
    // No wider than 32rem: wider, the picture is taller than a short window has room for with the worksheet under it.
    <div className="grid w-full max-w-[32rem] gap-2">
      <div className="relative">
        <svg viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} role="img" aria-label={PAGE_TEXT.graphPicture} aria-describedby={describedBy} className="block h-auto w-full text-foreground">
          {degreeMarks(axes).map(({ tenths, y }) => (
            <g key={tenths}>
              <line x1={PLOT_EDGE.left} x2={PLOT_EDGE.right} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.14} />
              <text x={PLOT_EDGE.left - 6} y={y} textAnchor="end" dominantBaseline="central" fontSize={12} fill="currentColor" className="tabular-nums">
                {tenths / 10}
              </text>
            </g>
          ))}
          {timeMarks(axes, m.stepSeconds).map(({ minutes, x }) => (
            <g key={minutes}>
              <line x1={x} x2={x} y1={PLOT_EDGE.bottom} y2={PLOT_EDGE.bottom + 5} stroke="currentColor" />
              <text x={x} y={PLOT_EDGE.bottom + 17} textAnchor="middle" fontSize={12} fill="currentColor" className="tabular-nums">
                {minutes}
              </text>
            </g>
          ))}
          <path d={`M ${PLOT_EDGE.left} ${PLOT_EDGE.top} L ${PLOT_EDGE.left} ${PLOT_EDGE.bottom} L ${PLOT_EDGE.right} ${PLOT_EDGE.bottom}`} fill="none" stroke="currentColor" strokeWidth={1.4} />
          {/* Up the side, so that the room at the picture's head is the callout's alone. */}
          <text transform={`translate(11 ${(PLOT_EDGE.top + PLOT_EDGE.bottom) / 2}) rotate(-90)`} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="currentColor">
            {PAGE_TEXT.temperatureAxis}
          </text>
          <text x={(PLOT_EDGE.left + PLOT_EDGE.right) / 2} y={GRAPH.height - 6} textAnchor="middle" fontSize={12} fill="currentColor">
            {PAGE_TEXT.timeAxis}
          </text>
          {/* Where the change was started: just after the reading it followed. */}
          {changedAt !== null && <line data-change="" x1={xOf(axes, changedAt + 0.25)} x2={xOf(axes, changedAt + 0.25)} y1={PLOT_EDGE.top} y2={PLOT_EDGE.bottom} stroke="currentColor" strokeWidth={1.4} strokeDasharray="5 4" />}
          <polyline points={readings.map((_, step) => `${place(step).x},${place(step).y}`).join(' ')} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.4} strokeLinejoin="round" />
          {readings.map((_, step) => (
            // Filled once it has been looked at, and open until then, on the card's own colour so that the line does not show through it.
            <circle key={step} cx={place(step).x} cy={place(step).y} r={4} fill={looked.includes(step) ? 'currentColor' : 'var(--card)'} stroke="currentColor" strokeWidth={1.6} />
          ))}
          {last !== null && (
            // The reading last looked at: ringed, with a thin line up to its callout.
            <g data-ring="">
              <line x1={place(last).x} x2={place(last).x} y1={PLOT_EDGE.top - 4} y2={place(last).y - 8.5} stroke="currentColor" strokeOpacity={0.6} />
              <circle cx={place(last).x} cy={place(last).y} r={8.5} fill="none" stroke="currentColor" strokeWidth={2} />
            </g>
          )}
        </svg>
        {readings.map((_, step) => {
          const area = areas[step]!
          const looking = part(String(step))
          return (
            <button
              key={step}
              ref={(element) => void (buttons.current[step] = element)}
              {...looking}
              // One stop of the Tab key for the whole graph: the reading last looked at, and the first until one has been.
              tabIndex={step === (last ?? 0) ? 0 : -1}
              aria-label={pointLabel(m, step, looked.includes(step))}
              onKeyDown={(event) => {
                looking.onKeyDown(event)
                if (event.key === 'Escape') setLast(null)
                if (!MOVES.includes(event.key)) return
                event.preventDefault()
                const to = keyTarget(event.key, step, readings.length)
                // Focus on a reading looks at it.
                if (to !== null) buttons.current[to]?.focus()
              }}
              style={{ left: percent(area.from, GRAPH.width), top: percent(PLOT_EDGE.top, GRAPH.height), width: percent(area.to - area.from, GRAPH.width), height: percent(PLOT_EDGE.bottom - PLOT_EDGE.top, GRAPH.height) }}
              // The column is outlined while the keyboard is on it; the ring about its point says which reading it is.
              className="absolute cursor-pointer rounded-xs outline-ring focus-visible:outline-2"
            />
          )
        })}
        {last !== null && (
          // In the room the picture leaves at its head, over its reading where there is room and inside the picture always: it lies over no point of the graph.
          <p
            data-callout=""
            className="pointer-events-none absolute top-0 w-max max-w-full rounded-md border-2 border-foreground bg-card px-2 py-0.5 text-sm leading-snug font-medium tabular-nums"
            style={{ left: percent(place(last).x, GRAPH.width), transform: `translateX(-${percent(place(last).x, GRAPH.width)})` }}
          >
            {pointCallout(m, last, readings[last]!)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Control unavailable={stepTarget(-1, last, readings.length) === null} className="min-h-11 px-4" onClick={() => stepTo(-1)}>
          <span aria-hidden="true">←</span> {PAGE_TEXT.earlier}
        </Control>
        <Control unavailable={stepTarget(1, last, readings.length) === null} className="min-h-11 px-4" onClick={() => stepTo(1)}>
          {PAGE_TEXT.later} <span aria-hidden="true">→</span>
        </Control>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li>
          <KeyMark looked /> {PAGE_TEXT.lookedAt}
        </li>
        <li>
          <KeyMark looked={false} /> {PAGE_TEXT.notLookedAt}
        </li>
        {changedAt !== null && (
          <li>
            <KeyMark looked={null} /> {PAGE_TEXT.changeMark}
          </li>
        )}
      </ul>
    </div>
  )
}
