import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The aqueous reactions lab's concept primer (spec 8): ten cards for a reader with no chemistry background, shown
// one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their support lines to
// that: none repeats six words running of a page it rests on. Each paragraph says what it rests on in `support`,
// one line for each passage: either a passage of a source, given where it is and, in this project's words, what
// it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its rules, its model)
// and is read in no source. The sources are listed in docs/research/phase-4/sources/MANIFEST.json, and the safety
// data sheets of the last card in sources/hazard-manifest.json; both reach sources.json through `npm run build:data`.
//
// The worked example of the equations card is a reaction that is at no station, so that it gives away no answer.

const chem2e = (section: string) => `flowers-chem2e-${section}`
const TABLE = chem2e('4.2-solubility')
const SNIFFING = 'nrc-prudent-practices-2011'
const MANUAL = 'pa-adopt-lab-manual-wafting'

// Places that more than one paragraph reads.
const PRECIPITATION = 'section 4.2, under the heading Precipitation Reactions and Solubility Rules'
const TABLE_4_1 = `${PRECIPITATION}, Table 4.1`
const IONIC_EQUATIONS = 'section 4.1, under the heading Equations for Ionic Reactions'
const NITROGEN_HYDRIDES = 'section 18.5, under the heading Nitrogen Hydrogen Compounds'
const HEAT_EXAMPLE = 'section 5.2, the example headed Heat Produced by an Exothermic Reaction'
const SHEET = "the sheet's title and its section 2 (hazards identification)"
const FIRST_AID = "the sheet's section 4 (first aid measures)"

