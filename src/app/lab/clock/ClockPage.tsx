import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { clockData } from '@/chem-data/clock/data'
import { CLOCK_PRIMER, READ_FIRST } from '@/chem-data/clock/primer'
import sources from '@/chem-data/sources.json'
import { clockStateSchema, createLab, modelFrom, reduce, type Action, type Mode } from '@/engine/clock'
import { ClockBench } from './ClockBench'
import { ClockRecord } from './ClockRecord'
import { MODE_TEXT } from './messages'

const [, , , , , , CLOCK] = ACTIVITIES
const MODEL = modelFrom(clockData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = clockStateSchema(MODEL)

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/**
 * #/lab/clock-reaction: the one place the engine and the three parts meet. The state is the stored record, read
 * once when the page mounts and taken again only when another tab saves it; every action of the learner's that the
 * engine takes is saved as it is taken, but for the pour, which is saved together with the stop of its watch
 * (ClockBench). Nothing is stored until Start, so opening the page leaves Home at "Not started". What is typed and
 * not yet entered, the part and the run shown, a watch that is running, the place on the line last looked at and
 * a warning that is showing are the bench's and are not stored.
 */
export function ClockPage() {
  const { persistent, reducedMotion } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(CLOCK, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new lab has a bench of its own, with nothing typed or said on it.
  const [labs, setLabs] = useState(0)

  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new lab saved over whatever was there.
  const start = () => {
    setLabs((count) => count + 1)
    save(createLab(MODEL, drawSeed(), mode))
  }
  const shell = {
    title: CLOCK.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={CLOCK_PRIMER} sources={sources} readFirst={READ_FIRST} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  /** The actions in order, each on what the one before it left, and the lab saved once if anything came of them. */
  const act = (actions: readonly Action[]) => {
    const next = actions.reduce((state, action) => reduce(MODEL, state, action), lab)
    if (next !== lab) save(next)
  }
  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => act([{ type: 'setMode', mode: next }])}
      bench={(shown) => (
        // A bench of its own for each lab started, and for a record taken from another tab: nothing typed, said or played on the one before is carried over.
        <ClockBench key={`${labs}:${taken}`} data={clockData} m={MODEL} sources={sources} state={lab} shown={shown} reducedMotion={reducedMotion} act={act} />
      )}
      record={<ClockRecord data={clockData} m={MODEL} state={lab} />}
    />
  )
}
