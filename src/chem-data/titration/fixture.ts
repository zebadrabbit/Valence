import type { Source } from '../schema'
import type { TitrationData } from './data'

// For tests only: a complete titration record on sources of its own, so that the schema, the validator and the
// citations are tested on the same record and none of them on the stored one, which a later change may move.

const SOURCE_IDS = [
  'water',
  'indicator-paper',
  'indicator-record',
  'listing',
  'drop',
  'henry',
  'air',
  'carbonic',
  'hcl-record',
  'naoh-record',
  'hcl-sheet',
  'hcl-sheet-2',
  'naoh-sheet',
  'indicator-sheet',
] as const

export const FIXTURE_SOURCES: Source[] = SOURCE_IDS.map((id) => ({ id, url: `https://example.org/${id}`, citation: `Citation of ${id}` }))

type SourceId = (typeof SOURCE_IDS)[number]

const constant = (value: number, unit: string, sourceId: SourceId) => ({ value, published: String(value), unit, sourceId })
const parameter = <T>(value: T) => ({ value, rationale: 'A model parameter of the fixture.' })
const range = (low: number, high: number) => parameter<[number, number]>([low, high])
const bottle = (name: string, formula: string, pubchemCid: number, sourceId: SourceId, noteSourceId: SourceId, alsoSourceId?: SourceId) => ({
  name,
  formula,
  pubchemCid,
  classifiedAs: 'Hazards of the pure substance',
  hazards: {
    signalWord: 'Danger' as const,
    statements: ['H314: Causes severe skin burns and eye damage'],
    note: { value: 'A dilute solution.', sourceId: noteSourceId, ...(alsoSourceId ? { alsoSourceId } : {}) },
    sourceId,
  },
})

/**
 * The record, made afresh on each call. `indicator-record` supports two things: a molar mass and a classification.
 * The acid's note rests on two sheets, the other two notes on one each.
 */
export function titrationFixture(): TitrationData {
  return {
    bottles: {
      hcl: bottle('Hydrochloric acid', 'HCl', 313, 'hcl-record', 'hcl-sheet', 'hcl-sheet-2'),
      naoh: bottle('Sodium hydroxide solution', 'NaOH', 14798, 'naoh-record', 'naoh-sheet'),
      indicator: bottle('Phenolphthalein indicator solution', 'C20H14O4', 4764, 'indicator-record', 'indicator-sheet'),
    },
    constants: {
      waterIonProduct: { value: 1e-14, unit: '', note: 'Printed as a pK.', sourceId: 'water' },
      indicatorPKas: [constant(9.05, '', 'indicator-paper'), { ...constant(9.5, '', 'indicator-paper'), published: '9.50' }],
      indicatorMolarMass: constant(318.3, 'g/mol', 'indicator-record'),
      indicatorStrength: constant(0.5, 'g per 100 mL', 'listing'),
      indicatorDropVolume: constant(0.05, 'mL', 'drop'),
      henryCo2: constant(0.034, 'mol/(kg·bar)', 'henry'),
      atmosphericCo2: { ...constant(425.62, 'ppm', 'air'), year: 2025 },
      carbonicPKas: [constant(6.35, '', 'carbonic'), constant(10.33, '', 'carbonic')],
    },
    parameters: {
      faintPinkConcentration: parameter(1e-6),
      hclRangeE4: range(850, 1050),
      naohRangeE5: range(9500, 10500),
      pipetteNominalUl: parameter(25000),
      pipetteOffsetUl: parameter(30),
      fillLevelMaxUl: parameter(2000),
      buretteCapacityUl: parameter(50000),
      streamUl: parameter(250),
      dropUl: parameter(50),
      halfDropUl: parameter(25),
      unconditionedStrengthPercent: parameter(98),
      wetPipetteStrengthPercent: parameter(98),
      tipBubbleUl: parameter(600),
      tipBubbleEscapeUl: parameter(5000),
      overshootUl: parameter(100),
      slowDownUl: parameter(1000),
      readingToleranceUl: parameter(20),
      gradeTolerancePercent: parameter(1),
      molarityRoundingE6: parameter(50),
      waterStepUl: parameter(10000),
      waterMaxUl: parameter(30000),
      indicatorDrops: range(2, 3),
      plumeSlowFrom: parameter(0.1),
      plumeMixSeconds: parameter(10),
      persistSeconds: parameter(30),
      passesToComplete: parameter(3),
      airPressureBar: parameter(1.01325),
      pinkDisplayScale: parameter(1e-5),
      faintPinkNameLimit: parameter(1.5e-5),
      plumeFadeAtOnceSeconds: parameter(0.5),
      plumeFadeSlowlySeconds: parameter(3),
    },
  }
}

/**
 * The fixture with one thing changed: the value at `path` ("constants.indicatorPKas.0.sourceId") replaced, or with
 * no `value` removed. Untyped, because most changes make a record the schema must refuse.
 */
export function titrationFixtureWith(path: string, value?: unknown): unknown {
  const root: unknown = titrationFixture()
  const keys = path.split('.')
  const parent = keys.slice(0, -1).reduce((at, key) => (at as Record<string, unknown>)[key], root) as Record<string, unknown>
  const last = keys.at(-1)!
  if (value === undefined) delete parent[last]
  else parent[last] = value
  return root
}
