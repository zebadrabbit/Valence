import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_HEADING, CATEGORY_NOTES, describeBlock, describeGroup, describePeriod, GROUP_3_NOTE, NO_VALUE, periodicTable } from '@/chem-data/periodic'
import { registry } from '@/chem-data/registry'
import { ElementGrids } from './ElementGrids'
import { ElementList } from './ElementList'
import { PeriodicTablePage } from './PeriodicTablePage'
import { TableLegend } from './TableLegend'
import { HighlightDescription } from './TableNotes'
import { DETACHED_ROWS } from './tableLayout'
import { trendNotes } from './trend'

// The functions that build the wording are tested beside them. These check the markup the page puts it in;
// focus, keys, layout and themes are checked in a browser.

const routed = (path: string, element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(Routes, null, createElement(Route, { path: 'explore/elements/:symbol?', element }))))
const page = (path: string) => routed(path, createElement(PeriodicTablePage))
// React escapes apostrophes and ampersands in text and attributes.
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const tables = (html: string) => [...html.matchAll(/<table.*?<\/table>/gs)].map((match) => match[0])
const element = (symbol: string) => periodicTable.find((e) => e.symbol === symbol)!

describe('the periodic table page', () => {
  const bare = page('/explore/elements')
  const xenon = page('/explore/elements/Xe')

  it('draws two native tables, each a grid, with a name', () => {
    const [main, detached, ...rest] = tables(bare)
    expect(rest).toEqual([])
    expect(main).toMatch(/^<table role="grid" aria-label="Periodic table, periods 1 to 7"/)
    expect(detached).toMatch(/^<table role="grid" aria-label="Cerium to lutetium and thorium to lawrencium"/)
  })

  it('has 118 cell links, one for each element, to the address of that element', () => {
    const [main, detached] = tables(bare)
    expect(count(main!, /<a /g)).toBe(90)
    expect(count(detached!, /<a /g)).toBe(28)
    for (const e of periodicTable) expect(count(main! + detached!, new RegExp(`<a [^>]*href="/explore/elements/${e.symbol}"`, 'g'))).toBe(1)
  })

  it('heads the main table with 18 groups and 7 periods, and each row below it with its elements', () => {
    const [main, detached] = tables(bare)
    const columns = [...main!.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))
    expect(columns).toEqual(Array.from({ length: 18 }, (_, i) => `Group ${i + 1}`))
    const rows = [...main!.matchAll(/<th scope="row"[^>]*>(.*?)<\/th>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))
    expect(rows).toEqual(Array.from({ length: 7 }, (_, i) => `Period ${i + 1}`))
    expect(detached).not.toContain('scope="col"')
    const below = [...detached!.matchAll(/<th scope="row"[^>]*>(.*?)<\/th>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))
    expect(below).toEqual(['* Cerium to lutetium, period 6', '** Thorium to lawrencium, period 7'])
  })

  it('marks lanthanum and actinium with a pointer to the rows below', () => {
    const [main] = tables(bare)
    for (const row of DETACHED_ROWS) expect(main).toContain(row.note)
    expect(DETACHED_ROWS[0]!.note).toBe('Cerium to lutetium, atomic numbers 58 to 71, come after lanthanum and are drawn below the main table.')
    expect(count(main!, /class="pt-marker"/g)).toBe(2)
  })

  it('marks exactly one cell as current when an element is selected, and none when none is', () => {
    const cells = tables(xenon).join('')
    expect(count(cells, /aria-current="page"/g)).toBe(1)
    expect(cells).toMatch(/<a [^>]*aria-current="page"[^>]*aria-label="Xenon, Xe, atomic number 54, noble gas"|<a [^>]*aria-label="Xenon, Xe, atomic number 54, noble gas"[^>]*aria-current="page"/)
    expect(count(tables(bare).join(''), /aria-current/g)).toBe(0)
  })

  it('gives the two grids one tab stop: the selected element, or hydrogen when none is selected', () => {
    const stop = (html: string) => [...tables(html).join('').matchAll(/<a [^>]*>/g)].map((match) => match[0]).filter((tag) => tag.includes('tabindex="0"'))
    expect(stop(bare).length).toBe(1)
    expect(stop(bare)[0]).toContain('aria-label="Hydrogen, H, atomic number 1, other nonmetal"')
    expect(stop(xenon).length).toBe(1)
    expect(stop(xenon)[0]).toContain('aria-label="Xenon, Xe')
    expect(count(tables(bare).join(''), /tabindex="-1"/g)).toBe(117)
  })

  it('announces the selection in a status line', () => {
    expect(xenon).toMatch(/<p role="status"[^>]*>Selected: Xenon\. Its details are below the table\.\s*<\/p>/)
    expect(bare).toMatch(/<p role="status"[^>]*><\/p>/)
  })

  it('matches the symbol in the address without regard to case', () => {
    for (const path of ['/explore/elements/xe', '/explore/elements/XE']) {
      const html = page(path)
      expect(html).toContain('Selected: Xenon.')
      expect(count(tables(html).join(''), /aria-current="page"/g)).toBe(1)
    }
  })

  it('shows the not-found page for a symbol no element has', () => {
    for (const path of ['/explore/elements/Xx', '/explore/elements/J', '/explore/elements/xenon']) {
      const html = page(path)
      expect(html).toContain('Page not found')
      expect(html).not.toContain('<table')
    }
  })

  it('shows the family legend as ten toggle buttons, none pressed, under its heading', () => {
    expect(bare).toContain(escaped(CATEGORY_HEADING))
    expect(count(bare, /<button[^>]*aria-pressed="false"/g)).toBe(10)
    expect(count(bare, /aria-pressed="true"/g)).toBe(0)
    for (const { family } of CATEGORIES) expect(bare).toMatch(new RegExp(`<button[^>]*aria-pressed[^>]*>.*?${family}</button>`))
  })

  it('carries the notes on the families and the note on group 3', () => {
    for (const note of CATEGORY_NOTES) expect(bare).toContain(escaped(note.text))
    expect(bare).toContain('Note on group 3')
    expect(bare).toContain(escaped(GROUP_3_NOTE.text))
  })

  it('offers colouring by family or by one of five properties, and a highlight from four sets of options', () => {
    const selects = [...bare.matchAll(/<select.*?<\/select>/gs)].map((match) => match[0])
    expect(selects.length).toBe(2)
    expect([...selects[0]!.matchAll(/<option[^>]*>(.*?)<\/option>/g)].map((match) => match[1])).toEqual([
      'Chemical family',
      'Electronegativity (Pauling scale)',
      'Covalent radius',
      'First ionization energy',
      'Melting point',
      'Density',
    ])
    expect([...selects[1]!.matchAll(/<optgroup label="([^"]*)"/g)].map((match) => match[1])).toEqual(['Group', 'Period', 'Block', 'Chemical family'])
    expect(count(selects[1]!, /<option/g)).toBe(1 + 18 + 7 + 4 + 10)
    expect(count(bare, /<label /g)).toBe(2)
  })

  it('links back to the molecule library', () => {
    expect(bare).toMatch(/<a [^>]*href="\/explore"[^>]*>Molecule library<\/a>/)
  })

  it('lists all 118 elements in order as an alternative to the grid, with the family beside each name', () => {
    const list = /<ol.*?<\/ol>/s.exec(bare)?.[0] ?? ''
    expect(count(list, /<li/g)).toBe(118)
    expect(count(list, /<a /g)).toBe(118)
    expect(list.indexOf('Hydrogen')).toBeLessThan(list.indexOf('Helium'))
    expect(list).toMatch(/Oxygen<\/a> \(O\): other nonmetal</)
    expect(count(/<ol.*?<\/ol>/s.exec(xenon)?.[0] ?? '', /aria-current="page"/g)).toBe(1)
  })
})

