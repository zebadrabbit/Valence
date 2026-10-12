import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/cabbage/sources/hazard-manifest.json'
import manifest from '../../../docs/research/cabbage/sources/MANIFEST.json'
import { cabbageData } from './data'
import { CABBAGE_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests on),
// the notes of the things and of the parts, the note on the indicator, the shared note, what each bottle holds, the
// bottles' hazard notes, the working of each pH that is worked out, every rationale, and the two manifests' own
// accounts of where each figure is. The pages are not kept, and neither is the fingerprint of them this compares
// against: see docs/research/cabbage/README.md, and ../titration/quotation.test.ts for how the check works and what
// it cannot say. Where the fingerprint is absent, as in CI, the cases that need it are skipped and the run says so.
// What a manifest row gives as printed (`prints`) is data and is left out. The sentences of the page are checked in
// src/app/lab/cabbage/messages.test.ts.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/cabbage/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = CABBAGE_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...cabbageData.things.flatMap((thing): [string, string][] => [
    [`${thing.id}, its note`, thing.note.value],
    [`${thing.id}, what it looks like`, thing.before.rationale],
    ...(thing.ph.basis === 'arithmetic' ? ([[`${thing.id}, working 1`, thing.ph.low.working], [`${thing.id}, working 2`, thing.ph.high.working]] as [string, string][]) : ([[`${thing.id}, what its figure is for`, thing.ph.givenFor]] as [string, string][])),
  ]),
  ...cabbageData.parts.flatMap((part) => part.notes.map((note, i): [string, string] => [`${part.id}, note ${i + 1}`, note.value])),
  ['the note on the indicator', cabbageData.indicator.note.value],
  ['the shared note', cabbageData.sharedNote.value],
  ['the shared note, its rationale', cabbageData.sharedNote.rationale],
  ...cabbageData.reagents.flatMap((reagent): [string, string][] => [[`${reagent.id}, what it holds`, reagent.holds], [`${reagent.id}, the heading over its statements`, reagent.classifiedAs], [`${reagent.id}, its hazard note`, reagent.hazards.note.value]]),
  ...Object.entries(cabbageData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
]
const located: [string, string][] = [
  ...manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where])),
  ...hazardManifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`hazards: ${s.id}, row ${i + 1}`, row.where])),
]

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the workings, the rationales and the two manifests' rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(110)
    expect(located.length).toBe([...manifest.sources, ...hazardManifest.sources].reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(100)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page and sheet the lab rests on', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(30000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...hazardManifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds)])
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id))).toEqual([])
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
