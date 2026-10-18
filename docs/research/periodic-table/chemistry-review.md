# Chemistry review: periodic table spec and plan

Reviewed 2026-10-03, before anything is built. Reviewed: `docs/superpowers/specs/2026-10-03-periodic-table-design.md` (the spec), `docs/superpowers/plans/2026-10-03-periodic-table.md` (the plan), and the committed PubChem download (118 rows; confirmed byte-identical to the live PubChem endpoint today).

Every number below comes from a script in this folder run against the download, or from a page fetched today and saved under `sources/`. Where something could not be checked, section 7 says so. Nothing in the repository was modified.

On 2026-10-17 the passages of OpenStax Chemistry 2e that this review quoted were put in this project's words, each with where it is, so that the repository quotes no source and makes no claim about OpenStax's licence. On 2026-10-18 the same was done for the sentence-length quotations of the IUPAC task group's report, IUPAC's periodic table page and the Red Book, and for the history text of seven PubChem element pages (CIAAW's) that Appendix G printed; the short fragments of them are left as the review recorded them. Nothing else in the review was changed for that reason.

## 0. What changes the plan

Eleven items are wrong chemistry or a wrong test expectation as the plan stands. Each is detailed in the numbered section shown.

| # | Problem | Fix | Section |
| --- | --- | --- | --- |
| 1 | The plan's tests make both lanthanum and lutetium block f. That gives an f block 15 wide (30 elements) and a d block of 38. An f subshell holds 14 electrons; the f block is 28 elements and the d block 40 | Lutetium and lawrencium are block d; lanthanum to ytterbium and actinium to nobelium are block f. Add a block-count test: s 14, p 36, d 40, f 28 | 1 |
| 2 | The plan says 9 configurations end "(predicted)" and that no string has a space after the core. Meitnerium ends "(calculated)"; nitrogen and fermium have a space after the core | Handle "(calculated)" as a marked configuration (10 marked, not 9) and accept the space | 2 |
| 3 | PubChem's lawrencium configuration (`[Rn]7s2 5f14 6d1`) is not the ground state NIST lists (`[Rn]5f14 7s2 7p1`). It is the only one of 108 that differs | Add configurations to the Task 3 cross-check; lawrencium gets a note | 2 |
| 4 | "Atomic radius" is PubChem's van der Waals radius. With these values 46% of steps across a period go the wrong way, and zinc (139 pm) comes out smaller than oxygen (152 pm) | Rename to "van der Waals radius" everywhere. For the trend, use covalent radii instead (owner decision) | 3 |
| 5 | Empty fields are shown as "not measured". Electronegativity is calculated, not measured, for every element; nitrogen's electron affinity is empty because the anion is unstable, not because nobody measured it | Show "no value listed" | 6 |
| 6 | The legend entry "Nonmetal" covers 7 elements. Choosing it dims fluorine, chlorine and the noble gases, which are nonmetals (OpenStax counts 17) | Relabel the legend entry "Other nonmetals" and add a note | 4 |
| 7 | Oxidation states: PubChem gives xenon "0" and oxygen "-2", while the library holds XeF₄ and H₂O₂. States PubChem's own element pages mark as predictions (elements 105 to 118) arrive unmarked | Label the row "Common oxidation states (PubChem's list, not complete)"; flag 105 to 118 as predicted | 6 |
| 8 | Helium's "melting point" (0.95 K) and carbon's (3823 K) are the two ends of the melting-point scale, and neither is a melting point at ordinary pressure. Arsenic's melting point (1090 K) is above its boiling point (887 K) | Notes on helium, carbon and arsenic | 6 |
| 9 | Highlighting group 1 will show the name "alkali metals" over hydrogen | The group 1 text must say hydrogen is not an alkali metal; a test pins it | 5 |
| 10 | PubChem's year for aluminium and calcium is "Ancient". PubChem's own element pages say aluminium was isolated in 1825 to 1827 and calcium in 1808 | Notes on both | 6 |
| 11 | The plan's claim that OpenStax section 2.5 can source a sentence for every group, period and block is not true: it has nothing on blocks, nothing on individual periods, and nothing on groups 3 to 14 individually | Use the sources and drafts in section 5 | 5 |

Everything else in the plan's Task 2 position tests is right: period, group, row and column for all nine named elements, 118 unique cells, and period sizes 2, 8, 8, 18, 18, 32, 32. All six `shellsFromConfiguration` expectations are right, and all 118 configurations sum to the atomic number.

## 1. Position rules (spec 5.3, plan Task 2)

Script: `position.py`. Full output in Appendix A.

### 1.1 What is right

I wrote the rule out as a function of atomic number and ran it for all 118.

- Period, group, row and column match the plan's expected values for H, He, B, Sc, La, Lu, Hf, Ac and Og.
- All 118 elements get a unique (row, column). No element lands on the two marker cells (row 6 column 3, row 7 column 3).
- Period sizes are 2, 8, 8, 18, 18, 32, 32, as the plan says.
- Drawn rows hold 2, 8, 8, 18, 18, 17, 17 elements, then 15 and 15 in the detached rows.
- Lanthanum is at row 9 column 3 and lutetium at row 9 column 17; actinium at row 10 column 3 and lawrencium at row 10 column 17.
- Atomic numbers 0 and 119 throw.
- PubChem's own element pages give the same period for all 118 and the same group number for every main-table element (`position_vs_pubchem.py`). The only two differences are lutetium and lawrencium, which PubChem numbers group 3; see 1.3 and 1.4.

### 1.2 What is wrong: the block of the detached rows

The plan's tests say `La (6, null, f, ...)` and `Lu (6, null, f, ...)`. Applied to the whole row, that makes all 15 lanthanides and all 15 actinides block f:

| Block rule | s | p | d | f | Period 6 in atomic-number order |
| --- | --- | --- | --- | --- | --- |
| Plan as written (all 15 are f) | 14 | 36 | 38 | 30 | s2 f15 d9 p6 |
| A: La to Yb and Ac to No are f; Lu and Lr are d | 14 | 36 | 40 | 28 | s2 f14 d10 p6 |
| B: La and Ac are d; Ce to Lu and Th to Lr are f | 14 | 36 | 40 | 28 | s2 d1 f14 d9 p6 |

A block is as wide as its subshell is large: 2, 6, 10, 14. A 15-wide f block is the error; a learner who highlights "block f", counts 15, and then reads that an f subshell holds 14 electrons has been taught a contradiction. The IUPAC task group says the same of this layout: its two rows of 15 break the match between the number of elements in a block and the electrons its orbitals hold, and a student who sees an f block 15 wide will wonder whether there is a scientific reason for it (Scerri 2021, fetched).

The layout itself (15-element detached rows, group 3 holding only scandium and yttrium) is fine and common. OpenStax Figure 2.26 draws exactly this, and so does the table IUPAC publishes. The fix is in the block function only.

### 1.3 Which rule: A or B

Both are defensible and both give correct block sizes. Evidence, all fetched today:

