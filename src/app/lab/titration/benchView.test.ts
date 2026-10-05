// The join: the bench's view of a real engine state, and the bench's own words on it. Every state here is made by
// the scripted learner on the stored record's model, seed 1, in Guided unless a case says otherwise.
import { describe, expect, it } from 'vitest'
import { titrationData } from '@/chem-data/titration/data'
import { can, createLab, currentTrial, modelFrom, type Action, type Mode, type TitrationState } from '@/engine/titration'
import { honestReading, learner } from '@/engine/titration/testkit'
import { describeStand, flaskStatus, levelBracket } from './benchText'
import { benchViewOf, type BenchControl } from './benchView'
import { flaskColour } from './flaskColour'
import { meniscusText } from './meniscusText'
import { CLOSED } from './stream'

const m = modelFrom(titrationData)
const display = { pinkDisplayScale: titrationData.parameters.pinkDisplayScale.value, faintPinkNameLimit: titrationData.parameters.faintPinkNameLimit.value }
const { run, readyTrial, prepared, titrateCarefully, carefulTrial } = learner()

const CONTROLS: readonly BenchControl[] = [
  'conditionBurette',
  'fillBurette',
  'clearTipBubble',
  'rinsePipette',
  'pipetteAliquot',
  'addIndicatorDrop',
  'addWater',
  'deliver',
  'swirlAndWait',
]
const everyControl = <T>(value: T) => Object.fromEntries(CONTROLS.map((control) => [control, value]))

const view = (state: TitrationState) => benchViewOf(m, state)
const status = (state: TitrationState) => flaskStatus(view(state), display)
const deliver = (amount: 'stream' | 'drop' | 'half'): Action => ({ type: 'deliver', amount })
const repeat = (action: Action, times: number) => Array<Action>(times).fill(action)
const SWIRL: Action = { type: 'swirlAndWait' }
/** Streams until the trial ends. */
function streamToTheEnd(state: TitrationState): TitrationState {
  while (currentTrial(state).end === 'open') state = run(m, state, [deliver('stream')])
  return state
}

const fresh = createLab(1, 'guided')
const filled = run(m, fresh, [{ type: 'fillBurette' }])
const ready = (mode: Mode = 'guided', seed = 1, drops = 2) => prepared(m, seed, { mode, drops })
/** A careful titration's additions made again one at a time, without the swirl and wait that ends it. */
const endpointOf = (start: TitrationState) => run(m, start, titrateCarefully(m, start).additions.map((addition) => deliver(addition.amount)))
const atEndpoint = endpointOf(ready())
const confirmed = run(m, atEndpoint, [SWIRL])
const nextTrial = run(m, carefulTrial(m, ready()), [{ type: 'startNextTrial' }])

