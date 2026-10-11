import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The iodination of acetone lab's concept primer (spec 20.5): seven short cards for a reader with no chemistry
// background, shown one at a time. They are spec 19.6's topics without the clock and without temperature, with
// two of this lab's own: watching a colour go, and an order of nought. A learner may do this lab without the clock
// reaction lab, so nothing here leans on that lab's primer. Nothing here quotes a source, and quotation.test.ts
// holds the cards and their support lines to that: none repeats six words running of a page it rests on. Each
// paragraph says what it rests on in `support`, one line for each passage: either a passage of a source, given
// where it is and, in this project's words, what it establishes, or a line beginning "This lab:" for what is the
// lab's own (its set-up, its rules, its model, its arithmetic) and is read in no source. The sources are listed in
// docs/research/acetone/sources/MANIFEST.json, and the documents of the last card in the lab's hazard manifest;
// all reach sources.json through `npm run build:data`.
//
// Each kind of calculation is worked once, on numbers that are no run's: no strength, volume, rate or rate
// constant of the examples is one the bench can give. A test holds every figure of the examples to the arithmetic.
// The primer is not kept back in either mode, so it gives none of this reaction's orders: the card on an order of
// nought says what such an order looks like and what it tells of any reaction, and names nothing in this flask.
// What the orders found here tell of this reaction is in the notes of part 2, shown once that part is done.

const ORDERS = 'chemguide-orders-of-reaction'
const MECHANISMS = 'chemguide-orders-and-mechanisms'
const COLOUR = 'chemguide-finding-orders'
const STRONGER = 'chemguide-rates-concentration'
const HANDOUT = 'moorpark-iodination-of-acetone'
const THEORY = 'tau-kinetics-iodination'

// Places that more than one paragraph reads.
const ORDERS_PAGE = 'under the heading Orders of reaction and in the parts on either side of it'
const SLOW_STEP = 'under the heading The rate determining step and in the examples after it'
const PROCEDURE = 'under the heading Procedure'
const BEFORE_PROCEDURE = 'the pages before its procedure'
const SECTION_2 = "the sheet's section 2 (hazards identification)"

