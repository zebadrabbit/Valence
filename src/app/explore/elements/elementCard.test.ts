import { describe, expect, it } from 'vitest'
import { LIBRARY_INDEX } from '@/chem-data/libraryIndex'
import { CATEGORY_HEADING, NO_VALUE, periodicTable } from '@/chem-data/periodic'
import {
  ANCIENT,
  curatedRadiusNote,
  ELECTRON_AFFINITY_NOTE,
  group3Pointer,
  IONIZATION_FLAG_NOTES,
  isotopeMassNote,
  NO_GROUP,
  VDW_RADIUS_NOTE,
  type CardRowId,
} from '@/chem-data/periodicCard'
import { registry } from '@/chem-data/registry'
import { validatePeriodicTable } from '@/chem-data/validate'
import { elementCardRows, moleculesContaining } from './elementCard'
import { TRENDS, type TrendProperty } from './trend'

const element = (symbol: string) => {
  const found = periodicTable.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}
const curated = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)
const rows = (symbol: string) => elementCardRows(element(symbol), curated(symbol))
const row = (symbol: string, id: CardRowId) => {
  const found = rows(symbol).find((r) => r.id === id)
  if (!found) throw new Error(`the card of ${symbol} has no row ${id}`)
  return found
}
const noteOn = (symbol: string, id: CardRowId) => {
  const found = element(symbol).notes?.find((note) => note.row === id)
  if (!found) throw new Error(`${symbol} has no note on ${id}`)
  return found
}
const PUBCHEM = 'pubchem-periodic-table'
const PAGES = 'pubchem-element-pages'
// The rows the app works out and cites no source for.
const DERIVED: CardRowId[] = ['group', 'period', 'block', 'shells']

