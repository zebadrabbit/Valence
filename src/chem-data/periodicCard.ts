import { CATEGORY_HEADING, description, GROUP_3_NOTE, located, openstaxPassage, type Description } from './periodic'
import type { Element, PeriodicElement } from './schema'

// What the element card of the periodic table says beyond the values themselves (periodic table spec 5.1, 5.3
// and 7): the labels of its rows, and the sentences that explain a row. The notes on single values are in the
// records, written in decisions.json; what is here holds for every element, or follows from a record by a rule.

type NoteRow = NonNullable<PeriodicElement['notes']>[number]['row']
/** A row of the card: a field of the record that a note can sit on, or one of the rows that take no note. */
export type CardRowId = 'symbol' | 'name' | 'atomicNumber' | 'group' | 'period' | 'block' | 'shells' | NoteRow

/** The label of every row but the atomic mass, whose label depends on its kind: see massLabel. */
export const CARD_LABELS: Readonly<Record<Exclude<CardRowId, 'atomicMass'>, string>> = {
  symbol: 'Symbol',
  name: 'Name',
  atomicNumber: 'Atomic number',
  group: 'Group',
  period: 'Period',
  block: 'Block',
  category: CATEGORY_HEADING,
  configuration: 'Electron configuration',
  shells: 'Electrons per shell (innermost first)',
  electronegativity: 'Electronegativity (Pauling scale)',
  covalentRadius: 'Covalent radius',
  vdwRadius: 'Van der Waals radius',
  ionizationEnergy: 'First ionization energy',
  electronAffinity: 'Electron affinity',
  oxidationStates: "Common oxidation states (PubChem's list, not complete)",
  // PubChem's "standard state" is the phase at 25 °C, not the thermodynamic standard state.
  standardState: 'State at room temperature (25 °C)',
  meltingPoint: 'Melting point',
  boilingPoint: 'Boiling point',
  density: 'Density',
  yearDiscovered: 'Year discovered (as PubChem lists it)',
}

/** How the card shows the year PubChem lists as "Ancient". */
export const ANCIENT = 'Known since ancient times'

/** The group of an f-block element (spec 5.4). */
export const NO_GROUP = 'No group number'

/** Atomic mass is two kinds (spec 5.1): a standard atomic weight, or the mass of the one isotope the label names. */
export function massLabel(element: PeriodicElement): string {
  const mass = element.atomicMass
  return mass.kind === 'standard-atomic-weight' ? 'Atomic mass (standard atomic weight)' : `Mass of the isotope ${element.name.toLowerCase()}-${mass.massNumber}`
}

/** For the 34 elements whose mass is that of one isotope: that there is no standard atomic weight, and whether the mass is an estimate. */
export function isotopeMassNote(element: PeriodicElement): Description | undefined {
  const mass = element.atomicMass
  if (mass.kind !== 'isotope-mass') return undefined
  return description(
    `${element.name} has no standard atomic weight, so the mass of one of its isotopes is shown.${mass.estimated ? ' This mass is an estimate: it has not been measured.' : ''}`,
    [
      ['ciaaw-abridged-2024', 'the table prints a dash in place of a standard atomic weight for 34 elements, this one among them.'],
      [
        'pubchem-periodic-table',
        "for each of those 34 the AtomicMass column holds the mass of one isotope, and rounding it to a whole number gives that isotope's mass number (docs/research/periodic-table/cross-check.md, sections 1.2 and 9.2).",
      ],
      ...(mass.estimated
        ? [
            [
              'pubchem-element-pages',
              "the isotope table on the element's page, from the IAEA Atomic Mass Data Center, gives this mass as estimated. The cross-check (section 9.2) says of the evaluation behind it: “A mass marked \"estimated\" was not measured: AME2020 derived it from trends in neighbouring nuclides.”",
            ] as const,
          ]
        : []),
    ],
  )
}

/** Shown with every van der Waals radius (spec 7): what the radius is, and that PubChem's values are not one consistent set. */
export const VDW_RADIUS_NOTE: Description = description(
  "A van der Waals radius is worked out from how closely atoms that are not bonded to each other come together in crystals. PubChem's values are not from a single study: they match more than one published set of radii, and about half match none of the sets they were compared with.",
  [
    [
      'mantina-2009',
      located(
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC3658832/',
        'section 1, “Introduction”',
        "Bondi's van der Waals radii refine those of Pauling, which were worked out from the distances between atoms in molecular crystals that touch without being bonded; and that giving an atom one radius is an approximation, because atoms in molecules are not spheres.",
      ),
    ],
    [
      'pubchem-element-pages',
      'the line “Van der Waals Atomic Radius” on each of the 99 pages that has one names Los Alamos National Laboratory as its source, and no study. Compared with five published sets (docs/research/periodic-table/units.md, section 5), 41 of the 99 values equal those of Mantina 2009, 7 equal those of Bondi 1964 where the two sets differ, 2 coincide with a value in a later set, and 49 match none.',
    ],
  ],
)

