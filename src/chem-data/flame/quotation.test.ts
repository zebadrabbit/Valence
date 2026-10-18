import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/flame/sources/hazard-manifest.json'
import manifest from '../../../docs/research/flame/sources/MANIFEST.json'
import { flameData } from './data'
import { FLAME_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests on),
// the stations' notes and what they say the strip leaves out, the rationales of the model's parameters, and the
// manifest's own account of where each figure is. The pages are not kept, and neither is the fingerprint of them
// this compares against: see docs/research/flame/README.md, and ../titration/quotation.test.ts for how the check
// works and what it cannot say. Where the fingerprint is absent, as in CI, the cases that need it are skipped and
// the run says so. The bottles' hazard notes, the headings over their statements and the hazard manifest's rows
// have been checked here too since 2026-10-18. What a manifest row gives as printed (`prints`) is data and is left out.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/flame/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = FLAME_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...flameData.salts.flatMap((salt) => [
    ...salt.notes.map((note, i): [string, string] => [`${salt.id}, note ${i + 1}`, note.value]),
    ...salt.leftOut.map((left, i): [string, string] => [`${salt.id}, left out ${i + 1}`, left.value]),
  ]),
  ...Object.entries(flameData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
  ...flameData.salts.flatMap((salt): [string, string][] => [[`${salt.id}, the heading over its statements`, salt.classifiedAs], [`${salt.id}, its hazard note`, salt.hazards.note.value]]),
]
const located: [string, string][] = [
  ...manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where])),
  ...hazardManifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`hazards: ${s.id}, row ${i + 1}`, row.where])),
]

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, what the strip leaves out, the rationales, the hazard notes and the two manifests' rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(100)
    expect(located.length).toBe([...manifest.sources, ...hazardManifest.sources].reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(70)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page the lab rests on that has words to take: all but the saved tables of numbers', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(60000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds), ...flameData.salts.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])])])
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id)).sort()).toEqual(['nist-asd-lines-k-700-780', 'nist-asd-lines-neutral'])
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
