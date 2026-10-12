import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The measurement and density lab's concept primer (spec 22.5): eight cards for a reader in the first week of a
// first course, who has not met significant figures before, shown one at a time. Nothing here quotes a source, and
// quotation.test.ts holds the cards and their support lines to that: none repeats six words running of a page it
// rests on. Each paragraph says what it rests on in `support`, one line for each passage: either a passage of a
// source, given where it is and, in this project's words, what it establishes, or a line beginning "This lab:"
// for what is the lab's own (its set-up, its rules, its model) and is read in no source. The sources are listed in
// docs/research/density/sources/MANIFEST.json, and the documents of the last card in that folder's
// hazard-manifest.json; all reach sources.json through `npm run build:data`.
//
// Each rounding rule is worked once, on numbers that are no run's: no length, volume, mass or temperature of an
// example is one the bench can give, and no density of an example is a row of either table. A test holds every
// figure of the examples to the arithmetic. Which way a level read from above or below is off is the model's own,
// read in no source, so the primer says only that the reading is then wrong.

const FIGURES = 'purdue-significant-figures'
const ARTICLE = 'wikipedia-significant-figures'
const CYLINDER = 'wikipedia-graduated-cylinder'
const DENSITY = 'wikipedia-density'
const THERMOMETER = 'wikipedia-thermometer'
const CELSIUS = 'wikipedia-celsius'
const WATER = 'nist-webbook-water-20c'
const ETHANOL_TABLE = 'lange-ethanol-wikipedia'
const sheet = (number: string) => `flinn-sds-${number}`

// Places that more than one paragraph reads.
const COUNTING = 'the page on significant figures, under the heading on determining their number'
const ESTIMATING = 'the article on significant figures, under the heading on estimating an extra digit'
const MEASURING = "the article on the graduated cylinder, its section on measuring with it"
const OPENING = "the article on density, its opening paragraphs"
const HAZARDS = "the sheet's title and its section 2 (hazards identification)"
const PROTECTION = "the sheet's section 8 (exposure controls, personal protection)"

