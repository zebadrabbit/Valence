import { describe, expect, it } from 'vitest'
import { FAMILIES, LIQUID_IDS, mixingData as data, PAIR_IDS, PART_IDS, QUESTION_IDS, SOLID_IDS, SOLID_TUBE_IDS, type LiquidId, type PairId, type SolidTubeId, type TubeId } from '@/chem-data/mixing/data'
import { findInstitutionText } from '@/chem-data/denylist'
import { benchView, can, createLab, LAYERS, modelFrom, pairOf, pairView, reduce, ruleView, SOLID_SEEN, solidTubeOf, solidTubeView, STAGES, tubeView, type Action, type Blocked, type MixingState, type Reason, type TubeShows, type TubeView } from '@/engine/mixing'
import { run, wholeLab, wholePair, wholePairs, wholeSolids, wholeSolidTube } from '@/engine/mixing/testkit'
import {
  addLabel,
  amountsText,
  benchLines,
  BLOCKED_TEXT,
  choiceLabel,
  CHOOSE_TEXT,
  countShort,
  countText,
  FAMILY_LABEL,
  FORM_TEXT,
  GUIDED_TEXT,
  HAZARD_TEXT,
  hazardsText,
  LAB_TEXT,
  LAYERS_LABEL,
  liquidHolds,
  liquidName,
  MARK_TEXT,
  markText,
  MODE_TEXT,
  MOLECULE_LINK,
  moreLabel,
  NOT_SETTLED_TEXT,
  NOTES_TEXT,
  OUTCOME_LABEL,
  PAGE_TEXT,
  pairName,
  pairOffBenchText,
  PART_AIM,
  PART_LABEL,
  PART_STATUS,
  partName,
  partNotes,
  partNumber,
  partStatus,
  partText,
  pourLabel,
  questionText,
  REASON_TEXT,
  RECORD_TEXT,
  recordedLine,
  RULE_TEXT,
  ruleOutcomeText,
  SOLID_LABEL,
  solidHolds,
  solidInName,
  solidName,
  solidOffBenchText,
  sortedLine,
  sortQuestion,
  SOURCES_TEXT,
  STAGE_TEXT,
  STEP_TEXT,
  theLiquid,
  theSolid,
  TUBE_HINT,
  TUBE_STATUS,
  tubeName,
  tubeNote,
  tubeOutcomeText,
  tubeParts,
  tubeStatus,
  tubeText,
} from './messages'

// The sentences of the polarity and mixing lab's page, against the engine's views of the real record. The model is
// made from the record through the engine's public door, as a page makes it.
const m = modelFrom(data)
const TUBES: readonly TubeId[] = [...PAIR_IDS, ...SOLID_TUBE_IDS]
const lab = (mode: 'guided' | 'challenge' = 'challenge') => createLab(mode)
const liquidsOf = (id: PairId) => data.pairs.find((p) => p.id === id)!.liquidIds
/** A tube at each point of its run: empty, filled, shaken, stood. For a pair, with more of the liquid given. */
const stagesOf = (id: TubeId, more?: LiquidId): MixingState[] => {
  const steps: Action[] = id.includes('+') ? [{ type: 'pour', tube: id as PairId, more: more ?? liquidsOf(id as PairId)[0] }, { type: 'shake', tube: id }, { type: 'stand', tube: id }] : [{ type: 'add', tube: id as SolidTubeId }, { type: 'shake', tube: id }, { type: 'stand', tube: id }]
  return [0, 1, 2, 3].map((n) => run(m, lab(), steps.slice(0, n)))
}
/** Every tube the lab can show, as its view: every pair with more of either liquid, and every solid in a liquid, at every stage. */
const everyView = (): TubeView[] => [...PAIR_IDS.flatMap((id) => liquidsOf(id).flatMap((more) => stagesOf(id, more).map((s) => tubeView(m, s, id)))), ...SOLID_TUBE_IDS.flatMap((id) => stagesOf(id).map((s) => tubeView(m, s, id)))]
const stood = (id: PairId, more: LiquidId) => pairView(m, stagesOf(id, more)[3]!, id)
/** The names of the liquids and the solids, and the words of the two families: none belongs in what is said of a tube as it is seen. */
const NAMES = /water|alcohol|vinegar|\boil|salt|sugar/i
const ANSWERS = /mix|dissolv|polar|famil|dens|floats|sinks/i

