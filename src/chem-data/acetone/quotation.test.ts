import { describe, expect, it } from 'vitest'
import ownHazards from '../../../docs/research/acetone/hazards.json'
import hazardManifest from '../../../docs/research/acetone/sources/hazard-manifest.json'
import manifest from '../../../docs/research/acetone/sources/MANIFEST.json'
import { acetoneData } from './data'
import { ACETONE_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, the relation under it, and what each
// paragraph says it rests on), the parts' notes, the notes on the rate law, on the rate constant and on the
// activation energy, the name of the reaction, the rationales of the model's parameters, the manifest's own
// account of where each figure is, and, of the two bottles whose hazards are this lab's own, the heading and the
// note of each tile. The pages are not kept, and neither is the fingerprint of them this compares against: see
// docs/research/acetone/README.md, and ../titration/quotation.test.ts for how the check works and what it cannot
// say. Where the fingerprint is absent, as in CI, the cases that need it are skipped and the run says so. What a
// manifest row gives as printed (`prints`) is data and is left out, and so are an equation of the record and a
// hazard statement, which is a sheet's own line under its code. The hazard manifest's rows were written apart and
// are not checked here. The sentences of the page are checked in src/app/lab/acetone/messages.test.ts.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/acetone/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = ACETONE_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const { rateLaw } = acetoneData
const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, equation }): [string, string][] => (equation === undefined ? [] : [[`${where}, relation`, equation]])),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...acetoneData.parts.flatMap((part) => part.notes.map((note, i): [string, string] => [`${part.id}, note ${i + 1}`, note.value])),
  ['the note on the rate law', rateLaw.note.value],
  ['the note on the rate constant', rateLaw.rateConstant.note],
  ['the note on the activation energy', rateLaw.activationEnergy.note],
  ['the name of the reaction', acetoneData.reaction.name],
  ...Object.entries(acetoneData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
  ...Object.entries(ownHazards).flatMap(([id, entry]): [string, string][] => [[`the heading of the tile of ${id}`, entry.classifiedAs], [`the note of the tile of ${id}`, entry.hazards.note.value]]),
]
const located: [string, string][] = manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where]))

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the rationales, the two tiles' notes and the manifest's rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(90)
    expect(located.length).toBe(manifest.sources.reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(25)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page the lab rests on', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(30000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds)])
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id))).toEqual([])
    // Every document of the hazard manifest is in it too, whether or not the safety card says what it says.
    for (const sheet of hazardManifest.sources) expect(fingerprint!.sources, sheet.id).toContain(sheet.id)
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })

  it("finds a run in a hazard statement only where it is the standard phrase of the statement's code, which is a sheet's own line and is left as printed", () => {
    const statements = Object.values(ownHazards).flatMap((entry) => entry.hazards.statements)
    expect(statements.filter((statement) => quotedRuns(statement, pages).length > 0)).toEqual(['H312+H332: Harmful if inhaled or in contact with skin'])
  })
})
