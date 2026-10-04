import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes, type LinkProps } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Explore } from '@/app/pages/Explore'
import { CATEGORIES, CATEGORY_HEADING, CATEGORY_NOTES, describeBlock, describeGroup, describePeriod, GROUP_3_NOTE, NO_VALUE, periodicTable } from '@/chem-data/periodic'
import { registry } from '@/chem-data/registry'
import { ANCIENT, CARD_DERIVED, ELECTRON_AFFINITY_NOTE, shellCaption, VDW_RADIUS_NOTE } from '@/chem-data/periodicCard'
import { ElementCard } from './ElementCard'
import { elementCardRows } from './elementCard'
import { ElementGrids } from './ElementGrids'
import { ElementList } from './ElementList'
import { PeriodicTablePage } from './PeriodicTablePage'
import { TableLegend } from './TableLegend'
import { HighlightDescription, TableNotes } from './TableNotes'
import css from './periodic.css?raw'
import { DETACHED_ROWS, elementLink } from './tableLayout'
import { LEAST_ROOM, ROUNDED_NOTE, trendNotes, VALUE_INSETS } from './trend'

// The functions that build the wording are tested beside them. These check the markup the page puts it in;
// focus, keys, layout and themes are checked in a browser.

// The markup shows only where a link goes: `replace` and `state` are not in it. So every <Link> is react-router's
// own, drawn as it always is, and what it was given is kept here.
const linked = vi.hoisted(() => [] as LinkProps[])
vi.mock('react-router', async (original) => {
  const { createElement } = await import('react')
  const router = await original<typeof import('react-router')>()
  return {
    ...router,
    Link: (props: LinkProps) => {
      linked.push(props)
      return createElement(router.Link, props)
    },
  }
})
/** What each link was given while `draw` ran: where it goes, whether it replaces the address, and its state. */
const linksIn = (draw: () => unknown) => {
  linked.length = 0
  draw()
  return linked.map(({ to, replace, state }) => ({ to, replace, state }))
}

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

  it('describes the cells of lanthanum and actinium with that pointer, so that it is heard with the cell and not only beside it', () => {
    const [main, detached] = tables(bare)
    for (const row of DETACHED_ROWS) {
      const tag = new RegExp(`<a [^>]*aria-label="${row.after.name}, [^>]*>`).exec(main!)?.[0] ?? ''
      const id = /aria-describedby="([^"]+)"/.exec(tag)?.[1]
      expect([row.after.symbol, id]).toEqual([row.after.symbol, `pt-after-${row.after.atomicNumber}`])
      expect(main).toContain(`<span id="${id}" class="sr-only">${row.note}</span>`)
    }
    expect(count(main! + detached!, /aria-describedby/g)).toBe(2)
    expect(count(bare, /id="pt-after-/g)).toBe(2)
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

  // Two status lines, so that choosing an element does not read the highlight out again.
  const statuses = (html: string) => [...html.matchAll(/<p role="status"[^>]*>(.*?)<\/p>/g)].map((match) => match[1])

  it('announces the selection in a status line of its own, apart from the highlight', () => {
    expect(statuses(xenon)).toEqual(['Selected: Xenon. Its details are below the table.', ''])
    expect(statuses(bare)).toEqual(['', ''])
  })

  it('offers to clear the selection, without adding to the history, only while an element is selected', () => {
    expect(xenon).toMatch(/<a [^>]*href="\/explore\/elements"[^>]*>Clear selection<\/a>/)
    expect(bare).not.toContain('Clear selection')
  })

  it('gives every heading on the page a name of its own', () => {
    for (const html of [bare, xenon]) {
      const headings = [...html.matchAll(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/g)].map((match) => match[1])
      expect(headings.length).toBeGreaterThan(3)
      expect(new Set(headings).size).toBe(headings.length)
    }
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

  it('print a value too long for a cell rounded, and keep its published digits in the name of the cell and in the readout', () => {
    // Before the cell is measured in a browser it has the least room; there is none to measure here.
    expect(LEAST_ROOM).toBe(7)
    const html = grids({ property: 'ionizationEnergy', selected: element('H') })
    expect(html).toMatch(/<span class="pt-value">13\.59843<\/span>/)
    expect(html).not.toMatch(/<span class="pt-value">13\.598434599702<\/span>/)
    expect(html).toContain('aria-label="Hydrogen, H, atomic number 1, other nonmetal, first ionization energy 13.598434599702 eV"')
    expect(html).toMatch(/<span>first ionization energy: 13\.598434599702 eV<\/span>/)
    // A value that fits is printed as published.
    expect(html).toMatch(/<span class="pt-value">9\.322699<\/span>/)
    expect(grids({ property: 'density' })).toMatch(/<span class="pt-value">0\.000090<\/span>/)
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

  it('carry no inline opacity', () => {
    expect(grids({ highlight: { kind: 'block', value: 'f' } })).not.toMatch(/opacity/)
  })

  it('link each cell as elementLink says, which replaces the address and keeps focus on the cell', () => {
    const html = grids({})
    for (const e of periodicTable) expect([e.symbol, html.includes(`href="${elementLink(e.symbol).to}"`)]).toEqual([e.symbol, true])
    // All that elementLink gives, not only the address: tableLayout.test.ts says what that is.
    const links = linksIn(() => grids({}))
    expect(links.length).toBe(118)
    for (const e of periodicTable) expect(links.filter((link) => link.to === elementLink(e.symbol).to)).toEqual([elementLink(e.symbol)])
  })

  it('write the element under the pointer or with focus, else the selected one, in a readout hidden from assistive technology', () => {
    const html = grids({ selected: element('Xe') })
    const readouts = [...html.matchAll(/<div aria-hidden="true" class="pt-readout-element[^"]*">(.*?)<\/div>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    // In the table's empty corner, and in a strip under the table for widths at which the table scrolls sideways.
    // The corner also says where the details are; the strip is next to the status line, which says it.
    expect(readouts).toEqual(['Xe 54 · Xenon noble gas Selected: details are below the table.', 'Xe 54 · Xenon noble gas'])
    expect(count(grids({}), /class="pt-readout-element/g)).toBe(0)
    expect(grids({ selected: element('F'), property: 'electronegativity' })).toMatch(/<span>electronegativity: 3\.98<\/span>/)
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

  it('says in plain sight, not only under Sources, that the shading is linear', () => {
    const visible = legend({ property: 'density' }).replace(/<details.*<\/details>/s, '')
    expect(visible).toContain('Shaded on a linear scale between the two.')
  })

  it("carries francium's note on the electronegativity scale and the gas note on the density scale", () => {
    expect(legend({ property: 'electronegativity' })).toContain('Lowest, francium: PubChem&#x27;s francium page has no Pauling electronegativity line')
    expect(legend({ property: 'density' })).toContain('The 11 elements that are gases at room temperature have the lowest densities')
  })

  it('says once, of a property with values too long for a cell, that the cells round them and the cards give them in full', () => {
    for (const property of ['ionizationEnergy', 'density'] as const) expect([property, count(legend({ property }), new RegExp(escaped(ROUNDED_NOTE), 'g'))]).toEqual([property, 1])
    for (const property of ['electronegativity', 'covalentRadius', 'meltingPoint'] as const) expect([property, legend({ property }).includes(escaped(ROUNDED_NOTE))]).toEqual([property, false])
    expect(legend({})).not.toContain(escaped(ROUNDED_NOTE))
  })

  it('cites the source of the values shown', () => {
    expect(legend({ property: 'ionizationEnergy' })).toContain('NIST Atomic Spectra Database')
    expect(legend({ property: 'meltingPoint' })).toMatch(/Melting point: <\/span><a /)
  })

  it('cites the sources of the notes on the scale as well', () => {
    // A citation as React writes it; one of them holds angle brackets.
    const source = (id: string) => escaped(registry.sources.find((s) => s.id === id)!.citation).replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    // Francium's note rests on PubChem's element pages; the values are from PubChem's table.
    const electronegativity = legend({ property: 'electronegativity' })
    expect(trendNotes('electronegativity')[0]?.sourceIds).toEqual(['pubchem-element-pages'])
    expect(electronegativity).toContain(source('pubchem-element-pages'))
    expect(electronegativity).toContain(source('pubchem-periodic-table'))
    expect(electronegativity).toMatch(/Notes on the scale: <\/span><a /)
    // Without a note from another source there is nothing more to cite.
    expect(legend({ property: 'ionizationEnergy' })).not.toContain('Notes on the scale')
    // The covalent radii and the notes on both ends of their scale come from the same pages.
    expect(legend({ property: 'covalentRadius' })).toMatch(/Covalent radius, Notes on the scale: <\/span><a /)
  })
})

describe('the stylesheet', () => {
  // Without its comments, which speak of opacity.
  const rules = css.replace(/\/\*.*?\*\//gs, '')

  it('is read', () => {
    expect(rules).toContain('.pt-cell[data-dim]')
    expect(rules).not.toContain('/*')
  })

  it('never dims by opacity: a dimmed cell is still a link, and its text keeps full contrast (spec 6)', () => {
    expect(rules).not.toMatch(/opacity/i)
    expect(rules).toMatch(/\.pt-cell\[data-dim\]\s*\{[^}]*border-style:\s*dashed/)
    // Nor by a filter or a blend, which fade text in the same way.
    expect(rules).not.toMatch(/\b(filter|mix-blend-mode)\s*:/i)
  })

  it('moves nothing: no transition and no animation (spec 8)', () => {
    // As a declaration: the family colours are named --family-transition-metal.
    expect(rules).not.toMatch(/(^|[;{\s])(transition|animation)(-[a-z-]+)?\s*:/im)
    expect(rules).not.toMatch(/@keyframes/i)
  })

  it('never cuts a value silently: one too wide for its cell even when rounded is cut with an ellipsis', () => {
    // A cell prints a long value rounded, and trend.test.ts holds that every value then fits the least room a cell
    // has, so at the type sizes of this stylesheet the ellipsis never shows. A minimum font size set in the browser
    // can leave less room than that. Hiding the overflow with nothing to mark it would then show a shorter number
    // that reads as the value.
    const value = /\.pt-value\s*\{([^}]*)\}/.exec(rules)?.[1] ?? ''
    expect(value).toMatch(/overflow:\s*hidden/)
    expect(value).toMatch(/text-overflow:\s*ellipsis/)
    expect(value).toMatch(/white-space:\s*nowrap/)
  })

  it('counts digits for the space the stylesheet leaves a value: all of it in a cell, a pixel inside the border in the selected cell', () => {
    // A cell's border and padding come to 3 px whatever the border is, until the border is wider than that.
    expect(rules).toMatch(/\.pt-cell\s*\{[^}]*--bw:\s*1px[^}]*padding:\s*max\(0px,\s*calc\(3px - var\(--bw\)\)\)/)
    const selectedBorder = Number(/\.pt-cell\[aria-current\]\s*\{[^}]*--bw:\s*(\d+)px/.exec(rules)?.[1])
    expect(VALUE_INSETS).toEqual([3, selectedBorder + 1])
  })

  it('keeps the focus outline of a cell clear of the edge of the box the table scrolls in', () => {
    const outline = /\.pt-cell:focus-visible\s*\{[^}]*outline:\s*(\d+)px[^}]*outline-offset:\s*(\d+)px/.exec(rules)
    const margin = /\.pt-cell\s*\{[^}]*scroll-margin:\s*(\d+)px/.exec(rules)
    expect(outline).not.toBeNull()
    expect(margin).not.toBeNull()
    expect(Number(margin![1])).toBeGreaterThanOrEqual(Number(outline![1]) + Number(outline![2]))
  })
})

describe('the element list', () => {
  it('links each entry as elementLink says', () => {
    const list = () => routed('/explore/elements', createElement(ElementList, { selected: undefined, property: null }))
    const html = list()
    for (const e of periodicTable) expect([e.symbol, html.includes(`href="${elementLink(e.symbol).to}"`)]).toEqual([e.symbol, true])
    expect(linksIn(list)).toEqual(periodicTable.map((e) => elementLink(e.symbol)))
  })

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

  it('is empty for a family, which has its notes in a card below the table, and when nothing is highlighted', () => {
    expect(shown({ kind: 'category', value: 'Halogen' })).toBe('')
    expect(shown(null)).toBe('')
  })
})

describe('the element card', () => {
  const card = (symbol: string) => routed('/explore/elements', createElement(ElementCard, { element: element(symbol) }))
  // A row as the card draws it: the label, the value under it, then its sentences.
  const drawn = (label: string, value: string, sentences: readonly string[] = []) =>
    `<dt class="text-muted-foreground">${escaped(label)}</dt><dd class="tabular-nums">${value}</dd>` +
    (sentences.length > 0 ? `<dd class="col-span-full mb-1 text-xs text-muted-foreground"><span class="grid gap-1">${sentences.map((text) => `<span>${escaped(text)}</span>`).join('')}</span></dd>` : '')

  it('is on the page below the table when an element is selected, under the name and symbol of the element', () => {
    const html = page('/explore/elements/Xe')
    expect(html).toMatch(/<h2 [^>]*>Xenon \(Xe\)<\/h2>/)
    expect(html.indexOf('</table>')).toBeLessThan(html.indexOf('Xenon (Xe)</h2>'))
    expect(html).not.toContain('Choose an element in the table')
  })

  it('is replaced by an invitation to choose an element when none is selected', () => {
    const html = page('/explore/elements')
    expect(html).toContain('Choose an element in the table to see its details here.')
    expect(html).not.toContain('In the molecule library')
  })

  it('shows every row of elementCardRows with its label, its value and its sentences beside it', () => {
    for (const symbol of ['H', 'F', 'Fe', 'As', 'Tc', 'Lu', 'Og']) {
      const html = card(symbol)
      for (const row of elementCardRows(element(symbol), registry.elements.find((e) => e.symbol === symbol))) {
        if (row.id === 'configuration') continue
        expect([symbol, row.id, html.includes(drawn(row.label, escaped(row.value), [...(row.note ? [row.note] : []), ...row.notes]))]).toEqual([symbol, row.id, true])
      }
    }
  })

  it('puts a note beside the row it qualifies', () => {
    expect(card('F')).toContain(drawn('Year discovered (as PubChem lists it)', '1670', [element('F').notes!.find((note) => note.row === 'yearDiscovered')!.text]))
    expect(card('C')).toContain(drawn('Year discovered (as PubChem lists it)', ANCIENT))
    expect(card('F')).toContain(drawn('Electron affinity', '3.339 eV', [ELECTRON_AFFINITY_NOTE.text]))
    expect(card('Fe')).toContain(drawn('Van der Waals radius', '194 pm', [VDW_RADIUS_NOTE.text]))
  })

  it('shows an absent value with NO_VALUE', () => {
    expect(card('Og')).toContain(drawn('Density', NO_VALUE))
    expect(card('He')).toContain(drawn('Electronegativity (Pauling scale)', NO_VALUE))
  })

  it('names the isotope whose mass it shows, and says there is no standard atomic weight', () => {
    expect(card('Tc')).toContain(drawn('Mass of the isotope technetium-97', '96.90636 u', ['Technetium has no standard atomic weight, so the mass of one of its isotopes is shown.']))
    expect(card('Bi')).toContain(drawn('Atomic mass (standard atomic weight)', '208.98 u'))
  })

  it('writes the configuration with superscript counts after its core, and keeps the word PubChem marks it with', () => {
    expect(card('F')).toContain('<dd class="tabular-nums">[He]<span> 2s<sup>2</sup></span><span> 2p<sup>5</sup></span></dd>')
    expect(card('H')).toContain('<dd class="tabular-nums"><span>1s<sup>1</sup></span></dd>')
    expect(card('Mt')).toContain('<span> 6d<sup>7</sup></span> (calculated)</dd>')
    expect(card('Og')).toContain('<span> 6d<sup>10</sup></span> (predicted)</dd>')
  })

  it('draws the shell diagram from the configuration, hidden from a screen reader, with the counts as text and a caption that says when it is predicted', () => {
    const html = card('Og')
    expect(html).toMatch(/<svg aria-hidden="true"/)
    // The nucleus, seven rings and 118 electrons.
    expect(count(/<figure.*?<\/figure>/s.exec(html)?.[0] ?? '', /<circle /g)).toBe(1 + 7 + 118)
    expect(html).toContain(`<figcaption class="text-center text-xs text-muted-foreground">${shellCaption(element('Og'))}</figcaption>`)
    expect(html).toContain(drawn('Electrons per shell (innermost first)', '2, 8, 18, 32, 32, 18, 8'))
    expect(card('Mt')).toContain('drawn from a calculated configuration')
    expect(card('F')).not.toMatch(/drawn from a (predicted|calculated) configuration/)
  })

  it('links to every library molecule that contains the element, or says that none does', () => {
    const fluorine = card('F')
    expect(fluorine).toContain('In the molecule library')
    for (const [id, name] of [
      ['boron-trifluoride', 'Boron trifluoride'],
      ['sulfur-hexafluoride', 'Sulfur hexafluoride'],
      ['xenon-tetrafluoride', 'Xenon tetrafluoride'],
    ]) {
      expect(fluorine).toMatch(new RegExp(`<a [^>]*href="/explore/${id}"[^>]*>${name}</a>`))
    }
    expect(count(fluorine, /<a [^>]*href="\/explore\/[a-z-]+"/g)).toBe(3)
    expect(card('Xe')).toMatch(/<a [^>]*href="\/explore\/xenon-tetrafluoride"/)
    const gold = card('Au')
    expect(gold).toContain('No molecule in the library contains gold.')
    expect(gold).not.toMatch(/<a [^>]*href="\/explore\//)
  })

  it('shows the emission spectrum for hydrogen, sodium and xenon, and for no other element', () => {
    const shown = periodicTable.filter((e) => card(e.symbol).includes('Emission spectrum of the isolated atom')).map((e) => e.symbol)
    expect(shown).toEqual(['H', 'Na', 'Xe'])
    expect(card('H')).toContain('656.279 nm')
  })

  it('lists both sodium D lines in the table and in the text of the strip, and says under the strip that they are drawn as one', () => {
    const sodium = card('Na')
    for (const wavelength of ['589.592424 nm', '588.995095 nm']) expect(count(sodium, new RegExp(`<td[^>]*>${wavelength}</td>`, 'g'))).toBe(1)
    expect(sodium).toContain('aria-label="Emission lines of sodium, longest wavelength first: 589.592424 nm, yellow, 3p → 3s; 588.995095 nm, yellow, 3p → 3s."')
    const note = registry.elements.find((e) => e.symbol === 'Na')!.emission!.note!
    expect(sodium.indexOf(escaped(note))).toBeGreaterThan(sodium.indexOf('</svg>'))
    expect(sodium.indexOf(escaped(note))).toBeLessThan(sodium.indexOf('<table'))
  })

  it('cites in its Sources control every source of every row, the emission lines, and says what the app works out', () => {
    const cites = (html: string, covers: string, citation: string) => html.includes(`<span class="font-medium">${escaped(covers)}: </span>`) && html.includes(citation)
    // A citation as React writes it; one of them holds angle brackets.
    const source = (id: string) => escaped(registry.sources.find((s) => s.id === id)!.citation).replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    const sodium = card('Na')
    expect(cites(sodium, 'Atomic mass (standard atomic weight)', source('ciaaw-abridged-2024'))).toBe(true)
    expect(cites(sodium, 'First ionization energy', source('nist-asd-ie-all'))).toBe(true)
    expect(sodium).toContain(source('pubchem-periodic-table'))
    expect(sodium).toContain(escaped(CARD_DERIVED))
    expect(cites(card('H'), 'Emission lines', source('nist-asd-lines-h'))).toBe(true)
    expect(cites(sodium, 'Emission lines', source('nist-asd-lines-na'))).toBe(true)
    expect(card('F')).toContain(source('mantina-2009'))
    for (const symbol of ['H', 'Xe', 'Og']) {
      const html = card(symbol)
      const ids = new Set(elementCardRows(element(symbol), registry.elements.find((e) => e.symbol === symbol)).flatMap((row) => row.sourceIds))
      for (const id of ids) expect([symbol, id, html.includes(source(id))]).toEqual([symbol, id, true])
    }
  })

  it('renders for every element', () => {
    for (const e of periodicTable) expect([e.symbol, card(e.symbol).includes(`${e.name} (${e.symbol})</h2>`)]).toEqual([e.symbol, true])
  })
})

describe('the notes below the table', () => {
  it('are headed apart from the legend, which has the name of the families', () => {
    const html = renderToStaticMarkup(createElement(TableNotes))
    expect(html).toMatch(/<h2[^>]*>Notes on the chemical families<\/h2>/)
    expect(html).not.toMatch(new RegExp(`<h2[^>]*>${escaped(CATEGORY_HEADING).replace(/[()]/g, '\\$&')}</h2>`))
  })
})

describe('the library page', () => {
  it('links to the periodic table (spec 4)', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/explore'] }, createElement(Explore)))
    expect(html).toMatch(/<a [^>]*href="\/explore\/elements"[^>]*><span[^>]*>Periodic table<\/span>/)
    expect(count(html, /href="\/explore\/elements"/g)).toBe(1)
  })
})

describe('the route', () => {
  it('cannot be taken by a molecule: no molecule id is "elements"', () => {
    expect(registry.molecules.map((m) => m.id)).not.toContain('elements')
  })
})
