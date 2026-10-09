import type { Element } from './schema'
import { located } from './support'

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

/**
 * A configuration as the periodic table stores it, "[He]2s2 2p5", "[He] 2s2 2p3" or "1s1": the noble-gas
 * core where one is written, and the subshells after it in the order written.
 */
export function coreAndSubshells(configuration: string): { core: string | undefined; parts: ReturnType<typeof configurationParts> } {
  const [, core, rest = ''] = /^(\[[A-Z][a-z]\])? ?(.*)$/.exec(configuration) ?? []
  return { core, parts: configurationParts(rest) }
}

/** Shown with every emission spectrum: what the lines are, and what they are not. */
export const EMISSION_NOTE =
  'These lines come from isolated atoms in a glowing gas or vapour, as in a discharge lamp. An atom bonded in a molecule does not emit them.'

const NIST_LINES_HELP = 'https://physics.nist.gov/PhysRefData/ASD/Html/lineshelp.html'

/**
 * Shown with every emission spectrum: what the strip leaves out, and how far "strongest" can be trusted. NIST
 * reserves its rights in the database and the paper is a publisher's, so each passage is located and put in this
 * project's words. Both pages were read on 2026-10-08 and neither is kept. It has the shape of a description of the
 * periodic table (periodic.ts), which this file, loaded with the molecule pages, must not import.
 */
export const EMISSION_SCOPE_NOTE: { text: string; sourceIds: string[]; support: string } = {
  text: "The strip shows lines of the single neutral atom, as a database lists them. A real lamp or flame can look different, because ions and molecules give light too: in a flame, calcium, strontium and barium give strong bands of light as molecules with oxygen and hydrogen (CaOH, SrOH and BaOH). The strip does not show how strong each line is. Where the lines shown are an element's strongest, that is by NIST's relative intensities, which are rough, depend on the lamp they were measured with, and compare the lines of one element with each other, not with those of another element.",
  sourceIds: ['nist-asd-lines-help', 'bulewicz-1956'],
  support: [
    `nist-asd-lines-help: ${located(
      NIST_LINES_HELP,
      'the help page of the lines form, on selecting spectra',
      'the database holds a spectrum for each stage of ionization of an element, the neutral atom being the first, so an ion has lines of its own.',
    )}`,
    `nist-asd-lines-help: ${located(
      `${NIST_LINES_HELP}#OUTRELINT`,
      'the help page of the lines form, the section headed Relative Intensity',
      'the relative intensities are taken from the publications the database cites and are usually not put on one scale; that they depend on the light source and are to be read as qualitative; and that, different authors using different scales, they have meaning only within the spectrum of one element in one stage of ionization.',
    )}`,
    `bulewicz-1956: ${located(
      'https://doi.org/10.1038/177670a0',
      'the abstract, which is all of the paper that was read',
      'the diffuse bands that are very strong in the flame spectra of the alkaline-earth metals have been identified as those of the hydroxide radicals CaOH, SrOH and BaOH.',
    )}`,
  ].join('\n'),
}

/** How to read the strip and its numbers. */
export const EMISSION_READING_NOTE =
  'Wavelengths are in air. The colours on the strip are approximate: a screen cannot show a pure spectral colour.'