describe('the bench view of a real engine state', () => {
  it('a new lab: the label, an empty flask, and an initial reading that waits for the burette to be filled', () => {
    const v = view(fresh)
    expect(v.hclLabel).toBe('0.0976')
    expect(status(fresh)).toBe('Flask: empty.')
    expect(v.readingWanted).toBe('initial')
    expect(v.readingBlocked).toBe('burette-empty')
    expect(v.burette).toEqual({ conditioned: false, filled: false, tipBubble: false, levelUl: 0, atBottom: false })
    expect(v.pipetteRinsed).toBe(false)
    expect(v.plume).toBeNull()
    expect(v.trialEnd).toBe('open')
  })

  it('filled, the bubble in the tip: the stand and the meniscus are both described at level 1963', () => {
    const v = view(filled)
    expect(v.burette).toEqual({ conditioned: false, filled: true, tipBubble: true, levelUl: 1963, atBottom: false })
    const stand = describeStand(v, CLOSED, display)
    expect(stand).toContain('between the 1 mL and 2 mL marks')
    expect(stand).toContain('There is an air bubble in the tip')
    expect(meniscusText(v.burette.levelUl)).toContain('between the 1.9 mL and 2.0 mL marks, about three quarters of the way down from the 1.9 mL mark')
  })

  it('fill, record the initial reading, clear the tip: the level falls to 2563 and the reading is wanted again', () => {
    const read = readyTrial(m, fresh)
    expect(view(read).controls.deliver).toBeNull()
    const cleared = run(m, read, [{ type: 'clearTipBubble' }])
    const v = view(cleared)
    expect(v.burette.levelUl).toBe(2563)
    expect(v.burette.tipBubble).toBe(false)
    expect(v.readingWanted).toBe('initial')
    expect(v.readingBlocked).toBeNull()
    // The reading taken above the bubble went with the level it described.
    expect(v.controls.deliver).toBe('needs-initial-reading')
  })

  it('Guided, filled, the tip cleared, no reading yet: the reading can be recorded, though the engine would send most values back', () => {
    const cleared = run(m, filled, [{ type: 'clearTipBubble' }])
    expect(view(cleared).readingBlocked).toBeNull()
    for (const readingUl of [0, 2500, 25000, 50000]) expect(can(m, cleared, { type: 'recordInitialReading', readingUl })).toBe('reread')
    expect(can(m, cleared, { type: 'recordInitialReading', readingUl: honestReading(2563) })).toBeNull()
  })

  it('an aliquot with no indicator says so; a prepared flask is colourless and the stopcock can be opened', () => {
    const aliquot = run(m, fresh, [{ type: 'pipetteAliquot' }])
    expect(status(aliquot)).toBe('Flask: colourless. No indicator in it.')
    expect(view(aliquot).flask).toMatchObject({ hasAliquot: true, indicatorDrops: 0, waterPortions: 0 })
    expect(status(ready())).toBe('Flask: colourless.')
    expect(view(ready()).controls.deliver).toBeNull()
    expect(view(ready()).burette.conditioned).toBe(true)
    // Until titrant runs, the reading wanted is still the initial one, and it can be taken again.
    expect(view(ready())).toMatchObject({ readingWanted: 'initial', readingBlocked: null })
  })

  const midStream = run(m, ready(), repeat(deliver('stream'), 40))
  it('after 40 stream additions: the cue, the level, the flask and the engine’s word on every control', () => {
    const v = view(midStream)
    expect(status(midStream)).toBe('Flask: colourless. Last addition: pink fades at once.')
    expect(v.burette.levelUl).toBe(12563)
    expect(v.flask.volumeUl).toBe(35102)
    expect(v.controls).toEqual({
      conditionBurette: 'mid-titration',
      fillBurette: 'mid-titration',
      clearTipBubble: 'no-tip-bubble',
      rinsePipette: 'already-done',
      pipetteAliquot: 'flask-has-aliquot',
      addIndicatorDrop: 'mid-titration',
      addWater: null,
      deliver: null,
      swirlAndWait: null,
    })
    expect(v.readingWanted).toBe('final')
    expect(v.readingBlocked).toBe('endpoint-not-confirmed')
  })

  it('a swirl and wait then: the line says what the wait found in place of the cue', () => {
    const swirled = run(m, midStream, [SWIRL])
    expect(status(swirled)).toBe('Flask: colourless. Swirled 30 s: no pink.')
    expect(view(swirled).plume).toBeNull()
    expect(view(swirled).persistence).toBe('faded')
  })

  it.each([
    ['guided', true],
    ['challenge', false],
  ] as const)('at 24 700 uL delivered in %s, slowDown is %s', (mode, slowDown) => {
    const near = run(m, ready(mode), [...repeat(deliver('stream'), 98), ...repeat(deliver('drop'), 4)])
    expect(currentTrial(near).deliveredUl).toBe(24700)
    expect(view(near).slowDown).toBe(slowDown)
  })

  it('in Guided the hint is not there early in the stream, and goes once the flask is pink or the trial is over', () => {
    for (const state of [fresh, ready(), midStream, atEndpoint, confirmed, streamToTheEnd(ready())]) expect(view(state).slowDown).toBe(false)
  })

  it('the endpoint before the wait: faint pink and "pink persists", and the final reading still blocked', () => {
    const v = view(atEndpoint)
    expect(status(atEndpoint)).toBe('Flask: faint pink. Last addition: pink persists.')
    expect(v.persistence).toBe('unchecked')
    expect(v.readingWanted).toBe('final')
    expect(v.readingBlocked).toBe('endpoint-not-confirmed')
  })

  it('the endpoint after the wait: the pink has lasted, no plume, and the final reading can be recorded', () => {
    const v = view(confirmed)
    expect(confirmed).toEqual(titrateCarefully(m, ready()).state)
    expect(status(confirmed)).toBe('Flask: faint pink. Swirled 30 s: the pink has lasted.')
    expect(v.plume).toBeNull()
    expect(v.persistence).toBe('persisted')
    expect(v.readingWanted).toBe('final')
    expect(v.readingBlocked).toBeNull()
  })

  it('overshot: dark pink, and every control and the reading say the trial is over', () => {
    const v = view(streamToTheEnd(ready()))
    expect(flaskStatus(v, display)).toBe('Flask: dark pink (overshot).')
    expect(v.controls).toEqual(everyControl('trial-ended'))
    expect(v.trialEnd).toBe('overshot')
    expect(v.readingWanted).toBe('final')
    expect(v.readingBlocked).toBe('trial-ended')
  })

  it('a new trial after a careful one: an empty flask, the burette where the last trial left it, the pipette still rinsed', () => {
    const v = view(nextTrial)
    expect(flaskStatus(v, display)).toBe('Flask: empty.')
    expect(v.burette.levelUl).toBe(28263)
    expect(v.pipetteRinsed).toBe(true)
    expect(v.controls.fillBurette).toBeNull()
    expect(v.controls.pipetteAliquot).toBeNull()
    expect(v.readingWanted).toBe('initial')
    expect(v.readingBlocked).toBeNull()
    expect(v.plume).toBeNull()
  })

  it('ran out (trial 2, no refill): the burette at its last mark and every control saying the trial is over', () => {
    const v = view(streamToTheEnd(readyTrial(m, nextTrial, { fill: false })))
    expect(v.trialEnd).toBe('ran-out')
    expect(v.burette.atBottom).toBe(true)
    expect(levelBracket(v.burette.levelUl)).toBe('at the 50 mL mark, the bottom of the scale')
    expect(v.controls).toEqual(everyControl('trial-ended'))
    expect(flaskColour({ ...v.flask, hasLiquid: v.flask.hasAliquot, ...display }).name).toBe('colourless')
  })

  it('a completed lab: every control and the reading say the lab is complete', () => {
    let lab = carefulTrial(m, ready())
    for (let trial = 2; trial <= 3; trial++) lab = carefulTrial(m, readyTrial(m, run(m, lab, [{ type: 'startNextTrial' }])))
    expect(lab.status).toBe('completed')
    const v = view(lab)
    expect(v.controls).toEqual(everyControl('lab-completed'))
    expect(v.readingBlocked).toBe('lab-completed')
    expect(v.trialEnd).toBe('graded')
  })

  it('conditioning a filled burette empties it, and the view and the description both say so', () => {
    const emptied = run(m, filled, [{ type: 'conditionBurette' }])
    expect(view(emptied).burette).toMatchObject({ conditioned: true, filled: false, tipBubble: false })
    expect(view(emptied).readingBlocked).toBe('burette-empty')
    expect(describeStand(view(emptied), CLOSED, display)).toContain('The burette is empty.')
  })

  it('counts the portions of distilled water in the flask', () => {
    expect(view(prepared(m, 1, { mode: 'guided', washes: 2 })).flask.waterPortions).toBe(2)
    expect(view(run(m, ready(), repeat({ type: 'addWater' }, 3))).controls.addWater).toBe('water-full')
  })

  it('has the keys of the plan and no other, so nothing else of the engine reaches the bench', () => {
    const v = view(midStream)
    expect(Object.keys(v).sort()).toEqual(
      ['burette', 'controls', 'flask', 'hclLabel', 'persistence', 'pipetteRinsed', 'plume', 'plumeKey', 'readingBlocked', 'readingWanted', 'slowDown', 'trialEnd'].sort(),
    )
    expect(Object.keys(v.flask).sort()).toEqual(['hasAliquot', 'indicatorDrops', 'overshot', 'pink', 'pinkConcentration', 'volumeUl', 'waterPortions'].sort())
    expect(Object.keys(v.controls).sort()).toEqual([...CONTROLS].sort())
  })
})

