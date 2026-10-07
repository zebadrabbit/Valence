import type { Measurement } from './measure'
import type { Element, MoDiagram, Molecule, Source } from './schema'
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
      ...(element.emission?.lines.map((line): Entry => ['Emission lines', line.sourceId]) ?? []),
    ],
    sources,
  )
}

/** The source of the shell counts a Bohr diagram is drawn from. */
export function shellCitations(element: Element, sources: readonly Source[]): Citation[] {
  return citations([['Electrons per shell', element.shells.sourceId]], sources)
}

/**
 * The sources of the periodic table's element card: every row's sources under that row's label, then the
 * emission lines where the curated record of the element has them. A row the app works out cites nothing.
 */
export function periodicCitations(
  rows: readonly { label: string; sourceIds: readonly string[] }[],
  curated: Element | undefined,
  sources: readonly Source[],
): Citation[] {
  return citations(
    [
      ...rows.flatMap((row) => row.sourceIds.map((id): Entry => [row.label, id])),
      ...(curated?.emission?.lines.map((line): Entry => ['Emission lines', line.sourceId]) ?? []),
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
