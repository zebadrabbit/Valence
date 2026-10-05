# Saved copies

The copies of other people's pages and data that the titration lab's record is built from and checked against. `MANIFEST.json` lists every source of the lab with its address, its citation and, for each value the record stores, the figure the source prints and where. It also lists the sources of the lab's primer (`src/chem-data/titration/primer.ts`), each with one row whose field is `primer`; none of those pages is kept, and the primer's own support lines say where each passage is and what it establishes. What is kept of them is `quotation-fingerprint.json` (below). A source with a `file` has its copy here, with the sha256 of that copy; the others were read on the retrieval date, or on the later date their own citation gives, and no copy is kept.

The copies are as they were downloaded and are not edited by hand.

| File | What it is |
| --- | --- |
| `noaa-co2-annmean-gl.txt` | NOAA Global Monitoring Laboratory's file of globally averaged annual mean CO₂ |
| `pubchem-cid-313-ghs.json`, `pubchem-cid-14798-ghs.json`, `pubchem-cid-4764-ghs.json` | PubChem's GHS Classification section for hydrochloric acid, sodium hydroxide and phenolphthalein, from its PUG View service |
| `pubchem-cid-4764-properties.json` | PubChem's computed molecular weight and formula for phenolphthalein, from its PUG REST service |
| `ricca-5600-listing.html` | Ricca Chemical Company's catalogue page for product number 5600, the phenolphthalein indicator solution whose strength the record stores |
| `wikipedia-carbonic-acid-1376246456.json`, `wikipedia-drop-unit-1314848686.json` | Two Wikipedia revisions, as the MediaWiki API returns them: the revision's number, its time and its source text |
| `quotation-fingerprint.json` | Not a copy of anything: a hash of every run of six consecutive words in the pages the primer cites, in the three safety data sheets the hazard notes rest on, and in the three PubChem records, as they were on the date it gives. No text can be read back from it. `scripts/fingerprint-sources.mjs` writes it from pages fetched to a folder outside the repository, and `src/chem-data/titration/quotation.test.ts` holds the primer and the hazard notes to it: neither may repeat a run it lists |

## Attribution

`wikipedia-carbonic-acid-1376246456.json` holds the source text of the Wikipedia article "Carbonic acid" at revision 1376246456, unchanged:
<https://en.wikipedia.org/w/index.php?title=Carbonic_acid&oldid=1376246456>.
`wikipedia-drop-unit-1314848686.json` holds the source text of the Wikipedia article "Drop (unit)" at revision 1314848686, unchanged:
<https://en.wikipedia.org/w/index.php?title=Drop_(unit)&oldid=1314848686>.
Each is the work of Wikipedia's contributors, whose names are in the article's history, and is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (<https://creativecommons.org/licenses/by-sa/4.0/>). That licence covers these two files, not the rest of the repository.

Neither page is a primary source. The carbonic acid page is kept because the two stored acid constants were read there and nowhere else: its infobox cites a handbook that was not read. The database file of the U.S. Geological Survey's PHREEQC program was read afterwards to check them, and is listed in the manifest and not kept. The drop page is kept because the 0.05 mL drop was read only there.

`ricca-5600-listing.html` is Ricca Chemical Company's page, with its own copyright notice, kept unchanged as the record of what was read on the retrieval date. It is not this project's work, and the repository's licence does not cover it. The same holds for the NOAA and PubChem files, which are their publishers' data.