describe('the description in words of every tube (spec 25.5, last item)', () => {
  it('says an empty tube, and a tube not yet settled, in the same words whatever is in it', () => {
    for (const id of PAIR_IDS) {
      const colour = id.includes('vegetable-oil') ? 'A cloudy pale yellow liquid' : 'A cloudy liquid with no colour'
      for (const more of liquidsOf(id)) expect(stagesOf(id, more).slice(0, 3).map((s) => tubeText(tubeView(m, s, id))), id).toEqual(['An empty tube.', `${colour}, not yet settled.`, `${colour}, not yet settled.`])
    }
  })

  it('says a pair that has stood as one layer or as two, the top one first, each with how thick it is and its colour', () => {
    expect(tubeText(stood('water+vinegar', 'water'))).toBe('One layer: a clear liquid with no colour.')
    expect(tubeText(stood('vegetable-oil+mineral-oil', 'mineral-oil'))).toBe('One layer: a clear pale yellow liquid.')
    expect(tubeText(stood('water+vegetable-oil', 'water'))).toBe('Two layers. On top, the thinner of the two: a clear pale yellow liquid. Underneath, the thicker of the two: a clear liquid with no colour.')
    expect(tubeText(stood('water+vegetable-oil', 'vegetable-oil'))).toBe('Two layers. On top, the thicker of the two: a clear pale yellow liquid. Underneath, the thinner of the two: a clear liquid with no colour.')
    expect(tubeText(stood('rubbing-alcohol+vegetable-oil', 'rubbing-alcohol'))).toBe('Two layers. On top, the thicker of the two: a clear liquid with no colour. Underneath, the thinner of the two: a clear pale yellow liquid.')
    expect(tubeText(stood('water+mineral-oil', 'water'))).toBe('Two layers. On top, the thinner of the two: a clear liquid with no colour. Underneath, the thicker of the two: a clear liquid with no colour.')
  })

  it('says every pair that has stood in one of those two forms, as its view has it: two layers exactly where the picture has a second liquid', () => {
    for (const id of PAIR_IDS) {
      for (const more of liquidsOf(id)) {
        const view = stood(id, more)
        const text = tubeText(view)
        if (view.shows.above) expect(text, id).toMatch(/^Two layers\. On top, the (thicker|thinner) of the two: a clear [a-z ]+\. Underneath, the (thicker|thinner) of the two: a clear [a-z ]+\.$/)
        else expect(text, id).toMatch(/^One layer: a clear [a-z ]+\.$/)
      }
    }
  })

  it('says a solid in a liquid at each point: at the bottom, spread through a cloudy liquid, and then gone or at the bottom again', () => {
    expect(stagesOf('salt-in-water').map((s) => tubeText(tubeView(m, s, 'salt-in-water')))).toEqual([
      'An empty tube.',
      'A clear liquid with no colour, with a white solid lying at the bottom.',
      'A cloudy liquid with no colour, with a white solid spread through it.',
      'A clear liquid with no colour. No solid is to be seen.',
    ])
    expect(tubeText(tubeView(m, stagesOf('sugar-in-vegetable-oil')[3]!, 'sugar-in-vegetable-oil'))).toBe('A clear pale yellow liquid, with a white solid lying at the bottom.')
    for (const id of SOLID_TUBE_IDS) {
      const texts = stagesOf(id).map((s) => tubeText(tubeView(m, s, id)))
      expect(texts[1], id).toMatch(/lying at the bottom\.$/)
      expect(texts[2], id).toMatch(/^A cloudy .* spread through it\.$/)
      expect(texts[3], id).toMatch(/(No solid is to be seen|lying at the bottom)\.$/)
    }
  })

  it('names no liquid and no solid in any description, and gives no reason: a tube is said as it is seen', () => {
    const texts = new Set(everyView().map(tubeText))
    // An empty tube; two unsettled; two of one layer; six of two layers; five with a solid or with none to be seen.
    expect(texts.size).toBe(16)
    for (const text of texts) {
      expect(text, text).not.toMatch(NAMES)
      expect(text, text).not.toMatch(ANSWERS)
    }
  })

  it('says each part of a picture when it is looked at: a layer by where it is, how thick it is and its colour, in that order', () => {
    const two = stood('water+vegetable-oil', 'water').shows
    expect(tubeParts(two)).toEqual(['upper', 'lower'])
    expect(partText(two, 'upper')).toBe('The top layer: the thinner of the two. It is a clear pale yellow liquid.')
    expect(partText(two, 'lower')).toBe('The bottom layer: the thicker of the two. It is a clear liquid with no colour.')
    const one = stood('water+vinegar', 'water').shows
    expect([tubeParts(one), partText(one, 'liquid')]).toEqual([['liquid'], 'A clear liquid with no colour, all one layer.'])
    expect(partText(pairView(m, stagesOf('water+vinegar')[2]!, 'water+vinegar').shows, 'liquid')).toBe('A cloudy liquid with no colour, not yet settled.')
    const solid = solidTubeView(m, stagesOf('salt-in-mineral-oil')[3]!, 'salt-in-mineral-oil').shows
    expect([tubeParts(solid), partText(solid, 'solid')]).toEqual([['liquid', 'solid'], 'A white solid, lying at the bottom.'])
    expect(partText(solidTubeView(m, stagesOf('salt-in-mineral-oil')[2]!, 'salt-in-mineral-oil').shows, 'solid')).toBe('A white solid, spread through the liquid.')
    expect(tubeParts({ liquid: null, solid: null })).toEqual([])
    // Every part of every picture the lab can show has words, none naming a liquid.
    for (const view of everyView()) for (const part of tubeParts(view.shows)) expect(partText(view.shows, part), `${view.id} ${part}`).not.toMatch(NAMES)
    expect(Object.keys(PART_LABEL)).toEqual(['upper', 'lower', 'liquid', 'solid'])
  })

  it('words the parts a picture has not got, which the shared shape of a tube allows', () => {
    const empty: TubeShows = { liquid: null, solid: null }
    expect([partText(empty, 'upper'), partText(empty, 'lower'), partText(empty, 'liquid'), partText(empty, 'solid')]).toEqual(['There is no top layer.', 'There is no bottom layer.', 'There is no liquid in the tube.', 'No solid is to be seen.'])
  })
})

