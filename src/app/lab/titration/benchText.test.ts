import { describe, expect, it } from 'vitest'
import { findInstitutionText } from '@/chem-data/denylist'
import { titrationData } from '@/chem-data/titration/data'
import { createLab, currentTrial, modelFrom, type Action, type TitrationState } from '@/engine/titration'
import { learner } from '@/engine/titration/testkit'
import * as benchText from './benchText'
import {
  ACTION_TEXT,
  additionMessage,
  describeStand,
  flaskStatus,
  levelBracket,
  PLUME_TEXT,
  SLOW_DOWN_TEXT,
  STOPCOCK_ALREADY_CLOSED,
  streamMessage,
  swirlText,
  undoneText,
} from './benchText'
import benchTextFile from './benchText.ts?raw'
import { benchViewOf, type BenchView } from './benchView'
import { OUTCOME_TEXT } from './messages'
import { CLOSED, openStream, POUR_ADDITIONS } from './stream'

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('../../../chem-data/denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const m = modelFrom(titrationData)
const display = { pinkDisplayScale: titrationData.parameters.pinkDisplayScale.value, faintPinkNameLimit: titrationData.parameters.faintPinkNameLimit.value }
const { run, prepared, titrateCarefully } = learner()

const view = (state: TitrationState) => benchViewOf(m, state)
const STREAM: Action = { type: 'deliver', amount: 'stream' }
const atLevel = (v: BenchView, levelUl: number): BenchView => ({ ...v, burette: { ...v.burette, levelUl } })

const fresh = view(createLab(1, 'guided'))
const start = prepared(m, 1, { mode: 'guided' })
const midStream = view(run(m, start, Array<Action>(40).fill(STREAM)))
const endpoint = view(titrateCarefully(m, start).state)
/** The stream left open until the trial ends. */
function streamedToTheEnd(state: TitrationState): TitrationState {
  while (currentTrial(state).end === 'open') state = run(m, state, [STREAM])
  return state
}
const overshot = view(streamedToTheEnd(start))

describe('the burette level to a whole mL', () => {
  it.each([
    [0, 'between the 0 mL and 1 mL marks'],
    [999, 'between the 0 mL and 1 mL marks'],
    [1000, 'between the 1 mL and 2 mL marks'],
    [49999, 'between the 49 mL and 50 mL marks'],
    [50000, 'at the 50 mL mark, the bottom of the scale'],
  ])('%i uL is %s', (levelUl, text) => {
    expect(levelBracket(levelUl)).toBe(text)
  })

  it("ends at the model's last mark", () => {
    expect(levelBracket(m.buretteCapacityUl)).toContain(`${m.buretteCapacityUl / 1000} mL mark`)
    expect(levelBracket(m.buretteCapacityUl - 1)).toContain('between')
  })
})

describe('the stand in words', () => {
  it('a new lab', () => {
    expect(describeStand(fresh, CLOSED, display)).toBe('The burette is empty. The stopcock is closed. The conical flask under the burette is empty.')
  })

  it('with the stream open at 12 563 uL: the marks either side, the open stopcock, the indicator and the colour', () => {
    expect(midStream.burette.levelUl).toBe(12563)
    const text = describeStand(midStream, openStream(null), display)
    expect(text).toContain('between the 12 mL and 13 mL marks')
    expect(text).toContain('The stopcock is open.')
    expect(text).toContain('2 drops of indicator')
    expect(text).toContain('the liquid is colourless')
    expect(text).not.toContain('air bubble')
  })

  it('at the endpoint the liquid is faint pink, and overshot it is dark pink', () => {
    expect(describeStand(endpoint, CLOSED, display)).toContain('the liquid is faint pink.')
    expect(describeStand(endpoint, CLOSED, display)).toContain('The stopcock is closed.')
    expect(overshot.trialEnd).toBe('overshot')
    expect(describeStand(overshot, CLOSED, display)).toContain('the liquid is dark pink (overshot).')
  })

  it('counts the indicator as none, 1 drop or 2 drops', () => {
    const drops = (indicatorDrops: number) => describeStand({ ...midStream, flask: { ...midStream.flask, indicatorDrops } }, CLOSED, display)
    expect(drops(0)).toContain('holds the acid with no indicator;')
    expect(drops(1)).toContain('holds the acid with 1 drop of indicator;')
    expect(drops(3)).toContain('holds the acid with 3 drops of indicator;')
  })

  it.each([370, 12870, 26045, 49999, 50000])('at %i uL it gives no volume finer than a whole mL', (levelUl) => {
    for (const v of [midStream, endpoint, overshot])
      for (const stream of [CLOSED, openStream(null)]) expect(describeStand(atLevel(v, levelUl), stream, display)).not.toMatch(/\d\.\d/)
  })
})

describe('what the stopcock says', () => {
  const said = [streamMessage(openStream(null)), streamMessage(openStream(POUR_ADDITIONS[0])), streamMessage(openStream(POUR_ADDITIONS[1])), streamMessage(CLOSED)]

  it('is one sentence each for an open stream, each pour and a closed stopcock', () => {
    expect(new Set(said).size).toBe(4)
    expect(said[0]).toContain('open')
    expect(said[1]).toContain('1 mL')
    expect(said[2]).toContain('5 mL')
    expect(said[1]).not.toContain('5 mL')
    expect(said[2]).not.toContain('1 mL')
    expect(said[3]).toBe('Stopcock closed.')
  })

  it('says of an open stopcock, a stream or a pour, both ways to close it: the same button again, or Escape from anywhere on the page', () => {
    for (const open of said.slice(0, 3)) expect(open).toMatch(/Press again, or press Escape, to close it/)
    expect(said[3]).not.toContain('Escape')
  })

  it('a pour part of the way through says the same as when it began, so it is said once', () => {
    expect(streamMessage({ open: true, pour: POUR_ADDITIONS[1], remaining: 7 })).toBe(said[2])
  })

  it("the pours are 1 mL and 5 mL of the model's stream addition", () => {
    expect(POUR_ADDITIONS[0] * m.streamUl).toBe(1000)
    expect(POUR_ADDITIONS[1] * m.streamUl).toBe(5000)
  })
})

describe('what a drop and a half-drop say', () => {
  it.each(['drop', 'half'] as const)('a %s says something new on each of three presses', (amount) => {
    const first = additionMessage(amount, '')
    const second = additionMessage(amount, first)
    const third = additionMessage(amount, second)
    expect(second).not.toBe(first)
    expect(third).not.toBe(second)
  })

  it('a drop after a half-drop, and a half-drop after a drop, are new too', () => {
    const half = additionMessage('half', '')
    const drop = additionMessage('drop', half)
    expect(drop).not.toBe(half)
    expect(additionMessage('half', drop)).not.toBe(drop)
    expect(additionMessage('drop', 'Stopcock closed.')).toBe(additionMessage('drop', ''))
  })

  it('the first half-drop says it is touched off on the flask wall and rinsed in', () => {
    expect(additionMessage('half', '')).toContain('touched off on the flask wall and rinsed in')
    expect(additionMessage('drop', '')).not.toContain('flask wall')
  })
})

describe('the swirl and wait', () => {
  it('says what the wait found, in the words of the status line', () => {
    expect(swirlText('persisted')).toContain('the pink has lasted')
    expect(swirlText('faded')).toBe('Flask swirled for 30 seconds: no pink.')
    expect(flaskStatus({ ...endpoint, persistence: 'persisted' }, display)).toContain('the pink has lasted')
    expect(flaskStatus({ ...midStream, persistence: 'faded', plume: null }, display)).toBe('Flask: colourless. Swirled 30 s: no pink.')
  })

  it('does not say of a flask that was never pink that no pink remains: a wait finds no pink only in a flask that was not pink before it', { timeout: 60_000 }, () => {
    // A flask with its indicator and no NaOH yet can be swirled, and has never been pink at all.
    const untitrated = view(run(m, start, [{ type: 'swirlAndWait' }]))
    expect(untitrated.plumeKey).toBe(0)
    expect(flaskStatus(untitrated, display)).toBe('Flask: colourless. Swirled 30 s: no pink.')
    for (const text of [swirlText('faded'), flaskStatus(untitrated, display)]) expect(text).not.toMatch(/remains/)
    // The model's flask is closed: a mixed flask that is pink stays pink through the wait, at every careful endpoint of seeds 1 to 100.
    for (let seed = 1; seed <= 100; seed++) expect([seed, view(titrateCarefully(m, prepared(m, seed)).state).persistence]).toEqual([seed, 'persisted'])
  })

  it("names the model's 30 seconds", () => {
    expect(m.persistSeconds).toBe(30)
    for (const text of [swirlText('persisted'), swirlText('faded'), ACTION_TEXT.swirlAndWait]) expect(text).toContain(`${m.persistSeconds} seconds`)
    expect(flaskStatus({ ...midStream, persistence: 'faded', plume: null }, display)).toContain(`Swirled ${m.persistSeconds} s`)
  })
})

describe('the status line', () => {
  it('names the three cues as the spec has them', () => {
    expect(PLUME_TEXT).toEqual({ 'fades-at-once': 'pink fades at once', 'fades-slowly': 'pink fades slowly', persists: 'pink persists' })
  })

  it('says nothing of a cue for an empty flask, one with no indicator, or one that is overshot', () => {
    expect(flaskStatus({ ...fresh, plume: 'fades-slowly' }, display)).toBe('Flask: empty.')
    expect(flaskStatus({ ...midStream, flask: { ...midStream.flask, indicatorDrops: 0 } }, display)).toBe('Flask: colourless. No indicator in it.')
    expect(overshot.plume).toBe('persists')
    expect(flaskStatus(overshot, display)).toBe('Flask: dark pink (overshot).')
  })
})

describe('what is said when a confirmed endpoint is undone (seed 6, where the second wash thins the pink to colourless)', () => {
  const confirmed = titrateCarefully(m, prepared(m, 6, { mode: 'guided' })).state
  const WASH: Action = { type: 'addWater' }

  it('a wash, a drop and a half-drop after a pink that lasted each say that the wait and a final reading after it no longer apply', () => {
    expect(view(confirmed).persistence).toBe('persisted')
    const said = undoneText(view(confirmed), view(run(m, confirmed, [WASH])))
    expect(said).toMatch(/swirl and wait/)
    expect(said).toMatch(/final reading/)
    expect(said).toMatch(/no longer/)
    // True of each of the three: the engine clears the wait, and the reading with it.
    for (const action of [WASH, { type: 'deliver', amount: 'drop' }, { type: 'deliver', amount: 'half' }] as Action[]) {
      const read = run(m, confirmed, [{ type: 'recordFinalReading', readingUl: Math.round(confirmed.burette.levelUl / 10) * 10 }])
      expect(currentTrial(read).finalReadingUl).not.toBeNull()
      expect(currentTrial(run(m, read, [action]))).toMatchObject({ finalReadingUl: null, waitedS: 0 })
    }
  })

  it('nothing is added where no pink had lasted: not before a swirl, and not after one that found no pink', () => {
    const after = (state: TitrationState, action: Action) => undoneText(view(state), view(run(m, state, [action])))
    expect(after(start, { type: 'deliver', amount: 'drop' })).toBe('')
    expect(undoneText(midStream, view(run(m, start, Array<Action>(41).fill(STREAM))))).toBe('')
    const faded = run(m, start, [{ type: 'swirlAndWait' }])
    expect(view(faded).persistence).toBe('faded')
    expect(after(faded, WASH)).toBe('')
    expect(after(run(m, confirmed, [WASH]), WASH)).toBe('')
  })

  it('while the flask is still pink it ends by saying to swirl and wait again; once a wash has left it no longer pink, by saying to add a half-drop', () => {
    const once = run(m, confirmed, [WASH])
    const stillPink = undoneText(view(confirmed), view(once))
    expect(view(once).flask.pink).toBe(true)
    expect(stillPink).toMatch(/Swirl and wait again before the final reading\.$/)
    // The wait is done again on the washed flask, and the second wash thins the pink away.
    const again = run(m, once, [{ type: 'swirlAndWait' }])
    const twice = run(m, again, [WASH])
    expect([view(again).persistence, view(twice).flask.pink, view(twice).trialEnd]).toEqual(['persisted', false, 'open'])
    const thinned = undoneText(view(again), view(twice))
    expect(thinned).toMatch(/add a half-drop\.$/)
    expect(thinned).not.toMatch(/[Ss]wirl and wait again/)
    // Both say what became of the wait and of a reading taken after it.
    for (const text of [stillPink, thinned]) expect(text).toMatch(/that wait no longer counts, and a final reading recorded after it no longer applies/)
    // A half-drop does bring the pink back, and after a drop or a half-drop the flask is still pink.
    expect(view(run(m, twice, [{ type: 'deliver', amount: 'half' }])).flask.pink).toBe(true)
    for (const amount of ['drop', 'half'] as const) expect(undoneText(view(confirmed), view(run(m, confirmed, [{ type: 'deliver', amount }])))).toBe(stillPink)
  })

  it("Guided's slow-down line, which shows again on the thinned flask, does not contradict it: no more than a drop at a time allows the half-drop", () => {
    const twice = view(run(m, confirmed, [WASH, { type: 'swirlAndWait' }, WASH]))
    expect([twice.slowDown, twice.flask.pink]).toEqual([true, false])
    expect(SLOW_DOWN_TEXT).toMatch(/no more than a drop at a time/)
    expect(SLOW_DOWN_TEXT).not.toMatch(/Go on a drop at a time/)
  })

  it('it says nothing when the wash ended the trial: there is no wait to do again and nothing to add (seed 1384, the burette at its last mark)', () => {
    // Trial 2 with no refill runs to the mark just past its endpoint; the second wash there takes the pink away and the trial is over.
    let s = learner().carefulTrial(m, prepared(m, 1384))
    s = learner().readyTrial(m, run(m, s, [{ type: 'startNextTrial' }]), { fill: false })
    while (view(s).controls.deliver === null) s = run(m, s, [STREAM])
    s = run(m, s, [WASH, { type: 'swirlAndWait' }])
    expect([view(s).persistence, view(s).burette.atBottom]).toEqual(['persisted', true])
    const ended = run(m, s, [WASH])
    expect(view(ended).trialEnd).toBe('ran-out')
    expect(undoneText(view(s), view(ended))).toBe('')
  })

  it('after a wash the status line gives the colour and says nothing of a last addition, whichever way the colour went', () => {
    const once = run(m, confirmed, [WASH])
    expect(flaskStatus(view(confirmed), display)).toBe('Flask: faint pink. Swirled 30 s: the pink has lasted.')
    expect(flaskStatus(view(once), display)).toBe('Flask: faint pink.')
    const twice = run(m, once, [WASH])
    expect(flaskStatus(view(twice), display)).toBe('Flask: colourless.')
    expect(view(twice).plume).toBeNull()
    // Titrant again, and the cue is back: it is of this addition.
    expect(flaskStatus(view(run(m, twice, [{ type: 'deliver', amount: 'half' }])), display)).toBe('Flask: faint pink. Last addition: pink persists.')
  })

  it('over careful endpoints of seeds 1 to 100, washed up to three times: no status line names a last addition after a wash', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 100; seed++) {
      let state = titrateCarefully(m, prepared(m, seed)).state
      for (let wash = 0; wash < 3 && currentTrial(state).end === 'open'; wash++) {
        state = run(m, state, [WASH])
        expect([seed, wash, flaskStatus(view(state), display)]).toEqual([seed, wash, expect.not.stringContaining('Last addition')])
      }
    }
  })
})

