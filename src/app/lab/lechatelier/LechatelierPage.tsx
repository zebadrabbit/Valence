import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { lechatelierData } from '@/chem-data/lechatelier/data'
import { LECHATELIER_PRIMER, READ_FIRST } from '@/chem-data/lechatelier/primer'
import sources from '@/chem-data/sources.json'
import { can, createLab, lechatelierStateSchema, mismatch, modelFrom, reduce, type Action, type Mode } from '@/engine/lechatelier'
import { LechatelierBench } from './LechatelierBench'
import { LechatelierRecord } from './LechatelierRecord'
import { MODE_TEXT } from './messages'

const [, , , , , LECHATELIER] = ACTIVITIES
const MODEL = modelFrom(lechatelierData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = lechatelierStateSchema(MODEL)

/**
 * #/lab/le-chatelier: the one place the engine and the four systems meet. The state is the stored record, read
 * once when the page mounts and taken again only when another tab saves it; every action of the learner's that the
 * engine takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at "Not
 * started". There is no seed: nothing in this lab is drawn by chance. What is chosen and not yet recorded, the
 * system and the disturbance that are shown and what a message line last said are the bench's and are not stored.
 * A lab that is complete still takes actions, so that a system can be worked again; its status stays completed.
 */
export function LechatelierPage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(LECHATELIER, SCHEMA)
  // The mode chosen before Start. From Start on, the mode is the run's.
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
    title: LECHATELIER.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={LECHATELIER_PRIMER} sources={sources} readFirst={READ_FIRST} />,
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
        <LechatelierBench
          key={`${labs}:${taken}`}
          data={lechatelierData}
          m={MODEL}
          sources={sources}
          state={lab}
          can={(action) => can(MODEL, lab, action)}
          wrong={(system, observation) => mismatch(MODEL, lab, system, observation)}
          act={act}
        />
      )}
      record={<LechatelierRecord data={lechatelierData} m={MODEL} state={lab} />}
    />
  )
}