describe('no answer depends on seeing a colour (spec 25.5, last item)', () => {
  it('tells the two layers of every pair apart by their thickness, in the description and at each look, whatever their colours', () => {
    for (const id of PAIR_IDS) {
      for (const more of liquidsOf(id)) {
        const view = stood(id, more)
        if (!view.shows.above) continue
        const text = tubeText(view).replaceAll(/a clear [a-z ]+(\.|$)/g, 'a liquid$1')
        expect(text, id).toMatch(/On top, the (thicker|thinner) of the two: a liquid\. Underneath, the (thicker|thinner) of the two: a liquid\./)
        expect(text.match(/thicker/g), id).toHaveLength(1)
        expect(partText(view.shows, 'upper'), id).toMatch(/^The top layer: the (thicker|thinner) of the two\./)
      }
    }
  })

  it('says with the amounts which liquid the thicker layer is, so that the liquid on top can be named without a colour', () => {
    const view = stood('water+mineral-oil', 'mineral-oil')
    expect(amountsText(data, view)).toBe('In this tube: more mineral oil, less distilled water.')
    expect(tubeText(view)).toBe('Two layers. On top, the thicker of the two: a clear liquid with no colour. Underneath, the thinner of the two: a clear liquid with no colour.')
    expect(FORM_TEXT.topHelp).toBe('The thicker layer is the liquid there is more of.')
    expect(amountsText(data, pairView(m, lab(), 'water+mineral-oil'))).toBe('Nothing is in the tube yet.')
  })
})

