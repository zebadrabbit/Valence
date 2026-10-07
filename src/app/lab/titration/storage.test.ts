// The titration lab's stored entry, through the real store: what Home reads of it, what a reload gives back, what
// happens to a record that does not fit, and what Settings' export and clearing do with it.
import { describe, expect, it } from 'vitest'
import { ACTIVITIES, activityStatus } from '@/app/activities'
import { clearAll, createMemoryStore, ENTRY, exportAll, loadEntry, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { titrationData } from '@/chem-data/titration/data'
import { createLab, currentTrial, modelFrom, titrationStateSchema, type Action, type TitrationState } from '@/engine/titration'
import { learner } from '@/engine/titration/testkit'

const [titration] = ACTIVITIES
const m = modelFrom(titrationData)
const { run, readyTrial, prepared, carefulTrial } = learner()

const save = (store: KeyValueStore, state: TitrationState) => saveEntry(store, ENTRY.titration, titration.version, state)
const load = (store: KeyValueStore) => loadEntry(store, ENTRY.titration, titration.version, titrationStateSchema)
/** The lab's status as Home shows it. */
const home = (store: KeyValueStore) => activityStatus(store, titration)

describe("the titration lab's stored entry", () => {
  it('is the entry Home lists first', () => {
    expect(titration.entry).toBe(ENTRY.titration)
  })

  it('Home says not started before any save, and in progress after the first', () => {
    const store = createMemoryStore()
    const lab = createLab(1, 'guided')
    expect(home(store)).toBe('not-started')
    expect(save(store, lab)).toBe(true)
    expect(home(store)).toBe('in-progress')
    expect(load(store)).toEqual(lab)
  })

  it('a lab of seed 1 saved mid-trial after 73 stream additions loads with 18 250 uL delivered, and carried on reaches the same final state as one never saved', () => {
    const midTrial = run(m, prepared(m, 1), Array<Action>(73).fill({ type: 'deliver', amount: 'stream' }))
    const store = createMemoryStore()
    save(store, midTrial)
    const loaded = load(store)!
    expect(loaded).not.toBe(midTrial)
    expect(currentTrial(loaded).deliveredUl).toBe(18250)
    // The scripted learner chooses each action from the state alone, so both are carried on with the same actions.
    const neverSaved = carefulTrial(m, midTrial)
    expect(currentTrial(neverSaved).end).toBe('graded')
    expect(carefulTrial(m, loaded)).toEqual(neverSaved)
  })

  it('a completed lab reads completed', () => {
    let lab = carefulTrial(m, prepared(m, 1))
    for (let trial = 2; trial <= 3; trial++) lab = carefulTrial(m, readyTrial(m, run(m, lab, [{ type: 'startNextTrial' }])))
    expect(lab.status).toBe('completed')
    const store = createMemoryStore()
    save(store, lab)
    expect(home(store)).toBe('completed')
    expect(load(store)).toEqual(lab)
  })

  const lab = createLab(1, 'guided')
  it.each([
    ['with a seed of -1', { version: titration.version, data: { ...lab, seed: -1 } }],
    ['with an extra key', { version: titration.version, data: { ...lab, naohE5: 9502 } }],
    ['of another version', { version: titration.version + 1, data: lab }],
  ])('a record %s loads as null and is moved to the backup key, and Home says not started', (_name, record) => {
    const store = createMemoryStore()
    const raw = JSON.stringify(record)
    store.setItem('valence:lab:titration', raw)
    expect(load(store)).toBeNull()
    expect(store.getItem('valence:lab:titration')).toBeNull()
    expect(store.getItem('valence:backup:lab:titration')).toBe(raw)
    expect(home(store)).toBe('not-started')
  })

  it('Home reads the version and the status only, so until the lab page has loaded it a record of this version that the lab will refuse still reads as the status it claims (accepted at Gate A, N10; spec 10)', () => {
    // Home cannot hold a record to the lab's own shape without loading the lab, which the rule on lazy loading forbids.
    const refused = { ...lab, seed: -1 }
    for (const [claimed, shown] of [
      ['in-progress', 'in-progress'],
      ['completed', 'completed'],
    ] as const) {
      const store = createMemoryStore()
      store.setItem('valence:lab:titration', JSON.stringify({ version: titration.version, data: { ...refused, status: claimed } }))
      expect(home(store)).toBe(shown)
      // Opening the lab page loads the entry, which sets it aside; Home is right from then on.
      expect(load(store)).toBeNull()
      expect(home(store)).toBe('not-started')
    }
    // A record of another version is known to Home for what it is without the lab.
    const other = createMemoryStore()
    other.setItem('valence:lab:titration', JSON.stringify({ version: titration.version + 1, data: lab }))
    expect(home(other)).toBe('not-started')
  })

  it('the export holds the entry with its version and seed, and after clearing Home says not started', () => {
    const store = createMemoryStore()
    save(store, createLab(7, 'challenge'))
    expect(JSON.parse(exportAll(store))).toMatchObject({ 'valence:lab:titration': { version: titration.version, data: { seed: 7 } } })
    clearAll(store)
    expect(store.length).toBe(0)
    expect(home(store)).toBe('not-started')
  })
})
