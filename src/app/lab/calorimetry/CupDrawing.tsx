import type { PartId } from '@/chem-data/calorimetry/data'
import type { CupView } from '@/engine/calorimetry'
import './calorimetry.css'

// The drawing follows the theme: everything is the text's own colour, at one strength or another. It is hidden from
// assistive technology, and the cup's card says the same state in words beside it.
const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
const FOAM = { ...LINE, fill: 'currentColor', fillOpacity: 0.05 } as const
const LIQUID = { fill: 'currentColor', fillOpacity: 0.16 } as const
const SOLID = { fill: 'currentColor', fillOpacity: 0.5, stroke: 'currentColor', strokeWidth: 1.2 } as const

/** The inner cup's wall, from its rim to its foot: where its inside is at a height, on the left and on the right. */
const RIM = 56
const FOOT = 178
const inside = (y: number) => {
  const lean = ((y - RIM) / (FOOT - RIM)) * 15
  return { left: 86 + lean, right: 174 - lean }
}
/** How high the liquid stands: the 50.0 mL the cup starts with, and what it holds once the change is started. */
const LEVEL = { before: 132, after: { neutralisation: 94, dissolving: 130, metal: 126 } } as const

/** The small beaker that stands beside the cup in parts 1 and 3. */
const BEAKER = 'M 214 122 L 214 180 Q 214 184 218 184 L 258 184 Q 262 184 262 180 L 262 122'

/**
 * The foam-cup calorimeter as a cut-away drawing: two cups, one inside the other, on the bench; the liquid in the
 * inner one; the lid on the cup, or lying on the bench beside it while it is off; the stirrer, with the marks of
 * its stirring about its ring while it is going; and the probe, wired to the logger, whose screen shows a dot and
 * a level row of dashes once it is started and is blank before. Beside the cup stands what is to go into it: the
 * beaker of the second solution, the weighing boat of the salt, or the beaker of boiling water with the piece of
 * metal in it. Once the change is started the liquid stands higher, the beaker or the boat is empty, and the
 * piece lies in the cup. Nothing in it says what the temperature does. The stirrer bobs four times as the
 * drawing first shows it going, and only where `reducedMotion` is false; nothing else here moves.
 */
export function CupDrawing({ part, cup, reducedMotion }: { part: PartId; cup: CupView; reducedMotion: boolean }) {
  const level = cup.changeStarted ? LEVEL.after[part] : LEVEL.before
  const { left, right } = inside(level)
  const waiting = !cup.changeStarted
  return (
    <svg viewBox="0 0 280 196" aria-hidden="true" className="h-auto w-52 max-w-full shrink-0 text-foreground">
      {/* The bench. */}
      <line x1={6} y1={186} x2={274} y2={186} {...LINE} strokeOpacity={0.5} />
      {/* The outer cup, then the inner one standing a little proud of it. */}
      <path d="M 74 62 L 79 62 L 96 184 L 164 184 L 181 62 L 186 62" {...FOAM} />
      <path d={`M 81 ${RIM} L 86 ${RIM} L 101 ${FOOT} L 159 ${FOOT} L 174 ${RIM} L 179 ${RIM}`} {...FOAM} />
      <path d={`M ${left + 1} ${level} L ${right - 1} ${level} L 158 ${FOOT - 1} L 102 ${FOOT - 1} Z`} {...LIQUID} />
      <line x1={left + 1} y1={level} x2={right - 1} y2={level} {...LINE} strokeWidth={1.2} strokeOpacity={0.6} />
      {part === 'metal' && cup.changeStarted && <rect x={128} y={164} width={22} height={13} rx={2} {...SOLID} />}

      {/* The stirrer: its handle, its rod and the ring at its foot. */}
      <g className={cup.stirring && !reducedMotion ? 'cal-stir' : undefined}>
        <circle cx={110} cy={14} r={5} {...LINE} />
        <line x1={110} y1={19} x2={110} y2={156} {...LINE} />
        <ellipse cx={110} cy={159} rx={9} ry={3.5} {...LINE} />
      </g>
      {cup.stirring && (
        <g data-stirring="" {...LINE} strokeWidth={1.4} strokeOpacity={0.75}>
          <path d="M 97 148 q -5 6 1 12" />
          <path d="M 123 148 q 5 6 -1 12" />
          <path d="M 103 143 q 7 -4 14 0" />
        </g>
      )}

      {/* The probe, the wire from its head, and the logger. */}
      <line x1={148} y1={24} x2={148} y2={150} {...LINE} strokeWidth={2.4} />
      <rect x={145.5} y={148} width={5} height={10} rx={2} fill="currentColor" />
      <path d="M 148 24 C 148 2, 206 0, 216 24" {...LINE} strokeWidth={1.3} />
      <rect x={206} y={24} width={64} height={42} rx={5} {...FOAM} />
      <rect x={212} y={30} width={52} height={24} rx={2} {...LINE} strokeWidth={1.2} />
      {cup.loggerStarted && (
        <g data-logging="">
          <circle cx={219} cy={42} r={3} fill="currentColor" />
          <line x1={227} y1={42} x2={258} y2={42} {...LINE} strokeDasharray="5 4" />
        </g>
      )}
      <circle cx={216} cy={60} r={1.6} fill="currentColor" />

      {/* The lid: on the cup, or on the bench beside it. */}
      {cup.lidOn ? <rect data-lid="on" x={68} y={47} width={124} height={9} rx={3} {...SOLID} fillOpacity={0.3} /> : <rect data-lid="off" x={6} y={176} width={58} height={9} rx={3} {...SOLID} fillOpacity={0.3} />}

      {/* What is to go into the cup, beside it. */}
      {part === 'dissolving' ? (
        <>
          <path d="M 208 172 L 217 184 L 259 184 L 268 172" {...LINE} />
          {waiting && <path data-waiting="" d="M 222 183 Q 238 162 254 183 Z" {...FOAM} fillOpacity={0.12} strokeDasharray="1 3" />}
        </>
      ) : (
        <>
          <path d={BEAKER} {...LINE} />
          {(part === 'metal' || waiting) && <path d="M 215.5 148 L 260.5 148 L 260.5 180 Q 260.5 182.5 258 182.5 L 218 182.5 Q 215.5 182.5 215.5 180 Z" {...LIQUID} {...(part === 'neutralisation' && { 'data-waiting': '' })} />}
          {part === 'metal' && (
            <>
              {/* Boiling water: bubbles in it and steam over it. */}
              <circle cx={224} cy={160} r={2} {...LINE} strokeWidth={1} />
              <circle cx={252} cy={166} r={2.4} {...LINE} strokeWidth={1} />
              <circle cx={231} cy={174} r={1.6} {...LINE} strokeWidth={1} />
              <path d="M 228 114 q 5 -6 0 -12 q -5 -6 0 -12" {...LINE} strokeWidth={1.2} strokeOpacity={0.6} />
              <path d="M 246 114 q 5 -6 0 -12 q -5 -6 0 -12" {...LINE} strokeWidth={1.2} strokeOpacity={0.6} />
              {waiting && <rect data-waiting="" x={234} y={168} width={22} height={13} rx={2} {...SOLID} />}
            </>
          )}
        </>
      )}
    </svg>
  )
}
