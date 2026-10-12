import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The polarity and mixing lab's concept primer (spec 25.4): six short cards for a reader who has not met the word
// polar before, shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their
// support lines to that: none repeats six words running of a page it rests on. Each paragraph says what it rests on
// in `support`, one line for each passage: either a passage of a source, given where it is and, in this project's
// words, what it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its rules, its
// model) and is read in no source. The sources are listed in docs/research/mixing/sources/MANIFEST.json, and the
// documents of the last card in the lab's hazard manifest too; all reach sources.json through `npm run build:data`.
//
// The primer is not kept back in either mode. It states the rule the bench is there to show, which spec 25.4 asks
// it to, and says that salt and sugar dissolve in water and that oil floats on it. It says of no other tube what it
// shows, and it sorts no liquid of the bench but the two the families are named for, water and the oils.

const WATER = 'ck12-structure-of-water'
const DISSOLVING = 'ck12-dissolving-process'
const LIQUIDS = 'ck12-liquid-liquid-solutions'
const SOLVENT = 'wikipedia-solvent'
const MISCIBILITY = 'wikipedia-miscibility'
const ALCOHOL = 'wikipedia-isopropyl-alcohol'
const LAYERS = 'uaf-liquid-layers'
const MINERAL_OIL = 'noaa-cameo-12191'
const ALCOHOL_SHEET = 'flinn-sds-420.5'
const ALCOHOL_RECORD = 'noaa-cameo-946'
const SUGAR_SHEET = 'flinn-sds-789'

const DISSOLUTION = 'under the heading on the process of dissolution'
const UNDER_ITS_NAME = "under the heading of the page's own name"