describe('the grids', () => {
  const grids = (props: Partial<Parameters<typeof ElementGrids>[0]>) => routed('/explore/elements', createElement(ElementGrids, { selected: undefined, property: null, highlight: null, ...props }))

  it('name each cell with the value of the shown property, and print the value in the cell', () => {
    const html = grids({ property: 'electronegativity' })
    expect(html).toContain('aria-label="Fluorine, F, atomic number 9, halogen, electronegativity 3.98"')
    expect(html).toContain(`aria-label="Helium, He, atomic number 2, noble gas, electronegativity: ${NO_VALUE}"`)
    expect(html).toMatch(/<span class="pt-value">3\.98<\/span>/)
    expect(count(html, /data-trend="value"/g)).toBe(95)
    expect(count(html, /data-trend="none"/g)).toBe(23)
  })

  it('print a value without its unit, which the legend gives', () => {
    expect(grids({ property: 'covalentRadius' })).toMatch(/<span class="pt-value">57<\/span>/)
  })

  it('mark the highlighted cells and dim the rest, in the name and by attribute', () => {
    const html = grids({ highlight: { kind: 'group', value: 17 } })
    expect(count(html, /data-highlighted="true"/g)).toBe(6)
    expect(count(html, /data-dim="true"/g)).toBe(112)
    expect(html).toContain('aria-label="Fluorine, F, atomic number 9, halogen, highlighted"')
    expect(html).toContain('aria-label="Oxygen, O, atomic number 8, other nonmetal"')
    const plain = grids({})
    expect(count(plain, /data-highlighted|data-dim/g)).toBe(0)
  })

  it('never dim by opacity', () => {
    expect(grids({ highlight: { kind: 'block', value: 'f' } })).not.toMatch(/opacity/)
  })

  it('carry no index or selection attributes, which a grid with every cell present does not need', () => {
    expect(grids({ selected: element('Xe') })).not.toMatch(/aria-(rowindex|colindex|rowcount|colcount|selected|activedescendant)/)
  })
})

