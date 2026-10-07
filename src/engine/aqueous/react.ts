import type { AqueousData } from '@/chem-data/aqueous/data'

// What happens in a tube (spec 8.1): the moles of every ion and solid that the two reagents put in, the rules in one
// ordered pass, and the temperature rise. Amounts are whole nanomoles as they go in, and which reactant runs out
// is judged on those whole numbers, so two reagents put in to match exactly are both found used up.

export type Rule = 'precipitation' | 'acid-carbonate' | 'ammonia' | 'neutralisation' | 'metal-acid'
export type Temperature = 'none' | 'warm' | 'hot'
/** An amount of one species, in nanomoles. */
export interface Amount {
  speciesId: string
  nmol: number
}
export interface StationResult {
  /** The rules that fired, in the order of the pass. Empty when nothing reacts; at each of the ten stations at most one. */
  rules: Rule[]
  /** What was used up, and what was made. */
  consumed: Amount[]
  products: Amount[]
  /** The reactants that ran out: one, or two that were put in to match exactly. Empty when nothing reacts. */
  limiting: string[]
  /** Every ion and solid in the tube afterwards, the products among them. */
  remaining: Amount[]
  /** The solid product and the gas product, if there is one. */
  precipitate: string | null
  gas: string | null
  /** The dissolved ions that give the liquid its colour. */
  colouredIons: string[]
  /** In °C, with no heat lost and the liquid taken as water: idealised (spec 8.1). */
  temperatureRiseC: number
  temperature: Temperature
}

// The species the rules speak of by name. A test holds each to the record.
export const ID = {
  hydrogenIon: 'hydrogen-ion',
  hydroxide: 'hydroxide-ion',
  carbonate: 'carbonate-ion',
  hydrogenCarbonate: 'hydrogen-carbonate-ion',
  ammonium: 'ammonium-ion',
  ammonia: 'ammonia',
  water: 'water',
  carbonDioxide: 'carbon-dioxide',
  hydrogen: 'hydrogen',
} as const

type Term = readonly [speciesId: string, coefficient: number]
interface Reaction {
  rule: Rule
  reactants: Term[]
  products: Term[]
  /** Whether the rule is one that releases heat (spec 8.1): its enthalpy is then worked out from the stored formation enthalpies. */
  heat: boolean
}
/** What is in a tube: nanomoles of each species. */
export type Tube = Map<string, number>

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** The reactions the tube's contents allow under one rule, from the record's tables. */
function reactionsOf(data: AqueousData, rule: Rule, tube: Tube): Reaction[] {
  const has = (id: string) => (tube.get(id) ?? 0) > 0
  const charge = (id: string) => data.species.find((s) => s.id === id)!.charge
  switch (rule) {
    case 'precipitation':
      return data.solubility
        .filter((pair) => !pair.soluble && pair.precipitateId !== undefined && has(pair.cationId) && has(pair.anionId))
        .map((pair) => {
          const [plus, minus] = [charge(pair.cationId), -charge(pair.anionId)]
          const shared = gcd(plus, minus)
          return { rule, reactants: [[pair.cationId, minus / shared], [pair.anionId, plus / shared]], products: [[pair.precipitateId!, 1]], heat: false }
        })
    case 'acid-carbonate': {
      if (!has(ID.hydrogenIon)) return []
      const dissolved: Reaction[] = [
        { rule, reactants: [[ID.carbonate, 1], [ID.hydrogenIon, 2]], products: [[ID.carbonDioxide, 1], [ID.water, 1]], heat: false },
        { rule, reactants: [[ID.hydrogenCarbonate, 1], [ID.hydrogenIon, 1]], products: [[ID.carbonDioxide, 1], [ID.water, 1]], heat: false },
      ]
      // A solid carbonate: the acid takes its carbonate and leaves its other ion dissolved.
      const solids = data.reagents
        .filter((reagent) => reagent.form === 'solid' && reagent.speciesId !== undefined && reagent.ions.some((ion) => ion.speciesId === ID.carbonate))
        .map((reagent): Reaction => {
          const carbonates = reagent.ions.find((ion) => ion.speciesId === ID.carbonate)!.ratio
          const others = reagent.ions.filter((ion) => ion.speciesId !== ID.carbonate).map((ion): Term => [ion.speciesId, ion.ratio])
          return { rule, reactants: [[reagent.speciesId!, 1], [ID.hydrogenIon, 2 * carbonates]], products: [...others, [ID.water, carbonates], [ID.carbonDioxide, carbonates]], heat: false }
        })
      return [...dissolved, ...solids].filter((reaction) => has(reaction.reactants[0]![0]))
    }
    case 'ammonia':
      return has(ID.ammonium) && has(ID.hydroxide) ? [{ rule, reactants: [[ID.ammonium, 1], [ID.hydroxide, 1]], products: [[ID.ammonia, 1], [ID.water, 1]], heat: false }] : []
    case 'neutralisation':
      return has(ID.hydrogenIon) && has(ID.hydroxide) ? [{ rule, reactants: [[ID.hydrogenIon, 1], [ID.hydroxide, 1]], products: [[ID.water, 1]], heat: true }] : []
    case 'metal-acid':
      return data.activitySeries
        .filter((entry) => entry.aboveHydrogen && has(entry.metalId) && has(ID.hydrogenIon))
        .map((entry) => {
          // 2 M + 2z H+ -> 2 M(z+) + z H2, in lowest terms.
          const z = charge(entry.ionId)
          const shared = gcd(2, z)
          return { rule, reactants: [[entry.metalId, 2 / shared], [ID.hydrogenIon, (2 * z) / shared]], products: [[entry.ionId, 2 / shared], [ID.hydrogen, z / shared]], heat: true }
        })
  }
}

