# Emission spectra research record

The inputs the emission spectra of the periodic table are built from, the rule that picks the lines, and what was found in the data. Everything was gathered on 2026-10-08. Nothing in this folder is loaded by the app.

`npm run build:data` reads `sources/` and writes `src/chem-data/emission-spectra.json`, with one entry for each of the 118 elements, and three entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on a response it cannot read. `sources/README.md` says where each saved response came from and the exact queries.

## The rule

One rule, in `scripts/emission-lib.mjs`, applied by the build to every element but three:

1. Take the lines of the neutral atom with an observed wavelength in air from 400 to 700 nm, as NIST's response lists them. Rows that share a wavelength are one line.
2. Keep the lines whose relative intensity starts with a number. The number is read and the letters NIST puts after it are not ("500bl" is 500). A line with no intensity, or with letters only, is left out. Where two rows share a wavelength and differ, the larger number is taken (cerium at 657.910 nm is the one case).
3. Show the six with the largest numbers, and every line that ties with the sixth. Where there are six or fewer, show them all.

Ties are never cut, because any way of choosing among lines NIST rates the same would be this project's choice and not NIST's. So 34 elements show more than six lines. For plutonium, curium, berkelium and californium NIST gives every line the same intensity, and all of them are shown: 49, 27, 25 and 13.

Hydrogen, sodium and xenon keep the lines and sentences written for them by hand in `docs/research/phase-2/emission-lines.json`. The build checks that each of their wavelengths is printed, digit for digit, in the saved response.

## What came out

| Outcome | Elements |
| --- | --- |
| A spectrum by the rule | 94 |
| A spectrum written by hand | 3: hydrogen, sodium, xenon |
| No spectrum: NIST lists lines of the neutral atom in the range, none with a relative intensity | 1: francium (87 lines) |
| No spectrum: NIST lists lines of the element, none of the neutral atom in the range | 2: astatine, fermium |
| No spectrum: NIST lists no lines of the element | 18: mendelevium to oganesson |

## What was found

**Xenon's six are not the rule's.** The sentence stored with xenon says its lines are the six strongest by the relative intensity NIST lists. The saved response shows otherwise. They are the six lines with the largest transition probability, `Aki(s^-1)`, which is the column next to the relative intensity in NIST's table: `emission-lines.json` records those six numbers (1.91e+06, 5.83e+06 and so on) under the name `relativeIntensityAsPublished`. Two of the six, at 462.42756 and 467.12258 nm, have no relative intensity at all. By relative intensity the six would be 473.41518, 480.70190, 491.6507, 492.3152, 631.8062 and 482.9708 nm, of which two are among the six stored. Neither the rule nor xenon's lines were changed to fit the other, and the sentence on xenon's card still says what it said. It is for the project owner to decide which to keep. `src/chem-data/emissionSpectra.test.ts` holds a test that states the finding.

**The rule would give hydrogen the same four lines.** They are the only lines of the neutral atom in the range that NIST gives an intensity. Sodium's hand-written choice is narrower than the rule's: the rule would add four weaker lines to the two D lines.

**The intensities are not one scale.** They run to 600 for xenon and to 74,000,000 for vanadium. Within one element they can differ by a factor of a thousand between neighbours in the list (caesium: 33000, 31 and 25; thallium: 18000, 16, 6 and 2; indium: 18000 and 17000, then 50 and less). NIST's help page says why: see below.

**What NIST rates is not always what an element is known for.**

- Caesium has 56 lines of the neutral atom in the range and an intensity for three of them, all red. Two lines in the blue, at 455.52799 and 459.31721 nm, have a transition probability and no relative intensity, so the rule cannot show them.
- Francium has 87 lines and no intensity for any.
- A line outside 400 to 700 nm is never shown, however strong it is.
- Three of boron's six lines carry NIST's mark for a line observed in absorption.
- Three of the lines shown carry NIST's mark for a blend with another line: cerium 516.148, promethium 652.045 and platinum 443.0188 nm.

The rule was not changed for any of these. The note shown with every spectrum says that the lines are those of the neutral atom as a database lists them, and how far the intensities can be relied on.

## Read and not kept

Two pages were read on 2026-10-08 for the note shown with every spectrum (`EMISSION_SCOPE_NOTE` in `src/chem-data/element.ts`). Neither is copied here or quoted in the app. What each establishes is stored beside the note, in this project's words.

- **The help page of NIST's lines form**, <https://physics.nist.gov/PhysRefData/ASD/Html/lineshelp.html>. On selecting spectra, it establishes that a Roman numeral after the symbol names a stage of ionization, I being the neutral atom, and that the symbol alone asks for every stage. Under the heading Relative Intensity it establishes that the intensities are taken from the publications the database cites and are usually not normalised; that they depend on the light source; that they are to be read as qualitative; that there is no common scale, so that they have meaning only within the spectrum of one element in one stage of ionization; and that they compare best between lines that are close in wavelength. It also gives the meaning of the letters that follow an intensity.
- **Bulewicz, E. M. Flame Spectrum of Barium: Red and Infra-Red Bands. Nature 1956, 177, 670-671**, <https://doi.org/10.1038/177670a0>. The paper is paywalled and only its abstract was read. The abstract establishes that the diffuse bands that are very strong in the flame spectra of the alkaline-earth metals have been identified as those of the hydroxide radicals CaOH, SrOH and BaOH. The note says no more of flames than that.

## What nobody checked

No chemist has read the spectra or the sentences. Only the 400 to 700 nm range and only the neutral atom were asked for. The descriptors after an intensity (blended, wide, hazy, observed in absorption) are not used by the rule and are not shown. The three hand-written spectra cite the pages they were read from on 2026-10-03 and 2026-10-04; the responses saved here are a later request in another format.