describe('the legend', () => {
  const legend = (props: Partial<Parameters<typeof TableLegend>[0]>) =>
    renderToStaticMarkup(createElement(TableLegend, { property: null, highlight: null, onHighlight: () => {}, ...props }))

  it('presses the button of the highlighted family', () => {
    const html = legend({ highlight: { kind: 'category', value: 'Halogen' } })
    expect(count(html, /aria-pressed="true"/g)).toBe(1)
    // The tick after the name, not a colour alone, marks the pressed button.
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*><span[^>]*><\/span>Halogens<svg [^>]*lucide-check/)
  })

  it("gives a property's scale ends with their units and elements, how many elements have no value, and the notes on the scale", () => {
    const html = legend({ property: 'meltingPoint' })
    expect(html).toContain('Melting point')
    expect(html).toContain('Lowest: 0.95 K, helium')
    expect(html).toContain('Highest: 3823 K, carbon')
    expect(html).toContain(`${NO_VALUE}: 15 elements`)
    for (const note of trendNotes('meltingPoint')) expect(html).toContain(escaped(note.text))
    expect(html).not.toContain('aria-pressed')
  })

  it("carries francium's note on the electronegativity scale and the gas note on the density scale", () => {
    expect(legend({ property: 'electronegativity' })).toContain('Lowest, francium: PubChem&#x27;s francium page has no Pauling electronegativity line')
    expect(legend({ property: 'density' })).toContain('The 11 elements that are gases at room temperature have the lowest densities')
  })

  it('cites the source of the values shown', () => {
    expect(legend({ property: 'ionizationEnergy' })).toContain('NIST Atomic Spectra Database')
    expect(legend({ property: 'covalentRadius' })).toMatch(/Covalent radius: <\/span><a /)
  })
})

describe('the element list', () => {
  it('gives the chosen property beside each name, with its unit', () => {
    const html = routed('/explore/elements', createElement(ElementList, { selected: undefined, property: 'density' }))
    expect(html).toMatch(/Osmium<\/a> \(Os\): 22\.57 g\/cm³</)
    expect(html).toMatch(new RegExp(`Oganesson</a> \\(Og\\): ${NO_VALUE}<`))
  })
})

describe('the description of a highlight', () => {
  const shown = (highlight: Parameters<typeof HighlightDescription>[0]['highlight']) => renderToStaticMarkup(createElement(HighlightDescription, { highlight }))

  it('is the text authored for the group, period or block, under the name the control gives it', () => {
    expect(shown({ kind: 'group', value: 17 })).toContain('Group 17: Halogens')
    expect(shown({ kind: 'group', value: 17 })).toContain(escaped(describeGroup(17).text))
    expect(shown({ kind: 'period', value: 6 })).toContain(escaped(describePeriod(6).text))
    expect(shown({ kind: 'block', value: 'f' })).toContain(escaped(describeBlock('f').text))
    expect(shown({ kind: 'block', value: 'f' })).toContain('f block')
  })

  it('cites its sources', () => {
    expect(shown({ kind: 'group', value: 17 })).toContain('Section 18.11')
  })

  it('is empty for a family, which has its notes under the legend, and when nothing is highlighted', () => {
    expect(shown({ kind: 'category', value: 'Halogen' })).toBe('')
    expect(shown(null)).toBe('')
  })
})

describe('the route', () => {
  it('cannot be taken by a molecule: no molecule id is "elements"', () => {
    expect(registry.molecules.map((m) => m.id)).not.toContain('elements')
  })
})
