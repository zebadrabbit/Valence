import { useId, useState } from 'react'
import type { PlumeStatus } from '@/engine/titration'
import type { BenchView } from './benchView'
import { STAND, standGraduations, standY } from './buretteGeometry'
import type { FlaskColour } from './flaskColour'
import './bench.css'

const X = 150 // the burette's centre line
const TUBE = 11 // half its width
const MARK_LENGTH = { ml: 22, half: 14, tenth: 8 } as const
const MARKS = standGraduations()
const TUBE_END = 470
const TIP_END = 516
// The flask stands on a white card, as on a white tile at a bench, so the pink is judged against white in the dark
// theme too. Everything on the card has a fixed colour; the rest of the drawing follows the theme.
const CARD = { x: 52, y: 520, width: 196, height: 106 }
const INK = '#3f3f46'
const WATER = '#e8edf2'
const FLASK = 'M 136 522 L 136 552 L 84 612 Q 80 620 90 620 L 210 620 Q 220 620 216 612 L 164 552 L 164 522'
const FLASK_FLOOR = 620

/** The y of the liquid's surface in the flask. A rule of the drawing, not a model: 25 mL stands about a quarter of the way up. */
const liquidTop = (volumeUl: number) => FLASK_FLOOR - Math.min(14 + volumeUl / 2000, 62)

/** The x of the flask's glass at height y, left (-1) or right (+1), for the line of the liquid's surface. */
const flaskWallX = (y: number, side: -1 | 1) => X + side * (14 + Math.min(1, Math.max(0, (y - 552) / 60)) * 52)

export interface TitrationStandProps {
  burette: BenchView['burette']
  flask: BenchView['flask']
  plume: PlumeStatus | null
  plumeKey: number
  /** The record's plumeFadeAtOnceSeconds and plumeFadeSlowlySeconds. */
  plumeFadeSeconds: { atOnce: number; slowly: number }
  colour: FlaskColour
  stopcockOpen: boolean
  reducedMotion: boolean
  /** The id of the hidden paragraph holding describeStand(...). */
  describedBy: string
}

/**
 * The plume to draw, or null: none while plumeKey is still the key the stand was mounted with, and none under
 * reduced motion. A plume is the picture of an addition being made, and a reload, which gives back the stored last
 * addition, makes none. Pure, exported for its test.
 */
export function plumeToDraw(
  mountedKey: number,
  { plume, plumeKey, plumeFadeSeconds, reducedMotion }: Pick<TitrationStandProps, 'plume' | 'plumeKey' | 'plumeFadeSeconds' | 'reducedMotion'>,
): { status: PlumeStatus; fadeSeconds: number | null } | null {
  if (reducedMotion || plume === null || plumeKey === mountedKey) return null
  return { status: plume, fadeSeconds: plume === 'fades-at-once' ? plumeFadeSeconds.atOnce : plume === 'fades-slowly' ? plumeFadeSeconds.slowly : null }
}

/**
 * The burette on its stand over the conical flask. A drawing only: every control is a button outside it. The
 * strength of the pink, the volume in the flask and plumeKey reach it as an opacity, a height and a key, and are
 * never written into it, since each can be worked back to a value the lab keeps hidden.
 */
