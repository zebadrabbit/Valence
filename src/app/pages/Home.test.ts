import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryStore, NOT_SAVING_TEXT } from '@/app/progress/storage'
import { Home } from './Home'

// AppStateProvider builds its store from the browser, so the page is given its state directly.
const app = vi.hoisted(() => ({ persistent: true }))
vi.mock('@/app/AppState', () => ({
  useAppState: () => ({ store: createMemoryStore(), persistent: app.persistent }),
}))

const page = (persistent: boolean) => {
  app.persistent = persistent
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Home)))
}

describe('Home, on whether progress is saved', () => {
  it('says that progress is saved in this browser only while it is, and otherwise shows the not-saving notice in its place', () => {
    expect(page(true)).toContain('No account is needed; your progress is saved in this browser. Search')
    expect(page(true)).not.toContain('role="status"')
    expect(page(false)).toContain('No account is needed. Search')
    expect(page(false)).not.toContain('saved in this browser')
    expect(page(false).match(/<p role="status"[^>]*>([^<]*)<\/p>/)?.[1]).toBe(NOT_SAVING_TEXT)
  })
})
