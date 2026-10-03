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
