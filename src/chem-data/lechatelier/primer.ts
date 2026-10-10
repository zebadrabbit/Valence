import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The Le Chatelier's principle lab's concept primer (spec 18.6): ten short cards for a reader with no chemistry
// background, shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their
// support lines to that: none repeats six words running of a page it rests on. Each paragraph says what it rests
// on in `support`, one line for each passage: either a passage of a source, given where it is and, in this
// project's words, what it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its
// rules, its model) and is read in no source. The sources are listed in docs/research/lechatelier/sources/MANIFEST.json,
// and the documents of the last card in the lab's hazard manifest; all reach sources.json through `npm run build:data`.
//
// The figures the cards give (two solubilities, a heat, the ends of an indicator's range) are the record's, and a
// test holds each to it. The primer is not kept back in either mode. It says which way each kind of disturbance
// pushes, which is what the lab asks a learner to apply, and, as spec 18.6 asks, which changes of this bench take
// heat in and what an excess of hydroxide or of ammonia does to zinc hydroxide and not to magnesium hydroxide. It
// does not go through the bench's tubes one by one.

const DYNAMIC = 'chemguide-equilibria-introduction'
const PRINCIPLE = 'chemguide-le-chatelier'
const LOWER = 'lower-le-chatelier'
const MALIK = 'malik-varying-solubility'
const HANDOUT = 'bellevue-le-chatelier'
const INDICATORS = 'chemguide-indicators'
const RANGES = 'libretexts-acid-base-indicators'
const LIGANDS = 'chemguide-ligand-exchange'
const COBALT = 'nuffield-cobalt-equilibrium'
const LEAD = 'birk-lead'
const ZINC = 'birk-zinc'
const MAGNESIUM = 'birk-magnesium'
const TABLES = 'nbs-tables-1982'

// Places that more than one paragraph reads.
const SECTION_2 = "the sheet's section 2 (hazards identification)"
const PART_C = 'the background of its part C, on the two hydroxides'

