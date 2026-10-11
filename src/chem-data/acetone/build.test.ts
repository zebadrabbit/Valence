import { describe, expect, it } from 'vitest'
import input from '../../../docs/research/acetone/acetone.json'
import ownHazards from '../../../docs/research/acetone/hazards.json'
import hazardManifest from '../../../docs/research/acetone/sources/hazard-manifest.json'
import manifest from '../../../docs/research/acetone/sources/MANIFEST.json'
import clockManifest from '../../../docs/research/clock/sources/MANIFEST.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import aqueousHazardManifest from '../../../docs/research/phase-4/sources/hazard-manifest.json'
import allSources from '../sources.json'
import stored from './acetone.json'

// The checks scripts/build-chem-data.mjs runs on the iodination of acetone lab's record: against its manifest of
// sources; on its own chemistry, which is that its reaction balances, that its mixtures are those of spec 20.1
// with the iodine kept apart, that the acetone and the acid are in as large an excess as its notes say, and that
// its rate record holds together (scripts/acetone-lib.mjs); and, for the bottles' hazards, whose documents are not
// kept, against the hazard manifests' account of each. They are tested here on the real inputs and on inputs they
// must refuse. The checks of the manifests and the merges are the aqueous and calorimetry labs', which those labs'
// tests cover; what is tested here is that they hold this record, and what this lab added to them.
type Row = { fields: string[]; prints: string; where: string }
type Source = { id: string; url: string; citation: string; file?: string; fetchedSha256?: string; supports: Row[] }
type Sheet = { id: string; url: string; citation: string; file?: string; supports: { field: string; prints: string; where: string }[] }
type Listed = { id: string; url: string; citation: string }
type Lib = {
  citations(record: unknown): { key: string; sourceId: string; published?: string }[]
  checkSupported(record: unknown, sources: Source[], sheets?: Sheet[]): void
  mergeHazards(reagents: unknown[], hazards: Record<string, unknown>, sheets: Sheet[]): { id: string }[]
  newSources(sources: Listed[], earlier: Listed[], where: string): Listed[]
}
type SharedLib = { withSharedHazards(own: unknown, other: unknown, ids: string[]): Record<string, unknown>; withSharedSheets(own: Sheet[], other: Sheet[], ids: string[]): Sheet[] }
type OwnLib = {
  checkReaction(record: unknown): void
  checkMixtures(record: unknown, millilitres?: number): void
  checkExcess(record: unknown, limits?: { acetonePercent: number; acidPercent: number; shorterPercent: number }): { id: string; acetonePercent: number; acidPercent: number; shorterPercent: number }[]
  checkRateRecord(record: unknown): void
}
const [lib] = Object.values(import.meta.glob<Lib>('../../../scripts/aqueous-lib.mjs', { eager: true }))
const [sharedLib] = Object.values(import.meta.glob<SharedLib>('../../../scripts/calorimetry-lib.mjs', { eager: true }))
const [ownLib] = Object.values(import.meta.glob<OwnLib>('../../../scripts/acetone-lib.mjs', { eager: true }))
const { citations, checkSupported, mergeHazards, newSources } = lib!
const { withSharedHazards, withSharedSheets } = sharedLib!
const { checkReaction, checkMixtures, checkExcess, checkRateRecord } = ownLib!

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sources: Source[] = manifest.sources
const ownSheets: Sheet[] = hazardManifest.sources
const sheets = withSharedSheets(ownSheets, aqueousHazardManifest.sources, ['hcl-1m'])
const hazards = withSharedHazards(ownHazards, aqueousHazards, ['hcl-1m'])
type Input = typeof input
const edited = (edit: (record: Input) => void) => {
  const record = copy(input)
  edit(record)
  return record
}
const merge = (record: Input) => ({ ...record, reagents: mergeHazards(record.reagents, hazards, sheets) })

