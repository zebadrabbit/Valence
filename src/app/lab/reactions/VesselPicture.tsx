import { Hand } from 'lucide-react'
import { useId, type CSSProperties } from 'react'
import { EDGE_HALO, TubeBody, TubeDefs } from '@/app/lab/Tube'
import { coatingHex, liquidHex, metalHex, solidHex } from '@/app/lab/tubeDrawing'
import { useExplore } from '@/app/lab/useExplore'
import type { Look } from '@/chem-data/reactions/data'
import type { VesselShows } from '@/engine/reactions'
import { PAGE_TEXT, WARM_TEXT, lookLabel } from './messages'
import { BENCH, BUBBLES, DRAWING, FLAME, LIGHT, PIECE, TONGS, partsOf, shiftOf, sizeOf, surfaceOf, type Scene } from './vesselLook'

const INK = '#3f3f46'
const percent = (part: number, whole: number) => `${(part / whole) * 100}%`

/** A piece of metal as a bar in its colour; one with a coating is drawn in the coating's colour under a grain, so that it is told from a bare piece by more than its colour. */
function Piece({ id, metal, at }: { id: string; metal: NonNullable<VesselShows['metal']>; at: { x: number; y: number; width: number; height: number } }) {
  return (
    <g data-metal={metal.colour} data-coating={metal.coating ?? undefined}>
      <rect {...at} rx={2} fill={metal.coating === null ? metalHex(metal.colour) : coatingHex(metal.coating)} stroke={INK} strokeWidth={1.5} />
      {metal.coating !== null && <rect {...at} rx={2} fill={`url(#${id}coat)`} />}
    </g>
  )
}

/** The tube: its liquid in its colour, a solid spread through it, the piece of metal in it or beside it, and bubbles. */
function TubeDrawing({ id, shows, surface, narrow }: { id: string; shows: VesselShows; surface: number; narrow: boolean }) {
  const { tube, metal, bubbles } = shows
  const dx = shiftOf(shows, narrow)
  const layers = {
    liquid: tube?.liquid
      ? {
          hex: liquidHex(tube.liquid.colour),
          surface,
          cloudy: tube.liquid.cloudy,
        }
      : null,
    solid: null,
    spread: tube?.solid ? { hex: solidHex(tube.solid.colour) } : null,
  }
  return (
    <>
      <g transform={dx === 0 ? undefined : `translate(${dx} 0)`}>
        <TubeDefs id={id} height={DRAWING} layers={layers} />
        <TubeBody id={id} height={DRAWING} layers={layers} />
        {metal?.placed && <Piece id={id} metal={metal} at={PIECE.placed} />}
        {bubbles !== 'none' && (
          <g data-bubbles={bubbles}>
            {BUBBLES[bubbles].map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" stroke={INK} strokeWidth={1.2} />
            ))}
          </g>
        )}
      </g>
      {metal !== null && !metal.placed && <Piece id={id} metal={metal} at={narrow ? PIECE.besideNarrow : PIECE.beside} />}
    </>
  )
}

const star = (cx: number, cy: number, outer: number, inner: number, points: number) =>
  Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / points - Math.PI / 2
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')

