import type { BalanceView, DensityModel, Eye, ScaleView } from '@/engine/density'
import { readingText } from './messages'
import { along, closerPad, marksIn, type MarkKind, type ScaleMark, type Stretch } from './scaleGeometry'

/** What a scale is drawn from. A ScaleView is one; so is the scale of an empty cylinder, with nothing standing against it. */
export type ScaleLook = Pick<ScaleView, 'instrument' | 'fromE3' | 'toE3' | 'markE3' | 'numberE3' | 'unit'> & { atE3: number | null }

export interface ScaleDrawingProps {
  look: ScaleLook
  /** The stretch of the scale a closer look shows. Absent for the instrument as it stands on the bench. */
  closer?: Stretch | undefined
  /** The cylinder's: where the eye is, and whether the pieces of metal are in it. */
  eye?: Eye
  pieces?: boolean
  name: string
  /** The id of the words that say the same. */
  describedBy: string
}

// Screen pixels, not drawing units (vector-effect below), so that a mark is as thick wherever the picture is drawn.
const WEIGHT: Record<MarkKind, number> = { numbered: 2, half: 1.5, minor: 1 }
const FRAME = 'block rounded-md border bg-background text-foreground'

/** The marks of a scale as a real one has them: a long mark at each numbered value with its number, shorter marks between. `span` is where each kind begins and ends across the scale, and `numbers` where the numbers stand. */
function Marks({ marks, at, upright, span, numbers, size }: { marks: readonly ScaleMark[]; at(atE3: number): number; upright: boolean; span: Record<MarkKind, readonly [number, number]>; numbers: number; size: number }) {
  return (
    <>
      <g shapeRendering="crispEdges" stroke="currentColor">
        {marks.map((mark) => {
          const [from, to] = span[mark.kind]
          const place = at(mark.atE3)
          const line = upright ? { x1: from, x2: to, y1: place, y2: place } : { x1: place, x2: place, y1: from, y2: to }
          return <line key={mark.atE3} {...line} data-mark={mark.kind} strokeWidth={WEIGHT[mark.kind]} vectorEffect="non-scaling-stroke" />
        })}
      </g>
      {marks.map(
        (mark) =>
          mark.label !== null && (
            <text key={mark.atE3} {...(upright ? { x: numbers, y: at(mark.atE3), dominantBaseline: 'central' } : { x: at(mark.atE3), y: numbers, textAnchor: 'middle' })} fontSize={size} fontWeight={600} fill="currentColor" className="tabular-nums">
              {mark.label}
            </text>
          ),
      )}
    </>
  )
}

const Unit = ({ x, y, size, children }: { x: number; y: number; size: number; children: string }) => (
  <text x={x} y={y} textAnchor="end" fontSize={size} fill="currentColor" fillOpacity={0.75}>
    {children}
  </text>
)

/** A ruler of clear plastic lying across the paper note, the note's near edge on the zero mark: its far edge is seen across the marks. */
function Ruler({ look, closer, name, describedBy }: ScaleDrawingProps) {
  const W = 460
  const H = closer ? 116 : 66
  const edge = closer ? 26 : 20
  const reach = closer ? { numbered: 40, half: 30, minor: 21 } : { numbered: 16, half: 11, minor: 7 }
  const pad = closer ? closerPad(look, closer, W) : 20
  const x = along(closer ?? look, W, pad, pad)
  const near = Math.max(x(0), -4)
  const top = closer ? 7 : 5
  const span = { numbered: [edge, edge + reach.numbered], half: [edge, edge + reach.half], minor: [edge, edge + reach.minor] } as const
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name} aria-describedby={describedBy} data-closer={closer ? '' : undefined} className={`${FRAME} h-auto w-full max-w-[32rem]`}>
      {look.atE3 !== null && (
        <g data-thing="note">
          <rect x={near} y={top} width={x(look.atE3) - near} height={H} fill="currentColor" fillOpacity={0.14} />
          {/* The note's edges: its far edge runs down across the marks and stops short of the numbers, so that it crosses none. */}
          <path d={`M ${near} ${top} H ${x(look.atE3)} V ${edge + reach.numbered + 5}`} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" shapeRendering="crispEdges" />
        </g>
      )}
      <rect x={closer ? -4 : 5} y={edge} width={closer ? W + 8 : W - 10} height={H - edge - (closer ? 8 : 5)} rx={closer ? 0 : 4} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeWidth={1.5} />
      <Marks marks={marksIn(look, closer ?? look)} at={x} upright={false} span={span} numbers={edge + reach.numbered + (closer ? 26 : 13)} size={closer ? 24 : 11} />
      <Unit x={W - 8} y={H - (closer ? 13 : 8)} size={closer ? 13 : 9}>
        {look.unit}
      </Unit>
    </svg>
  )
}

