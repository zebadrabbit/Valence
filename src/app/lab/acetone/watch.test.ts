import { describe, expect, it } from 'vitest'
import { acetoneData as data, RUN_IDS, type RunId } from '@/chem-data/acetone/data'
import { can, createLab, leftAt, lookAt, modelFrom, reduce, runView, type AcetoneState } from '@/engine/acetone'
import { makeRun } from '@/engine/acetone/testkit'
import { CHANGE_TEXT, fadeSaid, fadeText, liquidLook } from './messages'
import { endsItself, frame, handStop, PLAY, roomToSay, SAY_MS, SPEED, startPlay, tooSoon, type Play } from './watch'

// The playing of a run's time in this lab, with no clock: the true time of each frame is a number the test hands
// in. The playing itself is the shared piece, which the clock reaction lab's watch.test.ts holds; these hold this
// lab's one speed, and that the fade and the watch agree.

const m = modelFrom(data)
const LIMIT = m.watchLimitMs
const poured = (seed: number, runId: RunId): AcetoneState => {
  // A run made whole and then set back to its pour: the same flask, with the watch running.
  const made = makeRun(m, createLab(m, seed, 'challenge'), runId, { stop: 'end' })
  const attempts = made.runs[runId]!
  return { ...made, runs: { ...made.runs, [runId]: [...attempts.slice(0, -1), { ...attempts.at(-1)!, stop: null }] } }
}
const gone = (state: AcetoneState, runId: RunId) => (ms: number) => lookAt(m, state, runId, ms) === 'after'
/** Plays a run frame by frame, a frame every `stepMs` of true time, until `until` says to stop. */
function play(state: AcetoneState, runId: RunId, stepMs: number, until: (p: Play, now: number) => boolean): { play: Play; now: number } {
  let now = 1000
  let p = startPlay(now)
  while (!until(p, now)) {
    now += stepMs
    p = frame(p, now, SPEED, LIMIT, gone(state, runId))
  }
  return { play: p, now }
}
/** A run played to the frame that shows the last of its colour gone: how long that took in true milliseconds. It holds on the way that the watch then reads the time of the end itself, which is the time the engine gives a watch stopped at the end. */
const toEnd = (seed: number, runId: RunId): { real: number; play: Play; now: number } => {
  const state = poured(seed, runId)
  const { play: p, now } = play(state, runId, 16, (at) => at.shown !== null)
  const end = runView(m, reduce(m, state, { type: 'stopAtEnd', run: runId }), runId).stopped!.tenths
  expect([runId, seed, Math.round(p.labMs / 100)]).toEqual([runId, seed, end])
  return { real: now - p.startedAt, play: p, now }
}

