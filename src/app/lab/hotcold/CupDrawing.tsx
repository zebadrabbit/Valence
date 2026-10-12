import { FOAM, FoamCup, LINE } from '@/app/lab/FoamCup'
import type { CupView } from '@/engine/hotcold'

/** How high the liquid stands: the 50.0 mL the cup starts with, and what it holds once the salt is in. */
const LEVEL = { before: 132, after: 130 } as const

/**
 * The foam cup as a cut-away drawing: the shell's foam cup (../FoamCup.tsx), which the calorimetry lab and the
 * freezing point depression lab draw too, with its lid, its stirrer, its probe and the logger; and beside it the
 * weighing boat with the salt heaped in it, drawn the same for either salt. Once the salt is in, the boat is empty
 * and the liquid stands a little higher. Nothing in it says what the temperature does.
 */
export function CupDrawing({ cup, reducedMotion }: { cup: CupView; reducedMotion: boolean }) {
  return (
    <FoamCup
      level={cup.saltAdded ? LEVEL.after : LEVEL.before}
      lidOn={cup.lidOn}
      stirring={cup.stirring}
      loggerStarted={cup.loggerStarted}
      reducedMotion={reducedMotion}
      beside={
        <>
          <path d="M 208 172 L 217 184 L 259 184 L 268 172" {...LINE} />
          {!cup.saltAdded && <path data-waiting="" d="M 222 183 Q 238 162 254 183 Z" {...FOAM} fillOpacity={0.12} strokeDasharray="1 3" />}
        </>
      }
    />
  )
}
