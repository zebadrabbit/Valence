import data from './periodic-table.json'
import { periodicTableSchema, type PeriodicElement } from './schema'

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

// A source and the passage read there. "…" marks words left out and square brackets mark words put in.
export type Passage = readonly [sourceId: string, passage: string]

const openstax = (section: string) => `openstax-chem2e-${section}`
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

const RED_BOOK_BLOCKS: Passage = [
  RED_BOOK,
  '“Optionally, the letters s, p, d and f may be used to distinguish different blocks of elements. For example, the elements of groups 3–12 are the d-block elements. These elements are also commonly referred to as the transition elements, though the elements of group 12 are not always included; the f-block elements are sometimes referred to as the inner transition elements.”',
]
const RED_BOOK_GROUP_NAMES: Passage = [
  RED_BOOK,
  '“If appropriate for a particular purpose, the various groups may be named from the first element in each, for example elements of the boron group (B, Al, Ga, In, Tl), elements of the titanium group (Ti, Zr, Hf, Rf), etc.”',
]
const OPENSTAX_FAMILY_NAMES: Passage = [
  openstax('2.5'),
  '“Other groups with specific names are the pnictogens (group 15), chalcogens (group 16), halogens (group 17), and the noble gases (group 18, also known as inert gases). The groups can also be referred to by the first element of the group: For example, the chalcogens can be called the oxygen group or oxygen family.”',
]
const OPENSTAX_VALENCE_SHELLS: Passage = [
  openstax('18.4'),
  '“For example, members of group 15 have five valence electrons and require only three additional electrons to fill their valence shells. … The elements of group 16 require only two additional electrons. … The halogens form diatomic molecules in which each atom is involved in only one bond. This provides the electron required necessary to complete the octet on the halogen atom.”',
]
const OPENSTAX_TRANSITION_SERIES: Passage = [
  openstax('19.1'),
  '“The d-block elements are divided into the first transition series (the elements Sc through Cu), the second transition series (the elements Y through Ag), and the third transition series (the element La and the elements Hf through Au). Actinium, Ac, is the first member of the fourth transition series, which also includes Rf through Rg. The f-block elements are the elements Ce through Lu, which constitute the lanthanide series (or lanthanoid series), and the elements Th through Lr, which constitute the actinide series (or actinoid series). Because lanthanum behaves very much like the lanthanide elements, it is considered a lanthanide element, even though its electron configuration makes it the first member of the third transition series. Similarly, the behavior of actinium means it is part of the actinide series, although its electron configuration makes it the first member of the fourth transition series.”',
]
const IUPAC_GROUP_3: Passage = [
  IUPAC_TABLE,
  '“The question of precisely which elements should be placed in group 3 has been debated from time to time. An IUPAC project has been recently initiated to resolve the question. Will group 3 consist of Sc, Y, Lu, and Lr or, will it consist of Sc, Y, La and Ac?”',
]
const VALENCE_COUNT = 'the valence electrons, as the electrons in the outermost shell of each configuration PubChem lists'
const S_AND_D_COUNT = 'the outer s and d electrons, from each configuration PubChem lists'

// `text` takes the members' names, lightest first.
type Group = { name?: string; text: (members: string[]) => string; passages: Passage[]; derived: string }

// "The iron group" is also used for iron, cobalt and nickel, so group 8's text says which is meant.
const transitionGroup = (group: number): Group => ({
  text: (members) =>
    `The ${members[0]} group${group === 8 ? ' (group 8)' : ''}: ${list(members)}. They are transition metals, and each atom has ${group} electrons in its outer s and d subshells. Transition metals form compounds in a wide range of oxidation states.`,
  passages: [
    RED_BOOK_GROUP_NAMES,
    [openstax('19.1'), '“As shown in Figure 19.2, the d-block elements in groups 3–11 are transition elements. … Transition metals can form compounds with a wide range of oxidation states.”'],
  ],
  derived: S_AND_D_COUNT,
})

