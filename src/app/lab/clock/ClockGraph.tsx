import { useRef, useState } from 'react'
import { Control } from '@/app/lab/Control'
import { keyTarget, stepTarget } from '@/app/lab/exploreKeys'
import { useExplore } from '@/app/lab/useExplore'
import type { TemperatureView } from '@/engine/clock'
import { GRAPH, PLOT_EDGE, axesOf, bottomMarks, columns, sideMarks, xOf, yOf } from './graphGeometry'
import { GRAPH_TEXT, inverseText, logText, placeCallout, placeLabel } from './messages'

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`
/** The keys that move along the line: taken from the page, which they would scroll. */
const MOVES = ['ArrowLeft', 'ArrowRight', 'Home', 'End']

/** One mark of the key under the graph, drawn as the graph draws it: a run's point, the line, or a place on it. */
function KeyMark({ of }: { of: 'point' | 'line' | 'looked' | 'open' }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block size-4 align-[-0.2em] text-foreground">
      {of === 'point' ? (
        <rect x={3.5} y={3.5} width={9} height={9} transform="rotate(45 8 8)" fill="currentColor" />
      ) : of === 'line' ? (
        <line x1={1} y1={12} x2={15} y2={4} stroke="currentColor" strokeWidth={1.6} />
      ) : (
        <circle cx={8} cy={8} r={4.5} fill={of === 'looked' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} />
      )}
    </svg>
  )
}

export interface ClockGraphProps {
  /** The graph as the engine has it: a point for each run, the line through them, and the places on it. */
  graph: NonNullable<TemperatureView['graph']>
  /** The id of the lines that say what to do with the picture. */
  describedBy: string
  /** A place on the line has come to be looked at, by its number: by a pointer over it, by focus on it, by a tap, or by one of the two buttons under the graph. */
  onLook(place: number): void
}

/**
 * Part 3's graph, to be explored as the calorimetry lab's is (spec 19.3): the logarithm of the rate constant up
 * the side against one over the temperature along the bottom, a diamond for each run, the straight line through
 * them, and a circle for each place on the line. A place that has been looked at is filled, and one that has not
 * is open; the key under the graph says so in words.
 *
 * A button lies over each place: a column the plot's whole height. A mouse pointer over one, keyboard focus on it
 * or a tap looks at it: the place is ringed, and a callout at the head of the picture says its two figures, and
 * stays until another place is looked at or Escape is pressed, so that it can still be read while the notebook is
 * typed in. The graph is one stop of the Tab key, on the place last looked at; the arrow keys move from place to
 * place, and Home and End to the first and the last. A column is narrower than a finger, so two buttons of a
 * finger's size under the graph step one place to the left and one to the right. Nothing here says a figure of a
 * place that has not been looked at, and nothing moves.
 */
export function ClockGraph({ graph, describedBy, onLook }: ClockGraphProps) {
  const { points, line, places } = graph
  // The place last looked at while the page has been open: where the ring and the callout are, and the graph's stop of the Tab key.
  const [last, setLast] = useState<number | null>(null)
  const look = (place: number) => {
    setLast(place)
    onLook(place)
  }
  const { part } = useExplore<string>((place) => look(Number(place)))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const axes = axesOf(places, points)
  const areas = columns(places, axes)
  const at = (spot: { xMicro: number; yMilli: number }) => ({ x: xOf(axes, spot.xMicro), y: yOf(axes, spot.yMilli) })
  const stepTo = (by: -1 | 1) => {
    const to = stepTarget(by, last, places.length)
    if (to !== null) look(to)
  }
  return (
    // No wider than 32rem, as the calorimetry lab's graph: wider, the picture is taller than a short window has room for with the notebook under it.
    <div className="grid w-full max-w-[32rem] gap-2">
      <div className="relative">
        <svg viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} role="img" aria-label={GRAPH_TEXT.picture} aria-describedby={describedBy} className="block h-auto w-full text-foreground">
          {sideMarks(axes).map(({ yMilli, y }) => (
            <g key={yMilli}>
              <line x1={PLOT_EDGE.left} x2={PLOT_EDGE.right} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.14} />
              <text x={PLOT_EDGE.left - 6} y={y} textAnchor="end" dominantBaseline="central" fontSize={12} fill="currentColor" className="tabular-nums">
                {logText(yMilli).replace(/0{2}$/, '')}
              </text>
            </g>
          ))}
          {bottomMarks(axes, places).map(({ xMicro, x }) => (
            <g key={xMicro}>
              <line x1={x} x2={x} y1={PLOT_EDGE.bottom} y2={PLOT_EDGE.bottom + 5} stroke="currentColor" />
              <text x={x} y={PLOT_EDGE.bottom + 17} textAnchor="middle" fontSize={12} fill="currentColor" className="tabular-nums">
                {inverseText(xMicro)}
              </text>
            </g>
          ))}
          <path d={`M ${PLOT_EDGE.left} ${PLOT_EDGE.top} L ${PLOT_EDGE.left} ${PLOT_EDGE.bottom} L ${PLOT_EDGE.right} ${PLOT_EDGE.bottom}`} fill="none" stroke="currentColor" strokeWidth={1.4} />
          {/* Up the side, so that the room at the picture's head is the callout's alone. */}
          <text transform={`translate(11 ${(PLOT_EDGE.top + PLOT_EDGE.bottom) / 2}) rotate(-90)`} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="currentColor">
            {GRAPH_TEXT.logAxis}
          </text>
          <text x={(PLOT_EDGE.left + PLOT_EDGE.right) / 2} y={GRAPH.height - 6} textAnchor="middle" fontSize={12} fill="currentColor">
            {GRAPH_TEXT.inverseAxis}
          </text>
          <line data-line="" x1={at(line[0]).x} y1={at(line[0]).y} x2={at(line[1]).x} y2={at(line[1]).y} stroke="currentColor" strokeWidth={1.6} />
          {places.map((place) => (
            // Filled once it has been looked at, and open until then, on the card's own colour so that the line does not show through it.
            <circle key={place.xMicro} data-place="" cx={at(place).x} cy={at(place).y} r={4} fill={place.looked ? 'currentColor' : 'var(--card)'} stroke="currentColor" strokeWidth={1.6} />
          ))}
          {points.map((point) => (
            // A run, at its temperature: a diamond, which no place on the line is drawn as.
            <rect key={point.runId} data-point={point.runId} x={at(point).x - 5} y={at(point).y - 5} width={10} height={10} transform={`rotate(45 ${at(point).x} ${at(point).y})`} fill="currentColor" stroke="var(--card)" strokeWidth={1} />
          ))}
          {last !== null && (
            // The place last looked at: ringed, with a thin line up to its callout.
            <g data-ring="">
              <line x1={at(places[last]!).x} x2={at(places[last]!).x} y1={PLOT_EDGE.top - 4} y2={at(places[last]!).y - 8.5} stroke="currentColor" strokeOpacity={0.6} />
              <circle cx={at(places[last]!).x} cy={at(places[last]!).y} r={8.5} fill="none" stroke="currentColor" strokeWidth={2} />
            </g>
          )}
        </svg>
        {places.map((place, index) => {
          const area = areas[index]!
          const looking = part(String(index))
          return (
            <button
              key={place.xMicro}
              ref={(element) => void (buttons.current[index] = element)}
              {...looking}
              // One stop of the Tab key for the whole graph: the place last looked at, and the first until one has been.
              tabIndex={index === (last ?? 0) ? 0 : -1}
              aria-label={placeLabel(place, place.looked)}
              onKeyDown={(event) => {
                looking.onKeyDown(event)
                if (event.key === 'Escape') setLast(null)
                if (!MOVES.includes(event.key)) return
                event.preventDefault()
                const to = keyTarget(event.key, index, places.length)
                // Focus on a place looks at it.
                if (to !== null) buttons.current[to]?.focus()
              }}
              style={{ left: percent(area.from, GRAPH.width), top: percent(PLOT_EDGE.top, GRAPH.height), width: percent(area.to - area.from, GRAPH.width), height: percent(PLOT_EDGE.bottom - PLOT_EDGE.top, GRAPH.height) }}
              // The column is outlined while the keyboard is on it; the ring about its place says which it is.
              className="absolute cursor-pointer rounded-xs outline-ring focus-visible:outline-2"
            />
          )
        })}
        {last !== null && (
          // In the room the picture leaves at its head, over its place where there is room and inside the picture always.
          <p
            data-callout=""
            className="pointer-events-none absolute top-0 w-max max-w-full rounded-md border-2 border-foreground bg-card px-2 py-0.5 text-sm leading-snug font-medium tabular-nums"
            style={{ left: percent(at(places[last]!).x, GRAPH.width), transform: `translateX(-${percent(at(places[last]!).x, GRAPH.width)})` }}
          >
            {placeCallout(places[last]!)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Control unavailable={stepTarget(-1, last, places.length) === null} className="min-h-11 px-4" onClick={() => stepTo(-1)}>
          <span aria-hidden="true">←</span> {GRAPH_TEXT.earlier}
        </Control>
        <Control unavailable={stepTarget(1, last, places.length) === null} className="min-h-11 px-4" onClick={() => stepTo(1)}>
          {GRAPH_TEXT.later} <span aria-hidden="true">→</span>
        </Control>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(
          [
            ['point', GRAPH_TEXT.point],
            ['line', GRAPH_TEXT.line],
            ['looked', GRAPH_TEXT.lookedAt],
            ['open', GRAPH_TEXT.notLookedAt],
          ] as const
        ).map(([of, words]) => (
          <li key={of}>
            <KeyMark of={of} /> {words}
          </li>
        ))}
      </ul>
    </div>
  )
}
