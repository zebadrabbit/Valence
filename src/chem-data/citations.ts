import type { Measurement } from './measure'
import { EMISSION_SCOPE_NOTE } from './element'
import type { Element, ElementSpectrum, Emission, MoDiagram, Molecule, Source } from './schema'
import type { AqueousData } from './aqueous/data'
import type { CalorimetryData, PartId } from './calorimetry/data'
import type { CationsData, StepId } from './cations/data'
import type { AcetoneData, PartId as AcetonePartId } from './acetone/data'
import type { CabbageData, ThingId } from './cabbage/data'
import type { DensityData, PartId as DensityPartId } from './density/data'
import type { FreezingData, PartId as FreezingPartId } from './freezing/data'
import type { ReactionsData, StationId as ReactionsStationId } from './reactions/data'
import { type HotcoldData, type PartId as HotcoldPartId } from './hotcold/data'
import { isPairId, type MixingData, type PartId as MixingPartId, type TubeId as MixingTubeId } from './mixing/data'
import type { ClockData, PartId as ClockPartId } from './clock/data'
import type { FlameData } from './flame/data'
import type { DisturbanceId, LechatelierData } from './lechatelier/data'
import type { TitrationData } from './titration/data'

// What an inspector card's "Sources" control lists (spec 5.1): each source once, with the values it covers.

export type Citation = { source: Source; covers: string[] }

type Entry = readonly [covers: string, sourceId: string]

/** Groups the entries by source, in first-seen order. */
export function citations(entries: readonly Entry[], sources: readonly Source[]): Citation[] {
  const result: Citation[] = []
  for (const [covers, sourceId] of entries) {
    const source = sources.find((s) => s.id === sourceId)
    if (!source) throw new Error(`unknown source "${sourceId}"`)
    let citation = result.find((c) => c.source === source)
    if (!citation) result.push((citation = { source, covers: [] }))
    if (!citation.covers.includes(covers)) citation.covers.push(covers)
  }
  return result
}

/** What a drawn emission spectrum cites: its lines, the sentence on which are shown where it says more, and the note shown with every spectrum. */
function emissionEntries(emission: Emission | undefined): Entry[] {
  if (!emission) return []
  return [
    ...emission.lines.map((line): Entry => ['Emission lines', line.sourceId]),
    ...(emission.selectionSourceIds ?? []).map((id): Entry => ['Lines shown', id]),
    ...EMISSION_SCOPE_NOTE.sourceIds.map((id): Entry => ['What the emission spectrum leaves out', id]),
  ]
}

/** The sources of every stored value the atom card shows for an element, and of the colour its atoms are drawn in. */
export function elementCitations(element: Element, sources: readonly Source[]): Citation[] {
  return citations(
    [
      ['Symbol, name and atomic number', element.sourceId],
      ['Standard atomic weight', element.atomicWeight.sourceId],
      ['Electronegativity', element.electronegativity.sourceId],
      ['Valence electrons', element.shells.sourceId],
      ['Electron configuration', element.configuration.sourceId],
      ['Ionization energies', element.ionizationEnergiesEv.sourceId],
      ['Covalent radius', element.covalentRadius.sourceId],
      ['Van der Waals radius', element.vdwRadius.sourceId],
      ...element.ionicRadii.map((r): Entry => ['Ionic radius', r.sourceId]),
      ['Display colour in the models', element.color.sourceId],
      ...emissionEntries(element.emission),
    ],
    sources,
  )
}

/** The source of the shell counts a Bohr diagram is drawn from. */
export function shellCitations(element: Element, sources: readonly Source[]): Citation[] {
  return citations([['Electrons per shell', element.shells.sourceId]], sources)
}

/**
 * The sources of the periodic table's element card: every row's sources under that row's label, then those of the
 * emission spectrum, or of the sentence that says why none is drawn. A row the app works out cites nothing.
 */
export function periodicCitations(
  rows: readonly { label: string; sourceIds: readonly string[] }[],
  spectrum: ElementSpectrum,
  sources: readonly Source[],
): Citation[] {
  return citations(
    [
      ...rows.flatMap((row) => row.sourceIds.map((id): Entry => [row.label, id])),
      ...('emission' in spectrum ? emissionEntries(spectrum.emission) : [['Emission lines', spectrum.none.sourceId] as const]),
    ],
    sources,
  )
}

/** The source of a molecular orbital diagram: its level order, electron counts and callout. */
export function moCitations(diagram: MoDiagram, sources: readonly Source[]): Citation[] {
  return citations([['Order of the levels and the electrons in them', diagram.sourceId]], sources)
}

const CITED_LABEL = { distance: 'Cited length', angle: 'Cited angle', dihedral: 'Cited dihedral' } as const

/** The sources behind a measurement: the molecule's coordinates and the cited experimental value, if it has one. */
export function measurementCitations(molecule: Molecule, measurement: Measurement, sources: readonly Source[]): Citation[] {
  return citations(geometryEntries(molecule, measurement), sources)
}

