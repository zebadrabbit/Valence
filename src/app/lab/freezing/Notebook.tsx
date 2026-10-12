import { Worksheet } from '@/app/lab/Worksheet'
import type { FreezingData, PartId } from '@/chem-data/freezing/data'
import { kindOf, parseEntry, type Blocked, type EntryView, type Field, type Mode, type Value } from '@/engine/freezing'
import { BENCH_TEXT, PAGE_TEXT, VERDICT_TEXT, blockedText, enteredText, entryFeedback, entryText, fieldLabel, formatHelp, liquidChoices, relationText } from './messages'

export interface NotebookProps {
  data: FreezingData
  part: PartId
  mode: Mode
  /** The notebook's entries in the order they are worked out, each as the engine has it. */
  entries: readonly EntryView[]
  /** Makes the entry where the engine takes it, and hands back why not, in words, where it does not: null once it is made. */
  enter(field: Field, value: Value): string | null
  /** Why the notebook cannot be checked now, or null; and the check, which Challenge asks for and Guided makes at the last entry. */
  checkBlocked: Blocked | null
  onCheck(): void
}

/**
 * A part's notebook: the shell's (../Worksheet.tsx), which the calorimetry lab draws too, with this lab's entries,
 * its reading of what is typed and its words. The two temperatures wait for a look at the graph, and say so. The
 * liquid of part 2 is chosen from the three of the table; every other entry is typed.
 */
export function Notebook({ data, part, mode, entries, enter, checkBlocked, onCheck }: NotebookProps) {
  const closedBy = entries[0]!.blocked
  return (
    <Worksheet
      entries={entries.map(({ field, value, blocked, verdict }) => ({ field, value, held: blocked === null ? null : blockedText(part, blocked, field), verdict }))}
      guided={mode === 'guided'}
      closed={null}
      over={closedBy === 'run-over' || closedBy === 'lab-completed'}
      label={(field) => fieldLabel(part, field)}
      choices={(field) => (kindOf(field) === 'choice' ? liquidChoices(data) : null)}
      // A temperature may be below zero, and a fall may be typed with its sign.
      signed={(field) => kindOf(field) === 'temperature'}
      typedText={(field, value) => (typeof value === 'string' ? value : entryText(field, value))}
      enteredText={(field, value) => enteredText(data, field, value)}
      help={formatHelp}
      relation={(field) => relationText(data, part, field)}
      feedback={entryFeedback}
      invalid={(field) => blockedText(part, 'invalid-entry', field)}
      parse={parseEntry}
      enter={enter}
      checkHeld={checkBlocked === null ? null : blockedText(part, checkBlocked)}
      onCheck={onCheck}
      text={{ hint: BENCH_TEXT.hint, check: BENCH_TEXT.check, enter: PAGE_TEXT.enter, change: PAGE_TEXT.change, cancel: PAGE_TEXT.cancel, changeNote: PAGE_TEXT.changeNote, ...VERDICT_TEXT }}
    />
  )
}