| Source | What it says |
| --- | --- |
| IUPAC periodic table page | It asks whether group 3 is scandium, yttrium, lutetium and lawrencium, or scandium, yttrium, lanthanum and actinium. The question is presented as open. Lanthanoids are La to Lu and actinoids Ac to Lr (15 each) |
| IUPAC project 2015-039-2-200 page | The project "will deliver a recommendation"; end date 31 Dec 2021. No recommendation is shown on the page |
| Scerri, "Provisional Report on Discussions on Group 3 of the Periodic Table", Chemistry International 43(1), 31 to 34 (2021) | "There is no objective means to adjudicate" between the two; it is "one of convention". The report suggests "a compromise could be reached" on Sc, Y, Lu, Lr because that table (1) shows the elements in order of atomic number, (2) avoids splitting the d block into two uneven parts, and (3) shows all blocks 2, 6, 10 and 14 wide. This is rule A. It is a provisional report, not an IUPAC ruling |
| PubChem element pages (the app's own source) | Lutetium: group "3 - Lanthanide". Lawrencium: group "3 - Actinide". Lanthanum and actinium: no group number. This is rule A |
| OpenStax Chemistry 2e, section 19.1 | The passage on the transition series puts cerium to lutetium and thorium to lawrencium in the f block, and makes lanthanum, by its configuration, the first element of the third transition series. This is rule B |
| OpenStax Chemistry 2e, section 6.4 | The passage on the f series counts lanthanum and actinium in the two series, which are named after them, though it calls them transition metals without f electrons. Rule B |
| IUPAC Red Book 2005, IR-3.5 | Groups 3 to 12 are the d block; says nothing on which elements sit below yttrium |

Ground-state configurations do not settle it. Lanthanum (`[Xe]6s2 5d1`) and actinium have no f electron, which looks like rule B; but thorium (`[Rn]7s2 6d2`) has none either and everyone calls it f block. Lutetium (`[Xe]6s2 4f14 5d1`) has a full f subshell and one d electron, exactly like hafnium's pattern, which looks like rule A.

**Recommendation: rule A.** "Block f" for lanthanum and actinium with "block d" for lutetium and lawrencium is defensible and is the more consistent choice for this app, for three reasons: it matches the group numbers on PubChem's own element pages; it is the arrangement the IUPAC task group leaned to; and reading the detached row left to right and then continuing at hafnium, the blocks stay in one piece (rule B puts one d-block cell at the head of a row otherwise described as f block). The price is that the app then disagrees with OpenStax 19.1 on this one point, so block descriptions must not cite OpenStax for f-block membership, and the note must name the other convention.

I could not check other textbooks; see section 7.

### 1.4 Group number of lutetium and lawrencium

Under rule A, lutetium and lawrencium are d-block elements with `group: null`, although the d block is groups 3 to 12. Two consistent options:

- Keep `group: null` for all 30 (the approved spec). Highlighting group 3 outlines scandium and yttrium only, which matches the IUPAC-published table. The note explains it. **Recommended**, because it takes no side in the drawing.
- Give lutetium and lawrencium `group: 3`, as PubChem does. Highlighting group 3 then outlines two cells at the far end of the detached rows, away from the markers under yttrium.

This is an owner decision.

### 1.5 The on-page note (`GROUP_3_NOTE`)

Draft, every clause supported by a source above:

> Group 3 is drawn here with scandium and yttrium only. The fifteen lanthanides (lanthanum to lutetium) and the fifteen actinides (actinium to lawrencium) sit in two rows below the table, as on the periodic table IUPAC publishes. Chemists disagree about which two of them belong under yttrium: lanthanum and actinium, or lutetium and lawrencium. IUPAC has not ruled; its 2021 task group report called the choice a convention and leaned towards lutetium and lawrencium. This table follows that report for the blocks: lanthanum to ytterbium and actinium to nobelium are the f block, fourteen in each row because an f subshell holds fourteen electrons, and lutetium and lawrencium are counted in the d block. Many textbooks instead count lanthanum and actinium in the d block.

Sources to cite: `https://iupac.org/what-we-do/periodic-table-of-elements/`, `https://doi.org/10.1515/ci-2021-0115`, `https://openstax.org/books/chemistry-2e/pages/19-1-occurrence-preparation-and-properties-of-transition-metals-and-their-compounds`.

The spec's sentence "a convention IUPAC has not settled" is accurate.

### 1.6 Other position points

- **Helium.** Block s, group 18 is right and standard. The s block is then groups 1 and 2 plus helium (14 elements) and the p block is groups 13 to 18 minus helium (36). A test should pin both, and the helium card needs one line saying why (section 5 draft).
- **Columns are not groups in the detached rows.** Lutetium is at column 17 and cerium at column 4. Group numbers along the top must not run over the detached rows, and `isHighlighted` for a group must use `group`, never `column`. The plan's `isHighlighted` test for group 17 should state the expected members: F, Cl, Br, I, At, Ts, and not Lu or Lr.
- **Marker cells.** Label them with the atomic-number ranges they stand for: "57-71" and "89-103".
- **Period highlight.** Period 6 must outline 32 cells, including the 15 in row 9. Add a test.

### 1.7 Corrected test list for `elementPosition`

Unchanged: H (1, 1, s, row 1, col 1); He (1, 18, s, row 1, col 18); B (2, 13, p); Sc (4, 3, d); La (6, null, f, row 9, col 3); Hf (6, 4, d, row 6, col 4); Ac (7, null, f, row 10, col 3); Og (7, 18, p); 118 unique cells; period sizes 2, 8, 8, 18, 18, 32, 32; out of range throws.

Changed: **Lu (6, null, d, row 9, col 17)**.

Added: Yb (6, null, f, row 9, col 16); Lr (7, null, d, row 10, col 17); No (7, null, f, row 10, col 16); block counts s 14, p 36, d 40, f 28; exactly 30 elements have `group: null`; group 3 has exactly Sc and Y; no element occupies (6, 3) or (7, 3).

## 2. Shell counts (plan Task 2)

Script: `shells.py`, with the parser in `common.py`. Full output in Appendix B.

### 2.1 Results

- All six expected values in the plan's tests are right: `1s1` gives [1]; `[He]2s2 2p2` gives [2, 4]; `[Ne]3s2 3p5` gives [2, 8, 7]; `[Ar]4s2 3d6` gives [2, 8, 14, 2]; `[Ar]4s1 3d10` gives [2, 8, 18, 1]; `[Kr]5s2 4d10 5p6` gives [2, 8, 18, 18, 8].
- All 118 PubChem strings parse and sum to the atomic number. No shell exceeds its 2n² capacity.
- The largest diagram is 7 shells; the largest single shell holds 32.

### 2.2 Formatting the plan did not account for

| Feature | Elements | Consequence |
| --- | --- | --- |
| Ends "(calculated)", not "(predicted)" | Mt | The plan says "9 end in (predicted)" and strips only that word. Meitnerium's string would keep its suffix and its flag would be false |
| Ends "(predicted)" | Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og (9) | As the plan says |
| A space after the core bracket | N (`[He] 2s2 2p3`), Fm (`[Rn] 5f12 7s2`) | The plan says there is never a space |
| No core bracket | H, He | Fine |
| d written before s | Cr (`[Ar]3d5 4s1`) | Every other 3d element is written s first. Sum is unaffected |
| No outer s subshell | Pd (`[Kr]4d10`) | See 2.4 |
| Subshells in four different orders | Fm (f s), Nh (f d s p), Fl to Og (s p f d), the rest (s f d p) | The parser must not assume an order |

The core is always the preceding noble gas (He 8, Ne 8, Ar 18, Kr 18, Xe 32, Rn 32 elements).

Required: the builder treats both "(predicted)" and "(calculated)" as a marking and keeps the source's own word. The registry test then pins 10 marked configurations: 9 predicted and 1 calculated. Added parser tests, values from the script:

- `[He] 2s2 2p3` gives [2, 5]
- `[Ar]3d5 4s1` gives [2, 8, 13, 1]
- `[Kr]4d10` gives [2, 8, 18, 18]
- `[Rn] 5f12 7s2` gives [2, 8, 18, 32, 30, 8, 2]
- `[Rn]7s2 5f14 6d7 (calculated)` gives [2, 8, 18, 32, 32, 15, 2]
- `[Rn]7s2 7p6 5f14 6d10 (predicted)` gives [2, 8, 18, 32, 32, 18, 8]
- An unknown core, a repeated subshell, or a subshell over capacity throws

### 2.3 PubChem against NIST

NIST's Atomic Spectra Database lists ground states for atomic numbers 1 to 108 (fetched today). I compared subshell occupancies for all 108.

- 107 agree, including every anomalous ground state: Cr, Cu, Nb, Mo, Ru, Rh, Pd, Ag, La, Ce, Gd, Pt, Au, Ac, Th, Pa, U, Np and Cm. These 19 are exactly the elements whose PubChem string departs from the simple filling order.
- **One differs: lawrencium.** PubChem has `[Rn]7s2 5f14 6d1`, shells [2, 8, 18, 32, 32, 9, 2]. NIST has `[Rn].5f14.7s2.7p`, shells [2, 8, 18, 32, 32, 8, 3]. PubChem's own lawrencium page carries NIST's ground level ²P°₁/₂, which is a p-electron term and contradicts the 6d¹ string beside it.
- Mt to Og (109 to 118) are not in NIST's table, so their strings could not be checked against it. PubChem marks all ten as calculated or predicted.
- Rf to Hs (104 to 108) agree with NIST, but PubChem does not mark them and they rest on calculation, not spectroscopy. NIST marks their ionization energies as theoretical or interpolated.

Required: Task 3's cross-check compares configurations with NIST as well as ionization energies, and lawrencium's record gets a note: "NIST lists the ground state as [Rn]5f14 7s2 7p1."

### 2.4 Labelling the diagram

The existing card is headed "Bohr model: {name}" with the caption "a simplified picture". That is acceptable for hydrogen to argon. For heavier atoms a ring diagram teaches three wrong things unless labelled: that electrons travel on circles; that shells fill one after another; and that the number of rings equals the period. The data shows the third fails for palladium: `[Kr]4d10` gives four shells, 18 in the outer one, for a period 5 element. It is the only such element.

Recommended labels:

- Heading: "Electrons per shell", not "Bohr model", for every element on the periodic table page.
- Caption, all elements: "Electrons in each shell of a neutral, isolated {name} atom, counted from its ground-state configuration. This is a counting diagram, not a picture of the atom: electrons do not travel on circles, and the rings are not to scale."
- Extra line when the configuration contains a d or f subshell (atomic number 21 and above): "Shells do not fill one after another. Here an inner shell is still filling while an outer shell already holds electrons."
- Palladium only: "Palladium's ground state has no fifth-shell electrons, so only four shells are occupied although it is in period 5."
- Marked configurations: "From a predicted configuration" or "From a calculated configuration", using the source's word.
- Lawrencium: the note from 2.3.

The existing `valenceElectrons` helper returns the outer-shell count and its comment says it is right for main-group elements only. It must not be shown on the element card for d-block and f-block elements (iron would read 2).

## 3. Trend colouring (spec 6)

Script: `trends.py`. Full output in Appendix C. Units confirmed from the labels on PubChem's page, fetched in a headless browser: "Electronegativity (Pauling Scale)", "Atomic Radius (van der Waals), pm", "Ionization Energy, eV", "Electron Affinity, eV", "Melting Point, K", "Boiling Point, K", "Density, g/cm³".

### 3.1 The five properties

| Property | Values / missing | Min | Max | Elements per tenth of a linear scale | Scale | Clean textbook trend? |
| --- | --- | --- | --- | --- | --- | --- |
| Electronegativity | 95 / 23 | 0.7 (Fr) | 3.98 (F) | 10, 27, 14, 15, 16, 7, 1, 3, 1, 1 | Linear | Yes |
| Radius (van der Waals) | 99 / 19 | 120 (H) | 348 (Fr) | 5, 6, 16, 29, 19, 17, 3, 1, 1, 2 | Linear | No across a period; yes down a group |
| First ionization energy | 102 / 16 | 3.894 (Cs) | 24.587 (He) | 22, 47, 16, 8, 4, 2, 1, 0, 1, 1 | Linear | Yes, with the textbook exceptions |
| Melting point | 103 / 15 | 0.95 (He) | 3823 (C) | 20, 14, 16, 15, 18, 8, 4, 3, 2, 3 | Linear | It is a periodic pattern, not a one-way trend |
| Density | 96 / 22 | 0.00008988 (H) | 22.57 (Os) | 21, 10, 14, 20, 9, 9, 3, 1, 5, 4 | Linear | A pattern: peaks mid d block, rises down groups |

**Recommendation: linear for all five. Do not use a logarithmic scale for any of them.**

- **Density.** The worry was that gases against osmium would flatten the scale. They do not. The 11 gases all shade below 0.0005 and look identical, which is the truth on this scale: they are about a thousand times less dense. The 85 solids and liquids are spread across the whole scale and the d-block peak at osmium and iridium is plain. A log scale is much worse: 55 of 96 elements land in the top tenth and the whole solid state is squeezed into the top 30%, with an empty band between radon, the densest gas, and lithium. The legend must say that gas densities are at 0 °C and 1 atm (hydrogen's 0.00008988 g/cm³ is 0.08988 g/L, the ideal-gas value at 273.15 K is 0.08994 g/L).
- **Melting point.** No outlier: carbon 3823, tungsten 3695, rhenium 3459 run together. Linear spreads the elements evenly. Log puts 69 of 103 in the top two tenths. Both ends of the scale need a note (section 6).
- **Ionization energy.** Helium and neon stretch the top, so 69 of 102 elements sit in the palest fifth. The trend is still visible: period 2 runs from shade 0.07 at lithium to 0.85 at neon, period 5 from 0.01 to 0.40. The d and f blocks are a pale flat band because their ionization energies really do vary little (5.4 to 10.4 eV, against 3.9 to 24.6 for the whole table). Log improves the spread only modestly and costs a simple, honest legend.
- **Electronegativity.** Linear, no issue. Periods 2 to 5 have no step against the trend.

Which show a clean trend with PubChem's numbers:

- **Electronegativity: clean.** 2 of 30 across-period steps go against (lead to bismuth to polonium); 4 of 29 down-group steps (a tie at potassium and rubidium, and rises at gallium, germanium and lead). One oddity: krypton (3) and xenon (2.6) have values while helium, neon, argon and radon do not, so krypton is the fifth most electronegative cell on the table. OpenStax 7.2 leaves the noble gases off its electronegativity figure. The legend should say why two noble gases are coloured.
- **Ionization energy: clean.** 7 of 35 across-period steps go against. Four are the exceptions every textbook explains (Be to B, N to O, Mg to Al, P to S); the other three are their heavier counterparts (Ca to Ga, As to Se) and lead to bismuth. OpenStax 6.5 discusses exactly these. Nine PubChem values differ from NIST by more than 1% (Tc, Ta, W, Os, Ir, At, Fr, Ac, Th); that belongs to the cross-check.
- **Van der Waals radius: not clean.** See 3.2.
- **Melting point and density:** real periodic patterns, but the description text must not call them a trend "across a period".

### 3.2 "Atomic radius" is not a trend an instructor would show

PubChem's column is the van der Waals radius. Its page labels it so, and the plan's own facts table says so. The spec and plan call it "atomic radius" throughout.

The textbook trend is "radius falls across a period and rises down a group", taught with covalent radii (OpenStax 6.5 says it uses the covalent radius). With PubChem's column:

| Period | Values (pm) | Steps against the trend |
| --- | --- | --- |
| 2 | Li 182, Be 153, B 192, C 170, N 155, O 152, F 135, Ne 154 | 2 of 7 |
| 3 | Na 227, Mg 173, Al 184, Si 210, P 180, S 180, Cl 175, Ar 188 | 4 of 7 |
| 4 (main group) | K 275, Ca 231, Ga 187, Ge 211, As 185, Se 190, Br 183, Kr 202 | 3 of 7 |
| 5 (main group) | Rb 303, Sr 249, In 193, Sn 217, Sb 206, Te 206, I 198, Xe 216 | 3 of 7 |
| 6 (main group) | Cs 343, Ba 268, Tl 196, Pb 202, Bi 207, Po 197, At 202, Rn 220 | 4 of 7 |

In all, 16 of 35 steps (46%) go against the trend. The d block is erratic: Co 192, Ni 163, Cu 140, Zn 139, then Ga 187; Pt 209, Au 166, Hg 209. The five smallest atoms on the table come out as H, F, Zn, He, Cu, so zinc and copper are "smaller" than oxygen, nitrogen and carbon. Every noble gas is larger than the halogen before it. Down a group the column behaves (3 of 33 against).

The covalent radii printed on PubChem's own element pages (attributed to "PubChem Elements"; they are the Cordero 2008 values, already a cited source in this app) cover atomic numbers 1 to 96:

| Period | Covalent radius (pm) | Steps against |
| --- | --- | --- |
| 2 | Li 128, Be 96, B 84, C 76, N 71, O 66, F 57, Ne 58 | 1 of 7 |
| 3 | Na 166, Mg 141, Al 121, Si 111, P 107, S 105, Cl 102, Ar 106 | 1 of 7 |
| 4 (main group) | K 203, Ca 176, Ga 122, Ge 120, As 119, Se 120, Br 120, Kr 116 | 2 of 7 |

Down a group: 0 of 33 against. The d block falls smoothly (Sc 170 to Ni 124) and the lanthanide contraction shows (La 207 to Lu 187). Periods 5 and 6 are noisier in the p block, but the reversals there are 1 to 3 pm, inside the uncertainties the source prints.

What the spec should do, in order of preference:

1. **Replace** the trend property with covalent radius, from the PubChem element pages or the Cordero source the app already cites. Keep the van der Waals radius on the card under its own name. This needs spec 3's "property data from any source other than those named" amended, and one more saved download. Elements 97 to 118 are then "no value listed".
2. **Rename and caveat**: keep PubChem's column, call it "van der Waals radius", and put in the legend: "Van der Waals radii do not show the across-a-period trend that textbooks teach with covalent radii."
3. **Drop** radius from trend colouring.

Whatever is chosen, the name "atomic radius" with no qualifier must go. It also collides with the existing atom card, which already shows a covalent radius and a van der Waals radius for the 11 curated elements, and for two of them the curated van der Waals radius differs from PubChem's: hydrogen 110 pm against 120, fluorine 147 pm against 135 (`curated.py`, Appendix F). The card must say which value colours the table.

## 4. Categories (spec 5.4)

Script: `categories.py`. Full list of all 118 in Appendix D, with OpenStax Figure 2.26 and PubChem's own element-page classification beside each.

### 4.1 PubChem's ten categories

| Category | Count | Members |
| --- | --- | --- |
| Alkali metal | 6 | Li Na K Rb Cs Fr |
| Alkaline earth metal | 6 | Be Mg Ca Sr Ba Ra |
| Transition metal | 38 | Groups 3 to 12 of the main table, Sc to Cn |
| Post-transition metal | 11 | Al Ga In Sn Tl Pb Bi Nh Fl Mc Lv |
| Metalloid | 7 | B Si Ge As Sb Te Po |
| Nonmetal | 7 | H C N O P S Se |
| Halogen | 6 | F Cl Br I At Ts |
| Noble gas | 7 | He Ne Ar Kr Xe Rn Og |
| Lanthanide | 15 | La to Lu |
| Actinide | 15 | Ac to Lr |

Seven of the ten are pure position: alkali metal is group 1 without hydrogen; alkaline earth is group 2; halogen is group 17; noble gas is group 18; transition metal is groups 3 to 12; lanthanide and actinide are the detached rows. The script confirms each is exactly that set.

### 4.2 Assignments textbooks commonly give differently

| Element(s) | PubChem | Elsewhere | Verdict |
| --- | --- | --- | --- |
| Hydrogen | Nonmetal | OpenStax: nonmetal, with properties like those of group 1 and of group 17 | Fine. Correctly not an alkali metal |
| Zn, Cd, Hg, Cn | Transition metal | IUPAC Red Book: group 12 "not always included". OpenStax 2.5, in a footnote: by IUPAC's definition the elements of group 12 are not transition metals. OpenStax 18.1 calls them "representative metals, or post-transition metals" | Acceptable; needs a note |
| Polonium | Metalloid | OpenStax Figure 2.26: metal. PubChem's own polonium page: "Metal". OpenStax 18.3 lists six metalloids and omits it | Needs a note. PubChem disagrees with itself here |
| Astatine | Halogen | OpenStax Figure 2.26: metalloid. PubChem's own astatine page: "Semi-metal" | Fine as a group name; mention in the metalloid note |
| The metalloid set | B Si Ge As Sb Te Po (7) | OpenStax 18.3 text: B Si Ge As Sb Te (6). OpenStax Figure 2.26: those six plus At (7) | The spec's planned note covers this; name polonium and astatine in it |
| Mt, Ds, Rg, Nh, Fl, Mc, Lv, Ts, Og | Transition metal, post-transition metal, halogen, noble gas | OpenStax Figure 2.26 marks all nine "not indicated" | Needs a note: assigned by position, chemistry not known |
| La, Ac | Lanthanide, Actinide | IUPAC Red Book: lanthanoids are La to Lu "by common usage"; actinoids Ac to Lr | Fine |
| Lu, Lr | Lanthanide, Actinide | Same | Fine. With block rule A they are lanthanide/actinide by name and d block by block; the group 3 note covers it |
| F Cl Br I and the noble gases | Halogen, Noble gas | OpenStax Figure 2.26 colours all of them nonmetal: 17 nonmetals in all | The legend problem below |

### 4.3 Is "one common classification" enough?

Using the scheme as given is acceptable, and I recommend **no overrides**: an override would break "used as given" and the single-source rule for no real gain. But the heading alone is not enough. Four notes are needed, and one legend label.

1. **The legend entry "Nonmetal" must change.** PubChem's "Nonmetal" means the nonmetals that are not halogens or noble gases. Choosing it outlines seven elements and dims fluorine, chlorine, bromine, iodine and all the noble gases. Relabel the legend entry "Other nonmetals" and keep the data value. Add: "Halogens and noble gases are nonmetals too; PubChem lists them under their family names."
2. **The scheme mixes two ideas.** Draft: "This scheme mixes two kinds of label: families defined by position (alkali metals, alkaline earth metals, halogens, noble gases, lanthanides, actinides) and classes defined by behaviour (transition metals, post-transition metals, metalloids, other nonmetals)."
3. **Metalloids.** Draft: "Textbooks differ on the metalloids. Boron, silicon, germanium, arsenic, antimony and tellurium are on nearly every list. PubChem adds polonium, which many sources call a metal; some sources add astatine instead."
4. **Group 12.** Draft: "Zinc, cadmium, mercury and copernicium are shown as transition metals. IUPAC notes that group 12 is not always included among the transition elements."
5. **Elements 109 to 118.** Draft: "Meitnerium to oganesson are placed in a category by their position. Only a few atoms of each have been made, and their chemistry is unknown or barely studied."

PubChem's page calls this display "Chemical Group / Family" and offers a separate "Metal / Metalloid / Nonmetal" display. "Chemical family (PubChem's grouping)" would be a more accurate legend heading than "one common classification".

## 5. Group, period and block descriptions (plan Task 2)

### 5.1 What OpenStax 2.5 supports

Fetched and read in full. It supports:

- The words "period" and "group": the table's seven rows are periods (or series) and its 18 columns groups.
- Six family names: **alkali metals** (group 1 "except hydrogen"), **alkaline earth metals** (group 2), **pnictogens** (group 15), **chalcogens** (group 16), **halogens** (group 17), **noble gases** (group 18, "also known as inert gases").
- One behaviour each for groups 1 and 2 (compounds with hydrogen in 1:1 and 1:2 ratios).
- Main-group elements (groups 1, 2, 13 to 18), transition metals (3 to 12, with a footnote on group 12), inner transition metals (the two bottom rows).
- Hydrogen as a nonmetal unlike any other element, with properties like those of group 1 and of group 17.

It does **not** support: any sentence about an individual period; anything about blocks (the words s-block, p-block, d-block, f-block do not appear); anything about groups 3 to 14 individually; any shared property of groups 15 to 18 beyond the name.

The plan says "pnictogens omitted". OpenStax 2.5 and the IUPAC Red Book both give the name, so include it.

The plan's test "no description states a property the cited section does not" cannot be automated. Replace it with: each description stores the supporting quotation from its source beside its `sourceId`; a test asserts the quotation is present; the chemistry review checks the quotations.

### 5.2 Sources that fill the gaps

All fetched today and freely linkable.

| Key | URL | Used for |
| --- | --- | --- |
| OS 2.5 | https://openstax.org/books/chemistry-2e/pages/2-5-the-periodic-table | Family names; hydrogen; group 12 footnote |
| OS 6.4 | https://openstax.org/books/chemistry-2e/pages/6-4-electronic-structure-of-atoms-electron-configurations | Filling order; subshell capacities; valence electrons per group |
| OS 18.1 | https://openstax.org/books/chemistry-2e/pages/18-1-periodicity | Groups 1, 2, 12, 13, 14 and bismuth |
| OS 18.3 | https://openstax.org/books/chemistry-2e/pages/18-3-structure-and-general-properties-of-the-metalloids | The six metalloids |
| OS 18.4 | https://openstax.org/books/chemistry-2e/pages/18-4-structure-and-general-properties-of-the-nonmetals | Valence electrons of groups 15, 16, 17 |
| OS 18.11 | https://openstax.org/books/chemistry-2e/pages/18-11-occurrence-preparation-and-properties-of-halogens | Group 17 |
| OS 18.12 | https://openstax.org/books/chemistry-2e/pages/18-12-occurrence-preparation-and-properties-of-the-noble-gases | Group 18; helium |
| OS 19.1 | https://openstax.org/books/chemistry-2e/pages/19-1-occurrence-preparation-and-properties-of-transition-metals-and-their-compounds | Groups 3 to 11 |
| Red Book | https://iupac.org/wp-content/uploads/2016/07/Red_Book_2005.pdf (IR-3.5, page 51) | Approved family names; blocks; naming a group by its first element |
| IUPAC table | https://iupac.org/what-we-do/periodic-table-of-elements/ | Group 3 unsettled; lanthanoids and actinoids |
| Scerri 2021 | https://doi.org/10.1515/ci-2021-0115 | Block membership under rule A |

### 5.3 Derived claims, checked by script

`descriptions_check.py` (Appendix E) checked three counting claims against the 118 stored configurations:

- In groups 1, 2 and 13 to 18, the outer-shell electron count equals the group number (groups 1, 2) or the group number minus 10. One exception: helium (2 electrons, group 18).
- In groups 3 to 12, the outer s electrons plus the d electrons of the shell below total the group number. No exceptions.
- Every element of period n has its outermost electrons in shell n. One exception: palladium.

These are stored as derived facts, exempt from citation under the v1 spec's rule for values derived in code. Each still gets a test.

### 5.4 Drafts I would accept

**Groups.** Member lists are generated from the position function, not typed.

| Group | Name | Text | Source |
| --- | --- | --- | --- |
| 1 | Alkali metals | Group 1 holds hydrogen and the alkali metals, lithium to francium. Hydrogen is a nonmetal and is not an alkali metal. Each alkali metal atom has one valence electron, which it loses easily to form a 1+ ion. They are soft, very reactive metals that react with water to give hydrogen gas and a basic solution. | OS 18.1; OS 2.5 |
| 2 | Alkaline earth metals | Each atom has two valence electrons and readily loses both, so these metals have an oxidation state of 2+ in their compounds. They are reactive, but less so than the alkali metal in the same period. | OS 18.1 |
| 3 | (none) | Scandium and yttrium, transition metals whose atoms have three outer s and d electrons. Which two elements belong below yttrium is not settled; see the note on group 3. | OS 19.1; IUPAC table |
| 4 to 11 | (none; "the titanium group" and so on) | The {first element} group. Transition metals: d-block elements whose atoms have {N} outer s and d electrons in all. Transition metals form compounds in a wide range of oxidation states. | OS 19.1; Red Book |
| 12 | (none) | Zinc, cadmium, mercury and copernicium. Each atom has a full d subshell and two outer s electrons, and usually forms a 2+ ion; mercury also forms 1+. They are not always counted as transition metals. | OS 18.1; Red Book |
| 13 | (none; "the boron group") | Boron, a metalloid, and the metals aluminium, gallium, indium and thallium. Each atom has three valence electrons. An oxidation state of 3+ is usual, and the heavier members also form 1+. | OS 18.1 |
| 14 | (none; "the carbon group") | Carbon is a nonmetal, silicon and germanium are metalloids, tin and lead are metals. Each atom has four valence electrons. Tin and lead form 2+ ions as well as compounds in the 4+ state. | OS 18.1 |
| 15 | Pnictogens | Each atom has five valence electrons, so three more fill the valence shell. The group runs from the nonmetals nitrogen and phosphorus to the metal bismuth. | OS 2.5; OS 18.4; OS 18.1 |
| 16 | Chalcogens | Each atom has six valence electrons, so two more fill the valence shell. Also called the oxygen family. | OS 2.5; OS 18.4 |
| 17 | Halogens | Each atom has seven valence electrons, one short of a full valence shell. The elements are too reactive to occur free in nature, form two-atom molecules, and are found as halide ions. | OS 18.11; OS 18.4 |
| 18 | Noble gases | Atoms with filled valence shells, and very low melting and boiling points. They were assumed to be unreactive until 1962; xenon and krypton form compounds with fluorine. | OS 18.12 |

For groups 4 to 12 and 13 to 18, add where the group has a member from 104 upward: "{Name} is placed here by its atomic number; its chemistry is unknown or barely studied." This is authored and matches the category note.

**Periods.** Members of a period do not share chemical properties; they share the shell being filled. Generate the text from the table and cite OS 6.4 for the filling order:

| Period | Text |
| --- | --- |
| 1 | 2 elements, hydrogen and helium. The 1s subshell fills. |
| 2 | 8 elements, lithium to neon. The 2s and 2p subshells fill. |
| 3 | 8 elements, sodium to argon. The 3s and 3p subshells fill. |
| 4 | 18 elements, potassium to krypton. The 4s, 3d and 4p subshells fill. |
| 5 | 18 elements, rubidium to xenon. The 5s, 4d and 5p subshells fill. |
| 6 | 32 elements, cesium to radon, 15 of them drawn in the lanthanide row. The 6s, 4f, 5d and 6p subshells fill. |
| 7 | 32 elements, francium to oganesson, 15 of them drawn in the actinide row. The 7s, 5f, 6d and 7p subshells fill. |

The script confirms each subshell list has exactly the capacity of its period (2, 8, 8, 18, 18, 32, 32). Use PubChem's spelling of element names (it has "Cesium" and "Aluminum").

**Blocks.**

| Block | Text | Source |
| --- | --- | --- |
| s | Groups 1 and 2, and helium: 14 elements. The last electron added goes into an s subshell, which holds 2. Helium (1s²) is in this block by its configuration, but is drawn in group 18 because it behaves as a noble gas. | OS 6.4; Red Book |
| p | Groups 13 to 18 except helium: 36 elements, six columns because a p subshell holds 6 electrons. It holds every nonmetal except hydrogen and helium, the metalloids, and some metals. | OS 6.4; Red Book |
| d | Groups 3 to 12: 40 elements, ten columns because a d subshell holds 10 electrons. These are the transition metals, though group 12 is not always counted among them. Lutetium and lawrencium are counted here; see the note on group 3. | Red Book; OS 6.4; Scerri 2021 |
| f | Lanthanum to ytterbium and actinium to nobelium: 28 elements, fourteen in each row because an f subshell holds 14 electrons. Also called the inner transition metals. Lanthanum, actinium and thorium have no f electron in their ground state. | Red Book; OS 6.4; Scerri 2021 |

The last sentence of the f-block text is checked by script: under rule A the only elements with no electron in the subshell their block is named for are La, Ac and Th.

Two sentences in OpenStax 6.4 should not be reused. It says copper, silver and gold "are not technically transition elements"; under the IUPAC definition they are (Cu²⁺ has an incomplete d subshell). And its definition of valence electrons for transition metals (every electron beyond the configuration of the preceding noble gas) would count hafnium's 4f¹⁴. The drafts above say "outer s and d electrons" instead.

## 6. Element card (spec 7)

Scripts: `categories.py` sections D to G, `masses.py`, `curated.py`, `pubchem_records.py`. Output in Appendices D, F and G.

### 6.1 "Not measured" is the wrong phrase

The spec shows every empty PubChem field as "not measured". That is a claim about the state of science the app has no source for, and for several classes of field it is false:

- **Electronegativity** (23 empty). OpenStax 7.2: electronegativity has no unit and is worked out, not measured. Helium, neon and argon have no Pauling value because the scale is built from bond energies and they form no stable bonds. Promethium, europium, terbium and ytterbium are simply not listed.
- **Electron affinity** (61 empty). Among atomic numbers 1 to 86, thirty are empty. Sixteen of them are in groups 2, 12 and 18, plus nitrogen and manganese: atoms with filled or half-filled subshells, the cases OpenStax 6.5 explains as exceptions. PubChem's own pages give helium, nitrogen and neon a value of 0 or a negative number, meaning the negative ion is not stable; that is a known result, not a missing measurement. The other fourteen are lanthanides and hafnium, which PubChem just does not list.
- **Density, melting point** of the superheavy elements: here "not measured" is true.

Use one neutral phrase for all: **"no value listed"**. The plan's test string becomes "Helium, atomic number 2, Noble gas, electronegativity: no value listed". "Not known" for the year never occurs: no element has an empty year.

### 6.2 Field by field

| Field | Problem found | Caveat the card needs |
| --- | --- | --- |
| Atomic mass | For the 34 elements with no stable isotope (Tc, Pm, Po to Ac, Np to Og) PubChem prints an isotope's mass to five or more figures (Tc 96.90636) where textbooks print a mass number in brackets (OpenStax: 97). For Li (7.0), Ar (39.9), Zn (65.4) and Pb (207) PubChem prints fewer figures than OpenStax (6.94, 39.95, 65.38, 207.2); S is 32.07 against 32.06 | For those 34: "Mass of one isotope; this element has no stable isotope and no standard atomic weight." The rest is for the cross-check |
| Oxidation states | Noble gases all read "0", while the library holds XeF₄ (xenon +4). Oxygen reads "-2" while the library holds H₂O₂ (-1) and O₂ (0). Carbon reads "+4, +2, -4" while ethane is -3. Positive states lack signs for At, Db to Cn, Fl, Mc and Og; flerovium has a stray spacing ("6, 4,2, 1, 0"); nihonium is empty. PubChem's element pages mark the states of Db to Og as predictions; the download drops the marks | Label: "Common oxidation states (PubChem's list, not complete)". Xenon and krypton: "Xenon and krypton form compounds with fluorine, such as XeF₄." Atomic numbers 105 to 118: mark as predicted. Show the text as published; do not normalise signs |
| Electron affinity | Every listed value is positive, meaning energy released: F 3.339 eV is 322 kJ/mol. OpenStax 6.5 prints F as -322 kJ/mol: the same size with the opposite sign. PubChem's fluorine value is also about 2% below the modern one (NIST WebBook: 3.401 eV) | "Energy released when the atom gains an electron. Some textbooks write this as a negative number." Empty: "no value listed" |
| Electronegativity | Krypton 3 and xenon 2.6 listed; other noble gases empty. Am to Lr all read 1.3 | Label "Pauling scale". Empty: "no value listed" |
| Radius | It is a van der Waals radius | Label "van der Waals radius". See section 3.2 |
| Standard state | Rf, Db, Sg, Bh, Hs and Mt read plain "Solid" though nothing about them has been measured in bulk (no melting point, boiling point or density in the table); Ds to Og read "Expected to be ...". "Standard state" is also a thermodynamic term with a different meaning, which the v1 app uses | Label "State at room temperature". For Rf to Mt add "(not observed; only a few atoms have been made)" |
| Melting point | Helium 0.95 K: helium does not solidify at ordinary pressure (OpenStax 18.12; PubChem's helium page). Carbon 3823 K: carbon sublimes; PubChem's carbon page gives "3800°C (sublimation)". Arsenic 1090 K is at 28 atmospheres (PubChem's arsenic page). At, Fr, Fm, Md, No and Lr have values although the element has never been prepared as a weighable sample (PubChem's pages: francium "no weighable quantity ... has been prepared"; fermium "metal has not been prepared ... predictions have been made") | Helium: "Under pressure; helium stays liquid at ordinary pressure." Carbon: "Carbon turns straight from solid to gas at ordinary pressure." Arsenic: "At 28 atmospheres." At, Fr and Fm to Lr: "Estimated; the element has not been prepared in a weighable amount." |
| Boiling point | Arsenic 887 K is below its melting point because it is a sublimation temperature at 1 atm. Carbon 4098 K likewise | Arsenic: "Arsenic turns straight from solid to gas at this temperature at ordinary pressure." Carbon: shares the melting-point note |
| Density | Gases are per cm³ at 0 °C and 1 atm, about a thousand times below the solids. Astatine's "7" (PubChem's page: "about 7") and radium's "5" are one-figure values. Carbon's 2.2670 matches graphite, not diamond; phosphorus's values match white phosphorus (PubChem's phosphorus page labels the melting and boiling points so) | Gases: "Gas at 0 °C and 1 atm." Carbon: "Graphite." Phosphorus: "White phosphorus." |
| Year discovered | "Ancient" for 13: C, Al, S, Ca, Fe, Cu, As, Ag, Sn, Sb, Au, Hg, Pb. Aluminium and calcium contradict PubChem's own pages (aluminium isolated 1825 to 1827; calcium 1808). Fluorine's 1670 is the first recorded use of a fluorine compound; it was isolated in 1886. Silicon's 1854 is the crystalline form; Berzelius made it in 1824 | Show "Ancient" as "Known since ancient times". Notes on Al and Ca (must), F and Si (should) |
| Configuration and diagram | Section 2 | Section 2.4 |
| Group and block | Helium is block s in group 18; La to Lu have no group | One line each, from section 5 and the group 3 note |

