# Types of reactions lab research record

The inputs the types of reactions lab is built from (spec section 24), where each came from, and what could not be found. Everything was gathered on 2026-10-12. Nothing in this folder is loaded by the app.

`npm run build:data` reads this folder and writes `src/chem-data/reactions/reactions.json` and the lab's entries in `src/chem-data/sources.json`. The build stops, and writes nothing, on an input it cannot hold to its sources, on an equation that does not balance in atoms and in charge or is not in its lowest whole numbers, on a tile an equation needs that its station does not offer, on a station whose tiles are all needed, on a field that is asked with no stored choice or no look to open it, and on an order of the metals that is not the order their tubes show (`scripts/reactions-lib.mjs`).

| File | What it is |
| --- | --- |
| `reactions.json` | The lab's record: the nine things on the benches; the twenty-two species an equation is built from; the four kinds with their patterns in letters; the choices an observation is recorded from; the order of the three metals; the five stations, each with its vessels, its tiles and the notes shown when it is done; and three parameters, each with its rationale |
| `sources/MANIFEST.json` | Every source of that record and of the primer (`src/chem-data/reactions/primer.ts`): its address, its citation, and rows that say what it prints and where, each naming the stored values it supports |
| `hazards.json` | The hazards of seven of the nine things on the benches: for each, the heading over its statements, the signal word, the statements and the note. The other two, the 1 M hydrochloric acid and the 0.5 M iron(III) chloride, carry the aqueous reactions lab's records unchanged (`../phase-4/hazards.json`) |
| `sources/hazard-manifest.json` | The seventeen documents behind those seven, with rows that say what each prints, and what was read and not carried |
| `sources/quotation-fingerprint.json` | Not kept in the repository (`.gitignore`): the hashes of every run of six words in the pages read, which the no-quotation tests compare against. Made with `node scripts/fingerprint-sources.mjs <folder of the pages> 2026-10-12 docs/research/reactions/sources`; where it is absent those tests are skipped |

## The stations as stored

What is seen is stored as seen, in the words of a choice; what it is, and why, is in the notes of a station, which are shown once the station counts.

| Station | Before | After | Kind | Equation | Seen: source |
| --- | --- | --- | --- | --- | --- |
| A. Zinc in copper(II) sulfate solution | a grey piece of metal; a blue liquid | a red-brown coating; a paler blue liquid | single replacement | Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s) | a microscale class experiment's teaching notes (zinc turns red-brown, the blue fades) |
| B. Magnesium in a flame | a silvery strip | a white light; a white powder | combination | 2Mg(s) + O₂(g) → 2MgO(s) | a page on the second group's metals with oxygen (an intense white flame, a white ash) and an open textbook (a fine powder of the oxide) |
| C. Three metals in hydrochloric acid | a colourless liquid; a silvery, a grey and a reddish piece | magnesium bubbles fast, zinc slowly, copper not at all | single replacement, twice; no reaction | Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g); Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g) | a page on metals with dilute acids, with the reactivity series |
| D. Calcium chloride and sodium carbonate solutions | two colourless liquids | a white solid | double replacement | CaCl₂(aq) + Na₂CO₃(aq) → CaCO₃(s) + 2NaCl(aq) | two pages on the reactions of the calcium and the barium ion |
| E. Hydrogen peroxide with iron(III) chloride | a colourless liquid | bubbles; the tube warmer | decomposition | 2H₂O₂(aq) → 2H₂O(l) + O₂(g), with FeCl₃ as the catalyst and in no equation | a magazine's laboratory problem and an open textbook's page on catalysts |

**The order of the three metals** is magnesium, zinc, copper, with hydrogen after zinc. It is stored from a cited reactivity series (`basis: "activity-series"`), not worked out from standard potentials: the series is what an introductory learner is given, and it needs no arithmetic. The NBS tables the other labs use would give the same order from the Gibbs energies of formation of the three aqueous ions; that was not done, and the scanned tables were not read for this lab.

**The tiles** of a station are the species its equations need and at least two that none of them needs. Station C offers copper(II) chloride, so that an equation for copper can be built by a learner who thinks copper reacted; station E offers iron(III) chloride, the catalyst, which belongs in no equation.

**The parameters** are three amounts of liquid (3 mL in a tube, 2 mL of each solution that is mixed, 0.25 mL of drops). They set the level a tube is drawn to and nothing else.

## How each kind of value was read

