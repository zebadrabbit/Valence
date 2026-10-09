import { paragraph, readFirstOf, type PrimerSection } from '../primer'

// The flame test lab's concept primer (spec 15.4): six cards for a reader with no chemistry background, shown one
// at a time. Nothing here quotes a source, and quotation.test.ts holds the cards and their support lines to that:
// none repeats six words running of a page it rests on. Each paragraph says what it rests on in `support`, one line
// for each passage: either a passage of a source, given where it is and, in this project's words, what it
// establishes, or a line beginning "This lab:" for what is the lab's own (its set-up, its rules, its model) and is
// read in no source. The sources are listed in docs/research/flame/sources/MANIFEST.json, and the documents of the
// last card in sources/hazard-manifest.json; both reach sources.json through `npm run build:data`.
//
// The cards name no wavelength and no flame colour of the six salts but sodium's yellow, which the card on the
// loop cannot do without: where on the scale each flame's light is, and what colour each flame is, are what the
// stations ask. They do say which of the six flames are mostly a molecule's light, as spec 15.4 has it.

const MALIK = 'malik-flame-test'
const CHEMGUIDE = 'chemguide-flame-tests'
const PALERMO = 'gallitto-2017-bunsen-burner'
const WORKSHEET = 'nasa-flame-test-worksheet'
const VISIBLE = 'nasa-visible-light'
const HYPERPHYSICS = 'hyperphysics-flame-colors'
const PRELAB = 'hope-flame-test-prelab'
const KIRCHHOFF = 'kirchhoff-bunsen-1860'
const UTRECHT = 'human-zeegers-1975'
const CALCIUM = 'daidoji-1979-calcium'
const STRONTIUM_BARIUM = 'daidoji-1979-strontium-barium'
const VILNIUS = 'juknelevicius-2020'
const BURNER = 'wpi-bunsen-burner-safety'
const sheet = (number: string) => `flinn-sds-${number}`
/** The first supplier's sheet for each of the six solutions, in the salts' order. */
const SOLUTION_SHEETS = ['94.01', '197', '281.1', '622', '722', '785'].map(sheet)

// Places that more than one paragraph reads.
const MALIK_ORIGIN = "section 2.6, the account of where a flame's colour comes from, before the heading Flame test procedure"
const MALIK_PROCEDURE = 'section 2.6, under the heading Flame test procedure'
const CHEMGUIDE_ORIGIN = 'the page on flame tests, under the heading The origin of flame colours'
const CHEMGUIDE_PRACTICE = 'the page on flame tests, under the heading Carrying out a flame test'
const PALERMO_EXPERIMENT = 'the paper on the Bunsen burner, its section on the experiment done with students'
const WORKSHEET_PROCEDURE = 'the student worksheet on the flame test, Part I, the procedure'
const VISIBLE_WAVELENGTHS = 'the page Visible Light, under its first heading and under Wavelengths of Visible Light'
const PRELAB_NOTES = 'the pre-lab page Flame Test, under Procedural Notes'
const SODIUM_1860 = 'the paper of 1860, in translation, under Sodium and under Lithium'
const UTRECHT_SPECTRA = 'the paper of 1975, section 3.1, Spectra obtained, with its Figures 1 to 3'
const HAZARDS = "the sheet's title and its section 2 (hazards identification)"
const PROTECTION = "the sheet's section 8 (exposure controls, personal protection)"
const RELEASE = "the sheet's section 6 (accidental release measures)"

