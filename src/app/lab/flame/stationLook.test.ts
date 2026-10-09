import { describe, expect, it } from 'vitest'
import { flameData as data } from '@/chem-data/flame/data'
import { HANDLING, closingView, createLab, stationView, type Action, type FlameState } from '@/engine/flame'
import { run, stationScript } from '@/engine/flame/testkit'
import { closingProgressOf, openingEntry, progressOf, type Progress } from './stationLook'

const ids = data.salts.map((s) => s.id)
const [BA, CA] = ids as [string, string]
const fresh = () => createLab(data, 'challenge')
const progress = (state: FlameState) => ids.map((id) => progressOf(stationView(data, state, id)))
const done = (state: FlameState, ...stationIds: string[]) => stationIds.reduce((s, id) => run(data, s, stationScript(data, id)), state)

describe("a station's progress", () => {
  it('is not started until the loop has been held in the flame there, whatever was cleaned or dipped', () => {
    expect(progress(fresh())).toEqual(Array(6).fill('not-started'))
    const dipped = run(data, fresh(), [{ type: 'cleanLoop' }, { type: 'dipLoop', stationId: BA }])
    expect(progress(dipped)[0]).toBe('not-started')
    expect(progress(run(data, dipped, [{ type: 'holdInFlame', stationId: BA }]))).toEqual(['started', ...Array(5).fill('not-started')])
  })

  it('says of an observation that does not make the station done which of the two it is', () => {
    const careless = run(data, fresh(), stationScript(data, BA, [HANDLING]))
    expect(progress(careless)[0]).toBe('not-counted')
    const wrong: Action = { type: 'recordObservation', stationId: CA, observation: { colour: 'red', range: '400-475', kind: 'line' } }
    expect(progress(run(data, careless, [...stationScript(data, CA).slice(0, -1), wrong]))[1]).toBe('not-correct')
    expect(progress(done(fresh(), BA))[0]).toBe('done')
    // Done again with a clean loop, a station that did not count is done.
    expect(progress(done(careless, BA))[0]).toBe('done')
  })
})

describe('the closing question, in the list', () => {
  it('waits for the six stations, is then open, and says whether its answer is right', () => {
    const all = done(fresh(), ...ids)
    const answered = (choice: string) => closingProgressOf(closingView(data, run(data, all, [{ type: 'answerClosing', choice }])))
    expect(closingProgressOf(closingView(data, done(fresh(), BA, CA)))).toBe('waits')
    expect(closingProgressOf(closingView(data, all))).toBe('open')
    expect(data.closing.choices.map(answered)).toEqual(data.closing.choices.map((choice) => (choice === data.closing.answer.value ? 'done' : 'not-correct')))
  })
})

describe('the entry the Lab tab opens on', () => {
  it('is the first station begun and not done; where none is, the first not done; and the closing question once all six are done', () => {
    const of = (...list: Progress[]) => openingEntry(list)
    expect(of('not-started', 'not-started')).toBe(0)
    expect(of('done', 'not-started', 'started')).toBe(2)
    expect(of('done', 'not-counted', 'started')).toBe(1)
    expect(of('done', 'not-correct')).toBe(1)
    expect(of('done', 'done', 'not-started')).toBe(2)
    expect(of('done', 'done')).toBe(2)
    expect(openingEntry(progress(done(fresh(), ...ids)))).toBe(6)
    expect(openingEntry(progress(run(data, done(fresh(), BA), stationScript(data, CA).slice(0, 3))))).toBe(1)
  })
})

describe("the lab's own files", () => {
  it('take nothing from another lab: what the labs share is beside the shell, so that this page loads no engine but its own', () => {
    const files = import.meta.glob<string>('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
    const own = Object.entries(files).filter(([path]) => !path.endsWith('.test.ts'))
    expect(own.length).toBeGreaterThanOrEqual(10)
    for (const [path, source] of own) expect(source, path).not.toMatch(/from '@\/(app\/lab|engine|chem-data)\/(aqueous|titration)\b/)
  })
})
