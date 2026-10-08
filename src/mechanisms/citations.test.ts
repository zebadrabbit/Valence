import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { mechanismCitations } from './citations'
import { hclNahco3 as mechanism } from './data'

describe('mechanismCitations', () => {
  const cited = mechanismCitations(mechanism, registry.molecules, registry.sources)

  it('lists each source once, with what it covers', () => {
    expect(cited.map((c) => [c.source.id, c.covers])).toEqual([
      ['nbs-tables-1982', ['Enthalpies of formation', 'Gibbs energies of formation', 'Standard conditions']],
      ['pines-2016', ['Acid constant of the carbonic acid molecule', 'How long a carbonic acid molecule lasts', 'How fast a proton moves to a hydrogen carbonate ion', 'Timescale of proton transfer', 'Timescale of decomposition']],
      ['nist-codata-2022', ['Gas constant, Boltzmann constant and Planck constant']],
      ['shannon-1976', ['Ionic radii of the sodium ion and the chloride ion']],
      ['pubchem-cid-123332', ['Shape of the hydronium ion']],
      ['pubchem-cid-769', ['Shape of the hydrogen carbonate ion']],
      ['pubchem-cid-767', ['Shape of the carbonic acid molecule']],
      ['cccbdb-water', ['Shape of the water molecule']],
      ['cccbdb-carbon-dioxide', ['Shape of the carbon dioxide molecule']],
    ])
  })

  it('covers every source the record names', () => {
    const named = new Set<string>()
    const walk = (value: unknown, key = ''): void => {
      if (typeof value === 'string' && key === 'sourceId') named.add(value)
      else if (Array.isArray(value)) value.forEach((item) => (key === 'sourceIds' && typeof item === 'string' ? named.add(item) : walk(item)))
      else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, k))
    }
    walk(mechanism)
    expect([...named].filter((id) => !cited.some((c) => c.source.id === id))).toEqual([])
  })

  it('throws on a source that is not listed', () => {
    expect(() => mechanismCitations(mechanism, registry.molecules, [])).toThrow(/unknown source/)
  })
})
