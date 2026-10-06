import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { Lab } from '@/app/pages/Lab'
import { createMemoryStore, loadEntry, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { createLab, titrationStateSchema, type TitrationState } from '@/engine/titration'
import { TitrationPage } from './TitrationPage'

// The list of labs and the lab page as markup, on a store the test holds. AppStateProvider builds its store from
// the browser and the media hook has no value on a server, so both are given directly. Start, Restart, the mode
// and the reload are checked in a browser.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [titration, aqueous] = ACTIVITIES
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const save = (state: TitrationState) => saveEntry(app.store, titration.entry, titration.version, state)
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** The mode whose radio button is checked. */
const checkedMode = (html: string) => [...html.matchAll(/<input[^>]*>/g)].filter((match) => match[0].includes('checked=""')).map((match) => match[0].match(/value="([^"]*)"/)?.[1])
const PRIMER = (open: boolean) => new RegExp(`<details${open ? ' open=""' : ''}><summary[^>]*>${SHELL_TEXT.primer}</summary>`)

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

describe('the list of labs', () => {
  const items = () => [...draw(createElement(Lab)).matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((match) => match[1]!)
  const text = (html: string) => html.replace(/<[^>]+>/g, '|')

  it('links the titration lab, with its status as Home gives it', () => {
    const [first, ...rest] = items()
    expect(rest).toHaveLength(1)
    expect([...first!.matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/titration', titration.title]])
    expect(text(first!)).toContain('|Not started|')
    save(createLab(1, 'guided'))
    expect(text(items()[0]!)).toContain('|In progress|')
    save({ ...createLab(1, 'guided'), status: 'completed' })
    expect(text(items()[0]!)).toContain('|Completed|')
  })

  it('shows the lab that has no page yet as text, with the planned sentence and no status', () => {
    saveEntry(app.store, aqueous.entry, aqueous.version, { status: 'completed' })
    const [, second] = items()
    expect(second).not.toContain('<a ')
    expect(text(second!)).toContain(`|${aqueous.title}|`)
    expect(text(second!)).toContain(`|${SHELL_TEXT.planned}|`)
    expect(second).not.toContain('Completed')
  })

  it('lists the labs only, under the heading Lab, and saves nothing', () => {
    const html = draw(createElement(Lab))
    expect(html).toMatch(/<h1[^>]*>Lab<\/h1>/)
    expect(count(html, /href="\/lab\/titration"/g)).toBe(1)
    expect(html).not.toContain('/learn')
    expect(app.store.length).toBe(0)
  })
})

describe('the titration page', () => {
  const page = () => draw(createElement(TitrationPage))

  it('with nothing stored shows Start, the mode choice on Guided and the primer open, and stores nothing', () => {
    const html = page()
    expect(html).toMatch(new RegExp(`<h1[^>]*>${titration.title}</h1>`))
    expect(html).toContain(`>${SHELL_TEXT.start}</button>`)
    expect(html).not.toContain(SHELL_TEXT.restart)
    expect(html).toMatch(PRIMER(true))
    expect(checkedMode(html)).toEqual(['guided'])
    expect(html).not.toContain('<aside')
    expect(app.store.length).toBe(0)
  })

  it('with a saved new lab shows Restart and no Start, the primer closed, the mode of the run, and leaves the entry as it was', () => {
    const lab = createLab(1384, 'challenge')
    save(lab)
    const stored = app.store.getItem('valence:lab:titration')
    const html = page()
    expect(html).toContain(`>${SHELL_TEXT.restart}</button>`)
    expect(html).not.toContain(SHELL_TEXT.start)
    expect(html).toMatch(PRIMER(false))
    expect(checkedMode(html)).toEqual(['challenge'])
    expect(html).toContain('<aside aria-label="Lab notebook"')
    // A new lab has no trial under way, so the mode can be changed.
    expect(html).not.toContain(SHELL_TEXT.modeLocked)
    expect(html).not.toMatch(/<input[^>]*disabled/)
    expect(app.store.getItem('valence:lab:titration')).toBe(stored)
    expect(loadEntry(app.store, titration.entry, titration.version, titrationStateSchema)).toEqual(lab)
  })

  it('locks the mode while a trial is under way, with the reason', () => {
    const lab = createLab(1, 'guided')
    save({ ...lab, trials: [{ ...lab.trials[0]!, aliquot: 'clean' }] })
    const html = page()
    expect(count(html, /<input[^>]*disabled=""/g)).toBe(2)
    expect(html).toContain(SHELL_TEXT.modeLocked)
  })

  it("has the primer's twelve cards and, at its foot, the sources of the lab's model", () => {
    const html = page()
    expect(count(html, /<h2/g)).toBe(12)
    expect(html).toContain('Sources for this lab&#x27;s model</summary>')
  })

  it('does not print the seed, which the notebook shows', () => {
    save(createLab(1384, 'guided'))
    expect(page().replace(/<a [^>]*>.*?<\/a>/gs, '')).not.toContain('1384')
  })

  it('in a narrow window shows the notice and the primer, and nothing to press', () => {
    app.wide = false
    const html = page()
    expect(html).toContain(NARROW_NOTICE.title)
    expect(html).toContain(NARROW_NOTICE.withoutRun)
    expect(html).toMatch(PRIMER(true))
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<input')
    save(createLab(1, 'guided'))
    expect(page()).toContain(NARROW_NOTICE.withRun)
  })

  it('says so while the browser is not keeping progress', () => {
    expect(page()).not.toContain('role="status"')
    app.persistent = false
    expect(count(page(), /<p role="status"/g)).toBe(1)
  })
})
