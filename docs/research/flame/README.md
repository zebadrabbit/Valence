# Flame test lab research record

The inputs the flame test lab is built from (spec section 15), where each came from, and what could not be found. Everything was gathered on 2026-10-08. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/flame/flame.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources.

| File | What it is |
| --- | --- |
| `flame.json` | The lab's record: the six solutions, the colour each gives a flame, the lines and bands of each flame in a spectroscope, what the strip leaves out, the notes shown when a station is done, what a handled loop carries, whose colour hides the others, the answer to the closing question, and the model's parameters |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/flame/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `sources/nist-asd-lines-k-700-780.txt` | The one kept copy: what the NIST Atomic Spectra Database returned for the neutral potassium atom between 700 and 780 nm |
| `hazards.json`, `sources/hazard-manifest.json` | The six bottles' hazards and the documents behind them. They were written apart from the rest, in the form of the aqueous lab's, and the build merges them into the record. A note under a bottle's statements names its first two documents in `sourceId` and `alsoSourceId` and any further ones in `moreSourceIds`. The manifest also lists documents that were read and that no note carries anything from: they stay in that record, and the build lists in the app's sources only the documents a bottle's hazards cite |

## The kept table

Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database, Lines Data. National Institute of Standards and Technology. <https://doi.org/10.18434/T4W30F>.

The tables saved for the emission spectra of the periodic table (`../emission-spectra/sources/`) stop at 700 nm, and potassium's deep red pair lies beyond. One more request was made, with the query those tables were made with and the limits changed (`low_w=700`, `upp_w=780`; the full address is in the manifest), with `curl`, on 2026-10-09 at 02:44 UTC, which was the evening of 2026-10-08 where the work was done. It came back with HTTP status 200. The file is as returned and is not edited by hand; it is its publisher's data and not this project's work. It has eight rows: the two lines stored here, with the relative intensities 25r and 24r, and six rows with letters and no number for an intensity.

The build checks the file's sha256, and holds every atomic line of the record to the saved tables: each stored wavelength must be printed, digit for digit, in the table of the neutral atom of that salt's metal that its citation names.

## The six flames as stored

Rank 1 is the brightest of a salt's features. A band marked approximate has no limits in any source read: it is stored between the positions the sources give and drawn 5 nm wider on each side.

| Salt | Flame | Features, by rank | Answer range of the brightest |
| --- | --- | --- | --- |
| Barium chloride | pale green | 1. band, 480 to 550 nm, green, BaOH. 2. line, 553.5481 nm, green, Ba | 475 to 570 |
| Calcium chloride | orange-red | 1. band, 614 to 640 nm, orange-red, CaOH. 2. band, 540 to 568 nm, green, CaOH. 3. line, 422.673 nm, violet, Ca | 600 to 650 |
| Copper(II) chloride | blue-green | 1. band, 400 to 470 nm, blue, CuCl. 2. band, near 550 nm (approximate), green, CuOH | 400 to 475 |
| Potassium chloride | lilac | 1. line, 766.489913 nm with 769.896456 nm, deep red, K. 2. line, 404.4136 nm with 404.7208 nm, violet, K | 700 to 780 |
| Sodium chloride | yellow | 1. line, 588.995095 nm with 589.592424 nm, yellow, Na | 570 to 600 |
| Strontium chloride | red | 1. band, 671 to 686 nm (approximate), red, SrOH. 2. band, near 606 nm (approximate), orange, SrOH. 3. line, 460.7331 nm, blue, Sr | 650 to 700 |

## How each kind of value was read

- **Atomic lines.** NIST's saved tables, as above. A pair of lines closer than 5 nm is stored as one feature, the stronger line by NIST's relative intensity with its partner beside it, because a hand spectroscope shows the pair as one line; the 5 nm is a model parameter.
- **That a flame shows a line, and that the atom gives it.** For sodium and potassium, a university's page on flame colours and the paper of Kirchhoff and Bunsen (1860), read in an abridged English translation. For the lines of calcium, strontium and barium, a statement in one source that the atom's line is measured in a flame; the manifest's rows say how little each statement carries.
- **Bands of CaOH, SrOH and BaOH.** Two kinds of primary source. The abstracts in English of two papers of 1979 in a Japanese journal give ranges for the two bands of CaOH and for the band of BaOH, and three positions for SrOH; the papers themselves were not read, since the journal's site asks automated readers to leave its PDF files alone. A paper of 1975, read as a scanned copy in a university's repository, gives the maxima and band heads of the same bands and draws the emission spectra of CaOH and SrOH. Its pages were turned into images and read by eye, the figures too.
- **Bands of CuCl and CuOH.** A doctoral dissertation on firework flames, read in its university's repository, with one of the papers it reprints.
- **Which feature is the brightest.** Read from the same sources, and never from a table of measured intensities: none was found. For calcium and strontium it is the taller peak in the drawn emission spectra of the 1975 paper, which are not corrected for the instrument or for the eye. For barium it is what the two sources say of the green band. For copper it is what the dissertation's reprinted paper says of firework mixtures. For sodium and potassium it is NIST's relative intensity, which NIST calls qualitative. See "What a chemist should look at" below.
- **Colours of the flames.** One page of Chemguide for five of the six, with a paper from a university's museums and an open textbook on qualitative analysis as second sources; the textbook for sodium's yellow.
- **Colour word of each feature.** The everyday name for light of its wavelength. Where the source that places a feature names its colour, the word is the source's.
- **What each solution looks like, its name and its formula.** Section 9 and the title of the supplier's safety data sheet for the solution, the same six sheets that the notes under the bottles' hazards rest on. The copies read were the ones fetched for the hazards. Both manifests list these six sheets, written alike, and the build lists each once.
- **Sodium on a handled loop, and sodium's yellow hiding other colours.** The university's page, a college's pre-lab page, and the 1860 paper, whose passage is about a little lithium beside much sodium.
- **The closing question's answer.** The 1860 paper: the lines of each metal stayed where they were whatever the metal was combined with.

