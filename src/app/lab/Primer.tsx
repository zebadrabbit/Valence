import { Card, Disclosure, Note, Sources } from '@/app/explore/InspectorCard'
import { citations, type Citation } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import type { PrimerSection } from '@/chem-data/titration/primer'
import { SHELL_TEXT, UNSOURCED_TEXT } from './shellText'

/** "M_NaOH" as M, then NaOH to go below the line: an underscore, then the subscript's letters. */
export function subscriptParts(text: string): { text: string; sub: boolean }[] {
  return text
    .split(/_([A-Za-z]+)/)
    .map((part, i) => ({ text: part, sub: i % 2 === 1 }))
    .filter((part) => part.text !== '')
}

export function Subscripted({ text }: { text: string }) {
  return subscriptParts(text).map((part, i) => (part.sub ? <sub key={i}>{part.text}</sub> : part.text))
}

/**
 * A lab's concept primer: one disclosure holding a card for each section, each with its sources. `modelCitations`
 * adds, at the foot, the sources of the constants the lab's model runs on, which no card shows.
 */
export function Primer({ sections, sources, open, modelCitations }: { sections: readonly PrimerSection[]; sources: readonly Source[]; open: boolean; modelCitations?: readonly Citation[] | undefined }) {
  return (
    <Disclosure summary={SHELL_TEXT.primer} open={open}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26rem),1fr))] items-start gap-3">
        {sections.map((section) => (
          <Card key={section.id} heading={section.heading}>
            {section.paragraphs.map((paragraph) => (
              <div key={paragraph.text} className="grid gap-1">
                <p className="max-w-[75ch]">
                  <Subscripted text={paragraph.text} />
                </p>
                {paragraph.equation && (
                  <p className="pl-4 font-medium">
                    <Subscripted text={paragraph.equation} />
                  </p>
                )}
              </div>
            ))}
            <Sources citations={citations(section.paragraphs.flatMap((paragraph) => paragraph.sourceIds.map((id) => ['This card', id] as const)), sources)} derived={UNSOURCED_TEXT.primer} />
          </Card>
        ))}
      </div>
      {modelCitations && (
        // ponytail: the list is a copy of the one in Sources, whose summary is always "Sources" and which is taken
        // as it is. A third list of this kind is the time to give Sources a summary of its own.
        <Disclosure summary="Sources for this lab's model">
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 text-xs wrap-anywhere">
            {modelCitations.map(({ source, covers }) => (
              <li key={source.id}>
                <span className="font-medium">{covers.join(', ')}: </span>
                <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                  {source.citation}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
          <Note>{UNSOURCED_TEXT.model}</Note>
        </Disclosure>
      )}
    </Disclosure>
  )
}
