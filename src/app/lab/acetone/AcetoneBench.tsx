import { useMemo } from 'react'
import { Hazards } from '@/app/lab/Hazards'
import { KineticsBench, openingEntry as openingEntryOf } from '@/app/lab/kinetics/Bench'
import { RateLawNotebook } from '@/app/lab/kinetics/Notebook'
import { BottleTile } from '@/app/lab/stationPieces'
import { PART_IDS, RUN_IDS, type AcetoneData, type PartId, type RunId } from '@/chem-data/acetone/data'
import { acetoneCitations } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import * as engine from '@/engine/acetone'
import type { Action, AcetoneModel, AcetoneState } from '@/engine/acetone'
import { acetoneLab, partProgress, PARTS } from './lab'
import { Mixture, RunCard } from './RunCard'

export { partProgress }

/** The entry of a part the Lab tab shows when the page opens: in part 1 the first run that does not count yet, or the first run once all do; part 2 is one thing, its notebook. */
export const openingEntry = (m: AcetoneModel, state: AcetoneState, part: PartId): number => openingEntryOf({ engine, m }, state, PARTS[PART_IDS.indexOf(part)]!)

export interface AcetoneBenchProps {
  data: AcetoneData
  m: AcetoneModel
  sources: readonly Source[]
  /** The lab as it is stored. */
  state: AcetoneState
  /** False while another tab of the page is the one shown: the bench stays mounted, and no watch may go on running unseen. */
  shown: boolean
  reducedMotion: boolean
  /** The actions done, in order, and the lab saved once. */
  act(actions: readonly Action[]): void
  /** The part and the entry of it shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; entry?: number }
}

/**
 * The Lab tab of the iodination of acetone lab: the shared bench of the two labs on the kinetics engine
 * (src/app/lab/kinetics/Bench.tsx), which has the navigation of the parts, one thing of a part at a time, the play
 * of a watch and the half second after a pour, and under every entry the sources and the bench. What is this
 * lab's own is handed to it: a run's card (RunCard.tsx), with its flask, its flask of water and the fade; the
 * notebook on the rate law, which is the shared one under the first mixture's table; and a tile for each of the
 * three bottles, so that the hazards of all three are in one place that every run and the notebook can reach.
 */
export function AcetoneBench({ data, m, sources, state, shown, reducedMotion, act, opensAt }: AcetoneBenchProps) {
  const lab = useMemo(() => acetoneLab(data, m), [data, m])
  const citations = useMemo(() => Object.fromEntries(PART_IDS.map((id) => [id, acetoneCitations(data, id, sources)])), [data, sources])
  // The mixture with the most iodine sets the deepest yellow: every flask is drawn on that one scale, so a mixture with twice the iodine starts deeper.
  const deepest = Math.max(...RUN_IDS.map((run) => engine.leftAt(m, state, run, 0)!.ofMicroMolar))
  return (
    <KineticsBench
      lab={lab}
      state={state}
      shown={shown}
      act={act}
      opensAt={opensAt}
      citations={citations}
      bottles={data.reagents.map((reagent) => (
        <BottleTile key={reagent.id} name={reagent.name} lines={[reagent.formula, `${reagent.shown} M`]} rows={[]}>
          <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={false} />
        </BottleTile>
      ))}
      run={(runId, on) => <RunCard data={data} lab={lab} state={state} run={runId as RunId} deepest={deepest} reducedMotion={reducedMotion} {...on} />}
      notebook={(_part, onScreen) => <RateLawNotebook lab={lab} state={state} shown={onScreen} act={act} mixture={<Mixture data={data} run={data.referenceMixtureId} />} />}
    />
  )
}
