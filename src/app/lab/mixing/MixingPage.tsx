import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { mixingData } from '@/chem-data/mixing/data'
import { MIXING_PRIMER, READ_FIRST } from '@/chem-data/mixing/primer'
import sources from '@/chem-data/sources.json'
import { createLab, mixingStateSchema, modelFrom, reduce, type Action, type Mode } from '@/engine/mixing'
import { MODE_TEXT } from './messages'
import { MixingBench } from './MixingBench'
import { MixingRecord } from './MixingRecord'

const [, , , , , , , , , , , , MIXING] = ACTIVITIES
const MODEL = modelFrom(mixingData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = mixingStateSchema(MODEL)

/**
 * #/lab/polarity-and-mixing: the one place the engine and the three parts meet. The state is the stored record,
 * read once when the page mounts and taken again only when another tab saves it; every action of the learner's that
 * the engine takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not
 * started". Nothing in the lab is drawn by chance, so Start and Restart draw no seed. The part and the tube shown,
 * which parts of a picture have been looked at and what a message line last said are the bench's and are not
 * stored. A lab that is complete still takes actions, so that the tubes left over can be tried.
 */
export function MixingPage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(MIXING, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the lab's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new lab has a bench of its own, with nothing chosen or said on it.
  const [labs, setLabs] = useState(0)

  const mode = lab?.mode ?? chosen
  // Start and Restart both: the mode as it is, and a new lab saved over whatever was there.
  const start = () => {
    setLabs((count) => count + 1)
    save(createLab(mode))
  }
  const shell = {
    title: MIXING.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={MIXING_PRIMER} sources={sources} readFirst={READ_FIRST} />,
  }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  // One press can be several actions: each on the lab as the one before leaves it, and one save.
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
      bench={() => <MixingBench key={`${labs}:${taken}`} data={mixingData} m={MODEL} sources={sources} state={lab} act={act} />}
      record={<MixingRecord data={mixingData} m={MODEL} state={lab} />}
    />
  )
}
