import { describe, expect, it } from 'vitest'
import download from '../../docs/research/periodic-table/pubchem-periodic-table.json'
import ciaawPage from '../../docs/research/periodic-table/sources/ciaaw-abridged-atomic-weights.html?raw'
import nistFile from '../../docs/research/periodic-table/sources/nist-asd-ie-neutral.txt?raw'
import elementPages from '../../docs/research/periodic-table/sources/pubchem-element-pages-extract.json?raw'
import {
  describeBlock,
  describeGroup,
  describePeriod,
  elementPosition,
  GROUP_3_NOTE,
  NO_VALUE,
  periodicTable,
  shellsFromConfiguration,
  type Block,
  type ElementPosition,
} from './periodic'
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

describe('elementPosition', () => {
  const at = (symbol: string) => elementPosition(element(symbol).atomicNumber)
  const positions = periodicTable.map((e) => ({ symbol: e.symbol, ...elementPosition(e.atomicNumber) }))
  const symbolsAt = (test: (p: (typeof positions)[number]) => boolean) => positions.filter(test).map((p) => p.symbol)

  it.each([
    ['H', { period: 1, group: 1, block: 's', row: 1, column: 1 }],
    ['He', { period: 1, group: 18, block: 's', row: 1, column: 18 }],
    ['B', { period: 2, group: 13, block: 'p', row: 2, column: 13 }],
    ['Sc', { period: 4, group: 3, block: 'd', row: 4, column: 3 }],
    ['Y', { period: 5, group: 3, block: 'd', row: 5, column: 3 }],
    ['La', { period: 6, group: 3, block: 'd', row: 6, column: 3 }],
    ['Ce', { period: 6, group: null, block: 'f', row: 9, column: 4 }],
    ['Lu', { period: 6, group: null, block: 'f', row: 9, column: 17 }],
    ['Hf', { period: 6, group: 4, block: 'd', row: 6, column: 4 }],
    ['Ac', { period: 7, group: 3, block: 'd', row: 7, column: 3 }],
    ['Th', { period: 7, group: null, block: 'f', row: 10, column: 4 }],
    ['Lr', { period: 7, group: null, block: 'f', row: 10, column: 17 }],
    ['Rf', { period: 7, group: 4, block: 'd', row: 7, column: 4 }],
    ['Og', { period: 7, group: 18, block: 'p', row: 7, column: 18 }],
  ] as const)('places %s', (symbol, expected) => {
    expect(at(symbol)).toEqual(expected)
  })

  it('gives every element its own cell: rows 1 to 7 of the main table, rows 9 and 10 below it under columns 4 to 17', () => {
    expect(new Set(positions.map((p) => `${p.row},${p.column}`)).size).toBe(118)
    for (const p of positions) {
      if (p.group === null) {
        expect([p.symbol, p.row]).toEqual([p.symbol, p.period + 3])
        expect(p.column).toBeGreaterThanOrEqual(4)
        expect(p.column).toBeLessThanOrEqual(17)
      } else {
        // In the main table the column is the group and the row is the period.
        expect([p.symbol, p.row, p.column]).toEqual([p.symbol, p.period, p.group])
      }
    }
    expect(symbolsAt((p) => p.row === 9)).toEqual(['Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu'])
    expect(symbolsAt((p) => p.row === 10)).toEqual(['Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr'])
  })

  it('fills the periods with 2, 8, 8, 18, 18, 32 and 32 elements, in atomic-number order', () => {
    expect(range(1, 7).map((period) => positions.filter((p) => p.period === period).length)).toEqual([2, 8, 8, 18, 18, 32, 32])
    expect(positions.map((p) => p.period)).toEqual([...positions.map((p) => p.period)].sort((a, b) => a - b))
  })

  it('makes the blocks as wide as their subshells: s 14, p 36, d 40, f 28', () => {
    const size = (block: string) => positions.filter((p) => p.block === block).length
    expect([size('s'), size('p'), size('d'), size('f')]).toEqual([14, 36, 40, 28])
    // Helium is the one s-block element outside groups 1 and 2; the d block is groups 3 to 12 exactly.
    expect(symbolsAt((p) => p.block === 's' && p.group !== 1 && p.group !== 2)).toEqual(['He'])
    expect(symbolsAt((p) => p.block === 'p' && (p.group === null || p.group < 13))).toEqual([])
    expect(symbolsAt((p) => (p.block === 'd') !== (p.group !== null && p.group >= 3 && p.group <= 12))).toEqual([])
  })

  it('gives no group number to the 28 f-block elements, and to no others', () => {
    expect(positions.filter((p) => p.group === null).length).toBe(28)
    expect(symbolsAt((p) => (p.group === null) !== (p.block === 'f'))).toEqual([])
  })

  it('puts lanthanum and actinium in group 3, and takes group members from the group, not the column', () => {
    expect(symbolsAt((p) => p.group === 3)).toEqual(['Sc', 'Y', 'La', 'Ac'])
    // Lutetium and lawrencium are drawn under column 17 but are not in group 17.
    expect(symbolsAt((p) => p.group === 17)).toEqual(['F', 'Cl', 'Br', 'I', 'At', 'Ts'])
    expect(symbolsAt((p) => p.column === 17 && p.group !== 17)).toEqual(['Lu', 'Lr'])
  })

  it.each([0, 119, -1, 1.5, Number.NaN])('throws for atomic number %s', (atomicNumber) => {
    expect(() => elementPosition(atomicNumber)).toThrow(/atomic number/)
  })
})

