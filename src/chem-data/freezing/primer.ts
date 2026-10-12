import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The freezing point depression lab's concept primer (spec 23.5): nine cards, shown one at a time. Nothing here
// quotes a source, and quotation.test.ts holds the cards and their support lines to that: none repeats six words
// running of a page it rests on. Each paragraph says what it rests on in `support`, one line for each passage:
// either a passage of a source, given where it is and, in this project's words, what it establishes, or a line
// beginning "This lab:" for what is the lab's own (its set-up, its rules, its model) and is read in no source.
// The sources are listed in docs/research/freezing/sources/MANIFEST.json, and the documents of the last card in
// that folder's hazard-manifest.json; all reach sources.json through `npm run build:data`.
//
// The molar mass and the count of particles are each worked once, on numbers that are no run's: no mass and no
// fall of an example is one the bench can give, and no molar mass of an example is a row of either table. A test
// holds every figure of the examples to the arithmetic, worked on rounded and on unrounded numbers alike.

const FALL = 'wikipedia-freezing-point-depression'
const FACTOR = 'wikipedia-van-t-hoff-factor'
const THERMOMETER = 'wikipedia-thermometer'
const sheet = (number: string) => `flinn-sds-${number}`

// Places that more than one paragraph reads.
const EXPLAINED = 'the article on the lowering of the freezing point, under the heading that explains it'
const FORMULA = 'the article on the lowering of the freezing point, under the heading on the formula for a dilute solution'
const OPENING = "the article on the van 't Hoff factor, its opening paragraphs"
const CALIBRATION = 'the article on the thermometer, under the heading on calibration'
const HAZARDS = "the sheet's title and its section 2 (hazards identification)"

