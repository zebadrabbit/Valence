import { describe, expect, it } from 'vitest'
import crossCheckRecorded from '../../docs/research/periodic-table/cross-check-recorded.md?raw'
import elementPages from '../../docs/research/periodic-table/sources/pubchem-element-pages-extract.json?raw'
import { CATEGORY_HEADING, elementPosition, GROUP_3_NOTE, periodicTable } from './periodic'
import {
  ANCIENT,
  CARD_DERIVED,
  CARD_LABELS,
  curatedRadiusNote,
  ELECTRON_AFFINITY_NOTE,
  group3Pointer,
  IONIZATION_FLAG_NOTES,
  isotopeMassNote,
  massLabel,
  NO_GROUP,
  shellCaption,
  VDW_RADIUS_NOTE,
} from './periodicCard'
import { registry } from './registry'
import type { PeriodicElement } from './schema'

const element = (symbol: string) => {
  const found = periodicTable.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}
const curated = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)
const symbolsWhere = (test: (e: PeriodicElement) => boolean) => periodicTable.filter(test).map((e) => e.symbol)
const sourceOf = (id: string) => registry.sources.find((s) => s.id === id)

type PageLine = { heading: string; name: string | null; text: string; source: string }
const savedPages = JSON.parse(elementPages) as Record<string, { lines: PageLine[] }>

