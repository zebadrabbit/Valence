import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { aqueousData } from '@/chem-data/aqueous/data'
import { AQUEOUS_PRIMER, READ_FIRST } from '@/chem-data/aqueous/primer'
import sources from '@/chem-data/sources.json'
import { aqueousStateSchema, can, createLab, reduce, type Action, type Mode } from '@/engine/aqueous'
import { AqueousBench } from './AqueousBench'
import { AqueousRecord } from './AqueousRecord'
import { MODE_TEXT } from './messages'

const [, AQUEOUS] = ACTIVITIES
// One schema for the page's life: the stored record is held to the lab's record as it is read.
const SCHEMA = aqueousStateSchema(aqueousData)

/**
 * #/lab/aqueous: the one place the engine and the stations meet. The state is the stored record, read once when
 * the page mounts and taken again only when another tab saves it; every action of the learner's that the engine
 * takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not started".
 * What is chosen or built at a station and not yet checked is the bench's and is not stored.
 */
export function AqueousPage() {
  const { persistent, reducedMotion } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(AQUEOUS, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new run has a bench of its own, with nothing built or said on it.
  const [runs, setRuns] = useState(0)

  const mode = lab?.mode ?? chosen
  const start = () => {
    setRuns((count) => count + 1)
    save(createLab(aqueousData, mode))
  }
  const shell = {
    title: AQUEOUS.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={AQUEOUS_PRIMER} sources={sources} readFirst={READ_FIRST} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  const act = (action: Action) => {
    const next = reduce(aqueousData, lab, action)
    if (next !== lab) save(next)
  }
  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => act({ type: 'setMode', mode: next })}
      bench={() => (
        // A bench of its own for each run, and for a record taken from another tab: nothing built or said on the one before is carried over.
        <AqueousBench key={`${runs}:${taken}`} data={aqueousData} sources={sources} state={lab} reducedMotion={reducedMotion} can={(action) => can(aqueousData, lab, action)} act={act} />
      )}
      record={<AqueousRecord data={aqueousData} state={lab} />}
    />
  )
}
