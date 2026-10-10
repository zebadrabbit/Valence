import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The Group I cations lab's concept primer (spec 17.6): ten short cards for a reader with no chemistry
// background, shown one at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their
// support lines to that: none repeats six words running of a page it rests on. Each paragraph says what it rests
// on in `support`, one line for each passage: either a passage of a source, given where it is and, in this
// project's words, what it establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its
// rules, its model) and is read in no source. The sources are listed in docs/research/cations/sources/MANIFEST.json,
// and the documents of the last card in the hazard manifests of this lab and of the aqueous reactions lab; all
// reach sources.json through `npm run build:data`.
//
// The figures the cards give (three solubility products, a formation constant, two solubilities) are the record's,
// and a test holds each to it. The cards say what each thing is and looks like: the primer is not kept back in
// either mode, and nothing in it says what an unknown holds.

const GROUPS = 'malik-separation-in-groups'
const SOLUBILITY = 'malik-solubility'
const EQUILIBRIA = 'malik-solubility-equilibria'
const VARYING = 'malik-varying-solubility'
const PRECIPITATION = 'malik-precipitation'
const BATH = 'malik-water-bath'
const CENTRIFUGE = 'malik-centrifugation'
const DECANTING = 'malik-separating-precipitate'
const LITMUS = 'malik-ph-measurement'
const GROUP_1 = 'malik-group-1-separation'
const GROUP_1_IONS = 'malik-group-1-ions'
const PROCEDURE = 'malik-group-1-procedure'
const SCHEME = 'smc-group-1-lab'
const HANDOUT = 'ntu-group-1-lab'
const ORANGE = 'hope-q1-analysis'
const SILVER = 'birk-silver'
const LEAD = 'birk-lead'
const MERCURY = 'birk-mercury'
const TESTS = 'birk-confirmatory-tests'
const TABLES = 'nbs-tables-1982'

// Places that more than one paragraph reads.
const BACKGROUND = "the experiment's background, before its procedure"
const SECTION_2 = "the sheet's section 2 (hazards identification)"
const REACTIVITY = 'the field Reactivity Profile'