describe('every sentence of the bench', () => {
  const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : []
  const views = [fresh, midStream, endpoint, overshot, atLevel(midStream, 50000), { ...midStream, persistence: 'faded' as const, plume: null }]
  const said = [
    ...views.flatMap((v) => [flaskStatus(v, display), describeStand(v, CLOSED, display), describeStand(v, openStream(null), display), levelBracket(v.burette.levelUl)]),
    ...[openStream(null), openStream(POUR_ADDITIONS[0]), openStream(POUR_ADDITIONS[1]), CLOSED].map(streamMessage),
    ...(['drop', 'half'] as const).flatMap((amount) => [additionMessage(amount, ''), additionMessage(amount, additionMessage(amount, ''))]),
    swirlText('persisted'),
    swirlText('faded'),
    undoneText({ ...endpoint, persistence: 'persisted' }, endpoint),
    undoneText({ ...endpoint, persistence: 'persisted' }, { ...endpoint, flask: { ...endpoint.flask, pink: false } }),
  ]
  const all = [...strings(benchText), ...said]

  it('is one of more than 40', () => {
    expect(new Set(all).size).toBeGreaterThan(40)
  })

  it('has no institution text', () => {
    for (const text of all) expect([text, findInstitutionText(text, institutionNames)]).toEqual([text, null])
  })

  it('states no volume finer than a whole mL', () => {
    for (const text of all) expect(text).not.toMatch(/\d\.\d/)
  })

  it('names nothing the engine keeps: no pH, no equivalence, no molarity', () => {
    for (const text of all) expect(text).not.toMatch(/\bpH\b|equivalence|molarity|\bM\b/i)
  })

  it('the slow-down line is true whether or not the stopcock was open, and says how to go on', () => {
    expect(SLOW_DOWN_TEXT).toMatch(/^Slow down/)
    expect(SLOW_DOWN_TEXT).toContain('a drop at a time')
    expect(SLOW_DOWN_TEXT).toContain('half-drops')
    expect(SLOW_DOWN_TEXT).not.toContain('has been closed')
    // The hint first shows with the stream's own "pink fades slowly" in the status line, so it says whose pink is meant.
    expect(SLOW_DOWN_TEXT).toMatch(/change to half-drops when a single drop's pink is slow to fade/)
    expect(SLOW_DOWN_TEXT).not.toMatch(/once the pink is slow to fade/)
  })

  it('a press the bench dropped is told that the stopcock is already closed', () => {
    expect(STOPCOCK_ALREADY_CLOSED).toContain('already closed')
  })

  it('the trial that ran out is worded once, in messages.ts, and not again here', () => {
    expect(strings(benchText)).not.toContain(OUTCOME_TEXT['ran-out'])
    expect(benchTextFile).not.toContain('ran out')
  })

  it('each prep action says what it did, in a sentence of its own', () => {
    const texts = Object.values(ACTION_TEXT)
    expect(Object.keys(ACTION_TEXT).sort()).toEqual(
      ['addIndicatorDrop', 'addWater', 'clearTipBubble', 'conditionBurette', 'fillBurette', 'pipetteAliquot', 'rinsePipette', 'swirlAndWait'].sort(),
    )
    expect(new Set(texts).size).toBe(texts.length)
    // The two that move the meniscus say that a reading taken before them is gone; conditioning leaves nothing to read.
    for (const action of ['fillBurette', 'clearTipBubble'] as const) expect(ACTION_TEXT[action]).toMatch(/initial reading recorded before this .*no longer applies\.$/)
    expect(ACTION_TEXT.conditionBurette).toContain('empty')
  })

  it('benchText.ts takes nothing from the engine but types, and never the model or the state', () => {
    expect(benchTextFile).not.toMatch(/TitrationModel|TitrationState/)
    expect(benchTextFile.match(/^import .*$/gm)?.filter((line) => line.includes('engine'))).toEqual([expect.stringMatching(/^import type \{/)])
  })
})
