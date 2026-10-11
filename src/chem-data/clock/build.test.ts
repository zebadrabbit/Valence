import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/clock/clock.json'
import hazards from '../../../docs/research/clock/hazards.json'
import hazardManifest from '../../../docs/research/clock/sources/hazard-manifest.json'
import manifest from '../../../docs/research/clock/sources/MANIFEST.json'
import allSources from '../sources.json'
import stored from './clock.json'

// The checks scripts/build-chem-data.mjs runs on the clock reaction lab's record: against its manifest of
// sources; on its own chemistry, which is that its two reactions balance and give the stored count, that its
// mixtures are those of spec 19.1 and keep the reactants apart, that what a run uses up is as small as its notes
// say, and that its rate record holds together (scripts/clock-lib.mjs); and, for the bottles' hazards, whose
// documents are not kept, against the hazard manifest's account of each. They are tested here on the real inputs
// and on inputs they must refuse. The checks of the manifests and the merge are the aqueous lab's
// (scripts/aqueous-lib.mjs), which that lab's tests cover on its own inputs; what is tested here is that they hold
// this record, and what this lab added to them.
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; fetchedSha256?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Note = { value: string; sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }
type Entry = { classifiedAs: string; hazards: { signalWord: string; statements: string[]; note: Note; sourceId: string } }
type Listed = { id: string; url: string; citation: string }
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, Entry>, sheets: Sheet[]): { id: string; classifiedAs: string; hazards: Entry['hazards'] }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type OwnLib = {
  checkReactions(record: unknown): void
  checkMixtures(record: unknown, millilitres?: number): void
  checkUsedUp(record: unknown, limitPercent?: number): { id: string; bromate: number; 'hydrogen-ion': number }[]
  checkRateRecord(record: unknown): void
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/clock-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { checkReactions, checkMixtures, checkUsedUp, checkRateRecord } = ownLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const sheets: Sheet[] = hazardManifest.sources
type Input = typeof input
const edited = (edit: (record: Input) => void) => {
  const record = copy(input)
  edit(record)
  return record
}

describe('checkReactions', () => {
  it('accepts the record as authored', () => {
    expect(() => checkReactions(input)).not.toThrow()
  })

  it('refuses a reaction that does not balance, in atoms or in charge', () => {
    expect(() => checkReactions(edited((r) => void (r.reactions[0]!.reactants[0]!.coefficient = 5)))).toThrow(/reactions\[slow\]: 5 of I on the left and 6 on the right/)
    expect(() => checkReactions(edited((r) => void (r.reactions[0]!.products[2]!.coefficient = 2)))).toThrow(/reactions\[slow\]: 3 of O on the left and 2 on the right/)
    expect(() => checkReactions(edited((r) => void (r.reactions[1]!.products[1]!.charge = -4)))).toThrow(/reactions\[clock\]: a charge of -4 on the left and -6 on the right/)
  })

  it('refuses a count that is not what the two reactions give, in the count, in what a rate divides by, or in the working', () => {
    expect(() => checkReactions(edited((r) => void (r.count.value = 3)))).toThrow(/count: 3 is not the 3 × 2 = 6 that the two reactions give/)
    expect(() => checkReactions(edited((r) => void (r.rateLaw.end.per = 2)))).toThrow(/rateLaw.end.per: 2 is not the count of the two reactions, 6/)
    expect(() => checkReactions(edited((r) => void (r.count.working = 'Three and two.')))).toThrow(/count: the working does not show 3/)
  })
})

describe('checkMixtures', () => {
  it('accepts the record as authored', () => {
    expect(() => checkMixtures(input)).not.toThrow()
  })

  it('refuses a mixture that is not of 50 mL, or that holds a liquid the record does not have', () => {
    expect(() => checkMixtures(edited((r) => void (r.mixtures[4]!.flaskA[2]!.millilitres = 10)))).toThrow(/mixtures\[mixture-5\]: 48 mL in all, not 50/)
    expect(() => checkMixtures(edited((r) => void (r.mixtures[1]!.flaskA[2]!.reagentId = 'acetone')))).toThrow(/mixtures\[mixture-2\]: unknown reagent "acetone"/)
    expect(() => checkMixtures(edited((r) => void (r.mixtures[0]!.flaskA[0]!.millilitres = 10.05)))).toThrow(/10.05 mL of "ki-0.01m" is not a whole number of tenths of a millilitre/)
    expect(() => checkMixtures(edited((r) => void r.mixtures[0]!.flaskB.push({ reagentId: 'starch', millilitres: 0 })))).toThrow(/the drops of "starch" are not counted in the volume/)
  })

  it('refuses a flask in which the reaction would start, or in which the thiosulfate meets the acid', () => {
    expect(() => checkMixtures(edited((r) => void r.mixtures[0]!.flaskB.push(r.mixtures[0]!.flaskA.shift()!)))).toThrow(/mixtures\[mixture-1\].flaskB: holds every reactant, so the reaction would start before the flasks are mixed/)
    expect(() => checkMixtures(edited((r) => void r.mixtures[0]!.flaskB.push(r.mixtures[0]!.flaskA.splice(1, 1)[0]!)))).toThrow(/mixtures\[mixture-1\].flaskB: holds what is used up together with the acid/)
  })

  it('refuses a set that is not the reference, three that double one reactant each, and one that changes all three', () => {
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[0]!.flaskA[2]!.millilitres = 12
      r.mixtures[0]!.flaskA[0]!.millilitres = 8
    }))).toThrow(/mixtures\[mixture-1\]: the reference mixture has the same volume of each liquid/)
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[1]!.flaskA[0]!.millilitres = 15
      r.mixtures[1]!.flaskA[2]!.millilitres = 5
    }))).toThrow(/mixtures\[mixture-2\]: holds 1.5, 1, 1 times the reference's strengths, not twice the iodide ion and the same of the others/)
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[4]!.flaskA[0]!.millilitres = 10
      r.mixtures[4]!.flaskA[2]!.millilitres = 10
    }))).toThrow(/mixtures\[mixture-5\]: the mixture that checks the rate law differs from the reference in every reactant/)
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[2]!.flaskA[1]!.millilitres = 5
      r.mixtures[2]!.flaskA[2]!.millilitres = 5
    }))).toThrow(/mixtures\[mixture-3\]: holds another amount of what is used up than the reference does/)
    expect(() => checkMixtures(edited((r) => void r.mixtures.pop()))).toThrow(/one mixture beside the reference and the three that double a reactant, not 0/)
  })
})

