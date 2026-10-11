import { CARD, Glass, INK, type Flask } from '@/app/lab/kinetics/Glass'

// The flask of a run and the flask of water beside it, drawn (spec 20.2). The picture stands on a white card in
// both themes, in its own ink: the white paper of the bench, against which the two are compared whatever the
// theme. It is hidden from assistive technology: the card it stands in says the same in words beside it. Nothing
// in it says when the colour will go.

/** What water is drawn in, and the mixture once no iodine is left: the two are then the same to the eye, as the lab's sentence says. */
export const WATER = '#e8edf2'
/** The yellow of the least iodine there can be, and of the most that any mixture starts with. */
const FAINT = [242, 229, 150] as const
const DEEP = [217, 160, 0] as const

/**
 * What the mixture is drawn in for an amount of iodine left, in micromoles for a litre; `deepest` is the most that
 * any mixture of the lab starts with. The depth of the yellow follows the amount in a straight line, so the
 * mixture with twice the iodine starts deeper and every mixture fades steadily. For any amount above nought a
 * faint yellow is still drawn, and at nought the water's own colour: on a bench the last of the colour is hard to
 * see, and on a screen the end is then a step that can be seen (the primer says so of the drawing). The colour is
 * an added cue: the picture carries the lab's word for the look under the flask, and the card says it beside it.
 */
export function liquidFill(microMolar: number, deepest: number): string {
  if (microMolar <= 0) return WATER
  const share = Math.min(1, microMolar / deepest)
  return `#${FAINT.map((faint, at) => Math.round(faint + (DEEP[at]! - faint) * share).toString(16).padStart(2, '0')).join('')}`
}

interface Layout {
  width: number
  height: number
  /** The flask of the mixture and the flask of water, and the level of the liquid in both. */
  mixture: Flask
  water: Flask
  level: number
  /** Where each flask's name is written, and the word for its look under that; the size of both. */
  name: number
  look: number
  font: number
  className: string
}
const SMALL: Flask = { cx: 68, top: 26, neck: 62, foot: 132, narrow: 13, wide: 48 }
const LARGE: Flask = { cx: 82, top: 12, neck: 62, foot: 164, narrow: 17, wide: 68 }
const BEFORE: Layout = { width: 260, height: 158, mixture: SMALL, water: { ...SMALL, cx: 192 }, level: 100, name: 151, look: 0, font: 14, className: 'w-56' }
const WATCHED: Layout = { width: 320, height: 212, mixture: LARGE, water: { ...LARGE, cx: 238 }, level: 108, name: 184, look: 203, font: 14, className: 'w-80' }

export interface FlaskDrawingProps {
  /** The names under the two flasks. */
  names: { mixture: string; water: string }
  /**
   * From the pour on: what the mixture is drawn in (`liquidFill`), and the lab's words for the look of the mixture
   * now and of the water, which never changes. Left out before the pour, when the flask holds no iodine and is
   * drawn as the water is.
   */
  watched?: { fill: string; looks: { mixture: string; water: string } }
}

/**
 * The flask of the mixture on the left and the flask of water on the right, side by side on white, each named.
 * Before the pour the two are small, beside the words that say how they stand; from the pour they are what is
 * watched, and are drawn large, each with the word for its look under its name. The water is drawn the same from
 * the first frame to the last: it is what the mixture is compared with.
 */
export function FlaskDrawing({ names, watched }: FlaskDrawingProps) {
  const at = watched ? WATCHED : BEFORE
  const flasks = [
    { id: 'mixture', flask: at.mixture, fill: watched?.fill ?? WATER, name: names.mixture, look: watched?.looks.mixture },
    { id: 'water', flask: at.water, fill: WATER, name: names.water, look: watched?.looks.water },
  ]
  return (
    <svg viewBox={`0 0 ${at.width} ${at.height}`} aria-hidden="true" className={`h-auto max-w-full shrink-0 rounded-lg border ${at.className}`}>
      <rect width={at.width} height={at.height} fill={CARD} />
      {flasks.map(({ id, flask, fill, name, look }) => (
        <g key={id} data-flask={id}>
          <Glass flask={flask} level={at.level} fill={fill} />
          <text x={flask.cx} y={at.name} textAnchor="middle" fontSize={at.font} fontWeight={watched ? 600 : 400} fill={INK}>
            {name}
          </text>
          {look !== undefined && (
            <text data-look="" x={flask.cx} y={at.look} textAnchor="middle" fontSize={at.font} fill={INK}>
              {look}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
