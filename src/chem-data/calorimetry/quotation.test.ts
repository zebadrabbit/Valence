import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/calorimetry/sources/hazard-manifest.json'
import manifest from '../../../docs/research/calorimetry/sources/MANIFEST.json'
import { calorimetryData } from './data'
import { CALORIMETRY_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests
// on), the parts' notes, the notes on the enthalpies and on the water, the working of each worked-out value, the
// rationales of the model's parameters, and the manifest's own account of where each figure is. The pages are not
// kept, and neither is the fingerprint of them this compares against: see docs/research/calorimetry/README.md,
// and ../titration/quotation.test.ts for how the check works and what it cannot say. Where the fingerprint is
// absent, as in CI, the cases that need it are skipped and the run says so. Since 2026-10-18 the reagents' hazard
// notes, the headings over their statements and this lab's hazard manifest's rows are checked too: the notes of
// the two bottles the aqueous reactions lab's records stand for are held to this lab's fingerprint as well as to
// that lab's test. What a manifest row gives as printed (`prints`) is data and is left out.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/calorimetry/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = CALORIMETRY_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const [neutralisation, dissolving] = calorimetryData.parts
const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, equation }): [string, string][] => (equation === undefined ? [] : [[`${where}, relation`, equation]])),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...calorimetryData.parts.flatMap((part) => part.notes.map((note, i): [string, string] => [`${part.id}, note ${i + 1}`, note.value])),
  ...[neutralisation, dissolving].map((part): [string, string] => [`${part.id}, the note on its enthalpy`, part.enthalpy.note.value]),
  ['the note on the specific heat of water', calorimetryData.water.specificHeat.note],
  ['the note on the density of water', calorimetryData.water.density.note],
  ...calorimetryData.reagents.flatMap((r): [string, string][] => (r.form === 'metal' ? [[`${r.id}, the working of its specific heat`, r.specificHeat.working]] : [])),
  ...Object.entries(calorimetryData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
  ...calorimetryData.reagents.flatMap((r): [string, string][] => [[`${r.id}, the heading over its statements`, r.classifiedAs], [`${r.id}, its hazard note`, r.hazards.note.value]]),
]
const located: [string, string][] = [
  ...manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where])),
  ...hazardManifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`hazards: ${s.id}, row ${i + 1}`, row.where])),
]

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the workings, the rationales, the hazard notes and the two manifests' rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(160)
    expect(located.length).toBe([...manifest.sources, ...hazardManifest.sources].reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(45)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page the lab rests on that has words to take: all but the tables of figures', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(30000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds)])
    // The scanned tables have no text layer, and the other two are tables of figures kept by other labs.
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id)).sort()).toEqual(['ciaaw-abridged-2024', 'nbs-tables-1982', 'pubchem-aqueous-reagents'])
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
