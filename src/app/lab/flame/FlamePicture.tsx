import { useId } from 'react'
import { useExplore } from '@/app/lab/useExplore'
import { FLAME, type Flame } from '@/engine/flame'
import { PAGE_TEXT, lookLabel, lookName } from './messages'
import './flame.css'

/** The wire loop on its handle, for the loop's card, which says the loop's state in words: with `wet`, a film of solution across the loop. */
export function LoopDrawing({ wet }: { wet: boolean }) {
  return (
    <svg viewBox="0 0 160 48" aria-hidden="true" className="h-12 w-40 shrink-0 text-foreground">
      <rect x={2} y={17} width={54} height={14} rx={4} fill="currentColor" fillOpacity={0.6} />
      <line x1={56} y1={24} x2={123} y2={24} stroke="currentColor" strokeWidth={2} />
      <circle cx={136} cy={24} r={12} fill="currentColor" fillOpacity={wet ? 0.22 : 0} stroke="currentColor" strokeWidth={2.2} />
    </svg>
  )
}

// The flame stands on a dark card in both themes, so that a pale flame shows; everything in the drawing has a fixed
// colour, the button and the callout laid over it too. The picture is 320 by 300 of its own units, as the aqueous
// lab's tube is: the burner and its flame in the left of it, and the room beside the flame for what a look says.
const WIDTH = 320
const HEIGHT = 300
const CARD = '#0b0f14'
const METAL = '#a1a1aa'
const EDGE = '#f4f4f5'
/** The flame over the burner's mouth: where it is drawn, and the part of the picture that is its button. */
const OUTER = 'M 82 232 C 56 178 78 118 104 40 C 130 118 152 178 126 232 Z'
const INNER = 'M 93 232 C 87 204 97 176 104 154 C 111 176 121 204 115 232 Z'
const PART = { left: 62, top: 30, width: 84, height: 208 }
/** Where a callout ends: 10 short of the card's right edge. */
const CALLOUT_RIGHT = 310

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`

export interface FlamePictureProps {
  flame: Flame
  reducedMotion: boolean
  /** The id of the line beside the picture that says what to do with it. */
  describedBy: string
  looked: boolean
  /** The flame's colour in words. Asked for only when the flame is looked at, so that nothing of it is on the page before. */
  seen(): string
  /** The flame has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook(): void
}

/**
 * The burner's flame with the loop held in it, to be looked at: the flame in the colour the engine gives for what
 * is on the loop, or in each of them side by side where it gives several, with the burner's own pale cone inside
 * it and its edge drawn, so that a flame of no colour is still a flame. One button lies over the flame. A mouse
 * pointer over it, keyboard focus on it or a tap looks at it: a callout beside it says the flame's colour in words.
 * The flame flickers for under five seconds, and only where `reducedMotion` is false; nothing else here moves.
 */
export function FlamePicture({ flame, reducedMotion, describedBy, looked, seen, onLook }: FlamePictureProps) {
  const fillId = useId()
  const { open, part } = useExplore<typeof FLAME>(onLook)
  const { colours } = flame
  return (
    <div className="relative w-80 max-w-full shrink-0">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={PAGE_TEXT.flamePicture} aria-describedby={describedBy} className="block h-auto w-full">
        {colours.length > 1 && (
          <defs>
            <linearGradient id={fillId}>
              {colours.map((colour, at) => (
                <stop key={colour.name} offset={at / (colours.length - 1)} stopColor={colour.hex} />
              ))}
            </linearGradient>
          </defs>
        )}
        <rect x={1} y={1} width={WIDTH - 2} height={HEIGHT - 2} rx={8} fill={CARD} stroke={METAL} strokeOpacity={0.5} />
        <g className={reducedMotion ? undefined : 'fl-flame'}>
          <path d={OUTER} fill={colours.length === 0 ? 'none' : colours.length === 1 ? colours[0]!.hex : `url(#${fillId})`} fillOpacity={0.9} stroke={EDGE} strokeOpacity={0.75} strokeWidth={1.5} strokeLinejoin="round" />
          <path d={INNER} fill="#bae6fd" fillOpacity={0.5} stroke={EDGE} strokeOpacity={0.5} />
        </g>
        {/* The loop in the flame, on its wire, and the handle it is held by. */}
        <circle cx={108} cy={150} r={8} fill="none" stroke={EDGE} strokeWidth={2} />
        <line x1={114} y1={156} x2={196} y2={246} stroke={EDGE} strokeWidth={2} />
        <line x1={196} y1={246} x2={228} y2={281} stroke={METAL} strokeWidth={9} strokeLinecap="round" />
        {/* The burner: its barrel, the collar that lets air in, and its foot. */}
        <rect x={92} y={232} width={24} height={46} fill={METAL} fillOpacity={0.35} stroke={METAL} strokeWidth={1.5} />
        <rect x={88} y={258} width={32} height={9} rx={2} fill={METAL} />
        <path d="M 66 290 L 76 278 L 132 278 L 142 290 Z" fill={METAL} />
      </svg>
      <button
        {...part(FLAME)}
        aria-label={lookLabel(lookName({ spectrum: [] }, FLAME), looked)}
        style={{ left: percent(PART.left, WIDTH), top: percent(PART.top, HEIGHT), width: percent(PART.width, WIDTH), height: percent(PART.height, HEIGHT) }}
        // The edge is dashed until the flame has been looked at, and whole while it is being looked at; the list beside the picture says the same in words.
        className={`absolute cursor-pointer rounded-md border-2 outline-offset-2 outline-white focus-visible:outline-3 ${open === FLAME ? 'border-white' : looked ? 'border-transparent' : 'border-dashed border-white/70'}`}
      >
        {open === FLAME && (
          // Inside its button, so that a pointer moved onto the callout is still over the flame and the callout stays.
          <span className="absolute top-1/3 left-full z-10 flex -translate-y-1/2 items-center text-left" style={{ width: percent(CALLOUT_RIGHT - PART.left - PART.width, PART.width) }}>
            <span className="w-3 shrink-0 border-t-2 border-white" />
            <span className="rounded-md border-2 border-[#18181b] bg-white px-2 py-1.5 text-sm leading-snug font-medium text-[#18181b]">{seen()}</span>
          </span>
        )}
      </button>
    </div>
  )
}