describe('checkUsedUp', () => {
  it('finds that under 1% of the bromate, and 1% or less of the hydrogen ion, is used up by the end of any run', () => {
    expect(checkUsedUp(input).map((m) => `${m.id}: ${m.bromate.toFixed(2)}% of the bromate, ${m['hydrogen-ion'].toFixed(2)}% of the hydrogen ion`)).toEqual([
      'mixture-1: 0.42% of the bromate, 1.00% of the hydrogen ion',
      'mixture-2: 0.42% of the bromate, 1.00% of the hydrogen ion',
      'mixture-3: 0.21% of the bromate, 1.00% of the hydrogen ion',
      'mixture-4: 0.42% of the bromate, 0.50% of the hydrogen ion',
      'mixture-5: 0.83% of the bromate, 0.67% of the hydrogen ion',
    ])
  })

  it('refuses a bench on which more than that would be used up: ten times the thiosulfate', () => {
    expect(() => checkUsedUp(edited((r) => void ((r.reagents[1] as { molarity: number }).molarity = 0.01)))).toThrow(/mixtures\[mixture-1\]: 4.17% of the bromate is used up by the end of a run, which is over 1%/)
    expect(() => checkUsedUp(input, 0.5)).toThrow(/mixtures\[mixture-1\]: 1.00% of the hydrogen-ion is used up/)
  })
})