describe('a careful run, seeds 1 to 100', () => {
  const COLOURLESS = 'Flask: colourless.'
  const AT_ONCE = 'Flask: colourless. Last addition: pink fades at once.'
  const SLOWLY = 'Flask: colourless. Last addition: pink fades slowly.'
  const PERSISTS = 'Flask: faint pink. Last addition: pink persists.'

  it('changes the status line five times, the colour arriving with "pink persists", and restarts the plume at every addition', () => {
    for (let seed = 1; seed <= 100; seed++) {
      let state = ready('challenge', seed)
      const { additions } = titrateCarefully(m, state)
      const lines = [status(state)]
      /** The addition after which each new line was first said. */
      const changedAt: number[] = []
      let key = view(state).plumeKey
      additions.forEach((addition, i) => {
        state = run(m, state, [deliver(addition.amount)])
        const v = view(state)
        const line = flaskStatus(v, display)
        if (line !== lines.at(-1)) {
          lines.push(line)
          changedAt.push(i)
        }
        // Words and picture: the cue says the pink persists exactly when the engine calls the flask pink, and the
        // drawn colour is nothing until then.
        expect([seed, i, v.plume === 'persists']).toEqual([seed, i, v.flask.pink])
        expect([seed, i, flaskColour({ ...v.flask, hasLiquid: true, ...display }).strength > 0]).toEqual([seed, i, v.flask.pink])
        expect([seed, i, v.plumeKey === key]).toEqual([seed, i, false])
        key = v.plumeKey
      })
      expect([seed, lines]).toEqual([seed, [COLOURLESS, AT_ONCE, SLOWLY, AT_ONCE, SLOWLY, PERSISTS]])
      // The stream's own "fades slowly" comes with its last addition, which the careful run leaves 2.00 to 2.25 mL
      // short; the first single drop then fades at once; the endpoint is the last addition.
      const lastStream = additions.map((addition) => addition.amount).lastIndexOf('stream')
      expect([seed, changedAt[1], changedAt[2], changedAt[4]]).toEqual([seed, lastStream, lastStream + 1, additions.length - 1])
      expect(additions[lastStream + 1]!.amount).toBe('drop')
    }
  })

  it.each([2, 3])('every endpoint with %i drops of indicator is named faint pink, before the wait and after it', (drops) => {
    for (let seed = 1; seed <= 100; seed++) {
      const start = ready('challenge', seed, drops)
      const before = endpointOf(start)
      expect([seed, status(before)]).toEqual([seed, PERSISTS])
      expect([seed, status(run(m, before, [SWIRL]))]).toEqual([seed, 'Flask: faint pink. Swirled 30 s: the pink has lasted.'])
    }
  })
})