describe('elementCardRows', () => {
  it('lists the rows in the order of spec 7, the same for every element', () => {
    const ids = rows('F').map((r) => r.id)
    expect(ids).toEqual([
      'symbol',
      'name',
      'atomicNumber',
      'atomicMass',
      'group',
      'period',
      'block',
      'category',
      'configuration',
      'shells',
      'electronegativity',
      'covalentRadius',
      'vdwRadius',
      'ionizationEnergy',
      'electronAffinity',
      'oxidationStates',
      'standardState',
      'meltingPoint',
      'boilingPoint',
      'density',
      'yearDiscovered',
    ])
    for (const e of periodicTable) expect([e.symbol, elementCardRows(e, undefined).map((r) => r.id)]).toEqual([e.symbol, ids])
  })

  it('names the element and gives its symbol and atomic number from the table', () => {
    expect(rows('F').slice(0, 3)).toEqual([
      { id: 'symbol', label: 'Symbol', value: 'F', notes: [], sourceIds: [PUBCHEM] },
      { id: 'name', label: 'Name', value: 'Fluorine', notes: [], sourceIds: [PUBCHEM] },
      { id: 'atomicNumber', label: 'Atomic number', value: '9', notes: [], sourceIds: [PUBCHEM] },
    ])
  })

  describe('atomic mass (Review Focus 5)', () => {
    it("gives sodium's standard atomic weight in CIAAW's digits and cites CIAAW", () => {
      expect(row('Na', 'atomicMass')).toEqual({ id: 'atomicMass', label: 'Atomic mass (standard atomic weight)', value: '22.990 u', notes: [], sourceIds: ['ciaaw-abridged-2024'] })
    })

    it("reads technetium's as the mass of technetium-97 and says there is no standard atomic weight", () => {
      const mass = row('Tc', 'atomicMass')
      expect(mass.label).toBe('Mass of the isotope technetium-97')
      expect(mass.value).toBe('96.90636 u')
      expect(mass.note).toBe(isotopeMassNote(element('Tc'))!.text)
      expect(mass.note).toContain('Technetium has no standard atomic weight')
      expect(mass.note).not.toContain('estimate')
      expect(mass.sourceIds).toEqual([PUBCHEM, 'ciaaw-abridged-2024'])
    })

    it("says oganesson's mass is an estimate, and carries the note that CIAAW lists another isotope", () => {
      const mass = row('Og', 'atomicMass')
      expect(mass.label).toBe('Mass of the isotope oganesson-295')
      expect(mass.note).toContain('This mass is an estimate')
      expect(mass.notes).toEqual([noteOn('Og', 'atomicMass').text])
      expect(mass.sourceIds).toEqual([PUBCHEM, 'ciaaw-abridged-2024', PAGES, 'ciaaw-radioactive-elements'])
    })

    it('has no isotope sentence for bismuth or uranium, which have a standard atomic weight', () => {
      for (const symbol of ['Bi', 'U']) {
        expect(row(symbol, 'atomicMass').label).toBe('Atomic mass (standard atomic weight)')
        expect(row(symbol, 'atomicMass').note).toBeUndefined()
        expect(row(symbol, 'atomicMass').notes).toEqual([])
      }
    })
  })

  describe('group, period, block and family', () => {
    it('are worked out from the atomic number and cite nothing', () => {
      expect(row('F', 'group')).toEqual({ id: 'group', label: 'Group', value: '17', notes: [], sourceIds: [] })
      expect(row('F', 'period')).toEqual({ id: 'period', label: 'Period', value: '2', notes: [], sourceIds: [] })
      expect(row('F', 'block')).toEqual({ id: 'block', label: 'Block', value: 'p', notes: [], sourceIds: [] })
      expect([row('He', 'group').value, row('He', 'block').value]).toEqual(['18', 's'])
    })

    it('give an f-block element no group number, in words and not as a missing value', () => {
      expect(row('Ce', 'group').value).toBe(NO_GROUP)
      expect([row('Ce', 'period').value, row('Ce', 'block').value]).toEqual(['6', 'f'])
      expect(periodicTable.filter((e) => elementCardRows(e, undefined).find((r) => r.id === 'group')!.value === NO_GROUP).length).toBe(28)
    })

    it('put lanthanum in group 3 and lutetium in none, and point both to the note on group 3', () => {
      expect([row('La', 'group').value, row('La', 'block').value]).toEqual(['3', 'd'])
      expect([row('Lu', 'group').value, row('Lu', 'block').value]).toEqual([NO_GROUP, 'f'])
      for (const symbol of ['La', 'Ac', 'Lu', 'Lr']) {
        expect(row(symbol, 'group').notes).toEqual([group3Pointer(element(symbol))!.text])
        expect(row(symbol, 'group').sourceIds).toEqual(group3Pointer(element(symbol))!.sourceIds)
      }
      expect(row('Sc', 'group').notes).toEqual([])
    })

    it("show PubChem's family under the legend's heading, with Nonmetal as other nonmetal", () => {
      expect(row('F', 'category')).toEqual({ id: 'category', label: CATEGORY_HEADING, value: 'Halogen', notes: [], sourceIds: [PUBCHEM] })
      expect(row('H', 'category').value).toBe('Other nonmetal')
      expect(row('Fe', 'category').value).toBe('Transition metal')
    })

    it("carry the notes on polonium's and astatine's families", () => {
      expect(row('Po', 'category').notes).toEqual([noteOn('Po', 'category').text])
      expect(row('At', 'category').notes).toEqual([noteOn('At', 'category').text])
      expect(row('Po', 'category').sourceIds).toEqual([PUBCHEM, PAGES])
    })
  })

  describe('configuration and shells', () => {
    it('show the configuration as published, with the word PubChem marks it with', () => {
      expect(row('F', 'configuration').value).toBe('[He]2s2 2p5')
      expect(row('Mt', 'configuration').value).toBe('[Rn]7s2 5f14 6d7 (calculated)')
      expect(row('Og', 'configuration').value).toBe('[Rn]7s2 7p6 5f14 6d10 (predicted)')
      expect(periodicTable.filter((e) => /\((predicted|calculated)\)$/.test(elementCardRows(e, undefined).find((r) => r.id === 'configuration')!.value)).length).toBe(10)
    })

    it("carry lawrencium's note that NIST gives a different ground state", () => {
      expect(row('Lr', 'configuration').notes).toEqual([noteOn('Lr', 'configuration').text])
      expect(row('Lr', 'configuration').sourceIds).toEqual([PUBCHEM, 'nist-asd-ie-all'])
    })

    it('give the electrons per shell as text, counted from the configuration', () => {
      expect(row('Xe', 'shells')).toEqual({ id: 'shells', label: 'Electrons per shell (innermost first)', value: '2, 8, 18, 18, 8', notes: [], sourceIds: [] })
      expect(row('H', 'shells').value).toBe('1')
      expect(row('Og', 'shells').value).toBe('2, 8, 18, 32, 32, 18, 8')
    })

    it('agree with the shells of the 11 curated elements', () => {
      for (const e of registry.elements) expect([e.symbol, row(e.symbol, 'shells').value]).toEqual([e.symbol, e.shells.value.join(', ')])
    })
  })

  describe('atomic properties', () => {
    it("print calcium's electronegativity as its source does: 1", () => {
      expect(row('Ca', 'electronegativity')).toEqual({ id: 'electronegativity', label: 'Electronegativity (Pauling scale)', value: '1', notes: [], sourceIds: [PUBCHEM] })
    })

    it('show an absent value with NO_VALUE, never as zero or blank, and cite nothing for it', () => {
      expect(row('He', 'electronegativity')).toEqual({ id: 'electronegativity', label: 'Electronegativity (Pauling scale)', value: NO_VALUE, notes: [], sourceIds: [] })
      expect(row('Og', 'density').value).toBe(NO_VALUE)
      expect(row('Es', 'covalentRadius').value).toBe(NO_VALUE)
      expect(row('Mt', 'ionizationEnergy').value).toBe(NO_VALUE)
      expect(row('Nh', 'oxidationStates')).toEqual({ id: 'oxidationStates', label: "Common oxidation states (PubChem's list, not complete)", value: NO_VALUE, notes: [], sourceIds: [] })
      expect(row('Fm', 'vdwRadius')).toEqual({ id: 'vdwRadius', label: 'Van der Waals radius', value: NO_VALUE, notes: [], sourceIds: [] })
    })

    it('give a radius with its unit and the covalent radius from the element pages, with the note where the source lists several', () => {
      expect(row('F', 'covalentRadius')).toEqual({ id: 'covalentRadius', label: 'Covalent radius', value: '57 pm', notes: [], sourceIds: [PAGES] })
      expect(row('Fe', 'covalentRadius').value).toBe('132 pm')
      expect(row('Fe', 'covalentRadius').notes).toEqual([noteOn('Fe', 'covalentRadius').text])
      expect(row('C', 'covalentRadius').notes[0]).toContain('The first listed, sp³, is shown.')
    })

    it('say with every van der Waals radius what it is and that the values come from more than one study', () => {
      expect(row('Na', 'vdwRadius')).toEqual({
        id: 'vdwRadius',
        label: 'Van der Waals radius',
        value: '227 pm',
        note: VDW_RADIUS_NOTE.text,
        notes: [],
        sourceIds: [PUBCHEM, 'mantina-2009', PAGES],
      })
      expect(row('Fe', 'vdwRadius').note).toBe(VDW_RADIUS_NOTE.text)
    })

    it("show the table's van der Waals radius for hydrogen and fluorine, with one sentence giving the curated value and its source (spec 5.3)", () => {
      for (const [symbol, shown, sentence] of [
        ['H', '120 pm', '1.10 Å (110 pm)'],
        ['F', '135 pm', '1.47 Å (147 pm)'],
      ] as const) {
        const radius = row(symbol, 'vdwRadius')
        expect(radius.value).toBe(shown)
        expect(radius.notes).toEqual([curatedRadiusNote(element(symbol), curated(symbol))!.text])
        expect(radius.notes[0]).toContain(sentence)
        expect(radius.notes[0]).toContain('Mantina and co-workers (2009)')
        expect(radius.sourceIds).toContain('mantina-2009')
      }
    })

    it('give that sentence for no other curated element, and for none when there is no curated record', () => {
      const noted = registry.elements.filter((e) => row(e.symbol, 'vdwRadius').notes.length > 0).map((e) => e.symbol)
      expect(noted).toEqual(['H', 'F'])
      expect(elementCardRows(element('F'), undefined).find((r) => r.id === 'vdwRadius')!.notes).toEqual([])
    })

    it("print the first ionization energy in NIST's digits and cite NIST", () => {
      expect(row('F', 'ionizationEnergy')).toEqual({ id: 'ionizationEnergy', label: 'First ionization energy', value: '17.42282 eV', notes: [], sourceIds: ['nist-asd-ie-all'] })
      expect(row('C', 'ionizationEnergy').value).toBe('11.2602880 eV')
    })

    it('say so where NIST flags the energy as not measured', () => {
      expect(row('H', 'ionizationEnergy').value).toBe('13.598434599702 eV')
      expect(row('H', 'ionizationEnergy').notes).toEqual([IONIZATION_FLAG_NOTES.theoretical.text])
      expect(row('Pr', 'ionizationEnergy').notes).toEqual([IONIZATION_FLAG_NOTES['semi-empirical'].text])
      const flagged = periodicTable.filter((e) => elementCardRows(e, undefined).find((r) => r.id === 'ionizationEnergy')!.notes.length > 0).map((e) => e.symbol)
      expect(flagged).toEqual(['H', 'Pr', 'Pa', 'Fm', 'Md', 'Rf', 'Db', 'Sg', 'Bh', 'Hs'])
    })

    it('say with every electron affinity which sign means what and how old the values are', () => {
      expect(row('F', 'electronAffinity')).toEqual({
        id: 'electronAffinity',
        label: 'Electron affinity',
        value: '3.339 eV',
        note: ELECTRON_AFFINITY_NOTE.text,
        notes: [],
        sourceIds: [PUBCHEM, 'openstax-chem2e-6.5', PAGES],
      })
    })

    it('show an electron affinity the table leaves empty as NO_VALUE, with the note beside it', () => {
      const affinity = row('He', 'electronAffinity')
      expect(affinity.value).toBe(NO_VALUE)
      expect(affinity.note).toBeUndefined()
      expect(affinity.notes).toEqual([noteOn('He', 'electronAffinity').text])
      expect(affinity.notes[0]).toContain('0 eV')
      expect(affinity.sourceIds).toEqual([PAGES])
    })

    it('print oxidation states as PubChem lists them, with true minus signs', () => {
      expect(row('H', 'oxidationStates').value).toBe('+1, −1')
      expect(row('F', 'oxidationStates').value).toBe('−1')
      expect(row('As', 'oxidationStates').value).toBe('+5, +3, −3')
      expect(row('Fl', 'oxidationStates').value).toBe('6, 4,2, 1, 0')
      expect(row('F', 'oxidationStates').label).toBe("Common oxidation states (PubChem's list, not complete)")
    })

    it("carry xenon's note that the list shows 0 although compounds such as XeF₄ exist, and the predicted states of the heaviest elements", () => {
      expect(row('Xe', 'oxidationStates').value).toBe('0')
      expect(row('Xe', 'oxidationStates').notes).toEqual([noteOn('Xe', 'oxidationStates').text])
      expect(row('Xe', 'oxidationStates').notes[0]).toContain('XeF₄')
      expect(row('Og', 'oxidationStates').notes[0]).toContain('predictions')
    })
  })

  describe('state, temperatures, density and year', () => {
    it('show the state, and say so where PubChem words it as expected', () => {
      expect(row('Hg', 'standardState')).toEqual({ id: 'standardState', label: 'State at room temperature (25 °C)', value: 'Liquid', notes: [], sourceIds: [PUBCHEM] })
      expect(row('Og', 'standardState').value).toBe('Gas (expected)')
      expect(row('Og', 'standardState').notes).toEqual([noteOn('Og', 'standardState').text])
      expect(periodicTable.filter((e) => elementCardRows(e, undefined).find((r) => r.id === 'standardState')!.value.endsWith('(expected)')).length).toBe(9)
    })

    it("carry arsenic's note on a melting point above its boiling point, in a table that passes validation", () => {
      expect(row('As', 'meltingPoint').value).toBe('1090 K')
      expect(row('As', 'boilingPoint').value).toBe('887 K')
      expect(row('As', 'meltingPoint').notes).toEqual([noteOn('As', 'meltingPoint').text])
      expect(row('As', 'meltingPoint').notes[0]).toContain('Measured under pressure')
      expect(row('As', 'boilingPoint').notes).toEqual([noteOn('As', 'boilingPoint').text])
      expect(validatePeriodicTable(periodicTable, registry.sources)).toEqual([])
    })

    it("carry the gas note on a gas's density, and print the density in the source's digits", () => {
      expect(row('H', 'density').value).toBe('0.00008988 g/cm³')
      expect(row('H', 'density').notes[0]).toContain('hydrogen gas, H₂, at 0 °C and atmospheric pressure')
      expect(row('Xe', 'density').notes[0]).toContain('density of the gas at 0 °C and atmospheric pressure')
      const gases = periodicTable.filter((e) => e.standardState.state === 'Gas' && e.density)
      expect(gases.length).toBe(11)
      for (const e of gases) expect([e.symbol, row(e.symbol, 'density').notes[0]]).toEqual([e.symbol, expect.stringContaining('at 0 °C and atmospheric pressure')])
      expect(row('Fe', 'density')).toEqual({ id: 'density', label: 'Density', value: '7.874 g/cm³', notes: [], sourceIds: [PUBCHEM] })
    })

    it("read carbon's year as known since ancient times, and carry fluorine's note on its year", () => {
      expect(row('C', 'yearDiscovered')).toEqual({ id: 'yearDiscovered', label: 'Year discovered (as PubChem lists it)', value: ANCIENT, notes: [], sourceIds: [PUBCHEM] })
      expect(row('F', 'yearDiscovered').value).toBe('1670')
      expect(row('F', 'yearDiscovered').notes).toEqual([noteOn('F', 'yearDiscovered').text])
      expect(row('F', 'yearDiscovered').notes[0]).toContain('1886')
      expect(row('F', 'yearDiscovered').sourceIds).toEqual([PUBCHEM, PAGES])
    })
  })

  describe('for every element', () => {
    const all = periodicTable.map((e) => [e, elementCardRows(e, curated(e.symbol))] as const)

    it('puts each of its notes beside the row it qualifies, and nowhere else', () => {
      for (const [e, cardRows] of all) {
        for (const r of cardRows) {
          const own = (e.notes ?? []).filter((note) => note.row === r.id)
          // The sentences that follow from the record by a rule come first, then the notes of the record.
          expect([e.symbol, r.id, own.length === 0 ? [] : r.notes.slice(-own.length)]).toEqual([e.symbol, r.id, own.map((note) => note.text)])
          expect([e.symbol, r.id, r.sourceIds]).toEqual([e.symbol, r.id, expect.arrayContaining(own.map((note) => note.sourceId))])
        }
        const ruled = cardRows.filter((r) => ['group', 'vdwRadius', 'ionizationEnergy'].includes(r.id)).reduce((sum, r) => sum + r.notes.length - (e.notes ?? []).filter((note) => note.row === r.id).length, 0)
        expect([e.symbol, cardRows.reduce((sum, r) => sum + r.notes.length, 0) - ruled]).toEqual([e.symbol, e.notes?.length ?? 0])
      }
      expect(all.reduce((sum, [e]) => sum + (e.notes?.length ?? 0), 0)).toBe(92)
    })

    it('gives every row a label and a value, and every shown value a known source unless the app works it out', () => {
      const known = new Set(registry.sources.map((s) => s.id))
      for (const [e, cardRows] of all) {
        for (const r of cardRows) {
          expect([e.symbol, r.id, r.label, r.value]).toEqual([e.symbol, r.id, expect.stringMatching(/\S/), expect.stringMatching(/\S/)])
          expect([e.symbol, r.id, r.value]).toEqual([e.symbol, r.id, expect.not.stringMatching(/undefined|NaN|null/)])
          expect(new Set(r.sourceIds).size).toBe(r.sourceIds.length)
          for (const id of r.sourceIds) expect([e.symbol, r.id, id, known.has(id)]).toEqual([e.symbol, r.id, id, true])
          const cites = r.sourceIds.length > 0
          if (DERIVED.includes(r.id)) expect([e.symbol, r.id, r.sourceIds]).toEqual([e.symbol, r.id, r.notes.length > 0 ? expect.anything() : []])
          else if (r.value !== NO_VALUE) expect([e.symbol, r.id, cites]).toEqual([e.symbol, r.id, true])
        }
      }
    })

    it('never writes a minus sign as a hyphen in a value', () => {
      for (const [e, cardRows] of all) for (const r of cardRows) expect([e.symbol, r.id, r.value]).toEqual([e.symbol, r.id, expect.not.stringMatching(/-\d/)])
    })

    it('labels the five properties the table can be coloured by as the colour-by control does', () => {
      const [, cardRows] = all[0]!
      for (const property of Object.keys(TRENDS) as TrendProperty[]) expect(cardRows.find((r) => r.id === property)?.label).toBe(TRENDS[property].label)
    })
  })
})

