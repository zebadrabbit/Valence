# PubChem periodic table download: units and meaning of every column

Checked 2026-10-04 UTC (2026-10-03 local) against PubChem itself, in headless Chromium (Playwright), plus PubChem's per-element records for all 118 elements. Everything here was read from a fetched page or computed by a script in this folder, except where a line says "not checked".

The live download at `https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON` was byte-identical (`cmp`) to the committed `docs/research/periodic-table/pubchem-periodic-table.json`. PubChem's own periodic table page loads that same URL to draw itself, so the page and the file cannot disagree.

## 1. What changes the plan

1. **The plan's unit guesses are all correct.** u, Pauling scale, pm, eV, eV, K, K, g/cm³. PubChem prints these on its page; the list view prints the unit beside every one of 1,234 values, and every value matches the download.
2. **"AtomicRadius" is a van der Waals radius, and it is not one consistent set.** PubChem takes it from Los Alamos National Laboratory, which gives no source. About half the values (48 of 99) match Bondi 1964 or Mantina 2009; 49 (fluorine, most transition metals, every lanthanide and actinide) match none of five published sets; the last two (osmium, uranium) coincide with a value in a later set. It does not show the textbook "radius falls across a period" trend: 9 of 30 main-group steps go up, not down (boron 192 is larger than lithium 182). It must not be labelled plain "atomic radius", and colouring by it as a periodic trend is an owner decision (section 5).
3. **"AtomicMass" is two different things.** For 84 elements it is PubChem's rounding of the IUPAC standard atomic weight. For 34 elements with no standard atomic weight (Tc, Pm, Po to Ac, Np to Og) it is the mass of one isotope, and for the 16 from lawrencium on that mass is an estimate. PubChem's table shows it with no brackets and no note. The card must say which isotope (section 6).
4. **An empty cell does not mean "not measured".** For 18 elements PubChem's element page shows an electron affinity of "0 eV" and the table blanks it. For 6 elements PubChem has a NIST ionization energy on the element page but not in the table. Use "no value listed" (section 7).
5. **The curated `elements.json` stores radii in Å; PubChem uses pm.** The card would mix units, and for hydrogen and fluorine the two sources give different numbers (110 vs 120 pm; 147 vs 135 pm).
6. Outside units, found in passing and reported so they are not lost (section 9): meitnerium's configuration ends "(calculated)", not "(predicted)"; 13 superheavy elements have oxidation states PubChem's element page marks as predicted and the table does not; "YearDiscovered" uses mixed rules; 26 ionization energies differ from NIST; the electron affinities are from a 1990 compilation.

## 2. The unit table

