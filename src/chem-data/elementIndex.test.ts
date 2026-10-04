import { describe, expect, it } from 'vitest'
import crossCheck from '../../docs/research/periodic-table/cross-check.md?raw'
import { ELEMENT_ALIASES, ELEMENT_INDEX } from './elementIndex'
import { periodicTable } from './periodic'

describe('ELEMENT_INDEX', () => {
  it('matches the periodic table: symbol, name and atomic number, in order', () => {
    expect(ELEMENT_INDEX).toEqual(periodicTable.map(({ symbol, name, atomicNumber }) => ({ symbol, name, atomicNumber })))
  })

  it('has the 118 elements', () => {
    expect(ELEMENT_INDEX).toHaveLength(118)
  })
})

describe('ELEMENT_ALIASES', () => {
  it('holds the two spellings the search must find although PubChem does not use them', () => {
    expect(ELEMENT_ALIASES).toEqual({ Al: 'Aluminium', Cs: 'Caesium' })
  })

  it("are CIAAW's spellings of the only two names the cross-check finds spelled differently", () => {
    expect(crossCheck).toContain("Names that differ from CIAAW's (IUPAC) spelling: Aluminum (CIAAW: aluminium), Cesium (CIAAW: caesium).")
    for (const [symbol, alias] of Object.entries(ELEMENT_ALIASES)) {
      const entry = ELEMENT_INDEX.find((e) => e.symbol === symbol)
      expect(entry, symbol).toBeDefined()
      expect(alias).not.toBe(entry!.name)
    }
  })
})

describe('the full periodic table', () => {
  // The app shell (the palette, Home, the atom cards) uses the small index. A static import of the table from
  // anywhere else would put its 118 records into a chunk that loads before the table is asked for.
  const files = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
  const importsTheTable = (code: string) => /from '[^']*\/(periodic|periodicCard|periodic-table\.json)'/.test(code)

  it('is imported only by its own page, by the modules that build it, and by tests', () => {
    const allowed = (path: string) => path.startsWith('/src/app/explore/elements/') || path.endsWith('.test.ts') || ['/src/chem-data/periodic.ts', '/src/chem-data/periodicCard.ts'].includes(path)
    const paths = Object.keys(files)
    expect(paths).toContain('/src/app/palette/items.ts')
    expect(importsTheTable(files['/src/app/explore/elements/PeriodicTablePage.tsx']!)).toBe(true)
    expect(paths.filter((path) => !allowed(path) && importsTheTable(files[path]!))).toEqual([])
  })
})