describe('shellsFromConfiguration', () => {
  it.each([
    ['1s1', [1]],
    ['[He]2s2 2p2', [2, 4]],
    ['[He] 2s2 2p3', [2, 5]],
    ['[Ne]3s2 3p5', [2, 8, 7]],
    ['[Ar]4s2 3d6', [2, 8, 14, 2]],
    ['[Ar]4s1 3d10', [2, 8, 18, 1]],
    ['[Ar]3d5 4s1', [2, 8, 13, 1]],
    ['[Kr]5s2 4d10 5p6', [2, 8, 18, 18, 8]],
    ['[Kr]4d10', [2, 8, 18, 18]],
    ['[Rn] 5f12 7s2', [2, 8, 18, 32, 30, 8, 2]],
    ['[Rn]7s2 7p2 5f14 6d10', [2, 8, 18, 32, 32, 18, 4]],
  ])('counts %s as %j', (text, shells) => {
    expect(shellsFromConfiguration(text)).toEqual(shells)
  })

  it('counts every stored configuration to its atomic number, with no shell over 2n² electrons', () => {
    for (const e of periodicTable) {
      const shells = shellsFromConfiguration(e.configuration.text)
      expect([e.symbol, shells.reduce((sum, n) => sum + n, 0)]).toEqual([e.symbol, e.atomicNumber])
      shells.forEach((electrons, i) => expect(electrons).toBeLessThanOrEqual(2 * (i + 1) ** 2))
    }
  })

  it('reads the configurations the source marks as calculated or predicted, whose marking the build moved to the qualifier', () => {
    expect(element('Mt').configuration.qualifier).toBe('calculated')
    expect(shellsFromConfiguration(element('Mt').configuration.text)).toEqual([2, 8, 18, 32, 32, 15, 2])
    expect(element('Og').configuration.qualifier).toBe('predicted')
    expect(shellsFromConfiguration(element('Og').configuration.text)).toEqual([2, 8, 18, 32, 32, 18, 8])
  })

  it("counts lawrencium from PubChem's configuration, the one its card shows", () => {
    expect(shellsFromConfiguration(element('Lr').configuration.text)).toEqual([2, 8, 18, 32, 32, 9, 2])
  })

  it.each([
    ['an unknown core', '[Xx]2s1'],
    ['a core that is not closed', '[He 2s1'],
    ['an empty text', ''],
    ['a subshell with no count', '[He]2s'],
    ['a subshell letter that is not s, p, d or f', '[He]2x1'],
    ['a subshell its shell does not have', '1p1'],
    ['a subshell over its capacity', '[He]2s3'],
    ['a repeated subshell', '[He]2s1 2s1'],
    ['a subshell the core already holds', '[Ne]2p1'],
    ['a marking left in the text', '[Rn]7s2 5f14 6d7 (calculated)'],
  ])('throws on %s', (_, text) => {
    expect(() => shellsFromConfiguration(text)).toThrow(/configuration/)
  })
})