describe('checkReaction', () => {
  it('accepts the record as authored', () => {
    expect(() => checkReaction(input)).not.toThrow()
  })

  it('refuses a reaction that does not balance, in atoms or in charge', () => {
    expect(() => checkReaction(edited((r) => void (r.reaction.products[0]!.composition.H = 6)))).toThrow(/reaction: 6 of H on the left and 7 on the right/)
    expect(() => checkReaction(edited((r) => void r.reaction.products.pop()))).toThrow(/reaction: 2 of I on the left and 1 on the right/)
    expect(() => checkReaction(edited((r) => void (r.reaction.products[2]!.charge = 0)))).toThrow(/reaction: a charge of 0 on the left and 1 on the right/)
  })

  it('refuses a count that is not what the reaction gives, and a product that the reaction does not make', () => {
    expect(() => checkReaction(edited((r) => void (r.rateLaw.end.per = 6)))).toThrow(/rateLaw.end.per: 6 is not the 1 of I₂ that one of the reaction uses up/)
    expect(() => checkReaction(edited((r) => void (r.reaction.product.formula = 'CHI₃')))).toThrow(/the product named, CHI₃, is not among the products/)
  })
})

describe('checkMixtures', () => {
  it('accepts the record as authored', () => {
    expect(() => checkMixtures(input)).not.toThrow()
  })

  it('refuses a mixture that is not of 50 mL, or that holds a liquid the record does not have, or the iodine before the pour', () => {
    expect(() => checkMixtures(edited((r) => void (r.mixtures[3]!.flask[2]!.millilitres = 20)))).toThrow(/mixtures\[mixture-4\]: 60 mL in all, not 50/)
    expect(() => checkMixtures(edited((r) => void (r.mixtures[1]!.flask[2]!.reagentId = 'starch')))).toThrow(/mixtures\[mixture-2\]: unknown reagent "starch"/)
    expect(() => checkMixtures(edited((r) => void (r.mixtures[0]!.flask[0]!.millilitres = 10.05)))).toThrow(/10.05 mL of "acetone-4m" is not a whole number of tenths of a millilitre/)
    expect(() => checkMixtures(edited((r) => void (r.mixtures[0]!.added.reagentId = 'water')))).toThrow(/mixtures\[mixture-1\]: a liquid is listed twice/)
    expect(() => checkMixtures(edited((r) => void ([r.mixtures[0]!.added, r.mixtures[0]!.flask[1]] = [r.mixtures[0]!.flask[1]!, r.mixtures[0]!.added])))).toThrow(/mixtures\[mixture-1\]: what is poured in to start the run is what is used up, "iodine-0.005m"/)
  })

  it('refuses a set that is not the reference and three that double one solution each', () => {
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[0]!.flask[2]!.millilitres = 10
      r.mixtures[0]!.flask[0]!.millilitres = 20
    }))).toThrow(/mixtures\[mixture-1\]: the reference mixture has the same volume of each solution and twice that of water/)
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[1]!.flask[0]!.millilitres = 15
      r.mixtures[1]!.flask[2]!.millilitres = 15
    }))).toThrow(/mixtures\[mixture-2\]: holds 1.5, 1, 1 times the reference's strengths, not twice the acetone and the same of the others/)
    // The handout's own fourth mixture, with half the iodine, is not the lab's.
    expect(() => checkMixtures(edited((r) => {
      r.mixtures[3]!.added.millilitres = 5
      r.mixtures[3]!.flask[2]!.millilitres = 25
    }))).toThrow(/mixtures\[mixture-4\]: holds 1, 1, 0.5 times the reference's strengths, not twice the iodine and the same of the others/)
    expect(() => checkMixtures(edited((r) => void r.mixtures.push({ ...r.mixtures[3]!, id: 'mixture-5' })))).toThrow(/the reference and one that doubles each reactant, not 5/)
  })
})

