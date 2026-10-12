import { useId, type CSSProperties, type ReactNode } from 'react'
import { useExplore } from './useExplore'

// A test tube that is explored: the aqueous reactions lab's, the Group I cations lab's, the Le Chatelier's principle lab's, the red cabbage pH lab's and the polarity and mixing
// lab's, whose tube alone holds two liquids, one lying on the other. The tube stands on a
// white card, as the titration lab's flask does, so that the colours are judged against white in the dark theme
// too. Everything in the drawing has a fixed colour, the buttons and callouts laid over it too. The picture is 320
// of its own units wide, and a unit is a pixel wherever its card has 320 px for it: the tube in the left of it, and
// the room beside the tube for what a look says.
const WIDTH = 320
const INK = '#3f3f46'
const SECTION_LEFT = 50
const SECTION_WIDTH = 76
/** Where a callout ends: 10 short of the card's right edge. */
const CALLOUT_RIGHT = 310
const BRACE_X = 136
/**
 * A light line about the edge of a section, which is drawn in the ink over whatever the tube holds: on a dark liquid
 * or a dark solid the ink does not show, and the light line does; on the white card and on a pale liquid it is the
 * light line that is not seen. So an edge shows on anything a lab puts in a tube.
 */
export const EDGE_HALO = 'shadow-[0_0_0_1.5px_rgb(255_255_255/0.85)]'
/** The line between two liquids of which one lies on the other: its colour, and how heavy it is in the picture's units. */
export const LAYER_LINE = { stroke: INK, width: 2 } as const
const BUBBLES = [
  [66, 142, 5],
  [104, 124, 4],
  [84, 170, 5.5],
  [108, 196, 4],
  [70, 204, 4.5],
  [92, 116, 4],
] as const

/** Short waves in rows through a liquid whose surface is at `surface`, each row set off from the one over it, `down` units under where the row stands. */
function wisps(surface: number, height: number, down: number): string {
  const waves: string[] = []
  for (let y = surface + 9, row = 0; y < height - 20; y += 16, row++) for (let x = row % 2 === 0 ? 52 : 63; x < 118; x += 22) waves.push(`M ${x} ${y + down} q 3 -3 6 0 t 6 0`)
  return waves.join(' ')
}

/** The glass of a tube in a picture `height` tall: from its mouth at 20 down to a round foot. */
const glass = (height: number) => `M 48 20 L 48 ${height - 64} A 40 40 0 0 0 128 ${height - 64} L 128 20`
/** Where the contents of that tube end, just inside the glass at its foot. */
export const contentsEnd = (height: number) => height - 26

/** What is in a tube, as it is drawn. A colour here is the drawing's own value; what has a source is the word a look says. */
export interface TubeLayers {
  /** The liquid, and where down the picture its surface is. Null for a tube with no liquid in it. `cloudy` draws wisps through it, so that a cloudy liquid is told from a clear one of the same colour by more than a word (the red cabbage pH lab's). */
  liquid: { hex: string; surface: number; cloudy?: boolean } | null
  /**
   * A second liquid lying on the first, from its own surface down to the first's (the polarity and mixing lab's). The
   * two are drawn as two bands with a line between them that does not rest on either's colour: two liquids with no
   * colour are two bands of one grey, and the line is what is seen. Never set without `liquid`.
   */
  above?: { hex: string; surface: number } | null
  /** A solid that lies at the bottom, from `top` down to the foot. `grain` is the colour of the grain over it, where the ink would not show on it. */
  solid: { hex: string; top: number; grain?: string } | null
  /** A solid spread through the liquid and not yet settled: drawn as specks of its colour all through it. */
  spread?: { hex: string } | null
  /** Bubbles in the liquid; `moving` is the class that makes them rise, where anything may move. */
  bubbles?: { moving: string | undefined } | null
}

/** The words beside the brackets that say which layer is which. */
export interface LayerWords {
  /** The liquid; the lower of two. */
  liquid: string
  solid: string
  /** The upper of two liquids. */
  above?: string
  /** A liquid with a solid spread through it. */
  spread?: string
}

/**
 * A curly bracket beside the tube over one layer of what is in it, with the layer's kind in a word: which part is
 * liquid and which is settled solid is not always plain from two blocks of colour.
 */
function Brace({ at, from, to, word }: { at: number; from: number; to: number; word: string }) {
  const middle = (from + to) / 2
  return (
    <g>
      <path d={`M ${at} ${from + 2} q 6 0 6 6 V ${middle - 6} q 0 6 6 6 q -6 0 -6 6 V ${to - 8} q 0 6 -6 6`} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      <text x={at + 17} y={middle} dominantBaseline="central" fontSize={13} fill={INK}>
        {word}
      </text>
    </g>
  )
}

