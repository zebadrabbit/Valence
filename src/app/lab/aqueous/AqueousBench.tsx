import { useEffect, useRef, useState } from 'react'
import { Calculator } from '@/app/lab/Calculator'
import { Paged } from '@/app/lab/Paged'
import { ROLE } from '@/app/lab/roles'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Source } from '@/chem-data/schema'
import { stationView, type Action, type AqueousState, type Blocked } from '@/engine/aqueous'
import { PAGE_TEXT, STATION_TEXT, stationTitle } from './messages'
import { SolubilityTable } from './SolubilityTable'
import { ProgressLabel, StationCard } from './StationCard'
import { openingStation, progressOf } from './stationLook'

export interface AqueousBenchProps {
  data: AqueousData
  sources: readonly Source[]
  state: AqueousState
  reducedMotion: boolean
  can(action: Action): Blocked | null
  act(action: Action): void
  /** The station shown when the bench mounts, counted from 0; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: number
}

/**
 * The Lab tab of the aqueous reactions lab: the two reference panels' buttons, the line that says the lab is
 * complete, and the ten stations one at a time (Paged), with the list that says how far each has come.
 *
 * A station is drawn from the first time it is shown, and stays drawn after it: the others that have been shown
 * are hidden, out of the layout, the tab order and a screen reader's reading, so that a station keeps what was
 * chosen and built there but not yet checked while another is looked at. Changing station moves focus to the
 * heading of the one shown.
 */
export function AqueousBench({ data, sources, state, reducedMotion, can, act, opensAt }: AqueousBenchProps) {
  const views = data.stations.map((station) => stationView(data, state, station.id))
  const progress = views.map(progressOf)
  const [index, setIndex] = useState(() => opensAt ?? openingStation(progress))
  // The stations that have been shown, the one shown now among them.
  const [visited, setVisited] = useState<readonly number[]>([index])
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const shown = useRef(index)
  useEffect(() => {
    if (shown.current !== index) headings.current[index]?.focus()
    shown.current = index
  }, [index])

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SolubilityTable data={data} />
        <Calculator />
        {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes. */}
        <p role="status" className="text-sm font-medium">
          {state.status === 'completed' && (
            <>
              <span aria-hidden="true" className={ROLE.done}>
                ✓{' '}
              </span>
              {PAGE_TEXT.completed}
            </>
          )}
        </p>
      </div>
      <Paged
        items={data.stations.map((station, i) => ({ id: station.id, heading: station.name, note: <ProgressLabel progress={progress[i]!} /> }))}
        index={index}
        onGo={(to) => {
          setIndex(to)
          if (!visited.includes(to)) setVisited([...visited, to])
          // The station already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) headings.current[index]?.focus()
        }}
        text={{
          list: STATION_TEXT.list,
          previous: () => STATION_TEXT.previous(stationTitle(data, data.stations[index - 1]!.id)),
          next: () => STATION_TEXT.next(stationTitle(data, data.stations[index + 1]!.id)),
        }}
      >
        {data.stations.map(
          (station, i) =>
            visited.includes(i) && (
              <div key={station.id} hidden={i !== index}>
                <StationCard
                  data={data}
                  sources={sources}
                  stationId={station.id}
                  view={views[i]!}
                  reducedMotion={reducedMotion}
                  can={can}
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