describe('checkExcess', () => {
  it('finds how fair it is to take the rate as steady: a quarter of a percent of the acetone used at most, the acid up by one percent at most, a run 0.4% shorter at most', () => {
    expect(checkExcess(input).map((m) => `${m.id}: ${m.acetonePercent.toFixed(3)}% of the acetone used, hydrogen ion up ${m.acidPercent.toFixed(2)}%, ${m.shorterPercent.toFixed(2)}% shorter`)).toEqual([
      'mixture-1: 0.125% of the acetone used, hydrogen ion up 0.50%, 0.19% shorter',
      'mixture-2: 0.063% of the acetone used, hydrogen ion up 0.50%, 0.22% shorter',
      'mixture-3: 0.125% of the acetone used, hydrogen ion up 0.25%, 0.06% shorter',
      'mixture-4: 0.250% of the acetone used, hydrogen ion up 1.00%, 0.37% shorter',
    ])
  })

  it('agrees with the rate summed in small steps as the acetone falls and the acid rises', () => {
    // Mixture 4: 0.80 mol/L of acetone, 0.20 of acid, 0.0020 of iodine.
    const [a, h, x, steps] = [0.8, 0.2, 0.002, 4000]
    let time = 0
    for (let i = 0; i < steps; i++) time += x / steps / ((a - (x * (i + 0.5)) / steps) * (h + (x * (i + 0.5)) / steps))
    expect(((1 - time / (x / (a * h))) * 100).toFixed(3)).toBe(checkExcess(input)[3]!.shorterPercent.toFixed(3))
  })

  it('refuses a bench on which the excess would be less: ten times the iodine', () => {
    expect(() => checkExcess(edited((r) => void (r.reagents[2]!.molarity = 0.05)))).toThrow(/mixtures\[mixture-1\]: acetonePercent is 1.25, which is not between nothing and 0.25/)
    expect(() => checkExcess(input, { acetonePercent: 0.25, acidPercent: 0.9, shorterPercent: 0.4 })).toThrow(/mixtures\[mixture-4\]: acidPercent is 1.00/)
  })
})

describe('checkRateRecord', () => {
  it('accepts the record as authored', () => {
    expect(() => checkRateRecord(input)).not.toThrow()
  })

  it('refuses an order that is no choice, a unit that is not the one the orders give, and an order in what is used up that is not nought', () => {
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.reactants[1]!.order.value = 3)))).toThrow(/rateLaw.reactants\[hydrogen-ion\].order: 3 is not one of the orders to choose among/)
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.reactants[1]!.order.value = 2)))).toThrow(/rateLaw.rateConstant.unit: "L\/\(mol·s\)" is not the unit of a rate constant of order 3, L²\/\(mol²·s\)/)
    expect(() => checkRateRecord(edited((r) => {
      r.rateLaw.reactants[2]!.order.value = 1
      r.rateLaw.reactants[1]!.order.value = 0
    }))).toThrow(/rateLaw.end: the rate is steady to the end of a run only if the order in what is used up is nought, not 1/)
  })

  it('refuses a rate constant or an activation energy that is not the figure printed', () => {
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.rateConstant.value = 2.9)))).toThrow(/rateLaw.rateConstant: published as 2.91, which is not the stored 2.9/)
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.activationEnergy.value = 20)))).toThrow(/rateLaw.activationEnergy: published as 20.6, which is not the stored 20/)
    expect(() => checkRateRecord(edited((r) => void (r.rateLaw.activationEnergy.unit = 'kJ/mol')))).toThrow(/stored in kcal\/mol, as its source prints it/)
  })

  it('refuses notes that do not give the two figures as they are stored', () => {
    expect(() => checkRateRecord(edited((r) => void (r.parts[1]!.notes[2]!.value = 'The rate constant is about three hundred-thousandths.')))).toThrow(/parts\[rate-law\]: no note gives the rate constant as it is stored/)
    expect(() => checkRateRecord(edited((r) => void (r.parts[1]!.notes[2]!.value = r.parts[1]!.notes[2]!.value.replace('86.2', '86.6'))))).toThrow(/no note gives the activation energy as it is stored, with the same in kJ\/mol/)
    expect(() => checkRateRecord(edited((r) => void ((r.parameters.delayLimitMs as { sourceId?: string }).sourceId = 'x')))).toThrow(/parameters.delayLimitMs: expected exactly the keys value, rationale/)
  })
})

