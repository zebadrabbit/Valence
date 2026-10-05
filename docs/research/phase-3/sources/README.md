# Saved copies

The copies of other people's pages and data that the titration lab's record is built from and checked against. `MANIFEST.json` lists every source of the lab with its address, its citation and, for each value the record stores, the figure the source prints and where. It also lists the sources of the lab's primer (`src/chem-data/titration/primer.ts`), each with one row whose field is `primer`; none of those pages is kept, and the primer's own support lines say where each passage is and what it establishes. Nothing made from them is kept either (see "The quotation fingerprint" below). A source with a `file` has its copy here, with the sha256 of that copy; the others were read on the retrieval date, or on the later date their own citation gives, and no copy is kept. A value read from one of those rests on what the manifest says the page printed that day: the build cannot check it again, and a page that has changed since is not noticed.

The copies are as they were downloaded and are not edited by hand.

| File | What it is |
| --- | --- |
| `noaa-co2-annmean-gl.txt` | NOAA Global Monitoring Laboratory's file of globally averaged annual mean CO₂ |
| `pubchem-cid-313-ghs.json`, `pubchem-cid-14798-ghs.json`, `pubchem-cid-4764-ghs.json` | PubChem's GHS Classification section for hydrochloric acid, sodium hydroxide and phenolphthalein, from its PUG View service |
| `pubchem-cid-4764-properties.json` | PubChem's computed molecular weight and formula for phenolphthalein, from its PUG REST service |
| `wikipedia-carbonic-acid-1376246456.json`, `wikipedia-drop-unit-1314848686.json` | Two Wikipedia revisions, as the MediaWiki API returns them: the revision's number, its time and its source text |

## Attribution

`wikipedia-carbonic-acid-1376246456.json` holds the source text of the Wikipedia article "Carbonic acid" at revision 1376246456, unchanged:
<https://en.wikipedia.org/w/index.php?title=Carbonic_acid&oldid=1376246456>.
`wikipedia-drop-unit-1314848686.json` holds the source text of the Wikipedia article "Drop (unit)" at revision 1314848686, unchanged:
<https://en.wikipedia.org/w/index.php?title=Drop_(unit)&oldid=1314848686>.
Each is the work of Wikipedia's contributors, whose names are in the article's history, and is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (<https://creativecommons.org/licenses/by-sa/4.0/>). That licence covers these two files, not the rest of the repository.

Neither page is a primary source. The carbonic acid page is kept because the two stored acid constants were read there and nowhere else: its infobox cites a handbook that was not read. The database file of the U.S. Geological Survey's PHREEQC program was read afterwards to check them, and is listed in the manifest and not kept. The drop page is kept because the 0.05 mL drop was read only there.

The NOAA and PubChem files are their publishers' data. They are not this project's work, and the repository's licence does not cover them.

## The quotation fingerprint

`quotation-fingerprint.json` is not in the repository. It is a file that `scripts/fingerprint-sources.mjs` writes into this folder: a hash of every run of six consecutive words in the pages the primer cites, in the three safety data sheets the hazard notes rest on, and in the three PubChem records, as they were on the date it gives. `src/chem-data/titration/quotation.test.ts` holds the primer and the hazard notes to it: neither may repeat a run it lists.

It was kept here from 2026-10-05 until later the same day, with the statement that no text can be read back from it. That statement was wrong. The file holds no words, but a re-check rebuilt stretches of the pages from it: start from five words that are in a page, try each word of a dictionary as the sixth, keep the one whose run is in the fingerprint, and go on a word at a time. A file from which the pages can be rebuilt is too close to a copy of them, and none of those pages is kept. So `.gitignore` lists the file.

To make it again: save each page under its id in the manifest, as `<id>.html`, `<id>.txt` (the text of a PDF) or `<id>.json`, in a folder outside the repository, and run `node scripts/fingerprint-sources.mjs <folder> <the date the pages were fetched>`. The test then runs. Where the file is absent, as in CI, the cases that need it are skipped and the test run reports them as skipped. The no-quotation rule is therefore checked when the words are written, on a machine that has the pages, and not on every build.

## A page that was kept and is not any more

The strength of the indicator solution is read from Ricca Chemical Company's catalogue page for product number 5600. A copy of that page was kept here until 2026-10-05 and the build checked the stored figure against it. The page is a supplier's own, and the owner decided that it is cited, not kept. Its entry in the manifest, `ricca-5600`, now reads like those of the other pages that were read and not kept: the address, the day it was read (2026-10-04), and what it prints, which is the heading with 0.5% (w/v) in 50% (v/v) alcohol, and 5 g/L lower on the page. The entry's `fetchedSha256` is the sha256 of the page as it was fetched that day. It is a record of which page was read; no file here has that hash and nothing checks it. The stored figure now rests on that reading, and the build no longer checks it.
