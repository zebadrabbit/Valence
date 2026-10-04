## 9. Recorded on 2026-10-03: comparisons the script does not repeat

Everything in this section was computed on 2026-10-03 by the first version of the cross-check scripts, from saved copies that are not kept in this repository: CIAAW's full table of standard atomic weights, the AME2020 mass table, the NUBASE2020 half-lives, and five Wikipedia data pages (section 11 lists each with its address and revision). The script copies this section into the report from `cross-check-recorded.md` and recomputes nothing in it, so nothing here has been checked against a source since that date. To repeat a comparison, fetch its source again; the code that made it is in this repository's history, under `docs/research/periodic-table/prototype/`.

The tables and the paragraphs under them are the 2026-10-03 report's own words; only the headings and the sentences that lead into them are new. "PubChem" in it means the periodic table download. It was written before the decisions listed under "What was decided" were made: where it says what the app should do, that list says what was done. The script takes one thing from this section, the values that failed the check in 9.4. It reads them from the three tables there, stops if the download no longer holds one of them, and lists them under "Unresolved".

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
