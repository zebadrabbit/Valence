import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { SHELL_TEXT } from '@/app/lab/shellText'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { titrationCitations } from '@/chem-data/citations'
import sources from '@/chem-data/sources.json'
import { titrationData } from '@/chem-data/titration/data'
import { TITRATION_PRIMER } from '@/chem-data/titration/primer'
import { can, createLab, modelFrom, reduce, titrationStateSchema, type Mode } from '@/engine/titration'

const [TITRATION] = ACTIVITIES
const MODEL = modelFrom(titrationData)
const MODEL_CITATIONS = titrationCitations(titrationData, sources)

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/** #/lab/titration. Nothing is stored until Start, so opening the page leaves Home at "Not started". */
export function TitrationPage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save] = useLabProgress(TITRATION, titrationStateSchema)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new run saved over whatever was there.
  const start = () => save(createLab(drawSeed(), mode))

  return (
    <LabShell
      title={TITRATION.title}
      narrow={narrow}
      started={lab !== null}
      persistent={persistent}
      mode={mode}
      onMode={(next) => (lab ? save(reduce(MODEL, lab, { type: 'setMode', mode: next })) : setChosen(next))}
      modeLocked={lab && can(MODEL, lab, { type: 'setMode', mode }) !== null ? SHELL_TEXT.modeLocked : undefined}
      onStart={start}
      onRestart={start}
      primer={(open) => <Primer sections={TITRATION_PRIMER} sources={sources} open={open} modelCitations={MODEL_CITATIONS} />}
      bench={null}
      notebook={null}
      record={null}
    />
  )
}
