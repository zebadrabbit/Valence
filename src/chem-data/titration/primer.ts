import sources from '../sources.json'
import { located } from '../support'

// The titration lab's concept primer (spec 7.1): twelve cards for a reader with no chemistry background.
// Nothing here quotes a source, and quotation.test.ts holds the cards and their support lines to that: none repeats
// six words running of a page it rests on. Each paragraph says what it rests on in `support`, one line for each passage:
// either a passage of a source, given by `located` (where it is, and in this project's words what it establishes),
// or a line beginning "This lab:" for what is the lab's own (its set-up, its rules, its model, its arithmetic) and
// is read in no source. The sources are listed in docs/research/phase-3/sources/MANIFEST.json and reach
// sources.json through `npm run build:data`.

/** A paragraph: the text shown, an equation shown under it, its sources, and what it rests on (kept for review, not shown). */
export interface PrimerParagraph {
  text: string
  equation?: string
  sourceIds: string[]
  support: string
}
export interface PrimerSection {
  id: string
  heading: string
  paragraphs: PrimerParagraph[]
}

/** A passage a paragraph rests on: its source, where it is there, and what it establishes (see `located`). */
type Passage = readonly [sourceId: string, where: string, establishes: string]

function url(id: string): string {
  const source = sources.find((s) => s.id === id)
  if (!source) throw new Error(`the primer cites an unknown source "${id}"`)
  return source.url
}

/** `own` says what in the paragraph is this lab's own and is read in no source; it completes "This lab:". */
function paragraph(text: string, passages: readonly Passage[], own?: string, equation?: string): PrimerParagraph {
  return {
    text,
    ...(equation ? { equation } : {}),
    sourceIds: [...new Set(passages.map(([id]) => id))],
    support: [...passages.map(([id, where, establishes]) => `${id}: ${located(url(id), where, establishes)}`), ...(own ? [`This lab: ${own}`] : [])].join('\n'),
  }
}

// The sections of OpenStax Chemistry 2e and of Harvey's Analytical Chemistry 2.1 that are cited, and the lab pages.
const chem2e = (section: string) => `flowers-chem2e-${section}`
const harvey = (section: string) => `harvey-ac21-${section}`
const BURET_USE = 'lmc-buret-use'
const ACID_LAB = 'smc-equivalent-mass-lab'
const BASE_LAB = 'ucd-standardization-lab'

// Places that more than one paragraph reads.
const ACID_BASE = 'section 4.2, under the heading Acid-Base Reactions'
const TITRATION = 'section 4.5, under the heading Titration'
const STANDARDS = 'section 5.1, under the heading Primary and Secondary Standards'
const TITRANTS = 'section 9.2, under the heading Selecting and Standardizing a Titrant'
const PART_A = 'the heading Part A: Standardization of a Sodium Hydroxide Solution'
const PART_II = 'the heading Part II. Standardization of the NaOH Solution'
const PERFORMING = 'section 3, part 4 (Performing the Titration)'
const PREPARING = 'section 3, part 2 (Preparing the Buret)'
const SHEET_SECTIONS = 'sections 2 (hazard identification), 4 (first-aid measures) and 8 (exposure controls and personal protection)'
const SOLID_SHEET = "the sheet's title and its sections 2 (hazards identification) and 3 (composition)"