// The order of spec 8.1. A tube holds two reagents and nothing is added later, so one pass is enough.
const RULES: readonly Rule[] = ['precipitation', 'acid-carbonate', 'ammonia', 'neutralisation', 'metal-acid']

/** kJ released by one mole of the reaction as written, from the formation enthalpies of what it makes and uses up. */
function heatReleased(data: AqueousData, reaction: Reaction): number {
  const formation = ([id, coefficient]: Term) => {
    const enthalpy = data.species.find((s) => s.id === id)?.enthalpyOfFormation
    if (!enthalpy) throw new Error(`no enthalpy of formation is stored for "${id}"`)
    return coefficient * enthalpy.value
  }
  const sum = (terms: Term[]) => terms.reduce((total, term) => total + formation(term), 0)
  return sum(reaction.reactants) - sum(reaction.products)
}

/**
 * The rules applied in order to what is in a tube of `volumeUl` microlitres of liquid. Not part of the public
 * surface: the app reaches the ten stations and nothing else (spec 8.1).
 */
export function react(data: AqueousData, contents: Tube, volumeUl: number): StationResult {
  const tube = new Map(contents)
  const add = (list: Amount[], speciesId: string, nmol: number) => {
    const found = list.find((amount) => amount.speciesId === speciesId)
    if (found) found.nmol += nmol
    else list.push({ speciesId, nmol })
  }
  const rules: Rule[] = []
  const consumed: Amount[] = []
  const products: Amount[] = []
  const limiting: string[] = []
  let joules = 0
  for (const rule of RULES) {
    for (const reaction of reactionsOf(data, rule, tube)) {
      const amount = (id: string) => tube.get(id) ?? 0
      // Something an earlier reaction of this rule used up is gone.
      if (reaction.reactants.some(([id]) => amount(id) <= 0)) continue
      // The reactants that run out first, by cross-multiplying: a/c is least where a x c' <= a' x c for every other.
      const runsOut = reaction.reactants.filter(([id, c]) => reaction.reactants.every(([other, c2]) => amount(id) * c2 <= amount(other) * c))
      const [first, firstCoefficient] = runsOut[0]!
      const extent = amount(first) / firstCoefficient
      for (const [id, c] of reaction.reactants) {
        const used = runsOut.some(([out]) => out === id) ? amount(id) : c * extent
        tube.set(id, amount(id) - used)
        add(consumed, id, used)
      }
      for (const [id, c] of reaction.products) {
        tube.set(id, amount(id) + c * extent)
        add(products, id, c * extent)
      }
      if (reaction.heat) joules += heatReleased(data, reaction) * 1000 * extent * 1e-9
      if (!rules.includes(rule)) rules.push(rule)
      limiting.push(...runsOut.map(([id]) => id).filter((id) => !limiting.includes(id)))
    }
  }
  const species = (id: string) => data.species.find((s) => s.id === id)!
  const made = (state: 's' | 'g') => products.find((amount) => species(amount.speciesId).state === state)?.speciesId ?? null
  const { constants, parameters } = data
  const grams = (volumeUl / 1000) * constants.solutionDensity.value
  const temperatureRiseC = grams > 0 ? joules / (grams * constants.solutionHeatCapacity.value) : 0
  return {
    rules,
    consumed,
    products,
    limiting,
    remaining: [...tube].filter(([, nmol]) => nmol > 0).map(([speciesId, nmol]) => ({ speciesId, nmol })),
    precipitate: made('s'),
    gas: made('g'),
    colouredIons: data.species.filter((s) => s.solutionColor !== undefined && (tube.get(s.id) ?? 0) > 0).map((s) => s.id),
    temperatureRiseC,
    temperature: temperatureRiseC >= parameters.hotFromC.value ? 'hot' : temperatureRiseC >= parameters.warmFromC.value ? 'warm' : 'none',
  }
}

/** A station by its id; an unknown id is a fault in the caller. */
export function stationOf(data: AqueousData, stationId: string) {
  const station = data.stations.find((s) => s.id === stationId)
  if (!station) throw new Error(`no station "${stationId}"`)
  return station
}

/**
 * What a station's two reagents put in the tube, in whole nanomoles, and the volume of liquid in microlitres. A
 * solution gives its ions, microlitres times millimoles per litre; a solid or a metal goes in as itself, its mass
 * over its molar mass.
 */
export function tally(data: AqueousData, stationId: string): { tube: Tube; volumeUl: number } {
  const station = stationOf(data, stationId)
  const tube: Tube = new Map()
  let volumeUl = 0
  station.reagentIds.forEach((reagentId, i) => {
    const reagent = data.reagents.find((r) => r.id === reagentId)!
    const { value, unit } = station.amounts[i]!
    const put = (id: string, nmol: number) => tube.set(id, (tube.get(id) ?? 0) + nmol)
    if (reagent.form === 'solution') {
      if (unit !== 'mL' || reagent.molarity === undefined) throw new Error(`station "${stationId}": a solution is measured in mL`)
      const ul = Math.round(value * 1000)
      volumeUl += ul
      for (const ion of reagent.ions) put(ion.speciesId, ion.ratio * ul * Math.round(reagent.molarity * 1000))
    } else {
      if (unit !== 'g' || reagent.molarMass === undefined || reagent.speciesId === undefined) throw new Error(`station "${stationId}": a solid is weighed in g`)
      put(reagent.speciesId, Math.round((value / reagent.molarMass.value) * 1e9))
    }
  })
  return { tube, volumeUl }
}

/** What happens at one of the ten stations. */
export function stationResult(data: AqueousData, stationId: string): StationResult {
  const { tube, volumeUl } = tally(data, stationId)
  return react(data, tube, volumeUl)
}
