import { describe, expect, it } from 'vitest'
import { CLOSED, openStream, POUR_ADDITIONS, STREAM_INTERVAL_MS, streamTick, type Stream } from './stream'

/** Ticks the timer `ticks` times: which ticks delivered an addition, and the stream after each. */
function run(stream: Stream, ticks: number, canDeliver: (tick: number) => boolean = () => true) {
  const delivered: boolean[] = []
  const after: Stream[] = []
  for (let tick = 0; tick < ticks; tick++) {
    const { deliver, next } = streamTick(stream, canDeliver(tick))
    delivered.push(deliver)
    after.push(next)
    stream = next
  }
  return { delivered, after, count: delivered.filter(Boolean).length }
}

describe('one tick of the stream', () => {
  it('delivers nothing while the stopcock is closed', () => {
    expect(streamTick(CLOSED, true)).toEqual({ deliver: false, next: CLOSED })
  })

  it('delivers an addition a tick for as long as an open stream is left open', () => {
    const { delivered, after } = run(openStream(null), 5)
    expect(delivered).toEqual([true, true, true, true, true])
    expect(after[4]).toEqual({ open: true, pour: null, remaining: null })
  })

  it('remembers which pour was asked for while it runs', () => {
    expect(streamTick(openStream(4), true)).toEqual({ deliver: true, next: { open: true, pour: 4, remaining: 3 } })
  })

  it('runs in a pour of 4 as four additions and closes with the fourth', () => {
    const { delivered, after } = run(openStream(4), 6)
    expect(delivered).toEqual([true, true, true, true, false, false])
    expect(after[2]).toEqual({ open: true, pour: 4, remaining: 1 })
    expect(after[3]).toEqual(CLOSED)
    expect(after[5]).toEqual(CLOSED)
  })

  it('runs in a pour of 20 as twenty additions, then no more', () => {
    const { delivered, after, count } = run(openStream(20), 21)
    expect(count).toBe(20)
    expect(delivered[20]).toBe(false)
    expect(after[19]).toEqual(CLOSED)
  })

  it('closes, delivering nothing, when the engine can take no more', () => {
    const { delivered, after } = run(openStream(null), 4, (tick) => tick < 2)
    expect(delivered).toEqual([true, true, false, false])
    expect(after[2]).toEqual(CLOSED)
  })

  it('closes a pour at once when the engine can take nothing', () => {
    const { count, after } = run(openStream(20), 3, () => false)
    expect(count).toBe(0)
    expect(after[0]).toEqual(CLOSED)
  })
})

describe('the stream as the bench offers it', () => {
  it('has two measured pours, of 4 and of 20 additions', () => {
    expect(POUR_ADDITIONS).toEqual([4, 20])
    for (const pour of POUR_ADDITIONS) expect(run(openStream(pour), pour + 1).count).toBe(pour)
  })

  it('ticks every 400 ms', () => {
    expect(STREAM_INTERVAL_MS).toBe(400)
  })
})
