import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The calorimetry lab's concept primer (spec 16.5): eight cards for a reader with no chemistry background, shown
// one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their support lines to
// that: none repeats six words running of a page it rests on. Each paragraph says what it rests on in `support`,
// one line for each passage: either a passage of a source, given where it is and, in this project's words, what
// it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its rules, its model)
// and is read in no source. The sources are listed in docs/research/calorimetry/sources/MANIFEST.json, and the
// documents of the last card in the hazard manifests of this lab and of the aqueous reactions lab; all reach
// sources.json through `npm run build:data`.
//
// Each kind of calculation is worked once, on numbers that are no run's: the volumes, the masses, the
// temperatures and the answers of the examples are none that the bench can give, and the metal of the last one
// is none of the four. A test holds every figure of the examples to the arithmetic.

const TEMPERATURE = 'purdue-temperature'
const HEAT = 'purdue-heat'
const SIGNS = 'purdue-calorimetry'
const TRANSFER = 'nasa-heat-transfer'
const ENERGETICS = 'chemguide-energetics-introduction'
const MEASURING = 'chemguide-measuring-enthalpy'
const SPECIFIC_HEAT = 'hyperphysics-specific-heat'
const MANUAL = 'ncsu-calorimetry-lab'
const METAL_BALL = 'davidson-specific-heat-copper'
const SALT = 'davidson-heat-of-solution'
const ACID_BASE = 'davidson-heat-of-neutralization'
const GRAPH = 'docbrown-calorimeter-methods'
const WATER = 'nist-webbook-water-25c'
const COMPOUNDS = 'pubchem-aqueous-reagents'
const sheet = (number: string) => `flinn-sds-${number}`

// Places that more than one paragraph reads.
const HEAT_CAPACITY = 'the page on the specific heat capacity of copper, under the heading Heat Capacity and in the table that follows it'
const CALORIMETER = 'the page on the specific heat capacity of copper, under the heading Calorimetry'
const MANUAL_INTRODUCTION = 'the laboratory manual page on calorimetry, its introduction'
const MANUAL_METAL = 'the laboratory manual page on calorimetry, its introduction and part B of its procedure'
const CUP = 'the page on simple measurements of enthalpy changes, under the heading Enthalpy changes involving solutions, the experiments'
const SUMS = 'the page on simple measurements of enthalpy changes, under the heading Enthalpy changes involving solutions, the calculations'
const GRAPHS = "the page on experimental methods, the note on graphical analysis in its section on the foam cup calorimeter"
const HAZARDS = "the sheet's title and its section 2 (hazards identification)"
const REACTIVITY = "the sheet's section 10 (stability and reactivity)"
const FIRE = "the sheet's section 5 (fire-fighting measures)"
const PROTECTION = "the sheet's section 8 (exposure controls, personal protection)"
const FIRST_AID = "the sheet's section 4 (first aid measures)"

