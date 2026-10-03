import { describe, expect, it } from 'vitest'
import { evToKjPerMol, valenceElectrons } from './element'
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