/** The burner with its flame, and the tongs: holding the strip, in the flame with the strip's light about them, or with the powder that is left. Nothing here moves: the light is a star with rays, drawn at rest. */
function FlameDrawing({ shows, scene }: { shows: VesselShows; scene: Scene }) {
  const { metal } = shows
  const inFlame = scene === 'burning' || (scene === 'whole' && (metal?.placed === true || (metal === null && shows.light !== null)))
  const tip = inFlame ? TONGS.inFlame : TONGS.beside
  const light = scene !== 'afterwards' && shows.light !== null
  const residue = scene !== 'burning' && shows.residue !== null
  return (
    <>
      <rect x={34} y={BENCH - 10} width={52} height={10} rx={2} fill="#d4d4d8" stroke={INK} strokeWidth={1.5} />
      <rect x={FLAME.x - 7} y={FLAME.foot} width={14} height={BENCH - 10 - FLAME.foot} fill="#e4e4e7" stroke={INK} strokeWidth={1.5} />
      <path
        d={`M ${FLAME.x - 10} ${FLAME.foot} Q ${FLAME.x - 16} ${FLAME.foot - 26} ${FLAME.x} ${FLAME.top} Q ${FLAME.x + 16} ${FLAME.foot - 26} ${FLAME.x + 10} ${FLAME.foot} Z`}
        fill="#bfdbfe"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d={`M ${FLAME.x - 5} ${FLAME.foot} Q ${FLAME.x - 7} ${FLAME.foot - 14} ${FLAME.x} ${FLAME.foot - 30} Q ${FLAME.x + 7} ${FLAME.foot - 14} ${FLAME.x + 5} ${FLAME.foot} Z`}
        fill="#60a5fa"
        stroke={INK}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {light && (
        <g data-light={shows.light}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (Math.PI * (i + 0.5)) / 4
            return (
              <line
                key={i}
                x1={LIGHT.x + (LIGHT.r + 4) * Math.cos(a)}
                y1={LIGHT.y + (LIGHT.r + 4) * Math.sin(a)}
                x2={LIGHT.x + (LIGHT.r + 13) * Math.cos(a)}
                y2={LIGHT.y + (LIGHT.r + 13) * Math.sin(a)}
                stroke={INK}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )
          })}
          <polygon points={star(LIGHT.x, LIGHT.y, LIGHT.r, LIGHT.r / 2, 12)} fill="#ffffff" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        </g>
      )}
      {metal !== null && (
        <g data-metal={metal.colour}>
          <rect x={tip.x - 50} y={tip.y - 3} width={52} height={8} rx={1.5} fill={metalHex(metal.colour)} stroke={INK} strokeWidth={1.2} />
        </g>
      )}
      <path
        d={`M 232 ${tip.y + 24} L ${tip.x + 36} ${tip.y + 7} L ${tip.x} ${tip.y - 1} M 232 ${tip.y + 42} L ${tip.x + 36} ${tip.y + 11} L ${tip.x} ${tip.y + 5}`}
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={tip.x + 36} cy={tip.y + 9} r={3} fill="#ffffff" stroke={INK} strokeWidth={1.5} />
      {residue && (
        // A little heap between the jaws, with an edge and a grain, so that a white powder shows on the white card and does not read as bubbles.
        <g data-residue={shows.residue} transform={`translate(${tip.x} ${tip.y})`}>
          <path d="M -17 8 Q -15 0 -9 -1 Q -6 -8 0 -5 Q 6 -9 9 -1 Q 14 1 12 8 Z" fill={solidHex(shows.residue!)} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
          <path d="M -11 4 h 0 M -5 0 h 0 M 1 4 h 0 M 6 1 h 0 M -2 -3 h 0 M 8 5 h 0 M -8 6 h 0" stroke={INK} strokeOpacity={0.55} strokeWidth={1.7} strokeLinecap="round" />
        </g>
      )}
    </>
  )
}