| Column | Unit | Meaning | PubChem's stated source | Evidence (what the page showed) | Caveat |
| --- | --- | --- | --- | --- | --- |
| `AtomicMass` | u (unified atomic mass unit, same as dalton) | 84 elements: relative atomic mass, PubChem's rounding of the IUPAC/CIAAW standard atomic weight. 34 elements: mass of one named isotope | "the atomic mass data used in the Periodic Table are all hard-coded based on the values provided by CIAAW and IAEA" (Kim et al. 2021, PubChem's own paper). Isotope masses: IAEA Atomic Mass Data Center, AME2020 | Selector: "Atomic Mass, u". Key cell: "Atomic Mass, u". List view: "1.0080 u", "55.84 u", "200.59 u" (118 of 118 carry "u"). Plot axis: "Atomic Mass [u]" | Two meanings in one column. Where CIAAW gives a range, PubChem prints the middle of the range rounded: lithium is 7.0 (CIAAW range 6.938 to 6.997, conventional 6.94), argon 39.9, lead 207, sulfur 32.07. Not the same numbers as the CIAAW abridged table |
| `Electronegativity` | none (dimensionless), Pauling scale | Tendency of an atom to attract a bonding pair of electrons | Element page: "A.L. Allred, J. Inorg. Nucl. Chem., 1961, 17(3-4), 215-221" via "PubChem Elements" for 93 of 95 values | Selector: "Electronegativity (Pauling Scale)". Element page: "2.2 (Pauling Scale)", "1.83 (Pauling Scale)", "2 (Pauling Scale)". List view prints no unit (95 of 95) | Francium 0.7 and lawrencium 1.3 are in the table but have no electronegativity entry or source on their element pages. Trailing zeros are dropped: calcium "1", mercury "2", krypton "3", polonium "2". 23 empty |
| `AtomicRadius` | pm | Van der Waals radius | Element page: "Van der Waals Atomic Radius ... Los Alamos National Laboratory, U.S. Department of Energy" for 99 of 99 values. Los Alamos's page gives no source | Selector: "Atomic Radius (van der Waals), pm". List view: "120 pm", "194 pm", "209 pm" (99 of 99 carry "pm"). Plot axis: "Atomic Radius (van der Waals) [pm]" | Not one consistent set; see section 5. Fluorine's 135 pm matches no published set checked (Bondi and Mantina give 147). 19 empty (Fm onward) |
| `IonizationEnergy` | eV (per atom) | First ionization energy: energy to remove one electron from the isolated neutral atom. PubChem's label just says "Ionization Energy" | Element page: Jefferson Lab for all 102 values | Selector: "Ionization Energy, eV". List view: "13.598 eV", "7.902 eV", "10.438 eV" (102 of 102 carry "eV"). Element page shows the NIST value beside it: H 13.598434599702, Fe 7.9024681, Hg 10.437504 eV | 26 values differ from the NIST value on the same page by more than rounding (tantalum 7.89 vs 7.5496; osmium 8.7 vs 8.438; thorium 6.08 vs 6.307; technetium 7.28 vs 7.119). 16 empty; for Lr to Hs PubChem's element page has a NIST value the table omits. 1 eV per atom = 96.485 kJ/mol |
| `ElectronAffinity` | eV (per atom) | "the energy released when an additional electron is attached to a neutral atom to form a singly charged negative ion" (PubChem). Positive means energy is released | Element page: "R.T Myers, J. Chem. Edu., 1990, 67(4), 307" via "PubChem Elements" for all 57 values | Selector: "Electron Affinity, eV". List view: "0.754 eV" (H), "0.163 eV" (Fe) (57 of 57 carry "eV"). Mercury: list view shows nothing; element page shows "0 eV" | A 1990 compilation. For 18 elements (He, Be, N, Ne, Mg, Ar, Ca, Mn, Zn, Kr, Sr, Cd, Xe, Ba, Hf, Hg, Rn, Ra) the element page shows "0 eV" and the table is blank: blank here means "this source lists zero", not "not measured". Fluorine is 3.339 here; current compilations give 3.401. Astatine 2.8 here; measured value 2.416 |
| `OxidationStates` | none (text) | "The oxidation state(s) that this element commonly has in a compound" | Jefferson Lab for 103 elements; Los Alamos for the rest | Selector: "Oxidation States". List view: "+1, -1" (H), "+3, +2" (Fe), "+2, +1" (Hg) | Format is not uniform: astatine and Db to Mc have no plus signs ("7, 5, 3, 1, -1"); flerovium reads "6, 4,2, 1, 0". For Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Fl, Mc, Lv, Ts, Og the element page marks some or all states "(predicted)" and the table drops the mark. Nihonium empty |
| `StandardState` | none (text) | Phase at 25 °C. Element page summary: "iron is a solid at 25°C (room temperature)" | Jefferson Lab ("Phase at Room Temperature") for all 118 | Selector: "Standard State". List view: "Gas", "Solid", "Liquid"; page renders "Expected to be a Solid" as "Solid (Expected)" | Consistent with the melting and boiling points read as kelvin for all 103 elements that have a melting point (script check, no contradictions) |
| `MeltingPoint` | K | "the temperature at which a substance changes state from solid to liquid at atmospheric pressure" | Jefferson Lab for all 103 values | Selector: "Melting Point, K". List view: "13.81 K", "1811 K", "234.32 K". Element page: "1811 K (1538°C or 2800°F)", "234.32 K (-38.83°C or -37.89°F)" | Three are not ordinary melting points: helium 0.95 K (helium does not solidify at ordinary pressure); carbon 3823 K (carbon sublimes at atmospheric pressure); arsenic 1090 K (measured at 28 atmospheres, and higher than its boiling point). 15 empty; Los Alamos has values, mostly marked predicted, for 5 of those on the element page |
| `BoilingPoint` | K | "The temperature at which this element changes state from liquid to gas at a given atmospheric pressure" | Jefferson Lab for all 93 values | Selector: "Boiling Point, K". List view: "20.28 K", "3134 K", "629.88 K". Element page: "629.88 K (356.73°C or 674.11°F)" | Arsenic 887 K and carbon 4098 K are sublimation temperatures. Curium's "3400" is "~3400 K" on the element page. 25 empty; Los Alamos has values for 14 of those on the element page |
| `Density` | g/cm³ | Mass per unit volume of the element in its standard state. Gases: at 0 °C and 1 atm. Solids and liquids: near room temperature | Jefferson Lab for all 96 values | Selector: "Density, g/cm³". List view: "0.00008988 g/cm³", "7.874 g/cm³", "13.5336 g/cm³". Element page: "7.874 grams per cubic centimeter" | PubChem and Jefferson Lab state no temperature. A script shows all 11 gas values equal the ideal-gas density at 0 °C and 1 atm within 2% and are 7 to 11% above the 25 °C value. So gas densities and the "state at 25 °C" refer to different temperatures. Astatine's "7" is "about 7" on the element page. Allotrope is not stated (carbon 2.2670 is graphite's density). Range spans a factor of 250,000. 22 empty |
| `YearDiscovered` | none (calendar year CE, or "Ancient") | Year the element was discovered; no definition given | Not attributed in the table or on the element page | Selector: "Year Discovered". List view: "1766" (H), "Ancient" (Fe, Hg) | Mixed rules. Aluminium and calcium are "Ancient" although the same PubChem pages say they were first isolated in 1825 and 1808. Fluorine is 1670 (first recorded use of a fluorine compound; isolated 1886). Silicon is 1854 (crystalline silicon; discovered 1824) |
| `ElectronConfiguration` | none (text) | Ground-state configuration of the neutral atom | Los Alamos | List view shows it with superscripts; the "(predicted)" suffix is not shown in the list view | 9 end "(predicted)" and meitnerium ends "(calculated)" |
| `GroupBlock` | none (text) | PubChem's ten categories | PubChem (the element page's Jefferson Lab line is only Metal / Non-metal / Semi-metal) | Selector: "Chemical Group / Family" | The page also offers "Metal / Metalloid / Nonmetal" (91 / 7 / 20), which is not in the download |