describe('the lab, its parts and its bench', () => {
  it('names the lab and its three parts, and says what each asks without a word of what will be seen', () => {
    expect(LAB_TEXT.title).toBe('Polarity and mixing')
    expect(PART_IDS.map((id) => `${partNumber(id)}: ${partName(data, id)}`)).toEqual(['Part 1: Liquid with liquid', 'Part 2: Solid in liquid', 'Part 3: The rule'])
    for (const id of PART_IDS) expect(PART_AIM[id], id).not.toMatch(/polar|dens|like water|like oil|miscib|solub/i)
  })

  it('says what is on the bench, and what each thing is', () => {
    expect(benchLines(data)).toEqual(['Five liquids, each in a dropper bottle: distilled water, rubbing alcohol, vinegar, vegetable oil and mineral oil', 'Table salt and sugar, each in a small jar', 'Test tubes in a rack'])
    expect(LIQUID_IDS.map((id) => `${liquidName(data, id)}: ${liquidHolds(data, id)}`)).toEqual([
      'Distilled water: Water',
      'Rubbing alcohol: 2-Propanol (isopropyl alcohol) in water, about 70% by volume',
      'Vinegar: Acetic acid in water, 4% to 8%',
      'Vegetable oil: An edible oil pressed from plants',
      'Mineral oil: A mixture of oily hydrocarbons',
    ])
    expect(SOLID_IDS.map((id) => `${solidName(data, id)}: ${solidHolds(data, id)}, ${theSolid(data, id)}`)).toEqual(['Table salt: Sodium chloride, the table salt', 'Sugar: Sucrose, the sugar'])
    expect(theLiquid(data, 'water')).toBe('the distilled water')
  })

  it('names every tube from what is in it', () => {
    expect(TUBES.map((id) => tubeName(data, id))).toEqual([
      'Distilled water with rubbing alcohol',
      'Distilled water with vinegar',
      'Distilled water with vegetable oil',
      'Distilled water with mineral oil',
      'Rubbing alcohol with vinegar',
      'Rubbing alcohol with vegetable oil',
      'Vinegar with vegetable oil',
      'Vinegar with mineral oil',
      'Vegetable oil with mineral oil',
      'Table salt in distilled water',
      'Table salt in vinegar',
      'Table salt in vegetable oil',
      'Table salt in mineral oil',
      'Sugar in distilled water',
      'Sugar in vinegar',
      'Sugar in vegetable oil',
      'Sugar in mineral oil',
    ])
  })

  it('names what is left off the bench in the same way, and has a few words for its place where the tubes are chosen, which say nothing of what it might show', () => {
    expect(pairName(data, 'rubbing-alcohol', 'mineral-oil')).toBe('Rubbing alcohol with mineral oil')
    expect(SOLID_IDS.map((solid) => solidInName(data, solid, 'rubbing-alcohol'))).toEqual(['Table salt in rubbing alcohol', 'Sugar in rubbing alcohol'])
    // A tube of the bench is named by the same two.
    for (const id of PAIR_IDS) expect(tubeName(data, id)).toBe(pairName(data, ...liquidsOf(id)))
    for (const tube of data.solidInLiquid) expect(tubeName(data, tube.id)).toBe(solidInName(data, tube.solidId, tube.liquidId))
    expect(TUBE_STATUS['off-bench']).toBe('Not on this bench')
    expect(TUBE_STATUS['off-bench']).not.toMatch(ANSWERS)
  })

  it('names the foot of a picture, where a solid lies if there is one, without saying whether one does', () => {
    expect(PAGE_TEXT.bottom).toBe('Bottom of the tube')
    expect(PAGE_TEXT.bottom).not.toMatch(/solid|gone|left|nothing/i)
    expect(PAGE_TEXT.molecules).toBe('Molecules to look at')
  })

  it('has a link to the explorer for each thing the record links to a molecule, and for no other', () => {
    expect(Object.keys(MOLECULE_LINK).sort()).toEqual([...data.liquids, ...data.solids].filter((item) => item.moleculeId !== undefined).map((item) => item.id).sort())
    for (const text of Object.values(MOLECULE_LINK)) expect(text).toMatch(/^Look at .+ in the explorer$/)
  })

  it('gives the rubbing alcohol the heading over its own hazards, and everything else the shared note', () => {
    expect(hazardsText(data, data.liquids[1]!)).toEqual({ shared: false, text: "Hazards of 2-propanol (isopropyl alcohol) of 40% to 90% in water, from a supplier's safety data sheet" })
    for (const item of [...data.liquids.filter((l) => l.id !== 'rubbing-alcohol'), ...data.solids]) expect(hazardsText(data, item as { reagentId?: string }), item.id).toEqual({ shared: true, text: data.sharedNote.value })
  })
})

