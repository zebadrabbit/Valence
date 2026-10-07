import { Disclosure } from '@/app/explore/InspectorCard'
import { READING, readingGraduations, readingY } from './buretteGeometry'
import { meniscusText } from './meniscusText'
import './bench.css'

const { width: W, height: H, tubeLeft: L, tubeRight: R } = READING
const MID = (L + R) / 2
// How far each kind of mark reaches either side of the middle of the tube. A whole-mL mark is a ring right round
// the glass, and seen at eye level that is one straight line from wall to wall.
const HALF_LENGTH = { ml: (R - L) / 2, half: 50, tenth: 35 } as const
// Screen pixels, not drawing units (vector-effect below): a tenth is one pixel thick on a whole pixel row at every
// size the view is shown at. A stroke that scales comes out one or two pixels thick by turns, and a thick tenth
// reads as a half-mL mark.
const STROKE = { ml: 2, half: 2, tenth: 1 } as const

const OPEN_LINES = ['Stopcock open.', 'Close it to read', 'the burette.']

export interface ReadingViewProps {
  /** The true position of the bottom of the meniscus. Drawn, never written. */
  levelUl: number
  filled: boolean
  /** True while the stopcock is open: a burette is not read while it runs, so no scale is drawn. */
  running: boolean
  /** The id of the paragraph that says the same in words: MeniscusWords, below. */
  describedBy: string
}

/**
 * The burette's scale round the meniscus, enlarged, as seen with the eye level with it. A drawing only: the one
 * number in it is the one printed on the glass.
 */
export function ReadingView({ levelUl, filled, running, describedBy }: ReadingViewProps) {
  const marks = running ? [] : readingGraduations(levelUl)
  const bottom = readingY(levelUl, levelUl)
  const wall = readingY(levelUl - READING.meniscusRiseUl, levelUl)
  // From wall to wall, with its lowest point, in the middle of the tube, exactly at `bottom`.
  const surface = `M ${L} ${wall} Q ${MID} ${2 * bottom - wall} ${R} ${wall}`
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="The burette scale at the meniscus, enlarged"
      aria-describedby={describedBy}
      className="bench-reading rounded-md border bg-background text-foreground"
    >
      <rect x={L} y={0} width={R - L} height={H} fill="currentColor" fillOpacity={0.03} />
      {filled && !running && (
        <>
          <path d={`${surface} L ${R} ${H} L ${L} ${H} Z`} fill="currentColor" fillOpacity={0.1} />
          {/* The meniscus: a darker band with no outline, so that its lower edge is the level itself and not a stroke's width off it. */}
          <path d={`${surface} Z`} fill="currentColor" fillOpacity={0.6} />
        </>
      )}
      <path d={`M ${L} 0 V ${H} M ${R} 0 V ${H}`} fill="none" stroke="currentColor" strokeWidth={3} />
      <g shapeRendering="crispEdges">
        {marks.map((mark) => (
          <line
            key={mark.ul}
            x1={MID - HALF_LENGTH[mark.kind]}
            x2={MID + HALF_LENGTH[mark.kind]}
            y1={mark.y}
            y2={mark.y}
            stroke="currentColor"
            strokeWidth={STROKE[mark.kind]}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {marks.map(
        (mark) =>
          mark.label && (
            <text key={mark.ul} x={R + 14} y={mark.y} dominantBaseline="central" fontSize={30} fontWeight={600} fill="currentColor" className="tabular-nums">
              {mark.label}
            </text>
          ),
      )}
      {!running && (
        <text x={W - 8} y={22} textAnchor="end" fontSize={16} fill="currentColor" fillOpacity={0.7}>
          mL
        </text>
      )}
      {running && (
        <text y={H / 2 - 22} textAnchor="middle" fontSize={16} fill="currentColor">
          {OPEN_LINES.map((line) => (
            <tspan key={line} x={MID} dy={22}>
              {line}
            </tspan>
          ))}
        </text>
      )}
      {!filled && !running && (
        <text x={MID} y={H - 40} textAnchor="middle" fontSize={16} fill="currentColor" fillOpacity={0.7}>
          empty
        </text>
      )}
    </svg>
  )
}

/**
 * The reading view's words, twice: for assistive technology as the view's description, and for every learner in a
 * closed disclosure under it. A browser does not read a description out of a closed disclosure, so the first is a
 * hidden copy with the `id` the view is described by.
 */
export function MeniscusWords({ id, levelUl, filled, running }: { id: string; levelUl: number; filled: boolean; running: boolean }) {
  const words = running ? 'The stopcock is open. Close it to read the burette.' : filled ? meniscusText(levelUl) : 'The burette is empty.'
  return (
    <>
      <p id={id} hidden>
        {words}
      </p>
      <Disclosure summary="The meniscus in words">
        <p className="text-sm text-muted-foreground">{words}</p>
      </Disclosure>
    </>
  )
}
