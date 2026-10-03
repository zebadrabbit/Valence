# Valence: information for institutional reviewers

Valence is an independent, free project made for any learner. It is not affiliated with any school and there is no vendor relationship: no contract, no account manager, and no support agreement. An institution that chooses to point students to Valence does its own review. This page gives each reviewing department the facts it needs.

Each section states only what is true of the current version. The current version has the molecule explorer; the labs and the mechanism timeline are not built yet. A lab safety section will be added with the labs.

## IT and security

- **What it is:** a static website (HTML, CSS, JavaScript). There is no server-side code, database, or API.
- **Install:** none. It has been tested in Chromium (the engine behind Chrome and Edge), where scripted checks are run against the production build. Firefox and Safari have not been tested yet.
- **Accounts:** none. There is no sign-in of any kind.
- **Network:** after the page loads, the app makes no network requests. Fonts and all data are bundled; nothing is loaded from a third-party CDN.
- **Storage:** preferences and learning progress are stored in the browser's `localStorage` under keys beginning `valence:`. Nothing is stored anywhere else.
- **Shared computers:** on a shared browser profile, the next person can see the previous learner's saved progress. Settings has a "Clear my progress" button, and clearing site data in the browser has the same effect.
- **Self-hosting:** run `npm ci && npm run build`, then serve the `dist/` folder from any static web server. No rewrite rules are needed, and it works from a sub-path.
- **Source code:** public under the MIT licence.

## Legal and privacy

- **Personal data:** Valence collects none. It has no accounts, no forms that ask for personal information, no analytics, and no cookies.
- **Data leaving the device:** none. Progress never leaves the learner's browser unless the learner uses "Export my progress" to download their own file.
- **Education records:** because nothing is collected or transmitted, Valence creates and holds no records about any student. Whether and how an institution uses Valence under FERPA or similar rules is the institution's determination; this page states the facts for that review and is not legal advice.
- **Children's privacy (COPPA) and GDPR:** the same facts apply. No personal information is collected from anyone, of any age, in any location.
- **Third-party data:** chemistry data is cited to its sources on the About page.
- **Licence:** MIT.

## Accessibility services

Valence has not had an accessibility audit, and this page makes no claim of conformance to WCAG or any other standard. This section lists what was built, how it was checked, and what has not been checked.

**How it was checked.** Scripts drove the production build in headless Chromium 153 (the engine behind Chrome and Edge) on Linux, using the keyboard only where the check is about the keyboard. Screenshots were taken in the light and dark themes at 1366×768 and 400×800 and looked at by the AI coding assistant that built the screens; no person has reviewed them yet. The chemistry text (descriptions, names, measurements) comes from functions with automated tests.

**What was checked that way:**

- **Keyboard operation of the explorer.** With no mouse: reach the library from the menu, open a molecule, switch between the four views, turn and zoom the 3D model with the camera buttons, open the text description, select atoms and bonds from the Atoms and bonds list, open the "More about" and "Sources" parts of the cards, measure a distance and an angle, clear the selection, change the valence display level, switch between the neutral and zwitterion forms, and jump to another molecule with the search dialog (Ctrl+K, ⌘K, or the Search button in the menu). Focus moves to the page heading after each navigation, returns to where it was when the search dialog is closed with Escape, and has a visible indicator on every stop in the molecule page's tab order.
- **Text alternatives.** The 3D model and the 2D Lewis drawing are each exposed as one image with a name ("3D ball and stick model of Water") and a description: the formula, the number of atoms and bonds, each central atom's geometry, and where the lone pairs are. The same description can be read on the page under "Text description". Every atom and bond is in the Atoms and bonds list by name, and the current selection and any measurement are written in a status line.
- **Reduced motion.** With the operating system set to reduce motion, or with Reduced motion set to On in Settings, the 3D model stops as soon as a drag is released; with motion allowed it coasts briefly. Nothing in the explorer moves by itself in either case.
- **Colour is not the only signal.** A selected atom or bond has a tick in the list and a ring in the model, and is named in the status line; the current view and form have a tick. Elements are coloured in the model, and each atom's element is also in its name ("Oxygen 1") and on its card.
- **Names.** Every button, link, field and menu on the molecule page, with the search dialog open, has a text name.
- **Without WebGL.** If the browser cannot start the 3D model, the page says so, and the 2D Lewis view, the list, the cards and the text description still work.

**What has not been checked:**

- No person has tested Valence with a screen reader. The roles, names and descriptions above were checked by script, not by listening to them.
- No browser other than Chromium: not Firefox, not Safari, and no phone or tablet browser. Touch has not been tested.
- Text contrast has not been measured.
- Browser zoom, enlarged text and forced-colour (high contrast) modes have not been tested.

**Known limits:**

- Atoms cannot be reached one by one with the keyboard inside the 3D model or the Lewis drawing. The Atoms and bonds list beside them is the keyboard path and selects the same things.
- On a canvas, dragging turns the model and the mouse wheel zooms it instead of scrolling the page.
- Some names contain subscript characters ("Oxygen (O₂)"), which a screen reader may read oddly.

## Finance and procurement

- **Cost:** free. There are no paid tiers.
- **Licence:** MIT, which permits use, copying, modification, and redistribution, including by institutions.
- **Contract and vendor:** none. There is no company behind Valence, no service-level agreement, and no guaranteed support.
- **Hosting cost if self-hosted:** that of serving a few megabytes of static files.

## Faculty and curriculum

**What exists.** The molecule explorer. The two labs (standardization of a base by titration; reactions in aqueous solution) and the mechanism timeline are planned and not built; their pages say so.

**What the explorer shows.** A library of 31 molecules and ions in five groups: basics, a VSEPR showcase, organic functional groups, biomolecules, and the species of the planned mechanism. Glycine and alanine each have a neutral and a zwitterion form. For each one:

- Four views: ball and stick, space filling (van der Waals radii), wireframe, and a 2D Lewis structure with lone pairs and formal charges.
- An atom card: symbol, atomic number, standard atomic weight, electronegativity, valence electrons, formal charge, lone pairs, oxidation state, hybridization and VSEPR geometry, with electron configuration, ionization energies and radii one step further in.
- A bond card: length, order, σ and π composition, and polarity as the Pauling electronegativity difference, labelled "a rough guide".
- A measure tool: two atoms give a distance, three an angle, four a dihedral.
- Three valence display levels: a Bohr diagram of the selected atom, labelled "a simplified picture"; lone pairs as dots; and hybrid orbital lobes for sp, sp² and sp³ atoms, with molecular orbital diagrams for O₂ and N₂ only. The O₂ diagram points out that the Lewis structure shows every electron paired while the diagram shows two unpaired.

**Where each kind of value comes from.** The cards list their sources, and the About page lists all of them.

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
