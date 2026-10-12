import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { densityData } from '@/chem-data/density/data'
import { DENSITY_PRIMER, READ_FIRST } from '@/chem-data/density/primer'
import sources from '@/chem-data/sources.json'
import { can, createLab, densityStateSchema, modelFrom, reduce, warnings, type Action, type Mode } from '@/engine/density'
import { DensityBench } from './DensityBench'
import { DensityRecord } from './DensityRecord'
import { MODE_TEXT } from './messages'

const [, , , , , , , , , DENSITY] = ACTIVITIES
const MODEL = modelFrom(densityData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = densityStateSchema(MODEL)

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/**
 * #/lab/measurement-and-density: the one place the engine and the three parts meet. The state is the stored
 * record, read once when the page mounts and taken again only when another tab saves it; every action of the
 * learner's that the engine takes is saved as it is taken. Nothing is stored until Start, so opening the page
 * leaves Home at "Not started". Start and Restart draw a new seed, which fixes what each unknown is and every
 * length, level, temperature and mass. The part and the page shown, what is typed and not yet entered, a closer
 * look that is open and a warning that is showing are the bench's and are not stored.
 */
export function DensityPage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(DENSITY, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the lab's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new lab has a bench of its own, with nothing typed or said on it.
  const [labs, setLabs] = useState(0)

  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new lab saved over whatever was there.
  const start = () => {
    setLabs((count) => count + 1)
    save(createLab(drawSeed(), mode))
  }
  const shell = {
    title: DENSITY.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={DENSITY_PRIMER} sources={sources} readFirst={READ_FIRST} />,
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
      // A bench of its own for each lab started, and for a record taken from another tab: nothing typed or said on the one before is carried over.
      bench={() => <DensityBench key={`${labs}:${taken}`} data={densityData} m={MODEL} sources={sources} state={lab} can={(action) => can(MODEL, lab, action)} warn={(action) => warnings(MODEL, lab, action)} act={act} />}
      record={<DensityRecord data={densityData} m={MODEL} state={lab} />}
    />
  )
}
