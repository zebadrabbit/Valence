import data from './periodic-table.json'
import { periodicTableSchema, type PeriodicElement } from './schema'
import sources from './sources.json'
import { located } from './support'

/**
 * Shown wherever a source lists no value for an element. Deliberately not "not measured": an empty
 * cell in these sources does not always mean that (periodic table spec 5.1).
 */
export const NO_VALUE = 'no value listed'

// periodic-table.json is written by `npm run build:data` from the saved downloads and decisions.json under
// docs/research/periodic-table/; edit the script or its inputs, not that file.
/** All 118 elements, by atomic number. */
export const periodicTable: readonly PeriodicElement[] = periodicTableSchema.parse(data)

export type Block = 's' | 'p' | 'd' | 'f'
export type ElementPosition = { period: number; group: number | null; block: Block; row: number; column: number }

// The atomic number that ends each period: the noble gases.
const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118]

/**
 * Where an element sits (periodic table spec 5.4). Rows 1 to 7 are the main table, where the row is the
 * period and the column is the group. Lanthanum and actinium are in group 3, in the d block. The f block,
 * cerium to lutetium and thorium to lawrencium, has no group number and is drawn in rows 9 and 10 under
 * columns 4 to 17. Helium is in group 18 and in the s block.
 */
export function elementPosition(atomicNumber: number): ElementPosition {
  const period = PERIOD_ENDS.findIndex((end) => atomicNumber <= end) + 1
  const end = PERIOD_ENDS[period - 1]
  if (!Number.isInteger(atomicNumber) || atomicNumber < 1 || end === undefined) throw new Error(`no element has atomic number ${atomicNumber}`)
  const fromLeft = atomicNumber - (PERIOD_ENDS[period - 2] ?? 0)
  if (period >= 6 && fromLeft >= 4 && fromLeft <= 17) return { period, group: null, block: 'f', row: period + 3, column: fromLeft }
  // The first columns are counted from the left (three of them once there is an f block to step over), the
  // rest from the noble gas at the right. Helium is a noble gas.
  const column = atomicNumber !== 2 && fromLeft <= (period >= 6 ? 3 : 2) ? fromLeft : 18 - (end - atomicNumber)
  const block = column <= 2 || atomicNumber === 2 ? 's' : column <= 12 ? 'd' : 'p'
  return { period, group: column, block, row: period, column }
}

// The noble-gas cores a configuration can start from, each written as a configuration itself.
const CORES: Record<string, string> = {
  He: '1s2',
  Ne: '[He]2s2 2p6',
  Ar: '[Ne]3s2 3p6',
  Kr: '[Ar]4s2 3d10 4p6',
  Xe: '[Kr]5s2 4d10 5p6',
  Rn: '[Xe]6s2 4f14 5d10 6p6',
}

/**
 * Electrons per shell, innermost first, counted from a configuration as PubChem writes it: an optional
 * noble-gas core, with or without a space after it, then subshells in any order ("[Ar]4s1 3d10"). Takes
 * the stored text, which carries no "(predicted)" or "(calculated)" marking. Throws on anything else.
 */
export function shellsFromConfiguration(text: string): number[] {
  const fail = (): never => {
    throw new Error(`unreadable electron configuration "${text}"`)
  }
  const subshells = (part: string): string[] => {
    const [, core, rest = ''] = /^(?:\[(\w*)\])? ?(.*)$/.exec(part) ?? fail()
    return [...(core === undefined ? [] : subshells(CORES[core] ?? fail())), ...rest.split(' ')]
  }
  const shells: number[] = []
  const seen = new Set<string>()
  for (const subshell of subshells(text)) {
    const [, shell = '', letter = '', count] = /^([1-7])([spdf])(\d+)$/.exec(subshell) ?? fail()
    const n = Number(shell)
    const l = 'spdf'.indexOf(letter)
    const electrons = Number(count)
    // Shell n has subshells up to l = n - 1, and a subshell holds 2(2l + 1) electrons.
    if (l >= n || electrons < 1 || electrons > 4 * l + 2 || seen.has(shell + letter)) fail()
    seen.add(shell + letter)
    shells[n - 1] = (shells[n - 1] ?? 0) + electrons
  }
  return Array.from(shells, (electrons) => electrons ?? 0)
}