### 6.3 The melting-point scale's two ends

The spec's legend "gives the scale's ends". For melting point those are helium (0.95 K) and carbon (3823 K): one needs pressure and the other is not a melting point at ordinary pressure. The legend must carry both notes, not just the cards.

### 6.4 The eleven curated elements

Spec 5.2 shows the individually sourced value "where one exists". Three gaps:

- The curated file has `covalentRadius` and `vdwRadius`, not "atomic radius". The spec must say which row each fills. Hydrogen and fluorine then show a van der Waals radius on the card (110 and 147 pm, Mantina) that differs from the value colouring their cell (120 and 135 pm, PubChem). The card should show both with their sources.
- The curated radii are in ångström and PubChem's in picometres. Show one unit.
- The curated configuration is written in full (`1s2 2s2 2p1`) and PubChem's with a core (`[He]2s2 2p1`). Either is right; pick one form for the card.

## 7. What could not be checked

- **Textbooks other than OpenStax** on group 3 and on the f block (Brown, Zumdahl, Atkins, Housecroft and others). None is freely fetchable. "Many textbooks instead count lanthanum and actinium in the d block" in the draft note rests on OpenStax alone plus general knowledge.
- **Whether IUPAC has ruled on group 3 since 2021.** IUPAC's periodic table page, fetched today, still presents the question as open, the project page shows no recommendation, and one web search found none. I did not search IUPAC's publications exhaustively.
- **Configurations of Mt to Og** (109 to 118): not in NIST's ground-state table, so not checked against any second source.
- **Where PubChem's van der Waals values for the d block come from.** PubChem attributes the column to Los Alamos National Laboratory. I did not trace the erratic transition-metal values to a primary paper.
- **That the covalent radii on PubChem's element pages are exactly Cordero 2008.** They match the 11 values the app already stores from Cordero, and the format (value with uncertainty, 1 to 96) fits; the paper is paywalled and was not read.
- **Years discovered**, beyond Al, Ca, F and Si. I did not check the other 114 against a second source.
- **The pressure for helium's melting point and the triple point of carbon**: I cite that pressure is needed, from fetched text, but did not fetch the figures.
- **That the melting points of astatine, mendelevium, nobelium and lawrencium are estimates.** PubChem's pages say so in words only for francium and fermium. The others are heavier or rarer still, and I know of no bulk sample of any of them, but I did not fetch a source saying so.
- **Which allotrope carbon's density refers to.** The download does not say. 2.2670 g/cm³ is graphite's density as I know it; I did not fetch a source for that.
- **Which atoms have no stable negative ion.** PubChem's pages show it for helium, nitrogen and neon. For the other empty electron affinities I relied on OpenStax 6.5's general explanation, not on a value per element.
- **The IUPAC Gold Book definition of a transition element**: the site refused the request. The Red Book wording, which was fetched, is used instead.
- **Palettes, keyboard movement and accessibility**: outside this review.

## 8. Sources fetched (2026-10-03)

Saved under `sources/`.

| Source | URL | How |
| --- | --- | --- |
| PubChem periodic table JSON | https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON | curl; identical to the committed download |
| PubChem periodic table page (property labels and units) | https://pubchem.ncbi.nlm.nih.gov/periodic-table/ | headless Chromium |
| PubChem element records, all 118 | https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/{Z}/JSON | curl |
| NIST ASD ground states and ionization energies, Z 1 to 108 | https://physics.nist.gov/cgi-bin/ASD/ie.pl (spectra "H-Og I") | curl |
| NIST Chemistry WebBook, fluorine atom | https://webbook.nist.gov/cgi/cbook.cgi?ID=C14762948&Units=SI&Mask=20 | curl |
| OpenStax Chemistry 2e sections 2.5, 6.4, 6.5, 7.2, 18.1, 18.2, 18.3, 18.4, 18.11, 18.12, 19.1 | https://openstax.org/books/chemistry-2e/pages/... | curl |
| IUPAC periodic table page | https://iupac.org/what-we-do/periodic-table-of-elements/ | curl |
| IUPAC project 2015-039-2-200 | https://iupac.org/project/2015-039-2-200 | headless Chromium |
| Scerri 2021, provisional report on group 3 | https://doi.org/10.1515/ci-2021-0115 | headless Chromium (full text read) |
| IUPAC Red Book 2005, section IR-3.5 | https://iupac.org/wp-content/uploads/2016/07/Red_Book_2005.pdf | curl, text extracted with Ghostscript |

## Scripts in this folder

| Script | Does |
| --- | --- |
| `common.py` | Loads the download and the NIST table; the configuration parser and `shells()` |
| `position.py` | The position rule under three block rules; the plan's test values |
| `shells.py` | Shell counts for all 118; formatting survey; comparison with NIST |
| `trends.py` | Range, distribution and trend agreement for each property; covalent against van der Waals radius |
| `categories.py` | Categories against OpenStax and PubChem's element pages; card-field checks |
| `pubchem_records.py` | Reads PubChem's 118 element pages |
| `descriptions_check.py` | Checks the counting claims in the drafted descriptions |
| `position_vs_pubchem.py` | Period and group on PubChem's element pages against the position rule |
| `masses.py`, `curated.py` | Atomic masses against OpenStax; the 11 curated elements against PubChem |
| `fetch-page.mjs`, `html2text.py`, `pubchem_element.py` | Fetching and reading helpers |

Run any of them with `python3 <script>` from this folder. They read the repository and write nothing to it.

---

The appendices are the scripts' output, unedited. Long lines are kept whole.

## Appendix A. Position rules: `position.py`, then `position_vs_pubchem.py`