export const FLAME_PRIMER: readonly PrimerSection[] = [
  {
    id: 'flame-test',
    heading: 'What a flame test is',
    paragraphs: [
      paragraph(
        { label: 'Where to start' },
        'This primer has six cards. Read three of them before you go to the bench, in this order: What a flame test is; The loop; The spectroscope and its scale. The other three can wait until a station sends you to them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the three say what the test is, how the one piece of technique that matters is done, and how the instrument is read.",
      ),
      paragraph(
        { label: 'The test', terms: ['flame test'] },
        "In a flame test a little of a compound of a metal is held in a burner's flame, and the flame takes a colour that depends on the metal. A compound of lithium turns the flame red; a compound of sodium turns it yellow. Only some metals colour a flame, and for some of those the test is the easiest way to tell which metal a compound holds.",
        [
          [CHEMGUIDE, 'the page on flame tests, its opening paragraphs and its table of flame colours', 'a flame test shows which of a fairly small number of metals a compound holds, that not every metal gives a flame colour, that for some metals it is the easiest way to tell, and that the table gives lithium as red.'],
          [MALIK, 'section 2.6, the caption of its third figure', 'a solution of sodium chloride gives a yellow flame.'],
        ],
        'lithium is on no station of this lab, which is why it is the example.',
      ),
      paragraph(
        { label: 'The six bottles', terms: ['chloride'] },
        'A compound of a metal with chlorine is called a chloride. Table salt is one: sodium chloride. Each of the six bottles on this bench holds a chloride dissolved in water, and each chloride is of a different metal: barium, calcium, copper, potassium, sodium and strontium.',
        [[MALIK, MALIK_PROCEDURE, 'the chlorides of metals are the compounds most often used for flame tests, dissolved in water.']],
        "which six are on the bench is this lab's set-up (spec 15.1), and a test holds the sentence to the record. That table salt is sodium chloride is common knowledge, read in no source for this lab.",
      ),
      paragraph(
        { label: 'What you do', labRules: ['In this lab there is no unknown to identify: you are told what is in each bottle, and you observe it.'] },
        "At each station you clean the loop, dip it in the solution, and then put it in the flame. Then you look: first at the flame, then at the flame's light through a spectroscope. You record three things: the colour of the flame, where on the spectroscope's scale the brightest thing is, and whether that brightest thing is a sharp line or a broad band. In this lab there is no unknown to identify: you are told what is in each bottle, and you observe it.",
        [],
        "the steps of a station and its three questions are this lab's own (spec 15.2).",
      ),
      paragraph(
        { label: 'The question behind it' },
        'All six bottles hold a chloride, and the six flames are six different colours. Keep that in mind as you work. When the six stations are done, the lab asks one last question: what is it that gives each flame its colour?',
        [],
        "the closing question is this lab's own (spec 15.2). The card does not answer it.",
      ),
    ],
  },
  {
    id: 'atoms',
    heading: 'Light from atoms',
    paragraphs: [
      paragraph(
        { label: 'Atoms in the flame' },
        'In the heat of the flame the compound comes apart, and some of its metal is set free as single atoms.',
        [
          [MALIK, MALIK_ORIGIN, 'once a solution of a metal chloride is in a flame, part of its metal ions take up electrons and become neutral atoms of the metal.'],
          [PALERMO, PALERMO_EXPERIMENT, 'a solid salt held where the flame is hottest turns to vapour and breaks down into its elements.'],
        ],
      ),
      paragraph(
        { label: 'Energy levels', terms: ['energy level'] },
        'The electrons of an atom cannot have just any amount of energy. Each sits on one of a set of fixed steps, and a step is called an energy level. The heat of the flame lifts an electron to a higher level. It does not stay there: it falls back to a lower one, and the energy it loses leaves the atom as light.',
        [
          [MALIK, MALIK_ORIGIN, 'the heat of the flame promotes electrons of the atom from their lowest state to allowed states of higher energy, and that they return, at once or in steps, giving out radiation as they drop.'],
          [CHEMGUIDE, CHEMGUIDE_ORIGIN, 'electrons raised by strong heating fall back to lower levels and that the energy they give up comes out as light.'],
        ],
        'that a level is called a step is the picture of this card; the sources say level and state.',
      ),
      paragraph(
        { label: 'One fall, one colour', terms: ['wavelength', 'line'] },
        "Light has a wavelength, and the colour we see goes with it. A fall from one level to another gives light of one wavelength only, which is one exact colour. In a spectroscope that light shows as a thin bright line. The gaps between the levels are different in every metal, so the atoms of each metal have lines of their own, at their own places.",
        [
          [MALIK, MALIK_ORIGIN, 'an electron dropping between two allowed states gives radiation of the one wavelength that matches the gap in energy between them, and that the gaps differ from metal to metal, so that each metal has its own pattern of lines.'],
          [VISIBLE, VISIBLE_WAVELENGTHS, 'each colour of visible light is light of a different wavelength.'],
        ],
      ),
      paragraph(
        { label: 'Two of the six' },
        "For two of the six metals on this bench, sodium and potassium, the light of the flame is the light of the metal's atoms: what the spectroscope shows for them is lines.",
        [
          [HYPERPHYSICS, 'the page on flame colours, under its photographs of three salts in the flame', "the light of a sodium flame comes mainly from the pair of lines of the sodium atom."],
          [KIRCHHOFF, 'the paper of 1860, in translation, under Potassium', 'the flame of a potassium compound shows two lines of its own in a spectroscope.'],
        ],
        "that the other four flames are not like this is the next card's.",
      ),
    ],
  },
  {
    id: 'molecules',
    heading: 'Molecules in a flame',
    paragraphs: [
      paragraph(
        { label: 'Not only atoms', terms: ['molecule'] },
        'A flame does not hold single atoms only. A metal atom in it can join with an atom of oxygen and an atom of hydrogen, or with an atom of chlorine, to make a molecule: two or three atoms held together.',
        [
          [UTRECHT, UTRECHT_SPECTRA, 'when solutions of the salts of calcium, strontium and barium are sprayed into a flame, the flame holds the molecules CaOH and SrOH, of three atoms each, and BaCl, of two, and gives their light.'],
          [VILNIUS, 'the dissertation, section 3.1 and section 3.5', 'in flames that hold strontium or copper together with a source of chlorine, the molecules SrCl and CuCl form and give light.'],
        ],
      ),
      paragraph(
        { label: 'Bands', terms: ['band'] },
        'A molecule gives light as an atom does, when it drops from a higher energy to a lower one. But a molecule can also stretch and turn, and each of those motions has small steps of energy of its own. So one drop does not give one exact wavelength. It gives a great many, close together, which run into one another. In a spectroscope they show as a band: a stretch of light, wider than a line.',
        [
          [UTRECHT, 'the paper of 1975, section 3.2, and the footnote under its Figure 2', "energy that a molecule in the flame takes up at one wavelength inside a band is spread over the molecule's levels of vibration and of rotation before it is given out again, so that the light of a band covers a stretch of wavelengths; and that the bands of the three-atom molecules are broad beside those of a two-atom one."],
        ],
        'stretch and turn are this card\'s words for vibration and rotation.',
      ),
      paragraph(
        { label: 'Four of the six' },
        'For four of the six metals on this bench, most of the light of the flame comes from such molecules and not from the atoms of the metal: calcium, strontium, barium and copper. For calcium, strontium and barium the molecule is the metal joined to one oxygen atom and one hydrogen atom, written CaOH, SrOH and BaOH. For copper there are two: CuCl, which is copper joined to chlorine, and CuOH.',
        [
          [UTRECHT, UTRECHT_SPECTRA, 'the strong bands of the calcium flame and of the strontium flame are those of CaOH and SrOH, and that the green bands of BaOH give light strongly in the barium flame.'],
          [CALCIUM, 'the abstract of the paper on calcium salts', 'CaOH was found, by its spectra, in a flame fed with solutions of calcium salts.'],
          [STRONTIUM_BARIUM, 'the abstract of the paper on strontium and barium salts', 'SrOH and BaOH were found in a flame fed with solutions of the salts of those metals, each in its own part of the spectrum.'],
          [VILNIUS, 'the dissertation, sections 3.5 and 3.7, and the paper it reprints, under Emission Spectra', 'the blue light of a copper flame that holds chlorine is that of CuCl and the green that of CuOH.'],
        ],
        "that most of each flame's light is the molecule's is how the record ranks what the sources give, and the record's README says how far each source carries that.",
      ),
      paragraph(
        { label: 'Why it matters' },
        "This is why the colour of a flame is not simply the colour of the strongest lines of the metal's atom. The periodic table in this app shows, on the card of each element, lines of that element's atoms. For calcium, strontium, barium and copper the flame is not the colour of those lines, because most of its light is a molecule's. For sodium and potassium the light of the flame is the atom's own.",
        [],
        "the comparison with the periodic table's cards is this lab's own: the cards show lines of the neutral atom as a database lists them (docs/research/emission-spectra/README.md), and the lab's record gives each flame's light to an atom or to a molecule from its own sources.",
      ),
      paragraph(
        { label: 'What is left out', labRules: ['In this lab the spectroscope shows the lines and bands that the sources read for it place on the scale, and no others.'] },
        "In this lab the spectroscope shows the lines and bands that the sources read for it place on the scale, and no others. Where a source says that a flame gives more light than that and does not say where, the station's notes say so.",
        [],
        "what the strip shows and leaves out is this lab's record (docs/research/flame/README.md).",
      ),
    ],
  },
  {
    id: 'loop',
    heading: 'The loop',
    paragraphs: [
      paragraph(
        { label: 'What it is for' },
        'The solution is carried into the flame on a small loop at the end of a metal wire. The wire is made of a metal that gives the flame no colour of its own.',
        [
          [MALIK, MALIK_PROCEDURE, 'a wire of an unreactive metal with a small loop at its end is dipped in the solution, and the film it picks up is held in the flame.'],
          [PRELAB, PRELAB_NOTES, 'whatever carries the sample into the flame must add no colour itself.'],
        ],
      ),
      paragraph(
        { label: 'Cleaning it', labRules: ['In this lab the loop is cleaned in one step, which does both.'] },
        'A loop carries whatever it last touched. So before each solution it is cleaned: rinsed in distilled water, then held in the flame until the flame shows no colour at all. In this lab the loop is cleaned in one step, which does both.',
        [
          [WORKSHEET, WORKSHEET_PROCEDURE, 'a wire is heated where the flame is hottest until no colour shows, and that this is done again before each new solution.'],
          [CHEMGUIDE, CHEMGUIDE_PRACTICE, 'the cleaning is repeated until the wire gives the flame no colour.'],
        ],
        "rinsing in distilled water with no acid is this lab's way (spec 15.2), which follows the bench of the project's owner.",
      ),
      paragraph(
        { label: 'At other benches', labRules: ['This lab has no acid bottle, and nothing in it asks for one.'] },
        'Many laboratories dip the loop in hydrochloric acid before they heat it clean. Some dip the salt in the same acid too: the acid turns a salt into its chloride, and chlorides are the salts a flame carries off most readily. All six solutions here are chlorides already, so rinsing the loop in distilled water and burning it clean is enough for them. That is how other benches work. This lab has no acid bottle, and nothing in it asks for one.',
        [
          [WORKSHEET, WORKSHEET_PROCEDURE, 'the wire is dipped in dilute hydrochloric acid and then heated, to clean it.'],
          [CHEMGUIDE, CHEMGUIDE_PRACTICE, 'a wire is cleaned by dipping it in hydrochloric acid and holding it in a hot flame.'],
          [MALIK, MALIK_PROCEDURE, 'a wire is washed by dipping it in hydrochloric acid and heating it, that salts which are not chlorides are first treated with the acid to make chlorides of them, and that chlorides are used because they are turned to vapour in a flame more easily.'],
          [PALERMO, PALERMO_EXPERIMENT, 'the wire was cleaned in a solution of hydrochloric acid, and that a salt is dipped in the concentrated acid to turn it into its chloride, which is far more volatile.'],
        ],
        "none of the four says why the acid is used to clean the wire: each gives the reason only for the salt, and the card says no more than that. That rinsing and burning is enough for six chlorides is this lab's own judgement, made with the project's owner, at whose bench no acid is used.",
      ),
      paragraph(
        { label: 'An unclean loop', labRules: ['In this lab an observation made with a loop that was not clean does not count, whatever was recorded: the station is done again with a clean loop.'] },
        'A loop that was not cleaned carries the last salt into the next flame along with the new one. The spectroscope then shows the lines and bands of both, and the flame is not the colour of either alone. In this lab an observation made with a loop that was not clean does not count, whatever was recorded: the station is done again with a clean loop.',
        [],
        "what an unclean loop shows and that its observation does not count are this lab's model and rule (spec 15.2). That a flame of two salts and no sodium is called by both colours is a model parameter, with its rationale in the record.",
      ),
      paragraph(
        { label: 'Sodium everywhere', labRules: ['In this lab the trace on a handled loop is made larger than a real one, so that it always shows.'] },
        "Sodium is the usual trouble. There is a little of it on skin, so a loop that has only been handled carries a trace of it, and sodium's yellow is strong enough to hide the colour of another salt in the same flame. The spectroscope is not taken in: it still shows the other salt's light beside sodium's line. In this lab the trace on a handled loop is made larger than a real one, so that it always shows.",
        [
          [HYPERPHYSICS, "the page on flame colours, its second paragraph", 'a clean wire that was then touched with the fingers coloured the flame, which the author puts down to sodium from the hands, until it burnt off.'],
          [PRELAB, PRELAB_NOTES, 'sodium gets into many solutions that are not meant to hold it, so that a little of its yellow is often seen where there was none in the sample.'],
          [KIRCHHOFF, SODIUM_1860, "very little sodium is enough to colour a flame, and that with a little of another metal's salt beside much sodium the eye sees sodium's colour alone while the spectroscope shows the other metal's line next to sodium's."],
        ],
        "how large the trace is here is a model parameter, with its rationale in the record. The passage of 1860 is about lithium beside sodium; the lab takes it to hold for its other five salts.",
      ),
      paragraph(
        { label: 'Cobalt glass', terms: ['cobalt glass'] },
        "On a real bench a flame is sometimes looked at through cobalt glass, a blue glass that holds back sodium's yellow so that a fainter colour, such as potassium's, can be seen. This lab has no cobalt glass: the loop is cleaned instead.",
        [[PRELAB, 'the pre-lab page Flame Test, under Procedural Notes and at step 4 of its procedure', "cobalt glass is a blue glass that masks sodium's yellow, which helps with a metal whose own light is faint, and that it is offered for potassium, which can be hard to see."]],
        "that the lab has no cobalt glass is its set-up (spec 15.1).",
      ),
      paragraph(
        { label: 'In Guided mode' },
        'In Guided mode the lab warns you before you dip a loop that is not clean, and lets you go on if you choose. In Challenge mode it says nothing until the observation is checked.',
        [],
        "the warning and the way past it are this lab's own (spec 15.2).",
      ),
    ],
  },
  {
    id: 'spectroscope',
    heading: 'The spectroscope and its scale',
    paragraphs: [
      paragraph(
        { label: 'What it does', terms: ['spectroscope'] },
        'A spectroscope spreads light out by wavelength, so that each colour in the light falls at its own place, side by side with the others. What looks like one colour to the eye can turn out to be several lights at different places.',
        [
          [VISIBLE, VISIBLE_WAVELENGTHS, 'light passed through a prism is spread into its colours, because each colour is a different wavelength and is bent by a different amount.'],
          [WORKSHEET, WORKSHEET_PROCEDURE, 'through a grating held to the eye the separate lines that make up the light of a flame can be seen.'],
          [PALERMO, PALERMO_EXPERIMENT, 'a coloured flame can be looked at with a hand spectroscope, which shows what the light is made up of.'],
        ],
      ),
      paragraph(
        { label: 'The scale', terms: ['nanometre'] },
        'Wavelength is measured in nanometres, written nm. A nanometre is a millionth of a millimetre. The scale of this spectroscope runs from 400 nm, at the violet end, to 780 nm, in the deep red. Between the two come blue, green, yellow and orange, in that order, as in a rainbow.',
        [[VISIBLE, VISIBLE_WAVELENGTHS, 'violet light has the shortest wavelength that is seen and red the longest, with the colours of the rainbow between them, and that these wavelengths are counted in nanometres.']],
        "the ends of the scale are this lab's set-up (spec 15.1). That a nanometre is a millionth of a millimetre is what the name means; no source was read for it.",
      ),
      paragraph(
        { label: 'Beyond red' },
        'An eye sees light from about 380 nm to about 700 nm. The scale goes on to 780 nm because one of the six flames gives light out there, at the very edge of what an eye can see. On a real bench that light looks faint, however strong it is.',
        [[VISIBLE, VISIBLE_WAVELENGTHS, 'a human eye typically detects wavelengths from 380 to 700 nanometres.']],
        "that light beyond 700 nm looks faint on a bench is this lab's own joining of the eye's range with where that light is; the record's README lists it among what a chemist should look at.",
      ),
      paragraph(
        { label: 'Lines and bands' },
        'Two kinds of thing show on the strip. A sharp line is at one place on the scale: read the number under it. A broad band covers a stretch of the scale: read where it starts and where it ends. Point at a line or a band, tap it, or move to it with the keyboard, and the lab says where it is, what colour it is and which of the two it is.',
        [],
        "how the strip is read and looked at is this lab's own (spec 15.2). What a line and a band are is the cards Light from atoms and Molecules in a flame.",
      ),
      paragraph(
        { label: 'The brightest', labRules: ['In this lab how bright a line or a band is follows what the instruments of its sources recorded, which is not always what an eye would find the brightest.'] },
        'Two of the three questions are about the brightest thing on the strip. Look at every line and band before you answer: those two questions open only when you have, and each line and band says how bright it is beside the others. In this lab how bright a line or a band is follows what the instruments of its sources recorded, which is not always what an eye would find the brightest.',
        [],
        "that every line and band must be looked at first, and what the ranks of brightness rest on, are this lab's rule and record (spec 15.2; docs/research/flame/README.md).",
      ),
      paragraph(
        { label: 'Bands without edges', labRules: ['In this lab such a band is drawn a little wider than those places, and says that its limits are not given.'] },
        'For some bands the sources say where the band is brightest and not where it ends. In this lab such a band is drawn a little wider than those places, and says that its limits are not given.',
        [],
        'which bands those are, and how much wider they are drawn, is in the record: a band marked approximate, and a model parameter with its rationale.',
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        { label: 'On a screen' },
        'Nothing on this screen can burn or poison anyone. What follows is for a real bench, where a flame test means an open flame and salts that are not all harmless. It does not take the place of the safety training of a laboratory.',
        [],
        "that the lab is a simulation and does not replace safety training is this project's own statement (spec 12).",
      ),
      paragraph(
        { label: 'The burner' },
        'A burner is an open flame, and so a fire hazard. Long hair, loose clothing and anything that dangles are tied back. Paper and whatever else can burn is cleared away from it. A lit burner is never left alone. The gas is shut off when the work is done, and the burner is left to cool before it is handled. A loop that has been in the flame is hot too.',
        [[BURNER, 'the guidelines on burner safety, under Overview and Procedure', 'a burner gives an open flame at a high temperature and is a fire hazard, and that hair, jewellery and clothing are tied back, things that burn are cleared away, a flame is not left unattended, the gas is shut off after use and the burner is left to cool before it is handled.']],
        'that the loop is hot after the flame is plain from what it is used for; no source was read for it.',
      ),
      paragraph(
        { label: 'On each bottle' },
        "Each bottle's tile shows two things. First come the hazard statements of the solid salt, as a supplier's safety data sheet prints them. They are the solid's, and the solution on the bench is far weaker. Under them is a note on the 0.1 M solution itself. Where the documents read for a solution differ, the note goes by the stricter one, as long as what that one says is about the substance and is not a line printed on every sheet alike.",
        [],
        "what a tile shows, and the rule its note is written to, are this project's (spec 5.2, as the project's owner refined the rule on 2026-10-08). The statements and the notes are in the lab's record, with the documents each rests on.",
      ),
      paragraph(
        { label: 'The ones to respect' },
        'Barium chloride asks for the most care: as a solid it is toxic if swallowed. Solid copper(II) chloride is harmful if swallowed and burns skin and eyes, and a sheet for its 0.1 M solution says that the solution is very toxic to life in water. Solid strontium chloride can do serious damage to the eyes. Calcium chloride, potassium chloride and sodium chloride carry lesser warnings. None of the six solutions is something to taste.',
        [
          [sheet('94'), HAZARDS, 'solid barium chloride is classed as toxic if swallowed.'],
          [sheet('281.05'), HAZARDS, 'solid copper(II) chloride dihydrate is classed as harmful if swallowed and as a cause of severe burns to the skin and of damage to the eyes.'],
          ['wards-sds-cc0506', HAZARDS, 'a 0.1 M solution of copper(II) chloride is classed as very toxic to life in water, with effects that last.'],
          [sheet('784'), HAZARDS, 'solid strontium chloride hexahydrate is classed as a cause of serious damage to the eyes.'],
          [sheet('196'), HAZARDS, 'solid calcium chloride is classed as harmful if swallowed and as a serious irritant of the eyes.'],
          [sheet('621'), HAZARDS, 'the one statement for solid potassium chloride is that it may be harmful if swallowed.'],
          [sheet('721'), HAZARDS, 'the one statement for solid sodium chloride is that it may be harmful if swallowed.'],
        ],
        "which of the statements count as lesser is this card's own ordering of them. That no solution is to be tasted is this lab's own rule for all six; one of the sheets says as much of its own solution.",
      ),
      paragraph(
        { label: 'What to wear' },
        "The supplier's sheet for each of the six solutions calls for the same three things: eye protection, gloves and protective clothing.",
        SOLUTION_SHEETS.map((id) => [id, PROTECTION, 'the sheet calls for eye protection, gloves and protective clothing.'] as const),
      ),
      paragraph(
        { label: 'Afterwards' },
        "The solutions of barium chloride and of copper(II) chloride are kept out of drains and waterways. How anything from the bench is disposed of is decided by the laboratory's own rules and by local regulations: ask the laboratory's supervisor.",
        [
          ['wards-sds-bb0041', RELEASE, 'run-off of a 0.1 M solution of barium chloride is to be kept from storm sewers and from ditches that lead to a waterway.'],
          ['fisher-sds-bacl2-dihydrate', RELEASE, 'barium chloride should not be let out into the environment.'],
          ['noaa-cameo-19847', "the record's field Regulatory Information", 'barium compounds are on the consolidated list of regulated chemicals of the United States Environmental Protection Agency.'],
          ['wards-sds-cc0506', "the sheet's section 2, among its hazard and precautionary statements", 'a 0.1 M solution of copper(II) chloride is very toxic to life in water, and its release to the environment is to be avoided.'],
          ['fisher-sds-cucl2-dihydrate', RELEASE, 'copper(II) chloride is not to be flushed into surface water or the sewer and is to be kept from drains.'],
          ['noaa-cameo-2988', "the record's field Non-Fire Response", 'spilt copper chloride is to be kept from getting into waterways and sewers.'],
        ],
        "that the two solutions are kept out of drains and waterways is how the notes under those two bottles carry these documents, by the owner's rule: the stricter document where it is about the substance. The card gives no method of disposal: that it is the laboratory's to decide is the owner's rule for every lab (spec 5.2).",
      ),
    ],
  },
]

/** The cards to read before the bench, in the order the primer's first paragraph names them. */
export const READ_FIRST: readonly string[] = readFirstOf(FLAME_PRIMER)