describe('choosing what goes into a tube', () => {
  it('words the button that fills a tube from what goes in, and the choice of the liquid there is more of', () => {
    const view = pairView(m, lab(), 'water+vegetable-oil')
    expect(pourLabel(data, view, 'water')).toBe('Pour in the distilled water, then half as much vegetable oil')
    expect(pourLabel(data, view, 'vegetable-oil')).toBe('Pour in the vegetable oil, then half as much distilled water')
    expect(view.liquids.map((liquid) => moreLabel(data, liquid))).toEqual(['More distilled water', 'More vegetable oil'])
    expect(addLabel(data, solidTubeView(m, lab(), 'salt-in-vinegar'))).toBe('Put in the vinegar, then a little table salt')
    // Half as much is what the model pours.
    expect(m.lessMicrolitres * 2).toBe(m.moreMicrolitres)
  })

  it('says of each pair and each solid in a liquid that is left off the bench why it is not there, and nothing of what it might show', () => {
    for (const a of LIQUID_IDS) {
      for (const b of LIQUID_IDS) {
        if (pairOf(m, a, b) !== null) continue
        const text = pairOffBenchText(data, a, b)
        expect(text, `${a} ${b}`).toBe(a === b ? 'Choose two different liquids.' : 'Rubbing alcohol with mineral oil is not on this bench. Nothing the lab rests on says what the two show together.')
      }
    }
    const solids = SOLID_IDS.flatMap((solid) => LIQUID_IDS.filter((liquid) => solidTubeOf(m, solid, liquid) === null).map((liquid) => solidOffBenchText(data, solid, liquid)))
    expect(solids).toEqual([
      'Salt is not tried in the rubbing alcohol on this bench. What a little salt does there depends on how much water is in the bottle, and nothing the lab rests on settles it.',
      'Sugar is not tried in the rubbing alcohol on this bench. What a little sugar does there depends on how much water is in the bottle, and nothing the lab rests on settles it.',
    ])
    // Every thing the record leaves off has a sentence of its own.
    expect(data.offBench).toHaveLength(3)
    expect(solidOffBenchText(data, 'salt', 'water')).toBe(BLOCKED_TEXT['unknown-tube'])
  })
})

describe('a tube', () => {
  it('says what to do next at each stage, without a word of what is seen', () => {
    expect(STAGES.map((stage) => STAGE_TEXT[stage])).toEqual(['The tube is empty. Fill it.', 'The tube is filled. Shake it.', 'The tube has been shaken. Let it stand.', 'The tube has stood. Look at it.'])
    for (const text of [...Object.values(STAGE_TEXT), ...Object.values(STEP_TEXT), NOT_SETTLED_TEXT]) expect(text).not.toMatch(/layer|solid|cloud|clear/i)
  })

  it('has a label for every choice of the form, and words what was recorded as one line', () => {
    expect(LAYERS.map((is) => LAYERS_LABEL[is])).toEqual(['One layer', 'Two layers'])
    expect(SOLID_SEEN.map((is) => SOLID_LABEL[is])).toEqual(['Gone: no solid is to be seen', 'Still there, at the bottom'])
    expect(recordedLine(data, { kind: 'pair', layers: null, top: null })).toBe('Nothing recorded yet')
    expect(recordedLine(data, { kind: 'pair', layers: 'one', top: null })).toBe('One layer')
    expect(recordedLine(data, { kind: 'pair', layers: 'two', top: null })).toBe('Two layers')
    expect(recordedLine(data, { kind: 'pair', layers: 'two', top: 'vegetable-oil' })).toBe('Two layers, vegetable oil on top')
    expect([null, 'gone', 'left'].map((seen) => recordedLine(data, { kind: 'solid', seen: seen as 'gone' | null }))).toEqual(['Nothing recorded yet', 'The solid is gone', 'The solid is still there'])
  })

  it("has Guided's hints, which say where to look and how to tell, and give no answer and no liquid's name", () => {
    for (const hint of [...Object.values(TUBE_HINT), RULE_TEXT.sortHint, RULE_TEXT.questionHint]) {
      expect(hint).not.toMatch(/vinegar|alcohol|mineral|vegetable|salt|sugar|grease/i)
      expect(hint.split(/\s+/).length).toBeLessThanOrEqual(40)
    }
    expect(TUBE_HINT.layers).toBe('Look for a line across the liquid. A line means two layers. No line means one.')
  })

  it('names each cause a tube does not count for, and never what was right', () => {
    const reasons: Reason[] = ['layers-wrong', 'top-wrong', 'solid-wrong']
    expect(Object.keys(REASON_TEXT)).toEqual(reasons)
    for (const reason of reasons) expect(REASON_TEXT[reason]).not.toMatch(/one layer|two layers|gone|still there|water|oil/i)
    expect(tubeOutcomeText(tubeView(m, wholePair(m, lab(), 'water+vegetable-oil', { wrong: true }), 'water+vegetable-oil'))).toBe('This tube does not count. The number of layers recorded is not what the tube showed. Set it up again in a fresh tube.')
    expect(tubeOutcomeText(tubeView(m, wholeSolidTube(m, lab(), 'salt-in-water', { wrong: true }), 'salt-in-water'))).toBe('This tube does not count. What was recorded of the solid is not what the tube showed. Set it up again in a fresh tube.')
  })

  it('says how a tube stands at each point of a run that goes wrong and is done again', () => {
    const id = 'vinegar+mineral-oil'
    const at = (s: MixingState) => [tubeOutcomeText(tubeView(m, s, id)), tubeStatus(tubeView(m, s, id))]
    expect(at(lab())).toEqual(['Not begun.', 'Not begun'])
    expect(at(stagesOf(id)[2]!)).toEqual(['Under way.', 'Under way'])
    expect(at(wholePair(m, lab(), id, { wrong: true, check: false }))).toEqual(['Everything is recorded. Check this tube.', 'To check'])
    const wrong = wholePair(m, lab(), id, { wrong: true })
    expect(at(wrong)[1]).toBe('Does not count')
    expect(at(wholePair(m, reduce(m, wrong, { type: 'again', tube: id }), id))).toEqual(['This tube counts.', 'Counts'])
    expect(Object.keys(TUBE_STATUS)).toEqual(['not-begun', 'under-way', 'to-check', 'counts', 'does-not-count', 'off-bench'])
    expect(Object.keys(OUTCOME_LABEL)).toEqual(['open', 'to-check', 'counts', 'does-not-count'])
  })

  it('says how far the count has come, and when the part is done', () => {
    expect(countText(benchView(m, lab()), 'liquids')).toBe('None of the six tubes this part needs counts yet. The bench has nine to choose from.')
    expect(countText(benchView(m, wholePairs(m, lab(), 1)), 'liquids')).toBe('One of the six tubes this part needs counts. The bench has nine to choose from.')
    expect(countText(benchView(m, wholePairs(m, lab(), 3)), 'liquids')).toBe('Three of the six tubes this part needs count. The bench has nine to choose from.')
    expect(countText(benchView(m, wholePairs(m, lab())), 'liquids')).toBe('Six tubes count: this part is done. The other three are there to try.')
    expect(countText(benchView(m, wholePairs(m, lab(), 8)), 'liquids')).toBe('Eight tubes count: this part is done. The other one is there to try.')
    expect(countText(benchView(m, wholePairs(m, lab(), 9)), 'liquids')).toBe('All nine tubes count: this part is done.')
    expect(countText(benchView(m, wholeSolids(m, lab())), 'solids')).toBe('Six tubes count: this part is done. The other two are there to try.')
    expect([countShort(3, 6), countShort(6, 6), countShort(7, 6)]).toEqual(['3 of 6 count', '6 of 6 count', '7 count, 6 needed'])
  })

  it("hands over a tube's note and a part's notes as the record has them", () => {
    expect(tubeNote(data, 'water+vinegar')).toBe(data.pairs[1]!.note.value)
    expect(tubeNote(data, 'sugar-in-mineral-oil')).toBe(data.solidInLiquid[7]!.note.value)
    expect(partNotes(data, 'rule')).toEqual(data.parts[2].notes.map((note) => note.value))
  })
})

