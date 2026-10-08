import { describe, expect, it } from 'vitest'
import { hclNahco3 as mechanism } from './data'
import type { Step } from './schema'
import { ENERGY_PANEL, PREDICTION, chapterAnnouncement, chapterHeading, energyLines, energyPanelNotes, kJ, predictionFeedback, stepNotes, timescaleLabel } from './wording'

const steps = mechanism.chapters.filter((c): c is Step => c.kind === 'step')
const words = (text: string) => text.split(/\s+/).filter(Boolean).length
const sentences = (text: string) => text.split(/(?<=[.?!])\s+/).filter(Boolean)

describe('kJ', () => {
  it('prints one decimal, a plus or a true minus, and the unit', () => {
    expect(kJ(18.7)).toBe('+18.7 kJ/mol')
    expect(kJ(-42.393)).toBe('−42.4 kJ/mol')
    expect(kJ(2.325)).toBe('+2.3 kJ/mol')
    expect(kJ(0)).toBe('0.0 kJ/mol')
    // A value that rounds to nothing has no sign.
    expect(kJ(-0.04)).toBe('0.0 kJ/mol')
  })
})

describe('chapter titles, headings and what is announced on a change of chapter', () => {
  it('heads a step with its number and the others with their title', () => {
    expect(mechanism.chapters.map((c) => chapterHeading(mechanism, c.id))).toEqual([
      'In the beaker',
      'Before mixing',
      'Step 1 of 4: Dissolving',
      'Step 2 of 4: Proton transfer',
      'Step 3 of 4: Decomposition',
      'Step 4 of 4: Gas escapes',
      'Back in the beaker',
    ])
  })

  it('announces a step with its real timescale, and the prologue and the bookends by their heading alone', () => {
    expect(mechanism.chapters.map((c) => chapterAnnouncement(mechanism, c.id))).toEqual([
      'In the beaker.',
      'Before mixing.',
      'Step 1 of 4: Dissolving. Real time: seconds, depending on particle size and stirring.',
      'Step 2 of 4: Proton transfer. Real time: picoseconds to nanoseconds.',
      'Step 3 of 4: Decomposition. Real time: tens of milliseconds; the slower of the two steps that change bonds.',
      'Step 4 of 4: Gas escapes. Real time: seconds.',
      'Back in the beaker.',
    ])
  })

  it('labels the track with the timescales of spec 9.2, "before mixing" on the prologue and nothing on a bookend', () => {
    expect(mechanism.chapters.map(timescaleLabel)).toEqual([null, 'before mixing', 'seconds, depending on particle size and stirring', 'picoseconds to nanoseconds', 'tens of milliseconds; the slower of the two steps that change bonds', 'seconds', null])
  })

  it('refuses a chapter it has not', () => {
    expect(() => chapterHeading(mechanism, 'no-such')).toThrow(/no chapter "no-such"/)
    expect(() => energyLines(mechanism, 'prologue')).toThrow(/"prologue" is not a step/)
  })
})

