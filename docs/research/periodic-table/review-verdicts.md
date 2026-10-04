# Review verdicts

Condensed output of the plan-verification run of 2026-10-03: for each reviewer, its summary, owner decisions, and (for the chemistry and build reviews) each proposed change with the second reviewer's verdict and correction. Where a correction disagrees with a review file, the correction stands.

```

######## units
SUMMARY: The plan's eight unit guesses are all correct (u, Pauling scale with no unit, pm, eV, eV, K, K, g/cm³). PubChem prints them on its page, and all 1,234 values in its list view match the download. Four things about meaning do change the plan.

- **AtomicRadius is a van der Waals radius from Los Alamos, which cites nothing.** 48 of 99 values match Bondi 1964 or Mantina 2009; 49 match none of five published sets. It does not show the textbook trend: 9 of 30 main-group steps across a period go up (boron 192 pm is larger than lithium 182 pm). It must not be labelled plain "atomic radius".
- **AtomicMass is two quantities.** For 84 elements it is PubChem's own rounding of the IUPAC standard atomic weight (lithium is 7.0, not 6.94). For 34 elements (Tc, Pm, Po to Ac, Np to Og) it is the mass of one isotope, estimated from lawrencium on. PubChem shows it with no brackets or note, and its technetium page says 96.90636 u in the header and "[98]" lower down.
- **An empty cell is not "not measured".** PubChem's element pages show an electron affinity of "0 eV" for 18 elements the table leaves blank, and a NIST ionization energy for six.
- **The curated `elements.json` stores radii in Å; PubChem uses pm.** Hydrogen and fluorine also differ in value (110 vs 120 pm, 147 vs 135 pm).

Found in passing:
- Meitnerium's configuration ends "(calculated)", which the build script as planned would not strip.
- 13 superheavy elements have predicted oxidation states that the table does not mark.
- Gas densities are at 0 °C while "standard state" is at 25 °C.
- Arsenic's melting point is higher than its boiling point.

Licence: the page carries no licence statement. NLM's policy treats it as a US government work that is free to reuse and asks for an acknowledgement, but warns that contributed content may be copyrighted.

Jefferson Lab's live site and the Bondi, Alvarez, Allred and Myers papers could not be read directly.
FILE: research:/units/units.md
OWNER DECISIONS:
- Colour by radius. The download's radius is a mixed-source van der Waals radius that breaks the textbook trend in 9 of 30 main-group steps. Options: (a) keep it, relabelled 'Van der Waals radius' with the caveat; (b) colour by covalent radius instead (Cordero 2008, which PubChem's element pages carry for elements 1-96 and which the project already cites), at the cost of one more data file and a rule for the multi-valued entries (C, Mn, Fe, Co); (c) drop radius from the colourings. I recommend (b)
- Atomic mass for the 34 elements with no stable isotope. Options: show PubChem's isotope mass with the isotope named (for example '96.90636 u, mass of technetium-97'), or show the bracketed mass number most printed tables use. I recommend the first: it is what the source publishes and the note makes it honest. Be aware PubChem picks technetium-97 where most tables print [98].
- Empty-cell wording. The approved spec says 'not measured'. That is untrue for at least 24 cells (18 electron affinities the source lists as zero, 6 ionization energies PubChem holds from NIST). I recommend 'no value listed'; this changes spec text, so it needs your yes.
- Electron affinity on the card. The column is from a 1990 compilation and fluorine reads 3.339 eV against a current 3.401 eV. Options: keep it with the 'from a 1990 compilation' note and let the cross-check report flag differences (recommended, since the spec already turns unresolved disagreements into card notes), or leave electron affinity off the card for this phase.
- Curated versus PubChem values on the card. For hydrogen and fluorine the curated van der Waals radius (110, 147 pm, Mantina) differs from PubChem's (120, 135 pm) that colours the table. The plan already accepts two sources for sodium's atomic weight; I recommend the same here, with the card's one-line 'individually sourced' notice, rather than hiding either number.
- Units shown to learners. PubChem gives energies in eV per atom and temperatures in K; school textbooks often use kJ/mol and °C. I recommend printing PubChem's units unchanged (the project rule is 'digits as published') and giving the conversion in help text, not converting the numbers.
- Attribution and licence. PubChem's table carries no licence; NLM asks for 'Source: National Library of Medicine', Jefferson Lab asks to be credited, Los Alamos states nothing. I recommend committing the download with the citation and per-column source list above and adding one sentence to docs/for-institutions.md naming these sources. If the school's reviewers need a formal licence statement, that needs someone qualified; I cannot give one.
UNVERIFIED:
- Jefferson Lab's live pages returned a bot challenge and were not read. Its numbers and units were taken from PubChem's record of them and from Wayback Machine copies (2022-2023) of five element pages 
- Bondi 1964 and Alvarez 2013 were not read in the original (the RSC page returned 403). Their radii come from Wikipedia's transcription, which disagrees with itself on platinum and mercury. Mantina 200
- Allred 1961 and Myers 1990 were not read. That the download's electronegativities and electron affinities are those papers' values rests on PubChem's attribution on each element page.
- Where Los Alamos got its van der Waals radii for transition metals, lanthanides and actinides is unknown; no primary source could be traced (Wikipedia's iron infobox cites the Los Alamos page itself).
- PubChem does not state its rule for choosing the isotope whose mass it prints for the 34 elements with no standard atomic weight. 'Longest-lived with a measured half-life' fits all 34 but is my infere
- PubChem does not state how it rounds CIAAW values. 'Midpoint of the interval, rounded' fits all 14 interval elements but is my inference.
- The temperature of the solid and liquid densities is stated nowhere on PubChem or the archived Jefferson Lab pages. Only the gas densities were pinned down (0 °C, 1 atm) by calculation.
- The modern electron affinity values used to judge the column's age come from Wikipedia's data page (secondary), not from the primary measurements.
- That carbon sublimes rather than melts at ordinary pressure is general chemistry knowledge supported by Los Alamos's '(sublimation)' tag on PubChem's page; no pressure figure was fetched.
- Whether NLM's 'government works' statement covers values PubChem copied from Jefferson Lab, Los Alamos, IUPAC and journal papers is a legal question I cannot settle. CIAAW's linked 'licence' page cont
- Francium's 0.7 and lawrencium's 1.3 electronegativity have no source on PubChem's element pages; their origin was not found.
CHANGES:
- [must] Plan: 'Facts established before planning' table and its closing paragraph; Task 1 'one uni
    CHANGE: Replace 'units are inferred / provisional' with 'confirmed against PubChem's page on 2026-10-04 UTC'. The build script's unit table is exactly: AtomicMass -> field atomicMass, unit 'u', label 'Atomic mass'; Electronegativity -> electronegativity, unit '' (dimensionless), label 'Electronegativity (Pauling scale)'; AtomicRadius -> atomicRadius, unit 'pm', label 'Van der Waals radius'; IonizationEnergy -> ionizationEnergy, unit 'eV', label 'First ionization energy'; ElectronAffinity -> electronAffinity, unit 'eV', label 'Electron affinity'; MeltingPoint -> meltingPoint, unit 'K', label 'Melting point'; BoilingPoint -> boilingPoint, unit 'K', label 'Boiling point'; Density -> density, unit 'g/cm
- [must] Plan: Task 4 (TrendProperty 'atomicRadius', cellLabel, legend), Task 5 card rows, Task 6 t
    CHANGE: Never print the bare words 'atomic radius'. Label the property 'Van der Waals radius' on the card, in the trend selector, the legend and cellLabel. Card and legend caveat text: 'Half the closest distance between two atoms of the element that are not bonded to each other. PubChem's values come from more than one study, so neighbouring elements are not always comparable. This is not the covalent radius that most textbook trend diagrams use.' Do not describe this colouring anywhere (copy, docs/for-institutions.md, group/period descriptions in Task 2) as showing radius falling across a period. Whether it stays a trend colouring at all is an owner decision.
- [must] Plan: Task 1 schema (PeriodicElement.atomicMass) and buildPeriodicTable(); Task 5 elementC
    CHANGE: Add to the atomicMass record an optional isotope: { massNumber: number; estimated: boolean }, set by the build script from a fixed list of 34 atomic numbers: 43:97, 61:145, 84:209, 85:210, 86:222, 87:223, 88:226, 89:227, 93:237, 94:244, 95:243, 96:247, 97:247, 98:251, 99:252, 100:257, 101:258, 102:259 (estimated false); 103:266, 104:267, 105:268, 106:269, 107:270, 108:269, 109:277, 110:282, 111:282, 112:286, 113:286, 114:290, 115:290, 116:293, 117:294, 118:295 (estimated true). Build fails if Math.round(value) differs from the listed mass number. Card text for these: 'Mass of the isotope {name}-{massNumber}. {Name} has no stable isotope, so it has no standard atomic weight.' plus, when estim
- [must] Plan: Global Constraints ('shown as "not measured"'), Review Focus 1, Task 1 tests, Task 4
    CHANGE: Replace the text 'not measured' with 'no value listed' everywhere it is displayed or tested (keep 'not known' for the year). The cellLabel test string becomes 'Helium, atomic number 2, Noble gas, electronegativity no value listed'. For electron affinity, the build script carries a list of 18 symbols (He, Be, N, Ne, Mg, Ar, Ca, Mn, Zn, Kr, Sr, Cd, Xe, Ba, Hf, Hg, Rn, Ra) and the card shows for them: 'No value listed. PubChem's source (1990) gives zero for this element.' This changes approved spec wording, so it also needs the owner's yes.
- [must] Plan: Task 1 buildPeriodicTable() ('strips (predicted) into the flag') and the registry te
    CHANGE: Strip both ' (predicted)' and ' (calculated)' and keep which one it was (qualifier: 'predicted' | 'calculated'). Pin 9 predicted (Ds to Og) and 1 calculated (Mt). The build fails on any other parenthesised suffix.
- [must] Plan: Task 5 elementCardRows ('choosing the individually sourced value where elements.json
    CHANGE: State the unit rule for curated values: elements.json radii are in Å and must be shown as pm (value × 100, rounded to a whole number) and labelled with which radius they are (vdwRadius -> 'Van der Waals radius'; covalentRadius is a different quantity and is not a substitute). Add tests: hydrogen's card shows 110 pm from mantina-2009 while the trend scale uses 120; fluorine's card shows 147 pm while the trend uses 135; sulfur's card shows atomic weight 32.06 (curated) while PubChem's is 32.07. Curated ionization energy (ionizationEnergiesEv[0]) is already in eV.
- [must] Plan: Task 1 ('The source is the existing pubchem-ptable entry'); Task 5 Sources control; 
    CHANGE: Reword the pubchem-ptable citation, which currently says 'Pauling electronegativity column', to: 'PubChem [Internet]. Bethesda (MD): National Library of Medicine (US), National Center for Biotechnology Information; 2004-. Periodic Table of Elements; [cited 2026 Oct 4]. Available from: https://pubchem.ncbi.nlm.nih.gov/periodic-table/ (data at https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON). Source: National Library of Medicine.' In the Sources control and README, name PubChem's upstream source per column: melting point, boiling point, density, standard state, ionization energy, oxidation states: Jefferson Lab (Thomas Jefferson National Accelerator Facility, Office of Science Edu
- [should] Plan: Task 7 first step ('Open PubChem's periodic table page in a headless browser, read t
    CHANGE: Replace with: 'Write docs/research/periodic-table/README.md recording the unit table, the per-column source, the two meanings of AtomicMass, and the caveats, from the units research of 2026-10-04.' Move this step to Task 1 so the README exists before any value is displayed, as the spec requires ('the plan confirms each unit ... before any value is displayed').
- [should] Plan: Task 5 card rows for density, melting point, boiling point; Task 4 legend for the de
    CHANGE: Add card notes. Density, when standardState is Gas (11 elements): 'For a gas, this is the density at 0 °C and atmospheric pressure.' Helium melting point: 'Helium becomes solid only under pressure.' Carbon melting and boiling point: 'At ordinary pressure carbon turns from solid straight to gas and does not melt.' Arsenic melting point: 'Measured at 28 times atmospheric pressure. At ordinary pressure arsenic turns from solid straight to gas at 887 K, which is why this is higher than its boiling point.' Add a test that arsenic (melting 1090 K, boiling 887 K) passes validation and shows its note. Density legend: say the scale is linear and gases sit at its bottom (values span a factor of 250,00
- [should] Plan: Task 5 card rows for ionization energy and electron affinity; Task 3 cross-check rep
    CHANGE: Card label 'First ionization energy' with help text 'Energy needed to remove one electron from a single neutral atom in the gas phase. 1 eV per atom is 96.485 kJ/mol.' Card help text for electron affinity: 'Energy released when a single neutral atom in the gas phase gains one electron. From a 1990 compilation; newer measurements differ for some elements.' Add electron affinity to the cross-check report's scope as a known-dated column, and expect the ionization-energy cross-check to list about 26 disagreements, each of which the spec says becomes a card note.
- [should] Plan: Task 1 buildPeriodicTable() handling of OxidationStates; Global Constraints ('Text P
    CHANGE: The table itself carries no 'predicted' mark on oxidation states, so the build script needs a fixed list: Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Fl, Mc, Lv, Ts, Og get oxidationStatesPredicted: true and the card shows '(some or all predicted)'. Store the text as published; do not add plus signs or re-space ('7, 5, 3, 1, -1' for astatine and '6, 4,2, 1, 0' for flerovium are PubChem's own text). Flag two approximate numbers the table stripped: astatine density ('about 7') and curium boiling point ('~3400 K') shown with 'about'.
- [could] Plan: Task 1 'Numbers print in the digits their source publishes' and the validator rule '
    CHANGE: Note in the plan that 'published' means PubChem's digits, which drop trailing zeros: electronegativity '1' (Ca), '2' (Hg, Po), '3' (Kr); ionization energy '9' (Pt); density '5' (Ra), '11' (Tc), '14' (Bk); atomic mass '207' (Pb). Print them as they are; do not pad to a fixed number of decimals. Add a test that calcium's electronegativity renders as '1'.
- [could] Plan: Task 5 card row for year discovered; Spec: element card
    CHANGE: Label the row 'Year discovered (as PubChem lists it)' and add notes for four elements: aluminium and calcium ('Listed as Ancient because their compounds were known; the metal was first isolated in 1825 / 1808'), fluorine ('1670 is the first recorded use of a fluorine compound; the element was isolated in 1886'), silicon ('1854 is when crystalline silicon was first made; the element was discovered in 1824').

######## crosscheck
SUMMARY: The cross-check is done and it changes the plan in five places.

1. First ionization energy: PubChem's column is Jefferson Lab's compilation, not NIST. Of 102 comparable values, 76 agree with NIST and 26 disagree, 9 by 0.1 eV or more (Tc, Ta, W, Os, Ir, At, Fr, Ac, Th; tantalum is 0.34 eV off). NIST covers Z 1-108 only.
2. Atomic mass: only 84 elements can be compared with CIAAW (80 agree, 2 ties Ar and Fe, 2 differ: Li 7.0 vs 6.94, S 32.07 vs 32.06, both inside CIAAW's uncertainty). For the other 34, PubChem prints one isotope's AME2020 mass (all 34 matched), 16 of them estimated; it is not an atomic weight.
3. "Atomic radius" is a van der Waals radius from mixed sets: 50 of 99 match Bondi/Mantina, the rest are untraced, and the trend has sourcing artefacts (Zn 139 to Ga 187).
4. Empty does not mean "not measured": 18 empty electron affinities are 0 eV on PubChem's own pages.
5. The schema has no notes field, and the build must handle "(calculated)" (Mt), spaces after the core (N, Fm), and unsigned oxidation states.

Also: electronegativity agrees 93 of 93 with a Wikipedia transcription (same origin, so weak evidence); lawrencium's configuration differs from NIST; radium's boiling point is 42% off other tabulations; 10 superheavy oxidation-state lists lost their "predicted" marks. All seven units are confirmed from PubChem's own labels. The 11 curated elements agree except sulfur's mass.

The report is generated by a script from saved sources, is byte-identical on rerun, passes the repo's ESLint config, and an independent Python recomputation gave the same mass and ionization-energy counts. No tracked file was changed.

Files are in research:/crosscheck/:
- cross-check.md
- cross-check-periodic-table.mjs
- analyse.mjs
- lib.mjs
- extract-pubchem-pages.mjs
- sources/
FILE: research:/crosscheck/cross-check.md
OWNER DECISIONS:
- First ionization energy source. Recommend NIST ASD for Z 1-108, with its measured/semi-empirical/theoretical flag, in place of PubChem's column. It is the primary source, is already the app's source for the 11 curated elements, and removes 26 disagreements. This breaks the spec's 'single source' rule for one property. The alternative is PubChem's values with a note on 26 cards.
- Atomic weight for the 84 elements that have one. Recommend showing CIAAW's abridged value (already the app's cited source), with PubChem as the cross-check. Otherwise lithium shows 7.0 where textbooks show 6.94, and sulfur's card and data disagree (32.06 vs 32.07).
- The 34 elements without an atomic weight. Recommend showing the bracketed mass number, for example [209], with the isotope's mass and name in the detail line, not a bare '208.98243 u'.
- Radius trend. Recommend not offering PubChem's van der Waals column as a trend colouring. Either drop the radius trend, or use covalent radii (Cordero 2008, already cited in the app, 96 elements) as a second named source. If the column is kept, label it 'van der Waals radius' and say on the page that the set is mixed.
- Wording for an empty field. Recommend the neutral 'no value listed' everywhere, with 'not measured' reserved for cases where that is known to be true.
- Categories. Recommend keeping PubChem's ten as given, with card notes for polonium and astatine and a legend line that group 12 and elements 104-118 are placed by position, rather than overriding any category.
- Which end of each detached row is d block: La and Ac (matches the drawn layout with La under Y) or Lu and Lr (matches PubChem's own group numbers). Recommend La and Ac as d block, so the highlight agrees with what is drawn; either way the f block must be 14 wide.
- Density colour scale. Recommend a logarithmic scale, stated in the legend, so the 11 gases are distinguishable.
- Fluorine's year. Recommend showing PubChem's 1670 with a note that the element was isolated in 1886, rather than changing the value.
- Lawrencium's configuration. Recommend showing PubChem's text with a note that NIST gives 7s2 7p1 and labelling the Bohr diagram as uncertain, rather than silently using either.
UNVERIFIED:
- Electron affinity (57 values): no independent comparison. PubChem's two lines disagree on the sign for Be, Mn, Zn, Cd, Hf and I cannot say which is right.
- Atomic radius: compared only with a Wikipedia transcription of Bondi 1964 and Mantina 2009. The origin of the 49 non-matching values (most transition metals, all lanthanides and actinides) was not fou
- Year discovered: not compared with any other source. The fluorine remark rests on the history text on PubChem's own fluorine page.
- Oxidation states: scanned for form and against PubChem's own element pages only, not against an independent list.
- Melting point, boiling point, density: checked only to within 0.5% or 1% of the nearest value on Wikipedia data pages, not digit by digit and not against a primary source.
- Electronegativity: the comparison source is a Wikipedia transcription that shares its origin (WebElements) with PubChem, so 93 of 93 agreeing is weak evidence. No primary Pauling source was fetched.
- Ionization energy and configuration for Z 109-118: NIST has no entry, so nothing to compare.
- The IUPAC Gold Book definition of a transition element (for the group 12 remark) could not be fetched: HTTP 403 from a Cloudflare challenge.
- That the covalent radii on PubChem's element pages are Cordero 2008 was confirmed only for the 11 curated elements, not all 96.
- Where Jefferson Lab's ionization energies, melting points and densities come from was not traced; I only established that PubChem's table equals them.
- Remarks from general chemistry knowledge, not from a fetched source: that the Pauling scale is built from bond energies; that the textbook radius trend refers to covalent or metallic radii; that eleme
- The saved NIST, CIAAW and PubChem copies were fetched on 2026-10-03 local time; the reruns used only the saved copies.
CHANGES:
- [must] Plan Task 3 (Cross-check) and spec 5.5
    CHANGE: Replace 'for all 118 elements' with the real coverage and state the outcome. Atomic mass: 84 comparable with CIAAW (80 agree, 2 ties Ar/Fe, 2 differ Li/S); 34 have no standard atomic weight and are checked against AME2020 isotope masses instead. First ionization energy: 102 comparable with NIST (76 agree, 26 differ); NIST covers Z 1-108 and PubChem is empty for 103-118. Add the three extra checks to the spec: electronegativity against a transcription, configuration against NIST, and a melting/boiling/density plausibility check. Task 3 becomes: move the prototype (cross-check-periodic-table.mjs, analyse.mjs, lib.mjs, extract-pubchem-pages.mjs) into scripts/, the saved copies and MANIFEST.json
- [must] Plan Global Constraints ('Trend colouring uses PubChem values for every element'), Facts t
    CHANGE: State a decision on the ionization-energy source before Task 1. PubChem's column is the Jefferson Lab line on its element pages, not NIST. Either take first ionization energy from the saved NIST file for Z 1-108 (adds Lr, Rf, Db, Sg, Bh, Hs; carry NIST's measured/semi-empirical/theoretical flag), or keep PubChem and put a note on 26 cards: Ge, As, Tc, Sb, Pr, Pm, Ta, W, Re, Os, Ir, Bi, Po, At, Rn, Fr, Ra, Ac, Th, Pu, Am, Cm, Bk, Cf, Es, No.
- [must] Plan Facts table row AtomicMass ('Never empty. Units u'), Task 1 interface (atomicMass: Qu
    CHANGE: Split atomic mass into two kinds: a standard atomic weight (84 elements) and the mass of one isotope (34 elements: Tc, Pm, Po-Ac, Np-Og). Add to the schema, for example atomicMass.kind 'standard-atomic-weight' | 'isotope-mass' plus massNumber. The card must label the 34 as 'mass of the longest-lived isotope, X-A' or show the bracketed mass number; never 'atomic weight'. The mass number equals the PubChem value rounded to a whole number in all 34 cases. Add a registry test pinning the 84/34 split (for example Tc is isotope 97, Og is isotope 295).
- [must] Plan Task 1 interface PeriodicElement and Task 3 last step
    CHANGE: Add notes?: string[] to PeriodicElement and an authored notes table (symbol to text) in the build script. Task 3 says an unresolved disagreement 'becomes a note on that element's record', but the strict schema in Task 1 has no such field, so the build would fail.
- [must] Spec 5.1 rule 1, plan Global Constraints, Review Focus 1, Task 4 cellLabel test ('electron
    CHANGE: Do not use 'not measured' as the universal text for an empty field. Use a neutral phrase such as 'no value listed', or property-specific text. Update the cellLabel and elementCardRows test strings. Drop 'not known' for the year: no year is empty.
- [must] Plan Facts table row ElectronConfiguration, Task 1 build step and registry test (predicted
    CHANGE: Correct the facts: two configurations have a space after the core (N '[He] 2s2 2p3', Fm '[Rn] 5f12 7s2'), and one ends '(calculated)' (Mt), not '(predicted)'. The build must strip both words into the flag and tolerate the space. Pin 10 flagged configurations (9 predicted plus Mt), or pin 9 and 1 separately. Add '[He] 2s2 2p3' and a 7p-before-5f case ('[Rn]7s2 7p2 5f14 6d10') to the shell tests.
- [must] Plan Facts table row AtomicRadius, Task 4 TrendProperty 'atomicRadius', spec 6 'Colour by 
    CHANGE: Label the quantity 'van der Waals radius' everywhere, never 'atomic radius', and decide whether it stays a trend colouring. The fact 'carbon is 170, Bondi's value' holds for only about half the column. If the trend stays, the page needs a sentence that the set is mixed and that this is not the radius the textbook trend describes.
- [must] Plan Task 1 build step and Task 5 card rows; spec 5.1 rule 2 and 7 (oxidation states)
    CHANGE: Head the card row 'Common oxidation states'. Add a + to the unsigned positive entries for display (11 elements: At, Db, Sg, Bh, Hs, Mt, Ds, Rg, Cn, Fl, Mc) and normalise 'Fl 6, 4,2, 1, 0'. Mark Db, Sg, Bh, Hs, Cn, Fl, Mc, Lv, Ts, Og as including predicted states through a note, because the download dropped the source's marks. Nh is the one empty entry.
- [should] Plan Task 5 elementCardRows and Review Focus 5; spec 5.2
    CHANGE: Spell out the mapping from elements.json to card rows. atomicWeight replaces atomic mass (sulfur: card 32.06, PubChem 32.07). ionizationEnergiesEv[0] replaces first ionization energy. Electronegativity is the same source either way. Say which curated radius, if either, replaces PubChem's AtomicRadius and in which unit (curated values are in angstrom). Say which configuration notation is shown: curated is full ('1s2 2s2 2p6 3s1'), PubChem uses a core ('[Ne]3s1').
- [should] Plan Task 4 trendScale and tests; spec 6
    CHANGE: Pin the real scale ends in tests and handle three data problems. Density needs a logarithmic scale or separate handling of gases. The melting-point legend ends are helium (0.95 K, only under about 25 atm) and carbon (3823 K, sublimes), so they need a note. The electronegativity minimum is francium's 0.7, an unsourced extrapolation; caesium's 0.79 is the lowest recommended value. Cells must fit ten characters ('0.00008988').
- [should] Plan Task 1 registry test (expected states 9) and build step; spec 5.1 rule 2
    CHANGE: Keep the count of 9 for PubChem's own 'Expected to be' text, and add notes for the states PubChem does not mark or that its own pages contradict: Rf, Db, Sg, Bh, Hs, Mt are 'Solid' with no melting point, boiling point or density; Cn, Fl and Og have boiling-point lines on PubChem's pages that contradict or leave open the expected state.
- [should] Plan Task 2 elementPosition tests ('La (6, null, f...)', 'Lu (6, null, f...)') and spec 5.
    CHANGE: Do not assign block f to all 15 of La-Lu and all 15 of Ac-Lr. The f block is 14 wide, so one end of each row is d block. Pick the convention and add a test for block sizes: s 14, p 36, d 40, f 28.
- [should] Plan Task 3 notes list (new) and Task 5
    CHANGE: Add card notes, or record a decision, for these single-value findings: Lr configuration (PubChem 6d1, NIST 7p1; Bohr shells 9, 2 vs 8, 3; not marked predicted); Ra boiling point 1413 K vs 2010 K elsewhere; Am density 13.69 vs 12; Bk density 14 vs 14.78/13.25; At density is 'about 7' and Cm boiling point '~3400 K' on PubChem's own pages; As melting point is under pressure and above its boiling (sublimation) point; C boiling point is a sublimation point; He melting point is under pressure; F year 1670 is the first recorded use of a compound (isolated 1886); Fr 0.7 and Lr 1.3 electronegativity have no source line on PubChem's element page; Li mass 7.0 if PubChem's mass is kept.
- [should] Spec 5.4 and plan Task 4 legend
    CHANGE: Keep PubChem's ten categories and the 'one common classification' heading, but add card notes for polonium ('Metalloid' in the table, 'Metal' on PubChem's own page) and astatine ('Halogen' in the table, 'Semi-metal' on its page). Add a legend line that group 12 and elements 104-118 are assigned by position. The group 1 description must say hydrogen is not an alkali metal.
- [should] Plan Task 6 palette test
    CHANGE: The palette must also find 'aluminium' and 'caesium'. Add both to the test beside 'Xe', 'xenon' and 'gold'.
- [should] Plan 'Facts established' closing paragraph and Task 7 first step
    CHANGE: Remove 'units are provisional' and replace the headless-browser unit check with a reference to the saved label extract. All seven units are confirmed. Change the source citation text to say PubChem compiles the table from Jefferson Lab, Los Alamos, CIAAW/IUPAC and NIST.
- [could] Plan Task 5 test list
    CHANGE: Keep 'fluorine lists the three fluorides and gold lists none'; it is correct. Add xenon lists XeF4, since that card is where the oxidation state '0' conflict shows.
- [could] Plan File Structure table and Task 3 commit step
    CHANGE: List the saved copies to commit (about 1.9 MB as they stand; AME2020 and NUBASE2020 are 1.2 MB of that and could be trimmed to the 34 elements). Do not commit the 15 MB of raw PubChem element pages or the 446 kB page script; commit the two extracts made by extract-pubchem-pages.mjs. cross-check-data.json (388 kB) is optional.
- [could] Plan Facts table row CPKHexColor
    CHANGE: Leave the column unused, as planned, and note it is unreliable: palladium's value is '6985' with leading zeros lost.

######## chemistry
SUMMARY: Eleven things in the plan are wrong chemistry or a wrong test expectation; the rest of the Task 2 position and shell tests check out.

Must fix:
1. The plan makes lanthanum and lutetium both block f, giving a 15-wide f block (f 30, d 38). Lutetium and lawrencium must be block d (f 28, d 40).
2. Meitnerium's configuration ends "(calculated)", not "(predicted)"; nitrogen and fermium have a space after the core. The plan's facts table says otherwise.
3. PubChem's lawrencium configuration differs from NIST's ground state (the only one of 108).
4. "Atomic radius" is the van der Waals radius: 46% of across-period steps go against the textbook trend, and zinc comes out smaller than oxygen.
5. "Not measured" is false for electronegativity and for many empty electron affinities.
6. The "Nonmetal" legend entry covers 7 elements and dims the halogens and noble gases.
7. Oxidation states: xenon reads "0" while the library holds XeF4; predictions for 105 to 118 arrive unmarked.
8. Both ends of the melting-point scale (helium, carbon) are not ordinary-pressure melting points; arsenic melts above its boiling point.
9. Group 1's "alkali metals" name would cover hydrogen.
10. Aluminium and calcium are "Ancient", contradicting PubChem's own pages.
11. OpenStax 2.5 cannot source the block, period, or group 3 to 14 descriptions.

Confirmed right: period, group, row and column for all nine named elements; 118 unique cells; period sizes 2, 8, 8, 18, 18, 32, 32; all six shell expectations; all 118 configurations sum to Z; 107 of 108 match NIST.

A linear scale works for all five trend properties; a logarithmic one is worse for density and melting point. Electronegativity and ionization energy show clean trends.

The category scheme is acceptable as given with notes and no overrides. review.md has drafted description sentences with source URLs, the group 3 note, and all script output. No repository file was changed.
FILE: research:/chemistry/review.md
OWNER DECISIONS:
- Block rule for the detached rows. Recommended: lanthanum to ytterbium and actinium to nobelium are f block, lutetium and lawrencium are d block (matches PubChem's own element pages and the IUPAC 2021 task group's leaning). The alternative, lanthanum and actinium in the d block, matches OpenStax 19.1. Either fixes the 15-wide f block; the plan as written is not an option.
- Group number of lutetium and lawrencium. Recommended: keep `group: null` for all 30 detached-row elements as the approved spec says, so highlighting group 3 shows scandium and yttrium only. The alternative is group 3 for both, as PubChem numbers them, which outlines two cells at the far end of the detached rows.
- Radius trend. Recommended: replace it with covalent radius (a second saved download from PubChem's element pages, atomic numbers 1 to 96) and keep van der Waals radius on the card. Alternatives: keep PubChem's column renamed 'van der Waals radius' with a legend caveat, or drop radius from trend colouring. Renaming is required whichever is chosen.
- Wording for empty fields. Recommended: 'no value listed' everywhere, replacing 'not measured'.
- Category legend. Recommended: no overrides to PubChem's assignments; relabel the 'Nonmetal' legend entry 'Other nonmetals', add the four notes, and head the legend 'Chemical family (PubChem's grouping)' in place of 'one common classification'.
- Values PubChem presents as plain facts but which are estimates or predictions (melting points of astatine, francium and fermium to lawrencium; oxidation states of 105 to 118; 'Solid' for rutherfordium to meitnerium). Recommended: show them with an authored 'estimated' or 'predicted' note. The alternative is to hide them as 'no value listed'.
- Lawrencium's configuration. Recommended: show PubChem's string with a note giving NIST's ground state, which keeps the single-source rule. The alternative is to override it with NIST's.
- Year discovered. Recommended: keep the row with notes on aluminium and calcium (and fluorine and silicon). The alternative is to drop the row, since PubChem's column mixes first use, first recognition and first isolation.
- Diagram heading on the element card. Recommended: 'Electrons per shell' with the counting-diagram caption, in place of 'Bohr model', for every element on this page.
UNVERIFIED:
- Textbooks other than OpenStax on group 3 and f-block membership (Brown, Zumdahl, Atkins, Housecroft): none is freely fetchable. The note's 'many textbooks instead count lanthanum and actinium in the d
- Whether IUPAC has issued a final ruling on group 3 since 2021. IUPAC's periodic table page fetched today still presents it as open, the project page shows no recommendation, and one web search found n
- Configurations of meitnerium to oganesson (109 to 118): not in NIST's ground-state table, so not checked against a second source.
- Where PubChem's erratic van der Waals values for the d block come from. PubChem attributes the column to Los Alamos National Laboratory; no primary paper was traced.
- That the covalent radii on PubChem's element pages are exactly Cordero 2008. They match the 11 values the app already stores and the format fits; the paper is paywalled and was not read.
- Years discovered for the 114 elements other than aluminium, calcium, fluorine and silicon were not checked against a second source.
- That the melting points of astatine, mendelevium, nobelium and lawrencium are estimates. PubChem's pages say so in words only for francium and fermium.
- Which allotrope carbon's density (2.2670) refers to: the download does not say; graphite is my reading and no source was fetched for it.
- Which atoms have no stable negative ion: PubChem's pages show it for helium, nitrogen and neon only; for the other empty electron affinities I relied on OpenStax 6.5's general explanation.
- The pressure at which helium solidifies and carbon's triple point: fetched text says pressure is needed but the figures were not fetched.
- The IUPAC Gold Book definition of a transition element: the site refused the request; the Red Book wording was used instead.
- Palettes, keyboard movement and accessibility were outside this review and were not checked.
VERIFIED CHANGES:
- [must] upheld=true | Plan Task 2, elementPosition tests; spec 5.3 (Block) and spec 9 (Position)
    CHANGE: Lutetium expectation becomes block d; rule: 57 to 70 and 89 to 102 are f, 71 and 103 are d; add Yb, Lr, No tests and block counts s 14, p 36, d 40, f 28.
    CORRECTION: The defect is real, but 'lutetium and lawrencium must be block d' is overstated. What must change is the 15-wide f block; which end of the detached row is d is a convention the owner has to pick. The review calls its rule A (Lu, Lr are d) the better fit, but the Royal Society of Chemistry table, which the review did not fetch, uses the other rule (La and Ac block d, Lu and Lr block f), as does OpenStax 19.1. The review's attribution of 'group 3' for Lu and Lr to PubChem is really Jefferson Lab d
- [must] upheld=true | Plan facts table, ElectronConfiguration row; Task 1 builder and registry test; spec 5.1 an
    CHANGE: Correct the facts row (9 predicted, 1 calculated, a space after the core for N and Fm, Cr written d first); builder strips both markings and stores the source's word; registry pins 10 marked; parser accepts whitespace and any order.
    CORRECTION: Correct as proposed. Two small points. The plan's '9 end in (predicted)' is literally true; the false parts are 'without a space after the core' and the builder stripping only '(predicted)'. The download has twelve subshell orderings, not four, so 'any order' is the right requirement. The plan's own all-118 sum test would have exposed the meitnerium and spacing problems at build time, but meitnerium's diagram would still have gone unlabelled.
- [must] upheld=true | Plan Task 3 (cross-check); spec 5.5
    CHANGE: Add configurations to the cross-check against NIST for 1 to 108; lawrencium gets a note; say 109 to 118 were not checked.
    CORRECTION: Correct. Three additions. (1) The plan's Task 3 says the NIST table covers 'all 118 elements'; it returns 108, so that sentence needs fixing too. (2) The check costs nothing extra: the same NIST download the plan already saves carries the ground-state column. (3) The plan must say which lawrencium configuration draws the shell diagram: PubChem's gives 2, 8, 18, 32, 32, 9, 2 and NIST's gives 2, 8, 18, 32, 32, 8, 3. If rule A is chosen for blocks, lawrencium is then a d-block element whose NIST gr
- [must] upheld=true | Spec 5.1, 5.6, 6 and 7; plan facts table, Task 1 type (atomicRadius), Task 4 TrendProperty
    CHANGE: Rename to 'van der Waals radius' everywhere (field vdwRadius); never plain 'atomic radius'; legend caveat if it stays a trend property.
    CORRECTION: Upheld; one number is overstated. '16 of 35 steps (46%) go against the trend' counts two ties (P = S = 180, Sb = Te = 206) as reversals. Strict reversals are 14 of 35 (40%); period 3 is 3 of 7 plus one tie, not 4 of 7. The conclusion is unchanged.
- [must] upheld=true | Spec 5.1 (rules), 6 and 9; plan Global Constraints, Review Focus 1, Task 4 cellLabel test,
    CHANGE: Replace 'not measured' with 'no value listed' for every empty PubChem field; update both test strings; drop 'not known' for the year.
    CORRECTION: Correct as proposed. If 'not known' is dropped, the builder should fail on an empty year, so the case cannot arise silently. The trendScale comment in the Task 4 interface ('null when not measured') and spec 9's 'a missing value maps to "not measured"' need the same wording change.
- [should] upheld=true | Spec 5.4 and 6 (legend); plan Task 4 (legend)
    CHANGE: Show 'Nonmetal' as 'Other nonmetals' and add the note 'Halogens and noble gases are nonmetals too; PubChem lists them under their family names.'
    CORRECTION: The problem is real, but the proposed note is itself wrong. The source the review cites for '17 nonmetals' classes astatine as a metalloid and leaves tennessine and oganesson 'not indicated', so 'halogens and noble gases are nonmetals too' overclaims for three of the thirteen. Corrected note: 'Fluorine, chlorine, bromine, iodine and the noble gases helium to radon are nonmetals too; PubChem lists them under their family names.' The plan must also say how the relabel reads in a cell's accessible 
- [must] upheld=true | Spec 7 (oxidation states) and 5.1; plan Task 1 (builder) and Task 5 (elementCardRows)
    CHANGE: Label the row 'Common oxidation states (PubChem's list, not complete)'; set a predicted flag on 105 to 118; note on xenon and krypton; show text as published.
    CORRECTION: The label and the xenon and krypton note stand. The blanket 'predicted' flag on 105 to 118 is wrong. PubChem's element records mark every state as predicted only for Mt, Ds, Rg, Fl, Mc, Lv, Ts and Og. For Db, Sg, Bh, Hs and Cn only the parenthesised states are predictions: Db '5, (4), (3)', Sg '6, (5), (4), (3), 0', Bh '7, (5), (4), (3)', Hs '8, (6), (5), (4), (3), (2)', Cn '2, (1), 0'. A blanket flag would call dubnium's +5 and hassium's +8 predictions against the source. Corrected change: flag
- [should] upheld=true | Spec 6 (trend legend) and 7 (card); plan Task 1, Task 4 and Task 5
    CHANGE: Notes on helium's melting point, carbon's melting and boiling points, and arsenic's melting and boiling points, on the card and beside the melting-point legend's ends.
    CORRECTION: The notes are needed, with two corrections. (1) Arsenic: do not state a bare '28 atmospheres'. PubChem's page (Jefferson Lab) says 28; Wikipedia's infobox, citing Gokcen 1989, gives the triple point as 1090 K at 3628 kPa, about 36 atmospheres. Write 'Under pressure (PubChem's page gives 28 atmospheres); at ordinary pressure arsenic turns straight from solid to gas at 887 K.' (2) Carbon: PubChem's page labels the melting figure '3550°C (diamond)' while the density is graphite's, so the carbon val
- [must] upheld=true | Plan Task 2, descriptions bullet (describeGroup)
    CHANGE: Group 1 text must say hydrogen is in group 1 but is a nonmetal and not an alkali metal; test that describeGroup(1).text mentions hydrogen.
    CORRECTION: Correct. The same point applies to the returned name: the highlight heading must not read 'Alkali metals' alone over a set that includes hydrogen. Either the name for group 1 is 'Hydrogen and the alkali metals', or the page shows the text with the name.
- [must] upheld=true | Plan Task 1 (builder notes) and Task 5 (year row); spec 7
    CHANGE: Aluminium and calcium keep 'Ancient' with a note each giving the isolation dates, citing PubChem's element page.
    CORRECTION: Correct, but incomplete at this severity. Fluorine's year (1670) is as misleading as aluminium's and belongs here, not among the 'should' caveats: the spec's success test is a learner opening fluorine and reading its values. PubChem's own page says 1670 is 'the first recorded use of a fluorine compound' and that the element was isolated in 1886. Silicon (1854 is the crystalline form; Berzelius 1824) should travel with them. Suggested row label: 'Year discovered (as PubChem lists it)'.
- [should] upheld=true | Plan Task 2, descriptions bullet
    CHANGE: Replace the single-source wording with the wider source set; include pnictogens; replace the unautomatable test with a stored supporting quotation per description; use the drafted sentences.
    CORRECTION: Partly overstated. The plan allowed 'OpenStax 2.5, or a IUPAC page', and the IUPAC Red Book does cover blocks, so the plan was thin, not false. What stands: OpenStax 2.5 alone cannot source blocks, periods or groups 3 to 14, and the test 'no description states a property the cited section does not' cannot be automated. Including pnictogens is optional, not a correction. Two things the proposal overlooks: the drafts cite two or three sources each while the plan's describe functions return one sou
- [should] upheld=true | Spec 5.3; plan Task 2 (GROUP_3_NOTE)
    CHANGE: Use the drafted note: group 3 drawn with Sc and Y only; unsettled; IUPAC has not ruled and its 2021 task group leaned to Lu and Lr; this table counts La to Yb and Ac to No as f block; many textbooks do the opposite.
    CORRECTION: Sound if rule A is chosen; it must be rewritten if the owner picks rule B. 'Many textbooks instead count lanthanum and actinium in the d block' can now rest on two fetched sources (OpenStax 19.1 and the RSC table), so name them or say 'some textbooks and the Royal Society of Chemistry's table'. A web search summary today claimed IUPAC has 'endorsed' Lu and Lr; that is not supported by IUPAC's own page and should not be used.
- [should] upheld=true | Plan Task 2 (shellsFromConfiguration tests); spec 9
    CHANGE: Add six explicit cases and three throwing cases.
    CORRECTION: All six values are right. One design point to settle: the two cases with '(calculated)' and '(predicted)' in the input only make sense if the parser is meant to accept the raw source string. If the builder strips the marking before storing, test the stored text instead and keep one test that the builder strips both words.
- [should] upheld=true | Plan Task 2 and Task 4 tests (position and isHighlighted)
    CHANGE: Add tests for block s and p membership, group 3, 30 null groups, group 17 membership, period 6 highlighting; group from 'group' never 'column'; top numbers not over detached rows; marker labels.
    CORRECTION: Correct as proposed.
- [should] upheld=true | Spec 6 (trend properties) and spec 3 (out of scope); plan Task 1 and Task 4
    CHANGE: Replace the radius trend with covalent radius from PubChem's element pages (1 to 96) or Cordero; keep van der Waals on the card; amend spec 3.
    CORRECTION: Upheld as an owner decision, with three corrections. (1) '0 of 33 down-group steps against' is true only for the main groups (0 of 36 by my count); over all groups there are 5 reversals (Ru to Os, Rh to Ir, Pd to Pt, Ag to Au, Cd to Hg), which is real chemistry and worth a legend line. (2) Four elements carry more than one covalent radius on PubChem's page (carbon sp3, sp2, sp; manganese, iron and cobalt low spin and high spin), so the builder needs a stated rule for which to use. (3) It is a se
- [should] upheld=true | Spec 6 (colour by property)
    CHANGE: State that all five scales are linear; density legend note for gases; call melting point and density periodic patterns.
    CORRECTION: The scale finding is right. The last sentence guards against text that neither the spec nor the plan asks for (there is no description text for trend properties), so it is harmless but changes nothing. The gas note should say the figures are for the gas at 0 °C and 1 atm, and for the two-atom gas where that applies (hydrogen, nitrogen, oxygen, fluorine, chlorine).
- [should] upheld=true | Spec 5.4 and 6 (legend notes); plan Task 4
    CHANGE: Four legend notes (mixed scheme, metalloids naming polonium and astatine, group 12, elements 109 to 118); no overrides; consider heading 'Chemical family (PubChem's grouping)'.
    CORRECTION: Correct as proposed.
- [could] upheld=false | Spec 7 (Bohr diagram); plan Task 5 (reuse of BohrCard)
    CHANGE: Head the diagram 'Electrons per shell'; add the counting-diagram caption; from atomic number 21 'Shells do not fill one after another'; palladium note; predicted or calculated label; do not show valenceElectrons for d and f block.
    CORRECTION: Two parts fail. (1) The 'from atomic number 21' line, 'Here an inner shell is still filling while an outer shell already holds electrons', would be false for nine elements and missing for two. For Cu to Kr and Pd every inner shell is full (zinc is 2, 8, 18, 2), and the effect actually starts at potassium (2, 8, 8, 1). Corrected rule: show the line when a shell below the outermost holds fewer than 2n² electrons (K to Ni, Rb to Rh, Ag onward), worded 'shell N is not full although a higher shell ha
- [should] upheld=true | Spec 7 (card rows); plan Task 5
    CHANGE: Card caveats for electron affinity sign, state label, 34 isotope masses, estimated melting points, density notes, and year notes for fluorine and silicon.
    CORRECTION: Mostly right; four corrections. (1) The 34 are the elements with no standard atomic weight, not 'no stable isotope': bismuth, thorium, protactinium and uranium have no stable isotope either but do have standard atomic weights and must not get the label. Select by the CIAAW list. (2) 'Estimated' for astatine, mendelevium, nobelium and lawrencium is not stated on PubChem's pages; Wikipedia's infoboxes mark fermium, mendelevium, nobelium and lawrencium melting points 'predicted' and give astatine n
- [should] upheld=true | Spec 5.2 (the 11 curated elements); plan Task 5 (elementCardRows)
    CHANGE: Say which rows the curated covalentRadius and vdwRadius fill, one unit (pm), show both values where they differ, pick one configuration form.
    CORRECTION: Correct as proposed. One addition: the curated first ionization energies carry no 'published' text (hydrogen is stored as 13.598434599702), so the plan should say how many digits the card prints for them.
- [should] upheld=true | Plan Task 2 (period and block descriptions)
    CHANGE: Generate the seven period texts from the table and cite OpenStax 6.4; block texts cite the Red Book and Scerri, not OpenStax 19.1; do not reuse two OpenStax 6.4 sentences.
    CORRECTION: Right in substance, conditional on rule A; under rule B the block texts would cite OpenStax 19.1. One drafted sentence is wrong for this app: the d-block draft says 'Groups 3 to 12: 40 elements'. In the app's own group function groups 3 to 12 hold 38 elements (group 3 is Sc and Y only), so a learner who highlights those ten groups counts 38. Write 'Groups 3 to 12 (38 elements here) and, in this table, lutetium and lawrencium: 40 in all', and do not add a test that block d equals groups 3 to 12.
- [could] upheld=true | Spec 6 (electronegativity legend)
    CHANGE: Legend line: 'Pauling values exist for krypton and xenon, which form compounds, and not for helium, neon, argon or radon.'
    CORRECTION: The wording implies radon forms no compounds, which the review's own source contradicts. Corrected: 'Among the noble gases PubChem lists a value only for krypton and xenon.'
- [could] upheld=false | Plan Task 3 (cross-check report)
    CHANGE: Include fluorine's electron affinity and the nine ionization energies differing from NIST by more than 1%; note NIST has values for Lr to Hs.
    CORRECTION: The ionization-energy part is already in the plan: Task 3 lists 'every disagreement beyond rounding', which by my count is 27 elements and includes all nine. Fluorine's electron affinity is a single spot check outside spec 5.5's two properties; mention it as a note on fluorine if wanted, but it does not justify adding a property to the cross-check. The one new item worth keeping is a line in the report that NIST has ionization energies for Lr to Hs where PubChem is empty, three of them marked th
- [could] upheld=true | Spec 7 (year row); plan Task 5
    CHANGE: Display 'Ancient' as 'Known since ancient times'; mark the configurations of Rf to Hs as resting on calculation.
    CORRECTION: The display wording is fine, but the plan's Task 5 test 'carbon's year reads "Ancient"' must change with it. The Rf to Hs marking is weaker than stated: NIST marks only their ionization energies as theoretical or interpolated and lists their ground states without a mark, so an on-screen 'calculated' label would be the app's own claim. Leave it out or word it as 'not confirmed by measurement' with a source.
MISSED:
- The data shape has nowhere to put notes. Task 1's PeriodicElement type has no notes field and the schema is strict, yet Task 3 already says a disagreement 'becomes a note on that element's record', and the review adds some twenty more notes (lawrencium, helium, carbon, arsenic, aluminium, calcium, fluorine, silicon, xenon, krypton, the 34 masses, predicted melting points). The plan needs a notes field keyed to the row it qualifies, a sourceId per
- describeGroup, describePeriod and describeBlock return one sourceId, but nearly every drafted description cites two or three sources (group 1 cites OpenStax 18.1 and 2.5; the d block cites the Red Book, OpenStax 6.4 and Scerri). The interface must return a list of source ids, or each sentence must carry its own.
- Several notes depend on PubChem's per-element records, which are a different endpoint from the committed table download and come from named contributors (Jefferson Lab, Los Alamos, CIAAW). Spec 3 and 5.1 name only the table. The plan needs these records added as a saved download with its own source entry, and the existing 'pubchem-ptable' citation text, which still says 'Pauling electronegativity column', needs widening.
- Task 3 says the NIST ionization-energy table covers 'all 118 elements'. NIST's ground-state table returns 108 rows (Z 1 to 108); 109 to 118 cannot be cross-checked there.
- Two more discovery years are disputed on PubChem's own pages and were not flagged: ruthenium 1827 (the page says Klaus, 'generally recognized as the discoverer', isolated it in 1844) and nobelium 1957 (the page says it was 'unambiguously discovered and identified in April 1958'). Low priority, but a row label such as 'Year discovered (as PubChem lists it)' covers them.
- PubChem's page offers a separate 'Metal / Metalloid / Nonmetal' display, which is the classification the 'Other nonmetals' problem is really about. It is not in the download, so the spec cannot use it without a second source; worth recording as a considered and rejected option.
- Could not be checked by me: anything on PubChem live. Every request from this machine returned HTTP 503 throttling on four attempts. PubChem facts above rest on raw responses saved earlier today by two other reviewers, which agree with each other for all 118 records and with the committed download byte for byte. The discovery-year screen used PubChem's own history text plus Wikipedia infoboxes for four elements, not an independent reference for a

######## build
SUMMARY: The plan cannot be built as written; nine changes are needed first. I checked this by building a working prototype in the output folder and driving it in headless Chromium. No tracked file was touched.

What changes the plan:

- **Data build fails at Task 2.** Meitnerium's configuration ends "(calculated)", and nitrogen and fermium have a space after the core. The plan's facts table lists only nine "(predicted)" endings.
- **Card reuse does not compile.** `BohrCard`, `EmissionSpectrum`, `elementCitations`, `shellCitations` and `publishedValue` all require the existing `Element` type (five TypeScript errors). The fix is small.
- **Focus is lost on every Enter** unless cell links pass `keepFocus`; confirmed in the browser.
- **No ARIA roles are named.** Roving focus without `role="grid"` is a defect. Use two native tables with `role="grid"`, because one table would announce cerium under "Group 4".
- **Dimming by opacity fails contrast** (2.71:1 at 40%).
- **Four items do not fit a 58 px cell at 1366.** Names must leave the cell below about 1540 px of table width.
- **"Extend the library index" breaks the Home count and a pinned test.** Importing the full table into the palette adds 79.8 kB to the main chunk; a separate small index adds 6.2 kB.
- **Two ordering faults.** Units are confirmed after values are displayed, and Task 3 writes a note the strict schema has no field for.

What held up: the route does not collide with `#/explore/:id`, and the plan's three awkward `move()` cases follow from one rule (66 of 66 prototype tests pass).