describe('checkRateRecord', () => {
  it('accepts the record as authored', () => {
    expect(() => checkRateRecord(input)).not.toThrow()
  })

  it('refuses an order that is no choice, and a unit that is not the one the orders give', () => {
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.reactants[2]!.order.value = 3)))).toThrow(/rateLaw.reactants\[hydrogen-ion\].order: 3 is not one of the orders to choose among/)
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.reactants[2]!.order.value = 1)))).toThrow(/rateLaw.rateConstant.unit: "L³\/\(mol³·s\)" is not the unit of a rate constant of order 3, L²\/\(mol²·s\)/)
    expect(() => checkRateRecord(edited((r) => void (r.parameters.unitPowers.value = [0, -1, -2])))).toThrow(/parameters.unitPowers: the unit of a rate constant of order 4 is not among the choices/)
  })

  it('refuses a rate constant that is not the figure printed, and an activation energy that is given a source or is not called the lab\'s own', () => {
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.rateConstant.value = 49)))).toThrow(/rateLaw.rateConstant: published as 50.26, which is not the stored 49/)
    expect(() => checkRateRecord(edited((r) => void ((r.rateLaw.activationEnergy as { sourceId?: string }).sourceId = 'chemguide-arrhenius')))).toThrow(/rateLaw.activationEnergy: expected exactly the keys value, unit, rationale/)
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.activationEnergy.rationale = 'The usual figure for this reaction.')))).toThrow(/the rationale must begin by saying that the figure is the lab's own, not a measured one/)
  })

  it('refuses notes that do not give the two figures as they are stored, the second as the lab\'s own', () => {
    expect(() => checkRateRecord(edited((r) => void (r.parts[1]!.notes[1]!.value = 'The rate constant is about fifty.')))).toThrow(/parts\[rate-law\]: no note gives the rate constant as it is stored/)
    expect(() => checkRateRecord(edited((r) => void (r.parts[2]!.notes[1]!.value = 'The activation energy of this reaction is 50 kJ/mol.')))).toThrow(/parts\[temperature\]: no note gives the activation energy and says that it is the lab's own figure, not a measured one/)
  })

  it('refuses a parameter with anything beside its value and its rationale, and a bath with no range', () => {
    expect(() => checkRateRecord(edited((r) => void ((r.parameters.delayLimitMs as { sourceId?: string }).sourceId = 'x')))).toThrow(/parameters.delayLimitMs: expected exactly the keys value, rationale/)
    expect(() => checkRateRecord(edited((r) => void (r.baths[1]!.range = 'standMinutes')))).toThrow(/baths\[cool\]: "standMinutes" is not a parameter that is a range/)
  })
})

describe("the record and the manifest's rows", () => {
  it('give one account of the sources: every cited value has a row, and every row a value', () => {
    const merged = { ...input, reagents: mergeHazards(input.reagents, hazards as Record<string, Entry>, sheets) }
    expect(() => checkSupported(merged, sources, sheets)).not.toThrow()
    expect(merged).toEqual(stored)
  })

  it('refuse a value that cites a source with no row for it, and a row that no value cites', () => {
    const merge = (record: Input) => ({ ...record, reagents: mergeHazards(record.reagents, hazards as Record<string, Entry>, sheets) })
    expect(() => checkSupported(merge(edited((r) => void (r.rateLaw.rateConstant.sourceId = 'barton-bromate-iodide-1976'))), sources, sheets)).toThrow(/rateLaw.rateConstant: the source "barton-bromate-iodide-1976" has no row that names it/)
    expect(() => checkSupported(merge(edited((r) => void (r.rateLaw.rateConstant.published = '49'))), sources, sheets)).toThrow(/rateLaw.rateConstant: the source "loo-bromate-iodide-1969" has no row that prints 49 for it/)
    expect(() => checkSupported(merge(edited((r) => void (r.parts[2]!.notes[2]!.sourceId = 'bellevue-clock-reaction'))), sources, sheets)).toThrow(/parts\[temperature\].notes\[2\]/)
    expect(() => checkSupported(merge(edited((r) => void (r.baths[0]!.sourceId = 'ncssm-clock-reaction'))), sources, sheets)).toThrow(/baths\[ice\]: the source "ncssm-clock-reaction" has no row that names it/)
  })

  it('cite the activation energy to no source at all, anywhere in the record', () => {
    const cited = citations(stored)
    expect(cited.filter((c) => c.key.startsWith('rateLaw.activationEnergy'))).toEqual([])
    expect(cited.filter((c) => c.key === 'rateLaw.rateConstant')).toEqual([{ key: 'rateLaw.rateConstant', sourceId: 'loo-bromate-iodide-1969', published: '50.26' }])
    expect(cited.filter((c) => c.key === 'rateLaw.reactants[hydrogen-ion].order').map((c) => c.sourceId)).toEqual(['barton-bromate-iodide-1976', 'loo-bromate-iodide-1969'])
  })

  it('keep no copy of any source, and say of the one read through a tool that no copy of its words was saved', () => {
    for (const source of [...sources, ...sheets]) expect(source.file, source.id).toBeUndefined()
    expect(sources.filter((s) => s.fetchedSha256 === undefined).map((s) => s.id)).toEqual(['barton-bromate-iodide-1976'])
    expect(sources.find((s) => s.id === 'barton-bromate-iodide-1976')!.citation).toContain('no copy of the record\'s words could be saved')
    expect(sources.find((s) => s.id === 'loo-bromate-iodide-1969')!.citation).toContain('The thesis itself was not read')
  })
})

