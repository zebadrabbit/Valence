# Periodic table cross-check

A comparison of the PubChem periodic table download (`docs/research/periodic-table/pubchem-periodic-table.json`, 118 elements) with other sources. This file is written by `scripts/cross-check-periodic-table.mjs` (`npm run cross-check`) from the saved copies in `docs/research/periodic-table/` (retrieved 2026-10-03); nothing is fetched, and running the script again gives the same file. Sentences headed **Remark** are a reviewer's reading of the numbers and are part of the script's text; the script checks the facts each one leans on and stops if one no longer holds. Everything else outside section 9 is computed on every run.

**Section 9 is a record, not a computation.** It holds comparisons made on 2026-10-03 against sources that, with one exception, are not kept in this repository. The script copies it in unchanged from `cross-check-recorded.md` and repeats none of it.

**What the app shows.** The first version of this report was written before any value was shown, and asked for decisions. They have been made (design spec, section 5.1): the atomic weight shown is CIAAW's for the 84 elements that have one, the first ionization energy shown is NIST's for elements 1 to 108, the covalent radius is the one on PubChem's element pages, and every other value is PubChem's periodic table as downloaded. So sections 1 and 2 no longer describe a fault in a shown value: they record how far PubChem's columns are from the values shown. No value in the download was changed.

**How agreement is judged.** Two published numbers *agree* when the more precise one, rounded to the decimals of the less precise one, gives the same digits. Rounding is done on the published text, not on floating-point numbers. A *tie* means the dropped digits are exactly 5, so the two agree under one rounding convention and not the other; ties are counted apart. The comparison recorded for melting point, boiling point and density is looser and is described in section 9.4.

## Summary

| Property | Compared with | Elements compared | Agree | Disagree | Not comparable |
| --- | --- | --- | --- | --- | --- |
| Atomic mass | Abridged Standard Atomic Weights 2024 (CIAAW) | 84 | 80, plus 2 ties (Ar, Fe) | 2 (Li, S) | 34: CIAAW gives no standard atomic weight |
| First ionization energy | NIST Atomic Spectra Database | 102 | 76 | 26, of which 9 by 0.1 eV or more | 6 that only NIST has; 10 that neither has |
| Ground-state configuration | NIST Atomic Spectra Database | 108 | 107 | 1 (Lr) | 10: not in NIST |

Electronegativity, melting point, boiling point, density and van der Waals radius were compared only with secondary transcriptions, on 2026-10-03; section 9 records the outcome. Covalent radius, electron affinity, oxidation states, year discovered and category were not compared value by value with an independent source; section 6 scans them for internal problems and section 10 lists what was not checked.

## What was decided

The first version of this report listed findings that needed a decision. Each is given here with what was decided. The decisions are recorded in the design spec (`docs/superpowers/specs/2026-10-03-periodic-table-design.md`, sections 5 to 7); the notes are authored in `decisions.json`.

1. **First ionization energy.** PubChem's column is not NIST's data: all 102 values equal the Jefferson Lab value on PubChem's own element page. 26 of them disagree with NIST, 9 by 0.1 eV or more (Tc, Ta, W, Os, Ir, At, Fr, Ac, Th). *Decided:* NIST's value is shown for elements 1 to 108, with NIST's marking where the value is not measured; PubChem's column is not shown. Section 2.
2. **Atomic mass of Lithium (Li), Sulfur (S)** differs from the CIAAW abridged value in the last printed digit, inside CIAAW's stated uncertainty. *Decided:* CIAAW's abridged value is shown for all 84 elements that have a standard atomic weight. Section 1.1.
3. **Atomic mass of 34 elements is one isotope's mass, not an atomic weight.** For every element without a CIAAW standard atomic weight PubChem prints the mass of a single isotope. For 16 of them (Lr to Og) that mass is itself an estimate, and for Ds, Cn, Og the isotope is not the one CIAAW lists as most stable. *Decided:* PubChem's number is shown, labelled as the mass of the named isotope, with a sentence that the element has no standard atomic weight, and "estimated" where it is. The 3 whose isotope CIAAW does not list are under "Unresolved". Sections 1.2 and 9.2.
4. **PubChem's radius column mixes sets of van der Waals radii**, which puts steps in the trend that are not chemistry (zinc 139 pm to gallium 187 pm; platinum 209, gold 166, mercury 209), and a van der Waals radius does not show the textbook "radius falls across a period" trend. *Decided:* the table is coloured by covalent radius, which PubChem's element pages carry for 96 elements; PubChem's column is shown on the card only, labelled "van der Waals radius", with a sentence that its values come from more than one study. Sections 6.5 and 9.6.
5. **An empty field does not always mean "not measured".** For 18 elements with an empty electron affinity, PubChem's element page gives 0 eV as its first value: the field is empty because the source says zero. The noble gases He, Ne, Ar, Rn have no electronegativity in PubChem's column, nor in the transcription it was compared with (section 9.3). *Decided:* an empty field is shown as "no value listed", never as zero and never as "not measured"; each of the 18 carries a note giving the page's 0 eV. Sections 3 and 6.8.
6. **Melting and boiling points that are not ordinary melting or boiling:** arsenic's melting point is above its boiling point, and carbon and helium do not melt at atmospheric pressure. *Decided:* the values are shown, each with a note, and the melting-point legend says that its two ends are not ordinary-pressure melting points. Section 6.2.
7. **Oxidation states are a short list of common states, not all known ones.** The noble gases He, Ne, Ar, Kr, Xe, Rn are given only "0", while the molecule library holds XeF4 (Xe), XeF2 (Xe). For 13 elements from dubnium on, the source marks states as predicted and the download has dropped the marks. *Decided:* the row is headed "Common oxidation states (PubChem's list, not complete)"; xenon, krypton, radon and oxygen carry a note; each element whose states the source marks as predictions carries a note saying which. Section 6.6.
8. **Categories a chemist would query:** polonium, astatine, group 12, and the heaviest elements. *Decided:* PubChem's ten categories are used as given; polonium and astatine carry a note; the legend says that group 12 and elements 109 to 118 are placed by position. Section 6.9.
9. **Text that the build script must handle:** a configuration ending "(calculated)" (Mt), irregular spacing, unsigned oxidation states, and the American spellings Aluminum and Cesium. *Decided:* the build moves "(predicted)" and "(calculated)" into a qualifier that stays on screen and fails on any other marking; configurations, oxidation states and names are otherwise kept as PubChem writes them. Sections 6.6, 6.7 and 6.10.
10. **Lawrencium's configuration, single values far from other tabulations, expected states that PubChem's own pages contradict, and values PubChem gives as plain facts that are predictions, estimates or untraceable.** No decision settles these; they are listed next.

## Unresolved

Disagreements between sources about a value the app shows, which no decision settles, and values that PubChem gives as plain facts although they are predictions, estimates, or cannot be traced. Each value is shown as PubChem's table has it, and the element's card carries a note on the row named here. A test (`src/chem-data/periodic.test.ts`) reads this table and fails if any row has no note.

