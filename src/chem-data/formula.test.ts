import { describe, expect, it } from 'vitest'
import { formulaParts, type FormulaPart } from './formula'
import { registry } from './registry'

// "H|_3|O|^+": text plain, subscripts after _, superscripts after ^.
const shown = (parts: FormulaPart[]) =>
  parts.map((p) => (p.kind === 'subscript' ? `_${p.text}` : p.kind === 'superscript' ? `^${p.text}` : p.text)).join('|')

describe('formulaParts', () => {
  it('subscripts the counts', () => {
    expect(formulaParts('H2O')).toEqual([
      { kind: 'text', text: 'H' },
      { kind: 'subscript', text: '2' },
      { kind: 'text', text: 'O' },
    ])
    expect(shown(formulaParts('C6H12O6'))).toBe('C|_6|H|_12|O|_6')
    expect(shown(formulaParts('HCl'))).toBe('HCl')
  })

  it('adds the charge of an ion as a superscript, with a true minus sign', () => {
    expect(shown(formulaParts('H3O', 1))).toBe('H|_3|O|^+')
    expect(shown(formulaParts('HCO3', -1))).toBe('HCO|_3|^−')
    expect(shown(formulaParts('CO3', -2))).toBe('CO|_3|^2−')
    expect(shown(formulaParts('Ca', 2))).toBe('Ca|^2+')
  })

  it('keeps parentheses as text and subscripts the multiplier', () => {
    expect(shown(formulaParts('CO(NH2)2'))).toBe('CO(NH|_2|)|_2')
    expect(shown(formulaParts('CH3CH(NH2)COOH'))).toBe('CH|_3|CH(NH|_2|)COOH')
  })

  it('raises the charge markers of a zwitterion display formula', () => {
    expect(shown(formulaParts('+NH3CH2COO-'))).toBe('^+|NH|_3|CH|_2|COO|^−')
    expect(shown(formulaParts('CH3CH(NH3+)COO-'))).toBe('CH|_3|CH(NH|_3|^+|)COO|^−')
  })

  it('loses no character of any library formula', () => {
    for (const m of registry.molecules) {
      const written = m.displayFormula ?? m.formula
      const text = formulaParts(written).map((p) => p.text).join('')
      expect(text.replaceAll('−', '-')).toBe(written)
    }
  })
})

describe('display formulas', () => {
  it('are authored for the four zwitterions only', () => {
    expect(registry.molecules.filter((m) => m.displayFormula).map((m) => [m.id, m.displayFormula])).toEqual([
      ['glycine-zwitterion', '+NH3CH2COO-'],
      ['alanine-zwitterion', 'CH3CH(NH3+)COO-'],
      ['serine-zwitterion', 'HOCH2CH(NH3+)COO-'],
      ['cysteine-zwitterion', 'HSCH2CH(NH3+)COO-'],
    ])
  })
})
