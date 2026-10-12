import { useEffect, useRef, useState } from 'react'
import { openingStation } from '@/app/lab/openingStation'
import { Paged } from '@/app/lab/Paged'
import { Marked } from '@/app/lab/stationPieces'
import { PART_IDS, SALT_IDS, type HotcoldData } from '@/chem-data/hotcold/data'
import type { Source } from '@/chem-data/schema'
import { packsMissed, packsView, runView, type Action, type Blocked, type HotcoldModel, type HotcoldState, type Warning } from '@/engine/hotcold'
import { BENCH_TEXT, PAGE_TEXT, packsProgressOf, partTitle, progressOf, type Progress } from './messages'
import { PacksCard } from './PacksCard'
import { ProgressLabel, RunCard } from './RunCard'

/**
 * The part the Lab tab shows when the page opens: the one the learner was in the middle of, as far as the stored
 * record can tell. The first that is begun and not done; where none is, the first not done that can be worked;
 * else the first. Part 3 while it waits for the two runs is neither begun nor to be opened on.
 */
export const openingPart = (progress: readonly Progress[]): number => openingStation(progress.map((one) => (one === 'waiting' ? 'not-started' : one)))

export interface HotcoldBenchProps {
  data: HotcoldData
  m: HotcoldModel
  sources: readonly Source[]
  state: HotcoldState
  reducedMotion: boolean
  can(action: Action): Blocked | null
  warn(action: Action): Warning[]
  act(action: Action): void
  /** The part shown when the bench mounts, counted from 0; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: number
}

/**
 * The Lab tab of the endothermic and exothermic lab: the line that says the lab is complete, and the three parts
 * one at a time (Paged), with the list that says how far each has come. The two salts can be run in either order,
 * and the line over the list says so.
 *
 * A part is drawn from the first time it is shown, and stays drawn after it: the others that have been shown are
 * hidden, out of the layout, the tab order and a screen reader's reading, so that a part keeps what was typed
 * there but not yet entered while another is looked at. Changing part moves focus to the heading of the one shown.
 */
export function HotcoldBench({ data, m, sources, state, reducedMotion, can, warn, act, opensAt }: HotcoldBenchProps) {
  const runs = SALT_IDS.map((salt) => runView(m, state, salt))
  const packs = packsView(m, state)
  const progress: Progress[] = [...runs.map(progressOf), packsProgressOf(packs)]
  const [index, setIndex] = useState(() => opensAt ?? openingPart(progress))
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
        {state.status === 'completed' ? <Marked mark="✓" done>{BENCH_TEXT.complete}</Marked> : <span className="font-normal text-muted-foreground">{PAGE_TEXT.order}</span>}
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
        {SALT_IDS.map(
          (salt, i) =>
            visited.includes(i) && (
              <div key={salt} hidden={i !== index}>
                <RunCard data={data} m={m} sources={sources} part={salt} mode={state.mode} view={runs[i]!} reducedMotion={reducedMotion} can={can} warn={warn} act={act} headingRef={(element) => void (headings.current[i] = element)} />
              </div>
            ),
        )}
        {visited.includes(2) && (
          <div hidden={index !== 2}>
            <PacksCard data={data} sources={sources} mode={state.mode} view={packs} missed={packsMissed(m, state)} can={can} act={act} headingRef={(element) => void (headings.current[2] = element)} />
          </div>
        )}
      </Paged>
    </div>
  )
}
