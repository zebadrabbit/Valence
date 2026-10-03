import { deriveAtoms } from './derive'
import type { Element, Molecule } from './schema'

// Plain text for screen readers (spec 11): no symbols a reader might skip, so
// a charge is written "plus 1", a formula uses ordinary digits, and a trailing
// parenthesised formula in a name such as "Oxygen (O₂)" is dropped. The formula
// is the authored one, written as textbooks write it (NH3, not Hill's H3N).

export const BOND_KINDS = ['single', 'double', 'triple', 'aromatic'] as const

const listFormat = new Intl.ListFormat('en', { type: 'conjunction' })
const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
const signed = (charge: number) => `${charge > 0 ? 'plus' : 'minus'} ${Math.abs(charge)}`

/** Each distinct symbol with its count, alphabetically. */
function tally(symbols: readonly string[]): [symbol: string, count: number][] {
  return [...new Set(symbols)].sort().map((symbol) => [symbol, symbols.filter((s) => s === symbol).length])
}

/**
 * A short description of a molecule: its name, formula, atom and bond counts,
 * whether the drawn bonds are one of several resonance structures, any formal
 * charges, and the geometry and neighbours of every atom bonded to two or more atoms. Atoms that read the same share one sentence.
 */
export function describeMolecule(molecule: Molecule, elements: readonly Element[]): string {
  const { lead, formula, rest } = describeMoleculeParts(molecule, elements)
  return lead + formula + rest
}

/**
 * describeMolecule in three pieces, so that a page can typeset the formula (subscripts, and the
 * charges of a zwitterion): the text up to the formula, the plain formula, and the rest.
 */
export function describeMoleculeParts(molecule: Molecule, elements: readonly Element[]): { lead: string; formula: string; rest: string } {
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
  const lead = `${molecule.name.replace(/\s*\([^()]*\)$/, '')}${variant}, formula `
  const sentences = [`${charge}.`]

  const kinds = BOND_KINDS.flatMap((kind, i) => {
    const count = bonds.filter((b) => (b.aromatic ? kind === 'aromatic' : b.order === i + 1)).length
    return count > 0 ? [counted(count, `${kind} bond`)] : []
  })
  const joined = kinds.length > 0 ? `, joined by ${listFormat.format(kinds)}` : ''
  // The drawn single and double bond of a resonance pair must not be heard as fact (spec 6.1, 6.3).
  // ponytail: assumes one pair per molecule, one bond drawn double and one single, sharing an
  // atom, which is all the v1 library has. Nitrate or carbonate would need the count worded.
  const noted = bonds.filter((b) => b.resonanceNote)
  const ends = noted.flatMap((b) => [b.a, b.b])
  const outer = ends.find((i) => ends.indexOf(i) === ends.lastIndexOf(i))
  const resonance =
    outer === undefined
      ? ''
      : `; the double bond and ${bonds.filter((b) => b.order === 1).length === 1 ? 'the' : 'one'} single bond to ` +
        `${nameOf(atoms[outer]!.element)} are drawn as one of two equivalent resonance structures, and the two real bonds are equal`
  sentences.push(`It has ${counted(atoms.length, 'atom')}${joined}${resonance}.`)

  const charged = atoms.filter((a) => a.formalCharge !== 0)
  if (charged.length > 0) {
    // "one oxygen minus 1" when only some atoms of the element carry the charge, so it is not heard as all of them.
    const parts = [...new Set(charged.map((a) => `${a.element} ${a.formalCharge}`))].map((key) => {
      const same = charged.filter((a) => `${a.element} ${a.formalCharge}` === key)
      const { element, formalCharge } = same[0]!
      const partial = same.length < atoms.filter((a) => a.element === element).length
      const who = partial ? (same.length === 1 ? `one ${nameOf(element)}` : `${same.length} ${nameOf(element)} atoms`) : nameOf(element)
      return `${who} ${signed(formalCharge)}`
    })
    sentences.push(`Formal charges: ${parts.join(', ')}.`)
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
  return { lead, formula: molecule.formula, rest: sentences.join(' ') }
}

/**
 * The lone pairs of the Lewis structure in words, for the text alternative of the Lewis view:
 * "Lone pairs: 1 on the sulfur atom, 2 on Oxygen 1 and 3 on Oxygen 2." Atoms of one element
 * that all hold the same number share a phrase; otherwise each is named as in atomNames.
 */
export function describeLonePairs(molecule: Molecule, elements: readonly Element[]): string {
  const names = atomNames(molecule, elements)
  const phrases = [...new Set(molecule.atoms.map((a) => a.element))].flatMap((symbol) => {
    const mine = molecule.atoms.flatMap((atom, i) => (atom.element === symbol ? [{ pairs: atom.lonePairs, name: names[i]! }] : []))
    if (mine.every((a) => a.pairs === mine[0]!.pairs)) {
      const name = elements.find((e) => e.symbol === symbol)!.name.toLowerCase()
      return mine[0]!.pairs === 0 ? [] : [`${mine[0]!.pairs} on ${mine.length === 1 ? 'the' : 'each'} ${name} atom`]
    }
    return mine.filter((a) => a.pairs > 0).map((a) => `${a.pairs} on ${a.name}`)
  })
  return phrases.length === 0 ? 'No lone pairs.' : `Lone pairs: ${listFormat.format(phrases)}.`
}

/** A name for each atom, numbered per element in file order: "Carbon 1", "Oxygen 1", "Oxygen 2". */
export function atomNames(molecule: Molecule, elements: readonly Element[]): string[] {
  const seen = new Map<string, number>()
  return molecule.atoms.map(({ element: symbol }) => {
    const element = elements.find((e) => e.symbol === symbol)
    if (!element) throw new Error(`no element data for ${symbol}`)
    const n = (seen.get(symbol) ?? 0) + 1
    seen.set(symbol, n)
    return `${element.name} ${n}`
  })
}

/** A name for each bond from its atoms' names and its kind: "Carbon 1 to Oxygen 2, double bond". */
export function bondNames(molecule: Molecule, elements: readonly Element[]): string[] {
  const names = atomNames(molecule, elements)
  return molecule.bonds.map((b) => `${names[b.a]} to ${names[b.b]}, ${BOND_KINDS[b.aromatic ? 3 : b.order - 1]} bond`)
}
