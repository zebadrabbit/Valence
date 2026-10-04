# Valence: information for institutional reviewers

Valence is an independent, free project made for any learner. It is not affiliated with any school and there is no vendor relationship: no contract, no account manager, and no support agreement. An institution that chooses to point students to Valence does its own review. This page gives each reviewing department the facts it needs.

Each section states only what is true of the current version. The current version has the molecule explorer and the periodic table; the labs and the mechanism timeline are not built yet. A lab safety section will be added with the labs.

## IT and security

- **What it is:** a static website (HTML, CSS, JavaScript). There is no server-side code, database, or API.
- **Install:** none. It has been tested in Chromium (the engine behind Chrome and Edge), where scripted checks are run against the production build. Firefox and Safari have not been tested yet.
- **Accounts:** none. There is no sign-in of any kind.
- **Network:** the app requests only its own files, from the server it was loaded from. Fonts and all data are bundled; nothing is loaded from a third-party CDN and nothing is sent anywhere. Parts of the app (the molecule pages, the 3D viewer, the periodic table) and some font files are fetched from those same files the first time they are needed.
- **Storage:** preferences and learning progress are stored in the browser's `localStorage` under keys beginning `valence:`. Nothing is stored anywhere else.
- **Inline script:** besides its script files, the page carries one short script written into `index.html` by the build. It reads the stored theme and reduced-motion preferences and applies them before the page is first drawn, so that the dark theme does not flash light on every load. It requests nothing and stores nothing. A host whose Content Security Policy forbids inline scripts can still serve Valence: the app applies the same preferences once it has loaded, a moment later.
- **Shared computers:** on a shared browser profile, the next person can see the previous learner's saved progress. Settings has a "Clear my progress" button, and clearing site data in the browser has the same effect.
- **Self-hosting:** run `npm ci && npm run build`, then serve the `dist/` folder from any static web server. No rewrite rules are needed, and it works from a sub-path.
- **Source code:** public under the MIT licence.

## Legal and privacy

- **Personal data:** Valence collects none. It has no accounts, no forms that ask for personal information, no analytics, and no cookies.
- **Data leaving the device:** none. Progress never leaves the learner's browser unless the learner uses "Export my progress" to download their own file.
- **Education records:** because nothing is collected or transmitted, Valence creates and holds no records about any student. Whether and how an institution uses Valence under FERPA or similar rules is the institution's determination; this page states the facts for that review and is not legal advice.
- **Children's privacy (COPPA) and GDPR:** the same facts apply. No personal information is collected from anyone, of any age, in any location.
- **Third-party data:** chemistry data is cited to its sources on the About page, which acknowledges PubChem (National Library of Medicine), CIAAW and NIST. The source repository also keeps copies of the pages the periodic table was built from, as a research record; one of them, a Wikipedia page, is under the Creative Commons Attribution-ShareAlike licence and is attributed beside the copy. The copies are not part of the built app.
- **Licence:** MIT.

## Accessibility services

Valence has not had an accessibility audit, and this page makes no claim of conformance to WCAG or any other standard. This section lists what was built, how it was checked, and what has not been checked.

**How it was checked.** Scripts drove the production build in headless Chromium 153 (the engine behind Chrome and Edge) on Linux, using the keyboard only where the check is about the keyboard. Screenshots were taken in the light and dark themes at 1366×768 and 400×800 (the periodic table also at 2523×1290) and looked at by the AI coding assistant that built the screens; no person has reviewed them yet. The chemistry text (descriptions, names, measurements) comes from functions with automated tests.

**What was checked that way:**

