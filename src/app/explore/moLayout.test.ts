import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { ORBITAL_WIDTH, moLayout } from './moLayout'

const layoutOf = (id: string) => moLayout(registry.moDiagrams.find((d) => d.moleculeId === id)!)
/** Labels from the top of the page down. */
const topDown = (id: string) =>
  [...layoutOf(id).levels].sort((a, b) => a.y - b.y).map((level) => level.label)

describe('moLayout', () => {
  it('stacks the levels with the lowest energy at the bottom', () => {
    expect(topDown('oxygen')).toEqual(['σ*2p', 'π*2p', 'π2p', 'σ2p', 'σ*2s', 'σ2s'])
  })

  it('puts the π level of N₂ below its σ2p level', () => {
    const levels = layoutOf('nitrogen').levels
    const y = (label: string) => levels.find((l) => l.label === label)!.y
    expect(y('π2p')).toBeGreaterThan(y('σ2p'))
    expect(topDown('nitrogen')).toEqual(['σ*2p', 'π*2p', 'σ2p', 'π2p', 'σ*2s', 'σ2s'])
  })

  it('shows one electron in each π* orbital of O₂ and none in those of N₂', () => {
    const electrons = (id: string) => layoutOf(id).levels.find((l) => l.label === 'π*2p')!.orbitals.map((o) => o.electrons)
    expect(electrons('oxygen')).toEqual([1, 1])
    expect(electrons('nitrogen')).toEqual([0, 0])
  })

  it('draws the orbitals of a level side by side without overlap, inside the diagram', () => {
    for (const id of ['oxygen', 'nitrogen']) {
      const { width, height, levels } = layoutOf(id)
      for (const level of levels) {
        expect(level.y).toBeGreaterThan(20)
        expect(level.y).toBeLessThan(height)
        level.orbitals.forEach((orbital, k) => {
          expect(orbital.x - ORBITAL_WIDTH / 2).toBeGreaterThan(60)
          expect(orbital.x + ORBITAL_WIDTH / 2).toBeLessThan(width)
          if (k > 0) expect(orbital.x - level.orbitals[k - 1]!.x).toBeGreaterThan(ORBITAL_WIDTH)
        })
      }
    }
  })
})