```text
== A. The drawn grid under the stated convention (rows 1-7, gap row 8, rows 9-10; ** = group 3 marker) ==
     1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17  18  
1    H   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   He  
2    Li  Be  .   .   .   .   .   .   .   .   .   .   B   C   N   O   F   Ne  
3    Na  Mg  .   .   .   .   .   .   .   .   .   .   Al  Si  P   S   Cl  Ar  
4    K   Ca  Sc  Ti  V   Cr  Mn  Fe  Co  Ni  Cu  Zn  Ga  Ge  As  Se  Br  Kr  
5    Rb  Sr  Y   Zr  Nb  Mo  Tc  Ru  Rh  Pd  Ag  Cd  In  Sn  Sb  Te  I   Xe  
6    Cs  Ba  **  Hf  Ta  W   Re  Os  Ir  Pt  Au  Hg  Tl  Pb  Bi  Po  At  Rn  
7    Fr  Ra  **  Rf  Db  Sg  Bh  Hs  Mt  Ds  Rg  Cn  Nh  Fl  Mc  Lv  Ts  Og  
8    .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   .   
9    .   .   La  Ce  Pr  Nd  Pm  Sm  Eu  Gd  Tb  Dy  Ho  Er  Tm  Yb  Lu  .   
10   .   .   Ac  Th  Pa  U   Np  Pu  Am  Cm  Bk  Cf  Es  Fm  Md  No  Lr  .   

== B. Every expected value in the plan's elementPosition tests ==
-- block rule plan --
  H  plan (1, 1, 's', 1, 1)      rule (1, 1, 's', 1, 1)      OK
  He plan (1, 18, 's', 1, 18)    rule (1, 18, 's', 1, 18)    OK
  B  plan (2, 13, 'p', 2, 13)    rule (2, 13, 'p', 2, 13)    OK
  Sc plan (4, 3, 'd', 4, 3)      rule (4, 3, 'd', 4, 3)      OK
  La plan (6, 'null', 'f', 9, 3) rule (6, 'null', 'f', 9, 3) OK
  Lu plan (6, 'null', 'f', 9, 17) rule (6, 'null', 'f', 9, 17) OK
  Hf plan (6, 4, 'd', 6, 4)      rule (6, 4, 'd', 6, 4)      OK
  Ac plan (7, 'null', 'f', 10, 3) rule (7, 'null', 'f', 10, 3) OK
  Og plan (7, 18, 'p', 7, 18)    rule (7, 18, 'p', 7, 18)    OK
-- block rule A --
  H  plan (1, 1, 's', 1, 1)      rule (1, 1, 's', 1, 1)      OK
  He plan (1, 18, 's', 1, 18)    rule (1, 18, 's', 1, 18)    OK
  B  plan (2, 13, 'p', 2, 13)    rule (2, 13, 'p', 2, 13)    OK
  Sc plan (4, 3, 'd', 4, 3)      rule (4, 3, 'd', 4, 3)      OK
  La plan (6, 'null', 'f', 9, 3) rule (6, 'null', 'f', 9, 3) OK
  Lu plan (6, 'null', 'f', 9, 17) rule (6, 'null', 'd', 9, 17) DIFFERS
  Hf plan (6, 4, 'd', 6, 4)      rule (6, 4, 'd', 6, 4)      OK
  Ac plan (7, 'null', 'f', 10, 3) rule (7, 'null', 'f', 10, 3) OK
  Og plan (7, 18, 'p', 7, 18)    rule (7, 18, 'p', 7, 18)    OK
-- block rule B --
  H  plan (1, 1, 's', 1, 1)      rule (1, 1, 's', 1, 1)      OK
  He plan (1, 18, 's', 1, 18)    rule (1, 18, 's', 1, 18)    OK
  B  plan (2, 13, 'p', 2, 13)    rule (2, 13, 'p', 2, 13)    OK
  Sc plan (4, 3, 'd', 4, 3)      rule (4, 3, 'd', 4, 3)      OK
  La plan (6, 'null', 'f', 9, 3) rule (6, 'null', 'd', 9, 3) DIFFERS
  Lu plan (6, 'null', 'f', 9, 17) rule (6, 'null', 'f', 9, 17) OK
  Hf plan (6, 4, 'd', 6, 4)      rule (6, 4, 'd', 6, 4)      OK
  Ac plan (7, 'null', 'f', 10, 3) rule (7, 'null', 'd', 10, 3) DIFFERS
  Og plan (7, 18, 'p', 7, 18)    rule (7, 18, 'p', 7, 18)    OK

== C. Whole-table checks ==
unique (row, column) pairs: 118 of 118
cells colliding with a group 3 marker (6,3) or (7,3): none
period sizes: [2, 8, 8, 18, 18, 32, 32]  plan says [2, 8, 8, 18, 18, 32, 32]
elements per drawn row: {1: 2, 2: 8, 3: 8, 4: 18, 5: 18, 6: 17, 7: 17, 8: 0, 9: 15, 10: 15}
members of each group (main-table elements only):
   1: H Li Na K Rb Cs Fr
   2: Be Mg Ca Sr Ba Ra
   3: Sc Y
   4: Ti Zr Hf Rf
   5: V Nb Ta Db
   6: Cr Mo W Sg
   7: Mn Tc Re Bh
   8: Fe Ru Os Hs
   9: Co Rh Ir Mt
  10: Ni Pd Pt Ds
  11: Cu Ag Au Rg
  12: Zn Cd Hg Cn
  13: B Al Ga In Tl Nh
  14: C Si Ge Sn Pb Fl
  15: N P As Sb Bi Mc
  16: O S Se Te Po Lv
  17: F Cl Br I At Ts
  18: He Ne Ar Kr Xe Rn Og
no group number: La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr
atomic number 0: throws
atomic number 119: throws

== D. Block sizes under each block rule (an s subshell holds 2, p 6, d 10, f 14) ==
expected from subshell capacities: s 14 (7 periods x 2), p 36 (6 x 6), d 40 (4 x 10), f 28 (2 x 14)
  rule plan all: s 14  p 36  d 38  f 30 | period 6: s 2  f 15  d 9  p 6  WRONG: f block is 15 wide, d block is 9 wide in periods 6 and 7
  rule A    all: s 14  p 36  d 40  f 28 | period 6: s 2  f 14  d 10  p 6  OK
  rule B    all: s 14  p 36  d 40  f 28 | period 6: s 2  f 14  d 10  p 6  OK

== E. Does each block rule keep the blocks contiguous in atomic-number order within period 6? ==
  rule plan ssfffffffffffffffdddddddddpppppp   runs: s2 f15 d9 p6
  rule A    ssffffffffffffffddddddddddpppppp   runs: s2 f14 d10 p6
  rule B    ssdffffffffffffffdddddddddpppppp   runs: s2 d1 f14 d9 p6

== F. What the PubChem ground-state configurations say about the four disputed elements ==
  Sc [Ar]4s2 3d1            (n-2)f electrons:  0   (n-1)d electrons: 1   category in PubChem: Transition metal
  Y  [Kr]5s2 4d1            (n-2)f electrons:  0   (n-1)d electrons: 1   category in PubChem: Transition metal
  La [Xe]6s2 5d1            (n-2)f electrons:  0   (n-1)d electrons: 1   category in PubChem: Lanthanide
  Lu [Xe]6s2 4f14 5d1       (n-2)f electrons: 14   (n-1)d electrons: 1   category in PubChem: Lanthanide
  Ac [Rn]7s2 6d1            (n-2)f electrons:  0   (n-1)d electrons: 1   category in PubChem: Actinide
  Lr [Rn]7s2 5f14 6d1       (n-2)f electrons: 14   (n-1)d electrons: 1   category in PubChem: Actinide
  Ce [Xe]6s2 4f1 5d1        (n-2)f electrons:  1   (n-1)d electrons: 1   category in PubChem: Lanthanide
  Th [Rn]7s2 6d2            (n-2)f electrons:  0   (n-1)d electrons: 2   category in PubChem: Actinide
  Yb [Xe]6s2 4f14           (n-2)f electrons: 14   (n-1)d electrons: 0   category in PubChem: Lanthanide
  No [Rn]7s2 5f14           (n-2)f electrons: 14   (n-1)d electrons: 0   category in PubChem: Actinide
  Hf [Xe]6s2 4f14 5d2       (n-2)f electrons: 14   (n-1)d electrons: 2   category in PubChem: Transition metal

== G. Helium ==
  He configuration 1s2 -> s block by configuration; drawn in group 18, column 18. PubChem category: Noble gas
  s-block members under the rule: H He Li Be Na Mg K Ca Rb Sr Cs Ba Fr Ra
  column 18 blocks: [('He', 's'), ('Ne', 'p'), ('Ar', 'p'), ('Kr', 'p'), ('Xe', 'p'), ('Rn', 'p'), ('Og', 'p')]
```

```text
period disagreements: none
group-number disagreements: Lu: PubChem "3 - Lanthanide", rule None; Lr: PubChem "3 - Actinide", rule None
  PubChem family label ''                     51  H B C Al Si Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga ...
  PubChem family label 'Noble Gas'             7  He Ne Ar Kr Xe Rn Og
  PubChem family label 'Alkali Metal'          6  Li Na K Rb Cs Fr
  PubChem family label 'Alkaline Earth Metal'  6  Be Mg Ca Sr Ba Ra
  PubChem family label 'Pnictogen'             6  N P As Sb Bi Mc
  PubChem family label 'Chalcogen'             6  O S Se Te Po Lv
  PubChem family label 'Halogen'               6  F Cl Br I At Ts
  PubChem family label 'Lanthanide'           15  La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu
  PubChem family label 'Actinide'             15  Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr
nonmetal-type categories outside the p block: H He
metalloids outside the p block: none
```

## Appendix B. Shell counts: `shells.py`, then the extra parser cases

