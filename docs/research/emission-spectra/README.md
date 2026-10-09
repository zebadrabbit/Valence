# Emission spectra research record

The inputs the emission spectra of the periodic table are built from, the rule that picks the lines, and what was found in the data. Everything was gathered on 2026-10-08. Nothing in this folder is loaded by the app.

`npm run build:data` reads `sources/` and writes `src/chem-data/emission-spectra.json`, with one entry for each of the 118 elements, and three entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on a response it cannot read. `sources/README.md` says where each saved response came from and the exact queries.

## The rule

One rule, in `scripts/emission-lib.mjs`, applied by the build to every element but two:

1. Take the lines of the neutral atom with an observed wavelength in air from 400 to 700 nm, as NIST's response lists them. Rows that share a wavelength are one line.
2. Keep the lines whose relative intensity starts with a number. The number is read and the letters NIST puts after it are not ("500bl" is 500). A line with no intensity, or with letters only, is left out. Where two rows share a wavelength and differ, the larger number is taken (cerium at 657.910 nm is the one case).
3. Show the six with the largest numbers, and every line that ties with the sixth. Where there are six or fewer, show them all.

Ties are never cut, because any way of choosing among lines NIST rates the same would be this project's choice and not NIST's. So 34 elements show more than six lines. For plutonium, curium, berkelium and californium NIST gives every line the same intensity, and all of them are shown: 49, 27, 25 and 13.

Hydrogen and sodium keep the lines and sentences written for them by hand in `docs/research/phase-2/emission-lines.json`. The build checks that each of their wavelengths is printed, digit for digit, in the saved response.

Hydrogen, sodium and xenon are also shown on the atom cards of the molecule explorer, from `src/chem-data/elements.json`. The build writes the same spectrum to both files, and a test holds them equal: hydrogen's and sodium's by hand, xenon's by the rule.

## What came out

| Outcome | Elements |
| --- | --- |
| A spectrum by the rule | 95 |
| A spectrum written by hand | 2: hydrogen, sodium |
| No spectrum: NIST lists lines of the neutral atom in the range, none with a relative intensity | 1: francium (87 lines) |
| No spectrum: NIST lists lines of the element, none of the neutral atom in the range | 2: astatine, fermium |
| No spectrum: NIST lists no lines of the element | 18: mendelevium to oganesson |

## What was found

**Xenon's first six were not what their sentence said. Resolved on 2026-10-08.** Until that day xenon showed six lines chosen by hand on 2026-10-03 (697.6182, 688.2155, 491.6507, 480.70190, 467.12258 and 462.42756 nm), with a sentence that called them the six strongest by the relative intensity NIST lists. The saved response showed otherwise. They were the six lines with the largest transition probability, `Aki(s^-1)`, the column next to the relative intensity in NIST's table: `emission-lines.json` recorded those six numbers (1.91e+06, 5.83e+06 and so on) under the name `relativeIntensityAsPublished`. Two of the six, at 462.42756 and 467.12258 nm, have no relative intensity at all.

The first build of this phase changed neither the rule nor xenon's lines, and put the finding to the project owner, who decided the same day: the rule applies to xenon as to every other element, wherever xenon is shown. Its lines are now 631.8062, 492.3152, 491.6507, 482.9708, 480.70190 and 473.41518 nm (NIST's intensities 500, 500, 500, 400, 500 and 600; nothing ties with the sixth), on the periodic table's card and on the molecule explorer's atom card, with the rule's sentence in place of the old one. Two of the first six are among them. Xenon's entry in `emission-lines.json` is kept as history, marked superseded with a dated correction, and its six numbers are named there for what they are; the build reads nothing from it but the mark. The source entry for the page the first six were read from is no longer cited and is not written to the app's sources. `src/chem-data/emissionSpectra.test.ts` holds xenon to the rule and the record to NIST's columns.

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

Pages read on 2026-10-08 for the note shown with every spectrum (`EMISSION_SCOPE_NOTE` in `src/chem-data/element.ts`). None is copied here or quoted in the app. What each establishes is stored beside the note, in this project's words.

- **The help page of NIST's lines form**, <https://physics.nist.gov/PhysRefData/ASD/Html/lineshelp.html>. On selecting spectra, it establishes that a Roman numeral after the symbol names a stage of ionization, I being the neutral atom, and that the symbol alone asks for every stage. Under the heading Relative Intensity it establishes that the intensities are taken from the publications the database cites and are usually not normalised; that they depend on the light source; that they are to be read as qualitative; that there is no common scale, so that they have meaning only within the spectrum of one element in one stage of ionization; and that they compare best between lines that are close in wavelength. It also gives the meaning of the letters that follow an intensity.
- **Three sources of the flame test lab**, for the one thing the note says of flames: that calcium, strontium and barium give strong bands of light there as the molecules CaOH, SrOH and BaOH. They are the abstracts in English of two papers by H. Daidoji in Bunko Kenkyu 1979, 28 (3), on the spectra of calcium salts and of strontium and barium salts in a flame, and the paper of Human and Zeegers in Spectrochimica Acta Part B 1975, 30, 203-209, read as a scanned copy in a university's repository. Their addresses, their citations and what each prints are in `../flame/sources/MANIFEST.json`, and `../flame/README.md` says how each was read. The note says no more of flames than that.

Until the flame test lab was built, the note's sentence on flames rested on the abstract of a paper in Nature (1956, 177, 670-671), read on the publisher's page. That site's robots file sets rules for automated readers, so the page is no longer a source of this project: the build lists it no longer, and nothing the note says depended on it alone.

## What nobody checked

No chemist has read the spectra or the sentences. Only the 400 to 700 nm range and only the neutral atom were asked for. The descriptors after an intensity (blended, wide, hazy, observed in absorption) are not used by the rule and are not shown. The two hand-written spectra cite the pages they were read from on 2026-10-03 and 2026-10-04; the responses saved here are a later request in another format.