export const ACETONE_PRIMER: readonly PrimerSection[] = [
  {
    id: 'rate',
    heading: 'How fast',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has seven cards. Read four of them before you go to the bench, in this order: How fast; What a rate depends on; Watching a colour go; Safety. The other three can wait until the notebook sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what is measured, what it is measured for, how the flask shows when to stop the watch, and what a real bench of this lab holds.",
      ),
      paragraph(
        { label: 'A rate', terms: ['rate', 'concentration'] },
        'A rate says how fast a reaction goes: how much of a reactant it uses up each second. How much is given as a concentration, in moles for each litre, written mol/L or M. So a rate is in mol/(L·s). In this lab it is the iodine used up, over the time that took.',
        [
          [ORDERS, ORDERS_PAGE, "a reaction's rate is measured by how quickly a reactant's concentration drops, in moles for each litre and second."],
          [HANDOUT, BEFORE_PROCEDURE, 'for this reaction the rate is taken as the drop in the iodine concentration over the time watched.'],
        ],
      ),
      paragraph(
        { label: 'Small numbers', terms: ['significant figures'] },
        'The rates here are small, like 0.00000123 mol/(L·s). That is written 1.23 × 10⁻⁶, and typed 1.23e-6. Give every number you work out to three significant figures: count from the first figure that is not zero, and round at the third. 0.50 is written 0.500.',
        [],
        'how a small number is typed, and that every number worked out is given to three significant figures, are the rules of this notebook. The example is no rate a run can have.',
      ),
    ],
  },
  {
    id: 'rate-law',
    heading: 'What a rate depends on',
    paragraphs: [
      paragraph(
        { label: 'More of it' },
        'Particles must meet to react, and they meet more often where more of them are packed in. So most reactions go faster in a stronger solution. But twice as strong need not mean twice as fast, and now and then more of one reactant makes no difference at all.',
        [[STRONGER, 'under the heading The facts and in the explanation after it', 'many reactions in solution go faster in a stronger solution, because particles that must collide to react collide more often there; that doubling a concentration does not always double the rate; and that in a few cases more of one reactant has little effect.']],
      ),
      paragraph(
        { label: 'Rate law and order', terms: ['rate law', 'order'] },
        'A rate law gathers this into one line: rate = k[A]ˣ[B]ʸ[C]ᶻ. Square brackets mean the concentration of what is inside them. Each power is the order in that reactant, and says what doubling it does. Order 1 doubles the rate. Order 2 makes it four times as fast. Order 0 leaves it as it was.',
        [
          [ORDERS, ORDERS_PAGE, 'a rate equation has each concentration raised to a power called the order in that reactant; that with an order of one the rate doubles when the concentration doubles, with an order of two it goes up four times, and with an order of zero it does not change.'],
          [THEORY, 'the top of the page, on rate laws and reaction order', 'the powers of a rate law are the orders, and an order of zero means the rate is independent of that concentration.'],
        ],
      ),
      paragraph(
        { label: 'Found at the bench' },
        'No order can be read off the equation of a reaction. Each is found by experiment: change one concentration, keep the rest as they were, and see what the rate does. The four mixtures of part 1 are made up for that. Three of them double one solution each.',
        [
          [ORDERS, ORDERS_PAGE, 'orders are found by doing experiments and cannot be worked out from the equation for the reaction.'],
          [THEORY, 'the top of the page, on rate laws and reaction order', 'the powers of a rate law are found by experiment, by changing one starting concentration while the others are held.'],
        ],
        'that part 1 has four mixtures made up for this is the set-up of this lab (spec 20.1).',
      ),
    ],
  },
  {
    id: 'colour',
    heading: 'Watching a colour go',
    paragraphs: [
      paragraph(
        { label: 'Its own signal' },
        'Iodine in water is yellow, and nothing else in the flask has a colour. As the reaction uses the iodine up, the yellow fades. Nothing has to be added to show the end: when the colour is gone, the iodine is gone.',
        [
          [COLOUR, 'the part on following a reaction with a colorimeter', 'a reaction with a coloured substance in it can be followed by its colour, and that iodine with propanone and an acid fades until it has no colour, as its iodine reacts.'],
          [HANDOUT, BEFORE_PROCEDURE, 'iodine has colour, so the fall in it can be followed by eye, and the time taken is the time for all of a known amount of iodine to be used up.'],
        ],
      ),
      paragraph(
        { label: 'When to stop' },
        'The iodine is poured in and the watch started, as one action. Stop the watch when the liquid can no longer be told from the flask of water beside it. Both stand on white paper, where a faint colour is easiest to see.',
        [[HANDOUT, PROCEDURE, 'the iodine goes in last and the time is taken from then; the mixture is looked at beside a second vessel of water, against white paper; and the time is noted when the colour has just gone.']],
        "that the bench has a second flask of water on white paper is this lab's set-up (spec 20.1); the handout uses two test tubes.",
      ),
      paragraph(
        { label: 'The drawing', labRules: ['In this lab the drawing keeps a faint yellow until the last of the iodine is gone, and then shows none, so that the end can be seen on a screen.'] },
        'In this lab the drawing keeps a faint yellow until the last of the iodine is gone, and then shows none, so that the end can be seen on a screen. On a real bench the last of the colour is hard to see, and two timings of one mixture can differ by many seconds.',
        [[HANDOUT, PROCEDURE, 'two timings of one mixture are asked to agree within 20 seconds, or 15, and no closer.']],
        "what the drawing shows is this lab's own (spec 20.2).",
      ),
      paragraph(
        { label: 'Rate of a run' },
        'A run ends when all of its iodine is used up, so its rate is the iodine the mixture began with, over the time. Each solution is thinned by the others in the flask. So 25 mL of a 0.30 M solution in a 50 mL mixture is 0.30 × 25 ÷ 50 = 0.150 M.',
        [[HANDOUT, 'the pages before its procedure and its report pages', 'the rate of a run is the iodine concentration the mixture started with, divided by the time; and that the concentration of each solution in a mixture is found by the dilution relation.']],
        'the worked example is of no bottle on the bench.',
        'concentration in the mixture = concentration in the bottle × volume used ÷ whole volume',
      ),
    ],
  },
  {
    id: 'order',
    heading: 'Finding an order',
    paragraphs: [
      paragraph(
        { label: 'Compare two runs' },
        'Pick two mixtures that differ in one solution only, and divide the rate of one by the rate of the other. If twice the concentration gave about the same rate, the order is 0. About twice the rate: order 1. About four times: order 2.',
        [
          [HANDOUT, 'the pages before its procedure and its report pages', 'the order in a reactant is found from two mixtures that differ in that reactant alone, by the ratio of their two rates.'],
          [ORDERS, ORDERS_PAGE, 'a rate that doubles with the concentration is first order in it, one that goes up four times is second order, and one that does not change is of order zero.'],
        ],
      ),
      paragraph(
        { label: 'Never exact' },
        'Measured rates never divide out exactly. A ratio of 0.96 is about the same, 2.07 is about twice, and 3.9 is about four times. Choose the order whose ratio is nearest.',
        [[HANDOUT, 'its report pages, under the heading Part A', 'an order worked out from measured rates is not a whole number, and is rounded to the nearest one.']],
        'the three ratios are examples, taken from no run.',
      ),
      paragraph(
        { label: 'A worked example' },
        'Run A holds 0.10 M of a reactant and has a rate of 2.00 × 10⁻⁵. Run B holds 0.20 M and has a rate of 7.90 × 10⁻⁵, with everything else the same. The rate went up 7.90 × 10⁻⁵ ÷ 2.00 × 10⁻⁵ = 3.95 times for twice the concentration: order 2.',
        [],
        'the example is made up: no mixture of the bench has these figures.',
      ),
    ],
  },
  {
    id: 'nought',
    heading: 'An order of nought',
    paragraphs: [
      paragraph(
        { label: 'What it looks like' },
        'A reactant of order 0 does not change the rate: add more of it, and the reaction goes no faster. So it is used up at a steady pace for as long as any is left, and twice as much of it takes twice as long to go.',
        [
          [ORDERS, ORDERS_PAGE, 'an order of zero means that the concentration of that reactant does not affect the rate.'],
          [THEORY, 'under the heading Calculating the Reaction Rate', 'where the rate does not depend on a reactant that is being used up, and the others hardly change, the rate stays the same until that reactant is gone.'],
        ],
        'that twice as much then takes twice as long follows from the steady pace, by arithmetic.',
      ),
      paragraph(
        { label: 'Steps', terms: ['slow step'] },
        'Many reactions happen in steps, one after another. The slowest of them sets the pace of the whole reaction: the others have to wait for it. It is called the slow step, or the rate-determining step.',
        [[MECHANISMS, SLOW_STEP, 'a reaction may go by a series of steps, that the slowest step controls the overall rate, and that it is called the rate determining step.']],
      ),
      paragraph(
        { label: 'What it tells' },
        'In simple cases a reactant of order 0 takes no part in the slow step. It comes in at a later, fast step, and more of it only makes a fast step faster, which changes nothing that is measured. So an order of 0 says something about how a reaction happens. The notes of part 2 say what the orders found in this lab tell.',
        [[MECHANISMS, SLOW_STEP, 'where the slow step comes first, the rate equation shows what takes part in it, and that something whose concentration does not affect the rate must come in only after it, at a step that is fast.']],
        "that the notes of part 2 say what this lab's own orders tell is this lab's arrangement: the primer is read before the orders are found, and gives none of them.",
      ),
    ],
  },
  {
    id: 'constant',
    heading: 'The rate constant',
    paragraphs: [
      paragraph(
        { label: 'What k is', terms: ['rate constant'] },
        'The k in a rate law is the rate constant. It stays the same when only the concentrations change, so four mixtures timed in one room should give about the same k. To find it, divide the rate of a run by each concentration raised to its order. A concentration of order 0 is left out.',
        [
          [ORDERS, ORDERS_PAGE, 'the rate constant is constant only while nothing but the concentrations is changed.'],
          [HANDOUT, 'its procedure and its report pages, under the heading Part B', 'a rate constant is worked out for each mixture from its rate, its concentrations and the orders, and that the values should be about the same where the temperatures are.'],
        ],
        undefined,
        'k = rate ÷ ([A]ˣ × [B]ʸ × [C]ᶻ)',
      ),
      paragraph(
        { label: 'Its unit' },
        'The unit of k follows from the orders. A rate is in mol/(L·s), and dividing by a concentration takes one mol/L away, once for each order. Orders that add up to 1 leave 1/s; to 2, L/(mol·s); to 3, L²/(mol²·s); to 4, L³/(mol³·s).',
        [],
        'the unit follows from the rate law by arithmetic on the units; no source was read for it.',
      ),
      paragraph(
        { label: 'One temperature' },
        'A rate constant belongs to one temperature: in a warmer room the same mixture reacts faster, and k is larger. So the bench has a thermometer, and your k is held to what fits the temperature of your room.',
        [
          [ORDERS, ORDERS_PAGE, 'the rate constant changes if the temperature is changed.'],
          [HANDOUT, 'its first page and its procedure', 'a rise in temperature raises the rate, and that the temperature of a mixture is measured and kept within two degrees between runs.'],
        ],
        "that a result is held to the model's rate constant at the room's own temperature is this lab's rule (spec 19.3, which spec 20.3 follows).",
      ),
      paragraph(
        { label: 'A worked example' },
        'A run has a rate of 3.60 × 10⁻⁵ mol/(L·s), with [A] = 0.300 M at order 1, [B] = 0.0400 M at order 2, and [C] at order 0. Then k = 3.60 × 10⁻⁵ ÷ (0.300 × 0.0400²) = 0.0750 L²/(mol²·s).',
        [],
        'the example is made up: no mixture of the bench has these figures, and no rate law of the bench these orders.',
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'A real bench' },
        "This is a simulation: nothing here can hurt you. A real bench of this lab holds acetone, which needs the most care, because it burns. Each bottle's tile gives its hazards.",
        [],
        "that this is a simulation, that its bench holds acetone and that each tile gives its bottle's hazards are the lab's own (spec 20.1 and 20.5).",
      ),
      paragraph(
        { label: 'Acetone' },
        'Acetone is highly flammable, and mixed with water it still burns. Its vapour is heavier than air and can travel to a flame some way off, so a real bench has no flame, spark or hot surface near. It irritates the eyes, and its vapour can bring drowsiness or dizziness.',
        [
          ['flinn-sds-7', `${SECTION_2} and its section 5 (fire fighting measures)`, 'the liquid and its vapour are classed as highly flammable, kept away from anything hot, from sparks and from flames, and that it is classed as irritating to the eyes and as able to cause drowsiness or dizziness.'],
          ['flinn-sds-7.3', "the sheet's section 5 (fire fighting measures)", 'a solution that is half acetone and half water is still a flammable liquid.'],
          ['nj-rtk-fs-0006', 'its third page, under the heading for fire hazards', 'the vapour is heavier than air and can travel some distance to a source of ignition.'],
        ],
      ),
      paragraph(
        { label: 'Iodine and the product' },
        'The iodine solution irritates skin and eyes. The reaction makes a little iodoacetone, and no official document that could be read says what that does to a person. This lab\'s own caution, and no source\'s: a government record calls its bromine relative, bromoacetone, a violent tear gas, so a real bench treats the product with the same care, and the flask is not sniffed or left open.',
        [
          ['flinn-sds-411', `the sheet's title, its section 3 (composition) and ${SECTION_2}`, 'a dilute solution of iodine in water with potassium iodide is classed as irritating to the skin and the eyes.'],
          ['noaa-cameo-2648', 'the field General Description', 'bromoacetone, the same molecule with bromine where iodoacetone has iodine, is described as a violent lachrymator that irritates the eyes at low concentrations.'],
        ],
        'that the product is treated with the care its bromine relative calls for is this lab\'s own caution, reasoned from the likeness of the two molecules; no document read says that iodoacetone does what bromoacetone does, and a chemist should confirm it. That no official document that could be read says what iodoacetone does to a person is a statement of what was not found, and rests on no source: the README of the lab\'s research record says where was looked. No document read says anything of acetone with iodine or with hydrochloric acid, and the card states no hazard of the mixture.',
      ),
      paragraph(
        { label: 'What to wear' },
        "The sheets call for eye protection, gloves and protective clothing, and good ventilation. After a splash, skin is washed with soap and plenty of water, and eyes are rinsed with water for 15 minutes or more. Disposal is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [
          ['flinn-sds-7', "the sheet's section 8 (exposure controls, personal protection)", 'protection for the eyes, gloves and protective clothing are worn with acetone, in a hood or a place with good ventilation.'],
          ['nj-rtk-fs-0006', 'under its headings for first aid', 'eyes are flushed with a great deal of water for 15 minutes or longer, and skin is washed with soap and a great deal of water.'],
        ],
        "that disposal is decided by the laboratory's own rules and local regulations, and that no procedure of any one site is given, is the rule of this project (spec 5.2).",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the primer's first paragraph names them. */
export const READ_FIRST: readonly string[] = readFirstOf(ACETONE_PRIMER)
