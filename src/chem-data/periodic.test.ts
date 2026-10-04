import { describe, expect, it } from 'vitest'
import crossCheck from '../../docs/research/periodic-table/cross-check.md?raw'
import decisions from '../../docs/research/periodic-table/decisions.json'
import download from '../../docs/research/periodic-table/pubchem-periodic-table.json'
import ciaawPage from '../../docs/research/periodic-table/sources/ciaaw-abridged-atomic-weights.html?raw'
import radioactivePage from '../../docs/research/periodic-table/sources/ciaaw-radioactive-elements.html?raw'
import nistFile from '../../docs/research/periodic-table/sources/nist-asd-ie-neutral.txt?raw'
import elementPages from '../../docs/research/periodic-table/sources/pubchem-element-pages-extract.json?raw'
import pagePassages from '../../docs/research/periodic-table/sources/pubchem-element-pages-passages.json'
import densitiesPage from '../../docs/research/periodic-table/sources/wikipedia-densities-of-the-elements-data-page.wikitext?raw'
import {
  CATEGORIES,
  CATEGORY_HEADING,
  CATEGORY_NOTES,
  describeBlock,
  describeGroup,
  describePeriod,
  elementPosition,
  GROUP_3_NOTE,
  NO_VALUE,
  periodicTable,
  shellsFromConfiguration,
  TREND_NOTES,
  type Block,
  type ElementPosition,
  type TrendProperty,
} from './periodic'
import { ELECTRON_AFFINITY_NOTE } from './periodicCard'
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

// The notes as authored. `valueAbsent` marks a note about a value the source leaves empty; the build does not write it out.
type NoteRow = NonNullable<PeriodicElement['notes']>[number]['row']
const authored = decisions.notes as { symbols: string[]; row: NoteRow; text: string; sourceId: string; valueAbsent?: boolean }[]

// The saved copies the notes rest on: the property lines and the kept sentences of PubChem's element pages,
// CIAAW's list of the most stable known isotopes, and Wikipedia's transcription of two handbooks' densities.
type PageLine = { heading: string; name: string | null; text: string; source: string }
const savedPages = JSON.parse(elementPages) as Record<string, { title: string; lines: PageLine[] }>
const pageLines = (symbol: string, heading: string) => savedPages[element(symbol).atomicNumber]!.lines.filter((line) => line.heading === heading)
const passages = (symbol: string, heading?: string) =>
  ((pagePassages as Record<string, { passages: { heading: string; source: string; text: string }[] }>)[element(symbol).atomicNumber]?.passages ?? [])
    .filter((passage) => heading === undefined || passage.heading === heading)
    .map((passage) => passage.text)
