import type { ReactNode } from 'react'
import type { Look, RunView } from '@/engine/clock'
import './clock.css'

// The flasks of a run, drawn. The picture stands on a white card in both themes, in its own ink, so that the liquid
// is judged against white whatever the theme. It is hidden from assistive technology: the card it stands in says
// the same in words beside it. Nothing in it says what the liquid will do.

const INK = '#1f2933'
const CARD = '#ffffff'
const WATER = '#cfe3f1'
/**
 * What a liquid is drawn in, for each look the engine gives: this reaction's own two, the liquid with no colour
 * and the dark blue. The colour is an added cue: the picture carries the record's words for the look under the
 * flask, and the card says them beside it.
 */
const LIQUID: Record<Look, string> = { before: '#e8edf2', after: '#14296b' }
const LINE = { fill: 'none', stroke: INK, strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

interface Flask {
  /** Its middle, the top of its neck, where the neck meets the cone, and its foot. */
  cx: number
  top: number
  neck: number
  foot: number
  /** Half the width of its neck and of its foot. */
  narrow: number
  wide: number
}
/** Half the width of the inside of a conical flask at a height. */
const half = (f: Flask, y: number) => f.narrow + ((f.wide - f.narrow) * (Math.max(f.neck, y) - f.neck)) / (f.foot - f.neck)
const outline = (f: Flask) =>
  `M ${f.cx - f.narrow} ${f.top} L ${f.cx - f.narrow} ${f.neck} L ${f.cx - f.wide} ${f.foot - 6} Q ${f.cx - f.wide} ${f.foot} ${f.cx - f.wide + 6} ${f.foot} L ${f.cx + f.wide - 6} ${f.foot} Q ${f.cx + f.wide} ${f.foot} ${f.cx + f.wide} ${f.foot - 6} L ${f.cx + f.narrow} ${f.neck} L ${f.cx + f.narrow} ${f.top}`
/** The liquid in a flask up to a level, kept a little inside the glass. */
const liquid = (f: Flask, level: number) =>
  `M ${f.cx - half(f, level) + 1.5} ${level} L ${f.cx + half(f, level) - 1.5} ${level} L ${f.cx + f.wide - 2} ${f.foot - 6} Q ${f.cx + f.wide - 2} ${f.foot - 1.5} ${f.cx + f.wide - 7} ${f.foot - 1.5} L ${f.cx - f.wide + 7} ${f.foot - 1.5} Q ${f.cx - f.wide + 2} ${f.foot - 1.5} ${f.cx - f.wide + 2} ${f.foot - 6} Z`

/** A conical flask with a liquid in it: the inside of its glass white, whatever stands behind it. */
function Glass({ flask, level, fill }: { flask: Flask; level: number; fill: string }) {
  return (
    <>
      <path d={`${outline(flask)} Z`} fill={CARD} />
      {/* The colour changes between one frame and the next. With motion reduced the app gives every transition a length of a hundredth of a millisecond, which still holds a new fill back by a frame: the liquid has no transition at all. */}
      <path data-liquid="" d={liquid(flask, level)} fill={fill} style={{ transitionProperty: 'none' }} />
      <line x1={flask.cx - half(flask, level) + 1.5} x2={flask.cx + half(flask, level) - 1.5} y1={level} y2={level} {...LINE} strokeWidth={1.2} strokeOpacity={0.55} />
      <path d={outline(flask)} {...LINE} />
    </>
  )
}

/**
 * A bath about the feet of the flasks: a trough with water in it. The three are told apart by what is drawn and by
 * a word, and not by a colour: blocks of ice at the surface of the ice water, steam over the warm water, neither
 * for the cool water, and each bath's own name under the trough. The water is one colour in all three.
 */
function Bath({ bathId, name, left, right, surface, floor, label }: { bathId: string; name: string; left: number; right: number; surface: number; floor: number; label: { x: number; y: number; size: number } }) {
  const across = (share: number) => left + (right - left) * share
  return (
    <g data-bath={bathId}>
      <rect x={left + 1} y={surface} width={right - left - 2} height={floor - surface - 1} fill={WATER} />
      <path d={`M ${left} ${surface - 9} L ${left} ${floor} L ${right} ${floor} L ${right} ${surface - 9}`} {...LINE} />
      <line x1={left + 1} x2={right - 1} y1={surface} y2={surface} {...LINE} strokeWidth={1.2} strokeOpacity={0.55} />
      {bathId === 'ice' && [0.04, 0.44, 0.52, 0.9].map((share, i) => <rect key={share} data-ice="" x={across(share)} y={surface - 6} width={13} height={13} rx={2} transform={`rotate(${i % 2 === 0 ? -9 : 11} ${across(share) + 6} ${surface})`} fill={CARD} stroke={INK} strokeWidth={1.4} />)}
      {bathId === 'warm' && [0.06, 0.5, 0.94].map((share) => <path key={share} data-steam="" d={`M ${across(share)} ${surface - 14} q 5 -6 0 -12 q -5 -6 0 -12`} {...LINE} strokeWidth={1.3} strokeOpacity={0.65} />)}
      <text x={label.x} y={label.y} textAnchor="middle" fontSize={label.size} fill={INK}>
        {name}
      </text>
    </g>
  )
}

const FLASK_A: Flask = { cx: 68, top: 26, neck: 62, foot: 132, narrow: 13, wide: 48 }
const FLASK_B: Flask = { ...FLASK_A, cx: 192 }
const MIXED: Flask = { cx: 100, top: 14, neck: 72, foot: 180, narrow: 18, wide: 76 }

export interface FlaskDrawingProps {
  view: Pick<RunView, 'indicator' | 'flasks' | 'thermometerTenths' | 'poured'>
  /** The liquid as it is now: the engine's word for the time on the watch. */
  look: Look
  /** The record's words for that look, drawn under the mixed flask. */
  lookWord: string
  /** The names under the two flasks, and what stands over the mouth of the flask that holds what shows the end of the run, once it is in. */
  names: { a: string; b: string; indicator: string }
  /** The run's bath, with its name; null for a run on the bench. */
  bath: { id: string; name: string } | null
  /** What the thermometer in the flask reads, in words, once it has been read. */
  reading: string | null
  /** The change has just been shown while the watch was running, and the app's reduced-motion setting allows a mark of it. */
  turned?: boolean
}

/**
 * Before the pour, the two flasks side by side, each named, with the thermometer in flask A and the trough about
 * them once they stand in a bath. After it, the one flask that holds the mixture, larger, since it is what is
 * watched: its liquid in the colour of its look, with the record's words for the look under it.
 */
export function FlaskDrawing({ view, look, lookWord, names, bath, reading, turned = false }: FlaskDrawingProps) {
  const inBath = bath !== null && view.flasks !== 'bench'
  const frame = (width: number, height: number, className: string, children: ReactNode) => (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" data-look={view.poured ? look : undefined} className={`h-auto max-w-full shrink-0 rounded-lg border ${className}`}>
      <rect width={width} height={height} fill={CARD} />
      {children}
    </svg>
  )
  if (view.poured)
    return frame(
      200,
      inBath ? 236 : 220,
      `w-48 ${turned ? 'clock-turned' : ''}`,
      <>
        {inBath && <Bath bathId={bath.id} name={bath.name} left={8} right={192} surface={128} floor={190} label={{ x: 100, y: 228, size: 13 }} />}
        <Glass flask={MIXED} level={116} fill={LIQUID[look]} />
        <text x={100} y={208} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK}>
          {lookWord}
        </text>
      </>,
    )
  // The words are 13 or 14 of the picture's units, which is 11 to 12 px as it is drawn: what was added to flask B over its mouth, what the thermometer reads beside it, each flask's name under it, and the bath's name under those.
  return frame(
    260,
    inBath ? 176 : 158,
    'w-56',
    <>
      {inBath && <Bath bathId={bath.id} name={bath.name} left={8} right={252} surface={94} floor={140} label={{ x: 130, y: 170, size: 14 }} />}
      <Glass flask={FLASK_A} level={98} fill={LIQUID.before} />
      <Glass flask={FLASK_B} level={106} fill={LIQUID.before} />
      {inBath && (
        <g data-thermometer="">
          <line x1={76} y1={8} x2={76} y2={116} {...LINE} strokeWidth={2.4} />
          <circle cx={76} cy={119} r={4} fill={INK} />
          {reading !== null && (
            <text x={84} y={18} fontSize={14} fontWeight={600} fill={INK}>
              {reading}
            </text>
          )}
        </g>
      )}
      <text x={FLASK_A.cx} y={151} textAnchor="middle" fontSize={14} fill={INK}>
        {names.a}
      </text>
      <text x={FLASK_B.cx} y={151} textAnchor="middle" fontSize={14} fill={INK}>
        {names.b}
      </text>
      {view.indicator && (
        <text data-indicator="" x={FLASK_B.cx} y={18} textAnchor="middle" fontSize={13} fill={INK}>
          + {names.indicator}
        </text>
      )}
    </>,
  )
}
