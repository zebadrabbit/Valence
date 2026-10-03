import { describe, expect, it } from 'vitest'
import { bondOrder, moConfiguration, orbitalOccupancy, unpairedElectrons } from './mo'
import { registry } from './registry'
import type { MoDiagram } from './schema'

function diagramOf(moleculeId: string): MoDiagram {
  const found = registry.moDiagrams.find((d) => d.moleculeId === moleculeId)
  if (!found) throw new Error(`no MO diagram for ${moleculeId}`)
  return found
}
const labels = (diagram: MoDiagram) => diagram.levels.map((level) => level.label)

describe('molecular orbital diagrams', () => {
  it('exist for oxygen and nitrogen only', () => {
    expect(registry.moDiagrams.map((d) => d.moleculeId)).toEqual(['oxygen', 'nitrogen'])
  })

  it('gives O₂ bond order 2 and two unpaired electrons', () => {
    expect(bondOrder(diagramOf('oxygen'))).toBe(2)
    expect(unpairedElectrons(diagramOf('oxygen'))).toBe(2)
  })

  it('gives N₂ bond order 3 and no unpaired electrons', () => {
    expect(bondOrder(diagramOf('nitrogen'))).toBe(3)
    expect(unpairedElectrons(diagramOf('nitrogen'))).toBe(0)
  })

  it('puts σ2p below π2p in O₂ and above it in N₂', () => {
    expect(labels(diagramOf('oxygen'))).toEqual(['σ2s', 'σ*2s', 'σ2p', 'π2p', 'π*2p', 'σ*2p'])
    expect(labels(diagramOf('nitrogen'))).toEqual(['σ2s', 'σ*2s', 'π2p', 'σ2p', 'π*2p', 'σ*2p'])
  })

  it('carries the Lewis and MO callout on O₂ only, from the cited textbook section', () => {
    expect(diagramOf('oxygen').callout).toBe(
      'The Lewis structure shows all electrons paired; the MO diagram shows two unpaired electrons.',
    )
    expect(diagramOf('nitrogen').callout).toBeUndefined()
  })

  it('writes the configuration of the occupied levels in energy order', () => {
    const written = (id: string) =>
      moConfiguration(diagramOf(id))
        .map((l) => `(${l.label})${l.electrons}`)
        .join(' ')
    expect(written('oxygen')).toBe('(σ2s)2 (σ*2s)2 (σ2p)2 (π2p)4 (π*2p)2')
    expect(written('nitrogen')).toBe('(σ2s)2 (σ*2s)2 (π2p)4 (σ2p)2')
  })

  it('leaves one electron in each π* orbital of O₂', () => {
    const level = diagramOf('oxygen').levels.find((l) => l.label === 'π*2p')!
    expect(orbitalOccupancy(level.degeneracy, level.electrons)).toEqual([1, 1])
  })

  it('cites the textbook', () => {
    const source = registry.sources.find((s) => s.id === diagramOf('oxygen').sourceId)
    expect(source?.citation).toMatch(/Chemistry 2e; OpenStax.*Section 8\.4/)
  })
})

describe('unpairedElectrons', () => {
  const level = (degeneracy: number, electrons: number): MoDiagram => ({
    moleculeId: 'x',
    levels: [{ label: 'π', degeneracy, electrons, type: 'bonding' }],
    sourceId: 's',
  })

  it.each([
    [1, 0, 0],
    [1, 1, 1],
    [1, 2, 0],
    [2, 1, 1],
    [2, 2, 2],
    [2, 3, 1],
    [2, 4, 0],
  ])('a level of %i orbitals holding %i electrons has %i unpaired', (degeneracy, electrons, unpaired) => {
    expect(unpairedElectrons(level(degeneracy, electrons))).toBe(unpaired)
  })
})

describe('orbitalOccupancy', () => {
  it.each([
    [1, 0, [0]],
    [1, 1, [1]],
    [1, 2, [2]],
    [2, 0, [0, 0]],
    [2, 1, [1, 0]],
    [2, 2, [1, 1]],
    [2, 3, [2, 1]],
    [2, 4, [2, 2]],
    [3, 4, [2, 1, 1]],
  ])('fills %i orbitals with %i electrons as %j', (degeneracy, electrons, filled) => {
    expect(orbitalOccupancy(degeneracy, electrons)).toEqual(filled)
  })

  it('agrees with unpairedElectrons for every level of both diagrams', () => {
    for (const diagram of registry.moDiagrams) {
      const single = diagram.levels.flatMap((l) => orbitalOccupancy(l.degeneracy, l.electrons)).filter((n) => n === 1)
      expect(single).toHaveLength(unpairedElectrons(diagram))
    }
  })

  it('refuses more electrons than the level holds', () => {
    expect(() => orbitalOccupancy(1, 3)).toThrow('3 electrons do not fit 1 orbitals')
    expect(() => orbitalOccupancy(2, -1)).toThrow()
  })
})