describe('the labels of the element card', () => {
  it('head the oxidation states, the year and the family as the spec words them (5.1, 5.5, 7)', () => {
    expect(CARD_LABELS.oxidationStates).toBe("Common oxidation states (PubChem's list, not complete)")
    expect(CARD_LABELS.yearDiscovered).toBe('Year discovered (as PubChem lists it)')
    expect(CARD_LABELS.category).toBe(CATEGORY_HEADING)
  })

  it('say which radius and which electronegativity scale a row holds, and at what temperature the state is given', () => {
    expect(CARD_LABELS.vdwRadius).toBe('Van der Waals radius')
    expect(CARD_LABELS.covalentRadius).toBe('Covalent radius')
    expect(CARD_LABELS.electronegativity).toBe('Electronegativity (Pauling scale)')
    expect(CARD_LABELS.ionizationEnergy).toBe('First ionization energy')
    expect(CARD_LABELS.standardState).toBe('State at room temperature (25 °C)')
  })

  it('give every row a note can sit on a label of its own', () => {
    const noted = new Set(periodicTable.flatMap((e) => (e.notes ?? []).map((note) => note.row)))
    for (const row of noted) expect([row, row === 'atomicMass' ? massLabel(element('H')) : CARD_LABELS[row]]).toEqual([row, expect.stringMatching(/^[A-Z]/)])
    const labels = [...Object.values(CARD_LABELS), massLabel(element('H')), massLabel(element('Tc'))]
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('show "Ancient" in words, and say plainly that an f-block element has no group number', () => {
    expect(ANCIENT).toBe('Known since ancient times')
    expect(NO_GROUP).toBe('No group number')
  })
})

describe('the two kinds of atomic mass on the card', () => {
  const isotopes = periodicTable.filter((e) => e.atomicMass.kind === 'isotope-mass')

  it('labels a standard atomic weight as one, and the mass of an isotope with the isotope it is the mass of', () => {
    expect(massLabel(element('Na'))).toBe('Atomic mass (standard atomic weight)')
    expect(massLabel(element('Tc'))).toBe('Mass of the isotope technetium-97')
    expect(massLabel(element('Og'))).toBe('Mass of the isotope oganesson-295')
    for (const symbol of ['Bi', 'Th', 'Pa', 'U']) expect(massLabel(element(symbol))).toBe('Atomic mass (standard atomic weight)')
  })

  it('names, for each of the 34, the isotope whose mass number the printed mass rounds to', () => {
    expect(isotopes.length).toBe(34)
    for (const e of isotopes) expect(massLabel(e)).toBe(`Mass of the isotope ${e.name.toLowerCase()}-${Math.round(e.atomicMass.value)}`)
  })

  it('says of each of the 34 that it has no standard atomic weight, and of no other element', () => {
    expect(isotopeMassNote(element('Tc'))?.text).toBe('Technetium has no standard atomic weight, so the mass of one of its isotopes is shown.')
    for (const e of periodicTable) {
      const note = isotopeMassNote(e)
      expect([e.symbol, note !== undefined]).toEqual([e.symbol, e.atomicMass.kind === 'isotope-mass'])
      if (note) expect(note.text).toContain(`${e.name} has no standard atomic weight`)
    }
    for (const symbol of ['Na', 'Bi', 'Th', 'Pa', 'U']) expect(isotopeMassNote(element(symbol))).toBeUndefined()
  })

  it('says the mass is an estimate from lawrencium on, and not before', () => {
    expect(isotopeMassNote(element('Og'))?.text).toBe(
      'Oganesson has no standard atomic weight, so the mass of one of its isotopes is shown. This mass is an estimate: it has not been measured.',
    )
    const estimated = isotopes.filter((e) => isotopeMassNote(e)!.text.includes('estimate')).map((e) => e.symbol)
    expect(estimated).toEqual(symbolsWhere((e) => e.atomicNumber >= 103))
    expect(isotopeMassNote(element('Tc'))?.text).not.toContain('estimate')
  })

  it('cites CIAAW for the missing standard atomic weight and PubChem for the mass', () => {
    expect(isotopeMassNote(element('Tc'))?.sourceIds).toEqual(['ciaaw-abridged-2024', 'pubchem-periodic-table'])
    expect(isotopeMassNote(element('Og'))?.sourceIds).toEqual(['ciaaw-abridged-2024', 'pubchem-periodic-table', 'pubchem-element-pages'])
  })
})

describe('the sentence on the van der Waals radius', () => {
  it('says what the radius is and that the values are not from one study (spec 7)', () => {
    expect(VDW_RADIUS_NOTE.text).toBe(
      "A van der Waals radius is worked out from how closely atoms that are not bonded to each other come together in crystals. PubChem's values are not from a single study: they match more than one published set of radii, and about half match none of the sets they were compared with.",
    )
    expect(VDW_RADIUS_NOTE.sourceIds).toEqual(['mantina-2009', 'pubchem-element-pages'])
  })

  it("rests on pages that name a laboratory, not a study, for each of PubChem's 99 values", () => {
    const lines = Object.values(savedPages).flatMap((page) => page.lines.filter((line) => line.name === 'Van der Waals Atomic Radius'))
    expect(lines.length).toBe(99)
    expect(symbolsWhere((e) => e.vdwRadius !== undefined).length).toBe(99)
    expect(new Set(lines.map((line) => line.source))).toEqual(new Set(['Los Alamos National Laboratory, U.S. Department of Energy']))
  })

  it("is borne out by the 11 curated radii, all from one study: PubChem's value equals 9 of them and differs for hydrogen and fluorine", () => {
    expect(registry.elements.length).toBe(11)
    for (const e of registry.elements) expect([e.symbol, e.vdwRadius.sourceId]).toEqual([e.symbol, 'mantina-2009'])
    const differing = registry.elements.filter((e) => Math.round(e.vdwRadius.value * 100) !== element(e.symbol).vdwRadius?.value)
    expect(differing.map((e) => e.symbol)).toEqual(['H', 'F'])
  })
})

describe('the sentence giving the curated van der Waals radius (spec 5.3)', () => {
  it('gives the value the molecule pages use, in their unit and in the unit of the card, and names its source', () => {
    expect(curatedRadiusNote(element('F'), curated('F'))?.text).toBe(
      "This app's molecule pages use a different value for fluorine, 1.47 Å (147 pm), from the van der Waals radii of Mantina and co-workers (2009).",
    )
    expect(curatedRadiusNote(element('H'), curated('H'))?.text).toContain('for hydrogen, 1.10 Å (110 pm), from the van der Waals radii of Mantina and co-workers (2009).')
    expect(curatedRadiusNote(element('F'), curated('F'))?.sourceIds).toEqual(['mantina-2009'])
    expect(sourceOf('mantina-2009')?.citation).toMatch(/^Mantina, M\.;.* 2009,/)
  })

  it('is given only where the two values differ: for hydrogen and fluorine, and for no element without a curated record', () => {
    const noted = periodicTable.filter((e) => curatedRadiusNote(e, curated(e.symbol)) !== undefined).map((e) => e.symbol)
    expect(noted).toEqual(['H', 'F'])
    expect(curatedRadiusNote(element('Au'), undefined)).toBeUndefined()
  })

  it('does not name a source it has no words for', () => {
    const other = { ...curated('F')!, vdwRadius: { value: 1.47, sourceId: 'cordero-2008' } }
    expect(() => curatedRadiusNote(element('F'), other)).toThrow(/no name for the source "cordero-2008"/)
  })
})

describe('the sentence on electron affinity', () => {
  it('says which sign means energy released, that some textbooks use the other sign, and how old the values are (spec 7)', () => {
    expect(ELECTRON_AFFINITY_NOTE.text).toBe(
      "PubChem gives the energy released when the atom gains an electron, so a positive value means energy is given out. Some textbooks give the energy change instead, which has the opposite sign. PubChem's values are from a compilation published in 1990.",
    )
    expect(ELECTRON_AFFINITY_NOTE.sourceIds).toEqual(['pubchem-periodic-table', 'openstax-chem2e-6.5', 'pubchem-element-pages'])
  })

  it('holds for every value in the table: all 57 are positive', () => {
    const values = periodicTable.flatMap((e) => (e.electronAffinity ? [e.electronAffinity.value] : []))
    expect(values.length).toBe(57)
    expect(values.every((value) => value > 0)).toBe(true)
  })
})

describe("the sentences on NIST's marking of an ionization energy", () => {
  it('say what each marking means in the words of the help page, and that the value is not a plain measurement', () => {
    expect(IONIZATION_FLAG_NOTES['semi-empirical'].text).toBe(
      'NIST marks this value as semi-empirical: it was found by interpolation, extrapolation or a similar procedure that relies on some measured values.',
    )
    expect(IONIZATION_FLAG_NOTES.theoretical.text).toBe(
      'NIST marks this value as theoretical: it comes from a calculation, or is otherwise not derived from evaluated experimental data.',
    )
    expect(Object.keys(IONIZATION_FLAG_NOTES)).toEqual(['semi-empirical', 'theoretical'])
    for (const note of Object.values(IONIZATION_FLAG_NOTES)) expect(note.sourceIds).toEqual(['nist-asd-ie-all'])
  })

  it('quote the help page as the cross-check records it', () => {
    const quoted = /> (Some ionization energies are in square brackets.*)/.exec(crossCheckRecorded)?.[1]
    expect(quoted).toContain('Square brackets indicate the energies determined by interpolation, extrapolation, or other semi-empirical procedure relying on some known experimental values.')
    expect(quoted).toContain('Parentheses indicate energies that have been determined from an ab-initio calculation, or are otherwise not derived from evaluated experimental data.')
    for (const note of Object.values(IONIZATION_FLAG_NOTES)) expect(note.support).toContain(quoted)
  })

  it('apply to the ten energies NIST marks: hydrogen among the theoretical ones', () => {
    expect(symbolsWhere((e) => e.ionizationEnergy?.flag === 'theoretical')).toEqual(['H', 'Rf', 'Db'])
    expect(symbolsWhere((e) => e.ionizationEnergy?.flag === 'semi-empirical')).toEqual(['Pr', 'Pa', 'Fm', 'Md', 'Sg', 'Bh', 'Hs'])
  })
})

describe('the pointer to the note on group 3', () => {
  it('is on the four elements the debate is about, and on no other', () => {
    const pointed = periodicTable.filter((e) => group3Pointer(e) !== undefined)
    expect(pointed.map((e) => e.symbol)).toEqual(['La', 'Lu', 'Ac', 'Lr'])
    for (const e of pointed) expect(GROUP_3_NOTE.text).toContain(e.name.toLowerCase())
    expect(pointed.map((e) => elementPosition(e.atomicNumber).group)).toEqual([3, null, 3, null])
  })

  it('says the question is debated and where to read about it, with the sources of that note', () => {
    expect(group3Pointer(element('Lu'))?.text).toBe('Which elements belong in group 3 is debated: see the note on group 3.')
    expect(group3Pointer(element('La'))?.sourceIds).toEqual(GROUP_3_NOTE.sourceIds)
  })
})

describe('the caption of the shell diagram', () => {
  it('says the picture is of the neutral, isolated atom and is a simplification', () => {
    expect(shellCaption(element('F'))).toBe('Bohr model of a neutral, isolated fluorine atom: a simplified picture')
  })

  it('labels the diagram as predicted or calculated where the configuration is (spec 7)', () => {
    expect(shellCaption(element('Og'))).toBe('Bohr model of a neutral, isolated oganesson atom: a simplified picture, drawn from a predicted configuration')
    expect(shellCaption(element('Mt'))).toBe('Bohr model of a neutral, isolated meitnerium atom: a simplified picture, drawn from a calculated configuration')
    const labelled = symbolsWhere((e) => /predicted|calculated/.test(shellCaption(e)))
    expect(labelled).toEqual(symbolsWhere((e) => e.configuration.qualifier !== undefined))
    expect(labelled.length).toBe(10)
  })
})

describe('every sentence of the card', () => {
  const all = [
    ['van der Waals radius', VDW_RADIUS_NOTE] as const,
    ['electron affinity', ELECTRON_AFFINITY_NOTE] as const,
    ['semi-empirical', IONIZATION_FLAG_NOTES['semi-empirical']] as const,
    ['theoretical', IONIZATION_FLAG_NOTES.theoretical] as const,
    ['group 3 pointer', group3Pointer(element('La'))!] as const,
    ...periodicTable.flatMap((e) => {
      const note = isotopeMassNote(e)
      return note ? [[`mass of ${e.symbol}`, note] as const] : []
    }),
    ...registry.elements.flatMap((e) => {
      const note = curatedRadiusNote(element(e.symbol), e)
      return note ? [[`curated radius of ${e.symbol}`, note] as const] : []
    }),
  ]

  it('is a whole sentence, with at least one known source and the passage behind each source', () => {
    expect(all.length).toBe(5 + 34 + 2)
    for (const [what, note] of all) {
      expect([what, note.text]).toEqual([what, expect.stringMatching(/^[A-Z].*\.$/)])
      expect([what, note.text]).toEqual([what, expect.not.stringMatching(/ {2}|undefined|NaN/)])
      expect([what, note.sourceIds.length]).toEqual([what, expect.toSatisfy((n: number) => n >= 1)])
      expect(new Set(note.sourceIds).size).toBe(note.sourceIds.length)
      for (const id of note.sourceIds) {
        expect([what, id, sourceOf(id)?.id]).toEqual([what, id, id])
        expect([what, note.support]).toEqual([what, expect.stringContaining(`${id}: `)])
      }
    }
  })

  it('never writes a sign with a hyphen and never calls an empty value "not measured"', () => {
    for (const [what, note] of all) {
      expect([what, note.text]).toEqual([what, expect.not.stringMatching(/(^|[\s(])-\d/)])
      expect([what, note.text.toLowerCase()]).toEqual([what, expect.not.stringContaining('not measured')])
    }
  })

  it('says which rows the app works out itself', () => {
    expect(CARD_DERIVED).toContain('Group, period and block are worked out from the atomic number')
    expect(CARD_DERIVED).toContain('electrons per shell are counted from the electron configuration')
  })
})
