import { useId } from 'react'
import { wavelengthColor } from '@/app/explore/spectrum'
import { useExplore } from '@/app/lab/useExplore'
import type { Seen } from '@/engine/flame'
import { PAGE_TEXT, lookLabel } from './messages'
import { LINE_WIDTH, MIN_WIDTH_PX, STRIP, brightness, hitAreas, ticks, xOf, type Scale } from './stripGeometry'

// The strip is black on a dark card in both themes, as a spectroscope's view is; everything in the drawing has a
// fixed colour, the buttons and the callout laid over it too.
const CARD = '#0b0f14'
const INK = '#e4e4e7'
const FOOT = STRIP.top + STRIP.tall

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`

/**
 * The colour a wavelength is drawn in on the strip.
 * ponytail: beyond 740 nm it is the colour of 740 nm. The shared function fades toward 780 nm as the eye does, and
 * potassium's pair near 766 nm, the brightest thing on its strip by what instruments recorded, would be drawn too
 * dark to find. The primer and the record say that a real eye sees that light faintly; a truer picture is the time
 * to draw it so.
 */
const stripColour = (nm: number) => wavelengthColor(Math.min(nm, 740))

export interface SpectroscopeProps {
  scale: Scale
  /** What the strip shows, along the scale. */
  spectrum: readonly Seen[]
  /** For each of them, in the same order, whether it has been looked at. */
  looked: readonly boolean[]
  /** The id of the line that says what to do with the picture. */
  describedBy: string
  /** The name of each: its place in the count until it is looked at, and what a look said from then on. */
  name(at: number): string
  /** What is seen of one, in words. Asked for only when it is looked at, so that nothing of it is on the page before. */
  seen(at: number): string
  /** One has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook(at: number): void
}

/**
 * What the hand spectroscope shows, to be explored: a dark strip over its scale, with a mark every 20 nm, and on
 * the strip every line and band the flame gives, each where the record puts it and in the colour of its
 * wavelength: a sharp line as a thin bright stroke, a broad band as a stretch with soft edges, the brightest of a
 * salt's drawn whole and the others fainter. A button lies over each, as tall as the strip and wide enough for a
 * finger (hitAreas). A mouse pointer over one, keyboard focus on it or a tap looks at it: its edge is drawn whole
 * and a callout over it says where it is, its colour, which of the two it is and how bright it is beside the
 * others, and nothing of what gives it. Nothing in the page names a line or a band by what it is before it is
 * looked at: the buttons are told apart by their place in the count along the strip. The picture is never drawn
 * narrower than MIN_WIDTH_PX: in a card narrower than that it scrolls sideways, its scale with it. Nothing moves.
 */
export function Spectroscope({ scale, spectrum, looked, describedBy, name, seen, onLook }: SpectroscopeProps) {
  const fadeId = useId()
  // A part is its place in the count: the record's own name for a line or a band says what gives it.
  const { open, part } = useExplore<string>((at) => onLook(Number(at)))
  const drawn = spectrum.map((one) => ({ from: xOf(scale, one.fromNm), to: xOf(scale, one.toNm) }))
  const areas = hitAreas(drawn)
  return (
    <div className="w-full overflow-x-auto rounded-lg p-2" style={{ background: CARD }}>
      <div className="relative mx-auto max-w-[45rem]" style={{ minWidth: MIN_WIDTH_PX }}>
        {/* The room a callout stands in, over the strip. */}
        <div className="h-[5.75rem]" />
        <div className="relative">
          <svg viewBox={`0 0 ${STRIP.width} ${STRIP.height}`} role="img" aria-label={PAGE_TEXT.stripPicture} aria-describedby={describedBy} className="block h-auto w-full">
            <defs>
              {spectrum.map(({ feature, fromNm, toNm }, at) =>
                feature.kind === 'band' ? (
                  // Along the band the colour of each wavelength in it, and at its two ends a soft edge.
                  <linearGradient key={at} id={`${fadeId}${at}`}>
                    {[0, 0.14, 0.5, 0.86, 1].map((offset) => (
                      <stop key={offset} offset={offset} stopColor={stripColour(fromNm + offset * (toNm - fromNm))} stopOpacity={offset === 0 || offset === 1 ? 0 : 1} />
                    ))}
                  </linearGradient>
                ) : null,
              )}
            </defs>
            <rect x={0.5} y={STRIP.top} width={STRIP.width - 1} height={STRIP.tall} rx={4} fill="#000000" stroke={INK} strokeOpacity={0.35} />
            {spectrum.map(({ feature, fromNm, toNm }, at) => {
              const { from, to } = drawn[at]!
              const strength = brightness(feature.prominence)
              if (feature.kind === 'band') return <rect key={at} x={from} y={STRIP.top + 1} width={to - from} height={STRIP.tall - 2} fill={`url(#${fadeId}${at})`} opacity={strength} />
              const width = Math.max(LINE_WIDTH, to - from)
              const colour = stripColour((fromNm + toNm) / 2)
              return (
                <g key={at} opacity={strength}>
                  {/* A glow about the line, so that a thin stroke of a dark colour is found. */}
                  <rect x={(from + to) / 2 - width / 2 - 3} y={STRIP.top + 1} width={width + 6} height={STRIP.tall - 2} fill={colour} opacity={0.3} />
                  <rect x={(from + to) / 2 - width / 2} y={STRIP.top + 1} width={width} height={STRIP.tall - 2} fill={colour} />
                </g>
              )
            })}
            {ticks(scale).map(({ nm, x, numbered }) => (
              <g key={nm}>
                <line x1={x} x2={x} y1={FOOT} y2={FOOT + (numbered ? 11 : 6)} stroke={INK} strokeWidth={numbered ? 1.6 : 1} />
                {numbered && (
                  <text x={x} y={FOOT + 27} textAnchor="middle" fontSize={15} fill={INK} className="tabular-nums">
                    {nm}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {spectrum.map((_, at) => {
            const area = areas[at]!
            const wide = area.to - area.from
            const middle = (drawn[at]!.from + drawn[at]!.to) / 2
            const key = String(at)
            return (
              <button
                key={key}
                {...part(key)}
                aria-label={lookLabel(name(at), looked[at]!)}
                style={{ left: percent(area.from, STRIP.width), top: percent(STRIP.top, STRIP.height), width: percent(wide, STRIP.width), height: percent(STRIP.tall, STRIP.height) }}
                // The edge is dashed until the line or band has been looked at, and whole while it is being looked at; the list under the picture says the same in words.
                className={`absolute cursor-pointer rounded-xs border-2 outline-offset-2 outline-white focus-visible:outline-3 ${open === key ? 'border-white' : looked[at] ? 'border-transparent' : 'border-dashed border-white/70'}`}
              >
                {open === key && (
                  <>
                    {/* From the callout down to the thing it speaks of. */}
                    <span className="absolute bottom-full h-2.5 border-l-2 border-white" style={{ left: percent(middle - area.from, wide) }} />
                    {/* A rail as wide as the picture, in which the callout stands over its line or band where there is room and inside the picture always. Inside its button, so that a pointer moved onto the callout is still over the button and the callout stays. */}
                    <span className="pointer-events-none absolute bottom-full z-10 mb-2.5 flex text-left" style={{ left: percent(-area.from, wide), width: percent(STRIP.width, wide) }}>
                      <span
                        className="pointer-events-auto relative w-fit max-w-full rounded-md border-2 border-[#18181b] bg-white px-2 py-1.5 text-sm leading-snug font-medium text-[#18181b]"
                        style={{ left: percent(middle, STRIP.width), transform: `translateX(-${percent(middle, STRIP.width)})` }}
                      >
                        {seen(at)}
                      </span>
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-center text-xs" style={{ color: INK }}>
          {PAGE_TEXT.axis}
        </p>
      </div>
    </div>
  )
}