- **What is seen at a station.** From pages that say what is seen: a class experiment's teaching notes, two pages of a chemistry teaching site, two pages of a textbook module on the reactions of single ions, a magazine's laboratory problem. Where the page is about something near to this bench and not this bench itself, the manifest row says how far the stored value goes beyond it (see below).
- **The kinds and their patterns in letters.** Four pages of one open introductory textbook, one for each kind, each of which prints its pattern. The record stores each pattern as printed.
- **The equations.** Three are printed by a source with their states (magnesium and oxygen; magnesium and zinc each with hydrochloric acid); the peroxide's is printed without states; two are written by this project from what sources print (zinc with copper(II) sulfate, from the same page's equation for iron; calcium chloride with sodium carbonate, from a general form and a table of solubility). The build balances every one by counting atoms.
- **The formula and state of each species.** From the equation of a source that prints it, named in the manifest row. Two formulas are read in safety data sheets' tables of composition (copper(II) chloride, iron(III) chloride).
- **What a metal looks like.** From the line of characteristics on a page for each metal's ions, in the pages earlier labs saved.
- **Hazards.** The default supplier's safety data sheets, read in a browser, since the site draws them by script; NOAA's records, found in the site's lists by letter and never by its search. Fourteen of the seventeen documents are ones earlier labs list: each was read again for this lab in the page that lab saved, after the saved file was checked against the hash that lab recorded, and none was fetched again.

## Where the lab is other than spec section 24 has it

- **Station E asks for bubbles and for warmth, and not for the colour of the liquid.** No page that was read says what colour the tube is. The tube is drawn pale yellow after the drops, which is this lab's own reading of a page that calls solutions of the iron(III) ion yellow; the manifest row says so, and the colour is in no note.
- **At station E the bubbles are recorded as bubbles or none, with no rate.** Station C has three rates, since the comparison is what it is for. No source gives a rate for a tube of 3% peroxide with a few drops of the catalyst.
- **A learner who says that nothing reacted is asked for no equation.** Spec 24.2 has an equation at every station, and one for each metal that reacts. Whether an equation is asked depends on the kind the learner said, not on the right kind, so that in Challenge the page does not show which tubes react.
- **A whole multiple of an equation is taken as right** (2Zn + 2CuSO₄ and so on), as the aqueous reactions lab takes it. The build holds the stored equations themselves to their lowest numbers.
- **The primer's everyday double replacement names its chemical.** The card said that "a water softener" trades partners with the calcium in hard water. The source has sodium phosphate bringing the calcium down as solid calcium phosphate, in some softeners that are sold; a reader would take "a water softener" for the kind that swaps ions on a resin and leaves no solid. The card now names the phosphate.
- **The page asks the order of the metals as two choices,** the most active and the least, and says that a tube is warm only once it has been felt. Section 24.6 of the design spec lists where the page is other than 24.2.
- **The primer gives no everyday case of a single replacement.** Spec 24.4 asks for one of each kind; none was found in a source that was read.
- **The primer does not name the three metals in order, nor any reaction of the bench.** Spec 24.4 has "the order they come in" as a topic. The primer is not kept back in either mode, and the order is an answer the lab asks for, so the card gives the rules the order is found by and names other metals at the ends of the series.
- **Burning magnesium and its ash.** Spec 24.1 has a white powder; the note says, as the source does, that the ash of magnesium burnt in air holds magnesium nitride with the oxide, and that the equation is for the oxide alone. No proportion is given, since the source gives none.

## What could not be sourced, or only in part

- **The colour of the liquid at station E** while it bubbles, and afterwards. Not found. Not asked, and in no note.
- **A page that describes calcium chloride mixed with sodium carbonate itself.** Not found. The white solid rests on a page that says a carbonate that dissolves gives with the calcium ion a solid like barium's, and on the page that calls barium's white; both are about ammonium carbonate. The equation is written from a general form and a table of solubility. That sodium carbonate does as ammonium carbonate does is this lab's reading.
- **A page that describes zinc in a tube of 1 M copper(II) sulfate.** The source has a few drops of a 0.2 M solution and says that the blue fades. That a tube of the 1 M solution with one piece of zinc is paler, and not colourless, is this lab's reading of that word.
- **How fast each metal bubbles in 1 M acid.** The source says that the reaction is faster the higher a metal stands in the series and that zinc is a little slow in cold dilute acid, and gives no rate. Fast and slow are this lab's two words for that; a real piece of zinc with a clean surface in 1 M acid may bubble very slowly indeed.
- **That the tube of station E is felt to warm.** The sources give the heat of the reaction (it is given out) and say that heat comes off as a catalyst speeds it. Neither gives a rise in temperature for 3 mL of 3% peroxide. See the next section.
- **An everyday single replacement.** Not found in a source that was read.
- **That a catalyst is written over the arrow.** A convention this lab uses; the source says only that a catalyst has no place in the equation for the whole change.
- **A second document for 3% hydrogen peroxide, for sodium carbonate solution and for copper(II) sulfate solution.** The peroxide's note rests on the default supplier's sheet alone; the carbonate's on that supplier's two sheets; the copper(II) sulfate's on that supplier's two sheets and NOAA's record of the solid. No document that was read classes copper(II) sulfate as a hazard to water life, so its note says nothing of drains; other suppliers' sheets, which were not read, may.