describe('the sources the build lists for the lab', () => {
  const listed = (id: string) => allSources.find((s) => s.id === id)

  it('lists every source of its manifest once, and the constants as the earlier labs wrote them', () => {
    for (const source of sources) expect(listed(source.id), source.id).toEqual({ id: source.id, url: source.url, citation: source.citation })
    expect(newSources(sources, allSources.filter((s) => s.id === 'nist-codata-2022'), 'clock MANIFEST.json').map((s) => s.id)).not.toContain('nist-codata-2022')
    expect(() => newSources(sources, [{ id: 'nist-codata-2022', url: 'https://example.org/', citation: 'Another.' }], 'clock MANIFEST.json')).toThrow(/already in use for another address or citation/)
  })

  it("lists the documents a bottle's hazards cite and those read for the primer's safety card, and no other document of the hazard manifest", () => {
    const underTiles = new Set(stored.reagents.flatMap((r) => [r.hazards.sourceId, r.hazards.note.sourceId, ...('alsoSourceId' in r.hazards.note ? [r.hazards.note.alsoSourceId] : []), ...('moreSourceIds' in r.hazards.note ? r.hazards.note.moreSourceIds : [])]))
    const forPrimer = new Set(sheets.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id))
    expect([...forPrimer].sort()).toEqual(['fisher-sds-iodine', 'flinn-sds-411', 'flinn-sds-615', 'nj-rtk-fs-1559', 'noaa-cameo-1353', 'noaa-cameo-25035', 'wards-sds-pp0395', 'wards-sds-pp0398'])
    // A document that an earlier lab read too is listed by that lab, whatever this one does with it; and one that a
    // lab built after this one has under a tile of its own is listed by that lab, after everything this lab lists.
    const first = allSources.findIndex((s) => s.id === sources[0]!.id)
    const last = Math.max(...[...sources.map((s) => s.id), ...underTiles, ...forPrimer].map((id) => allSources.findIndex((s) => s.id === id)))
    for (const sheet of sheets) {
      const at = allSources.findIndex((s) => s.id === sheet.id)
      expect(at >= 0, sheet.id).toBe(underTiles.has(sheet.id) || forPrimer.has(sheet.id) || (at >= 0 && (at < first || at > last)))
    }
    // The sheet for solid iodine is under no tile of this lab; the iodination of acetone lab has it under its iodine's, and lists it.
    expect(sheets.filter((s) => allSources.findIndex((one) => one.id === s.id) > last).map((s) => s.id)).toEqual(['flinn-sds-407'])
    // Read, and under no tile and not for the card: the manifest keeps what was read of them, and the app does not list them.
    expect(sheets.filter((s) => listed(s.id) === undefined).map((s) => s.id).sort()).toEqual(['wards-sds-pp0610', 'wards-sds-ss0940'])
  })

  it('keeps, as read and not carried for length, the rows of the hazard manifest that the safety card does not use', () => {
    const rows = sheets.flatMap((s) => s.supports.filter((row) => row.field === 'primer.notCarried').map((row) => [s.id, row.where] as const))
    expect(rows.length).toBe(16)
    expect(rows.filter(([, where]) => where.includes("the primer's safety card is held to a length")).length).toBe(15)
    for (const [id, where] of rows) expect(where, id).toMatch(/^Read and not carried\. /)
  })
})
