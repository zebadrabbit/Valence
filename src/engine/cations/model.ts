import { STEP_IDS, substanceOf, type CationsData, type StepId } from '@/chem-data/cations/data'

/** The solids a tube can hold, by the ids the record gives them. */
export const SOLID_IDS = ['silver-chloride', 'lead-chloride', 'mercury-i-chloride', 'lead-chromate', 'mercury-and-amidochloride', 'lead-hydroxide'] as const
export type SolidId = (typeof SOLID_IDS)[number]

/** The rules the engine's actions follow: each is a rule of the record, which gives its source (spec 17.4). A test holds the two lists to each other. */
export const RULE_IDS = ['chlorides-form', 'lead-chloride-in-water', 'lead-chromate-forms', 'silver-chloride-in-ammonia', 'mercury-chloride-with-ammonia', 'lead-chloride-with-ammonia', 'silver-chloride-returns', 'litmus'] as const

/** A place of the flow chart: the step it belongs to, by its place among the five, and the tiles that belong in it. */
export interface PlaceModel {
  id: string
  step: number
  layer: 'solid' | 'liquid'
  holds: readonly string[]
}

/**
 * The plain values the cations engine runs on: every engine function takes one as an argument, so a test can vary
 * a value. Amounts are whole numbers: volumes in microlitres, and what is dissolved or solid in nanomoles.
 */
export interface CationsModel {
  // worked out from cited values
  /** The nanomoles of lead chloride a millilitre of water holds, cold and hot. */
  leadChlorideColdPerMillilitre: number
  leadChlorideHotPerMillilitre: number
  // what is seen, in the record's words
  /** The colour each solid is seen as. */
  solidLook: Readonly<Record<SolidId, string>>
  /** The colour of a liquid with no chromate in it, and of one with it. */
  plainLook: string
  chromateLook: string
  /** What an observation is recorded from. Of two solids in one tube, the one later in `solidChoices` is the colour seen. */
  solidChoices: readonly string[]
  liquidChoices: readonly string[]
  // the bench's amounts
  sampleMicrolitres: number
  /** Of each ion a sample holds. */
  ionNanomoles: number
  hydrochloricAcidMicrolitres: number
  chlorideNanomoles: number
  waterMicrolitres: number
  aceticAcidMicrolitres: number
  chromateMicrolitres: number
  chromateNanomoles: number
  ammoniaMicrolitres: number
  ammoniaNanomoles: number
  /** One addition of nitric acid, and how many the third tube takes. */
  nitricAcidMicrolitres: number
  nitricAcidNanomoles: number
  nitricAcidAdditions: number
  // the flow chart of part 1
  tiles: readonly string[]
  places: readonly PlaceModel[]
}

/** The engine's values, from the stored record. */
export function modelFrom(data: CationsData): CationsModel {
  const p = data.parameters
  const molarity = (reagentId: string) => {
    const reagent = data.reagents.find((r) => r.id === reagentId)
    if (!reagent) throw new Error(`no reagent "${reagentId}"`)
    return reagent.molarity
  }
  const microlitres = (drops: number) => drops * p.dropMicrolitres.value
  /** nmol in a count of drops of a solution: µL × mol/L × 1000. */
  const nanomoles = (drops: number, reagentId: string) => Math.round(microlitres(drops) * molarity(reagentId) * 1000)
  const look = (substanceId: string) => {
    const seen = substanceOf(data, substanceId).look?.value
    if (seen === undefined) throw new Error(`the record gives "${substanceId}" no look`)
    return seen
  }
  const [first, ...others] = data.ions.map((ion) => molarity(ion.reagentId))
  if (others.some((strength) => strength !== first)) throw new Error('the record does not hold the set-up of spec 17.1: the three solutions are not of one strength')
  const [plainLook, chromateLook] = [data.choices.liquid[0], look('chromate-ion')]
  if (plainLook === undefined || !data.choices.liquid.includes(chromateLook)) throw new Error('the record does not hold the two looks of a liquid')
  return {
    leadChlorideColdPerMillilitre: data.leadChloride.cold.value,
    leadChlorideHotPerMillilitre: data.leadChloride.hot.value,
    solidLook: Object.fromEntries(SOLID_IDS.map((id) => [id, look(id)])) as Record<SolidId, string>,
    plainLook,
    chromateLook,
    solidChoices: data.choices.solid,
    liquidChoices: data.choices.liquid,
    sampleMicrolitres: microlitres(p.sampleDrops.value),
    ionNanomoles: nanomoles(p.sampleDropsOfEach.value, data.ions[0].reagentId),
    hydrochloricAcidMicrolitres: microlitres(p.hydrochloricAcidDrops.value),
    chlorideNanomoles: nanomoles(p.hydrochloricAcidDrops.value, 'hcl-6m'),
    waterMicrolitres: microlitres(p.waterDrops.value),
    aceticAcidMicrolitres: microlitres(p.aceticAcidDrops.value),
    chromateMicrolitres: microlitres(p.chromateDrops.value),
    chromateNanomoles: nanomoles(p.chromateDrops.value, 'k2cro4-0.5m'),
    ammoniaMicrolitres: microlitres(p.ammoniaDrops.value),
    ammoniaNanomoles: nanomoles(p.ammoniaDrops.value, 'nh3-6m'),
    nitricAcidMicrolitres: microlitres(p.nitricAcidDrops.value),
    nitricAcidNanomoles: nanomoles(p.nitricAcidDrops.value, 'hno3-6m'),
    nitricAcidAdditions: p.nitricAcidAdditions.value,
    tiles: data.chart.tileIds,
    places: data.chart.places.map((place) => ({ id: place.id, step: STEP_IDS.indexOf(place.stepId as StepId), layer: place.layer, holds: place.holds })),
  }
}