describe('moleculesContaining', () => {
  const ids = (symbol: string) => moleculesContaining(symbol, LIBRARY_INDEX).map((entry) => entry.id)

  it('lists the three fluorides for fluorine, in library order', () => {
    expect(ids('F')).toEqual(['boron-trifluoride', 'sulfur-hexafluoride', 'xenon-tetrafluoride'])
  })

  it('lists xenon tetrafluoride for xenon, and nothing for gold', () => {
    expect(ids('Xe')).toEqual(['xenon-tetrafluoride'])
    expect(ids('Au')).toEqual([])
  })

  it('matches whole symbols: carbon is not found in a chloride, nor cobalt in carbon monoxide', () => {
    expect(ids('C')).not.toContain('hydrogen-chloride')
    expect(ids('C')).not.toContain('phosphorus-pentachloride')
    expect(ids('Cl')).toEqual(['hydrogen-chloride', 'phosphorus-pentachloride'])
    expect(moleculesContaining('Co', [{ id: 'carbon-monoxide', name: 'Carbon monoxide', formula: 'CO', charge: 0, topic: 'basics' }])).toEqual([])
  })

  it('finds every element of a formula with groups, and of an ion', () => {
    expect(ids('N')).toContain('urea')
    expect(ids('H')).toContain('hydronium')
    expect(ids('O')).toContain('bicarbonate')
  })

  it('agrees with the atoms of each molecule in the registry', () => {
    for (const e of periodicTable) {
      // The index lists each library entry once; a variant such as a zwitterion is reached from its entry.
      const expected = LIBRARY_INDEX.map((entry) => registry.molecules.find((m) => m.id === entry.id)!)
        .filter((m) => m.atoms.some((atom) => atom.element === e.symbol))
        .map((m) => m.id)
      expect([e.symbol, ids(e.symbol)]).toEqual([e.symbol, expected])
    }
  })
})