```text
== A. Plan Task 2 expected values for shellsFromConfiguration ==
1s1                    plan [1]                    script [1]                    OK
[He]2s2 2p2            plan [2, 4]                 script [2, 4]                 OK
[Ne]3s2 3p5            plan [2, 8, 7]              script [2, 8, 7]              OK
[Ar]4s2 3d6            plan [2, 8, 14, 2]          script [2, 8, 14, 2]          OK
[Ar]4s1 3d10           plan [2, 8, 18, 1]          script [2, 8, 18, 1]          OK
[Kr]5s2 4d10 5p6       plan [2, 8, 18, 18, 8]      script [2, 8, 18, 18, 8]      OK

== B. All 118 PubChem strings: shells, sum, equals Z? ==
  1 H  1s1                                        [1]                            sum   1 OK
  2 He 1s2                                        [2]                            sum   2 OK
  3 Li [He]2s1                                    [2, 1]                         sum   3 OK
  4 Be [He]2s2                                    [2, 2]                         sum   4 OK
  5 B  [He]2s2 2p1                                [2, 3]                         sum   5 OK
  6 C  [He]2s2 2p2                                [2, 4]                         sum   6 OK
  7 N  [He] 2s2 2p3                               [2, 5]                         sum   7 OK
  8 O  [He]2s2 2p4                                [2, 6]                         sum   8 OK
  9 F  [He]2s2 2p5                                [2, 7]                         sum   9 OK
 10 Ne [He]2s2 2p6                                [2, 8]                         sum  10 OK
 11 Na [Ne]3s1                                    [2, 8, 1]                      sum  11 OK
 12 Mg [Ne]3s2                                    [2, 8, 2]                      sum  12 OK
 13 Al [Ne]3s2 3p1                                [2, 8, 3]                      sum  13 OK
 14 Si [Ne]3s2 3p2                                [2, 8, 4]                      sum  14 OK
 15 P  [Ne]3s2 3p3                                [2, 8, 5]                      sum  15 OK
 16 S  [Ne]3s2 3p4                                [2, 8, 6]                      sum  16 OK
 17 Cl [Ne]3s2 3p5                                [2, 8, 7]                      sum  17 OK
 18 Ar [Ne]3s2 3p6                                [2, 8, 8]                      sum  18 OK
 19 K  [Ar]4s1                                    [2, 8, 8, 1]                   sum  19 OK
 20 Ca [Ar]4s2                                    [2, 8, 8, 2]                   sum  20 OK
 21 Sc [Ar]4s2 3d1                                [2, 8, 9, 2]                   sum  21 OK
 22 Ti [Ar]4s2 3d2                                [2, 8, 10, 2]                  sum  22 OK
 23 V  [Ar]4s2 3d3                                [2, 8, 11, 2]                  sum  23 OK
 24 Cr [Ar]3d5 4s1                                [2, 8, 13, 1]                  sum  24 OK
 25 Mn [Ar]4s2 3d5                                [2, 8, 13, 2]                  sum  25 OK
 26 Fe [Ar]4s2 3d6                                [2, 8, 14, 2]                  sum  26 OK
 27 Co [Ar]4s2 3d7                                [2, 8, 15, 2]                  sum  27 OK
 28 Ni [Ar]4s2 3d8                                [2, 8, 16, 2]                  sum  28 OK
 29 Cu [Ar]4s1 3d10                               [2, 8, 18, 1]                  sum  29 OK
 30 Zn [Ar]4s2 3d10                               [2, 8, 18, 2]                  sum  30 OK
 31 Ga [Ar]4s2 3d10 4p1                           [2, 8, 18, 3]                  sum  31 OK
 32 Ge [Ar]4s2 3d10 4p2                           [2, 8, 18, 4]                  sum  32 OK
 33 As [Ar]4s2 3d10 4p3                           [2, 8, 18, 5]                  sum  33 OK
 34 Se [Ar]4s2 3d10 4p4                           [2, 8, 18, 6]                  sum  34 OK
 35 Br [Ar]4s2 3d10 4p5                           [2, 8, 18, 7]                  sum  35 OK
 36 Kr [Ar]4s2 3d10 4p6                           [2, 8, 18, 8]                  sum  36 OK
 37 Rb [Kr]5s1                                    [2, 8, 18, 8, 1]               sum  37 OK
 38 Sr [Kr]5s2                                    [2, 8, 18, 8, 2]               sum  38 OK
 39 Y  [Kr]5s2 4d1                                [2, 8, 18, 9, 2]               sum  39 OK
 40 Zr [Kr]5s2 4d2                                [2, 8, 18, 10, 2]              sum  40 OK
 41 Nb [Kr]5s1 4d4                                [2, 8, 18, 12, 1]              sum  41 OK
 42 Mo [Kr]5s1 4d5                                [2, 8, 18, 13, 1]              sum  42 OK
 43 Tc [Kr]5s2 4d5                                [2, 8, 18, 13, 2]              sum  43 OK
 44 Ru [Kr]5s1 4d7                                [2, 8, 18, 15, 1]              sum  44 OK
 45 Rh [Kr]5s1 4d8                                [2, 8, 18, 16, 1]              sum  45 OK
 46 Pd [Kr]4d10                                   [2, 8, 18, 18]                 sum  46 OK
 47 Ag [Kr]5s1 4d10                               [2, 8, 18, 18, 1]              sum  47 OK
 48 Cd [Kr]5s2 4d10                               [2, 8, 18, 18, 2]              sum  48 OK
 49 In [Kr]5s2 4d10 5p1                           [2, 8, 18, 18, 3]              sum  49 OK
 50 Sn [Kr]5s2 4d10 5p2                           [2, 8, 18, 18, 4]              sum  50 OK
 51 Sb [Kr]5s2 4d10 5p3                           [2, 8, 18, 18, 5]              sum  51 OK
 52 Te [Kr]5s2 4d10 5p4                           [2, 8, 18, 18, 6]              sum  52 OK
 53 I  [Kr]5s2 4d10 5p5                           [2, 8, 18, 18, 7]              sum  53 OK
 54 Xe [Kr]5s2 4d10 5p6                           [2, 8, 18, 18, 8]              sum  54 OK
 55 Cs [Xe]6s1                                    [2, 8, 18, 18, 8, 1]           sum  55 OK
 56 Ba [Xe]6s2                                    [2, 8, 18, 18, 8, 2]           sum  56 OK
 57 La [Xe]6s2 5d1                                [2, 8, 18, 18, 9, 2]           sum  57 OK
 58 Ce [Xe]6s2 4f1 5d1                            [2, 8, 18, 19, 9, 2]           sum  58 OK
 59 Pr [Xe]6s2 4f3                                [2, 8, 18, 21, 8, 2]           sum  59 OK
 60 Nd [Xe]6s2 4f4                                [2, 8, 18, 22, 8, 2]           sum  60 OK
 61 Pm [Xe]6s2 4f5                                [2, 8, 18, 23, 8, 2]           sum  61 OK
 62 Sm [Xe]6s2 4f6                                [2, 8, 18, 24, 8, 2]           sum  62 OK
 63 Eu [Xe]6s2 4f7                                [2, 8, 18, 25, 8, 2]           sum  63 OK
 64 Gd [Xe]6s2 4f7 5d1                            [2, 8, 18, 25, 9, 2]           sum  64 OK
 65 Tb [Xe]6s2 4f9                                [2, 8, 18, 27, 8, 2]           sum  65 OK
 66 Dy [Xe]6s2 4f10                               [2, 8, 18, 28, 8, 2]           sum  66 OK
 67 Ho [Xe]6s2 4f11                               [2, 8, 18, 29, 8, 2]           sum  67 OK
 68 Er [Xe]6s2 4f12                               [2, 8, 18, 30, 8, 2]           sum  68 OK
 69 Tm [Xe]6s2 4f13                               [2, 8, 18, 31, 8, 2]           sum  69 OK
 70 Yb [Xe]6s2 4f14                               [2, 8, 18, 32, 8, 2]           sum  70 OK
 71 Lu [Xe]6s2 4f14 5d1                           [2, 8, 18, 32, 9, 2]           sum  71 OK
 72 Hf [Xe]6s2 4f14 5d2                           [2, 8, 18, 32, 10, 2]          sum  72 OK
 73 Ta [Xe]6s2 4f14 5d3                           [2, 8, 18, 32, 11, 2]          sum  73 OK
 74 W  [Xe]6s2 4f14 5d4                           [2, 8, 18, 32, 12, 2]          sum  74 OK
 75 Re [Xe]6s2 4f14 5d5                           [2, 8, 18, 32, 13, 2]          sum  75 OK
 76 Os [Xe]6s2 4f14 5d6                           [2, 8, 18, 32, 14, 2]          sum  76 OK
 77 Ir [Xe]6s2 4f14 5d7                           [2, 8, 18, 32, 15, 2]          sum  77 OK
 78 Pt [Xe]6s1 4f14 5d9                           [2, 8, 18, 32, 17, 1]          sum  78 OK
 79 Au [Xe]6s1 4f14 5d10                          [2, 8, 18, 32, 18, 1]          sum  79 OK
 80 Hg [Xe]6s2 4f14 5d10                          [2, 8, 18, 32, 18, 2]          sum  80 OK
 81 Tl [Xe]6s2 4f14 5d10 6p1                      [2, 8, 18, 32, 18, 3]          sum  81 OK
 82 Pb [Xe]6s2 4f14 5d10 6p2                      [2, 8, 18, 32, 18, 4]          sum  82 OK
 83 Bi [Xe]6s2 4f14 5d10 6p3                      [2, 8, 18, 32, 18, 5]          sum  83 OK
 84 Po [Xe]6s2 4f14 5d10 6p4                      [2, 8, 18, 32, 18, 6]          sum  84 OK
 85 At [Xe]6s2 4f14 5d10 6p5                      [2, 8, 18, 32, 18, 7]          sum  85 OK
 86 Rn [Xe]6s2 4f14 5d10 6p6                      [2, 8, 18, 32, 18, 8]          sum  86 OK
 87 Fr [Rn]7s1                                    [2, 8, 18, 32, 18, 8, 1]       sum  87 OK
 88 Ra [Rn]7s2                                    [2, 8, 18, 32, 18, 8, 2]       sum  88 OK
 89 Ac [Rn]7s2 6d1                                [2, 8, 18, 32, 18, 9, 2]       sum  89 OK
 90 Th [Rn]7s2 6d2                                [2, 8, 18, 32, 18, 10, 2]      sum  90 OK
 91 Pa [Rn]7s2 5f2 6d1                            [2, 8, 18, 32, 20, 9, 2]       sum  91 OK
 92 U  [Rn]7s2 5f3 6d1                            [2, 8, 18, 32, 21, 9, 2]       sum  92 OK
 93 Np [Rn]7s2 5f4 6d1                            [2, 8, 18, 32, 22, 9, 2]       sum  93 OK
 94 Pu [Rn]7s2 5f6                                [2, 8, 18, 32, 24, 8, 2]       sum  94 OK
 95 Am [Rn]7s2 5f7                                [2, 8, 18, 32, 25, 8, 2]       sum  95 OK
 96 Cm [Rn]7s2 5f7 6d1                            [2, 8, 18, 32, 25, 9, 2]       sum  96 OK
 97 Bk [Rn]7s2 5f9                                [2, 8, 18, 32, 27, 8, 2]       sum  97 OK
 98 Cf [Rn]7s2 5f10                               [2, 8, 18, 32, 28, 8, 2]       sum  98 OK
 99 Es [Rn]7s2 5f11                               [2, 8, 18, 32, 29, 8, 2]       sum  99 OK
100 Fm [Rn] 5f12 7s2                              [2, 8, 18, 32, 30, 8, 2]       sum 100 OK
101 Md [Rn]7s2 5f13                               [2, 8, 18, 32, 31, 8, 2]       sum 101 OK
102 No [Rn]7s2 5f14                               [2, 8, 18, 32, 32, 8, 2]       sum 102 OK
103 Lr [Rn]7s2 5f14 6d1                           [2, 8, 18, 32, 32, 9, 2]       sum 103 OK
104 Rf [Rn]7s2 5f14 6d2                           [2, 8, 18, 32, 32, 10, 2]      sum 104 OK
105 Db [Rn]7s2 5f14 6d3                           [2, 8, 18, 32, 32, 11, 2]      sum 105 OK
106 Sg [Rn]7s2 5f14 6d4                           [2, 8, 18, 32, 32, 12, 2]      sum 106 OK
107 Bh [Rn]7s2 5f14 6d5                           [2, 8, 18, 32, 32, 13, 2]      sum 107 OK
108 Hs [Rn]7s2 5f14 6d6                           [2, 8, 18, 32, 32, 14, 2]      sum 108 OK
109 Mt [Rn]7s2 5f14 6d7 (calculated)              [2, 8, 18, 32, 32, 15, 2]      sum 109 OK
110 Ds [Rn]7s2 5f14 6d8 (predicted)               [2, 8, 18, 32, 32, 16, 2]      sum 110 OK
111 Rg [Rn]7s2 5f14 6d9 (predicted)               [2, 8, 18, 32, 32, 17, 2]      sum 111 OK
112 Cn [Rn]7s2 5f14 6d10 (predicted)              [2, 8, 18, 32, 32, 18, 2]      sum 112 OK
113 Nh [Rn]5f14 6d10 7s2 7p1 (predicted)          [2, 8, 18, 32, 32, 18, 3]      sum 113 OK
114 Fl [Rn]7s2 7p2 5f14 6d10 (predicted)          [2, 8, 18, 32, 32, 18, 4]      sum 114 OK
115 Mc [Rn]7s2 7p3 5f14 6d10 (predicted)          [2, 8, 18, 32, 32, 18, 5]      sum 115 OK
116 Lv [Rn]7s2 7p4 5f14 6d10 (predicted)          [2, 8, 18, 32, 32, 18, 6]      sum 116 OK
117 Ts [Rn]7s2 7p5 5f14 6d10 (predicted)          [2, 8, 18, 32, 32, 18, 7]      sum 117 OK
118 Og [Rn]7s2 7p6 5f14 6d10 (predicted)          [2, 8, 18, 32, 32, 18, 8]      sum 118 OK
configurations that fail to parse or do not sum to Z: 0 of 118

== C. Formatting of the 118 strings ==
ends "(calculated)": 1  Mt
ends "(predicted)": 9  Ds Rg Cn Nh Fl Mc Lv Ts Og
space directly after the core bracket: N Fm
no core bracket: H He
double spaces / tabs / non-ASCII: none
cores used: {'He': 8, 'Ne': 8, 'Ar': 18, 'Kr': 18, 'Xe': 32, 'Rn': 32}
subshell-letter orders after the core (pattern: elements):
   s f d       26  Ce Gd Lu Hf Ta W Re Os Ir Pt Au Hg Pa U ...
   s d         21  Sc Ti V Mn Fe Co Ni Cu Zn Y Zr Nb Mo Tc ...
   s f         18  Pr Nd Pm Sm Eu Tb Dy Ho Er Tm Yb Pu Am Bk ...
   s           14  H He Li Be Na Mg K Ca Rb Sr Cs Ba Fr Ra
   s p         12  B C N O F Ne Al Si P S Cl Ar
   s d p       12  Ga Ge As Se Br Kr In Sn Sb Te I Xe
   s f d p      6  Tl Pb Bi Po At Rn
   s p f d      5  Fl Mc Lv Ts Og
   d s          1  Cr
   d            1  Pd
   f s          1  Fm
   f d s p      1  Nh

== D. PubChem against NIST ASD ground configurations (NIST lists Z = 1..108) ==
elements compared: 108; same subshell occupancies: 107; different: 1
  DIFFERENT 103 Lr PubChem [Rn]7s2 5f14 6d1       shells [2, 8, 18, 32, 32, 9, 2] | NIST [Rn].5f14.7s2.7p       shells [2, 8, 18, 32, 32, 8, 3]
not in NIST ASD ground-state table (no check possible): Mt Ds Rg Cn Nh Fl Mc Lv Ts Og

== E. Ground states that break the simple filling order (Madelung n+l rule), from the PubChem strings ==
 24 Cr [Ar]3d5 4s1                        3d 5 (rule 4), 4s 1 (rule 2)               NIST agrees
 29 Cu [Ar]4s1 3d10                       3d 10 (rule 9), 4s 1 (rule 2)              NIST agrees
 41 Nb [Kr]5s1 4d4                        4d 4 (rule 3), 5s 1 (rule 2)               NIST agrees
 42 Mo [Kr]5s1 4d5                        4d 5 (rule 4), 5s 1 (rule 2)               NIST agrees
 44 Ru [Kr]5s1 4d7                        4d 7 (rule 6), 5s 1 (rule 2)               NIST agrees
 45 Rh [Kr]5s1 4d8                        4d 8 (rule 7), 5s 1 (rule 2)               NIST agrees
 46 Pd [Kr]4d10                           4d 10 (rule 8), 5s 0 (rule 2)              NIST agrees
 47 Ag [Kr]5s1 4d10                       4d 10 (rule 9), 5s 1 (rule 2)              NIST agrees
 57 La [Xe]6s2 5d1                        4f 0 (rule 1), 5d 1 (rule 0)               NIST agrees
 58 Ce [Xe]6s2 4f1 5d1                    4f 1 (rule 2), 5d 1 (rule 0)               NIST agrees
 64 Gd [Xe]6s2 4f7 5d1                    4f 7 (rule 8), 5d 1 (rule 0)               NIST agrees
 78 Pt [Xe]6s1 4f14 5d9                   5d 9 (rule 8), 6s 1 (rule 2)               NIST agrees
 79 Au [Xe]6s1 4f14 5d10                  5d 10 (rule 9), 6s 1 (rule 2)              NIST agrees
 89 Ac [Rn]7s2 6d1                        5f 0 (rule 1), 6d 1 (rule 0)               NIST agrees
 90 Th [Rn]7s2 6d2                        5f 0 (rule 2), 6d 2 (rule 0)               NIST agrees
 91 Pa [Rn]7s2 5f2 6d1                    5f 2 (rule 3), 6d 1 (rule 0)               NIST agrees
 92 U  [Rn]7s2 5f3 6d1                    5f 3 (rule 4), 6d 1 (rule 0)               NIST agrees
 93 Np [Rn]7s2 5f4 6d1                    5f 4 (rule 5), 6d 1 (rule 0)               NIST agrees
 96 Cm [Rn]7s2 5f7 6d1                    5f 7 (rule 8), 6d 1 (rule 0)               NIST agrees
count: 19  Cr Cu Nb Mo Ru Rh Pd Ag La Ce Gd Pt Au Ac Th Pa U Np Cm
NIST ground states that break the rule but PubChem writes as rule-following:
  103 Lr NIST [Rn].5f14.7s2.7p PubChem [Rn]7s2 5f14 6d1

== F. Shell lists a Bohr diagram would draw for the heaviest and the awkward elements ==
Fe [Ar]4s2 3d6                              [2, 8, 14, 2]
Cu [Ar]4s1 3d10                             [2, 8, 18, 1]
Pd [Kr]4d10                                 [2, 8, 18, 18]
Xe [Kr]5s2 4d10 5p6                         [2, 8, 18, 18, 8]
La [Xe]6s2 5d1                              [2, 8, 18, 18, 9, 2]
Gd [Xe]6s2 4f7 5d1                          [2, 8, 18, 25, 9, 2]
Lu [Xe]6s2 4f14 5d1                         [2, 8, 18, 32, 9, 2]
Au [Xe]6s1 4f14 5d10                        [2, 8, 18, 32, 18, 1]
U  [Rn]7s2 5f3 6d1                          [2, 8, 18, 32, 21, 9, 2]
Lr [Rn]7s2 5f14 6d1                         [2, 8, 18, 32, 32, 9, 2]
Mt [Rn]7s2 5f14 6d7 (calculated)            [2, 8, 18, 32, 32, 15, 2]
Nh [Rn]5f14 6d10 7s2 7p1 (predicted)        [2, 8, 18, 32, 32, 18, 3]
Og [Rn]7s2 7p6 5f14 6d10 (predicted)        [2, 8, 18, 32, 32, 18, 8]
Lr with the NIST ground state [Rn].5f14.7s2.7p -> [2, 8, 18, 32, 32, 8, 3]
largest number of shells drawn: 7 ; largest single shell count: 32
elements whose number of occupied shells differs from their period number: Pd
elements whose outer shell holds more than 8 electrons: Pd
elements with any shell above its 2n^2 capacity: none
```

```text
[He] 2s2 2p3                             -> [2, 5]  sum 7
[Ar]3d5 4s1                              -> [2, 8, 13, 1]  sum 24
[Kr]4d10                                 -> [2, 8, 18, 18]  sum 46
[Xe]6s2 4f14 5d1                         -> [2, 8, 18, 32, 9, 2]  sum 71
[Rn] 5f12 7s2                            -> [2, 8, 18, 32, 30, 8, 2]  sum 100
[Rn]7s2 5f14 6d1                         -> [2, 8, 18, 32, 32, 9, 2]  sum 103
[Rn]7s2 5f14 6d7 (calculated)            -> [2, 8, 18, 32, 32, 15, 2]  sum 109
[Rn]5f14 6d10 7s2 7p1 (predicted)        -> [2, 8, 18, 32, 32, 18, 3]  sum 113
[Rn]7s2 7p6 5f14 6d10 (predicted)        -> [2, 8, 18, 32, 32, 18, 8]  sum 118
[Xe]6s2 5d1                              -> [2, 8, 18, 18, 9, 2]  sum 57
[Rn]7s2 5f3 6d1                          -> [2, 8, 18, 32, 21, 9, 2]  sum 92
'[Xx]1s2' throws: unknown core Xx
'2s2 2s1' throws: subshell 2s given twice in '2s2 2s1'
'[Ar]4s3' throws: subshell over capacity in '[Ar]4s3'
'' throws: max() iterable argument is empty
'[Ne]3s2 3q1' throws: unreadable token '3q1' in '[Ne]3s2 3q1'
```

## Appendix C. Trend properties: `trends.py`

