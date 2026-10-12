import type { IonId } from '@/chem-data/cations/data'
import { SOLID_IDS, type CationsModel, type SolidId } from './model'

// A test tube and what each action does to it (spec 17.4). A tube holds whole-number amounts: its liquid in
// microlitres, and what is dissolved in it and each solid in nanomoles. Every function here takes a tube and
// returns a new one, by one of the record's rules, which is named in its comment and has its source there
// (src/chem-data/cations/cations.json, `rules`). Nothing here knows of steps, of a learner or of a page.
//
// What the model leaves out, each said in the primer or the notes: a pouring off takes all the liquid and leaves
// none with the solid; the hydrogen ions of the hydrochloric acid, the nitrate, the potassium, the ammonium and
// the acetic acid are not counted, since no rule turns on them; and a solid that a careless pouring off has put
// in a tube where the scheme has none stays there as it is, whatever goes in after it.

export interface Tube {
  /** The liquid, in microlitres; 0 for a tube that holds no liquid. */
  microlitres: number
  /** The three ions as a sample holds them, free in the liquid. */
  silver: number
  lead: number
  mercury: number
  chloride: number
  chromate: number
  /** Ammonia that is free in the liquid, and silver held as the silver-ammonia ion, which holds two ammonia each. */
  ammonia: number
  silverAmmonia: number
  /** Acid beyond what the ammonia took up: over 0 once the liquid is acid. */
  acid: number
  solids: Readonly<Record<SolidId, number>>
  /** The solid is spread through the liquid, as it is when it has just formed or been stirred up; false once a centrifuge has packed it at the bottom. */
  suspended: boolean
  /** The water has been heated in the bath. */
  hot: boolean
}

const NO_SOLIDS = Object.fromEntries(SOLID_IDS.map((id) => [id, 0])) as Record<SolidId, number>

export const EMPTY_TUBE: Tube = { microlitres: 0, silver: 0, lead: 0, mercury: 0, chloride: 0, chromate: 0, ammonia: 0, silverAmmonia: 0, acid: 0, solids: NO_SOLIDS, suspended: false, hot: false }

export const hasSolid = (tube: Tube): boolean => SOLID_IDS.some((id) => tube.solids[id] > 0)

/** A tube after something has gone into it and been stirred: any solid in it is spread through the liquid. */
const stirred = (tube: Tube): Tube => ({ ...tube, suspended: hasSolid(tube) })

/** A sample as it is set out: the same volume whatever it holds, with the same amount of each ion it does hold. */
export function sampleTube(m: CationsModel, ions: readonly IonId[]): Tube {
  const amount = (ion: IonId) => (ions.includes(ion) ? m.ionNanomoles : 0)
  return { ...EMPTY_TUBE, microlitres: m.sampleMicrolitres, silver: amount('silver'), lead: amount('lead'), mercury: amount('mercury-i') }
}

/**
 * Hydrochloric acid goes in. Rule `chlorides-form`: each of the three ions comes down as its chloride, whole, as
 * far as the chloride lasts; silver takes one chloride ion and the other two take two.
 */
export function addHydrochloricAcid(m: CationsModel, tube: Tube): Tube {
  let chloride = tube.chloride + m.chlorideNanomoles
  const down = (ion: number, each: number) => {
    const formed = Math.min(ion, Math.floor(chloride / each))
    chloride -= formed * each
    return formed
  }
  const [silver, lead, mercury] = [down(tube.silver, 1), down(tube.lead, 2), down(tube.mercury, 2)]
  return stirred({
    ...tube,
    microlitres: tube.microlitres + m.hydrochloricAcidMicrolitres,
    silver: tube.silver - silver,
    lead: tube.lead - lead,
    mercury: tube.mercury - mercury,
    chloride,
    solids: { ...tube.solids, 'silver-chloride': tube.solids['silver-chloride'] + silver, 'lead-chloride': tube.solids['lead-chloride'] + lead, 'mercury-i-chloride': tube.solids['mercury-i-chloride'] + mercury },
  })
}

