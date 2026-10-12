// A conical flask with a liquid in it, as the two labs on the kinetics engine draw one. A picture of flasks stands
// on a white card in both themes, in its own ink, so that a liquid is judged against white whatever the theme.

export const INK = '#1f2933'
export const CARD = '#ffffff'
export const LINE = { fill: 'none', stroke: INK, strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

export interface Flask {
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
export const half = (f: Flask, y: number) => f.narrow + ((f.wide - f.narrow) * (Math.max(f.neck, y) - f.neck)) / (f.foot - f.neck)
const outline = (f: Flask) =>
  `M ${f.cx - f.narrow} ${f.top} L ${f.cx - f.narrow} ${f.neck} L ${f.cx - f.wide} ${f.foot - 6} Q ${f.cx - f.wide} ${f.foot} ${f.cx - f.wide + 6} ${f.foot} L ${f.cx + f.wide - 6} ${f.foot} Q ${f.cx + f.wide} ${f.foot} ${f.cx + f.wide} ${f.foot - 6} L ${f.cx + f.narrow} ${f.neck} L ${f.cx + f.narrow} ${f.top}`
/** The liquid in a flask up to a level, kept a little inside the glass. */
const liquid = (f: Flask, level: number) =>
  `M ${f.cx - half(f, level) + 1.5} ${level} L ${f.cx + half(f, level) - 1.5} ${level} L ${f.cx + f.wide - 2} ${f.foot - 6} Q ${f.cx + f.wide - 2} ${f.foot - 1.5} ${f.cx + f.wide - 7} ${f.foot - 1.5} L ${f.cx - f.wide + 7} ${f.foot - 1.5} Q ${f.cx - f.wide + 2} ${f.foot - 1.5} ${f.cx - f.wide + 2} ${f.foot - 6} Z`

/** A conical flask with a liquid in it: the inside of its glass white, whatever stands behind it. */
export function Glass({ flask, level, fill }: { flask: Flask; level: number; fill: string }) {
  return (
    <>
      <path d={`${outline(flask)} Z`} fill={CARD} />
      {/* The colour is the frame's own. With motion reduced the app gives every transition a length of a hundredth of a millisecond, which still holds a new fill back by a frame: the liquid has no transition at all. */}
      <path data-liquid="" d={liquid(flask, level)} fill={fill} style={{ transitionProperty: 'none' }} />
      <line x1={flask.cx - half(flask, level) + 1.5} x2={flask.cx + half(flask, level) - 1.5} y1={level} y2={level} {...LINE} strokeWidth={1.2} strokeOpacity={0.55} />
      <path d={outline(flask)} {...LINE} />
    </>
  )
}
