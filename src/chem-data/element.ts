import type { Element } from './schema'

// e x N_A / 1000. Both constants are exact by the 2019 SI definitions, so this is not a measured value.
const KJ_PER_MOL_PER_EV = 96.48533212331

/** Converts an ionization energy from eV per atom (as NIST publishes it) to kJ/mol. */
export function evToKjPerMol(ev: number): number {
  return ev * KJ_PER_MOL_PER_EV
}

// ponytail: outer-shell count, which is right for main-group elements only.
// A transition metal needs a real rule; none is in the v1 element set.
export function valenceElectrons(element: Element): number {
  return element.shells.value.at(-1) ?? 0
}

/** A stored configuration such as "1s2 2s2 2p2" as subshells with their electron counts, for superscript display. */
export function configurationParts(configuration: string): { subshell: string; electrons: string }[] {
  return configuration.split(' ').map((term) => {
    const match = /^(\d[spdf])(\d+)$/.exec(term)
    if (!match) throw new Error(`unreadable configuration term "${term}"`)
    return { subshell: match[1]!, electrons: match[2]! }
  })
}

/** Shown with every emission spectrum: what the lines are, and what they are not. */
export const EMISSION_NOTE =
  'These lines come from isolated atoms of the gas glowing in a discharge lamp. An atom bonded in a molecule does not emit them.'

/** How to read the strip and its numbers. */
export const EMISSION_READING_NOTE =
  'Wavelengths are in air. The colours on the strip are approximate: a screen cannot show a pure spectral colour.'
