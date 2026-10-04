import { describe, expect, it } from 'vitest'
import download from '../../docs/research/periodic-table/pubchem-periodic-table.json'
import nistFile from '../../docs/research/periodic-table/sources/nist-asd-ie-neutral.txt?raw'
import densitiesPage from '../../docs/research/periodic-table/sources/wikipedia-densities-of-the-elements-data-page.wikitext?raw'
import { CONFIGURATION_TEXT } from './schema'

// The checks scripts/build-chem-data.mjs runs on its inputs, tested here on inputs it must refuse.
// The script itself writes files, so its checks live in scripts/periodic-table-lib.mjs as plain functions.
type Lib = {
  CONFIGURATION_TEXT: RegExp
  parseNistIe(text: string): { z: number; spectrum: string; energy: string; flag: string }[]
  checkConfiguration(text: string, atomicNumber: number): void
  noteProblem(record: Record<string, unknown>, note: { row: string; valueAbsent?: boolean }): string | null
  parseDensitiesPage(wikitext: string): { z: number; symbol: string; form: string | null; values: Record<string, string> }[]
}
const [lib] = Object.values(import.meta.glob<Lib>('../../scripts/periodic-table-lib.mjs', { eager: true }))
const { parseNistIe, checkConfiguration, noteProblem, parseDensitiesPage } = lib!

describe('parseNistIe', () => {
  // "22"	"Ti I"	"0"	"Titanium"	"Ti"	"[Ar].3d2.4s2"	"3d2.4s2"	"3F<2>"	"..."	""	"6.828120"	""	"0.000012"	"L17996"
  const row = (prefix: string, suffix: string) =>
    ['22', 'Ti I', '0', 'Titanium', 'Ti', '[Ar].3d2.4s2', '3d2.4s2', '3F<2>', '3d2.4s 4F<3/2>', prefix, '6.828120', suffix, '0.000012', 'L17996']
      .map((cell) => `"${cell}"`)
      .join('\t')

  it("reads NIST's three markings: none, square brackets, parentheses", () => {
    expect(parseNistIe(row('', ''))[0]).toMatchObject({ z: 22, spectrum: 'Ti I', energy: '6.828120', flag: 'measured' })
    expect(parseNistIe(row('[', ']'))[0]?.flag).toBe('semi-empirical')
    expect(parseNistIe(row('(', ')'))[0]?.flag).toBe('theoretical')
    const saved = parseNistIe(nistFile)
    expect(saved.length).toBe(108)
    expect(saved.filter((r) => r.flag !== 'measured').map((r) => r.spectrum)).toEqual(['H I', 'Pr I', 'Pa I', 'Fm I', 'Md I', 'Rf I', 'Db I', 'Sg I', 'Bh I', 'Hs I'])
  })

  it.each([
    ['an unknown marking', '<', '>'],
    ['an opening mark with no closing one', '(', ''],
    ['a closing mark with no opening one', '', ']'],
    ['a mismatched pair', '(', ']'],
    ['a doubled mark', '[]', ''],
  ])('refuses %s, so a value NIST does not give as measured is never read as measured', (_, prefix, suffix) => {
    expect(() => parseNistIe(row(prefix, suffix))).toThrow(/NIST row 22.*marking/)
  })
})

describe('checkConfiguration', () => {
  const columns = download.Table.Columns.Column
  const rows = download.Table.Row.map((r) => Object.fromEntries(columns.map((column, i) => [column, r.Cell[i]!])))
  const stored = (text: string) => text.replace(/ \((predicted|calculated)\)$/, '')

  it('accepts every configuration in the download once its marking is removed', () => {
    expect(rows.length).toBe(118)
    for (const r of rows) expect(() => checkConfiguration(stored(r.ElectronConfiguration!), Number(r.AtomicNumber))).not.toThrow()
  })

  it.each([
    ['text that is not a configuration', 'foo', 1],
    ['an empty text', '', 1],
    ['trailing space', '1s1 ', 1],
    ['two spaces between subshells', '[He]2s2  2p1', 5],
    ['a marking left in the text', '[Rn]7s2 5f14 6d7 (calculated)', 109],
    ['a subshell with no count', '[He]2s', 3],
    ['an unknown core', '[Xx]2s1', 3],
    ['a subshell the core already holds', '[Ne]2p1', 11],
  ])('refuses %s', (_, text, atomicNumber) => {
    expect(() => checkConfiguration(text, atomicNumber)).toThrow(/configuration/)
  })

  it('refuses a configuration whose electrons do not sum to the atomic number', () => {
    expect(() => checkConfiguration('1s2', 1)).toThrow(/holds 2 electrons, not 1/)
    expect(() => checkConfiguration('[Ar]4s2 3d6', 27)).toThrow(/holds 26 electrons, not 27/)
    expect(() => checkConfiguration('[Ar]4s2 3d6', 26)).not.toThrow()
  })

  it('uses the pattern the schema uses', () => {
    expect(lib!.CONFIGURATION_TEXT.source).toBe(CONFIGURATION_TEXT.source)
    expect(lib!.CONFIGURATION_TEXT.flags).toBe(CONFIGURATION_TEXT.flags)
  })
})

describe('noteProblem', () => {
  const oganesson = { symbol: 'Og', category: 'Noble gas', standardState: { state: 'Gas', expected: true }, oxidationStates: '+6, +4, +2, +1, 0, -1', atomicMass: {} }

  it('accepts a note on a row the element has', () => {
    for (const row of ['category', 'standardState', 'oxidationStates', 'atomicMass']) expect(noteProblem(oganesson, { row })).toBeNull()
  })

  it('refuses a note on a value the element does not have', () => {
    expect(noteProblem(oganesson, { row: 'density' })).toMatch(/Og has no density/)
    expect(noteProblem({ symbol: 'Nh' }, { row: 'oxidationStates' })).toMatch(/Nh has no oxidationStates/)
  })

  it('accepts a note about an absent value only where the value is absent', () => {
    expect(noteProblem(oganesson, { row: 'electronAffinity', valueAbsent: true })).toBeNull()
    expect(noteProblem({ ...oganesson, electronAffinity: {} }, { row: 'electronAffinity', valueAbsent: true })).toMatch(/Og has a value for electronAffinity/)
  })
})

describe('parseDensitiesPage', () => {
  const solids = parseDensitiesPage(densitiesPage)
  const of = (symbol: string) => solids.filter((entry) => entry.symbol === symbol)

  it('reads the solid-phase table: one entry per element and form, with the values given in g/cm³', () => {
    expect(of('B')).toEqual([{ z: 5, symbol: 'B', form: null, values: { use: '2.34', LNG: '2.34', CRC: '2.34' } }])
    expect(of('C')).toEqual([
      { z: 6, symbol: 'C', form: 'graphite', values: { use: '2.267', LNG: '2.267', CRC: '2.2' } },
      { z: 6, symbol: 'C', form: 'diamond', values: { use: '3.513', LNG: '3.513', CRC: '3.513' } },
    ])
    expect(of('Bk').map((entry) => [entry.form, entry.values.CRC, entry.values.LNG])).toEqual([
      ['alpha', '14.78', '14.78'],
      ['beta', '13.25', '13.25'],
    ])
    // One block per solid; the liquid and gas tables further down the page are not read.
    expect(of('Fe').length).toBe(1)
    expect(of('H')).toEqual([])
  })

  it('refuses a page without the solid-phase table', () => {
    expect(() => parseDensitiesPage('== Density, gas phase ==')).toThrow(/solid/)
  })
})
