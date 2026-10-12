import { useState } from 'react'
import { ACTIVITIES } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { Primer } from '@/app/lab/Primer'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import { reactionsData } from '@/chem-data/reactions/data'
import { REACTIONS_PRIMER, READ_FIRST } from '@/chem-data/reactions/primer'
import sources from '@/chem-data/sources.json'
import { can, createLab, mismatch, modelFrom, reactionsStateSchema, reduce, type Action, type Mode } from '@/engine/reactions'
import { MODE_TEXT } from './messages'
import { ReactionsBench } from './ReactionsBench'
import { ReactionsRecord } from './ReactionsRecord'

const REACTIONS = ACTIVITIES[11]
const MODEL = modelFrom(reactionsData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = reactionsStateSchema(MODEL)

/**
 * #/lab/types-of-reactions: the one place the engine and the five stations meet. The state is the stored record,
 * read once when the page mounts and taken again only when another tab saves it; every action of the learner's
 * that the engine takes is saved as it is taken. Nothing is stored until Start, so opening the page leaves Home at
 * "Not started". There is no seed: nothing in this lab is drawn by chance. What is chosen or built and not yet
 * recorded, the station that is shown and what a message line last said are the bench's and are not stored. A lab
 * that is complete still takes actions, so that a station can be worked again; its status stays completed.
 */
export function ReactionsPage() {
  const { persistent } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(REACTIONS, SCHEMA)
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
    title: REACTIONS.title,
    narrow,
    persistent,
    mode,
    modeText: MODE_TEXT,
    onStart: start,
    onRestart: start,
    primer: <Primer sections={REACTIONS_PRIMER} sources={sources} readFirst={READ_FIRST} />,
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
        <ReactionsBench
          key={`${labs}:${taken}`}
          data={reactionsData}
          m={MODEL}
          sources={sources}
          state={lab}
          can={(action) => can(MODEL, lab, action)}
          wrong={(station, vessel, observation) => mismatch(MODEL, lab, station, vessel, observation)}
          act={act}
        />
      )}
      record={<ReactionsRecord data={reactionsData} m={MODEL} state={lab} />}
    />
  )
}
