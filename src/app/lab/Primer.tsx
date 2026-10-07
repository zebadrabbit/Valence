import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Disclosure, Note, Sources } from '@/app/explore/InspectorCard'
import { Button } from '@/components/ui/button'
import { citations, type Citation } from '@/chem-data/citations'
import type { Source } from '@/chem-data/schema'
import { termIndex, type PrimerParagraph, type PrimerSection } from '@/chem-data/titration/primer'
import { PRIMER_TEXT, UNSOURCED_TEXT } from './shellText'

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

export interface Piece {
  text: string
  /** A term the paragraph defines, where it first stands. */
  term: boolean
  /** Part of a sentence that states a rule of the simulation. */
  labRule: boolean
}

/**
 * A paragraph's text cut where its drawing changes, in order: joined, the pieces are the text, so the formatting
 * adds and drops nothing. A term or a sentence that is not found in the text is not drawn (a test holds each to being found).
 */
export function pieces({ text, terms = [], labRules = [] }: Pick<PrimerParagraph, 'text' | 'terms' | 'labRules'>): Piece[] {
  const spans = (found: [at: number, length: number][]) => found.filter(([at]) => at >= 0).map(([at, length]) => [at, at + length] as const)
  const termSpans = spans(terms.map((term) => [termIndex(text, term), term.length]))
  const ruleSpans = spans(labRules.map((sentence) => [text.indexOf(sentence), sentence.length]))
  const cuts = [...new Set([0, text.length, ...termSpans.flat(), ...ruleSpans.flat()])].sort((a, b) => a - b)
  const cut = cuts.slice(0, -1).map((start, i) => {
    const within = (among: (readonly [number, number])[]) => among.some(([from, to]) => from <= start && cuts[i + 1]! <= to)
    return { text: text.slice(start, cuts[i + 1]), term: within(termSpans), labRule: within(ruleSpans) }
  })
  // The space between two such sentences is set off with them, so that they are drawn as one run.
  return cut.map((piece, i) => (piece.text.trim() === '' && cut[i - 1]?.labRule && cut[i + 1]?.labRule ? { ...piece, labRule: true } : piece))
}

/** A paragraph's text as it is drawn: its terms bold, its sentences on the simulation's own rules behind a rule down their side. */
/** How a sentence that states a rule of the simulation alone is set off; the key under the topic list is drawn the same. */
const LAB_RULE = 'border-l-4 border-foreground/40 bg-muted/60 py-1 pr-2 pl-3'

function Formatted({ paragraph }: { paragraph: PrimerParagraph }) {
  const runs: Piece[][] = []
  for (const piece of pieces(paragraph)) {
    const run = runs.at(-1)
    if (run && run[0]!.labRule === piece.labRule) run.push(piece)
    else runs.push([piece])
  }
  return runs.map((run, i) => {
    const words = run.map((piece, j) =>
      piece.term ? (
        <strong key={j} className="font-semibold">
          <Subscripted text={piece.text} />
        </strong>
      ) : (
        <Subscripted key={j} text={piece.text} />
      ),
    )
    // A block inside the paragraph, which stays one paragraph: no word is added, and the sentence names the lab itself.
    return run[0]!.labRule ? (
      <span key={i} className={`my-1.5 block ${LAB_RULE}`}>
        {words}
      </span>
    ) : (
      words
    )
  })
}

/**
 * A lab's concept primer, one topic at a time: the list of topics (beside the card where the primer is wide enough,
 * behind a button above it where it is not; lab.css decides), the card with its place, its sources and the way to
 * the topics either side, and under it, when given `modelCitations`, the sources of the constants the lab's model
 * runs on, which no card shows. `readFirst` holds the ids of the topics marked "Read first". `opensAt` is the topic
 * shown when the primer mounts, the first unless told: the markup tests draw the other eleven with it.
 *
 * At the first topic there is no Previous and at the last no Next. Changing topic moves focus to the card's
 * heading, which also brings it into view.
 */