## 3. Three well-known elements, column by column

Download value, then what PubChem's element page shows with its unit and source.

| Column | Hydrogen | Iron | Mercury |
| --- | --- | --- | --- |
| AtomicMass | 1.0080; page header "1.0080 u"; CIAAW line "[1.007 84, 1.008 11]" | 55.84; "55.84 u"; CIAAW line "55.845(2)" | 200.59; "200.59 u"; CIAAW line "200.592(3)" |
| Electronegativity | 2.2; "2.2 (Pauling Scale)", Allred 1961 | 1.83; "1.83 (Pauling Scale)", Allred 1961 | 2; "2 (Pauling Scale)", Allred 1961 |
| AtomicRadius | 120; "120 pm (Van der Waals)", Los Alamos | 194; "194 pm (Van der Waals)", Los Alamos | 209; "209 pm (Van der Waals)", Los Alamos |
| IonizationEnergy | 13.598; "13.598 eV", Jefferson Lab; NIST 13.598434599702 eV | 7.902; "7.902 eV"; NIST 7.9024681 eV | 10.438; "10.438 eV"; NIST 10.437504 eV |
| ElectronAffinity | 0.754; "0.754 eV", Myers 1990 | 0.163; "0.163 eV", Myers 1990 | empty; page shows "0 eV", Myers 1990 |
| MeltingPoint | 13.81; "13.81 K (-259.34°C or -434.81°F)" | 1811; "1811 K (1538°C or 2800°F)" | 234.32; "234.32 K (-38.83°C or -37.89°F)" |
| BoilingPoint | 20.28; "20.28 K (-252.87°C or -423.17°F)" | 3134; "3134 K (2861°C or 5182°F)" | 629.88; "629.88 K (356.73°C or 674.11°F)" |
| Density | 0.00008988; "0.00008988 grams per cubic centimeter" | 7.874; "7.874 grams per cubic centimeter" | 13.5336; "13.5336 grams per cubic centimeter" |
| StandardState | Gas; "a gas at 25°C (room temperature)" | Solid; "a solid at 25°C" | Liquid; "a liquid at 25°C" |
| OxidationStates | "+1, -1" | "+3, +2" | "+2, +1" |
| YearDiscovered | 1766 | Ancient | Ancient |

