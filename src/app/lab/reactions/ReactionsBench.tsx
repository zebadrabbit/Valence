import { useEffect, useMemo, useRef, useState } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { Hazards } from '@/app/lab/Hazards'
import { openingStation } from '@/app/lab/openingStation'
import { Paged } from '@/app/lab/Paged'
import { BottleTile, Listed, Marked } from '@/app/lab/stationPieces'
import { reactionsCitations } from '@/chem-data/citations'
import { STATION_IDS, stationOf, type Field, type ReactionsData, type StationId } from '@/chem-data/reactions/data'
import type { Source } from '@/chem-data/schema'
import { runRecords, stationView, type Action, type Blocked, type Observation, type ReactionsModel, type ReactionsState } from '@/engine/reactions'
import { BENCH_TEXT, LAB_TEXT, PAGE_TEXT, SOURCES_TEXT, benchLines, progressOf, stationName } from './messages'
import { ProgressLabel, StationCard } from './StationCard'
import './reactions.css'

export interface ReactionsBenchProps {
  data: ReactionsData
  m: ReactionsModel
  sources: readonly Source[]
  state: ReactionsState
  can(action: Action): Blocked | null
  wrong(station: StationId, vessel: string, observation: Observation): Field[]
  act(action: Action): void
  /** The station shown when the bench mounts, counted from 0; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: number
}

/** The most liquid a tube of the lab comes to hold: every tube is drawn as full as that makes it. */
export const fullMicrolitres = (m: ReactionsModel): number => Math.max(...m.stations.flatMap((station) => station.vessels.map((vessel) => vessel.microlitres?.after ?? 0)))

/** The bench: what stands on it for the station shown, in words, and the lab's nine bottles and metals, each a tile with its hazards. */
function Bench({ data, sources, stationId }: { data: ReactionsData; sources: readonly Source[]; stationId: StationId }) {
  return (
    <div className="grid gap-3">
      <p className="font-medium">{BENCH_TEXT.uses}</p>
      <Listed items={benchLines(data, stationId)} />
      <p className="max-w-prose">{BENCH_TEXT.wear}</p>
      {/* Two to a row where the bench has the width for a tile's hazards to be read beside its bottle, by the width the bench itself has. */}
      <div className="grid w-full gap-2 @2xl:grid-cols-2">
        {data.reagents.map((reagent) => (
          <BottleTile key={reagent.id} name={reagent.name} lines={[reagent.formula]} rows={[]}>
            <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.form === 'metal'} />
          </BottleTile>
        ))}
      </div>
    </div>
  )
}

/**
 * The Lab tab of the types of reactions lab: the line that says the lab is complete, what the lab is until
 * anything is done in it, and the five stations one at a time (Paged), with the list that says how far each has
 * come. Under the ways on, in one place that every station's page has: the sources of the station shown, and the
 * bench, with what the station uses and a tile with its hazards for each of the lab's nine bottles and metals.
 *
 * A station is drawn from the first time it is shown, and stays drawn after it: the others that have been shown
 * are hidden, out of the layout, the tab order and a screen reader's reading, so that a station keeps what was
 * chosen or built there and not yet recorded while another is looked at. A new run of a station is a card of its
 * own. Changing station, and setting one up again, moves focus to the heading of the one shown.
 */
export function ReactionsBench({ data, m, sources, state, can, wrong, act, opensAt }: ReactionsBenchProps) {
  const views = STATION_IDS.map((stationId) => stationView(m, state, stationId))
  const progress = views.map(progressOf)
  const [index, setIndex] = useState(() => opensAt ?? openingStation(progress))
  const [visited, setVisited] = useState<readonly number[]>([index])
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const full = useMemo(() => fullMicrolitres(m), [m])
  const stationId = STATION_IDS[index]!
  const done = views[index]!.done
  // The sources of the answers are listed once the station counts, and not before.
  const cited = useMemo(() => reactionsCitations(data, stationId, sources, done), [data, stationId, sources, done])
  // The station shown and which run of it: a change of either is a new card, whose heading takes focus, since the button that was pressed is gone or hidden.
  const shown = `${index}:${views[index]!.runs}`
  const was = useRef(shown)
  useEffect(() => {
    if (was.current !== shown) headings.current[index]?.focus()
    was.current = shown
  }, [shown, index])
  // Until anything is done at any station, the tab says at its head what the lab is.
  const untouched = views.every((view, i) => progress[i] === 'not-started' && view.runs === 1)

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${state.status === 'completed' ? '' : '-mb-3'}`}>
        {state.status === 'completed' && (
          <Marked mark="✓" done>
            {LAB_TEXT.completed}
          </Marked>
        )}
      </p>
      {untouched && (
        <p className="max-w-prose text-sm">
          {LAB_TEXT.aim} <span className="text-muted-foreground">{LAB_TEXT.complete}</span>
        </p>
      )}
      <Paged
        items={STATION_IDS.map((id, i) => ({
          id,
          heading: stationOf(data, id).title,
          mark: `${stationOf(data, id).letter}.`,
          note: <ProgressLabel progress={progress[i]!} />,
        }))}
        index={index}
        onGo={(to) => {
          setIndex(to)
          if (!visited.includes(to)) setVisited([...visited, to])
          // The station already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) headings.current[index]?.focus()
        }}
        text={{
          list: PAGE_TEXT.stations,
          previous: () => PAGE_TEXT.previous(stationName(data, STATION_IDS[index - 1]!)),
          next: () => PAGE_TEXT.next(stationName(data, STATION_IDS[index + 1]!)),
        }}
        // A station's picture and its questions stand side by side, and need more room than a primer's card: the list stays behind its button for longer.
        roomy
        after={
          // Each is a line of words with a hit area a finger tall laid over it, which reaches 12 px over and under a closed one and 24 px over an open one. They stand far enough apart, and far enough under Previous, that no area lies over another control. As in the Le Chatelier's principle lab.
          <div className="mt-4 grid gap-9 text-sm">
            <Sources citations={cited} derived={SOURCES_TEXT} />
            <Disclosure summary={BENCH_TEXT.heading}>
              <Bench data={data} sources={sources} stationId={stationId} />
            </Disclosure>
          </div>
        }
      >
        {STATION_IDS.map(
          (id, i) =>
            visited.includes(i) && (
              <div key={id} hidden={i !== index}>
                <StationCard
                  // A new run of a station is a card of its own: nothing chosen, built or said in the one before is carried over.
                  key={views[i]!.runs}
                  data={data}
                  stationId={id}
                  mode={state.mode}
                  view={views[i]!}
                  counted={views[i]!.done ? (runRecords(m, state, id).find((run) => run.outcome.state === 'counts') ?? null) : null}
                  full={full}
                  can={can}
                  wrong={(vessel, observation) => wrong(id, vessel, observation)}
                  act={act}
                  headingRef={(element) => void (headings.current[i] = element)}
                />
              </div>
            ),
        )}
      </Paged>
    </div>
  )
}
