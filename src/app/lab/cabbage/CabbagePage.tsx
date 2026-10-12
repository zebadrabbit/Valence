import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { cabbageData } from '@/chem-data/cabbage/data'
import { CABBAGE_PRIMER, READ_FIRST } from '@/chem-data/cabbage/primer'
import sources from '@/chem-data/sources.json'
import { cabbageStateSchema, createLab, modelFrom, reduce, type Action, type Mode } from '@/engine/cabbage'
import { CabbageBench } from './CabbageBench'
import { CabbageRecord } from './CabbageRecord'
import { MODE_TEXT } from './messages'

const [, , , , , , , , CABBAGE] = ACTIVITIES
const MODEL = modelFrom(cabbageData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = cabbageStateSchema(MODEL)

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

/**
 * #/lab/red-cabbage-ph: the one place the engine and the three parts meet. The state is the stored record, read
 * once when the page mounts and taken again only when another tab saves it; every action of the learner's that the
 * engine takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not
 * started". Start and Restart draw a new seed, which fixes the pH of every household thing for that lab. The part
 * and the thing shown, what is chosen and not yet recorded and what a message line last said are the bench's and
 * are not stored. A lab that is complete still takes actions, so that the things left over can be tried.
 */
export function CabbagePage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(CABBAGE, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the lab's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new lab has a bench of its own, with nothing chosen or said on it.
  const [labs, setLabs] = useState(0)

  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new lab saved over whatever was there.
  const start = () => {
    setLabs((count) => count + 1)
    save(createLab(mode, drawSeed()))
  }
  const shell = {
    title: CABBAGE.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={CABBAGE_PRIMER} sources={sources} readFirst={READ_FIRST} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  // One press can be several actions (an estimate with its acid, neutral or basic; the rack's three answers): each on the lab as the one before leaves it, and one save.
  const act = (...actions: Action[]) => {
    const next = actions.reduce((now, action) => reduce(MODEL, now, action), lab)
    if (next !== lab) save(next)
  }
  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => act({ type: 'setMode', mode: next })}
      // A bench of its own for each lab started, and for a record taken from another tab: nothing chosen or said on the one before is carried over.
      bench={() => <CabbageBench key={`${labs}:${taken}`} data={cabbageData} m={MODEL} sources={sources} state={lab} act={act} />}
      record={<CabbageRecord data={cabbageData} m={MODEL} state={lab} />}
    />
  )
}