A ten-colour palette and trend scale are proposed, with every text contrast at 6.56:1 or better in both themes. Colour-blind separation is simulated, not tested with people, and no screen reader was run.

Full findings, layout measurements and colour tables are in review.md.
FILE: research:/build/review.md
OWNER DECISIONS:
- Element card beside or below the table. Spec section 7 says beside on a wide screen. I recommend below at every width, as side-by-side cards: it matches what you asked for on the molecule page, it is one layout instead of two, and beside only becomes possible above about 1800 px.
- Element names inside cells. Spec section 6 says every cell shows the name, but at 1366 px 13 of 118 names are cut at 10 px type. I recommend names in cells only when the table is about 1540 px or wider (your 2523 px monitor qualifies), with a readout panel in the empty space above the transition metals at smaller sizes.
- The colour palette. The ten fills and the blue trend scale in review.md section 5 were computed for contrast and simulated colour blindness, not chosen by eye. I recommend adopting them as the starting point and looking at the screenshots in browser/shots/ before deciding; any replacement should be run through colour/report.mjs.
- Trend direction in the dark theme. I recommend 'more' is lighter in dark and darker in light (always further from the page background), which keeps one text colour readable on every shade.
- The 11 elements with both a curated and a PubChem value that differ (fluorine's radius is 147 pm curated and 135 pm in PubChem; sulfur's weight 32.06 against 32.07). I recommend the card shows both, labelled, so the number in the table and the number on the card are never silently different.
- Whether each selected element is a browser history entry. I recommend yes (Back steps through the elements you opened), which is ordinary link behaviour.
- Lower-case or wrong-case symbols in an address, such as #/explore/elements/xe. Today's simplest behaviour is the not-found page. I recommend keeping that; the alternative is to accept any case and redirect to the correct spelling.
- When the table starts scrolling sideways. Spec section 8 says below 768 px. With a 44 px minimum cell it starts below about 1072 px with the menu open. I recommend rewording the spec to 'when the table does not fit at its minimum cell size' and keeping cells at least 44 px.
- Where the 118 elements sit in the search dialog. I recommend after molecules, labs and pages, so an empty search still opens on the short lists; the dialog then holds about 159 entries.
- The f block in the plan's position tests is 15 elements wide (lanthanum to lutetium), so 'highlight f block' would light 30 cells. That is a chemistry convention question for the chemistry review, not one I can settle; I recommend deciding it before Task 2 is written.
UNVERIFIED:
- No screen reader was run. Roles, names and structure were read from Chromium's accessibility tree; what NVDA, JAWS or VoiceOver actually announce (crossing between the two grids, header announcements,
- Colour-blind separability is simulated with the Machado 2009 matrices and compared by OKLab distance; it was not tested with people who have a colour-vision deficiency.
- The 'typical ten-tint pastel scheme' used as a comparison in the colour table was typed from memory and is illustrative only. Paul Tol's nine values were confirmed against his page.
- Only Chromium was run. color-mix(in oklch), container-query units and the hatching gradient were not run in Firefox or Safari.
- Forced-colours behaviour was checked with Chromium's emulation, not a real Windows contrast theme.
- Headless Chromium has no scrollbar gutter; on Windows a 15 to 17 px scrollbar would take about 1 px off each cell at 1366. Not measured.
- The 2523 px measurements assume 2523 CSS pixels; the owner's display scaling is unknown.
- Touch input and a real 400 px device were not tested.
- That two separate route objects sharing one component do not remount the page was observed in react-router 8.4.0 with React 19.3; it is not a documented guarantee, which is why a single optional-segme
- Hydrogen's density string fits a 56 px cell exactly at 9 px type (56 px measured); a different font rendering could clip it.
- I did not review the chemistry: PubChem's categories, the units, the 15-wide f block that the plan's position tests imply, or individual configurations. Curated-versus-PubChem differences for the 11 e
- Gzip sizes are from gzip -9 on the built files; Vite's own reported gzip figures differ by about 1%.
VERIFIED CHANGES:
- [must] upheld=true | Plan 'Facts established before planning' (ElectronConfiguration row) and Task 1
    CHANGE: Replace configuration.predicted with qualifier 'predicted' | 'calculated'; handle the space after the core; correct the facts row; pin 9 predicted, 1 calculated
    CORRECTION: The facts are right. 'The data build fails at Task 2' is slightly overstated: Task 1's build as planned passes (it pins 9 predicted, which is true); what fails is Task 2's 'all 118 sum to the atomic number' test, on meitnerium. Two refinements: (1) hydrogen and helium have no core at all ('1s1', '1s2'), so the reader must accept a missing core as well as a spaced one; (2) spec 5.1 says the source's own text is stored, so either keep PubChem's text and make the reader tolerate the space, or norma