/** The sources of the bond card: the geometry behind the length and the electronegativities behind the polarity. */
export function bondCitations(
  molecule: Molecule,
  measurement: Measurement,
  elements: readonly Element[],
  sources: readonly Source[],
): Citation[] {
  const electronegativity = measurement.atoms.map((i): Entry => {
    const symbol = molecule.atoms[i]?.element
    const element = elements.find((e) => e.symbol === symbol)
    if (!element) throw new Error(`no element data for ${symbol}`)
    return ['Electronegativity', element.electronegativity.sourceId]
  })
  return citations([...geometryEntries(molecule, measurement), ...electronegativity], sources)
}

function geometryEntries(molecule: Molecule, measurement: Measurement): Entry[] {
  const { cited } = measurement
  if (!cited) return [['Atom coordinates of the model', molecule.sourceId]]
  return [
    ['Atom coordinates of the model', molecule.sourceId],
    // A value that follows from symmetry alone rests on the point group its source states, not on a figure read
    // there. One the source prints and the point group fixes rests on both.
    ...(cited.published !== undefined || !cited.symmetry ? [[CITED_LABEL[measurement.kind], cited.sourceId] as const] : []),
    ...(cited.symmetry ? [[`Point group of the molecule (${cited.symmetry})`, cited.sourceId] as const] : []),
  ]
}

/**
 * The sources of the titration lab's record: each constant of the model, and for each bottle the classification
 * its hazard statements are read from and the sheet, or the two sheets, behind the note on the strength used.
 */
export function titrationCitations(data: TitrationData, sources: readonly Source[]): Citation[] {
  const { bottles, constants } = data
  return citations(
    [
      ['Ion product of water', constants.waterIonProduct.sourceId],
      ...constants.indicatorPKas.map((pKa): Entry => ['Acid constants of phenolphthalein', pKa.sourceId]),
      ['Molar mass of phenolphthalein', constants.indicatorMolarMass.sourceId],
      ['Strength of the indicator solution', constants.indicatorStrength.sourceId],
      ['Volume of one drop of indicator', constants.indicatorDropVolume.sourceId],
      ["Henry's law constant of carbon dioxide in water", constants.henryCo2.sourceId],
      [`Carbon dioxide in air, ${constants.atmosphericCo2.year}`, constants.atmosphericCo2.sourceId],
      ...constants.carbonicPKas.map((pKa): Entry => ['Acid constants of carbonic acid', pKa.sourceId]),
      ...[bottles.hcl, bottles.naoh, bottles.indicator].flatMap(({ name, hazards }): Entry[] => [
        [`${name}: hazard classification`, hazards.sourceId],
        [`${name}: hazards at the strength used`, hazards.note.sourceId],
        ...(hazards.note.alsoSourceId === undefined ? [] : [[`${name}: hazards at the strength used`, hazards.note.alsoSourceId] as const]),
      ]),
    ],
    sources,
  )
}

/**
 * The sources behind one station of the aqueous reactions lab (spec 5.1): its two reagents and their hazards, the
 * species of its equations, the solubility of each pair of its ions, the look of what forms, what its temperature
 * rise is worked out with, and its notes.
 */
export function stationCitations(data: AqueousData, stationId: string, sources: readonly Source[]): Citation[] {
  const station = data.stations.find((s) => s.id === stationId)
  if (!station) throw new Error(`no station "${stationId}"`)
  const reagents = station.reagentIds.map((id) => data.reagents.find((r) => r.id === id)!)
  const terms = Object.values(station.equations).flatMap((equation) => (equation ? [...equation.reactants, ...equation.products] : []))
  const speciesIds = [...new Set([...reagents.flatMap((r) => [...r.ions.map((ion) => ion.speciesId), ...(r.speciesId ? [r.speciesId] : [])]), ...terms.map((term) => term.speciesId)])]
  const species = speciesIds.map((id) => data.species.find((s) => s.id === id)!)
  const formed = [station.expected.precipitate, station.expected.gas].flatMap((id) => data.observations.filter((o) => o.productId === id))
  const heated = station.expected.temperature !== 'none'
  const also = (label: string, cited: { sourceId: string; alsoSourceId?: string }): Entry[] => [[label, cited.sourceId], ...(cited.alsoSourceId === undefined ? [] : [[label, cited.alsoSourceId] as const])]
  return citations(
    [
      ...reagents.flatMap((r): Entry[] => [
        [`${r.name}: the compound`, r.sourceId],
        ...(r.molarMass ? [[`${r.name}: molar mass`, r.molarMass.sourceId] as const] : []),
        ...(r.appearance ? [[`${r.name}: appearance`, r.appearance.sourceId] as const] : []),
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...also(`${r.name}: hazards at the strength used`, r.hazards.note),
      ]),
      ...species.map((s): Entry => ['Formulas, charges and states of the species', s.sourceId]),
      ...species.flatMap((s): Entry[] => (s.solutionColor ? [['Colours of the ions in solution', s.solutionColor.sourceId]] : [])),
      ...data.solubility.filter((row) => speciesIds.includes(row.cationId) && speciesIds.includes(row.anionId)).map((row): Entry => ['Solubility of each pair of ions', row.sourceId]),
      ...data.activitySeries.filter((row) => speciesIds.includes(row.metalId)).map((row): Entry => ['Place of the metal in the activity series', row.sourceId]),
      ...formed.flatMap((row) => also('Colour, texture and odour of what forms', row)),
      ...(heated
        ? [
            ...species.flatMap((s): Entry[] => (s.enthalpyOfFormation ? [['Enthalpies of formation, for the temperature rise', s.enthalpyOfFormation.sourceId]] : [])),
            ['Heat capacity and density of the liquid, taken as water (idealised)', data.constants.solutionHeatCapacity.sourceId] as const,
            ['Heat capacity and density of the liquid, taken as water (idealised)', data.constants.solutionDensity.sourceId] as const,
          ]
        : []),
      ...station.notes.flatMap((note) => also('Notes on this station', note)),
    ],
    sources,
  )
}