/**
 * What the members of a group, period or block share (periodic table spec 5.7): the sentences shown, the
 * sources behind them, and the passages read in those sources, which are kept for review and not shown.
 */
export type Description = { name?: string; text: string; sourceIds: string[]; support: string }

// A source and what was read there. No source is quoted: a passage is given by `located`, which says where it is
// and, in this project's own words, what it establishes. The lines of PubChem's pages and table are the one
// exception: they are given as they read, being labels and values and not prose.
export type Passage = readonly [sourceId: string, passage: string]

// `located` is in support.ts, where a file that needs nothing else of this one can take it. It is still exported here.
export { located }

/** A passage of a section of OpenStax Chemistry 2e, at the address its citation in sources.json gives. */
export function openstaxPassage(section: string, where: string, establishes: string): Passage {
  const id = `openstax-chem2e-${section}`
  const url = sources.find((s) => s.id === id)?.url
  if (!url) throw new Error(`the descriptions cite an unknown source "${id}"`)
  return [id, located(url, `section ${section}, ${where}`, establishes)]
}
const RED_BOOK = 'iupac-red-book-2005'
const IUPAC_TABLE = 'iupac-periodic-table'
const RSC = 'rsc-periodic-table'
const PUBCHEM_PAGES = 'pubchem-element-pages'
const PUBCHEM_TABLE = 'pubchem-periodic-table'
const IUPAC_GROUP_3_REPORT = 'iupac-group-3-report-2021'

