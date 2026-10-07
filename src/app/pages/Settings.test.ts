import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFS } from '@/app/preferences'
import { createMemoryStore, NOT_SAVING_TEXT } from '@/app/progress/storage'
import { Settings } from './Settings'

// AppStateProvider builds its store from the browser, so the page is given its state directly.
const app = vi.hoisted(() => ({ persistent: true }))
vi.mock('@/app/AppState', () => ({
  useAppState: () => ({ store: createMemoryStore(), persistent: app.persistent, prefs: DEFAULT_PREFS, updatePrefs() {}, resetAll() {} }),
}))

const page = (persistent: boolean) => {
  app.persistent = persistent
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Settings)))
}

describe('Settings, the not-saving notice', () => {
  it('shows the one sentence in a status paragraph while progress lasts only for the session, and nothing otherwise', () => {
    expect(page(false).match(/<p role="status"[^>]*>([^<]*)<\/p>/)?.[1]).toBe(NOT_SAVING_TEXT)
    expect(page(true)).not.toContain('role="status"')
    expect(page(true)).not.toContain(NOT_SAVING_TEXT)
  })
})