export const TITRATION_PRIMER: readonly PrimerSection[] = [
  {
    id: 'acids-and-bases',
    heading: 'Acids, bases and neutralisation',
    paragraphs: [
      paragraph(
        'This primer has twelve cards. Read four of them before you go to the bench, in this order: Reading the burette; Conditioning, rinsing and the tip bubble; Titrating to the endpoint; The calculation. The other eight can wait until you want them.',
        [],
        "which cards to read first, and in what order, is this lab's advice. Between them the four tell every step a trial has to have in order to count (spec 7.3); Challenge mode has no checklist to tell them.",
      ),
      paragraph(
        'A substance is an acid if it gives hydronium ions, H₃O⁺, when it dissolves in water. It is a base if it gives hydroxide ions, OH⁻, when it dissolves in water.',
        [[chem2e('4.2'), ACID_BASE, 'for reactions in water, acids are the substances that dissolve to give hydronium ions and bases are those that dissolve to give hydroxide ions.']],
      ),
      paragraph(
        'Hydrochloric acid is hydrogen chloride, HCl, dissolved in water. It is a strong acid: practically every HCl molecule passes a hydrogen ion to a water molecule, which leaves a hydronium ion and a chloride ion, Cl⁻. Sodium hydroxide, NaOH, is a strong base: in water it separates completely into sodium ions, Na⁺, and hydroxide ions.',
        [
          [
            chem2e('4.2'),
            ACID_BASE,
            'HCl is a strong acid, since nearly all of the HCl that dissolves gives up its hydrogen ion to water and leaves hydronium and chloride ions; and that NaOH dissolves and dissociates into sodium and hydroxide ions, as the ionic hydroxides that are strong bases do.',
          ],
        ],
      ),
      paragraph(
        'When the two solutions meet, hydronium ions and hydroxide ions join to make water. This is a neutralisation: an acid and a base react to give water and a salt. Here the salt is sodium chloride, NaCl, which stays dissolved. One HCl reacts with exactly one NaOH.',
        [
          [
            chem2e('4.2'),
            `${ACID_BASE}, from the definition of a neutralization reaction to the exercise after Example 4.4`,
            'a neutralization reaction is one in which an acid reacts with a base, usually giving water and a salt, and that for a strong acid and an ionic hydroxide the net change is hydronium and hydroxide ions forming water.',
          ],
          [chem2e('4.5'), 'section 4.5, Example 4.14 (Titration Analysis)', 'HCl and NaOH react as HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l), one mole of HCl for each mole of NaOH.'],
        ],
        undefined,
        'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
      ),
    ],
  },
  {
    id: 'molarity',
    heading: 'Molarity',
    paragraphs: [
      paragraph('Chemists count particles in moles. A mole is a fixed number of particles, about 6.022 × 10²³, in the way that a dozen is twelve.', [
        [chem2e('3.1'), 'section 3.1, under the heading The Mole', 'a mole is a unit for an amount, as a pair or a dozen is, and that one mole holds 6.02214076 × 10^23 atoms or molecules.'],
      ]),
      paragraph(
        'The concentration of a solution says how much of a substance is dissolved in a given volume of it. Molarity, written M, is the number of moles of the dissolved substance in one litre of solution. A 0.1 M solution of HCl has 0.1 mole of HCl in every litre.',
        [[chem2e('3.3'), 'section 3.3, under the heading Solutions', 'the molarity of a solution is how many moles of solute one litre of it holds.']],
      ),
      paragraph(
        'So the moles in a measured volume are the molarity times the volume in litres. 25.00 mL is 0.02500 L, so 25.00 mL of 0.1000 M HCl holds 0.1000 × 0.02500 = 0.002500 mole of HCl.',
        [
          [
            chem2e('3.3'),
            'section 3.3, Example 3.15 (Deriving Moles and Volumes from Molar Concentrations)',
            'the definition rearranges to moles of solute = molarity × litres of solution, with millilitres first converted to litres.',
          ],
        ],
        "the arithmetic of the example is this lab's own; a test repeats it.",
      ),
    ],
  },
  {
    id: 'titration',
    heading: 'What a titration is',
    paragraphs: [
      paragraph(
        'A titration measures a concentration by reaction. One solution is run from a burette, a little at a time, into a measured sample of another solution that it reacts with, until the reaction is just complete. If the concentration of one solution is known and both volumes are measured, the concentration of the other can be calculated.',
        [
          [
            chem2e('4.5'),
            TITRATION,
            'a titration uses a buret to add one solution in small steps to a sample of another that it reacts with in a known ratio, and that measuring the volume needed for complete reaction allows a concentration to be calculated.',
          ],
        ],
      ),
      paragraph(
        'In most textbook titrations the solution of known concentration is the one in the burette. This lab is the other way round: the HCl in the flask is the known solution, and the NaOH in the burette is the one being measured. The reaction and the arithmetic are the same.',
        [
          [chem2e('4.5'), TITRATION, 'in the usual arrangement the buret holds the solution of known concentration (the titrant) and the sample holds the substance being measured (the analyte).'],
          [ACID_LAB, PART_A, 'a measured volume of a hydrochloric acid of known molarity, in the flask, is titrated with the sodium hydroxide whose molarity is wanted, from a buret.'],
        ],
        'here the flask holds the standardized HCl and the burette the NaOH (spec 7.1).',
      ),
    ],
  },
  {
    id: 'standardizing',
    heading: 'Why sodium hydroxide has to be standardized',
    paragraphs: [
      paragraph(
        'A sodium hydroxide solution of exactly known molarity cannot be made by weighing out the solid. Solid NaOH takes up water from the air, and it reacts with carbon dioxide from the air to form sodium carbonate. So a weighed portion is never pure NaOH, and nobody can say exactly how much NaOH it holds.',
        [
          [
            harvey('5.1'),
            STANDARDS,
            'commercial NaOH contains sodium carbonate among its impurities and readily absorbs water from the atmosphere, so it cannot serve as a primary standard and its concentration is found by titration.',
          ],
          [harvey('9.2'), TITRANTS, 'solid NaOH always carries some carbonate, picked up from the air, because carbon dioxide reacts with hydroxide to form carbonate.'],
        ],
      ),
      paragraph(
        'The same thing goes on after it is made: a sodium hydroxide solution keeps taking up carbon dioxide from the air, and the carbon dioxide uses up some of the hydroxide. That is why the bottle is kept closed, and why a solution that has stood for a while is standardized again before it is used. In this lab the NaOH does not change while you work.',
        [
          [
            BASE_LAB,
            'the heading Part I. Preparation of Solutions',
            'a sodium hydroxide solution is never left uncapped, because a basic solution absorbs carbon dioxide from the atmosphere and its concentration changes.',
          ],
          [
            harvey('9.2'),
            TITRANTS,
            'carbon dioxide dissolved from the atmosphere reacts with hydroxide to form carbonate, and that a sodium hydroxide solution is fairly stable if its contact with the atmosphere is limited.',
          ],
        ],
        "that a solution which has stood is standardized again follows from those passages, but no source was read that says it. The lab's NaOH takes up no carbon dioxide (spec 7.3).",
      ),
      paragraph(
        'So the solution is made up to roughly the strength wanted, about 0.1 M here, and its exact molarity is then measured by titrating it against a solution whose concentration is already known. Measuring a concentration this way is called standardizing the solution.',
        [
          [harvey('5.1'), STANDARDS, 'the concentration of a reagent that is not a primary standard, NaOH being the example given, is found by titrating it against a standard.'],
          [ACID_LAB, 'the introduction', 'finding the concentration of a solution by a titration or another precise method is called standardizing the solution.'],
        ],
      ),
      paragraph(
        'In this lab the known solution is the hydrochloric acid, and its molarity is printed on the bottle. That number did not come from making the acid up carefully. Concentrated acid is diluted to roughly the strength wanted, and its exact molarity is then found by standardizing the acid in its turn. Here that has been done for you: the label is exact.',
        [
          [
            harvey('9.2'),
            `${TITRANTS}, its first paragraph`,
            'an HCl titrant is made by diluting a concentrated stock whose concentration is known only roughly, and that its concentration is then found by standardizing it against one of the bases that serve as primary standards.',
          ],
          [
            ACID_LAB,
            `the introduction and ${PART_A}`,
            'the sodium hydroxide solution is standardized against a hydrochloric acid that has itself been standardized, and that the exact molarity of that acid is read from the label of its bottle.',
          ],
        ],
        "the acid bottle and its exact label are the lab's set-up (spec 7.1). How the acid was standardized is not part of the lab.",
      ),
    ],
  },
  {
    id: 'endpoint',
    heading: 'Equivalence point and endpoint',
    paragraphs: [
      paragraph(
        'The equivalence point is the moment when exactly enough NaOH has been added to react with all the HCl in the flask: the moles of NaOH added equal the moles of HCl that were there. To see it, an indicator is added to the flask: a dye that changes colour at the equivalence point, or very close to it.',
        [
          [
            chem2e('4.5'),
            TITRATION,
            'the equivalence point is the volume of titrant that just reacts with all of the analyte, and that indicators are dyes added to the sample which change colour at that point or very close to it.',
          ],
        ],
      ),
      paragraph(
        'The endpoint is what is actually measured: the burette reading at which the indicator changes colour and you stop. A well-chosen indicator puts the endpoint so close to the equivalence point that the difference does not matter.',
        [
          [
            chem2e('4.5'),
            TITRATION,
            'the end point is the name for the titrant volume that is in fact measured, and that in a properly designed titration the two volumes differ by a negligible amount.',
          ],
        ],
      ),
    ],
  },
  {
    id: 'phenolphthalein',
    heading: 'Why phenolphthalein',
    paragraphs: [
      paragraph(
        'pH is a scale for how acidic or basic a solution is. At 25 °C a pH below 7 is acidic, 7 is neutral, and above 7 is basic. Phenolphthalein is colourless below a pH of about 8.3 and pink above it. The bottle on this bench is a 0.5% solution of it in alcohol and water. Many teaching labs stock a 1% solution in alcohol instead, and the endpoint is read in the same way with either.',
        [
          [chem2e('14.2'), 'section 14.2, Table 14.1', 'at 25 °C a solution is acidic when its pH is below 7, neutral at 7 and basic above 7.'],
          [chem2e('14.7'), 'section 14.7, under the heading Acid-Base Indicators', 'phenolphthalein is colourless in solutions of pH below 8.3 and red or pink in more basic ones.'],
        ],
        "the bottle's strength is the lab's set-up (spec 5.2). That the endpoint is read in the same way with a 1% solution rests on the model, whose endpoint test passes for any strength from 0.1% to 1% (the record's note on the indicator's strength). That teaching labs stock a 1% solution in 95% alcohol is the owner's bench practice (Gate A, 2026-10-05); no source was read for it.",
      ),
      paragraph(
        'When a strong acid is titrated with a strong base, the pH of the flask climbs slowly at first and then leaps from acidic to basic over a very small addition around the equivalence point. The colour change of phenolphthalein lies inside that leap, so the first lasting pink appears almost exactly at the equivalence point.',
        [
          [
            chem2e('14.7'),
            'section 14.7, under the heading Acid-Base Indicators, the paragraph on Figure 14.20',
            'when a strong base is run into a strong acid, the colour-change interval of phenolphthalein lies within the steep rise in pH around the equivalence point, which gives a sharp colour change.',
          ],
        ],
      ),
    ],
  },
  {
    id: 'titrating',
    heading: 'Titrating to the endpoint',
    paragraphs: [
      paragraph(
        "The aim is to stop at the endpoint: the first faint pink in the flask that lasts. The pink comes from the phenolphthalein in the flask, which is an indicator: a dye that is colourless in the acid and turns pink once the acid is used up. Before you start, work out roughly how much sodium hydroxide solution (NaOH) the flask will take to get there. That volume is called the titre. The strength of each solution is given as its molarity, written M: the moles of the substance in each litre of solution (the card Molarity explains this). Take the NaOH as 0.1 M: the titre, in mL, will be about the acid's molarity × 25.00 ÷ 0.1, where 25.00 is the millilitres of acid in the flask. For 0.1200 M acid that is about 30 mL. The NaOH is only about 0.1 M, so the real endpoint can be a millilitre or so to either side.",
        [
          [BASE_LAB, PART_II, 'the flask is titrated to the first faint pink that lasts for 30 seconds.'],
          [chem2e('4.5'), TITRATION, 'indicators are dyes added to the sample which change colour at the equivalence point or very close to it.'],
          [chem2e('14.7'), 'section 14.7, under the heading Acid-Base Indicators', 'phenolphthalein is colourless in solutions of pH below 8.3 and red or pink in more basic ones.'],
          [chem2e('3.3'), 'section 3.3, under the heading Solutions', 'the molarity of a solution is how many moles of solute one litre of it holds.'],
          [
            BURET_USE,
            'section 4, under the heading Use your information',
            'the volume of titrant a titration will need can be estimated by calculation beforehand, and that the titrant is then run in to a few millilitres short of the estimate before the rest is added with care.',
          ],
        ],
        "the estimate from the bottle's label is this lab's arithmetic, and a test repeats it: with the NaOH anywhere from 0.095 to 0.105 M (spec 7.1) the endpoint is at most 1.4 mL from the estimate. The 25.00 mL of acid in the flask is the lab's pipette (spec 7.1).",
      ),
      paragraph(
        "Swirl the flask the whole time, so that the NaOH mixes in. While you are still several millilitres short of your estimate, the NaOH can run in quickly. Run in 5 mL at once only while you are more than 7 mL short of your estimate. Where the NaOH lands, the solution turns pink for a moment and clears as it mixes. Closer to the endpoint the pink takes longer to clear. When it starts to linger, close the stopcock and add one drop at a time. A single drop is far less NaOH than the stream runs in, so at first its pink clears at once again; that does not mean the endpoint is far off. When a drop's pink lingers too, change to half-drops.",
        [
          [
            BURET_USE,
            PERFORMING,
            'the flask is swirled to spread the titrant evenly, that bursts of colour which last more than a few seconds show the end point is close, and that the titrant is then slowed, to half drops if need be.',
          ],
        ],
        "the stream, the 5 mL run and the single drop are this lab's controls (spec 7.2), and the pink where a drop lands is its model of the flask. That a single drop's pink clears at once again after the stream's has begun to linger is that model too (spec 7.2: the cue is worked from the share of the acid still in the flask that the addition used up), and tests repeat it; no source was read for it. The 7 mL is this lab's arithmetic, and tests repeat it: the endpoint comes at most 1.28 mL before the estimate, or 1.78 mL with a pipette that was not rinsed, so 5 mL run in from more than 7 mL short ends before it.",
      ),
      paragraph(
        'Near the end a whole drop is too much. Open the stopcock just enough for part of a drop to form on the burette tip, touch it off on the inside wall of the flask, and wash it down with distilled water. That is a half-drop. The water does no harm: it changes how dilute the acid is, not how much acid is there. In this lab the half-drop is rinsed in for you. The rinse of the flask wall that the bench offers is a larger one, 10 mL of water each time, and that much water can thin a very faint pink until it no longer shows. If that happens, add another half-drop.',
        [
          [
            BURET_USE,
            'section 4, under the heading Adding titrant by half-drops',
            'a half drop is made by opening the stopcock just far enough for a drop to form on the tip without falling, closing it, and washing the drop into the flask with deionized water from a wash bottle.',
          ],
          [
            BASE_LAB,
            PART_II,
            'drops have to be split to reach a very faint pink, and that the sides of the flask are washed down with deionized water so that none of either reactant is left on the glass.',
          ],
          [ACID_LAB, PART_A, 'water in the flask leaves the amount of acid there, in moles, as it was.'],
        ],
        "touching the hanging drop to the wall of the flask is this lab's wording; the page read washes it off the tip. A half-drop here is 0.025 mL and adds no water, and one rinse of the bench is 10 mL (spec 7.2, 7.3). That so much water can thin a faint pink below what shows is the lab's model of the colour; no source was read for it.",
      ),
      paragraph(
        'The endpoint is the first faint pink that lasts through 30 seconds of swirling. A dark pink means too much NaOH has gone in. In this lab a flask that has gone more than two drops too far is spoiled, and the trial is started again.',
        [
          [
            ACID_LAB,
            `the heading General Notes and ${PART_A}`,
            'the titration has reached its end point once one more drop of sodium hydroxide leaves a faint pink that lasts for at least 30 seconds of swirling.',
          ],
          [BASE_LAB, PART_II, 'the flask is titrated to the first faint pink that lasts for 30 seconds.'],
          [BURET_USE, PERFORMING, 'the end point is a faint colour, that a more vivid colour may mean it has been passed, and that a titration which has gone well past it is done again.'],
        ],
        "more than two drops, 0.10 mL, past the flask's equivalence volume is the lab's rule for a spoiled flask (spec 7.3).",
      ),
      paragraph(
        "At a real bench the wait matters. The flask is open to the air and takes up carbon dioxide, which uses up a little of the NaOH, so even the faint pink of a true endpoint slowly fades. That is why the rule gives a time and does not ask for a pink that lasts for good. This lab's flask is closed: here a pink that stays after an addition always lasts the wait, and the wait takes no real time. You still have to swirl and wait before the final reading can be taken.",
        [
          [
            harvey('9.2'),
            `${TITRANTS}, the paragraphs on carbon dioxide`,
            'a solution open to the air always holds a little dissolved carbon dioxide, which reacts with hydroxide, and that at an end point between pH 6 and 10 this uses up hydroxide.',
          ],
        ],
        "that the faint pink of a real flask fades for this reason, and that this is why the rule gives a time, is this lab's inference from that passage: no source that says so was read. The closed flask, and a wait that takes no real time and cannot fail, are the lab's model (spec 7.2, 7.3).",
      ),
    ],
  },
  {
    id: 'calculation',
    heading: 'The calculation',
    paragraphs: [
      paragraph(
        'The moles of NaOH added equal the moles of HCl in the flask at the equivalence point: the moment when exactly enough NaOH has gone in to react with all the acid. They are equal because the two react one to one. The endpoint you measure stands for the equivalence point. Moles are molarity times volume, so:',
        [
          [chem2e('4.5'), TITRATION, 'the equivalence point is the volume of titrant that just reacts with all of the analyte.'],
          [
            chem2e('4.5'),
            'section 4.5, Example 4.14 (Titration Analysis) and the note that follows it',
            'the calculation rests on the mole ratio of the balanced equation, one HCl to one NaOH, with moles found as molarity times volume.',
          ],
        ],
        undefined,
        'M_NaOH × V_NaOH = M_HCl × V_HCl',
      ),
      paragraph(
        'Rearranged for the molarity you are looking for, with M_HCl the molarity on the acid bottle, V_HCl the 25.00 mL you pipetted, and V_NaOH the titre: the final burette reading minus the initial reading. Both volumes can stay in millilitres, because the units cancel.',
        [
          [
            chem2e('4.5'),
            'section 4.5, the note after Example 4.14 (Titration Analysis)',
            'molarity is also millimoles of solute per millilitre of solution, so the volumes may be left in millilitres.',
          ],
        ],
        'the pipette is 25.00 mL (spec 7.1).',
        'M_NaOH = M_HCl × V_HCl ÷ V_NaOH',
      ),
      paragraph(
        'For example, with 0.1200 M HCl, an initial reading of 0.50 mL and a final reading of 30.60 mL, the titre is 30.60 − 0.50 = 30.10 mL, and M_NaOH = 0.1200 × 25.00 ÷ 30.10 = 0.099668 M, to six decimal places. These numbers are only an example; your bottle and your readings will be different.',
        [],
        "the example is this lab's own, with a bottle outside the range any run here can have; a test repeats its arithmetic.",
      ),
      paragraph(
        "Keep every digit your calculator shows until the last step, and round only the final answer. Give the molarity to four decimal places, as the bottle label does. Four decimal places is this lab's convention. Round it; do not cut the extra digits off. In the example, 0.099668 rounds to 0.0997. Cut off, it would be 0.0996, and the lab would not accept it.",
        [],
        "four decimal places, rounded and not cut off, is this lab's rule for the molarity you type (spec 7.3). Where the fifth decimal place is a 5 with nothing after it, the lab accepts either neighbour.",
      ),
    ],
  },
  {
    id: 'burette',
    heading: 'Reading the burette',
    paragraphs: [
      paragraph(
        'A burette is a long, narrow glass tube with a scale along it and a tap, called the stopcock, at the bottom. Its scale starts at 0.00 mL at the top and the numbers increase downward, so the reading grows as solution leaves the burette. The volume delivered is the final reading minus the initial reading; the burette does not need to start at zero.',
        [
          [harvey('9.1'), 'section 9.1, under the heading The Buret', 'a buret is a long, narrow graduated tube, and that the titrant is let out of it through a stopcock.'],
          [
            'wikipedia-burette',
            "the article's opening section",
            'a burette is graduated from the top downward, so that the volume dispensed is found by taking the first reading from the last.',
          ],
          [BURET_USE, 'section 3, part 3 (Setting up the Buret Apparatus)', 'a titration need not start at the 0.00 mark, so long as the first reading is recorded for what it is.'],
        ],
      ),
      paragraph(
        "The surface of the liquid is curved. The curve is called the meniscus. Read the lowest point of the meniscus, with your eye level with it. With the eye above or below, the meniscus lines up with the wrong part of the scale, and the last digit cannot be judged. This lab's reading view always shows the scale with your eye level with the meniscus, so that is one mistake you cannot make here. At a real burette you can.",
        [
          [
            chem2e('1.5'),
            'section 1.5, under the heading Significant Figures in Measurement',
            "a volume is read where the liquid's curved surface, the meniscus, is lowest.",
          ],
          [
            'seely-buret',
            'the heading Read Buret Tubes',
            'a buret is read looking at the column squarely, at a right angle to it, and that with the eye a little above or below, the marks no longer look parallel and the last digit is hard to judge.',
          ],
          [
            harvey('2.4'),
            'section 2.4, under the heading Equipment for Measuring Volume, the paragraph on setting a level at a calibration mark',
            'the eye is kept in line with the mark to avoid an error of parallax, and that with the eye above or below the mark the level is set too high or too low.',
          ],
        ],
        'the reading view is drawn with the eye level with the meniscus, and parallax is not modelled (spec 7.1).',
      ),
      paragraph(
        'This burette is marked every 0.1 mL. Judge how far the meniscus sits between two marks, in tenths of the gap, and write the reading to 0.01 mL: 1.20, not 1.2. The last digit is an estimate, and it still counts.',
        [
          [
            chem2e('1.5'),
            'section 1.5, under the heading Significant Figures in Measurement',
            "a reading is made by mentally dividing the gap between two marks into tenths and estimating the last digit, and that this uncertain last digit is one of the measurement's significant figures.",
          ],
          [chem2e('4.5'), 'section 4.5, the caption of Figure 4.16', 'volumes can be measured to within 0.01 mL on an ordinary buret.'],
          ['seely-buret', 'the heading Read Buret Tubes', 'readings to 0.01 mL are possible on a buret of 50 mL if care is taken to look at it squarely.'],
        ],
        'the burette is graduated every 0.1 mL (spec 7.1).',
      ),
    ],
  },
  {
    id: 'glassware',
    heading: 'Conditioning, rinsing and the tip bubble',
    paragraphs: [
      paragraph(
        'Two pieces of glassware measure the solutions in this lab. The burette delivers the sodium hydroxide solution (NaOH). The pipette measures out the 25.00 mL of hydrochloric acid (HCl) that goes into the flask. Both are washed with water, and some water stays behind on the inside. A wet burette dilutes the NaOH poured into it; a wet pipette dilutes the HCl drawn into it. Either way, the solution that is measured is weaker than the solution in the bottle. So before use the burette is rinsed with two or three small portions of the NaOH solution, which is called conditioning it, and the pipette is rinsed with a little of the HCl solution.',
        [
          [
            harvey('2.4'),
            'section 2.4, under the heading Equipment for Measuring Volume, its last paragraph',
            'before use a pipet is rinsed several times with a little of the solution it is to measure, to remove any liquid left in it.',
          ],
          [
            'seely-pipet',
            'the opening paragraphs, on cleaning volumetric glassware',
            'volumetric pipets and burets that are still wet from cleaning are rinsed, before they are used, with a little of the solution they are to measure.',
          ],
          [BURET_USE, PREPARING, 'the buret is rinsed three times with the titrant, which is let coat the whole inside and run through the tip.'],
          [ACID_LAB, PART_A, 'each buret is rinsed twice with portions of about 10 mL of the solution it is to hold before it is filled.'],
        ],
        "which solution each piece measures, and the 25.00 mL of the pipette, are the lab's set-up (spec 7.1). One step stands for the portions here (spec 7.2), and the weakening the lab gives a burette or pipette that was not rinsed is larger than a bench gives (spec 7.3).",
      ),
      paragraph(
        'The flask is different. It only has to be clean; it may be wet, and distilled water may be added to it during the titration. Water makes the acid in the flask more dilute, but it does not change how much acid is there, and it is the amount of acid that the NaOH has to match.',
        [
          [ACID_LAB, PART_A, 'the flask that receives the acid need not be dry, because water in it leaves the amount of acid added, in moles, as it was.'],
          [chem2e('3.3'), 'section 3.3, under the heading Dilution of Solutions', 'diluting a solution lowers its concentration and leaves the amount of solute as it was.'],
        ],
      ),
      paragraph(
        'Air can be trapped in the burette tip, below the stopcock, each time an empty burette is filled, and so again after conditioning. It has to be pushed out before the first reading, by running a little NaOH through the tip. If the bubble comes out during the titration instead, NaOH takes its place, and the burette reads more than was delivered to the flask.',
        [
          [
            'seely-buret',
            'the heading Cleaning Buret Tubes, the paragraphs on bubbles in the nozzle',
            'a bubble in the nozzle gives a wrong volume reading if it escapes during a titration, and that it is driven out by filling the buret and opening the valve.',
          ],
          [BURET_USE, PREPARING, 'air caught in the tip can spoil the measurements, and is got rid of before the titration.'],
        ],
        'that the burette then reads more than was delivered, and that every fill from empty traps air again, are how the lab models the bubble (spec 7.3).',
      ),
      paragraph(
        'That makes three mistakes: a burette that was not conditioned, a pipette that was not rinsed, and an air bubble left in the burette tip. This lab makes each of them cost more than it does at a real bench. A real burette tip holds less air than the bubble in this lab. And a real burette that was not conditioned is less diluted each time it is refilled; in this lab it stays diluted until you condition it. Even so, a mistake does not always show in the result: two of them can push it in opposite directions and cancel. So a trial with one of these mistakes in it does not count toward the three trials this lab asks for, even when its result is close.',
        [],
        "the size of each technique error, a tip bubble of 0.60 mL and a burette that stays 2.0% dilute through every refill are the model, and none of the three is true to a bench (spec 7.3). No source was read for what a bench gives. That a trial with one of the three mistakes in it does not count is the lab's rule (spec 7.3, the owner's decision of 2026-10-05).",
      ),
      paragraph(
        'Refill the burette before each trial and take a new initial reading. A burette that runs out in the middle of a trial leaves that trial with no result. The burette does not need conditioning again: it is already wet with NaOH.',
        [[ACID_LAB, PART_A, 'the burets are refilled before each further titration.']],
        "the new initial reading, the trial lost when the burette runs out, and no second conditioning are this lab's rules (spec 7.2). The lab teaches the refill and does not force it.",
      ),
    ],
  },
  {
    id: 'precision',
    heading: 'How closely the trials agree',
    paragraphs: [
      paragraph(
        'One titration can go wrong without showing it, so the measurement is repeated: this lab asks for three trials that count. Results that agree closely with each other are precise. Results that are close to the true value are accurate. Precise results are not always accurate: a mistake repeated every time, such as a molarity copied wrongly from the acid bottle and used in every calculation, gives results that agree with each other and are all wrong.',
        [
          [
            chem2e('1.5'),
            'section 1.5, under the heading Accuracy and Precision',
            'measurements are precise when repeated results agree closely with each other and accurate when a result is close to the true value, and that scientists repeat measurements to judge both.',
          ],
          [ACID_LAB, 'the introduction', 'at least three titrations are done, to make sure of the precision of the result.'],
        ],
        "three trials that count are the lab's rule (spec 7.3), and the miscopied label as a mistake repeated is its own example: the same wrong factor in every calculation.",
      ),
      paragraph(
        'This lab measures agreement by the relative deviation. Take the average of the three molarities, to four decimal places; it is rounded first only because that is how the notebook works it. Find how far each one is from that average, ignoring the sign, and average those distances. Divide by the average molarity and multiply by 1000. The answer is in parts per thousand: 2 parts per thousand means the trials are, on average, 0.2% away from their average.',
        [],
        "the definition is this lab's (spec 7.3: the mean absolute deviation divided by the mean, in parts per thousand, worked from the average rounded to four decimal places). No source for it was read.",
      ),
    ],
  },
  {
    id: 'safety',
    heading: 'Safety',
    paragraphs: [
      paragraph(
        'Nothing in this simulation can hurt you, and nothing in it replaces the safety training and the rules of a real laboratory.',
        [],
        'a statement about this simulation, not chemistry.',
      ),
      paragraph(
        "In a real laboratory this experiment is done wearing eye protection and gloves. The acid and the base are dilute, about 0.1 M. Even so, a supplier's safety data sheet for hydrochloric acid of this strength says that it irritates the skin and causes serious eye irritation. The sheet for sodium hydroxide of this strength does not class it as hazardous. That is not the same as harmless: that sheet too calls for eye protection and gloves, and both sheets say that a splash on the skin or in the eyes is to be flushed with a lot of water, for 15 minutes or longer.",
        [
          [
            'fisher-sds-hcl-0.1n',
            SHEET_SECTIONS,
            '0.1 N hydrochloric acid carries the signal word Warning, as causing skin irritation and serious eye irritation and as possibly corrosive to metals; that protective eyeglasses or goggles and gloves are to be worn; and that eyes and skin are to be flushed with a lot of water, for 15 minutes or longer.',
          ],
          [
            'fisher-sds-naoh-0.1n',
            SHEET_SECTIONS,
            '0.1 N sodium hydroxide is not considered hazardous under the United States hazard communication standard; that protective eyeglasses or goggles and gloves are still to be worn; and that eyes and skin are to be flushed with a lot of water, for 15 minutes or longer.',
          ],
          [ACID_LAB, 'the heading General Safety', 'students doing this standardization wear safety goggles throughout, and gloves when they handle sodium hydroxide and phenolphthalein.'],
        ],
      ),
      paragraph(
        'Each bottle on the bench lists hazard statements, with a note under them about the solution at the strength used here. The statements are not written for these dilute solutions. Those on the acid bottle are for concentrated hydrochloric acid, 6 M to 12 M, and those on the other two bottles are for the pure substance. Concentrated hydrochloric acid and sodium hydroxide both carry the code H314: each is classified as corrosive to the skin and the eyes. Read the note as well as the statements.',
        [
          [
            'flinn-sds-395',
            "the sheet's title and its section 2 (hazards identification)",
            'hydrochloric acid of 6 M to 12 M, which the sheet calls concentrated, carries the signal word Danger and three hazard statements: one under the codes H314 and H318, for severe burns and damage to the skin and the eyes, in category 1; one under H332 and H302, for harm when it is swallowed or breathed in; and one under H290, for possible corrosion of metals.',
          ],
          [
            'flinn-sds-734',
            SOLID_SHEET,
            'sodium hydroxide itself, a solid with nothing else listed in it, carries the signal word Danger and two hazard statements: one under the code H314, for severe burns to the skin and damage to the eyes, in category 1; and one under H290, for possible corrosion of metals.',
          ],
        ],
        "which sheet each bottle's statements come from, and the note under them, are in the lab's record (spec 7.1). The acid's sheet gives the strengths it is for, and the card repeats them. The sheet for sodium hydroxide is for the solid with nothing else in it, and so is the sheet for phenolphthalein that the next paragraph rests on; the card calls that the pure substance, a word the sheets do not use. The acid's sheet prints H314 paired with H318 under one statement, so the card says that both carry the code, not that both carry the same statement.",
      ),
      paragraph(
        "Phenolphthalein is classified as a substance that may cause cancer, and as suspected of causing genetic defects and of harming fertility or an unborn child. Those are the statements on the indicator bottle, and they are for the pure substance. The indicator itself is a dilute solution of it in alcohol and water, and a titration uses two or three drops. A supplier's safety data sheet for a solution of this kind says that the solution is flammable, that it seriously irritates the eyes, and that it may cause cancer, may harm fertility or an unborn child, and may harm organs. The note under the statements on the indicator bottle gives the sheet's list, with its codes. The sheet calls for gloves and eye protection, and for keeping the solution away from flames.",
        [
          [
            'flinn-sds-591',
            SOLID_SHEET,
            'phenolphthalein itself, a solid with nothing else listed in it, carries the signal word Danger and three hazard statements: under H341, that it is suspected of causing genetic defects; under H350, that it may cause cancer; and under H361, that it is suspected of harming fertility or an unborn child.',
          ],
          [
            'ricca-sds-5600',
            'section 2 (hazard identification)',
            'the 0.5% indicator solution in 50% alcohol carries the signal word Danger, as a flammable liquid and vapour that seriously irritates the eyes and may cause cancer, harm fertility or an unborn child, and harm organs; and that it is to be kept away from flames and other sources of ignition and handled with protective gloves and eye protection.',
          ],
        ],
        "two or three drops is this lab's amount (spec 7.2). The first sheet is for the solid; the second is another supplier's, for a solution. That the bottle on this bench is a solution of the kind the second sheet is for is assumed (spec 7.3). The card says in its own words each of the three statements the bottle carries for the pure substance and each of the five hazards the sheet lists for the solution; the bottle's note gives the sheet's five with their codes.",
      ),
    ],
  },
]