export function Primer({
  sections,
  sources,
  readFirst = [],
  opensAt = 0,
  modelCitations,
}: {
  sections: readonly PrimerSection[]
  sources: readonly Source[]
  readFirst?: readonly string[]
  opensAt?: number
  modelCitations?: readonly Citation[] | undefined
}) {
  const [index, setIndex] = useState(opensAt)
  // The list of topics, where it is behind its button.
  const [listed, setListed] = useState(false)
  const headingId = useId()
  const placeId = useId()
  const listId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef(index)
  useEffect(() => {
    if (shown.current !== index) headingRef.current?.focus()
    shown.current = index
  }, [index])

  const section = sections[index]!
  const previous = sections[index - 1]
  const next = sections[index + 1]
  const go = (to: number) => {
    setIndex(to)
    setListed(false)
    // The topic already shown: its heading takes focus all the same, as the list is closed under it.
    if (to === index) headingRef.current?.focus()
  }
  const first = (id: string) => readFirst.includes(id)

  return (
    <div className="primer">
      <div className="primer-layout">
        <nav
          aria-label={PRIMER_TEXT.topics}
          className="primer-menu text-sm"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && listed) setListed(false)
          }}
        >
          <Button variant="outline" className="primer-topics-button" aria-expanded={listed} aria-controls={listId} onClick={() => setListed(!listed)}>
            {PRIMER_TEXT.topics}
            {listed ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
          <ol id={listId} className={`primer-topics ${listed ? 'primer-topics-listed' : ''} gap-0.5`}>
            {sections.map(({ id, heading }, i) => (
              <li key={id}>
                <button
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => go(i)}
                  className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] gap-1 rounded-md border-l-4 border-transparent px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
                >
                  <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
                  <span>
                    {heading}
                    {first(id) && <span className="block text-xs font-normal text-muted-foreground">{PRIMER_TEXT.readFirst}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {/* The key to the set-off sentences, drawn as one of them. */}
          <p className={`mt-3 text-xs text-muted-foreground ${LAB_RULE}`}>{PRIMER_TEXT.ruleKey}</p>
        </nav>
        <div className="grid min-w-0 content-start gap-3">
          {/* A card of its own for each topic, so that the Sources of one are not left open over the next. */}
          <section key={section.id} aria-labelledby={headingId} className="grid min-w-0 gap-3 rounded-lg border bg-card p-4 text-sm">
            <div className="grid gap-1">
              <p id={placeId} className="text-xs text-muted-foreground">
                {PRIMER_TEXT.place(index + 1, sections.length)}
                {first(section.id) && (
                  <>
                    {' · '}
                    <span className="font-medium text-foreground">{PRIMER_TEXT.readFirst}</span>
                  </>
                )}
              </p>
              <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {section.heading}
              </h2>
            </div>
            {section.paragraphs.map((paragraph) => (
              <div key={paragraph.text} className="grid gap-1">
                <p className="max-w-[75ch] leading-relaxed">
                  {paragraph.label && (
                    <>
                      <strong className="font-semibold">{paragraph.label}.</strong>{' '}
                    </>
                  )}
                  <Formatted paragraph={paragraph} />
                </p>
                {paragraph.equation && (
                  <p className="pl-4 font-medium">
                    <Subscripted text={paragraph.equation} />
                  </p>
                )}
              </div>
            ))}
            <Sources citations={citations(section.paragraphs.flatMap((paragraph) => paragraph.sourceIds.map((id) => ['This card', id] as const)), sources)} derived={UNSOURCED_TEXT.primer} />
          </section>
          <div className="flex flex-wrap justify-between gap-2">
            {previous && (
              <Button variant="outline" className="h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(index - 1)}>
                <span aria-hidden="true">←</span> {PRIMER_TEXT.previous(previous.heading)}
              </Button>
            )}
            {next && (
              <Button variant="outline" className="ml-auto h-auto min-h-9 max-w-full py-1.5 text-left whitespace-normal" onClick={() => go(index + 1)}>
                {PRIMER_TEXT.next(next.heading)} <span aria-hidden="true">→</span>
              </Button>
            )}
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
        </div>
      </div>
    </div>
  )
}
