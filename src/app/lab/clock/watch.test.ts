import { describe, expect, it } from 'vitest'
import { BATH_IDS, bathRunId, clockData as data, MIXTURE_IDS, type RunId } from '@/chem-data/clock/data'
import { can, createLab, lookAt, modelFrom, reduce, runView, type ClockState } from '@/engine/clock'
import { makeRun } from '@/engine/clock/testkit'
import { endsItself, firstChanged, frame, handStop, labMsAt, PLAY, ROOM_SPEED, SPEED, startPlay, tooSoon, type Play } from './watch'

// The playing of a run's time, with no clock: the true time of each frame is a number the test hands in.

const m = modelFrom(data)
const LIMIT = m.watchLimitMs
const poured = (seed: number, runId: RunId, how: Parameters<typeof makeRun>[3] = {}): ClockState => {
  // A careful run made whole and then set back to its pour: the same flasks, with the watch running.
  const made = makeRun(m, createLab(m, seed, 'challenge'), runId, { ...how, stop: 'end' })
  const attempts = made.runs[runId]!
  return { ...made, runs: { ...made.runs, [runId]: [...attempts.slice(0, -1), { ...attempts.at(-1)!, stop: null }] } }
}
/** Plays a run frame by frame, a frame every `stepMs` of true time, until `until` says to stop. */
function play(state: ClockState, runId: RunId, stepMs: number, until: (p: Play, now: number) => boolean): { play: Play; now: number } {
  let now = 1000
  let p = startPlay(now)
  while (!until(p, now)) {
    now += stepMs
    p = frame(p, now, SPEED[runId], LIMIT, (ms) => lookAt(m, state, runId, ms) === 'after')
  }
  return { play: p, now }
}

describe("the lab's time", () => {
  it('runs at the speed of its run for twenty true seconds, in whole milliseconds, from nothing', () => {
    expect(labMsAt(0, 13, LIMIT)).toBe(0)
    expect(labMsAt(-5, 13, LIMIT)).toBe(0)
    expect(labMsAt(1000, 13, LIMIT)).toBe(13_000)
    expect(labMsAt(16.7, 7, LIMIT)).toBe(117)
    expect(labMsAt(PLAY.steadyMs, 5, LIMIT)).toBe(100_000)
  })

  it('then runs on to where the watch stops itself in four true seconds more, and never past it', () => {
    expect(labMsAt(PLAY.steadyMs + PLAY.runOnMs / 2, 5, LIMIT)).toBe(950_000)
    expect(labMsAt(PLAY.steadyMs + PLAY.runOnMs, 5, LIMIT)).toBe(LIMIT)
    expect(labMsAt(10 * 60_000, 5, LIMIT)).toBe(LIMIT)
    // The ice bath's run would pass the limit at its own speed: it is held to it.
    expect(labMsAt(PLAY.steadyMs, 200, LIMIT)).toBe(LIMIT)
    for (const speed of Object.values(SPEED)) for (let real = 0; real < 30_000; real += 250) expect(labMsAt(real + 250, speed, LIMIT)).toBeGreaterThanOrEqual(labMsAt(real, speed, LIMIT))
  })
})

describe('the time of the change', () => {
  it('is found to the millisecond between two frames', () => {
    for (const end of [1, 2, 500, 999, 1000]) expect(firstChanged((ms) => ms >= end, 0, 1000)).toBe(end)
    expect(firstChanged((ms) => ms >= 124_417, 124_000, 124_900)).toBe(124_417)
  })
})