const GROUPS: Record<number, Group> = {
  1: {
    name: 'Hydrogen and the alkali metals',
    text: (members) =>
      `Hydrogen and the alkali metals: ${list(members.slice(1))}. Hydrogen is a nonmetal, not an alkali metal. Each atom has 1 valence electron, and an alkali metal loses it easily to form a 1+ ion. The alkali metals are soft, very reactive metals that react with water to give hydrogen gas and a basic solution.`,
    passages: [
      [
        openstax('18.1'),
        '“The alkali metals lithium, sodium, potassium, rubidium, cesium, and francium constitute group 1 of the periodic table. Although hydrogen is in group 1 (and also in group 17), it is a nonmetal and deserves separate consideration later in this chapter. … This combination makes it very easy to remove the single electron in the outermost (valence) shell of each. The easy loss of this valence electron means that these metals readily form stable cations with a charge of 1+. … The solid alkali metals are very soft … The alkali metals all react vigorously with water to form hydrogen gas and a basic solution of the metal hydroxide. … These metals are so reactive that it is necessary to avoid contact with both moisture and oxygen in the air.”',
      ],
      [openstax('2.5'), '“These elements (except hydrogen) are known as alkali metals, and they all have similar chemical properties.”'],
    ],
    derived: VALENCE_COUNT,
  },
  2: {
    name: 'Alkaline earth metals',
    // "Reactive", where the passage says "very reactive" of the whole group: beryllium is not.
    text: (members) =>
      `${capital(list(members))}. Each atom has 2 valence electrons and readily loses both, so these metals have an oxidation state of +2 in their compounds. They are reactive metals, though less so than the alkali metals.`,
    passages: [
      [
        openstax('18.1'),
        '“The alkaline earth metals (beryllium, magnesium, calcium, strontium, barium, and radium) constitute group 2 of the periodic table. … The higher ionization energy makes the alkaline earth metals less reactive than the alkali metals; however, they are still very reactive elements. … In chemical reactions, these metals readily lose both valence electrons to form compounds in which they exhibit an oxidation state of 2+.”',
      ],
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
      [
        openstax('18.1'),
        '“The d orbitals fill with the elements in group 11; therefore, the elements in group 12 qualify as representative elements because the last electron enters an s orbital. … Group 12 contains the four elements zinc, cadmium, mercury, and copernicium. Each of these elements has two electrons in its outer shell … When atoms of these metals form cations with a charge of 2+, where the two outer electrons are lost, they have pseudo-noble gas electron configurations. Mercury is sometimes an exception because it also exhibits an oxidation state of 1+ …”',
      ],
      RED_BOOK_BLOCKS,
    ],
    derived: S_AND_D_COUNT,
  },
  13: {
    text: (members) =>
      `The boron group: ${list(members)}. Each atom has 3 valence electrons. Boron is a metalloid; aluminum, gallium, indium and thallium are metals. Aluminum usually has an oxidation state of +3 in its compounds; gallium, indium and thallium show +3 and also +1.`,
    passages: [
      RED_BOOK_GROUP_NAMES,
      [
        openstax('18.1'),
        '“Group 13 contains the metalloid boron and the metals aluminum, gallium, indium, and thallium. … Aluminum normally uses all of its valence electrons when it reacts, giving compounds in which it has an oxidation state of 3+. … These three elements [gallium, indium, and thallium] exhibit not only the expected oxidation state of 3+ from the three valence electrons but also an oxidation state (in this case, 1+) that is two below the expected value.”',
      ],
    ],
    derived: VALENCE_COUNT,
  },
  14: {
    text: (members) =>
      `The carbon group: ${list(members)}. Each atom has 4 valence electrons. Carbon is a nonmetal, silicon and germanium are metalloids, and tin and lead are metals. Tin and lead form 2+ ions, and also compounds in which their oxidation state is +4.`,
    passages: [
      RED_BOOK_GROUP_NAMES,
      [
        openstax('18.1'),
        '“The metallic members of group 14 are tin, lead, and flerovium. Carbon is a typical nonmetal. The remaining elements of the group, silicon and germanium, are examples of semimetals or metalloids. Tin and lead form the stable divalent cations, Sn²⁺ and Pb²⁺, with oxidation states two below the group oxidation state of 4+. … Tin and lead also form covalent compounds with a formal 4+-oxidation state.”',
      ],
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
      [openstax('18.1'), '“Bismuth, the heaviest member of group 15, is a less reactive metal than the other representative metals.”'],
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
      [
        openstax('18.11'),
        '“The elements in group 17 are the halogens. These are the elements fluorine, chlorine, bromine, iodine, and astatine. These elements are too reactive to occur freely in nature, but their compounds are widely distributed. … All of the halogens occur in seawater as halide ions.”',
      ],
      OPENSTAX_VALENCE_SHELLS,
      [openstax('6.4'), '“… and the halogens fluorine and chlorine each have seven valence electrons.”'],
    ],
    derived: VALENCE_COUNT,
  },
  18: {
    name: 'Noble gases',
    text: (members) =>
      `${capital(list(members))}. Their atoms have filled valence shells: 2 electrons in helium and 8 in the others. Helium to radon are gases at room temperature, with very low melting and boiling points. They were assumed to be unreactive until 1962; krypton and xenon form compounds with fluorine.`,
    passages: [
      [
        openstax('18.12'),
        '“The elements in group 18 are the noble gases (helium, neon, argon, krypton, xenon, and radon). They earned the name “noble” because they were assumed to be nonreactive since they have filled valence shells. In 1962, … proved this assumption to be false. … The boiling points and melting points of the noble gases are extremely low relative to those of other substances of comparable atomic or molecular masses. … Krypton forms a difluoride, KrF₂, which is thermally unstable at room temperature. Stable compounds of xenon form when xenon reacts with fluorine.”',
      ],
    ],
    derived: 'the electrons in the outermost shell of each configuration PubChem lists; and gas, as the standard state PubChem lists for helium to radon',
  },
}