/** A liquid's surface from wall to wall, its lowest point, in the middle of the glass, exactly at `bottom`. */
const surface = (left: number, right: number, bottom: number, rise: number) => `M ${left} ${bottom - rise} Q ${(left + right) / 2} ${bottom + rise} ${right} ${bottom - rise}`

/** The pieces of metal at the foot of the cylinder, as far right of its left wall and as far over its floor: drawn alike whichever metal they are. */
const PIECES = ['4,-2 17,-2 18,-11 6,-13', '19,-2 33,-2 32,-12 21,-10', '35,-2 47,-2 46,-10 36,-12', '7,-14 21,-12 20,-22 9,-23', '23,-13 38,-13 36,-23 25,-21', '13,-24 28,-24 26,-33 15,-32']
/** Where the eye is drawn beside the cylinder on the bench: so far over or under the level it looks at. */
const EYE_OFF: Record<Eye, number> = { above: -64, level: 0, below: 64 }

function Cylinder({ look, closer, eye = 'level', pieces = false, name, describedBy }: ScaleDrawingProps) {
  const [W, H, L, R] = closer ? [264, 420, 24, 184] : [170, 300, 80, 130]
  const MID = (L + R) / 2
  const [below, above] = closer ? [closerPad(look, closer, H), closerPad(look, closer, H)] : [34, 26]
  const up = along(closer ?? look, H, below, above)
  const y = (atE3: number) => H - up(atE3)
  // How far up the glass the liquid stands at the walls: three tenths of a mark, more than a reading is allowed to be out, so that the top of the curve is not the level.
  const rise = y(0) - y(0.3 * look.markE3)
  const bottom = look.atE3 === null ? null : y(look.atE3)
  const floor = closer ? H + 4 : y(0)
  const half = closer ? { half: 55, minor: 38 } : { half: 16, minor: 11 }
  const span = { numbered: [L, R], half: [MID - half.half, MID + half.half], minor: [MID - half.minor, MID + half.minor] } as const
  // The eye, beside the cylinder as it stands on the bench: over, level with or under the level it looks at, or the middle of an empty cylinder.
  const eyeAt = Math.min(H - 14, Math.max(14, (bottom ?? H / 2) + EYE_OFF[eye]))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name} aria-describedby={describedBy} data-closer={closer ? '' : undefined} className={`${FRAME} ${closer ? 'h-[420px] w-[264px]' : 'h-[300px] w-[170px]'} max-w-full`}>
      {bottom !== null && (
        <>
          <path data-thing="liquid" d={`${surface(L, R, bottom, rise)} V ${floor} H ${L} Z`} fill="currentColor" fillOpacity={0.1} />
          {/* The curve: a darker band with no outline, so that its lower edge is the level itself and not a stroke's width off it. */}
          <path d={`${surface(L, R, bottom, rise)} Z`} fill="currentColor" fillOpacity={0.55} />
          {/* Seen from above or from below, the surface is no longer a line: its rim shows as a ring. */}
          {closer && eye !== 'level' && <ellipse data-thing="rim" cx={MID} cy={bottom - rise} rx={(R - L) / 2} ry={9} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.5} />}
        </>
      )}
      {!closer && pieces && (
        <g data-thing="pieces" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} transform={`translate(${L} ${floor})`}>
          {PIECES.map((points) => (
            <polygon key={points} points={points} />
          ))}
        </g>
      )}
      {closer ? (
        <path d={`M ${L} -4 V ${H + 4} M ${R} -4 V ${H + 4}`} fill="none" stroke="currentColor" strokeWidth={3} />
      ) : (
        <>
          <path d={`M ${L - 6} 8 L ${L} 14 V ${floor} H ${R} V 14 L ${R + 4} 10`} fill="none" stroke="currentColor" strokeWidth={2} />
          <rect x={L - 18} y={floor} width={R - L + 36} height={11} rx={3} fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeWidth={2} />
          <g data-thing="eye" data-eye={eye}>
            {bottom !== null && <line x1={43} y1={eyeAt} x2={L} y2={bottom} stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 3" />}
            <ellipse cx={28} cy={eyeAt} rx={13} ry={7.5} fill="none" stroke="currentColor" strokeWidth={2} />
            <circle cx={31} cy={eyeAt} r={3.5} fill="currentColor" />
          </g>
        </>
      )}
      <Marks marks={marksIn(look, closer ?? look)} at={y} upright span={span} numbers={R + (closer ? 12 : 7)} size={closer ? 24 : 10} />
      <Unit x={W - (closer ? 8 : 6)} y={closer ? 22 : 12} size={closer ? 14 : 9}>
        {look.unit}
      </Unit>
    </svg>
  )
}