export const AQUEOUS_PRIMER: readonly PrimerSection[] = [
  {
    id: 'ions',
    heading: 'Ions in solution',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has ten cards. Read four of them before you go to the bench, in this order: Ions in solution; Solubility and the solubility table; The three forms of an equation; Observing safely. The other six can wait until a station sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what is in each bottle, how to tell whether a solid will form, how each of the three equations is written, and how each tool is used.",
      ),
      paragraph(
        { label: 'Ions', terms: ['ion', 'ionic compound'] },
        'An ion is an atom, or a small group of atoms, that carries an electric charge because it has lost or gained electrons. An ionic compound is made of positive ions and negative ions, in the ratio that leaves no charge over. Iron(III) chloride, FeCl₃, has one iron(III) ion, Fe³⁺, for every three chloride ions, Cl⁻.',
        [
          [
            chem2e('2.6'),
            'section 2.6, its opening paragraphs and under the headings Common Polyatomic Ions and Ionic Compounds',
            'atoms that lose or gain electrons become charged particles called ions, that some ions are groups of atoms with one overall charge, and that a compound held together by the attraction between ions of opposite charge is an ionic compound.',
          ],
        ],
        "the example is the lab's own: three charges of one sign are balanced by three ions of one opposite charge each.",
      ),
      paragraph(
        { label: 'Dissolving', terms: ['dissociates', 'strong electrolyte'] },
        'When an ionic compound dissolves in water, its ions separate and spread out through the water: the compound dissociates. A bottle labelled iron(III) chloride solution holds no units of FeCl₃, only Fe³⁺ ions and Cl⁻ ions moving about among the water molecules. A substance that is practically all ions once it is dissolved is called a strong electrolyte. Every solution on this bench is one.',
        [
          [
            chem2e('11.2'),
            'section 11.2, under the heading Ionic Electrolytes',
            'when an ionic compound dissolves, its ions come apart and spread evenly through the solution, a change called dissociation, and that because this is nearly complete such compounds are strong electrolytes.',
          ],
        ],
        "that every solution on the bench is a strong electrolyte is a statement about this lab's bottles: each is a soluble ionic compound or hydrochloric acid.",
      ),
      paragraph(
        { label: 'Hydrochloric acid' },
        'Hydrochloric acid is hydrogen chloride, HCl, dissolved in water. HCl is not an ionic compound, but in water it behaves like one: practically every molecule gives up a hydrogen ion, H⁺, and leaves a chloride ion. The hydrogen ion does not float free; a water molecule carries it, as H₃O⁺. The equations of this lab write it as H⁺ for short.',
        [
          [
            chem2e('11.2'),
            'section 11.2, under the heading Covalent Electrolytes',
            'hydrogen chloride is made of molecules, that in water those molecules pass H+ to water and give hydronium ions and chloride ions, and that this goes practically to completion, which makes hydrochloric acid a strong electrolyte.',
          ],
        ],
        "writing H⁺ for the ion that water carries is this lab's choice (spec 8.1); the book's table of half-reactions in section 17.3 writes H+(aq) in the same way.",
      ),
      paragraph(
        { label: 'State symbols', terms: ['state symbol'] },
        'An equation says what form each substance is in with a state symbol, written in brackets after the formula: (aq) for dissolved in water, (s) for a solid, (l) for a liquid and (g) for a gas.',
        [[chem2e('4.1'), 'section 4.1, under the heading Additional Information in Chemical Equations', 'the physical state of each substance in an equation is shown by an abbreviation in brackets after its formula: s, l, g, and aq for a substance dissolved in water.']],
      ),
    ],
  },
  {
    id: 'solubility',
    heading: 'Solubility and the solubility table',
    paragraphs: [
      paragraph(
        { label: 'Soluble and insoluble', terms: ['soluble', 'insoluble'] },
        'A compound that dissolves well in water is called soluble. One that hardly dissolves at all is called insoluble. Sodium chloride, which is table salt, is soluble. Calcium carbonate, which is chalk, is insoluble.',
        [
          [TABLE, PRECIPITATION, 'substances that dissolve to a relatively large extent are called soluble and those that dissolve very little insoluble.'],
          [TABLE, TABLE_4_1, 'compounds of the group 1 cations, sodium among them, are soluble, and that carbonates are insoluble but for those of the group 1 cations and of ammonium, so calcium carbonate is.'],
        ],
        'that sodium chloride is table salt and calcium carbonate chalk is common knowledge, read in no source for this lab.',
      ),
      paragraph(
        { label: 'Patterns' },
        'Nobody has to remember every compound, because there are patterns. Compounds of sodium and of the ammonium ion, NH₄⁺, are soluble, and so are all nitrates. Most chlorides and most sulfates are soluble, with a few exceptions each. Most carbonates and most hydroxides are insoluble, again with exceptions.',
        [
          [
            TABLE,
            TABLE_4_1,
            'compounds of the group 1 cations and of ammonium, and nitrates, are soluble with no exception listed; that chlorides are soluble but for those of three ions and sulfates but for those of six; and that carbonates and hydroxides are insoluble but for those of the group 1 cations and, for each, one other ion.',
          ],
        ],
      ),
      paragraph(
        { label: 'Reading the table' },
        'The solubility table of this lab has a row for each positive ion and a column for each negative ion. Where a row and a column cross, it says whether the compound the two ions make is soluble or insoluble. To use it, take a positive ion from one bottle and a negative ion from the other, and find where the two cross. The table holds only the pairs that these ten stations can bring together; any other pair is marked "not listed". It opens from the "Solubility table" button at the top of the Lab tab.',
        [[TABLE, TABLE_4_1, 'whether a compound dissolves can be read from which ions it holds, each row of the table giving ions whose compounds are soluble or insoluble and the exceptions.']],
        "the table by pairs is this lab's own form of the book's table (spec 8.1): one entry for each pair of ions the stations can bring together, each read from the row of the book's table that covers it. That the page draws it as rows of positive ions by columns of negative ions, marks a pair it does not hold as not listed, and opens it from a button on the Lab tab is how the page is built (spec 8.5).",
      ),
    ],
  },
  {
    id: 'precipitates',
    heading: 'Precipitates',
    paragraphs: [
      paragraph(
        { label: 'New pairs', terms: ['precipitate'] },
        'Mix two solutions and four kinds of ion share one tube. Each positive ion now meets a negative ion that it was not bottled with. If one of those new pairs is insoluble, its two ions lock together into solid particles and the clear liquid turns cloudy. The solid is called a precipitate.',
        [
          [
            TABLE,
            PRECIPITATION,
            'in a precipitation reaction substances that were dissolved give a solid product, and that whether one happens is predicted by listing the ions present and asking whether any pairing of a positive with a negative ion is an insoluble compound.',
          ],
        ],
      ),
      paragraph(
        { label: 'What it looks like' },
        'A precipitate has a colour and a texture of its own, which need not be the colour of either solution. Some are fine powders that settle slowly. Some are soft and jelly-like, which chemists call gelatinous.',
        [
          [TABLE, PRECIPITATION, 'two solutions can give a precipitate of a colour neither had: lead iodide, bright yellow.'],
          [chem2e('19.1'), 'section 19.1, under the heading Hydroxides', 'adding a soluble hydroxide to a dissolved salt of a first-row transition metal gives a gelatinous precipitate.'],
        ],
        "the fine powder is the form this lab's record stores for barium sulfate, from the source cited there; the paragraph names no compound.",
      ),
      paragraph(
        { label: 'The other pair' },
        'The other new pair usually stays dissolved. Its ions were in the tube before the solid formed and they are still there afterwards, unchanged.',
        [[chem2e('4.1'), IONIC_EQUATIONS, 'ions that are present in the same form before and after a reaction are not changed by it.']],
      ),
    ],
  },
  {
    id: 'equations',
    heading: 'The three forms of an equation',
    paragraphs: [
      paragraph(
        { label: 'An example' },
        'Take a reaction that is at none of the stations. Lead(II) nitrate solution and potassium iodide solution are both colourless. Mixed, they give a bright yellow solid, lead(II) iodide. A solid that forms like this, out of two solutions, is called a precipitate. The same reaction can be written in three ways.',
        [[TABLE, PRECIPITATION, 'lead nitrate solution mixed with potassium iodide solution gives solid lead iodide, which is bright yellow, and that a reaction in which substances that were dissolved give a solid product is a precipitation reaction.']],
        'that the two solutions are colourless is not stated in the passage; no source was read for it.',
      ),
      paragraph(
        { label: 'Molecular', terms: ['molecular equation'] },
        'The molecular equation writes every substance as one whole formula, as if nothing were split into ions.',
        [
          [chem2e('4.1'), IONIC_EQUATIONS, 'an equation that does not show the ions present in solution is called a molecular equation.'],
          [TABLE, PRECIPITATION, 'the reaction is 2KI(aq) + Pb(NO3)2(aq) → PbI2(s) + 2KNO3(aq).'],
        ],
        undefined,
        'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s) + 2KNO₃(aq)',
      ),
      paragraph(
        { label: 'Complete ionic', terms: ['complete ionic equation'] },
        'The complete ionic equation shows what is really in the tube. Every dissolved strong electrolyte is written as its separate ions. The precipitate stays whole, because its ions are locked together in the solid.',
        [[chem2e('4.1'), IONIC_EQUATIONS, 'writing each dissolved ionic compound as its separate ions gives the complete ionic equation, in which a solid product is still written as one formula.']],
        "the equation for this example is worked out here from the molecular one, by the section's method; a test checks that it balances in atoms and in charge.",
        'Pb²⁺(aq) + 2NO₃⁻(aq) + 2K⁺(aq) + 2I⁻(aq) → PbI₂(s) + 2K⁺(aq) + 2NO₃⁻(aq)',
      ),
      paragraph(
        { label: 'Net ionic', terms: ['net ionic equation'] },
        'The net ionic equation keeps only what changes. Cross out every ion that stands unchanged on both sides, the spectator ions, and what is left is the reaction itself.',
        [
          [chem2e('4.1'), IONIC_EQUATIONS, 'removing the ions that appear unchanged on both sides of the complete ionic equation gives the net ionic equation.'],
          [TABLE, PRECIPITATION, 'the net ionic equation of this reaction is Pb2+(aq) + 2I−(aq) → PbI2(s).'],
        ],
        undefined,
        'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)',
      ),
      paragraph(
        { label: 'Whole or split', labRules: ['In this lab ammonia may be given either state, (g) or (aq).'] },
        'In the two ionic forms, split a dissolved ionic compound into its ions, and hydrochloric acid too. Write as one whole formula anything that is not loose ions in the water: a solid, whether it is a precipitate, a powder or a metal; water; and a gas. Ammonia, NH₃, is a molecule and is written whole as well. In this lab ammonia may be given either state, (g) or (aq). It leaves the tube as a gas, and it is also very soluble in water.',
        [
          [chem2e('4.1'), IONIC_EQUATIONS, 'in an ionic equation the dissolved ionic compounds are the substances written as separate ions, while a solid, liquid water and a dissolved gas made of molecules keep their whole formulas.'],
          [chem2e('18.5'), NITROGEN_HYDRIDES, 'ammonia is a gas made of NH3 molecules and is quite soluble in water.'],
        ],
        'which substances are split and which are written whole is the rule of spec 8.1, and that ammonia is accepted in either state is the rule of spec 8.3.',
      ),
      paragraph(
        { label: 'Balancing', terms: ['coefficient'], labRules: ['In this lab an equation is also accepted with all of its coefficients multiplied by the same whole number.'] },
        'Every equation must balance: the same number of each kind of atom on both sides and, in an ionic equation, the same total charge. The number written in front of a formula is its coefficient, and says how many of that unit take part. In this lab an equation is also accepted with all of its coefficients multiplied by the same whole number.',
        [[chem2e('4.1'), 'section 4.1, under the headings Balancing Equations and Equations for Ionic Reactions', 'a balanced equation has equal numbers of atoms of each element on its two sides, that the numbers placed in front of formulas are coefficients, and that the ionic equations of its examples carry equal charge on the two sides.']],
        'accepting coefficients in the same proportion is the rule of spec 8.3.',
      ),
    ],
  },
  {
    id: 'spectators',
    heading: 'Spectator ions',
    paragraphs: [
      paragraph(
        { label: 'Present, not reacting', terms: ['spectator ion'] },
        'An ion that is in the tube before the reaction and is still there afterwards, unchanged, is a spectator ion. It has to be there, because a solution cannot hold ions of one charge alone, but it takes no part. In the example, K⁺ and NO₃⁻ are the spectators.',
        [[chem2e('4.1'), IONIC_EQUATIONS, 'ions that stand in the same form on both sides of a complete ionic equation are spectator ions, there to keep the charges in balance and changed neither chemically nor physically.']],
        "which ions are the spectators of the example follows from its complete ionic equation, worked out in this primer.",
      ),
      paragraph(
        { label: 'Colour that stays' },
        'A coloured spectator ion keeps its colour. If a blue solution gives a white precipitate and the liquid above it is still blue, the ion that made the solution blue has not reacted. If a coloured liquid ends up colourless, the coloured ion has gone into the solid.',
        [],
        'this is the rule of the model (spec 8.1): an ion that is left dissolved gives the liquid its colour, and one that is used up does not. No source was read for the two cases as they are put here.',
      ),
    ],
  },
  {
    id: 'signs',
    heading: 'Gases and heat as signs of a reaction',
    paragraphs: [
      paragraph({ label: 'More than solids' }, 'A precipitate is one sign that a reaction has happened. There are others: a gas, a smell, a change of temperature.', [], 'an introduction to the card; the paragraphs after it give the sources.'),
      paragraph(
        { label: 'Carbonates and acids' },
        'An acid acting on a carbonate gives carbon dioxide gas, water and a salt. The gas leaves the liquid as bubbles, so the mixture fizzes. Carbon dioxide has no colour, and in a small amount no smell.',
        [
          [chem2e('18.6'), 'section 18.6, the paragraph on carbonates and acids and the equation after it', 'carbonates react with acids to give a salt of the metal, carbon dioxide gas and water, calcium carbonate with hydrochloric acid being its example.'],
          ['wikipedia-carbon-dioxide', "the page's infobox and its section on physical properties", 'carbon dioxide is a colourless gas with no odour at low concentrations.'],
        ],
        'that the gas is seen as bubbles and heard as fizzing is how spec 8.2 describes the station; the sources say that the gas is formed.',
      ),
      paragraph(
        { label: 'Metals and acids', terms: ['activity series'] },
        'Some metals give hydrogen gas with an acid: the metal dissolves, as its ion, and bubbles of hydrogen rise. Which metals do this is set out in the activity series, a list of metals in order of how readily each gives up electrons. A metal above hydrogen in the list reacts with acids. Magnesium is far above it.',
        [
          [chem2e('18.5'), 'section 18.5, under the heading Reaction of Metals with Acids', 'metals with lower reduction potentials turn the hydrogen ions of a dilute acid into hydrogen gas and themselves into a salt of the metal.'],
          [
            chem2e('17.3'),
            'section 17.3, Table 17.1 and the paragraphs after it',
            'the half-reaction of the magnesium ion and magnesium metal has a potential of −2.372 V, far below the 0.00 V of hydrogen ions and hydrogen gas, and that a metal placed lower in such a table is oxidised by the ion of a pair placed higher.',
          ],
        ],
        'the book does not use the words activity series in the sections read: its list is the table of potentials, in which a metal above hydrogen in the sense of this card stands below it. The name is the one spec 8.1 uses.',
      ),
      paragraph(
        { label: 'A dissolved gas' },
        'Ammonium ions and hydroxide ions give ammonia, NH₃, and water. Ammonia is a gas with a sharp, pungent smell, but it is so soluble in water that most of it stays dissolved, and few bubbles or none are seen. It shows itself by its smell, and by turning moist red litmus paper blue.',
        [
          [chem2e('18.5'), NITROGEN_HYDRIDES, 'ammonia is made in the laboratory from an ammonium salt and a strong base, sodium hydroxide for one, has no colour and a sharp, pungent odour, and dissolves in water to a very large extent.'],
          ['birk-ammonium', 'the heading Sodium Hydroxide', 'hydroxide added to an ammonium salt gives off ammonia, which turns blue a piece of red litmus paper that has been wetted, and can be known by its odour.'],
        ],
        'that few bubbles or none are seen is what spec 8.2 says of the station, on the ground of the solubility the first source gives.',
      ),
      paragraph(
        { label: 'Heat' },
        'An acid and a base neutralise each other: hydrogen ions and hydroxide ions make water. Nothing is seen, but heat is released and the tube warms. With concentrated solutions it gets hot.',
        [[chem2e('5.2'), HEAT_EXAMPLE, 'hydrochloric acid and sodium hydroxide solution, mixed, warm from 22.0 °C to 28.9 °C, and that the reaction is exothermic.']],
        "that the tube gets hot with concentrated solutions is this lab's own arithmetic: its model gives a rise of about 40 °C for 6 M acid and 6 M base (spec 8.2), six times the concentration of the example and about six times its rise.",
      ),
      paragraph(
        { label: 'An idealised rise', labRules: ['The temperature rise this lab reports is idealised.'] },
        'The temperature rise this lab reports is idealised. It is worked out as if no heat escaped from the tube and as if the liquid were plain water, so a real tube warms somewhat less.',
        [[chem2e('5.2'), HEAT_EXAMPLE, 'such a calculation assumes that no heat is taken up by the vessel or passes to the surroundings, and treats the solution as having the specific heat and the density of water.']],
        "that a real tube warms less follows from the first assumption: heat that escapes does not warm the liquid. The second assumption can err either way and the card does not say which.",
      ),
    ],
  },
  {
    id: 'no-reaction',
    heading: 'When nothing happens',
    paragraphs: [
      paragraph(
        { label: 'No reaction' },
        'Sometimes two solutions are mixed and nothing reacts. If every new pair of ions is soluble, no solid forms. If there is no acid to meet a carbonate, a base or a metal, and no base to meet an ammonium ion, there is no gas and no heat. The ions simply share the tube.',
        [[TABLE, PRECIPITATION, 'a precipitate is expected only where some pairing of the ions present is an insoluble compound.']],
        'the other four conditions are the remaining rules of the model (spec 8.1): three need an acid, and the fourth, which gives ammonia, needs a base to meet an ammonium ion.',
      ),
      paragraph(
        { label: 'What is seen', labRules: ['In this lab "No reaction" can always be chosen in place of an equation.'] },
        'All that changes then is that the two colours blend, as two paints would. That is mixing, not a reaction. In this lab "No reaction" can always be chosen in place of an equation. Where nothing reacts it is the right answer for all three.',
        [],
        'the blended colour is the rule of the model (spec 8.1), and that the answer No reaction is always offered is the rule of spec 8.3. No source was read for the colour of a mixture.',
      ),
    ],
  },
  {
    id: 'limiting',
    heading: 'The limiting reagent',
    paragraphs: [
      paragraph(
        { label: 'What runs out', terms: ['limiting reagent'] },
        'A reaction stops when one of its reactants is used up. That one is the limiting reagent; the other is in excess, and what is left of it stays in the tube. This decides what is seen afterwards. If a coloured ion is in excess, the liquid keeps its colour; if a solid is the limiting reagent, it disappears completely. The amounts at each station are fixed, so which reagent runs out can be worked out: the moles of a dissolved substance are its molarity times the volume in litres, and the equation says how many of one are needed for each of the other.',
        [
          [
            chem2e('4.4'),
            'section 4.4, under the heading Limiting Reactant',
            'when reactants are not supplied in the ratio of the balanced equation, one is used up first and limits how much product forms, while the other is left in excess, and that which one it is follows from comparing the amounts with that ratio.',
          ],
        ],
        "what is seen afterwards is the rule of the model (spec 8.1). The book says limiting reactant; reagent is the word of spec 8.1. That moles are molarity times litres is the definition the titration lab's primer gives, from section 3.3 of the same book.",
      ),
    ],
  },
  {
    id: 'observing',
    heading: 'Observing safely',
    paragraphs: [
      paragraph(
        { label: 'Looking' },
        'Most of what happens can be seen: whether a solid forms and what colour it is, the colour of the liquid, and whether bubbles rise. The eye needs no tool. The other signs do.',
        [],
        "which signs need a tool is this lab's set-up (spec 8.2).",
      ),
      paragraph(
        { label: 'Smelling', terms: ['wafting'], labRules: ['In this lab the waft tool does this for you, and asking to smell a tube directly brings up a safety note instead.'] },
        'Never put your nose over a tube and breathe in. Smelling chemicals is not encouraged in a laboratory at all, and a substance that is toxic, or that nobody has identified, is never smelt on purpose. Where a procedure calls for it and the substance has been checked beforehand, the way to do it is wafting: hold the tube away from your face and wave a little of the vapour towards your nose, with your hand or a folded sheet of paper. In this lab the waft tool does this for you, and asking to smell a tube directly brings up a safety note instead.',
        [
          [
            SNIFFING,
            'chapter 6, section 6.C.2.4 (Avoiding Inhalation of Hazardous Chemicals) and its footnote 1',
            'a laboratory chemical is sniffed only in certain controlled situations and the practice is in general not encouraged; that toxic chemicals and compounds of unknown toxicity are never sniffed deliberately; and that students told to sniff a substance, which should have been screened first, waft its vapour gently towards the nose with a folded sheet of paper and do not inhale it directly.',
          ],
          [MANUAL, 'the heading Wafting to smell a gas', 'to waft, the hand is waved gently over the top of the container and brought towards the nose, which keeps low the amount that reaches it.'],
        ],
        "the tool and the safety note are this lab's (spec 8.2).",
      ),
      paragraph(
        { label: 'Litmus' },
        'In a basic solution red litmus paper goes blue, and moist litmus paper also answers to a gas that dissolves in the water on it. So it matters where the paper is. Dipped into the liquid, it tells you about the liquid. Held moist above the liquid, touching neither the liquid nor the glass, it tells you about the gas coming off.',
        [
          ['wikipedia-litmus', "the page's first paragraph and its section on uses", 'under basic conditions red litmus paper goes blue, and that wet litmus paper can be used to test gases that dissolve in water.'],
          ['birk-ammonium', 'the heading Sodium Hydroxide', 'ammonia gas given off from a solution turns blue a piece of red litmus paper that has been wetted.'],
        ],
        "the two positions of the paper, and what each can and cannot show, are this lab's (spec 8.2).",
      ),
      paragraph(
        { label: 'A hot tube', labRules: ['In this lab the touch tool warns you when a tube is hot, and where it does the thermometer is offered as well.'] },
        'A tube can be hot without looking it, and a tube that is hot from mixing a strong acid with a strong base also holds corrosive liquid. In this lab the touch tool warns you when a tube is hot, and where it does the thermometer is offered as well.',
        [
          [chem2e('5.2'), HEAT_EXAMPLE, 'an acid and a base release heat on mixing, with nothing in the description of the mixture to show it but the thermometer.'],
          ['flinn-sds-395', SHEET, 'hydrochloric acid of 6 M to 12 M carries the signal word Danger and, under the codes H314 and H318, a statement that it burns the skin and the eyes severely and damages them.'],
          ['flinn-sds-735', SHEET, 'sodium hydroxide solutions of 0.3 M to 6.0 M carry the signal word Danger and, under the code H314, a statement that it burns the skin severely and damages the eyes.'],
        ],
        "the warning and the thermometer are this lab's (spec 8.2). The two sheets are the ones the record's caution on a hot tube cites.",
      ),
      paragraph(
        { label: 'The lit splint' },
        'A burning splint held at the mouth of a tube tests for a gas that burns. Hydrogen answers with a sharp pop, as the hydrogen at the mouth of the tube, mixed with air, burns all at once. The test is for a small amount of a gas whose identity is all but known already; it is not a safe way to find out what an unknown gas is.',
        [
          [
            'wikipedia-splint',
            "the page's section on use in chemical identification and its part on the burning splint test",
            'a burning splint shows whether a gas is flammable, that hydrogen gives a distinctive pop, and that such tests are unsafe for a gas that is wholly unidentified, so that they serve only to show a gas whose identity is strongly suspected beforehand.',
          ],
          [chem2e('18.5'), 'section 18.5, under the heading Reactions with Elements', 'hydrogen mixed with oxygen explodes when it is set alight.'],
        ],
        'that the pop is hydrogen mixed with air burning all at once is put together here from the two passages; neither says it in those words.',
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'The simulation' },
        'Nothing in this simulation can hurt you, and nothing in it replaces the safety training and the rules of a real laboratory.',
        [],
        'a statement about this simulation, not chemistry.',
      ),
      paragraph(
        { label: 'Acid and base' },
        "On a real bench every one of these tubes is mixed wearing eye protection, gloves and protective clothing: a supplier's safety data sheets call for all three for every reagent here. The hydrochloric acid, at each of its three strengths, and the sodium hydroxide solution, at both of its, are corrosive. The sheets for solutions of these strengths say that each burns the skin severely and damages the eyes. The 6 M pair of station 8 is the strongest on the bench, and mixing the two makes the tube hot as well.",
        [
          ['flinn-sds-395.2', SHEET, 'hydrochloric acid of 0.1 M to 2.4 M carries the signal word Danger and, under the code H314, a statement that it burns the skin severely and damages the eyes.'],
          ['flinn-sds-395.1', SHEET, 'hydrochloric acid of 2.5 M to 5.9 M carries the signal word Danger and, under the codes H314 and H318, a statement that it burns the skin and the eyes severely and damages them.'],
          ['flinn-sds-395', SHEET, 'hydrochloric acid of 6 M to 12 M carries the signal word Danger and the same statement under the same two codes.'],
          ['flinn-sds-735', SHEET, 'sodium hydroxide solutions of 0.3 M to 6.0 M carry the signal word Danger and, under the code H314, a statement that it burns the skin severely and damages the eyes.'],
          ['flinn-sds-734.1', SHEET, 'sodium hydroxide solutions from 6.1 M up carry the signal word Danger and the same statement, with one more on the corrosion of metals.'],
        ],
        "which sheet covers which bottle, and that every reagent's sheet calls for eye protection, gloves and protective clothing, is in the notes the record stores under each bottle's statements (spec 5.2); a test holds this card to those notes. That the tube of station 8 gets hot is the model's (spec 8.2).",
      ),
      paragraph(
        { label: 'The metal salts' },
        'Several of the coloured solutions do harm that does not show at once. The sheets for nickel chloride and for cobalt chloride, the solids and their solutions alike, say that each may cause cancer and may harm fertility or an unborn child. The sheets for solid barium chloride and solid copper(II) sulfate say that each is toxic if swallowed; for solutions of the strength used here, they say that the copper one is harmful if swallowed and that the barium one may be. Silver nitrate solution of this strength irritates the skin and the eyes.',
        [
          ['flinn-sds-541', SHEET, 'nickel(II) chloride, the solid, carries the signal word Danger and among its statements H350, that it may cause cancer, and H360, that it may harm fertility or an unborn child.'],
          ['flinn-sds-542', SHEET, 'a solution of nickel chloride carries the signal word Danger and the same two statements among its five.'],
          ['flinn-sds-255', SHEET, 'cobalt(II) chloride, the solid, carries the signal word Danger and among its statements H350 and H360.'],
          ['flinn-sds-255.51', SHEET, 'a 10% solution of cobalt chloride carries the signal word Danger and the same two statements among its four.'],
          ['flinn-sds-94', SHEET, 'barium chloride, the solid, carries the signal word Danger and, under H301, the statement that it is toxic if swallowed.'],
          ['flinn-sds-94.01', SHEET, 'barium chloride solutions of less than 1 M carry the signal word Warning and one statement, under H303 and H333: possible harm if swallowed or breathed in.'],
          ['flinn-sds-285', SHEET, 'copper(II) sulfate, the solid, carries the signal word Danger and, under H301, the statement that it is toxic if swallowed.'],
          ['flinn-sds-286', SHEET, 'copper(II) sulfate solutions of 0.5 M to 1.5 M carry the signal word Warning and, under H302, the statement that the solution is harmful if swallowed.'],
          ['flinn-sds-692', SHEET, 'silver nitrate solutions of 0.2 M or less carry the signal word Warning and one statement, under H315 and H319: irritation of the skin and serious irritation of the eyes.'],
        ],
        "the card gives the gravest statement of each and not the whole list; each bottle carries all of its statements, and the note under them gives the solution's with their codes. The record's notes say that the nickel and the cobalt solutions on this bench are more concentrated than the solutions those two sheets are for, and are handled as the sheets for the solids say.",
      ),
      paragraph(
        { label: 'Magnesium and hydrogen' },
        'Magnesium is a metal that burns readily. Its sheet says to keep it away from flames and hot surfaces, and that burning magnesium is never put out with water. The gas it gives with acid burns too: that is what the pop of the lit splint is.',
        [
          ['flinn-sds-468', "the sheet's title and its sections 2 (hazards identification) and 5 (fire fighting measures)", 'magnesium as turnings or ribbon carries the signal word Danger and one statement, under H228, that it is a flammable solid; the sheet also says to keep it from flames, sparks, heat and hot surfaces, and that water is not used on burning magnesium.'],
          [chem2e('18.5'), 'section 18.5, under the heading Reactions with Elements', 'hydrogen mixed with oxygen explodes when it is set alight.'],
        ],
        "what the sheet says of fire is as the note under the bottle's statement gives it.",
      ),
      paragraph(
        { label: 'On the bottles' },
        'Each bottle on the bench lists hazard statements, with a note under them. The statements are for the substance at full strength: for the acid, concentrated acid of 6 M to 12 M; for magnesium, the metal itself; for every other bottle, the solid that the solution is made from. The note says what a safety data sheet gives for the reagent as it is on this bench. Read the note as well as the statements. Calcium carbonate is the one reagent here whose sheet lists no hazard statement at all.',
        [
          ['flinn-sds-395', SHEET, 'the sheet is for hydrochloric acid of 6 M to 12 M, which its title calls concentrated.'],
          ['flinn-sds-195', SHEET, 'the sheet for calcium carbonate prints no signal word and no hazard statement.'],
        ],
        "what each bottle's statements classify is in the heading the record stores over them (spec 5.2), and a test holds this card to those headings.",
      ),
      paragraph(
        { label: 'A splash' },
        'Where a sheet gives first aid for a splash in the eyes, it is to rinse them with water for several minutes and then to keep the rinsing up; none gives a number of minutes for the eyes. The two sheets for iron(III) chloride solution also ask for flushing with water for 15 minutes or more, without saying what is to be flushed, and the two for cobalt chloride print no first aid for the eyes at all. A laboratory sets its own rule, and a common one is 15 minutes at the eyewash; follow the rule of the laboratory you are in.',
        [
          ['flinn-sds-339', FIRST_AID, 'the eyes are rinsed with water for several minutes and the rinsing then kept up, with no number of minutes for the eyes; and that a further sentence asks for flushing with water for 15 minutes or longer and does not say what is flushed.'],
          ['flinn-sds-339.01', FIRST_AID, 'the section says the same of the eyes and has the same further sentence on flushing.'],
          ['flinn-sds-255', FIRST_AID, 'the section has lines for breathing in, for the skin and for swallowing, and none for the eyes.'],
          ['flinn-sds-255.51', FIRST_AID, 'this section too has lines for breathing in, for the skin and for swallowing, and none for the eyes.'],
        ],
        "what each bottle's sheet gives for the eyes is in the note the record stores under the bottle's statements, and a test holds this card to those notes. That a laboratory's own rule is 15 minutes at the eyewash is the owner's statement of the rule where they work (2026-10-05); no source was read for it, and its sentence is the one the titration lab's primer ends its paragraph on the two solutions with.",
      ),
    ],
  },
]

/**
 * The cards to read before the bench, in the order the primer's first paragraph names them. Taken from that
 * paragraph, so the "Read first" mark on a card cannot disagree with it.
 */
export const READ_FIRST: readonly string[] = readFirstOf(AQUEOUS_PRIMER)
