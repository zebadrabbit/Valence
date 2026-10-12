import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { cationsData } from '@/chem-data/cations/data'
import { CATIONS_PRIMER, READ_FIRST } from '@/chem-data/cations/primer'
import sources from '@/chem-data/sources.json'
import { cationsStateSchema, can, createLab, mismatch, modelFrom, reduce, warnings, type Action, type Mode } from '@/engine/cations'
import { CationsBench } from './CationsBench'
import { CationsRecord } from './CationsRecord'
import { MODE_TEXT } from './messages'

const [, , , , CATIONS] = ACTIVITIES
const MODEL = modelFrom(cationsData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = cationsStateSchema(MODEL)

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/**
 * #/lab/cations: the one place the engine and the two parts meet. The state is the stored record, read once when
 * the page mounts and taken again only when another tab saves it; every action of the learner's that the engine
 * takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not started".
 * What is chosen and not yet recorded, the part and the step that are shown, which tile is held and a warning that
 * is showing are the bench's and are not stored. A lab that is complete still takes actions, so that part 2 can
 * be run again with a new unknown; its status stays completed.
 */
export function CationsPage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(CATIONS, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new lab has a bench of its own, with nothing chosen or said on it.
  const [labs, setLabs] = useState(0)

  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new lab saved over whatever was there.
  const start = () => {
    setLabs((count) => count + 1)
    save(createLab(drawSeed(), mode))
  }
  const shell = {
    title: CATIONS.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={CATIONS_PRIMER} sources={sources} readFirst={READ_FIRST} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  const act = (action: Action) => {
    const next = reduce(MODEL, lab, action)
    if (next !== lab) save(next)
  }
  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => act({ type: 'setMode', mode: next })}
      bench={() => (
        // A bench of its own for each lab started, and for a record taken from another tab: nothing chosen or said on the one before is carried over.
        <CationsBench
          key={`${labs}:${taken}`}
          data={cationsData}
          m={MODEL}
          sources={sources}
          state={lab}
          can={(action) => can(MODEL, lab, action)}
          warn={(action) => warnings(MODEL, lab, action)}
          wrong={(part, observation) => mismatch(MODEL, lab, part, observation)}
          act={act}
        />
      )}
      record={<CationsRecord data={cationsData} m={MODEL} state={lab} />}
    />
  )
}
