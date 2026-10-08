import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { deriveAtoms, deriveBonds } from '@/chem-data/derive'
import { atomNames } from '@/chem-data/describe'
import { EMISSION_NOTE, EMISSION_SCOPE_NOTE } from '@/chem-data/element'
import { VALENCE_BOND_NOTE } from '@/chem-data/hybrid'
import { periodicTable } from '@/chem-data/periodic'
import { registry } from '@/chem-data/registry'
import { AtomCard } from './AtomCard'
import { BohrCard } from './BohrCard'
import { Inspector } from './Inspector'

// The wording itself is tested with the functions that build it. These check that the cards show it.

const molecule = (id: string) => registry.molecules.find((m) => m.id === id)!
// The atom card holds a link, which needs a router around it.
const routed = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const inspector = (id: string, selection: { atoms: number[]; bond: number | null }, level: 1 | 2 | 3 = 2) => {
  const m = molecule(id)
  return routed(createElement(Inspector, { molecule: m, selection, atomNames: atomNames(m, registry.elements), level }))
}

describe('atom card', () => {
  const water = molecule('water')
  const hydrogen = water.atoms.findIndex((a) => a.element === 'H')

  it('prints the atomic weight and the electronegativity as their sources do', () => {
    const html = inspector('water', { atoms: [hydrogen], bond: null })
    expect(html).toContain('1.0080')
    expect(html).toContain('2.2 (Pauling)')
  })

  it('prints the published text of an electronegativity, not the stored number', () => {
    const element = registry.elements.find((e) => e.symbol === 'H')!
    const twoDecimals = { ...element, electronegativity: { ...element.electronegativity, published: '2.20' } }
    const derived = deriveAtoms(water, registry.elements)[hydrogen]!
    const html = routed(createElement(AtomCard, { name: 'Hydrogen 1', atom: water.atoms[hydrogen]!, derived, element: twoDecimals }))
    expect(html).toContain('2.20 (Pauling)')
  })

  it("links to its element's page in the periodic table, for every element of the library", () => {
    expect(inspector('water', { atoms: [hydrogen], bond: null })).toMatch(/<a [^>]*href="\/explore\/elements\/H"[^>]*>Hydrogen in the periodic table<\/a>/)
    for (const m of registry.molecules) {
      const html = inspector(m.id, { atoms: [0], bond: null })
      const element = registry.elements.find((e) => e.symbol === m.atoms[0]!.element)!
      expect(periodicTable.find((e) => e.symbol === element.symbol)?.name, m.id).toBe(element.name)
      expect(html, m.id).toContain(`href="/explore/elements/${element.symbol}"`)
      expect(html, m.id).toContain(`>${element.name} in the periodic table</a>`)
    }
    for (const e of registry.elements) expect(periodicTable.some((p) => p.symbol === e.symbol && p.name === e.name), e.symbol).toBe(true)
  })
})

describe('emission spectrum', () => {
  const card = (id: string, symbol: string) => {
    const m = molecule(id)
    return inspector(id, { atoms: [m.atoms.findIndex((a) => a.element === symbol)], bond: null })
  }

  it('shows hydrogen its Balmer lines, their transitions, and the warning that a bonded atom does not emit them', () => {
    const html = card('water', 'H')
    expect(html).toContain('Emission spectrum of the isolated atom')
    expect(html).toContain('656.279 nm')
    expect(html).toContain('n = 3 → 2')
    expect(html).toContain(EMISSION_NOTE)
    expect(html).toContain(EMISSION_SCOPE_NOTE.text.replaceAll("'", '&#x27;'))
    expect(html).toContain('Emission lines')
    for (const id of EMISSION_SCOPE_NOTE.sourceIds) expect(html).toContain(registry.sources.find((s) => s.id === id)!.citation.replaceAll("'", '&#x27;'))
  })

  it('shows xenon its lines without transitions', () => {
    const html = card('xenon-tetrafluoride', 'Xe')
    expect(html).toContain('480.70190 nm')
    expect(html).not.toContain('Electron falls')
  })

  it('shows no spectrum for an element that has none stored', () => {
    expect(card('water', 'O')).not.toContain('Emission')
  })
})