// `derived` says which sentences are counted from this table and not read in a source; a test does the counting.
export function description(text: string, passages: readonly Passage[], derived?: string, name?: string): Description {
  return {
    ...(name ? { name } : {}),
    text,
    sourceIds: [...new Set(passages.map(([id]) => id))],
    support: [...passages.map(([id, passage]) => `${id}: ${passage}`), ...(derived ? [`Counted from this table: ${derived}.`] : [])].join('\n'),
  }
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const list = (items: readonly string[]) => (items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const membersWhere = (test: (position: ElementPosition) => boolean) => periodicTable.filter((e) => test(elementPosition(e.atomicNumber)))
const names = (members: readonly PeriodicElement[]) => members.map((e) => e.name.toLowerCase())

const RED_BOOK_URL = 'https://iupac.org/wp-content/uploads/2016/07/Red_Book_2005.pdf'
const RED_BOOK_SECTION = 'section IR-3.5, “Elements in the periodic table” (p 51)'
const IUPAC_TABLE_URL = 'https://iupac.org/what-we-do/periodic-table-of-elements/'
const RSC_URL = 'https://periodic-table.rsc.org/'
const RED_BOOK_BLOCKS: Passage = [
  RED_BOOK,
  located(
    RED_BOOK_URL,
    RED_BOOK_SECTION,
    'the blocks of the table may be told apart by the letters s, p, d and f; that groups 3 to 12 are the d block, whose elements are commonly called the transition elements, with group 12 not always counted among them; and that the f-block elements are sometimes called the inner transition elements.',
  ),
]
const RED_BOOK_GROUP_NAMES: Passage = [
  RED_BOOK,
  located(RED_BOOK_URL, RED_BOOK_SECTION, 'a group may be named after its first element, with the boron group and the titanium group as examples.'),
]
const OPENSTAX_FAMILY_NAMES: Passage = openstaxPassage(
  '2.5',
  'the passage on the groups that have names of their own',
  'groups 15 to 18 have names of their own, the pnictogens, chalcogens, halogens and noble gases, and the noble gases are also called the inert gases; and that a group can also be named after its first element, so that the chalcogens are also known as the oxygen group or family.',
)
const OPENSTAX_VALENCE_SHELLS: Passage = openstaxPassage(
  '18.4',
  'the passage on the valence electrons of groups 15, 16 and 17',
  'an atom of group 15 has five valence electrons and needs three more for a full valence shell; that an atom of group 16 needs two more; and that in the two-atom molecule of a halogen each atom takes part in a single bond, which gives it the one electron that completes its octet.',
)
const OPENSTAX_TRANSITION_SERIES: Passage = openstaxPassage(
  '19.1',
  'the passage on the transition series and on the lanthanide and actinide series',
  'the d block divides into transition series: scandium to copper, yttrium to silver, and lanthanum with hafnium to gold, with actinium heading a fourth series that also takes in rutherfordium to roentgenium; that cerium to lutetium, of the f block, make up the lanthanide series and thorium to lawrencium the actinide series; and that lanthanum and actinium, which are each the first member of a transition series by electron configuration, are counted as a lanthanide and an actinide because of how they behave.',
)
const IUPAC_GROUP_3: Passage = [
  IUPAC_TABLE,
  located(
    IUPAC_TABLE_URL,
    'note 7, “Group 3”',
    'which elements belong in group 3 is an open question, which an IUPAC project was set up to settle: scandium and yttrium with lutetium and lawrencium, or with lanthanum and actinium.',
  ),
]
const VALENCE_COUNT = 'the valence electrons, as the electrons in the outermost shell of each configuration PubChem lists'
const S_AND_D_COUNT = 'the outer s and d electrons, from each configuration PubChem lists'

// `text` takes the members' names, lightest first.
type Group = { name?: string; text: (members: string[]) => string; passages: Passage[]; derived: string }

// "The iron group" is also used for iron, cobalt and nickel, so group 8's text says which is meant.
const transitionGroup = (group: number): Group => ({
  text: (members) =>
    `The ${members[0]} group${group === 8 ? ' (group 8)' : ''}: ${list(members)}. They are transition metals, and each atom has ${group} electrons in its outer s and d subshells. Transition metals form compounds in many different oxidation states.`,
  passages: [
    RED_BOOK_GROUP_NAMES,
    openstaxPassage(
      '19.1',
      'Figure 19.2 and the passage on the oxidation states of transition metals',
      'the elements of groups 3 to 11 in the d block are transition elements, and that transition metals form compounds in many different oxidation states.',
    ),
  ],
  derived: S_AND_D_COUNT,
})

const GROUPS: Record<number, Group> = {
  1: {
    name: 'Hydrogen and the alkali metals',
    text: (members) =>
      `Hydrogen and the alkali metals: ${list(members.slice(1))}. Hydrogen is a nonmetal, not an alkali metal. Each atom has 1 valence electron, and an alkali metal loses it easily to form a 1+ ion. The alkali metals are soft, very reactive metals that react with water, releasing hydrogen gas and leaving a basic solution.`,
    passages: [
      openstaxPassage(
        '18.1',
        'the passage on the alkali metals',
        'the alkali metals, lithium to francium, make up group 1; that hydrogen sits in group 1 (and in group 17 as well) but is a nonmetal, taken up separately; that each alkali metal gives up its one valence electron very easily and so readily forms stable ions of charge 1+; that the solid metals are very soft; that all of them react vigorously with water, releasing hydrogen and leaving a basic solution of the hydroxide; and that they are reactive enough to have to be kept away from moisture and from the oxygen of the air.',
      ),
      openstaxPassage('2.5', 'the passage on group 1', 'the members of group 1 other than hydrogen are called the alkali metals and are alike in their chemistry.'),
    ],
    derived: VALENCE_COUNT,
  },
  2: {
    name: 'Alkaline earth metals',
    // "Reactive", where the passage says "very reactive" of the whole group: beryllium is not.
    text: (members) =>
      `${capital(list(members))}. Each atom has 2 valence electrons and readily loses both, so these metals have an oxidation state of +2 in their compounds. They are reactive metals, though less so than the alkali metals.`,
    passages: [
      openstaxPassage(
        '18.1',
        'the passage on the alkaline earth metals',
        'the alkaline earth metals, beryllium to radium, make up group 2; that their higher ionization energies leave them less reactive than group 1, though still very reactive; and that in reactions they readily give up both valence electrons, forming compounds in which their oxidation state is 2+.',
      ),
    ],
    derived: VALENCE_COUNT,
  },
  3: {
    text: (members) =>
      `${capital(list(members))}. Each atom has 3 electrons in its outer s and d subshells. Lanthanum and actinium are transition metals by their electron configurations, and are also counted among the lanthanides and the actinides because they behave like them. Which elements belong below yttrium is debated: see the note on group 3.`,
    passages: [OPENSTAX_TRANSITION_SERIES, IUPAC_GROUP_3],
    derived: S_AND_D_COUNT,
  },
  4: transitionGroup(4),
  5: transitionGroup(5),
  6: transitionGroup(6),
  7: transitionGroup(7),
  8: transitionGroup(8),
  9: transitionGroup(9),
  10: transitionGroup(10),
  11: transitionGroup(11),
  12: {
    text: (members) =>
      `${capital(list(members))}. Each atom has a full d subshell and 2 outer s electrons. Zinc, cadmium and mercury lose those 2 electrons to form 2+ ions, and mercury also has an oxidation state of +1 in some compounds. Group 12 is not always counted among the transition metals.`,
    passages: [
      openstaxPassage(
        '18.1',
        'the passage on group 12',
        'the d orbitals are filled by group 11, so that the elements of group 12, whose last electron goes into an s orbital, count as representative elements; that the group holds four elements, zinc to copernicium, each having two outer-shell electrons; that when these metals lose those two electrons as ions of charge 2+ they are left with pseudo-noble gas configurations; and that mercury also shows an oxidation state of 1+.',
      ),
      RED_BOOK_BLOCKS,
    ],
    derived: S_AND_D_COUNT,
  },
  13: {
    text: (members) =>
      `The boron group: ${list(members)}. Each atom has 3 valence electrons. Boron is a metalloid; aluminum, gallium, indium and thallium are metals. In its compounds aluminum usually has the oxidation state +3; gallium, indium and thallium show +3 and also +1.`,
    passages: [
      RED_BOOK_GROUP_NAMES,
      openstaxPassage(
        '18.1',
        'the passage on group 13',
        'boron, in group 13, is a metalloid and aluminum, gallium, indium and thallium are metals; that aluminum normally reacts using all its valence electrons, so that its compounds have it in oxidation state 3+; and that gallium, indium and thallium show, besides the 3+ their three valence electrons lead one to expect, an oxidation state of 1+, two below it.',
      ),
    ],
    derived: VALENCE_COUNT,
  },
  14: {
    text: (members) =>
      `The carbon group: ${list(members)}. Each atom has 4 valence electrons. Carbon is a nonmetal, silicon and germanium are metalloids, and tin and lead are metals. Tin and lead form 2+ ions, and also compounds in which their oxidation state is +4.`,
    passages: [
      RED_BOOK_GROUP_NAMES,
      openstaxPassage(
        '18.1',
        'the passage on group 14',
        "in group 14 tin, lead and flerovium are the metals, carbon is a nonmetal, and silicon and germanium are metalloids; that tin and lead form stable ions of charge 2+, Sn²⁺ and Pb²⁺, two below the group's oxidation state of 4+; and that they also make covalent compounds in which their formal oxidation state is 4+.",
      ),
    ],
    derived: VALENCE_COUNT,
  },
  15: {
    name: 'Pnictogens',
    text: (members) =>
      `${capital(list(members))}. Each atom has 5 valence electrons, so 3 more fill the valence shell. The group runs from the nonmetals nitrogen and phosphorus, through the metalloids arsenic and antimony, to the metal bismuth.`,
    passages: [
      OPENSTAX_FAMILY_NAMES,
      OPENSTAX_VALENCE_SHELLS,
      openstaxPassage('18.1', 'the passage on bismuth', 'bismuth, the heaviest of the group 15 elements, is a metal, though less reactive than the other metals among the representative elements.'),
    ],
    derived: `${VALENCE_COUNT}; and nonmetal, metalloid and metal, as the categories PubChem lists`,
  },
  16: {
    name: 'Chalcogens',
    text: (members) => `${capital(list(members))}; also called the oxygen group. Each atom has 6 valence electrons, so 2 more fill the valence shell.`,
    passages: [OPENSTAX_FAMILY_NAMES, OPENSTAX_VALENCE_SHELLS],
    derived: VALENCE_COUNT,
  },
  17: {
    name: 'Halogens',
    // Astatine is left out of the last sentence: OpenStax speaks of all five, but two-atom molecules of astatine are not established.
    text: (members) =>
      `${capital(list(members))}. Each atom has 7 valence electrons, 1 short of a full valence shell. Fluorine, chlorine, bromine and iodine form two-atom molecules; they are too reactive to occur free in nature, and are found as halide ions.`,
    passages: [
      openstaxPassage(
        '18.11',
        'the passages on which elements the halogens are and on where they occur',
        'the halogens, fluorine to astatine, make up group 17; that they react too readily to be found uncombined in nature, though their compounds are widespread; and that every halogen is present in seawater as the halide ion.',
      ),
      OPENSTAX_VALENCE_SHELLS,
      openstaxPassage('6.4', 'the passage on the valence electrons of fluorine and chlorine', 'fluorine and chlorine, both halogens, have seven valence electrons apiece.'),
    ],
    derived: VALENCE_COUNT,
  },
  18: {
    name: 'Noble gases',
    text: (members) =>
      `${capital(list(members))}. Their atoms have filled valence shells: 2 electrons in helium and 8 in the others. Helium to radon are gases at room temperature, with very low melting and boiling points. They were assumed to be unreactive until 1962; krypton and xenon form compounds with fluorine.`,
    passages: [
      openstaxPassage(
        '18.12',
        'the passages on the name of the noble gases, on their melting and boiling points and on the compounds of krypton and xenon',
        'the noble gases, helium to radon, make up group 18, and were named noble because their filled valence shells led to the assumption that they did not react, an assumption shown wrong in 1962; that they melt and boil at temperatures far lower than other substances of similar atomic or molecular mass; that the difluoride of krypton, KrF₂, is not stable at room temperature; and that xenon forms stable compounds by reacting with fluorine.',
      ),
    ],
    derived: 'the electrons in the outermost shell of each configuration PubChem lists; and gas, as the standard state PubChem lists for helium to radon',
  },
}

// Where the Royal Society of Chemistry's page for an element from rutherfordium on says that few atoms of it have
// been made: under "Appearance" on every page but bohrium's.
const FEW_ATOMS_HEADING = (symbol: string) => `“Uses and properties”, under “${symbol === 'Bh' ? 'Natural abundance' : 'Appearance'}”`
const fewAtomsPassage = (e: PeriodicElement): Passage => {
  const name = e.name.toLowerCase()
  return [RSC, located(`${RSC_URL}element/${e.atomicNumber}/${name}`, `the page for ${name}, ${FEW_ATOMS_HEADING(e.symbol)}`, `few atoms of ${name} have ever been made.`)]
}

/** The members of a group, what they share, and the family name where the sources give one. Group 1's name covers hydrogen. */
export function describeGroup(group: number): Description {
  const authored = GROUPS[group]
  if (!authored) throw new Error(`no group ${group}`)
  const members = membersWhere((position) => position.group === group)
  // Elements made a few atoms at a time. From meitnerium on the group's chemistry is not claimed for them (spec 5.5);
  // the chemistry of rutherfordium to hassium has been studied, so of those only the first half is said.
  const fewAtoms = members.filter((e) => e.atomicNumber >= 104)
  const fewAtomsText = (e: PeriodicElement) =>
    e.atomicNumber >= 109 ? `${e.name} is placed here by its atomic number; few atoms of it have ever been made.` : `Few atoms of ${e.name.toLowerCase()} have ever been made.`
  return description(
    [authored.text(names(members)), ...fewAtoms.map(fewAtomsText)].join(' '),
    [...authored.passages, ...fewAtoms.map(fewAtomsPassage)],
    `the members; ${authored.derived}`,
    authored.name,
  )
}

/** How many elements a period holds, from which to which, and the subshells that fill across it. Generated from the table. */
export function describePeriod(period: number): Description {
  const members = membersWhere((position) => position.period === period)
  if (members.length === 0) throw new Error(`no period ${period}`)
  const [first, ...rest] = names(members)
  const below = names(members.filter((e) => elementPosition(e.atomicNumber).row !== period))
  // In filling order: ns, then (n - 2)f and (n - 1)d where the period has them, then np.
  const subshells = [`${period}s`, ...(period >= 6 ? [`${period - 2}f`] : []), ...(period >= 4 ? [`${period - 1}d`] : []), ...(period >= 2 ? [`${period}p`] : [])]
  const fill = subshells.length === 1 ? 'subshell fills' : 'subshells fill'
  return description(
    [
      `${members.length} elements, ${first} ${rest.length === 1 ? 'and' : 'to'} ${rest.at(-1)}`,
      below.length > 0 ? `; ${below.length} of them, ${below[0]} to ${below.at(-1)}, are drawn in a row below the main table` : '',
      `. Across the period the ${list(subshells)} ${fill}.`,
    ].join(''),
    [
      openstaxPassage(
        '6.4',
        'the passage on the order in which subshells fill across the periods',
        'electron configurations are built up from hydrogen onward, adding a proton to the nucleus and an electron to the proper subshell at each step, the subshells being taken in order of increasing atomic number; that once 3p is full at argon, 4s fills next (potassium and calcium) and then 3d; that across scandium to copper, yttrium to silver and lanthanum to gold, 10 d electrons go one by one into the shell below the outermost, taking it from 8 to 18 electrons; and that across lanthanum to lutetium and actinium to lawrencium, 14 f electrons go one by one into the shell two below the outermost, taking it from 18 to 32 electrons.',
      ),
    ],
    'the size of the period, its first and last elements, the elements drawn below, and the subshells, which are those the noble gas ending the period has beyond the one before it',
  )
}

/** Which elements a block holds and why it is as wide as it is. */
export function describeBlock(block: Block): Description {
  const members = membersWhere((position) => position.block === block)
  const count = `${members.length} elements`
  const derived = 'the size of the block and the number of columns it spans'
  if (block === 's') {
    return description(
      `Groups 1 and 2, and helium: ${count}. Their outermost electrons are in an s subshell, and the block is 2 columns wide because an s subshell holds 2 electrons. Helium's 2 electrons fill the 1s subshell, which puts it in this block, but it is drawn in group 18 with the other noble gases.`,
      [
        RED_BOOK_BLOCKS,
        [
          RSC,
          located(
            RSC_URL,
            'the note on the s block, under “Blocks”',
            'the s block holds the alkali metals and the alkaline earth metals, and also hydrogen and helium, which are nonmetals and gases; that its elements have their valence electrons in s orbitals; and that it is two columns wide because an s subshell holds at most two electrons.',
          ),
        ],
        openstaxPassage('6.4', 'the passage on helium', 'in helium, the noble gas that comes after hydrogen with atomic number 2, the second electron also enters the 1s orbital, which it fills.'),
      ],
      `${derived}; and that every configuration PubChem lists for the block has its outermost electrons in an s subshell`,
    )
  }
  if (block === 'p') {
    return description(
      `Groups 13 to 18, without helium: ${count}, in 6 columns because a p subshell holds 6 electrons. The block holds every nonmetal except hydrogen and helium, all the metalloids, and some metals.`,
      [
        RED_BOOK_BLOCKS,
        [RSC, located(RSC_URL, 'the note on the p block, under “Blocks”', 'the p block holds nonmetals, metalloids and metals, and that a p subshell holds at most six electrons.')],
        openstaxPassage(
          '6.4',
          'the passage on main group elements',
          'the main group (or representative) elements are those whose last electron enters an s or p orbital of the outermost shell, and that they include all the nonmetals, many metals and the metalloids.',
        ),
      ],
      `${derived}; and nonmetal, metalloid and metal, as the categories PubChem lists`,
    )
  }
  if (block === 'd') {
    return description(
      `Groups 3 to 12: ${count}, in 10 columns because a d subshell holds 10 electrons. These are the transition metals, though group 12 is not always counted among them. Lanthanum and actinium are counted here, in group 3: see the note on group 3.`,
      [
        RED_BOOK_BLOCKS,
        OPENSTAX_TRANSITION_SERIES,
        openstaxPassage(
          '6.4',
          'the passage on how many electrons a d subshell holds',
          'a d subshell is full at 10 electrons, since for l = 2 the quantum number ml takes five values (2l + 1), giving five d orbitals that between them hold 10.',
        ),
      ],
      derived,
    )
  }
  if (block === 'f') {
    const rows = [9, 10].map((row) => names(members.filter((e) => elementPosition(e.atomicNumber).row === row)))
    return description(
      `${capital(rows.map((row) => `${row[0]} to ${row.at(-1)}`).join(' and '))}: ${count}, 14 in each row because an f subshell holds 14 electrons. They have no group number and are drawn in two rows below the main table. They are also called the inner transition metals. Lanthanum and actinium, the first of the lanthanides and of the actinides, are counted in the d block: see the note on group 3. Thorium is in this block although its atom has no 5f electron in its ground state.`,
      [
        RED_BOOK_BLOCKS,
        openstaxPassage('19.1', 'the passage on the f-block elements', 'the elements of the f block, the lanthanides and the actinides, are also known as the inner transition metals.'),
        OPENSTAX_TRANSITION_SERIES,
        openstaxPassage(
          '6.4',
          'the passage on the lanthanide and actinide series',
          'across lanthanum to lutetium and actinium to lawrencium, 14 f electrons are added one by one to the shell two below the outermost, an f subshell having seven orbitals (l = 3 gives seven values of ml) that between them hold 14 electrons; and that lanthanum and actinium are counted in these series, and give them their names, because they resemble the other members, although they are transition metals and have no f electrons.',
        ),
      ],
      `${derived}, and the first and last element of each row; and that thorium's is the only configuration PubChem lists for the block with no electron in the f subshell being filled ([Rn]7s2 6d2)`,
    )
  }
  throw new Error(`no block ${String(block)}`)
}

/** The one note the page carries on group 3 (periodic table spec 5.4). The descriptions of group 3 and of the d and f blocks point to it. */
export const GROUP_3_NOTE: Description = description(
  "Which elements belong in group 3 below scandium and yttrium is debated: lanthanum and actinium, or lutetium and lawrencium. This table puts lanthanum and actinium there and counts them in the d block, which leaves cerium to lutetium and thorium to lawrencium as the f block, 14 elements in each row. OpenStax Chemistry 2e assigns the blocks this way, and the Royal Society of Chemistry's periodic table is drawn this way. PubChem, the source of most values here, puts lutetium and lawrencium in group 3. A provisional report from an IUPAC task group in 2021 leaned towards lutetium and lawrencium, but IUPAC has not ruled on the question.",
  [
    IUPAC_GROUP_3,
    OPENSTAX_TRANSITION_SERIES,
    [
      RSC,
      'the table is drawn with lanthanum (57) below yttrium, followed by hafnium (72), and actinium (89) below lanthanum, followed by rutherfordium (104); the two rows beneath hold cerium to lutetium (58 to 71) and thorium to lawrencium (90 to 103). Its pages give the block of lanthanum and of actinium as d, and of lutetium and of lawrencium as f.',
    ],
    [
      PUBCHEM_PAGES,
      'the line “Element Group Number” reads “3 - Lanthanide” on the page for lutetium and “3 - Actinide” on the page for lawrencium; on the pages for lanthanum and actinium it reads “- Lanthanide” and “- Actinide”, with no group number.',
    ],
    [
      IUPAC_GROUP_3_REPORT,
      `${located(
        'https://doi.org/10.1515/ci-2021-0115',
        'the second paragraph, and the closing paragraphs of “A very brief history of forms of the periodic table” with Figures 1 to 3',
        'the task group found no objective way to choose between lanthanum and actinium and lutetium and lawrencium for group 3, held that IUPAC should therefore rule on what is a matter of convention, and suggested as a compromise the table of its Figure 2, which has lutetium and lawrencium in group 3.',
      )} That IUPAC has not ruled since rests on its own page, cited above, which still puts the question as open.`,
    ],
  ],
)

type Category = PeriodicElement['category']

/**
 * PubChem's ten categories as the legend lists them (periodic table spec 5.5), in the order the table meets them
 * from the left, with the words shown for one member and for the family. PubChem's "Nonmetal" holds only the
 * nonmetals that are neither halogens nor noble gases, so it is shown as "Other nonmetals".
 */
export const CATEGORIES: readonly { category: Category; member: string; family: string }[] = [
  { category: 'Alkali metal', member: 'alkali metal', family: 'Alkali metals' },
  { category: 'Alkaline earth metal', member: 'alkaline earth metal', family: 'Alkaline earth metals' },
  { category: 'Transition metal', member: 'transition metal', family: 'Transition metals' },
  { category: 'Post-transition metal', member: 'post-transition metal', family: 'Post-transition metals' },
  { category: 'Metalloid', member: 'metalloid', family: 'Metalloids' },
  { category: 'Nonmetal', member: 'other nonmetal', family: 'Other nonmetals' },
  { category: 'Halogen', member: 'halogen', family: 'Halogens' },
  { category: 'Noble gas', member: 'noble gas', family: 'Noble gases' },
  { category: 'Lanthanide', member: 'lanthanide', family: 'Lanthanides' },
  { category: 'Actinide', member: 'actinide', family: 'Actinides' },
]

export const CATEGORY_HEADING = "Chemical family (PubChem's grouping)"

/** The notes the family legend carries (spec 5.5). The categories themselves are PubChem's, with no overrides. */
export const CATEGORY_NOTES: readonly Description[] = [
  // Astatine, tennessine and oganesson are left out: the passages do not speak of them.
  description(
    'Fluorine, chlorine, bromine, iodine and the noble gases helium to radon are nonmetals too; PubChem lists them under their family names.',
    [
      openstaxPassage(
        '18.4',
        'the passage on the states of the nonmetals in ordinary conditions',
        'the nonmetals are mostly gases in ordinary conditions, with one liquid among them; that the noble gases are single atoms, while the other nonmetals that are gases, fluorine and chlorine among them, are two-atom molecules; and that the remaining halogens, bromine (a liquid) and iodine (a solid), are two-atom molecules too.',
      ),
      openstaxPassage('18.12', 'the passage on which elements group 18 holds', 'the noble gases make up group 18, from helium down to radon.'),
    ],
    'the family PubChem lists each of the ten under',
  ),
  // "Sources differ", not the spec's "textbooks differ": one textbook was read, and the other list is PubChem's.
  description(
    "Sources differ on which elements are metalloids. OpenStax Chemistry 2e lists six: boron, silicon, germanium, arsenic, antimony and tellurium. PubChem's table adds polonium, which PubChem's own page for polonium classes as a metal.",
    [
      openstaxPassage(
        '18.3',
        'the passage on which elements are the metalloids',
        'six elements, the metalloids, stand between the metals and the nonmetals in the table: boron, silicon, germanium, arsenic, antimony, tellurium.',
      ),
      [PUBCHEM_PAGES, 'the line “Element Classification” on the page for polonium reads “Metal”.'],
    ],
    "the seven elements PubChem's table lists as metalloids",
  ),
  description(
    'Zinc, cadmium, mercury and copernicium are shown as transition metals; group 12 is not always counted among them.',
    [RED_BOOK_BLOCKS],
    'the members of group 12 and the category PubChem lists for each',
  ),
  // Spec 5.5 has "their chemistry being little known". No passage read says that, so the note says what the pages do say.
  description(
    'Meitnerium to oganesson are placed in their families by position; only a few atoms of each have ever been made.',
    [[RSC, located(RSC_URL, `the element page of each of the ten, ${FEW_ATOMS_HEADING('Mt')}`, 'only a few atoms of the element have ever been made.')]],
    'the first and last of the ten, elements 109 to 118',
  ),
]

/** The properties the table can be coloured by (spec 6). */
export type TrendProperty = 'electronegativity' | 'covalentRadius' | 'ionizationEnergy' | 'meltingPoint' | 'density'

/**
 * What a property's legend says beyond its scale (spec 6). The notes on the elements at the two ends of a scale
 * are taken from those elements' own records, not from here.
 */
export const TREND_NOTES: Readonly<Record<TrendProperty, readonly Description[]>> = {
  electronegativity: [
    description(
      'Among the noble gases PubChem lists a value only for krypton and xenon.',
      [[PUBCHEM_TABLE, 'the Electronegativity column holds 3 for krypton and 2.6 for xenon, and is empty for helium, neon, argon, radon and oganesson.']],
      'the noble gases with a value',
    ),
  ],
  covalentRadius: [],
  ionizationEnergy: [],
  meltingPoint: [],
  density: [
    description(
      'The 11 elements that are gases at room temperature have the lowest densities, all below 0.01 g/cm³, and sit together at the bottom of the scale. Those figures are for the gas at 0 °C and atmospheric pressure.',
      [
        [
          PUBCHEM_TABLE,
          'the Density and StandardState columns. The table does not state the conditions; they were worked out from the values, as the note on the density of each gas says.',
        ],
      ],
      'the gases, as the standard state PubChem lists, and their densities',
    ),
  ],
}