/** The lower end of the thermometer on the bench: its scale goes on above the picture. */
const THERMOMETER_SHOWN: Stretch = { fromE3: -10000, toE3: 54000 }

function Thermometer({ look, closer, name, describedBy }: ScaleDrawingProps) {
  const [W, H] = closer ? [264, 420] : [160, 380]
  const stretch = closer ?? THERMOMETER_SHOWN
  const [below, above] = closer ? [closerPad(look, closer, H), closerPad(look, closer, H)] : [80, 2]
  const up = along(stretch, H, below, above)
  const y = (atE3: number) => H - up(atE3)
  const top = look.atE3 === null ? null : y(look.atE3)
  const span = closer ? ({ numbered: [74, 180], half: [74, 144], minor: [74, 124] } as const) : ({ numbered: [77, 95], half: [77, 89], minor: [77, 84] } as const)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name} aria-describedby={describedBy} data-closer={closer ? '' : undefined} className={`${FRAME} ${closer ? 'h-[420px] w-[264px]' : 'h-[380px] w-[160px]'} max-w-full`}>
      {closer ? (
        <>
          <rect x={24} y={-4} width={160} height={H + 8} fill="currentColor" fillOpacity={0.04} stroke="currentColor" strokeWidth={3} />
          <rect x={44} y={-4} width={24} height={H + 8} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
          {top !== null && <rect data-thing="thread" x={44} y={top} width={24} height={H + 4 - top} fill="currentColor" fillOpacity={0.75} shapeRendering="crispEdges" />}
        </>
      ) : (
        <>
          {/* The beaker of ice and water the thermometer stands in. */}
          <rect x={16} y={286} width={128} height={86} fill="currentColor" fillOpacity={0.1} />
          <g data-thing="ice" fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.6} strokeWidth={1}>
            {['22 290 18 -8', '38 314 16 12', '124 318 16 10', '26 342 15 -14', '108 344 15 9'].map((ice) => {
              const [left, over, size, turn] = ice.split(' ').map(Number) as [number, number, number, number]
              return <rect key={ice} x={left} y={over} width={size} height={size} rx={2} transform={`rotate(${turn} ${left + size / 2} ${over + size / 2})`} />
            })}
          </g>
          <path d="M 14 264 V 364 Q 14 374 24 374 H 136 Q 146 374 146 364 V 264" fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="M 59 -4 V 328 M 77 -4 V 328" fill="none" stroke="currentColor" strokeWidth={1.5} />
          <circle cx={68} cy={339} r={13} fill="currentColor" fillOpacity={0.75} stroke="currentColor" strokeWidth={1.5} />
          {top !== null && <rect data-thing="thread" x={65} y={top} width={6} height={332 - top} fill="currentColor" fillOpacity={0.75} />}
        </>
      )}
      <Marks marks={marksIn(look, stretch)} at={y} upright span={span} numbers={closer ? 196 : 99} size={closer ? 24 : 10} />
      <Unit x={W - (closer ? 8 : 6)} y={closer ? 22 : 12} size={closer ? 14 : 9}>
        {look.unit}
      </Unit>
    </svg>
  )
}

