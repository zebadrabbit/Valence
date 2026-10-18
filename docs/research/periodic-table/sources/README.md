# Saved copies

The copies of other people's pages and data that the periodic table is built from and checked against. `MANIFEST.json` lists each file with what it is, where it came from and the date it was retrieved. It also lists copies that were read on that date and are not kept here.

The copies are not edited by hand. The three `pubchem-*` files are written by `scripts/extract-pubchem-pages.mjs`: two are extracts of PubChem's element pages, and `pubchem-ptable-column-labels.json` holds the unit labels from the script of PubChem's table page. The other copies are as they were downloaded.

## Attribution

`wikipedia-densities-of-the-elements-data-page.wikitext` is the source text of the Wikipedia article "Densities of the elements (data page)" at revision 1258326075, unchanged:
<https://en.wikipedia.org/wiki/Densities_of_the_elements_(data_page)?oldid=1258326075>.
It is the work of Wikipedia's contributors, whose names are in the article's history, and is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (<https://creativecommons.org/licenses/by-sa/4.0/>). That licence covers this one file, not the rest of the repository.

The five Wikipedia data pages in `MANIFEST.json` (this one, and the four read and not kept) were fetched on 2026-10-03 as source text at `/w/index.php?…&action=raw`, an address Wikipedia's robots file closes to automated readers, which leaves `/wiki/` open. On 2026-10-18, with that file read first, each was read once at `/wiki/Title?oldid=…`, at the revision `MANIFEST.json` records; each page said it was that revision, and each figure the record cites from it was there with the same digits (the values of `cross-check-recorded.md`, sections 9.3 to 9.6, and the handbook densities the notes and the measurement and density lab quote). The manifest now gives those addresses. One thing was seen in passing and not changed: the electronegativity page gives mercury 1.9 in its CRC and Lange columns against PubChem's 2, a difference that section 9.3's list of eleven leaves out.

The page is a transcription of handbooks, not a primary source. It is kept because the density notes that quote a handbook figure rest on it: the figures were read only there.