describe('a run that is played', () => {
  it('plays the four mixtures at one speed, a minute on the watch to a true second: at every seed from 1 to 100 the slowest, the fourth, has faded within 13.1 true seconds of its pour, and the fastest takes 1.9 seconds or more', () => {
    expect(SPEED).toBe(60)
    const span: Record<string, number[]> = {}
    for (let seed = 1; seed <= 100; seed++) {
      const reals = RUN_IDS.map((runId) => toEnd(seed, runId))
      RUN_IDS.forEach((runId, at) => (span[runId] = [Math.min(span[runId]?.[0] ?? Infinity, reals[at]!.play.labMs / SPEED), Math.max(span[runId]?.[1] ?? 0, reals[at]!.play.labMs / SPEED)]))
      expect([seed, Math.max(...reals.map((one) => one.real)) === reals[3]!.real, reals[3]!.real <= 13_100, Math.min(...reals.map((one) => one.real)) >= 1900]).toEqual([seed, true, true, true])
      // What a run takes on the screen is what it takes on the watch over that one speed, to within a frame.
      for (const { real, play: p } of reals) expect([seed, Math.abs(real - p.labMs / SPEED) <= 16]).toEqual([seed, true])
    }
    // The true seconds from a pour to the end of its fade, the least and the most over the hundred seeds, as the documents give them.
    expect(RUN_IDS.map((runId) => span[runId]!.map((ms) => Number((ms / 1000).toFixed(2))))).toEqual([[4.01, 6.48], [2.01, 3.27], [1.99, 3.26], [7.98, 12.96]])
  })

  it('so shows the mixture with twice the iodine fading for twice the true time of the first, and the two with twice the acetone or the acid for half of it', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const [one, two, three, four] = RUN_IDS.map((runId) => toEnd(seed, runId).real)
      const near = (ratio: number, of: number) => ratio > of * 0.95 && ratio < of * 1.05
      expect([seed, near(four! / one!, 2), near(two! / one!, 0.5), near(three! / one!, 0.5)]).toEqual([seed, true, true, true])
    }
  })

  it('takes no run to its end within three times the half second in which the bench takes no press, and none is waited for past the twenty seconds it is played at its speed', () => {
    for (let seed = 1; seed <= 100; seed++) for (const runId of RUN_IDS) expect([seed, runId, toEnd(seed, runId).real > 3 * PLAY.deafMs, toEnd(seed, runId).real < PLAY.steadyMs]).toEqual([seed, runId, true, true])
    const p = startPlay(1000)
    expect([0, 250, 499, 500, 2000].map((ms) => tooSoon(p, 1000 + ms))).toEqual([true, true, true, false, false])
  }, 60_000)

  it('has iodine left, and so a colour, at every frame before the one that shows the end, and none from that frame on: the fade and the watch agree', () => {
    for (const runId of RUN_IDS) {
      const state = poured(4, runId)
      const seen: number[] = []
      const { play: shown } = play(state, runId, 16, (at) => {
        if (at.shown === null) seen.push(leftAt(m, state, runId, at.labMs)!.microMolar)
        return at.shown !== null
      })
      expect(seen.every((amount) => amount > 0)).toBe(true)
      // It only ever goes down, from all of it at the pour.
      expect(seen[0]).toBe(leftAt(m, state, runId, 0)!.ofMicroMolar)
      expect(seen.every((amount, at) => at === 0 || amount <= seen[at - 1]!)).toBe(true)
      expect(leftAt(m, state, runId, shown.labMs)!.microMolar).toBe(0)
      expect(liquidLook(data, leftAt(m, state, runId, shown.labMs - 1)!)).toBe('faintest-yellow')
    }
  })

  it('has the status line say a step of the fade only where the end is still 1.8 true seconds off or more: pale yellow and then the end in the first and the fourth mixture, the end alone in the second and the third, and the faintest yellow in none', () => {
    const [pale, faintest] = [fadeText('pale-yellow'), fadeText('faintest-yellow')]
    for (let seed = 1; seed <= 100; seed++) {
      const said = RUN_IDS.map((runId) => {
        const state = poured(seed, runId)
        // What the status line says at each frame, as the run's card asks it, with the true time of the frame that first said it.
        const lines: { text: string; at: number }[] = []
        const { now: end } = play(state, runId, 16, (at, now) => {
          const left = leftAt(m, state, runId, at.labMs)!
          const text = fadeSaid(data, left, (step) => roomToSay(at.labMs, left, step))
          if (text !== (lines.at(-1)?.text ?? '')) lines.push({ text, at: now })
          return at.shown !== null
        })
        // A step that is said has been said for 1.8 true seconds, less a frame, before the end is.
        for (const line of lines.slice(0, -1)) expect([seed, runId, end - line.at >= SAY_MS - 16]).toEqual([seed, runId, true])
        return lines.map((line) => line.text)
      })
      expect([seed, ...said]).toEqual([seed, [pale, CHANGE_TEXT], [CHANGE_TEXT], [CHANGE_TEXT], [pale, CHANGE_TEXT]])
      expect(said.flat()).not.toContain(faintest)
    }
    // The room is the step's own amount over the amount gone, of the time so far: half of a run for a step at half of its iodine.
    expect([roomToSay(SAY_MS * SPEED, { microMolar: 500, ofMicroMolar: 1000 }, 500), roomToSay(SAY_MS * SPEED - 1, { microMolar: 500, ofMicroMolar: 1000 }, 500), roomToSay(0, { microMolar: 1000, ofMicroMolar: 1000 }, 500)]).toEqual([true, false, false])
  }, 60_000)

  it('adds true time, and no more, from the frame that shows the end: a hand 400 ms late is recorded 400 ms late, and the stopped watch reads what the running one read', () => {
    for (const runId of ['mixture-1', 'mixture-4'] as const) {
      const state = poured(7, runId)
      const { play: shown, now } = toEnd(7, runId)
      const late = frame(shown, now + 400, SPEED, LIMIT, gone(state, runId))
      expect(late.labMs).toBe(shown.labMs + 400)
      const stop = handStop(late, now + 400, LIMIT)
      expect(stop).toEqual({ elapsedMs: shown.labMs + 400, delayMs: 400 })
      const view = runView(m, reduce(m, state, { type: 'stop', run: runId, ...stop }), runId)
      expect(view.outcome).toEqual({ state: 'counts' })
      expect(view.stopped).toEqual({ tenths: Math.round(late.labMs / 100), by: 'hand' })
    }
  })

  it('hands the engine a watch stopped while there is still colour, and one stopped more than five seconds after the end, and neither counts', () => {
    const state = poured(3, 'mixture-2')
    const { play: early, now: at } = play(state, 'mixture-2', 16, (_, now) => now >= 2000)
    expect(early.shown).toBeNull()
    expect(runView(m, reduce(m, state, { type: 'stop', run: 'mixture-2', ...handStop(early, at, LIMIT) }), 'mixture-2').outcome).toEqual({ state: 'does-not-count', reasons: ['stopped-early'] })
    const { play: shown, now } = toEnd(3, 'mixture-2')
    const late = frame(shown, now + m.delayLimitMs + 100, SPEED, LIMIT, gone(state, 'mixture-2'))
    const stop = { type: 'stop', run: 'mixture-2', ...handStop(late, now + m.delayLimitMs + 100, LIMIT) } as const
    expect(can(m, state, stop)).toBeNull()
    expect(runView(m, reduce(m, state, stop), 'mixture-2').outcome).toEqual({ state: 'does-not-count', reasons: ['stopped-late'] })
  })

  it('never hands the engine a time past the limit of the watch: a frame that comes two hours after the end, as when a computer has slept, stops the watch at its limit, and the stopped watch reads that and no more', () => {
    for (const runId of ['mixture-2', 'mixture-4'] as const) {
      const state = poured(5, runId)
      const { play: shown, now } = toEnd(5, runId)
      const late = frame(shown, now + 7_200_000, SPEED, LIMIT, gone(state, runId))
      expect([late.labMs, endsItself(late, LIMIT, false)]).toEqual([LIMIT, 'limit'])
      const stop = { type: 'stop', run: runId, ...handStop(late, now + 7_200_000, LIMIT) } as const
      // The delay is what the watch had left to run at the end, and not the two hours.
      expect(stop).toMatchObject({ elapsedMs: LIMIT, delayMs: LIMIT - shown.labMs })
      expect(can(m, state, stop)).toBeNull()
      const view = runView(m, reduce(m, state, stop), runId)
      expect(view.stopped).toEqual({ tenths: LIMIT / 100, by: 'hand' })
      expect(view.outcome).toEqual({ state: 'does-not-count', reasons: ['stopped-late'] })
    }
  })

  it('is ended at the end of the fade, and not before, where the learner asked for the watch to be stopped then', () => {
    const state = poured(9, 'mixture-3')
    expect(endsItself(play(state, 'mixture-3', 16, (_, now) => now >= 2000).play, LIMIT, true)).toBeNull()
    const { play: shown } = toEnd(9, 'mixture-3')
    expect([endsItself(shown, LIMIT, true), endsItself(shown, LIMIT, false)]).toEqual(['change', null])
  })
})
