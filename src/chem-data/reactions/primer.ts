import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The types of reactions lab's concept primer (spec 24.4): six short cards for a reader who has not balanced an
// equation before, shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and
// their support lines to that: none repeats six words running of a page it rests on. Each paragraph says what it
// rests on in `support`, one line for each passage: either a passage of a source, given where it is and, in this
// project's words, what it establishes, or a line beginning "This lab:" for what is the lab's own and is read in
// no source. The sources are listed in docs/research/reactions/sources/MANIFEST.json, and the safety data sheets
// of the last card in the lab's hazard manifest or the aqueous reactions lab's; all reach sources.json through
// `npm run build:data`.
//
// The primer is not kept back in either mode, so it says nothing of what the five stations show or which kind each
// is: its examples of the four kinds, its worked equation and the metals it names in the series are none of the
// bench's. It gives the patterns and the rules, which are what the lab asks a learner to apply. The last card
// names the things on the bench that can hurt, which gives no answer away.

const MANUAL = 'smc-types-of-reactions'
const JOINING = 'ck12-combination-reactions'
const PARTING = 'ck12-decomposition-reactions'
const SINGLE = 'ck12-single-replacement-reactions'
const DOUBLE = 'ck12-double-replacement-reactions'
const BALANCING = 'ck12-balancing-equations'
const SALTS = 'chemguide-metal-salt-displacement'
const ACIDS = 'chemguide-metals-dilute-acids'
const SERIES = 'chemguide-reactivity-series'
const CATALYSTS = 'lower-catalysts'
const MAGNESIUM_SHEET = 'flinn-sds-468'
const MAGNESIUM_RECORD = 'noaa-cameo-6949'
const ACID_SHEET = 'flinn-sds-395.2'
const PEROXIDE_SHEET = 'flinn-sds-398.5'
const COPPER_SULFATE_SHEET = 'flinn-sds-285'

// Places that more than one paragraph reads.
const TYPES = 'under the heading Reaction Types'
const SECTION_2 = "the sheet's section 2 (hazards identification)"

