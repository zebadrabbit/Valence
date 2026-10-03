import { describe, expect, it } from 'vitest'
import { bondOrder, unpairedElectrons } from './mo'
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