- [must] upheld=true | Plan Task 5, second step (reusing BohrCard, EmissionSpectrum, Sources)
    CHANGE: Extract BohrDiagram from BohrCard; pass the curated Element to EmissionSpectrum; add periodicCitations on the generic citations(); widen publishedValue; add a configuration display that accepts a core
    CORRECTION: Upheld for (a), (b), (c) and (e). Two things are overstated. The 'five errors' count includes three functions the plan never tells anyone to call (elementCitations, shellCitations, publishedValue); the plan's own wording produces two (BohrCard and EmissionSpectrum given a PeriodicElement). And (d) is unnecessary: the plan's Quantity has a required 'published' string, so the card prints quantity.published directly and publishedValue need not change. Drop (d). The reason (a) matters beyond compili
- [must] upheld=true | Plan Task 4, second step (the grid's cells)
    CHANGE: Cell links are NavLinks with state={{ keepFocus: true }}; list links carry the same; palette and atom-card links do not; add a role=status line announcing the selection
    CORRECTION: None on the substance. One choice hidden in it should be the owner's: push (the proposal) adds a history entry per element opened, so someone who opens 30 elements presses Back 30 times to leave; MoleculePage.tsx:55 uses replace for its within-page toggle. State the choice in the plan.
- [must] upheld=true | Plan Task 4 second step and spec section 8
    CHANGE: Two native tables each role=grid with one shared roving tab stop, group and period headers, focus on the link, no aria index or selected attributes, aria-current=page on the selected cell
    CORRECTION: The structure is sound and matches the saved and live ARIA Authoring Practices text, but three statements need softening. (1) 'Roving focus without role=grid is a defect' is overstated: in a plain table a screen reader in browse mode still reaches all 118 links and its table commands still work; what is lost is the automatic switch to arrow-key mode and any cue that arrows work. It is the weaker design, not a broken one. (2) Nothing here was heard through a screen reader; the plan should say so 
- [should] upheld=true | Plan Task 4 (highlight: 'the rest dimmed') and palettes
    CHANGE: Dim by removing the fill and dashing the border, never by opacity; highlighted 2 px solid border; selected 3 px double border and bold; focus is a real outline; text in a coloured cell is always --foreground
    CORRECTION: Right design, lower severity, and the argument needs one fix. The plan never says 'opacity', so this prevents a likely mistake; it does not correct a stated one. And the review's own table shows foreground text at 60% opacity over the page is 5.25:1, which passes; the real reason opacity fails is that the fill dims with the text. Text against its own dimmed fill is 2.0 to 2.6:1 at 40%, 2.6 to 3.5:1 at 50%, 3.4 to 4.9:1 at 60% (light theme), so no opacity that still looks dimmed keeps 4.5:1 on ev
- [must] upheld=true | Spec section 6 (cells show number, symbol and name) and plan Task 4
    CHANGE: Responsive rule: number and symbol always; value when a property is chosen; name only from about 96rem of table width; readout panel above the transition metals; square cells with a value; 9 px minimum value text; 44 and 60 px minimum cells; 120rem cap; sideways scroll when it does not fit
    CORRECTION: The measured problem is real and the plan must state a rule, but this changes approved spec sections 6 and 8, so it is the owner's decision, and the specific numbers are one prototype's choices, not findings. Three corrections. (1) The proposal accepts 9 px type for values while rejecting names for not fitting; at 9 px only 3 of 118 names are wider than the 56 px inside a 58 px cell (Rutherfordium is 59 px). So there is a second honest option the review does not offer: names at 9 px in category 
- [must] upheld=true | Plan Task 6 first step and File Structure last row
    CHANGE: Write a separate element-index.json for the palette; leave library-index.json alone; keep periodic.ts out of everything but the elements folder and tests; update search.test.ts:9; measure index plus its preloaded chunk
    CORRECTION: None on the substance. Also carry over a point the review makes in its text but not in this list: record the 'before' size in Task 1 (368,766 + 116,533 bytes raw today), since Task 6 otherwise has no baseline. The plan must explicitly sanction the count change in search.test.ts, because 'existing tests are not weakened' would otherwise stop an implementer.
- [must] upheld=true | Plan Task 7 first step, Task 1 unit table, spec 5.1
    CHANGE: Move unit confirmation from Task 7 to Task 1, before buildPeriodicTable is written
    CORRECTION: Go one step further than 'move it': the units review in this same pass has already done the confirmation, so the plan should replace the paragraph 'units are inferred ... provisional' with the confirmed table and where the evidence is kept, and Task 1 commits that record. It is a must for a second reason the review does not give: confirming what each column means changes the data shape, not only a label (the units review reports that AtomicMass is two different things and that an empty cell does
- [must] upheld=true | Plan Task 1 (PeriodicElement shape) and Task 3 second step
    CHANGE: Add notes?: string[] to the type and schema in Task 1 and a card row that prints them in Task 5
    CORRECTION: Add two things. (1) Say where a note's text is written: generated JSON is never edited by hand and the download is kept as received, so the notes need their own committed input file (for example docs/research/periodic-table/decisions.json keyed by symbol) that the build script reads. (2) Give Task 5 a test for it: 'Card content per spec section 7' does not list the note, because section 7 omits what section 5.5 requires, so without a named step the card would silently drop the one mechanism that
- [should] upheld=true | Plan Task 4, move interface and tests
    CHANGE: State the nearest-element rule, Home and End, optional Ctrl+Home and Ctrl+End, the modifier and preventDefault rules, and the extra tests
    CORRECTION: None. Reversibility needs no luck: under a nearest-element scan everything between two stops is empty, so the opposite key always returns.
- [should] upheld=true | Plan Task 4, cellLabel and its two test strings
    CHANGE: Name becomes 'Fluorine, F, atomic number 9, halogen, group 17, period 2, electronegativity 3.98', plus unit and ', highlighted'
    CORRECTION: Add the symbol and the unit; hold back on group and period. The two-grid design in the previous change exists so that a screen reader announces 'Group 17' and 'Period 2' from the headers; putting the same words in every cell's name makes NVDA and JAWS likely to say them twice on each arrow press. Nobody has listened to it, so decide after a real screen-reader pass: plan the shorter name ('Fluorine, F, atomic number 9, halogen, electronegativity 3.98') and add group and period only if headers tur
- [should] upheld=true | Plan Task 4 (highlight and colour-by controls, status)
    CHANGE: One native select for colour-by; one native select with four optgroups for highlight; legend entries as aria-pressed buttons; status line naming and listing the highlighted set and summarising the scale; one visible hint line
    CORRECTION: Cap the list in the status line. Listing members is fine for a group (at most 7) but a live region that reads out 38 transition metals, 32 elements of period 6 or the d block on every change is a wall of speech. Announce the set's name and count, and list members only for small sets (say 8 or fewer); the description text and the cells' own ', highlighted' carry the rest. Keep selection and highlight in one status element, as the prototype does, so two announcements do not collide.
- [should] upheld=false | Plan Task 5 third step and spec section 7
    CHANGE: Replace 'beside the table at wide widths' with: the card sits below the table at every width
    CORRECTION: Not established by the evidence; make it an explicit owner decision with both options costed. The '347 px left at 2523' figure is produced by the review's own 120rem cap on the table. Names fit from about 92 to 96rem of table width, so a table capped at 96rem leaves about 731 px beside it at 2523 px, room for a card column, and the card would then stay on screen when an element is chosen (below the table it is off-screen at 1366x768, which the review itself notes). What is true: beside is imposs
- [should] upheld=true | Plan Review Focus 5 and Task 5 first step
    CHANGE: Replace the sodium atomic-weight example with fluorine's van der Waals radius; elementCardRows returns both values with sources where curated and PubChem differ; add tests for fluorine's radius and derived shells equal to curated shells
    CORRECTION: The insight is right, 'replace' is not. Keep the sodium test in Task 5: it is a valid test of which source a card row comes from. Only the sentence in Review Focus 5 ('while the trend scale uses PubChem's') is wrong, because atomic weight is not a trend property. Add the fluorine radius case beside it. Showing both values on the card goes beyond spec 5.2 ('a value that exists there is shown from there'), so it needs the owner's yes; the alternative that stays inside the spec is one sentence on t
- [could] upheld=true | Plan Task 5 and File Structure (ElementCard.tsx)
    CHANGE: ElementCard imports sources.json and elements.json directly, not registry; the periodic table stays out of registrySchema
    CORRECTION: Worth doing but smaller than stated, and optional. The net saving is about 46.8 kB raw and 7.6 kB gzip, not 56.6 and 9.4, because without the registry the route loads a separate 9.8 kB elements chunk instead. It is on a lazy route, so the plan's bundle constraint is met either way. The cost is that the card then uses elements.json through a type cast with no runtime check, as About.tsx does for sources; the existing tests validate those files.
- [should] upheld=true | Plan Task 4 second step and Task 6 first step (ordering, route)
    CHANGE: Move the Explore-to-table links into Task 4; one route explore/elements/:symbol?; not-found return after the hooks; tests for an unknown symbol and for no molecule id equal to 'elements'
    CORRECTION: None. Add the decision the review leaves in its prose: the router matches the path without regard to case ('/explore/Elements' works) but an exact symbol lookup sends '/explore/elements/xe' to not-found. Decide which and test it; a case-insensitive lookup is the consistent choice and symbols are unique ignoring case.
- [should] upheld=true | Plan Task 4 (tests)
    CHANGE: Add node markup tests with renderToStaticMarkup inside a MemoryRouter; say that focus, layout, theme and network checks are browser-script checks and name the folder
    CORRECTION: None.
- [should] upheld=true | Plan Task 2 third step (descriptions test)
    CHANGE: Take 'no description states a property the cited section does not' out of the automated test and make it a review item with the supporting sentence stored beside each description
    CORRECTION: None. The chemistry review found the larger problem behind it (the cited section cannot support most of the descriptions); that is theirs to settle.
- [could] upheld=true | Plan Task 4 third step (palettes) and spec section 6
    CHANGE: Adopt the concrete category fills, trend scale and hatching from review.md section 5
    CORRECTION: Every number reproduces, but 'adopt' is too strong for values only a search script and two AI reviewers have looked at. Put them in the plan as starting values that the owner accepts by eye in both themes. Two weaknesses to state beside them: the closest categories are only about 6 units apart for normal vision (transition metal and noble gas; post-transition metal and noble gas), which is close, and the trend scale is deliberately narrow so text never changes colour: its two ends contrast only 
- [should] upheld=true | Plan Task 6 and Task 7 (missing tasks)
    CHANGE: Reword About.tsx:36; update Home.tsx:22 and the explorer card; change the palette label and placeholder; add a palette entry for the table page; reword or replace the pubchem-ptable citation and say where it is authored; update the accessibility section of for-institutions.md
    CORRECTION: None on the list. For the citation, prefer a new source id over rewording: 11 curated elements already cite pubchem-ptable for their electronegativity, its text lives in the phase 2 research record, and a bulk download should carry its own date ('downloaded 2026-10-03'). In for-institutions.md the line 'Focus moves to the page heading after each navigation' also needs the table's exception once keepFocus is used.
- [should] upheld=true | Plan Task 4 (text list alternative)
    CHANGE: A details element holding an ordered list of 118 links, aria-current on the selected one, keepFocus on the links, the chosen property's value beside each name
    CORRECTION: None. The value beside each name is the part that earns its place: it is the only way to read a trend without the shading.
- [could] upheld=true | Plan Task 5 (page title)
    CHANGE: Give PageHeader an optional document-title prop so each element's address has its own title
    CORRECTION: None.
- [could] upheld=true | eslint.config.js (new step in Task 6)
    CHANGE: Add a lint rule that allows the periodic data to be imported only under src/app/explore/elements/ and in tests
    CORRECTION: If it is done, it cannot be a new block 'like the Three.js guard'. The config's own comment (lines 9-11) says a later block setting the same rule replaces the earlier one outright, so a separate no-restricted-imports block for src/app/** would switch off the Three.js guard for those files. The periodic pattern has to be added to the existing block's option list, with the elements folder handled by its own block that restates the Three.js options. A cheaper guard is the Task 6 size report itself,
- [could] upheld=true | Plan Task 4 (roving tab stop)
    CHANGE: Reset the roving tab stop to the selected element when focus leaves the grid
    CORRECTION: None. I did not re-run this one; it rests on the first reviewer's browser log.
- [could] upheld=true | Plan Task 1 (Quantity.unit on every value)
    CHANGE: Leave as planned
    CORRECTION: None; no plan change.
MISSED:
- Minus signs in oxidation states. 20 of PubChem's oxidation-state strings contain an ASCII hyphen ('+1, -1'; '+5, +4, +3, +2, +1, -1, -2, -3') and none contains the real minus sign. The app's rule (src/app/explore/format.ts:7-9) is that minus signs are U+2212, and the atom card already prints oxidation states that way. The plan stores the text and says nothing about display, so the element card would show hyphens. Add a display step and a test (hy
- No mapping between the curated record and the PubChem record. Task 5 says 'choosing the individually sourced value where elements.json has one' but never says which curated field stands for which PubChem field, or in what unit. They differ: atomicWeight vs atomicMass; vdwRadius in Å vs AtomicRadius in pm; ionizationEnergiesEv (the atom card prints these converted to kJ/mol, AtomCard.tsx:57) vs IonizationEnergy in eV; full configuration ('1s2 2s2 
- The wording for an empty value is pinned in several plan test strings ('electronegativity not measured', 'oganesson's density reads "not measured"', Review Focus 1) and in spec 5.1, while the units review reports that an empty PubChem cell does not always mean not measured. Whatever wording is decided, the plan should hold it in one constant and have the tests refer to that, so the decision is one edit and not six.
- Symbol case in the address is undecided. The router ignores case in the path ('#/explore/Elements' opens the table) but an exact lookup sends '#/explore/elements/xe' to the not-found page. The first review mentions this in its text and leaves it out of its change list. Decide and test it.
- The 'before' bundle size is not recorded anywhere in the plan. Task 6 reports before and after, but by then three tasks have landed. Record it in Task 1: index 368,766 bytes and its preloaded chunk 116,533 bytes raw (118,225 and 32,424 gzip -9), measured on the real repo today.
- Task 1 runs 'npm run build:data', which rewrites every generated file (elements.json, sources.json, the 33 molecule files, library-index.json), not only the new one. The plan has no done-check that the existing generated files come out byte-identical. Add 'git diff shows only the new files'. I could not test this: running the script would write to tracked files, which this review may not do.
- Three things I could not check, stated plainly: PubChem's live endpoint answered 503 'server busy' on four attempts, so the committed download was not re-compared by me (the units review reports it byte-identical); no screen reader was run by me either, so the grid design, the header announcements and the length of the cell names remain reasoned from the ARIA documents and Chromium's accessibility tree; and only Chromium was used, so color-mix, c
```
