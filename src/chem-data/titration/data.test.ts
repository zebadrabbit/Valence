import { describe, expect, it } from 'vitest'
import { titrationCitations } from '../citations'
import sources from '../sources.json'
import { validateTitration } from '../validate'
import { titrationData, titrationSchema } from './data'
import { titrationFixture, titrationFixtureWith } from './fixture'
import stored from './titration.json'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const parses = (input: unknown) => titrationSchema.safeParse(input).success

describe('titrationSchema', () => {
  it('accepts a complete record, and gives it back unchanged', () => {
    expect(titrationSchema.parse(titrationFixture())).toEqual(titrationFixture())
  })

  it('accepts the empty unit of a number that has none, and refuses a missing one', () => {
    expect(titrationFixture().constants.waterIonProduct.unit).toBe('')
    expect(parses(titrationFixtureWith('constants.waterIonProduct.unit'))).toBe(false)
  })

  it.each([
    'extra',
    'bottles.extra',
    'bottles.hcl.extra',
    'bottles.hcl.hazards.extra',
    'bottles.hcl.hazards.note.extra',
    'constants.extra',
    'constants.henryCo2.extra',
    'constants.indicatorPKas.0.extra',
    'parameters.extra',
    'parameters.dropUl.extra',
  ])('refuses the unknown key %s instead of dropping it', (path) => {
    expect(parses(titrationFixtureWith(path, 'something'))).toBe(false)
  })

  it.each([
    ['a parameter with no rationale', 'parameters.dropUl.rationale'],
    ['a constant with no sourceId', 'constants.henryCo2.sourceId'],
    ['a constant of a list with no sourceId', 'constants.carbonicPKas.1.sourceId'],
    ['a bottle with no classifiedAs', 'bottles.naoh.classifiedAs'],
    ['an atmosphericCo2 with no year', 'constants.atmosphericCo2.year'],
    ['a missing bottle', 'bottles.indicator'],
    ['a missing constant', 'constants.indicatorStrength'],
    ['a missing parameter', 'parameters.faintPinkNameLimit'],
    ['a missing display duration of the plume', 'parameters.plumeFadeSlowlySeconds'],
  ])('refuses %s', (_, path) => {
    expect(parses(titrationFixtureWith(path))).toBe(false)
  })

  it.each([
    ['a year on a constant other than atmosphericCo2', 'constants.henryCo2.year', 2025],
    ['a range that is not two whole numbers', 'parameters.indicatorDrops.value', [2, 3, 4]],
    ['a volume that is not a whole number of microlitres', 'parameters.halfDropUl.value', 12.5],
    ['an empty rationale', 'parameters.dropUl.rationale', ''],
    ['a plume that takes no time to fade', 'parameters.plumeFadeAtOnceSeconds.value', 0],
    ['a signal word GHS does not have', 'bottles.hcl.hazards.signalWord', 'Caution'],
  ])('refuses %s', (_, path, value) => {
    expect(parses(titrationFixtureWith(path, value))).toBe(false)
  })
})

describe('titrationData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(titrationData).toEqual(stored)
    expect(JSON.stringify(stored)).not.toContain('"reference"')
  })

  it('passes validation against the stored sources', () => {
    expect(validateTitration(titrationData, sources, { institutionNames })).toEqual([])
  })

  it('has every source it names among its citations, each once', () => {
    // A note that rests on two sheets names the second in alsoSourceId.
    const named = new Set(JSON.stringify(titrationData).match(/(?<="(?:sourceId|alsoSourceId)":")[^"]+/g))
    expect(named.size).toBe(15)
    const cited = titrationCitations(titrationData, sources).map((c) => c.source.id)
    expect([...cited].sort()).toEqual([...named].sort())
  })

  it('cites the three bottles as the lab shows them', () => {
    const covers = Object.fromEntries(titrationCitations(titrationData, sources).map((c) => [c.source.id, c.covers]))
    // Each bottle's statements are a supplier's sheet's, for the concentrated or the pure substance, not an entry of a PubChem record.
    expect(covers['flinn-sds-395']).toEqual(['Hydrochloric acid, standardized: hazard classification'])
    expect(covers['flinn-sds-734']).toEqual(['Sodium hydroxide solution, about 0.1 M: hazard classification'])
    expect(covers['flinn-sds-591']).toEqual(['Phenolphthalein indicator solution, 0.5%: hazard classification'])
    // The notes rest on the same supplier's sheets for the strength on the bench: two for the acid, whose label lies on both sides of the line between them.
    expect(covers['flinn-sds-395.2']).toEqual(['Hydrochloric acid, standardized: hazards at the strength used'])
    expect(covers['flinn-sds-395.3']).toEqual(['Hydrochloric acid, standardized: hazards at the strength used'])
    expect(covers['flinn-sds-735.2']).toEqual(['Sodium hydroxide solution, about 0.1 M: hazards at the strength used'])
    expect(covers['ricca-sds-5600']).toEqual(['Phenolphthalein indicator solution, 0.5%: hazards at the strength used'])
    for (const gone of ['pubchem-cid-313', 'pubchem-cid-14798', 'fisher-sds-hcl-0.1n', 'fisher-sds-naoh-0.1n']) {
      expect([gone, covers[gone]]).toEqual([gone, undefined])
      expect(sources.filter((s) => s.id === gone)).toEqual([])
    }
    // PubChem's record for phenolphthalein is cited for the molar mass alone.
    expect(covers['pubchem-cid-4764']).toEqual(['Molar mass of phenolphthalein'])
  })
})