describe('part 3', () => {
  it('asks where each liquid goes, with a label for each family, and words a liquid as it was sorted', () => {
    expect(FAMILIES.map((family) => FAMILY_LABEL[family])).toEqual(['Like water', 'Like oil'])
    expect(sortQuestion(data, 'vinegar')).toBe('Which does the vinegar go with?')
    expect([sortedLine(data, 'vinegar', null), sortedLine(data, 'vinegar', 'water'), sortedLine(data, 'mineral-oil', 'oil')]).toEqual(['Vinegar: not sorted yet', 'Vinegar: like water', 'Mineral oil: like oil'])
  })

  it('asks the two questions as the record has them, with a label for each of their choices', () => {
    expect(QUESTION_IDS.map((id) => questionText(data, id))).toEqual(data.rule.questions.map((q) => q.asks))
    expect(data.rule.questions.flatMap((q) => q.choices.map(choiceLabel))).toEqual(['It mixes into the water', 'It stays apart from the water', 'It dissolves', 'It stays a solid'])
  })

  it('says how the part stands, and how far each part has come for the button that chooses it', () => {
    const open = wholeSolids(m, wholePairs(m, lab()))
    expect(ruleOutcomeText(ruleView(m, lab()))).toBe('This part opens once parts 1 and 2 are done.')
    expect(ruleOutcomeText(ruleView(m, open))).toBe('Not all answered yet.')
    expect((['to-check', 'counts', 'does-not-count'] as const).map((state) => ruleOutcomeText({ open: true, outcome: { state } }))).toEqual(['All answered. Check this part.', 'Everything is right: this part is done.', 'Not everything is right. The marks show which. Answer again.'])
    expect(PART_IDS.map((id) => partStatus(benchView(m, lab()), id, false))).toEqual(['0 of 6 count', '0 of 6 count', 'Not open yet'])
    expect([partStatus(benchView(m, open), 'rule', false), partStatus(benchView(m, open), 'rule', true), partStatus(benchView(m, wholeLab(m, lab())), 'rule', true)]).toEqual(['Not begun', 'Under way', 'Done'])
    expect(Object.keys(PART_STATUS)).toEqual(['closed', 'not-begun', 'under-way', 'done'])
  })

  it('marks an answer once it is judged', () => {
    expect([markText(null), markText(true), markText(false)]).toEqual([MARK_TEXT.notJudged, MARK_TEXT.right, MARK_TEXT.wrong])
  })
})