/**
 * A scale drawn to be read, with what is measured standing against it: the paper note under a ruler, the liquid
 * and its curve in the cylinder with the pieces of metal at its foot, the thread of the thermometer in its beaker
 * of ice and water. With `closer`, that stretch of the scale alone, large enough that the tenths of the gap
 * between two marks can be judged. The picture holds the numbers the scale prints and no other: what it reads is
 * for the learner to make out.
 */
export function ScaleDrawing(props: ScaleDrawingProps) {
  const { instrument } = props.look
  return instrument === 'cylinder' ? <Cylinder {...props} /> : instrument === 'thermometer' ? <Thermometer {...props} /> : <Ruler {...props} />
}

const ON_PAN: Record<BalanceView['holds'], 'nothing' | 'object' | 'cylinder' | 'pieces'> = { nothing: 'nothing', object: 'object', 'empty-cylinder': 'cylinder', 'cylinder-with-liquid': 'cylinder', pieces: 'pieces', 'wet-pieces': 'pieces' }

/** The balance: a display of figures, every one of which is the reading, and what stands on its pan. With nothing on it, it shows zero. */
export function BalanceDrawing({ m, balance, name, describedBy }: { m: DensityModel; balance: BalanceView; name: string; describedBy: string }) {
  const on = ON_PAN[balance.holds]
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label={name} aria-describedby={describedBy} className={`${FRAME} h-auto w-full max-w-[20rem]`}>
      {on === 'object' && <rect data-thing="object" x={130} y={62} width={60} height={42} rx={4} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={2} />}
      {on === 'cylinder' && (
        <g data-thing="cylinder">
          {balance.holds === 'cylinder-with-liquid' && <rect x={147} y={48} width={26} height={50} fill="currentColor" fillOpacity={0.25} />}
          <path d="M 143 6 L 147 10 V 98 H 173 V 10 L 176 7" fill="none" stroke="currentColor" strokeWidth={2} />
          <rect x={136} y={98} width={48} height={6} rx={2} fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeWidth={2} />
        </g>
      )}
      {on === 'pieces' && (
        <g data-thing="pieces" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1}>
          {['126,104 142,104 143,93 128,91', '146,104 163,104 161,92 148,94', '167,104 182,104 181,94 168,92', '136,90 152,92 150,80 138,79', '156,91 173,91 171,79 158,81'].map((points) => (
            <polygon key={points} points={points} />
          ))}
          {/* Wet from the cylinder: the water on them, as drops on the pan. */}
          {balance.holds === 'wet-pieces' && [118, 190, 198].map((x) => <ellipse key={x} cx={x} cy={102} rx={5} ry={2} fill="none" strokeWidth={1.5} />)}
        </g>
      )}
      <rect x={70} y={104} width={180} height={8} rx={3} fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={2} />
      <rect x={150} y={112} width={20} height={12} fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={2} />
      <rect x={36} y={124} width={248} height={78} rx={10} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeWidth={2} />
      <rect x={76} y={138} width={168} height={50} rx={6} fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth={1.5} />
      <text data-thing="display" x={160} y={164} textAnchor="middle" dominantBaseline="central" fontSize={30} fontWeight={600} fill="currentColor" className="font-mono tabular-nums">
        {readingText(m, 'balance', balance.cg ?? 0)}
      </text>
    </svg>
  )
}