describe("the record and the manifest's rows", () => {
  it('give one account of the sources: every cited value has a row, and every row a value', () => {
    const merged = merge(input)
    expect(() => checkSupported(merged, sources, sheets)).not.toThrow()
    expect(merged).toEqual(stored)
  })

  it('refuse a value that cites a source with no row for it, and a figure no row prints', () => {
    expect(() => checkSupported(merge(edited((r) => void (r.rateLaw.rateConstant.sourceId = 'tau-kinetics-iodination'))), sources, sheets)).toThrow(/rateLaw.rateConstant: the source "tau-kinetics-iodination" has no row that names it/)
    expect(() => checkSupported(merge(edited((r) => void (r.rateLaw.rateConstant.published = '2.86'))), sources, sheets)).toThrow(/rateLaw.rateConstant: the source "nbs-circular-510" has no row that prints 2.86 for it/)
    expect(() => checkSupported(merge(edited((r) => void (r.rateLaw.activationEnergy.published = '20.5'))), sources, sheets)).toThrow(/rateLaw.activationEnergy: the source "nbs-circular-510" has no row that prints 20.5 for it/)
    expect(() => checkSupported(merge(edited((r) => void (r.mixtures[3]!.sourceId = 'tau-kinetics-iodination'))), sources, sheets)).toThrow(/mixtures\[mixture-4\]: the source "tau-kinetics-iodination" has no row that names it/)
  })

  it('cite the orders, the rate constant and the activation energy, each to a page that was read', () => {
    const cited = citations(stored)
    expect(cited.filter((c) => c.key === 'rateLaw.rateConstant')).toEqual([{ key: 'rateLaw.rateConstant', sourceId: 'nbs-circular-510', published: '2.91' }])
    expect(cited.filter((c) => c.key === 'rateLaw.activationEnergy')).toEqual([{ key: 'rateLaw.activationEnergy', sourceId: 'nbs-circular-510', published: '20.6' }])
    expect(cited.filter((c) => c.key === 'rateLaw.reactants[iodine].order').map((c) => c.sourceId)).toEqual(['tau-kinetics-iodination', 'uv-iodine-acetone-kinetics', 'moorpark-iodination-of-acetone'])
  })

  it('keep no copy of any source, and have a record of the file read for every one', () => {
    for (const source of [...sources, ...ownSheets]) expect(source.file, source.id).toBeUndefined()
    expect(sources.filter((s) => s.fetchedSha256 === undefined)).toEqual([])
    expect(sources.find((s) => s.id === 'nbs-circular-510')!.citation).toContain('read from images of two of its pages')
  })

  it('write the five sources the clock reaction lab lists too exactly as that lab does', () => {
    const shared = sources.filter((s) => clockManifest.sources.some((c) => c.id === s.id))
    expect(shared.map((s) => s.id)).toEqual(['chemguide-orders-of-reaction', 'chemguide-finding-orders', 'chemguide-rates-concentration', 'nist-codata-2022', 'nist-si-temperature'])
    for (const s of shared) {
      const theirs = clockManifest.sources.find((c) => c.id === s.id)!
      expect([s.url, s.citation, s.fetchedSha256], s.id).toEqual([theirs.url, theirs.citation, theirs.fetchedSha256])
    }
  })
})

describe('the sources the build lists for the lab', () => {
  const listed = (id: string) => allSources.find((s) => s.id === id)

  it('lists every source of its manifest once', () => {
    for (const source of sources) expect(listed(source.id), source.id).toEqual({ id: source.id, url: source.url, citation: source.citation })
    expect(new Set(allSources.map((s) => s.id)).size).toBe(allSources.length)
    expect(() => newSources(sources, [{ id: 'nist-codata-2022', url: 'https://example.org/', citation: 'Another.' }], 'acetone MANIFEST.json')).toThrow(/already in use for another address or citation/)
  })

  it("lists the documents a bottle's hazards cite and those read for the primer's safety card", () => {
    const noteOf = (r: (typeof stored.reagents)[number]): { sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] } => r.hazards.note
    const underTiles = new Set(stored.reagents.flatMap((r) => [r.hazards.sourceId, noteOf(r).sourceId, ...(noteOf(r).alsoSourceId === undefined ? [] : [noteOf(r).alsoSourceId!]), ...(noteOf(r).moreSourceIds ?? [])]))
    const forPrimer = ownSheets.filter((s) => s.supports.some((row) => row.field === 'primer.safety')).map((s) => s.id)
    expect(forPrimer.sort()).toEqual(['flinn-sds-7', 'flinn-sds-7.3', 'nj-rtk-fs-0006', 'noaa-cameo-2648'])
    // No record of PubChem is among the lab's documents: its data address is not asked.
    expect([...sources, ...ownSheets].filter((s) => /pubchem/i.test(`${s.id} ${s.url} ${s.citation}`))).toEqual([])
    for (const id of [...underTiles, ...forPrimer]) expect(listed(id), id).toBeDefined()
    // The acid's documents are the aqueous reactions lab's, listed by that lab.
    expect(stored.reagents[1]!.hazards).toEqual(aqueousHazards['hcl-1m'].hazards)
  })
})
