import { describe, expect, it } from 'vitest'
import { titrationSchema } from './data'
import { titrationFixture, titrationFixtureWith } from './fixture'

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
  ])('refuses %s', (_, path) => {
    expect(parses(titrationFixtureWith(path))).toBe(false)
  })

  it.each([
    ['a year on a constant other than atmosphericCo2', 'constants.henryCo2.year', 2025],
    ['a range that is not two whole numbers', 'parameters.indicatorDrops.value', [2, 3, 4]],
    ['a volume that is not a whole number of microlitres', 'parameters.halfDropUl.value', 12.5],
    ['an empty rationale', 'parameters.dropUl.rationale', ''],
    ['a signal word GHS does not have', 'bottles.hcl.hazards.signalWord', 'Caution'],
  ])('refuses %s', (_, path, value) => {
    expect(parses(titrationFixtureWith(path, value))).toBe(false)
  })
})
