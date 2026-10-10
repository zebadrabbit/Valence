import { BOND_KINDS, deriveAtoms } from './derive'
import type { Element, Molecule } from './schema'

// Plain text for screen readers (spec 11): no symbols a reader might skip, so
// a charge is written "plus 1", a formula uses ordinary digits, and a trailing
// parenthesised formula in a name such as "Oxygen (O₂)" is dropped. The formula
// is the authored one, written as textbooks write it (NH3, not Hill's H3N).

/** A description is this many sentences at most, the one that gives the name and formula included. */
const MAX_SENTENCES = 7
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
  // The drawn single and double bonds of a resonance set must not be heard as fact (spec 6.1, 6.3).
  // ponytail: assumes one set per molecule, of two or three bonds that share an atom, one of them drawn
  // double, which is all the library has. Two sets in one molecule would need each worded.
  const noted = bonds.filter((b) => b.resonanceNote)
  const ends = noted.flatMap((b) => [b.a, b.b])
  const outer = ends.find((i) => ends.indexOf(i) === ends.lastIndexOf(i))
  const only = bonds.filter((b) => b.order === 1).length === noted.length - 1
  const singles = noted.length === 2 ? `${only ? 'the' : 'one'} single bond` : `${only ? 'the ' : ''}two single bonds`
  const structures = noted.length === 2 ? 'two' : 'three'
  const resonance =
    outer === undefined
      ? ''
      : `; the double bond and ${singles} to ${nameOf(atoms[outer]!.element)} are drawn as one of ${structures} equivalent resonance structures, ` +
        `and the ${structures} real bonds are equal`
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

  // What is said of each atom bonded to two or more atoms, keyed by element so equal atoms share a sentence:
  // its geometry and its neighbours, or, where that would take the description past MAX_SENTENCES, its geometry alone.
  const central = deriveAtoms(molecule, elements).flatMap((derived, i) => {
    if (derived.bondedAtoms < 2) return []
    const neighbours = bonds.flatMap((b) => (b.a === i ? [b.b] : b.b === i ? [b.a] : []))
    return [{ element: atoms[i]!.element, geometry: derived.geometry, bondedTo: atomsOf(neighbours.map((j) => atoms[j]!.element)) }]
  })
  const total = (element: string) => atoms.filter((a) => a.element === element).length
  const grouped = (saying: (atom: (typeof central)[number]) => string) => {
    const groups = new Map<string, { element: string; saying: string; count: number }>()
    for (const atom of central) {
      const key = `${atom.element} ${saying(atom)}`
      const group = groups.get(key) ?? { element: atom.element, saying: saying(atom), count: 0 }
      group.count += 1
      groups.set(key, group)
    }
    return [...groups.values()]
  }
  const subject = (element: string, count: number) => {
    const name = nameOf(element)
    const all = count === total(element)
    return count === 1 ? (all ? `The ${name} atom` : `One ${name} atom`) : `Each of ${all ? 'the ' : ''}${count} ${name} atoms`
  }
  const detailed = grouped((atom) => `has ${atom.geometry} geometry and is bonded to ${atom.bondedTo}.`)
  // `sentences` starts with the end of the sentence that gives the name and formula, so its length is the count so far.
  if (sentences.length + detailed.length <= MAX_SENTENCES) {
    for (const { element, saying, count } of detailed) sentences.push(`${subject(element, count)} ${saying}`)
  } else {
    const byGeometry = grouped((atom) => `${atom.geometry} geometry`)
    for (const element of new Set(central.map((atom) => atom.element))) {
      const mine = byGeometry.filter((group) => group.element === element)
      const parts = mine.map(({ saying, count }) => `${count} ${count === 1 ? 'has' : 'have'} ${saying}`)
      sentences.push(
        mine.length === 1
          ? `${subject(element, mine[0]!.count)} has ${mine[0]!.saying}.`
          : `Of the ${total(element)} ${nameOf(element)} atoms, ${listFormat.format(parts)}.`,
      )
    }
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
