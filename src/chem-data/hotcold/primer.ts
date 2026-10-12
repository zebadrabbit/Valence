import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The endothermic and exothermic lab's concept primer (spec 26.4): six short cards for a reader in an
// introductory course, shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards
// and their support lines to that: none repeats six words running of a page it rests on. Each paragraph says what
// it rests on in `support`, one line for each passage: either a passage of a source, given where it is and, in
// this project's words, what it establishes, or a line beginning "This lab:" for what is the lab's own (its
// set-up, its rules, its model) and is read in no source. The sources are listed in
// docs/research/hotcold/sources/MANIFEST.json, and the documents of the last card in the lab's hazard manifest;
// all reach sources.json through `npm run build:data`.
//
// The primer is not kept back in either mode, so it teaches the two words and says of neither salt of the bench
// which way its temperature goes: a test holds every card to that. The safety card names the two salts for their
// hazards alone.

const TEMPERATURE = 'purdue-temperature'
const HEAT = 'purdue-heat'
const CUP = 'purdue-calorimetry'
const TRANSFER = 'nasa-heat-transfer'
const ENERGETICS = 'chemguide-energetics-introduction'
const SALT = 'davidson-heat-of-solution'
const GRAPH = 'docbrown-calorimeter-methods'
const COLD_PACK = 'wikipedia-ice-pack'
const HOT_PACK = 'wikipedia-heating-pad'
const EPSOM_SHEET = 'flinn-sds-480'
const EPSOM_SECOND = 'fisher-sds-mgso4-heptahydrate'
const CALCIUM_SHEET = 'flinn-sds-196'
const CALCIUM_RECORD = 'noaa-cameo-8382'

const IN_SOLUTION = 'the page Calorimetry, its first paragraph'
const GRAPHS = 'the page on experimental methods, the note on graphical analysis in its section on the foam cup calorimeter'
const PROTECTION = "the sheet's section 8 (exposure controls, personal protection)"