/** What the drawing of a tube needs defined before it is drawn: where its contents are cut to the glass, and the grain of a solid. `id` is the tube's own. */
export function TubeDefs({ id, height, layers }: { id: string; height: number; layers: TubeLayers }) {
  return (
    <defs>
      <clipPath id={id}>
        <path d={`${glass(height)} Z`} />
      </clipPath>
      {/* Grains over the settled solid, so that it does not read as a second liquid, and a white one shows on the white card. */}
      <pattern id={`${id}grain`} width={7} height={7} patternUnits="userSpaceOnUse">
        {/* Two dots, as round-capped strokes of no length. */}
        <path d="M 1.6 1.8 h 0 M 5.2 5 h 0" stroke={layers.solid?.grain ?? INK} strokeOpacity={0.5} strokeWidth={1.8} strokeLinecap="round" />
      </pattern>
      {/* The liquid alone: a bubble that rises is not drawn above the surface it breaks at. */}
      {layers.liquid && (
        <clipPath id={`${id}liquid`}>
          <path d={`M 48 ${layers.liquid.surface} H 128 V ${height} H 48 Z`} />
        </clipPath>
      )}
      {/* Specks of a solid that has not settled, each with an edge, so that a white one shows in a pale liquid and a yellow one in a yellow liquid. */}
      {layers.spread && (
        <pattern id={`${id}spread`} width={18} height={18} patternUnits="userSpaceOnUse">
          <circle cx={4.5} cy={5} r={2.6} fill={layers.spread.hex} stroke={INK} strokeWidth={1} />
          <circle cx={13.5} cy={13.5} r={2.1} fill={layers.spread.hex} stroke={INK} strokeWidth={1} />
        </pattern>
      )}
    </defs>
  )
}

/**
 * A tube as it is drawn: the liquid in its colour up to its surface, a solid at the bottom in its colour under a
 * grain and with an edge, or spread through the liquid as specks, bubbles where there are any, and the glass over
 * them. A second liquid lies on the first as a band of its own, with a line between the two. With `words`, a bracket
 * beside each layer says which it is: beside the glass, or at `bracesAt` where something that stands about the tube
 * needs that room. Nothing here is a control.
 */
