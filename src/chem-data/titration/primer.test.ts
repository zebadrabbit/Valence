import { describe, expect, it } from 'vitest'
import manifestFile from '../../../docs/research/phase-3/sources/MANIFEST.json'
import { findInstitutionText } from '../denylist'
import sources from '../sources.json'
import supportFile from '../support.ts?raw'
import { titrationData } from './data'
import { TITRATION_PRIMER, type PrimerParagraph } from './primer'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const manifest: { sources: { id: string; supports: { field: string }[] }[] } = manifestFile

const section = (id: string) => TITRATION_PRIMER.find((s) => s.id === id)!
const paragraphs = TITRATION_PRIMER.flatMap((s) => s.paragraphs.map((paragraph, i): [string, PrimerParagraph] => [`${s.id}[${i}]`, paragraph]))
const cited = new Set(paragraphs.flatMap(([, paragraph]) => paragraph.sourceIds))
const source = (id: string) => sources.find((s) => s.id === id)
/** Everything a card shows, as one text. */
const shown = (id: string) => section(id).paragraphs.map((p) => [p.text, p.equation ?? ''].join(' ')).join(' ')

describe('the titration primer: its cards', () => {
  it('has the twelve cards, in order', () => {
    expect(TITRATION_PRIMER.map((s) => s.id)).toEqual([
      'acids-and-bases',
      'molarity',
      'titration',
      'standardizing',
      'endpoint',
      'phenolphthalein',
      'titrating',
      'calculation',
      'burette',
      'glassware',
      'precision',
      'safety',
    ])
  })

  it('gives every card a heading of its own and at least one paragraph with text', () => {
    expect(new Set(TITRATION_PRIMER.map((s) => s.heading)).size).toBe(12)
    for (const s of TITRATION_PRIMER) {
      expect([s.id, s.heading.length > 0, s.paragraphs.length > 0]).toEqual([s.id, true, true])
    }
    for (const [where, paragraph] of paragraphs) expect([where, paragraph.text.length > 0, paragraph.equation !== '']).toEqual([where, true, true])
  })

  it('opens by naming the four cards to read before the bench, by their headings, and no other; it does not say what the other eight are for', () => {
    const first = section('acids-and-bases').paragraphs[0]!.text
    const named = TITRATION_PRIMER.filter((s) => first.includes(s.heading)).map((s) => s.id)
    expect(named).toEqual(['titrating', 'calculation', 'burette', 'glassware'])
    expect(first).toMatch(/Read four of them/)
    expect(first).toMatch(/The other eight can wait/)
    // The card on conditioning, rinsing and the tip bubble is the only one that says how to do those three steps
    // and to refill, and a trial run without one of them does not count: it is not a card that only explains why.
    expect(first).not.toMatch(/explain why/)
  })

  it('names the four in an order in which each can be followed, and explains in the first-read cards the words they lean on', () => {
    const first = section('acids-and-bases').paragraphs[0]!.text
    const at = (id: string) => first.indexOf(section(id).heading)
    // The burette card says what a burette and its stopcock are, and the other three use both. The glassware is made
    // ready before the titration, and the calculation comes last.
    expect(at('burette')).toBeLessThan(at('glassware'))
    expect(at('glassware')).toBeLessThan(at('titrating'))
    expect(at('titrating')).toBeLessThan(at('calculation'))
    expect(first).toMatch(/in this order/)
    const card = shown('titrating')
    // The titre is said to be a volume before a figure is given for it; M and the pink are explained, not assumed.
    expect(card.indexOf('called the titre')).toBeGreaterThan(-1)
    expect(card.indexOf('called the titre')).toBeLessThan(card.indexOf('× 25.00 ÷ 0.1'))
    expect(card).toMatch(/molarity, written M/)
    expect(card).toContain(section('molarity').heading)
    expect(card).toMatch(/an indicator/)
  })

  it('tells, in the cards read first, every step that a trial must have to count, and in the glassware card uses no word that only a later card explains', () => {
    const firstRead = ['burette', 'glassware', 'titrating', 'calculation'].map(shown).join(' ')
    for (const step of [/which is called conditioning it/, /the pipette is rinsed with a little of the HCl solution/, /pushed out before the first reading, by running a little NaOH through the tip/, /Refill the burette before each trial/]) {
      expect([String(step), step.test(firstRead)]).toEqual([String(step), true])
    }
    // Read second, before the card that says what the titre and the endpoint are and what M means.
    for (const word of [/\bmoles?\b/, /\bconcentration\b/, /\bendpoint\b/, /\btitre\b/]) expect([String(word), word.test(shown('glassware'))]).toEqual([String(word), false])
  })

  it('explains, in the four cards as they are read, each word at or before its first use: the two solutions by name, the pipette, the 25.00, the endpoint, the indicator and the equivalence point', () => {
    const [glassware, titrating, calculation] = ['glassware', 'titrating', 'calculation'].map(shown) as [string, string, string]
    /** True when `gloss` is where `word` is first used in `text`, or before it. */
    const glossedAtFirstUse = (text: string, word: RegExp, gloss: string) => text.includes(gloss) && text.indexOf(gloss) <= text.search(word)
    // The glassware card is the first of the four to speak of either solution or of the pipette.
    expect(shown('burette')).not.toMatch(/NaOH|HCl|pipette/)
    expect(glossedAtFirstUse(glassware, /NaOH/, 'sodium hydroxide solution (NaOH)')).toBe(true)
    expect(glossedAtFirstUse(glassware, /HCl/, 'hydrochloric acid (HCl)')).toBe(true)
    expect(glossedAtFirstUse(glassware, /pipette/, 'The pipette measures out the 25.00 mL of hydrochloric acid (HCl) that goes into the flask.')).toBe(true)
    // The titrating card names the NaOH again, and says what its 25.00 is.
    expect(glossedAtFirstUse(titrating, /NaOH/, 'sodium hydroxide solution (NaOH)')).toBe(true)
    expect(titrating).toMatch(/× 25\.00 ÷ 0\.1, where 25\.00 is the millilitres of acid in the flask/)
    expect(glossedAtFirstUse(titrating, /endpoint/, 'endpoint: the first faint pink in the flask that lasts')).toBe(true)
    // The pink is explained in the next sentence, before anything is done with it.
    expect(titrating.indexOf('an indicator: a dye that is colourless in the acid and turns pink once the acid is used up')).toBeLessThan(titrating.indexOf('Before you start'))
    expect(titrating.indexOf('Before you start')).toBeGreaterThan(-1)
    // The card that says what the equivalence point is is not one of the four.
    expect(glossedAtFirstUse(calculation, /equivalence point/, 'equivalence point: the moment when exactly enough NaOH has gone in to react with all the acid')).toBe(true)
  })

  it('holds no institution text in any heading, paragraph or equation', () => {
    const prose = [
      ...TITRATION_PRIMER.map((s): [string, string] => [`${s.id} heading`, s.heading]),
      ...paragraphs.map(([where, p]): [string, string] => [where, p.text]),
      ...paragraphs.flatMap(([where, p]): [string, string][] => (p.equation === undefined ? [] : [[`${where} equation`, p.equation]])),
    ]
    expect(prose.length).toBeGreaterThan(12 + paragraphs.length)
    for (const [what, text] of prose) expect([what, findInstitutionText(text, institutionNames)]).toEqual([what, null])
  })
})