## What could not be sourced, or only in part

- **The hex value of each flame, and of the copper solution,** is this project's choice for drawing the colour its source names. No source gives one.
- **Bands of SrCl.** The dissertation says that this molecule adds red light where there is chlorine. No source that could be read gives its wavelengths, so none is stored, and the strontium station says so.
- **Bands of copper oxide.** One source says there are two, in the red, and gives no wavelength. None is stored.
- **A line of the copper atom.** None is stored: the one source read on copper flames names none between 400 and 780 nm. That is an absence in one source.
- **Limits of the bands of SrOH and of CuOH.** Not given by any source read. The bands are stored where the sources put their maxima and marked approximate.
- **Bands of BaO and of BaCl.** The 1975 paper gives both. They are not on the strip: the first is spread over most of the scale, and the second lies inside the broad green band. Each is said in a sentence at the barium station.
- **The six red lines the 1860 paper counts for strontium.** One red band is stored.
- **How large the trace on a handled loop is.** A model parameter: the trace shows as fully as a dip in the sodium chloride solution. The record says that a real one is far smaller.
- **What a flame of several salts without sodium is called.** A model parameter: by the colour of each. No source was read for it.
- **The resolution of a hand spectroscope.** A model parameter, 5 nm.
- **That the far red pair of potassium is faint to the eye.** The eye's range is from a page of NASA; that this is why a potassium flame is hard to see is the lab's own joining of the two statements.

## What a chemist should look at

1. **Brightness is the instrument's, not the eye's.** The ranks follow what the sources' instruments recorded or what NIST rates. An eye at a hand spectroscope is far more sensitive to orange than to deep red: for strontium it may well find the orange band near 606 nm the brighter, where the lab says the red band; and potassium's deep red pair, ranked first here, is at the edge of what the eye sees. The lab asks where the brightest thing is, and its answer is the stored rank.
2. **Copper.** The blue band of CuCl is ranked above the green band of CuOH on the strength of firework mixtures that hold a source of chlorine. Nothing read measured a copper(II) chloride solution on a loop in a burner's flame, where the green may be the stronger.
3. **Barium.** The broad green band is given to BaOH, and the narrow bands of BaCl are left off the strip, though the solution is a chloride.
4. **Ranges stored as limits.** The two ranges of CaOH and the one of BaOH are the ranges in which an abstract says the spectra were measured or were stronger. They may be the windows of a measurement and not the edges of the bands.
5. **The atom's lines at calcium, strontium and barium** are on the strip on thin grounds, and ranked last: sources that measure the atom in a flame by the light it takes up.
6. **Flames differ.** The sources used flames of hydrogen and oxygen in argon, of air and acetylene, of a gas burner in 1860, and of burning firework mixtures. The lab's burner is none of these in particular.

## Tried and not read

Each of these refused an automated reader or asks one not to read it, and nothing was done to get round that: a United States defence report server (refused the request); the site of the journal Nature, the site of the publisher of the Proceedings of the Physical Society, the repository of one German university and one chemistry education site (each names this kind of reader in its robots file); the Royal Society of Chemistry's journal pages, PubMed Central, the Directory of Open Access Journals and the Smithsonian's site (each answered with a refusal or a browser check). One university's server could not be reached. No page of OpenStax was fetched. The English Wikipedia's article on pyrotechnic colorants was fetched and read, and nothing is taken from it: its table of bands disagreed with the primary sources.

## Read and not kept

Every source but the kept table. A value read from a page that is not kept rests on what the manifest says the page printed that day. What the build holds is that the record and the manifest give one account.

The quotation fingerprint that `src/chem-data/flame/quotation.test.ts` compares the lab's words against is not kept either, for the reason `../phase-3/sources/README.md` gives. `scripts/fingerprint-sources.mjs` writes it to `sources/`, where `.gitignore` lists it, from pages saved outside the repository:

    node scripts/fingerprint-sources.mjs <folder of saved pages> 2026-10-08 docs/research/flame/sources

## What nobody checked

No chemist has read the record, the notes or the primer. The scanned paper was read by one reader, by eye.