- **Keyboard operation of the explorer.** With no mouse: reach the library from the menu, open a molecule, switch between the four views, turn and zoom the 3D model with the camera buttons, open the text description, select atoms and bonds from the Atoms and bonds list, open the "More about" and "Sources" parts of the cards, measure a distance and an angle, clear the selection, change the valence display level, switch between the neutral and zwitterion forms, and jump to another molecule with the search dialog (Ctrl+K, ⌘K, or the Search button in the menu). Focus moves to the page heading after each navigation (the periodic table has one exception, described next), returns to where it was when the search dialog is closed with Escape, and has a visible indicator on every stop in the molecule page's tab order.
- **Keyboard operation of the periodic table.** With no mouse: reach the table from the library page, from Home, or from the search dialog; move between the elements; open an element and read its card; change the colouring and the highlight; open the list of all elements; jump to another element or to a molecule with the search dialog; and follow the link on a molecule's atom card to that element. The table is drawn as two grids, the main table and the two rows below it, which together are a single stop in the tab order. Inside them the arrow keys move to the nearest element in that direction, across the gap between the two grids; Home and End go to the ends of a row, and Ctrl+Home and Ctrl+End to the first and last element of the table; Enter or Space opens the element. An arrow key at an edge does nothing, and does not scroll the page. When focus leaves the grids, the stop stays on the selected element, or on the cell that last had focus when none is selected. Colouring and highlighting are two ordinary drop-down lists, and each chemical family in the legend is a toggle button. Every stop on the page has a visible focus indicator.
- **The table's exception to the focus rule.** Opening an element from the table, or from the list of all elements, leaves focus on the cell or link that was chosen, so the arrow keys can go on from there; a status line announces "Selected: Fluorine. Its details are below the table." The highlighted set is announced in a second status line, so that choosing an element does not read the highlight out again. A "Clear selection" link follows the table, and the element's card follows that. Reaching an element any other way (the search dialog, the link on an atom card, or the browser's Back button from another page) moves focus to the page heading as everywhere else. Opening elements one after another does not add to the browser history, so Back leaves the table in one step.
- **Names and alternatives in the periodic table.** Each cell's name gives the element's name, symbol, atomic number and chemical family, the value and unit when the table is coloured by a property ("no value listed" when there is none), and whether it is highlighted. The columns and rows of the main table have group and period headers. The cells of lanthanum and actinium are also described by a sentence saying that cerium to lutetium, or thorium to lawrencium, come next and are drawn below the main table. Below the table, "All 118 elements as a list" gives every element as a plain link in atomic-number order with the same value beside it, so a trend can be read without the grid or its colours. The shell diagram on an element's card is hidden from assistive technology and its electron counts are given as text. Every link, button, drop-down list and disclosure on the page has a text name.
- **Text alternatives.** The 3D model and the 2D Lewis drawing are each exposed as one image with a name ("3D ball and stick model of Water") and a description: the formula, the number of atoms and bonds, each central atom's geometry, and where the lone pairs are. The same description can be read on the page under "Text description". Every atom and bond is in the Atoms and bonds list by name, and the current selection and any measurement are written in a status line.
- **Reduced motion.** With the operating system set to reduce motion, or with Reduced motion set to On in Settings, the 3D model stops as soon as a drag is released; with motion allowed it coasts briefly. Nothing in the explorer moves by itself in either case. On the periodic table's page nothing moves. The only transition is the brief fade of the focus ring on the legend's buttons, as on buttons elsewhere, and it is off when motion is reduced.
- **Theme at load.** The light or dark theme (the learner's choice in Settings, or the operating system's) is in place before the page is first drawn. With the system set to light and the dark theme chosen, and the reverse, every frame Chromium painted from the first was in the chosen theme, on Home, Settings and the periodic table at 1366×768; so it was with nothing stored, with a stored value that was corrupt, and with storage blocked, where the system's theme is used. The browser is told which theme is in use, so the parts it draws itself (the lists of the drop-downs, the scrollbars) match.
- **Colour is not the only signal.** A selected atom or bond has a tick in the list and a ring in the model, and is named in the status line; the current view and form have a tick. Elements are coloured in the model, and each atom's element is also in its name ("Oxygen 1") and on its card. In the periodic table the chemical family is named in the legend and in each cell's name as well as coloured; a highlighted set has a solid border and the rest lose their fill and take a dashed border, with no fading, so the text keeps its full contrast; a property's value is printed in the cell as well as shaded; an element with no value is hatched and named "no value listed"; the selected element has a double border.
- **Fit.** At 1366×768 and at 400×800 every one of the 118 elements was opened and the page never scrolled sideways. When the table does not fit at its smallest cell size (44 pixels, or 56 while a property's values are shown), it scrolls sideways inside its own box. At 400×800 every cell reached with the arrow keys was wholly inside that box and the window, with its focus outline. The name and value of the focused or pointed-at element are written in a strip under the box, which does not scroll sideways with the table; it follows whichever was used last, naming the focused element after a key press and the pointed-at element after the pointer moves. When a cell takes focus from the keyboard, the page scrolls as far as it must, at once and without animation, to bring that strip into the window with the cell: at 400×800 and at 360×640 the strip was in the window and named the focused element after Tab into the table and after every key press that followed, with and without a property's values shown. A click or a tap scrolls nothing: at 400×800 and at 1366×768 a cell half cut off by the edge of the box or of the window opened on the first click. The first key pressed after such a click that makes the browser draw the cell's focus outline (Shift, Enter, Space or a letter; not Control alone) brings the cell and its outline wholly into view. An element opened from the search, the list or its address has its cell scrolled into view.
- **Names.** Every button, link, field and menu on the molecule page, with the search dialog open, has a text name.
- **Without WebGL.** If the browser cannot start the 3D model, the page says so, and the 2D Lewis view, the list, the cards and the text description still work.

**What has not been checked:**

- No person has tested Valence with a screen reader. The roles, names and descriptions above were checked by script, not by listening to them.
- No browser other than Chromium: not Firefox, not Safari, and no phone or tablet browser. Touch has not been tested.
- No person with a colour-vision deficiency has looked at the periodic table. Its ten family colours were chosen by a script that simulates three kinds of colour blindness and keeps the colours as far apart as it can; that is a simulation, not a test with people. Two pairs of families (transition metals and noble gases; post-transition metals and noble gases) are the closest even for full colour vision.
- Text contrast has not been measured on the rendered pages, with one exception: the text of the periodic table's cells against their fill, measured by script in Chromium at 1366×768 and 400×800. It is at least 9.64:1 on the family colours in the light theme and 7.01:1 in the dark theme, and at least 7.96:1 (light) and 6.56:1 (dark) on the property shading.
- Browser zoom and enlarged text have not been tested. Forced-colour (high contrast) mode was tried for the periodic table only, in Chromium's emulation and not with a Windows contrast theme: the borders that mark selection, highlight and focus remain when the colours are removed, and so does the hatching of an element with no value. The family colours and the property shading do not: there the family is given only by the names in the legend and in each cell's name, and a property only by the printed values.

**Known limits:**

- Atoms cannot be reached one by one with the keyboard inside the 3D model or the Lewis drawing. The Atoms and bonds list beside them is the keyboard path and selects the same things.
- On a canvas, dragging turns the model and the mouse wheel zooms it instead of scrolling the page.
- Some names contain subscript characters ("Oxygen (O₂)"), which a screen reader may read oddly.
- How a screen reader announces the periodic table is not known: whether it says the group and period headers, and what it says on crossing from the main table to the two rows below it, were not heard.
- An element's card is below the table. On most screens it is out of view when an element is chosen; the status line says where it is, and so does the readout in the table's empty corner.
- In a cell, an element's name is shown only on a wide screen, and a value with more digits than fit in the cell is printed there rounded to the digits that fit, never cut short: at 1366×768 and below that is 13 ionization energies and hydrogen's density, in type 9 pixels high. The legend says that cells round. The full name and value are in the cell's accessible name, in the readout (above the transition metals, or under the table where the table scrolls sideways), in the list of all elements, and on the element's card. The readout itself is hidden from assistive technology because it repeats the cell's name.
- Once an element is selected, the table is re-entered at that element, not at the cell that last had focus.
- Where the table scrolls sideways, the readout strip under it is not always in the window. From the keyboard it is brought there only if the window is tall enough for the table and the strip together (566 pixels at 400 wide, and up to 604 while a property's values are shown); in a shorter window (400×500 was tried) the focused cell is kept in view and the strip is cut off or below the window's edge while a cell in the top two rows has focus. With a mouse or a touch screen nothing scrolls: at 400×800 with the page at its top the strip is below the window's edge, and the learner has to scroll down about 300 pixels to have it in view with the whole table. Until then the cell shows only the symbol and atomic number. The name is still in the cell's accessible name, for assistive technology, and once the element is opened in the status line, which is under the strip and so no nearer.
- The search dialog lists 159 entries when nothing has been typed.

## Finance and procurement

- **Cost:** free. There are no paid tiers.
- **Licence:** MIT, which permits use, copying, modification, and redistribution, including by institutions.
- **Contract and vendor:** none. There is no company behind Valence, no service-level agreement, and no guaranteed support.
- **Hosting cost if self-hosted:** that of serving a few megabytes of static files.

## Faculty and curriculum

**What exists.** The molecule explorer and the periodic table. The two labs (standardization of a base by titration; reactions in aqueous solution) and the mechanism timeline are planned and not built; their pages say so.

**What the explorer shows.** A library of 31 molecules and ions in five groups: basics, a VSEPR showcase, organic functional groups, biomolecules, and the species of the planned mechanism. Glycine and alanine each have a neutral and a zwitterion form. For each one:

- Four views: ball and stick, space filling (van der Waals radii), wireframe, and a 2D Lewis structure with lone pairs and formal charges.
- An atom card: symbol, atomic number, standard atomic weight, electronegativity, valence electrons, formal charge, lone pairs, oxidation state, hybridization and VSEPR geometry, with electron configuration, ionization energies and radii one step further in.
- A bond card: length, order, σ and π composition, and polarity as the Pauling electronegativity difference, labelled "a rough guide".
- A measure tool: two atoms give a distance, three an angle, four a dihedral.
- Three valence display levels: a Bohr diagram of the selected atom, labelled "a simplified picture"; lone pairs as dots; and hybrid orbital lobes for sp, sp² and sp³ atoms, with molecular orbital diagrams for O₂ and N₂ only. The O₂ diagram points out that the Lewis structure shows every electron paired while the diagram shows two unpaired.

**Where each kind of value in the explorer comes from.** The cards list their sources, and the About page lists all of them.

| Value | Source |
| --- | --- |
| Standard atomic weight | IUPAC CIAAW abridged standard atomic weights, 2024 |
| Electron configuration, ionization energies | NIST Atomic Spectra Database |
| Electronegativity (Pauling) | PubChem periodic table |
| Covalent, van der Waals and ionic radii | Cordero et al. 2008; Mantina et al. 2009; Shannon 1976 |
| Geometry of the 13 basics and VSEPR molecules | Experimental gas-phase structures from NIST CCCBDB, each citing the original paper |
| Geometry of the other 20 structures | PubChem3D computed conformers (MMFF94s force field). These are not measurements, and each page says so. |
| 2D layouts for the Lewis view | PubChem 2D records, except four authored drawings: sulfur dioxide (PubChem draws it as a straight line), ammonia and hydronium (PubChem draws a flat Y; here the lone pair is on top), and carbon dioxide (drawn horizontal). |
| Molecular orbital order for O₂ and N₂ | OpenStax Chemistry 2e, section 8.4 |
| Formal charge and lone pairs | Authored with the Lewis structure; checked by the validator |
| Element colours in the models | Jmol CPK colours |
| Oxidation state, steric number, VSEPR geometry, hybridization, bond order, σ and π counts | Computed in the app from the stored structure by tested functions |
| Lengths, angles and dihedrals | Measured from the stored coordinates. For the 13 experimental structures a bond card shows the cited value; automated tests hold the coordinates to the cited lengths within 0.01 Å and the cited angles within 1°. |

The computed values are checked against a table of expected values written from the research: every atom of the basics, VSEPR and mechanism groups, and every non-hydrogen atom of the rest. Oxidation states are tested to sum to each species' charge, and every stored formal charge is checked by the validator.

**Conventions chosen.** Where textbooks differ, Valence follows a general chemistry text (OpenStax Chemistry 2e) and notes the convention on the card where it applies:

- **Hybridization** comes from the steric number. The O–H and ester oxygens of acids and esters are sp³ and bent; their card adds that organic chemistry describes them as sp², because one lone pair is delocalised into the neighbouring C=O. The nitrogen of an amide or of urea is the one exception: it is shown as sp² and trigonal planar, as its model is.
- **Terminal atoms.** Hydrogen reads "none (1s)". A terminal atom with a double or triple bond shows a value (a carbonyl oxygen is sp²). Singly bonded halogens and O⁻ read "not assigned (terminal atom)" and get no VSEPR geometry.
- **Expanded octets.** Steric numbers 5 and 6 read "sp³d (textbook label)" and "sp³d² (textbook label)", with the note that real d-orbital involvement is negligible. No lobes are drawn for them.
- **Sulfur dioxide** is drawn in the octet-obeying resonance form: one S=O, one S–O, formal charges +1 on sulfur and −1 on one oxygen. Its bond cards say this is one of two equivalent structures.
- **Resonance elsewhere.** The carboxylate of each zwitterion and the two unprotonated C–O bonds of bicarbonate are drawn as one structure, with the same note. Benzene's bonds are shown as aromatic, order 1.5.
- **Oxidation state** gives each bond's electrons to the more electronegative atom (Pauling) and splits them between atoms of the same element.
- **Geometry.** The 13 small molecules use experimental gas-phase geometry. The rest use one computed conformer; ethanol, glucose and ethyl acetate carry the note "one conformer of many".

**Known limits.**

- The covalent, van der Waals and ionic radii come from paywalled papers and were checked only against secondary transcriptions that agree with each other.
- The xenon electronegativity (2.6) has no traced primary source. The atom card says so under the value.
- PubChem 3D structures are computed conformers, not measurements. The bicarbonate conformer shows its two equivalent C–O bonds at different lengths; its page says so.
- The hydrogen peroxide H–O–O angle of 94.8° is the 1962 measurement NIST lists; later measurements give about 100–102°. Its page says so.
- Hybrid lobes are a simplified shape drawn along each bond and lone-pair direction. The lone pair of an amide or urea nitrogen is described in a note and not drawn as a lobe.
- The molecular orbital diagrams show the order of the levels, not their energies.
- The chemistry has been checked against the cited sources by script and by a second pass over the research. It has not been reviewed by a chemistry instructor.

### The periodic table

**What it shows.** All 118 elements in the 18-column layout, with cerium to lutetium and thorium to lawrencium in two rows below. The table can be coloured by chemical family or by one of five properties (electronegativity, covalent radius, first ionization energy, melting point, density), shaded on a linear scale from the lowest to the highest value, with each value printed in its cell. A group, a period, a block or a family can be highlighted, and each group, period and block has a short description of what its members share. Choosing an element shows a card with its atomic mass, group, period, block, family, electron configuration, a shell diagram with the electrons per shell, electronegativity, covalent and van der Waals radii, first ionization energy, electron affinity, common oxidation states, state at 25 °C, melting point, boiling point, density, year discovered, links to the library molecules that contain it, the emission spectrum for hydrogen, sodium and xenon, and its sources. Each atom card in the molecule explorer links to its element.

**Where each kind of value comes from.** Unlike the explorer's values, which were curated by hand, the table is built by a script from saved copies of its sources, with nothing fetched while the app runs. Every number is shown in the digits its source prints, with one exception: a cell of the table too narrow for a value prints it rounded, and the legend says so; the element's card always gives the value in full. The research record, including the saved copies, is in `docs/research/periodic-table/`.

| Value | Source | Elements |
| --- | --- | --- |
| Symbol, name, chemical family, electron configuration, state at 25 °C, oxidation states, year discovered | PubChem periodic table, downloaded 2026-10-03 | 118 (oxidation states 117) |
| Standard atomic weight | IUPAC CIAAW abridged standard atomic weights, 2024 | 84 |
| Mass of one named isotope, for elements with no standard atomic weight | PubChem periodic table | 34 |
| First ionization energy | NIST Atomic Spectra Database, with NIST's marking where a value is not measured | 1 to 108 |
| Electronegativity (Pauling scale) | PubChem periodic table | 95 |
| Covalent radius | Cordero et al. 2008, as carried on PubChem's element pages | 1 to 96 |
| Van der Waals radius | PubChem periodic table (from Los Alamos National Laboratory, which names no study) | 99 |
| Electron affinity | PubChem periodic table (from a 1990 compilation) | 57 |
| Melting point, boiling point, density | PubChem periodic table (from Jefferson Lab) | 103, 93, 96 |
| Group, period, block, electrons per shell | Worked out in the app from the atomic number and the configuration by tested functions | 118 |
| Descriptions of groups, periods and blocks; notes in the legends | Written for Valence from OpenStax Chemistry 2e, the IUPAC Red Book, and the IUPAC and Royal Society of Chemistry periodic tables. Beside each sentence the source code stores what it rests on: the passage itself where it is from OpenStax (licensed CC BY 4.0), and otherwise where the passage is and what it establishes. | |

**Cross-check.** A script compares the saved sources with each other and writes a report (`docs/research/periodic-table/cross-check.md`). Its outcome decided which source is shown:

- **Atomic weight.** PubChem's column agrees with CIAAW for 80 of 84 elements; argon and iron are rounding ties; lithium (7.0 against 6.94) and sulfur (32.07 against 32.06) differ. CIAAW's values are shown.
- **First ionization energy.** PubChem's column agrees with NIST for 76 of the 102 elements both list, and differs for 26, nine of them by 0.1 eV or more. NIST's values are shown.
- **Electron configuration.** PubChem agrees with NIST's ground state for 107 of 108 elements. Lawrencium differs; PubChem's is shown, with a note giving NIST's. NIST has no entry for elements 109 to 118.
- **Electronegativity, melting point, boiling point, density, van der Waals radius.** Compared once, with Wikipedia's transcriptions of handbooks and not with a primary source. The values that stood far from the other tabulations are shown as PubChem has them, each with a note on the card.
- **Electron affinity, covalent radius, oxidation states, year discovered.** Not compared value by value with an independent source.

The report lists 41 values as unresolved: disagreements no decision settles, and values PubChem gives as plain facts that are predictions, estimates or untraced. A test fails if any of them has no note on its card.

**Notes.** A value that needs a caution carries a sentence beside it on the card, with its own source: 107 notes on 57 elements. Among them: helium's melting point (it is solid only under pressure); carbon's and arsenic's melting and boiling points (both elements turn from solid straight to gas at ordinary pressure); the density of each gas (it is for the gas at 0 °C and atmospheric pressure, which PubChem does not state and which was worked out from the values); the years for aluminum, calcium, fluorine and silicon, which are not the years those elements were first isolated; the oxidation states of krypton, xenon and radon (PubChem's list shows only 0, although compounds such as XeF₄ exist); the melting points, states and masses of the heaviest elements that are estimates or predictions; and the eight covalent radii that PubChem's pages give with no uncertainty, among them helium's and francium's, the two ends of that colour scale.

**Conventions chosen.**

- **Group 3 and the f block.** Lanthanum and actinium are in group 3 and the d block; the f block is cerium to lutetium and thorium to lawrencium, 14 in each row, with no group number. This is how the Royal Society of Chemistry's table is drawn and how OpenStax Chemistry 2e assigns the blocks. PubChem puts lutetium and lawrencium in group 3; a provisional report of an IUPAC task group in 2021 leaned the same way, and IUPAC has not ruled. The page says so in a note on group 3. Helium is in group 18 and in the s block.
- **Chemical families.** PubChem's ten categories are used as given, under the heading "Chemical family (PubChem's grouping)". Four notes below the table, which the legend points to, say that fluorine, chlorine, bromine, iodine and the noble gases helium to radon are nonmetals too, that sources differ on which elements are metalloids, that group 12 is not always counted among the transition metals, and that elements 109 to 118 are placed in their families by position. Polonium and astatine carry a note that PubChem's own pages class them differently.
- **Atomic mass has two kinds.** An element with a standard atomic weight shows it. The other 34 show the mass of one named isotope, with a sentence that the element has no standard atomic weight, and "estimate" from lawrencium on. Bismuth, thorium, protactinium and uranium have a standard atomic weight.
- **"No value listed".** A value its source leaves empty is shown with those words, never as zero and never as "not measured", because an empty cell in these sources does not always mean that.
- **Predicted and expected.** A configuration PubChem marks as predicted or calculated keeps that word, on the card and on the shell diagram; a state it words as expected is shown as expected.
- **Radius.** The table is coloured by covalent radius, which shows the trend a general chemistry course teaches. PubChem's own "atomic radius" column is a van der Waals radius from mixed sources; it is on the card under that name and is not used for colouring.
- **Electron affinity** is given as the energy released when an atom gains an electron, so a positive value means energy is released; the card says that some textbooks use the opposite sign.
- **Oxidation states** are headed "Common oxidation states (PubChem's list, not complete)". **The state** is headed "State at room temperature (25 °C)", because that is what PubChem's column holds; it is not the thermodynamic standard state. **The year** is headed "Year discovered (as PubChem lists it)".
- **Names** are spelled as PubChem spells them (aluminum, cesium). The search also finds "aluminium" and "caesium".
- **The 11 elements the explorer also describes.** Atomic weight, first ionization energy and covalent radius come from the same sources in both places. The van der Waals radii of hydrogen and fluorine differ; the element card shows the table's value and gives the explorer's value and its source in one sentence.

**Known limits of the periodic table.**

- No chemistry instructor or chemist has reviewed the data, the notes or the descriptions. They were checked by script, and by AI reviewers against the cited pages.
- Only atomic weight, first ionization energy and the electron configurations of elements 1 to 108 were checked against a primary source. Everything else PubChem compiles from Jefferson Lab, Los Alamos National Laboratory and journal papers was taken on PubChem's attribution; the original papers (Cordero 2008, Allred 1961, Myers 1990) were not read.
- The electron affinities are from a 1990 compilation and some are dated: fluorine is 3.339 eV here, and about 3.40 eV in current compilations.
- The van der Waals radii are not one consistent set, and about half match none of the published sets they were compared with. They do not show a clean trend.
- Francium's electronegativity (0.7), the low end of that colour scale, and lawrencium's (1.3) have no source on PubChem's own pages. Both carry a note.
- Helium's covalent radius (28 pm) and francium's (260 pm), the two ends of that colour scale, are printed on PubChem's pages with no uncertainty, as are six others (neon, promethium, astatine, radon, actinium, protactinium); the other 88 radii have one. Why is not known, because the paper the radii come from was not read. Each of the eight carries a note asking the reader to treat it as an estimate, and the legend shows it for both ends.
- For the heaviest elements most values are predictions or are missing. Elements 109 to 118 have no ionization energy, and none from fermium on has a van der Waals radius.
- The scales are linear. For density that puts all 11 gases together at the pale end; for melting point the two ends (helium, carbon) are not ordinary-pressure melting points. The legends say so.
- The descriptions of the groups, periods and blocks are short and general. Nothing checks automatically that each sentence says no more than the passage stored or located beside it.
- The pages the descriptions cite were read on 2026-10-03 and are not saved. Whether PubChem's table has changed since that date has not been rechecked.
- The colours of the table are a design choice, not chemistry data.
