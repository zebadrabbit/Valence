import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { candidatesOf, freezingData as data, PART_IDS, solutesOf, type PartId } from '@/chem-data/freezing/data'
import { can, createLab, currentRun, FIELDS, modelFrom, parseEntry, partView, runOutcome, warnings, type Action, type Blocked, type Field, type FreezingState, type Reason, type Slip, type Warning } from '@/engine/freezing'
import { entryActions, looks, run, wholeLab, wholeRun, workCup, worksheetText } from '@/engine/freezing/testkit'
import * as messages from './messages'
import { addLabel, BENCH_TEXT, benchLines, blockedText, candidateLines, constantText, cupText, describeGraph, enteredText, entryFeedback, entryText, expectedText, fieldLabel, formatHelp, hazardsHeading, liquidChoices, massText, MODE_TEXT, notebookLines, outcomeText, PAGE_TEXT, PART_AIM, partNotes, partTitle, pointCallout, pointLabel, PROGRESS_TEXT, progressOf, reasonText, RECORD_TEXT, relationText, soluteChoices, soluteLines, SOURCES_TEXT, temperatureText, timeText, VERDICT_TEXT, wantedText, WARNING_BUTTONS, WARNING_TEXT } from './messages'

// Every sentence the page will say, on the views a scripted learner makes. The descriptions in words of the cup
// and of the graph (spec 23.6) are tested here; so is what Challenge may not be told before a run counts.
const m = modelFrom(data)
const local = import.meta.glob<string[]>('../../../chem-data/denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()
const view = (state: FreezingState, part: PartId) => partView(m, state, part)
const cupOf = (state: FreezingState, part: PartId) => cupText(data, part, view(state, part), view(state, part).graph.readings.length)
const steps = (part: PartId, ...types: Action['type'][]) => run(m, createLab(1, 'challenge'), types.map((type) => ({ type, part }) as Action))
const liquidOf = (state: FreezingState) => (view(wholeRun(m, createLab(state.seed, 'challenge'), 'unknown'), 'unknown').expected as { liquidId: string }).liquidId

describe('figures as they are written', () => {
  it('writes a temperature to 0.01 °C with a true minus sign, a mass to 0.01 g, and a time in seconds and minutes', () => {
    expect([temperatureText(-148), temperatureText(12), temperatureText(0), temperatureText(-5)]).toEqual(['−1.48 °C', '0.12 °C', '0.00 °C', '−0.05 °C'])
    expect([massText(412), massText(10307)]).toEqual(['4.12 g', '103.07 g'])
    expect([0, 1, 2, 3, 60].map((step) => timeText(m, step))).toEqual(['0 s', '30 s', '1 min', '1 min 30 s', '30 min'])
    expect(constantText(data)).toBe('1.86 °C·kg/mol')
  })

  it('writes a typed entry in its field as the number alone, so that the parsers read it back as the same entry', () => {
    const done = wholeLab(m, createLab(3, 'challenge'))
    for (const part of PART_IDS) {
      for (const stored of done.parts[part]) {
        for (const field of FIELDS[part]) {
          const value = stored.entries[field]!
          if (typeof value === 'string') expect(enteredText(data, field, value)).toMatch(/^(acetone|ethanol|2-propanol)$/)
          else expect(parseEntry(field, entryText(field, value)), `${part} ${field} ${entryText(field, value)}`).toEqual(value)
        }
      }
    }
    expect(entryText('water', -16)).toBe('−0.16')
    expect(entryText('waterKg', 10234)).toBe('0.10234')
    expect(entryText('ratio', { mantissa: 182, exponent: -2 })).toBe('1.82')
  })
})

describe('the parts and the bench', () => {
  it('names each part and says what it finds, with no figure', () => {
    expect(PART_IDS.map((part) => partTitle(data, part))).toEqual(['Part 1: The freezing point of water', 'Part 2: Molar mass of an unknown', 'Part 3: How many particles'])
    for (const part of PART_IDS) expect(PART_AIM[part], part).not.toMatch(/\d/)
  })

  it('says what is used and what the balance reads, as each reading is made', () => {
    expect(benchLines(data, 'water', view(createLab(1, 'challenge'), 'water'))).toEqual(['A foam cup with a lid, a stirrer and a temperature probe. The logger shows the probe to 0.01 °C.', 'Ice and distilled water, which go in the cup.'])
    const fresh = benchLines(data, 'unknown', view(createLab(1, 'challenge'), 'unknown'))
    expect(fresh[2]).toBe('Unknown liquid, a clear, colourless liquid, weighed out: the balance reads 4.50 g.')
    expect(fresh).toHaveLength(4)
    const weighed = workCup(m, createLab(1, 'challenge'), 'unknown')
    expect(benchLines(data, 'unknown', view(weighed, 'unknown'))[4]).toMatch(/^The solution, strained into the second cup: the balance reads 1\d\d\.\d\d g\.$/)
    expect(benchLines(data, 'unknown', view(workCup(m, createLab(1, 'challenge'), 'unknown', { strain: false }), 'unknown'))[4]).toMatch(/^Everything in the cup, weighed without straining: the balance reads 1\d\d\.\d\d g\.$/)
    expect(benchLines(data, 'particles', view(createLab(1, 'challenge'), 'particles'))[2]).toBe('A solute of your choosing: urea, or one of three salts.')
    const chosen = run(m, createLab(1, 'challenge'), [{ type: 'chooseSolute', part: 'particles', solute: 'nabr' }])
    expect(benchLines(data, 'particles', view(chosen, 'particles'))[2]).toBe('Sodium bromide, a white solid, weighed out: the balance reads 4.97 g.')
  })

  it('lists the three liquids and the four solutes with the molar mass of each, as the record has them', () => {
    expect(candidateLines(data)).toEqual(['Acetone, CH₃COCH₃: 58.08 g/mol', 'Ethanol, C₂H₅OH: 46.07 g/mol', '2-Propanol, C₃H₈O: 60.10 g/mol'])
    expect(soluteLines(data)).toEqual(['Urea, NH₂CONH₂: 60.06 g/mol', 'Sodium chloride, NaCl: 58.44 g/mol', 'Potassium chloride, KCl: 74.55 g/mol', 'Sodium bromide, NaBr: 102.89 g/mol'])
    expect(liquidChoices(data)).toEqual([{ value: 'acetone', label: 'acetone' }, { value: 'ethanol', label: 'ethanol' }, { value: 'propan-2-ol', label: '2-propanol' }])
    expect(soluteChoices(data).map((choice) => choice.value)).toEqual(solutesOf(data).map((s) => s.id))
  })

  it("gives the notebook the bench's own figures to work from: the masses, the constant and the table", () => {
    const weighed = workCup(m, createLab(1, 'challenge'), 'unknown')
    const lines = notebookLines(data, 'unknown', view(weighed, 'unknown'))
    expect(lines[0]).toBe('Mass of the unknown liquid: 4.50 g.')
    expect(lines[1]).toMatch(/^Mass of the solution: 1\d\d\.\d\d g\.$/)
    expect(lines[2]).toBe('Freezing point constant of water: 1.86 °C·kg/mol.')
    expect(lines[3]).toBe('Molar masses: Acetone, CH₃COCH₃: 58.08 g/mol; Ethanol, C₂H₅OH: 46.07 g/mol; 2-Propanol, C₃H₈O: 60.10 g/mol.')
    const salt = workCup(m, createLab(1, 'challenge'), 'particles', { solute: 'kcl' })
    expect(notebookLines(data, 'particles', view(salt, 'particles'))).toEqual(expect.arrayContaining(['Mass of the potassium chloride: 3.46 g.', 'Molar mass: Potassium chloride, KCl: 74.55 g/mol.']))
    expect(notebookLines(data, 'water', view(createLab(1, 'challenge'), 'water'))).toEqual([])
  })

  it('heads the tiles of the liquids for all three until the unknown is named, and names the cup\'s buttons', () => {
    expect(hazardsHeading(data, null)).toBe('The unknown may be any of these three, so treat it as all of them')
    expect(hazardsHeading(data, 'propan-2-ol')).toBe('The unknown was 2-propanol')
    expect(addLabel(data, 'unknown', view(createLab(1, 'challenge'), 'unknown').bench)).toBe('Add the unknown liquid')
    expect(addLabel(data, 'particles', view(createLab(1, 'challenge'), 'particles').bench)).toBe('Add the solute')
    expect(addLabel(data, 'particles', view(run(m, createLab(1, 'challenge'), [{ type: 'chooseSolute', part: 'particles', solute: 'urea' }]), 'particles').bench)).toBe('Add the urea')
    expect(BENCH_TEXT.runOnHelp(m)).toBe('Lets a minute pass: two more readings.')
  })
})

describe('the cup in words (spec 23.6)', () => {
  it('says what is in it, how much ice is seen, whether the lid is on and the stirrer going, and how many readings the logger has', () => {
    expect(cupOf(createLab(1, 'challenge'), 'unknown')).toBe('The cup is empty. The lid is off and the stirrer is still.')
    expect(cupOf(steps('unknown', 'fill'), 'unknown')).toBe('Ice and water are in the cup. There is plenty of ice. The lid is off. The stirrer is still. The logger is not started.')
    expect(cupOf(steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger'), 'unknown')).toBe('Ice and water are in the cup. There is plenty of ice. The lid is on. The stirrer is going. The logger has taken 1 reading.')
    expect(cupOf(steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger', 'runOn', 'addSolute', 'runOn'), 'unknown')).toBe('Ice, water and the unknown liquid are in the cup. There is plenty of ice. The lid is on. The stirrer is going. The logger has taken 5 readings.')
  })

  it('says what was done with it at the end: strained, with the ice in the strainer, and weighed; or weighed with the ice in it', () => {
    expect(cupOf(steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger', 'addSolute', 'runOn', 'strain'), 'unknown')).toBe('The cup has been poured through the strainer. The strainer holds the ice, and the solution is in the second cup. The solution has not been weighed yet. The logger has taken 3 readings.')
    expect(cupOf(steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger', 'addSolute', 'runOn', 'strain', 'weigh'), 'unknown')).toMatch(/The solution has been weighed\. The logger has taken 3 readings\.$/)
    expect(cupOf(steps('unknown', 'fill', 'startLogger', 'addSolute', 'runOn', 'weigh'), 'unknown')).toMatch(/^Ice, water and the unknown liquid are in the cup\. .* The cup has been weighed with the ice in it\.$/)
  })

  it('says as it is seen that only a little ice is left, and then that none is, where the lid is off', () => {
    let state = steps('particles', 'fill', 'stir', 'startLogger')
    state = run(m, state, [{ type: 'chooseSolute', part: 'particles', solute: 'nacl' }])
    const said = new Set<string>()
    for (let press = 0; press < 12; press++) {
      state = run(m, state, [{ type: 'runOn', part: 'particles' }])
      said.add(/(There is plenty of ice|Only a little ice is left|No ice is left)\./.exec(cupOf(state, 'particles'))![1]!)
    }
    expect([...said]).toEqual(['There is plenty of ice', 'Only a little ice is left', 'No ice is left'])
    state = run(m, state, [{ type: 'addSolute', part: 'particles' }, { type: 'runOn', part: 'particles' }, { type: 'strain', part: 'particles' }])
    expect(cupOf(state, 'particles')).toMatch(/^The cup has been poured through the strainer\. The strainer held back no ice: none was left\./)
  })

  it('never says whether the cup has levelled, nor anything of what the temperature does', () => {
    for (const seed of [1, 2, 3]) {
      const seen: FreezingState[] = []
      workCup(m, createLab(seed, 'guided'), 'unknown', {}, (s) => (seen.push(s), s))
      for (const state of seen) expect(cupOf(state, 'unknown')).not.toMatch(/level|steady|°C|fall|rise|freez/i)
    }
  })
})

describe('the graph in words (spec 23.6)', () => {
  it("says each point's time and temperature when it is looked at", () => {
    expect(pointCallout(m, 3, -16)).toBe('1 min 30 s: −0.16 °C')
    expect(pointLabel(m, 0, false)).toBe('Look at the reading at 0 s')
    expect(pointLabel(m, 4, true)).toBe('Look at the reading at 2 min, looked at')
  })

  it('says what the logger has drawn so far at every stage, and nothing of what it will draw', () => {
    const graph = (state: FreezingState) => describeGraph(m, view(state, 'unknown').graph)
    expect(graph(createLab(1, 'challenge'))).toBe('The logger has not been started, so there is no graph yet.')
    expect(graph(steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger'))).toBe('The graph has 1 reading, one every 30 seconds. It starts at 2.40 °C at 0 s.')
    expect(graph(steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger', 'runOn'))).toBe('The graph has 3 readings, one every 30 seconds. It starts at 2.40 °C at 0 s. The latest reading is 0.07 °C at 1 min. Over the last three readings it fell by 2.33 °C.')
    const level = steps('unknown', 'fill', 'putLidOn', 'stir', 'startLogger', 'runOn', 'runOn', 'runOn', 'runOn')
    expect(graph(level)).toBe('The graph has 9 readings, one every 30 seconds. It starts at 2.40 °C at 0 s. The latest reading is −0.16 °C at 4 min. The last three readings are the same.')
    const added = run(m, level, [{ type: 'addSolute', part: 'unknown' }])
    expect(graph(added)).toBe('The graph has 9 readings, one every 30 seconds. It starts at 2.40 °C at 0 s. The solute went in after the reading of −0.16 °C at 4 min. There is no reading since.')
    const falling = run(m, added, [{ type: 'runOn', part: 'unknown' }])
    expect(graph(falling)).toBe('The graph has 11 readings, one every 30 seconds. It starts at 2.40 °C at 0 s. The solute went in after the reading of −0.16 °C at 4 min. The lowest reading since is −1.79 °C at 5 min. The latest reading is −1.79 °C at 5 min.')
    const done = run(m, falling, [{ type: 'runOn', part: 'unknown' }, { type: 'runOn', part: 'unknown' }, { type: 'runOn', part: 'unknown' }, { type: 'strain', part: 'unknown' }])
    expect(graph(done)).toBe('The graph has 17 readings, one every 30 seconds. It starts at 2.40 °C at 0 s. The solute went in after the reading of −0.16 °C at 4 min. The lowest reading since is −1.93 °C at 6 min 30 s. The last reading, when the cup was strained or weighed, is −1.93 °C at 8 min. The last three readings are the same.')
  })

  it('describes a cup that was not stirred as it is: still falling at every stage, and never three readings the same', () => {
    let state = steps('unknown', 'fill', 'putLidOn', 'startLogger')
    for (let press = 0; press < 30; press++) {
      state = run(m, state, [{ type: 'runOn', part: 'unknown' }])
      expect(describeGraph(m, view(state, 'unknown').graph)).toMatch(/Over the last three readings it fell by \d\.\d\d °C\.$/)
    }
  })

  it('describes a cup with its lid off as it is: a fall, and then a climb once the ice is gone', () => {
    const open = workCup(m, createLab(1, 'challenge'), 'unknown', { lid: false, before: 3, after: 4 })
    expect(describeGraph(m, view(open, 'unknown').graph)).toBe(LID_OFF)
    expect(view(open, 'unknown').cup.ice).toBe('none')
  })
})

describe('the notebook', () => {
  it('labels every entry of every part, with its unit', () => {
    expect(fieldLabel('water', 'water')).toBe('Steady temperature of ice and water, in °C')
    expect(FIELDS.unknown.map((field) => fieldLabel('unknown', field))).toEqual([
      'Temperature of ice and water, just before the solute went in, in °C',
      'Temperature of the solution, at the last reading, in °C',
      'Fall in the freezing point, in °C',
      'Mass of water in the solution, in kg',
      'Molality of the solution, in mol/kg',
      'Moles of the unknown, in mol',
      'Molar mass of the unknown, in g/mol',
      'Which liquid the unknown is',
    ])
    expect(FIELDS.particles.slice(4).map((field) => fieldLabel('particles', field))).toEqual(['Moles of the solute, in mol', 'Molality of the solution, in mol/kg', 'Fall if each formula unit were one particle, in °C', 'Particles for each formula unit: the fall found over that fall'])
  })

  it('says how each kind of entry is typed, with examples that its own parser takes', () => {
    for (const part of PART_IDS) {
      for (const field of FIELDS[part]) {
        const help = formatHelp(field)
        const examples = [...help.matchAll(/−?\d+\.\d+/g)].map((match) => match[0])
        if (field === 'liquid') expect(help).toBe('Choose one of the three.')
        else expect(examples.length, field).toBeGreaterThan(0)
        for (const example of examples) expect(parseEntry(field, example), `${field} ${example}`).not.toBeNull()
      }
    }
  })

  it('has the relation behind every entry of every part ready for Guided, with the constant the bench gives and no number of the run', () => {
    for (const part of PART_IDS) {
      for (const field of FIELDS[part]) {
        const relation = relationText(data, part, field)
        expect(relation.length, `${part} ${field}`).toBeGreaterThan(20)
        expect(relation.replaceAll('1.86 °C·kg/mol', '').replace('divide by 1000', ''), `${part} ${field}`).not.toMatch(/\d/)
      }
    }
    expect(relationText(data, 'unknown', 'molality')).toBe('The fall divided by 1.86 °C·kg/mol, the freezing point constant of water.')
    expect(relationText(data, 'particles', 'idealFall')).toBe('1.86 °C·kg/mol times the molality.')
  })
})

describe('refusals and feedback', () => {
  const BLOCKED: Blocked[] = ['lab-completed', 'unknown-part', 'already-done', 'cup-empty', 'logger-not-started', 'no-solute-chosen', 'unknown-solute', 'solute-in', 'solute-not-added', 'no-reading-since', 'logger-full', 'cup-strained', 'cup-weighed', 'worksheet-begun', 'run-over', 'nothing-there', 'not-weighed', 'not-looked', 'not-this-part', 'entry-above-missing', 'invalid-entry', 'worksheet-not-full', 'nothing-to-repeat', 'not-the-logger', 'does-not-follow', 'cut-off', 'wrong-sign', 'upside-down', 'solute-not-taken-off']

  it('has a sentence for every reason an action cannot be done, for every entry it can be about, and none gives a number of a run', () => {
    for (const blocked of BLOCKED) {
      for (const part of PART_IDS) {
        for (const field of [undefined, ...FIELDS[part]]) {
          const text = blockedText(part, blocked, field)
          expect(text, `${blocked} ${part} ${field}`).toMatch(/^[A-Z].*\.$/)
          if (blocked !== 'invalid-entry') expect(text, `${blocked} ${part} ${field}`).not.toMatch(/\d/)
        }
      }
    }
  })

  it('says of an entry that does not follow which kind of slip it looks like, where the engine knows one', () => {
    const slips: Slip[] = ['cut-off', 'wrong-sign', 'upside-down', 'solute-not-taken-off']
    expect(new Set(slips.map((slip) => entryFeedback('ratio', { follows: false, slip }))).size).toBe(4)
    expect(entryFeedback('waterKg', { follows: false, slip: 'solute-not-taken-off' })).toBe('This is the mass of the whole solution. Take the mass of the solute from it.')
    expect(entryFeedback('water', { follows: false, slip: null })).toBe('This is not the reading the logger shows there.')
    expect(entryFeedback('liquid', { follows: false, slip: null })).toBe('This is not the liquid whose molar mass is nearest yours.')
    expect(entryFeedback('moles', { follows: false, slip: null })).toBe('This does not follow from your entries above.')
    expect(entryFeedback('moles', { follows: true, slip: null })).toBe('Follows.')
    expect(VERDICT_TEXT).toEqual({ follows: 'Follows', not: 'Does not follow' })
  })

  it("words Guided's refusal of a reading that is not the logger's with the sentence that says which reading is wanted", () => {
    let state = workCup(m, createLab(1, 'guided'), 'unknown')
    state = run(m, state, looks(m, state, 'unknown'))
    const refusal = can(m, state, { type: 'enter', part: 'unknown', field: 'water', value: 99 })!
    expect(blockedText('unknown', refusal, 'water')).toBe('This is not the reading the logger shows just before the solute went in.')
    expect(blockedText('unknown', 'not-the-logger', 'solution')).toBe('This is not the last reading the logger shows. Take the reading at the end of the level stretch, just before the cup was strained.')
    expect(blockedText('water', 'not-the-logger', 'water')).toBe('This is not the latest reading the logger shows.')
    expect(blockedText('unknown', 'not-looked', 'water')).toBe('Look at the level reading just before the solute went in, on the graph, first.')
    expect(blockedText('unknown', 'not-weighed', 'water')).toBe('The notebook opens once the solution has been weighed.')
    expect(blockedText('unknown', 'invalid-entry', 'waterKg')).toBe(formatHelp('waterKg'))
  })
})

describe('the warnings', () => {
  it('say, before each error of technique is made, what will go wrong, and leave a way on', () => {
    const all: Warning[] = ['lid-off', 'not-stirring', 'not-level', 'little-ice', 'no-ice', 'not-strained']
    for (const warning of all) {
      expect(WARNING_TEXT[warning].title, warning).toMatch(/^[A-Z][^.]*$/)
      expect(WARNING_TEXT[warning].body, warning).toMatch(/\.$/)
      expect(WARNING_TEXT[warning].body.split(/\s+/).length, warning).toBeLessThanOrEqual(35)
    }
    expect(WARNING_BUTTONS).toEqual({ back: 'Go back', on: 'Go on anyway' })
    // Each is the sentence of a warning the engine raises.
    const lazy = run(m, createLab(1, 'guided'), [{ type: 'fill', part: 'unknown' }])
    expect(warnings(m, lazy, { type: 'startLogger', part: 'unknown' }).map((w) => WARNING_TEXT[w].title)).toEqual(['The lid is off', 'The stirrer is still'])
    const early = run(m, lazy, [{ type: 'putLidOn', part: 'unknown' }, { type: 'stir', part: 'unknown' }, { type: 'startLogger', part: 'unknown' }, { type: 'addSolute', part: 'unknown' }, { type: 'runOn', part: 'unknown' }])
    expect(warnings(m, early, { type: 'strain', part: 'unknown' }).map((w) => WARNING_TEXT[w].title)).toEqual(['The temperature has not levelled off'])
    expect(warnings(m, early, { type: 'weigh', part: 'unknown' }).map((w) => WARNING_TEXT[w].title)).toEqual(['The cup has not been strained'])
  })
})

describe('a run that is checked', () => {
  const outcomeOf = (state: FreezingState, part: PartId) => runOutcome(m, state, part, currentRun(state, part))

  it('says that a careful run counts, and how far its result is from the figure the lab holds', () => {
    expect(outcomeText('water', outcomeOf(wholeRun(m, createLab(1, 'challenge'), 'water'), 'water'))).toBe('This run counts.')
    expect(outcomeText('unknown', outcomeOf(wholeRun(m, createLab(1, 'challenge'), 'unknown'), 'unknown'))).toMatch(/^This run counts\. Your result is (0\.\d% (under|over) the figure the lab holds|the same as the figure the lab holds, to a tenth of a percent)\.$/)
    expect(outcomeText('unknown', { state: 'open' })).toBe('The notebook has not been checked yet.')
    expect(outcomeText('particles', { state: 'counts', percentOff: 0.02 })).toBe('This run counts. Your result is the same as the figure the lab holds, to a tenth of a percent.')
  })

  it('says of a run that does not count why, each cause in a sentence, and that the part is run again', () => {
    const reasons: Reason[] = ['water-not-level', 'solution-not-level', 'ice-melted', 'not-strained', 'water-not-shown', 'solution-not-shown', 'entries-do-not-follow', 'outside-tolerance']
    for (const part of PART_IDS) for (const reason of reasons) expect(reasonText(part, reason), `${part} ${reason}`).toMatch(/^[A-Z].*\.$/)
    expect(new Set(reasons.map((reason) => reasonText('unknown', reason))).size).toBe(reasons.length)
    const iced = wholeRun(m, createLab(1, 'challenge'), 'unknown', { strain: false })
    expect(outcomeText('unknown', outcomeOf(iced, 'unknown'))).toBe('This run does not count. The cup was weighed without straining, so the ice was counted as water. The result is too far from the figure the lab holds. Run the part again.')
    expect(outcomeText('unknown', outcomeOf(iced, 'unknown'), false)).not.toMatch(/Run the part again/)
    const soon = wholeRun(m, createLab(1, 'challenge'), 'water', { before: 1 })
    expect(outcomeText('water', outcomeOf(soon, 'water'))).toMatch(/^This run does not count\. The reading was taken before the ice and water had levelled off, so it is not the freezing point of water\./)
    const melted = wholeRun(m, createLab(1, 'challenge'), 'unknown', { lid: false, before: 4, after: 9 })
    expect(outcomeText('unknown', outcomeOf(melted, 'unknown'))).toMatch(/All the ice had melted, so the temperature read was not a freezing point\./)
  })

  it('gives no figure for how far off a run was until a run of the part counts, and then gives it', () => {
    let state = wholeRun(m, createLab(1, 'challenge'), 'unknown', { strain: false })
    expect(outcomeText('unknown', outcomeOf(state, 'unknown'))).not.toMatch(/%/)
    state = wholeRun(m, run(m, state, [{ type: 'runAgain', part: 'unknown' }]), 'unknown')
    expect(outcomeText('unknown', runOutcome(m, state, 'unknown', state.parts.unknown[0]!))).toMatch(/Your result was 1\d\.\d% under the figure the lab holds\./)
  })

  it("says what the result was held to once the engine hands it over, with the record's own words on the ideal and the measured, and shows the part's notes then", () => {
    const done = wholeLab(m, createLab(1, 'guided'), 'nacl')
    expect(expectedText(data, view(done, 'water').expected!)).toEqual(['In ice and water this probe reads −0.16 °C: it reads 0.16 °C low.'])
    expect(expectedText(data, view(done, 'unknown').expected!)).toEqual(['The unknown was ethanol, whose molar mass is 46.07 g/mol.'])
    const particles = expectedText(data, view(done, 'particles').expected!)
    expect(particles[0]).toBe('Urea: the lab holds 1 particle for each formula unit. The ideal: each molecule is taken as one dissolved particle.')
    expect(particles[1]).toMatch(/^Sodium chloride: the lab holds 1\.82 particles for each formula unit\. Measured: /)
    expect(expectedText(data, { kind: 'particles', counted: [{ soluteId: 'kcl', particles: 2 }] })[0]).toMatch(/^Potassium chloride: the lab holds 2 particles for each formula unit\. The ideal: .* a real solution gives a little less\.$/)
    expect(expectedText(data, { kind: 'probe', hundredths: 7 })).toEqual(['In ice and water this probe reads 0.07 °C: it reads 0.07 °C high.'])
    for (const part of PART_IDS) expect(partNotes(data, part)).toEqual(data.parts[PART_IDS.indexOf(part)]!.notes.map((note) => note.value))
  })

  it('says what part 3 still wants', () => {
    expect(wantedText({ molecule: true, salt: true })).toBe('This part needs two runs that count: one with urea and one with a salt of your choosing.')
    expect(wantedText(view(wholeRun(m, createLab(1, 'guided'), 'particles'), 'particles').wanted!)).toBe('A run with urea counts. Now make one with a salt of your choosing.')
    expect(wantedText({ molecule: true, salt: false })).toBe('A run with a salt counts. Now make one with urea.')
    expect(wantedText({ molecule: false, salt: false })).toMatch(/The other solutes are still here to try\.$/)
  })
})

describe('progress and modes', () => {
  it('says how far a part has come, at every stage', () => {
    const at = (state: FreezingState, part: PartId) => PROGRESS_TEXT[progressOf(view(state, part))]
    expect(at(createLab(1, 'challenge'), 'unknown')).toBe('Not started')
    expect(at(steps('unknown', 'fill'), 'unknown')).toBe('Cup under way')
    let state = workCup(m, createLab(1, 'challenge'), 'unknown')
    state = run(m, state, looks(m, state, 'unknown'))
    state = run(m, state, entryActions('unknown', worksheetText(m, state, 'unknown')).slice(0, 1))
    expect(at(state, 'unknown')).toBe('Notebook under way')
    expect(at(wholeRun(m, createLab(1, 'challenge'), 'unknown', { strain: false }), 'unknown')).toBe('Run did not count')
    expect(at(wholeRun(m, createLab(1, 'challenge'), 'unknown'), 'unknown')).toBe('Done')
    const half = run(m, wholeRun(m, createLab(1, 'challenge'), 'particles'), [{ type: 'runAgain', part: 'particles' }])
    expect(at(half, 'particles')).toBe('One of its two runs counts')
    expect(at(wholeLab(m, createLab(1, 'challenge')), 'particles')).toBe('Done')
  })

  it('says what each mode does, and names the page\'s own things', () => {
    expect(MODE_TEXT.guided).toMatch(/warns you before an error of technique is made/)
    expect(MODE_TEXT.challenge).toMatch(/no warning and no hints/)
    expect(PAGE_TEXT.previous('Part 1')).toBe('Previous: Part 1')
    expect(RECORD_TEXT.run(2)).toBe('Run 2')
    expect(SOURCES_TEXT).toMatch(/Valence's own/)
  })
})

describe('what Challenge is kept from (spec 23.6)', () => {
  it('at every action of a careful run of part 2 up to the last entry, no sentence names the liquid the unknown is unless it names all three, and none gives its molar mass alone', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const liquid = candidatesOf(data).find((c) => c.id === liquidOf(createLab(seed, 'challenge')))!
      const others = candidatesOf(data).filter((c) => c.id !== liquid.id)
      const seen: FreezingState[] = []
      let state = workCup(m, createLab(seed, 'challenge'), 'unknown', {}, (s) => (seen.push(s), s))
      state = run(m, state, looks(m, state, 'unknown'), (s) => (seen.push(s), s))
      run(m, state, entryActions('unknown', worksheetText(m, state, 'unknown')).slice(0, -1), (s) => (seen.push(s), s))
      for (const at of seen) {
        const v = view(at, 'unknown')
        const said = [...benchLines(data, 'unknown', v), ...notebookLines(data, 'unknown', v), cupOf(at, 'unknown'), describeGraph(m, v.graph), outcomeText('unknown', v.outcome), hazardsHeading(data, null), addLabel(data, 'unknown', v.bench), PROGRESS_TEXT[progressOf(v)]]
        for (const text of said) {
          if (text.toLowerCase().includes(liquid.name.toLowerCase())) for (const other of others) expect(text.toLowerCase(), `${seed}: ${text}`).toContain(other.name.toLowerCase())
        }
        expect(v.expected, `${seed}`).toBeNull()
      }
    }
  })
})

describe('every sentence of the module', () => {
  const collect = (value: unknown): string[] => (typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(collect) : [])
  const fixed = collect(Object.fromEntries(Object.entries(messages).filter(([, value]) => typeof value !== 'function')))
  const done = wholeLab(m, createLab(2, 'guided'))
  const worked = [
    ...PART_IDS.flatMap((part) => [partTitle(data, part), ...benchLines(data, part, view(done, part)), ...notebookLines(data, part, view(done, part)), cupOf(done, part), describeGraph(m, view(done, part).graph), ...FIELDS[part].flatMap((field) => [fieldLabel(part, field), formatHelp(field), relationText(data, part, field)]), ...expectedText(data, view(done, part).expected!)]),
    ...(['water-not-level', 'solution-not-level', 'ice-melted', 'not-strained', 'water-not-shown', 'solution-not-shown', 'entries-do-not-follow', 'outside-tolerance'] as Reason[]).flatMap((reason) => PART_IDS.map((part) => reasonText(part, reason))),
    ...(['cup-empty', 'not-weighed', 'not-looked', 'not-the-logger', 'cup-strained', 'cup-weighed', 'solute-in', 'no-reading-since'] as Blocked[]).flatMap((blocked) => PART_IDS.flatMap((part) => (['water', 'solution'] as Field[]).map((field) => blockedText(part, blocked, field)))),
    ...[true, false].flatMap((molecule) => [true, false].map((salt) => wantedText({ molecule, salt }))),
    BENCH_TEXT.runOnHelp(m),
  ]
  const sentences = [...new Set([...fixed, ...worked])]

  it('is short and plain: none over 40 words', () => {
    expect(sentences.length).toBeGreaterThan(150)
    for (const text of sentences) {
      // The record's own notes on a count of particles are held to their length where they are stored.
      if (/^(Urea|Sodium|Potassium).* the lab holds/.test(text) || text === SOURCES_TEXT || text.startsWith('Molar masses:')) continue
      for (const sentence of text.split(/(?<=\.)\s+/)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(40)
    }
  })

  it('holds no institution text, and names no maker or supplier', () => {
    for (const text of sentences) {
      expect(findInstitutionText(text, institutionNames), text).toBeNull()
      expect(text, text).not.toMatch(/Flinn|Fisher|Vernier|Styrofoam|LabQuest/i)
    }
  })

  type Lib = { unpackHashes(base64: string): Set<number>; quotedRuns(text: string, fingerprint: Set<number>): string[] }
  const [lib] = Object.values(import.meta.glob<Lib>('../../../../scripts/titration-lib.mjs', { eager: true }))
  const [fingerprint] = Object.values(import.meta.glob<{ hashes: string }>('../../../../docs/research/freezing/sources/quotation-fingerprint.json', { eager: true, import: 'default' }))

  it.skipIf(fingerprint === undefined)('repeats no run of six words of a page the lab rests on (skipped where the fingerprint is absent: it is not kept in the repository)', () => {
    const pages = lib!.unpackHashes(fingerprint!.hashes)
    for (const text of sentences) expect(lib!.quotedRuns(text, pages), text).toEqual([])
  })
})

const LID_OFF = 'The graph has 15 readings, one every 30 seconds. It starts at 2.40 °C at 0 s. The solute went in after the reading of −0.16 °C at 3 min. The lowest reading since is −1.72 °C at 5 min. The last reading, when the cup was strained or weighed, is −0.96 °C at 7 min. Over the last three readings it rose by 0.73 °C.'
