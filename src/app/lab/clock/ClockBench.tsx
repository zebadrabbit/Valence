import { useMemo } from 'react'
import { Hazards } from '@/app/lab/Hazards'
import { KineticsBench, openingEntry as openingEntryOf } from '@/app/lab/kinetics/Bench'
import { RateLawNotebook } from '@/app/lab/kinetics/Notebook'
import { BottleTile } from '@/app/lab/stationPieces'
import { clockCitations } from '@/chem-data/citations'
import { PART_IDS, RUN_IDS, type ClockData, type PartId, type RunId } from '@/chem-data/clock/data'
import type { Source } from '@/chem-data/schema'
import * as engine from '@/engine/clock'
import type { Action, ClockModel, ClockState } from '@/engine/clock'
import { clockLab, partProgress, RUNS_OF, SHEET_OF } from './lab'
import { TemperatureNotebook } from './Notebook'
import { RunCard } from './RunCard'
import { MixtureTable } from './tables'

export { partProgress, RUNS_OF }

/** The entry of a part the Lab tab shows when the page opens: the first of its runs that does not count yet; where all do, the notebook, in the part that has one after its runs, and else the first run. */
export const openingEntry = (m: ClockModel, state: ClockState, part: PartId): number => openingEntryOf({ engine, m }, state, { runs: RUNS_OF[part], sheet: SHEET_OF[part] })

export interface ClockBenchProps {
  data: ClockData
  m: ClockModel
  sources: readonly Source[]
  /** The lab as it is stored. */
  state: ClockState
  /** False while another tab of the page is the one shown: the bench stays mounted, and no watch may go on running unseen. */
  shown: boolean
  reducedMotion: boolean
  /** The actions done, in order, and the lab saved once. */
  act(actions: readonly Action[]): void
  /** The part and the entry of it shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; entry?: number }
}

/**
 * The Lab tab of the clock reaction lab: the shared bench of the two labs on the kinetics engine
 * (src/app/lab/kinetics/Bench.tsx), which has the navigation of the three parts, one thing of a part at a time, the
 * play of a watch and the half second after a pour, and under every entry the sources and the bench. What is this
 * lab's own is handed to it: a run's card (RunCard.tsx), with its flasks, its starch and its baths; part 2's
 * notebook, which is the shared one under the first mixture's table; part 3's notebook and its graph
 * (Notebook.tsx); and a tile for each of the five bottles.
 */
export function ClockBench({ data, m, sources, state, shown, reducedMotion, act, opensAt }: ClockBenchProps) {
  const lab = useMemo(() => clockLab(data, m), [data, m])
  const citations = useMemo(() => Object.fromEntries(PART_IDS.map((id) => [id, clockCitations(data, id, sources)])), [data, sources])
  return (
    <KineticsBench
      lab={lab}
      state={state}
      shown={shown}
      act={act}
      opensAt={opensAt}
      citations={citations}
      bottles={data.reagents.map((reagent) => (
        <BottleTile key={reagent.id} name={reagent.name} lines={reagent.form === 'solution' ? [reagent.formula, `${reagent.molarity} M`] : [reagent.name.split(' ')[0]!]} rows={[]}>
          <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.form !== 'solution'} />
        </BottleTile>
      ))}
      run={(runId, on) => <RunCard data={data} lab={lab} state={state} run={runId as RunId} reducedMotion={reducedMotion} {...on} />}
      notebook={(part, onScreen) =>
        part.sheet === 'rate-law' ? (
          <RateLawNotebook lab={lab} state={state} shown={onScreen} act={act} mixture={<MixtureTable data={data} run={data.referenceMixtureId} />} />
        ) : (
          <TemperatureNotebook data={data} lab={lab} state={state} shown={onScreen} act={act} />
        )
      }
    />
  )
}

/** Every run of the lab, in the engine's order, with the part that makes it: for the record. */
export const RUN_PARTS = RUN_IDS.map((run) => ({ run, part: PART_IDS.find((part) => RUNS_OF[part].includes(run))! }))
