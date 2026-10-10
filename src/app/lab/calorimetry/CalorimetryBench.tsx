import { useEffect, useRef, useState } from 'react'
import { openingStation } from '@/app/lab/openingStation'
import { Paged } from '@/app/lab/Paged'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, type CalorimetryData } from '@/chem-data/calorimetry/data'
import type { Source } from '@/chem-data/schema'
import { partView, type Action, type Blocked, type CalorimetryModel, type CalorimetryState, type Warning } from '@/engine/calorimetry'
import { BENCH_TEXT, PAGE_TEXT, partTitle, progressOf } from './messages'
import { PartCard, ProgressLabel } from './PartCard'

export interface CalorimetryBenchProps {
  data: CalorimetryData
  m: CalorimetryModel
  sources: readonly Source[]
  state: CalorimetryState
  reducedMotion: boolean
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** The part shown when the bench mounts, counted from 0; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: number
}

/**
 * The Lab tab of the calorimetry lab: the line that says the lab is complete, and the three parts one at a time
 * (Paged), with the list that says how far each has come.
 *
 * A part is drawn from the first time it is shown, and stays drawn after it: the others that have been shown are
 * hidden, out of the layout, the tab order and a screen reader's reading, so that a part keeps what was typed
 * there but not yet entered while another is looked at. Changing part moves focus to the heading of the one shown.
 */
export function CalorimetryBench({ data, m, sources, state, reducedMotion, can, warn, act, opensAt }: CalorimetryBenchProps) {
  const views = PART_IDS.map((part) => partView(m, state, part))
  const progress = views.map(progressOf)
  const [index, setIndex] = useState(() => opensAt ?? openingStation(progress))
  // The parts that have been shown, the one shown now among them.
  const [visited, setVisited] = useState<readonly number[]>([index])
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const shown = useRef(index)
  useEffect(() => {
    if (shown.current !== index) headings.current[index]?.focus()
    shown.current = index
  }, [index])
  const title = (at: number) => partTitle(data, PART_IDS[at]!)

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes. */}
      <p role="status" className="text-sm font-medium">
        {state.status === 'completed' && <Marked mark="✓" done>{BENCH_TEXT.complete}</Marked>}
      </p>
      <Paged
        items={data.parts.map((part, i) => ({ id: part.id, heading: part.name, note: <ProgressLabel progress={progress[i]!} /> }))}
        index={index}
        onGo={(to) => {
          setIndex(to)
          if (!visited.includes(to)) setVisited([...visited, to])
          // The part already shown: its heading takes focus all the same, as the list is closed under it.
          if (to === index) headings.current[index]?.focus()
        }}
        text={{ list: PAGE_TEXT.list, previous: () => PAGE_TEXT.previous(title(index - 1)), next: () => PAGE_TEXT.next(title(index + 1)) }}
      >
        {PART_IDS.map(
          (part, i) =>
            visited.includes(i) && (
              <div key={part} hidden={i !== index}>
                <PartCard
                  data={data}
                  m={m}
                  sources={sources}
                  part={part}
                  mode={state.mode}
                  view={views[i]!}
                  shown={i === index}
                  reducedMotion={reducedMotion}
                  can={can}
                  warn={warn}
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