describe('a run that is played', () => {
  /** A careful run played to the frame that shows its change: how long that took in true milliseconds, with the play as it then stands. It holds on the way that the watch then reads the time of the change itself, which is the time the engine gives a watch stopped at the change. */
  const toChange = (seed: number, runId: RunId): { real: number; play: Play } => {
    const state = poured(seed, runId)
    const { play: p, now } = play(state, runId, 16, (at) => at.shown !== null)
    const end = runView(m, reduce(m, state, { type: 'stopAtEnd', run: runId }), runId).stopped!.tenths
    expect([runId, seed, Math.round(p.labMs / 100)]).toEqual([runId, seed, end])
    return { real: now - p.startedAt, play: p }
  }

  it('plays the five mixtures of part 1 at one speed: at every seed from 1 to 100 the slowest changes within 12 true seconds of its pour and the fastest in two to three', () => {
    expect(MIXTURE_IDS.map((runId) => SPEED[runId])).toEqual(MIXTURE_IDS.map(() => ROOM_SPEED))
    for (let seed = 1; seed <= 100; seed++) {
      const shown = MIXTURE_IDS.map((runId) => toChange(seed, runId))
      const reals = shown.map((one) => one.real)
      expect([seed, Math.max(...reals) <= 12_000, Math.min(...reals) >= 2000 - 100 && Math.min(...reals) <= 3000]).toEqual([seed, true, true])
      // What a run takes on the screen is what it takes on the watch over that one speed, to within a frame: a time twice as long on the watch is twice as long to wait for.
      for (const { real, play: p } of shown) expect([seed, Math.abs(real - p.labMs / ROOM_SPEED) <= 16]).toEqual([seed, true])
    }
  })

  it('so shows the mixture with twice the acid, whose time is a quarter, in a quarter of the true time of the first', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const ratio = toChange(seed, 'mixture-1').real / toChange(seed, 'mixture-4').real
      expect([seed, ratio > 3.8 && ratio < 4.2]).toEqual([seed, true])
    }
  })

  it.each(BATH_IDS.map(bathRunId))('plays a bath at a speed of its own: the change of %s shows between 5 and 12 true seconds after the pour, at every seed from 1 to 100', (runId) => {
    for (let seed = 1; seed <= 100; seed++) {
      const { real } = toChange(seed, runId)
      expect([seed, real >= 5000 && real <= 12_000]).toEqual([seed, true])
    }
  })

  it('takes a press for the pour come twice for the first half second after it, which is before any careful run has changed, and for no press from then', () => {
    const p = startPlay(1000)
    expect([0, 1, 250, 499].map((ms) => tooSoon(p, 1000 + ms))).toEqual([true, true, true, true])
    expect([500, 501, 2000, 60_000].map((ms) => tooSoon(p, 1000 + ms))).toEqual([false, false, false, false])
    // No run is near its change by then: the tests above hold the fastest of part 1 to 1.9 true seconds or more and every bath to 5.
    expect(PLAY.deafMs).toBeLessThan(1900 / 3)
  })

  it('shows the change of a run mixed before its flasks had stood while the run is still played at its own speed', () => {
    for (const runId of ['bath-ice', 'bath-cool', 'bath-warm'] as const)
      for (let seed = 1; seed <= 100; seed++) {
        const { play: p, now } = play(poured(seed, runId, { stand: false }), runId, 16, (at) => at.shown !== null)
        expect([runId, seed, now - p.startedAt < PLAY.steadyMs]).toEqual([runId, seed, true])
      }
  })

  it('adds true time, and no more, from the frame that shows the change: a hand 400 ms late is recorded 400 ms late', () => {
    for (const runId of ['mixture-1', 'mixture-4', 'bath-ice'] as const) {
      const state = poured(7, runId)
      const { play: shown, now } = play(state, runId, 16, (at) => at.shown !== null)
      const late = frame(shown, now + 400, SPEED[runId], LIMIT, (ms) => lookAt(m, state, runId, ms) === 'after')
      expect(late.labMs).toBe(shown.labMs + 400)
      const stop = handStop(late, now + 400, LIMIT)
      expect(stop).toEqual({ elapsedMs: shown.labMs + 400, delayMs: 400 })
      const action = { type: 'stop', run: runId, ...stop } as const
      expect(can(m, state, action)).toBeNull()
      const view = runView(m, reduce(m, state, action), runId)
      expect(view.outcome).toEqual({ state: 'counts' })
      // What the stopped watch reads is what the running one read when it was stopped.
      expect(view.stopped).toEqual({ tenths: Math.round(late.labMs / 100), by: 'hand' })
    }
  })

  it('hands in no delay for a watch stopped before the change, and the engine then says it was stopped early', () => {
    const state = poured(3, 'mixture-2')
    const { play: early, now } = play(state, 'mixture-2', 16, (_, at) => at >= 3000)
    const stop = handStop(early, now, LIMIT)
    expect(early.shown).toBeNull()
    expect(stop.delayMs).toBe(0)
    expect(runView(m, reduce(m, state, { type: 'stop', run: 'mixture-2', ...stop }), 'mixture-2').outcome).toEqual({ state: 'does-not-count', reasons: ['stopped-early'] })
  })

  it('whatever the frames, never goes back, and comes to the same time of the change', () => {
    const state = poured(11, 'bath-cool')
    const times = [5, 16, 33, 100, 700].map((stepMs) => play(state, 'bath-cool', stepMs, (at) => at.shown !== null).play.shown!.labMs)
    expect(new Set(times).size).toBe(1)
    let p = startPlay(0)
    for (const now of [50, 40, 60, 60, 9000, 8000, 9500, 30_000]) {
      const next = frame(p, now, SPEED['bath-cool'], LIMIT, (ms) => lookAt(m, state, 'bath-cool', ms) === 'after')
      expect(next.labMs).toBeGreaterThanOrEqual(p.labMs)
      p = next
    }
  })

  it('with nothing in the flask to show the change, runs to where the watch stops itself in 24 true seconds, and is then ended', () => {
    const state = poured(5, 'mixture-4', { indicator: false })
    const { play: p, now } = play(state, 'mixture-4', 16, (at) => endsItself(at, LIMIT, false) !== null)
    expect(p.shown).toBeNull()
    expect(p.labMs).toBe(LIMIT)
    expect(now - p.startedAt).toBeGreaterThanOrEqual(PLAY.steadyMs + PLAY.runOnMs)
    expect(now - p.startedAt).toBeLessThan(PLAY.steadyMs + PLAY.runOnMs + 16)
    expect(endsItself(p, LIMIT, false)).toBe('limit')
    expect(endsItself(p, LIMIT, true)).toBe('limit')
    const action = { type: 'stop', run: 'mixture-4', ...handStop(p, now, LIMIT) } as const
    expect(can(m, state, action)).toBeNull()
    expect(runView(m, reduce(m, state, action), 'mixture-4').outcome).toEqual({ state: 'does-not-count', reasons: ['no-indicator'] })
  })

  it('is ended at the change, and not before, where the learner asked for the watch to be stopped at it', () => {
    const state = poured(9, 'mixture-3')
    const before = play(state, 'mixture-3', 16, (_, at) => at >= 2000).play
    expect(endsItself(before, LIMIT, true)).toBeNull()
    const { play: shown } = play(state, 'mixture-3', 16, (at) => at.shown !== null)
    expect(endsItself(shown, LIMIT, true)).toBe('change')
    expect(endsItself(shown, LIMIT, false)).toBeNull()
  })

  it('holds a delay to what the engine takes, however long the liquid is left', () => {
    const state = poured(2, 'mixture-1')
    const { play: shown, now } = play(state, 'mixture-1', 16, (at) => at.shown !== null)
    const days = now + 3 * 24 * 3600 * 1000
    const left = frame(shown, days, SPEED['mixture-1'], LIMIT, () => true)
    expect(left.labMs).toBe(LIMIT)
    expect(endsItself(left, LIMIT, false)).toBe('limit')
    expect(can(m, state, { type: 'stop', run: 'mixture-1', ...handStop(left, days, LIMIT) })).toBeNull()
  })
})
