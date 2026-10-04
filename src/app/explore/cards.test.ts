import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { deriveAtoms, deriveBonds } from '@/chem-data/derive'
import { atomNames } from '@/chem-data/describe'
import { EMISSION_NOTE } from '@/chem-data/element'
import { VALENCE_BOND_NOTE } from '@/chem-data/hybrid'
import { registry } from '@/chem-data/registry'
import { AtomCard } from './AtomCard'
import { BohrCard } from './BohrCard'
import { Inspector } from './Inspector'

// The wording itself is tested with the functions that build it. These check that the cards show it.

const molecule = (id: string) => registry.molecules.find((m) => m.id === id)!
const inspector = (id: string, selection: { atoms: number[]; bond: number | null }, level: 1 | 2 | 3 = 2) => {
  const m = molecule(id)
  return renderToStaticMarkup(createElement(Inspector, { molecule: m, selection, atomNames: atomNames(m, registry.elements), level }))
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
    const html = renderToStaticMarkup(createElement(AtomCard, { name: 'Hydrogen 1', atom: water.atoms[hydrogen]!, derived, element: twoDecimals }))
    expect(html).toContain('2.20 (Pauling)')
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
    expect(html).toContain('Emission lines')
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