```text
====================================================================================================
Electronegativity (Pauling)
  values: 95   missing: 23   He Ne Ar Pm Eu Tb Yb Rn Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 0.7 (Fr)   max 3.98 (F)   max/min 5.69
  quartiles: 5% 0.897 | 25% 1.29 | median 1.62 | 75% 2.17 | 95% 2.972 | mean 1.732
  LINEAR shade 0..1, elements per tenth of the scale: [10, 27, 14, 15, 16, 7, 1, 3, 1, 1]
     share of elements in the darkest half: 14%; in the lightest tenth: 11%; median shade 0.280
  LOG shade    0..1, elements per tenth of the scale: [4, 5, 7, 24, 11, 12, 20, 6, 4, 2]   median shade 0.483
  largest gaps between neighbouring values: 3.44 -> 3.98 (16% of range); 2.66 -> 2.96 (9% of range); 3.16 -> 3.44 (9% of range); 2.36 -> 2.54 (5% of range)
  five lowest: Fr 0.7, Cs 0.79, K 0.82, Rb 0.82, Ba 0.89
  five highest: F 3.98, O 3.44, Cl 3.16, N 3.04, Kr 3
  repeated values: 26   decimals published: [0, 1, 2]
  textbook trend: rises across a period, falls down a group
    period 2  Li 0.98  Be 1.57  B 2.04  C 2.55  N 3.04  O 3.44  F 3.98
              steps against the trend: 0 of 6    rank agreement 1.00
    period 3  Na 0.93  Mg 1.31  Al 1.61  Si 1.9  P 2.19  S 2.58  Cl 3.16
              steps against the trend: 0 of 6    rank agreement 1.00
    period 4  K 0.82  Ca 1  Ga 1.81  Ge 2.01  As 2.18  Se 2.55  Br 2.96
              steps against the trend: 0 of 6    rank agreement 1.00
    period 5  Rb 0.82  Sr 0.95  In 1.78  Sn 1.96  Sb 2.05  Te 2.1  I 2.66
              steps against the trend: 0 of 6    rank agreement 1.00
    period 6  Cs 0.79  Ba 0.89  Tl 1.62  Pb 2.33  Bi 2.02  Po 2  At 2.2
              steps against the trend: 2 of 6 Pb>Bi Bi>Po   rank agreement 0.75
    across, periods 2-6 together: 2 of 30 steps go against the trend (7%)
    group 1   Li 0.98  Na 0.93  K 0.82  Rb 0.82  Cs 0.79   against: K/Rb
    group 2   Be 1.57  Mg 1.31  Ca 1  Sr 0.95  Ba 0.89   against: none
    group 13  B 2.04  Al 1.61  Ga 1.81  In 1.78  Tl 1.62   against: Al/Ga
    group 14  C 2.55  Si 1.9  Ge 2.01  Sn 1.96  Pb 2.33   against: Si/Ge Sn/Pb
    group 15  N 3.04  P 2.19  As 2.18  Sb 2.05  Bi 2.02   against: none
    group 16  O 3.44  S 2.58  Se 2.55  Te 2.1  Po 2   against: none
    group 17  F 3.98  Cl 3.16  Br 2.96  I 2.66  At 2.2   against: none
    group 18  Kr 3  Xe 2.6   against: none
    down, groups 1, 2, 13-18 (to period 6): 4 of 29 steps go against the trend (14%)
  noble gases with a value: Kr 3, Xe 2.6 | without: He Ne Ar Rn
  actinides Am..Lr all share one value: [1.3]
====================================================================================================
AtomicRadius (pm (van der Waals))
  values: 99   missing: 19   Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 120 (H)   max 348 (Fr)   max/min 2.9
  quartiles: 5% 150.8 | 25% 187 | median 209 | 75% 232 | 95% 268.7 | mean 209.5
  LINEAR shade 0..1, elements per tenth of the scale: [5, 6, 16, 29, 19, 17, 3, 1, 1, 2]
     share of elements in the darkest half: 24%; in the lightest tenth: 5%; median shade 0.390
  LOG shade    0..1, elements per tenth of the scale: [1, 4, 6, 10, 22, 27, 22, 3, 2, 2]   median shade 0.521
  largest gaps between neighbouring values: 303 -> 343 (18% of range); 283 -> 303 (9% of range); 120 -> 135 (7% of range); 140 -> 152 (5% of range)
  five lowest: H 120, F 135, Zn 139, He 140, Cu 140
  five highest: Fr 348, Cs 343, Rb 303, Ra 283, K 275
  repeated values: 33   decimals published: [0]
  textbook trend: falls across a period, rises down a group
    period 2  Li 182  Be 153  B 192  C 170  N 155  O 152  F 135  Ne 154
              steps against the trend: 2 of 7 Be>B F>Ne   rank agreement 0.60
    period 3  Na 227  Mg 173  Al 184  Si 210  P 180  S 180  Cl 175  Ar 188
              steps against the trend: 4 of 7 Mg>Al Al>Si P>S Cl>Ar   rank agreement 0.20
    period 4  K 275  Ca 231  Ga 187  Ge 211  As 185  Se 190  Br 183  Kr 202
              steps against the trend: 3 of 7 Ga>Ge As>Se Br>Kr   rank agreement 0.62
    period 5  Rb 303  Sr 249  In 193  Sn 217  Sb 206  Te 206  I 198  Xe 216
              steps against the trend: 3 of 7 In>Sn Sb>Te I>Xe   rank agreement 0.49
    period 6  Cs 343  Ba 268  Tl 196  Pb 202  Bi 207  Po 197  At 202  Rn 220
              steps against the trend: 4 of 7 Tl>Pb Pb>Bi Po>At At>Rn   rank agreement 0.32
    across, periods 2-6 together: 16 of 35 steps go against the trend (46%)
    group 1   Li 182  Na 227  K 275  Rb 303  Cs 343   against: none
    group 2   Be 153  Mg 173  Ca 231  Sr 249  Ba 268   against: none
    group 13  B 192  Al 184  Ga 187  In 193  Tl 196   against: B/Al
    group 14  C 170  Si 210  Ge 211  Sn 217  Pb 202   against: Sn/Pb
    group 15  N 155  P 180  As 185  Sb 206  Bi 207   against: none
    group 16  O 152  S 180  Se 190  Te 206  Po 197   against: Te/Po
    group 17  F 135  Cl 175  Br 183  I 198  At 202   against: none
    group 18  He 140  Ne 154  Ar 188  Kr 202  Xe 216  Rn 220   against: none
    down, groups 1, 2, 13-18 (to period 6): 3 of 33 steps go against the trend (9%)
====================================================================================================
IonizationEnergy (eV)
  values: 102   missing: 16   Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 3.894 (Cs)   max 24.587 (He)   max/min 6.31
  quartiles: 5% 5.1721 | 25% 6.0205 | median 6.96 | 75% 8.9985 | 95% 13.9809 | mean 7.997
  LINEAR shade 0..1, elements per tenth of the scale: [22, 47, 16, 8, 4, 2, 1, 0, 1, 1]
     share of elements in the darkest half: 5%; in the lightest tenth: 22%; median shade 0.148
  LOG shade    0..1, elements per tenth of the scale: [4, 11, 34, 20, 15, 7, 6, 2, 1, 2]   median shade 0.315
  largest gaps between neighbouring values: 17.423 -> 21.565 (20% of range); 21.565 -> 24.587 (15% of range); 15.76 -> 17.423 (8% of range); 14.534 -> 15.76 (6% of range)
  five lowest: Cs 3.894, Fr 3.9, Rb 4.177, K 4.341, Na 5.139
  five highest: He 24.587, Ne 21.565, F 17.423, Ar 15.76, N 14.534
  repeated values: 1   decimals published: [0, 1, 2, 3]
  textbook trend: rises across a period, falls down a group
    period 2  Li 5.392  Be 9.323  B 8.298  C 11.26  N 14.534  O 13.618  F 17.423  Ne 21.565
              steps against the trend: 2 of 7 Be>B N>O   rank agreement 0.95
    period 3  Na 5.139  Mg 7.646  Al 5.986  Si 8.152  P 10.487  S 10.36  Cl 12.968  Ar 15.76
              steps against the trend: 2 of 7 Mg>Al P>S   rank agreement 0.95
    period 4  K 4.341  Ca 6.113  Ga 5.999  Ge 7.9  As 9.815  Se 9.752  Br 11.814  Kr 14
              steps against the trend: 2 of 7 Ca>Ga As>Se   rank agreement 0.95
    period 5  Rb 4.177  Sr 5.695  In 5.786  Sn 7.344  Sb 8.64  Te 9.01  I 10.451  Xe 12.13
              steps against the trend: 0 of 7    rank agreement 1.00
    period 6  Cs 3.894  Ba 5.212  Tl 6.108  Pb 7.417  Bi 7.289  Po 8.417  At 9.5  Rn 10.745
              steps against the trend: 1 of 7 Pb>Bi   rank agreement 0.98
    across, periods 2-6 together: 7 of 35 steps go against the trend (20%)
    group 1   Li 5.392  Na 5.139  K 4.341  Rb 4.177  Cs 3.894   against: none
    group 2   Be 9.323  Mg 7.646  Ca 6.113  Sr 5.695  Ba 5.212   against: none
    group 13  B 8.298  Al 5.986  Ga 5.999  In 5.786  Tl 6.108   against: Al/Ga In/Tl
    group 14  C 11.26  Si 8.152  Ge 7.9  Sn 7.344  Pb 7.417   against: Sn/Pb
    group 15  N 14.534  P 10.487  As 9.815  Sb 8.64  Bi 7.289   against: none
    group 16  O 13.618  S 10.36  Se 9.752  Te 9.01  Po 8.417   against: none
    group 17  F 17.423  Cl 12.968  Br 11.814  I 10.451  At 9.5   against: none
    group 18  He 24.587  Ne 21.565  Ar 15.76  Kr 14  Xe 12.13  Rn 10.745   against: none
    down, groups 1, 2, 13-18 (to period 6): 3 of 33 steps go against the trend (9%)
====================================================================================================
MeltingPoint (K)
  values: 103   missing: 15   Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 0.95 (He)   max 3823 (C)   max/min 4.02e+03
  quartiles: 5% 65.215 | 25% 516.04 | median 1191 | 75% 1806.5 | 95% 2881.4 | mean 1274
  LINEAR shade 0..1, elements per tenth of the scale: [20, 14, 16, 15, 18, 8, 4, 3, 2, 3]
     share of elements in the darkest half: 19%; in the lightest tenth: 19%; median shade 0.311
  LOG shade    0..1, elements per tenth of the scale: [1, 0, 0, 2, 2, 3, 9, 17, 35, 34]   median shade 0.859
  largest gaps between neighbouring values: 2896 -> 3290 (10% of range); 3459 -> 3695 (6% of range); 722.66 -> 903.78 (5% of range); 3306 -> 3459 (4% of range)
  five lowest: He 0.95, H 13.81, Ne 24.56, F 53.53, O 54.36
  five highest: C 3823, W 3695, Re 3459, Os 3306, Ta 3290
  repeated values: 1   decimals published: [0, 1, 2, 3]
  (no single across-period trend is taught; period 2 and 3 rise to group 14 then collapse)
    period 2  Li 453.65  Be 1560  B 2348  C 3823  N 63.15  O 54.36  F 53.53  Ne 24.56
    period 3  Na 370.95  Mg 923  Al 933.437  Si 1687  P 317.3  S 388.36  Cl 171.65  Ar 83.8
    period 4  K 336.53  Ca 1115  Sc 1814  Ti 1941  V 2183  Cr 2180  Mn 1519  Fe 1811  Co 1768  Ni 1728  Cu 1357.77  Zn 692.68  Ga 302.91  Ge 1211.4  As 1090  Se 493.65  Br 265.95  Kr 115.79
    period 5  Rb 312.46  Sr 1050  Y 1795  Zr 2128  Nb 2750  Mo 2896  Tc 2430  Ru 2607  Rh 2237  Pd 1828.05  Ag 1234.93  Cd 594.22  In 429.75  Sn 505.08  Sb 903.78  Te 722.66  I 386.85  Xe 161.36
    period 6  Cs 301.59  Ba 1000  Hf 2506  Ta 3290  W 3695  Re 3459  Os 3306  Ir 2719  Pt 2041.55  Au 1337.33  Hg 234.32  Tl 577  Pb 600.61  Bi 544.55  Po 527  At 575  Rn 202
    group 1 (falls down the group): Li 453.65  Na 370.95  K 336.53  Rb 312.46  Cs 301.59  Fr 300
    group 17 (rises down the group): F 53.53  Cl 171.65  Br 265.95  I 386.85  At 575
    group 18 (rises down the group): He 0.95  Ne 24.56  Ar 83.8  Kr 115.79  Xe 161.36  Rn 202
    melting point above boiling point (impossible at one pressure): As mp 1090 bp 887
====================================================================================================
Density (g/cm3)
  values: 96   missing: 22   Fr Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 8.988e-05 (H)   max 22.57 (Os)   max/min 2.51e+05
  quartiles: 5% 0.00162925 | 25% 2.5725 | median 7.072 | 75% 10.2752 | 95% 19.9425 | mean 7.608
  LINEAR shade 0..1, elements per tenth of the scale: [21, 10, 14, 20, 9, 9, 3, 1, 5, 4]
     share of elements in the darkest half: 23%; in the lightest tenth: 22%; median shade 0.313
  LOG shade    0..1, elements per tenth of the scale: [2, 1, 6, 2, 0, 0, 1, 7, 22, 55]   median shade 0.907
  largest gaps between neighbouring values: 16.4 -> 18.95 (11% of range); 14 -> 15.37 (6% of range); 15.37 -> 16.4 (5% of range); 21.46 -> 22.42 (4% of range)
  five lowest: H 8.988e-05, He 0.0001785, Ne 0.0008999, N 0.0012506, O 0.001429
  five highest: Os 22.57, Ir 22.42, Pt 21.46, Re 20.8, Np 20.25
  repeated values: 2   decimals published: [0, 1, 2, 3, 4, 5, 6, 7, 8]
  gases (11): H 8.988e-05, He 0.0001785, Ne 0.0008999, N 0.0012506, O 0.001429, F 0.001696, Ar 0.0017837, Cl 0.003214, Kr 0.003733, Xe 0.005887, Rn 0.00973
  lightest condensed elements: Li 0.534, K 0.89, Na 0.97, Rb 1.53, Ca 1.54
  gap between the densest gas and the lightest solid: 0.00973 -> 0.534 g/cm3 (factor 55)
  LINEAR: every gas shades below 0.00043 (indistinguishable from each other and from 0); lithium shades 0.024
  LOG: gases span shade 0.00..0.38, then an empty band up to lithium at 0.70; all 85 condensed elements are squeezed into 0.70..1.00
  LINEAR over condensed elements only (0.534..22.57): elements per tenth [15, 7, 16, 19, 7, 9, 2, 1, 5, 4]
    period 4  K 0.89  Ca 1.54  Sc 2.99  Ti 4.5  V 6  Cr 7.15  Mn 7.3  Fe 7.874  Co 8.86  Ni 8.912  Cu 8.933  Zn 7.134  Ga 5.91  Ge 5.323  As 5.776  Se 4.809  Br 3.11  Kr 0.003733
    period 5  Rb 1.53  Sr 2.64  Y 4.47  Zr 6.52  Nb 8.57  Mo 10.2  Tc 11  Ru 12.1  Rh 12.4  Pd 12  Ag 10.501  Cd 8.69  In 7.31  Sn 7.287  Sb 6.685  Te 6.232  I 4.93  Xe 0.005887
    period 6  Cs 1.93  Ba 3.62  Hf 13.3  Ta 16.4  W 19.3  Re 20.8  Os 22.57  Ir 22.42  Pt 21.46  Au 19.282  Hg 13.5336  Tl 11.8  Pb 11.342  Bi 9.807  Po 9.32  At 7  Rn 0.00973
====================================================================================================
BoilingPoint (K)   [not a trend property in the spec; shown for the card]
  values: 93   missing: 25   At Fr Pa Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 4.22 (He)   max 5869 (Re)   max/min 1.39e+03
  quartiles: 5% 86.392 | 25% 1180 | median 2792 | 75% 3618 | 95% 5034.6 | mean 2536
  LINEAR shade 0..1, elements per tenth of the scale: [14, 9, 10, 10, 7, 16, 12, 6, 5, 4]
     share of elements in the darkest half: 46%; in the lightest tenth: 15%; median shade 0.475
  LOG shade    0..1, elements per tenth of the scale: [1, 0, 2, 0, 5, 3, 4, 12, 22, 44]   median shade 0.897
  largest gaps between neighbouring values: 5285 -> 5731 (8% of range); 2477 -> 2744 (5% of range); 5061 -> 5285 (4% of range); 4701 -> 4876 (3% of range)
  five lowest: He 4.22, H 20.28, Ne 27.07, N 77.36, F 85.03
  five highest: Re 5869, W 5828, Ta 5731, Os 5285, Th 5061
  repeated values: 1   decimals published: [0, 1, 2]
====================================================================================================
ElectronAffinity (eV)   [not a trend property in the spec; shown for the card]
  values: 57   missing: 61   He Be N Ne Mg Ar Ca Mn Zn Kr Sr Cd Xe Ba Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Hg Rn Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
  min 0.079 (Ti)   max 3.617 (Cl)   max/min 45.8
  quartiles: 5% 0.183 | 25% 0.47 | median 0.754 | 75% 1.35 | 95% 3.115 | mean 1.072
  LINEAR shade 0..1, elements per tenth of the scale: [12, 17, 8, 8, 1, 5, 1, 1, 1, 3]
     share of elements in the darkest half: 19%; in the lightest tenth: 21%; median shade 0.191
  LOG shade    0..1, elements per tenth of the scale: [1, 2, 2, 6, 9, 9, 8, 9, 6, 5]   median shade 0.590
  largest gaps between neighbouring values: 2.309 -> 2.8 (14% of range); 1.565 -> 1.9 (9% of range); 3.059 -> 3.339 (8% of range); 2.8 -> 3.059 (7% of range)
  five lowest: Ti 0.079, Re 0.15, Fe 0.163, Sc 0.188, Tl 0.2
  five highest: Cl 3.617, Br 3.365, F 3.339, I 3.059, At 2.8
  repeated values: 3   decimals published: [1, 2, 3]
====================================================================================================
Atomic radius: PubChem table column (van der Waals) against the covalent radius printed in PubChem's own element records
  elements with a covalent radius in the PubChem element record: 96 (Z = 1..96); first value used where several are given (C sp3, Mn/Fe/Co low spin)
  covalent: min 28 (He) max 260 (Fr); linear tenths [2, 4, 3, 10, 24, 17, 14, 16, 4, 2]
-- covalent radius --
  textbook trend: falls across a period, rises down a group
    period 2  Li 128  Be 96  B 84  C 76  N 71  O 66  F 57  Ne 58
              steps against the trend: 1 of 7 F>Ne   rank agreement 0.98
    period 3  Na 166  Mg 141  Al 121  Si 111  P 107  S 105  Cl 102  Ar 106
              steps against the trend: 1 of 7 Cl>Ar   rank agreement 0.93
    period 4  K 203  Ca 176  Ga 122  Ge 120  As 119  Se 120  Br 120  Kr 116
              steps against the trend: 2 of 7 As>Se Se>Br   rank agreement 0.88
    period 5  Rb 220  Sr 195  In 142  Sn 139  Sb 139  Te 138  I 139  Xe 140
              steps against the trend: 3 of 7 Sn>Sb Te>I I>Xe   rank agreement 0.68
    period 6  Cs 244  Ba 215  Tl 145  Pb 146  Bi 148  Po 140  At 150  Rn 150
              steps against the trend: 4 of 7 Tl>Pb Pb>Bi Po>At At>Rn   rank agreement 0.32
    across, periods 2-6 together: 11 of 35 steps go against the trend (31%)
    group 1   Li 128  Na 166  K 203  Rb 220  Cs 244   against: none
    group 2   Be 96  Mg 141  Ca 176  Sr 195  Ba 215   against: none
    group 13  B 84  Al 121  Ga 122  In 142  Tl 145   against: none
    group 14  C 76  Si 111  Ge 120  Sn 139  Pb 146   against: none
    group 15  N 71  P 107  As 119  Sb 139  Bi 148   against: none
    group 16  O 66  S 105  Se 120  Te 138  Po 140   against: none
    group 17  F 57  Cl 102  Br 120  I 139  At 150   against: none
    group 18  He 28  Ne 58  Ar 106  Kr 116  Xe 140  Rn 150   against: none
    down, groups 1, 2, 13-18 (to period 6): 0 of 33 steps go against the trend (0%)
  rank correlation between the two radius sets over 96 elements: 0.86
  d-block rows, van der Waals column:
    period 4 vdW      Sc 211  Ti 187  V 179  Cr 189  Mn 197  Fe 194  Co 192  Ni 163  Cu 140  Zn 139
    period 4 covalent Sc 170  Ti 160  V 153  Cr 139  Mn 139  Fe 132  Co 126  Ni 124  Cu 132  Zn 122
    period 5 vdW      Y 219  Zr 186  Nb 207  Mo 209  Tc 209  Ru 207  Rh 195  Pd 202  Ag 172  Cd 158
    period 5 covalent Y 190  Zr 175  Nb 164  Mo 154  Tc 147  Ru 146  Rh 142  Pd 139  Ag 145  Cd 144
    period 6 vdW      Hf 212  Ta 217  W 210  Re 217  Os 216  Ir 202  Pt 209  Au 166  Hg 209
    period 6 covalent Hf 175  Ta 170  W 162  Re 151  Os 144  Ir 141  Pt 136  Au 136  Hg 132
  lanthanides vdW      La 240  Ce 235  Pr 239  Nd 229  Pm 236  Sm 229  Eu 233  Gd 237  Tb 221  Dy 229  Ho 216  Er 235  Tm 227  Yb 242  Lu 221
  lanthanides covalent La 207  Ce 204  Pr 203  Nd 201  Pm 199  Sm 198  Eu 198  Gd 196  Tb 194  Dy 192  Ho 192  Er 189  Tm 190  Yb 187  Lu 187
  largest single-step jumps in the van der Waals column between neighbours in a period:
    Cs 343 -> Ba 268; Fr 348 -> Ra 283; Rb 303 -> Sr 249; Na 227 -> Mg 173; Zn 139 -> Ga 187; K 275 -> Ca 231; Au 166 -> Hg 209; Pt 209 -> Au 166
```

