import { BEAKER_TEXT } from './text'

// The two bookends are not atoms (spec 9.1): each is a plain picture of the beaker, drawn on a white card with
// fixed colours as the labs' drawings are, so that it reads the same in both themes. What moves in it is a
// function of how far through the chapter the timeline is, and of nothing else.
const WIDTH = 320
const HEIGHT = 240
const INK = '#3f3f46'
const LIQUID = '#dbeafe'
const GLASS = 'M 104 64 L 104 196 Q 104 208 116 208 L 204 208 Q 216 208 216 196 L 216 64'
const SURFACE = 112
/** Where the spatula's tip is, and where the liquid's surface is under it. */
const TIP = { x: 160, y: 58 }
const GRAINS = [
  [-9, 0],
  [-3, -4],
  [4, -1],
  [10, 2],
  [0, 3],
] as const
const BUBBLES = [
  [130, 176, 5],
  [158, 150, 4],
  [186, 186, 5],
  [174, 132, 3.5],
] as const

/**
 * The beaker before anything is added, with the powder on a spatula over it, or the beaker afterwards. `through`
 * is how far through its chapter the timeline is, from 0 to 1: before, the powder leaves the spatula and falls
 * to the liquid; afterwards, the last bubbles thin out until there are none.
 */
export function Beaker({ after, through }: { after: boolean; through: number }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={after ? BEAKER_TEXT.after : BEAKER_TEXT.before} className="block h-full w-full bg-white">
      <rect x={104} y={SURFACE} width={112} height={96} fill={LIQUID} />
      <line x1={104} x2={216} y1={SURFACE} y2={SURFACE} stroke={INK} strokeOpacity={0.5} strokeWidth={1.5} />
      <path d={GLASS} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M 96 64 L 104 64 M 216 64 L 226 60" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <text x={160} y={228} textAnchor="middle" fontSize={13} fill={INK}>
        {after ? BEAKER_TEXT.saltWater : BEAKER_TEXT.acid}
      </text>
      {after ? (
        BUBBLES.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" stroke={INK} strokeWidth={1.2} opacity={1 - through} />)
      ) : (
        <>
          <path d={`M 52 34 L ${TIP.x - 14} ${TIP.y + 2} L ${TIP.x + 14} ${TIP.y + 6}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {/* White grains with a dark edge, so that white powder shows on the white card. They fall as the chapter goes by. */}
          {GRAINS.map(([dx, dy]) => (
            <circle key={`${dx}-${dy}`} cx={TIP.x + dx} cy={TIP.y - 4 + dy + through * (SURFACE - TIP.y + 4)} r={3} fill="#ffffff" stroke={INK} strokeWidth={1.2} />
          ))}
          <text x={52} y={22} fontSize={13} fill={INK}>
            {BEAKER_TEXT.powder}
          </text>
        </>
      )}
    </svg>
  )
}