| Z | Element | Card row | PubChem's table | Against | Section |
| --- | --- | --- | --- | --- | --- |
| 2 | Helium (He) | `covalentRadius` | 28 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 5 | Boron (B) | `density` | 2.37 g/cm³ | 2.34 g/cm³, the nearest value in other tabulations (recorded 2026-10-03) | 9.4 |
| 6 | Carbon (C) | `meltingPoint` | 3823 K | 3800 K, the nearest value in other tabulations (recorded 2026-10-03) | 9.4 |
| 10 | Neon (Ne) | `covalentRadius` | 58 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 56 | Barium (Ba) | `boilingPoint` | 2170 K | 2143 K, the nearest value in other tabulations (recorded 2026-10-03) | 9.4 |
| 61 | Promethium (Pm) | `covalentRadius` | 199 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 85 | Astatine (At) | `meltingPoint` | 575 K | no measurement: an estimate that PubChem does not mark as one | 6.2 |
| 85 | Astatine (At) | `standardState` | Solid | no sample large enough to observe: a prediction that PubChem does not word as one | 6.3 |
| 85 | Astatine (At) | `covalentRadius` | 150 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 86 | Radon (Rn) | `covalentRadius` | 150 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 87 | Francium (Fr) | `meltingPoint` | 300 K | no measurement: an estimate that PubChem does not mark as one | 6.2 |
| 87 | Francium (Fr) | `electronegativity` | 0.7 | no source: PubChem's own page for the element has no Pauling-scale line | 3 |
| 87 | Francium (Fr) | `standardState` | Solid | no sample large enough to observe: a prediction that PubChem does not word as one | 6.3 |
| 87 | Francium (Fr) | `covalentRadius` | 260 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 88 | Radium (Ra) | `boilingPoint` | 1413 K | 2010 K, the nearest value in other tabulations (recorded 2026-10-03) | 9.4 |
| 89 | Actinium (Ac) | `covalentRadius` | 215 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 91 | Protactinium (Pa) | `covalentRadius` | 200 pm (PubChem's page for the element; the table has no such column) | no uncertainty on the page, unlike its radii for 88 other elements | 6.5 |
| 95 | Americium (Am) | `density` | 13.69 g/cm³ | 12 g/cm³, the nearest value in other tabulations (recorded 2026-10-03) | 9.4 |
| 97 | Berkelium (Bk) | `density` | 14 g/cm³ | 13.25 g/cm³, the nearest value in other tabulations (recorded 2026-10-03) | 9.4 |
| 100 | Fermium (Fm) | `meltingPoint` | 1800 K | no measurement: an estimate that PubChem does not mark as one | 6.2 |
| 100 | Fermium (Fm) | `standardState` | Solid | no sample large enough to observe: a prediction that PubChem does not word as one | 6.3 |
| 101 | Mendelevium (Md) | `meltingPoint` | 1100 K | no measurement: an estimate that PubChem does not mark as one | 6.2 |
| 101 | Mendelevium (Md) | `standardState` | Solid | no sample large enough to observe: a prediction that PubChem does not word as one | 6.3 |
| 102 | Nobelium (No) | `meltingPoint` | 1100 K | no measurement: an estimate that PubChem does not mark as one | 6.2 |
| 102 | Nobelium (No) | `standardState` | Solid | no sample large enough to observe: a prediction that PubChem does not word as one | 6.3 |
| 103 | Lawrencium (Lr) | `configuration` | [Rn]7s2 5f14 6d1 | NIST's ground state, [Rn].5f14.7s2.7p | 4 |
| 103 | Lawrencium (Lr) | `meltingPoint` | 1900 K | no measurement: an estimate that PubChem does not mark as one | 6.2 |
| 103 | Lawrencium (Lr) | `electronegativity` | 1.3 | no source: PubChem's own page for the element has no Pauling-scale line | 3 |
| 103 | Lawrencium (Lr) | `standardState` | Solid | no sample large enough to observe: a prediction that PubChem does not word as one | 6.3 |
| 104 | Rutherfordium (Rf) | `standardState` | Solid | no measurement: a prediction that PubChem does not word as one | 6.3 |
| 105 | Dubnium (Db) | `standardState` | Solid | no measurement: a prediction that PubChem does not word as one | 6.3 |
| 106 | Seaborgium (Sg) | `standardState` | Solid | no measurement: a prediction that PubChem does not word as one | 6.3 |
| 107 | Bohrium (Bh) | `standardState` | Solid | no measurement: a prediction that PubChem does not word as one | 6.3 |
| 108 | Hassium (Hs) | `standardState` | Solid | no measurement: a prediction that PubChem does not word as one | 6.3 |
| 109 | Meitnerium (Mt) | `standardState` | Solid | no measurement: a prediction that PubChem does not word as one | 6.3 |
| 110 | Darmstadtium (Ds) | `atomicMass` | 282.166 u, the mass of the isotope of mass number 282 | CIAAW's list of the most stable known isotopes, which gives 281 | 1.2 |
| 112 | Copernicium (Cn) | `atomicMass` | 286.179 u, the mass of the isotope of mass number 286 | CIAAW's list of the most stable known isotopes, which gives 285 | 1.2 |
| 112 | Copernicium (Cn) | `standardState` | Expected to be a Solid | a boiling point of "357+112-108K(84+112-108°C,183+202-194°F)" on PubChem's own element page, a range that reaches below room temperature | 6.3 |
| 114 | Flerovium (Fl) | `standardState` | Expected to be a Solid | a boiling point of "~210K(~-60°C,~-80°F)" on PubChem's own element page | 6.3 |
| 118 | Oganesson (Og) | `standardState` | Expected to be a Gas | a boiling point of "350±30K(80±30°C,170±50°F)(extrapolated)" on PubChem's own element page | 6.3 |
| 118 | Oganesson (Og) | `atomicMass` | 295.216 u, the mass of the isotope of mass number 295 | CIAAW's list of the most stable known isotopes, which gives 294 | 1.2 |

The card row is the name of the field in `src/chem-data/periodic-table.json`. Not in this table, because a decision above settles each with a note or a label: the fuller oxidation-state lists on PubChem's own pages (section 6.6), the electron affinities those pages give as zero (6.8), the two values they qualify (6.4), and the densities and temperatures that belong to one form of an element (6.2 and 6.4).

## 1. Atomic mass

Source: Abridged Standard Atomic Weights 2024, IUPAC Commission on Isotopic Abundances and Atomic Weights. CIAAW gives a standard atomic weight for 84 elements and none (a dash) for 34. The app shows CIAAW's value for the 84; this section records how PubChem's AtomicMass column compares.

### 1.1 The 84 elements with a standard atomic weight

80 agree, 2 are ties, 2 disagree. PubChem prints fewer decimals than the abridged table for 16 elements, the same number for 31, and more for 37.

| Z | Element | PubChem | CIAAW abridged (shown) | Result | Difference within CIAAW uncertainty |
| --- | --- | --- | --- | --- | --- |
| 3 | Lithium (Li) | 7.0 | 6.94 ± 0.06 | disagree: 6.94 rounds to 6.9 | yes |
| 16 | Sulfur (S) | 32.07 | 32.06 ± 0.02 | disagree in the last digit | yes |
| 18 | Argon (Ar) | 39.9 | 39.95 ± 0.16 | tie: 39.95 rounds to 40.0 or 39.9 | yes |
| 26 | Iron (Fe) | 55.84 | 55.845 ± 0.002 | tie: 55.845 rounds to 55.85 or 55.84 | no |

**Remark.** PubChem's figures for these are coarser than CIAAW's abridged ones: it prints lithium as 7.0 where the abridged table has 6.94 ± 0.06, and sulfur as 32.07 where the abridged table has 32.06 ± 0.02. Both differences are within the uncertainty CIAAW states, so neither is wrong, but 6.94 and 32.06 are the figures a learner will meet in a textbook, and they are the ones the app shows. The ties (argon 39.9 against 39.95, iron 55.84 against 55.845) are PubChem dropping a final 5. The comparison with CIAAW's full table is in section 9.2.

### 1.2 The 34 elements without a standard atomic weight

For every one, PubChem's number is the mass of a single isotope, and rounding it to a whole number gives that isotope's mass number. Which isotope, and whether its mass is measured or estimated, was settled against AME2020 on 2026-10-03 (section 9.2) and is written down in `decisions.json`; the script checks only that the two agree on the mass number. The isotope is one that CIAAW's "most stable known isotopes" list gives for 31 elements; for Darmstadtium (Ds), Copernicium (Cn), Oganesson (Og) CIAAW lists a different isotope.

| Z | Element | PubChem prints | Shown as the mass of | CIAAW most stable | Same isotope as CIAAW |
| --- | --- | --- | --- | --- | --- |
| 43 | Technetium (Tc) | 96.90636 | Tc-97 | 97, 98 | yes |
| 61 | Promethium (Pm) | 144.91276 | Pm-145 | 145 | yes |
| 84 | Polonium (Po) | 208.98243 | Po-209 | 209 | yes |
| 85 | Astatine (At) | 209.98715 | At-210 | 210 | yes |
| 86 | Radon (Rn) | 222.01758 | Rn-222 | 222 | yes |
| 87 | Francium (Fr) | 223.01973 | Fr-223 | 223 | yes |
| 88 | Radium (Ra) | 226.02541 | Ra-226 | 226 | yes |
| 89 | Actinium (Ac) | 227.02775 | Ac-227 | 227 | yes |
| 93 | Neptunium (Np) | 237.048172 | Np-237 | 237 | yes |
| 94 | Plutonium (Pu) | 244.06420 | Pu-244 | 244 | yes |
| 95 | Americium (Am) | 243.061380 | Am-243 | 243 | yes |
| 96 | Curium (Cm) | 247.07035 | Cm-247 | 247 | yes |
| 97 | Berkelium (Bk) | 247.07031 | Bk-247 | 247 | yes |
| 98 | Californium (Cf) | 251.07959 | Cf-251 | 251 | yes |
| 99 | Einsteinium (Es) | 252.0830 | Es-252 | 252 | yes |
| 100 | Fermium (Fm) | 257.09511 | Fm-257 | 257 | yes |
| 101 | Mendelevium (Md) | 258.09843 | Md-258 | 258 | yes |
| 102 | Nobelium (No) | 259.10100 | No-259 | 259 | yes |
| 103 | Lawrencium (Lr) | 266.120 | Lr-266 (estimated) | 262, 266 | yes |
| 104 | Rutherfordium (Rf) | 267.122 | Rf-267 (estimated) | 267 | yes |
| 105 | Dubnium (Db) | 268.126 | Db-268 (estimated) | 268 | yes |
| 106 | Seaborgium (Sg) | 269.128 | Sg-269 (estimated) | 269, 271 | yes |
| 107 | Bohrium (Bh) | 270.133 | Bh-270 (estimated) | 270, 274 | yes |
| 108 | Hassium (Hs) | 269.1336 | Hs-269 (estimated) | 269, 270 | yes |
| 109 | Meitnerium (Mt) | 277.154 | Mt-277 (estimated) | 277, 278 | yes |
| 110 | Darmstadtium (Ds) | 282.166 | Ds-282 (estimated) | 281 | no |
| 111 | Roentgenium (Rg) | 282.169 | Rg-282 (estimated) | 282 | yes |
| 112 | Copernicium (Cn) | 286.179 | Cn-286 (estimated) | 285 | no |
| 113 | Nihonium (Nh) | 286.182 | Nh-286 (estimated) | 285, 286 | yes |
| 114 | Flerovium (Fl) | 290.192 | Fl-290 (estimated) | 289, 290 | yes |
| 115 | Moscovium (Mc) | 290.196 | Mc-290 (estimated) | 288, 289, 290 | yes |
| 116 | Livermorium (Lv) | 293.205 | Lv-293 (estimated) | 291, 292, 293 | yes |
| 117 | Tennessine (Ts) | 294.211 | Ts-294 (estimated) | 294 | yes |
| 118 | Oganesson (Og) | 295.216 | Og-295 (estimated) | 294 | no |

**Remark.** A periodic table normally prints these as a mass number in square brackets, for example [209] for polonium, to show that the element has no atomic weight. Printing "208.98243 u" beside "atomic mass" would tell a learner that polonium has an atomic weight known to eight figures, so the app labels the number as the mass of the named isotope and says that the element has no standard atomic weight. For darmstadtium, copernicium and oganesson the isotope whose mass PubChem prints is not one that CIAAW's list gives, so "mass of the isotope" would name an isotope that the list of the most stable known ones does not hold. Each of the three carries a note on the card giving the mass number CIAAW lists.

## 2. First ionization energy

Source: NIST Atomic Spectra Database, Ground States and Ionization Energies, neutral atoms, in eV. NIST covers 108 elements, atomic numbers 1 to 108; it has no entry for Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og. NIST marks a value in square brackets as found by interpolation, extrapolation or another semi-empirical procedure, and a value in parentheses as theoretical; unmarked values come from evaluated experimental data. Marked: H (theoretical), Pr (semi-empirical), Pa (semi-empirical), Fm (semi-empirical), Md (semi-empirical), Rf (theoretical), Db (theoretical), Sg (semi-empirical), Bh (semi-empirical), Hs (semi-empirical). The app shows NIST's value, with this marking, for all 108; PubChem's IonizationEnergy column is not shown, and what follows records how it differs.

PubChem has a value for 102 elements and all can be compared. To PubChem's printed digits 76 agree and 26 disagree: 6 by less than 0.01 eV, 11 by 0.01 to 0.1 eV, 9 by 0.1 eV or more.

| Z | Element | PubChem (eV) | NIST (eV) | NIST to PubChem's digits | PubChem − NIST (eV) | NIST marks it |
| --- | --- | --- | --- | --- | --- | --- |
| 32 | Germanium (Ge) | 7.900 | 7.899435 ± 0.000012 | 7.899 | +0.0006 | measured |
| 33 | Arsenic (As) | 9.815 | 9.78855 ± 0.00025 | 9.789 | +0.0264 | measured |
| 43 | Technetium (Tc) | 7.28 | 7.11938 ± 0.00003 | 7.12 | +0.1606 | measured |
| 51 | Antimony (Sb) | 8.64 | 8.608389 ± 0.000012 | 8.61 | +0.0316 | measured |
| 59 | Praseodymium (Pr) | 5.464 | 5.4702 ± 0.0004 | 5.470 | −0.0062 | semi-empirical |
| 61 | Promethium (Pm) | 5.55 | 5.58187 ± 0.00004 | 5.58 | −0.0319 | measured |
| 73 | Tantalum (Ta) | 7.89 | 7.549571 ± 0.000025 | 7.55 | +0.3404 | measured |
| 74 | Tungsten (W) | 7.98 | 7.86403 ± 0.00010 | 7.86 | +0.1160 | measured |
| 75 | Rhenium (Re) | 7.88 | 7.83352 ± 0.00011 | 7.83 | +0.0465 | measured |
| 76 | Osmium (Os) | 8.7 | 8.43823 ± 0.00020 | 8.4 | +0.2618 | measured |
| 77 | Iridium (Ir) | 9.1 | 8.96702 ± 0.00022 | 9.0 | +0.1330 | measured |
| 83 | Bismuth (Bi) | 7.289 | 7.285516 ± 0.000006 | 7.286 | +0.0035 | measured |
| 84 | Polonium (Po) | 8.417 | 8.418070 ± 0.000004 | 8.418 | −0.0011 | measured |
| 85 | Astatine (At) | 9.5 | 9.31751 ± 0.00008 | 9.3 | +0.1825 | measured |
| 86 | Radon (Rn) | 10.745 | 10.74850 | 10.749 | −0.0035 | measured |
| 87 | Francium (Fr) | 3.9 | 4.0727411 ± 0.0000011 | 4.1 | −0.1727 | measured |
| 88 | Radium (Ra) | 5.279 | 5.2784239 ± 0.0000025 | 5.278 | +0.0006 | measured |
| 89 | Actinium (Ac) | 5.17 | 5.380235 ± 0.000012 | 5.38 | −0.2102 | measured |
| 90 | Thorium (Th) | 6.08 | 6.30670 ± 0.00025 | 6.31 | −0.2267 | measured |
| 94 | Plutonium (Pu) | 6.06 | 6.02576 ± 0.00025 | 6.03 | +0.0342 | measured |
| 95 | Americium (Am) | 5.993 | 5.97381 ± 0.00025 | 5.974 | +0.0192 | measured |
| 96 | Curium (Cm) | 6.02 | 5.992241 ± 0.000020 | 5.99 | +0.0278 | measured |
| 97 | Berkelium (Bk) | 6.23 | 6.19785 ± 0.00025 | 6.20 | +0.0322 | measured |
| 98 | Californium (Cf) | 6.30 | 6.281878 ± 0.000006 | 6.28 | +0.0181 | measured |
| 99 | Einsteinium (Es) | 6.42 | 6.36840 ± 0.00006 | 6.37 | +0.0516 | measured |
| 102 | Nobelium (No) | 6.65 | 6.62621 ± 0.00005 | 6.63 | +0.0238 | measured |

PubChem leaves 16 elements empty. NIST has a value for 6 of them: Lr 4.96 (measured), Rf 6.02 (theoretical), Db 6.8 (theoretical), Sg 7.8 (semi-empirical), Bh 7.7 (semi-empirical), Hs 7.6 (semi-empirical). Neither has one for Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og.

**Where PubChem's column comes from.** On PubChem's own element pages the periodic-table value is the line cited to: 102 from Jefferson Lab — eV. The same pages also carry NIST's value, for 108 elements. The column is therefore an older compilation, not NIST's current evaluation.

**Remark.** The large differences are not rounding: tantalum is +0.34 eV away, osmium +0.26, thorium −0.23, actinium −0.21, astatine +0.18, francium −0.17. NIST's uncertainties on these are far smaller than the differences. The 11 elements already in the app take their ionization energy from NIST, and all 11 PubChem values agree with those to PubChem's digits (section 7).

## 3. Electronegativity (Pauling scale)

PubChem has 95 values and leaves 23 empty (section 6.1 names them). The app shows the column as it is. No primary source for Pauling values is among the saved copies; the comparison with a Wikipedia transcription made on 2026-10-03, in which every value that could be compared agreed, is in section 9.3.

**Where PubChem's column comes from.** 93 of the values appear on PubChem's element pages as "Pauling Scale Electronegativity", cited only to "PubChem Elements". Fr, Lr have a value in the periodic table and no Pauling-scale line on the element page.

**Remark.** Francium's 0.7 is the lowest value in the column, so it sets the bottom of the electronegativity colour scale, and it is one of the 2 values that cannot be traced to a line on PubChem's own page. The next lowest is cesium's 0.79. NIST's first ionization energies point the other way: francium's (4.0727411 eV) is higher than cesium's (3.89390572743 eV), which a lower electronegativity would not lead one to expect. Both untraced values carry a note on the card saying that they could not be traced beyond PubChem's table, and are listed under "Unresolved"; francium's note adds what PubChem's francium page says, that no amount of the element large enough to weigh has been prepared. Helium, neon and argon have no Pauling value because the scale is built from bond energies and they form no ordinary compounds, which is one reason an empty field is not called "not measured".

## 4. Ground-state electron configuration

The same NIST file gives the ground-state shells of 108 neutral atoms, and the card's shell diagram is drawn from the configuration. Every one of PubChem's 118 configurations parses and its electrons sum to the atomic number; the only cores used are [He], [Ne], [Ar], [Kr], [Xe], [Rn]. Against NIST, 107 of 108 hold the same number of electrons in every subshell.

| Z | Element | PubChem | NIST ground shells | Difference | Shells from PubChem | Shells from NIST |
| --- | --- | --- | --- | --- | --- | --- |
| 103 | Lawrencium (Lr) | [Rn]7s2 5f14 6d1 | [Rn].5f14.7s2.7p | 6d: PubChem 1, NIST 0; 7p: PubChem 0, NIST 1 | 2, 8, 18, 32, 32, 9, 2 | 2, 8, 18, 32, 32, 8, 3 |

**Remark.** PubChem does not mark lawrencium's configuration as predicted. NIST's ground level for it is ²P°₁/₂, a 7p electron, not a 6d one. For elements 109 to 118 there is no NIST entry to compare with; PubChem marks 9 of those as "(predicted)" and one, Mt, as "(calculated)". The card shows PubChem's configuration for lawrencium, draws the shell diagram from it, and gives NIST's ground state in a note.

## 5. Melting point, boiling point and density

No primary source for these three columns is among the saved copies. On 2026-10-03 each value was compared with the nearest value transcribed on a Wikipedia data page; section 9.4 records that check, which the script does not repeat. 6 values failed it and are listed under "Unresolved". What the script still computes about these columns is in sections 6.2 to 6.4.

PubChem's own element pages can be read for a second opinion on those 6. Beside the Jefferson Lab line that the table's value comes from, some pages carry a line from Los Alamos:

| Z | Element | Property | PubChem's table | Lines on PubChem's element page |
| --- | --- | --- | --- | --- |
| 6 | Carbon (C) | melting point | 3823 K | 3823 K (3550°C or 6422°F) (Jefferson Lab); 3550°C(diamond) (Los Alamos National Laboratory) |
| 56 | Barium (Ba) | boiling point | 2170 K | 2170 K (1897°C or 3447°F) (Jefferson Lab); 1845°C (Los Alamos National Laboratory) |
| 88 | Radium (Ra) | boiling point | 1413 K | 1413 K (1140°C or 2084°F) (Jefferson Lab); 1737°C (Los Alamos National Laboratory) |
| 5 | Boron (B) | density | 2.37 g/cm³ | 2.37 grams per cubic centimeter (Jefferson Lab) |
| 95 | Americium (Am) | density | 13.69 g/cm³ | 13.69 grams per cubic centimeter (Jefferson Lab) |
| 97 | Berkelium (Bk) | density | 14 g/cm³ | 14 grams per cubic centimeter (Jefferson Lab) |

For the three densities the page has nothing to set beside the table's value. The handbook figures are read from the kept copy of Wikipedia's densities page (solid phase), which transcribes the CRC Handbook and Lange's Handbook:

| Z | Element | PubChem's table (g/cm³) | CRC Handbook | Lange's Handbook |
| --- | --- | --- | --- | --- |
| 5 | Boron (B) | 2.37 | 2.34 | 2.34 |
| 95 | Americium (Am) | 13.69 | 12 | 12 |
| 97 | Berkelium (Bk), alpha | 14 | 14.78 | 14.78 |
| 97 | Berkelium (Bk), beta | 14 | 13.25 | 13.25 |

**Remark.** For barium and radium the page's second line is itself the disagreement: 1845 °C is 2118 K against the table's 2170 K, and 1737 °C is 2010 K against the table's 1413 K. Their notes on the card quote those lines. The notes on boron, americium and berkelium quote the handbook figures in the table above: 2.34, 12, and 14.78 and 13.25 g/cm³. For carbon the second line, "3550°C(diamond)", is the table's own 3823 K with a label; section 6.2 says why that figure needs its note.

## 6. Sanity scan of the whole download

### 6.1 Shape of the download

118 rows, numbered 1 to 118, 17 columns. Every non-empty numeric field is a plain decimal number (no ranges, signs, or units in the text). Empty fields per column: CPKHexColor 10, Electronegativity 23, AtomicRadius 19, IonizationEnergy 16, ElectronAffinity 61, OxidationStates 1, MeltingPoint 15, BoilingPoint 25, Density 22; the other columns are never empty. For the columns the app shows, these are the coverage figures in the design spec (section 5.1).

| Column | Empty for |
| --- | --- |
| Electronegativity | He, Ne, Ar, Pm, Eu, Tb, Yb, Rn, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |
| AtomicRadius | Fm, Md, No, Lr, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |
| IonizationEnergy | Lr, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |
| ElectronAffinity | He, Be, N, Ne, Mg, Ar, Ca, Mn, Zn, Kr, Sr, Cd, Xe, Ba, Pr, Nd, Pm, Sm, Eu, Gd, Tb, Dy, Ho, Er, Tm, Yb, Lu, Hf, Hg, Rn, Ra, Ac, Th, Pa, U, Np, Pu, Am, Cm, Bk, Cf, Es, Fm, Md, No, Lr, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |
| OxidationStates | Nh |
| MeltingPoint | Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |
| BoilingPoint | At, Fr, Pa, Bk, Cf, Es, Fm, Md, No, Lr, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |
| Density | Fr, Cf, Es, Fm, Md, No, Lr, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og |

### 6.2 Melting point against boiling point

Melting point at or above boiling point: Arsenic (As), melting 1090 K, boiling 887 K. Liquid range narrower than 10% of the melting point, for an element that is not a gas: Carbon (C), 3823 K to 4098 K.

**Remark.** Neither is a typing error. Arsenic turns straight from solid to vapour at atmospheric pressure, and its "melting point" of 1090 K is measured under pressure. PubChem's arsenic page gives that pressure as 28 times atmospheric; the CRC row quoted in section 9.5 gives 3.70 MPa, which is about 36 times, so the note on the card says "under pressure" and gives no figure. Carbon also sublimes: PubChem's own carbon page carries a second boiling-point line that reads "3800°C(sublimation)". Helium's 0.95 K is the lowest melting point in the column, and helium does not freeze at atmospheric pressure at any temperature. The rows of other tabulations that say these things are quoted in section 9.5. Carbon's 3823 K is the highest melting point in the column, above tungsten's 3695 K. So both ends of a melting-point colour scale are values that are not melting at ordinary pressure: the melting-point legend says so, and arsenic, carbon and helium each carry a note on the card. Phosphorus's melting and boiling points are those of one of its forms: the Los Alamos lines on its page read "44.15(whitephosphorus)" and "280.5(whitephosphorus)", in °C, and each row carries a note saying so.

**Melting points of elements never made in bulk.** PubChem's table gives a melting point, with no marking, for 6 elements of which no sample large enough to melt has been made. What PubChem's own pages say of each:

| Z | Element | PubChem's table (K) | On PubChem's page for the element |
| --- | --- | --- | --- |
| 85 | Astatine (At) | 575 | Astatine has been produced only in small amounts and is short-lived, so it has no use beyond basic research. The astatine made so far comes to 0.05 micrograms in all (0.00000005 g). |
| 87 | Francium (Fr) | 300 | Francium has been produced only in small amounts and is short-lived, so it has no use beyond basic research. No amount of francium large enough to weigh has been prepared or isolated. |
| 100 | Fermium (Fm) | 1800 | Fermium has been produced only in small amounts and is short-lived, so it has no use beyond basic research. No fermium metal has been prepared, though fermium alloyed with rare earth metals has been measured, and several predictions have been made. |
| 101 | Mendelevium (Md) | 1100 | Mendelevium has been produced only in small amounts, so it has no use beyond basic research. |
| 102 | Nobelium (No) | 1100 | Nobelium has been produced only in tiny amounts, so it has no use beyond basic research. |
| 103 | Lawrencium (Lr) | 1900 | Lawrencium has been produced only in tiny amounts, so it has no use beyond basic research. |

**Remark.** A melting point is measured on a sample that can be seen to melt, so these 6 figures are estimates or predictions; each carries a note on the card saying so and is listed under "Unresolved". No page says in so many words that its melting point is an estimate. Francium's says that no weighable quantity has been prepared, fermium's that the metal has not been prepared and that predictions have been made, and astatine's that 0.05 micrograms have been produced in all. For mendelevium, nobelium and lawrencium the pages say only that small or tiny amounts have been produced; that no bulk sample exists follows from the fermium page, which makes fermium the heaviest element of which a macroscopic amount can be prepared. That the figures are estimates is therefore a chemist's reading of these pages, not a statement found on them. Einsteinium's page says the same of einsteinium, and its melting point (1133 K) carries no note: it was measured on microgram samples, which is the reviewer's general knowledge and not something a saved source states.

### 6.3 Standard state against melting and boiling point at 298.15 K

The state implied by the melting and boiling points at 298.15 K matches PubChem's StandardState for 103 elements and contradicts it for 0. It cannot be checked for 15 (Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og), which have neither point. Within 10 K of room temperature: Gallium (Ga) melts at 302.91 K; Cesium (Cs) melts at 301.59 K; Francium (Fr) melts at 300 K.

State counts: Gas 11, Solid 96, Liquid 2, Expected to be a Solid 8, Expected to be a Gas 1. Rf, Db, Sg, Bh, Hs, Mt are given as "Solid" with no "Expected to be", although PubChem has no melting point, boiling point or density for them.

| Element | PubChem state | Melting and boiling lines on PubChem's own element page |
| --- | --- | --- |
| Darmstadtium (Ds) | Expected to be a Solid | none |
| Roentgenium (Rg) | Expected to be a Solid | none |
| Copernicium (Cn) | Expected to be a Solid | boiling point 357+112-108K(84+112-108°C,183+202-194°F) (Los Alamos) |
| Nihonium (Nh) | Expected to be a Solid | melting point 700K(430°C,810°F)(predicted) (Los Alamos); boiling point 1430K(1130°C,2070°F)(predicted) (Los Alamos) |
| Flerovium (Fl) | Expected to be a Solid | boiling point ~210K(~-60°C,~-80°F) (Los Alamos) |
| Moscovium (Mc) | Expected to be a Solid | melting point 670K(400°C,750°F)(predicted) (Los Alamos); boiling point ~1400K(~1100°C,~2000°F)(predicted) (Los Alamos) |
| Livermorium (Lv) | Expected to be a Solid | melting point 637–780K(364–507°C,687–944°F) (Los Alamos); boiling point 1035–1135K(762–862°C,1403–1583°F)(extrapolated) (Los Alamos) |
| Tennessine (Ts) | Expected to be a Solid | melting point 623–823K(350–550°C,662–1022°F)(predicted) (Los Alamos); boiling point 883K(610°C,1130°F) (Los Alamos) |
| Oganesson (Og) | Expected to be a Gas | boiling point 350±30K(80±30°C,170±50°F)(extrapolated) (Los Alamos) |

**Remark.** PubChem's own pages contradict two of the "expected" states: the boiling-point figure on the page is on the wrong side of 298.15 K for Flerovium (Fl), Oganesson (Og). A boiling point near 210 K would make flerovium a gas at room temperature, not a solid; 350 ± 30 K would mean oganesson is not a gas. Both carry a note on the card and are listed under "Unresolved". Copernicium's 357 K has an error bar of about 110 K, which reaches below room temperature, so its page leaves the state open; it carries a note on the card giving that figure and is listed under "Unresolved". All of elements 104 to 118 have been made only a few atoms at a time, so every state from rutherfordium on is a prediction, whether or not PubChem says "Expected". Rf, Db, Sg, Bh, Hs, Mt are shown as "Solid" without that word; each carries a note on the card saying that PubChem does not word the state as expected although it lists no measurement, and is listed under "Unresolved". PubChem's page for each says that only small amounts of it, or only a few atoms, have been made; where each sentence is, and what it says in this project's words, is kept in `sources/pubchem-element-pages-passages.json`. The same holds further down the table for Astatine (At), Francium (Fr), Fermium (Fm), Mendelevium (Md), Nobelium (No), Lawrencium (Lr), the six whose melting points are estimates (section 6.2): PubChem gives each as "Solid" with no "Expected to be", although its page says that only small amounts have ever been produced. Each carries a note on the card saying so and is listed under "Unresolved".

### 6.4 Density

All 96 densities are in one unit, g/cm³, including the 11 gases: each gas value is 1000 times smaller than its familiar g/L figure. The gases match the ideal-gas density at 0 °C and 1 atm, not at 25 °C:

| Gas | PubChem (g/cm³) | Same in g/L | Ideal gas at 0 °C, 1 atm (g/L) | Ratio | Ratio if it were 25 °C |
| --- | --- | --- | --- | --- | --- |
| Hydrogen (H), diatomic | 0.00008988 | 0.0899 | 0.0899 | 0.999 | 1.091 |
| Helium (He) | 0.0001785 | 0.1785 | 0.1786 | 1.000 | 1.091 |
| Nitrogen (N), diatomic | 0.0012506 | 1.2506 | 1.2498 | 1.001 | 1.092 |
| Oxygen (O), diatomic | 0.001429 | 1.4290 | 1.4276 | 1.001 | 1.093 |
| Fluorine (F), diatomic | 0.001696 | 1.6960 | 1.6952 | 1.000 | 1.092 |
| Neon (Ne) | 0.0008999 | 0.8999 | 0.9003 | 1.000 | 1.091 |
| Chlorine (Cl), diatomic | 0.003214 | 3.2140 | 3.1632 | 1.016 | 1.109 |
| Argon (Ar) | 0.0017837 | 1.7837 | 1.7801 | 1.002 | 1.094 |
| Krypton (Kr) | 0.003733 | 3.7330 | 3.7387 | 0.998 | 1.090 |
| Xenon (Xe) | 0.005887 | 5.8870 | 5.8575 | 1.005 | 1.097 |
| Radon (Rn) | 0.00973 | 9.7300 | 9.9053 | 0.982 | 1.072 |

The column runs from 0.00008988 (H) to 22.57 (Os), a factor of 251,113. The densest gas is Rn at 0.00973; the least dense solid is Li at 0.534. Values given to one or two figures: Tc 11, At 7, Ra 5, Bk 14. On PubChem's own pages, values carrying a qualifier that the periodic table drops: Cm BoilingPoint "~3400 K (~3100°C or ~5600°F)"; At Density "about 7 grams per cubic centimeter".

**Remark.** The gas densities are at 0 °C and the solids' are near room temperature (section 9.5), so the column is not at one temperature; each gas carries a note on the card saying what its density refers to. On a straight-line colour scale all 11 gases fall in the bottom 0.04% and look identical. The scale is kept linear and the density legend says that the gases sit at the bottom of it (design spec, section 6). The longest printed value is "0.00008988", ten characters in a table cell. Astatine's density and curium's boiling point, which the pages qualify, each carry a note.

Two densities are those of one form of an element that has several. On the kept copy of Wikipedia's densities page, carbon's 2.2670 is Lange's figure for graphite (2.267; both handbooks give 3.513 for diamond), and phosphorus's 1.82 is both handbooks' figure for white phosphorus (1.823) to two decimals, with red and black phosphorus denser. Each carries a note on the card naming the form. PubChem's own pages do not say which form these two densities are for.

### 6.5 Atomic radius

PubChem labels the column "Atomic Radius (van der Waals)", in pm, and all 99 values equal the line its element pages cite to Los Alamos National Laboratory's periodic table. The app shows the column on the card, labelled "van der Waals radius", and does not colour the table by it. Its comparison with Bondi's and Mantina's published values (2026-10-03; about half match) is in section 9.6.

The column by period (pm):

- Period 1: H 120, He 140
- Period 2: Li 182, Be 153, B 192, C 170, N 155, O 152, F 135, Ne 154
- Period 3: Na 227, Mg 173, Al 184, Si 210, P 180, S 180, Cl 175, Ar 188
- Period 4: K 275, Ca 231, Sc 211, Ti 187, V 179, Cr 189, Mn 197, Fe 194, Co 192, Ni 163, Cu 140, Zn 139, Ga 187, Ge 211, As 185, Se 190, Br 183, Kr 202
- Period 5: Rb 303, Sr 249, Y 219, Zr 186, Nb 207, Mo 209, Tc 209, Ru 207, Rh 195, Pd 202, Ag 172, Cd 158, In 193, Sn 217, Sb 206, Te 206, I 198, Xe 216
- Period 6: Cs 343, Ba 268, La 240, Ce 235, Pr 239, Nd 229, Pm 236, Sm 229, Eu 233, Gd 237, Tb 221, Dy 229, Ho 216, Er 235, Tm 227, Yb 242, Lu 221, Hf 212, Ta 217, W 210, Re 217, Os 216, Ir 202, Pt 209, Au 166, Hg 209, Tl 196, Pb 202, Bi 207, Po 197, At 202, Rn 220
- Period 7: Fr 348, Ra 283, Ac 260, Th 237, Pa 243, U 240, Np 221, Pu 243, Am 244, Cm 245, Bk 244, Cf 245, Es 245, Fm –, Md –, No –, Lr –, Rf –, Db –, Sg –, Bh –, Hs –, Mt –, Ds –, Rg –, Cn –, Nh –, Fl –, Mc –, Lv –, Ts –, Og –

Steps of 12% or more between neighbours in a period: H 120 → He 140 (+17%); Li 182 → Be 153 (−16%); Be 153 → B 192 (+25%); F 135 → Ne 154 (+14%); Na 227 → Mg 173 (−24%); Al 184 → Si 210 (+14%); Si 210 → P 180 (−14%); K 275 → Ca 231 (−16%); Co 192 → Ni 163 (−15%); Ni 163 → Cu 140 (−14%); Zn 139 → Ga 187 (+35%); Ga 187 → Ge 211 (+13%); Ge 211 → As 185 (−12%); Rb 303 → Sr 249 (−18%); Sr 249 → Y 219 (−12%); Y 219 → Zr 186 (−15%); Pd 202 → Ag 172 (−15%); Cd 158 → In 193 (+22%); In 193 → Sn 217 (+12%); Cs 343 → Ba 268 (−22%); Pt 209 → Au 166 (−21%); Au 166 → Hg 209 (+26%); Fr 348 → Ra 283 (−19%). Places where the element lower in a group is smaller than the one above it: group 13, B 192 → Al 184; group 4, Ti 187 → Zr 186; group 11, Ag 172 → Au 166; group 14, Sn 217 → Pb 202; group 16, Te 206 → Po 197.

For comparison, PubChem's element pages also carry a covalent radius for 96 elements (hydrogen to curium). For the 11 elements already in the app it equals the Cordero 2008 value the app cites, in every case. This is the radius the app colours the table by. It runs smoothly: period 2: Li 128, Be 96, B 84, C 76, N 71, O 66, F 57, Ne 58; period 3: Na 166, Mg 141, Al 121, Si 111, P 107, S 105, Cl 102, Ar 106; period 4: K 203, Ca 176, Sc 170, Ti 160, V 153, Cr 139, Mn 139, Fe 132, Co 126, Ni 124, Cu 132, Zn 122, Ga 122, Ge 120, As 119, Se 120, Br 120, Kr 116.

**Remark.** Two separate problems. First, the column appears to be stitched from more than one set of radii: copper 140 and zinc 139 (Bondi's values; section 9.6) sit about a quarter below cobalt 192 and gallium 187, and gold 166 sits in a notch between platinum 209 and mercury 209. A learner who saw the table coloured by this column would see a pattern that is an accident of sourcing. Second, even a clean set of van der Waals radii is the wrong quantity for the trend a general chemistry course teaches. The textbook statement "atomic radius decreases across a period and increases down a group" is about covalent or metallic radii; in this column boron is larger than beryllium, silicon larger than aluminium, and each noble gas larger than its halogen. The covalent radius is the quantity that shows that trend, which is why the app colours by it, and why this column is never labelled plain "atomic radius".

**Covalent radii printed with no uncertainty.** Of the 96 covalent-radius lines on PubChem's element pages, 88 give the radius with an uncertainty in its last digit, as in "31(5) pm (Covalent)" for hydrogen. 8 give none: Helium (He) 28, Neon (Ne) 58, Promethium (Pm) 199, Astatine (At) 150, Radon (Rn) 150, Francium (Fr) 260, Actinium (Ac) 215, Protactinium (Pa) 200. Both ends of the covalent-radius colour scale are among them: helium's 28 pm is the smallest radius and francium's 260 pm the largest.

**Remark on the 8.** The page does not say why these radii have no uncertainty. The paper they come from (Cordero 2008) was not read, so nothing here says how they were arrived at. Each carries a note on the card saying that the page gives the radius with no uncertainty, unlike its radii for 88 other elements, and that it should be treated as an estimate; each is listed under "Unresolved". Because the two ends of the scale carry the note, the covalent-radius legend shows it for both.

### 6.6 Oxidation states

Empty: Nh. Only "0": He, Ne, Ar, Kr, Xe, Rn. Written without a + sign (11 elements): At "7, 5, 3, 1, -1"; Db "5, 4, 3"; Sg "6, 5, 4, 3, 0"; Bh "7, 5, 4, 3"; Hs "8, 6, 5, 4, 3, 2"; Mt "9, 8, 6, 4, 3, 1"; Ds "8, 6, 4, 2, 0"; Rg "5, 3, 1, -1"; Cn "2, 1, 0"; Fl "6, 4,2, 1, 0"; Mc "3, 1". Irregular spacing: Fl "6, 4,2, 1, 0". Anything that is not a list of signed whole numbers: none. Lists that include 0 beside other states: Sg, Ds, Cn, Fl, Og. The longest entry is "+5, +4, +3, +2, +1, -1, -2, -3".

On PubChem's element pages the periodic-table text is, character for character apart from spacing, the line cited to Jefferson Lab for 103 elements and Los Alamos for 4 elements. For the other 10 it is Los Alamos's line with something removed:

| Element | Periodic table | Los Alamos line on the element page |
| --- | --- | --- |
| Dubnium (Db) | 5, 4, 3 | 5, (4), (3) (parenthesized oxidation states are predictions) |
| Seaborgium (Sg) | 6, 5, 4, 3, 0 | 6, (5), (4), (3), 0 (parenthesized oxidation states are predictions) |
| Bohrium (Bh) | 7, 5, 4, 3 | 7, (5), (4), (3) (parenthesized oxidation states are predictions) |
| Hassium (Hs) | 8, 6, 5, 4, 3, 2 | 8, (6), (5), (4), (3), (2)(parenthesized oxidation states are predictions) |
| Copernicium (Cn) | 2, 1, 0 | 2, (1), 0 (parenthesized oxidation states are predictions) |
| Flerovium (Fl) | 6, 4,2, 1, 0 | 0, 1, 2, 4, 6 (predicted) |
| Moscovium (Mc) | 3, 1 | 1, 3 (prediction) |
| Livermorium (Lv) | +4, +2, -2 | -2,+2, +4 (predicted) |
| Tennessine (Ts) | +5, +3, +1, -1 | -1, +1, +3, +5 (predicted) |
| Oganesson (Og) | +6, +4, +2, +1, 0, -1 | -1, 0, +1,+2,+4, +6 (predicted) |

The comparison above sets aside a closing remark in parentheses. For Mt, Ds, Rg that remark is "(predicted)", so their text matches although the table has dropped the mark too. In all, the pages mark some or all states as predictions for 13 elements: Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Fl, Mc, Lv, Ts, Og.

Where the periodic table shows a single state, Los Alamos's line on the same element page is longer for: Oxygen (O), table "-2", Los Alamos "2, 1, -1, -2"; Krypton (Kr), table "0", Los Alamos "2, 1, 0 (rarely more than 0; unknown oxide)"; Xenon (Xe), table "0", Los Alamos "0, +1, +2, +4, +6, +8 (rarely more than 0; a weakly acidic oxide)"; Radon (Rn), table "0", Los Alamos "6, 2, 0".

**Remark.** The column is a short list of common states, not every known state. Three things follow for the app. First, xenon and krypton are given only "0", yet the library holds XeF4, where xenon is +4; oxygen is given only "−2", yet the library holds hydrogen peroxide (oxygen −1) and O₂ (oxygen 0). The card therefore heads the row "Common oxidation states (PubChem's list, not complete)", and xenon, krypton, radon and oxygen each carry a note giving the other states on PubChem's own page. Second, for the 13 elements just named, Los Alamos marks some or all states as predictions, in parentheses or with the word "predicted", and PubChem's periodic table has dropped the marks. The rule that predicted text keeps its marking cannot be met from the download alone for these, so each carries a note saying which states the page marks. Third, 11 entries are written without a + sign; the app shows each list as PubChem writes it, changing only "-" to the true minus sign.

### 6.7 Electron configuration text

Endings in parentheses: "(predicted)" on 9 (Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og); "(calculated)" on Mt. A space after the core, where the others that have a core have none: N "[He] 2s2 2p3", Fm "[Rn] 5f12 7s2". The order of subshells is not uniform: Cr "[Ar]3d5 4s1", Fm "[Rn] 5f12 7s2", Nh "[Rn]5f14 6d10 7s2 7p1 (predicted)" do not start with the s subshell as the rest do, and Fl, Mc, Lv, Ts, Og write 7p before 5f and 6d. Configurations that fail to parse: 0. Configurations whose electrons do not sum to the atomic number: 0.

**Remark.** 10 configurations carry a marker: 9 say "(predicted)" and meitnerium's says "(calculated)". The build moves either word into a qualifier that stays on screen, keeps the rest of the text as published, and fails on any other ending in parentheses. The configuration text is Los Alamos's (117 of 118 match its line on the element page once spaces are removed), which is why the spacing and order vary.

### 6.8 Electron affinity

57 values, all matching a line on PubChem's element page cited to "PubChem Elements", in eV. Of the 61 empty ones, 43 have no electron affinity line on the element page either, and 18 have one whose first value is 0 eV: He, Be, N, Ne, Mg, Ar, Ca, Mn, Zn, Kr, Sr, Cd, Xe, Ba, Hf, Hg, Rn, Ra. For those 18 the page's second value is negative for 11 (He -0.22, N -0.21, Ne -0.3, Mg -0.22, Ar -0.37, Ca -1.39, Kr -0.42, Sr -1.51, Xe -0.45, Ba -0.48, Hg -0.19), positive for 5 (Be 0.38, Mn 0.97, Zn 0.09, Cd 0.27, Hf 0.63) and absent for Rn, Ra.

**Remark.** For these 18 elements the field is empty because PubChem's first source gives zero, not because nobody has looked. A zero or negative electron affinity means the atom does not hold on to an extra electron, which is the expected answer for the noble gases and for atoms with filled subshells such as beryllium and magnesium. "Not measured" is the wrong label for them, and the app's wording for every empty field is "no value listed"; each of the 18 also carries a note on the card saying that PubChem's page for the element lists 0 eV. PubChem's two sources disagree on the sign for Be, Mn, Zn, Cd, Hf, and electron affinity was not compared with an independent source, so this report cannot say which is right.

### 6.9 Category

PubChem's GroupBlock for all 118, in atomic-number order (a run of neighbours with the same category is written as a range). Counts: Nonmetal 7, Noble gas 7, Alkali metal 6, Alkaline earth metal 6, Metalloid 7, Halogen 6, Post-transition metal 11, Transition metal 38, Lanthanide 15, Actinide 15.

| Period | Categories |
| --- | --- |
| 1 | H (1) Nonmetal · He (2) Noble gas |
| 2 | Li (3) Alkali metal · Be (4) Alkaline earth metal · B (5) Metalloid · C–O (6–8) Nonmetal · F (9) Halogen · Ne (10) Noble gas |
| 3 | Na (11) Alkali metal · Mg (12) Alkaline earth metal · Al (13) Post-transition metal · Si (14) Metalloid · P–S (15–16) Nonmetal · Cl (17) Halogen · Ar (18) Noble gas |
| 4 | K (19) Alkali metal · Ca (20) Alkaline earth metal · Sc–Zn (21–30) Transition metal · Ga (31) Post-transition metal · Ge–As (32–33) Metalloid · Se (34) Nonmetal · Br (35) Halogen · Kr (36) Noble gas |
| 5 | Rb (37) Alkali metal · Sr (38) Alkaline earth metal · Y–Cd (39–48) Transition metal · In–Sn (49–50) Post-transition metal · Sb–Te (51–52) Metalloid · I (53) Halogen · Xe (54) Noble gas |
| 6 | Cs (55) Alkali metal · Ba (56) Alkaline earth metal · La–Lu (57–71) Lanthanide · Hf–Hg (72–80) Transition metal · Tl–Bi (81–83) Post-transition metal · Po (84) Metalloid · At (85) Halogen · Rn (86) Noble gas |
| 7 | Fr (87) Alkali metal · Ra (88) Alkaline earth metal · Ac–Lr (89–103) Actinide · Rf–Cn (104–112) Transition metal · Nh–Lv (113–116) Post-transition metal · Ts (117) Halogen · Og (118) Noble gas |

PubChem's element pages carry a second, three-way classification from Jefferson Lab (Metal, Semi-metal, Non-metal). It agrees with GroupBlock except: Polonium (Po), GroupBlock "Metalloid", page "Metal"; Astatine (At), GroupBlock "Halogen", page "Semi-metal"; Tennessine (Ts), GroupBlock "Halogen", page "no classification". The same pages put Lu, Lr in group 3 beside Sc, Y, and give 28 lanthanides and actinides no group number.

**Remark.** Assignments a chemist would query, and why:

- **Hydrogen, "Nonmetal".** Correct, but it sits at the top of group 1, so its cell will be coloured differently from the alkali metals below it. That is right; the group 1 description says that hydrogen is a nonmetal, not an alkali metal.
- **Boron, silicon, germanium, arsenic, antimony, tellurium, "Metalloid".** The usual six. Textbooks agree on these.
- **Polonium, "Metalloid".** Contested: PubChem's own polonium page (Jefferson Lab) calls it a metal. The card carries a note.
- **Astatine, "Halogen".** True by group (17). PubChem's own astatine page (Jefferson Lab) calls it a semi-metal, which is the same thing as a metalloid. The card carries a note.
- **Zinc, cadmium, mercury (group 12), "Transition metal".** Common in periodic tables. The usual objection is that these atoms keep a full d subshell: PubChem gives zinc "[Ar]4s2 3d10" with only the state +2, in which the two 4s electrons are lost and the ten d electrons stay. Many textbooks therefore do not count group 12 as transition metals. (IUPAC's definition of a transition element was not fetched: the Gold Book refused an automated request.) The legend says that group 12 is placed by position.
- **Lanthanum to lutetium "Lanthanide", actinium to lawrencium "Actinide", 15 of each.** A common convention for the two families. It is not the same thing as the f block: an f subshell holds 14 electrons, so the f block is 14 elements wide. PubChem's configuration gives lanthanum no f electron ("[Xe]6s2 5d1"), and PubChem's element pages put lutetium and lawrencium in group 3. The app takes neither the 15-wide families nor PubChem's group numbers for its blocks: it puts lanthanum and actinium in group 3 and the d block, and makes the f block cerium to lutetium and thorium to lawrencium (design spec, section 5.4), with one note on the page saying that group 3 is unsettled and that PubChem puts lutetium and lawrencium there.
- **Copernicium, "Transition metal"; nihonium, flerovium, moscovium, livermorium, "Post-transition metal"; tennessine, "Halogen"; oganesson, "Noble gas".** Assigned by position in the table. Their chemistry is unknown or known from a handful of atoms, and the predictions for copernicium, flerovium and oganesson do not match their neighbours (section 6.3). Rutherfordium to roentgenium, "Transition metal", are also assigned by position. The legend says that elements 109 to 118 are placed by position.
- PubChem's ten names mix two kinds of grouping: four are column names (alkali metal, alkaline earth metal, halogen, noble gas), the rest describe metallic character. A halogen or a noble gas is also a nonmetal. The legend is headed "Chemical family (PubChem's grouping)", shows "Nonmetal" as "Other nonmetals", and says that the halogens and noble gases that are nonmetals are listed under their family names (design spec, section 5.5).

### 6.10 Names, years and the unused colour column

Names that differ from CIAAW's (IUPAC) spelling: Aluminum (CIAAW: aluminium), Cesium (CIAAW: caesium). YearDiscovered is "Ancient" for 13 (C, Al, S, Ca, Fe, Cu, As, Ag, Sn, Sb, Au, Hg, Pb) and a four-digit year for the other 105; none is empty. CPKHexColor is empty for 10 and malformed for Pd ("6985", leading zeros lost); the feature does not use it.

**Remark.** PubChem's spellings are the ones the app shows. A learner taught British or IUPAC spelling will search for "aluminium" and "caesium", so the command palette is to find both spellings. The years were not checked against another source, with one exception that stands out: fluorine's 1670. PubChem's own fluorine page explains it (in Jefferson Lab's text, a fluorine compound was first recorded in use around 1670) and also says, in CIAAW's text on the same page, that the element was first isolated in 1886. 1886 is the date a learner will find everywhere else, and the card gives it in a note. Aluminum and calcium, both "Ancient", and silicon's 1854 carry notes of the same kind. Where the sentences of the pages' history text are that these four notes rest on, and those behind the helium, arsenic and francium notes, is kept in `sources/pubchem-element-pages-passages.json`, with what each says in this project's words.

## 7. The 11 elements already in the app

The 11 curated records in `src/chem-data/elements.json`, which the molecule explorer's atom cards show, against the PubChem download. Their atomic weight is from CIAAW's abridged table, their electronegativity from PubChem's periodic table, their first ionization energy from NIST.

| Element | Atomic weight, curated | PubChem | Result | Electronegativity, curated | PubChem | Result | First ionization energy, curated (eV) | PubChem (eV) | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hydrogen (H) | 1.0080 | 1.0080 | agree | 2.2 | 2.2 | agree | 13.598434599702 | 13.598 | agree |
| Boron (B) | 10.81 | 10.81 | agree | 2.04 | 2.04 | agree | 8.298019 | 8.298 | agree |
| Carbon (C) | 12.011 | 12.011 | agree | 2.55 | 2.55 | agree | 11.260288 | 11.260 | agree |
| Nitrogen (N) | 14.007 | 14.007 | agree | 3.04 | 3.04 | agree | 14.53413 | 14.534 | agree |
| Oxygen (O) | 15.999 | 15.999 | agree | 3.44 | 3.44 | agree | 13.618055 | 13.618 | agree |
| Fluorine (F) | 18.998 | 18.99840316 | agree | 3.98 | 3.98 | agree | 17.42282 | 17.423 | agree |
| Sodium (Na) | 22.990 | 22.9897693 | agree | 0.93 | 0.93 | agree | 5.13907696 | 5.139 | agree |
| Phosphorus (P) | 30.974 | 30.97376200 | agree | 2.19 | 2.19 | agree | 10.486686 | 10.487 | agree |
| Sulfur (S) | 32.06 | 32.07 | disagree | 2.58 | 2.58 | agree | 10.3600167 | 10.360 | agree |
| Chlorine (Cl) | 35.45 | 35.45 | agree | 3.16 | 3.16 | agree | 12.967633 | 12.968 | agree |
| Xenon (Xe) | 131.29 | 131.29 | agree | 2.6 | 2.6 | agree | 12.1298437 | 12.130 | agree |

Atomic weight: 10 agree; Sulfur (S) is 32.06 in the curated record and 32.07 in PubChem. Electronegativity: all 11 agree (the curated values were taken from this same PubChem column). First ionization energy: all 11 agree to PubChem's digits; the curated values equal the saved NIST file for all 11. Shell counts derived from PubChem's configuration equal the curated ones for 11 of 11.

Two more things the element card meets. The curated records store a van der Waals radius (Mantina 2009, in ångström) and a covalent radius (Cordero 2008); PubChem's AtomicRadius is a van der Waals radius in picometres. Converted to picometres the curated van der Waals radius equals PubChem's for 9 of 11; it differs for Hydrogen (H): curated 110, PubChem 120; Fluorine (F): curated 147, PubChem 135. And the curated records write configurations in full ("1s2 2s2 2p6 3s1") where PubChem uses a noble-gas core ("[Ne]3s1").

**Remark.** The periodic table takes its atomic weights from CIAAW and its first ionization energies from NIST, as the curated records do, so PubChem's 32.07 for sulfur is shown nowhere, and the two sets of records agree on atomic weight, first ionization energy and covalent radius for all 11 (a test in `src/chem-data/periodic.test.ts` pins this). What still differs is the van der Waals radius of hydrogen and of fluorine, by about 10 pm. For those two the element card shows the table's value and gives the curated value and its source in one sentence (design spec, section 5.3).

## 8. Units and origin of each PubChem column

The download carries no units. Two things on PubChem's own site settle them: the labels in the script its periodic table page loads, and the unit written on each line of its element pages. The last column counts the periodic-table values that equal a line on the element's page, by the source PubChem cites for that line.

| Column | PubChem's label | Unit on the periodic table page | Where the values appear on the element pages |
| --- | --- | --- | --- |
| AtomicMass | Atomic Mass | u | not matched line by line; see section 1 |
| ElectronConfiguration | Electron Configuration | none | 117: Los Alamos; 1 with no identical line (N) |
| Electronegativity | Electronegativity (Pauling Scale) | none | 93: PubChem Elements — (Pauling Scale); 2 with no identical line (Fr, Lr) |
| AtomicRadius | Atomic Radius (van der Waals) | pm | 98: Los Alamos — pm (Van der Waals); 1: Los Alamos — pm pm (Van der Waals) |
| IonizationEnergy | Ionization Energy | eV | 102: Jefferson Lab — eV |
| ElectronAffinity | Electron Affinity | eV | 57: PubChem Elements — eV |
| OxidationStates | Oxidation States | none | 103: Jefferson Lab; 4: Los Alamos; 10 with no identical line (Db, Sg, Bh, Hs, Cn, Fl, Mc, Lv, Ts, Og) |
| StandardState | Standard State | none | 118: Jefferson Lab |
| MeltingPoint | Melting Point | K | 103: Jefferson Lab — K |
| BoilingPoint | Boiling Point | K | 92: Jefferson Lab — K; 1: Jefferson Lab — K (~3100°C or ~5600°F) |
| Density | Density | g/cm³ | 96: Jefferson Lab — grams per cubic centimeter |
| GroupBlock | Chemical Group / Family | none | no such line; see section 6.9 |
| YearDiscovered | Year Discovered | none | no such line |

The units are PubChem's own: u, pm, eV, eV, K, K, g/cm³. The build script stores the same ones and fails if PubChem's label for a column it uses says otherwise. One element page writes "pm pm"; one boiling point is written "~3400 K". The download is a compilation. Ionization energy, melting point, boiling point, density, standard state and most oxidation states are the lines PubChem cites to Jefferson Lab; the radii and configurations are the lines it cites to Los Alamos; the atomic masses agree with CIAAW's tables and, where CIAAW has none, with AME2020 isotope masses (sections 1 and 9.2); electronegativity and electron affinity are cited only to "PubChem Elements". A single citation to PubChem is accurate as the place the numbers were taken from, and the app's citation says that PubChem compiles them from other sources.

## 9. Recorded on 2026-10-03: comparisons the script does not repeat

Everything in this section was computed on 2026-10-03 by the first version of the cross-check scripts, from saved copies: CIAAW's full table of standard atomic weights, the AME2020 mass table, the NUBASE2020 half-lives, and five Wikipedia data pages (section 11 lists each with its address and revision). Of these only the Wikipedia page of densities is kept in this repository; section 5 reads the figures the density notes quote from it. The script copies this section into the report from `cross-check-recorded.md` and recomputes nothing in it, so nothing here has been checked against a source since that date. To repeat a comparison, fetch its source again; the code that made it is in this repository's history, under `docs/research/periodic-table/prototype/`.

The tables and the paragraphs under them are the 2026-10-03 report's own words; only the headings and the sentences that lead into them are new. "PubChem" in it means the periodic table download. It was written before the decisions listed under "What was decided" were made: where it says what the app should do, that list says what was done. Section 9.8 is the exception: it quotes a help page and compares nothing. The script takes one thing from this section, the values that failed the check in 9.4. It reads them from the three tables there, stops if the download no longer holds one of them, and lists them under "Unresolved".

### 9.1 Summary of the recorded comparisons

| Property | Compared with | Elements compared | Agree | Disagree | Not comparable |
| --- | --- | --- | --- | --- | --- |
| Electronegativity (Pauling) | Wikipedia data page (a transcription of WebElements, CRC, Lange) | 93 | 93 | 0 | 2 only in PubChem; 4 only in Wikipedia; 19 in neither |
| Melting point | Wikipedia data page, nearest transcribed value | 103 | 102 within 0.5% | 1 (C) | 15 empty in PubChem |
| Boiling point | Wikipedia data page, nearest transcribed value | 93 | 91 within 0.5% | 2 (Ba, Ra) | 25 empty in PubChem |
| Density | Wikipedia data page, nearest transcribed value | 96 | 93 within 1% | 3 (B, Am, Bk) | 22 empty in PubChem |

The Wikipedia pages are transcriptions and were used only where no primary table could be fetched.

### 9.2 Atomic mass: CIAAW's full table, AME2020 and NUBASE2020

From its section 1.1, the four elements whose mass does not simply agree, with CIAAW's full table beside the abridged one:

| Z | Element | PubChem | CIAAW abridged | CIAAW full table | Result | Difference within CIAAW uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | Lithium (Li) | 7.0 | 6.94 ± 0.06 | [6.938,6.997] | disagree: 6.94 rounds to 6.9 | yes |
| 16 | Sulfur (S) | 32.07 | 32.06 ± 0.02 | [32.059,32.076] | disagree in the last digit | yes |
| 18 | Argon (Ar) | 39.9 | 39.95 ± 0.16 | [39.792,39.963] | tie: 39.95 rounds to 40.0 or 39.9 | yes |
| 26 | Iron (Fe) | 55.84 | 55.845 ± 0.002 | 55.845(2) | tie: 55.845 rounds to 55.85 or 55.84 | no |

Against CIAAW's full table, which the more precise PubChem values must come from: of the 70 elements with a single value, 68 agree and 2 are ties (Fe, As), 0 disagree. Of the 14 elements given as an interval, PubChem's value lies inside the interval, with its ends rounded to PubChem's digits, for 14.

From its section 1, on which elements have a standard atomic weight: the dividing line is not "has a stable isotope": Bismuth (Bi), Thorium (Th), Protactinium (Pa), Uranium (U) have no stable isotope in NUBASE2020 and still have a standard atomic weight, because they occur on Earth with a characteristic isotopic composition.

From its section 1.2, on the 34 elements without a standard atomic weight:

For every one, PubChem's number equals the AME2020 atomic mass of exactly one isotope, rounded to the digits PubChem prints. Among the half-lives NUBASE2020 gives from measurement, that isotope is the longest-lived for 33 elements and tied for longest for Cn. It is the isotope CIAAW's "most stable known isotopes" list gives for 31 elements; for Darmstadtium (Ds), Copernicium (Cn), Oganesson (Og) CIAAW lists a different isotope. A mass marked "estimated" was not measured: AME2020 derived it from trends in neighbouring nuclides. Rounding PubChem's number to a whole number gives the isotope's mass number in all 34 cases.

| Z | Element | PubChem prints | Isotope | AME2020 mass (u) | Half-life (NUBASE2020) | CIAAW most stable | Same isotope as CIAAW |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 43 | Technetium (Tc) | 96.90636 | Tc-97 | 96.906360720 | 4.21 My | 97, 98 | yes |
| 61 | Promethium (Pm) | 144.91276 | Pm-145 | 144.912755748 | 17.7 y | 145 | yes |
| 84 | Polonium (Po) | 208.98243 | Po-209 | 208.982430361 | 124 y | 209 | yes |
| 85 | Astatine (At) | 209.98715 | At-210 | 209.987147423 | 8.1 h | 210 | yes |
| 86 | Radon (Rn) | 222.01758 | Rn-222 | 222.017576017 | 3.8215 d | 222 | yes |
| 87 | Francium (Fr) | 223.01973 | Fr-223 | 223.019734241 | 22.00 m | 223 | yes |
| 88 | Radium (Ra) | 226.02541 | Ra-226 | 226.025408186 | 1.600 ky | 226 | yes |
| 89 | Actinium (Ac) | 227.02775 | Ac-227 | 227.027750594 | 21.772 y | 227 | yes |
| 93 | Neptunium (Np) | 237.048172 | Np-237 | 237.048171640 | 2.144 My | 237 | yes |
| 94 | Plutonium (Pu) | 244.06420 | Pu-244 | 244.064204401 | 81.3 My | 244 | yes |
| 95 | Americium (Am) | 243.061380 | Am-243 | 243.061379889 | 7.350 ky | 243 | yes |
| 96 | Curium (Cm) | 247.07035 | Cm-247 | 247.070352678 | 15.6 My | 247 | yes |
| 97 | Berkelium (Bk) | 247.07031 | Bk-247 | 247.070305889 | 1.38 ky | 247 | yes |
| 98 | Californium (Cf) | 251.07959 | Cf-251 | 251.079587171 | 898 y | 251 | yes |
| 99 | Einsteinium (Es) | 252.0830 | Es-252 | 252.082979173 | 471.7 d | 252 | yes |
| 100 | Fermium (Fm) | 257.09511 | Fm-257 | 257.095105419 | 100.5 d | 257 | yes |
| 101 | Mendelevium (Md) | 258.09843 | Md-258 | 258.098433634 | 51.59 d | 258 | yes |
| 102 | Nobelium (No) | 259.10100 | No-259 | 259.100998364 | 58 m | 259 | yes |
| 103 | Lawrencium (Lr) | 266.120 | Lr-266 | 266.119874 (estimated) | 22 h | 262, 266 | yes |
| 104 | Rutherfordium (Rf) | 267.122 | Rf-267 | 267.121787 (estimated) | 2.5 h | 267 | yes |
| 105 | Dubnium (Db) | 268.126 | Db-268 | 268.125669 (estimated) | 29 h | 268 | yes |
| 106 | Seaborgium (Sg) | 269.128 | Sg-269 | 269.128495 (estimated) | 5 m | 269, 271 | yes |
| 107 | Bohrium (Bh) | 270.133 | Bh-270 | 270.133366 (estimated) | 3.8 m | 270, 274 | yes |
| 108 | Hassium (Hs) | 269.1336 | Hs-269 | 269.133649 (estimated) | 15 s | 269, 270 | yes |
| 109 | Meitnerium (Mt) | 277.154 | Mt-277 | 277.153525 (estimated) | 9 s | 277, 278 | yes |
| 110 | Darmstadtium (Ds) | 282.166 | Ds-282 | 282.166174 (estimated) | 4.2 m | 281 | no |
| 111 | Roentgenium (Rg) | 282.169 | Rg-282 | 282.169343 (estimated) | 130 s | 282 | yes |
| 112 | Copernicium (Cn) | 286.179 | Cn-286 | 286.178691 (estimated) | 30 s | 285 | no |
| 113 | Nihonium (Nh) | 286.182 | Nh-286 | 286.182456 (estimated) | 12 s | 285, 286 | yes |
| 114 | Flerovium (Fl) | 290.192 | Fl-290 | 290.191875 (estimated) | 80 s | 289, 290 | yes |
| 115 | Moscovium (Mc) | 290.196 | Mc-290 | 290.196235 (estimated) | 840 ms | 288, 289, 290 | yes |
| 116 | Livermorium (Lv) | 293.205 | Lv-293 | 293.204583 (estimated) | 70 ms | 291, 292, 293 | yes |
| 117 | Tennessine (Ts) | 294.211 | Ts-294 | 294.210840 (estimated) | 70 ms | 294 | yes |
| 118 | Oganesson (Og) | 295.216 | Og-295 | 295.216178 (estimated) | 680 ms | 294 | no |

**Remark.** A periodic table normally prints these as a mass number in square brackets, for example [209] for polonium, to show that the element has no atomic weight. Printing "208.98243 u" beside "atomic mass" would tell a learner that polonium has an atomic weight known to eight figures. The value should be labelled as the mass of the named isotope, or shown as the bracketed mass number. Oganesson's 295.216 is the estimated mass of oganesson-295, for which NUBASE2020 gives a half-life of 680 ms with an uncertainty of 540 ms; CIAAW's list gives only oganesson-294.

### 9.3 Electronegativity (Pauling scale) against a Wikipedia transcription

Compared with Wikipedia's "Electronegativities of the elements (data page)" (revision 1365095191, 2026-07-20). That page is a transcription, not a primary source: it gives a value to use, taken from WebElements (which cites Allred 1961 and Huheey 1993), and beside it the CRC Handbook and Lange's Handbook values where they differ. Its Pauling table stops at nobelium (102).

PubChem has 95 values and leaves 23 empty. 93 agree with the page's value to use; none disagree.

| Z | Element | PubChem | Wikipedia value to use | WebElements | CRC | Lange | What differs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | Promethium (Pm) | empty | 1.10 to 1.20 | 1.10 | 1.10 | 1.10 | PubChem empty, Wikipedia has a value |
| 63 | Europium (Eu) | empty | 1.1 to 1.2 | 1.1 | 1.1 | 1.1 | PubChem empty, Wikipedia has a value |
| 65 | Terbium (Tb) | empty | 1.1 | 1.1 | 1.1 | 1.1 | PubChem empty, Wikipedia has a value |
| 70 | Ytterbium (Yb) | empty | 1.1 to 1.2 | 1.1 | 1.1 | 1.1 | PubChem empty, Wikipedia has a value |
| 87 | Francium (Fr) | 0.7 | no data | 0.7 | 0.7 | 0.7 | Wikipedia recommends no value; its three source columns have this one |
| 103 | Lawrencium (Lr) | 1.3 | not listed |  |  |  | beyond the end of Wikipedia's table |

Empty in both: He, Ne, Ar, Rn, Rf, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Nh, Fl, Mc, Lv, Ts, Og.

Where the transcribed handbooks differ from PubChem (11 elements): F 3.98 (CRC 3.98, Lange 3.90); Tc 1.9 (CRC 2.10, Lange 2.10); Lu 1.27 (CRC 1.0, Lange 1.0); W 2.36 (CRC 1.7, Lange 1.7); Pt 2.28 (CRC 2.2, Lange 2.2); Au 2.54 (CRC 2.4, Lange 2.4); Tl 1.62 (CRC 1.8, Lange 1.8); Pb 2.33 (CRC 1.8, Lange 1.8); Bi 2.02 (CRC 1.9, Lange 1.9); U 1.38 (CRC 1.7, Lange 1.7); Np 1.36 (CRC 1.3, Lange 1.3).

**Remark.** The agreement shows that PubChem's column is the WebElements set; it is not an independent confirmation of each number. The handbooks disagree with that set by up to 0.66 for the heavy elements, because electronegativity is a derived scale, not a measurement. The Wikipedia page itself warns that values for the highly radioactive elements are predictions that are not marked as such, and singles out francium's 0.7. Francium's 0.7 is the lowest value in PubChem's column, so it would set the bottom of a colour scale; the lowest value with a recommended figure is caesium's 0.79. Helium, neon and argon have no Pauling value because the scale is built from bond energies and they form no ordinary compounds: "not measured" is the wrong phrase for them.

### 9.4 Melting point, boiling point and density: a plausibility check

These three are shown on the card, and melting point and density colour the table. No single primary source covers them, so each PubChem value is compared with the nearest value on the matching Wikipedia data page, which transcribes WebElements, the CRC Handbook and Lange's Handbook (and gives several allotropes where they exist). A value passes when a transcribed value lies within 0.5% (and at least 1 K) for temperatures, or within 1% for density. This catches a wrong unit or a wrong number; it does not confirm the last digit.

**Melting point:** 103 compared, 102 pass, 1 does not.

| Z | Element | PubChem (K) | Nearest transcribed | From | Off by | All transcribed values |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | Carbon (C) | 3823 | 3800 | WEL, carbon (graphite) | 0.6% | WEL 3800; CRC 4762.15; CRC 4713.15; LNG 3773.15 |

**Boiling point:** 93 compared, 91 pass, 2 do not.

| Z | Element | PubChem (K) | Nearest transcribed | From | Off by | All transcribed values |
| --- | --- | --- | --- | --- | --- | --- |
| 56 | Barium (Ba) | 2170 | 2143 | WebEl, barium | 1.2% | WebEl 2143; CRC 2118.15; Lange 2118.15; Zhang et al. 1910 |
| 88 | Radium (Ra) | 1413 | 2010 | WebEl, radium | 42.3% | WebEl 2010; Lange 2010.15 |

**Density:** 96 compared, 93 pass, 3 do not.

| Z | Element | PubChem (g/cm³) | Nearest transcribed | From | Off by | All transcribed values |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | Boron (B) | 2.37 | 2.34 | use, boron | 1.3% | use 2.34; WEL 2.46; LNG 2.34; CRC 2.34 |
| 95 | Americium (Am) | 13.69 | 12 | use, americium | 12.3% | use 12; LNG 12; CRC 12 |
| 97 | Berkelium (Bk) | 14 | 13.25 | use, berkelium (beta) | 5.4% | use 14.78; WEL 14.78; LNG 14.78; CRC 14.78; use 13.25; LNG 13.25; CRC 13.25 |

**Remark.** Radium's boiling point is the one large outlier: PubChem's periodic table has 1413 K and the other tabulations 2010 K. Americium's density (13.69 against 12 g/cm³) and berkelium's (14, between the 14.78 and 13.25 of its two forms) differ between sources. Boron, barium and carbon are within about 1%; carbon's value is discussed in section 6.2.

### 9.5 What other tabulations say of arsenic, carbon and helium

From the 2026-10-03 report's section 6.2:

**Remark.** Neither is a typing error. Arsenic turns straight from solid to vapour at atmospheric pressure (the CRC and Lange rows on the Wikipedia page mark its boiling point "subl."), and its "melting point" of 1090 K is measured under pressure (the CRC row reads "tp 817 °C (at 3.70 MPa)"). Carbon also sublimes: PubChem's 4098 K is the CRC value "3825 °C (subl.)". Helium's 0.95 K is the lowest melting point in the column, and helium does not freeze at atmospheric pressure at any temperature: the Wikipedia page gives its melting only at 25 atm and above, and Lange's row reads "(at 25 atm)". Carbon's 3823 K is the highest melting point in the column, above tungsten's 3695 K. So both ends of a melting-point colour scale are values that are not melting at ordinary pressure.

From its section 6.4: The gas densities are at 0 °C, and the Wikipedia rows that match the solids are marked "near r.t.", so the column is not at one temperature.

### 9.6 Van der Waals radius against Bondi and Mantina

From the 2026-10-03 report's section 6.5: PubChem's AtomicRadius column was compared with the van der Waals column of Wikipedia's "Atomic radii of the elements (data page)" (Bondi 1964 and Mantina 2009): 50 of 99 match; 5 differ (F 135 against 147; Pd 202 against 163; Pt 209 against 175; Hg 209 against 155; U 240 against 186); 44 have no value there at all (most transition metals, all lanthanides and actinides). Nickel, copper, zinc, silver, cadmium and gold were among the 50 that match; the report calls copper's 140 pm and zinc's 139 pm "Bondi's values, as Wikipedia cites them".

### 9.7 Whether PubChem had changed since the download

A fresh copy of the periodic table fetched on 2026-10-03 was byte-identical to the committed one. It has not been fetched again.

### 9.8 What NIST's brackets and parentheses mean

Section 2 and the build script read NIST's marking of each ionization energy: no mark, square brackets, or parentheses. The meaning is from the help page of the NIST Atomic Spectra Database's ionization energy form (https://physics.nist.gov/PhysRefData/ASD/Html/iehelp.html), read on 2026-10-03 and not kept. Its words:

> Some ionization energies are in square brackets "[ ]" and some are in parentheses "( )". Square brackets indicate the energies determined by interpolation, extrapolation, or other semi-empirical procedure relying on some known experimental values. Parentheses indicate energies that have been determined from an ab-initio calculation, or are otherwise not derived from evaluated experimental data.

In the saved file the two halves of a mark are in the columns headed "Prefix" and "Suffix", on either side of the energy. The build reads an energy with neither as measured, with "[" and "]" as semi-empirical, and with "(" and ")" as theoretical, and stops on any other pair.

## 10. What was not checked

- **Electron affinity** (57 values): no independent comparison here. `units.md` (section 9) records that the column is a 1990 compilation and that a comparison with a secondary source found it dated; the card is to say that the values are from a 1990 compilation.
- **Van der Waals radius**: compared once with a Wikipedia transcription of Bondi and Mantina (section 9.6); the origin of the transition-metal, lanthanide and actinide values was not found.
- **Covalent radius**: taken from PubChem's element pages. That the values there are Cordero's was confirmed for the 11 curated elements only (section 6.5). Why 8 of the radii have no uncertainty was not found out: Cordero 2008 was not read.
- **Year discovered**: not compared with another source, apart from the remark on fluorine.
- **Oxidation states**: scanned for form and against PubChem's own element pages, not compared with an independent list.
- **Melting point, boiling point, density**: compared once with a transcription to within 0.5% or 1% (section 9.4), not digit by digit, and not against a primary source.
- **That the six melting points noted as estimates are estimates**: PubChem's pages say how little of each element has been made, and none says that its melting point is an estimate (section 6.2).
- **The handbooks behind the density notes**: the CRC Handbook and Lange's Handbook were read only through the kept Wikipedia transcription (section 5).
- **Electronegativity**: the one comparison (section 9.3) was with a transcription that shares its origin (WebElements) with PubChem. No primary source for Pauling values was fetched.
- **Ionization energy and configuration for elements 109 to 118**: NIST has no entry; PubChem has no ionization energy for them either.
- **The IUPAC definition of a transition element** (for group 12): the IUPAC Gold Book refused an automated request.
- **Everything in section 9**: computed on 2026-10-03 and not repeated since, because its sources are not kept.
- **Whether PubChem has changed since the download**: not rechecked since 2026-10-03 (section 9.7).

## 11. Sources

Saved copies the script reads, in `docs/research/periodic-table/sources/`. The Wikipedia page is kept under its own licence; `README.md` in that folder gives the attribution:

| Saved copy | What it is | URL |
| --- | --- | --- |
| `ciaaw-abridged-atomic-weights-extract.json` | Extract of CIAAW's page Abridged Standard Atomic Weights 2024: each element's atomic number, symbol and name, its standard atomic weight as printed (value ± uncertainty, or a dash) and the footnote letters beside it. Written by extract-ciaaw-pages.mjs from the page as retrieved; the page itself is not kept | https://www.ciaaw.org/abridged-atomic-weights.htm |
| `ciaaw-radioactive-elements-extract.json` | Extract of CIAAW's list of the most stable known isotope of each element without a standard atomic weight: each element's atomic number and symbol and the mass numbers listed for it. Written by extract-ciaaw-pages.mjs from the page as retrieved; the page itself is not kept | https://www.ciaaw.org/radioactive-elements.htm |
| `nist-asd-ie-neutral.txt` | NIST Atomic Spectra Database, ground states and ionization energies of the neutral atoms, eV, tab-delimited | https://physics.nist.gov/cgi-bin/ASD/ie.pl?spectra=H-Og+I&submit=Retrieve+Data&units=1&format=3&order=0&at_num_out=on&sp_name_out=on&ion_charge_out=on&el_name_out=on&seq_out=on&shells_out=on&conf_out=on&level_out=on&ion_conf_out=on&e_out=0&unc_out=on&biblio=on |
| `wikipedia-densities-of-the-elements-data-page.wikitext` | Wikipedia, Densities of the elements (data page), revision 1258326075 | https://en.wikipedia.org/wiki/Densities_of_the_elements_(data_page)?oldid=1258326075 |
| `pubchem-element-pages-extract.json` | Property lines, each with the source PubChem cites, from PubChem's 118 element pages (reduced by extract-pubchem-pages.mjs) | https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/<Z>/JSON |
| `pubchem-element-pages-passages.json` | Where the sentences are, in the history, description and uses text of PubChem's element pages, that notes in decisions.json rest on: each by its element, heading and the source PubChem credits, with what it says in this project's words (recorded by extract-pubchem-pages.mjs). The sentences themselves, which are Jefferson Lab's, Los Alamos's or CIAAW's, are not kept | https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/<Z>/JSON |
| `pubchem-ptable-column-labels.json` | Name and unit label of each column, from the script PubChem's periodic table page loads (reduced by extract-pubchem-pages.mjs) | https://pubchem.ncbi.nlm.nih.gov/ptable/ptable.min.js |

The script also reads the download itself (`pubchem-periodic-table.json`), `decisions.json` for the isotope each mass belongs to, `cross-check-recorded.md` for section 9, and the app's `src/chem-data/elements.json` and `src/chem-data/library-index.json`.

Read on 2026-10-03 and not kept in the repository. Section 9 rests on these; the NIST help page is where the meaning of NIST's brackets and parentheses (section 2) comes from, and section 9.8 quotes it:

| Copy | What it is | URL |
| --- | --- | --- |
| `ciaaw-atomic-weights.html` | CIAAW Standard Atomic Weights 2024 (full table: intervals and full precision) | https://www.ciaaw.org/atomic-weights.htm |
| `ame2020-mass_1.mas20.txt` | AME2020 atomic mass evaluation, mass table (Wang et al., Chinese Physics C 45, 030003, 2021) | https://www-nds.iaea.org/amdc/ame2020/mass_1.mas20.txt |
| `nubase2020-nubase_4.mas20.txt` | NUBASE2020 evaluation of nuclear properties, half-lives (Kondev et al., Chinese Physics C 45, 030001, 2021) | https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt |
| `nist-asd-ie-help.html` | NIST ASD ionization energy help page (the meaning of brackets and parentheses) | https://physics.nist.gov/PhysRefData/ASD/Html/iehelp.html |
| `wikipedia-electronegativities-data-page.wikitext` | Wikipedia, Electronegativities of the elements (data page), revision 1365095191 | https://en.wikipedia.org/wiki/Electronegativities_of_the_elements_(data_page)?oldid=1365095191 |
| `wikipedia-atomic-radii-data-page.wikitext` | Wikipedia, Atomic radii of the elements (data page), revision 1372859669 | https://en.wikipedia.org/wiki/Atomic_radii_of_the_elements_(data_page)?oldid=1372859669 |
| `wikipedia-melting-points-of-the-elements-data-page.wikitext` | Wikipedia, Melting points of the elements (data page), revision 1337535216 | https://en.wikipedia.org/wiki/Melting_points_of_the_elements_(data_page)?oldid=1337535216 |
| `wikipedia-boiling-points-of-the-elements-data-page.wikitext` | Wikipedia, Boiling points of the elements (data page), revision 1337535288 | https://en.wikipedia.org/wiki/Boiling_points_of_the_elements_(data_page)?oldid=1337535288 |

All retrieved 2026-10-03. The Wikipedia pages are transcriptions and were used only where no primary table could be fetched; the report says so wherever one is used.
