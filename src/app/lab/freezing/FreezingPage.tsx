import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { freezingData } from '@/chem-data/freezing/data'
import { FREEZING_PRIMER, READ_FIRST } from '@/chem-data/freezing/primer'
import sources from '@/chem-data/sources.json'
import { freezingStateSchema, can, createLab, modelFrom, reduce, warnings, type Action, type Mode } from '@/engine/freezing'
import { FreezingBench } from './FreezingBench'
import { FreezingRecord } from './FreezingRecord'
import { MODE_TEXT } from './messages'

const [, , , , , , , , , , FREEZING] = ACTIVITIES
const MODEL = modelFrom(freezingData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = freezingStateSchema(MODEL)

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/**
 * #/lab/freezing-point-depression: the one place the engine and the three parts meet. The state is the stored record, read once
 * when the page mounts and taken again only when another tab saves it; every action of the learner's that the
 * engine takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not
 * started". What is typed and not yet entered, the part that is shown, the reading last looked at and a warning
 * that is showing are the bench's and are not stored.
 */
export function FreezingPage() {
  const { persistent, reducedMotion } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(FREEZING, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the run's.
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
    title: FREEZING.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={FREEZING_PRIMER} sources={sources} readFirst={READ_FIRST} />,
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
        // A bench of its own for each lab started, and for a record taken from another tab: nothing typed or said on the one before is carried over.
        <FreezingBench
          key={`${labs}:${taken}`}
          data={freezingData}
          m={MODEL}
          sources={sources}
          state={lab}
          reducedMotion={reducedMotion}
          can={(action) => can(MODEL, lab, action)}
          warn={(action) => warnings(MODEL, lab, action)}
          act={act}
        />
      )}
      record={<FreezingRecord data={freezingData} m={MODEL} state={lab} />}
    />
  )
}
