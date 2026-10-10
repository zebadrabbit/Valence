import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The clock reaction lab's concept primer (spec 19.6): eight short cards for a reader with no chemistry
// background, shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their
// support lines to that: none repeats six words running of a page it rests on. Each paragraph says what it rests
// on in `support`, one line for each passage: either a passage of a source, given where it is and, in this
// project's words, what it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its
// rules, its model, its arithmetic) and is read in no source. The sources are listed in
// docs/research/clock/sources/MANIFEST.json, and the documents of the last card in the lab's hazard manifest; all
// reach sources.json through `npm run build:data`.
//
// Each kind of calculation is worked once, on numbers that are no run's: no strength, volume, rate, rate constant
// or slope of the examples is one the bench can give. A test holds every figure of the examples to the arithmetic,
// and the figures the cards take from the record (the 273.15, the gas constant, the six, the 50 mL) to the record.
// The primer is not kept back in either mode. It says how an order is found and gives none of this reaction's.

const ORDERS = 'chemguide-orders-of-reaction'
const ARRHENIUS = 'chemguide-arrhenius'
const CLOCKS = 'chemguide-finding-orders'
const COLLISIONS = 'chemguide-collision-theory'
const WARMER = 'chemguide-rates-temperature'
const STRONGER = 'chemguide-rates-concentration'
const BELLEVUE = 'bellevue-clock-reaction'
const NCSSM = 'ncssm-clock-reaction'
const MOORPARK = 'moorpark-clock-reaction'
const SMC = 'smc-initial-rates'
const KELVIN = 'nist-si-temperature'
const CONSTANTS = 'nist-codata-2022'

// Places that more than one paragraph reads.
const ORDERS_PAGE = 'under the heading Orders of reaction and in the parts on either side of it'
const CLOCK_PASSAGE = 'its first two pages, on the clock reaction'
const CALCULATIONS = 'under the heading Calculations'
const ARRHENIUS_PAGE = 'under the heading The Arrhenius equation and in the part after it'
const SECTION_2 = "the sheet's section 2 (hazards identification)"