export const FREEZING_PRIMER: readonly PrimerSection[] = [
  {
    id: 'freezing',
    heading: 'Freezing and melting',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has nine cards. Read five of them before you go to the bench, in this order: Freezing and melting; What dissolving does; Molality; Reading the graph; Straining and weighing. The other four can wait until the notebook sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the five say what the cup shows and how each reading and each weighing is taken.",
      ),
      paragraph(
        { label: 'One temperature', terms: ['freezing point'] },
        "Water freezes and ice melts at one temperature, the freezing point. There, ice and water stay together, neither gaining on the other. So a stirred cup of ice and water sits at water's freezing point, 0 °C, however much ice is in it.",
        [
          [FALL, EXPLAINED, 'liquid and solid of a substance are in balance at one temperature, which is its freezing point.'],
          [THERMOMETER, CALIBRATION, 'ice and water stirred together are a fixed point that a thermometer is checked against.'],
        ],
      ),
      paragraph(
        { label: 'This probe', labRules: ['In this lab the probe is off by the same amount at every temperature.'] },
        'A probe may read a little high or low. Part 1 finds what this one reads in ice and water. In this lab the probe is off by the same amount at every temperature. Every result after that is the difference of two readings of the one probe, so what it is off by drops out.',
        [[THERMOMETER, CALIBRATION, 'what a thermometer reads at a fixed point is set against the scale, and the difference is noted.']],
        'that the probe is off by one amount throughout is the model, and simpler than a real probe.',
      ),
    ],
  },
  {
    id: 'dissolving',
    heading: 'What dissolving does',
    paragraphs: [
      paragraph(
        { label: 'A lower freezing point', terms: ['solute'] },
        'Dissolve something in water and the mixture freezes at a lower temperature. What is dissolved is the solute. It thins out the water, so ice and solution come into balance only when it is colder.',
        [[FALL, EXPLAINED, 'a solute thins out the solvent, so that freezing and melting come into balance again at a lower temperature.']],
      ),
      paragraph(
        { label: 'Counting particles' },
        'How far the freezing point falls depends on how many dissolved particles there are for each kilogram of water, not on what they are. So the fall counts particles. That is what this lab uses it for.',
        [[FALL, FORMULA, 'for a solution taken as ideal the fall depends only on how much is dissolved, as particles for each kilogram of solvent.']],
      ),
      paragraph(
        { label: 'In the cup' },
        'Stir a solute into ice and water and some ice melts, the temperature falls, and it levels off at the freezing point of whatever solution is then in the cup.',
        [],
        'what the cup does when the solute goes in is the model of the cup, which the record gives with its parameters.',
      ),
    ],
  },
  {
    id: 'molality',
    heading: 'Molality',
    paragraphs: [
      paragraph(
        { label: 'Moles for each kilogram', terms: ['molality'] },
        "A solution's molality is the moles of solute for each kilogram of water: moles divided by kilograms, in mol/kg. So 0.0500 mol in 0.125 kg of water is 0.400 mol/kg.",
        [[FALL, FORMULA, 'molality is the moles of solute for each kilogram of solvent.']],
        'the example is no amount of this bench.',
        'molality = moles of solute ÷ kilograms of water',
      ),
      paragraph(
        { label: 'Why the water' },
        "It is counted for the water alone, not for the whole solution, because the fall follows the particles for each kilogram of water. So the mass to find is the water's: the mass of the solution less the mass of the solute.",
        [[FALL, FORMULA, 'the relation is written with the mass of the solvent, not of the solution.']],
        'that the water is found by taking the mass of the solute from that of the solution is how this bench weighs.',
      ),
    ],
  },
  {
    id: 'constant',
    heading: 'The freezing point constant',
    paragraphs: [
      paragraph(
        { label: 'For water', terms: ['freezing point constant'] },
        'For each mole of dissolved particles in a kilogram of water, the freezing point falls by 1.86 °C. That figure is the freezing point constant of water. Other liquids have constants of their own.',
        [[FALL, FORMULA, "the constant of water is 1.86 K·kg/mol, in a table that gives other solvents other figures, and that it belongs to the solvent and not to what is dissolved."]],
        'a kelvin and a degree Celsius are steps of one size, so the figure is written here in °C·kg/mol.',
      ),
      paragraph(
        { label: 'The relation' },
        'So the fall is the constant times the molality times the particles each formula unit gives. It holds best when little is dissolved. This lab uses it as it stands.',
        [[FALL, FORMULA, 'the fall is the constant times the molality times the count of particles for each formula unit, for a solution taken as ideal, and that the relation is good only for a dilute solution.']],
        'that the relation is used at every strength of the bench is the model.',
        'fall = 1.86 °C·kg/mol × molality × particles for each formula unit',
      ),
    ],
  },
  {
    id: 'molar-mass',
    heading: 'From a fall to a molar mass',
    paragraphs: [
      paragraph(
        { label: 'Three steps' },
        'Take a solute that gives one particle for each molecule. The fall divided by 1.86 is the molality. The molality times the kilograms of water is the moles of solute. The grams of solute divided by those moles is its molar mass, in g/mol.',
        [[FALL, 'the article on the lowering of the freezing point, its section on uses', "the fall can be used to find a solute's molar mass, where the particles each formula unit gives are known."]],
      ),
      paragraph(
        { label: 'Worked example' },
        'Say 6.00 g of a liquid in 0.0800 kg of water lowers the freezing point by 2.79 °C. Molality: 2.79 ÷ 1.86 = 1.50 mol/kg. Moles: 1.50 × 0.0800 = 0.120 mol. Molar mass: 6.00 ÷ 0.120 = 50.0 g/mol.',
        [],
        "the example's numbers are no run's: no mass and no fall of it is one the bench can give, and its molar mass is no row of the table.",
      ),
      paragraph(
        { label: 'Rounding', labRules: ['In this lab each worked-out number is entered to three significant figures.'] },
        'In this lab each worked-out number is entered to three significant figures. Work the next step from the number you entered or from the unrounded one in your calculator: both are taken.',
        [],
        "the rounding rule is the notebook's own, the same as the calorimetry lab's.",
      ),
    ],
  },
  {
    id: 'particles',
    heading: 'Salts, ions and the count of particles',
    paragraphs: [
      paragraph(
        { label: 'Molecules and ions', terms: ['ions'] },
        'Urea is made of molecules, and each stays whole in water: one particle for each formula unit. A salt such as sodium chloride comes apart into ions, a sodium ion and a chloride ion: two particles for each formula unit.',
        [
          [FACTOR, OPENING, 'for most things that are not electrolytes the count is very nearly one in water, and for most ionic compounds it is the number of ions in a formula unit.'],
          [FALL, FORMULA, 'the count for sodium chloride is two.'],
        ],
        "that urea is such a molecule is the lab's reading: the article names no urea.",
      ),
      paragraph(
        { label: 'The ratio' },
        'Work out the fall the molality would give if each formula unit were one particle. Divide the fall you found by it. The ratio is the count of particles each formula unit gave: near 1 for urea, near 2 for a salt.',
        [[FACTOR, OPENING, 'the factor sets the particles a dissolved substance gives against the count its formula alone would give.']],
      ),
      paragraph(
        { label: 'Worked example' },
        'Say 14.0 g of a salt of molar mass 160.0 g/mol in 0.125 kg of water gives a fall of 2.47 °C. Moles: 14.0 ÷ 160.0 = 0.0875 mol. Molality: 0.0875 ÷ 0.125 = 0.700 mol/kg. One particle each would give 1.86 × 0.700 = 1.30 °C. Ratio: 2.47 ÷ 1.30 = 1.90.',
        [],
        "the example's numbers are no run's: no mass and no fall of it is one the bench can give, and its molar mass is no row of the table.",
      ),
      paragraph(
        { label: 'A little under two' },
        'A real salt gives a little under two. At any moment a few of its ions are paired, and a pair counts as one particle.',
        [[FACTOR, OPENING, 'some ions are paired at any moment and count as one particle, so that a measured factor is under the ideal one.']],
      ),
    ],
  },
  {
    id: 'graph',
    heading: 'Reading the graph',
    paragraphs: [
      paragraph(
        { label: 'Two level stretches' },
        'The logger plots a reading every 30 seconds. With ice and water stirred, the curve falls and levels off. When the solute goes in it falls again and levels off lower. The two level stretches are what you want.',
        [],
        'how often the logger reads and how the curve runs are the model of the cup.',
      ),
      paragraph(
        { label: 'Which readings' },
        'The first temperature is the level reading just before the solute went in. The second is the last reading before you strain. Wait for three readings running that are the same. A reading taken while the curve is still moving is not a freezing point.',
        [],
        'which reading each temperature is, and that three readings alike mark a level stretch, are the rules of this notebook and of this model.',
      ),
      paragraph(
        { label: 'Lid and stirrer' },
        'Stir, or the cup does not settle. Keep the lid on, or the ice melts fast: the solution keeps thinning and its freezing point keeps creeping up. If all the ice melts, the temperature climbs and no reading is a freezing point.',
        [[FALL, EXPLAINED, 'a freezing point is where liquid and solid are in balance, which takes both.']],
        'what the lid and the stirrer do to the curve is the model of the cup.',
      ),
    ],
  },
  {
    id: 'straining',
    heading: 'Straining and weighing',
    paragraphs: [
      paragraph(
        { label: 'Why strain' },
        'The molality needs the mass of water that was in the solution when you read its temperature. Ice is not part of the solution. So the cup is poured through a strainer, which holds back the ice, and the liquid alone is weighed.',
        [],
        'the strainer and the second cup are how this bench finds the water, and the model takes the strainer to hold back all of the ice and none of the liquid.',
      ),
      paragraph(
        { label: 'The water' },
        "The balance shows the solution: water and solute together. Take the solute's mass from it for the water, and write it in kilograms with every figure. So 82.46 g less 7.10 g is 75.36 g, which is 0.07536 kg.",
        [],
        "the example's masses are none the bench can give.",
      ),
      paragraph(
        { label: 'Not straining' },
        'Weigh the cup without straining it and the ice is counted as water. Every number worked from that mass is then wrong.',
        [],
        'what an unstrained cup weighs is the model.',
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'A simulation' },
        "This lab is a simulation: nothing here can hurt you, and it does not take the place of safety training. At a real bench, wear eye protection, gloves and protective clothing, and follow your laboratory's own rules.",
        [
          [sheet('7'), "the sheet's section 8 (exposure controls, personal protection)", 'eye protection, gloves and protective clothing are worn with the liquid.'],
          [sheet('721'), "the sheet's section 8 (exposure controls, personal protection)", 'eye protection, gloves and protective clothing are worn with the salt.'],
        ],
        'that the lab is a simulation and trains nobody is what this project says of itself.',
      ),
      paragraph(
        { label: 'The unknown' },
        'Until the unknown is named, treat it as each of the three liquids it may be: each has a tile on the bench. All three burn readily, so they are kept from flames, sparks and hot surfaces, and used where the air is changed.',
        [
          [sheet('7'), HAZARDS, 'acetone is a highly flammable liquid, kept away from whatever could light it.'],
          [sheet('326'), HAZARDS, 'the denatured alcohol is a highly flammable liquid, kept away from whatever could light it.'],
          [sheet('420'), HAZARDS, 'isopropyl alcohol is a highly flammable liquid, kept away from whatever could light it.'],
        ],
        'that every tile is shown until the unknown is named is how the bench keeps from saying which it is.',
      ),
      paragraph(
        { label: 'The solids' },
        'Urea and the three salts are laboratory chemicals, not for tasting. The tile of urea carries no hazard statement; sodium bromide can irritate the eyes.',
        [
          [sheet('840'), HAZARDS, 'the sheet for urea lists no hazard statement.'],
          [sheet('714'), HAZARDS, 'sodium bromide irritates the eyes.'],
          [sheet('721'), HAZARDS, 'sodium chloride kept as a laboratory chemical is not for eating.'],
        ],
      ),
      paragraph(
        { label: 'Disposal' },
        "How anything is disposed of is decided by the laboratory's own rules and by local regulations. Ask the laboratory's supervisor.",
        [],
        'no method of disposal is given: the sheets read each point to the rules that apply where the work is done.',
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first paragraph names them. */
export const READ_FIRST = readFirstOf(FREEZING_PRIMER)
