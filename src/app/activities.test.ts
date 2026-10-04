import { describe, expect, it } from 'vitest'
import { ACTIVITIES, activityStatus } from './activities'
import { createMemoryStore, saveEntry } from './progress/storage'

describe('activityStatus', () => {
  it.each(ACTIVITIES.map((activity) => [activity.title, activity] as const))('reads "%s" with the version that activity loads and saves with', (_title, activity) => {
    const store = createMemoryStore()
    expect(activityStatus(store, activity)).toBe('not-started')
    saveEntry(store, activity.entry, activity.version, { status: 'in-progress' })
    expect(activityStatus(store, activity)).toBe('in-progress')
    saveEntry(store, activity.entry, activity.version, { status: 'completed' })
    expect(activityStatus(store, activity)).toBe('completed')
    // An entry of any other version is one the activity would set aside on loading: Home must not call it completed.
    for (const other of [activity.version + 1, activity.version - 1, 99]) {
      saveEntry(store, activity.entry, other, { status: 'completed' })
      expect([other, activityStatus(store, activity)]).toEqual([other, 'not-started'])
    }
  })

  it('reads each activity from its own entry', () => {
    expect(new Set(ACTIVITIES.map((activity) => activity.entry)).size).toBe(ACTIVITIES.length)
    const store = createMemoryStore()
    const [first, ...rest] = ACTIVITIES
    saveEntry(store, first.entry, first.version, { status: 'completed' })
    expect(activityStatus(store, first)).toBe('completed')
    for (const other of rest) expect([other.title, activityStatus(store, other)]).toEqual([other.title, 'not-started'])
  })
})