/**
 * Rule `lead-chloride-in-water`: lead chloride dissolves as far as the water in the tube can hold it, which is
 * about three times further hot than cold. The other chlorides stay solid.
 */
function dissolveLeadChloride(m: CationsModel, tube: Tube): Tube {
  const perMillilitre = tube.hot ? m.leadChlorideHotPerMillilitre : m.leadChlorideColdPerMillilitre
  const holds = Math.floor((perMillilitre * tube.microlitres) / 1000)
  const dissolved = Math.min(tube.solids['lead-chloride'], Math.max(0, holds - tube.lead))
  return { ...tube, lead: tube.lead + dissolved, chloride: tube.chloride + 2 * dissolved, solids: { ...tube.solids, 'lead-chloride': tube.solids['lead-chloride'] - dissolved } }
}

/** Distilled water goes in, cold, and the solid is stirred up in it. */
export const addWater = (m: CationsModel, tube: Tube): Tube => stirred(dissolveLeadChloride(m, { ...tube, microlitres: tube.microlitres + m.waterMicrolitres, hot: false }))

/** The tube stands in the boiling bath. */
export const heat = (m: CationsModel, tube: Tube): Tube => stirred(dissolveLeadChloride(m, { ...tube, hot: true }))

/** The centrifuge packs the solid at the bottom. */
export const centrifuge = (tube: Tube): Tube => ({ ...tube, suspended: false })

/**
 * The liquid is poured off, all of it, into another tube or away. A solid that is packed at the bottom stays; one
 * that is still spread through the liquid goes over with it. `[what is left, what the other tube now holds]`.
 */
export function pourOff(from: Tube, into: Tube): [left: Tube, filled: Tube] {
  const over = from.suspended
  const dissolved = { silver: 0, lead: 0, mercury: 0, chloride: 0, chromate: 0, ammonia: 0, silverAmmonia: 0, acid: 0 }
  const keys = Object.keys(dissolved) as (keyof typeof dissolved)[]
  const solids = Object.fromEntries(SOLID_IDS.map((id) => [id, into.solids[id] + (over ? from.solids[id] : 0)])) as Record<SolidId, number>
  const filled: Tube = { ...into, ...Object.fromEntries(keys.map((key) => [key, into[key] + from[key]])), microlitres: into.microlitres + from.microlitres, solids, suspended: into.suspended || (over && hasSolid(from)), hot: from.hot }
  return [{ ...from, ...dissolved, microlitres: 0, solids: over ? NO_SOLIDS : from.solids, suspended: false, hot: false }, filled]
}

/**
 * Acetic acid and then potassium chromate go in. Rule `lead-chromate-forms`: lead ions and chromate ions come down
 * as lead chromate, as far as each lasts. The acetic acid adds its volume and nothing else.
 */
export function addChromate(m: CationsModel, tube: Tube): Tube {
  const chromate = tube.chromate + m.chromateNanomoles
  const formed = Math.min(tube.lead, chromate)
  return stirred({
    ...tube,
    microlitres: tube.microlitres + m.aceticAcidMicrolitres + m.chromateMicrolitres,
    lead: tube.lead - formed,
    chromate: chromate - formed,
    solids: { ...tube.solids, 'lead-chromate': tube.solids['lead-chromate'] + formed },
  })
}

/**
 * Ammonia solution goes in. Three rules, each taking two ammonia for each formula of the solid it acts on:
 * `mercury-chloride-with-ammonia` turns mercury(I) chloride into mercury with mercury(II) amidochloride, which
 * stays solid, and frees one chloride ion; `lead-chloride-with-ammonia` leaves any lead chloride as a white solid,
 * lead hydroxide, and frees two; `silver-chloride-in-ammonia` takes silver chloride into the liquid as the
 * silver-ammonia ion, with its chloride.
 */