export function TubeBody({ id, height, layers, words, bracesAt = BRACE_X }: { id: string; height: number; layers: TubeLayers; words?: LayerWords | undefined; bracesAt?: number | undefined }) {
  const { liquid, solid, spread, bubbles } = layers
  const above = liquid ? layers.above : null
  const end = contentsEnd(height)
  return (
    <>
      <g clipPath={`url(#${id})`}>
        {liquid && <rect x={48} y={liquid.surface} width={80} height={height - liquid.surface} fill={liquid.hex} />}
        {liquid && above && <rect x={48} y={above.surface} width={80} height={liquid.surface - above.surface} fill={above.hex} />}
        {/* Wisps through a cloudy liquid, in the ink and faint with a light line under each, so that they show on a white liquid and on a dark one. Drawn as one path and not as a pattern: a pattern of them was drawn as a white band across the window by the one browser tried. */}
        {liquid?.cloudy && (
          <>
            <path d={wisps(liquid.surface, height, 0)} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={1.3} strokeLinecap="round" />
            <path d={wisps(liquid.surface, height, 1.5)} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.3} strokeLinecap="round" />
          </>
        )}
        {liquid && spread && <rect x={48} y={liquid.surface} width={80} height={height - liquid.surface} fill={`url(#${id}spread)`} />}
        {solid && (
          <>
            <rect x={48} y={solid.top} width={80} height={height} fill={solid.hex} stroke={INK} strokeWidth={1.2} />
            <rect x={48} y={solid.top} width={80} height={height} fill={`url(#${id}grain)`} />
          </>
        )}
        {bubbles && (
          <g clipPath={`url(#${id}liquid)`}>
            {BUBBLES.map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" stroke={INK} strokeWidth={1.2} className={bubbles.moving} />
            ))}
          </g>
        )}
      </g>
      {liquid && !above && <line x1={48} x2={128} y1={liquid.surface} y2={liquid.surface} stroke={INK} strokeOpacity={0.5} strokeWidth={1.5} />}
      {liquid && above && (
        <>
          <line x1={48} x2={128} y1={above.surface} y2={above.surface} stroke={INK} strokeOpacity={0.5} strokeWidth={1.5} />
          {/* Where one liquid lies on the other: a plain line in the whole ink, heavier than a surface's, on the lower liquid's own colour and on the upper's. It is what tells two liquids of one colour apart, and the card is white in both themes. */}
          <line x1={48} x2={128} y1={liquid.surface} y2={liquid.surface} stroke={LAYER_LINE.stroke} strokeWidth={LAYER_LINE.width} />
        </>
      )}
      <path d={glass(height)} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M 42 20 L 134 20" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      {words && liquid && above && <Brace at={bracesAt} from={above.surface} to={liquid.surface} word={words.above ?? words.liquid} />}
      {words && liquid && <Brace at={bracesAt} from={liquid.surface} to={solid ? solid.top : end} word={spread ? (words.spread ?? words.liquid) : words.liquid} />}
      {words && solid && <Brace at={bracesAt} from={solid.top} to={end} word={words.solid} />}
    </>
  )
}

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`

/** One section of what is in the tube, by where down the picture it begins and ends: the target of its look. */
export interface TubeSection<Part extends string> {
  part: Part
  top: number
  bottom: number
  /** Its button's name, which says too whether it has been looked at. */
  name: string
  looked: boolean
  /** It is the foot of the tube: rounded as the glass under it is. */
  foot?: boolean
}

export interface TubeProps<Part extends string> {
  /** The picture's name, and the id of the line beside it that says what to do with it. */
  name: string
  describedBy: string
  /** How tall the picture is, of its own units. */
  height: number
  layers: TubeLayers
  words: LayerWords
  /** The sections drawn as buttons, from the top: the liquid and the bottom, or each of two liquids by itself. Each is 58 units or more tall. */
  sections: readonly TubeSection<Part>[]
  /** What is seen in a section, in words. Asked for only when the section is looked at, so that nothing of it is on the page before. */
  seen(part: Part): string
  /** A section has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook(part: Part): void
  /**
   * What the tube stands in, drawn behind it: a bath. The inside of the glass is drawn white over it, so that what
   * is in the tube is judged against white all the same, and the brackets stand at `bracesAt`, clear of it.
   */
  behind?: ReactNode
  bracesAt?: number | undefined
  /** More to draw on the card, in the room beside the tube. */
  children?: ReactNode
}

/**
 * A tube to be explored: its drawing, with a button laid over each section of it. A mouse pointer over a section,
 * keyboard focus on it or a tap looks at it: the section is outlined and a callout beside it says what is seen
 * there and nothing else. The callout goes when the pointer leaves or focus does, at Escape, and on a touch screen
 * when another section or anywhere else is tapped. Nothing of what is seen is in the page until then, and the
 * colour is always in the callout's words.
 */
export function Tube<Part extends string>({ name, describedBy, height, layers, words, sections, seen, onLook, behind, bracesAt, children }: TubeProps<Part>) {
  const clipId = useId()
  const { open, part: looking } = useExplore<Part>(onLook)

  return (
    <div className="relative w-80 max-w-full shrink-0">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={name} aria-describedby={describedBy} className="block h-auto w-full">
        <TubeDefs id={clipId} height={height} layers={layers} />
        <rect x={1} y={1} width={WIDTH - 2} height={height - 2} rx={8} fill="#ffffff" stroke={INK} strokeOpacity={0.35} />
        {behind}
        {behind && <path d={`${glass(height)} Z`} fill="#ffffff" />}
        <TubeBody id={clipId} height={height} layers={layers} words={words} bracesAt={bracesAt} />
        {children}
      </svg>
      {sections.map(({ part, top, bottom, name: label, looked, foot }) => {
        const place: CSSProperties = { left: percent(SECTION_LEFT, WIDTH), top: percent(top, height), width: percent(SECTION_WIDTH, WIDTH), height: percent(bottom - top, height) }
        if (foot) place.borderRadius = '2px 2px 50% 50% / 2px 2px 65% 65%'
        return (
          <button
            key={part}
            {...looking(part)}
            aria-label={label}
            style={place}
            // The edge is dashed until the section has been looked at, and whole while it is being looked at; the list beside the picture says the same in words. A section that has been looked at and is not being has no edge, and no light line.
            className={`absolute cursor-pointer rounded-xs border-2 outline-offset-2 outline-[#18181b] focus-visible:outline-3 ${open === part ? `border-[#18181b] ${EDGE_HALO}` : looked ? 'border-transparent' : `border-dashed border-[#3f3f46]/60 ${EDGE_HALO}`}`}
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