describe('bond card', () => {
  it('shows a resonance-pair bond of SO₂ as order 1.5, with its note and the source of that order', () => {
    const so2 = molecule('sulfur-dioxide')
    const bond = so2.bonds.findIndex((b) => b.order === 2)
    const html = inspector('sulfur-dioxide', { atoms: [], bond })
    expect(html).toContain('resonance pair, order 1.5')
    expect(html).toContain(deriveBonds(so2, registry.elements)[bond]!.orderNote)
    expect(html).toContain('the pair shares one π bond')
    expect(html).not.toContain('as drawn')
  })

  it('says nothing about resonance on an ordinary bond', () => {
    const html = inspector('water', { atoms: [], bond: 0 })
    expect(html).toContain('1 (single)')
    expect(html).not.toContain('resonance')
  })
})

describe('measure card', () => {
  it('labels an angle of PCl₅ as following from symmetry, and a length as the cited figure', () => {
    const pcl5 = molecule('phosphorus-pentachloride')
    const angle = inspector(pcl5.id, { atoms: [...pcl5.measurements!.angles[0]!.atoms], bond: null })
    expect(angle).toContain('From the molecule&#x27;s symmetry (D3h); the source prints no figure.')
    expect(angle).toContain('Point group of the molecule (D3h)')
    expect(angle).not.toContain('Cited')
    const length = inspector(pcl5.id, { atoms: [...pcl5.measurements!.lengths[0]!.atoms], bond: null })
    expect(length).toContain('Cited value, experimental (gas phase).')
    expect(length).toContain('Cited length')
  })

  it('labels the angle of BF₃, which its source prints and its symmetry fixes, as both', () => {
    const bf3 = molecule('boron-trifluoride')
    const angle = inspector(bf3.id, { atoms: [...bf3.measurements!.angles[0]!.atoms], bond: null })
    expect(angle).toContain('Cited value, experimental (gas phase); the molecule&#x27;s symmetry (D3h) fixes it.')
    expect(angle).toContain('Cited angle')
    expect(angle).toContain('Point group of the molecule (D3h)')
  })
})

describe('hybrid orbitals card', () => {
  const note = (id: string, level: 1 | 2 | 3) => inspector(id, { atoms: [0], bond: null }, level)

  it('says the molecular orbital diagram describes O₂ better, and that it agrees with the lobes for N₂', () => {
    expect(note('oxygen', 3)).toContain(VALENCE_BOND_NOTE)
    expect(note('nitrogen', 3)).not.toContain(VALENCE_BOND_NOTE)
    expect(note('nitrogen', 3)).toContain('both give a triple bond with every electron paired')
  })

  it('shows neither note below level 3', () => {
    expect(note('oxygen', 2)).not.toContain('valence bond picture')
  })
})

describe('Bohr model card', () => {
  const sodium = registry.elements.find((e) => e.symbol === 'Na')!

  it('draws one ring per shell with a dot per electron, hidden from a screen reader, and lists the shells as text', () => {
    const html = renderToStaticMarkup(createElement(BohrCard, { element: sodium }))
    expect(html).toContain('Bohr model: Sodium')
    expect(html).toMatch(/<svg aria-hidden="true"/)
    // The nucleus, three rings and 11 electrons.
    expect([...html.matchAll(/<circle /g)].length).toBe(1 + 3 + 11)
    expect(html).toContain('<figcaption class="text-center text-xs text-muted-foreground">Bohr model of a neutral, isolated sodium atom: a simplified picture</figcaption>')
    expect(html).toContain('<ol><li>Shell 1: 2 electrons</li><li>Shell 2: 8 electrons</li><li>Shell 3: 1 electron</li></ol>')
    expect(html).toContain('Electrons per shell: ')
  })
})
