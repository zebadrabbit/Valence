import { useEffect, useId, useState, type CSSProperties } from 'react'
import type { Look, ToolUse } from '@/engine/aqueous'
import { PAGE_TEXT, TOOL_LABEL } from './messages'
import type { TubeLook } from './stationLook'
import './aqueous.css'

// The tube stands on a white card, as the titration lab's flask does, so that the colours are judged against white
// in the dark theme too. Everything in the drawing has a fixed colour, the buttons and callouts laid over it too.
// The picture is 320 by 300 of its own units, and a unit is a pixel wherever its card has 320 px for it: the tube
// in the left of it, and the room beside the tube for what a look says.
const WIDTH = 320
const HEIGHT = 300
const INK = '#3f3f46'
const GLASS = 'M 48 20 L 48 236 A 40 40 0 0 0 128 236 L 128 20'
const SURFACE = 104
/**
 * The three sections of what is in the tube, from the top, each by where it begins and ends: the liquid's surface,
 * where bubbles rise and break; the body of the liquid; and the bottom, where a solid settles. Each is the target
 * of its look, and is 58 px or more tall at full size, the bottom with no solid in it and the surface with no
 * bubbles too. They lie just inside the glass.
 */
const SECTIONS: readonly (readonly [look: Look, top: number, bottom: number])[] = [
  ['look-surface', 92, 152],
  ['look-liquid', 152, 216],
  ['look-bottom', 216, 274],
]
const SECTION_LEFT = 50
const SECTION_WIDTH = 76
/** Where a callout ends: 10 short of the card's right edge. */
const CALLOUT_RIGHT = 310
const BUBBLES = [
  [66, 142, 5],
  [104, 124, 4],
  [84, 170, 5.5],
  [108, 196, 4],
  [70, 204, 4.5],
  [92, 116, 4],
] as const

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`
/** The looks of a tube in the order they are drawn in, from the top. */
export const STACK: readonly Look[] = SECTIONS.map(([look]) => look)

export interface TubeProps {
  look: TubeLook
  reducedMotion: boolean
  /** The id of the line beside the picture that says what to do with it. */
  describedBy: string
  /** The station's uses of its tools, and those made: the looks among them are the sections drawn as buttons and those looked at. */
  uses: readonly ToolUse[]
  used: readonly ToolUse[]
  /** What is seen in a section, in words. Asked for only when the section is looked at, so that nothing of it is on the page before. */
  seen(look: Look): string
  /** A section has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook(look: Look): void
}

/**
 * A station's tube once it is mixed, to be explored: the liquid in its colour, a layer of solid in its colour
 * where one forms, and bubbles where a gas comes off, with a button laid over each section of it. A mouse pointer
 * over a section, keyboard focus on it or a tap looks at it: the section is outlined and a callout beside it says
 * what is seen there and nothing else. The callout goes when the pointer leaves or focus does, at Escape, and on a
 * touch screen when another section or anywhere else is tapped. Nothing of what is seen is in the page until
 * then, and the colour is always in the callout's words. The bubbles move only where `reducedMotion` is false;
 * under it they are drawn at rest. Nothing else here moves.
 */
export function Tube({ look, reducedMotion, describedBy, uses, used, seen, onLook }: TubeProps) {
  const clipId = useId()
  const [open, setOpen] = useState<Look | null>(null)
  // A tap anywhere but on a section closes the callout: a finger does not leave a section as a mouse pointer does.
  useEffect(() => {
    if (open === null) return
    const away = (event: PointerEvent) => {
      if (!(event.target instanceof Element && event.target.closest('[data-part]'))) setOpen(null)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  // ponytail: a mouse pointer that crosses a section has looked at it, with no time asked of it, so a pointer swept
  // down the tube opens all three questions. Ask for a moment's rest on a section if that is found to be done unread.
  const show = (part: Look) => {
    // Focus and then the click of one tap, or a press on a section already open, is one look and is said once.
    if (open === part) return
    setOpen(part)
    onLook(part)
  }
  const close = (part: Look) => setOpen((now) => (now === part ? null : now))

  return (
    <div className="relative w-80 max-w-full shrink-0">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={PAGE_TEXT.tubePicture} aria-describedby={describedBy} className="block h-auto w-full">
        <defs>
          <clipPath id={clipId}>
            <path d={`${GLASS} Z`} />
          </clipPath>
          {/* The liquid alone: a bubble that rises is not drawn above the surface it breaks at. */}
          <clipPath id={`${clipId}liquid`}>
            <path d={`M 48 ${SURFACE} H 128 V ${HEIGHT} H 48 Z`} />
          </clipPath>
        </defs>
        <rect x={1} y={1} width={WIDTH - 2} height={HEIGHT - 2} rx={8} fill="#ffffff" stroke={INK} strokeOpacity={0.35} />
        <g clipPath={`url(#${clipId})`}>
          <rect x={48} y={SURFACE} width={80} height={HEIGHT - SURFACE} fill={look.liquid.hex} />
          {look.solid && <rect x={48} y={SECTIONS[2]![1]} width={80} height={HEIGHT} fill={look.solid.hex} stroke={INK} strokeWidth={1.2} />}
          {look.bubbles && (
            <g clipPath={`url(#${clipId}liquid)`}>
              {BUBBLES.map(([cx, cy, r]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" stroke={INK} strokeWidth={1.2} className={reducedMotion ? undefined : 'aq-bubble'} />
              ))}
            </g>
          )}
        </g>
        <line x1={48} x2={128} y1={SURFACE} y2={SURFACE} stroke={INK} strokeOpacity={0.5} strokeWidth={1.5} />
        <path d={GLASS} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M 42 20 L 134 20" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      </svg>
      {SECTIONS.filter(([part]) => uses.includes(part)).map(([part, top, bottom]) => {
        const looked = used.includes(part)
        const place: CSSProperties = { left: percent(SECTION_LEFT, WIDTH), top: percent(top, HEIGHT), width: percent(SECTION_WIDTH, WIDTH), height: percent(bottom - top, HEIGHT) }
        // The bottom section is rounded as the glass under it is.
        if (part === 'look-bottom') place.borderRadius = '2px 2px 50% 50% / 2px 2px 65% 65%'
        return (
          <button
            key={part}
            type="button"
            data-part={part}
            aria-label={looked ? `${TOOL_LABEL[part]}, ${PAGE_TEXT.lookedAt}` : TOOL_LABEL[part]}
            style={place}
            // The edge is dashed until the section has been looked at, and whole while it is being looked at; the list beside the picture says the same in words.
            className={`absolute cursor-pointer rounded-xs border-2 outline-offset-2 outline-[#18181b] focus-visible:outline-3 ${open === part ? 'border-[#18181b]' : looked ? 'border-transparent' : 'border-dashed border-[#3f3f46]/60'}`}
            onPointerEnter={(event) => event.pointerType === 'mouse' && show(part)}
            onPointerLeave={(event) => event.pointerType === 'mouse' && close(part)}
            onFocus={() => show(part)}
            onBlur={() => close(part)}
            onClick={() => show(part)}
            onKeyDown={(event) => event.key === 'Escape' && close(part)}
          >
            {open === part && (
              // Inside its button, so that a pointer moved onto the callout is still over the section and the callout stays.
              <span className="absolute top-1/2 left-full z-10 flex -translate-y-1/2 items-center text-left" style={{ width: percent(CALLOUT_RIGHT - SECTION_LEFT - SECTION_WIDTH, SECTION_WIDTH) }}>
                <span className="w-3 shrink-0 border-t-2 border-[#18181b]" />
                <span className="rounded-md border-2 border-[#18181b] bg-white px-2 py-1.5 text-sm leading-snug font-medium text-[#18181b]">{seen(part)}</span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