describe('the titration primer: what each paragraph rests on', () => {
  it('cites only sources that exist, each once in a paragraph', () => {
    for (const [where, paragraph] of paragraphs) {
      expect([where, new Set(paragraph.sourceIds).size]).toEqual([where, paragraph.sourceIds.length])
      expect([where, paragraph.sourceIds.filter((id) => source(id) === undefined)]).toEqual([where, []])
    }
  })

  it('writes every support line as "This lab:" or as a located passage of a source the paragraph cites, at that source\'s address', () => {
    for (const [where, paragraph] of paragraphs) {
      const lines = paragraph.support.split('\n')
      const located = lines.filter((line) => !line.startsWith('This lab: '))
      for (const line of located) {
        const [, id, url] = /^([a-z0-9.-]+): not quoted; see .+, (https:\/\/\S+)\. It establishes that .+\.$/.exec(line) ?? []
        expect([where, line, id !== undefined && paragraph.sourceIds.includes(id)]).toEqual([where, line, true])
        expect([where, id, url]).toEqual([where, id, source(id!)?.url])
      }
      // Every cited source has its passage, and a paragraph says nothing of a source it does not cite.
      expect([where, [...new Set(located.map((line) => line.split(': ')[0]))]]).toEqual([where, paragraph.sourceIds])
      for (const line of lines.filter((line) => line.startsWith('This lab: '))) expect([where, line]).toEqual([where, expect.stringMatching(/^This lab: .+\.$/)])
    }
  })

  it('quotes nothing: no support line holds a quotation mark', () => {
    for (const [where, paragraph] of paragraphs) expect([where, /["“”‘’«»]/.test(paragraph.support)]).toEqual([where, false])
  })

  it('has exactly these paragraphs with no source, each resting on "This lab:" lines alone', () => {
    const unsourced = paragraphs.filter(([, paragraph]) => paragraph.sourceIds.length === 0)
    expect(unsourced.map(([where]) => where)).toEqual([
      // Which cards to read first.
      'acids-and-bases[0]',
      // The worked example, and the rule to round and not cut off.
      'calculation[2]',
      'calculation[3]',
      // That the lab's technique errors are larger than a bench's.
      'glassware[3]',
      // The definition of relative deviation.
      'precision[1]',
      // That the simulation replaces no safety training.
      'safety[0]',
    ])
    for (const [where, paragraph] of unsourced) {
      expect([where, paragraph.support.split('\n').every((line) => line.startsWith('This lab: '))]).toEqual([where, true])
    }
    // The definition is chemistry, so its line says outright that nothing was read for it.
    expect(section('precision').paragraphs[1]!.support).toMatch(/No source for it was read\./)
  })

  it('says, where a sourced paragraph goes further than its sources, that no source was read for that part', () => {
    // Why the wait has a length, and that a solution which has stood is standardized again.
    expect(section('titrating').paragraphs[4]!.support).toMatch(/This lab: .*no source that says so was read/)
    expect(section('standardizing').paragraphs[1]!.support).toMatch(/This lab: .*no source was read/)
  })

  it('lists in the manifest, with a primer row, exactly the sources the primer cites', () => {
    const listed = manifest.sources.filter((s) => s.supports.some((row) => row.field === 'primer')).map((s) => s.id)
    expect([...listed].sort()).toEqual([...cited].sort())
  })

  it('says nothing about a licence in the citation of any OpenStax page it cites, and gives those pages ids of their own', () => {
    const openstax = [...cited].map((id) => source(id)!).filter((s) => /openstax/i.test(s.url))
    expect(openstax.length).toBe(7)
    for (const s of openstax) {
      expect([s.id, /CC BY|licen[sc]ed/i.test(s.citation)]).toEqual([s.id, false])
      // An id beginning "openstax-" is a source the periodic table quotes, with its licence in the citation (periodic.test.ts).
      expect([s.id, s.id.startsWith('openstax-')]).toEqual([s.id, false])
    }
  })

  it('takes the passage helper from a file that imports nothing and names no source', () => {
    expect(supportFile).not.toMatch(/\bimport\b|\brequire\b/)
    expect(supportFile).not.toMatch(/openstax|pubchem|CC BY|licen[sc]/i)
    expect(supportFile).toMatch(/export function located\(url: string, where: string, establishes: string\): string/)
  })
})

describe('the titration primer: what it has to say', () => {
  it('works its examples correctly', () => {
    expect((0.1 * 0.025).toFixed(6)).toBe('0.002500')
    expect(shown('molarity')).toContain('0.1000 × 0.02500 = 0.002500')
    expect((30.6 - 0.5).toFixed(2)).toBe('30.10')
    const molarity = (0.12 * 25) / 30.1
    expect(molarity.toFixed(6)).toBe('0.099668')
    // Rounded and cut off differ, so the example shows the difference.
    expect(molarity.toFixed(4)).toBe('0.0997')
    expect((Math.floor(molarity * 1e4) / 1e4).toFixed(4)).toBe('0.0996')
    const example = shown('calculation')
    for (const figure of ['0.1200', '0.50', '30.60', '30.10', '0.1200 × 25.00 ÷ 30.10 = 0.099668', '0.0997', '0.0996']) expect([figure, example.includes(figure)]).toEqual([figure, true])
  })

  it('tells the learner, in the calculation card, to keep every digit and to round to four decimal places, not cut off', () => {
    const card = shown('calculation')
    expect(card).toContain('0.0997')
    expect(card).toMatch(/[Kk]eep every digit/)
    expect(card).toMatch(/round/i)
    expect(card).toMatch(/four decimal places/)
    expect(card).toMatch(/cut/)
  })

  it('uses a bottle no run of this lab can have in its worked example', () => {
    const [low, high] = titrationData.parameters.hclRangeE4.value
    expect([low, high]).toEqual([850, 1050])
    expect(1200).toBeGreaterThan(high)
    expect(shown('calculation')).toMatch(/only an example/)
  })

  it('gives an estimate of the endpoint that is as good as the titrating card says', () => {
    // The estimate takes the NaOH as 0.1 M; the real one is anywhere in the seeded range, so the endpoint is off by this much at most.
    const [, label] = titrationData.parameters.hclRangeE4.value
    const worst = Math.max(...titrationData.parameters.naohRangeE5.value.map((naoh) => Math.abs((label / 1e4) * 25 * (1 / 0.1 - 1e5 / naoh))))
    expect(worst.toFixed(2)).toBe('1.38')
    expect(shown('titrating')).toMatch(/× 25\.00 ÷ 0\.1/)
    expect(shown('titrating')).toMatch(/a millilitre or so/)
    // The card's own example: 0.1200 M acid, about 30 mL.
    expect(((0.12 * 25) / 0.1).toFixed(0)).toBe('30')
  })

  it("gives the 5 mL pour a figure that is safe by the model's own arithmetic: more than 7 mL short of the estimate", () => {
    const { hclRangeE4, naohRangeE5, pipetteNominalUl, pipetteOffsetUl, wetPipetteStrengthPercent, streamUl } = titrationData.parameters
    // The estimate is the label x 25.00 / 0.1. It is furthest past the real endpoint for the strongest acid, with the
    // strongest NaOH and the pipette's smallest delivery: 0.1050 x (250 - 24.97 / 0.105) = 1.28 mL.
    const label = hclRangeE4.value[1] / 1e4
    const estimate = (label * 25) / 0.1
    const earliestEndpoint = (acidPercent: number) => (label * (acidPercent / 100) * (pipetteNominalUl.value - pipetteOffsetUl.value)) / 1000 / (naohRangeE5.value[1] / 1e5)
    expect((estimate - earliestEndpoint(100)).toFixed(2)).toBe('1.28')
    // A pipette that was not rinsed takes the endpoint 2.0% earlier still: 0.1050 x (250 - 0.98 x 24.97 / 0.105) = 1.78 mL.
    // The other two technique errors do not bring it forward: a dilute burette needs more NaOH, and a bubble changes the reading.
    const furthestOut = estimate - earliestEndpoint(wetPipetteStrengthPercent.value)
    expect(furthestOut.toFixed(2)).toBe('1.78')
    const [, figure] = /Run in 5 mL at once only while you are more than (\d+) mL short of your estimate/.exec(shown('titrating')) ?? []
    expect(figure).toBe('7')
    // The pour is whole stream additions, so it is 5 mL exactly; from more than 7 mL short it ends more than 2 mL short.
    expect(5000 % streamUl.value).toBe(0)
    expect(Number(figure) - 5).toBeGreaterThan(furthestOut)
  })

  it('says in the calculation card that the endpoint stands for the equivalence point, and that four decimal places is this lab\'s convention', () => {
    const [first, , , rounding] = section('calculation').paragraphs.map((p) => p.text)
    expect(first).toMatch(/^The moles of NaOH added equal the moles of HCl in the flask at the equivalence point/)
    expect(first).not.toMatch(/At the endpoint/)
    expect(first).toMatch(/endpoint you measure stands for the equivalence point/)
    expect(rounding).toMatch(/Four decimal places is this lab's convention/)
  })

  it('says in the precision card that the average is rounded first only because the notebook works it that way', () => {
    expect(section('precision').paragraphs[1]!.text).toMatch(/to four decimal places; it is rounded first only because that is how the notebook works it\./)
  })

  it('teaches the titration itself in the titrating card', () => {
    const card = shown('titrating')
    for (const said of [/[Ss]wirl/, /5 mL/, /linger/, /one drop at a time/, /part of a drop/, /wall of the flask/, /distilled water/, /half-drop/, /30 seconds/, /carbon dioxide/, /closed/]) {
      expect([String(said), said.test(card)]).toEqual([String(said), true])
    }
  })

  it("says that the cue goes with the size of the addition: a single drop's pink clears at once again at first, and a drop's pink that lingers is the sign for half-drops", () => {
    const text = section('titrating').paragraphs[1]!.text
    const [stream, drop, half] = [/When it starts to linger, close the stopcock and add one drop at a time\./, /at first its pink clears at once again/, /When a drop's pink lingers too, change to half-drops\./].map((said) => text.search(said))
    expect(stream).toBeGreaterThan(-1)
    expect(drop).toBeGreaterThan(stream!)
    expect(half).toBeGreaterThan(drop!)
    expect(text).toMatch(/does not mean the endpoint is far off/)
    // A drop is a fifth of one addition of the stream.
    expect(titrationData.parameters.streamUl.value / titrationData.parameters.dropUl.value).toBe(5)
  })

  it('says of the wash what this bench does: the half-drop is rinsed in for the learner, and a large rinse can thin a faint pink away', () => {
    const card = shown('titrating')
    // One wash of the bench is the record's 10 mL, far more than washes a half-drop down.
    expect(titrationData.parameters.waterStepUl.value).toBe(10000)
    expect(card).toMatch(/In this lab the half-drop is rinsed in for you/)
    expect(card).toMatch(/10 mL/)
    expect(card).toMatch(/no longer shows/)
    expect(card).toMatch(/add another half-drop/)
  })

  it('carries the corrections to the other cards', () => {
    // The acid was itself standardized, and is not called a primary standard.
    expect(shown('standardizing')).toMatch(/standardiz(ed|ing) the acid/)
    expect(TITRATION_PRIMER.map((s) => shown(s.id)).join(' ')).not.toMatch(/primary standard/)
    // The solution goes on taking up carbon dioxide once made.
    expect(shown('standardizing')).toMatch(/after it is made/)
    expect(shown('standardizing')).toMatch(/kept closed/)
    expect(shown('standardizing')).toMatch(/standardized again/)
    expect(shown('glassware')).toMatch(/two or three small portions/)
    expect(shown('glassware')).toMatch(/[Rr]efill the burette before each trial/)
    expect(shown('burette')).toMatch(/eye level with/)
    expect(shown('burette')).toMatch(/reading view/)
  })

  it('says "runs out" only of a burette with nothing left to deliver: the burette card says that the reading grows as solution leaves the burette', () => {
    expect(shown('burette')).toMatch(/so the reading grows as solution leaves the burette\./)
    const saysIt = TITRATION_PRIMER.filter((s) => /\br[au]ns? out\b/.test(shown(s.id))).map((s) => s.id)
    expect(saysIt).toEqual(['glassware'])
    expect(shown('glassware')).toMatch(/A burette that runs out in the middle of a trial/)
  })

  it('says where a learner reads it what is not true to a bench: the size of each technique error, the bubble, and the burette that stays dilute', () => {
    // Spec 7.3 names the three and says the documentation tells the learner so.
    const card = shown('glassware')
    expect(card).toMatch(/more than it does at a real bench/)
    expect(card).toMatch(/holds less air than/)
    expect(card).toMatch(/in this lab it stays diluted until you condition it/)
    // A burette that was never conditioned gives results that agree only under this lab's rule, so it is not the
    // example of a mistake repeated; the example is one that repeats at a real bench too.
    expect(shown('precision')).not.toMatch(/conditioned/)
    expect(shown('precision')).toMatch(/copied wrongly from the acid bottle/)
  })

  it('names the three mistakes there, and says that a trial with one of them in it does not count even when its result is close; it does not say that each one alone fails a trial', () => {
    const paragraph = section('glassware').paragraphs[3]!.text
    for (const mistake of [/burette that was not conditioned/, /pipette that was not rinsed/, /air bubble left in the burette tip/]) expect([String(mistake), mistake.test(paragraph)]).toEqual([String(mistake), true])
    expect(paragraph).toMatch(/does not count/)
    expect(paragraph).toMatch(/even when its result is close/)
    expect(paragraph).toMatch(/opposite directions and cancel/)
    // What is left of a bubble after part of it has run out is small enough to leave a trial within 1.0% (Gate A, F8).
    expect(paragraph).not.toMatch(/on its own/)
    expect(paragraph).not.toMatch(/1\.0%/)
  })

  it('describes the three bottles in the safety card from the sources the stored bottles cite', () => {
    const safety = section('safety')
    const ids = new Set(safety.paragraphs.flatMap((p) => p.sourceIds))
    for (const [key, bottle] of Object.entries(titrationData.bottles)) {
      expect([key, ids.has(bottle.hazards.sourceId), ids.has(bottle.hazards.note.sourceId)]).toEqual([key, true, true])
      // A note that rests on two sheets has both under the card.
      expect([key, bottle.hazards.note.alsoSourceId === undefined || ids.has(bottle.hazards.note.alsoSourceId)]).toEqual([key, true])
    }
    // And the card rests on no sheet that no bottle cites: the sheets it rested on before the owner's answer of 2026-10-05 are gone.
    const cited = new Set(Object.values(titrationData.bottles).flatMap(({ hazards }) => [hazards.sourceId, hazards.note.sourceId, hazards.note.alsoSourceId]))
    expect([...ids].filter((id) => /sds/.test(id) && !cited.has(id))).toEqual([])
    expect([...ids].filter((id) => /fisher|pubchem/.test(id))).toEqual([])
    // The acid bottle's statements are a sheet's for concentrated hydrochloric acid, not those of a pure substance (D4, as the owner confirmed it on 2026-10-05).
    expect(shown('safety')).not.toMatch(/pure hydrochloric|pure hydrogen chloride/)
    expect(shown('safety')).toMatch(/replaces/)
    // Which supplier's indicator is on the bench is assumed, so no sheet is called the sheet of this lab's bottle.
    expect(shown('safety')).not.toMatch(/The supplier's/)
    expect(shown('safety')).toMatch(/A supplier's safety data sheet for a solution of this kind/)
  })

  it("says what the acid bottle's statements are for: concentrated acid, with its strength, from the sheet the bottle cites", () => {
    const { text, support, sourceIds } = section('safety').paragraphs[2]!
    const { hcl, naoh } = titrationData.bottles
    expect(text).toMatch(/Those on the acid bottle are for concentrated hydrochloric acid, 6 M to 12 M, and those on the other two bottles are for the pure substance\./)
    expect(text).not.toMatch(/as such/)
    // The strength the card gives is the one in the heading over the bottle's statements.
    expect(hcl.classifiedAs).toContain('concentrated hydrochloric acid (6 M to 12 M)')
    // The paragraph rests on the two sources the two bottles' statements are read from, and on no other.
    expect(sourceIds).toEqual([hcl.hazards.sourceId, naoh.hazards.sourceId])
    expect(sourceIds).toEqual(['flinn-sds-395', 'flinn-sds-734'])
    expect(support).not.toMatch(/pubchem|Australia|H335|Regulation|entry/)
    // The other two bottles' statements are each a sheet's for the solid with nothing else in it, which the card calls the pure substance.
    expect(naoh.classifiedAs).toContain('solid sodium hydroxide, the pure substance')
    expect(titrationData.bottles.indicator.classifiedAs).toContain('solid phenolphthalein, the pure substance')
    // Its support line for the base's sheet says what that bottle stores of it: the form, the signal word and every code.
    const ofTheBase = support.split('\n')[1]!
    expect(ofTheBase).toMatch(/^flinn-sds-734: not quoted; see /)
    expect(ofTheBase).toMatch(/solid/)
    expect(ofTheBase).toMatch(/signal word Danger/)
    expect(ofTheBase.match(/H\d{3}/g)!.sort()).toEqual(naoh.hazards.statements.map((statement) => statement.split(':')[0]!).sort())
    // Its support line says of the sheet what the bottle stores of it: the signal word and every code.
    const [ofTheSheet] = support.split('\n')
    expect(ofTheSheet).toMatch(/^flinn-sds-395: not quoted; see /)
    expect(ofTheSheet).toMatch(/6 M to 12 M/)
    expect(ofTheSheet).toMatch(/signal word Danger/)
    const codes = hcl.hazards.statements.flatMap((statement) => statement.split(':')[0]!.split('+'))
    for (const code of codes) expect([code, ofTheSheet!.includes(code)]).toEqual([code, true])
    expect(ofTheSheet!.match(/H\d{3}/g)!.sort()).toEqual([...codes].sort())
    // What the card says both bottles carry is on both: the code H314, the acid's paired with another code.
    expect(text).toMatch(/both carry the code H314/)
    expect(hcl.hazards.statements[0]).toMatch(/^H314\+H318: /)
    expect(naoh.hazards.statements[0]).toMatch(/^H314: /)
    // The acid's sheet gives the strengths it is for, so the card's own line no longer says that no entry read gives one.
    expect(support).toMatch(/This lab: .*The acid's sheet gives the strengths it is for/)
    expect(support).not.toMatch(/The entries read do not say|does not say at what strength/)
  })

  it("says of the dilute acid and base what the supplier's sheets for their strength give, every statement of each: the acid at the line between two sheets and treated as the stricter says, the base an irritant", () => {
    const { text, support, sourceIds } = section('safety').paragraphs[1]!
    const { hcl, naoh } = titrationData.bottles
    // The two sentences the paragraph opened with stand as they were.
    expect(text).toMatch(/^In a real laboratory this experiment is done wearing eye protection and gloves\. The acid and the base are dilute, about 0\.1 M\. Even so, /)
    // It rests on the sheets under the two bottles' notes, and on the lab page that says what students wear.
    expect(sourceIds).toEqual([hcl.hazards.note.alsoSourceId, hcl.hazards.note.sourceId, naoh.hazards.note.sourceId, 'smc-equivalent-mass-lab'])
    expect(sourceIds.slice(0, 3)).toEqual(['flinn-sds-395.3', 'flinn-sds-395.2', 'flinn-sds-735.2'])
    // The acid: both sheets, each by its strengths and with every statement of it, and which one to go by.
    expect(text).toMatch(/The acid's strength sits at the line between two of the sheets\./)
    const under = /The one for hydrochloric acid of less than 0\.1 M says ([^.]+)\./.exec(text)![1]!
    for (const said of [/irritates the skin and the eyes/, /may be harmful if it is swallowed, breathed in or gets on the skin/]) expect([String(said), said.test(under)]).toEqual([String(said), true])
    const over = /The one for 0\.1 M to 2\.4 M says ([^.]+)\./.exec(text)![1]!
    for (const said of [/burns the skin severely and damages the eyes/, /may irritate the airways/, /may be harmful if swallowed/]) expect([String(said), said.test(over)]).toEqual([String(said), true])
    expect(text).toMatch(/Treat the acid as the stricter sheet says\./)
    // The base: its sheet classes it as an irritant, and the card no longer says that a sheet does not class it as hazardous.
    expect(text).toMatch(/The sheet for sodium hydroxide solutions of less than 0\.3 M says that the solution irritates the skin and the eyes\./)
    expect(text).not.toMatch(/does not class it as hazardous|not the same as harmless|15 minutes|flushed/)
    // What all three sheets ask for, in the words the two notes use.
    expect(text).toMatch(/All three sheets call for eye protection, gloves and protective clothing, and say that a splash in the eyes is to be rinsed with water for several minutes and a splash on the skin washed off with water\.$/)
    for (const note of [hcl.hazards.note.value, naoh.hazards.note.value]) {
      expect(note).toMatch(/eye protection, gloves and protective clothing/)
      expect(note).toMatch(/rinsed with water for several minutes/)
    }
    // The card is in the lab's own words; the codes are in the notes. Its support lines give every code the notes give.
    expect(text).not.toMatch(/H\d{3}|Warning|Danger/)
    const lines = support.split('\n')
    const codesIn = (texts: string) => [...new Set(texts.match(/H\d{3}/g))].sort()
    expect(codesIn(lines.slice(0, 2).join(' '))).toEqual(codesIn(hcl.hazards.note.value))
    expect(codesIn(lines[2]!)).toEqual(codesIn(naoh.hazards.note.value))
    expect(lines[0]).toMatch(/^flinn-sds-395\.3: .*signal word Warning/)
    expect(lines[1]).toMatch(/^flinn-sds-395\.2: .*signal word Danger/)
    expect(lines[2]).toMatch(/^flinn-sds-735\.2: .*signal word Warning/)
    expect(support).toMatch(/This lab: .*0\.0850 to 0\.1050 M/)
  })

  it("says of the indicator all that its bottle says, and which is which: the three statements of the pure substance, and each of the five hazards that a sheet for the solution lists, which the bottle's note gives with their codes", () => {
    const { text, support, sourceIds } = section('safety').paragraphs[3]!
    const sentences = text.split(/(?<=\.) /)
    // The statements on the bottle are the pure substance's, and the card leaves none of the three out.
    const { statements, note } = titrationData.bottles.indicator.hazards
    expect(statements.map((statement) => statement.split(':')[0])).toEqual(['H341', 'H350', 'H361'])
    // The sheet's third statement is for fertility or the unborn child, and the card says both: it said fertility alone when the bottle carried H361f.
    expect(statements[2]).toMatch(/fertility or the unborn child$/)
    for (const said of [/may cause cancer/, /suspected of causing genetic defects/, /suspected of causing genetic defects and of harming fertility or an unborn child\.$/]) expect([String(said), said.test(sentences[0]!)]).toEqual([String(said), true])
    // It rests on the sheet the bottle's statements come from and on the sheet under its note, and on no PubChem record.
    expect(sourceIds).toEqual([titrationData.bottles.indicator.hazards.sourceId, note.sourceId])
    expect(sourceIds[0]).toBe('flinn-sds-591')
    expect(support).not.toMatch(/pubchem|Regulation|entry/)
    expect(support.split('\n')[0]!.match(/H\d{3}/g)).toEqual(['H341', 'H350', 'H361'])
    expect(sentences[1]).toBe('Those are the statements on the indicator bottle, and they are for the pure substance.')
    // The note under them is a sheet's for the solution, with five codes, and the card leaves none of the five out.
    for (const code of ['H226', 'H319', 'H350', 'H360', 'H371']) expect([code, note.value.includes(code)]).toEqual([code, true])
    const ofTheSheet = sentences.find((sentence) => sentence.startsWith("A supplier's safety data sheet for a solution of this kind"))!
    for (const said of [/flammable/, /seriously irritates the eyes/, /may cause cancer/, /may harm fertility or an unborn child/, /may harm organs/]) expect([String(said), said.test(ofTheSheet)]).toEqual([String(said), true])
    // No summary by kind that two of the five do not fit, and no list called full that is another list.
    expect(text).not.toMatch(/over the long term|among other things|the full list/)
    expect(text).toMatch(/The note under the statements on the indicator bottle gives the sheet's list, with its codes\./)
    // The card is in the lab's own words; the codes are the bottle's.
    expect(text).not.toMatch(/H\d{3}/)
    // What the card rests on says as much as the card does.
    for (const said of [/genetic defects/, /irritates the eyes/, /fertility or an unborn child/, /harm organs/]) expect([String(said), said.test(support)]).toEqual([String(said), true])
    expect(support).not.toMatch(/by kind/)
  })
})
