import { Card, Sources } from '@/app/explore/InspectorCard'
import { citations } from '@/chem-data/citations'
import { CATEGORY_HEADING, CATEGORY_NOTES, describeBlock, describeGroup, describePeriod, GROUP_3_NOTE, periodicTable, type Description } from '@/chem-data/periodic'
import sources from '@/chem-data/sources.json'
import { HIGHLIGHT_CHOICES, highlightKey, type Highlight } from './tableLayout'

// What a Sources control lists for authored sentences: each of their sources, under one label.
const entries = (covers: string, descriptions: readonly Description[]) => descriptions.flatMap((d) => d.sourceIds.map((id) => [covers, id] as const))

/** What the members of the highlighted group, period or block share (spec 6). A family has no description: its notes are under the legend's heading. */
export function HighlightDescription({ highlight }: { highlight: Highlight }) {
  if (!highlight || highlight.kind === 'category') return null
  const description = highlight.kind === 'group' ? describeGroup(highlight.value) : highlight.kind === 'period' ? describePeriod(highlight.value) : describeBlock(highlight.value)
  const heading = HIGHLIGHT_CHOICES.flatMap((set) => set.choices).find((choice) => highlightKey(choice.highlight) === highlightKey(highlight))?.label
  return (
    <Card heading={heading ?? ''}>
      <p className="max-w-[100ch]">{description.text}</p>
      <Sources citations={citations(entries('This description', [description]), sources)} derived="The members and the counts are worked out from this table." />
    </Card>
  )
}

/** The notes the page always carries: those on the families (spec 5.5) and the one on group 3 (spec 5.4). */
export function TableNotes() {
  return (
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] items-start gap-3">
      <Card heading={CATEGORY_HEADING}>
        <ul className="grid list-disc gap-1 pl-5">
          {CATEGORY_NOTES.map((note) => (
            <li key={note.text}>{note.text}</li>
          ))}
        </ul>
        <Sources
          citations={citations(
            [...periodicTable.map((element) => ['Names, symbols, atomic numbers and families', element.sourceId] as const), ...entries('These notes', CATEGORY_NOTES)],
            sources,
          )}
          derived="The family colours are a display choice, not data."
        />
      </Card>
      <Card heading="Note on group 3">
        <p>{GROUP_3_NOTE.text}</p>
        <Sources
          citations={citations(entries('This note', [GROUP_3_NOTE]), sources)}
          derived="Each element's group, period and block are worked out from its atomic number by the rule this note describes."
        />
      </Card>
    </div>
  )
}