export const MIXING_PRIMER: readonly PrimerSection[] = [
  {
    id: 'mixing',
    heading: 'Mixing and not mixing',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has six cards. Read four of them before you go to the bench, in this order: Mixing and not mixing; Two ends or none; Like dissolves like; Safety. The other two can wait until the bench sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four give the words the bench uses, the two kinds of molecule, the rule, and what a real bench of this lab holds.",
      ),
      paragraph(
        { label: 'Two liquids', terms: ['miscible', 'immiscible'] },
        'Shake two liquids together in a tube and let it stand. Some pairs become one liquid and stay that way: they are miscible. Other pairs go back to two layers, one over the other, however hard they were shaken: they are immiscible.',
        [
          [MISCIBILITY, 'in its first two paragraphs', 'two substances that mix in every proportion into one even mixture are called miscible, and two that do not are called immiscible.'],
          [SOLVENT, 'in the section on the classification of solvents, the paragraph on what dissolves what', 'two liquids that do not mix part into two layers again soon after a hard shake.'],
        ],
      ),
      paragraph(
        { label: 'Solid in liquid', terms: ['dissolves', 'soluble', 'insoluble'] },
        'A solid can go into a liquid and be gone from sight: it dissolves. The solid is then called soluble in that liquid. A solid that stays at the bottom is insoluble in it. The same solid can be soluble in one liquid and insoluble in another.',
        [
          [LIQUIDS, `${UNDER_ITS_NAME}, and in the summary`, 'one solid can dissolve in one liquid and not in another, its example being iodine in lighter fluid and in water, and that a thing which does not dissolve is called insoluble.'],
          [MISCIBILITY, 'in its second paragraph', 'a thing that dissolves in a liquid is called soluble in it.'],
        ],
      ),
    ],
  },
  {
    id: 'polar',
    heading: 'Two ends or none',
    paragraphs: [
      paragraph(
        { label: 'Water', terms: ['polar'] },
        'A water molecule is bent, with its oxygen atom at the corner. The oxygen end carries a small negative charge, and the end with the two hydrogen atoms a small positive one. A molecule with two such ends is called polar. The positive end of one water molecule pulls on the negative end of the next.',
        [[WATER, 'under the heading on the structure of water', 'the water molecule is bent, that its oxygen atom has a partial negative charge and its hydrogen atoms a partial positive one, that such a molecule is called polar, and that polar molecules attract each other end to opposite end.']],
      ),
      paragraph(
        { label: 'Oil', terms: ['nonpolar'] },
        'An oily liquid is made of molecules with no such ends. They are called nonpolar, and they hold on to each other only weakly. Mineral oil is one: its molecules are carbon and hydrogen and nothing else. Vegetable oil behaves the same way.',
        [
          [LIQUIDS, `in the paragraph that opens the page and ${UNDER_ITS_NAME}`, 'an oil made of hydrocarbons, compounds of carbon and hydrogen alone, is nonpolar, and that the forces between nonpolar molecules are weak.'],
          [MINERAL_OIL, 'the field Reactive Group', 'mineral oil belongs to the saturated hydrocarbons.'],
          [SOLVENT, 'in the section on the classification of solvents, the paragraph on what dissolves what', 'oils are among the strongly nonpolar compounds.'],
        ],
        'that vegetable oil behaves as mineral oil does is said of how the two act on this bench. A vegetable oil is not a hydrocarbon: its molecules hold a few oxygen atoms, and the card does not say otherwise.',
      ),
      paragraph(
        { label: 'In the explorer' },
        'The explorer has models of water, of the acetic acid in vinegar and of sugar. Look for an oxygen atom with a hydrogen atom on it: that O–H group is where water holds on.',
        [
          [DISSOLVING, `${DISSOLUTION}, the paragraph on table sugar`, 'the O–H groups of a sugar molecule make hydrogen bonds with water.'],
          [LIQUIDS, 'in the paragraph after the figure', 'acetic acid is one of the small molecules whose polar groups hold on to water.'],
        ],
        "which molecules the explorer holds is this app's own: water, acetic acid and sucrose are in its library, and 2-propanol and the oils are not.",
      ),
    ],
  },
  {
    id: 'like-dissolves-like',
    heading: 'Like dissolves like',
    paragraphs: [
      paragraph(
        { label: 'The rule' },
        'Polar liquids mix with polar liquids, and nonpolar liquids with nonpolar ones. A polar liquid and a nonpolar one stay apart. Chemists say it in three words: like dissolves like.',
        [
          [LIQUIDS, UNDER_ITS_NAME, 'a nonpolar liquid makes two layers with water and a polar one blends with it, and that the rule for what dissolves what is the three words the card gives.'],
          [SOLVENT, 'in the section on the classification of solvents, the paragraph on what dissolves what', 'polar liquids dissolve polar things best and nonpolar liquids nonpolar things.'],
        ],
      ),
      paragraph(
        { label: 'Solids too' },
        'The rule covers solids as well. Salt and sugar dissolve in a very polar liquid such as water. Oils and waxes dissolve in nonpolar liquids.',
        [[SOLVENT, 'in the same paragraph', 'sugars and salts dissolve in very polar liquids such as water and in no others, and oils and waxes in very nonpolar ones.']],
      ),
      paragraph(
        { label: 'In between' },
        'Some molecules have a polar end and a nonpolar part. The alcohol in rubbing alcohol is one. The bigger the nonpolar part of such a molecule, the less well it mixes with water.',
        [
          [LIQUIDS, 'in the paragraph after the figure', 'the larger the nonpolar part of a molecule with a polar group, the less it dissolves in water.'],
          [ALCOHOL, 'in the section on its properties, the first paragraph', '2-propanol is a polar molecule that mixes with water and also dissolves many oils.'],
        ],
      ),
    ],
  },
  {
    id: 'layers',
    heading: 'Which layer is on top',
    paragraphs: [
      paragraph(
        { label: 'Lighter floats', terms: ['density'] },
        'How much mass there is in each millilitre of a thing is its density. Where two liquids do not mix, the less dense one floats on the other. Oil floats on water because it is the less dense of the two.',
        [
          [LAYERS, "in the teacher's procedure and in the background of the worksheet", 'density is the mass of a thing for its volume, and that liquids poured together part by density with the least dense on top.'],
          [LIQUIDS, 'in the caption of its figure', 'oil makes the upper layer on water because it is the less dense.'],
        ],
      ),
      paragraph(
        { label: 'Not the amount' },
        'How much there is of each liquid does not change the order. A thin layer of the less dense liquid still floats on a deep layer of the denser one.',
        [[LAYERS, 'in the background of the worksheet', 'it is by density that liquids part into layers.']],
        'that the amounts do not change the order is how the tubes of this lab are worked: which liquid is on top follows from the two stored densities alone (spec 25.3).',
      ),
      paragraph(
        { label: 'On this bench', labRules: ['In this lab the thicker layer is the liquid you put in more of, so the two layers can be told apart without their colour.'] },
        'In this lab the thicker layer is the liquid you put in more of, so the two layers can be told apart without their colour.',
        [],
        'the amounts are its set-up, 3 mL of one liquid and 1.5 mL of the other (spec 25.2). Four of the five liquids have no colour.',
      ),
    ],
  },
  {
    id: 'salt',
    heading: 'Why salt comes apart in water',
    paragraphs: [
      paragraph(
        { label: 'Salt', terms: ['ions'] },
        'Table salt is built of charged particles called ions: positive sodium ions and negative chloride ions, packed together in a crystal.',
        [[DISSOLVING, `${DISSOLUTION}, the paragraph on the crystal`, 'the crystal of table salt is made of positive and negative ions in turn.']],
      ),
      paragraph(
        { label: 'In water' },
        'A water molecule turns its negative end to a sodium ion and its positive end to a chloride ion. Many water molecules together pull the ions out of the crystal and then surround each one. The salt has dissolved.',
        [[DISSOLVING, `${DISSOLUTION}, the two paragraphs on the crystal and on solvation`, 'the oxygen end of water is drawn to the sodium ions and the hydrogen end to the chloride ions, that the polar molecules take the crystal apart, and that each ion is then surrounded by water molecules.']],
      ),
      paragraph(
        { label: 'In oil' },
        'An oil molecule has no charged ends to pull with. The ions stay together in the crystal, and the salt stays at the bottom.',
        [
          [SOLVENT, 'in the section on the classification of solvents, the paragraph on what dissolves what', 'salts dissolve in very polar liquids and in no others, and that oils are strongly nonpolar.'],
          [DISSOLVING, `${DISSOLUTION}, the paragraph on the crystal`, 'it is because water is polar that it is drawn to the crystal.'],
        ],
        'that an oil has nothing to pull with is how the card puts the two passages together: no page that was read says in so many words why salt stays whole in oil.',
      ),
      paragraph(
        { label: 'Sugar' },
        'Sugar is not made of ions. Its molecules carry many O–H groups, and water molecules hold on to those.',
        [[DISSOLVING, `${DISSOLUTION}, the paragraph on table sugar`, 'sugar is a compound of molecules, which water parts from one another, and that their many O–H groups make hydrogen bonds with water.']],
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'Rubbing alcohol' },
        'Rubbing alcohol catches fire easily, and so does its vapour, which is heavier than air and can reach a flame some way off. A real bench of this lab has no flame and nothing hot on it. The alcohol irritates the eyes and, mildly, the skin: eye protection and gloves are worn.',
        [
          [ALCOHOL_SHEET, "the sheet's sections 2 and 8", '2-propanol of 40% to 90% in water is a highly flammable liquid with a highly flammable vapour, is kept from heat, flames and hot surfaces, irritates the eyes seriously and the skin mildly, and is handled with eye protection and gloves.'],
          [ALCOHOL_RECORD, 'the fields General Description and Fire Hazard', 'the vapour of the alcohol is heavier than air and may travel to something that lights it.'],
        ],
      ),
      paragraph(
        { label: 'Kitchen things' },
        'The salt, the sugar, the vinegar and the oils stand among laboratory chemicals here. Nothing on a laboratory bench is tasted, not even a food.',
        [[SUGAR_SHEET, "the sheet's section 2", 'sugar kept with laboratory chemicals is treated as one of them and is not eaten.']],
      ),
      paragraph(
        { label: 'Waste' },
        "How anything is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [],
        "that disposal is decided by the laboratory's own rules and local regulations, and that the supervisor is asked, is the project's rule for every lab (spec 5.2): no method of disposal is given.",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first paragraph names them. */
export const READ_FIRST = readFirstOf(MIXING_PRIMER)