Carbon, cesium, xenon, technetium, promethium, polonium, oganesson, arsenic and helium pages were rendered and read as well (text and screenshots in `out/`).

Beyond three elements: `compare-list.cjs` parsed the rendered "LIST W/PROPERTIES" view and compared all 1,234 non-empty values in the twelve displayed columns with the download. Every numeric value matched and every one carried the unit above. The only differences are presentational: the page drops "(predicted)" and "(calculated)" from configurations and shows "Solid (Expected)" for "Expected to be a Solid".

## 4. Which source each column comes from

`provenance.cjs` matched each download value against the sourced values in PubChem's element record (`rest/pug_view/data/element/N/JSON`, all 118 saved in `pugview/`).

| Column | Result |
| --- | --- |
| AtomicRadius | 99 of 99 equal the Los Alamos "Van der Waals" line |
| MeltingPoint | 103 of 103 equal the Jefferson Lab line |
| BoilingPoint | 93 of 93 Jefferson Lab (curium after removing "~") |
| Density | 96 of 96 Jefferson Lab (astatine after removing "about") |
| StandardState | 118 of 118 Jefferson Lab |
| IonizationEnergy | 102 of 102 Jefferson Lab |
| Electronegativity | 93 of 95 Allred 1961; Fr and Lr have no source |
| ElectronAffinity | 57 of 57 Myers 1990 |
| OxidationStates | 103 Jefferson Lab, 9 Los Alamos, 5 Los Alamos reordered with "(predicted)" removed |
| AtomicMass | Matches no single source line; PubChem's own derived value (section 6) |

An archived copy of Jefferson Lab's pages (Wayback Machine, 2022 to 2023 snapshots) confirms the same numbers and units for H, He, C, Fe and As: "Melting Point: 1811 K (1538°C or 2800°F)", "Density: 7.874 grams per cubic centimeter", "Ionization Energy: 7.902 eV", "Phase at Room Temperature: Solid". Jefferson Lab's live site answered with a bot challenge and was not read.

## 5. What "AtomicRadius" is

- PubChem labels it "Atomic Radius (van der Waals), pm" everywhere, and the element page gives Los Alamos National Laboratory as the source for every value. Los Alamos's own page (`periodic.lanl.gov/26.shtml`) shows "Van Der Waals Radius 194" and cites nothing.
- PubChem's element pages carry two other radii the table does not: "Empirical Atomic Radius" (Slater 1964; 87 elements) and "Covalent Atomic Radius" (Cordero et al. 2008; 96 elements).

Comparison with published van der Waals sets (`vdw-compare.cjs`; Mantina 2009 Table 12 read from the paper itself on PubMed Central; Bondi, Batsanov, Hu and Alvarez as transcribed on Wikipedia, which is a secondary copy):

| Element | Download | Bondi 1964 | Mantina 2009 | Alvarez 2013 | Verdict |
| --- | --- | --- | --- | --- | --- |
| H | 120 | 120 | 110 | 120 | Bondi's value. The project's curated value is Mantina's 110 |
| C | 170 | 170 | 170 | 177 | Bondi and Mantina |
| Fe | 194 | none | none | 244 | No match (Batsanov 200, Hu 204). Source unknown |
| Cs | 343 | none | 343 | 348 | Mantina |
| Xe | 216 | 216 | 216 | none listed | Bondi and Mantina |