export const LECHATELIER_PRIMER: readonly PrimerSection[] = [
  {
    id: 'equilibrium',
    heading: 'What equilibrium is',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        "This primer has ten cards. Read four of them before you go to the bench, in this order: What equilibrium is; Le Chatelier's principle; Adding and taking away; Safety. The other six can wait until a system sends you to them.",
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what an equilibrium is, what the principle says, how its commonest case works, and what a real bench of this lab holds.",
      ),
      paragraph(
        { label: 'Two changes, one rate', terms: ['equilibrium'] },
        'Many chemical changes can go both ways. When the change forward and the change back run at the same rate, the amount of each thing stops changing. That state is called equilibrium. Nothing has stopped: both changes go on, and each undoes what the other does.',
        [[DYNAMIC, 'under the heading Dynamic equilibria and in the summary at the end of the page', 'at equilibrium the amounts of everything in the mixture stay the same although both changes go on, because the forward change and the back change run at one rate.']],
      ),
      paragraph(
        { label: 'Left and right', labRules: ['In this lab each equilibrium is written one way and kept that way, with the colour that tells each side.'] },
        'An equilibrium is written with a double arrow, ⇌. What stands before the arrow is its left side, and what stands after it is its right side. A shift to the right means that some of what is on the left turns into what is on the right. In this lab each equilibrium is written one way and kept that way, with the colour that tells each side.',
        [[DYNAMIC, 'under the headings on the forward and the back reaction and on the position of equilibrium', 'the forward change is the one that runs from the left of the equation to its right, and that an equilibrium mixture is said to move to the left or to the right when its make-up changes.']],
        "that each equilibrium is written one way and kept, and is shown with the colour of each side, is this lab's own (spec 18.2).",
      ),
    ],
  },
  {
    id: 'principle',
    heading: "Le Chatelier's principle",
    paragraphs: [
      paragraph(
        { label: 'The principle' },
        "A system at equilibrium that is disturbed shifts in the direction that undoes part of the disturbance. That is Le Chatelier's principle. Only part is undone: after the shift there is a new equilibrium, with different amounts from the old one.",
        [
          [MALIK, "section 1.3, under its first heading", 'a system at equilibrium that is put through a change of concentration or of temperature goes to a new equilibrium in which part of the change is undone.'],
          [LOWER, 'section 11.2, under its heading for the principle', 'the new equilibrium still holds more of an added substance than the old one did, though less than was added: the change is offset in part only.'],
        ],
      ),
      paragraph(
        { label: 'A guide only' },
        'The principle tells you which way a system will go. It does not say why it goes that way: it is a rule of thumb that turns out to be right.',
        [[PRINCIPLE, 'the note at the head of the page, said again after each of its parts', 'the principle is a quick means of finding the outcome, and explains nothing.']],
      ),
      paragraph(
        { label: 'In this lab', labRules: ['In this lab you say which way a system will shift before each change, and that is never marked.'] },
        'This lab disturbs four equilibria in three ways: by adding something or taking something away, by heating or cooling, and by adding water. In this lab you say which way a system will shift before each change, and that is never marked. You say it again once you have seen the tube.',
        [],
        "the four systems, the three kinds of disturbance and the prediction that is kept and not marked are this lab's own (spec 18.1 to 18.3).",
      ),
    ],
  },
  {
    id: 'adding',
    heading: 'Adding and taking away',
    paragraphs: [
      paragraph(
        { label: 'Adding' },
        'Add more of something that is in the equilibrium, and the system moves away from the side it stands on. Some of what was added is used up, and more of the other side is made.',
        [[PRINCIPLE, 'under its heading on a change of concentration', 'raising the concentration of one substance moves the equilibrium so that some of that substance is used up, away from the side it is on.']],
      ),
      paragraph(
        { label: 'Taking away' },
        'Take some of a thing away, and the system moves toward the side it stood on, and makes some of it again.',
        [[PRINCIPLE, 'under its heading on a change of concentration', 'lowering the concentration of one substance moves the equilibrium so that more of that substance is made, toward the side it is on.']],
      ),
      paragraph(
        { label: 'Without lifting it out' },
        'A thing can be taken away without leaving the tube. An acid takes hydroxide ions away by joining them to its hydrogen ions, which makes water. A base takes hydrogen ions away in the same way.',
        [
          [MALIK, 'section 1.3, under its heading on the effect of pH', 'an acid takes hydroxide ions out of a solution by turning them into water, and that an equilibrium those ions belong to moves to make up the loss.'],
          [HANDOUT, 'the background of its part A, on the indicator', 'a strong base takes hydrogen ions out of a solution, since hydroxide ions and hydrogen ions make water.'],
        ],
      ),
    ],
  },
  {
    id: 'heat',
    heading: 'Heating and cooling',
    paragraphs: [
      paragraph(
        { label: 'Heat in, heat out' },
        'A change that takes heat in when it goes one way gives the same heat out when it goes back. Heating a system at equilibrium moves it the way that takes heat in. Cooling moves it the way that gives heat out.',
        [
          [PRINCIPLE, 'under its heading on a change of temperature, and the summary that closes that part', 'the back reaction of a change that gives out heat takes in as much, that raising the temperature favours the change that takes heat in, and that lowering it favours the change that gives heat out.'],
          [LOWER, 'section 11.2, under its heading on changes of temperature', 'heat can be thought of as one of the things in the equilibrium, used up one way and made the other.'],
        ],
      ),
      paragraph(
        { label: 'Two cases here' },
        'Lead chloride takes in heat as it dissolves, about 23 kJ for each mole. The change from the pink ion of cobalt to the blue one takes in heat too.',
        [
          [TABLES, 'pages 2-47 and 2-119, the rows for the chloride ion, the lead ion and solid lead chloride', 'the enthalpies of formation from which the heat of dissolving lead chloride is worked out, as the record shows.'],
          [COBALT, 'its teaching notes', 'the change from the cobalt ion with water to the cobalt ion with chloride is endothermic.'],
        ],
        'the figure of 23 kJ is worked out by the build from the table\'s three enthalpies and is printed in no source.',
      ),
    ],
  },
  {
    id: 'diluting',
    heading: 'Diluting',
    paragraphs: [
      paragraph(
        { label: 'More water' },
        'Adding water makes everything that is dissolved more dilute at once. The system moves toward the side with more dissolved particles. A solid is not diluted: there is as much of it in the tube as before.',
        [[LOWER, 'section 11.2, the row of its first table for a solution that is diluted', 'an equilibrium between one dissolved thing and two moves toward the two when the solution is diluted, since the product of two concentrations falls faster than one does.']],
        "that a solid is not diluted is this lab's way of saying why the dissolved ions are the side that counts; the section's next row has a solid with its two ions.",
      ),
      paragraph(
        { label: 'Water in the equilibrium' },
        'Sometimes water itself stands in the equilibrium, as it does for the two ions of cobalt. Adding it then moves the system away from the side water is on, as adding anything does.',
        [[LIGANDS, 'under its first heading on the cobalt ion with six water molecules', 'water stands on one side of the equilibrium between the two cobalt ions, and adding water moves the equilibrium away from that side.']],
      ),
    ],
  },
  {
    id: 'solid',
    heading: 'A solid and its ions',
    paragraphs: [
      paragraph(
        { label: 'Solid and ions together' },
        'A solid that hardly dissolves lies in water at equilibrium with its own ions. Ions leave the solid and ions come back to it, at one rate.',
        [[MALIK, 'section 1.3, its opening lines', 'an ionic compound in water comes to an equilibrium between its dissolved ions and the solid that has not dissolved.']],
        "that ions leave and come back at one rate is what equilibrium means for this case (the primer's first card); the section does not put it in those words.",
      ),
      paragraph(
        { label: 'What the solid shows' },
        'Water can keep only so much of the two ions dissolved together. Add more of one ion, and solid forms. Take an ion away, and solid dissolves. So the solid itself shows which way the equilibrium went.',
        [
          [MALIK, 'section 1.3, under its headings on the common ion effect and on the effect of pH', 'adding an ion that the solid shares makes less of the solid dissolve, and that taking one of its ions away makes more of it dissolve.'],
          [LEAD, 'under the heading Chloride Ion', 'chloride brings solid lead chloride out of a solution of the lead ion only when the solution is not too dilute.'],
        ],
      ),
      paragraph(
        { label: 'Hot and cold' },
        'A litre of water at 20 °C holds 10 g of lead chloride. At 100 °C it holds 33.5 g, over three times as much.',
        [[LEAD, 'under the heading Chloride Ion', 'lead chloride dissolves to 10 g in a litre at 20 degrees and to 33.5 g at 100 degrees.']],
      ),
    ],
  },
  {
    id: 'indicators',
    heading: 'Indicators',
    paragraphs: [
      paragraph(
        { label: 'Two forms, two colours', terms: ['indicator'] },
        'An indicator is a substance with two forms of different colours. One form holds a hydrogen ion that the other has given up, and the two are at equilibrium with the hydrogen ions in the liquid. More acid makes more of the form that holds the hydrogen ion.',
        [[INDICATORS, 'under the heading Indicators as weak acids', 'an indicator is a weak acid whose molecule and whose ion differ in colour, and that added hydrogen ions move its equilibrium toward the molecule.']],
      ),
      paragraph(
        { label: 'Methyl violet' },
        'Methyl violet is yellow in strong acid and violet in water. It changes between pH 0.0 and pH 1.6, which is very acid. Where both forms are in the liquid, the colour seen is a mixture of the two.',
        [
          [RANGES, 'the first row of the table', 'methyl violet changes over the range from pH 0.0 to pH 1.6, from yellow at the lower end.'],
          [HANDOUT, 'its list of the equilibria studied, and its part A', 'the form of methyl violet that holds a hydrogen ion is yellow and the other is violet, and that the indicator is violet in distilled water.'],
          [INDICATORS, 'under the heading Indicators as weak acids', 'where both forms of an indicator are present the colour seen is a mixture of their two colours.'],
        ],
      ),
    ],
  },
  {
    id: 'complex',
    heading: 'Complex ions and colour',
    paragraphs: [
      paragraph(
        { label: 'What one is', terms: ['complex ion'] },
        'A complex ion is a metal ion with other ions or molecules held around it. What is held around the metal can change its colour.',
        [
          [MALIK, 'section 1.3, under its heading on complex ion equilibria', 'a metal ion with molecules or ions bound to it, called ligands, is a complex ion.'],
          [LIGANDS, 'under its first heading on the cobalt ion with six water molecules', 'changing what is held around the cobalt ion, water for chloride, changes the colour of the solution.'],
        ],
      ),
      paragraph(
        { label: 'Cobalt' },
        'Cobalt with six water molecules around it is pink. Cobalt with four chloride ions around it is blue. The two are at equilibrium in a liquid that holds chloride, and a liquid that holds both is violet.',
        [[COBALT, 'the equation under its title, and its procedure', 'the cobalt ion with water is pink and the one with chloride is blue, that the two are at equilibrium where chloride is present, and that a liquid holding both is violet.']],
      ),
    ],
  },
  {
    id: 'second',
    heading: 'A second equilibrium',
    paragraphs: [
      paragraph(
        { label: 'One thing, two equilibria' },
        'A thing that stands in one equilibrium can stand in a second one as well. If the second uses it up, the first shifts to make more of it.',
        [[MALIK, 'section 1.3, under its heading on complex ion equilibria', 'a second change that takes a metal ion into a complex ion takes that ion out of the equilibrium of a solid with its ions, and more of the solid dissolves.']],
      ),
      paragraph(
        { label: 'Zinc' },
        'Zinc hydroxide is a white solid at equilibrium with zinc ions and hydroxide ions. A large excess of hydroxide, or of ammonia, holds the zinc ion in a complex ion that stays dissolved. That takes zinc ions away from the first equilibrium, and the solid dissolves.',
        [
          [ZINC, 'under its headings Aqueous Ammonia and Sodium Hydroxide', 'zinc hydroxide is white, and dissolves in an excess of hydroxide and in an excess of ammonia, in each as a complex ion of zinc.'],
          [HANDOUT, PART_C, 'a complex ion that dissolves takes the bare metal ion out of the liquid.'],
        ],
      ),
      paragraph(
        { label: 'Magnesium' },
        'Magnesium rarely forms complex ions, and forms none here that would hold it dissolved. Its hydroxide has no second equilibrium to turn to.',
        [
          [MAGNESIUM, 'the line over its first heading, and under the heading Aqueous Ammonia', 'complex ions of magnesium are rare, and that ammonia brings its hydroxide down and does not dissolve it.'],
          [HANDOUT, PART_C, 'of the two metals of the part one forms complex ions that dissolve and one does not.'],
        ],
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'A virtual bench' },
        "Nothing in this lab can hurt you. A real bench of it holds salts of lead and of cobalt, concentrated acid, and strong solutions of sodium hydroxide and of ammonia. Each bottle's tile gives its hazards. This card adds what is on no tile.",
        [],
        "what a real bench of this lab holds is the specification's list of bottles (spec 18.1); the hazards of each bottle are on its tile, with their sources.",
      ),
      paragraph(
        { label: 'The solids it makes' },
        'Three solids are made here that come from no bottle. By its sheets, lead chloride is harmful if swallowed or breathed in, may cause cancer, may harm fertility or an unborn child, and is very toxic to water life. Zinc hydroxide irritates skin and eyes and is very toxic to water life. One sheet calls magnesium hydroxide an irritant; another classes it as no hazard.',
        [
          ['flinn-sds-435', SECTION_2, 'solid lead chloride is harmful if it is swallowed or breathed in, may cause cancer, and may harm fertility or an unborn child; and its section 12, that it is very toxic to water life.'],
          ['flinn-sds-435.5', SECTION_2, 'a saturated solution of lead chloride, the liquid that stands over the solid, may cause cancer.'],
          ['fisher-sds-pbcl2', SECTION_2, 'lead chloride damages organs over long or repeated exposure, and is very toxic to water life.'],
          ['noaa-cameo-3735', 'the field Health Hazard', 'the dust of lead chloride is poisonous if breathed in.'],
          ['mpbio-sds-zinc-hydroxide', SECTION_2, 'zinc hydroxide irritates the skin and the eyes and is very toxic to water life with lasting effects.'],
          ['flinn-sds-475', SECTION_2, 'magnesium hydroxide as a dry powder irritates the skin, the eyes and the airways.'],
          ['fisher-sds-mgoh2', SECTION_2, 'a second supplier classes magnesium hydroxide as no hazard.'],
        ],
      ),
      paragraph(
        { label: 'Acid and water' },
        'Concentrated hydrochloric acid gives off heat when water is added to it, so a real tube of system 3 warms as it is diluted. A sheet for a cobalt salt in weaker acid gives that liquid the hazards of both the salt and the acid.',
        [
          ['flinn-sds-395', "the sheet's section 10 (stability and reactivity)", 'hydrochloric acid of 6 M to 12 M gives off heat when it is diluted with water.'],
          ['noaa-cameo-3598', 'the field Air & Water Reactions', 'diluting hydrochloric acid may give off heat.'],
          ['flinn-sds-255.6', SECTION_2, 'a solution of cobalt chloride in hydrochloric acid carries the hazard classes of the solid salt and, beside them, burns of the skin and damage to the eyes.'],
        ],
        "that the tube of system 3 warms is this lab's reading of the two documents on the acid: neither speaks of cobalt.",
      ),
      paragraph(
        { label: 'On a real bench' },
        "The sheets call for eye protection, gloves and protective clothing, and a fume hood or good ventilation. Lead and zinc are kept out of drains. How anything is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [
          ['flinn-sds-435', "the sheet's section 8 (exposure controls, personal protection)", 'eye protection, gloves and protective clothing are called for, and a hood or a room where the air is well changed.'],
          ['fisher-sds-pbcl2', "the sheet's section 6 (accidental release measures)", 'lead chloride is kept from drains and from surface and ground water.'],
          ['mpbio-sds-zinc-hydroxide', "the sheet's section 6 (accidental release measures)", 'zinc hydroxide is kept from sewers and from any water course.'],
        ],
        "that disposal is decided by the laboratory's own rules and local regulations, and that the supervisor is asked, is the project's rule for every lab (spec 5.2): no method of disposal is given.",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first paragraph names them. */
export const READ_FIRST = readFirstOf(LECHATELIER_PRIMER)