export const HOTCOLD_PRIMER: readonly PrimerSection[] = [
  {
    id: 'heat',
    heading: 'Temperature and heat',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        "This primer has six cards. Read four of them before you go to the bench, in this order: Temperature and heat; Giving heat out and taking heat in; Reading the graph; Safety. The other two are for the notebook's fifth entry and for part 3.",
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four give what is measured, the two words the notebook asks for, how the logger's picture is read, and what a real bench of this lab holds. Of the other two, the card on where the heat goes is what the notebook's fifth entry asks, and the card on packs is part 3's; the bench itself sends a learner to neither.",
      ),
      paragraph(
        { label: 'Temperature', terms: ['temperature'] },
        'The temperature of a thing says how hot or how cold it is. Here it is measured in degrees Celsius, written °C, by a probe that sits in the water.',
        [[TEMPERATURE, 'the page Temperature, all of it', 'temperature is a measure of how cold or hot an object is, and that the Celsius scale is one of the scales it is read on.']],
        "that a probe in the water reads it is this lab's set-up (spec 26.1).",
      ),
      paragraph(
        { label: 'Heat', terms: ['heat'] },
        'Heat is energy on the move. Put a hot thing against a cold one and heat passes from the hot one to the cold one, until the two are at one temperature. Water that gains heat gets warmer, and water that loses heat gets colder.',
        [
          [HEAT, 'the page Heat, under its first heading', 'heat is a way of passing energy between a system and what is around it, one that often leaves the system at another temperature.'],
          [TRANSFER, 'the page Heat Transfer, its paragraph on two objects at different temperatures', 'two objects at different temperatures that are put in contact come to one temperature, with heat passing between them on the way.'],
          [CUP, IN_SOLUTION, 'a solution that takes in the heat of a change gets warmer, and one that heat is taken from gets colder.'],
        ],
      ),
    ],
  },
  {
    id: 'change',
    heading: 'Giving heat out and taking heat in',
    paragraphs: [
      paragraph(
        { label: 'Two kinds of change', terms: ['exothermic', 'endothermic'] },
        'Some changes give heat out as they go. Burning is one. A change that gives heat out is called exothermic. Other changes take heat in, and a change that takes heat in is called endothermic.',
        [[ENERGETICS, 'the page An Introduction to Chemical Energetics, under its first two headings', 'a reaction that gives heat off is called exothermic and one that takes heat in is called endothermic, with the burning of a fuel as a change of the first kind.']],
      ),
      paragraph(
        { label: 'Dissolving' },
        'Dissolving a solid in water is a change too, and it can go either way: some solids give heat out as they dissolve, and some take heat in. Looking at a solid does not tell you which. You find out by dissolving it and watching the temperature.',
        [[SALT, 'the page on the heat of solution of ammonium nitrate, its opening paragraphs', 'the heat of a solid dissolving may be of either kind, endothermic or exothermic, according to the compound.']],
        'that the two salts of this bench look alike, both white solids, and are told apart by the temperature alone is its set-up (spec 26.1).',
      ),
    ],
  },
  {
    id: 'where',
    heading: 'Where the heat goes',
    paragraphs: [
      paragraph(
        { label: 'Into the water' },
        'The salt dissolves in water, and the probe sits in that water. If the dissolving gives heat out, the water takes that heat in and gets warmer. If the dissolving takes heat in, it takes it from the water, and the water gets colder.',
        [
          [CUP, IN_SOLUTION, 'the heat of a change that gives heat out raises the temperature of the solution it happens in, and that a change that takes heat in takes it from the solution and lowers its temperature.'],
          [SALT, 'the page on the heat of solution of ammonium nitrate, its opening paragraphs', 'a solid that needs heat to dissolve draws that heat from the solution it is dissolving in.'],
        ],
      ),
      paragraph(
        { label: 'What the logger tells you' },
        "So the water's temperature says which kind of change you had. A rise means the dissolving gave heat out: exothermic. A fall means the dissolving took heat in: endothermic.",
        [[CUP, IN_SOLUTION, 'a rise in the temperature of the solution goes with a change that gives heat out, and a fall with one that takes heat in.']],
      ),
      paragraph(
        { label: 'Easy to mix up' },
        'It is easy to get this the wrong way round. A cup that has turned cold has not given heat out. Its water is cold because the dissolving took heat from it.',
        [[ENERGETICS, 'the page An Introduction to Chemical Energetics, under its heading on simple energy diagrams', 'a change that takes heat in takes it from what is around it.']],
        "that this is the slip to watch for is this lab's advice.",
      ),
    ],
  },
  {
    id: 'graph',
    heading: 'Reading the graph',
    paragraphs: [
      paragraph(
        { label: 'Before the salt' },
        "The logger takes the water's temperature every 15 seconds and draws each reading as a point: temperature up the side, time along the bottom. Before the salt goes in, the points lie level. That level is the starting temperature.",
        [[GRAPH, GRAPHS, 'readings are taken before and after the mixing and plotted against time, and that the early ones give a level line to measure the change from.']],
        "a reading every 15 seconds is this lab's set-up (spec 26.1).",
      ),
      paragraph(
        { label: 'After the salt' },
        'When the salt goes in, the points climb or drop to a highest or a lowest point, then drift slowly back as the cup trades heat with the room. The notebook asks for that point.',
        [[GRAPH, GRAPHS, 'a cup that has warmed goes on losing heat and one that has cooled goes on gaining it, so that the temperature drifts back once the change is over.']],
        "that the notebook takes the highest or the lowest reading is this lab's rule (spec 26.2).",
      ),
      paragraph(
        { label: 'Looking at a point', labRules: ['In this lab a point says its time and its temperature when you look at it: point at it, tap it, or move to it with the arrow keys.'] },
        'In this lab a point says its time and its temperature when you look at it: point at it, tap it, or move to it with the arrow keys.',
        [],
        "how a reading is looked at is this page's own (spec 26.2), and a test holds the sentence to the page.",
      ),
      paragraph(
        { label: 'Lid and stirrer', labRules: ['In this lab a run counts only if the lid is on and the stirrer is going from the moment the salt goes in.'] },
        'In this lab a run counts only if the lid is on and the stirrer is going from the moment the salt goes in. So put both to work first.',
        [],
        "what makes a run count is this lab's rule (spec 26.2), and a test holds the sentence to the engine.",
      ),
    ],
  },
  {
    id: 'packs',
    heading: 'Hot packs and cold packs',
    paragraphs: [
      paragraph(
        { label: 'A cold pack' },
        'An instant cold pack holds a bag of water inside a bag of dry solid. Squeeze it and the inner bag breaks. The solid dissolves in the water, the dissolving takes heat in, and the pack turns cold.',
        [[COLD_PACK, 'the page Ice pack, under the heading on instant cold packs', 'an instant cold pack is used once and is made of two bags, one of water inside one that holds a solid, and that a squeeze breaks the inner bag so that the solid dissolves in a change that takes heat in and cools the pack.']],
      ),
      paragraph(
        { label: 'A hot pack' },
        'Some instant hot packs work the same way with another solid. A squeeze breaks a wall inside the pack, the solid meets the water, and the dissolving gives heat out.',
        [[HOT_PACK, 'the page Heating pad, under the heading on chemical pads', 'one kind of throw-away pad keeps its parts in separate compartments until a squeeze breaks the barrier between them, and that the heat it then makes can be that of a solid dissolving.']],
      ),
      paragraph({ label: 'Your two salts' }, 'Part 3 asks which of the two salts on the bench would suit each kind of pack. Your two runs answer it.', [], "what part 3 asks, and that the two runs answer it, is this lab's own (spec 26.1)."),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'The two salts' },
        'Both salts are white solids. Calcium chloride is harmful if swallowed and seriously irritates the eyes. Epsom salt is classed as no hazard and is handled with the same care. Wear eye protection, gloves and protective clothing, raise no dust, and wash your hands after.',
        [
          [CALCIUM_SHEET, "the sheet's title and its section 2 (hazards identification)", 'solid calcium chloride is classed as harmful if swallowed and as a serious irritant of the eyes.'],
          [CALCIUM_SHEET, PROTECTION, 'eye protection, gloves and protective clothing are worn with it, and the hands washed after it is handled.'],
          [EPSOM_SHEET, "the sheet's section 2 (hazards identification) and its section 8", 'magnesium sulfate heptahydrate is counted as no hazard, is handled with caution as every laboratory chemical is, and is given the same eye protection, gloves and clothing.'],
          [EPSOM_SECOND, "the sheet's section 7 (handling and storage)", 'no dust of the salt is made or breathed.'],
          [CALCIUM_RECORD, 'the field Health Hazard', 'the dust of calcium chloride is what irritates the eyes most.'],
        ],
      ),
      paragraph(
        { label: 'In the eyes' },
        'If either salt gets in your eyes, rinse with water at once, keep rinsing for 15 minutes or more, and tell your supervisor.',
        [
          [EPSOM_SECOND, "the sheet's section 4 (first-aid measures)", 'eyes that the salt has got into are rinsed with a great deal of water for a quarter of an hour at the least.'],
          [CALCIUM_RECORD, 'the field First Aid', 'eyes that calcium chloride has got into are flooded with water promptly and washed for a quarter of an hour at the least, and an eye doctor is seen.'],
        ],
        "telling the supervisor is this lab's advice.",
      ),
      paragraph(
        { label: 'Only what is weighed out' },
        'Use only the portion weighed out, and only water at room temperature. A salt that gives heat out as it dissolves can make hot water boil up.',
        [[CALCIUM_RECORD, 'the field Air & Water Reactions', 'a salt whose dissolving gives out heat has made hot water boil violently when it was added to it.']],
        "that the water is at room temperature and the portion small is this lab's set-up (spec 26.1). The card names no salt here, since which salt gives heat out is what the bench is there to show.",
      ),
      paragraph(
        { label: 'Afterwards' },
        "How the solutions and any spilled salt are disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [],
        "that no method of disposal is given, and that the laboratory's rules and the supervisor decide it, is the project's rule for every lab (spec 5.2).",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first paragraph names them. */
export const READ_FIRST = readFirstOf(HOTCOLD_PRIMER)