export const REACTIONS_PRIMER: readonly PrimerSection[] = [
  {
    id: 'reaction',
    heading: 'What a reaction is',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has six cards. Read four of them before you go to the bench, in this order: What a reaction is; The four kinds; Equations and balancing; Safety. The other two can wait until a station sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what to look for, what the four kinds are, how an equation is read and balanced, and what on the bench can hurt.",
      ),
      paragraph(
        { label: 'New things', terms: ['chemical reaction'] },
        'In a chemical reaction the things you start with turn into different things. Water freezing is not one: ice is still water. Sodium, a metal, and chlorine, a gas, joining into table salt is one: the salt is neither of the two.',
        [
          [MANUAL, 'the first paragraph of its introduction', 'freezing leaves a substance what it was, where a chemical change makes new substances.'],
          [JOINING, 'under the heading Combination Reactions', 'sodium, a solid metal, and chlorine, a gas, give sodium chloride, a solid.'],
          [SALTS, 'under the heading What is a salt?', 'sodium chloride is the common salt of the table.'],
        ],
      ),
      paragraph(
        { label: 'Signs to look for' },
        'You cannot watch the new things being made, but you can see signs of them: a colour that changes, a solid that appears in a clear liquid, bubbles of a gas, a tube that warms or cools, a coating on a piece of metal. At each station you record the signs you see.',
        [[MANUAL, 'the list in its introduction', 'a change of colour, a solid forming, a gas bubbling off, heat given out or taken in and one metal plating out on another each go with a chemical change.']],
        "that the signs are recorded at each station is this lab's own (spec 24.2).",
      ),
    ],
  },
  {
    id: 'kinds',
    heading: 'The four kinds',
    paragraphs: [
      paragraph(
        { label: 'Joining and parting', terms: ['combination', 'decomposition'] },
        'In a combination two things join into one: A + B → AB. Hydrogen and oxygen join to make water. In a decomposition one thing comes apart into two or more: AB → A + B. When a match is struck, a compound in its head comes apart and gives off oxygen.',
        [
          [JOINING, 'under the heading Combination Reactions', 'this is the pattern in letters of a combination, in which two substances or more become one.'],
          [PARTING, 'under the heading Decomposition Reactions', 'this is the pattern in letters of a decomposition, where one compound is split into simpler substances.'],
          [MANUAL, TYPES, 'hydrogen and oxygen joining into water is a combination, and that a compound in the head of a match comes apart as the match lights and gives oxygen, which is its example of a decomposition.'],
        ],
      ),
      paragraph(
        { label: 'Changing places', terms: ['single replacement', 'double replacement'] },
        'In a single replacement an element takes the place of another in a compound: A + BC → AC + B. In a double replacement two compounds trade partners: AB + CD → AD + CB. Sodium phosphate softens hard water that way: it trades partners with the calcium compound dissolved in the water, and the calcium comes out as a solid.',
        [
          [SINGLE, 'under the heading Single-Replacement Reactions', 'this is the pattern in letters of a single replacement, in which one element takes the place of a like one in a compound.'],
          [DOUBLE, 'under the heading Double-Replacement Reactions', 'this is the pattern in letters of a double replacement, in which the ions of two compounds change places.'],
          [MANUAL, TYPES, 'sodium phosphate trades ions with the calcium of hard water and brings it down as solid calcium phosphate, and some softeners that are sold work by that reaction.'],
        ],
        'no everyday case of a single replacement was found in a source that was read, and none is given.',
      ),
      paragraph(
        { label: 'At a station' },
        'At each station you say which of the four you saw, or that nothing reacted. Look at what went in and what came out, and find the pattern they fit.',
        [],
        "what a station asks is this lab's own (spec 24.2).",
      ),
    ],
  },
  {
    id: 'equations',
    heading: 'Equations and balancing',
    paragraphs: [
      paragraph(
        { label: 'Reading one', terms: ['equation', 'coefficient'] },
        'An equation gives what goes in, then an arrow, then what comes out. Each thing is a formula with its state after it: (s) solid, (l) liquid, (g) gas, (aq) dissolved in water. A number in front of a formula, its coefficient, says how many of it there are.',
        [
          [MANUAL, 'in its instructions for performing each reaction', 'an equation gives the state of each thing in it: solid, liquid, gas, or dissolved in water.'],
          [BALANCING, 'under the heading Balancing Chemical Equations', 'a coefficient is a whole number put in front of a formula.'],
        ],
      ),
      paragraph(
        { label: 'Both sides alike', terms: ['balanced'] },
        'A reaction makes no atoms and loses none: it only rearranges them. So an equation must show as many atoms of each element coming out as going in. Then it is balanced. You balance one by changing coefficients, never the small numbers inside a formula. No coefficient is written for 1.',
        [[BALANCING, 'in its opening paragraph and under the heading Balancing Chemical Equations', 'matter is not made or destroyed in a reaction, that in a balanced equation each element has as many atoms on one side as on the other, that the numbers inside a formula are never changed, and that a coefficient of one is not written.']],
      ),
      paragraph(
        { label: 'A worked example' },
        'Hydrogen and oxygen make water. Start with H₂ + O₂ → H₂O. Count: 2 hydrogen and 2 oxygen go in; 2 hydrogen and 1 oxygen come out. Put 2 before the water: 4 hydrogen and 2 oxygen now come out. Put 2 before the hydrogen: 4 hydrogen and 2 oxygen go in. It balances.',
        [
          [MANUAL, TYPES, 'two of hydrogen and one of oxygen give two of water, which is the balanced equation the example ends at.'],
          [BALANCING, 'under the heading Balancing Chemical Equations', 'an equation is balanced by counting the atoms on each side and putting coefficients in, one element at a time.'],
        ],
        "the counting, step by step, is this project's working.",
        '2H₂(g) + O₂(g) → 2H₂O(l)',
      ),
    ],
  },
  {
    id: 'series',
    heading: 'Metals in order',
    paragraphs: [
      paragraph(
        { label: 'More and less active', terms: ['activity series'] },
        'Some metals react more readily than others. Set in order, the most active first, they make the activity series. Potassium and sodium stand near its top, and gold at its bottom.',
        [
          [SERIES, 'in the list and the paragraph before it', 'the metals can be listed from the most reactive to the least, with potassium and sodium at the head of the list and gold at its foot.'],
          [MANUAL, TYPES, 'such a list is called an activity series.'],
        ],
      ),
      paragraph(
        { label: 'Pushing out' },
        "A more active metal pushes a less active one out of its compound and takes its place. The other way round, nothing happens. So a piece of one metal in a solution of another metal's compound shows which of the two is the more active.",
        [
          [SALTS, 'under the heading Displacement reactions and the reactivity series', 'a metal higher in the series pushes one lower down out of its salts, and that a metal lower down does nothing to the salt of one above it.'],
          [MANUAL, TYPES, 'the more active metal is the one that displaces the other.'],
        ],
      ),
      paragraph(
        { label: 'Where hydrogen stands' },
        'Hydrogen has a place in the series, though it is no metal. A metal above it pushes hydrogen out of an acid, and bubbles show. A metal below it does nothing in the acid. The higher the metal stands, the faster it bubbles.',
        [
          [ACIDS, 'under the heading What you should be comfortable with before you go on', 'metals above hydrogen react with acids and give hydrogen, that those below it do not, and that the reaction is faster the higher the metal stands.'],
          [SERIES, 'in the list', 'hydrogen has a place in the list, in brackets.'],
        ],
      ),
    ],
  },
  {
    id: 'catalyst',
    heading: 'A catalyst',
    paragraphs: [
      paragraph(
        { label: 'Faster, not used up', terms: ['catalyst'] },
        'A catalyst makes a reaction go faster and is not used up by it: what was put in is still there at the end. The enzymes of living things are catalysts.',
        [
          [CATALYSTS, 'under the headings What are Catalysts? and Catalysts provide alternative reaction pathways', 'a catalyst speeds a reaction up without being used up, and that enzymes are the catalysts of living things.'],
          [ACIDS, 'under the heading on making hydrogen in the laboratory', 'a catalyst is unchanged when the reaction is over.'],
        ],
      ),
      paragraph(
        { label: 'Not in the equation', labRules: ['In this lab a catalyst is shown over the arrow of a finished equation.'] },
        'Since it is not used up, a catalyst is written neither with the things that go in nor with the things that come out. In this lab a catalyst is shown over the arrow of a finished equation.',
        [[CATALYSTS, 'under the heading What are Catalysts?', 'a catalyst has no place in the equation for the whole change.']],
        "that a catalyst is shown over the arrow, and only once an equation is finished, is this lab's own.",
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'Burning magnesium' },
        'Burning magnesium gives a light bright enough to hurt your eyes: do not look straight at it. Hold the strip in tongs. A magnesium fire is never put out with water, which makes it worse: dry sand is used.',
        [
          [MANUAL, 'in the safety lines before its instructions, and in part A', 'the light of burning magnesium can hurt the eyes and is not stared at, and that the strip is held in tongs.'],
          [MAGNESIUM_SHEET, "the sheet's section 5 (fire fighting measures)", 'the metal reacts violently with water, and a fire of it is fought with dry sand or a class D extinguisher.'],
          [MAGNESIUM_RECORD, 'the fields Fire Hazard and Firefighting', 'the flame is very bright, and water is not to be used on it.'],
        ],
      ),
      paragraph(
        { label: 'Acid, peroxide and flames' },
        'Hydrochloric acid burns skin and eyes, and hydrogen peroxide can damage the eyes: wear eye protection and gloves. The gas that bubbles off a metal in acid is hydrogen, and hydrogen burns: keep flames away from those tubes.',
        [
          [ACID_SHEET, SECTION_2, 'hydrochloric acid of this strength burns the skin and damages the eyes; its section 8 calls for eye protection and gloves.'],
          [PEROXIDE_SHEET, SECTION_2, 'hydrogen peroxide of this strength irritates the skin and can do serious damage to the eyes.'],
          [MAGNESIUM_RECORD, 'the general description and the field Reactivity Profile', 'a metal in a dilute acid sets hydrogen free, and that hydrogen is a gas that burns.'],
        ],
        "that no flame is brought near a tube that gives off hydrogen is this project's precaution, drawn from the record.",
      ),
      paragraph(
        { label: 'Hands and waste' },
        "Do not touch the metals or the solutions with bare hands, and wash your hands when you finish. Copper(II) sulfate is toxic if swallowed. What is done with the waste is for your supervisor and the laboratory's own rules to say.",
        [
          [MANUAL, 'in the safety lines before its instructions', 'the metals are not touched with the hands.'],
          [COPPER_SULFATE_SHEET, SECTION_2, 'copper(II) sulfate is toxic if swallowed; its section 8 has the hands washed after handling.'],
        ],
        "that disposal is decided by the laboratory's own rules and local regulations, and that the supervisor is asked, is this project's rule for every lab (spec 5.2).",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first card names them. */
export const READ_FIRST = readFirstOf(REACTIONS_PRIMER)