describe('refusals', () => {
  const ALL: Blocked[] = ['unknown-tube', 'not-a-choice', 'already-in', 'nothing-in', 'already-shaken', 'not-shaken', 'already-stood', 'not-stood', 'already-looked', 'not-looked', 'top-not-asked', 'not-all-recorded', 'checked', 'counts-already', 'nothing-to-repeat', 'parts-not-done', 'not-right', 'layers-first']

  it('have a sentence for every reason an action can be refused, none of which gives an answer or names a liquid', () => {
    expect(Object.keys(BLOCKED_TEXT).sort()).toEqual([...ALL].sort())
    for (const reason of ALL) {
      expect(BLOCKED_TEXT[reason], reason).toMatch(/\.$/)
      expect(BLOCKED_TEXT[reason], reason).not.toMatch(/vinegar|alcohol|mineral|vegetable|salt|sugar|one layer|is gone/i)
    }
  })

  it("are the sentences the engine's refusals get, at the points of a lab where each first comes up", () => {
    const id = 'water+vegetable-oil'
    const say = (state: MixingState, action: Action) => BLOCKED_TEXT[can(m, state, action)!]
    expect(say(lab(), { type: 'shake', tube: id })).toBe('Nothing is in the tube yet. Fill it first.')
    expect(say(stagesOf(id)[1]!, { type: 'stand', tube: id })).toBe('Shake the tube first.')
    expect(say(stagesOf(id)[2]!, { type: 'look', tube: id })).toBe('Shake the tube and let it stand before you look.')
    expect(say(stagesOf(id)[3]!, { type: 'sayLayers', tube: id, is: 'two' })).toBe('Look at the tube first. What you see is what you record.')
    const looked = run(m, stagesOf(id)[3]!, [{ type: 'look', tube: id }])
    expect(say(looked, { type: 'sayTop', tube: id, is: 'water' })).toBe('Which liquid is on top is asked only where two layers are recorded.')
    expect(say(looked, { type: 'check', tube: id })).toBe('There is still something to record.')
    expect(say(reduce(m, looked, { type: 'setMode', mode: 'guided' }), { type: 'sayLayers', tube: id, is: 'one' })).toBe('Not right. Look again and choose another.')
    expect(say(wholePair(m, lab(), id), { type: 'again', tube: id })).toBe('This counts already, and stays as it is.')
    expect(say(lab(), { type: 'sort', liquid: 'water', family: 'water' })).toBe('Part 3 opens once parts 1 and 2 are done.')
  })
})

describe('the modes, the notes and the sources', () => {
  it('says what each mode does', () => {
    expect(Object.keys(MODE_TEXT)).toEqual(['guided', 'challenge'])
  })

  it('says under a list of sources why it is short before a tube counts or a part is done, without a word of what is kept back', () => {
    expect(SOURCES_TEXT.tubeBefore).toBe('What this tube rests on is listed here once the tube counts.')
    expect(SOURCES_TEXT.partBefore).toBe('What this part rests on is listed here once the part is done.')
  })
})