Across all 99 values: 41 of the 44 main-group elements Mantina covers match Mantina exactly (the exceptions are H, Li and F); H, Li, Ni, Cu, Zn, Ag and Au match Bondi's values instead; osmium and uranium coincide with Hu's and Batsanov's values; 49 match none of the five sets (F, Sc, Ti, V, Cr, Mn, Fe, Co, Y, Zr, Nb, Mo, Tc, Ru, Rh, Pd, Cd, all lanthanides, Hf, Ta, W, Re, Ir, Pt, Hg, Ac, Th, Pa, Np to Es). So it is the same *kind* of radius by label for every element, but the numbers come from at least three origins, one of them untraceable.

What that does to the "trend" (`radius-trend.cjs`):

| Period (groups 1, 2, 13 to 17) | Van der Waals radius from the download, pm |
| --- | --- |
| 2 | Li 182, Be 153, **B 192**, C 170, N 155, O 152, F 135 |
| 3 | Na 227, Mg 173, **Al 184, Si 210**, P 180, S 180, Cl 175 |
| 4 | K 275, Ca 231, Ga 187, **Ge 211**, As 185, **Se 190**, Br 183 |
| Period 4 in full | K 275, Ca 231, Sc 211, Ti 187, V 179, Cr 189, Mn 197, Fe 194, Co 192, **Ni 163, Cu 140, Zn 139**, Ga 187, Ge 211, As 185, Se 190, Br 183, Kr 202 |

- 9 of 30 main-group steps across periods 2 to 6 go up where the textbook rule says down. The same test on PubChem's Slater radii gives 1 of 29, and on its Cordero covalent radii 5 of 30 (all by 10 pm or less).
- The dip at Ni, Cu, Zn is an artefact of taking those three from Bondi and their neighbours from somewhere else.
- Down a group the rule does hold (Li 182, Na 227, K 275, Rb 303, Cs 343; F 135, Cl 175, Br 183, I 198).
- Noble gases are larger than the halogens beside them. That is real for van der Waals radii and the opposite of what covalent-radius diagrams show.

## 6. What "AtomicMass" is

`isotopes.cjs` and `mass-vs-ciaaw.cjs`, using the CIAAW line and the IAEA isotope table inside each PubChem element record.

**84 elements with a CIAAW standard atomic weight.** The download is that value rounded: 70 single values all agree within half a unit of the last digit printed (iron 55.845(2) becomes 55.84; zinc 65.38(2) becomes 65.4). For the 14 elements CIAAW gives as a range (H, Li, B, C, N, O, Mg, Si, S, Cl, Ar, Br, Tl, Pb) the download equals the midpoint of the range rounded, in 14 of 14 cases. This is PubChem's own rounding, not the CIAAW abridged table (lithium 7.0 vs 6.94; sulfur 32.07 vs 32.06; argon 39.9 vs 39.95; lead 207 vs 207.2). Bismuth, thorium, protactinium and uranium have no stable isotope but do have a standard atomic weight, and are in this group.

**34 elements with no standard atomic weight.** The download is the mass of one isotope, matching the IAEA (AME2020) mass on PubChem's own isotope table:

