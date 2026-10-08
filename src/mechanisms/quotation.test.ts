import { describe, expect, it } from 'vitest'
import manifest from '../../docs/research/phase-5/sources/MANIFEST.json'
import { hclNahco3 as mechanism } from './data'
import type { Step } from './schema'
import { energyLines, energyPanelNotes, stepNotes } from './wording'

// No quotation: what the mechanism timeline writes shares no run of six consecutive words with a page it rests
// on. That is every sentence of its record a learner can read (titles, explanations, notes, questions, answers
// and feedback, the energy panel's note, the notes and rationales stored with its values), what the wording module
// makes of the record, and the manifest's own account of where each figure is. The pages are not kept, and
// neither is the fingerprint of them this compares against: see docs/research/phase-5/sources/README.md, and
// src/chem-data/titration/quotation.test.ts for how the check works and what it cannot say. Where the fingerprint
// is absent, as in CI, the cases that need it are skipped and the run says so. What a manifest row gives as
// printed (`prints`) is data and is left out.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../docs/research/phase-5/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')

const steps = mechanism.chapters.filter((c): c is Step => c.kind === 'step')
const { thermo } = mechanism
const written: [string, string][] = [
  ...mechanism.chapters.flatMap((c): [string, string][] => [
    [`${c.id}, as shown at the first depth`, `${c.title}. ${c.explanation.intro}`],
    [`${c.id}, as shown at the second depth`, `${c.explanation.intro} ${c.explanation.expanded}`],
    ...(c.timescale && 'rationale' in c.timescale ? [[`${c.id}, why its timescale has no source`, c.timescale.rationale] as [string, string]] : []),
  ]),
  ...steps.flatMap((s): [string, string][] => [
    ...stepNotes(mechanism, s.id).map((note, i): [string, string] => [`${s.id}, note ${i + 1}`, note]),
    ...energyLines(mechanism, s.id).map((line): [string, string] => [`${s.id}, how its ${line.quantity} was obtained`, `${line.text}. ${line.method}`]),
    [`${s.id}, its question`, s.question!.prompt],
    ...s.question!.options.flatMap((o): [string, string][] => [
      [`${s.id}, answer "${o.id}"`, o.text],
      [`${s.id}, feedback on "${o.id}"`, o.feedback],
    ]),
  ]),
  ...energyPanelNotes(mechanism).map((note, i): [string, string] => [`the energy panel's note ${i + 1}`, note]),
  ...thermo.formation.flatMap((f): [string, string][] => (f.note ? [[`the note on ${f.id}`, f.note.value]] : [])),
  ['the note on the acid constant', thermo.carbonicAcid.pKa.note],
  ['the note on the lifetime', thermo.carbonicAcid.lifetime.note],
  ['the note on the rate of the proton', thermo.protonTransfer.onContactRate.note],
  ...Object.entries(thermo.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
]
const located: [string, string][] = manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where]))

describe('no quotation: what there is to check', () => {
  it("is every sentence of the record, what the wording module makes of it, and the manifest's rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(70)
    expect(written.every(([, text]) => text.trim() !== '')).toBe(true)
    expect(located.length).toBe(manifest.sources.reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(20)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every source that has words to take: all but the scanned tables, which were read as images; and of the two abstracts read as checks', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(10000)
    expect(manifest.sources.map((s) => s.id).filter((id) => !fingerprint!.sources.includes(id))).toEqual(['nbs-tables-1982'])
    expect(fingerprint!.sources).toEqual(['adamczyk-2009', 'aminov-2019', 'nist-codata-2022', 'pines-2016'])
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