export interface VesselPictureProps {
  /** The picture's name. */
  name: string
  shows: VesselShows
  /** Which of the vessel's pictures this is (vesselLook.scenesOf). */
  scene: Scene
  /** The most liquid a tube of the lab comes to hold: a tube is drawn as full as that makes it. */
  full: number
  /** One of several tubes that stand in a row: drawn 160 units wide and not 240. */
  narrow?: boolean
  /** The vessel's looks, and whether each has been made since the vessel last changed. */
  looks: readonly { at: Look; looked: boolean }[]
  /** What is seen at a part, in words. Asked for only while the part is looked at, so that nothing of it is on the page before. */
  seen(at: Look): string
  /** A part has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook(at: Look): void
}

/**
 * One picture of a vessel, to be explored (spec 24.2): a tube with what is in it and beside it, or the burner and
 * the tongs, on a white card as every lab's tube is, so that the colours are judged against white in the dark theme
 * too. A button lies over each part that can be looked at. A mouse pointer over a part, keyboard focus on it or a
 * tap looks at it: the part is outlined, and what is seen there is said under the drawing, on the same card, and
 * nothing else is. That line is a status, so a screen reader says it too. Nothing of what is seen is in the page
 * until then. While no part is looked at, the same room says what to do with the picture, and that sentence is the
 * picture's description. Warmth cannot be drawn: once the tube has been felt, and it is warm, the words stand by the hand.
 * Everything here has a fixed colour, and nothing moves.
 */
export function VesselPicture({ name, shows, scene, full, narrow = false, looks, seen, onLook }: VesselPictureProps) {
  const id = useId()
  const hintId = useId()
  const { width: WIDTH, height: HEIGHT } = sizeOf(narrow)
  const { open, part: looking } = useExplore<Look>(onLook)
  const surface = shows.tube?.liquid ? surfaceOf(shows.tube.liquid.microlitres, full) : BENCH
  const parts = partsOf(
    shows,
    looks.map((look) => look.at),
    scene,
    surface,
    narrow,
  )
  const felt = parts.find((part) => part.at === 'touch')
  return (
    <div className={`relative max-w-full ${narrow ? 'w-40' : 'w-60'}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={name} aria-describedby={hintId} data-scene={scene} className="block h-auto w-full">
        <defs>
          {/* The grain over a coated piece: dots in the ink with a light one beside each, so that it shows on a dark coating and on a pale one. */}
          <pattern id={`${id}coat`} width={6} height={6} patternUnits="userSpaceOnUse">
            <path d="M 1.5 1.5 h 0" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1.6} strokeLinecap="round" />
            <path d="M 4.5 4.5 h 0" stroke="#18181b" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
          </pattern>
        </defs>
        <rect x={1} y={1} width={WIDTH - 2} height={HEIGHT - 2} rx={8} fill="#ffffff" stroke={INK} strokeOpacity={0.35} />
        <line x1={16} x2={WIDTH - 16} y1={BENCH} y2={BENCH} stroke={INK} strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" />
        {shows.drawn === 'tube' ? <TubeDrawing id={id} shows={shows} surface={surface} narrow={narrow} /> : <FlameDrawing shows={shows} scene={scene} />}
      </svg>
      {parts.map(({ at, left, top, width, height }) => {
        const looked = looks.find((look) => look.at === at)?.looked ?? false
        const place: CSSProperties = {
          left: percent(left, WIDTH),
          top: percent(top, HEIGHT),
          width: percent(width, WIDTH),
          height: percent(height, HEIGHT),
        }
        return (
          <button
            key={at}
            {...looking(at)}
            aria-label={lookLabel(shows.drawn, at, looked)}
            style={place}
            // The edge is dashed until the part has been looked at, and whole while it is being looked at; the list beside the picture says the same in words.
            className={`absolute flex cursor-pointer items-center justify-center rounded-xs border-2 outline-offset-2 outline-[#18181b] focus-visible:outline-3 ${open === at ? `border-[#18181b] ${EDGE_HALO}` : looked ? 'border-transparent' : `border-dashed border-[#3f3f46]/60 ${EDGE_HALO}`}`}
          >
            {at === 'touch' && <Hand aria-hidden="true" className="size-7 text-[#3f3f46]" />}
          </button>
        )
      })}
      {/* By the hand, once the tube has been felt: what no drawing shows. */}
      {felt && shows.warm && looks.some((look) => look.at === 'touch' && look.looked) && (
        <p
          style={{
            left: percent(felt.left - 8, WIDTH),
            bottom: percent(HEIGHT - felt.top + 2, HEIGHT),
            width: percent(felt.width + 6, WIDTH),
          }}
          className="absolute text-center text-xs leading-tight font-medium text-[#18181b]"
        >
          {WARM_TEXT}
        </p>
      )}
      {/* What the part looked at shows. Always there, and empty until a part is looked at, so that a screen reader says it when it comes. */}
      <p role="status" style={{ height: percent(HEIGHT - DRAWING - 8, HEIGHT) }} className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end">
        {open !== null && <span className="w-full rounded-md border-2 border-[#18181b] bg-white px-2 py-1 text-sm leading-snug font-medium text-[#18181b]">{seen(open)}</span>}
      </p>
      {/* What to do with the picture, in the same room while nothing is looked at. It says nothing of what is seen. */}
      <p id={hintId} style={{ height: percent(HEIGHT - DRAWING - 8, HEIGHT) }} className={`pointer-events-none absolute inset-x-3 bottom-2 flex items-center text-xs leading-snug text-[#52525b] ${open === null ? '' : 'invisible'}`}>
        {PAGE_TEXT.explore}
      </p>
    </div>
  )
}
