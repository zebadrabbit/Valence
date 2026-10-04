import { describe, expect, it } from 'vitest'
import download from '../../docs/research/periodic-table/pubchem-periodic-table.json'
import ciaawPage from '../../docs/research/periodic-table/sources/ciaaw-abridged-atomic-weights.html?raw'
import nistFile from '../../docs/research/periodic-table/sources/nist-asd-ie-neutral.txt?raw'
import elementPages from '../../docs/research/periodic-table/sources/pubchem-element-pages-extract.json?raw'
import { NO_VALUE, periodicTable } from './periodic'
import { registry } from './registry'
import { PERIODIC_UNITS, type PeriodicElement } from './schema'
import { validatePeriodicTable } from './validate'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('./denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const QUANTITIES = Object.keys(PERIODIC_UNITS) as (keyof typeof PERIODIC_UNITS)[]

function element(symbol: string): PeriodicElement {
  const found = periodicTable.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}
const symbolsWhere = (test: (e: PeriodicElement) => boolean) => periodicTable.filter(test).map((e) => e.symbol)
const count = (test: (e: PeriodicElement) => boolean) => periodicTable.filter(test).length
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const noteRows = (symbol: string) => (element(symbol).notes ?? []).map((note) => note.row)
const notesOn = (symbol: string, row: string) => (element(symbol).notes ?? []).filter((note) => note.row === row)
const sourceOf = (id: string) => registry.sources.find((s) => s.id === id)

describe('the periodic table data', () => {
  it('passes validation against the registry sources', () => {
    expect(validatePeriodicTable(periodicTable, registry.sources, { institutionNames })).toEqual([])
  })

  it('holds 118 records in atomic-number order', () => {
    expect(periodicTable.map((e) => e.atomicNumber)).toEqual(range(1, 118))
    expect(new Set(periodicTable.map((e) => e.name)).size).toBe(118)
  })

  it("uses PubChem's ten categories as given", () => {
    const counts: Record<string, number> = {}
    for (const e of periodicTable) counts[e.category] = (counts[e.category] ?? 0) + 1
    expect(counts).toEqual({
      Nonmetal: 7,
      'Noble gas': 7,
      'Alkali metal': 6,
      'Alkaline earth metal': 6,
      Metalloid: 7,
      Halogen: 6,
      'Post-transition metal': 11,
      'Transition metal': 38,
      Lanthanide: 15,
      Actinide: 15,
    })
    expect([element('H').category, element('Po').category, element('At').category, element('Og').category]).toEqual([
      'Nonmetal',
      'Metalloid',
      'Halogen',
      'Noble gas',
    ])
  })

  it('moves the marking of a configuration into the qualifier: 9 predicted, 1 calculated', () => {
    expect(symbolsWhere((e) => e.configuration.qualifier === 'predicted')).toEqual(['Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
    expect(symbolsWhere((e) => e.configuration.qualifier === 'calculated')).toEqual(['Mt'])
    expect(element('Mt').configuration).toEqual({ text: '[Rn]7s2 5f14 6d7', qualifier: 'calculated' })
    expect(element('Og').configuration).toEqual({ text: '[Rn]7s2 7p6 5f14 6d10', qualifier: 'predicted' })
    for (const e of periodicTable) expect(e.configuration.text).not.toMatch(/[()]/)
  })

  it('keeps configuration text as published: no core, a space after the core, subshells out of shell order', () => {
    const text = (symbol: string) => element(symbol).configuration.text
    expect([text('H'), text('N'), text('Cu'), text('Fm'), text('Fl')]).toEqual([
      '1s1',
      '[He] 2s2 2p3',
      '[Ar]4s1 3d10',
      '[Rn] 5f12 7s2',
      '[Rn]7s2 7p2 5f14 6d10',
    ])
    expect(element('H').configuration.qualifier).toBeUndefined()
  })

  it('flags the 9 states the source words as expected', () => {
    expect(symbolsWhere((e) => e.standardState.expected)).toEqual(['Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
    expect(element('Og').standardState).toEqual({ state: 'Gas', expected: true })
    expect(element('Ds').standardState).toEqual({ state: 'Solid', expected: true })
    expect(element('Fe').standardState).toEqual({ state: 'Solid', expected: false })
    expect(symbolsWhere((e) => e.standardState.state === 'Liquid')).toEqual(['Br', 'Hg'])
  })

  describe('atomic mass', () => {
    it('is a CIAAW standard atomic weight for 84 elements and the mass of one isotope for 34', () => {
      expect(count((e) => e.atomicMass.kind === 'standard-atomic-weight')).toBe(84)
      const isotopes = symbolsWhere((e) => e.atomicMass.kind === 'isotope-mass')
      // Technetium, promethium, polonium to actinium, neptunium to oganesson (spec 5.1).
      expect(isotopes).toEqual([
        'Tc', 'Pm', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md',
        'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
      ])
      for (const e of periodicTable) {
        const expected = e.atomicMass.kind === 'standard-atomic-weight' ? 'ciaaw-abridged-2024' : 'pubchem-periodic-table'
        expect([e.symbol, e.atomicMass.sourceId]).toEqual([e.symbol, expected])
      }
    })

    it("shows CIAAW's abridged values, not PubChem's rounding of them", () => {
      const published = (symbol: string) => element(symbol).atomicMass.published
      expect([published('H'), published('Li'), published('S'), published('Ar'), published('Fe'), published('Pb')]).toEqual([
        '1.0080',
        '6.94',
        '32.06',
        '39.95',
        '55.845',
        '207.2',
      ])
    })

    it('names the isotope: technetium-97, measured; oganesson-295, estimated', () => {
      expect(element('Tc').atomicMass).toEqual({
        value: 96.90636,
        published: '96.90636',
        unit: 'u',
        sourceId: 'pubchem-periodic-table',
        kind: 'isotope-mass',
        massNumber: 97,
        estimated: false,
      })
      expect(element('Og').atomicMass).toMatchObject({ published: '295.216', kind: 'isotope-mass', massNumber: 295, estimated: true })
    })

    it('marks the isotope mass as estimated from lawrencium on, and not before', () => {
      const estimated = symbolsWhere((e) => e.atomicMass.kind === 'isotope-mass' && e.atomicMass.estimated)
      expect(estimated).toEqual(periodicTable.filter((e) => e.atomicNumber >= 103).map((e) => e.symbol))
    })

    it('gives bismuth, thorium, protactinium and uranium a standard atomic weight although they have no stable isotope', () => {
      for (const symbol of ['Bi', 'Th', 'Pa', 'U']) expect([symbol, element(symbol).atomicMass.kind]).toEqual([symbol, 'standard-atomic-weight'])
    })
  })

  it('prints numbers in the digits the source publishes', () => {
    expect(element('Fe').density).toEqual({ value: 7.874, published: '7.874', unit: 'g/cm³', sourceId: 'pubchem-periodic-table' })
    expect(element('Ca').electronegativity?.published).toBe('1')
    expect(element('C').density?.published).toBe('2.2670')
    expect(element('H').density?.published).toBe('0.00008988')
    expect(element('C').ionizationEnergy?.published).toBe('11.2602880')
  })

  it("stores the year as PubChem lists it: a number or 'Ancient'", () => {
    expect(element('C').yearDiscovered).toBe('Ancient')
    expect(element('Al').yearDiscovered).toBe('Ancient')
    expect(element('F').yearDiscovered).toBe(1670)
    expect(count((e) => e.yearDiscovered === 'Ancient')).toBe(13)
  })

  it('leaves a field its source leaves empty absent, never zero', () => {
    expect(element('He').electronegativity).toBeUndefined()
    expect(element('Og').density).toBeUndefined()
    expect(element('Nh').oxidationStates).toBeUndefined()
    expect(element('He').electronAffinity).toBeUndefined()
    expect('electronegativity' in element('He')).toBe(false)
    expect(NO_VALUE).toBe('no value listed')
  })

  it('covers what spec 5.1 says each source covers', () => {
    const present = (key: (typeof QUANTITIES)[number]) => count((e) => e[key] !== undefined)
    expect({
      electronegativity: present('electronegativity'),
      vdwRadius: present('vdwRadius'),
      electronAffinity: present('electronAffinity'),
      meltingPoint: present('meltingPoint'),
      boilingPoint: present('boilingPoint'),
      density: present('density'),
      oxidationStates: count((e) => e.oxidationStates !== undefined),
    }).toEqual({ electronegativity: 95, vdwRadius: 99, electronAffinity: 57, meltingPoint: 103, boilingPoint: 93, density: 96, oxidationStates: 117 })
  })

  describe('covalent radius', () => {
    it('is present for elements 1 to 96 and absent for 97 to 118', () => {
      expect(periodicTable.filter((e) => e.covalentRadius).map((e) => e.atomicNumber)).toEqual(range(1, 96))
      expect(element('Es').covalentRadius).toBeUndefined()
      expect(element('H').covalentRadius).toEqual({ value: 31, published: '31', unit: 'pm', sourceId: 'pubchem-element-pages' })
    })

    it("is the first figure of the covalent radius line on PubChem's saved element page", () => {
      const pages = JSON.parse(elementPages) as Record<string, { lines: { name: string | null; text: string }[] }>
      for (const e of periodicTable) {
        const lines = pages[e.atomicNumber]!.lines.filter((line) => line.name === 'Covalent Atomic Radius').map((line) => line.text)
        // "31(5) pm (Covalent)", "28 pm (Covalent)", "76(1)[sp3], 73(2)[sp2], 69(1)[sp] pm (Covalent)"
        const first = lines.map((text) => /^\d+/.exec(text)?.[0])
        expect([e.symbol, first]).toEqual([e.symbol, e.covalentRadius ? [e.covalentRadius.published] : []])
      }
    })

    it('uses the first value listed where the source gives several, and says so in a note', () => {
      const shown = (symbol: string) => element(symbol).covalentRadius?.published
      expect([shown('C'), shown('Mn'), shown('Fe'), shown('Co')]).toEqual(['76', '139', '132', '126'])
      for (const symbol of ['C', 'Mn', 'Fe', 'Co']) {
        const [note] = notesOn(symbol, 'covalentRadius')
        expect(note?.text).toContain('first listed')
        expect(note?.text).toContain(`${shown(symbol)} pm`)
      }
    })
  })

  describe('first ionization energy', () => {
    it("is NIST's value with NIST's flag, for elements 1 to 108", () => {
      expect(periodicTable.filter((e) => e.ionizationEnergy).map((e) => e.atomicNumber)).toEqual(range(1, 108))
      for (const e of periodicTable) if (e.ionizationEnergy) expect(e.ionizationEnergy.sourceId).toBe('nist-asd-ie-all')
      const flagged = (flag: string) => symbolsWhere((e) => e.ionizationEnergy?.flag === flag)
      expect(flagged('theoretical')).toEqual(['H', 'Rf', 'Db'])
      expect(flagged('semi-empirical')).toEqual(['Pr', 'Pa', 'Fm', 'Md', 'Sg', 'Bh', 'Hs'])
      expect(flagged('measured').length).toBe(98)
      expect(element('Lr').ionizationEnergy).toMatchObject({ published: '4.96', flag: 'measured' })
      expect(element('Ta').ionizationEnergy?.published).toBe('7.549571')
    })

    it("matches the curated hydrogen value's source and digits", () => {
      const curated = registry.elements.find((e) => e.symbol === 'H')!
      const hydrogen = element('H').ionizationEnergy!
      expect(hydrogen.published).toBe('13.598434599702')
      expect(hydrogen.value).toBe(curated.ionizationEnergiesEv.value[0])
      expect(hydrogen.flag).toBe('theoretical')
      // Two saved queries of one database: the 11 curated elements, and every neutral atom.
      const database = 'NIST Atomic Spectra Database, Ground States and Ionization Energies'
      expect(sourceOf(curated.ionizationEnergiesEv.sourceId)?.citation).toContain(database)
      expect(sourceOf(hydrogen.sourceId)?.citation).toContain(database)
    })
  })

  it('agrees with the 11 curated elements on atomic weight, first ionization energy and covalent radius (spec 5.3)', () => {
    expect(registry.elements.length).toBe(11)
    for (const curated of registry.elements) {
      const e = element(curated.symbol)
      expect([e.symbol, e.atomicNumber, e.name]).toEqual([curated.symbol, curated.atomicNumber, curated.name])
      expect([e.symbol, e.atomicMass.published, e.atomicMass.sourceId]).toEqual([e.symbol, curated.atomicWeight.published, curated.atomicWeight.sourceId])
      expect([e.symbol, e.ionizationEnergy?.value]).toEqual([e.symbol, curated.ionizationEnergiesEv.value[0]])
      // The curated radii are in Å.
      expect([e.symbol, e.covalentRadius?.value]).toEqual([e.symbol, Math.round(curated.covalentRadius.value * 100)])
      expect([e.symbol, e.electronegativity?.published]).toEqual([e.symbol, curated.electronegativity.published])
    }
  })

  it('stores every quantity in the unit of the unit table', () => {
    expect(PERIODIC_UNITS).toEqual({
      atomicMass: 'u',
      electronegativity: '',
      covalentRadius: 'pm',
      vdwRadius: 'pm',
      ionizationEnergy: 'eV',
      electronAffinity: 'eV',
      meltingPoint: 'K',
      boilingPoint: 'K',
      density: 'g/cm³',
    })
    let checked = 0
    for (const e of periodicTable) {
      for (const key of QUANTITIES) {
        const quantity = e[key]
        if (!quantity) continue
        expect([e.symbol, key, quantity.unit]).toEqual([e.symbol, key, PERIODIC_UNITS[key]])
        checked += 1
      }
    }
    // 118 masses, 95 + 96 + 99 + 108 + 57 + 103 + 93 + 96 others.
    expect(checked).toBe(865)
  })

  it("holds PubChem's columns exactly as the saved download prints them", () => {
    const columns = download.Table.Columns.Column
    const rows = download.Table.Row.map((row) => Object.fromEntries(columns.map((column, i) => [column, row.Cell[i]])))
    expect(rows.length).toBe(118)
    const QUANTITY_COLUMNS = {
      Electronegativity: 'electronegativity',
      AtomicRadius: 'vdwRadius',
      ElectronAffinity: 'electronAffinity',
      MeltingPoint: 'meltingPoint',
      BoilingPoint: 'boilingPoint',
      Density: 'density',
    } as const
    periodicTable.forEach((e, i) => {
      const row = rows[i]!
      const marking = e.configuration.qualifier ? ` (${e.configuration.qualifier})` : ''
      const built: Record<string, string> = {
        AtomicNumber: String(e.atomicNumber),
        Symbol: e.symbol,
        Name: e.name,
        GroupBlock: e.category,
        ElectronConfiguration: e.configuration.text + marking,
        StandardState: (e.standardState.expected ? 'Expected to be a ' : '') + e.standardState.state,
        OxidationStates: e.oxidationStates ?? '',
        YearDiscovered: String(e.yearDiscovered),
      }
      for (const [column, key] of Object.entries(QUANTITY_COLUMNS)) {
        built[column] = e[key]?.published ?? ''
        if (e[key]) expect([e.symbol, key, e[key].sourceId]).toEqual([e.symbol, key, 'pubchem-periodic-table'])
      }
      if (e.atomicMass.kind === 'isotope-mass') built.AtomicMass = e.atomicMass.published
      for (const [column, value] of Object.entries(built)) expect([e.symbol, column, value]).toEqual([e.symbol, column, row[column]])
      expect(e.sourceId).toBe('pubchem-periodic-table')
    })
  })

  it('holds every CIAAW weight and NIST energy exactly as the saved copies print them', () => {
    const literal = (text: string) => text.replace(/[.[\]()]/g, '\\$&')
    const nistLines = nistFile.split('\n')
    for (const e of periodicTable) {
      // <tr><td>3</td><td>Li</td><td>...lithium...</td><td>&nbsp;&nbsp;6.94 &plusmn; 0.06</td>...; a dash where there is no weight.
      const weight = e.atomicMass.kind === 'standard-atomic-weight' ? `${literal(e.atomicMass.published)} &plusmn; ` : '&mdash;<'
      const row = new RegExp(`<tr><td>${e.atomicNumber}</td><td>${e.symbol}</td><td>.*?</td><td>(&nbsp;)*${weight}`)
      expect([e.symbol, row.test(ciaawPage)]).toEqual([e.symbol, true])
      // "3"	"Li I"	"0"	...	"5.391714996"	...: one line per neutral atom, hydrogen to hassium.
      const lines = nistLines.filter((line) => line.startsWith(`"${e.atomicNumber}"\t"${e.symbol} I"\t"0"\t`))
      expect([e.symbol, lines.length]).toEqual([e.symbol, e.ionizationEnergy ? 1 : 0])
      if (e.ionizationEnergy) expect([e.symbol, lines[0]!.split('\t')[10]]).toEqual([e.symbol, `"${e.ionizationEnergy.published}"`])
    }
  })

  describe('notes', () => {
    it('qualifies the melting and boiling points that are not ordinary ones', () => {
      expect(noteRows('He')).toContain('meltingPoint')
      expect(noteRows('C')).toEqual(expect.arrayContaining(['meltingPoint', 'boilingPoint']))
      expect(noteRows('As')).toEqual(expect.arrayContaining(['meltingPoint', 'boilingPoint']))
      // Arsenic is the one element stored with a melting point above its boiling point.
      expect(symbolsWhere((e) => !!e.meltingPoint && !!e.boilingPoint && e.meltingPoint.value > e.boilingPoint.value)).toEqual(['As'])
    })

    it("states no pressure figure for arsenic except as what PubChem's page gives", () => {
      const [note] = notesOn('As', 'meltingPoint')
      expect(note?.text).toMatch(/under pressure/i)
      expect(note?.text.replace(/\(PubChem's arsenic page gives [^)]*\)/, '')).not.toMatch(/atmospheres|atm\b|kPa/)
    })

    it('says on every gas what its density refers to, and on nothing else', () => {
      const gases = symbolsWhere((e) => e.standardState.state === 'Gas' && !!e.density)
      expect(gases).toEqual(['H', 'He', 'N', 'O', 'F', 'Ne', 'Cl', 'Ar', 'Kr', 'Xe', 'Rn'])
      const gasNotes = (symbol: string) => notesOn(symbol, 'density').filter((n) => n.text.includes('at 0 °C and atmospheric pressure'))
      for (const e of periodicTable) expect([e.symbol, gasNotes(e.symbol).length]).toEqual([e.symbol, gases.includes(e.symbol) ? 1 : 0])
    })

    // The gas notes say 0 °C and atmospheric pressure, which the source does not state. This is the
    // arithmetic behind them: an ideal gas at 0 °C and 101.325 kPa fills 22 414 cm³ per mole.
    it('stores gas densities that match the gas at 0 °C and atmospheric pressure within 2%', () => {
      const MOLAR_VOLUME_CM3 = 22414
      const TWO_ATOM = ['H', 'N', 'O', 'F', 'Cl']
      for (const e of periodicTable) {
        if (e.standardState.state !== 'Gas' || !e.density) continue
        const ideal = (e.atomicMass.value * (TWO_ATOM.includes(e.symbol) ? 2 : 1)) / MOLAR_VOLUME_CM3
        expect([e.symbol, Math.abs(e.density.value / ideal - 1) < 0.02]).toEqual([e.symbol, true])
        const names = notesOn(e.symbol, 'density').some((n) => n.text.includes(`${e.symbol}₂`))
        expect([e.symbol, names]).toEqual([e.symbol, TWO_ATOM.includes(e.symbol)])
      }
    })

    it('qualifies the years that are not the year the element was isolated', () => {
      for (const symbol of ['Al', 'Ca', 'F', 'Si']) expect([symbol, noteRows(symbol).includes('yearDiscovered')]).toEqual([symbol, true])
      expect(notesOn('F', 'yearDiscovered')[0]?.text).toContain('1886')
    })

    it('qualifies the oxidation states of xenon and krypton, and the states PubChem marks as predicted', () => {
      expect([element('Xe').oxidationStates, element('Kr').oxidationStates]).toEqual(['0', '0'])
      expect(notesOn('Xe', 'oxidationStates')[0]?.text).toContain('XeF₄')
      expect(noteRows('Kr')).toContain('oxidationStates')
      const predicted = symbolsWhere((e) => (e.notes ?? []).some((n) => n.row === 'oxidationStates' && /prediction/.test(n.text)))
      expect(predicted).toEqual(['Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
      // Only some of these states are predictions; the highest ones are not marked.
      for (const symbol of ['Db', 'Sg', 'Bh', 'Hs', 'Cn']) expect(notesOn(symbol, 'oxidationStates')[0]?.text).not.toMatch(/\ball\b/)
    })

    it("gives NIST's ground state on lawrencium's configuration, and what PubChem's pages say on polonium's and astatine's category", () => {
      const [lawrencium] = notesOn('Lr', 'configuration')
      expect(lawrencium?.text).toContain('7p')
      expect(lawrencium?.sourceId).toBe('nist-asd-ie-all')
      expect(notesOn('Po', 'category')[0]?.sourceId).toBe('pubchem-element-pages')
      expect(notesOn('At', 'category')[0]?.sourceId).toBe('pubchem-element-pages')
    })

    it('writes minus signs as U+2212 and never calls an empty value "not measured"', () => {
      for (const e of periodicTable) {
        for (const note of e.notes ?? []) {
          expect([e.symbol, note.text]).toEqual([e.symbol, expect.not.stringMatching(/[-–]\d|not measured/)])
        }
      }
    })
  })

  it('cites four sources, each with its retrieval date or edition', () => {
    const used = new Set<string>()
    for (const e of periodicTable) {
      used.add(e.sourceId).add(e.atomicMass.sourceId)
      for (const key of QUANTITIES) if (e[key]) used.add(e[key].sourceId)
    }
    expect([...used].sort()).toEqual(['ciaaw-abridged-2024', 'nist-asd-ie-all', 'pubchem-element-pages', 'pubchem-periodic-table'])
    for (const id of ['nist-asd-ie-all', 'pubchem-element-pages', 'pubchem-periodic-table']) expect(sourceOf(id)?.citation).toContain('retrieved 2026-10-03')
    expect(sourceOf('ciaaw-abridged-2024')?.citation).toContain('2024')
    // The 11 curated elements cite this one for electronegativity; it is left as it was.
    expect(sourceOf('pubchem-ptable')?.citation).toContain('Pauling electronegativity column')
  })
})
