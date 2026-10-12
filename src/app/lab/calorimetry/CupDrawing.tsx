import { FOAM, FoamCup, LINE, LIQUID, SOLID } from '@/app/lab/FoamCup'
import type { PartId } from '@/chem-data/calorimetry/data'
import type { CupView } from '@/engine/calorimetry'

/** How high the liquid stands: the 50.0 mL the cup starts with, and what it holds once the change is started. */
const LEVEL = { before: 132, after: { neutralisation: 94, dissolving: 130, metal: 126 } } as const

/** The small beaker that stands beside the cup in parts 1 and 3. */
const BEAKER = 'M 214 122 L 214 180 Q 214 184 218 184 L 258 184 Q 262 184 262 180 L 262 122'

/**
 * The foam-cup calorimeter as a cut-away drawing: the shell's foam cup (../FoamCup.tsx), which the freezing point
 * depression lab draws too, with its lid, its stirrer, its probe and the logger; and this lab's own, which is what
 * is to go into the cup, beside it: the beaker of the second solution, the weighing boat of the salt, or the
 * beaker of boiling water with the piece of metal in it. Once the change is started the liquid stands higher, the
 * beaker or the boat is empty, and the piece lies in the cup. Nothing in it says what the temperature does.
 */
export function CupDrawing({ part, cup, reducedMotion }: { part: PartId; cup: CupView; reducedMotion: boolean }) {
  const waiting = !cup.changeStarted
  return (
    <FoamCup
      level={cup.changeStarted ? LEVEL.after[part] : LEVEL.before}
      lidOn={cup.lidOn}
      stirring={cup.stirring}
      loggerStarted={cup.loggerStarted}
      reducedMotion={reducedMotion}
      inCup={part === 'metal' && cup.changeStarted && <rect x={128} y={164} width={22} height={13} rx={2} {...SOLID} />}
      beside={
        // What is to go into the cup, beside it.
        part === 'dissolving' ? (
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
        )
      }
    />
  )
}