describe('group, period and block descriptions', () => {
  type Described = { symbol: string; name: string; category: string; configuration: string } & ElementPosition
  const described: Described[] = periodicTable.map((e) => ({
    symbol: e.symbol,
    name: e.name.toLowerCase(),
    category: e.category,
    configuration: e.configuration.text,
    ...elementPosition(e.atomicNumber),
  }))
  const inGroup = (group: number) => described.filter((e) => e.group === group)
  const inBlock = (block: Block) => described.filter((e) => e.block === block)
  const symbols = (list: readonly Described[]) => list.map((e) => e.symbol)
  const outerShell = (e: Described) => shellsFromConfiguration(e.configuration).at(-1)
  // The electrons a configuration puts in one subshell beyond its noble-gas core, such as "5d".
  const beyondCore = (e: Described, subshell: string) => Number(new RegExp(`(?:^|[\\] ])${subshell}(\\d+)`).exec(e.configuration)?.[1] ?? 0)
  // Every number a text states just before the given words, such as "14 elements".
  const stated = (text: string, words: string) => [...text.matchAll(new RegExp(`(\\d+) ${words}`, 'g'))].map((match) => Number(match[1]))

  const GROUPS = range(1, 18)
  const PERIODS = range(1, 7)
  const BLOCKS: Block[] = ['s', 'p', 'd', 'f']
  const all = [
    ...GROUPS.map((group) => [`group ${group}`, describeGroup(group)] as const),
    ...PERIODS.map((period) => [`period ${period}`, describePeriod(period)] as const),
    ...BLOCKS.map((block) => [`block ${block}`, describeBlock(block)] as const),
    ['the group 3 note', GROUP_3_NOTE] as const,
  ]

  it('gives every group, period and block a text, at least one known source, and the passage behind each source', () => {
    expect(all.length).toBe(18 + 7 + 4 + 1)
    for (const [what, description] of all) {
      expect([what, description.text]).toEqual([what, expect.stringMatching(/^[A-Z0-9].*\.$/)])
      expect([what, description.text]).toEqual([what, expect.not.stringMatching(/ {2}|undefined|NaN/)])
      expect([what, description.sourceIds.length]).toEqual([what, expect.toSatisfy((n: number) => n >= 1)])
      expect(new Set(description.sourceIds).size).toBe(description.sourceIds.length)
      expect([what, description.support.trim()]).not.toEqual([what, ''])
      for (const id of description.sourceIds) {
        expect([what, id, sourceOf(id)?.id]).toEqual([what, id, id])
        // Each source is followed in the support by the passage read there.
        expect([what, description.support]).toEqual([what, expect.stringContaining(`${id}: `)])
      }
    }
  })

  it('cites sources that say when they were read, and leaves no description source uncited', () => {
    const cited = new Set(all.flatMap(([, description]) => description.sourceIds))
    for (const id of cited) expect([id, sourceOf(id)?.citation]).toEqual([id, expect.stringMatching(/retrieved 2026-10-03|Recommendations 2005/)])
    const added = registry.sources.map((s) => s.id).filter((id) => /^(openstax-chem2e-(?!8\.4$)|iupac-|rsc-)/.test(id))
    expect(added.length).toBeGreaterThan(0)
    expect(added.filter((id) => !cited.has(id))).toEqual([])
  })

  it('names group 1 for hydrogen as well as the alkali metals, and says hydrogen is a nonmetal', () => {
    const group1 = describeGroup(1)
    expect(group1.name).toBe('Hydrogen and the alkali metals')
    expect(group1.text).toMatch(/Hydrogen is a nonmetal, not an alkali metal\./)
    expect(element('H').category).toBe('Nonmetal')
    expect(symbols(inGroup(1).filter((e) => e.category === 'Alkali metal'))).toEqual(['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'])
  })

  it('names only the families its sources name', () => {
    expect(Object.fromEntries(GROUPS.flatMap((group) => (describeGroup(group).name ? [[group, describeGroup(group).name]] : [])))).toEqual({
      1: 'Hydrogen and the alkali metals',
      2: 'Alkaline earth metals',
      15: 'Pnictogens',
      16: 'Chalcogens',
      17: 'Halogens',
      18: 'Noble gases',
    })
  })

  it('names every member of each group, taken from the position function', () => {
    for (const group of GROUPS) {
      const text = describeGroup(group).text.toLowerCase()
      for (const member of inGroup(group)) expect([group, text]).toEqual([group, expect.stringContaining(member.name)])
    }
    expect(describeGroup(3).text).toMatch(/^Scandium, yttrium, lanthanum and actinium\./)
    expect(describeGroup(4).text).toMatch(/^The titanium group: titanium, zirconium, hafnium and rutherfordium\./)
  })

  it("spells element names as the table does (PubChem's aluminum and cesium)", () => {
    for (const [what, description] of all) expect([what, description.text]).toEqual([what, expect.not.stringMatching(/aluminium|caesium|sulphur/i)])
    expect(describeGroup(13).text).toContain('aluminum')
    expect(describePeriod(6).text).toContain('cesium')
  })

  it('states for groups 1, 2 and 13 to 17 the valence electron count the stored configurations give', () => {
    for (const group of [1, 2, 13, 14, 15, 16, 17]) {
      const count = group <= 2 ? group : group - 10
      expect([group, stated(describeGroup(group).text, 'valence electrons?')]).toEqual([group, [count]])
      for (const member of inGroup(group)) expect([member.symbol, outerShell(member)]).toEqual([member.symbol, count])
    }
    // How many more fill the valence shell of eight.
    expect(stated(describeGroup(15).text, 'more')).toEqual([3])
    expect(stated(describeGroup(16).text, 'more')).toEqual([2])
    expect(describeGroup(17).text).toContain('1 short of a full valence shell')
  })

  it('states for group 18 the filled shells the stored configurations give: 2 in helium, 8 in the others', () => {
    expect(describeGroup(18).text).toContain('2 electrons in helium and 8 in the others')
    expect(inGroup(18).map(outerShell)).toEqual([2, 8, 8, 8, 8, 8, 8])
    // "gases at room temperature": helium to radon; oganesson's state is only expected.
    expect(inGroup(18).map((e) => element(e.symbol).standardState)).toEqual([
      ...Array.from({ length: 6 }, () => ({ state: 'Gas', expected: false })),
      { state: 'Gas', expected: true },
    ])
  })

  it('states for groups 3 to 12 the outer s and d electron count the stored configurations give: the group number', () => {
    for (const group of range(3, 12)) {
      const text = describeGroup(group).text
      if (group < 12) expect([group, stated(text, 'electrons in (?:its|their) outer s and d subshells')]).toEqual([group, [group]])
      for (const member of inGroup(group)) {
        const s = beyondCore(member, `${member.period}s`)
        const d = beyondCore(member, `${member.period - 1}d`)
        expect([member.symbol, s + d]).toEqual([member.symbol, group])
        // Group 12: a full d subshell and two outer s electrons.
        if (group === 12) expect([member.symbol, s, d]).toEqual([member.symbol, 2, 10])
      }
    }
    expect(describeGroup(12).text).toContain('a full d subshell and 2 outer s electrons')
  })

  it('classes the members of groups 13, 14 and 15 as PubChem does', () => {
    const categories = (group: number) => Object.fromEntries(inGroup(group).map((e) => [e.name, e.category]))
    expect(describeGroup(13).text).toContain('Boron is a metalloid; aluminum, gallium, indium and thallium are metals.')
    expect(categories(13)).toMatchObject({ boron: 'Metalloid', aluminum: 'Post-transition metal', gallium: 'Post-transition metal', indium: 'Post-transition metal', thallium: 'Post-transition metal' })
    expect(describeGroup(14).text).toContain('Carbon is a nonmetal, silicon and germanium are metalloids, and tin and lead are metals.')
    expect(categories(14)).toMatchObject({ carbon: 'Nonmetal', silicon: 'Metalloid', germanium: 'Metalloid', tin: 'Post-transition metal', lead: 'Post-transition metal' })
    expect(describeGroup(15).text).toContain('from the nonmetals nitrogen and phosphorus, through the metalloids arsenic and antimony, to the metal bismuth')
    expect(categories(15)).toMatchObject({ nitrogen: 'Nonmetal', phosphorus: 'Nonmetal', arsenic: 'Metalloid', antimony: 'Metalloid', bismuth: 'Post-transition metal' })
  })

  it('says of each element from rutherfordium on that it is placed by atomic number, and of no lighter one', () => {
    for (const group of GROUPS) {
      const text = describeGroup(group).text
      for (const member of inGroup(group)) {
        const sentence = `${member.name[0]?.toUpperCase()}${member.name.slice(1)} is placed here by its atomic number; few atoms of it have ever been made.`
        expect([member.symbol, text.includes(sentence)]).toEqual([member.symbol, element(member.symbol).atomicNumber >= 104])
      }
    }
    expect(GROUPS.filter((group) => describeGroup(group).sourceIds.includes('rsc-periodic-table'))).toEqual(range(4, 18))
  })

  it('generates each period text from the table: its size, its first and last elements, and the row below', () => {
    expect(PERIODS.map((period) => describePeriod(period).text)).toEqual([
      '2 elements, hydrogen and helium. Across the period the 1s subshell fills.',
      '8 elements, lithium to neon. Across the period the 2s and 2p subshells fill.',
      '8 elements, sodium to argon. Across the period the 3s and 3p subshells fill.',
      '18 elements, potassium to krypton. Across the period the 4s, 3d and 4p subshells fill.',
      '18 elements, rubidium to xenon. Across the period the 5s, 4d and 5p subshells fill.',
      '32 elements, cesium to radon; 14 of them, cerium to lutetium, are drawn in a row below the main table. Across the period the 6s, 4f, 5d and 6p subshells fill.',
      '32 elements, francium to oganesson; 14 of them, thorium to lawrencium, are drawn in a row below the main table. Across the period the 7s, 5f, 6d and 7p subshells fill.',
    ])
    for (const period of PERIODS) {
      const members = described.filter((e) => e.period === period)
      const text = describePeriod(period).text
      expect([period, stated(text, 'elements')]).toEqual([period, [members.length]])
      expect([period, stated(text, 'of them')]).toEqual([period, members.some((e) => e.row !== period) ? [members.filter((e) => e.row !== period).length] : []])
      // The subshells named are the ones the period's noble gas has beyond the one before it, and they hold the period.
      const named = [...text.matchAll(/\d[spdf]/g)].map((match) => match[0])
      const last = members.at(-1)!
      expect([period, named.map((subshell) => beyondCore(last, subshell))]).toEqual([period, named.map((subshell) => 4 * 'spdf'.indexOf(subshell[1]!) + 2)])
      expect([period, named.reduce((sum, subshell) => sum + beyondCore(last, subshell), 0)]).toEqual([period, members.length])
    }
  })

  it('states for each block the size and width that elementPosition gives', () => {
    for (const block of BLOCKS) {
      const text = describeBlock(block).text
      const members = inBlock(block)
      const capacity = 4 * 'spdf'.indexOf(block) + 2
      expect([block, stated(text, 'elements')]).toEqual([block, [members.length]])
      // Helium is drawn in group 18, outside the two columns of its block.
      expect([block, new Set(members.filter((e) => e.symbol !== 'He').map((e) => e.column)).size]).toEqual([block, capacity])
      expect([block, stated(text, block === 'f' ? 'in each row' : 'columns')]).toEqual([block, [capacity]])
      expect([block, text]).toEqual([block, expect.stringContaining(`${block} subshell holds ${capacity} electrons`)])
    }
    expect(inBlock('f').filter((e) => e.row === 9).length).toBe(14)
    expect(inBlock('f').filter((e) => e.row === 10).length).toBe(14)
    expect(stated(GROUP_3_NOTE.text, 'elements in each row')).toEqual([14])
  })

  it('describes the blocks by the rule of spec 5.4: lanthanum and actinium in the d block, cerium to lutetium and thorium to lawrencium in the f block', () => {
    expect(describeBlock('s').text).toMatch(/^Groups 1 and 2, and helium: 14 elements\./)
    expect(symbols(inBlock('s').filter((e) => e.group !== 1 && e.group !== 2))).toEqual(['He'])
    expect(describeBlock('p').text).toMatch(/^Groups 13 to 18, without helium: 36 elements,/)
    expect(describeBlock('d').text).toMatch(/^Groups 3 to 12: 40 elements,/)
    expect(describeBlock('d').text).toContain('Lanthanum and actinium are counted here, in group 3')
    expect(describeBlock('f').text).toMatch(/^Cerium to lutetium and thorium to lawrencium: 28 elements,/)
    expect(describeBlock('f').text).toContain('Lanthanum and actinium, the first of the lanthanides and of the actinides, are counted in the d block')
    for (const [what, description] of all) expect([what, description.text]).toEqual([what, expect.not.stringMatching(/ytterbium|nobelium/i)])
  })

  it('says of the s block that the outermost electrons are in an s subshell, as every stored configuration there has it', () => {
    for (const e of inBlock('s')) expect([e.symbol, outerShell(e)]).toEqual([e.symbol, beyondCore(e, `${e.period}s`)])
  })

  it("says of the p block what PubChem's categories give: every nonmetal but hydrogen and helium, and all the metalloids", () => {
    expect(describeBlock('p').text).toContain('every nonmetal except hydrogen and helium, all the metalloids, and some metals')
    const nonmetal = (e: Described) => ['Nonmetal', 'Halogen', 'Noble gas'].includes(e.category)
    expect(symbols(described.filter((e) => nonmetal(e) && e.block !== 'p'))).toEqual(['H', 'He'])
    expect(symbols(described.filter((e) => e.category === 'Metalloid' && e.block !== 'p'))).toEqual([])
    expect(inBlock('p').some((e) => e.category === 'Post-transition metal')).toBe(true)
  })

  it('says thorium has no 5f electron, and it is the only f-block element whose stored configuration has none in its own f subshell', () => {
    expect(describeBlock('f').text).toContain('Thorium is in this block although its atom has no 5f electron in its ground state.')
    expect(symbols(inBlock('f').filter((e) => beyondCore(e, `${e.period - 2}f`) === 0))).toEqual(['Th'])
    expect(element('Th').configuration).toEqual({ text: '[Rn]7s2 6d2' })
  })

  it('says in one note that group 3 is unsettled, which convention this table follows, and that IUPAC has not ruled (spec 5.4)', () => {
    const { text } = GROUP_3_NOTE
    for (const name of ['scandium', 'yttrium', 'lanthanum', 'actinium', 'lutetium', 'lawrencium', 'cerium', 'thorium']) expect(text).toContain(name)
    expect(text).toContain('OpenStax Chemistry')
    expect(text).toContain("Royal Society of Chemistry's periodic table")
    expect(text).toContain('IUPAC has not ruled')
    expect(GROUP_3_NOTE.sourceIds).toEqual(['iupac-periodic-table', 'openstax-chem2e-19.1', 'rsc-periodic-table'])
  })

  it('throws for a group, period or block that does not exist', () => {
    for (const group of [0, 19, 1.5]) expect(() => describeGroup(group)).toThrow(/no group/)
    for (const period of [0, 8, 2.5]) expect(() => describePeriod(period)).toThrow(/no period/)
    expect(() => describeBlock('g' as Block)).toThrow(/no block/)
  })
})