/**
 * The sources behind one station of the flame test lab (spec 5.1): the solution and its hazards, the colour of its
 * flame, each line and band of its spectrum, what the strip leaves out and its notes; and, as every station rests
 * on them, what a handled loop carries and whose colour hides the others.
 */
export function flameCitations(data: FlameData, saltId: string, sources: readonly Source[]): Citation[] {
  const salt = data.salts.find((s) => s.id === saltId)
  if (!salt) throw new Error(`no salt "${saltId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string; moreSourceIds?: string[] }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  return citations(
    [
      [`${salt.name}: the solution`, salt.sourceId],
      [`${salt.name}: appearance`, salt.appearance.sourceId],
      [`${salt.name}: hazard classification`, salt.hazards.sourceId],
      ...all(`${salt.name}: hazards at the strength used`, salt.hazards.note),
      ...all('Colour of the flame', salt.flame),
      ...salt.features.flatMap((feature): Entry[] => [
        ...all('Lines and bands in the spectroscope, and what gives them', feature),
        ...(feature.kind === 'line' ? [feature.wavelengthNm, ...(feature.pairedWithNm ? [feature.pairedWithNm] : [])].map((line): Entry => ['Wavelengths of the atomic lines', line.sourceId]) : []),
      ]),
      ...salt.leftOut.map((left): Entry => ['What the strip leaves out', left.sourceId]),
      ...salt.notes.flatMap((note) => all('Notes on this station', note)),
      ...all('Sodium on a loop that has been handled', data.handling),
      ["Sodium's yellow hiding other colours", data.masking.sourceId],
    ],
    sources,
  )
}

/**
 * The sources behind one part of the calorimetry lab (spec 5.1): what is used in it and its hazards, the water's
 * specific heat and density, the enthalpies of formation its stored figure is worked out from, or the heat
 * capacities and molar masses behind the four metals' specific heats, and its notes. Part 3 lists all four metals
 * whichever the piece is, so the list says nothing of which it is.
 */
export function calorimetryCitations(data: CalorimetryData, partId: PartId, sources: readonly Source[]): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  // Types alone are taken from the lab's record, so that this file loads no lab's data: the four metals are found here as the record lists them.
  const used = part.id === 'metal' ? part.candidateIds : part.amounts.map((amount) => amount.reagentId)
  const reagents = used.flatMap((id) => data.reagents.filter((r) => r.id === id))
  const sum = 'enthalpy' in part ? [...part.enthalpy.terms, ...part.enthalpy.infiniteDilution.terms] : []
  return citations(
    [
      ...reagents.flatMap((r): Entry[] => [
        [`${r.name}: the substance`, r.sourceId],
        ...(r.form === 'solution' ? [] : [[`${r.name}: molar mass`, r.molarMass.sourceId] as const]),
        ...(r.form === 'solid' ? [[`${r.name}: appearance`, r.appearance.sourceId] as const] : []),
        ...(r.form === 'metal' ? [[`${r.name}: heat capacity of a mole, for its specific heat`, r.molarHeatCapacity.sourceId] as const] : []),
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(r.form === 'solution' ? `${r.name}: hazards at the strength used` : `${r.name}: hazards as it is used here`, r.hazards.note),
      ]),
      ['Specific heat and density of water, taken for every solution too (idealised)', data.water.specificHeat.sourceId],
      ['Specific heat and density of water, taken for every solution too (idealised)', data.water.density.sourceId],
      ...sum.map((term): Entry => ['Enthalpies of formation, for the figure the lab holds', term.enthalpyOfFormation.sourceId]),
      ...('enthalpy' in part ? all('Enthalpies of formation, for the figure the lab holds', part.enthalpy.note) : []),
      ...part.notes.flatMap((note) => all('Notes on this part', note)),
    ],
    sources,
  )
}

/**
 * The sources behind one step of the Group I cations lab (spec 5.1): the bottles it adds from and their hazards,
 * the rules its actions follow, what the things it makes or leaves are and look like, the numbers the build
 * checks it with, its net ionic equations and its notes. The list is the scheme's and is the same whatever a
 * sample holds, and no label in it names a substance: what a solid is, is said in the notes of a step that is done.
 */
export function cationsCitations(data: CationsData, stepId: StepId, sources: readonly Source[]): Citation[] {
  const step = data.steps.find((s) => s.id === stepId)
  if (!step) throw new Error(`no step "${stepId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const reagents = step.reagentIds.flatMap((id) => data.reagents.filter((r) => r.id === id))
  // Step 1 is worked on the sample, which is made from the three nitrate solutions whichever of them an unknown holds.
  const bottles = step.id === 'precipitate' ? [...data.ions.flatMap((ion) => data.reagents.filter((r) => r.id === ion.reagentId)), ...reagents] : reagents
  const rules = step.ruleIds.flatMap((id) => data.rules.filter((r) => r.id === id))
  const substances = step.substanceIds.flatMap((id) => data.substances.filter((s) => s.id === id))
  const equilibria = step.equilibriumIds.flatMap((id) => data.equilibria.filter((e) => e.id === id))
  const energies = equilibria.flatMap((e) => e.terms.flatMap((term) => data.gibbs.filter((g) => g.id === term.gibbsId)))
  const NUMBERS = "Numbers the build checks this step's rules with"
  const lead = data.leadChloride
  return citations(
    [
      ...bottles.flatMap((r): Entry[] => [
        [`${r.name}: the solution`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(`${r.name}: hazards at the strength used`, r.hazards.note),
      ]),
      ...rules.flatMap((rule) => all('What happens at this step', rule)),
      ...substances.flatMap((s): Entry[] => [['What the solids and the dissolved things of this step are', s.sourceId], ...(s.look ? all('What they look like', s.look) : [])]),
      ...energies.map((g): Entry => [NUMBERS, g.sourceId]),
      ...(equilibria.length > 0 ? [[NUMBERS, data.constants.gasConstant.sourceId] as const] : []),
      ...(step.id === 'extract-lead' ? [[NUMBERS, lead.solubilityCold.sourceId] as const, [NUMBERS, lead.solubilityHot.sourceId] as const, ...lead.atomicWeights.map((w): Entry => [NUMBERS, w.sourceId]), ...all(NUMBERS, lead.note)] : []),
      ...(step.id === 'confirm-lead' ? [[NUMBERS, data.leadChromate.solubilityProduct.sourceId] as const] : []),
      ...step.equations.flatMap((equation) => all('Net ionic equations', equation)),
      ...step.notes.flatMap((note) => all('Notes on this step', note)),
      ...all('Where each ion goes: the flow chart', data.chart),
    ],
    sources,
  )
}

/**
 * The sources behind one disturbance of the Le Chatelier's principle lab (spec 5.1): the bottles its tube was made
 * up from and the bottle it adds from, with their hazards; its equilibrium as written and what stands on each
 * side of it; the rules that say what the tube shows; the numbers the build checks the tube with; what the tube
 * shows, where that is a stored observation; and its equations and notes. No label in the list says what the tube
 * shows or which way the equilibrium goes: that is said in the notes of a disturbance that is done.
 */
export function lechatelierCitations(data: LechatelierData, disturbanceId: DisturbanceId, sources: readonly Source[]): Citation[] {
  const system = data.systems.find((s) => s.disturbances.some((d) => d.id === disturbanceId))
  const disturbance = system?.disturbances.find((d) => d.id === disturbanceId)
  if (!system || !disturbance) throw new Error(`no disturbance "${disturbanceId}"`)
  const all = (label: string, cited: { sourceId?: string | undefined; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [...(cited.sourceId === undefined ? [] : [cited.sourceId]), ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  // The tube the disturbance is done in, or the tube that one is a share of: what went into it to begin with.
  const tube = system.tubes.find((t) => t.id === disturbance.tube)
  const made = tube && 'shareOf' in tube ? system.tubes.find((t) => t.id === tube.shareOf) : tube
  const madeFrom = made && 'contents' in made ? made.contents.map((c) => c.reagentId) : []
  // Every bottle that has gone into the tube by the end of this disturbance: those of the disturbances before it on the same tube, and its own.
  const before = system.disturbances.slice(0, system.disturbances.indexOf(disturbance) + 1).filter((d) => d.tube === disturbance.tube || d.tube === made?.id)
  const addedFrom = before.flatMap((d) => (d.action.kind === 'add' ? [d.action.reagentId] : []))
  const bottles = [...new Set([...madeFrom, ...addedFrom])].flatMap((id) => data.reagents.filter((r) => r.id === id))
  const equilibrium = data.equilibria.find((e) => e.id === disturbance.equilibriumId)!
  const substances = equilibrium.substanceIds.flatMap((id) => data.substances.filter((s) => s.id === id))
  const rules = disturbance.ruleIds.flatMap((id) => data.rules.filter((r) => r.id === id))
  const constants = disturbance.constantIds.flatMap((id) => data.equilibriumConstants.filter((c) => c.id === id))
  const energies = constants.flatMap((c) => c.terms.flatMap((term) => data.gibbs.filter((g) => g.id === term.gibbsId)))
  const heat = equilibrium.heat?.heatId === undefined ? undefined : data.heats.find((h) => h.id === equilibrium.heat!.heatId)
  const heated = disturbance.action.kind !== 'add'
  const NUMBERS = "Numbers the build checks this tube with"
  const lead = data.leadChloride
  return citations(
    [
      ...bottles.flatMap((r): Entry[] => [
        [`${r.name}: what is in the bottle`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(r.form === 'solid' ? `${r.name}: hazards as it is used here` : `${r.name}: hazards at the strength used`, r.hazards.note),
      ]),
      ...all('The equilibrium as written', equilibrium),
      ...substances.flatMap((s): Entry[] => [['What stands on each side of it', s.sourceId], ...(s.look ? all('The colours that tell the two sides apart', s.look) : [])]),
      ...(heated && equilibrium.heat ? [['Which way takes heat in', equilibrium.heat.sourceId] as const] : []),
      ...(heated && heat ? heat.terms.flatMap((term) => data.enthalpies.filter((e) => e.id === term.enthalpyId)).map((e): Entry => ['Which way takes heat in', e.sourceId]) : []),
      ...rules.flatMap((rule) => all('What happens in this tube', rule)),
      ...(made && 'contents' in made ? all('What the tube shows', made.shows) : []),
      ...disturbance.stages.flatMap((stage) => all('What the tube shows', stage)),
      ...energies.map((g): Entry => [NUMBERS, g.sourceId]),
      ...(constants.length > 0 ? [[NUMBERS, data.constants.gasConstant.sourceId] as const] : []),
      ...(system.id === 'lead-chloride' ? [[NUMBERS, lead.solubilityCold.sourceId] as const, [NUMBERS, lead.solubilityHot.sourceId] as const, ...lead.atomicWeights.map((w): Entry => [NUMBERS, w.sourceId]), ...all(NUMBERS, lead.note)] : []),
      ...(system.id === 'methyl-violet' ? [[NUMBERS, data.indicator.range.from.sourceId] as const, [NUMBERS, data.indicator.range.to.sourceId] as const, ...Object.values(data.indicator.looks).flatMap((look) => all("The indicator's colours", look)), ...all("The indicator's colours", data.indicator.note)] : []),
      ...(disturbance.equations ?? []).flatMap((equation) => all('Equations', equation)),
      ...disturbance.notes.flatMap((note) => all('Notes on this disturbance', note)),
    ],
    sources,
  )
}

/**
 * The sources behind one part of the clock reaction lab (spec 5.1): the bottles and their hazards; the two
 * reactions and the count between them; the mixtures and, for part 3, the baths; what the liquid looks like before
 * and after; and, for the two parts with a notebook, the rate record and the constants their arithmetic uses. The
 * notes of a part are listed with it. No label in the list gives an order, the rate constant or the activation
 * energy: those are said in the notes of a part that is done.
 */
export function clockCitations(data: ClockData, partId: ClockPartId, sources: readonly Source[]): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const { rateLaw } = data
  const RATE_LAW = 'The rate law the lab holds, and its rate constant'
  return citations(
    [
      ...data.reagents.flatMap((r): Entry[] => [
        [`${r.name}: what is in the bottle`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(`${r.name}: hazards at the strength used`, r.hazards.note),
      ]),
      ...data.reactions.flatMap((reaction) => all('The two reactions', reaction)),
      ['How many thiosulfate ions go with one bromate ion', data.count.sourceId],
      ['What ends a run, and how it is seen', rateLaw.end.sourceId],
      ...all('What the liquid looks like before and after', rateLaw.end.before),
      ...all('What the liquid looks like before and after', rateLaw.end.after),
      ...data.mixtures.map((mixture): Entry => ['The five mixtures', mixture.sourceId]),
      ...(partId === 'temperature' ? data.baths.map((bath): Entry => ['The three baths', bath.sourceId]) : []),
      ...(partId === 'runs' ? [] : [...rateLaw.reactants.flatMap((reactant) => all(RATE_LAW, reactant.order)), ...all(RATE_LAW, rateLaw.note), [RATE_LAW, rateLaw.rateConstant.sourceId] as const]),
      ...(partId === 'temperature' ? [['The gas constant', data.constants.gasConstant.sourceId] as const, ['Kelvin from degrees Celsius', data.constants.zeroCelsius.sourceId] as const] : []),
      ...part.notes.flatMap((note) => all('Notes on this part', note)),
    ],
    sources,
  )
}

/**
 * The sources behind one part of the iodination of acetone lab (spec 5.1): the bottles and their hazards; the
 * reaction; the mixtures; what the liquid looks like before and after; and, for the part with the notebook, the
 * rate record and the constants the model works the rate constant at the room's temperature with. The notes of a
 * part are listed with it. No label in the list gives an order, the rate constant or the activation energy: those
 * are said in the notes of a part that is done.
 */
export function acetoneCitations(data: AcetoneData, partId: AcetonePartId, sources: readonly Source[]): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const { rateLaw, constants } = data
  const RATE_LAW = 'The rate law the lab holds, its rate constant and how that changes with temperature'
  return citations(
    [
      ...data.reagents.flatMap((r): Entry[] => [
        [`${r.name}: what is in the bottle`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(`${r.name}: hazards at the strength used`, r.hazards.note),
      ]),
      ...all('The reaction', data.reaction),
      ['What ends a run, and how it is seen', rateLaw.end.sourceId],
      ...all('What the liquid looks like before and after', rateLaw.end.before),
      ...all('What the liquid looks like before and after', rateLaw.end.after),
      ...data.mixtures.map((mixture): Entry => ['The four mixtures', mixture.sourceId]),
      ...(partId === 'runs'
        ? []
        : [
            ...rateLaw.reactants.flatMap((reactant) => all(RATE_LAW, reactant.order)),
            ...all(RATE_LAW, rateLaw.note),
            [RATE_LAW, rateLaw.rateConstant.sourceId] as const,
            [RATE_LAW, rateLaw.activationEnergy.sourceId] as const,
            [RATE_LAW, constants.joulesPerCalorie.sourceId] as const,
            ['The gas constant', constants.gasConstant.sourceId] as const,
            ['Kelvin from degrees Celsius', constants.zeroCelsius.sourceId] as const,
          ]),
      ...part.notes.flatMap((note) => all('Notes on this part', note)),
    ],
    sources,
  )
}

type CitedText = { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }
const everySource = (label: string, cited: CitedText): Entry[] => [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
const bottleEntries = (reagent: CabbageData['reagents'][number]): Entry[] => [[`${reagent.name}: hazard classification`, reagent.hazards.sourceId], ...everySource(`${reagent.name}: hazards at the strength used`, reagent.hazards.note)]

/**
 * The sources behind the red cabbage pH lab's scale (spec 5.1): the indicator's colours, the two buffers at the
 * ends of the scale and the indicator as bottles, the constant behind what a unit means, and the notes of the
 * first and the last part. No label gives the colour of a tube.
 */
export function cabbageScaleCitations(data: CabbageData, sources: readonly Source[]): Citation[] {
  const ends = data.scale.buffers.flatMap((buffer) => data.reagents.filter((r) => r.id === buffer.reagentId))
  return citations(
    [
      ...data.indicator.colours.map((colour): Entry => ['The colours of the indicator and the pH of each', colour.sourceId]),
      ...everySource('The colours of the indicator and the pH of each', data.indicator.note),
      ...[...ends, ...data.reagents.filter((r) => r.id === data.indicator.reagentId)].flatMap(bottleEntries),
      ...data.parts[0].notes.flatMap((note) => everySource('Notes on the scale', note)),
      ...data.parts[2].notes.flatMap((note) => everySource('Notes on what a unit means', note)),
    ],
    sources,
  )
}

/**
 * The sources behind one household thing: its range of pH and what that range is worked out from, its note, what
 * is seen where the dye is destroyed, and its hazards where it is a laboratory chemical. The list names where a
 * range is from and never the range, so it can be shown before the meter is read.
 */
export function cabbageThingCitations(data: CabbageData, thingId: ThingId, sources: readonly Source[]): Citation[] {
  const thing = data.things.find((t) => t.id === thingId)
  if (!thing) throw new Error(`no thing "${thingId}"`)
  const { ph } = thing
  const RANGE = `${thing.name}: its usual pH`
  const { constants } = data
  const reagent = data.reagents.find((r) => r.id === thing.reagentId)
  return citations(
    [
      ...(ph.basis === 'document'
        ? ([[RANGE, ph.low.sourceId], [RANGE, ph.high.sourceId]] as const)
        : ([
            [`${thing.name}: its strength as sold`, ph.percent.low.sourceId],
            [`${thing.name}: its strength as sold`, ph.percent.high.sourceId],
            [`The formula weight of ${ph.solute.name}`, ph.solute.formulaWeight.sourceId],
            ['The constants its pH is worked out with', constants.pKw.sourceId],
            ...(ph.rule === 'weak-base' ? ([['The constants its pH is worked out with', constants.ammoniaPKb.sourceId]] as const) : []),
            ...(ph.rule === 'salt-of-weak-acid' ? ([['The constants its pH is worked out with', constants.hypochlorousPKa.sourceId]] as const) : []),
          ] as const)),
      ...everySource(`${thing.name}: notes`, thing.note),
      ...(thing.bleaches ? everySource('What is seen where the dye is destroyed', data.indicator.bleached) : []),
      ...(reagent ? bottleEntries(reagent) : []),
      ...data.parts[1].notes.flatMap((note) => everySource('Notes on the household things', note)),
    ],
    sources,
  )
}

/**
 * The sources behind one part of the measurement and density lab (spec 5.1): for part 1 the melting point of ice
 * and its notes; for parts 2 and 3 every row of the table shown beside the unknown, the water's density that the
 * relative densities are worked out with, the things the unknown may be with their hazards, and the part's notes.
 * A part lists every candidate and every thing the unknown may be, whichever it is, so the list says nothing of
 * which it is.
 */
export function densityCitations(data: DensityData, partId: DensityPartId, sources: readonly Source[]): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const notes = part.notes.flatMap((note) => all('Notes on this part', note))
  if (part.id === 'reading') return citations([['The melting point of ice', data.constants.icePoint.sourceId], ...notes], sources)
  const rows = (part.id === 'liquid' ? data.liquids : data.metals).filter((row) => part.candidateIds.includes(row.id))
  const reagents = data.reagents.filter((r) => part.unknownIds.includes(r.tableId))
  return citations(
    [
      ...rows.map((row): Entry => [`${row.name}: density at ${row.temperature}`, row.printed.sourceId]),
      ...(part.id === 'liquid' ? [['Density of water at 20 °C, for the densities a source gives relative to water', data.water.density.sourceId] as const] : []),
      ...reagents.flatMap((r): Entry[] => [
        [`${r.name}: the substance`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(`${r.name}: hazards as it is used here`, r.hazards.note),
      ]),
      ...notes,
    ],
    sources,
  )
}

/**
 * The sources behind one part of the freezing point depression lab (spec 5.1): for part 1 its notes; for parts 2
 * and 3 the freezing point constant, the atomic weights the molar masses of the table are worked out from, every
 * liquid the unknown may be or every solute of part 3 with its hazards, the measured freezing points the notes
 * rest on, and the part's notes. Part 2 lists every liquid, whichever the unknown is, so the list says nothing of
 * which it is.
 */
export function freezingCitations(data: FreezingData, partId: FreezingPartId, sources: readonly Source[]): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const notes = part.notes.flatMap((note) => all('Notes on this part', note))
  if (part.id === 'water') return citations(notes, sources)
  const ids: readonly string[] = part.id === 'unknown' ? part.candidateIds : part.soluteIds
  const reagents = data.reagents.filter((r) => ids.includes(r.id))
  const symbols = new Set(reagents.flatMap((r) => Object.keys(r.composition)))
  return citations(
    [
      ['Freezing point constant of water', data.water.freezingPointConstant.sourceId],
      ...data.atomicWeights.filter((w) => symbols.has(w.id)).map((w): Entry => ['Atomic weights, for the molar masses in the table', w.sourceId]),
      ...data.measured.filter((row) => ids.includes(row.reagentId)).map((row): Entry => [`${reagents.find((r) => r.id === row.reagentId)!.name}: a measured freezing point of its solution`, row.freezingPoint.sourceId]),
      ...reagents.flatMap((r): Entry[] => [
        [`${r.name}: the substance`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(`${r.name}: hazards as it is used here`, r.hazards.note),
      ]),
      ...notes,
    ],
    sources,
  )
}

/**
 * The sources behind one station of the types of reactions lab (spec 5.1): everything on its bench with its
 * hazards, what each vessel holds and shows, the kinds and their patterns, each equation and its tiles, the order
 * of the metals where the station asks for it, and the station's notes. `done` adds what is kept back until the
 * station counts: what is seen afterwards, the formulas on the tiles, the kind and the equation of each vessel, the
 * order and the notes. What is seen afterwards is an answer the learner records, and a source of it, or of a
 * tile's formula, is a page whose name can say what the reaction is ("Combination Reactions" behind the light of the
 * burning strip, a page on catalysts behind the peroxide's bubbles). So in Challenge the list names no source of an
 * answer before the answer is given: before, it holds the bench, what is there before, and the four kinds alike at
 * every station.
 */
export function reactionsCitations(data: ReactionsData, stationId: ReactionsStationId, sources: readonly Source[], done = true): Citation[] {
  const station = data.stations.find((s) => s.id === stationId)
  if (!station) throw new Error(`no station "${stationId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const reagents = data.reagents.filter((r) => station.reagentIds.includes(r.id))
  return citations(
    [
      ...reagents.flatMap((r): Entry[] => [
        [`${r.name}: the substance`, r.sourceId],
        [`${r.name}: hazard classification`, r.hazards.sourceId],
        ...all(`${r.name}: hazards as it is used here`, r.hazards.note),
      ]),
      ...station.vessels.flatMap((vessel): Entry[] => [
        ...(vessel.liquid === null ? [] : all('What the liquid looks like before', vessel.liquid)),
        ...(vessel.metal === null ? [] : all('What the metal looks like', vessel.metal.colour)),
      ]),
      ...data.kinds.map((kind): Entry => ['The four kinds of reaction and their patterns', kind.sourceId]),
      ...(done
        ? [
            ...station.vessels.flatMap((vessel): Entry[] => Object.values(vessel.after).flatMap((seen) => (seen === undefined ? [] : all('What is seen afterwards', seen)))),
            ...data.species.filter((s) => station.tiles.includes(s.id)).map((s): Entry => ['The formulas on the tiles', s.sourceId]),
            ...station.vessels.flatMap((vessel): Entry[] => [
              ...all('The kind of reaction', vessel.kind),
              ...(vessel.equation === null ? [] : all('The equation', vessel.equation)),
              ...(vessel.catalyst === undefined ? [] : all('The catalyst', vessel.catalyst)),
            ]),
            ...(station.order ? [['The order of the three metals', data.activity.sourceId] as const] : []),
            ...station.notes.flatMap((note) => all('Notes on this station', note)),
          ]
        : []),
    ],
    sources,
  )
}

const mixingAll = (label: string, cited: { sourceId?: string | undefined; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
  [...(cited.sourceId === undefined ? [] : [cited.sourceId]), ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
/** The documents behind the hazards of every bottle of the polarity and mixing lab that is a laboratory chemical: the rubbing alcohol. */
const mixingBottles = (data: MixingData, liquidIds: readonly string[]): Entry[] =>
  data.liquids
    .filter((liquid) => liquidIds.includes(liquid.id))
    .flatMap((liquid) => data.reagents.filter((r) => r.id === liquid.reagentId))
    .flatMap((r): Entry[] => [[`${r.name}: hazard classification`, r.hazards.sourceId], ...mixingAll(`${r.name}: hazards as it is used here`, r.hazards.note)])

/**
 * The sources behind one tube of the polarity and mixing lab (spec 5.1): a pair of liquids or a solid in a liquid.
 * `done` adds what is kept back until the tube counts: what each thing in it looks like, each liquid's strength and
 * density, what the outcome rests on, and the tube's note. Before that the list holds only the documents behind
 * the hazards of a bottle in the tube. What a tube shows is the answer the learner records, and a source of it can
 * be a page whose name says it (a lesson called for layers of liquids, a handout that asks whether an oil floats),
 * so the list names no source of an answer before the answer is given (spec 25.5).
 */
export function mixingTubeCitations(data: MixingData, tubeId: MixingTubeId, sources: readonly Source[], done = false): Citation[] {
  const pair = isPairId(tubeId) ? data.pairs.find((p) => p.id === tubeId) : undefined
  const solidTube = pair ? undefined : data.solidInLiquid.find((t) => t.id === tubeId)
  if (!pair && !solidTube) throw new Error(`no tube "${tubeId}"`)
  const liquidIds: readonly string[] = pair ? pair.liquidIds : [solidTube!.liquidId]
  const liquids = data.liquids.filter((liquid) => liquidIds.includes(liquid.id))
  const solid = data.solids.find((s) => s.id === solidTube?.solidId)
  return citations(
    [
      ...mixingBottles(data, liquidIds),
      ...(done
        ? [
            ...liquids.flatMap((liquid): Entry[] => [
              ...mixingAll(`${liquid.name}: what it looks like`, liquid.looks as { sourceId?: string }),
              ...(liquid.strength ? mixingAll(`${liquid.name}: its strength`, liquid.strength) : []),
              ...(pair ? mixingAll(`${liquid.name}: its density`, liquid.density) : []),
            ]),
            ...(solid ? mixingAll(`${solid.name}: what it looks like`, solid.looks) : []),
            ...(pair ? mixingAll('Whether the two liquids mix', pair.mix) : mixingAll('Whether the solid dissolves', solidTube!.dissolves)),
            ...mixingAll('Notes on this tube', (pair ?? solidTube!).note),
          ]
        : []),
    ],
    sources,
  )
}

/**
 * The sources behind one part of the polarity and mixing lab. `done` adds what is kept back until the part is done:
 * its notes and, for part 3, the family of each liquid and the answers to its two questions. Before that the list
 * holds only the documents behind the hazards of the bench's one laboratory chemical, so no liquid's family is on
 * the page before part 3 is done (spec 25.5).
 */
export function mixingPartCitations(data: MixingData, partId: MixingPartId, sources: readonly Source[], done = false): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  return citations(
    [
      ...mixingBottles(data, data.liquids.map((liquid) => liquid.id)),
      ...(done
        ? [
            ...(partId === 'rule'
              ? [...data.liquids.flatMap((liquid) => mixingAll(`${liquid.name}: its family`, liquid.family)), ...data.rule.questions.flatMap((question) => mixingAll('The two questions', question.answer))]
              : []),
            ...part.notes.flatMap((note) => mixingAll('Notes on this part', note)),
          ]
        : []),
    ],
    sources,
  )
}

/**
 * The sources behind one part of the endothermic and exothermic lab (spec 5.1). For a run of a salt: what the salt
 * is and looks like, how much of it dissolves, its hazards, and the water. `done` adds what is kept back until the
 * run counts: the tables its enthalpy is worked from, the atomic weights its molar mass is worked from, and its
 * notes. Which way a salt's temperature goes is the answer the learner records, and the notes' sources stand
 * beside sentences that say it, so the list names none of them before the answer is given (spec 26.5). Part 3
 * lists the two salts it asks about, and its notes' sources once it is done.
 */
export function hotcoldCitations(data: HotcoldData, partId: HotcoldPartId, sources: readonly Source[], done = false): Citation[] {
  const part = data.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`no part "${partId}"`)
  const all = (label: string, cited: { sourceId: string; alsoSourceId?: string | undefined; moreSourceIds?: string[] | undefined }): Entry[] =>
    [cited.sourceId, ...(cited.alsoSourceId === undefined ? [] : [cited.alsoSourceId]), ...(cited.moreSourceIds ?? [])].map((id): Entry => [label, id])
  const substance = (r: HotcoldData['reagents'][number]): Entry[] => [
    [`${r.name}: the substance`, r.sourceId],
    [`${r.name}: what it is`, r.chemicalName.sourceId],
  ]
  const notes = done ? part.notes.flatMap((note) => all('Notes on this part', note)) : []
  if (!('reagentId' in part)) return citations([...data.reagents.flatMap(substance), ...notes], sources)
  const salt = data.reagents.find((r) => r.id === part.reagentId)!
  const symbols = new Set(Object.keys(salt.composition))
  return citations(
    [
      ...substance(salt),
      [`${salt.name}: what it looks like`, salt.appearance.sourceId],
      [`${salt.name}: how much dissolves in water`, salt.solubility.sourceId],
      [`${salt.name}: hazard classification`, salt.hazards.sourceId],
      ...all(`${salt.name}: hazards as it is used here`, salt.hazards.note),
      ['The specific heat and the density of water', data.water.specificHeat.sourceId],
      ...(done
        ? [
            ...[...part.enthalpy.terms, ...('dry' in part ? part.dry.terms : [])].map((term): Entry => ["Enthalpies of formation, for the heat of dissolving the lab's cup runs on", term.enthalpyOfFormation.sourceId]),
            ...data.atomicWeights.filter((w) => symbols.has(w.id)).map((w): Entry => ['Atomic weights, for the molar mass the cup runs on', w.sourceId]),
          ]
        : []),
      ...notes,
    ],
    sources,
  )
}
