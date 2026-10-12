import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The red cabbage pH lab's concept primer (spec 21.5): seven short cards for a reader who has not met pH before,
// shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their support lines
// to that: none repeats six words running of a page it rests on. Each paragraph says what it rests on in
// `support`, one line for each passage: either a passage of a source, given where it is and, in this project's
// words, what it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its rules, its
// model) and is read in no source. The sources are listed in docs/research/cabbage/sources/MANIFEST.json, and the
// documents of the last card in the lab's hazard manifest; all reach sources.json through `npm run build:data`.
//
// The primer is not kept back in either mode. It names the colours the dye shows at the two ends and in the middle
// of the scale, which the rack shows anyway, and it says that bleach takes the colour out, which spec 21.5 asks it
// to. It gives no household thing's pH but two juices', as an example of what a unit means.

const SUPPLIER = 'flinn-pub-91633'
const FOODS = 'libretexts-indicators-in-foods'
const SCALE = 'libretexts-ph-scale'
const TABLE = 'fda-ph-foods-2007'
const BUFFERS = 'chemguide-buffers'
const PROBE = 'libretexts-labquest-ph-sensor'

const SECTION_2 = "the sheet's section 2 (hazards identification)"

export const CABBAGE_PRIMER: readonly PrimerSection[] = [
  {
    id: 'acids-and-bases',
    heading: 'Acids and bases at home',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has seven cards. Read four of them before you go to the bench, in this order: Acids and bases at home; The pH scale; Indicators; Safety. The other three can wait until the bench sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what an acid and a base are, what the number called pH means, how a dye can show it, and what a real bench of this lab holds.",
      ),
      paragraph(
        { label: 'Two families', terms: ['acid', 'base'] },
        'Water always holds a few hydrogen ions and a few hydroxide ions. An acid is a thing that leaves water with more hydrogen ions than hydroxide ions. A base does the opposite. Kitchens and bathrooms are full of both: lemon juice and vinegar are acids, and household ammonia and drain cleaner are bases.',
        [
          [SCALE, 'under the headings on the self-ionisation of water and on reading a pH quickly', 'water forms hydrogen ions and hydroxide ions by itself, and that an acidic liquid has more of the first than of the second and a basic liquid the reverse.'],
          [SUPPLIER, 'among the tips on its second page', 'lemon juice and vinegar test as acids with this indicator, and household ammonia and drain cleaner as strong bases.'],
        ],
      ),
      paragraph(
        { label: 'In between', terms: ['neutral'] },
        'A liquid with as many hydrogen ions as hydroxide ions is neither an acid nor a base. It is called neutral. Pure water is neutral.',
        [[SCALE, 'under the same two headings', 'pure water holds the two ions in equal amounts, and that a liquid in which they are equal is neutral.']],
      ),
    ],
  },
  {
    id: 'ph-scale',
    heading: 'The pH scale',
    paragraphs: [
      paragraph(
        { label: 'One number', terms: ['pH'] },
        'pH is a number that says how much hydrogen ion a liquid holds. A neutral liquid is at 7. Acids are below 7 and bases above it. The lower the number, the more hydrogen ion. The scale of this bench runs from 1 to 13.',
        [[SCALE, 'under the heading on reading a pH quickly', 'a liquid at pH 7 is neutral, one below 7 acidic and one above 7 basic, and that pH is a measure of the hydrogen ion in a liquid.']],
        'that the scale of this bench runs from 1 to 13 is its set-up: thirteen buffers (spec 21.1).',
      ),
      paragraph(
        { label: 'Ten times a step' },
        'The scale counts in tens. A liquid one unit lower holds ten times the hydrogen ion. Two units lower is a hundred times, and three units a thousand. Lemon juice is one to two units below apple juice, so it holds ten to a hundred times the hydrogen ion.',
        [
          [SCALE, 'under the heading on the pH scale', 'the scale is logarithmic, so that each whole step is a change of ten times in the hydrogen ion and two steps a change of a hundred times.'],
          [TABLE, 'in its table, the rows for lemon juice and for the juice of apples', 'lemon juice lies from 2.00 to 2.60 and apple juice from 3.35 to 4.00.'],
        ],
        "that the two juices are one to two units apart is this lab's rounding of the table's ranges: the nearest the two can be is 0.75 of a unit, and the farthest 2.00.",
      ),
    ],
  },
  {
    id: 'indicators',
    heading: 'Indicators',
    paragraphs: [
      paragraph(
        { label: 'A dye that tells', terms: ['indicator'] },
        'An indicator is a dye whose colour depends on the pH of the liquid it is in. Most indicators have two colours, one in acid and one in base. A few drops in a liquid show roughly where the liquid sits on the scale.',
        [[FOODS, 'in the opening part of the page, on what an indicator is', 'an indicator is a compound with an acid form and a base form that differ in colour, so that its colour tells which form the liquid has made of it.']],
      ),
      paragraph(
        { label: 'Why so many colours' },
        'The juice of red cabbage shows many colours: reds and pinks in acid, purple and blue near neutral, green and yellow in base. Its main dyes are red in acid and blue in base. It also holds dyes that have no colour in acid and are yellow in base. Blue and yellow together look green.',
        [
          [SUPPLIER, 'in the discussion on its third page, with the strip of colours under it', 'red cabbage indicator is reddish pink in acid, blue to violet when neutral and green to yellow in base.'],
          [FOODS, 'in the paragraph on extracts of food, after its first table', 'red cabbage holds two groups of dyes, one red in acid and blue in base and one without colour in acid and yellow in base, and that the raw extract shows the two together, green in base.'],
        ],
      ),
      paragraph(
        { label: 'To about a unit', labRules: ['In this lab an estimate by eye counts when it is within one unit of the meter.'] },
        'By eye, you match a sample to the tube of the scale it looks most like. That places it to about one unit, and no finer. In this lab an estimate by eye counts when it is within one unit of the meter.',
        [],
        "that an estimate is a match to the nearest tube and counts within one unit is this lab's rule (spec 21.2).",
      ),
    ],
  },
  {
    id: 'buffers',
    heading: 'Buffers and the scale',
    paragraphs: [
      paragraph(
        { label: 'Holding a pH', terms: ['buffer'] },
        'A buffer is a solution that holds its pH. Add a small amount of acid or of base to it, and its pH hardly moves.',
        [[BUFFERS, "at the head of the page, where it says what a buffer solution is", 'the pH of a buffer changes very little when a small quantity of an acid or of an alkali is added to it.']],
      ),
      paragraph(
        { label: 'Thirteen known tubes', labRules: ['In this lab each buffer is taken to be exactly at the pH on its label.'] },
        'The scale is thirteen buffers, from pH 1 to pH 13. A few drops of indicator are a small addition, so each tube keeps its pH and shows the colour the dye has there. In this lab each buffer is taken to be exactly at the pH on its label.',
        [[BUFFERS, 'at the head of the page', 'a buffer keeps its pH against a small addition.']],
        "that the drops of indicator count as such a small addition is this lab's reading of that, and that each buffer is exactly at its label is its model (spec 21.3).",
      ),
    ],
  },
  {
    id: 'meter',
    heading: 'The meter and its probe',
    paragraphs: [
      paragraph(
        { label: 'A number' },
        'A pH meter reads the pH from a probe dipped in the liquid. Here it reads to a tenth of a unit. A real probe drifts with time, so it is set against buffers of known pH before it is used.',
        [[PROBE, 'in its part B, on the pH sensor', 'a pH probe drifts over time and is calibrated in two buffers of known pH before use.']],
        "that the meter reads to a tenth of a unit, and needs no setting here, is this lab's set-up (spec 21.2).",
      ),
      paragraph(
        { label: 'Rinse every time', labRules: ['In this lab a probe that is not rinsed reads part of the way toward the last sample, and that reading does not count.'] },
        'The probe is rinsed with distilled water before it goes into each new liquid, so that it brings nothing with it. In this lab a probe that is not rinsed reads part of the way toward the last sample, and that reading does not count.',
        [
          [PROBE, 'in the steps of the calibration in its part B', 'the probe is rinsed with distilled water before it goes into each buffer.'],
          [SUPPLIER, 'in the steps of its procedure on the second page', 'a stirrer is rinsed in distilled water between one household thing and the next.'],
        ],
        "what an unrinsed probe reads is this lab's model, with no source: a stated share of the way toward the last sample (docs/research/cabbage/README.md).",
      ),
    ],
  },
  {
    id: 'bleach',
    heading: 'When an indicator fails',
    paragraphs: [
      paragraph(
        { label: 'No colour left' },
        'Bleach takes the colour out of red cabbage indicator: the liquid goes colourless. Bleach is a base, but the dye is no longer there to show it.',
        [[SUPPLIER, 'in the starred note under the table of household things on its second page', 'bleach is basic and soon turns the indicator colourless, which makes that easy to miss.']],
      ),
      paragraph(
        { label: 'What to answer' },
        'With no colour there is nothing to match against the scale. The right answer by eye is that the indicator cannot say. The meter does not use the dye, and still reads.',
        [[SUPPLIER, 'among the tips on its second page', 'a pH probe can be used beside the indicator to put a number to what is seen.']],
        "that the right answer by eye for bleach is that the indicator cannot say is this lab's rule (spec 21.2).",
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'Nothing is tasted' },
        'Everything on a laboratory bench is a laboratory chemical, the juices and the tablets included. Nothing is tasted, and no food leaves the laboratory to be eaten.',
        [[SUPPLIER, 'in the safety precautions on its first page', 'food brought into a laboratory counts as a laboratory chemical, is not tasted and is not taken away afterwards.']],
      ),
      paragraph(
        { label: 'The strong ends' },
        'Things at the two ends of the scale harm skin and eyes. By their safety data sheets the pH 1 buffer, the pH 13 buffer, the ammonia, the bleach and the drain cleaner are made from things that burn. Eye protection, gloves and protective clothing are worn.',
        [
          ['flinn-sds-395', SECTION_2, 'concentrated hydrochloric acid burns the skin and damages the eyes.'],
          ['flinn-sds-734', SECTION_2, 'sodium hydroxide burns the skin and damages the eyes.'],
          ['flinn-sds-58', SECTION_2, 'ammonia solution of 1.1 M and over burns the skin and damages the eyes.'],
          ['flinn-sds-736', "the sheet's sections 2 and 8", 'sodium hypochlorite solution burns the skin and damages the eyes, and that eye protection, gloves and protective clothing are worn with it.'],
        ],
        'that each bottle carries the statements of the strongest form it is made from is the rule of every lab here (spec 5.2); the weak solutions on the bench are milder, as each bottle’s note says.',
      ),
      paragraph(
        { label: 'Never mixed' },
        "Bleach is kept away from every acid on the bench: together they give off chlorine, a toxic gas. It is kept away from ammonia too. No two samples are poured together. How anything is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [
          ['noaa-cameo-4503', 'the field Reactivity Profile', 'a hypochlorite in contact with an acid gives off highly toxic fumes of chlorine.'],
          ['flinn-sds-46', "the sheet's section 10 (stability and reactivity)", 'household ammonia is kept from compounds that hold chlorine.'],
        ],
        "that disposal is decided by the laboratory's own rules and local regulations, and that the supervisor is asked, is the project's rule for every lab (spec 5.2): no method of disposal is given.",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first paragraph names them. */
export const READ_FIRST = readFirstOf(CABBAGE_PRIMER)