export function TitrationStand(props: TitrationStandProps) {
  const { burette, flask, plumeKey, colour, stopcockOpen, reducedMotion, describedBy } = props
  const clipId = useId()
  // ponytail: the key is the volume delivered in the trial, so a later trial that passes through the very volume the
  // stand was mounted at draws no plume for that one addition. If that is ever seen, remember that the key has changed.
  const [mountedKey] = useState(plumeKey)
  const plume = plumeToDraw(mountedKey, props)
  const top = liquidTop(flask.volumeUl)
  const level = standY(burette.levelUl)

  return (
    <svg
      viewBox={`0 0 ${STAND.width} ${STAND.height}`}
      role="img"
      aria-label="Burette on its stand over the conical flask"
      aria-describedby={describedBy}
      className="bench-stand text-foreground"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={`${FLASK} Z`} />
        </clipPath>
      </defs>

      {/* Retort stand: base, rod, clamp. */}
      <rect x={40} y={628} width={236} height={7} rx={2} fill="currentColor" fillOpacity={0.55} />
      <rect x={262} y={8} width={5} height={620} fill="currentColor" fillOpacity={0.55} />
      <rect x={X + TUBE} y={228} width={262 - X - TUBE} height={5} fill="currentColor" fillOpacity={0.55} />
      <rect x={X - TUBE - 5} y={222} width={2 * TUBE + 10} height={17} rx={3} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={3} />

      {/* The burette, and the solution in it as a column from its level down. */}
      <rect x={X - TUBE} y={12} width={2 * TUBE} height={TUBE_END - 12} fill="currentColor" fillOpacity={0.03} />
      {burette.filled && <rect x={X - TUBE} y={level} width={2 * TUBE} height={TUBE_END - level} fill="currentColor" fillOpacity={0.22} />}
      <path d={`M ${X - TUBE} 12 V ${TUBE_END} L ${X - 4} 478 M ${X + TUBE} 12 V ${TUBE_END} L ${X + 4} 478`} fill="none" stroke="currentColor" strokeWidth={1.5} />
      <g shapeRendering="crispEdges">
        {MARKS.map((mark) => (
          <line key={mark.ul} x1={X - TUBE} x2={X - TUBE + MARK_LENGTH[mark.kind]} y1={mark.y} y2={mark.y} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {MARKS.map(
        (mark) =>
          mark.label && (
            <text key={mark.ul} x={X - TUBE - 6} y={mark.y} textAnchor="end" dominantBaseline="central" fontSize={19} fill="currentColor" className="tabular-nums">
              {mark.label}
            </text>
          ),
      )}
      <text x={X + TUBE + 8} y={24} fontSize={16} fill="currentColor" fillOpacity={0.7}>
        mL
      </text>

      {/* The stopcock: its handle lies across the tube when closed and along it when open, and the word says so too. */}
      <rect x={X - 4} y={478} width={8} height={16} fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeWidth={1.5} />
      <g transform={`rotate(${stopcockOpen ? 90 : 0} ${X} 486)`}>
        <rect x={X - 17} y={482.5} width={34} height={7} rx={3.5} fill="currentColor" />
      </g>
      <text x={X + 24} y={486} dominantBaseline="central" fontSize={18} fill="currentColor">
        {stopcockOpen ? 'open' : 'closed'}
      </text>

      {/* The tip, and the air bubble in it: a shape and its name. */}
      <path d={`M ${X - 4} 494 L ${X - 2.5} ${TIP_END} M ${X + 4} 494 L ${X + 2.5} ${TIP_END}`} fill="none" stroke="currentColor" strokeWidth={1.5} />
      {burette.filled && <path d={`M ${X - 3.4} 495 L ${X - 2.2} ${TIP_END - 1} L ${X + 2.2} ${TIP_END - 1} L ${X + 3.4} 495 Z`} fill="currentColor" fillOpacity={0.22} />}
      {burette.tipBubble && (
        <>
          <ellipse cx={X} cy={503} rx={3} ry={5} fill="var(--card)" stroke="currentColor" strokeWidth={1.2} />
          <line x1={X - 5} y1={503} x2={X - 26} y2={503} stroke="currentColor" strokeWidth={1} />
          <text x={X - 29} y={503} textAnchor="end" dominantBaseline="central" fontSize={18} fill="currentColor">
            air bubble
          </text>
        </>
      )}

      {/* The white card, then the liquid with the pink over it as a layer, then the glass. */}
      <rect {...CARD} rx={4} fill="#ffffff" stroke={INK} strokeOpacity={0.35} />
      {flask.hasAliquot && (
        <>
          <g clipPath={`url(#${clipId})`}>
            <rect x={70} y={top} width={160} height={FLASK_FLOOR + 2 - top} fill={WATER} />
            <rect x={70} y={top} width={160} height={FLASK_FLOOR + 2 - top} fill={colour.fill} fillOpacity={colour.strength} />
            {plume && (
              // Where the drop lands, one size for every addition. Keyed by the addition, so each starts its own fade.
              <ellipse
                key={plumeKey}
                className={plume.fadeSeconds === null ? 'bench-plume' : 'bench-plume bench-plume-fading'}
                style={plume.fadeSeconds === null ? undefined : { animationDuration: `${plume.fadeSeconds}s` }}
                cx={X}
                cy={top + 9}
                rx={27}
                ry={9.5}
                fill={colour.fill}
              />
            )}
          </g>
          <line x1={flaskWallX(top, -1)} x2={flaskWallX(top, 1)} y1={top} y2={top} stroke={INK} strokeOpacity={0.5} strokeWidth={1} />
        </>
      )}
      <path d={FLASK} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {/* An open stopcock runs a thin line into the flask; a single addition is a drop that falls. Neither under reduced motion. */}
      {stopcockOpen && burette.filled && !reducedMotion && <line x1={X} x2={X} y1={TIP_END} y2={flask.hasAliquot ? top : FLASK_FLOOR - 2} stroke="#71717a" strokeWidth={1.5} />}
      {plume && !stopcockOpen && <circle key={plumeKey} className="bench-drop" cx={X} cy={TIP_END + 3} r={2.2} fill={INK} />}
    </svg>
  )
}
