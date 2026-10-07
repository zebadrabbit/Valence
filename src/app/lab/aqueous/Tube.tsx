import { useId } from 'react'
import type { TubeLook } from './stationLook'
import { PAGE_TEXT } from './messages'
import './aqueous.css'

// The tube stands on a white card, as the titration lab's flask does, so that the colours are judged against white
// in the dark theme too. Everything in the drawing has a fixed colour.
const INK = '#3f3f46'
const GLASS = 'M 42 16 L 42 150 A 18 18 0 0 0 78 150 L 78 16'
const SURFACE = 78
const BUBBLES = [
  [52, 142, 3],
  [66, 128, 2.5],
  [57, 112, 3],
  [69, 150, 2],
  [49, 122, 2],
  [62, 96, 2.5],
] as const

/**
 * A station's tube once it is mixed: the liquid in its colour, a layer of solid in its colour where one forms,
 * and bubbles where a gas comes off. A drawing only, and never the only place a thing is told: `describedBy` is
 * the id of the paragraph under it that says the same in words. The bubbles move only where `reducedMotion` is
 * false; under it they are drawn at rest.
 */
export function Tube({ look, reducedMotion, describedBy }: { look: TubeLook; reducedMotion: boolean; describedBy: string }) {
  const clipId = useId()
  return (
    <svg viewBox="0 0 120 190" role="img" aria-label={PAGE_TEXT.tubePicture} aria-describedby={describedBy} className="h-48 w-32 shrink-0">
      <defs>
        <clipPath id={clipId}>
          <path d={`${GLASS} Z`} />
        </clipPath>
      </defs>
      <rect x={1} y={1} width={118} height={188} rx={8} fill="#ffffff" stroke={INK} strokeOpacity={0.35} />
      <g clipPath={`url(#${clipId})`}>
        <rect x={40} y={SURFACE} width={40} height={100} fill={look.liquid.hex} />
        {look.solid && <rect x={40} y={144} width={40} height={30} fill={look.solid.hex} stroke={INK} strokeWidth={1.2} />}
        {look.bubbles &&
          BUBBLES.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" stroke={INK} strokeWidth={0.9} className={reducedMotion ? undefined : 'aq-bubble'} />)}
      </g>
      <line x1={42} x2={78} y1={SURFACE} y2={SURFACE} stroke={INK} strokeOpacity={0.5} strokeWidth={1} />
      <path d={GLASS} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M 38 16 L 82 16" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}