## Appendix D. Categories and card fields: `categories.py`

```text
== A. Category of every element: PubChem table (GroupBlock) | PubChem element record (Jefferson Lab) | OpenStax Fig. 2.26 ==
PubChem categories and counts: {'Nonmetal': 7, 'Noble gas': 7, 'Alkali metal': 6, 'Alkaline earth metal': 6, 'Metalloid': 7, 'Halogen': 6, 'Post-transition metal': 11, 'Transition metal': 38, 'Lanthanide': 15, 'Actinide': 15} total 118
  1 H  g1    Nonmetal               | Non-metal  | nonmetal      
  2 He g18   Noble gas              | Non-metal  | nonmetal      
  3 Li g1    Alkali metal           | Metal      | metal         
  4 Be g2    Alkaline earth metal   | Metal      | metal         
  5 B  g13   Metalloid              | Semi-metal | metalloid     
  6 C  g14   Nonmetal               | Non-metal  | nonmetal      
  7 N  g15   Nonmetal               | Non-metal  | nonmetal      
  8 O  g16   Nonmetal               | Non-metal  | nonmetal      
  9 F  g17   Halogen                | Non-metal  | nonmetal      
 10 Ne g18   Noble gas              | Non-metal  | nonmetal      
 11 Na g1    Alkali metal           | Metal      | metal         
 12 Mg g2    Alkaline earth metal   | Metal      | metal         
 13 Al g13   Post-transition metal  | Metal      | metal         
 14 Si g14   Metalloid              | Semi-metal | metalloid     
 15 P  g15   Nonmetal               | Non-metal  | nonmetal      
 16 S  g16   Nonmetal               | Non-metal  | nonmetal      
 17 Cl g17   Halogen                | Non-metal  | nonmetal      
 18 Ar g18   Noble gas              | Non-metal  | nonmetal      
 19 K  g1    Alkali metal           | Metal      | metal         
 20 Ca g2    Alkaline earth metal   | Metal      | metal         
 21 Sc g3    Transition metal       | Metal      | metal         
 22 Ti g4    Transition metal       | Metal      | metal         
 23 V  g5    Transition metal       | Metal      | metal         
 24 Cr g6    Transition metal       | Metal      | metal         
 25 Mn g7    Transition metal       | Metal      | metal         
 26 Fe g8    Transition metal       | Metal      | metal         
 27 Co g9    Transition metal       | Metal      | metal         
 28 Ni g10   Transition metal       | Metal      | metal         
 29 Cu g11   Transition metal       | Metal      | metal         
 30 Zn g12   Transition metal       | Metal      | metal         
 31 Ga g13   Post-transition metal  | Metal      | metal         
 32 Ge g14   Metalloid              | Semi-metal | metalloid     
 33 As g15   Metalloid              | Semi-metal | metalloid     
 34 Se g16   Nonmetal               | Non-metal  | nonmetal      
 35 Br g17   Halogen                | Non-metal  | nonmetal      
 36 Kr g18   Noble gas              | Non-metal  | nonmetal      
 37 Rb g1    Alkali metal           | Metal      | metal         
 38 Sr g2    Alkaline earth metal   | Metal      | metal         
 39 Y  g3    Transition metal       | Metal      | metal         
 40 Zr g4    Transition metal       | Metal      | metal         
 41 Nb g5    Transition metal       | Metal      | metal         
 42 Mo g6    Transition metal       | Metal      | metal         
 43 Tc g7    Transition metal       | Metal      | metal         
 44 Ru g8    Transition metal       | Metal      | metal         
 45 Rh g9    Transition metal       | Metal      | metal         
 46 Pd g10   Transition metal       | Metal      | metal         
 47 Ag g11   Transition metal       | Metal      | metal         
 48 Cd g12   Transition metal       | Metal      | metal         
 49 In g13   Post-transition metal  | Metal      | metal         
 50 Sn g14   Post-transition metal  | Metal      | metal         
 51 Sb g15   Metalloid              | Semi-metal | metalloid     
 52 Te g16   Metalloid              | Semi-metal | metalloid     
 53 I  g17   Halogen                | Non-metal  | nonmetal      
 54 Xe g18   Noble gas              | Non-metal  | nonmetal      
 55 Cs g1    Alkali metal           | Metal      | metal         
 56 Ba g2    Alkaline earth metal   | Metal      | metal         
 57 La g-    Lanthanide             | Metal      | metal         
 58 Ce g-    Lanthanide             | Metal      | metal         
 59 Pr g-    Lanthanide             | Metal      | metal         
 60 Nd g-    Lanthanide             | Metal      | metal         
 61 Pm g-    Lanthanide             | Metal      | metal         
 62 Sm g-    Lanthanide             | Metal      | metal         
 63 Eu g-    Lanthanide             | Metal      | metal         
 64 Gd g-    Lanthanide             | Metal      | metal         
 65 Tb g-    Lanthanide             | Metal      | metal         
 66 Dy g-    Lanthanide             | Metal      | metal         
 67 Ho g-    Lanthanide             | Metal      | metal         
 68 Er g-    Lanthanide             | Metal      | metal         
 69 Tm g-    Lanthanide             | Metal      | metal         
 70 Yb g-    Lanthanide             | Metal      | metal         
 71 Lu g-    Lanthanide             | Metal      | metal         
 72 Hf g4    Transition metal       | Metal      | metal         
 73 Ta g5    Transition metal       | Metal      | metal         
 74 W  g6    Transition metal       | Metal      | metal         
 75 Re g7    Transition metal       | Metal      | metal         
 76 Os g8    Transition metal       | Metal      | metal         
 77 Ir g9    Transition metal       | Metal      | metal         
 78 Pt g10   Transition metal       | Metal      | metal         
 79 Au g11   Transition metal       | Metal      | metal         
 80 Hg g12   Transition metal       | Metal      | metal         
 81 Tl g13   Post-transition metal  | Metal      | metal         
 82 Pb g14   Post-transition metal  | Metal      | metal         
 83 Bi g15   Post-transition metal  | Metal      | metal         
 84 Po g16   Metalloid              | Metal      | metal         <-- OpenStax says metal; PubChem record says Metal
 85 At g17   Halogen                | Semi-metal | metalloid     <-- OpenStax says metalloid; PubChem record says Semi-metal
 86 Rn g18   Noble gas              | Non-metal  | nonmetal      
 87 Fr g1    Alkali metal           | Metal      | metal         
 88 Ra g2    Alkaline earth metal   | Metal      | metal         
 89 Ac g-    Actinide               | Metal      | metal         
 90 Th g-    Actinide               | Metal      | metal         
 91 Pa g-    Actinide               | Metal      | metal         
 92 U  g-    Actinide               | Metal      | metal         
 93 Np g-    Actinide               | Metal      | metal         
 94 Pu g-    Actinide               | Metal      | metal         
 95 Am g-    Actinide               | Metal      | metal         
 96 Cm g-    Actinide               | Metal      | metal         
 97 Bk g-    Actinide               | Metal      | metal         
 98 Cf g-    Actinide               | Metal      | metal         
 99 Es g-    Actinide               | Metal      | metal         
100 Fm g-    Actinide               | Metal      | metal         
101 Md g-    Actinide               | Metal      | metal         
102 No g-    Actinide               | Metal      | metal         
103 Lr g-    Actinide               | Metal      | metal         
104 Rf g4    Transition metal       | Metal      | metal         
105 Db g5    Transition metal       | Metal      | metal         
106 Sg g6    Transition metal       | Metal      | metal         
107 Bh g7    Transition metal       | Metal      | metal         
108 Hs g8    Transition metal       | Metal      | metal         
109 Mt g9    Transition metal       | Metal      | not indicated <-- OpenStax leaves unclassified
110 Ds g10   Transition metal       | Metal      | not indicated <-- OpenStax leaves unclassified
111 Rg g11   Transition metal       | Metal      | not indicated <-- OpenStax leaves unclassified
112 Cn g12   Transition metal       | Metal      | metal         
113 Nh g13   Post-transition metal  | Metal      | not indicated <-- OpenStax leaves unclassified
114 Fl g14   Post-transition metal  | Metal      | not indicated <-- OpenStax leaves unclassified
115 Mc g15   Post-transition metal  | Metal      | not indicated <-- OpenStax leaves unclassified
116 Lv g16   Post-transition metal  | Metal      | not indicated <-- OpenStax leaves unclassified
117 Ts g17   Halogen                | (none)     | not indicated <-- OpenStax leaves unclassified
118 Og g18   Noble gas              | Non-metal  | not indicated <-- OpenStax leaves unclassified
OpenStax figure entries read: 118

== B. Members of each PubChem category ==
  Alkali metal            6  Li Na K Rb Cs Fr
  Alkaline earth metal    6  Be Mg Ca Sr Ba Ra
  Transition metal       38  Sc Ti V Cr Mn Fe Co Ni Cu Zn Y Zr Nb Mo Tc Ru Rh Pd Ag Cd Hf Ta W Re Os Ir Pt Au Hg Rf Db Sg Bh Hs Mt Ds Rg Cn
  Post-transition metal  11  Al Ga In Sn Tl Pb Bi Nh Fl Mc Lv
  Metalloid               7  B Si Ge As Sb Te Po
  Nonmetal                7  H C N O P S Se
  Halogen                 6  F Cl Br I At Ts
  Noble gas               7  He Ne Ar Kr Xe Rn Og
  Lanthanide             15  La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu
  Actinide               15  Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr
  metalloids, OpenStax Fig. 2.26: B Si Ge As Sb Te At
  metalloids, PubChem element records ("Semi-metal"): B Si Ge As Sb Te At
  nonmetals by OpenStax Fig. 2.26 (17): H He C N O F Ne P S Cl Ar Se Br Kr I Xe Rn
  PubChem "Nonmetal" + "Halogen" + "Noble gas" = 20 elements; PubChem "Nonmetal" alone = 7
  OpenStax "not indicated": Mt Ds Rg Nh Fl Mc Lv Ts Og

== C. Does each category coincide with a group or block? ==
  Alkali metal           same set
  Alkaline earth metal   same set
  Halogen                same set
  Noble gas              same set
  Transition metal       same set
  Lanthanide             same set
  Actinide               same set
  block rule A: lanthanide/actinide category vs block f -> in category but block d: Lu Lr
  block rule B: lanthanide/actinide category vs block f -> in category but block d: La Ac

== D. Element card: oxidation-state text ==
  empty: Nh
  written without signs on positive states: At Db Sg Bh Hs Mt Ds Rg Cn Fl Mc Og
  irregular spacing: Fl "6, 4,2, 1, 0"
  noble gases: He "0", Ne "0", Ar "0", Kr "0", Xe "0", Rn "0", Og "+6, +4, +2, +1, 0, -1"
  the fuller list in PubChem's own element record (Los Alamos) for Kr, Xe, Rn, O, C, H, F:
     Kr table "0" | record: Jefferson Lab: 0 || Los Alamos National Laboratory: 2, 1, 0 (rarely more than 0; unknown oxide)
     Xe table "0" | record: Jefferson Lab: 0 || Los Alamos National Laboratory: 0, +1, +2, +4, +6, +8 (rarely more than 0; a weakly acidic oxide)
     Rn table "0" | record: Jefferson Lab: 0 || Los Alamos National Laboratory: 6, 2, 0
     O  table "-2" | record: Jefferson Lab: -2 || Los Alamos National Laboratory: 2, 1, -1, -2
     C  table "+4, +2, -4" | record: Jefferson Lab: +4, +2, -4 || Los Alamos National Laboratory: +4, +3, +2, +1,0, -1, -2, -3, -4 (a mildly acidic oxide)
     H  table "+1, -1" | record: Jefferson Lab: +1, -1 || Los Alamos National Laboratory: -1, +1 (an amphoteric oxide)
     F  table "-1" | record: Jefferson Lab: -1 || Los Alamos National Laboratory: -1 (oxidizes oxygen)
  states marked as predictions in the element record but printed bare in the table download:
     105 Db table "5, 4, 3" | record "5, (4), (3) (parenthesized oxidation states are predictions)"
     106 Sg table "6, 5, 4, 3, 0" | record "6, (5), (4), (3), 0 (parenthesized oxidation states are predictions)"
     107 Bh table "7, 5, 4, 3" | record "7, (5), (4), (3) (parenthesized oxidation states are predictions)"
     108 Hs table "8, 6, 5, 4, 3, 2" | record "8, (6), (5), (4), (3), (2)(parenthesized oxidation states are predictions)"
     109 Mt table "9, 8, 6, 4, 3, 1" | record "9, 8, 6, 4, 3, 1 (predicted)"
     110 Ds table "8, 6, 4, 2, 0" | record "8, 6, 4, 2, 0 (predicted)"
     111 Rg table "5, 3, 1, -1" | record "5, 3, 1, -1 (predicted)"
     112 Cn table "2, 1, 0" | record "2, (1), 0 (parenthesized oxidation states are predictions)"
     114 Fl table "6, 4,2, 1, 0" | record "0, 1, 2, 4, 6 (predicted)"
     115 Mc table "3, 1" | record "1, 3 (prediction)"
     116 Lv table "+4, +2, -2" | record "-2,+2, +4 (predicted)"
     117 Ts table "+5, +3, +1, -1" | record "-1, +1, +3, +5 (predicted)"
     118 Og table "+6, +4, +2, +1, 0, -1" | record "-1, 0, +1,+2,+4, +6 (predicted)"
  library molecules whose element is in a state the PubChem text does not list (worked by hand, simple compounds only):
     xenon-tetrafluoride        Xe +4  in library: True | PubChem lists "0" -> NOT LISTED
     hydrogen-peroxide          O  -1  in library: True | PubChem lists "-2" -> NOT LISTED
     oxygen                     O  0   in library: True | PubChem lists "-2" -> NOT LISTED
     nitrogen                   N  0   in library: True | PubChem lists "+5, +4, +3, +2, +1, -1, -2, -3" -> NOT LISTED
     ethane                     C  -3  in library: True | PubChem lists "+4, +2, -4" -> NOT LISTED
     sulfur-dioxide             S  +4  in library: True | PubChem lists "+6, +4, -2" -> listed
     sulfur-hexafluoride        S  +6  in library: True | PubChem lists "+6, +4, -2" -> listed
     phosphorus-pentachloride   P  +5  in library: True | PubChem lists "+5, +3, -3" -> listed
     boron-trifluoride          B  +3  in library: True | PubChem lists "+3" -> listed
     ammonia                    N  -3  in library: True | PubChem lists "+5, +4, +3, +2, +1, -1, -2, -3" -> listed
     methane                    C  -4  in library: True | PubChem lists "+4, +2, -4" -> listed
     carbon-dioxide             C  +4  in library: True | PubChem lists "+4, +2, -4" -> listed

== E. Element card: electron affinity ==
  sign: every listed value is positive (57 values, min 0.079): True
  halogens: F 3.339 eV = 322 kJ/mol, Cl 3.617 eV = 349 kJ/mol, Br 3.365 eV = 325 kJ/mol, I 3.059 eV = 295 kJ/mol  (OpenStax Fig. 6.35 prints F -322, Cl -348: same size, opposite sign)
  empty among Z <= 86: He Be N Ne Mg Ar Ca Mn Zn Kr Sr Cd Xe Ba Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Hg Rn
  empty among Z <= 86, split: in groups 2, 12, 18, or N, Mn (filled or half-filled subshells; OpenStax 6.5 names groups 2, 15 and 18 as the exceptions): He Be N Ne Mg Ar Ca Mn Zn Kr Sr Cd Xe Ba Hg Rn
     other: Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf
  values PubChem's element record gives where the table is empty (He, N, Be):
     He 0 eV || -0.22 eV
     N  0 eV || -0.21 eV
     Be 0 eV || 0.38 eV
     Ne 0 eV || -0.3 eV

== F. Element card: standard state, melting, boiling, density ==
  states: {'Gas': 11, 'Solid': 96, 'Liquid': 2, 'Expected to be a Solid': 8, 'Expected to be a Gas': 1}
  plain "Solid" with no melting point, boiling point or density in the table (nothing measured in bulk): Rf Db Sg Bh Hs Mt
  "Expected to be ...": Ds Expected to be a Solid, Rg Expected to be a Solid, Cn Expected to be a Solid, Nh Expected to be a Solid, Fl Expected to be a Solid, Mc Expected to be a Solid, Lv Expected to be a Solid, Ts Expected to be a Solid, Og Expected to be a Gas
  melting point given but boiling point and density both empty: Fr mp 300 Cf mp 1173 Es mp 1133 Fm mp 1800 Md mp 1100 No mp 1100 Lr mp 1900
  melting points listed for astatine, francium and the elements from fermium up (none has been prepared as a weighable sample of the element): At 575 K, Fr 300 K, Fm 1800 K, Md 1100 K, No 1100 K, Lr 1900 K
  density with one significant figure: At 7, Ra 5
  melting above boiling: As mp 1090 K, bp 887 K
  helium: mp 0.95 K, bp 4.22 K; carbon: mp 3823 K, bp 4098 K (liquid range 275 K)
  rows that depend on the allotrope (which allotrope is the reviewer's reading, not stated in the download): C density 2.2670, mp 3823; P mp 317.3, bp 553.65, density 1.82; Sn density 7.287; S mp 388.36
  gas densities are per cm3 at 0 C and 1 atm: H 0.00008988 g/cm3 = 0.08988 g/L; ideal-gas H2 at 273.15 K, 1 atm = 0.08994 g/L
  "Liquid": Br Hg | melting points within 10 K of room temperature (298 K): Ga 302.91 K, Cs 301.59 K, Fr 300 K

== G. Element card: year discovered ==
  "Ancient" (13): C Al S Ca Fe Cu As Ag Sn Sb Au Hg Pb
  empty: none
  earliest dated: P 1669, F 1670, Co 1735, Pt 1735, Zn 1746, Ni 1751, Bi 1753, H 1766
  Al table "Ancient" | PubChem record (CIAAW text), in this project's words: the name comes from the Latin for alum; the element was known in prehistoric times; impure aluminium was isolated by Hans Christian Oersted in 1825, and the pure metal later by a German chemist (the line is cut short here)
  Ca table "Ancient" | PubChem record (CIAAW text), in this project's words: the name comes from the Latin calx (lime, limestone); Humphry Davy first isolated the element in 1808, helped by Jöns Jacob Berzelius and the Swedish court physician M. M. af Pontin
  F  table "1670" | PubChem record (CIAAW text), in this project's words: the name comes from the Latin fluere (to flow), fluorite having served as a flux in metallurgy; Carl-Wilhelm Scheele found the element in hydrofluoric acid in 1771, and a French pharmacist and chemist first isolated it in 1886 (the line is cut short here)
  Si table "1854" | PubChem record (CIAAW text), in this project's words: the name comes from the Latin for flint; Jöns Jacob Berzelius found amorphous silicon in 1824, and Henri Sainte-Claire Deville first made crystalline silicon in 1854
  Zn table "1746" | PubChem record (CIAAW text), in this project's words: the name comes from the German zink, of unknown origin; zinc compounds served in prehistoric times to heal wounds and sore eyes and to make brass, and zinc was known as a metal by 1374
  Bi table "1753" | PubChem record (CIAAW text), in this project's words: the name comes from the German for white mass, after the colour of its oxides; the ancients did not tell bismuth from lead, and Claude-Francois Geoffroy showed in 1753 that the two differ
  He table "1868" | PubChem record (CIAAW text), in this project's words: the name comes from the Greek helios (sun); Pierre-Jules-Cesar Janssen found the element by spectroscopy in the sun's chromosphere during a solar eclipse in 1868, and Joseph Norman Lockyer found and named it independently (the line goes on)
```