export const CATIONS_PRIMER: readonly PrimerSection[] = [
  {
    id: 'what',
    heading: 'What qualitative analysis is',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has ten cards. Read four of them before you go to the bench, in this order: What qualitative analysis is; The three chlorides; Centrifuging and pouring off; Safety. The other six can wait until a step sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four say what the lab asks, why one reagent takes these three ions out together, how a solid is parted from a liquid, and what a real bench of this lab holds.",
      ),
      paragraph(
        { label: 'The question', terms: ['qualitative analysis'] },
        'Finding out which ions a solution holds is called qualitative analysis. It does not ask how much of each there is. The answer comes from what the ions do: with a given reagent, one forms a solid and another stays dissolved.',
        [
          [SCHEME, BACKGROUND, 'finding which ions are in a sample is a common task, that the method for it is called qualitative analysis, and that it works by bringing some ions down as solids with a chosen reagent while the others stay in solution.'],
          [GROUPS, 'section 1.5, under its first heading', 'the ions are told apart by how soluble their compounds are.'],
        ],
        'that the question is which and not how much is what the word qualitative means; no source was read for the contrast.',
      ),
      paragraph(
        { label: 'Three stages' },
        'The work goes in three stages. A reagent takes a small group of ions out of the solution as solids. The ions of that group are then parted from one another. Last, each one is confirmed by a test of its own.',
        [[GROUPS, 'section 1.5, under its first heading', 'the analysis of metal ions goes in three stages: parting them into groups by bringing some down as solids, parting the ions within a group, and confirming each ion by a test of its own.']],
      ),
      paragraph(
        { label: 'In this lab', labRules: ['In this lab the amounts are fixed by the bench: you choose what to do and when, and not how much to add.'] },
        'Here the group is silver, lead and mercury(I), and the scheme has five steps. Part 1 is a sample that holds all three, so that you see each result once. Part 2 is an unknown that holds one, two or all three. In this lab the amounts are fixed by the bench: you choose what to do and when, and not how much to add.',
        [[SCHEME, "the experiment's general instructions", 'a known mixture of all three ions is worked first, as a control that shows each positive result, and an unknown that holds one, two or all three is worked after it.']],
        "the five steps, the two parts and the fixed amounts are this lab's own (spec 17.1 to 17.4).",
      ),
    ],
  },
  {
    id: 'solids',
    heading: 'Solids from solutions',
    paragraphs: [
      paragraph(
        { label: 'Ions and solids', terms: ['ions', 'precipitate'] },
        'A salt that dissolves in water comes apart into ions, each with an electric charge. A solution of ions is clear: it may be coloured, but you can see through it. When two ions meet that cannot stay dissolved together, they come out as a solid, called a precipitate, and the liquid turns cloudy.',
        [
          [SOLUBILITY, 'section 1.1, under the headings on water as a solvent and on precipitation reactions', 'an ionic compound comes apart into its ions as it dissolves, and that two solutions can be mixed to give a solid, called a precipitate.'],
          [PRECIPITATION, 'section 2.1', 'a solution may be coloured and can still be seen through, and that a solid coming out of it makes the liquid cloudy.'],
        ],
      ),
      paragraph(
        { label: 'How much dissolves', terms: ['solubility product'] },
        'No solid is quite insoluble: a little of it always dissolves. For each solid there is a number, its solubility product, that says how little. Multiply together the concentrations of its ions in the liquid, once for each ion in its formula. If the result is above the solubility product, solid forms until it is not.',
        [
          [SOLUBILITY, 'section 1.1, under the heading Solubility', 'every ionic compound dissolves to some extent.'],
          [EQUILIBRIA, 'section 1.2, under its first heading', 'the solubility product is the constant of the balance between a solid and its dissolved ions, and is the product of the ions\' concentrations, each raised to its number in the equation.'],
          [GROUP_1, 'section 3.1, its worked example for lead chloride', 'chloride above the amount that the solubility product allows takes lead out of the solution as the solid.'],
        ],
      ),
      paragraph(
        { label: 'Three numbers' },
        'The smaller the number, the less dissolves. At 25 °C it is 1.77 × 10⁻¹⁰ for silver chloride, 1.71 × 10⁻⁵ for lead chloride and 1.46 × 10⁻¹⁸ for mercury(I) chloride. Lead chloride is by far the most soluble of the three.',
        [
          [TABLES, 'pages 2-47, 2-119, 2-150 and 2-160, the rows for the chloride ion, for the three metal ions in water and for the three solid chlorides', 'the Gibbs energies of formation from which each of the three figures is worked out, as the record shows.'],
          [EQUILIBRIA, 'section 1.2, under its first heading', 'the three solubility products are of these sizes: the section gives each within about a tenth of the figure here.'],
        ],
        'the three figures are worked out by the build from the table\'s Gibbs energies and are not printed in any source.',
      ),
    ],
  },
  {
    id: 'chlorides',
    heading: 'The three chlorides',
    paragraphs: [
      paragraph(
        { label: 'Why these three' },
        'Most metal chlorides dissolve in water. The chlorides of silver, lead and mercury(I) do not. So a little hydrochloric acid takes these three out of a solution together, as white solids, and leaves every other common metal ion behind. That is why they are called Group I.',
        [
          [SOLUBILITY, 'section 1.1, the third of its guidelines for soluble ions', 'chlorides dissolve but for those of lead, mercury(I) and silver.'],
          [GROUP_1, 'section 3.1', 'hydrochloric acid brings the three down together as a milky white suspension.'],
          [SCHEME, BACKGROUND, 'the three have the name Group I because they are the first group taken out of a larger mixture.'],
        ],
      ),
      paragraph(
        { label: 'Two kinds of mercury' },
        "Mercury forms two ions. This lab's is mercury(I), written Hg₂²⁺: two atoms of mercury joined, with a charge of 2+ between them. The other is mercury(II), Hg²⁺. Chloride gives no solid with mercury(II), so it is no part of this group.",
        [[MERCURY, 'the two halves of the page, each under the heading Chloride Ion', 'the ion of mercury(I) is written with two atoms of mercury and gives a white solid chloride, and that with the ion of mercury(II) chloride gives no reaction that can be seen.']],
      ),
      paragraph(
        { label: 'All three are white' },
        'All three chlorides are white. So the solid of step 1 says only that at least one of the three ions is there. The steps after it tell them apart.',
        [
          [SILVER, 'under the heading Chloride Ion', 'silver chloride is white.'],
          [LEAD, 'under the heading Chloride Ion', 'lead chloride is white.'],
          [MERCURY, 'the first half of the page, under the heading Chloride Ion', 'mercury(I) chloride is white.'],
        ],
      ),
    ],
  },
  {
    id: 'hot-water',
    heading: 'Parting ions by a difference',
    paragraphs: [
      paragraph(
        { label: 'The idea' },
        'To part two things, find something that one of them does and the other does not. For the three chlorides, the first difference is what hot water does.',
        [[GROUPS, 'section 1.5, under its first heading', 'the ions of a group are parted from one another mostly by dissolving one solid and not the others.']],
      ),
      paragraph(
        { label: 'Lead chloride' },
        'A litre of water at 20 °C holds 10 g of lead chloride. At 100 °C it holds 33.5 g, over three times as much. Silver chloride and mercury(I) chloride hardly dissolve at either temperature. So hot water takes the lead chloride out of the solid and leaves the other two.',
        [
          [LEAD, 'under the heading Chloride Ion', 'lead chloride dissolves to 10 g in a litre at 20 degrees and to 33.5 g at 100 degrees.'],
          [GROUP_1_IONS, 'section 3.2, under its first heading', 'the other two chlorides dissolve hardly at all in cold water or in boiling water, so that heating the solid in water takes the lead chloride into the liquid and leaves them.'],
        ],
      ),
      paragraph(
        { label: 'Why hot', labRules: ['In this lab the water of step 2 can hold all the lead chloride when it is hot, and only about half of it when it is cold.'] },
        'In this lab the water of step 2 can hold all the lead chloride when it is hot, and only about half of it when it is cold. Poured off cold, it leaves lead chloride behind with the solid.',
        [],
        "how much water goes in at step 2 is the lab's own amount, and the build checks it against the two solubilities: hot, the water holds nearly twice the lead chloride there is; cold, 54% of it.",
      ),
    ],
  },
  {
    id: 'complex',
    heading: 'Complex ions',
    paragraphs: [
      paragraph(
        { label: 'What one is', terms: ['complex ion'] },
        'A metal ion in water can hold on to small molecules around it. The ion and the molecules it holds are then one particle with one charge, called a complex ion.',
        [[VARYING, 'section 1.3, under the heading Complex ion equilibria', 'a metal ion such as silver takes pairs of electrons from molecules or ions around it, and that what results is called a complex ion.']],
      ),
      paragraph(
        { label: 'Silver and ammonia' },
        'A silver ion holds two molecules of ammonia, as [Ag(NH₃)₂]⁺. This ion is colourless and stays dissolved. It forms so readily that ammonia pulls the silver out of solid silver chloride, and the solid dissolves. The number that says how readily, its formation constant, is 1.67 × 10⁷.',
        [
          [SILVER, 'under the headings Chloride Ion and Aqueous Ammonia', 'silver chloride dissolves in aqueous ammonia as an ion of silver with two ammonia, and that this complex ion is colourless.'],
          [VARYING, 'section 1.3, under the heading Complex ion equilibria', 'the constant of the forming of this ion is called its formation constant and is very large, about 1.7 × 10⁷, which is why ammonia makes silver chloride dissolve.'],
          [TABLES, 'pages 2-64, 2-160 and 2-162, the rows for dissolved ammonia, for the silver ion and for the ion of silver with two ammonia', 'the Gibbs energies of formation from which the figure here is worked out, as the record shows.'],
        ],
      ),
      paragraph(
        { label: 'Undoing it' },
        'Acid takes the ammonia away, by turning it into ammonium ions. With no ammonia left the complex ion falls apart, and silver chloride comes back as a solid.',
        [
          [SILVER, 'under the heading Chloride Ion, the third equation', 'an acid added to the ammonia solution breaks up the complex ion, turning its ammonia into ammonium ions, and brings silver chloride down again.'],
          [GROUP_1_IONS, 'section 3.2, under its third heading', 'the chloride that the dissolving of the solid left in the liquid is still there to bring silver chloride down.'],
        ],
      ),
    ],
  },
  {
    id: 'mercury',
    heading: 'Mercury(I) and ammonia',
    paragraphs: [
      paragraph(
        { label: 'What ammonia does' },
        'Ammonia does not dissolve mercury(I) chloride. It makes the mercury(I) turn into two things at once: mercury metal, and a compound of mercury(II) called mercury(II) amidochloride, HgNH₂Cl. Both stay as a solid.',
        [[MERCURY, 'the first half of the page, under the heading Chloride Ion, the second equation', 'aqueous ammonia with solid mercury(I) chloride gives mercury metal and mercury(II) amidochloride.']],
      ),
      paragraph(
        { label: 'What you see' },
        'The metal forms as specks so fine that they look black. The amidochloride is white. Mixed, the two look grey to black. A white solid that turns grey to black with ammonia is the test for mercury(I).',
        [
          [MERCURY, 'the first half of the page, under the heading Chloride Ion', 'the mercury formed is black and the amidochloride white.'],
          [GROUP_1_IONS, 'section 3.2, under its second heading', 'the two together look gray, and that the white solid going over to that colour is the sign of mercury(I).'],
          [TESTS, "the page's test for mercury(I)", 'the solid turns gray or black.'],
        ],
        'that the specks are too fine to shine is how this card puts the black of finely divided mercury; the pages read say only that it is black.',
      ),
      paragraph(
        { label: 'What it parts' },
        'Silver chloride beside it dissolves in the same ammonia. So after this step the solid holds the mercury and the liquid holds the silver, and each can be tested without the other.',
        [
          [SILVER, 'under the headings Chloride Ion and Aqueous Ammonia', 'silver chloride dissolves in aqueous ammonia.'],
          [MERCURY, 'the first half of the page, under the heading Chloride Ion, the second equation', 'the products of mercury(I) chloride with aqueous ammonia are solids.'],
        ],
      ),
    ],
  },
  {
    id: 'confirm',
    heading: 'Confirming tests',
    paragraphs: [
      paragraph(
        { label: 'What one is', terms: ['confirming test'] },
        'Once an ion has been parted from the others, one more reaction shows that it is really there. That reaction is its confirming test.',
        [
          [GROUPS, 'section 1.5, under its first heading', 'the last stage of the analysis is a test that confirms each ion.'],
          [TESTS, "the page's first paragraph", 'a confirming test is used once other reactions have set the ion apart.'],
        ],
      ),
      paragraph(
        { label: 'Lead' },
        'For lead it is a yellow solid with potassium chromate. But the chromate solution is itself yellow to orange, and more of it goes in than any lead can use up. So the liquid is coloured whether lead is there or not.',
        [
          [SCHEME, 'the background, and step 9 of the procedure', 'potassium chromate added to the hot liquid gives a bright yellow solid, lead chromate, where there is lead.'],
          [TESTS, "the page's test for chromium", 'a solution of the chromate ion is yellow.'],
          [ORANGE, "the page's positive result for lead", 'the liquid over the yellow solid in this test is orange.'],
        ],
        "that more chromate goes in than the lead can use is the lab's own amount, which the build checks.",
      ),
      paragraph(
        { label: 'Liquid or solid' },
        'A yellow liquid is not a yellow solid. A liquid, coloured or not, is clear: you can see through it. A solid makes the liquid cloudy until the centrifuge packs it at the bottom. Look at the bottom of the tube and at the liquid, each on its own.',
        [
          [PRECIPITATION, 'section 2.1', 'a solution, coloured or not, can be seen through, and that a solid in it makes it cloudy until a centrifuge sends the solid to the bottom.'],
          [ORANGE, "the page's positive result for lead", 'spinning the tube helps in telling the yellow solid from the coloured liquid over it.'],
        ],
      ),
      paragraph(
        { label: 'Silver' },
        'For silver it is the white solid that comes back when the ammonia liquid is made acid. While ammonia is left, no solid can form. So the acid goes in a little at a time, and the liquid is tested with litmus paper: blue litmus turns red in acid. A clear liquid proves nothing until then.',
        [
          [SCHEME, 'the last heading of the procedure for the known mixture', 'nitric acid is added until the liquid is acid to litmus, and a white solid in the acid liquid confirms silver.'],
          [LITMUS, 'section 2.5, under the heading on using the paper', 'blue litmus paper goes red in acid and keeps its colour in base.'],
          [PROCEDURE, 'section 3.3, the last step of its procedure', 'the acid goes in a drop at a time with a test on blue litmus paper each time.'],
        ],
      ),
    ],
  },
  {
    id: 'centrifuge',
    heading: 'Centrifuging and pouring off',
    paragraphs: [
      paragraph(
        { label: 'A cloudy liquid', terms: ['suspension'] },
        'A solid that has just formed is spread through the liquid in specks too small to see one by one. The liquid looks cloudy. This is called a suspension.',
        [[PRECIPITATION, 'section 2.1', 'a solid coming out of a solution makes it cloudy, and that such a mixture is called a suspension.']],
        'that the specks are too small to see one by one is how this card puts it; the page read says only that the liquid can no longer be seen through.',
      ),
      paragraph(
        { label: 'The centrifuge', terms: ['centrifuge'] },
        'A centrifuge spins the tube fast. The solid is thrown to the bottom and packed there, with clear liquid over it.',
        [
          [CENTRIFUGE, 'section 2.3', 'spinning packs the solid down at the foot of the tube.'],
          [GROUP_1, 'section 3.1, its figure', 'the centrifuge leaves a clear liquid over the packed solid.'],
        ],
      ),
      paragraph(
        { label: 'Pouring off' },
        'The clear liquid can then be poured into another tube, and the solid stays behind. Pour before the solid has been spun down and it goes over with the liquid: the two are not parted at all.',
        [[DECANTING, 'section 2.4, under its first heading and the one after it', 'the clear liquid over the solid is poured out, and that a solid which is not well packed tends to go over with the liquid.']],
      ),
      paragraph(
        { label: 'What is left out', labRules: ['In this lab one pouring off is taken to be clean.'] },
        'A real bench washes each solid: it stirs the solid up in a little water, spins it again, and throws the washings away, so that none of the old liquid stays with it. In this lab one pouring off is taken to be clean.',
        [[DECANTING, 'section 2.4, under the heading on washing', 'a solid is washed by stirring it up in a liquid that does not dissolve it, spinning it down again and throwing the washings away.']],
        "that one pouring off is clean is the model's (spec 17.4).",
      ),
    ],
  },
  {
    id: 'chart',
    heading: 'Reading the flow chart',
    paragraphs: [
      paragraph(
        { label: 'What it shows', terms: ['flow chart'] },
        'A flow chart is a map of the scheme. It starts from the sample. At each step it splits in two: what is in the solid, and what is in the liquid.',
        [
          [HANDOUT, "the handout's second flow chart", 'the scheme is drawn as a chart that splits, at each step, into a solid and a solution, each with what it holds.'],
          [SCHEME, BACKGROUND, 'the scheme is shown as a flow chart, which a learner draws again for an unknown.'],
        ],
      ),
      paragraph(
        { label: 'Filling it', labRules: ['In this lab the chart is filled in part 1, a step at a time, from a set of tiles.'] },
        'In this lab the chart is filled in part 1, a step at a time, from a set of tiles. Each place asks which of the three ions is there after that step, and as what. One ion turns up under more than one name: silver is in silver chloride at step 1 and in the silver-ammonia ion at step 4.',
        [],
        "the chart, its places and its tiles are this lab's own (spec 17.3); what belongs in each place is the record's, with its sources.",
      ),
      paragraph(
        { label: 'Using it' },
        'Once part 1 is done, part 2 has the finished chart under each step, as a map to open. Follow the unknown along it: each thing you see, or do not see, says which branch you are on.',
        [],
        "that part 2 shows the finished chart, where it shows it and from when, is this lab's own (spec 17.3 and 17.8).",
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'A virtual bench' },
        'Nothing in this lab can hurt you. A real bench of it holds lead, mercury, silver and chromate, and that is one reason to work it here first. This card says what the safety data sheets say of the real thing.',
        [],
        "that a real bench of this lab holds lead, mercury, silver and chromate, and that this is the case for a virtual one, is the specification's (spec 17).",
      ),
      paragraph(
        { label: 'The three solutions' },
        "The sheets for the three salts the samples are made from are for the solids. Mercury(I) nitrate can kill if it is swallowed, breathed in or left on the skin. Lead nitrate may cause cancer, and may harm fertility or an unborn child. Silver nitrate burns the skin badly and damages the eyes. All three are very toxic to water life.",
        [
          ['fisher-uk-sds-hg2no32-dihydrate', "the sheet's section 2.2, its hazard statements", 'solid mercury(I) nitrate is fatal by mouth, through the skin and by breathing in, and is very toxic to water life with lasting effects.'],
          ['flinn-sds-437', SECTION_2, 'solid lead nitrate may cause cancer and may harm fertility or an unborn child, and is very toxic to water life with lasting effects.'],
          ['flinn-sds-691', SECTION_2, 'solid silver nitrate burns the skin badly and damages the eyes.'],
          ['wards-sds-ss0180', SECTION_2, 'a 0.1 M solution of silver nitrate is very toxic to water life.'],
          ['fisher-sds-agno3', SECTION_2, 'solid silver nitrate may damage the unborn child.'],
        ],
      ),
      paragraph(
        { label: 'The solids it makes' },
        'The solids the steps make are no safer. By their sheets, lead chloride and lead chromate may cause cancer; mercury(I) chloride is toxic if swallowed; and mercury and mercury(II) amidochloride, the two parts of the grey to black solid, are each fatal if inhaled. For silver chloride one sheet lists a single hazard, that its dust may irritate the airways, and a second adds that it is very toxic to water life.',
        [
          ['flinn-sds-435', SECTION_2, 'solid lead chloride may cause cancer, may harm fertility or an unborn child, and is harmful if it is swallowed or breathed in.'],
          ['flinn-sds-435.5', SECTION_2, 'a saturated solution of lead chloride, as step 2 pours off, may cause cancer.'],
          ['fisher-sds-pbcl2', SECTION_2, 'lead chloride damages organs over long or repeated exposure.'],
          ['noaa-cameo-3735', 'the field Health Hazard', 'the dust of lead chloride is poisonous if breathed in.'],
          ['fisher-sds-pbcro4', SECTION_2, 'lead chromate may cause cancer.'],
          ['noaa-cameo-20564', 'the field Health Hazard', 'lead chromate is toxic if swallowed or breathed in.'],
          ['fisher-sds-hg2cl2', SECTION_2, 'mercury(I) chloride is toxic if swallowed.'],
          ['noaa-cameo-8818', 'the field Health Hazard', 'breathing the dust of mercury(I) chloride has poisoned people.'],
          ['fisher-sds-mercury', SECTION_2, 'mercury is fatal if its vapour is breathed in.'],
          ['spectrum-sds-am168', SECTION_2, 'mercury(II) amidochloride is fatal if inhaled.'],
          ['noaa-cameo-8809', 'the field Health Hazard', 'mercury(II) amidochloride irritates the eyes and the skin on contact.'],
          ['flinn-sds-690', SECTION_2, 'the one hazard class of silver chloride is irritation of the airways.'],
          ['fisher-sds-agcl', 'its section 2, under the heading for hazards not otherwise classified', 'silver chloride is very toxic to water life.'],
        ],
      ),
      paragraph(
        { label: 'The reagents' },
        'Potassium chromate may cause cancer and genetic defects. The three acids and the ammonia solution burn the skin badly and damage the eyes, and their fumes are not breathed: a real bench uses a fume hood.',
        [
          ['flinn-sds-623', SECTION_2, 'solid potassium chromate may cause genetic defects and may cause cancer.'],
          ['flinn-sds-395', "the sheet's sections 2, 7 and 8", 'hydrochloric acid of this strength burns the skin and the eyes severely, and is used in a fume hood or a well-ventilated room.'],
          ['flinn-sds-552', SECTION_2, 'concentrated nitric acid burns the skin severely and damages the eyes.'],
          ['wards-sds-aa0003', SECTION_2, 'a 6 M solution of acetic acid burns the skin severely and damages the eyes, and its mist is not breathed.'],
          ['flinn-sds-58', "the sheet's sections 2 and 8", 'ammonia solution of this strength burns the skin severely and damages the eyes, and is used in a fume hood or a well-ventilated room.'],
        ],
      ),
      paragraph(
        { label: 'Ammonia with the metals', labRules: ["This lab's own caution, which is no source's: on a real bench the tubes of steps 4 and 5 are not set aside or kept, and the laboratory's supervisor says what is done with them."] },
        "A supplier's sheet says that silver nitrate forms shock-sensitive compounds with ammonia, and a government record says that ammonia forms explosive compounds with silver and with mercury. Steps 4 and 5 bring ammonia together with both. This lab's own caution, which is no source's: on a real bench the tubes of steps 4 and 5 are not set aside or kept, and the laboratory's supervisor says what is done with them.",
        [
          ['flinn-sds-691', "the sheet's section 5 (fire-fighting measures)", 'silver nitrate with ammonia gives compounds that are sensitive to shock.'],
          ['noaa-cameo-1064', REACTIVITY, 'ammonia forms explosive compounds with silver and with mercury.'],
          ['noaa-cameo-2434', REACTIVITY, 'mercury with ammonia solution can form an explosive solid, and that silver in ammonia solution gave, in the one case told of, where sodium hydroxide had been added, a solid that exploded when stirred.'],
          ['noaa-cameo-4443', REACTIVITY, 'the same case is told of silver nitrate: a solid that exploded when stirred, where ammonia solution and sodium hydroxide had been added.'],
          ['wards-sds-aa0273', "the sheet's section 10 (stability and reactivity)", 'a 6 M ammonia solution is kept from heavy metals.'],
        ],
        "that the tubes of steps 4 and 5 are not set aside or kept, and that the supervisor says what is done with them, is this lab's own caution: no document read says what is to be done with such a tube, or when such a solid forms.",
      ),
      paragraph(
        { label: 'On a real bench' },
        'The sheets call for eye protection, gloves and protective clothing. After a splash in the eyes they ask for flushing with water for 15 minutes or more, and a doctor at once. A hot tube is held with a holder, its mouth pointed away from everybody. A centrifuge is balanced with a second tube, and its lid stays shut until it has stopped.',
        [
          ['flinn-sds-438', "the sheet's section 8 (exposure controls, personal protection)", 'eye protection, gloves and protective clothing are called for.'],
          ['wards-sds-ss0180', "the sheet's section 4 (first aid measures)", 'eyes are flushed with water for 15 minutes or more and medical attention is got at once.'],
          [BATH, 'section 2.2, its caution', 'a hot tube is held with a holder and never in a bare hand, with its mouth pointed away from everybody.'],
          [CENTRIFUGE, 'section 2.3, and its caution', 'a second tube with as much water in it balances the centrifuge, and that the lid stays shut until the rotor has stopped.'],
        ],
      ),
      paragraph(
        { label: 'Waste' },
        "Nothing from this bench goes down a drain. How it is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [
          [PROCEDURE, 'section 3.3, the caution after its table', 'every used solution and solid of these metals goes to a labelled waste container and none of it to a drain.'],
          ['fisher-sds-pbcl2', "the sheet's section 6 (accidental release measures)", 'lead chloride is kept from drains and from surface and ground water.'],
        ],
        "that disposal is decided by the laboratory's own rules and local regulations, and that the supervisor is asked, is the project's rule for every lab (spec 5.2): no method of disposal is given.",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the first paragraph names them. */
export const READ_FIRST = readFirstOf(CATIONS_PRIMER)
