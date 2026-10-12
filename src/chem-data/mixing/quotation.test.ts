import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/mixing/sources/hazard-manifest.json'
import manifest from '../../../docs/research/mixing/sources/MANIFEST.json'
import { mixingData } from './data'
import { MIXING_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests on),
// the notes of the tubes and of the parts, part 3's questions, the reason under every outcome, family and answer,
// the note beside each density, what each thing holds, the rubbing alcohol's hazard note, why each thing left off
// the bench is left off, every rationale, and the two manifests' own accounts of where each figure is. The pages
// are not kept, and neither is the fingerprint of them this compares against: see docs/research/mixing/README.md,
// and ../titration/quotation.test.ts for how the check works and what it cannot say. Where the fingerprint is
// absent, as in CI, the cases that need it are skipped and the run says so. What a manifest row gives as printed
// (`prints`) is data and is left out. The shared note is the red cabbage pH lab's and rests on no page. The
// sentences of the page are checked in src/app/lab/mixing/messages.test.ts.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/mixing/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = MIXING_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...mixingData.liquids.flatMap((liquid): [string, string][] => [
    [`${liquid.id}, what it holds`, liquid.holds],
    [`${liquid.id}, the note beside its density`, liquid.density.note],
    [`${liquid.id}, why it sorts as it does`, liquid.family.reason],
    ...(liquid.strength ? ([[`${liquid.id}, its strength`, liquid.strength.value]] as [string, string][]) : []),
    ...('rationale' in liquid.looks ? ([[`${liquid.id}, what it looks like`, liquid.looks.rationale]] as [string, string][]) : []),
  ]),
  ...mixingData.pairs.flatMap((pair): [string, string][] => [[`${pair.id}, its note`, pair.note.value], [`${pair.id}, what its outcome rests on`, pair.mix.reason]]),
  ...mixingData.solidInLiquid.flatMap((tube): [string, string][] => [[`${tube.id}, its note`, tube.note.value], [`${tube.id}, what its outcome rests on`, tube.dissolves.reason]]),
  ...mixingData.offBench.map((left): [string, string] => [`${left.id}, why it is left off the bench`, left.rationale]),
  ...mixingData.rule.questions.flatMap((question): [string, string][] => [[`${question.id}, the question`, question.asks], [`${question.id}, what its answer rests on`, question.answer.reason]]),
  ...mixingData.parts.flatMap((part) => part.notes.map((note, i): [string, string] => [`${part.id}, note ${i + 1}`, note.value])),
  ['the shared note, its rationale', mixingData.sharedNote.rationale],
  ...mixingData.reagents.flatMap((reagent): [string, string][] => [[`${reagent.id}, what it holds`, reagent.holds], [`${reagent.id}, the heading over its statements`, reagent.classifiedAs], [`${reagent.id}, its hazard note`, reagent.hazards.note.value]]),
  ...Object.entries(mixingData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
]
const located: [string, string][] = [
  ...manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where])),
  ...hazardManifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`hazards: ${s.id}, row ${i + 1}`, row.where])),
]

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the questions, the reasons, the rationales and the two manifests' rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(110)
    expect(located.length).toBe([...manifest.sources, ...hazardManifest.sources].reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(50)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page and sheet the lab rests on', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(20000)
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