## What a chemist should look at

No chemist has read the record, the notes, the primer or the page's sentences.

1. **Station E is this lab's reading of the directions**, which name iron(III) chloride and nothing to go with it (spec 24.1). If the directions mean another reaction, the station is wrong as a whole.
2. **Does a tube of 3% peroxide with five drops of 0.5 M iron(III) chloride bubble plainly and warm enough to feel?** The decomposition of all the peroxide in 3 mL would warm the liquid by roughly twenty degrees if no heat were lost (worked from the −98.2 kJ/mol a source prints and the heat capacity of water; this working is not in the record), but how fast it goes with this little catalyst is not known to this project. If it is slow, the warmth may not be felt.
3. **The colour of that tube.** Iron(III) with hydrogen peroxide is often darker while it reacts than the pale yellow drawn. Nothing rests on the drawn colour, but it may be wrong.
4. **Zinc in 1 M hydrochloric acid** is often slow enough that a learner would call it no reaction for the first minutes, and faster on an impure surface. The lab shows slow bubbles.
5. **The fading of 1 M copper(II) sulfate with one piece of zinc** takes long, and the copper comes down as a dark, loose deposit as often as a red-brown coating. The lab shows what the source describes for a small amount.
6. **The white solid of station D** is drawn spread through the liquid, which is cloudy. In a real tube it settles.
7. **Hydrogen peroxide is taken as (aq) or (l)** in a built equation; every other species in one state alone. Water is (l) only, though some texts would write the peroxide's products otherwise.
8. **The shared note of the 1 M hydrochloric acid** says nothing of the hydrogen it gives with metals, which matters on this bench and not on the aqueous lab's first nine stations. The primer's safety card, and the notes of zinc and of magnesium, say it. The owner may want a record of this lab's own for the acid.
9. **Copper(II) sulfate and water life** (see the section before).
10. **Burning magnesium on a real bench** needs more than a note: the primer and the hazard record say what the documents say (the light, never water on the fire, dry sand), and a supervisor decides whether it is done as a demonstration.

## Read and not used

- A university course page on the types of inorganic reactions, with all four patterns on one page. Its address holds a course number, which this project's check of its own text for institution-specific patterns refuses in a primer's support line; four pages of the open textbook it is drawn from are cited in its place.
- The safety lines of the class experiment's page, which rest on a school safety service's cards: not a safety data sheet or a government record, and not used for hazards.

## Tried and not read

Nothing was refused. Two sites answered a request for their robots file with a page that says there is none (the chemistry teaching site and the university that hosts the magazine); nothing of theirs was closed, and four pages of the first and one of the second were read. A guess at the address of the teaching site's list of pages found no page, and that site was not asked again. No site's search was used.

## Read and not kept

Every source. No copy of any page is in the repository; the manifests record what each prints and where.

## The engine

`src/engine/reactions/` (spec 24.2, 24.3). A run of a station is stored as the list of things done in it and worked out again on reading; nothing is drawn by chance and there is no seed. The engine works out one piece of chemistry for itself: whether a built equation balances, by counting the atoms of its species. The types of a built equation and the check of the species on one side are in `src/engine/equation.ts`, which the aqueous reactions lab's check uses too.

## What nobody checked

No person has read any of it, and no chemist. The engine, the record and the wording were tested by scripts alone. The lab's page was built on 2026-10-12 and checked by script by the AI coding assistant that built it; what it ran, what it measured and what it did not check are in the design spec, section 24.6, and on the page for institutional reviewers. The lab's one deep review has not been held. The scanned NBS tables were not read. The pages earlier labs saved were read again only where this lab stores something from them.
