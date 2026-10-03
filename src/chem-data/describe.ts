import { deriveAtoms } from './derive'
import type { Element, Molecule } from './schema'

// Plain text for screen readers (spec 11): no symbols a reader might skip, so
// a charge is written "plus 1" and a formula uses ordinary digits.

const BOND_KINDS = ['single', 'double', 'triple', 'aromatic'] as const

const listFormat = new Intl.ListFormat('en', { type: 'conjunction' })
const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
const signed = (charge: number) => `${charge > 0 ? 'plus' : 'minus'} ${Math.abs(charge)}`

/** Hill order: carbon, then hydrogen, then the rest alphabetically; all alphabetical when there is no carbon. */
function hillOrder(symbols: readonly string[]): string[] {
  const sorted = [...new Set(symbols)].sort()
  if (!sorted.includes('C')) return sorted
  return [...['C', 'H'].filter((s) => sorted.includes(s)), ...sorted.filter((s) => s !== 'C' && s !== 'H')]
}

/** Each distinct symbol with its count, in Hill order. */
function tally(symbols: readonly string[]): [symbol: string, count: number][] {
  return hillOrder(symbols).map((symbol) => [symbol, symbols.filter((s) => s === symbol).length])
}

/** The molecular formula in Hill order, without the charge: "C2H5NO2". */
export function hillFormula(molecule: Molecule): string {
  return tally(molecule.atoms.map((a) => a.element))
    .map(([symbol, count]) => (count === 1 ? symbol : `${symbol}${count}`))
    .join('')
}

/**
 * A short description of a molecule: its name, formula, atom and bond counts,
 * any formal charges, and the geometry and neighbours of every atom bonded to
 * two or more atoms. Atoms that read the same share one sentence.
 */
export function describeMolecule(molecule: Molecule, elements: readonly Element[]): string {
  const { atoms, bonds } = molecule
  const nameOf = (symbol: string) => {
    const element = elements.find((e) => e.symbol === symbol)
    if (!element) throw new Error(`no element data for ${symbol}`)
    return element.name.toLowerCase()
  }
  const atomsOf = (symbols: readonly string[]) =>
    listFormat.format(tally(symbols).map(([symbol, count]) => counted(count, `${nameOf(symbol)} atom`)))

  const variant = molecule.variantLabel ? ` (${molecule.variantLabel.toLowerCase()})` : ''
  const charge = molecule.charge === 0 ? '' : ` with a charge of ${signed(molecule.charge)}`
  const sentences = [`${molecule.name}${variant}, formula ${hillFormula(molecule)}${charge}.`]

  const kinds = BOND_KINDS.flatMap((kind, i) => {
    const count = bonds.filter((b) => (b.aromatic ? kind === 'aromatic' : b.order === i + 1)).length
    return count > 0 ? [counted(count, `${kind} bond`)] : []
  })
  const joined = kinds.length > 0 ? `, joined by ${listFormat.format(kinds)}` : ''
  sentences.push(`It has ${counted(atoms.length, 'atom')}${joined}.`)

  const charged = atoms.filter((a) => a.formalCharge !== 0)
  if (charged.length > 0) {
    sentences.push(`Formal charges: ${charged.map((a) => `${nameOf(a.element)} ${signed(a.formalCharge)}`).join(', ')}.`)
  }

  // What is said of each atom bonded to two or more atoms, keyed by element so equal atoms share a sentence.
  const groups = new Map<string, { element: string; saying: string; count: number }>()
  deriveAtoms(molecule, elements).forEach((derived, i) => {
    if (derived.bondedAtoms < 2) return
    const element = atoms[i]!.element
    const neighbours = bonds.flatMap((b) => (b.a === i ? [b.b] : b.b === i ? [b.a] : []))
    const saying = `has ${derived.geometry} geometry and is bonded to ${atomsOf(neighbours.map((j) => atoms[j]!.element))}.`
    const group = groups.get(`${element} ${saying}`) ?? { element, saying, count: 0 }
    group.count += 1
    groups.set(`${element} ${saying}`, group)
  })
  for (const { element, saying, count } of groups.values()) {
    const name = nameOf(element)
    const all = count === atoms.filter((a) => a.element === element).length
    const subject =
      count === 1
        ? all
          ? `The ${name} atom`
          : `One ${name} atom`
        : `Each of ${all ? 'the ' : ''}${count} ${name} atoms`
    sentences.push(`${subject} ${saying}`)
  }
  return sentences.join(' ')
}
