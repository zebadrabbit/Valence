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
// The flame test lab's sources for the bands of CaOH, SrOH and BaOH (docs/research/flame/sources/MANIFEST.json),
// at the addresses the registry lists them with. The two papers of 1979 are on one page, their issue's.
const BUNKO_1979 = 'https://www.jstage.jst.go.jp/browse/bunkou/28/3/_contents/-char/en'
const HUMAN_ZEEGERS_1975 = 'https://dspace.library.uu.nl/handle/1874/16421'
const ABSTRACT_ONLY = 'the abstract in English, which is all of the paper that was read'

/**
 * Shown with every emission spectrum: what the strip leaves out, and how far "strongest" can be trusted. NIST
 * reserves its rights in the database and the papers are their publishers', so each passage is located and put in
 * this project's words. Every page was read on 2026-10-08 and none is kept. What the note says of flames rests on
 * the flame test lab's sources: until that lab was built it rested on the abstract of a paper in Nature, which was
 * dropped because that site's robots file sets rules for automated readers. It has the shape of a description of
 * the periodic table (periodic.ts), which this file, loaded with the molecule pages, must not import.
 */
export const EMISSION_SCOPE_NOTE: { text: string; sourceIds: string[]; support: string } = {
  text: "The strip shows lines of the single neutral atom, as a database lists them. A real lamp or flame can look different, because ions and molecules give light too: in a flame, calcium, strontium and barium give strong bands of light as molecules with oxygen and hydrogen (CaOH, SrOH and BaOH). The strip does not show how strong each line is. Where the lines shown are an element's strongest, that is by NIST's relative intensities, which are rough, depend on the lamp they were measured with, and compare the lines of one element with each other, not with those of another element.",
  sourceIds: ['nist-asd-lines-help', 'daidoji-1979-calcium', 'daidoji-1979-strontium-barium', 'human-zeegers-1975'],
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
    `daidoji-1979-calcium: ${located(
      BUNKO_1979,
      ABSTRACT_ONLY,
      'solutions of calcium salts sprayed into a flame of air and acetylene show the spectrum of the molecule CaOH in two ranges of wavelength, one in the green and one in the orange-red.',
    )}`,
    `daidoji-1979-strontium-barium: ${located(
      BUNKO_1979,
      ABSTRACT_ONLY,
      'in the same kind of flame the molecule SrOH takes up light very strongly around three wavelengths in the orange and the red, and the emission of the molecule BaOH is the stronger between 480 and 550 nm, in the green.',
    )}`,
    `human-zeegers-1975: ${located(
      HUMAN_ZEEGERS_1975,
      'the abstract, the introduction and section 3.1 with its figures, in the scanned copy in the repository',
      'CaOH and SrOH in a flame give out bands of light, which the paper draws as the spectra of calcium and of strontium in its flame and finds the same as the bands the molecules give when light is shone on them; and that the green bands of BaOH emit strongly in the flame.',
    )}`,
  ].join('\n'),
}

/** How to read the strip and its numbers. */
export const EMISSION_READING_NOTE =
  'Wavelengths are in air. The colours on the strip are approximate: a screen cannot show a pure spectral colour.'
