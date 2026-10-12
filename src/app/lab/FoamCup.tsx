import type { ReactNode } from 'react'
import './foamCup.css'

// The foam cup that the calorimetry lab and the freezing point depression lab both work at, as a cut-away drawing.
// The drawing follows the theme: everything is the text's own colour, at one strength or another. It is hidden
// from assistive technology, and the cup's card says the same state in words beside it.
export const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
export const FOAM = { ...LINE, fill: 'currentColor', fillOpacity: 0.05 } as const
export const LIQUID = { fill: 'currentColor', fillOpacity: 0.16 } as const
export const SOLID = { fill: 'currentColor', fillOpacity: 0.5, stroke: 'currentColor', strokeWidth: 1.2 } as const

/** The inner cup's wall, from its rim to its foot: where its inside is at a height, on the left and on the right. */
const RIM = 56
const FOOT = 178
export const inside = (y: number) => {
  const lean = ((y - RIM) / (FOOT - RIM)) * 15
  return { left: 86 + lean, right: 174 - lean }
}

export interface FoamCupProps {
  /** How high the liquid stands in the cup, down the picture; null for a cup with no liquid in it. */
  level: number | null
  lidOn: boolean
  stirring: boolean
  loggerStarted: boolean
  reducedMotion: boolean
  /** What lies in the liquid: drawn over it and behind the stirrer and the probe. */
  inCup?: ReactNode
  /** What stands on the bench to the right of the cup, under the logger. */
  beside?: ReactNode
}

/**
 * Two cups, one inside the other, on the bench; the liquid in the inner one; the lid on the cup, or lying on the
 * bench beside it while it is off; the stirrer, with the marks of its stirring about its ring while it is going;
 * and the probe, wired to the logger, whose screen shows a dot and a level row of dashes once it is started and is
 * blank before. What is in the liquid and what stands beside the cup are the lab's own, and are handed in. Nothing
 * in it says what the temperature does. The stirrer bobs four times as the drawing first shows it going, and only
 * where `reducedMotion` is false; nothing else here moves.
 */
export function FoamCup({ level, lidOn, stirring, loggerStarted, reducedMotion, inCup, beside }: FoamCupProps) {
  const wall = level === null ? null : inside(level)
  return (
    <svg viewBox="0 0 280 196" aria-hidden="true" className="h-auto w-52 max-w-full shrink-0 text-foreground">
      {/* The bench. */}
      <line x1={6} y1={186} x2={274} y2={186} {...LINE} strokeOpacity={0.5} />
      {/* The outer cup, then the inner one standing a little proud of it. */}
      <path d="M 74 62 L 79 62 L 96 184 L 164 184 L 181 62 L 186 62" {...FOAM} />
      <path d={`M 81 ${RIM} L 86 ${RIM} L 101 ${FOOT} L 159 ${FOOT} L 174 ${RIM} L 179 ${RIM}`} {...FOAM} />
      {wall !== null && (
        <>
          <path d={`M ${wall.left + 1} ${level} L ${wall.right - 1} ${level} L 158 ${FOOT - 1} L 102 ${FOOT - 1} Z`} {...LIQUID} />
          <line x1={wall.left + 1} y1={level!} x2={wall.right - 1} y2={level!} {...LINE} strokeWidth={1.2} strokeOpacity={0.6} />
        </>
      )}
      {inCup}

      {/* The stirrer: its handle, its rod and the ring at its foot. */}
      <g className={stirring && !reducedMotion ? 'cal-stir' : undefined}>
        <circle cx={110} cy={14} r={5} {...LINE} />
        <line x1={110} y1={19} x2={110} y2={156} {...LINE} />
        <ellipse cx={110} cy={159} rx={9} ry={3.5} {...LINE} />
      </g>
      {stirring && (
        <g data-stirring="" {...LINE} strokeWidth={1.4} strokeOpacity={0.75}>
          <path d="M 97 148 q -5 6 1 12" />
          <path d="M 123 148 q 5 6 -1 12" />
          <path d="M 103 143 q 7 -4 14 0" />
        </g>
      )}

      {/* The probe, the wire from its head, and the logger. */}
      <line x1={148} y1={24} x2={148} y2={150} {...LINE} strokeWidth={2.4} />
      <rect x={145.5} y={148} width={5} height={10} rx={2} fill="currentColor" />
      <path d="M 148 24 C 148 2, 206 0, 216 24" {...LINE} strokeWidth={1.3} />
      <rect x={206} y={24} width={64} height={42} rx={5} {...FOAM} />
      <rect x={212} y={30} width={52} height={24} rx={2} {...LINE} strokeWidth={1.2} />
      {loggerStarted && (
        <g data-logging="">
          <circle cx={219} cy={42} r={3} fill="currentColor" />
          <line x1={227} y1={42} x2={258} y2={42} {...LINE} strokeDasharray="5 4" />
        </g>
      )}
      <circle cx={216} cy={60} r={1.6} fill="currentColor" />

      {/* The lid: on the cup, or on the bench beside it. */}
      {lidOn ? <rect data-lid="on" x={68} y={47} width={124} height={9} rx={3} {...SOLID} fillOpacity={0.3} /> : <rect data-lid="off" x={6} y={176} width={58} height={9} rx={3} {...SOLID} fillOpacity={0.3} />}

      {beside}
    </svg>
  )
}