// The curated radii all cite one study. A source added there needs its name here before a sentence can give it.
const CURATED_RADIUS_SOURCES: Record<string, string> = { 'mantina-2009': 'the van der Waals radii of Mantina and co-workers (2009)' }

/**
 * Where the curated record of an element gives a van der Waals radius that differs from the table's (spec 5.3):
 * one sentence with the curated value, as the molecule pages print it and in the card's unit, and its source.
 */
export function curatedRadiusNote(element: PeriodicElement, curated: Element | undefined): Description | undefined {
  if (!curated || !element.vdwRadius) return undefined
  // The curated radii are in Å, to 0.01 Å; the table's are in pm.
  const pm = Math.round(curated.vdwRadius.value * 100)
  if (pm === element.vdwRadius.value) return undefined
  const sourceId = curated.vdwRadius.sourceId
  const source = CURATED_RADIUS_SOURCES[sourceId]
  if (!source) throw new Error(`no name for the source "${sourceId}" of a curated van der Waals radius`)
  return description(
    `This app's molecule pages use a different value for ${element.name.toLowerCase()}, ${curated.vdwRadius.value.toFixed(2)} Å (${pm} pm), from ${source}.`,
    [[sourceId, `the value stored for ${element.name.toLowerCase()} in the curated element record, which cites this source for it.`]],
  )
}

/** Shown with every electron affinity (spec 7): which sign means what, and where PubChem's values come from. */
export const ELECTRON_AFFINITY_NOTE: Description = description(
  "PubChem gives the energy released when the atom gains an electron, so a positive value means energy is given out. Some textbooks give the energy change instead, which has the opposite sign. PubChem's values are from a compilation published in 1990.",
  [
    ['pubchem-periodic-table', 'the page describes the column as “the energy released when an additional electron is attached to a neutral atom to form a singly charged negative ion”.'],
    openstaxPassage(
      '6.5',
      'the passage on electron affinity',
      'the electron affinity is the energy change when a gaseous atom gains an electron and becomes a negative ion, and that many elements have a negative electron affinity, meaning energy is given out as the atom takes up the electron.',
    ),
    [
      'pubchem-element-pages',
      'each page attributes its electron affinity to “R.T Myers, J. Chem. Edu., 1990, 67(4), 307” (recorded in docs/research/periodic-table/units.md, section 2; the kept extract of the pages holds the values but not the attribution, and the paper was not read).',
    ],
  ],
  'that every electron affinity in the table is a positive number',
)

// NIST reserves its rights in the database, so the help page is located and put in this project's words. What it
// says is recorded in docs/research/periodic-table/cross-check-recorded.md, section 9.8.
const NIST_MARKINGS = located(
  'https://physics.nist.gov/PhysRefData/ASD/Html/iehelp.html',
  'the help page of the ionization energy form, on square brackets and parentheses (read on 2026-10-03)',
  'square brackets mark an energy worked out from measured values by interpolation, extrapolation or a similar semi-empirical procedure, and that parentheses mark one that comes from a calculation from first principles or that otherwise does not rest on evaluated measurements.',
)

/** Shown with a first ionization energy that NIST marks as something other than measured (spec 7). */
export const IONIZATION_FLAG_NOTES: Readonly<Record<'semi-empirical' | 'theoretical', Description>> = {
  'semi-empirical': description(
    'NIST marks this value as semi-empirical: it was found by interpolation, extrapolation or a similar procedure that relies on some measured values.',
    [['nist-asd-ie-all', NIST_MARKINGS]],
  ),
  theoretical: description('NIST marks this value as theoretical: it comes from a calculation, or is otherwise not derived from evaluated experimental data.', [
    ['nist-asd-ie-all', NIST_MARKINGS],
  ]),
}

// The four elements the group 3 debate is about: the two this table puts in group 3, and the two PubChem does.
const GROUP_3_DEBATED = ['La', 'Ac', 'Lu', 'Lr']

/** On the group row of lanthanum, actinium, lutetium and lawrencium: a pointer to the page's note on group 3. */
export function group3Pointer(element: PeriodicElement): Description | undefined {
  if (!GROUP_3_DEBATED.includes(element.symbol)) return undefined
  return { text: 'Which elements belong in group 3 is debated: see the note on group 3.', sourceIds: GROUP_3_NOTE.sourceIds, support: GROUP_3_NOTE.support }
}

/** The caption of the card's shell diagram. A configuration PubChem marks as predicted or calculated gives a diagram labelled so. */
export function shellCaption(element: PeriodicElement): string {
  const { qualifier } = element.configuration
  return `Bohr model of a neutral, isolated ${element.name.toLowerCase()} atom: a simplified picture${qualifier ? `, drawn from a ${qualifier} configuration` : ''}`
}

/** What the card's Sources control says about the rows that cite nothing. */
export const CARD_DERIVED =
  'Group, period and block are worked out from the atomic number, by the rule the note on group 3 describes. The electrons per shell are counted from the electron configuration, and the rings are drawn from those counts; their sizes and spacing are not to scale.'
