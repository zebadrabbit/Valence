import { describe, expect, it } from 'vitest'
import { configurationParts, evToKjPerMol, valenceElectrons } from './element'
import { registry } from './registry'

const element = (symbol: string) => {
  const found = registry.elements.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}

describe('evToKjPerMol', () => {
  it('converts the first ionization energy of oxygen (13.618055 eV) to 1313.9 kJ/mol', () => {
    expect(evToKjPerMol(element('O').ionizationEnergiesEv.value[0]!)).toBeCloseTo(1313.9, 1)
  })
})

describe('valenceElectrons', () => {
  it.each([
    ['H', 1],
    ['B', 3],
    ['C', 4],
    ['N', 5],
    ['O', 6],
    ['F', 7],
    ['Na', 1],
    ['P', 5],
    ['S', 6],
    ['Cl', 7],
    ['Xe', 8],
  ])('%s has %i', (symbol, expected) => {
    expect(valenceElectrons(element(symbol))).toBe(expected)
  })
})

describe('configurationParts', () => {
  it('splits each subshell from its electron count', () => {
    expect(configurationParts('1s2 2s2 2p2')).toEqual([
      { subshell: '1s', electrons: '2' },
      { subshell: '2s', electrons: '2' },
      { subshell: '2p', electrons: '2' },
    ])
  })

  it('keeps a two-digit count whole', () => {
    expect(configurationParts(element('Xe').configuration.value).at(2 + 3)).toEqual({ subshell: '3d', electrons: '10' })
  })

  it('reads every stored configuration, and the counts sum to the atomic number', () => {
    for (const e of registry.elements) {
      const total = configurationParts(e.configuration.value).reduce((sum, part) => sum + Number(part.electrons), 0)
      expect([e.symbol, total]).toEqual([e.symbol, e.atomicNumber])
    }
  })

  it('rejects text that is not a configuration', () => {
    expect(() => configurationParts('[He] 2s2')).toThrow(/unreadable/)
  })
})