| Z | Symbol | Download | Isotope | Half-life on PubChem's page | Mass measured or estimated |
| --- | --- | --- | --- | --- | --- |
| 43 | Tc | 96.90636 | technetium-97 | 4.21 My | measured |
| 61 | Pm | 144.91276 | promethium-145 | 17.7 y | measured |
| 84 | Po | 208.98243 | polonium-209 | 124 y | measured |
| 85 | At | 209.98715 | astatine-210 | 8.1 h | measured |
| 86 | Rn | 222.01758 | radon-222 | 3.8215 d | measured |
| 87 | Fr | 223.01973 | francium-223 | 22.00 min | measured |
| 88 | Ra | 226.02541 | radium-226 | 1.600 ky | measured |
| 89 | Ac | 227.02775 | actinium-227 | 21.772 y | measured |
| 93 | Np | 237.048172 | neptunium-237 | 2.144 My | measured |
| 94 | Pu | 244.06420 | plutonium-244 | 81.3 My | measured |
| 95 | Am | 243.061380 | americium-243 | 7.350 ky | measured |
| 96 | Cm | 247.07035 | curium-247 | 15.6 My | measured |
| 97 | Bk | 247.07031 | berkelium-247 | 1.38 ky | measured |
| 98 | Cf | 251.07959 | californium-251 | 898 y | measured |
| 99 | Es | 252.0830 | einsteinium-252 | 471.7 d | measured |
| 100 | Fm | 257.09511 | fermium-257 | 100.5 d | measured |
| 101 | Md | 258.09843 | mendelevium-258 | 51.59 d | measured |
| 102 | No | 259.10100 | nobelium-259 | 58 min | measured |
| 103 | Lr | 266.120 | lawrencium-266 | 22 h | estimated |
| 104 | Rf | 267.122 | rutherfordium-267 | 2.5 h | estimated |
| 105 | Db | 268.126 | dubnium-268 | 29 h | estimated |
| 106 | Sg | 269.128 | seaborgium-269 | 5 min | estimated |
| 107 | Bh | 270.133 | bohrium-270 | 3.8 min | estimated |
| 108 | Hs | 269.1336 | hassium-269 | 15 s | estimated |
| 109 | Mt | 277.154 | meitnerium-277 | 9 s | estimated |
| 110 | Ds | 282.166 | darmstadtium-282 | 4.2 min | estimated |
| 111 | Rg | 282.169 | roentgenium-282 | 130 s | estimated |
| 112 | Cn | 286.179 | copernicium-286 | 30 s | estimated |
| 113 | Nh | 286.182 | nihonium-286 | 12 s | estimated |
| 114 | Fl | 290.192 | flerovium-290 | 80 s | estimated |
| 115 | Mc | 290.196 | moscovium-290 | 840 ms | estimated |
| 116 | Lv | 293.205 | livermorium-293 | 70 ms | estimated |
| 117 | Ts | 294.211 | tennessine-294 | 70 ms | estimated |
| 118 | Og | 295.216 | oganesson-295 | 680 ms | estimated |

- In 28 of 34 cases this is the longest-lived isotope in PubChem's table. In the other six (No, Rf, Mt, Cn, Nh, Mc) a longer-lived isotope is listed whose half-life is itself only an estimate, or ties. "The longest-lived isotope with a measured half-life" fits all 34, but PubChem does not state its rule, so the card should name the isotope and not claim "longest-lived".
- The mass number is the download value rounded to a whole number in all 34 cases.
- **How PubChem presents it.** The table cell and the element page header show the bare number with "u": "Atomic Mass 96.90636 u". No brackets, no note. Lower on the same element page, under "Atomic Weight", it shows "98" (Jefferson Lab, Los Alamos) and "[98]" (NIST), a different isotope. For oganesson the header says 295.216 u and the Atomic Weight section says 294. PubChem's page disagrees with itself here.
- **What a learner should be told.** That the number is the mass of one isotope, which one, that the element has no stable isotope and therefore no standard atomic weight, and (Lr onward) that the mass is an estimate. Exact wording is in the plan changes.

## 7. What an empty cell means

| Column | Empty | What the element page shows for the empty ones |
| --- | --- | --- |
| Electronegativity | 23 | He, Ne, Ar, Rn, Pm, Eu, Tb, Yb, Rf to Og: no Pauling value on the element page either |
| AtomicRadius | 19 | Fm to Og: none |
| IonizationEnergy | 16 | Lr, Rf, Db, Sg, Bh, Hs: NIST value present (4.96, 6.02, 6.8, 7.8, 7.7, 7.6 eV; the last five theoretical or extrapolated). Mt to Og: none |
| ElectronAffinity | 61 | 18 elements: "0 eV" (Myers 1990), often with a second, negative value from Zollweg 1969. 43 elements: nothing |
| MeltingPoint | 15 | Rf, Nh, Mc, Lv, Ts: Los Alamos predicted values. Others: none |
| BoilingPoint | 25 | At, Fr, Pa, Bk, Cf, Es, Rf, Cn, Nh, Fl, Mc, Lv, Ts, Og: Los Alamos values, several predicted. Others: none |
| Density | 22 | none |

