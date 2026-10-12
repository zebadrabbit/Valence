import { Fragment, useState, type ReactNode } from 'react'
import type { z } from 'zod'
import type { Activity } from '@/app/activities'
import { useAppState } from '@/app/AppState'
import { LabShell } from '@/app/lab/LabShell'
import { useLabProgress } from '@/app/lab/useLabProgress'
import { useMediaQuery } from '@/app/useMediaQuery'
import type { Action, Engine, Mode, Model, State } from './engine'

/** A 32-bit seed from the browser's random source. Drawn here: the engine never makes one. */
const drawSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!

export interface KineticsPageProps {
  activity: Activity
  engine: Pick<Engine, 'createLab' | 'reduce'>
  m: Model
  /** One schema for the page's life: the stored record is held to the model as it is read. */
  schema: z.ZodType<State>
  /** What each mode does in this lab, beside its radio button. */
  modeText: Record<Mode, string>
  primer: ReactNode
  /** The lab's bench and its record, on the lab as it is stored. */
  bench(about: { state: State; shown: boolean; reducedMotion: boolean; act(actions: readonly Action[]): void }): ReactNode
  record(state: State): ReactNode
}

/**
 * The page of a lab on the kinetics engine: the one place its engine and its parts meet. The state is the stored
 * record, read once when the page mounts and taken again only when another tab saves it; every action of the
 * learner's that the engine takes is saved as it is taken, but for the pour, which is saved together with the stop
 * of its watch (Bench.tsx). Nothing is stored until Start, so opening the page leaves Home at "Not started". What
 * is typed and not yet entered, the part and the run shown, a watch that is running and a warning that is showing
 * are the bench's and are not stored.
 */
export function KineticsPage({ activity, engine, m, schema, modeText, primer, bench, record }: KineticsPageProps) {
  const { persistent, reducedMotion } = useAppState()
  // The rail's own query (Layout.tsx), so no width falls between the two.
  const narrow = !useMediaQuery('(min-width: 768px)')
  const [lab, save, { setAside, taken }] = useLabProgress(activity, schema)
  // The mode chosen before Start. From Start on, the mode is the run's.
  const [chosen, setChosen] = useState<Mode>('guided')
  // Counts Start and Restart: a new lab has a bench of its own, with nothing typed or said on it.
  const [labs, setLabs] = useState(0)

  const mode = lab?.mode ?? chosen
  // Start and Restart both: a new seed, the mode as it is, and a new lab saved over whatever was there.
  const start = () => {
    setLabs((count) => count + 1)
    save(engine.createLab(m, drawSeed(), mode))
  }
  const shell = { title: activity.title, narrow, persistent, mode, modeText, onStart: start, onRestart: start, primer }
  if (lab === null) return <LabShell {...shell} started={false} setAside={setAside} onMode={setChosen} bench={() => null} record={null} />

  /** The actions in order, each on what the one before it left, and the lab saved once if anything came of them. */
  const act = (actions: readonly Action[]) => {
    const next = actions.reduce((state, action) => engine.reduce(m, state, action), lab)
    if (next !== lab) save(next)
  }
  return (
    <LabShell
      {...shell}
      started
      onMode={(next) => act([{ type: 'setMode', mode: next }])}
      bench={(shown) => (
        // A bench of its own for each lab started, and for a record taken from another tab: nothing typed, said or played on the one before is carried over.
        <Fragment key={`${labs}:${taken}`}>{bench({ state: lab, shown, reducedMotion, act })}</Fragment>
      )}
      record={record(lab)}
    />
  )
}