export const DENSITY_PRIMER: readonly PrimerSection[] = [
  {
    id: 'measurement',
    heading: 'What a measurement is',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        "This primer has eight cards. Read four of them before you go to the bench, in this order: What a measurement is; Reading a scale between its marks; Reading a liquid's level; Significant figures. The other four can wait until the notebook sends you to them.",
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what a reading is, how each scale is read, and what the figures of a reading mean.",
      ),
      paragraph(
        { label: 'Number and unit', terms: ['measurement'] },
        'A measurement is a number with a unit, read from an instrument: 8.4 cm, 9.6 mL, 7.30 g. No instrument gives the true value exactly. A ruler has marks only so close together, and a balance shows only so many figures.',
        [[FIGURES, 'the page on significant figures, its opening and the three balances under its first heading', 'a measurement is to be reported no more exactly than the equipment allows, and that a more sensitive instrument gives more figures.']],
        'the three examples are no reading of this bench.',
      ),
      paragraph(
        { label: 'The last figure', terms: ['estimate'], labRules: ['In this lab a reading counts when it is within two of its last figure of what the scale shows.'] },
        'So every reading ends in a figure that is an estimate. The figures before it are certain; the last is your best judgement, and two careful people may differ in it. A reading is written with every certain figure and that one estimated figure, no more and no fewer. In this lab a reading counts when it is within two of its last figure of what the scale shows.',
        [[FIGURES, COUNTING, 'the figures of a measurement are the digits known with confidence and one last digit that is an estimate.']],
        'how near a reading must be is a parameter of the model.',
      ),
    ],
  },
  {
    id: 'scale',
    heading: 'Reading a scale between its marks',
    paragraphs: [
      paragraph(
        { label: 'One figure more' },
        'Find the two marks the edge or the level stands between. The lower mark gives the certain figures. Then judge how far towards the next mark it stands, in tenths of the gap: that is the last figure. On a ruler marked each centimetre, an edge about a third of the way from 7 to 8 reads 7.3 cm.',
        [[ARTICLE, ESTIMATING, 'a scale can be read by eye to closer than its smallest mark, by judging tenths between the two nearest marks, which gives one more decimal place.']],
        'the example is no reading of this bench.',
      ),
      paragraph(
        { label: 'The four scales' },
        'The ruler marked in centimetres is read to a tenth of a centimetre, and the one marked in millimetres to a hundredth. The cylinder is marked each millilitre and read to a tenth. The thermometer is marked each degree and read to a tenth.',
        [[CYLINDER, MEASURING, 'a cylinder marked each millilitre is read to a tenth of a millilitre.']],
        'the four instruments and their marks are the set-up of the lab.',
      ),
      paragraph(
        { label: 'Zeros, and the balance' },
        'If it stands exactly on a mark, the last figure is a zero, and the zero is written: 7.0 cm, not 7. The balance needs no estimate. It shows its figures, and you copy every one, a final zero included: 7.30 g, not 7.3 g.',
        [[FIGURES, COUNTING, 'a zero at the end of a number, not needed to place the decimal point, is a figure of the measurement.']],
        'that the balance shows hundredths of a gram is the set-up of the lab.',
      ),
      paragraph(
        { label: 'The thermometer in ice' },
        'Ice and water stirred together stay at 0 °C. So a thermometer that reads 1.2 °C there is reading 1.2 °C high, and one that reads −0.9 °C is 0.9 °C low. That is how far it is off at that temperature.',
        [
          [THERMOMETER, 'the article on the thermometer, under the heading Calibration', 'a thermometer is checked against fixed points, of which ice and water stirred together is the first, and that a reading to a small fraction of a degree need not be a true one.'],
          [CELSIUS, 'the article on the Celsius scale, the table of key temperatures, the row for the melting point of ice', 'ice melts at 0 °C to within a thousandth of a degree.'],
        ],
        'the two examples are no reading of this bench.',
      ),
    ],
  },
  {
    id: 'level',
    heading: "Reading a liquid's level",
    paragraphs: [
      paragraph(
        { label: 'The curve', terms: ['meniscus'] },
        'In a glass cylinder the surface of water is not flat: it curves up where it meets the glass. The curve is called the meniscus. The level is the bottom of the curve: read there, not at the edges.',
        [[CYLINDER, MEASURING, 'the liquid is drawn to the wall, so its surface curves, and that the level is read at the bottom of that curve.']],
      ),
      paragraph(
        { label: 'Eye level', labRules: ['In this lab you stand at the bench, so your eye begins above the cylinder.', 'In this lab a level read from above or below does not count, and Guided warns you first.'] },
        'Bring your eye level with the bottom of the curve before you read. Seen from above or from below, the curve lines up with the wrong part of the scale, and the reading is wrong. In this lab you stand at the bench, so your eye begins above the cylinder. In this lab a level read from above or below does not count, and Guided warns you first.',
        [[CYLINDER, MEASURING, 'the eye has to be at the height of the liquid for the volume to be read rightly.']],
        'where the eye begins, how far a level seems to move, and that such a reading does not count are the model of the lab. Which way it seems to move was read in no source, and the card does not say.',
      ),
    ],
  },
  {
    id: 'figures',
    heading: 'Significant figures',
    paragraphs: [
      paragraph(
        { label: 'What they are', terms: ['significant figures'] },
        'The significant figures of a measurement are all its certain figures and the one estimated figure. 9.6 mL has two. 8.43 cm has three. 7.30 g has three: the balance showed that zero, so it counts.',
        [[FIGURES, COUNTING, 'the significant figures of a measurement are its known digits and the one estimated digit, and that a zero at the end, not needed to place the decimal point, counts.']],
      ),
      paragraph(
        { label: 'Which zeros count' },
        'Zeros between other figures count: 4.07 has three. Zeros at the end, behind a decimal point, count: 7.0 has two. Zeros in front only place the decimal point and do not count: 0.050 has two. Zeros that end a whole number, as in 1200, may only be holding places: written so, it is taken to have two.',
        [
          [FIGURES, COUNTING, 'zeros inside a number count, zeros that only set the decimal point do not, and zeros at the end that are not needed to set it do.'],
          [ARTICLE, 'the article on significant figures, under the heading on the rules for finding them in a number', 'zeros in front do not count, and that the zeros that end a whole number may or may not, which the number alone does not say.'],
        ],
      ),
      paragraph(
        { label: 'Why it matters' },
        'The figures say how finely a thing was measured. On a calculator 7 cm and 7.0 cm are the same number. As measurements they differ: the second was read to a tenth of a centimetre, and the first only to a whole one.',
        [[FIGURES, 'the page on significant figures, its opening and the three balances under its first heading', 'the number of figures reported says how exact the equipment was.']],
      ),
    ],
  },
  {
    id: 'rounding',
    heading: 'Rounding what is worked out',
    paragraphs: [
      paragraph(
        { label: 'Only what is measured' },
        'A calculator gives more figures than the measurements can stand behind. A worked-out number is rounded to what they allow, by one of two rules. To round, look at the first figure you drop: under 5, leave the figure before it alone; 5 or more, raise it by one.',
        [[FIGURES, 'the page on significant figures, under its headings on adding, on multiplying and on rounding off', 'an answer can be no more exact than the least exact measurement that went into it, and that a dropped digit of 5 or more adds one to the digit before.']],
      ),
      paragraph(
        { label: 'Adding and subtracting' },
        'A sum or a difference stops at the decimal place of its least exact term. 61.4 g − 52.37 g is 9.03 on a calculator. But 61.4 stops at tenths, so the answer is 9.0 g. Two readings from one instrument stop at the same place, and their difference stops there too.',
        [
          [FIGURES, 'the page on significant figures, under the heading on addition and subtraction', 'a sum or a difference keeps only the decimal places of the least exact of the measurements.'],
          [ARTICLE, 'the article on significant figures, under the heading on addition and subtraction', 'it is the place of the last figure that counts there, and not how many figures there are.'],
        ],
        'the example is no reading of this bench.',
      ),
      paragraph(
        { label: 'Multiplying and dividing' },
        'A product or a quotient gets as many significant figures as its factor with the fewest. 31.2 cm × 2.4 cm is 74.88 on a calculator. But 2.4 has two figures, so the area is 75 cm². In the same way 13.94 g ÷ 5.8 mL is 2.4034…, and the density is 2.4 g/mL.',
        [
          [FIGURES, 'the page on significant figures, under the heading on multiplication and division', 'a product or a quotient keeps only the significant figures of the least exact of the measurements.'],
          [ARTICLE, 'the article on significant figures, under the heading on multiplication and division', 'the result takes its count of significant figures from the measured number with the fewest.'],
        ],
        'the two examples are no readings of this bench, and 2.4 g/mL is no row of either table.',
      ),
      paragraph(
        { label: 'In the notebook', labRules: ['In this lab an entry with too many figures or too few is refused in Guided and marked in Challenge, with the rule it broke.'] },
        'Work each entry from the entries above it, as you typed them. In this lab an entry with too many figures or too few is refused in Guided and marked in Challenge, with the rule it broke.',
        [],
        'what an entry is worked from, and what is done with one that breaks a rule, are the rules of the notebook.',
      ),
    ],
  },
  {
    id: 'density',
    heading: 'Density',
    paragraphs: [
      paragraph(
        { label: 'Grams for each millilitre', terms: ['density'] },
        'The density of a thing is its mass divided by its volume: how many grams each millilitre of it weighs. Water at 20 °C is very close to 1 g/mL.',
        [
          [DENSITY, OPENING, 'density is the mass of a substance divided by its volume.'],
          [WATER, 'the table of the properties of water at 20 °C and ordinary pressure, the column for density', 'liquid water at 20 °C has a density of 0.99821 g/mL.'],
        ],
        undefined,
        'density = mass ÷ volume',
      ),
      paragraph(
        { label: 'Naming a substance' },
        'Density does not depend on how much there is: twice the liquid has twice the mass and twice the volume. And different substances mostly have different densities. So a density you measure can be set against a table, and the nearest figure there names the unknown.',
        [[DENSITY, OPENING, 'more of a substance has more mass and no more density, and that materials differ in density as a rule.']],
        'that the unknown is the row of the table nearest the measured density is the rule of the notebook.',
      ),
      paragraph(
        { label: 'Temperature and strength' },
        'A table gives each density for a temperature, since a liquid is a little less dense when it is warmer. For a solution the density also goes with the strength, and with whether a percentage is counted by mass or by volume. The tables of this lab say which.',
        [
          [DENSITY, OPENING, 'density changes with temperature, a little for solids and liquids, and that warming a substance lowers it as a rule.'],
          [ETHANOL_TABLE, 'the data page on ethanol, its table of the properties of solutions in water, the columns for mass fraction and for volume concentration', 'one solution has one percentage by mass and another by volume, and a density for each strength.'],
        ],
      ),
    ],
  },
  {
    id: 'displacement',
    heading: 'Volume by the water pushed aside',
    paragraphs: [
      paragraph(
        { label: 'An awkward shape' },
        "Pieces of metal have no length and width to measure. But a solid that sinks pushes aside its own volume of water. Read the water's level, put the pieces in, and read the level again: the rise is the volume of the pieces.",
        [[CYLINDER, "the article on the graduated cylinder, the paragraph on what it is used for", 'the volume of a solid can be found with a cylinder indirectly, from the liquid the solid moves aside.']],
      ),
      paragraph(
        { label: 'What spoils it', labRules: ['In this lab either one makes the run not count, and Guided warns you first.'] },
        'Weigh the pieces while they are dry: once they are wet, the balance weighs the water on them too. And tilt the cylinder and let the pieces slide down the glass: dropped in, they splash water out, and the rise reads low. In this lab either one makes the run not count, and Guided warns you first.',
        [],
        'the two errors of technique, what each does to the numbers, and that a run with either does not count are the model of the lab.',
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
          [sheet('326'), PROTECTION, 'eye protection, gloves and protective clothing are worn with the liquid.'],
          [sheet('265'), PROTECTION, 'eye protection, gloves and protective clothing are worn with the metal.'],
        ],
        'that the lab is a simulation and trains nobody is what this project says of itself.',
      ),
      paragraph(
        { label: 'The unknowns' },
        'Until an unknown is named, treat it as every one of the things it may be: each has a tile on the bench. One liquid may be ethanol, which burns readily, so it is kept from flames and sparks. The metals are solid pieces, not powder, and their tiles carry no hazard statement. Zinc is kept out of drains.',
        [
          [sheet('326'), HAZARDS, 'the denatured alcohol is a highly flammable liquid, kept from heat, sparks and open flames.'],
          [sheet('34'), HAZARDS, 'the sheet for aluminium lists no hazard statement.'],
          [sheet('859'), HAZARDS, 'the sheet for zinc as shot, sheet and foil lists no hazard statement.'],
          [sheet('265'), HAZARDS, 'the sheet for copper lists no hazard statement.'],
          ['fisher-sds-zinc-granular-mossy', "the sheet's section 12 (ecological information)", 'zinc is very toxic to water life.'],
        ],
        'that every tile is shown until an unknown is named is how the bench keeps from saying which it is.',
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
export const READ_FIRST = readFirstOf(DENSITY_PRIMER)