## Appendix E. Counting claims in the descriptions: `descriptions_check.py`

```text
== Claim: in groups 1, 2 and 13-18 the outer-shell (highest n) electron count is the group number (1, 2) or group number minus 10 ==
  exceptions: He (group 18, outer shell 2)
== Claim: in groups 3-12 the outer s electrons plus the (n-1)d electrons total the group number ==
  exceptions: none
== Claim: every element of period n has electrons in shell n and none in a higher shell ==
  exceptions: Pd
== Period facts to generate the seven period descriptions (derived from the table itself) ==
  period 1:  2 elements, Hydrogen (Z=1) to Helium (Z=2); subshells filled across it: 1s (capacity 2 OK)
  period 2:  8 elements, Lithium (Z=3) to Neon (Z=10); subshells filled across it: 2s, 2p (capacity 8 OK)
  period 3:  8 elements, Sodium (Z=11) to Argon (Z=18); subshells filled across it: 3s, 3p (capacity 8 OK)
  period 4: 18 elements, Potassium (Z=19) to Krypton (Z=36); subshells filled across it: 4s, 3d, 4p (capacity 18 OK)
  period 5: 18 elements, Rubidium (Z=37) to Xenon (Z=54); subshells filled across it: 5s, 4d, 5p (capacity 18 OK)
  period 6: 32 elements, Cesium (Z=55) to Radon (Z=86); subshells filled across it: 6s, 4f, 5d, 6p (capacity 32 OK)
  period 7: 32 elements, Francium (Z=87) to Oganesson (Z=118); subshells filled across it: 7s, 5f, 6d, 7p (capacity 32 OK)
== Block facts ==
  s block: 14 elements; groups [1, 2, 18]; without a group number: none
  p block: 36 elements; groups [13, 14, 15, 16, 17, 18]; without a group number: none
  d block: 40 elements; groups [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; without a group number: Lu Lr
  f block: 28 elements; groups []; without a group number: La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No
== Elements whose ground state has no electron in the subshell their block is named for (block rule A) ==
  La (f block, [Xe]6s2 5d1); Ac (f block, [Rn]7s2 6d1); Th (f block, [Rn]7s2 6d2)
```

## Appendix F. Curated elements and atomic masses: `curated.py`, `masses.py`

```text
sym | atomic weight curated / PubChem | vdW radius curated (Mantina, pm) / PubChem AtomicRadius (pm) | covalent curated (Cordero, pm) | IE1 curated (NIST) / PubChem | configuration curated / PubChem
H  | 1.0080   / 1.0080      | 110 / 120 |  31 | 13.598434599702  / 13.598 | 1s1 / 1s1  <-- radius differs
B  | 10.81    / 10.81       | 192 / 192 |  84 | 8.298019         / 8.298  | 1s2 2s2 2p1 / [He]2s2 2p1
C  | 12.011   / 12.011      | 170 / 170 |  76 | 11.260288        / 11.260 | 1s2 2s2 2p2 / [He]2s2 2p2
N  | 14.007   / 14.007      | 155 / 155 |  71 | 14.53413         / 14.534 | 1s2 2s2 2p3 / [He] 2s2 2p3
O  | 15.999   / 15.999      | 152 / 152 |  66 | 13.618055        / 13.618 | 1s2 2s2 2p4 / [He]2s2 2p4
F  | 18.998   / 18.99840316 | 147 / 135 |  57 | 17.42282         / 17.423 | 1s2 2s2 2p5 / [He]2s2 2p5  <-- radius differs
Na | 22.990   / 22.9897693  | 227 / 227 | 166 | 5.13907696       / 5.139  | 1s2 2s2 2p6 3s1 / [Ne]3s1
P  | 30.974   / 30.97376200 | 180 / 180 | 107 | 10.486686        / 10.487 | 1s2 2s2 2p6 3s2 3p3 / [Ne]3s2 3p3
S  | 32.06    / 32.07       | 180 / 180 | 105 | 10.3600167       / 10.360 | 1s2 2s2 2p6 3s2 3p4 / [Ne]3s2 3p4
Cl | 35.45    / 35.45       | 175 / 175 | 102 | 12.967633        / 12.968 | 1s2 2s2 2p6 3s2 3p5 / [Ne]3s2 3p5
Xe | 131.29   / 131.29      | 216 / 216 | 140 | 12.1298437       / 12.130 | 1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 / [Kr]5s2 4d10 5p6

PubChem first ionization energy against NIST ASD (all elements NIST lists), differences above 1%:
   43 Tc PubChem 7.28    NIST 7.11938    +2.3%
   73 Ta PubChem 7.89    NIST 7.549571   +4.5%
   74 W  PubChem 7.98    NIST 7.86403    +1.5%
   76 Os PubChem 8.7     NIST 8.43823    +3.1%
   77 Ir PubChem 9.1     NIST 8.96702    +1.5%
   85 At PubChem 9.5     NIST 9.31751    +2.0%
   87 Fr PubChem 3.9     NIST 4.0727411  -4.2%
   89 Ac PubChem 5.17    NIST 5.380235   -3.9%
   90 Th PubChem 6.08    NIST 6.30670    -3.6%
  count above 1%: 9
  NIST has a value where PubChem is empty: Lr 4.96, Rf 6.02, Db 6.8, Sg 7.8, Bh 7.7, Hs 7.6
```

```text
OpenStax masses read: 116
Elements where PubChem, rounded to the digits OpenStax prints, does not give OpenStax's number (Z <= 92, elements with a standard atomic weight):
    3 Li PubChem 7.0          OpenStax 6.94
   12 Mg PubChem 24.305       OpenStax 24.31
   16 S  PubChem 32.07        OpenStax 32.06
   18 Ar PubChem 39.9         OpenStax 39.95
   26 Fe PubChem 55.84        OpenStax 55.85
   30 Zn PubChem 65.4         OpenStax 65.38
   64 Gd PubChem 157.25       OpenStax 157.3
   82 Pb PubChem 207          OpenStax 207.2
PubChem values with fewer significant figures than OpenStax prints:
    3 Li PubChem 7.0      OpenStax 6.94
   18 Ar PubChem 39.9     OpenStax 39.95
   30 Zn PubChem 65.4     OpenStax 65.38
   82 Pb PubChem 207      OpenStax 207.2
Elements with no stable isotope: PubChem prints an isotope mass to 5 or more figures where OpenStax prints a mass number:
  Tc 96.90636 (OpenStax 97), Pm 144.91276 (OpenStax 145), Po 208.98243 (OpenStax 209), At 209.98715 (OpenStax 210), Rn 222.01758 (OpenStax 222), Fr 223.01973 (OpenStax 223), Ra 226.02541 (OpenStax 226), Ac 227.02775 (OpenStax 227), Np 237.048172 (OpenStax ?), Pu 244.06420 (OpenStax 244), Am 243.061380 (OpenStax 243), Cm 247.07035 (OpenStax 247), Bk 247.07031 (OpenStax 247), Cf 251.07959 (OpenStax 251), Es 252.0830 (OpenStax 252), Fm 257.09511 (OpenStax 257), Md 258.09843 (OpenStax 258), No 259.10100 (OpenStax 259), Lr 266.120 (OpenStax 262), Rf 267.122 (OpenStax 267), Db 268.126 (OpenStax 270), Sg 269.128 (OpenStax 271), Bh 270.133 (OpenStax 270), Hs 269.1336 (OpenStax 277), Mt 277.154 (OpenStax 276), Ds 282.166 (OpenStax 281), Rg 282.169 (OpenStax 282), Cn 286.179 (OpenStax 285), Nh 286.182 (OpenStax 285), Fl 290.192 (OpenStax 289), Mc 290.196 (OpenStax 288), Lv 293.205 (OpenStax 293), Ts 294.211 (OpenStax 294), Og 295.216 (OpenStax 294)
```

## Appendix G. Qualifying words on PubChem's element pages: `pubchem_records.py` (second half)

The first half of this output, the radius and classification of each element, is in `out-pubchem-records.txt` in this folder; its columns also appear in Appendix D.

```text
== wording such as predicted / estimated / calculated / expected / about / unknown in the element records, by heading ==
  6 C  [Melting Point] (Los Alamos National Laboratory) 3550°C(diamond)
  6 C  [Boiling Point] (Los Alamos National Laboratory) 3800°C(sublimation)
 15 P  [Melting Point] (Los Alamos National Laboratory) 44.15(whitephosphorus)
 15 P  [Boiling Point] (Los Alamos National Laboratory) 280.5(whitephosphorus)
 33 As [Melting Point] (Los Alamos National Laboratory) ~817°C
 36 Kr [Oxidation States] (Los Alamos National Laboratory) 2, 1, 0 (rarely more than 0; unknown oxide)
 59 Pr [Ionization Energy] (NIST Physical Measurement Laboratory) 5.4702 ± 0.0004 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of signi
 85 At [Density] (Jefferson Lab) about 7 grams per cubic centimeter
 91 Pa [Ionization Energy] (NIST Physical Measurement Laboratory) 5.89 ± 0.12 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of significa
 96 Cm [Boiling Point] (Jefferson Lab) ~3400 K (~3100°C or ~5600°F)
100 Fm [Ionization Energy] (NIST Physical Measurement Laboratory) 6.50 ± 0.07 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of significa
101 Md [Ionization Energy] (NIST Physical Measurement Laboratory) 6.58 ± 0.07 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of significa
104 Rf [Atomic Radius] (Los Alamos National Laboratory) empirical: 150 pm (estimated)
104 Rf [Melting Point] (Los Alamos National Laboratory) 2400K(2100°C,3800°F)(predicted)
104 Rf [Boiling Point] (Los Alamos National Laboratory) 5800K(5500°C,9900°F)(predicted)
105 Db [Atomic Radius] (Los Alamos National Laboratory) empirical: 139 pm (estimated)
105 Db [Oxidation States] (Los Alamos National Laboratory) 5, (4), (3) (parenthesized oxidation states are predictions)
106 Sg [Atomic Radius] (Los Alamos National Laboratory) empirical: 132 pm (predicted)
106 Sg [Oxidation States] (Los Alamos National Laboratory) 6, (5), (4), (3), 0 (parenthesized oxidation states are predictions)
106 Sg [Ionization Energy] (NIST Physical Measurement Laboratory) 7.8 ± 0.5 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of significant
107 Bh [Atomic Radius] (Los Alamos National Laboratory) empirical: 128 pm (predicted)
107 Bh [Oxidation States] (Los Alamos National Laboratory) 7, (5), (4), (3) (parenthesized oxidation states are predictions)
107 Bh [Ionization Energy] (NIST Physical Measurement Laboratory) 7.7 ± 0.5 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of significant
108 Hs [Atomic Radius] (Los Alamos National Laboratory) empirical: 126 pm (estimated)
108 Hs [Oxidation States] (Los Alamos National Laboratory) 8, (6), (5), (4), (3), (2)(parenthesized oxidation states are predictions)
108 Hs [Ionization Energy] (NIST Physical Measurement Laboratory) 7.6 ± 0.5 eV  (The level was determined by interpolation or extrapolation of known experimental values or by semiempirical calculation; its absolutre accuracy is reflected in the number of significant
109 Mt [Electron Configuration] (Los Alamos National Laboratory) [Rn]7s25f146d7(calculated)
109 Mt [Atomic Radius] (Los Alamos National Laboratory) empirical: 128 pm (predicted)
109 Mt [Oxidation States] (Los Alamos National Laboratory) 9, 8, 6, 4, 3, 1 (predicted)
110 Ds [Electron Configuration] (Los Alamos National Laboratory) [Rn]7s25f146d8(predicted)
110 Ds [Atomic Radius] (Los Alamos National Laboratory) empirical: 132 pm (predicted)
110 Ds [Oxidation States] (Los Alamos National Laboratory) 8, 6, 4, 2, 0 (predicted)
110 Ds [Physical Description] (Jefferson Lab) Expected to be a Solid
111 Rg [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s2 5f14 6d9(predicted)
111 Rg [Atomic Radius] (Los Alamos National Laboratory) empirical: 138 pm (predicted)
111 Rg [Oxidation States] (Los Alamos National Laboratory) 5, 3, 1, -1 (predicted)
111 Rg [Physical Description] (Jefferson Lab) Expected to be a Solid
112 Cn [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s2 5f14 6d10(predicted)
112 Cn [Atomic Radius] (Los Alamos National Laboratory) empirical: 147 pm (predicted)
112 Cn [Oxidation States] (Los Alamos National Laboratory) 2, (1), 0 (parenthesized oxidation states are predictions)
112 Cn [Physical Description] (Jefferson Lab) Expected to be a Solid
113 Nh [Electron Configuration] (Los Alamos National Laboratory) [Rn] 5f14 6d10 7s2 7p1(predicted)
113 Nh [Atomic Radius] (Los Alamos National Laboratory) empirical: 170 pm (predicted)
113 Nh [Physical Description] (Jefferson Lab) Expected to be a Solid
113 Nh [Melting Point] (Los Alamos National Laboratory) 700K(430°C,810°F)(predicted)
113 Nh [Boiling Point] (Los Alamos National Laboratory) 1430K(1130°C,2070°F)(predicted)
114 Fl [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s27p2 5f14 6d10(predicted)
114 Fl [Atomic Radius] (Los Alamos National Laboratory) empirical: 180 pm (predicted)
114 Fl [Oxidation States] (Los Alamos National Laboratory) 0, 1, 2, 4, 6 (predicted)
114 Fl [Physical Description] (Jefferson Lab) Expected to be a Solid
114 Fl [Boiling Point] (Los Alamos National Laboratory) ~210K(~-60°C,~-80°F)
115 Mc [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s2 7p3 5f14 6d10(predicted)
115 Mc [Atomic Radius] (Los Alamos National Laboratory) empirical: 187 pm (predicted)
115 Mc [Oxidation States] (Los Alamos National Laboratory) 1, 3 (prediction)
115 Mc [Physical Description] (Jefferson Lab) Expected to be a Solid
115 Mc [Melting Point] (Los Alamos National Laboratory) 670K(400°C,750°F)(predicted)
115 Mc [Boiling Point] (Los Alamos National Laboratory) ~1400K(~1100°C,~2000°F)(predicted)
116 Lv [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s2 7p4 5f14 6d10(predicted)
116 Lv [Atomic Radius] (Los Alamos National Laboratory) empirical: 183 pm (predicted)
116 Lv [Oxidation States] (Los Alamos National Laboratory) -2,+2, +4 (predicted)
116 Lv [Physical Description] (Jefferson Lab) Expected to be a Solid
117 Ts [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s2 7p5 5f14 6d10(predicted)
117 Ts [Atomic Radius] (Los Alamos National Laboratory) empirical: 138 pm (predicted)
117 Ts [Oxidation States] (Los Alamos National Laboratory) -1, +1, +3, +5 (predicted)
117 Ts [Physical Description] (Jefferson Lab) Expected to be a Solid
117 Ts [Melting Point] (Los Alamos National Laboratory) 623–823K(350–550°C,662–1022°F)(predicted)
118 Og [Electron Configuration] (Los Alamos National Laboratory) [Rn] 7s2 7p6 5f14 6d10(predicted)
118 Og [Oxidation States] (Los Alamos National Laboratory) -1, 0, +1,+2,+4, +6 (predicted)
118 Og [Physical Description] (Jefferson Lab) Expected to be a Gas
```