// What the Royal Society of Chemistry's page says of each element from rutherfordium on. All but three say it in the same words.
const FEW_ATOMS = 'A highly radioactive metal, of which only a few atoms have ever been made.'
const FEW_ATOMS_OTHERWISE: Record<string, string> = {
  Rf: 'A radioactive metal that does not occur naturally. Relatively few atoms have ever been made.',
  Sg: 'A radioactive metal that does not occur naturally. Only a few atoms have ever been made.',
  Bh: 'Bohrium does not occur naturally and only a few atoms have ever been made.',
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
    [...authored.passages, ...fewAtoms.map((e): Passage => [RSC, `on the page for ${e.name.toLowerCase()}, “${FEW_ATOMS_OTHERWISE[e.symbol] ?? FEW_ATOMS}”`])],
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
      [
        openstax('6.4'),
        '“Beginning with hydrogen, and continuing across the periods of the periodic table, we add one proton at a time to the nucleus and one electron to the proper subshell until we have described the electron configurations of all the elements. … The filling order simply begins at hydrogen and includes each subshell as you proceed in increasing Z order. For example, after filling the 3p block up to Ar, we see the orbital will be 4s (K, Ca), followed by the 3d orbitals. … Note that for three series of elements, scandium (Sc) through copper (Cu), yttrium (Y) through silver (Ag), and lanthanum (La) through gold (Au), a total of 10 d electrons are successively added to the (n – 1) shell next to the n shell to bring that (n – 1) shell from 8 to 18 electrons. For two series, lanthanum (La) through lutetium (Lu) and actinium (Ac) through lawrencium (Lr), 14 f electrons … are successively added to the (n – 2) shell to bring that shell from 18 electrons to a total of 32 electrons.”',
      ],
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
          '“The s block includes the alkali metals and alkaline earth metals. … The s block also contains hydrogen and helium, which are non-metals and gases. The elements of the s block have their valence electrons in s orbitals. The s sub-shell can contain a maximum of two electrons. This explains why the block is two columns wide.”',
        ],
        [openstax('6.4'), '“Following hydrogen is the noble gas helium, which has an atomic number of 2. … The second electron also goes into the 1s orbital and fills that orbital.”'],
      ],
      `${derived}; and that every configuration PubChem lists for the block has its outermost electrons in an s subshell`,
    )
  }
  if (block === 'p') {
    return description(
      `Groups 13 to 18, without helium: ${count}, in 6 columns because a p subshell holds 6 electrons. The block holds every nonmetal except hydrogen and helium, all the metalloids, and some metals.`,
      [
        RED_BOOK_BLOCKS,
        [RSC, '“The p block consists of elements with quite varied properties. It contains non-metals, metalloids and metals. … The p sub-shell can hold a maximum of six electrons, in three distinct orbitals.”'],
        [
          openstax('6.4'),
          '“Main group elements (sometimes called representative elements) are those in which the last electron added enters an s or a p orbital in the outermost shell … This category includes all the nonmetallic elements, as well as many metals and the metalloids.”',
        ],
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
        [openstax('6.4'), '“This subshell is filled to its capacity with 10 electrons (remember that for l = 2 [d orbitals], there are 2l + 1 = 5 values of ml, meaning that there are five d orbitals that have a combined capacity of 10 electrons).”'],
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
        [openstax('19.1'), '“The f-block elements, also called inner transition metals (the lanthanides and actinides), …”'],
        OPENSTAX_TRANSITION_SERIES,
        [
          openstax('6.4'),
          '“For two series, lanthanum (La) through lutetium (Lu) and actinium (Ac) through lawrencium (Lr), 14 f electrons (l = 3, 2l + 1 = 7 ml values; thus, seven orbitals with a combined capacity of 14 electrons) are successively added to the (n – 2) shell … Lanthanum and actinium, because of their similarities to the other members of the series, are included and used to name the series, even though they are transition metals with no f electrons.”',
        ],
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
      '“In the course of many discussions held by the task group we have concluded that there is no objective means to adjudicate between group 3 consisting of Sc, Y, La and Ac or as Sc, Y, Lu and Lr. This situation makes it more important that IUPAC should make a ruling on the question … Perhaps a compromise could be reached on the table depicted as figure 2 since it achieves three desiderata.” Figure 2 is the table “with group 3 shown as containing … Sc, Y, Lu and Lr (middle)”. That IUPAC has not ruled since rests on its own page, quoted above, which still puts the question as open.',
    ],
  ],
)