type Lib = {
  parseCiaawRadioactive(html: string): Map<number, { a: number }[]>
  parseDensitiesPage(wikitext: string): { symbol: string; form: string | null; values: Record<string, string> }[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../scripts/periodic-table-lib.mjs', { eager: true }))
const figures = (text: string) => [...text.matchAll(/\d+(\.\d+)?/g)].map((match) => match[0])

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

    it('notes as an estimate each radius the saved page gives with no uncertainty, both ends of the colour scale among them', () => {
      // "31(5) pm (Covalent)" carries an uncertainty in its last digit; "28 pm (Covalent)" carries none.
      const lines = periodicTable.flatMap((e) => pageLines(e.symbol, 'Atomic Radius').filter((line) => line.name === 'Covalent Atomic Radius').map((line) => ({ symbol: e.symbol, text: line.text })))
      const bare = lines.filter((line) => !/\(\d+\)/.test(line.text)).map((line) => line.symbol)
      expect(bare).toEqual(['He', 'Ne', 'Pm', 'At', 'Rn', 'Fr', 'Ac', 'Pa'])
      expect(lines.length - bare.length).toBe(88)
      for (const symbol of bare) {
        expect(notesOn(symbol, 'covalentRadius')).toEqual([
          {
            row: 'covalentRadius',
            text: "PubChem's page for this element gives this radius with no uncertainty, unlike its radii for 88 other elements. Treat it as an estimate.",
            sourceId: 'pubchem-element-pages',
          },
        ])
      }
      const radii = periodicTable.flatMap((e) => (e.covalentRadius ? [{ symbol: e.symbol, value: e.covalentRadius.value }] : [])).sort((a, b) => a.value - b.value)
      expect([radii[0]?.symbol, radii.at(-1)?.symbol]).toEqual(['He', 'Fr'])
      expect(symbolsWhere((e) => noteRows(e.symbol).includes('covalentRadius'))).toEqual(['He', 'C', 'Ne', 'Mn', 'Fe', 'Co', 'Pm', 'At', 'Rn', 'Fr', 'Ac', 'Pa'])
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

    // The next three cover what the cross-check leaves unresolved besides lawrencium (cross-check.md, "Unresolved").
    it("gives the second figure on PubChem's own page for the boiling points of barium and radium", () => {
      const pages = JSON.parse(elementPages) as Record<string, { lines: { heading: string; text: string }[] }>
      for (const [symbol, celsius, kelvin] of [['Ba', 1845, 2118], ['Ra', 1737, 2010]] as const) {
        const [note] = notesOn(symbol, 'boilingPoint')
        expect(note?.sourceId).toBe('pubchem-element-pages')
        expect(note?.text).toContain(`${celsius} °C, which is ${kelvin} K`)
        expect(Math.round(celsius + 273.15)).toBe(kelvin)
        const lines = pages[element(symbol).atomicNumber]!.lines.filter((line) => line.heading === 'Boiling Point').map((line) => line.text)
        expect(lines).toContain(`${celsius}°C`)
        expect(element(symbol).boilingPoint?.value).not.toBe(kelvin)
      }
    })

    it('gives the handbook figure for the densities of boron, americium and berkelium, and says it was read in a transcription', () => {
      const figures = { B: ['2.34 g/cm³'], Am: ['12 g/cm³'], Bk: ['14.78 g/cm³', '13.25 g/cm³'] }
      for (const [symbol, texts] of Object.entries(figures)) {
        const [note] = notesOn(symbol, 'density')
        expect(note?.sourceId).toBe('handbook-densities-wikipedia')
        for (const text of texts) expect(note?.text).toContain(text)
        expect(note?.text).toContain("as transcribed on Wikipedia's data page")
        expect(texts).not.toContain(`${element(symbol).density?.published} g/cm³`)
      }
      const source = sourceOf('handbook-densities-wikipedia')
      expect(source?.citation).toMatch(/Neither handbook was read.*revision \d+.*retrieved 2026-10-03/)
      expect(source?.url).toMatch(/oldid=\d+$/)
    })

    it("says where a boiling point on PubChem's own page contradicts the state PubChem expects", () => {
      const pages = JSON.parse(elementPages) as Record<string, { lines: { heading: string; text: string }[] }>
      const boiling = (symbol: string) => pages[element(symbol).atomicNumber]!.lines.filter((line) => line.heading === 'Boiling Point').map((line) => line.text)
      expect(element('Fl').standardState).toEqual({ state: 'Solid', expected: true })
      expect(boiling('Fl')).toEqual([expect.stringMatching(/^~210K/)])
      expect(notesOn('Fl', 'standardState')[0]?.text).toMatch(/about 210 K.*below room temperature.*would be a gas/)
      expect(element('Og').standardState).toEqual({ state: 'Gas', expected: true })
      expect(boiling('Og')).toEqual([expect.stringMatching(/^350±30K.*\(extrapolated\)$/)])
      expect(notesOn('Og', 'standardState')[0]?.text).toMatch(/350 ± 30 K, marked as extrapolated.*above room temperature.*would not be a gas/)
      for (const symbol of ['Fl', 'Og']) expect(notesOn(symbol, 'standardState')[0]?.sourceId).toBe('pubchem-element-pages')
    })

    it('carries exactly the notes authored in decisions.json, in their order', () => {
      for (const e of periodicTable) {
        const expected = authored.filter((note) => note.symbols.includes(e.symbol)).map(({ row, text, sourceId }) => ({ row, text, sourceId }))
        expect([e.symbol, e.notes ?? []]).toEqual([e.symbol, expected])
      }
      for (const symbol of authored.flatMap((note) => note.symbols)) expect(element(symbol).symbol).toBe(symbol)
    })

    it('puts every note on a value the element has, except the notes about a value the source leaves empty', () => {
      for (const note of authored) {
        for (const symbol of note.symbols) {
          expect([symbol, note.row, element(symbol)[note.row] === undefined]).toEqual([symbol, note.row, note.valueAbsent === true])
        }
      }
      expect(authored.filter((note) => note.valueAbsent).map((note) => note.row)).toEqual(['electronAffinity'])
    })

    it("rests each note that reports the prose of PubChem's pages on sentences kept from those pages", () => {
      // The year or temperature each note states, and words of the kept sentence it reports.
      const reported = [
        ['He', 'meltingPoint', [], 'remains liquid down to absolute zero at ordinary pressures, but will readily solidify by increasing the pressure'],
        ['As', 'meltingPoint', ['887'], 'In order to form liquid arsenic, the atmospheric pressure must be increased.'],
        ['Al', 'yearDiscovered', ['1825'], 'The ancient Greeks and Romans used alum'],
        ['Ca', 'yearDiscovered', ['1808'], 'lime was prepared by the Romans'],
        ['F', 'yearDiscovered', ['1670', '1886'], 'The first recorded use of a fluorine compound dates to around 1670'],
        ['Si', 'yearDiscovered', ['1854', '1824'], 'Crystalline silicon was first prepared'],
        ['Fr', 'electronegativity', [], 'No weighable quantity of the element has been prepared or isolated.'],
      ] as const
      for (const [symbol, row, stated, words] of reported) {
        const [note] = notesOn(symbol, row)
        expect([symbol, note?.sourceId]).toEqual([symbol, 'pubchem-element-pages'])
        expect([symbol, figures(note!.text)]).toEqual([symbol, stated])
        const kept = passages(symbol).join(' ')
        expect([symbol, kept]).toEqual([symbol, expect.stringContaining(words)])
        for (const figure of stated) expect([symbol, kept]).toEqual([symbol, expect.stringContaining(figure)])
      }
      expect(notesOn('He', 'meltingPoint')[0]?.text).toContain('it stays liquid however far it is cooled')
      // PubChem's page gives 28 atmospheres for arsenic and other tabulations about 36; the note states neither.
      expect(passages('As').join(' ')).toContain('At 28 times standard atmospheric pressure')
      expect(notesOn('As', 'meltingPoint')[0]?.text).not.toMatch(/28|36|atmospheres/)
      expect(notesOn('F', 'yearDiscovered')[0]?.text).toMatch(/^PubChem's fluorine page dates the first recorded use of a fluorine compound to about 1670/)
    })

    it("converts the second figure on PubChem's carbon page, and says which form of phosphorus its figures are for", () => {
      expect(pageLines('C', 'Boiling Point').map((line) => line.text)).toContain('3800°C(sublimation)')
      expect(notesOn('C', 'boilingPoint')[0]?.text).toContain('3800 °C, which is 4073 K, marked as sublimation')
      expect(Math.round(3800 + 273.15)).toBe(4073)
      // "44.15(whitephosphorus)" and "280.5(whitephosphorus)", in °C: the table's figures in kelvin.
      for (const [row, heading, celsius] of [['meltingPoint', 'Melting Point', '44.15'], ['boilingPoint', 'Boiling Point', '280.5']] as const) {
        expect(pageLines('P', heading).map((line) => line.text)).toContain(`${celsius}(whitephosphorus)`)
        expect((Number(celsius) + 273.15).toFixed(2)).toBe(element('P')[row]!.value.toFixed(2))
        expect(notesOn('P', row)).toEqual([{ row, text: "PubChem's phosphorus page labels this figure as white phosphorus's.", sourceId: 'pubchem-element-pages' }])
      }
    })

    it("names as predictions exactly the oxidation states PubChem's pages mark", () => {
      const signed = (text: string) => [...text.matchAll(/[+-]?\d+/g)].map((match) => Number(match[0])).sort((a, b) => a - b)
      const marked = periodicTable.flatMap((e) => {
        const line = pageLines(e.symbol, 'Oxidation States').find((l) => /predict/i.test(l.text))
        return line ? [[e, line.text] as const] : []
      })
      expect(marked.map(([e]) => e.symbol)).toEqual(['Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
      for (const [e, line] of marked) {
        const [note, ...others] = notesOn(e.symbol, 'oxidationStates')
        expect([e.symbol, others]).toEqual([e.symbol, []])
        // "5, (4), (3) (parenthesized oxidation states are predictions)" marks some; "9, 8, 6, 4, 3, 1 (predicted)" marks all.
        const inParentheses = [...line.matchAll(/\((\d+)\)/g)].map((match) => match[1])
        if (inParentheses.length === 0) {
          expect([e.symbol, line]).toEqual([e.symbol, expect.stringMatching(/ \(predict(ed|ion)\)$/)])
          expect([e.symbol, note?.text]).toEqual([e.symbol, "PubChem's page for this element marks all of these states as predictions."])
          expect([e.symbol, signed(line)]).toEqual([e.symbol, signed(e.oxidationStates!)])
        } else {
          expect([e.symbol, line]).toEqual([e.symbol, expect.stringMatching(/\(parenthesized oxidation states are predictions\)$/)])
          const named = /marks the states? ([\d, and]+) as (a prediction|predictions)\.$/.exec(note!.text)?.[1] ?? ''
          expect([e.symbol, figures(named)]).toEqual([e.symbol, inParentheses])
          // The table lists the same states with the marks dropped.
          expect([e.symbol, line.replace(/\s*\(parenthesized.*$/, '').replace(/[()]/g, '')]).toEqual([e.symbol, e.oxidationStates])
        }
      }
    })

    it("gives the fuller list on PubChem's page where the table shows one state for oxygen and for radon", () => {
      const losAlamos = (symbol: string) => pageLines(symbol, 'Oxidation States').find((line) => line.source.startsWith('Los Alamos'))?.text
      expect([element('O').oxidationStates, losAlamos('O')]).toEqual(['-2', '2, 1, -1, -2'])
      expect(notesOn('O', 'oxidationStates')[0]?.text).toBe("The list shows only −2. PubChem's oxygen page also lists −1, as in hydrogen peroxide, and +1 and +2.")
      expect(registry.molecules.some((m) => m.id === 'hydrogen-peroxide')).toBe(true)
      expect([element('Rn').oxidationStates, losAlamos('Rn')]).toEqual(['0', '6, 2, 0'])
      expect(notesOn('Rn', 'oxidationStates')[0]?.text).toBe("The list shows only 0. PubChem's radon page also lists +2 and +6.")
    })

    it("says where an empty electron affinity is a zero on PubChem's own page", () => {
      const zero = symbolsWhere((e) => !e.electronAffinity && pageLines(e.symbol, 'Electron Affinity')[0]?.text === '0 eV')
      expect(zero).toEqual(['He', 'Be', 'N', 'Ne', 'Mg', 'Ar', 'Ca', 'Mn', 'Zn', 'Kr', 'Sr', 'Cd', 'Xe', 'Ba', 'Hf', 'Hg', 'Rn', 'Ra'])
      expect(symbolsWhere((e) => noteRows(e.symbol).includes('electronAffinity'))).toEqual(zero)
      for (const symbol of zero) {
        expect(notesOn(symbol, 'electronAffinity')).toEqual([
          { row: 'electronAffinity', text: "PubChem's table leaves this empty. Its page for this element lists an electron affinity of 0 eV.", sourceId: 'pubchem-element-pages' },
        ])
      }
      // No page gives a zero for an element whose affinity the table does list.
      for (const e of periodicTable) if (e.electronAffinity) expect([e.symbol, pageLines(e.symbol, 'Electron Affinity')[0]?.text]).not.toEqual([e.symbol, '0 eV'])
    })

    it("says which electronegativities cannot be traced to a line on PubChem's own page: francium's and lawrencium's", () => {
      const pauling = (symbol: string) => pageLines(symbol, 'Electronegativity').find((line) => line.name === 'Pauling Scale Electronegativity')?.text
      const untraced = symbolsWhere((e) => !!e.electronegativity && pauling(e.symbol) === undefined)
      expect(untraced).toEqual(['Fr', 'Lr'])
      for (const e of periodicTable) {
        if (e.electronegativity && !untraced.includes(e.symbol)) expect([e.symbol, pauling(e.symbol)]).toEqual([e.symbol, `${e.electronegativity.published} (Pauling Scale)`])
      }
      expect(symbolsWhere((e) => noteRows(e.symbol).includes('electronegativity'))).toEqual(untraced)
      for (const symbol of untraced) {
        const [note] = notesOn(symbol, 'electronegativity')
        expect(note?.text).toContain(`PubChem's ${element(symbol).name.toLowerCase()} page has no Pauling electronegativity line, so this value could not be traced beyond PubChem's table.`)
        expect(note?.sourceId).toBe('pubchem-element-pages')
      }
      // Francium's is the lowest value there is, so it is the end of the colour scale.
      const lowest = periodicTable.filter((e) => e.electronegativity).reduce((a, b) => (a.electronegativity!.value <= b.electronegativity!.value ? a : b))
      expect([lowest.symbol, lowest.electronegativity?.published]).toEqual(['Fr', '0.7'])
      expect(notesOn('Fr', 'electronegativity')[0]?.text).toContain('no weighable quantity of francium has been prepared')
    })

    it("says that CIAAW's list of the most stable isotopes gives another isotope for darmstadtium, copernicium and oganesson", () => {
      const listed = lib!.parseCiaawRadioactive(radioactivePage)
      expect(listed.size).toBe(34)
      const massNumbers = (e: PeriodicElement) => (listed.get(e.atomicNumber) ?? []).map((isotope) => isotope.a)
      const differing = periodicTable.filter((e) => e.atomicMass.kind === 'isotope-mass' && !massNumbers(e).includes(e.atomicMass.massNumber))
      expect(differing.map((e) => [e.symbol, e.atomicMass.kind === 'isotope-mass' && e.atomicMass.massNumber, massNumbers(e)])).toEqual([
        ['Ds', 282, [281]],
        ['Cn', 286, [285]],
        ['Og', 295, [294]],
      ])
      for (const e of differing) {
        const shown = e.atomicMass.kind === 'isotope-mass' ? e.atomicMass.massNumber : undefined
        expect(notesOn(e.symbol, 'atomicMass')).toEqual([
          {
            row: 'atomicMass',
            text: `CIAAW's list of the most stable known isotopes gives mass number ${massNumbers(e)[0]} for ${e.name.toLowerCase()}, not the ${shown} whose mass PubChem prints.`,
            sourceId: 'ciaaw-radioactive-elements',
          },
        ])
      }
      expect(symbolsWhere((e) => noteRows(e.symbol).includes('atomicMass'))).toEqual(['Ds', 'Cn', 'Og'])
      expect(sourceOf('ciaaw-radioactive-elements')?.citation).toMatch(/most stable known isotopes.*NUBASE2020.*retrieved 2026-10-03/)
      expect(sourceOf('ciaaw-radioactive-elements')?.url).toBe('https://www.ciaaw.org/radioactive-elements.htm')
    })

    it('says of a state PubChem gives as a plain fact, for an element it lists no measurement for, that it is not worded as expected', () => {
      const unmarked = symbolsWhere((e) => !e.standardState.expected && !e.meltingPoint && !e.boilingPoint && !e.density)
      expect(unmarked).toEqual(['Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt'])
      for (const symbol of unmarked) {
        expect(notesOn(symbol, 'standardState')).toEqual([
          {
            row: 'standardState',
            text: 'PubChem does not word this as expected, but its table lists no melting point, boiling point or density for this element, and its page for the element says that only small amounts of it have ever been produced.',
            sourceId: 'pubchem-element-pages',
          },
        ])
        expect([symbol, passages(symbol, 'Uses')]).toEqual([symbol, [expect.stringMatching(/small amounts|only a few atoms/)]])
      }
      // The other notes on a state: the six below, and the three where a boiling point on the page speaks against it.
      expect(symbolsWhere((e) => noteRows(e.symbol).includes('standardState'))).toEqual(['At', 'Fr', 'Fm', 'Md', 'No', 'Lr', ...unmarked, 'Cn', 'Fl', 'Og'])
    })

    it('says the same of the state of the six elements whose melting point is noted as an estimate', () => {
      const estimated = symbolsWhere((e) => notesOn(e.symbol, 'meltingPoint').some((note) => note.text.includes('estimate')))
      expect(estimated).toEqual(['At', 'Fr', 'Fm', 'Md', 'No', 'Lr'])
      for (const symbol of estimated) {
        expect(element(symbol).standardState).toEqual({ state: 'Solid', expected: false })
        expect(notesOn(symbol, 'standardState')).toEqual([
          {
            row: 'standardState',
            text: 'PubChem does not word this as expected, but its page for the element says that only small amounts of it have ever been produced.',
            sourceId: 'pubchem-element-pages',
          },
        ])
        expect([symbol, passages(symbol, 'Uses')]).toEqual([symbol, [expect.stringMatching(/small amounts|tiny amounts/)]])
      }
    })

    it("gives the boiling point on PubChem's copernicium page, whose range leaves the expected state open", () => {
      expect(element('Cn').standardState).toEqual({ state: 'Solid', expected: true })
      const [line, ...rest] = pageLines('Cn', 'Boiling Point').map((l) => l.text)
      expect(rest).toEqual([])
      const [, kelvin, up, down] = /^(\d+)\+(\d+)-(\d+)K/.exec(line ?? '') ?? []
      expect([kelvin, up, down]).toEqual(['357', '112', '108'])
      // Room temperature, 298.15 K, lies inside the range the page gives.
      expect(Number(kelvin) - Number(down)).toBeLessThan(298.15)
      expect(Number(kelvin)).toBeGreaterThan(298.15)
      expect(notesOn('Cn', 'standardState')).toEqual([
        {
          row: 'standardState',
          text: "PubChem's copernicium page also lists a boiling point of about 357 K, with an uncertainty of about 110 K either way. That range reaches below room temperature, so by that figure copernicium could be a gas.",
          sourceId: 'pubchem-element-pages',
        },
      ])
    })

    it('marks as estimates the melting points of the six elements never made in an amount that could be melted', () => {
      const estimated = symbolsWhere((e) => notesOn(e.symbol, 'meltingPoint').some((note) => note.text.includes('estimate')))
      expect(estimated).toEqual(['At', 'Fr', 'Fm', 'Md', 'No', 'Lr'])
      for (const symbol of estimated) {
        expect([symbol, element(symbol).meltingPoint === undefined]).toEqual([symbol, false])
        expect(notesOn(symbol, 'meltingPoint')).toEqual([
          {
            row: 'meltingPoint',
            text: "This figure is an estimate, though PubChem does not mark it as one. No sample of this element large enough to melt has been made: PubChem's page for it says that only small amounts have ever been produced.",
            sourceId: 'pubchem-element-pages',
          },
        ])
        expect([symbol, passages(symbol, 'Uses')]).toEqual([symbol, [expect.stringMatching(/small amounts|tiny amounts/)]])
      }
      // What the pages say beyond "small amounts". Mendelevium, nobelium and lawrencium are heavier than fermium.
      expect(passages('At').join(' ')).toContain('A total of 0.05 micrograms')
      expect(passages('Fr').join(' ')).toContain('No weighable quantity of the element has been prepared or isolated.')
      expect(passages('Fm').join(' ')).toContain('Fermium metal has not been prepared')
      expect(passages('Fm').join(' ')).toContain('the heaviest element that can be prepared in macroscopic quantities')
      for (const symbol of ['Md', 'No', 'Lr']) expect(element(symbol).atomicNumber).toBeGreaterThan(element('Fm').atomicNumber)
    })

    it("quotes only handbook densities that the kept copy of Wikipedia's data page gives for both handbooks", () => {
      const solids = lib!.parseDensitiesPage(densitiesPage)
      const handbooks = (symbol: string, form: string | null) => {
        const entry = solids.find((solid) => solid.symbol === symbol && solid.form === form)
        return [entry?.values.CRC, entry?.values.LNG]
      }
      const quoted = (symbol: string) => figures(notesOn(symbol, 'density')[0]!.text)
      expect([handbooks('B', null), quoted('B')]).toEqual([['2.34', '2.34'], ['2.34']])
      expect([handbooks('Am', null), quoted('Am')]).toEqual([['12', '12'], ['12']])
      expect([handbooks('Bk', 'alpha'), handbooks('Bk', 'beta'), quoted('Bk')]).toEqual([['14.78', '14.78'], ['13.25', '13.25'], ['14.78', '13.25']])
      // Carbon's figure is graphite's (Lange's 2.267); diamond is the figure the note quotes.
      expect(Number(handbooks('C', 'graphite')[1])).toBe(element('C').density?.value)
      expect([handbooks('C', 'diamond'), quoted('C')]).toEqual([['3.513', '3.513'], ['3.513']])
      expect(notesOn('C', 'density')[0]?.text).toMatch(/^This is the density of graphite\. Diamond is denser/)
      // Phosphorus's figure is white phosphorus's, to the table's digits; the other forms are denser.
      expect([handbooks('P', 'white'), quoted('P')]).toEqual([['1.823', '1.823'], ['1.823']])
      expect(Number(handbooks('P', 'white')[0]).toFixed(2)).toBe(element('P').density?.published)
      for (const form of ['red', 'black']) {
        for (const value of handbooks('P', form)) if (value !== undefined) expect(Number(value)).toBeGreaterThan(1.823)
      }
      expect(notesOn('P', 'density')[0]?.text).toMatch(/^This is the density of white phosphorus: .* higher figures for red and black phosphorus/)
      const citing = periodicTable.flatMap((e) => (e.notes ?? []).filter((note) => note.sourceId === 'handbook-densities-wikipedia').map((note) => `${e.symbol} ${note.row}`))
      expect(citing).toEqual(['B density', 'C density', 'P density', 'Am density', 'Bk density'])
      for (const entry of citing) expect(notesOn(entry.split(' ')[0]!, 'density')[0]?.text).toContain("as transcribed on Wikipedia's data page")
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

// The report is written by scripts/cross-check-periodic-table.mjs (npm run cross-check).
describe('the cross-check report', () => {
  // Rows of its "Unresolved" table: | atomic number | Name (Symbol) | `row` | ...
  const section = crossCheck.split(/^## /m).find((part) => part.startsWith('Unresolved')) ?? ''
  const unresolved = [...section.matchAll(/^\| (\d+) \| [^|]*\((\w+)\) \| `(\w+)` \|/gm)].map(([, z, symbol, row]) => ({ z: Number(z), symbol: symbol!, row: row! }))

  it("lists lawrencium's configuration and the melting-point, boiling-point and density outliers as unresolved", () => {
    const listed = unresolved.map(({ symbol, row }) => `${symbol} ${row}`)
    expect(listed).toEqual(expect.arrayContaining(['Lr configuration', 'C meltingPoint', 'Ba boilingPoint', 'Ra boilingPoint', 'B density', 'Am density', 'Bk density']))
    expect(new Set(listed).size).toBe(listed.length)
  })

  it('also lists the values PubChem gives as plain facts that are predictions, estimates, untraced, or not the isotope CIAAW lists', () => {
    const listed = unresolved.map(({ symbol, row }) => `${symbol} ${row}`)
    expect(listed).toEqual(
      expect.arrayContaining([
        ...['Ds', 'Cn', 'Og'].map((symbol) => `${symbol} atomicMass`),
        ...['Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt'].map((symbol) => `${symbol} standardState`),
        ...['At', 'Fr', 'Fm', 'Md', 'No', 'Lr'].map((symbol) => `${symbol} meltingPoint`),
        ...['Fr', 'Lr'].map((symbol) => `${symbol} electronegativity`),
        ...['At', 'Fr', 'Fm', 'Md', 'No', 'Lr', 'Cn'].map((symbol) => `${symbol} standardState`),
        ...['He', 'Ne', 'Pm', 'At', 'Rn', 'Fr', 'Ac', 'Pa'].map((symbol) => `${symbol} covalentRadius`),
      ]),
    )
    expect(listed.length).toBe(41)
  })

  it('leaves no unresolved item without a note on the row it names', () => {
    for (const { z, symbol, row } of unresolved) {
      expect([symbol, element(symbol).atomicNumber]).toEqual([symbol, z])
      expect([symbol, row, notesOn(symbol, row).length > 0]).toEqual([symbol, row, true])
    }
  })

  it('states the outcome the spec records (5.6)', () => {
    const summary = crossCheck.split(/^## /m).find((part) => part.startsWith('Summary')) ?? ''
    expect(summary).toContain('| Atomic mass | Abridged Standard Atomic Weights 2024 (CIAAW) | 84 | 80, plus 2 ties (Ar, Fe) | 2 (Li, S) |')
    expect(summary).toContain('| First ionization energy | NIST Atomic Spectra Database | 102 | 76 | 26, of which 9 by 0.1 eV or more |')
    expect(summary).toContain('| Ground-state configuration | NIST Atomic Spectra Database | 108 | 107 | 1 (Lr) | 10: not in NIST |')
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

// The notes the table's legends carry. They are held to the same checks as the descriptions.
const LEGEND_NOTES = [...CATEGORY_NOTES, ...Object.values(TREND_NOTES).flat()]

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
    ...LEGEND_NOTES.map((note, i) => [`legend note ${i + 1}`, note] as const),
    // The element card's sentence that cites a textbook section. The card's other sentences are checked in periodicCard.test.ts.
    ['the card note on electron affinity', ELECTRON_AFFINITY_NOTE] as const,
  ]

  // The sources whose words may be copied: OpenStax is CC BY 4.0, and PubChem's own labels and this project's files are not another
  // publisher's prose. Every other source is located and put in this project's words (see `located`).
  const QUOTABLE = /^(openstax-chem2e-[\d.]+|pubchem-element-pages|pubchem-periodic-table)$/
  const supportLines = (description: { support: string }) =>
    description.support.split('\n').map((line) => /^([a-z0-9.-]+): (.*)$/.exec(line) ?? /^(Counted from this table): (.*)$/.exec(line)!)

  it('quotes only OpenStax and PubChem; any other source is located, with its address and what it establishes, and not quoted', () => {
    const located = all.flatMap(([what, description]) => supportLines(description).filter(([, id]) => id !== 'Counted from this table' && !QUOTABLE.test(id!)).map(([, id, passage]) => [what, id!, passage!] as const))
    expect(new Set(located.map(([, id]) => id))).toEqual(new Set(['iupac-red-book-2005', 'iupac-periodic-table', 'rsc-periodic-table', 'iupac-group-3-report-2021']))
    for (const [what, id, passage] of located) {
      // The Royal Society of Chemistry's drawing is described in the group 3 note, not read as a passage.
      if (id === 'rsc-periodic-table' && passage.startsWith('the table is drawn with')) continue
      expect([what, id, passage]).toEqual([what, id, expect.stringMatching(/^not quoted; see .+, https:\/\/\S+\. It establishes that .+\.$/)])
      // What stands in quotation marks is a heading or a title, never a sentence.
      for (const [, quoted] of passage.matchAll(/“([^”]*)”/g)) expect([what, id, quoted!.split(' ').length]).toEqual([what, id, expect.toSatisfy((words: number) => words <= 10)])
    }
    // 4 groups named after their first element twice over (the Red Book and the pages of their heaviest members), and so on: every one is checked above.
    expect(located.length).toBeGreaterThan(30)
  })

  it('gives the licence of OpenStax Chemistry 2e in every citation of it, since its passages are quoted', () => {
    const openstax = registry.sources.filter((source) => source.id.startsWith('openstax-'))
    expect(openstax.length).toBe(10)
    for (const source of openstax) {
      expect([source.id, source.citation]).toEqual([source.id, expect.stringContaining('Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction')])
    }
  })

  it('gives every group, period and block a text, at least one known source, and the passage behind each source', () => {
    expect(all.length).toBe(18 + 7 + 4 + 1 + 4 + 2 + 1)
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

  it('states for group 2 the one oxidation state the table lists for every member: +2', () => {
    const text = describeGroup(2).text
    expect(text).toContain('these metals have an oxidation state of +2 in their compounds')
    expect([...text.matchAll(/[+−-]\d/g)].map((match) => match[0])).toEqual(['+2'])
    expect(inGroup(2).map((e) => element(e.symbol).oxidationStates)).toEqual(['+2', '+2', '+2', '+2', '+2', '+2'])
    // "Reactive", not "very reactive": the passage says so of the group, but it is not true of beryllium.
    expect(text).toContain('They are reactive metals, though less so than the alkali metals.')
  })

  it('says which group is meant by "the iron group", a name also used for iron, cobalt and nickel', () => {
    expect(describeGroup(8).text).toMatch(/^The iron group \(group 8\): iron, ruthenium, osmium and hassium\./)
    for (const group of [4, 5, 6, 7, 9, 10, 11]) expect([group, describeGroup(group).text]).toEqual([group, expect.not.stringContaining('(group')])
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

  // Spec 5.5 says "placed by position" of elements 109 to 118 only: the chemistry of rutherfordium to hassium has been studied.
  it('says of each element from rutherfordium on that few atoms have been made, of each from meitnerium on that it is placed by atomic number, and neither of a lighter one', () => {
    for (const group of GROUPS) {
      const text = describeGroup(group).text
      for (const member of inGroup(group)) {
        const name = `${member.name[0]?.toUpperCase()}${member.name.slice(1)}`
        const z = element(member.symbol).atomicNumber
        expect([member.symbol, text.includes(`${name} is placed here by its atomic number; few atoms of it have ever been made.`)]).toEqual([member.symbol, z >= 109])
        expect([member.symbol, text.includes(`Few atoms of ${member.name} have ever been made.`)]).toEqual([member.symbol, z >= 104 && z <= 108])
        expect([member.symbol, new RegExp(`${member.name}[^.]*(placed here|few atoms)|few atoms of ${member.name}`, 'i').test(text)]).toEqual([member.symbol, z >= 104])
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
    expect(GROUP_3_NOTE.sourceIds).toEqual(['iupac-periodic-table', 'openstax-chem2e-19.1', 'rsc-periodic-table', 'pubchem-element-pages', 'iupac-group-3-report-2021'])
  })

  it("says in that note that PubChem, the card's own source, follows the other convention, as its element pages show", () => {
    expect(GROUP_3_NOTE.text).toContain('PubChem, the source of most values here, puts lutetium and lawrencium in group 3.')
    const groupLine = (symbol: string) => pageLines(symbol, 'Element Group Number').map((line) => line.text)
    expect([groupLine('Lu'), groupLine('Lr'), groupLine('La'), groupLine('Ac')]).toEqual([['3 - Lanthanide'], ['3 - Actinide'], ['- Lanthanide'], ['- Actinide']])
    expect([groupLine('Sc'), groupLine('Y')]).toEqual([['3'], ['3']])
    for (const line of ['“3 - Lanthanide”', '“3 - Actinide”', '“- Lanthanide”', '“- Actinide”']) expect(GROUP_3_NOTE.support).toContain(line)
    // This table's own rule is the other one.
    expect(['Lu', 'Lr', 'La', 'Ac'].map((symbol) => elementPosition(element(symbol).atomicNumber).group)).toEqual([null, null, 3, 3])
  })

  it("reports the 2021 provisional report of IUPAC's task group, which leaned to lutetium and lawrencium, without calling it a ruling", () => {
    expect(GROUP_3_NOTE.text).toContain("A provisional report from an IUPAC task group in 2021 leaned towards lutetium and lawrencium, but IUPAC has not ruled on the question.")
    expect(GROUP_3_NOTE.support).toContain('iupac-group-3-report-2021: ')
    // The report is located and put in this project's words, not quoted.
    expect(GROUP_3_NOTE.support).toContain('iupac-group-3-report-2021: not quoted; see ')
    expect(GROUP_3_NOTE.support).toContain('suggested as a compromise the table of its Figure 2, which has lutetium and lawrencium in group 3')
    expect(GROUP_3_NOTE.support).not.toContain('Perhaps a compromise')
    const report = sourceOf('iupac-group-3-report-2021')
    expect(report?.citation).toMatch(/^Scerri, E\. Provisional Report on Discussions on Group 3 of The Periodic Table\. Chem\. Int\. 2021, 43 \(1\), 31-34 \(retrieved 2026-10-03\)/)
    expect(report?.url).toBe('https://doi.org/10.1515/ci-2021-0115')
  })

  it('throws for a group, period or block that does not exist', () => {
    for (const group of [0, 19, 1.5]) expect(() => describeGroup(group)).toThrow(/no group/)
    for (const period of [0, 8, 2.5]) expect(() => describePeriod(period)).toThrow(/no period/)
    expect(() => describeBlock('g' as Block)).toThrow(/no block/)
  })
})

describe('the legend', () => {
  const names = (test: (e: PeriodicElement) => boolean) => periodicTable.filter(test).map((e) => e.name.toLowerCase())
  const note = (start: string) => {
    const found = CATEGORY_NOTES.find((n) => n.text.startsWith(start))
    if (!found) throw new Error(`no legend note starts "${start}"`)
    return found
  }

  it("lists PubChem's ten categories once each, in the order the table meets them from the left", () => {
    expect(CATEGORIES.map((c) => c.category)).toEqual([
      'Alkali metal',
      'Alkaline earth metal',
      'Transition metal',
      'Post-transition metal',
      'Metalloid',
      'Nonmetal',
      'Halogen',
      'Noble gas',
      'Lanthanide',
      'Actinide',
    ])
    expect(new Set(periodicTable.map((e) => e.category))).toEqual(new Set(CATEGORIES.map((c) => c.category)))
  })

  it('shows "Nonmetal" as "Other nonmetals", and every other category under its own name', () => {
    expect(CATEGORY_HEADING).toBe("Chemical family (PubChem's grouping)")
    expect(CATEGORIES.find((c) => c.category === 'Nonmetal')).toEqual({ category: 'Nonmetal', member: 'other nonmetal', family: 'Other nonmetals' })
    for (const { category, member, family } of CATEGORIES) {
      if (category === 'Nonmetal') continue
      expect(member).toBe(category.toLowerCase())
      expect(family).toBe(category === 'Noble gas' ? 'Noble gases' : `${category}s`)
    }
  })

  it('says that the halogens fluorine to iodine and the noble gases helium to radon are nonmetals too', () => {
    const { text, sourceIds, support } = note('Fluorine, chlorine, bromine, iodine')
    expect(text).toBe('Fluorine, chlorine, bromine, iodine and the noble gases helium to radon are nonmetals too; PubChem lists them under their family names.')
    expect(['F', 'Cl', 'Br', 'I'].map((s) => element(s).category)).toEqual(Array(4).fill('Halogen'))
    expect(['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'].map((s) => element(s).category)).toEqual(Array(6).fill('Noble gas'))
    // Astatine, tennessine and oganesson are left out: the passage does not speak of them.
    expect(text).not.toMatch(/astatine|tennessine|oganesson/i)
    expect(sourceIds).toEqual(['openstax-chem2e-18.4', 'openstax-chem2e-18.12'])
    expect(support).toContain('the other nonmetal gases—hydrogen, nitrogen, oxygen, fluorine, and chlorine')
    expect(support).toContain('The other halogens are also diatomic; Br₂ is a liquid and I₂ exists as a solid')
  })

  it("names the six metalloids of the textbook and the one PubChem's table adds, which its own page calls a metal", () => {
    const { text, sourceIds, support } = note('Sources differ')
    const six = ['boron', 'silicon', 'germanium', 'arsenic', 'antimony', 'tellurium']
    expect(text).toContain(`OpenStax Chemistry 2e lists six: ${six.slice(0, -1).join(', ')} and ${six.at(-1)}.`)
    expect(names((e) => e.category === 'Metalloid').filter((name) => !six.includes(name))).toEqual(['polonium'])
    expect(names((e) => e.category === 'Metalloid').length).toBe(7)
    expect(text).toContain("PubChem's table adds polonium, which PubChem's own page for polonium classes as a metal.")
    expect(pageLines('Po', 'Element Classification').map((line) => line.text)).toEqual(['Metal'])
    expect(sourceIds).toEqual(['openstax-chem2e-18.3', 'pubchem-element-pages'])
    expect(support).toContain('The metalloids are boron, silicon, germanium, arsenic, antimony, and tellurium.')
    expect(sourceOf('openstax-chem2e-18.3')?.citation).toMatch(/Section 18\.3 Structure and General Properties of the Metalloids \(retrieved 2026-10-03\)\. Licensed under CC BY 4\.0 /)
  })

  it('says that group 12 is shown with the transition metals and is not always counted among them', () => {
    const { text, sourceIds } = note('Zinc')
    const group12 = periodicTable.filter((e) => elementPosition(e.atomicNumber).group === 12)
    expect(text).toBe('Zinc, cadmium, mercury and copernicium are shown as transition metals; group 12 is not always counted among them.')
    expect(group12.map((e) => e.name)).toEqual(['Zinc', 'Cadmium', 'Mercury', 'Copernicium'])
    expect(group12.map((e) => e.category)).toEqual(Array(4).fill('Transition metal'))
    expect(sourceIds).toEqual(['iupac-red-book-2005'])
  })

  it('says that elements 109 to 118 are placed by position, and claims no chemistry for them', () => {
    const { text, sourceIds, support } = note('Meitnerium')
    expect(text).toBe('Meitnerium to oganesson are placed in their families by position; only a few atoms of each have ever been made.')
    expect([element('Mt').atomicNumber, element('Og').atomicNumber]).toEqual([109, 118])
    expect(sourceIds).toEqual(['rsc-periodic-table'])
    // Located on the Royal Society of Chemistry's pages and put in this project's words, not quoted.
    expect(support).toBe(
      'rsc-periodic-table: not quoted; see the element page of each of the ten, “Uses and properties”, under “Appearance”, https://periodic-table.rsc.org/. It establishes that only a few atoms of the element have ever been made.\nCounted from this table: the first and last of the ten, elements 109 to 118.',
    )
  })

  it('carries exactly these four notes on the families', () => {
    expect(CATEGORY_NOTES.length).toBe(4)
  })

  it('notes, on the electronegativity scale, which noble gases have a value', () => {
    expect(TREND_NOTES.electronegativity.map((n) => n.text)).toEqual(['Among the noble gases PubChem lists a value only for krypton and xenon.'])
    expect(symbolsWhere((e) => e.category === 'Noble gas' && e.electronegativity !== undefined)).toEqual(['Kr', 'Xe'])
  })

  it('notes, on the density scale, that the gases sit together at the bottom, and at what conditions', () => {
    expect(TREND_NOTES.density.map((n) => n.text)).toEqual([
      'The 11 elements that are gases at room temperature have the lowest densities, all below 0.01 g/cm³, and sit together at the bottom of the scale. Those figures are for the gas at 0 °C and atmospheric pressure.',
    ])
    const gases = periodicTable.filter((e) => e.standardState.state === 'Gas' && !e.standardState.expected)
    const others = periodicTable.filter((e) => !gases.includes(e) && e.density !== undefined)
    expect(gases.length).toBe(11)
    for (const gas of gases) {
      expect([gas.symbol, gas.density!.value]).toEqual([gas.symbol, expect.toSatisfy((d: number) => d < 0.01)])
      expect(gas.notes?.find((n) => n.row === 'density')?.text).toContain('at 0 °C and atmospheric pressure')
    }
    expect(Math.min(...others.map((e) => e.density!.value))).toBeGreaterThan(0.5)
    // Oganesson is only expected to be a gas, and has no density.
    expect([element('Og').standardState, element('Og').density]).toEqual([{ state: 'Gas', expected: true }, undefined])
  })

  it('has no authored note for the other three scales, whose ends carry their own notes or need none', () => {
    const others: TrendProperty[] = ['covalentRadius', 'ionizationEnergy', 'meltingPoint']
    expect(others.map((property) => TREND_NOTES[property])).toEqual([[], [], []])
    expect(Object.keys(TREND_NOTES)).toEqual(['electronegativity', 'covalentRadius', 'ionizationEnergy', 'meltingPoint', 'density'])
  })
})