export const CLOCK_PRIMER: readonly PrimerSection[] = [
  {
    id: 'rate',
    heading: 'How fast',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has eight cards. Read four of them before you go to the bench, in this order: How fast; What a rate depends on; The clock; Safety. The other four can wait until the notebook sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what is measured, what it is measured for, how the flask shows when to stop the watch, and what a real bench of this lab holds.",
      ),
      paragraph(
        { label: 'A rate', terms: ['rate', 'concentration'] },
        'The rate of a reaction says how fast it goes: how much of a reactant is used up in each second. How much is counted as a concentration, in moles for each litre, written mol/L or M. So a rate is in mol/(L·s). Here it is the bromate used up, over the time that took.',
        [
          [ORDERS, ORDERS_PAGE, 'a reaction\'s rate is measured by the speed at which a reactant\'s concentration drops, in moles for each litre and second.'],
          [SMC, 'its second page, where the rate of the reaction is defined', 'for this reaction the rate is taken as the drop in bromate concentration over the time watched.'],
        ],
      ),
      paragraph(
        { label: 'Small numbers', terms: ['significant figures'] },
        'The rates here are small, like 0.000000322 mol/(L·s). That is written 3.22 × 10⁻⁷, and typed 3.22e-7. Give every number you work out to three significant figures: count from the first figure that is not zero, and round at the third. 0.0020 is written 0.00200.',
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
        { label: 'Stronger, so faster' },
        'Particles react only when they meet, and they meet more often where there are more of them. So a reaction usually goes faster in a stronger solution. But twice the concentration need not mean twice the rate.',
        [[STRONGER, 'under the heading The facts and in the explanation after it', 'many reactions in solution go faster in a stronger solution, because particles that must collide to react collide more often there, and that doubling a concentration does not always double the rate.']],
      ),
      paragraph(
        { label: 'Rate law and order', terms: ['rate law', 'order'] },
        'A rate law says how the rate depends on each concentration: rate = k[A]ˣ[B]ʸ. Square brackets mean the concentration of what is in them. The power on a concentration is the order in that reactant. Order 1: twice the concentration, twice the rate. Order 2: four times the rate. Order 0: no change.',
        [[ORDERS, ORDERS_PAGE, 'a rate equation has each concentration raised to a power called the order in that reactant; that with an order of one the rate doubles when the concentration doubles, with an order of two it goes up four times, and with an order of nothing it does not change.']],
      ),
      paragraph(
        { label: 'Found by experiment' },
        'An order cannot be read off the equation of the reaction. It is found by experiment: change one concentration, keep everything else the same, and see what the rate does. The five mixtures of part 1 are made up for that.',
        [
          [ORDERS, ORDERS_PAGE, 'orders are found by doing experiments and cannot be worked out from the equation for the reaction.'],
          [NCSSM, 'under the heading Introduction and Theory', 'the effect of each thing on a rate is found with all the others held the same, and the powers in a rate law are not the numbers of the balanced equation.'],
        ],
        'that part 1 has five mixtures made up for this is the set-up of this lab (spec 19.1).',
      ),
    ],
  },
  {
    id: 'clock',
    heading: 'The clock',
    paragraphs: [
      paragraph(
        { label: 'Two reactions' },
        'Bromate, iodide and acid slowly make iodine. The flask also holds a little thiosulfate, which takes up iodine at once, as fast as it forms, and turns it back into iodide.',
        [
          [MOORPARK, CLOCK_PASSAGE, 'bromate, iodide and hydrogen ions give iodine at a rate that can be measured, and that thiosulfate in the same flask reacts with that iodine far faster and gives iodide again.'],
          [CLOCKS, 'under the heading Iodine clock reactions', 'a very small amount of thiosulfate in the mixture reacts with the iodine that is made first.'],
        ],
      ),
      paragraph(
        { label: 'The sudden blue' },
        'Starch turns dark blue with iodine. While any thiosulfate is left, no iodine stays, and the liquid stays colourless. When the last of it is used up, the next iodine meets the starch and the liquid turns blue all at once. That is when the watch is stopped.',
        [
          [CLOCKS, 'under the heading Iodine clock reactions', 'iodine gives a very deep blue with starch, that no blue shows while the thiosulfate lasts, and that the mixture goes blue suddenly once it is used up.'],
          [SMC, CLOCK_PASSAGE, 'everything else in the flask is without colour, so the change is from no colour to blue, and that the time to it is what is measured.'],
        ],
      ),
      paragraph(
        { label: 'Six for one' },
        'Each bromate ion that reacts makes enough iodine to use up six thiosulfate ions. So when the blue comes, the bromate used up is a sixth of the thiosulfate the mixture held.',
        [[MOORPARK, CLOCK_PASSAGE, 'the clock tells when a set amount of bromate has reacted, a sixth of a mole of it for each mole of thiosulfate, and that the rate is that amount over the time.']],
        undefined,
        'rate = (concentration of thiosulfate in the mixture ÷ 6) ÷ time',
      ),
      paragraph(
        { label: 'Once mixed' },
        'Each solution is thinned by the others when the flasks are mixed. Its concentration in the mixture is its concentration in the bottle, times the volume of it used, over the whole 50 mL. So 20 mL of a 0.50 M solution in a 50 mL mixture is 0.50 × 20 ÷ 50 = 0.200 M.',
        [
          [BELLEVUE, CALCULATIONS, 'the concentration of each ion in a mixture is worked out by the dilution formula, for the moment the solutions are mixed.'],
          [NCSSM, 'over its table of data', 'a solution is weaker in the mixture than in its bottle, each being diluted by the others to 50 mL in all.'],
        ],
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
        'Take two runs that differ in one reactant only. Divide the faster rate by the slower one. With twice the concentration: a rate about the same means order 0, about twice means order 1, and about four times means order 2.',
        [
          [BELLEVUE, CALCULATIONS, 'the order in a reactant is found from the first run and the run that differs from it in that reactant, by the ratio of the two rates.'],
          [ORDERS, ORDERS_PAGE, 'a rate that doubles with the concentration is first order in it, one that goes up four times is second order, and one that does not change is of order nothing.'],
        ],
      ),
      paragraph(
        { label: 'Never exact' },
        'Measured rates do not come out exact. A ratio of 2.05 is twice, and 3.9 is four times. Choose the order whose figure is nearest.',
        [[BELLEVUE, 'the worked example on its third and fourth pages, and its calculations', 'measured results are seldom clean, and that the order worked out from them is rounded to the nearest whole number.']],
        'the two ratios are examples, and are no run\'s.',
      ),
      paragraph(
        { label: 'A worked example' },
        'Run A holds 0.0010 M of a reactant and has a rate of 4.00 × 10⁻⁷. Run B holds 0.0020 M and has a rate of 1.58 × 10⁻⁶, with everything else the same. The rate went up 1.58 × 10⁻⁶ ÷ 4.00 × 10⁻⁷ = 3.95 times for twice the concentration: order 2.',
        [],
        'the example is made up: no mixture of the bench has these figures.',
      ),
    ],
  },
  {
    id: 'constant',
    heading: 'The rate constant',
    paragraphs: [
      paragraph(
        { label: 'What k is', terms: ['rate constant'] },
        'The k in a rate law is the rate constant. It stays the same while only the concentrations change, so every mixture at one temperature should give about the same k. To find it, divide a run\'s rate by its concentrations, each raised to its order.',
        [
          [ORDERS, ORDERS_PAGE, 'the rate constant is constant only while nothing but the concentrations is changed, and changes with the temperature.'],
          [BELLEVUE, CALCULATIONS, 'a rate constant is worked out for each run from its rate and its concentrations, and the runs\' values are averaged.'],
        ],
        undefined,
        'k = rate ÷ ([A]ˣ × [B]ʸ × [C]ᶻ)',
      ),
      paragraph(
        { label: 'Its unit' },
        'The unit of k depends on the orders. A rate is in mol/(L·s), and each order takes one mol/L away. With orders that add up to 1, k is in 1/s; to 2, in L/(mol·s); to 3, in L²/(mol²·s); to 4, in L³/(mol³·s).',
        [],
        'the unit follows from the rate law by arithmetic on the units; no source was read for it.',
      ),
      paragraph(
        { label: 'A worked example' },
        'A run has a rate of 2.40 × 10⁻⁶ mol/(L·s), with [A] = 0.0200 M at order 1 and [B] = 0.0100 M at order 2. Then k = 2.40 × 10⁻⁶ ÷ (0.0200 × 0.0100²) = 1.20 L²/(mol²·s).',
        [],
        'the example is made up: no mixture of the bench has these figures, and no rate law of the bench these orders.',
      ),
    ],
  },
  {
    id: 'temperature',
    heading: 'Temperature and activation energy',
    paragraphs: [
      paragraph(
        { label: 'Warmer, so faster', terms: ['activation energy'] },
        'Particles react only if they collide with enough energy. The least that will do is the activation energy, written Ea. In a warmer liquid many more particles have that much, so the reaction goes faster: for many reactions near room temperature, about twice as fast for each 10 °C.',
        [
          [COLLISIONS, 'under the heading Activation Energy', 'particles react only when they collide with at least a certain energy, which is called the activation energy.'],
          [WARMER, 'under the heading The facts and in the explanation after it', 'a warmer mixture has many more particles with the activation energy or more, and that for many reactions near room temperature the rate roughly doubles for a rise of ten degrees.'],
        ],
      ),
      paragraph(
        { label: 'Kelvin' },
        'The arithmetic needs the temperature in kelvin, written K: add 273.15 to the reading in degrees Celsius. So 20.0 °C is 293.15 K.',
        [[KELVIN, 'the first paragraph of the page and its table of conversions', 'a degree Celsius is a step of one kelvin, and a Celsius temperature becomes kelvin when 273.15 is added to it.']],
      ),
      paragraph(
        { label: 'The Arrhenius equation' },
        'One equation ties k to the temperature T. In it, ln is the natural logarithm, a key on a calculator; R is the gas constant, 8.314 J/(mol·K); and A is a number that belongs to the reaction. The larger Ea is, the more k changes with temperature.',
        [
          [ARRHENIUS, ARRHENIUS_PAGE, 'the rate constant depends on the temperature in kelvin, on the gas constant and on the activation energy as this equation has it, in the form that uses the natural logarithm.'],
          [CONSTANTS, 'the line for the molar gas constant', 'the gas constant is 8.314 462 618 J/(mol·K), which the card gives to four figures.'],
        ],
        undefined,
        'ln k = ln A − Ea ÷ (R × T)',
      ),
    ],
  },
  {
    id: 'graph',
    heading: 'Reading the graph',
    paragraphs: [
      paragraph(
        { label: 'A straight line' },
        'Plot ln k up the side against 1 ÷ T along the bottom, and the Arrhenius equation is a straight line. Its slope is −Ea ÷ R. The line falls from left to right, so the slope is a negative number.',
        [
          [ARRHENIUS, ARRHENIUS_PAGE, 'the equation can be written with the natural logarithm of the rate constant on one side, which is the form of a straight line against one over the temperature.'],
          [BELLEVUE, 'under the heading on the effect of temperature', 'a graph of ln k against 1/T is a straight line whose slope gives the activation energy.'],
        ],
      ),
      paragraph(
        { label: 'The slope' },
        'Look at two places on the line, well apart. From (0.00320, 4.500) to (0.00360, 2.300) the slope is (2.300 − 4.500) ÷ (0.00360 − 0.00320) = −5500 K.',
        [],
        'the two places are made up, and are on no line a run can give.',
        'slope = (second ln k − first ln k) ÷ (second 1/T − first 1/T)',
      ),
      paragraph(
        { label: 'The activation energy' },
        'Multiply the size of the slope by R. With a slope of −5500 K: 5500 × 8.314 = 45 727 J/mol, which is 45.7 kJ/mol. Give it in kJ/mol, as a positive number.',
        [],
        'the example follows from the slope of the card above it, by the relation the card before gives.',
        'Ea = −slope × R',
      ),
      paragraph(
        { label: 'What the notebook fills', labRules: ['In this lab the notebook fills in each temperature in kelvin, one over it, each rate constant and its logarithm, and draws the line; you read two places on it and work out the rest.'] },
        'In this lab the notebook fills in each temperature in kelvin, one over it, each rate constant and its logarithm, and draws the line; you read two places on it and work out the rest.',
        [],
        'what the notebook fills in and what is left to the learner is this lab\'s own (spec 19.3).',
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'A real bench' },
        'This is a simulation: nothing here can hurt you. A real bench of this lab holds potassium bromate, which needs the most care. Each bottle\'s tile gives its hazards.',
        [],
        'that this is a simulation, that its bench holds potassium bromate and that each tile gives its bottle\'s hazards are the lab\'s own (spec 19.1 and 19.5).',
      ),
      paragraph(
        { label: 'Potassium bromate' },
        'Potassium bromate is toxic if swallowed and may cause cancer, and one fact sheet has it handled as a carcinogen that passes through skin. It is a strong oxidiser, kept from reducing agents, from anything that burns and from organic materials; the solid is never mixed with acid. On this bench it meets the others only in the flask, each already dilute.',
        [
          ['flinn-sds-615', `${SECTION_2} and its section 10 (stability and reactivity)`, 'the solid is classed as toxic if swallowed and as able to cause cancer, and is kept from strong reducers.'],
          ['nj-rtk-fs-1559', 'its first page and, on its last, the lists under the heading for handling and storage', 'the salt is to be handled as a carcinogen, can pass through the skin, and does not go with organic materials.'],
          ['noaa-cameo-1353', 'the field Reactivity Profile', 'the solid is a strong oxidising agent, and that mixtures of it with what burns are dangerous.'],
          ['wards-sds-pp0395', "the sheet's section 5 (fire-fighting measures)", 'the solid is not mixed with acids, with what burns or with what is easily oxidised.'],
          ['wards-sds-pp0398', "the sheet's section 10 (stability and reactivity)", 'the 0.04 M solution is kept from reducing agents.'],
        ],
        'that the bromate meets the other four only in the flask, each of them dilute, is the experiment itself. No document read says what the dilute solutions give when they are mixed.',
      ),
      paragraph(
        { label: 'Iodine in the flask' },
        'A flask that has turned holds a little iodine, kept dissolved by the iodide. A sheet for a stronger solution of the two classes it as irritating to skin and eyes, and iodine is very toxic to water life: what a used flask holds is kept out of drains.',
        [
          ['flinn-sds-411', `the sheet's title, its section 3 (composition) and ${SECTION_2}`, 'a solution of iodine in water with potassium iodide, stronger than any this bench makes, is classed as irritating to the skin and the eyes.'],
          ['noaa-cameo-25035', 'the field General Description', 'iodine hardly dissolves in water and dissolves readily in a solution of an iodide.'],
          ['fisher-sds-iodine', `${SECTION_2}, its section 6 (accidental release measures) and its section 12 (ecological information)`, 'iodine is very toxic to water life and is kept from drains and from surface water.'],
        ],
        'that the flask holds iodine once it has turned is the reaction of this lab; the documents are of iodine and of a solution of it, not of this mixture.',
      ),
      paragraph(
        { label: 'What to wear' },
        'The sheets call for eye protection, gloves and a laboratory coat. After a splash, skin is washed at once with soap and water; eyes are rinsed with water for 15 minutes or more, and a doctor is seen at once. How anything is disposed of is decided by the laboratory\'s own rules and by local regulations: ask the laboratory\'s supervisor.',
        [
          ['wards-sds-pp0398', "the sheet's section 4 (first aid measures) and its section 8 (exposure controls, personal protection)", 'for the 0.04 M solution eyes are flushed with water for 15 minutes or more with medical attention at once, skin is washed with soap and water, and eye protection, a laboratory coat and gloves are worn.'],
          ['nj-rtk-fs-1559', 'its last page, under the heading for first aid', 'eyes are flushed for 15 minutes or longer, with plenty of water.'],
          ['noaa-cameo-25035', 'the field First Aid', 'for iodine the eyes are washed at once with a great deal of water and the skin at once with soap and water, with medical attention.'],
          ['flinn-sds-411', "the sheet's section 8 (exposure controls, personal protection)", 'eye protection, gloves and protective clothing are worn with a dilute solution of iodine.'],
        ],
        'that disposal is decided by the laboratory\'s own rules and local regulations, and that no procedure of any one site is given, is the rule of this project (spec 5.2).',
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the primer's first paragraph names them. */
export const READ_FIRST: readonly string[] = readFirstOf(CLOCK_PRIMER)
