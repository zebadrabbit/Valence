import { Worksheet as SharedWorksheet } from '@/app/lab/Worksheet'
import type { CalorimetryData, PartId } from '@/chem-data/calorimetry/data'
import { parseChange, parseSig3, parseTemperature, type Blocked, type EntryView, type Field, type GraphView, type Mode, type Value } from '@/engine/calorimetry'
import { BENCH_TEXT, DIRECTION_LABEL, PAGE_TEXT, VERDICT_TEXT, blockedText, enteredText, entryFeedback, entryText, fieldLabel, formatHelp, metalChoices, relationText } from './messages'

/** The entries that are chosen, not typed. */
const isChoice = (field: Field) => field === 'direction' || field === 'metal'
/** The typed entries that may begin with a minus sign. */
const isSigned = (field: Field) => field === 'change' || field === 'perMole'

/** What was typed, as the engine takes it; null where it is not written as its entry is. */
function parse(field: Field, text: string): Value | null {
  if (field === 'start' || field === 'extreme') return parseTemperature(text)
  return field === 'change' ? parseChange(text) : parseSig3(text)
}

export interface WorksheetProps {
  data: CalorimetryData
  part: PartId
  mode: Mode
  /** The worksheet's entries in the order they are worked out, each as the engine has it. */
  entries: readonly EntryView[]
  /** What the graph has shown, which settles whether the second entry is the highest temperature or the lowest. */
  graph: GraphView
  enter(field: Field, value: Value): Blocked | null
  /** Why the worksheet cannot be checked now, or null; and the check, which Challenge asks for and Guided makes at the last entry. */
  checkBlocked: Blocked | null
  onCheck(): void
}

/**
 * A part's worksheet: the shell's notebook (../Worksheet.tsx), which the freezing point depression lab draws too,
 * with this lab's entries, its reading of what is typed and its words.
 *
 * Until the curve has turned back the list is not drawn, and one sentence says what opens it. The first two
 * entries wait for a look at the graph, and say so. In Challenge "Check the worksheet" is under the list.
 */
export function Worksheet({ data, part, mode, entries, graph, enter, checkBlocked, onCheck }: WorksheetProps) {
  const closedBy = entries[0]!.blocked
  return (
    <SharedWorksheet
      entries={entries.map(({ field, value, blocked, verdict }) => ({ field, value, held: blocked === null ? null : blockedText(part, blocked, field), verdict }))}
      guided={mode === 'guided'}
      // Where the logger is full and the curve has not turned, there is no running on to wait for.
      closed={closedBy === 'change-not-started' || closedBy === 'not-turned' ? (graph.full ? BENCH_TEXT.spent : blockedText(part, closedBy)) : null}
      over={closedBy === 'run-over' || closedBy === 'lab-completed'}
      label={(field) => fieldLabel(part, field, graph)}
      choices={(field) => (!isChoice(field) ? null : field === 'direction' ? (['out', 'in'] as const).map((direction) => ({ value: direction, label: DIRECTION_LABEL[direction] })) : metalChoices(data))}
      signed={isSigned}
      typedText={(_field, value) => (typeof value === 'string' ? value : entryText(value))}
      enteredText={(field, value) => enteredText(data, field, value)}
      help={formatHelp}
      relation={(field) => relationText(data, part, field)}
      feedback={(field, verdict) => entryFeedback(part, field, verdict)}
      invalid={(field) => blockedText(part, 'invalid-entry', field)}
      parse={parse}
      enter={(field, value) => {
        const refused = enter(field, value)
        return refused === null ? null : blockedText(part, refused, field)
      }}
      checkHeld={checkBlocked === null ? null : blockedText(part, checkBlocked)}
      // Room over the hint of an entry that is chosen: open, its hit area reached 6 px into the foot of Enter, measured in the browser.
      hintRoom
      onCheck={onCheck}
      text={{ hint: BENCH_TEXT.hint, check: BENCH_TEXT.check, enter: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, changeNote: PAGE_TEXT.changeNote, ...VERDICT_TEXT }}
    />
  )
}
