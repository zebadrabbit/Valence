import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { flameData } from '@/chem-data/flame/data'
import { FLAME_PRIMER, READ_FIRST } from '@/chem-data/flame/primer'
import sources from '@/chem-data/sources.json'
import { can, createLab, flameStateSchema, reduce, warnings, type Action, type Mode } from '@/engine/flame'
import { FlameBench } from './FlameBench'
import { FlameRecord } from './FlameRecord'
import { MODE_TEXT } from './messages'

const [, , FLAME] = ACTIVITIES
// One schema for the page's life: the stored record is held to the lab's record as it is read.
const SCHEMA = flameStateSchema(flameData)

/**
 * #/lab/flame: the one place the engine and the stations meet. The state is the stored record, read once when the
 * page mounts and taken again only when another tab saves it; every action of the learner's that the engine takes
 * is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not started". What
 * is chosen at a station and not yet checked, the entry of the list that is shown, whether the spectroscope is
 * being looked through and a warning that is showing are the bench's and are not stored.
 */
export function FlamePage() {
  const { persistent, reducedMotion } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(FLAME, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new run has a bench of its own, with nothing chosen or said on it.
  const [runs, setRuns] = useState(0)

  const mode = lab?.mode ?? chosen
  const start = () => {
    setRuns((count) => count + 1)
    save(createLab(flameData, mode))
  }
  const shell = {
    title: FLAME.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={FLAME_PRIMER} sources={sources} readFirst={READ_FIRST} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  const act = (action: Action) => {
    const next = reduce(flameData, lab, action)
    if (next !== lab) save(next)
    return next
  }
  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => act({ type: 'setMode', mode: next })}
      bench={() => (
        // A bench of its own for each run, and for a record taken from another tab: nothing chosen or said on the one before is carried over.
        <FlameBench
          key={`${runs}:${taken}`}
          data={flameData}
          sources={sources}
          state={lab}
          reducedMotion={reducedMotion}
          can={(action) => can(flameData, lab, action)}
          warn={(action) => warnings(flameData, lab, action)}
          act={act}
        />
      )}
      record={<FlameRecord data={flameData} state={lab} />}
    />
  )
}