export function addAmmonia(m: CationsModel, tube: Tube): Tube {
  let ammonia = tube.ammonia + m.ammoniaNanomoles
  const taken = (solid: SolidId) => {
    const amount = Math.min(tube.solids[solid], Math.floor(ammonia / 2))
    ammonia -= 2 * amount
    return amount
  }
  const [mercury, lead, silver] = [taken('mercury-i-chloride'), taken('lead-chloride'), taken('silver-chloride')]
  return stirred({
    ...tube,
    microlitres: tube.microlitres + m.ammoniaMicrolitres,
    ammonia,
    silverAmmonia: tube.silverAmmonia + silver,
    chloride: tube.chloride + mercury + 2 * lead + silver,
    solids: {
      ...tube.solids,
      'mercury-i-chloride': tube.solids['mercury-i-chloride'] - mercury,
      'mercury-and-amidochloride': tube.solids['mercury-and-amidochloride'] + mercury,
      'lead-chloride': tube.solids['lead-chloride'] - lead,
      'lead-hydroxide': tube.solids['lead-hydroxide'] + lead,
      'silver-chloride': tube.solids['silver-chloride'] - silver,
    },
  })
}

/**
 * One addition of nitric acid. The acid first uses up the free ammonia. Rule `silver-chloride-returns`: what acid
 * is left then breaks up the silver-ammonia ion, two to each, and the silver comes down as silver chloride with
 * the chloride in the liquid. Acid beyond that makes the liquid acid. At the bench's amounts an addition either
 * leaves free ammonia or goes past all of it, which the build checks, so the ion is never broken up in part.
 */
export function addNitricAcid(m: CationsModel, tube: Tube): Tube {
  let acid = m.nitricAcidNanomoles
  const neutralised = Math.min(acid, tube.ammonia)
  acid -= neutralised
  const broken = Math.min(tube.silverAmmonia, Math.floor(acid / 2))
  acid -= 2 * broken
  const formed = Math.min(broken, tube.chloride)
  return stirred({
    ...tube,
    microlitres: tube.microlitres + m.nitricAcidMicrolitres,
    ammonia: tube.ammonia - neutralised,
    silverAmmonia: tube.silverAmmonia - broken,
    silver: tube.silver + broken - formed,
    chloride: tube.chloride - formed,
    // With silver-ammonia ion still unbroken, the acid left is under two and stays as it is: the liquid is not yet acid.
    acid: tube.acid + (tube.silverAmmonia - broken > 0 ? 0 : acid),
    solids: { ...tube.solids, 'silver-chloride': tube.solids['silver-chloride'] + formed },
  })
}

/** Rule `litmus`: what litmus paper shows of the liquid. Acid once the acid has gone past the ammonia; basic while ammonia is left. */
export type Litmus = 'acid' | 'basic' | 'neutral'
export const litmusOf = (tube: Tube): Litmus => (tube.acid > 0 ? 'acid' : tube.ammonia > 0 || tube.silverAmmonia > 0 ? 'basic' : 'neutral')

/** What is seen of a tube, in the record's words for colours, and nothing of what it is. */
export interface TubeShows {
  /** Null for a tube with no liquid in it. `cloudy` where a solid is spread through it. */
  liquid: { colour: string; cloudy: boolean; microlitres: number } | null
  /** Null for a tube with no solid in it. `settled` once it is at the bottom; false while it is spread through the liquid. */
  solid: { colour: string; settled: boolean } | null
}

/**
 * What a tube shows. A liquid is coloured by chromate and by nothing else in this lab. Of two solids in one tube,
 * the one whose colour comes later in the record's choices is the colour seen: white is hidden by yellow, and
 * both by grey to black. A careful run never has two colours of solid in one tube.
 */
export function showsOf(m: CationsModel, tube: Tube): TubeShows {
  const colours = SOLID_IDS.filter((id) => tube.solids[id] > 0).map((id) => m.solidLook[id])
  const colour = colours.reduce<string | null>((seen, next) => (seen === null || m.solidChoices.indexOf(next) > m.solidChoices.indexOf(seen) ? next : seen), null)
  const wet = tube.microlitres > 0
  return {
    liquid: wet ? { colour: tube.chromate > 0 ? m.chromateLook : m.plainLook, cloudy: tube.suspended && colour !== null, microlitres: tube.microlitres } : null,
    solid: colour === null ? null : { colour, settled: !(wet && tube.suspended) },
  }
}