describe('the explanations: plain and short, for a reader with no chemistry background', () => {
  it('each chapter has both depths, the first short and the second not long', () => {
    for (const { id, explanation } of mechanism.chapters) {
      expect([id, words(explanation.intro) <= 40]).toEqual([id, true])
      expect([id, words(explanation.expanded) <= 130]).toEqual([id, true])
      expect([id, words(explanation.expanded) > words(explanation.intro)]).toEqual([id, true])
      for (const sentence of [...sentences(explanation.intro), ...sentences(explanation.expanded)]) expect([sentence, words(sentence) <= 32]).toEqual([sentence, true])
    }
  })

  it('the first depth uses no term of the trade', () => {
    for (const { id, explanation } of mechanism.chapters) {
      expect([id, /proton|lone pair|electron|entropy|enthalpy|free energy|spectator|equilibri|pKa|kJ|mol\b|standard/i.test(explanation.intro)]).toEqual([id, false])
    }
  })

  it('the second depth says what a term means where it first uses it', () => {
    const defined: [RegExp, RegExp][] = [
      [/\bproton/, /proton is a hydrogen atom without its electron|a proton: a hydrogen atom without its electron/],
      [/lone pair/, /A lone pair is a pair of electrons on one atom that is not shared in a bond/],
      [/spectator/, /Ions like these are called spectator ions/],
      [/free energy/, /free energy, which counts both heat and how spread out things become/],
      [/double bond/, /a double bond, two shared pairs of electrons/],
    ]
    for (const { id, explanation } of mechanism.chapters) {
      for (const [term, definition] of defined) {
        const first = explanation.expanded.search(term)
        if (first < 0) continue
        const at = explanation.expanded.search(definition)
        expect([id, String(term), at >= 0 && at <= first]).toEqual([id, String(term), true])
      }
    }
    // What a bond is and what an ion is are said in the first two chapters, and an ion again where step 1 first shows one come apart.
    expect(mechanism.chapters[0]!.explanation.expanded).toContain('Each stick is a bond: a pair of electrons that two atoms share.')
    expect(mechanism.chapters[1]!.explanation.expanded).toMatch(/^An ion is an atom, or a group of atoms, that carries a charge\./)
    expect(mechanism.chapters[2]!.explanation.intro).toContain('ions: atoms, or groups of atoms, that carry a charge')
  })

  it('says of each step what spec 9.2 says happens in it', () => {
    const [dissolving, transfer, decomposition, escape] = steps.map((s) => `${s.explanation.intro} ${s.explanation.expanded}`)
    expect(dissolving).toMatch(/Sodium ions go one way and hydrogen carbonate ions another/)
    expect(transfer).toMatch(/hydronium ion.*hands that hydrogen over.*carbonic acid, H₂CO₃/)
    expect(decomposition).toMatch(/splits into water and carbon dioxide/)
    expect(decomposition).toMatch(/a water molecule passes it along/)
    expect(escape).toMatch(/gather into bubbles, rise and leave/)
    // The sodium ion took part in step 1, where the list beside the scene says so: the words do not say it took part in nothing.
    expect(escape).toMatch(/sodium ion has done nothing since it dissolved, and the chloride ion nothing at all: both stay in the water/)
    expect(JSON.stringify(mechanism.chapters)).not.toMatch(/took no part in any step|no part in this step or in any other/)
    // "Its molecules" after a sentence about the water read as the water's: the bubbles are carbon dioxide.
    expect(escape).toMatch(/The carbon dioxide molecules gather into bubbles/)
    expect(mechanism.chapters[1]!.explanation.intro).toMatch(/in water it has come apart completely/)
  })

  it('says what of the picture is its own drawing: how the molecules move, in the first chapter, and how the hydrogen crosses, in step 3', () => {
    expect(mechanism.chapters[0]!.explanation.expanded).toMatch(/How the molecules move and turn along the way is this timeline's own drawing, not a path that has been measured\./)
    expect(steps[2]!.explanation.expanded).toMatch(/How the hydrogen crosses is this timeline's own drawing, not a measured path\./)
  })

  it('says that dissolving takes in heat, which is what its enthalpy says, and not that it is the pulling apart alone', () => {
    expect(steps[0]!.explanation.expanded).toMatch(/Dissolving this solid takes in heat\.$/)
    expect(steps[0]!.deltaH!.value).toBeGreaterThan(0)
  })

  it('the figures the words give are the record\'s', () => {
    const { lifetime } = mechanism.thermo.carbonicAcid
    const all = mechanism.chapters.map((c) => `${c.explanation.intro} ${c.explanation.expanded} ${c.kind === 'step' ? JSON.stringify(c.question) : ''}`).join(' ')
    expect(all.match(/about \d+ thousandths of a second/g)!.every((said) => said === `about ${lifetime.value} thousandths of a second`)).toBe(true)
    expect(lifetime.unit).toBe('ms')
    // No other number is given in the explanations or the questions, but the count of steps and the number of a step.
    expect(all.replace(/about 60 thousandths/g, '').match(/\d+(\.\d+)?/g)).toEqual(['3'])
  })
})

describe('the energy panel', () => {
  it('gives each step its free energy, its enthalpy and its barrier, each with where it is from', () => {
    const shown = steps.map((s) => energyLines(mechanism, s.id).map((line) => `${line.text} [${line.tag ?? 'none'}]`))
    expect(shown).toEqual([
      ['ΔG = +2.3 kJ/mol [from cited values]', 'ΔH = +18.7 kJ/mol [from cited values]'],
      ['ΔG = −19.9 kJ/mol [from cited values]', 'ΔH: counted with step 3 [none]', 'Barrier: no value [not to scale]'],
      ['ΔG = −16.4 kJ/mol [derived]', 'ΔH = −7.6 kJ/mol for steps 2 and 3 together [from cited values]', 'Barrier: about 66 kJ/mol [derived]'],
      ['ΔG = −8.4 kJ/mol [from cited values]', 'ΔH = +20.3 kJ/mol [from cited values]'],
    ])
    expect(ENERGY_PANEL.notToScale).toBe('not to scale')
    expect(ENERGY_PANEL.basis.derived).toBe('derived')
  })

  it('the values as shown add up to the totals as shown', () => {
    const parse = (text: string) => Number(/= ([+−][\d.]+) kJ/.exec(text)![1]!.replace('−', '-'))
    const sum = (quantity: string) => steps.flatMap((s) => energyLines(mechanism, s.id)).filter((line) => line.quantity === quantity && line.text.includes('=')).reduce((total, line) => total + parse(line.text), 0)
    expect(sum('deltaG').toFixed(1)).toBe('-42.4')
    expect(sum('deltaH').toFixed(1)).toBe('31.4')
  })

  it('says how each value was obtained, and names the sources it rests on', () => {
    const methods = Object.fromEntries(steps.flatMap((s) => energyLines(mechanism, s.id).map((line) => [`${s.id} ${line.quantity}`, line.method])))
    expect(methods).toEqual({
      'dissolving deltaG': 'From the formation values of the NBS tables, products less reactants, for NaHCO₃(s) → Na⁺(aq) + HCO₃⁻(aq).',
      'dissolving deltaH': 'From the formation values of the NBS tables, products less reactants, for NaHCO₃(s) → Na⁺(aq) + HCO₃⁻(aq).',
      'proton-transfer deltaG': 'From the acid constant of the carbonic acid molecule itself, pKa 3.49: −RT ln 10 × pKa, at 25 °C.',
      'proton-transfer deltaH': 'No separate enthalpy of the carbonic acid molecule is cited.',
      'proton-transfer activationG': 'No value for this barrier was read from a source. Its height on the curve is a drawing choice.',
      'decomposition deltaG': "Derived: the NBS tables' total for H⁺(aq) + HCO₃⁻(aq) → CO₂(aq) + H₂O(l), less step 2.",
      'decomposition deltaH': 'From the formation values of the NBS tables, products less reactants, for H⁺(aq) + HCO₃⁻(aq) → CO₂(aq) + H₂O(l).',
      'decomposition activationG': 'Derived by the Eyring equation, at 25 °C, from how long a carbonic acid molecule lasts: about 60 ms.',
      'gas-escapes deltaG': 'From the formation values of the NBS tables, products less reactants, for CO₂(aq) → CO₂(g).',
      'gas-escapes deltaH': 'From the formation values of the NBS tables, products less reactants, for CO₂(aq) → CO₂(g).',
    })
    const lines = steps.flatMap((s) => energyLines(mechanism, s.id))
    expect(lines.filter((line) => line.tag === 'from cited values' || line.tag === 'derived').every((line) => line.sourceIds.length > 0)).toBe(true)
    expect(lines.filter((line) => line.tag === 'derived').every((line) => line.method.startsWith('Derived'))).toBe(true)
  })

  it('carries the notes spec 9.2 asks for: slightly uphill on step 1, not to scale on a schematic barrier, derived where a value is', () => {
    expect(stepNotes(mechanism, 'dissolving')).toEqual(['Slightly uphill when both ions are at 1 M. It dissolves all the same: the ions start far more dilute than that, and the acid removes HCO₃⁻ as it forms.'])
    expect(stepNotes(mechanism, 'proton-transfer')).toEqual([
      'The acid constant of the carbonic acid molecule itself, with an uncertainty of 0.05. It was measured at 20.5 °C and is used here at 25 °C with no correction. The 6.35 of textbooks is a different constant: it counts dissolved carbon dioxide as if it were the acid.',
      'No separate heat of forming the carbonic acid molecule is cited, so the enthalpy curve shows steps 2 and 3 as one change.',
      'The barrier of this step is drawn not to scale: no value for it was read from a source.',
    ])
    expect(stepNotes(mechanism, 'decomposition')).toEqual([
      'The free energy of this step is derived, not read from a table: it is what is left of the total for two steps when the other step is taken away.',
      'No separate heat of forming the carbonic acid molecule is cited, so the enthalpy curve shows steps 2 and 3 as one change.',
      'The barrier of this step is derived from how long carbonic acid lasts, not measured directly.',
    ])
    expect(stepNotes(mechanism, 'gas-escapes')).toEqual([])
    // Step 1 is the one step that is uphill in free energy, and only slightly.
    expect(steps.filter((s) => s.deltaG.value > 0).map((s) => s.id)).toEqual(['dissolving'])
    expect(steps[0]!.deltaG.value).toBeLessThan(5)
  })

  it('its note says what spec 9.2 gives it to say, with the totals and what standard conditions are', () => {
    const [note, totals, standard] = energyPanelNotes(mechanism)
    expect(note).toBe(
      'Heat is absorbed in dissolving the solid and in releasing the gas. Enthalpy, H, keeps count of that heat: where ΔH is above zero, heat is taken in. The reaction goes forward all the same, because the escaping gas increases entropy: a measure of how spread out matter and energy are. Free energy (Gibbs free energy, G) counts both the heat and the entropy. A change runs by itself when G falls.',
    )
    expect(totals).toBe('Over the whole change, ΔH = +31.4 kJ/mol and ΔG = −42.4 kJ/mol.')
    expect(standard).toBe('Standard conditions: 25 °C; a pure solid or liquid; a gas at 1 bar; a dissolved species at one mole per kilogram of water, which is close to 1 M.')
    // Heat is absorbed in exactly the two steps the note names, and the whole change takes in heat while free energy falls.
    expect(steps.filter((s) => (s.deltaH?.value ?? 0) > 0).map((s) => s.id)).toEqual(['dissolving', 'gas-escapes'])
  })
})

describe('the prediction questions of Challenge mode', () => {
  const questions = steps.map((s) => s.question!)

  it('there is one before each step, under the lead "What happens next?"', () => {
    expect(PREDICTION.lead).toBe('What happens next?')
    expect(questions.map((q) => q.id)).toEqual(['dissolving', 'proton-transfer', 'decomposition', 'gas-escapes'])
    expect(questions.map((q) => q.prompt)).toEqual([
      'The solid is about to go into the acid. What happens to it first?',
      'A hydronium ion, H₃O⁺, meets the hydrogen carbonate ion, HCO₃⁻. What happens next?',
      'Carbonic acid, H₂CO₃, has formed. What happens to it next?',
      'Carbon dioxide is dissolved in the liquid, with sodium ions and chloride ions near it. What happens next?',
    ])
  })

  it('each has one right answer and three wrong ones, and the right one is not always in the same place', () => {
    for (const q of questions) {
      expect(q.options).toHaveLength(4)
      expect(q.options.filter((o) => o.correct)).toHaveLength(1)
    }
    expect(questions.map((q) => q.options.findIndex((o) => o.correct))).toEqual([1, 0, 2, 3])
    expect(questions.map((q) => q.options.find((o) => o.correct)!.text)).toEqual([
      'It comes apart into sodium ions and hydrogen carbonate ions.',
      'The hydronium ion gives a proton to the hydrogen carbonate ion, making carbonic acid, H₂CO₃.',
      'It splits into a water molecule and a carbon dioxide molecule.',
      'The carbon dioxide gathers into bubbles and leaves, and the two kinds of ion stay dissolved.',
    ])
  })

  it('the right answer is what the step does', () => {
    const [, transfer, decomposition] = steps
    expect(transfer!.bondsFormed).toEqual([['o-acceptor', 'h-transfer']])
    expect(decomposition!.bondsBroken).toContainEqual(['c', 'o-acceptor'])
    const end = mechanism.keyframes.find((k) => k.t === steps[3]!.range[1])!
    expect(end.species.map((s) => ('ion' in s ? s.ion : s.speciesId))).toEqual(['Na', 'carbon-dioxide', 'water', 'water', 'water', 'Cl'])
  })

  it('a wrong answer is plausible: a whole sentence about the species of the scene, no longer or shorter than the right one by half, and none is a joke or "none of these"', () => {
    for (const q of questions) {
      const right = q.options.find((o) => o.correct)!
      for (const wrong of q.options.filter((o) => !o.correct)) {
        expect([wrong.text, /^[A-Z].*\.$/.test(wrong.text)]).toEqual([wrong.text, true])
        expect([wrong.text, /sodium|hydrogen carbonate|carbon dioxide|carbonic acid|proton|hydrogens|carbonate ion|NaHCO₃|atoms/.test(wrong.text)]).toEqual([wrong.text, true])
        expect([wrong.text, /none of|all of|nothing happens|explod/i.test(wrong.text)]).toEqual([wrong.text, false])
        const ratio = wrong.text.length / right.text.length
        expect([wrong.text, ratio > 0.6 && ratio < 1.6]).toEqual([wrong.text, true])
      }
      expect(new Set(q.options.map((o) => o.text)).size).toBe(4)
    }
  })

  it('the feedback to a question gives away no answer that is still to be asked', () => {
    // What the right answer to each later question turns on, and no earlier one's words may say.
    const later: RegExp[] = [/./, /proton|carbonic acid/i, /splits?\b|water molecule and a carbon dioxide/i, /bubbles|stay dissolved/i]
    questions.forEach((q, i) => {
      for (const option of q.options) for (const ahead of later.slice(i + 1)) expect([q.id, option.id, ahead.test(option.feedback) || ahead.test(option.text) || ahead.test(q.prompt)]).toEqual([q.id, option.id, false])
    })
  })

  it('the feedback explains: a right answer is confirmed with the reason, and a wrong one is told why it is not so and what is', () => {
    for (const q of questions) {
      for (const option of q.options) {
        const feedback = predictionFeedback(mechanism, q.id, option.id)!
        expect(feedback.correct).toBe(option.correct)
        expect(feedback.text.startsWith(option.correct ? 'Yes. ' : 'Not this one. ')).toBe(true)
        // More than a verdict: at least two sentences, and for a wrong answer never the bare right answer repeated.
        expect([option.id, sentences(feedback.text).length >= (option.correct ? 2 : 3)]).toEqual([option.id, true])
        expect(option.feedback).not.toMatch(/^(Yes|No|Not|Wrong|Incorrect)\b/.test(option.feedback) && !option.correct ? /.*/ : /^$/)
      }
      expect(new Set(q.options.map((o) => o.feedback)).size).toBe(4)
    }
    expect(predictionFeedback(mechanism, 'proton-transfer', 'pair')).toEqual({
      correct: false,
      text: 'Not this one. The opposite charges do bring them together, but they do not stay as a pair. A proton moves across, and that leaves two molecules with no charge: carbonic acid and water.',
    })
    expect(predictionFeedback(mechanism, 'proton-transfer', 'no-such')).toBeNull()
    expect(predictionFeedback(mechanism, 'no-such', 'pair')).toBeNull()
  })
})
