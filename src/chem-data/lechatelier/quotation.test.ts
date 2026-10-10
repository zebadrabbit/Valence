import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/lechatelier/sources/hazard-manifest.json'
import manifest from '../../../docs/research/lechatelier/sources/MANIFEST.json'
import { lechatelierData } from './data'
import { LECHATELIER_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests
// on), the disturbances' notes, the rules, the names of the two sides of each equilibrium, the notes on the
// solubility of lead chloride and on the indicator, the working of each worked-out value, the rationales of the
// model's parameters, and the manifest's own account of where each figure is. The pages are not kept, and neither
// is the fingerprint of them this compares against: see docs/research/lechatelier/README.md, and
// ../titration/quotation.test.ts for how the check works and what it cannot say. Where the fingerprint is absent,
// as in CI, the cases that need it are skipped and the run says so. The bottles' hazard notes and the hazard
// manifest's rows were written apart from this lab's record and are not checked here. What a manifest row gives
// as printed (`prints`) is data and is left out, and so is an equation. The sentences of the page are checked in
// src/app/lab/lechatelier/messages.test.ts.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/lechatelier/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = LECHATELIER_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const { leadChloride, indicator } = lechatelierData
const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...lechatelierData.systems.flatMap((system) => system.disturbances.flatMap((disturbance) => disturbance.notes.map((note, i): [string, string] => [`${disturbance.id}, note ${i + 1}`, note.value]))),
  ...lechatelierData.rules.map((rule): [string, string] => [`the rule ${rule.id}`, rule.says]),
  ...lechatelierData.equilibria.flatMap((e): [string, string][] => [[`${e.id}, its left side`, e.left], [`${e.id}, its right side`, e.right]]),
  ['the note on the solubility of lead chloride', leadChloride.note.value],
  ['the note on the indicator', indicator.note.value],
  ...[leadChloride.molarMass, leadChloride.saturationCold, leadChloride.saturationHot].map((worked, i): [string, string] => [`lead chloride, working ${i + 1}`, worked.working]),
  ...lechatelierData.equilibriumConstants.flatMap((c): [string, string][] => [[`${c.id}, the working of its Gibbs energy`, c.gibbs.working], [`${c.id}, the working of its constant`, c.constant.working]]),
  ...lechatelierData.heats.map((h): [string, string] => [`${h.id}, its working`, h.enthalpy.working]),
  ...Object.entries(lechatelierData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
]
const located: [string, string][] = manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where]))

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the rules, the workings, the rationales and the manifest's rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(150)
    expect(located.length).toBe(manifest.sources.reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(50)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page the lab rests on that has words to take: all but the scanned tables and the table of atomic weights', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(30000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds)])
    // The scanned tables have no text layer, and the atomic weights are a table of figures kept for the periodic table.
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id)).sort()).toEqual(['ciaaw-abridged-2024', 'nbs-tables-1982'])
    // The documents under the bottles' hazards are in it too, where the safety card or a note says what they say.
    for (const sheet of hazardManifest.sources) if (paragraphs.some((p) => p.sourceIds.includes(sheet.id))) expect(fingerprint!.sources, sheet.id).toContain(sheet.id)
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