describe('every sentence of the page', () => {
  /** Every fixed string and every sentence a function gives for the cases above, as one list. */
  function sentences(): string[] {
    const fixed = [LAB_TEXT, PART_AIM, PART_STATUS, MOLECULE_LINK, CHOOSE_TEXT, STEP_TEXT, STAGE_TEXT, PART_LABEL, FORM_TEXT, LAYERS_LABEL, SOLID_LABEL, TUBE_HINT, GUIDED_TEXT, REASON_TEXT, TUBE_STATUS, FAMILY_LABEL, RULE_TEXT, MARK_TEXT, OUTCOME_LABEL, BLOCKED_TEXT, MODE_TEXT, HAZARD_TEXT, NOTES_TEXT, PAGE_TEXT, SOURCES_TEXT]
    const done = wholeLab(m, lab())
    const views = everyView()
    const made = [
      ...benchLines(data),
      ...PART_IDS.flatMap((id) => [partNumber(id), partName(data, id), partStatus(benchView(m, done), id, true), ...partNotes(data, id)]),
      ...LIQUID_IDS.flatMap((id) => [liquidName(data, id), theLiquid(data, id), liquidHolds(data, id), moreLabel(data, id), sortQuestion(data, id), ...FAMILIES.map((family) => sortedLine(data, id, family)), sortedLine(data, id, null), pairOffBenchText(data, id, 'mineral-oil')]),
      ...SOLID_IDS.flatMap((id) => [solidName(data, id), theSolid(data, id), solidHolds(data, id), solidOffBenchText(data, id, 'rubbing-alcohol')]),
      ...TUBES.flatMap((id) => [tubeName(data, id), tubeNote(data, id), tubeOutcomeText(tubeView(m, done, id))]),
      ...PAIR_IDS.flatMap((id) => liquidsOf(id).flatMap((more) => [pourLabel(data, pairView(m, lab(), id), more), amountsText(data, stood(id, more)), recordedLine(data, { kind: 'pair', layers: 'two', top: more })])),
      ...SOLID_TUBE_IDS.map((id) => addLabel(data, solidTubeView(m, lab(), id))),
      ...new Set(views.map(tubeText)),
      ...new Set(views.flatMap((view) => tubeParts(view.shows).map((part) => partText(view.shows, part)))),
      NOT_SETTLED_TEXT,
      tubeOutcomeText({ outcome: { state: 'does-not-count' }, reasons: ['top-wrong'], stage: 'stood' }),
      ...QUESTION_IDS.map((id) => questionText(data, id)),
      ...data.rule.questions.flatMap((q) => q.choices.map(choiceLabel)),
      ...(['open', 'to-check', 'counts', 'does-not-count'] as const).map((state) => ruleOutcomeText({ open: true, outcome: { state } })),
      countText(benchView(m, lab()), 'solids'),
      countText(benchView(m, done), 'liquids'),
      countShort(7, 6),
      ...Object.values(RECORD_TEXT).map((v) => (typeof v === 'string' ? v : v(1))),
      hazardsText(data, data.liquids[1]!).text,
      data.sharedNote.value,
    ]
    // A group's entry that is made from a name is given one.
    return [...fixed.flatMap((group) => Object.values(group).map((value: string | ((name: string) => string)) => (typeof value === 'string' ? value : value('Vinegar with mineral oil')))), ...made]
  }

  it('is there: over two hundred and fifty of them, none empty', () => {
    expect(sentences().length).toBeGreaterThan(250)
    for (const text of sentences()) expect(text.trim().length, text).toBeGreaterThan(0)
  })

  it('names no maker, supplier or site, and holds no institution text', () => {
    for (const text of sentences()) {
      expect(text).not.toMatch(/flinn|purdue|alaska|wikipedia|libretexts|ck-12|cameo|noaa/i)
      expect(findInstitutionText(text, []), text).toBeNull()
    }
  })

  it('is short and plain: no sentence of the page over 40 words', () => {
    for (const text of sentences()) expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(40)
  })

  it("names a liquid's family only in the labels of part 3's two choices and in the notes of the record, which a page shows once they are earned", () => {
    const notes = new Set([...TUBES.map((id) => tubeNote(data, id)), ...PART_IDS.flatMap((id) => partNotes(data, id)), ...QUESTION_IDS.map((id) => questionText(data, id))])
    const sorting = new Set([...Object.values(FAMILY_LABEL), ...LIQUID_IDS.flatMap((id) => FAMILIES.map((family) => sortedLine(data, id, family))), RULE_TEXT.sortIntro, RULE_TEXT.sortHint, RULE_TEXT.questionHint])
    for (const text of sentences()) {
      if (notes.has(text) || sorting.has(text)) continue
      expect(text, text).not.toMatch(/like water|like oil|\bpolar\b|nonpolar|go(es)? with (water|oil)/i)
    }
  })

  // No quotation: the fingerprint of the pages is not kept in the repository, and the case is skipped where it is absent (see src/chem-data/mixing/quotation.test.ts).
  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/mixing/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))
  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of sentences()) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})
