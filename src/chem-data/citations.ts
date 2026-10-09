import type { Measurement } from './measure'
import { EMISSION_SCOPE_NOTE } from './element'
import type { Element, ElementSpectrum, Emission, MoDiagram, Molecule, Source } from './schema'
import type { AqueousData } from './aqueous/data'
import type { FlameData } from './flame/data'
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

/** What a drawn emission spectrum cites: its lines, and the note shown with every spectrum. */
function emissionEntries(emission: Emission | undefined): Entry[] {
  if (!emission) return []
  return [...emission.lines.map((line): Entry => ['Emission lines', line.sourceId]), ...EMISSION_SCOPE_NOTE.sourceIds.map((id): Entry => ['What the emission spectrum leaves out', id])]
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
