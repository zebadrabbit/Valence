import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/freezing/sources/hazard-manifest.json'
import manifest from '../../../docs/research/freezing/sources/MANIFEST.json'
import { freezingData } from './data'
import { FREEZING_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests on),
// the notes of the parts, the note stored with the freezing point constant, the working of each molar mass and
// of each measured freezing point, the note on each count of particles, the heading and the note of each
// reagent's hazards, every rationale, and the two manifests' own accounts of where each figure is. The pages are not kept, and neither is the fingerprint
// of them this compares against: see docs/research/freezing/README.md, and ../titration/quotation.test.ts for how
// the check works and what it cannot say. Where the fingerprint is absent, as in CI, the cases that need it are
// skipped and the run says so. What a manifest row gives as printed (`prints`) is data and is left out. The
// sentences of the page are checked in src/app/lab/freezing/messages.test.ts.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/freezing/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = FREEZING_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...freezingData.parts.flatMap((part) => part.notes.map((note, i): [string, string] => [`${part.id}, note ${i + 1}`, note.value])),
  ['the note on the freezing point constant', freezingData.water.freezingPointConstant.note],
  ...freezingData.reagents.flatMap((reagent): [string, string][] => [
    [`${reagent.id}, the working of its molar mass`, reagent.molarMass.working],
    [`${reagent.id}, the note on its particles`, reagent.particles.note],
    [`${reagent.id}, the heading over its statements`, reagent.classifiedAs],
    [`${reagent.id}, its hazard note`, reagent.hazards.note.value],
  ]),
  ...freezingData.measured.map((row): [string, string] => [`${row.id}, its working`, row.working]),
  ...Object.entries(freezingData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
  ['what the manifest is', manifest.about],
]
const located: [string, string][] = [
  ...manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where])),
  ...hazardManifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`hazards: ${s.id}, row ${i + 1}`, row.where])),
]

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the workings, the rationales and the two manifests' rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(100)
    expect(located.length).toBe([...manifest.sources, ...hazardManifest.sources].reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(100)
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

  it.each(located)('%s says where a figure is without repeating six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })
})
