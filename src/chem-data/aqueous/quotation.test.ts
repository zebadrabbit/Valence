import { describe, expect, it } from 'vitest'
import manifest from '../../../docs/research/phase-4/sources/MANIFEST.json'
import { aqueousData } from './data'
import { AQUEOUS_PRIMER } from './primer'

// No quotation: what this lab writes shares no run of six consecutive words with a page it rests on. That is the
// primer (what it shows, the label at the head of a paragraph included, and what each paragraph says it rests on),
// the stations' notes and hints, the two cautions, and the manifest's own account of where each figure is. The
// pages are not kept, and neither is the fingerprint of them this compares against: see
// docs/research/phase-4/sources/README.md, and ../titration/quotation.test.ts for how the check works and what it
// cannot say. Where the fingerprint is absent, as in CI, the cases that need it are skipped and the run says so.
// The reagents' hazard notes and the hazard manifest's rows are written apart from this lab's record and are not
// checked here. What a manifest row gives as printed (`prints`) is data and is left out.
type Lib = {
  QUOTED_RUN: number
  unpackHashes(base64: string): Set<number>
  quotedRuns(text: string, fingerprint: Set<number>): string[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/titration-lib.mjs', { eager: true }))
const { QUOTED_RUN, unpackHashes, quotedRuns } = lib!

type Fingerprint = { retrieved: string; runWords: number; sources: string[]; hashes: string }
const [fingerprint] = Object.values(import.meta.glob<Fingerprint>('../../../docs/research/phase-4/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
const pages = unpackHashes(fingerprint?.hashes ?? '')
const paragraphs = AQUEOUS_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i) => ({ where: `${s.id}[${i}]`, ...paragraph })))

/** What a support line says in this project's words: all of a "This lab:" line, and of a located passage what it establishes. */
const ownWords = (line: string) => (line.startsWith('This lab: ') ? line : (line.split('. It establishes that ')[1] ?? line))

const written: [string, string][] = [
  ...paragraphs.map(({ where, label, text }): [string, string] => [`${where}, shown`, label === undefined ? text : `${label}. ${text}`]),
  ...paragraphs.flatMap(({ where, support }) => support.split('\n').map((line, i): [string, string] => [`${where}, support line ${i + 1}`, ownWords(line)])),
  ...aqueousData.stations.flatMap((station) => [
    ...station.notes.map((note, i): [string, string] => [`${station.id}, note ${i + 1}`, note.value]),
    ...station.hints.map((hint, i): [string, string] => [`${station.id}, hint ${i + 1}`, hint]),
  ]),
  ['the caution on smelling a tube', aqueousData.cautions.sniffing.value],
  ['the caution on a hot tube', aqueousData.cautions.hotTube.value],
  ...Object.entries(aqueousData.constants).map(([key, constant]): [string, string] => [`the note on ${key}`, constant.note ?? '']),
]
const located: [string, string][] = manifest.sources.flatMap((s) => s.supports.map((row, i): [string, string] => [`${s.id}, row ${i + 1}`, row.where]))

describe('no quotation: what there is to check', () => {
  it('is the primer, the notes, the hints, the cautions and the manifest\'s rows', () => {
    expect(QUOTED_RUN).toBe(6)
    expect(written.length).toBeGreaterThan(150)
    expect(located.length).toBe(manifest.sources.reduce((n, s) => n + s.supports.length, 0))
    expect(located.length).toBeGreaterThan(65)
  })
})

describe.skipIf(fingerprint === undefined)('no quotation, against the fingerprint of the pages (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
  it('has a fingerprint of every page the lab rests on that has words to take: all but the scanned tables, which were read as images', () => {
    expect(fingerprint!.runWords).toBe(6)
    expect(pages.size).toBeGreaterThan(60000)
    const cited = new Set([...manifest.sources.map((s) => s.id), ...paragraphs.flatMap((p) => p.sourceIds), aqueousData.cautions.hotTube.sourceId, aqueousData.cautions.hotTube.alsoSourceId!])
    expect([...cited].filter((id) => !fingerprint!.sources.includes(id))).toEqual(['nbs-tables-1982'])
  })

  it.each(written)('%s repeats no run of six words of a page', (_where, text) => {
    expect(quotedRuns(text, pages)).toEqual([])
  })

  it.each(located)("the manifest's %s says where it is without repeating a run of six words of a page", (_row, where) => {
    expect(quotedRuns(where, pages)).toEqual([])
  })
})