export type Category = PeriodicElement['category']

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
      [
        openstax('18.4'),
        '“Under normal conditions, more than half of the nonmetals are gases, one is a liquid, and the rest include some of the softest and hardest of solids. … The noble gases are all monatomic, whereas the other nonmetal gases—hydrogen, nitrogen, oxygen, fluorine, and chlorine—normally exist as the diatomic molecules H₂, N₂, O₂, F₂, and Cl₂. The other halogens are also diatomic; Br₂ is a liquid and I₂ exists as a solid under normal conditions.”',
      ],
      [openstax('18.12'), '“The elements in group 18 are the noble gases (helium, neon, argon, krypton, xenon, and radon).”'],
    ],
    'the family PubChem lists each of the ten under',
  ),
  // "Sources differ", not the spec's "textbooks differ": one textbook was read, and the other list is PubChem's.
  description(
    "Sources differ on which elements are metalloids. OpenStax Chemistry 2e lists six: boron, silicon, germanium, arsenic, antimony and tellurium. PubChem's table adds polonium, which PubChem's own page for polonium classes as a metal.",
    [
      [
        openstax('18.3'),
        '“A series of six elements called the metalloids separate the metals from the nonmetals in the periodic table. The metalloids are boron, silicon, germanium, arsenic, antimony, and tellurium.”',
      ],
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
    [[RSC, `on the page for each of the ten, “${FEW_ATOMS}”`]],
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
