import sources from './sources.json'
import { located } from './support'

// What a lab's concept primer is made of, and how it is drawn: shared by the labs' primers
// (titration/primer.ts, aqueous/primer.ts) and by the page that shows one.

/**
 * A paragraph: the text shown, an equation shown under it, its sources, and what it rests on (kept for review, not shown).
 * The other three are how the text is drawn, so that a topic is quick to find; none of them adds a word to it.
 */
export interface PrimerParagraph {
  text: string
  /** One to four words, drawn bold at the head of the paragraph: what it is about. It makes no claim and names no hidden value. */
  label?: string
  /** The terms this paragraph defines, each drawn bold where it first stands in the text. A term is listed once in the whole primer. */
  terms?: string[]
  /** Whole sentences of the text that state a rule of this simulation and not of a real bench, each saying so itself: set off, with nothing added. */
  labRules?: string[]
  equation?: string
  sourceIds: string[]
  support: string
}
/** How a paragraph's text is drawn. */
export type Format = Pick<PrimerParagraph, 'label' | 'terms' | 'labRules'>
export interface PrimerSection {
  id: string
  heading: string
  paragraphs: PrimerParagraph[]
}

/** A passage a paragraph rests on: its source, where it is there, and what it establishes (see `located`). */
export type Passage = readonly [sourceId: string, where: string, establishes: string]

function url(id: string): string {
  const source = sources.find((s) => s.id === id)
  if (!source) throw new Error(`the primer cites an unknown source "${id}"`)
  return source.url
}

/** `own` says what in the paragraph is this lab's own and is read in no source; it completes "This lab:". */
export function paragraph(format: Format, text: string, passages: readonly Passage[], own?: string, equation?: string): PrimerParagraph {
  return {
    text,
    ...format,
    ...(equation ? { equation } : {}),
    sourceIds: [...new Set(passages.map(([id]) => id))],
    support: [...passages.map(([id, where, establishes]) => `${id}: ${located(url(id), where, establishes)}`), ...(own ? [`This lab: ${own}`] : [])].join('\n'),
  }
}

/**
 * Where `term` first stands in `text` as a word of its own, or -1: "mole" is not found in "moles" or "molecule".
 * The page draws a term bold there, and a test holds every stored term to being found.
 * ponytail: the term goes into the pattern as it is, unescaped. A term is letters, spaces and hyphens, which the
 * same test holds; a term with any other character is the time to escape it.
 */
export function termIndex(text: string, term: string): number {
  return text.search(new RegExp(`(?<![\\p{L}\\p{N}-])${term}(?![\\p{L}\\p{N}-])`, 'u'))
}

/**
 * The cards to read before the bench, in the order the primer's first paragraph names them by their headings.
 * Taken from that paragraph, so the "Read first" mark on a card cannot disagree with it.
 */
export function readFirstOf(sections: readonly PrimerSection[]): readonly string[] {
  const first = sections[0]!.paragraphs[0]!.text
  return sections
    .filter((section) => first.includes(section.heading))
    .sort((a, b) => first.indexOf(a.heading) - first.indexOf(b.heading))
    .map((section) => section.id)
}