"Not measured" is wrong for helium's electron affinity (the source lists zero), for lawrencium's ionization energy (measured; NIST 4.96 ± 0.05 eV on PubChem's own page) and for helium's electronegativity (the Pauling scale has no value for it). "No value listed" is true in every case.

## 8. Licence and citation

- **PubChem's periodic table page shows no licence statement.** Its footer links to NLM Web Policies, which says: "Works produced by the U.S. government are not subject to copyright protection in the United States. Any such works found on National Library of Medicine (NLM) Web sites may be freely used or reproduced without permission in the U.S. Please acknowledge NLM as the source of the information by including the phrase "Courtesy of the National Library of Medicine" or "Source: National Library of Medicine.""
- The same page warns that some content is contributed by others and may be copyrighted, and NCBI's policy page names PubChem among resources that "incorporate material contributed or licensed by individuals, companies, or organizations that may be protected by U.S. and foreign copyright laws."
- PubChem Downloads documentation: "PubChem is a free to use database with most of the data readily available for download ... A data source may provide explicit data license information. One should check with the PubChem data source for the most current data licensing information."
- Programmatic access: no more than 5 requests per second. The feature makes no runtime requests, so this only applied to this research (118 record requests at about 2 per second).

**Citation wording PubChem asks for.** The page's Cite button gives (date is the day of access):

- APA: National Center for Biotechnology Information (2026). Periodic Table of Elements. Retrieved October 4, 2026 from https://pubchem.ncbi.nlm.nih.gov/periodic-table/.
- NLM: PubChem [Internet]. Bethesda (MD): National Library of Medicine (US), National Center for Biotechnology Information; 2004-. Periodic Table of Elements; [cited 2026 Oct. 4]. Available from: https://pubchem.ncbi.nlm.nih.gov/periodic-table/
- AMA and MLA forms are in `out/ptable-cite.txt`.

PubChem's Citation Guidelines ask for this general reference: Kim S, Chen J, Cheng T, et al. PubChem 2025 update. Nucleic Acids Res. 2025;53(D1):D1516-D1525. doi:10.1093/nar/gkae1059. The Elements documentation points to the specific paper: Kim S, Gindulyte A, Zhang J, Thiessen PA, Bolton EE. PubChem Periodic Table and Element pages: improving access to information on chemical elements from authoritative sources. Chemistry Teacher International. 2021;3(1):57-65. doi:10.1515/cti-2020-0006. The guidelines add: "To cite an original source of PubChem data ... Refer to attribution on the PubChem record."

**Upstream sources as PubChem labels them on each element page:**

| Source | Used for (in the download) | Licence note on PubChem |
| --- | --- | --- |
| Jefferson Lab, U.S. Department of Energy | Melting point, boiling point, density, standard state, ionization energy, most oxidation states | "Please see citation and linking information: https://education.jlab.org/faq/index.html". That FAQ (archived copy) says information may be used "as long as you properly credit where the information came from" and names "Thomas Jefferson National Accelerator Facility - Office of Science Education" as the author |
| Los Alamos National Laboratory, U.S. Department of Energy | Van der Waals radius, electron configuration, some oxidation states | None stated |
| IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW) | Basis of atomic mass (84 elements) | Links to ciaaw.org/bylaws.htm, which contains no licence terms. Description carries "Copyright © 2020 International Union of Pure and Applied Chemistry" |
| Atomic Mass Data Center, IAEA | Basis of atomic mass (34 elements) | Links to a disclaimer: consensus values, accuracy not guaranteed |
| PubChem Elements (values PubChem took from journal papers) | Electronegativity (Allred 1961), electron affinity (Myers 1990) | https://www.nlm.nih.gov/copyright.html |
| NIST Physical Measurement Laboratory | Not used by the download; shown beside it on element pages | NIST database disclaimer |
| IUPAC Periodic Table of the Elements and Isotopes (IPTEI) | Not used by the download (isotope text and figures on element pages) | CC BY-NC-ND 4.0 |

