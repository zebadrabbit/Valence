import { Worksheet } from '@/app/lab/Worksheet'
import type { HotcoldData, SaltId } from '@/chem-data/hotcold/data'
import { isChoice, parseChange, parseTemperature, type Blocked, type EntryView, type Field, type Mode, type Value } from '@/engine/hotcold'
import { BENCH_TEXT, FIELD_LABEL, HINT_TEXT, PAGE_TEXT, VERDICT_TEXT, blockedText, choicesOf, enteredText, entryFeedback, entryText, formatHelp } from './messages'

/** What was typed or chosen, as the engine takes it; null where it is not written as its entry is. A choice is its id. */
function parse(field: Field, text: string): Value | null {
  if (isChoice(field)) return text === '' ? null : text
  return field === 'change' ? parseChange(text) : parseTemperature(text)
}

export interface NotebookProps {
  data: HotcoldData
  part: SaltId
  mode: Mode
  /** The notebook's entries in the order they are made, each as the engine has it. */
  entries: readonly EntryView[]
  /** Whether the logger can take no more readings: a notebook that cannot open then says so. */
  full: boolean
  enter(field: Field, value: Value): Blocked | null
  /** Why the notebook cannot be checked now, or null; and the check, which Challenge asks for and Guided makes at the last entry. */
  checkBlocked: Blocked | null
  onCheck(): void
}

/**
 * A run's notebook: the shell's (../Worksheet.tsx), which the calorimetry lab and the freezing point depression
 * lab draw too, with this lab's six entries, its reading of what is typed and its words. The two temperatures and
 * the change between them are typed; whether the water got warmer or colder, which way the heat went and the word
 * for the change are chosen. Until the curve has turned back the list is not drawn, and one sentence says what
 * opens it. The two temperatures wait for a look at the graph, and say so.
 */
export function Notebook({ data, part, mode, entries, full, enter, checkBlocked, onCheck }: NotebookProps) {
  const closedBy = entries[0]!.blocked
  return (
    <Worksheet
      entries={entries.map(({ field, value, blocked, verdict }) => ({ field, value, held: blocked === null ? null : blockedText(data, part, blocked, field), verdict }))}
      guided={mode === 'guided'}
      // Where the logger is full and the curve has not turned, there is no running on to wait for.
      closed={closedBy === 'salt-not-added' || closedBy === 'not-turned' ? (full ? BENCH_TEXT.spent : blockedText(data, part, closedBy)) : null}
      over={closedBy === 'run-over' || closedBy === 'lab-completed'}
      label={(field) => FIELD_LABEL[field]}
      choices={(field) => (isChoice(field) ? choicesOf(field) : null)}
      // The change may be typed with its sign.
      signed={(field) => field === 'change'}
      typedText={(_field, value) => (typeof value === 'number' ? entryText(value) : value)}
      enteredText={enteredText}
      help={formatHelp}
      relation={(field) => HINT_TEXT[field]}
      feedback={entryFeedback}
      invalid={(field) => blockedText(data, part, 'invalid-entry', field)}
      parse={parse}
      enter={(field, value) => {
        const refused = enter(field, value)
        return refused === null ? null : blockedText(data, part, refused, field)
      }}
      checkHeld={checkBlocked === null ? null : blockedText(data, part, checkBlocked)}
      onCheck={onCheck}
      text={{ hint: BENCH_TEXT.hint, check: BENCH_TEXT.check, enter: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, changeNote: PAGE_TEXT.changeNote, ...VERDICT_TEXT }}
    />
  )
}