export const CALORIMETRY_PRIMER: readonly PrimerSection[] = [
  {
    id: 'heat',
    heading: 'Temperature and heat',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has eight cards. Read four of them before you go to the bench, in this order: Temperature and heat; Specific heat; The calorimeter and what it assumes; Reading the graph. The other four can wait until the worksheet sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what is measured and what is worked out, how the one is turned into the other, what the cup is for, and how the logger's picture is read.",
      ),
      paragraph(
        { label: 'Temperature', terms: ['temperature'] },
        'The temperature of a thing says how hot or how cold it is. Here it is measured in degrees Celsius, written °C. It does not depend on how much of the thing there is: a cupful of water at 20 °C and a bathful at 20 °C are at the same temperature.',
        [[TEMPERATURE, 'the page Temperature, all of it', 'temperature is a measure of how cold or hot an object is, that the Celsius scale is one of the scales it is read on, and that a larger or a smaller sample of a thing is no hotter or colder for its size.']],
        "the cupful and the bathful are this card's own picture.",
      ),
      paragraph(
        { label: 'Heat', terms: ['heat', 'joule'] },
        'What moves when a hot thing warms a cold one is heat: energy on its way from the hotter thing to the colder. Its unit is the joule, written J; a thousand joules is a kilojoule, kJ. Put a hot thing against a cold one and heat passes from the hot one to the cold one, never the other way, until the two are at one temperature.',
        [
          [HEAT, 'the page Heat, under its first heading', 'heat is a way of passing energy between a system and what is around it, and that its unit is the joule.'],
          [TRANSFER, 'the page Heat Transfer, its paragraph on two objects at different temperatures', 'two objects at different temperatures that are put in contact come to one temperature, and that on the way heat goes from the hotter of the two to the colder.'],
          [METAL_BALL, HEAT_CAPACITY, 'heat is a transfer of energy that goes with a difference in temperature, counted in joules.'],
        ],
        'that a thousand joules is a kilojoule is what the name means; no source was read for it.',
      ),
      paragraph(
        { label: 'Not the same thing' },
        'The two are not the same thing. A bathful of warm water has far more heat to give up than a cupful at the same temperature, because there is more of it to cool. So a thermometer alone cannot say how much heat has moved. That takes three things together: how far the temperature changed, how much stuff changed with it, and what the stuff is. The card Specific heat puts the three together.',
        [
          [TRANSFER, 'the page Heat Transfer, its paragraph on two objects at different temperatures', 'how much heat passes goes with the difference in temperature and with a heat capacity that belongs to the object and is not the same for every material.'],
          [METAL_BALL, HEAT_CAPACITY, 'the heat that changes the temperature of a thing by one degree depends on how much of the thing there is: more for a kilogram of water than for a gram.'],
        ],
      ),
      paragraph(
        { label: 'What you measure', labRules: ['In this lab you never measure heat itself: you read temperatures from a logger, and you work the heat out.'] },
        'In this lab you never measure heat itself: you read temperatures from a logger, and you work the heat out. Every part of the lab is the same idea used three ways.',
        [],
        "what is read and what is worked out is this lab's own (spec 16.2).",
      ),
    ],
  },
  {
    id: 'sign',
    heading: 'Giving out heat and taking it in',
    paragraphs: [
      paragraph(
        { label: 'Two kinds of change', terms: ['exothermic', 'endothermic'] },
        'Some changes give out heat as they go. Burning is one. A change that gives out heat is called exothermic. Other changes take heat in, and a change that takes heat in is called endothermic.',
        [[ENERGETICS, 'the page An Introduction to Chemical Energetics, under its first two headings', 'a reaction that gives heat off is called exothermic and one that takes heat in is called endothermic, with the burning of a fuel as a change of the first kind.']],
      ),
      paragraph(
        { label: 'In the cup' },
        'In the cup the change happens in water, and the probe sits in that water. If the change gives out heat, the water takes the heat in and gets warmer. If the change takes heat in, it takes it from the water, and the water gets colder. So a rise on the logger means an exothermic change, and a fall means an endothermic one.',
        [
          [SIGNS, 'the page Calorimetry, its first paragraph', 'the heat of a reaction that gives heat out raises the temperature of the solution it happens in, and that a reaction that takes heat in lowers it.'],
          [SALT, 'the page on the heat of solution of ammonium nitrate, its opening paragraphs', 'a solid that needs heat to dissolve draws that heat from the solution it is dissolving in.'],
        ],
      ),
      paragraph(
        { label: 'The sign', terms: ['sign'] },
        "Chemists write the heat of a change from the side of the chemicals, not from the side of the water. A change that gave heat out has lost that energy, so its heat is written with a minus sign in front. A change that took heat in has gained it, and its heat is written with a plus sign. The sign is part of the answer: without it nobody can tell which way the heat went.",
        [
          [ENERGETICS, 'the page An Introduction to Chemical Energetics, under the heading on expressing the two kinds of change in numbers', 'a negative sign on the heat of a change shows that heat was given out, a plus sign that it was taken in, that the change is counted from the side of the reacting substances, and that a figure for it is always written with its sign.'],
          [SIGNS, 'the page Calorimetry, its note', 'when the solution takes heat in, the heat of the reaction is the negative one, and when heat is taken from the solution, the heat of the reaction is positive.'],
        ],
      ),
      paragraph(
        { label: 'On the worksheet', labRules: ['In this lab the last entry of parts 1 and 2 carries its sign: a minus for heat given out, and a plus or no sign for heat taken in.'] },
        'The worksheet asks which of the two kinds the change was, and then for the heat for each mole. In this lab the last entry of parts 1 and 2 carries its sign: a minus for heat given out, and a plus or no sign for heat taken in. The entries before it, the change in temperature and the heat of what is in the cup, are sizes, and a size needs no sign.',
        [],
        "which entries carry a sign is this lab's rule (spec 16.2), and a test holds the sentence to the engine.",
      ),
    ],
  },
  {
    id: 'specific-heat',
    heading: 'Specific heat',
    paragraphs: [
      paragraph(
        { label: 'What it is', terms: ['specific heat'] },
        "It takes more heat to warm some things than others. A substance's specific heat is the heat that one gram of it takes in to get one degree warmer. Its unit is joules for each gram and each degree, written J/(g·°C).",
        [
          [SPECIFIC_HEAT, 'the page Specific Heat, its first paragraph', 'the specific heat is the heat, for each unit of mass, that it takes to warm a thing by a degree on the Celsius scale.'],
          [MEASURING, SUMS, 'a specific heat is counted as the heat that warms a single gram by a single degree.'],
          [HEAT, 'the page Heat, under the heading Specific Heat', 'the specific heat is counted for one gram and one degree, in joules for each gram and each kelvin.'],
        ],
      ),
      paragraph(
        { label: 'Water' },
        "For water the figure is 4.18 J/(g·°C): a gram of water takes in 4.18 J as it warms by 1 °C, and gives the same 4.18 J out as it cools by 1 °C. That is a high figure. A gram of a metal takes far less.",
        [
          [WATER, 'the table of properties of water at 25 °C, the column for the heat capacity at constant pressure', 'a gram of liquid water takes 4.1813 J for each kelvin at 25 °C and ordinary pressure, which is 4.18 to three figures.'],
          [MEASURING, SUMS, "water's figure is 4.18 joules for each gram and each kelvin, and that a kelvin and a degree Celsius are steps of one size."],
          [SPECIFIC_HEAT, 'the page Specific Heat, its second paragraph', "water's specific heat is above that of every other common substance, and far above, gram for gram, a metal's."],
        ],
        'that a gram gives out as it cools what it took in as it warmed is the same relation read the other way; no source was read for it.',
      ),
      paragraph(
        { label: 'The relation' },
        'Heat is mass times specific heat times the change in temperature. With the mass in grams, the specific heat in J/(g·°C) and the change in °C, the heat comes out in joules.',
        [
          [SPECIFIC_HEAT, 'the page Specific Heat, the relation under its first paragraph', 'the heat added is the specific heat times the mass times the difference between the final and the first temperature.'],
          [MEASURING, SUMS, 'the heat given out or taken in is the mass times the specific heat times the change in temperature.'],
          [MANUAL, MANUAL_INTRODUCTION, 'the heat the water takes is its mass times its specific heat times its change in temperature.'],
        ],
        undefined,
        'heat = mass × specific heat × change in temperature',
      ),
      paragraph(
        { label: 'A worked example' },
        'Suppose 80.0 g of water warms from 21.3 °C to 24.8 °C. The change in temperature is 24.8 − 21.3 = 3.5 °C. The heat the water took in is 80.0 g × 4.18 J/(g·°C) × 3.5 °C = 1170.4 J, which is 1170 J to three significant figures.',
        [],
        "the example is the lab's own, on numbers no run has.",
      ),
      paragraph(
        { label: 'Rounding', terms: ['significant figures'], labRules: ['In this lab a temperature is typed to 0.1 °C, and every number you work out is typed to three significant figures, rounded and not cut off.'] },
        'The significant figures of a number are its digits that carry meaning, counted from the first that is not a zero: 1170 has three, since its last zero only holds the others in their places, and so have 58.5 and 0.0200. In this lab a temperature is typed to 0.1 °C, and every number you work out is typed to three significant figures, rounded and not cut off. That makes 1170.4 into 1170, and it would make 1176 into 1180, not 1170. You may work an entry from the rounded entries above it or from the unrounded numbers still on your calculator: the lab takes both.',
        [],
        "the convention is this lab's (spec 16.2), and the engine's tests hold it at its edges. What a significant figure is, is said here in the lab's own words; no source was read for it.",
      ),
    ],
  },
  {
    id: 'calorimeter',
    heading: 'The calorimeter and what it assumes',
    paragraphs: [
      paragraph(
        { label: 'The cup', terms: ['calorimeter'] },
        'A calorimeter is a container in which a change takes place and its heat is kept in, so that the heat shows as a change in temperature. This one is two foam cups, one inside the other, with a lid. Foam carries heat badly, so little gets through the walls. The lid has a hole for a stirrer and for a temperature probe.',
        [
          [METAL_BALL, CALORIMETER, 'a calorimeter is a device in which a reaction or a physical change takes place, built to insulate, so that in the ideal case heat neither enters it nor leaves it, with a thermometer to read the change in temperature.'],
          [MEASURING, CUP, 'a cup of expanded polystyrene insulates the mixture in it and slows the loss of heat through its side and its bottom, and that a lid with a hole for the thermometer cuts down the loss from the top.'],
          [GRAPH, 'the page on experimental methods, its section on the foam cup calorimeter', 'two such cups, one in the other, with an insulating lid and a hole for a thermometer or a probe, make the calorimeter for work of this kind.'],
        ],
        "that this lab's cup is two cups with a lid, a stirrer and a probe is its set-up (spec 16.1).",
      ),
      paragraph(
        { label: 'Lid and stirrer' },
        'The lid matters because the top of the liquid has no foam round it: with no lid, heat escapes there. The stirrer matters because the probe reads only the liquid that touches it. The cup has to be kept mixed for that reading to be the temperature of all of it.',
        [
          [MEASURING, CUP, 'some heat still escapes where the liquid meets the air, and that a lid reduces that loss.'],
          [METAL_BALL, CALORIMETER, 'a stirrer keeps what is in the calorimeter well mixed, so that it is heated evenly.'],
          [MANUAL, 'the laboratory manual page on calorimetry, part A of its procedure', 'the lid is kept tightly on while temperatures are read, so that the heat stays in the cup.'],
        ],
      ),
      paragraph(
        { label: 'The rule here', labRules: ['In this lab a run counts only if the lid was on and the stirrer going from the moment the change was started.'] },
        'In this lab a run counts only if the lid was on and the stirrer going from the moment the change was started. Its result must also come within 5% of the figure the lab holds for that part. In Guided mode the lab warns you first if the lid or the stirrer is missing, and lets you go on if you choose. In Challenge mode it says nothing until the worksheet is checked.',
        [],
        "what makes a run count, the warning and the way past it are this lab's own (spec 16.2). The 5% is a model parameter, with its rationale in the record, and a test holds the sentence to it.",
      ),
      paragraph(
        { label: 'What is assumed' },
        'The arithmetic rests on three things that are not quite true. First, that no heat passes between the cup and the room. Second, that the cup, the lid, the stirrer and the probe take up no heat themselves. Third, that what is in the cup behaves like water: that a millilitre of a solution weighs 1.00 g, and that its specific heat is the 4.18 J/(g·°C) of water.',
        [
          [MANUAL, MANUAL_INTRODUCTION, 'the foam cup is taken to let no heat through its walls, and the cup, the air in it and the thermometer are taken to have no part in the heat that moves.'],
          [MEASURING, SUMS, "a solution is commonly given water's density and water's specific heat, that both are approximations, and that the errors they bring are small beside those from lost heat."],
          [ACID_BASE, 'the page on the heat of neutralization, the figures under its procedure', 'its solution is taken to weigh 1.00 g for each millilitre.'],
        ],
      ),
      paragraph(
        { label: 'What this lab does', labRules: ['In this lab the second and the third are taken to be exactly true, so the cup and your arithmetic agree on them.'] },
        'In this lab the second and the third are taken to be exactly true, so the cup and your arithmetic agree on them. The first is not. The cup here does trade a little heat with the room, slowly with the lid on and several times faster with it off, which is why even a careful run comes out a little low.',
        [],
        "what the model idealises and what it does not is this lab's own (spec 16.3). How fast the cup trades heat with the room is a model parameter, with its rationale in the record.",
      ),
      paragraph(
        { label: 'A careful bench', terms: ['calorimeter constant'] },
        'A real bench does better on the second. Before the experiment it finds out how much heat the calorimeter itself takes up for each degree it warms, with a trial in which the heat is already known. That figure is often called the calorimeter constant. In every run after that, the heat the calorimeter took up is added in.',
        [
          [METAL_BALL, 'the page on the specific heat capacity of copper, under the heading Calorimetry and in part 1 of its experiment', 'a calorimeter has a heat capacity of its own and takes up heat as it warms, that this is not known beforehand and has to be measured, by a run with a metal whose specific heat is known, and that the heat it takes is then part of the sum.'],
          [GRAPH, 'the page on experimental methods, its note on other sources of error', 'the cup, its lid and the thermometer still take up a little heat, or give a little out.'],
        ],
        "the name calorimeter constant is the usual one in laboratory manuals; the pages read speak of the calorimeter's heat capacity.",
      ),
    ],
  },
  {
    id: 'graph',
    heading: 'Reading the graph',
    paragraphs: [
      paragraph(
        { label: 'The logger' },
        'The probe is joined to a logger, which takes a reading every 15 seconds and draws each one as a point: temperature up the side, time along the bottom. Point at a point, tap it, or move to it with the keyboard, and the lab says its time and its temperature.',
        [],
        "the logger, how often it reads and how its graph is looked at are this lab's own (spec 16.1 and 16.2).",
      ),
      paragraph(
        { label: 'Before the change' },
        'Start the logger before you start the change. The first points then lie level, at the temperature the cup has settled at. That level is the starting temperature.',
        [[GRAPH, GRAPHS, 'readings taken for a while before the last reactant goes in give a level line for the temperature at the start.']],
      ),
      paragraph(
        { label: 'The peak' },
        'When the change starts, the points climb, or drop if the change takes heat in. They reach a highest or a lowest point, and after it they creep slowly back towards the temperature of the room, because the cup is trading heat with the room all the while. Run on until you see them turn back. Until then you cannot know that you have seen the highest or the lowest.',
        [[GRAPH, GRAPHS, 'a cup that has warmed loses heat all the time from the start of the reaction, so that its temperature starts down as soon as the reaction has finished, and that a cup that has cooled gains heat in the same way and starts up.']],
        "that the worksheet waits for the turn is this lab's rule (spec 16.2).",
      ),
      paragraph(
        { label: 'What to type', labRules: ['In this lab the two temperatures you type must be ones the logger shows, to the tenth of a degree: the level one before the change, and the highest or the lowest after it.'] },
        'In this lab the two temperatures you type must be ones the logger shows, to the tenth of a degree: the level one before the change, and the highest or the lowest after it. The first two entries of the worksheet open when the curve has turned back and you have looked at such a point.',
        [],
        "which temperatures are typed, that they must be the logger's own and what opens an entry are this lab's own (spec 16.2), and a test holds the sentence to the engine.",
      ),
      paragraph(
        { label: 'Why it reads low' },
        'The highest point is a little lower than it would have been in a cup that lost no heat, because heat was already leaking away while the temperature was still climbing. So the change in temperature you read is a little too small, and the heat worked out from it is a little too small as well. The same holds for a fall.',
        [[GRAPH, GRAPHS, 'a change in temperature read without allowing for this loss or gain of heat always comes out too small.']],
      ),
      paragraph(
        { label: 'A careful bench', labRules: ['This lab asks for the highest or the lowest point as the logger shows it, and no more.'] },
        'A real bench allows for the leak. It keeps reading for some minutes after the peak, draws a straight line through the slow drift, and carries that line back to the moment the change was started. The temperature the line gives there is used in place of the highest point read. This lab asks for the highest or the lowest point as the logger shows it, and no more.',
        [
          [GRAPH, GRAPHS, 'the line of the drift is carried back to the time the reaction started, and that the temperature it gives there is the one the true change is taken from.'],
          [MEASURING, CUP, 'the heat lost while a reaction goes on can be allowed for by plotting a cooling curve.'],
        ],
        "that the lab does not ask for the line is its own choice (spec 16.3).",
      ),
    ],
  },
  {
    id: 'per-mole',
    heading: 'From heat to heat for each mole',
    paragraphs: [
      paragraph(
        { label: 'Why for each mole', terms: ['mole'] },
        'Twice as much acid and base gives out twice as much heat. To set one change beside another, chemists give the heat for a fixed amount of the chemicals: one mole. A mole is a counting unit for atoms and molecules, as a dozen is for eggs, only very much larger.',
        [[MANUAL, MANUAL_INTRODUCTION, 'the heat of a reaction depends on how much of the reactants is used, and that to compare reactions it is turned into the heat for one mole.']],
        'that a mole is a counting unit is said in the words of the titration lab\'s primer; no source was read for it here.',
      ),
      paragraph(
        { label: 'Moles from a solution', terms: ['concentration'] },
        'The concentration of a solution says how much is dissolved in each litre. It is written in moles for each litre, M for short. The moles in a measured volume are the volume in litres times the concentration. So 40.0 mL of a 0.500 M solution, which is 0.0400 L, holds 0.0400 × 0.500 = 0.0200 mol. In part 1 the acid and the base react one for one, and each mole of acid that reacts makes one mole of water.',
        [
          [ACID_BASE, 'the page on the heat of neutralization, its opening paragraphs', 'a hydrogen ion and a hydroxide ion react one for one to make water, and that the moles that react are those of whichever of the two runs out first.'],
          [MANUAL, 'the laboratory manual page on calorimetry, part C of its procedure and the questions under it', 'the moles of an acid and of a base that were mixed are worked out from the volume and the concentration of each.'],
        ],
        "the example is the lab's own, on numbers no run has. What a concentration is, is said in the words of the titration lab's primer.",
      ),
      paragraph(
        { label: 'Moles from a mass', terms: ['molar mass'] },
        'The molar mass of a substance is the mass of one mole of it, in grams for each mole. The moles in a weighed portion are the mass in grams divided by the molar mass. The molar mass of ammonium nitrate is printed on its tile: 80.044 g/mol.',
        [
          [SALT, 'the page on the heat of solution of ammonium nitrate, its working equation and the figures under its procedure', 'the moles of a salt are what its heat of solution is divided by, and that a figure for the mass of one mole of ammonium nitrate is given for the purpose.'],
          [COMPOUNDS, 'the kept table of compounds, the row for ammonium nitrate', 'ammonium nitrate has a molecular weight of 80.044.'],
        ],
      ),
      paragraph(
        { label: 'The relation' },
        'The heat for each mole is the heat divided by the moles. The heat is in joules and the answer is wanted in kilojoules for each mole, kJ/mol, so divide by 1000 as well. Then give the answer its sign: a minus if the change gave heat out, a plus if it took heat in.',
        [
          [ACID_BASE, 'the page on the heat of neutralization, its opening paragraphs', 'the heat of neutralization for one mole is the heat of the reaction divided by the moles that reacted.'],
          [SALT, 'the page on the heat of solution of ammonium nitrate, the end of its opening section', 'the heat of solution for one mole is the heat of dissolving divided by the moles of the solid.'],
          [MANUAL, MANUAL_INTRODUCTION, 'a heat in joules divided by the moles gives joules for each mole, which is then written in kilojoules for each mole.'],
        ],
        undefined,
        'heat for each mole = heat ÷ moles',
      ),
      paragraph(
        { label: 'Acid and base' },
        'Suppose 40.0 mL of an acid and 40.0 mL of a base are mixed, each 0.500 M, and the temperature rises by 3.5 °C. The two solutions make 80.0 mL, taken as 80.0 g. The heat they took in is 80.0 × 4.18 × 3.5 = 1170 J. The water formed is 0.0200 mol. The heat for each mole is 1170 J ÷ 0.0200 mol = 58 500 J/mol, which is 58.5 kJ/mol. The solution warmed, so the reaction gave heat out, and the answer is written −58.5 kJ/mol.',
        [],
        "the example is the lab's own, on numbers no run has: the bench's volumes are 50.0 mL and its solutions 1.00 M.",
      ),
      paragraph(
        { label: 'A salt dissolving' },
        'Suppose 2.50 g of a salt whose molar mass is 53.49 g/mol dissolves in 50.0 g of water, and the temperature falls by 3.2 °C. The mass that cooled is the water and the salt together, 52.5 g, because the salt is part of the solution once it has dissolved. The heat the solution gave up is 52.5 × 4.18 × 3.2 = 702 J. The moles of salt are 2.50 ÷ 53.49 = 0.0467 mol. The heat for each mole is 702 J ÷ 0.0467 mol = 15 000 J/mol, which is 15.0 kJ/mol. The solution cooled, so the dissolving took heat in, and the answer is written +15.0 kJ/mol.',
        [[SALT, 'the page on the heat of solution of ammonium nitrate, the paragraph before its working equation', 'the mass of the solution is the mass of the water and the mass of the solid that was put into it, added together.']],
        "the example is the lab's own, on numbers no run has, and its salt is not the one on the bench.",
      ),
    ],
  },
  {
    id: 'metal',
    heading: "A metal's specific heat",
    paragraphs: [
      paragraph(
        { label: 'The method turned round' },
        'Part 3 turns the method round. A piece of metal is heated in boiling water until it is as hot as the water, and is then put into cool water in the cup. Heat passes from the metal to the water until both are at one temperature. If none is lost on the way, the heat the metal gave out is the heat the water took in.',
        [
          [MANUAL, MANUAL_METAL, 'a weighed metal is heated in boiling water until it can be taken to be at the temperature of that water, is put into water in the cup, and that the heat the metal loses is set equal to the heat the water gains.'],
          [METAL_BALL, 'the page on the specific heat capacity of copper, under the heading Calorimetry', 'a hot piece of metal dropped into the water of a calorimeter comes to one final temperature with it, cooled by the water while the water is warmed.'],
        ],
      ),
      paragraph(
        { label: 'The bath' },
        'Water boils at very nearly 100 °C when the air is at its ordinary pressure. The bath in this lab is not always exactly at that, so its thermometer is read each time, and the reading is on the bench.',
        [[WATER, 'the page of properties of water, under its heading for further properties of the fluid', 'the normal boiling point of water is 99.97 °C.']],
        "that the bath's temperature differs a little from run to run is this lab's set-up (spec 16.1); its range is a model parameter, with its rationale in the record.",
      ),
      paragraph(
        { label: 'Working it out' },
        "The water's side is worked as before: the heat is the mass of the water times 4.18 times the rise of the water. The metal's side has the same shape: its heat is its mass times its specific heat times its fall in temperature. The metal fell from the temperature of the bath to the highest temperature in the cup, which is a far bigger change than the rise of the water. Set the two heats equal and turn the relation round.",
        [[MANUAL, MANUAL_INTRODUCTION, "the mass of the metal times its specific heat times its change in temperature is set against the mass of the water times its specific heat times its change in temperature, and that the metal's specific heat is worked out from the four figures that are measured."]],
        "that the relation is turned round into the form shown is this card's own arithmetic.",
        "specific heat of the metal = heat the water took in ÷ (mass of the metal × the metal's fall in temperature)",
      ),
      paragraph(
        { label: 'A worked example' },
        'Suppose a 60.0 g piece at 99.5 °C goes into 50.0 g of water at 21.0 °C, and the highest temperature is 23.8 °C. The water rose by 2.8 °C and took in 50.0 × 4.18 × 2.8 = 585 J. The metal fell by 99.5 − 23.8 = 75.7 °C. Its specific heat is 585 ÷ (60.0 × 75.7) = 0.129 J/(g·°C). That is none of the four metals on this bench.',
        [],
        "the example is the lab's own, on numbers no run has; a test holds its answer to being nearer no candidate than the candidates are to each other.",
      ),
      paragraph(
        { label: 'Which metal' },
        "Each metal has a specific heat of its own, so the figure tells you which metal the piece is. The bench lists the four it may be, aluminium, iron, zinc and tin, with the specific heat of each. Choose the one whose figure is nearest to yours. Yours will not match exactly, and a careful one comes out a little low, for the reason the card Reading the graph gives.",
        [[MANUAL, MANUAL_METAL, "the metal is named by setting the specific heat that was measured beside a table of the specific heats of known metals."]],
        "which four metals, and that the nearest is chosen, are this lab's own (spec 16.1 and 16.2); a test holds the four names to the record.",
      ),
      paragraph(
        { label: 'What is made simple', labRules: ['In this lab the piece is taken to reach the cup at once, as hot as the bath and dry.'] },
        'In this lab the piece is taken to reach the cup at once, as hot as the bath and dry. On a real bench it cools a little on the way, and a piece lifted straight out of the bath brings hot water with it. A careful bench heats the piece in a dry test tube that stands in the boiling water, so that it stays dry, and tips it into the cup quickly.',
        [[MANUAL, 'the laboratory manual page on calorimetry, part B of its procedure', 'the metal is put in a test tube, the test tube is stood in the boiling water, and the metal is poured from the tube into the cup carefully and without delay, the cover going straight back on.']],
        "what the model idealises is this lab's own (spec 16.3). That a piece cools on the way and that a wet one brings hot water with it are read in no source: they are why the manual page does what it does.",
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'On a screen' },
        'Nothing on this screen can burn or poison anyone. What follows is for a real bench, where this experiment means a corrosive acid, a corrosive base, boiling water and a hot piece of metal. It does not take the place of the safety training of a laboratory.',
        [],
        "that the lab is a simulation and does not replace safety training is this project's own statement (spec 12).",
      ),
      paragraph(
        { label: 'On each tile' },
        "Each tile shows two things. First come the hazard statements of the substance as a supplier's safety data sheet prints them. Under them is a note on the substance as it is on this bench. Where the documents read differ, the note goes by the stricter one, as long as what that one says is about the substance and is not a line printed on every sheet alike. Until part 3 is done the piece of metal is unknown, so the bench shows the tiles of all four metals it may be.",
        [],
        "what a tile shows, and the rule its note is written to, are this project's (spec 5.2). The statements and the notes are in the lab's record, with the documents each rests on.",
      ),
      paragraph(
        { label: 'Acid and base' },
        'The hydrochloric acid and the sodium hydroxide solution of part 1 are each 1.00 M, and at that strength each burns skin severely and damages eyes. A splash in the eyes is rinsed with water for several minutes, and a doctor or a poison centre is called at once. Clothing that is splashed comes off at once, and the skin under it is rinsed with water.',
        [
          [sheet('395.2'), `${HAZARDS} and ${FIRST_AID}`, 'hydrochloric acid of 0.1 M to 2.4 M is classed as a cause of severe burns to the skin and of damage to the eyes, that eyes are rinsed with water for several minutes and a poison centre or a doctor called at once, and that wet clothing comes off at once and the skin is rinsed.'],
          [sheet('735'), `${HAZARDS} and ${FIRST_AID}`, 'sodium hydroxide solution of 0.3 M to 6.0 M is classed as a cause of severe burns to the skin and of damage to the eyes, with the same rinsing, the same call and the same care of wet clothing.'],
        ],
      ),
      paragraph(
        { label: 'Ammonium nitrate' },
        'Solid ammonium nitrate helps other things to burn, and one record marks it as explosive. It is kept away from heat, from anything that burns, from strong acids and from powdered metals. It is not ground, and its dust is not breathed. It irritates skin and eyes. Clothing it gets on is taken off and washed, because dried into cloth it is a fire risk.',
        [
          [sheet('61'), `${HAZARDS} and ${REACTIVITY}`, 'solid ammonium nitrate is classed as an oxidiser that may make a fire worse and as an irritant of the skin and of the eyes, and that it is kept from heat, from things that burn, from strong acids and from powdered metals, is not ground, and its dust not breathed.'],
          ['noaa-cameo-98', "the record's fields Reactivity Alerts and First Aid", 'ammonium nitrate is marked as explosive as well as a strong oxidising agent, and that clothing it has soaked into may be a fire risk once dry.'],
          ['wards-sds-aa0295', "the sheet's section 2, among its precautionary statements", 'clothing that ammonium nitrate has got on is taken off and washed.'],
        ],
      ),
      paragraph(
        { label: 'The four metals' },
        "Each of the four metals is on the bench as one solid piece, and for a piece its supplier's sheet lists no hazard statement. Powders, dusts and filings of the same metals are another matter: some burn, and none is used here. A piece is kept away from the acid and the base of part 1. Zinc is kept apart from ammonium nitrate, and out of drains and waterways.",
        [
          [sheet('34'), `${HAZARDS} and ${FIRE}`, 'the sheet for aluminium prints no hazard statement, and that the dust of the metal burns.'],
          [sheet('416'), `${HAZARDS} and ${REACTIVITY}`, 'the sheet for iron in bulk pieces prints no hazard statement, and lists acids among what the metal is kept from.'],
          [sheet('859'), `${HAZARDS} and ${REACTIVITY}`, 'the sheet for zinc as shot, sheet and foil prints no hazard statement, puts the hazard of fire with the dust and the powder, and keeps the metal from strong acids and strong bases.'],
          [sheet('822'), `${HAZARDS} and ${FIRE}`, 'the sheet for tin as shot, granules and foil prints no hazard statement, and that the finely divided metal may burn.'],
          ['wards-sds-aa0145', REACTIVITY, 'aluminium is kept from strong alkalis as well as from acids.'],
          ['wards-sds-tt0180', REACTIVITY, 'tin is kept from acids, with which it gives off hydrogen.'],
          ['fisher-sds-zinc-granular-mossy', "the sheet's sections 6 and 12 (accidental release measures; ecological information)", 'zinc is very toxic to what lives in water, by the sheet, and is not to be flushed into surface water or a sewer.'],
          ['noaa-cameo-4814', "the record's field Reactivity Profile", 'zinc, as dust, reacts violently with ammonium nitrate that has been wetted.'],
        ],
        "that a piece is kept from this lab's acid and base is how the notes under the four tiles carry these documents; iron's and zinc's sheets say acids, aluminium's adds alkalis and zinc's strong bases, and the card says it of all four.",
      ),
      paragraph(
        { label: 'Hot water and metal' },
        'The bath of part 3 is boiling water, and the piece that comes out of it is as hot as the water. Boiling water scalds. On a real bench the piece is lifted with tongs or a holder and never with fingers. It is lowered into the cup, not dropped, so that nothing splashes. The bath stands where it cannot be knocked over. A hot piece of metal looks no different from a cold one.',
        [[MANUAL, 'the laboratory manual page on calorimetry, part B of its procedure', 'what holds the hot metal is taken out of the boiling water with a holder so that nobody is burned, and that care is taken that no water spatters from the cup.']],
        'that boiling water scalds, that the bath is stood where it cannot be knocked over and that hot metal looks like cold metal are common care at a bench; no source was read for them.',
      ),
      paragraph(
        { label: 'A cold cup' },
        'In part 2 the cup gets a few degrees colder than the room. That much cold harms nothing. What is in the cup is a solution of ammonium nitrate, and it is still handled with eye protection and gloves on.',
        [[sheet('61.5'), PROTECTION, 'the sheet for ammonium nitrate solution calls for eye protection, gloves and protective clothing.']],
        "how cold the cup gets is this lab's model: a fall of 5 to 6 °C.",
      ),
      paragraph(
        { label: 'What to wear' },
        "Eye protection, gloves and protective clothing, for all three parts. The sheets for the acid, the base, the ammonium nitrate and three of the four metals each call for them, and a metal maker's sheet asks for safety glasses with the fourth, iron.",
        [
          ...['395.2', '735', '61', '34', '859', '822'].map((number) => [sheet(number), PROTECTION, 'the sheet calls for eye protection, gloves and protective clothing.'] as const),
          ['espi-sds-iron', PROTECTION, 'safety glasses are asked for with iron as rod, shot and pieces.'],
        ],
      ),
      paragraph(
        { label: 'Afterwards' },
        "How anything from the bench is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [],
        "the card gives no method of disposal: that it is the laboratory's to decide is the owner's rule for every lab (spec 5.2).",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the primer's first paragraph names them. */
export const READ_FIRST: readonly string[] = readFirstOf(CALORIMETRY_PRIMER)