The existing `pubchem-ptable` entry in `src/chem-data/sources.json` describes itself as the "Pauling electronegativity column"; it needs rewording before it can stand as the source of eight columns.

## 9. Found in passing (outside units)

- **Meitnerium's configuration** is `[Rn]7s2 5f14 6d7 (calculated)`. The plan strips only "(predicted)" and pins "predicted configurations (9)"; the tenth qualified configuration would be left with its suffix in the text.
- **Predicted oxidation states.** The plan keeps PubChem's "predicted" markings, but for 13 elements the marking exists only on the element page, not in the table.
- **Electron affinity is dated.** Against the per-element measurements compiled on Wikipedia's electron affinity data page (secondary source), 10 of 57 differ by more than 0.05 eV: F 3.339 vs 3.401, Ge 1.35 vs 1.233, Tl 0.2 vs 0.320, At 2.8 vs 2.416, Po 1.9 vs 1.40. Calcium, strontium and barium are blank (zero in Myers) but have measured positive values.
- **Ionization energy vs NIST** on the same PubChem page: 26 of 102 differ beyond rounding; nine by more than 0.1 eV (Ta, Os, Th, Ac, At, Fr, Tc, Ir, W).
- **Year discovered** uses mixed rules (table above).
- **Curated radii are in Å** (`schema.ts`: "Radii are in Å"), PubChem's in pm. Curated hydrogen 1.10 Å and fluorine 1.47 Å (Mantina) differ from PubChem's 120 and 135 pm; the other nine agree. Curated sulfur atomic weight 32.06 differs from PubChem's 32.07.

## 10. Not checked

- Jefferson Lab's live pages (bot challenge). Archived copies and PubChem's record of them were used.
- Alvarez 2013 and Bondi 1964 in the original papers (the RSC page returned 403). Their values are from Wikipedia's transcription, which disagrees with itself on Pt and Hg. Mantina 2009 was read from the paper.
- Allred 1961 and Myers 1990 in the original. That the download's digits match those papers rests on PubChem's attribution.
- Where Los Alamos got its transition-metal, lanthanide and actinide radii. Wikipedia's iron infobox cites the Los Alamos page for 194 pm, which is circular.
- Why fluorine's radius is 135 pm.
- Whether a "government work" statement covers values PubChem copied from Jefferson Lab, Los Alamos and journal papers. Plain facts are generally not copyrightable in the United States, but that is a legal question, not a chemistry one.
- The temperature of the solid and liquid densities. Mercury's 13.5336 looks like a 25 °C value; that is from memory, not from a fetched source.

## 11. Files

Scripts (run with `node` from this folder; Playwright is required from `browser-check`):

| File | What it does |
| --- | --- |
| `grab.cjs` | Render one URL, save text, data requests and a full-page screenshot |
| `ptable-interact.cjs` | Property selector options, a screenshot per property, Cite dialog, Download menu, list view |
| `compare-list.cjs` | All list-view values and units vs the download |
| `elements.cjs` | Render element pages with header and Properties screenshots |
| `provenance.cjs` | Which named source each download value equals, from the 118 element records |
| `isotopes.cjs`, `mass-vs-ciaaw.cjs` | What AtomicMass is |
| `vdw-compare.cjs`, `radius-trend.cjs` | Radius comparison and trend test |
| `qualifiers.cjs`, `sanity.cjs`, `ea-compare.cjs` | Dropped qualifiers, gas density temperature, state vs kelvin, ionization energy vs NIST, electron affinity age |

Evidence: `out/` (rendered text, screenshots, script outputs), `pugview/` (118 element records), `ext/` (Los Alamos pages, archived Jefferson Lab pages, Mantina 2009, Wikipedia tables).

Screenshots looked at: `out/ptable.png`, `out/ptable-cite.png`, `out/ptable-download.png`, `out/ptable-prop-AtomicRadius.png`, `out/element-Technetium-top.png`, `out/element-Technetium-props.png`.
