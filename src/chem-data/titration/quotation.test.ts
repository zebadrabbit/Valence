import { describe, expect, it } from 'vitest'
import fingerprint from '../../../docs/research/phase-3/sources/quotation-fingerprint.json'
import { titrationData } from './data'
import { TITRATION_PRIMER } from './primer'

// No quotation: the primer (what it shows, and what each paragraph says it rests on) and the three hazard notes
// share no run of six consecutive words with a page they rest on. The pages are not kept. What is kept is a
// fingerprint of them, the hash of every such run (scripts/fingerprint-sources.mjs), so this can say that a run
// is in one of the pages but not which page, and a sentence can only be put right by rewording it.
// A passage's location is left out: a heading or a title named there is the source's own name for the place.
type Lib = {
  QUOTED_RUN: number
  runHashes(text: string): number[]
  packHashes(hashes: number[]): string
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, runHashes, packHashes, unpackHashes, quotedRuns } = lib!

const pages = unpackHashes(fingerprint.hashes)
const paragraphs = TITRATION_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))
const bottles = Object.entries(titrationData.bottles)

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const written: [string, string][] = [
  ...paragraphs.map(({ where, text }): [string, string] => [`${where}, shown`, text]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...bottles.map(([key, bottle]): [string, string] => [`the note on the ${key} bottle`, bottle.hazards.note.value]),
]

describe('no quotation', () => {
  it('has a fingerprint of every page the primer and the hazard notes rest on, in runs of six words', () => {
    expect(fingerprint.runWords).toBe(6)
    expect(QUOTED_RUN).toBe(6)
    expect(pages.size).toBeGreaterThan(60000)
    const cited = new Set([...paragraphs.flatMap((p) => p.sourceIds), ...bottles.flatMap(([, bottle]) => [bottle.hazards.sourceId, bottle.hazards.note.sourceId])])
    expect([...cited].filter((id) => !fingerprint.sources.includes(id))).toEqual([])
  })

  it('finds a run of six words that is in a page, and not one of five', () => {
    const run = 'one two three four five six'
    const made = unpackHashes(packHashes(runHashes(`Before, ${run}; after.`)))
    expect(quotedRuns(`It says: One two, three four five SIX.`, made)).toEqual([run])
    expect(quotedRuns('one two three four five and six', made)).toEqual([])
    expect(quotedRuns('before one two three four five six after seven', made)).toEqual(['before one two three four five six after'])
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })
})
