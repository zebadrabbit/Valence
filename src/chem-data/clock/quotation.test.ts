import { describe, expect, it } from 'vitest'
import hazardManifest from '../../../docs/research/clock/sources/hazard-manifest.json'
import manifest from '../../../docs/research/clock/sources/MANIFEST.json'
import { clockData } from './data'
import { CLOCK_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, the relation under it, and what each
// paragraph says it rests on), the parts' notes, the notes on the rate law and on the rate constant, the working
// of the count, the names of the reactions, the rationales of the activation energy and of the model's
// parameters, and the manifest's own account of where each figure is. The pages are not kept, and neither is the
// fingerprint of them this compares against: see docs/research/clock/README.md, and
// ../titration/quotation.test.ts for how the check works and what it cannot say. Where the fingerprint is absent,
// as in CI, the cases that need it are skipped and the run says so. The bottles' hazard notes and the hazard
// manifest's rows were written apart from this lab's record and are not checked here. What a manifest row gives
// as printed (`prints`) is data and is left out, and so is an equation of the record. The sentences of the page
// are checked in src/app/lab/clock/messages.test.ts.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/clock/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = CLOCK_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const { rateLaw } = clockData
const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, equation }): [string, string][] => (equation === undefined ? [] : [[`${where}, relation`, equation]])),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...clockData.parts.flatMap((part) => part.notes.map((note, i): [string, string] => [`${part.id}, note ${i + 1}`, note.value])),
  ['the note on the rate law', rateLaw.note.value],
  ['the note on the rate constant', rateLaw.rateConstant.note],
  ['the rationale of the activation energy', rateLaw.activationEnergy.rationale],
  ['the working of the count', clockData.count.working],
  ...clockData.reactions.map((reaction): [string, string] => [`the name of the reaction ${reaction.id}`, reaction.name]),
  ...Object.entries(clockData.parameters).map(([key, parameter]): [string, string] => [`the rationale of ${key}`, parameter.rationale]),
]
const located: [string, string][] = manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where]))

describe('no quotation: what there is to check', () => {
  it("is the primer, the notes, the workings, the rationales and the manifest's rows", () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(100)
    expect(located.length).toBe(manifest.sources.reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(30)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it("has a fingerprint of every page the lab rests on that could be saved: all but the record of a research portal, which a script draws", () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(30000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds)])
    // The portal's record was read through a tool that fetches a page and answers questions about it; no copy of its words could be saved, so nothing can be compared with it.
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id)).sort()).toEqual(['barton-bromate-iodide-1976'])
    // The documents under the bottles' hazards are in it too, where the safety card says what they say.
    for (const sheet of hazardManifest.sources) if (paragraphs.some((p) => p.sourceIds.includes(sheet.id))) expect(fingerprint!.sources, sheet.id).toContain(sheet.id)
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
