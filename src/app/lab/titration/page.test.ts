import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { Field } from '@/app/lab/Field'
import { ROLE } from '@/app/lab/roles'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { Home } from '@/app/pages/Home'
import { Lab } from '@/app/pages/Lab'
import { createMemoryStore, loadEntry, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { titrationData } from '@/chem-data/titration/data'
import { TITRATION_PRIMER } from '@/chem-data/titration/primer'
import { can, checklist, countingTrials, createLab, currentTrial, modelFrom, titrationStateSchema, trialOutcome, type Action, type TitrationState } from '@/engine/titration'
import { honestReading, learner } from '@/engine/titration/testkit'
import { Guide } from './Guide'
import { BLOCKED_TEXT, CAUSE_TEXT, completedText, GUIDE_TRIAL_OVER, INVALID_ENTRY_TEXT, NOTEBOOK_TEXT, outcomeRole, OUTCOME_TEXT, SUMMARY, WARNING_TEXT, workedLines } from './messages'
import { NotebookPanel, TrialRecord } from './Notebook'
import { TitrationPage } from './TitrationPage'
import labCss from '../lab.css?raw'

// The list of labs and the lab page as markup, on a store the test holds. AppStateProvider builds its store from
// the browser and the media hook has no value on a server, so both are given directly. Start, Restart, the mode
// and the reload are checked in a browser.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, wide: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: false }) }))
vi.mock('@/app/useMediaQuery', () => ({ useMediaQuery: () => app.wide }))

const [titration, aqueous, flame, calorimetry, cations, lechatelier, clock, acetone, cabbage, density, freezing, reactions, mixing, mechanism] = ACTIVITIES
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const save = (state: TitrationState) => saveEntry(app.store, titration.entry, titration.version, state)
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** The mode whose radio button is checked. */
const checkedMode = (html: string) => [...html.matchAll(/<input[^>]*>/g)].filter((match) => match[0].includes('checked=""')).map((match) => match[0].match(/value="([^"]*)"/)?.[1])
/** The name of the tab that is selected. */
const selectedTab = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].filter((match) => match[0].includes('aria-selected="true"')).map((match) => match[1])
/** The three panels, Primer, Lab and Record: whether each is shown, and what it holds. */
const panels = (html: string) =>
  html
    .split(/(?=<div[^>]*role="tabpanel")/)
    .slice(1)
    .map((panel) => ({ shown: !panel.slice(0, panel.indexOf('>')).includes('hidden=""'), body: panel.slice(panel.indexOf('>') + 1) }))
/** Every button that is not a tab, by its text. */
const pressed = (html: string) => [...html.matchAll(/<button(?![^>]*role="tab")[^>]*>(.*?)<\/button>/gs)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.wide = true
})

// States built with the test kit. The notebook, the record and the guide take everything as props and need no mock.
const m = modelFrom(titrationData)
const { run, readyTrial, prepared, titrateCarefully, carefulTrial, finishHonestly } = learner()
const NEXT: Action = { type: 'startNextTrial' }
const STREAM: Action = { type: 'deliver', amount: 'stream' }
/** What a reader meets: the tags gone, each run of them a single bar. */
const read = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\s*\|[\s|]*/g, '|')
/** A signed figure to two decimals with its percent sign, as messages.test.ts has it. */
const PERCENT_ERROR = /[+−]\d+\.\d\d%/
const TRUE_NAOH = '0.09502'

// Seed 1, Challenge. Trial 1: the burette not conditioned, the bubble cleared, the pipette rinsed, honest readings.
const afterOne = carefulTrial(m, prepared(m, 1, { condition: false }))
// Trial 2: refilled, its initial reading recorded, and streamed to overshoot.
let overshot = readyTrial(m, run(m, afterOne, [NEXT]))
while (currentTrial(overshot).end === 'open') overshot = run(m, overshot, [STREAM])
// Trial 3: after conditioning, filling and clearing the new bubble, with its initial reading recorded.
let third = run(m, overshot, [NEXT, { type: 'conditionBurette' }, { type: 'fillBurette' }, { type: 'clearTipBubble' }])
third = run(m, third, [{ type: 'recordInitialReading', readingUl: honestReading(third.burette.levelUl) }])
/** The pass that does not count: the final reading typed 28.29, 27 µL from the meniscus. */
const misreadPass = (() => {
  let s = run(m, titrateCarefully(m, prepared(m, 1)).state, [{ type: 'recordFinalReading', readingUl: 28290 }])
  s = run(m, s, [{ type: 'submitMolarity', molarityE6: 94800 }])
  return s
})()
/** Three careful trials: the lab is complete (0.0949, 0.0948, 0.0949). */
const completed = (() => {
  let s = carefulTrial(m, prepared(m, 1))
  for (let i = 0; i < 2; i++) s = carefulTrial(m, readyTrial(m, run(m, s, [NEXT])))
  return s
})()
const summarised = run(m, completed, [{ type: 'recordSummary', meanE6: 94900, deviationE2: 47 }])

describe('the list of labs', () => {
  const items = () => [...draw(createElement(Lab)).matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((match) => match[1]!)
  const text = (html: string) => html.replace(/<[^>]+>/g, '|')

  it('links the titration lab, with its status as Home gives it', () => {
    const [first, ...rest] = items()
    expect(rest).toHaveLength(12)
    expect([...first!.matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/titration', titration.title]])
    expect(text(first!)).toContain('|Not started|')
    save(createLab(1, 'guided'))
    expect(text(items()[0]!)).toContain('|In progress|')
    save({ ...createLab(1, 'guided'), status: 'completed' })
    expect(text(items()[0]!)).toContain('|Completed|')
  })

  it('links the aqueous reactions lab the same way, with its own status, and no lab is shown as planned', () => {
    const second = () => items()[1]!
    expect([...second().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/aqueous', aqueous.title]])
    expect(text(second())).toContain('|Not started|')
    saveEntry(app.store, aqueous.entry, aqueous.version, { status: 'completed' })
    expect(text(second())).toContain('|Completed|')
    expect(text(items()[0]!)).toContain('|Not started|')
    expect(items().join('')).not.toContain(SHELL_TEXT.planned)
  })

  it('links the flame test lab the same way, third, with its own status', () => {
    const third = () => items()[2]!
    expect([...third().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/flame', flame.title]])
    expect(flame.title).toBe('Flame tests')
    expect(text(third())).toContain('|Not started|')
    saveEntry(app.store, flame.entry, flame.version, { status: 'in-progress' })
    expect(text(third())).toContain('|In progress|')
    expect(text(items()[1]!)).toContain('|Not started|')
  })

  it('links the calorimetry lab the same way, fourth, with its own status', () => {
    const fourth = () => items()[3]!
    expect([...fourth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/calorimetry', calorimetry.title]])
    expect(calorimetry.title).toBe('Calorimetry')
    expect(text(fourth())).toContain('|Not started|')
    saveEntry(app.store, calorimetry.entry, calorimetry.version, { status: 'completed' })
    expect(text(fourth())).toContain('|Completed|')
    expect(text(items()[2]!)).toContain('|Not started|')
  })

  it('links the Group I cations lab the same way, fifth, with its own status', () => {
    const fifth = () => items()[4]!
    expect([...fifth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/cations', cations.title]])
    expect(cations.title).toBe('Group I cations')
    expect(text(fifth())).toContain('|Not started|')
    saveEntry(app.store, cations.entry, cations.version, { status: 'completed' })
    expect(text(fifth())).toContain('|Completed|')
    expect(text(items()[3]!)).toContain('|Not started|')
  })

  it("links the Le Chatelier's principle lab the same way, sixth, with its own status", () => {
    const sixth = () => items()[5]!
    expect([...sixth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/le-chatelier', lechatelier.title.replaceAll("'", '&#x27;')]])
    expect(lechatelier.title).toBe("Le Chatelier's principle")
    expect(text(sixth())).toContain('|Not started|')
    saveEntry(app.store, lechatelier.entry, lechatelier.version, { status: 'in-progress' })
    expect(text(sixth())).toContain('|In progress|')
    expect(text(items()[4]!)).toContain('|Not started|')
  })

  it('links the clock reaction lab the same way, seventh, with its own status', () => {
    const seventh = () => items()[6]!
    expect([...seventh().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/clock-reaction', clock.title]])
    expect(clock.title).toBe('Clock reaction')
    expect(text(seventh())).toContain('|Not started|')
    saveEntry(app.store, clock.entry, clock.version, { status: 'in-progress' })
    expect(text(seventh())).toContain('|In progress|')
    expect(text(items()[5]!)).toContain('|Not started|')
  })

  it('links the iodination of acetone lab the same way, eighth, with its own status', () => {
    const eighth = () => items()[7]!
    expect([...eighth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/iodination-of-acetone', acetone.title]])
    expect(acetone.title).toBe('Iodination of acetone')
    expect(text(eighth())).toContain('|Not started|')
    saveEntry(app.store, acetone.entry, acetone.version, { status: 'in-progress' })
    expect(text(eighth())).toContain('|In progress|')
    expect(text(items()[6]!)).toContain('|Not started|')
    expect(items()).toHaveLength(13)
  })

  it('links the red cabbage pH lab the same way, ninth, with its own status', () => {
    const ninth = () => items()[8]!
    expect([...ninth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/red-cabbage-ph', cabbage.title]])
    expect(cabbage.title).toBe('Red cabbage pH')
    expect(text(ninth())).toContain('|Not started|')
    saveEntry(app.store, cabbage.entry, cabbage.version, { status: 'in-progress' })
    expect(text(ninth())).toContain('|In progress|')
    expect(text(items()[7]!)).toContain('|Not started|')
    expect(items()).toHaveLength(13)
  })

  it('links the measurement and density lab the same way, tenth, with its own status', () => {
    const tenth = () => items()[9]!
    expect([...tenth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/measurement-and-density', density.title]])
    expect(density.title).toBe('Measurement and density')
    expect(text(tenth())).toContain('|Not started|')
    saveEntry(app.store, density.entry, density.version, { status: 'in-progress' })
    expect(text(tenth())).toContain('|In progress|')
    expect(text(items()[8]!)).toContain('|Not started|')
    expect(items()).toHaveLength(13)
  })

  it('links the freezing point depression lab the same way, eleventh, with its own status', () => {
    const eleventh = () => items()[10]!
    expect([...eleventh().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/freezing-point-depression', freezing.title]])
    expect(freezing.title).toBe('Freezing point depression')
    expect(text(eleventh())).toContain('|Not started|')
    saveEntry(app.store, freezing.entry, freezing.version, { status: 'in-progress' })
    expect(text(eleventh())).toContain('|In progress|')
    expect(text(items()[9]!)).toContain('|Not started|')
    expect(items()).toHaveLength(13)
  })

  it('links the types of reactions lab the same way, twelfth, with its own status', () => {
    const twelfth = () => items()[11]!
    expect([...twelfth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/types-of-reactions', reactions.title]])
    expect(reactions.title).toBe('Types of reactions')
    expect(text(twelfth())).toContain('|Not started|')
    saveEntry(app.store, reactions.entry, reactions.version, { status: 'in-progress' })
    expect(text(twelfth())).toContain('|In progress|')
    expect(text(items()[10]!)).toContain('|Not started|')
    expect(items()).toHaveLength(13)
  })

  it('links the polarity and mixing lab the same way, thirteenth, with its own status', () => {
    const thirteenth = () => items()[12]!
    expect([...thirteenth().matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((match) => [match[1], match[2]])).toEqual([['/lab/polarity-and-mixing', mixing.title]])
    expect(mixing.title).toBe('Polarity and mixing')
    expect(text(thirteenth())).toContain('|Not started|')
    saveEntry(app.store, mixing.entry, mixing.version, { status: 'in-progress' })
    expect(text(thirteenth())).toContain('|In progress|')
    expect(text(items()[11]!)).toContain('|Not started|')
    expect(items()).toHaveLength(13)
  })

  it('Home links every activity, the mechanism too, each with its own status, and shows none as planned', () => {
    saveEntry(app.store, mechanism.entry, mechanism.version, { status: 'completed' })
    const home = [...draw(createElement(Home)).matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((match) => match[1]!)
    // A title is in the markup with its apostrophe written as markup writes one.
    const item = (title: string) => home.find((html) => html.includes(title.replaceAll("'", '&#x27;')))!
    for (const [activity, status] of [[titration, 'Not started'], [aqueous, 'Not started'], [flame, 'Not started'], [calorimetry, 'Not started'], [cations, 'Not started'], [lechatelier, 'Not started'], [clock, 'Not started'], [acetone, 'Not started'], [cabbage, 'Not started'], [density, 'Not started'], [freezing, 'Not started'], [reactions, 'Not started'], [mixing, 'Not started'], [mechanism, 'Completed']] as const) {
      expect(item(activity.title)).toMatch(new RegExp(`<a [^>]*href="${activity.to}"`))
      expect(text(item(activity.title))).toContain(`|${status}|`)
      expect(text(item(activity.title))).not.toContain(SHELL_TEXT.planned)
    }
    expect(mechanism.to).toBe('/learn/hcl-nahco3')
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

  // The hook's state does not run in the node environment: a markup render mounts the page and no more. So the
  // mount is held to its one read here, and what Start and an action then write is held on labProgress, the two
  // calls the hook makes of it; that a second render and a change of mode read nothing more is checked in a browser.
  describe('and its stored entry', () => {
    const KEY = 'valence:lab:titration'
    /** The store, with every call made of it in order. */
    function counting() {
      const inner = createMemoryStore()
      const calls: string[] = []
      const store: KeyValueStore = {
        get length() {
          return inner.length
        },
        key: (index) => inner.key(index),
        getItem: (key) => (calls.push(`get ${key}`), inner.getItem(key)),
        setItem: (key, value) => (calls.push(`set ${key}`), inner.setItem(key, value)),
        removeItem: (key) => (calls.push(`remove ${key}`), inner.removeItem(key)),
      }
      return { store, calls }
    }

    it.each([
      ['nothing stored', null, true],
      ['a run stored', third, true],
      ['a run stored, in a narrow window', third, false],
    ] as const)('mounting the page reads the entry exactly once and writes nothing: %s', (_, stored, wide) => {
      const { store, calls } = counting()
      if (stored) saveEntry(store, titration.entry, titration.version, stored)
      calls.length = 0
      app.store = store
      app.wide = wide
      page()
      expect(calls).toEqual([`get ${KEY}`])
    })

    it('the first write comes with Start or an action, each one write and no read', () => {
      const { store, calls } = counting()
      const progress = labProgress(store, titration, titrationStateSchema)
      expect(progress.load()).toBeNull()
      expect(calls).toEqual([`get ${KEY}`])
      const started = createLab(1, 'guided')
      progress.save(started)
      progress.save(run(m, started, [{ type: 'rinsePipette' }]))
      progress.save({ ...started, mode: 'challenge' })
      expect(calls).toEqual([`get ${KEY}`, `set ${KEY}`, `set ${KEY}`, `set ${KEY}`])
    })
  })

  // Before the tabs this case held the primer to being an open disclosure.
  it('with nothing stored opens on the Primer tab, shows Start above the tabs and on the Lab tab, the mode choice on Guided, and stores nothing', () => {
    const html = page()
    expect(html).toMatch(new RegExp(`<h1[^>]*>${titration.title}</h1>`))
    expect(count(html, new RegExp(`>${SHELL_TEXT.start}</button>`, 'g'))).toBe(2)
    expect(html).not.toContain(SHELL_TEXT.restart)
    expect(selectedTab(html)).toEqual(['Primer'])
    const [primer, lab, record] = panels(html)
    expect([primer!.shown, lab!.shown, record!.shown]).toEqual([true, false, false])
    expect(lab!.body).toContain(SHELL_TEXT.notStarted)
    expect(record!.body).toContain(SHELL_TEXT.noRecord)
    expect(checkedMode(html)).toEqual(['guided'])
    expect(html).not.toContain('<aside')
    expect(app.store.length).toBe(0)
  })

  // Before the tabs this case held the primer to being a closed disclosure.
  it('with a saved new lab opens on the Lab tab, shows Restart and no Start, the mode of the run, and leaves the entry as it was', () => {
    const lab = createLab(1384, 'challenge')
    save(lab)
    const stored = app.store.getItem('valence:lab:titration')
    const html = page()
    expect(html).toContain(`>${SHELL_TEXT.restart}</button>`)
    expect(html).not.toContain(SHELL_TEXT.start)
    expect(selectedTab(html)).toEqual(['Lab'])
    expect(panels(html).map((panel) => panel.shown)).toEqual([false, true, false])
    expect(checkedMode(html)).toEqual(['challenge'])
    expect(html).toContain('<aside aria-label="Lab notebook"')
    // A new lab has no trial under way, so the mode can be changed.
    expect(html).not.toContain(SHELL_TEXT.modeLocked)
    expect(html).not.toMatch(/<input type="radio"[^>]*disabled/)
    expect(app.store.getItem('valence:lab:titration')).toBe(stored)
    expect(loadEntry(app.store, titration.entry, titration.version, titrationStateSchema)).toEqual(lab)
  })

  it('locks the mode while a trial is under way, with the reason, which carries the role of a held reason', () => {
    const lab = createLab(1, 'guided')
    save({ ...lab, trials: [{ ...lab.trials[0]!, aliquot: 'clean' }] })
    const html = page()
    expect(count(html, /<input type="radio"[^>]*>/g)).toBe(2)
    expect(count(html, /<input type="radio"[^>]*disabled=""/g)).toBe(2)
    expect(html).toContain(`class="${ROLE.held}">${SHELL_TEXT.modeLocked}</p>`)
  })

  it.each([
    ['no run', null, 'Primer'],
    ['a run in progress', third, 'Lab'],
    ['a completed run', completed, 'Lab'],
    ['a completed run with its summary entered', summarised, 'Lab'],
  ] as const)('opens on the right tab for %s, and keeps the two not shown hidden and inert, out of the tab order', (_, stored, tab) => {
    if (stored) save(stored)
    const before = app.store.getItem('valence:lab:titration')
    const html = page()
    expect(selectedTab(html)).toEqual([tab])
    const tags = html.split(/(?=<div[^>]*role="tabpanel")/).slice(1).map((panel) => panel.slice(0, panel.indexOf('>') + 1))
    expect(tags).toHaveLength(3)
    expect(tags.map((tag) => tag.includes('hidden=""') && tag.includes('inert=""'))).toEqual(['Primer', 'Lab', 'Record'].map((name) => name !== tab))
    expect(tags.map((tag) => tag.includes('hidden=""') || tag.includes('inert=""'))).toEqual(['Primer', 'Lab', 'Record'].map((name) => name !== tab))
    // The tab is state of the open page only: choosing it stores nothing and changes nothing stored.
    expect(app.store.getItem('valence:lab:titration')).toBe(before)
    expect(app.store.length).toBe(stored ? 1 : 0)
  })

  // Before the tabs this case counted the twelve cards' headings in the page.
  it("has on the Primer tab the list of the twelve topics, the first of them as a card, the four to read first marked, and under the card the sources of the lab's model", () => {
    const [primer, lab, record] = panels(page())
    expect(count(primer!.body, /<h2/g)).toBe(1)
    expect(primer!.body).toMatch(new RegExp(`<h2[^>]*>${TITRATION_PRIMER[0]!.heading}</h2>`))
    expect(count(primer!.body, /<li><button/g)).toBe(12)
    expect(primer!.body).toContain('>Topic 1 of 12<')
    expect(count(primer!.body, />Read first</g)).toBe(4)
    expect(primer!.body).toContain('Sources for this lab&#x27;s model</summary>')
    for (const other of [lab!, record!]) expect(other.body).not.toContain('Sources for this lab&#x27;s model')
  })

  it('prints the seed once, in the notebook', () => {
    save(createLab(1384, 'guided'))
    const html = page().replace(/<a [^>]*>.*?<\/a>/gs, '')
    expect(count(html, /1384/g)).toBe(1)
    expect(/<aside aria-label="Lab notebook"[^>]*>.*<\/aside>/s.exec(html)![0]).toContain('>Seed 1384<')
  })

  // Before the tabs the four were down one page; the record is now on a tab of its own.
  it('with a run has its four slots filled in order: the guide, the bench and the notebook on the Lab tab, and the record on the Record tab', () => {
    save(third)
    const challenge = page()
    const [, labPanel, recordPanel] = panels(challenge)
    expect(labPanel!.body).toContain('<section aria-label="Bench"')
    expect(labPanel!.body).toContain('<aside aria-label="Lab notebook"')
    expect(labPanel!.body).not.toContain(`>${NOTEBOOK_TEXT.recordHeading}</h2>`)
    expect(recordPanel!.body).toContain(`>${NOTEBOOK_TEXT.recordHeading}</h2>`)
    expect(count(challenge, /<table/g)).toBe(1)
    const at = (html: string) => ['<section aria-label="Guided checklist"', '<section aria-label="Bench"', '<aside aria-label="Lab notebook"', `>${NOTEBOOK_TEXT.recordHeading}</h2>`].map((mark) => html.indexOf(mark))
    // Challenge has no guide.
    expect(at(challenge)[0]).toBe(-1)
    expect(at(challenge).slice(1).every((index) => index > 0)).toBe(true)
    save(run(m, createLab(1, 'guided'), [{ type: 'fillBurette' }]))
    const guided = page()
    expect(at(guided).every((index) => index > 0)).toBe(true)
    expect(at(guided)).toEqual([...at(guided)].sort((a, b) => a - b))
    // The bench is the run's: the label of its acid, and the field its next reading is typed in. (Before 2026-10-06
    // the label was one run of text; what is read off it is now in a span of its own, so the tags are taken out.)
    expect(guided.replace(/<[^>]+>/g, '')).toContain('Label: HCl, 0.0976 M. Standardized.')
    expect(guided).toMatch(/<label[^>]*>Initial burette reading \(mL\)<\/label>/)
    // No warning is showing, and the stopcock is closed.
    expect(guided).not.toContain(WARNING_TEXT['burette-not-conditioned'].title)
    expect(guided).toContain('The stopcock is closed.')
  })

  it('gives the bench the reduced-motion setting of the app', () => {
    // An addition draws its plume only after the stand is mounted, so no markup has one; the setting is checked in a browser.
    save(third)
    expect(page()).not.toMatch(/bench-plume|bench-drop/)
  })

  // Before the tabs the narrow page was one page down, with the primer open and no button at all.
  it('in a narrow window with a run opens on the Lab tab with the notice in place of the bench, has the record with the trial under way on the Record tab, and no bench, no field and nothing that changes the run', () => {
    app.wide = false
    save(third)
    const html = page()
    const [primer, lab, record] = panels(html)
    expect(selectedTab(html)).toEqual(['Lab'])
    expect(lab!.body).toContain(NARROW_NOTICE.withRun)
    expect(record!.body).toContain(`>${NOTEBOOK_TEXT.recordHeading}</h2>`)
    expect(pressed(html)).toEqual(pressed(primer!.body))
    expect(html).not.toContain(SHELL_TEXT.restart)
    // The notice calls the record what its heading calls it. "Notebook" is the wide page's panel, not shown here.
    expect(NARROW_NOTICE.withRun).toContain('the record of your saved run')
    expect(NARROW_NOTICE.withRun).not.toMatch(/notebook/i)
    expect(html).not.toContain(`>${NOTEBOOK_TEXT.heading}</h2>`)
    expect(html).toContain('>In progress</td>')
    expect(html).toContain('>Invalid: overshot</td>')
    expect(html).not.toContain('aria-label="Bench"')
    expect(html).not.toContain('<aside')
    expect(html).not.toMatch(/<(input|select|textarea)/)
  })

  it('a stored record that does not fit leaves the lab not started, and the page says that a saved run was kept, until a new one is started', () => {
    const said = (html: string) => [...html.matchAll(/<p role="status"[^>]*>([^<]*)<\/p>/g)].map((match) => match[1]!.replaceAll('&quot;', '"'))
    expect(said(page())).toEqual([])
    const raw = JSON.stringify({ version: titration.version, data: { ...createLab(1, 'guided'), seed: -1 } })
    app.store.setItem('valence:lab:titration', raw)
    const html = page()
    expect(html).toContain(`>${SHELL_TEXT.start}</button>`)
    expect(html).not.toContain('aria-label="Bench"')
    expect(said(html)).toEqual([SHELL_TEXT.setAside])
    expect(app.store.getItem('valence:backup:lab:titration')).toBe(raw)
    // Opened again in the same session, before Start, it still says so; on the narrow page too.
    expect(said(page())).toEqual([SHELL_TEXT.setAside])
    app.wide = false
    expect(said(page())).toEqual([SHELL_TEXT.setAside])
    app.wide = true
    save(createLab(1, 'guided'))
    expect(page()).not.toContain('could not be opened')
    // A record of another version is the same to the learner.
    app.store = createMemoryStore()
    app.store.setItem('valence:lab:titration', JSON.stringify({ version: titration.version + 1, data: createLab(1, 'guided') }))
    expect(said(page())).toEqual([SHELL_TEXT.setAside])
  })

  // Before the tabs this case held the narrow page to having no button; it now has its tabs and the primer's own.
  it('in a narrow window with no run opens on the Primer tab, holds the notice on the Lab tab, and offers no Start and no field', () => {
    app.wide = false
    const html = page()
    const [primer, lab, record] = panels(html)
    expect(selectedTab(html)).toEqual(['Primer'])
    expect(lab!.body).toContain(NARROW_NOTICE.title)
    expect(lab!.body).toContain(NARROW_NOTICE.withoutRun)
    expect(record!.body).toContain(SHELL_TEXT.noRecord)
    expect(html).not.toContain(SHELL_TEXT.start)
    expect(pressed(html)).toEqual(pressed(primer!.body))
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

describe('the record of trials', () => {
  const record = (state: TitrationState) => renderToStaticMarkup(createElement(TrialRecord, { m, state }))
  /** Each trial's two rows: its cells, and the feedback under them. */
  const rows = (html: string) =>
    [...html.matchAll(/<tbody[^>]*>(.*?)<\/tbody>/gs)].map(([, body]) => {
      const [first = '', under = ''] = body!.split('</tr>')
      return { header: /<th scope="row"[^>]*>([^<]*)<\/th>/.exec(first)?.[1], cells: [...first.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((match) => match[1]), under: read(under) }
    })

  it('is one table with a caption, six column headers and a row header for each trial', () => {
    const html = record(third)
    expect(count(html, /<table/g)).toBe(1)
    expect(html).toMatch(/<table[^>]*><caption[^>]*>[^<]+<\/caption>/)
    expect([...html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((match) => match[1])).toEqual(['Trial', 'Initial reading (mL)', 'Final reading (mL)', 'Titre (mL)', 'NaOH molarity (M)', 'Result'])
    expect(rows(html).map((row) => row.header)).toEqual(['1', '2', '3'])
  })

  it('shows each trial as it was recorded, a value not yet there as a dash, and the result in words', () => {
    const [one, two, three] = rows(record(third))
    expect(one!.cells).toEqual(['2.56', '28.79', '26.23', '0.0930', 'Not passed, −2.13%'])
    expect(one!.under).toContain(CAUSE_TEXT['burette-not-conditioned'])
    expect(two!.cells).toEqual(['0.56', '—', '—', '—', 'Invalid: overshot'])
    expect(two!.under).toContain(OUTCOME_TEXT.overshot.replaceAll("'", '&#x27;'))
    expect(three!.cells).toEqual(['2.04', '—', '—', '—', 'In progress'])
    // The trial under way has nothing under its row.
    expect(three!.under).toBe('')
  })

  it('shows the HCl molarity once, above the table', () => {
    const html = record(third)
    expect(count(html, /0\.0976/g)).toBe(1)
    expect(html.indexOf('0.0976')).toBeLessThan(html.indexOf('<table'))
    // Before it is recorded, a dash.
    expect(record(createLab(1, 'guided')).split('<table')[0]).toContain('—')
  })

  it('carries the value role on each figure that is there and on no dash, and on the result the role its words have', () => {
    const html = record(third)
    const cells = [...html.matchAll(/<td class="([^"]*)">([^<]*)<\/td>/g)].map((match) => [match[2], match[1]!.replace('py-1 pr-3', '').trim()])
    expect(cells).toEqual([
      ...[['2.56'], ['28.79'], ['26.23'], ['0.0930']].map(([figure]) => [figure, ROLE.value]),
      ['Not passed, −2.13%', ROLE.failed],
      ['0.56', ROLE.value],
      ...['—', '—', '—'].map((dash) => [dash, '']),
      ['Invalid: overshot', ROLE.failed],
      ['2.04', ROLE.value],
      ...['—', '—', '—'].map((dash) => [dash, '']),
      ['In progress', ''],
    ])
    expect(html).toContain(`HCl molarity in the notebook (M): <span class="${ROLE.value}">0.0976</span>`)
    expect(record(createLab(1, 'guided'))).toContain('HCl molarity in the notebook (M): <span>—</span>')
    // A pass that counts is good; one that does not count is neither good nor failed, and its words say both halves.
    expect([...record(completed).matchAll(/<td class="py-1 pr-3 ([^"]*)">Passed<\/td>/g)].map((match) => match[1])).toEqual([ROLE.done, ROLE.done, ROLE.done])
    expect(record(misreadPass)).toContain('<td class="py-1 pr-3">Passed, not counted</td>')
  })

  it('is read-only, in a box that scrolls by itself and can take focus', () => {
    for (const state of [createLab(1, 'guided'), third, completed, summarised]) expect(record(state)).not.toMatch(/<(input|button|select|textarea)/)
    expect(record(third)).toMatch(/<div tabindex="0" role="region" aria-label="[^"]+" class="[^"]*overflow-x-auto/)
  })

  it('a pass that does not count reads "Passed, not counted", says why, and gives no percent error', () => {
    const [row] = rows(record(misreadPass))
    expect(row!.cells).toEqual(['2.56', '28.29', '25.73', '0.0948', 'Passed, not counted'])
    expect(row!.under).toContain(OUTCOME_TEXT.notCounted)
    expect(row!.under).toContain(CAUSE_TEXT['final-misread'])
    expect(record(misreadPass)).not.toMatch(PERCENT_ERROR)
  })

  it('on completion the three rows still read "Passed" with no percent error', () => {
    const html = record(completed)
    expect(rows(html).map((row) => row.cells.at(-1))).toEqual(['Passed', 'Passed', 'Passed'])
    expect(html).not.toMatch(PERCENT_ERROR)
  })

  it('labels no trial with a mode', () => {
    for (const state of [third, { ...third, mode: 'guided' as const }]) expect(record(state)).not.toMatch(/guided|challenge/i)
  })
})

describe('the notebook panel', () => {
  const panel = (state: TitrationState) =>
    renderToStaticMarkup(
      createElement(NotebookPanel, {
        m,
        state,
        onHclMolarity: () => ({ accepted: true, text: '' }),
        onMolarity: () => ({ accepted: true, text: '' }),
        onDiscard: () => {},
        onNextTrial: () => {},
        onSummary: () => ({ accepted: true, text: '' }),
      }),
    )
  /** Each labelled field: its label's text, its label's tag and its input's tag. (Before 2026-10-06 a label had no id; "Change" is now described by it.) */
  const fields = (html: string) =>
    [...html.matchAll(/(<label[^>]* for="([^"]*)"[^>]*>)([^<]*)<\/label>/g)].map(([, tag, id, label]) => ({ label, tag: tag!, input: new RegExp(`<input id="${id}"[^>]*>`).exec(html)![0] }))
  const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1])
  /** What a field shows. */
  const valueOf = (input: string) => /value="([^"]*)"/.exec(input)![1]
  const textOf = (html: string, id: string) => read(new RegExp(`<(\\w+) id="${id}"[^>]*>(.*?)</\\1>`, 's').exec(html)![2]!)
  /** The block of the last result: the id of its heading, and what it holds. */
  const block = (html: string) => /<section tabindex="-1" aria-labelledby="([^"]*)"[^>]*>(.*?)<\/section>/s.exec(html)
  /** A heading's words, as a reader meets them. */
  const headingOf = (html: string) => /<h3[^>]*>(.*?)<\/h3>/.exec(html)![1]!.replace(/<[^>]+>/g, '')
  const guidedAtEndpoint = (() => {
    const s = titrateCarefully(m, prepared(m, 1, { mode: 'guided' })).state
    return run(m, s, [{ type: 'recordFinalReading', readingUl: honestReading(s.burette.levelUl) }])
  })()

  // Before 2026-10-06 this case held the first field, the HCl molarity, to being enabled in a run that had already
  // recorded it: an empty box for something done. It now holds that field to being disabled and showing the entry;
  // a run that has not recorded it has the field enabled, and the case on the fields after their entries has the rest.
  it('with a trial under way has two labelled fields, the second disabled and tied to its reason, and each a form of its own', () => {
    const html = panel(third)
    const [hcl, naoh, ...rest] = fields(html)
    expect(rest).toEqual([])
    expect([hcl!.label, naoh!.label]).toEqual(['HCl molarity, from the bottle label (M)', 'Your NaOH molarity (M)'])
    for (const { input } of [hcl!, naoh!]) expect(input).toMatch(/type="text" inputMode="decimal"/i)
    expect(hcl!.input).toContain('disabled=""')
    expect(valueOf(hcl!.input)).toBe('0.0976')
    expect(fields(panel(createLab(1, 'guided')))[0]!.input).not.toContain('disabled=""')
    expect(naoh!.input).toContain('disabled=""')
    expect(textOf(html, /aria-describedby="([^"]*)"/.exec(naoh!.input)![1]!)).toContain(BLOCKED_TEXT['needs-final-reading'])
    expect(count(html, /<form/g)).toBe(2)
  })

  it('shows the seed, the tally, and the readings and the titre as text', () => {
    const text = read(panel(third))
    expect(text).toContain('|Seed 1|')
    expect(text).toContain('|Trials finished: 2. Trials that count: 0 of the 3 needed.|')
    expect(text).toContain('|HCl molarity (M)|0.0976|Initial reading (mL)|2.04|Final reading (mL)|—|Titre (mL)|—|')
    expect(read(panel(guidedAtEndpoint))).toContain('|Initial reading (mL)|2.56|Final reading (mL)|28.26|Titre (mL)|25.70|')
  })

  it('under an ended trial shows the HCl molarity that trial was calculated with, not one recorded since', () => {
    // Challenge, label 0.0976: recorded as 0.1234, a careful trial checked with it, then the label put right.
    let s = run(m, createLab(1, 'challenge'), [{ type: 'recordHclMolarity', molarityE6: 123400 }])
    s = carefulTrial(m, readyTrial(m, s, { condition: true, clearBubble: true, rinse: true }))
    s = run(m, s, [{ type: 'recordHclMolarity', molarityE6: 97600 }])
    expect(read(panel(s))).toContain('|Trial 1|HCl molarity (M)|0.1234|')
    expect(read(panel(s))).toContain(CAUSE_TEXT['hcl-label-misrecorded'])
    // The record names its figure as the notebook's, and the next trial starts from that one. (Before 2026-10-06
    // the name and the figure were one run of text; the figure is now in a span of its own, in the role of a value.)
    expect(read(renderToStaticMarkup(createElement(TrialRecord, { m, state: s })))).toContain('|HCl molarity in the notebook (M):|0.0976|')
    expect(read(panel(run(m, s, [NEXT])))).toContain('|Trial 2|HCl molarity (M)|0.0976|')
    // A trial that ended with nothing calculated has no molarity of its own to show.
    expect(read(panel(overshot))).toContain('|Trial 2|HCl molarity (M)|0.0976|')
  })

  // Before 2026-10-06 the first button of both lists was Record: the HCl molarity's field was empty and offered again
  // in a run that had recorded it. It is Change now, in both: the engine takes that entry again during a trial and between two.
  it('offers to discard the flask while the trial is open, and the next trial only once it has ended', () => {
    expect(buttons(panel(third))).toEqual([NOTEBOOK_TEXT.change, NOTEBOOK_TEXT.check, NOTEBOOK_TEXT.discard])
    const html = panel(overshot)
    expect(buttons(html)).toEqual([NOTEBOOK_TEXT.change, NOTEBOOK_TEXT.check, NOTEBOOK_TEXT.nextTrial])
    // The field of a trial that is over says so.
    expect(read(html)).toContain(BLOCKED_TEXT['trial-ended'])
  })

  // Before 2026-10-06 the heading was one run of text. Its two parts are now each in a span, for their roles; the
  // words a reader meets are the same, and the case holds them with the tags taken out.
  it('holds the last result in a block that can take focus: the result in words, then its feedback', () => {
    const [, headingId, body] = block(panel(overshot))!
    expect(body).toContain(`<h3 id="${headingId}"`)
    expect(headingOf(body!)).toBe('Result of trial 2: Invalid: overshot')
    expect(read(body!)).toContain(OUTCOME_TEXT.overshot.replaceAll("'", '&#x27;'))
    // It stays while the next trial is run, and a lab with no trial ended has none.
    expect(headingOf(block(panel(third))![2]!)).toBe('Result of trial 2: Invalid: overshot')
    expect(block(panel(createLab(1, 'guided')))).toBeNull()
  })

  it('in Guided, with both readings, sets the calculation out with no molarity the learner did not type; Challenge has none', () => {
    const html = panel(guidedAtEndpoint)
    expect(html).toContain('M<sub>NaOH</sub> = M<sub>HCl</sub> × V<sub>HCl</sub> ÷ V<sub>NaOH</sub> = 0.0976 × 25.00 ÷ 25.70 = ?')
    expect(read(html.replaceAll(/<\/?sub>/g, '_')).replaceAll('_', '')).toContain(workedLines(97600, 2560, 28260)[0])
    expect(new Set(html.match(/\d\.\d{4,5}/g))).toEqual(new Set(['0.0976']))
    expect(fields(html)[1]!.input).not.toContain('disabled=""')
    expect(panel({ ...guidedAtEndpoint, mode: 'challenge' })).not.toContain('<sub>')
    // Before the final reading there is nothing to set out.
    expect(panel(prepared(m, 1, { mode: 'guided' }))).not.toContain('<sub>')
  })

  it('a pass that does not count leaves the tally at none of three and gives no percent error', () => {
    const html = panel(misreadPass)
    expect(read(html)).toContain('|Trials finished: 1. Trials that count: 0 of the 3 needed.|')
    // (Before 2026-10-06 the heading was one run of text: see the case on the block of the last result.)
    expect(headingOf(block(html)![2]!)).toBe('Result of trial 1: Passed, not counted')
    expect(html).toContain(OUTCOME_TEXT.notCounted)
    expect(html).not.toMatch(PERCENT_ERROR)
  })

  it('before completion has the waiting line, no summary form and no true molarity', () => {
    const d1 = finishHonestly(m, titrateCarefully(m, readyTrial(m, run(m, afterOne, [NEXT]))).state)
    for (const state of [createLab(1, 'guided'), afterOne, overshot, third, misreadPass, d1, guidedAtEndpoint]) {
      const html = panel(state)
      expect(html).toContain(SUMMARY.waiting)
      expect(html).not.toContain(SUMMARY.ownAverage)
      expect(html).not.toContain(TRUE_NAOH)
      expect(renderToStaticMarkup(createElement(TrialRecord, { m, state }))).not.toContain(TRUE_NAOH)
    }
  })

  it("on completion gives the true molarity and asks for the learner's two values, with no notebook value yet", () => {
    const html = panel(completed)
    expect(html).toContain(completedText(TRUE_NAOH))
    expect(read(html)).toContain('|Trials finished: 3. Trials that count: 3 of the 3 needed.|')
    expect(fields(html).map((field) => field.label)).toEqual([NOTEBOOK_TEXT.hcl, NOTEBOOK_TEXT.naoh, SUMMARY.ownAverage, SUMMARY.ownDeviation])
    expect(buttons(html)).toEqual([NOTEBOOK_TEXT.record, NOTEBOOK_TEXT.check, SUMMARY.reveal.replaceAll("'", '&#x27;')])
    expect(html).toContain(SUMMARY.ask)
    expect(html).not.toContain(SUMMARY.average.replaceAll("'", '&#x27;'))
    expect(html).not.toContain(SUMMARY.waiting)
    // The lab is over: the two fields of a trial say so, and no further trial is offered.
    for (const field of fields(html).slice(0, 2)) expect(field.input).toContain('disabled=""')
    expect(read(html)).toContain(BLOCKED_TEXT['lab-completed'])
    expect(html).not.toMatch(PERCENT_ERROR)
  })

  it("then shows the notebook's own values beside the learner's, with nothing marked", () => {
    const text = read(panel(summarised)).replaceAll('&#x27;', "'")
    expect(text).toContain(`|${SUMMARY.ownAverage}|0.0949|${SUMMARY.average}|0.0949|${SUMMARY.ownDeviation}|0.47|${SUMMARY.deviation}|0.4|`)
    expect(text).toContain(SUMMARY.explain)
    expect(text).not.toMatch(/\b(right|wrong|correct|incorrect|match(es|ed)?|agree(s|d)? with the notebook)\b/i)
  })

  it('in Guided sets the average out with the three molarities and no answer', () => {
    expect(panel({ ...completed, mode: 'guided' })).toContain('Average = (0.0949 + 0.0948 + 0.0949) ÷ 3 = ?')
    expect(panel(completed)).not.toContain('Average = (')
  })

  it('labels no trial with a mode', () => {
    for (const state of [third, { ...third, mode: 'guided' as const }, completed]) expect(panel(state)).not.toMatch(/guided|challenge/i)
  })
})

describe('the colour roles in the notebook', () => {
  const panel = (state: TitrationState) =>
    renderToStaticMarkup(createElement(NotebookPanel, { m, state, onHclMolarity: () => ({ accepted: true, text: '' }), onMolarity: () => ({ accepted: true, text: '' }), onDiscard: () => {}, onNextTrial: () => {}, onSummary: () => ({ accepted: true, text: '' }) }))
  const labels = (html: string) => Object.fromEntries([...html.matchAll(/<label[^>]* class="([^"]*)"[^>]*>([^<]*)<\/label>/g)].map((match) => [match[2]!, match[1]!.includes(ROLE.entry)]))

  it('a value: the heading of the trial, whose result the last one is, and each figure of the trial that is there, a dash never', () => {
    const html = panel(third)
    expect(html).toContain(`<h3 class="font-medium ${ROLE.value}">Trial 3</h3>`)
    expect(html).toContain(`<span class="${ROLE.value}">Result of trial 2</span>: `)
    expect([...html.matchAll(/<dd class="([^"]*)">([^<]*)<\/dd>/g)].map((match) => [match[2], match[1]!.includes(ROLE.value)])).toEqual([['0.0976', true], ['2.04', true], ['—', false], ['—', false]])
    // The notebook's own values and the learner's, once both are there.
    expect(count(panel(summarised), new RegExp(`<dd class="[^"]*${ROLE.value}">`, 'g'))).toBe(8)
  })

  it('a result: good where it passed and counts, failed where it did not pass or has no usable titre, and neither where it passed and does not count', () => {
    const result = (state: TitrationState) => /<\/span>: <span(?: class="([^"]*)")?>([^<]*)<\/span><\/h3>/.exec(panel(state))!.slice(1)
    expect(result(completed)).toEqual([ROLE.done, 'Passed'])
    expect(result(afterOne)).toEqual([ROLE.failed, 'Not passed, −2.13%'])
    expect(result(overshot)).toEqual([ROLE.failed, 'Invalid: overshot'])
    expect(result(misreadPass)).toEqual([undefined, 'Passed, not counted'])
    // The role follows the outcome and nothing else: the four ways a trial has no usable titre are all failed, an open trial has none.
    for (const reason of ['overshot', 'ran-out', 'washed-out', 'discarded'] as const) expect(outcomeRole({ state: 'invalid', reason, causes: [] })).toBe('failed')
    expect(outcomeRole({ state: 'open' })).toBeNull()
    expect(outcomeRole(trialOutcome(m, completed, completed.trials[0]!))).toBe('done')
    expect(outcomeRole(trialOutcome(m, misreadPass, misreadPass.trials[0]!))).toBeNull()
  })

  it('an entry: the label of a field only while that field waits for typing', () => {
    // A new lab: the HCl molarity waits; the NaOH molarity cannot be entered yet.
    expect(labels(panel(createLab(1, 'guided')))).toEqual({ [NOTEBOOK_TEXT.hcl]: true, [NOTEBOOK_TEXT.naoh]: false })
    // Recorded, and no final reading yet: neither waits.
    expect(labels(panel(third))).toEqual({ [NOTEBOOK_TEXT.hcl]: false, [NOTEBOOK_TEXT.naoh]: false })
    // Both readings in: the NaOH molarity waits.
    const atEndpoint = titrateCarefully(m, prepared(m, 1)).state
    expect(labels(panel(run(m, atEndpoint, [{ type: 'recordFinalReading', readingUl: honestReading(atEndpoint.burette.levelUl) }])))).toEqual({ [NOTEBOOK_TEXT.hcl]: false, [NOTEBOOK_TEXT.naoh]: true })
    // Complete: the two of a trial are over, and the summary's two wait until they are entered.
    expect(labels(panel(completed))).toEqual({ [NOTEBOOK_TEXT.hcl]: false, [NOTEBOOK_TEXT.naoh]: false, [SUMMARY.ownAverage]: true, [SUMMARY.ownDeviation]: true })
    expect(labels(panel(summarised))).toEqual({ [NOTEBOOK_TEXT.hcl]: false, [NOTEBOOK_TEXT.naoh]: false, [SUMMARY.ownAverage]: false, [SUMMARY.ownDeviation]: false })
  })

  it('a held reason: the sentence under a field that takes no entry now', () => {
    expect(panel(third)).toContain(`<p class="${ROLE.held}">${BLOCKED_TEXT['needs-final-reading']}</p>`)
    expect(panel(overshot)).toContain(`<p class="${ROLE.held}">${BLOCKED_TEXT['trial-ended']}</p>`)
    expect(count(panel(completed), new RegExp(`<p class="${ROLE.held}">${BLOCKED_TEXT['lab-completed']}</p>`, 'g'))).toBe(2)
  })

  it('reads the same with every role taken off: each role is on words, and the words are the ones the notebook had', () => {
    for (const state of [createLab(1, 'guided'), third, overshot, afterOne, misreadPass, completed, summarised]) {
      const html = panel(state)
      for (const role of Object.values(ROLE)) for (const [, held] of html.matchAll(new RegExp(`<[a-z0-9]+[^>]* class="[^"]*\\b${role}\\b[^"]*"[^>]*>([^<]*)<`, 'g'))) expect([role, held!.trim()]).not.toEqual([role, ''])
    }
    // "Result of trial 2: Invalid: overshot" is said whole, as before the roles.
    expect(panel(overshot).replace(/<[^>]+>/g, '')).toContain('Result of trial 2: Invalid: overshot')
  })
})

describe('a field of the notebook after its entry', () => {
  const panel = (state: TitrationState) =>
    renderToStaticMarkup(createElement(NotebookPanel, { m, state, onHclMolarity: () => ({ accepted: true, text: '' }), onMolarity: () => ({ accepted: true, text: '' }), onDiscard: () => {}, onNextTrial: () => {}, onSummary: () => ({ accepted: true, text: '' }) }))
  const LABEL_E6 = 97600
  /** Each form of the panel: its fields as [label, what it shows, disabled], its buttons, and the paragraphs under its fields. */
  const forms = (state: TitrationState) =>
    [...panel(state).matchAll(/<form.*?<\/form>/gs)].map(([form]) => ({
      fields: [...form.matchAll(/<label[^>]*>([^<]*)<\/label>.*?(<input[^>]*>)/gs)].map((match) => [match[1], /value="([^"]*)"/.exec(match[2]!)![1], match[2]!.includes('disabled=""')]),
      buttons: [...form.matchAll(/(<button[^>]*>)([^<]*)<\/button>/g)].map((match) => `${match[2]!.replaceAll('&#x27;', "'")}${match[1]!.includes('aria-disabled="true"') ? ' (unavailable)' : ''}`),
      under: [...form.matchAll(/<div id="[^"]*">(.*?)<\/div>/gs)].map((match) => match[1]!.replace(/<[^>]+>/g, '')).filter((said) => said !== ''),
    }))
  const atEndpoint = titrateCarefully(m, prepared(m, 1)).state
  const bothReadings = run(m, atEndpoint, [{ type: 'recordFinalReading', readingUl: honestReading(atEndpoint.burette.levelUl) }])

  it('the HCl molarity: disabled and shown once recorded, with Change during a trial and between two, and with the reason and no Change once the lab is complete', () => {
    expect(forms(createLab(1, 'challenge'))[0]).toEqual({ fields: [[NOTEBOOK_TEXT.hcl, '', false]], buttons: ['Record'], under: [] })
    for (const state of [third, bothReadings, overshot, afterOne]) expect(forms(state)[0]).toEqual({ fields: [[NOTEBOOK_TEXT.hcl, '0.0976', true]], buttons: ['Change'], under: [] })
    expect(forms(completed)[0]).toEqual({ fields: [[NOTEBOOK_TEXT.hcl, '0.0976', true]], buttons: ['Record (unavailable)'], under: [BLOCKED_TEXT['lab-completed']] })
  })

  it('the NaOH molarity: checking it ends the trial, so once entered it is shown with the one reason and never with Change', () => {
    expect(forms(third)[1]).toEqual({ fields: [[NOTEBOOK_TEXT.naoh, '', true]], buttons: ['Check (unavailable)'], under: [BLOCKED_TEXT['needs-final-reading']] })
    expect(forms(bothReadings)[1]).toEqual({ fields: [[NOTEBOOK_TEXT.naoh, '', false]], buttons: ['Check'], under: [] })
    expect(forms(afterOne)[1]).toEqual({ fields: [[NOTEBOOK_TEXT.naoh, '0.0930', true]], buttons: ['Check (unavailable)'], under: [BLOCKED_TEXT['trial-ended']] })
    // A trial that ended with no molarity entered: the field is empty, with the same one reason.
    expect(forms(overshot)[1]).toEqual({ fields: [[NOTEBOOK_TEXT.naoh, '', true]], buttons: ['Check (unavailable)'], under: [BLOCKED_TEXT['trial-ended']] })
    expect(forms(completed)[1]).toEqual({ fields: [[NOTEBOOK_TEXT.naoh, '0.0949', true]], buttons: ['Check (unavailable)'], under: [BLOCKED_TEXT['lab-completed']] })
  })

  it("the two summary entries: disabled and shown once made, with Change, and the notebook's values still beside them", () => {
    expect(forms(completed)[2]).toEqual({ fields: [[SUMMARY.ownAverage, '', false], [SUMMARY.ownDeviation, '', false]], buttons: [SUMMARY.reveal], under: [] })
    expect(forms(summarised)[2]).toEqual({ fields: [[SUMMARY.ownAverage, '0.0949', true], [SUMMARY.ownDeviation, '0.47', true]], buttons: ['Change'], under: [] })
    expect(read(panel(summarised)).replaceAll('&#x27;', "'")).toContain(`|${SUMMARY.average}|0.0949|`)
  })

  it('Change is there exactly when the engine would take the entry again, in every state of two runs', () => {
    const states = [createLab(1, 'guided'), createLab(1, 'challenge'), prepared(m, 1), third, bothReadings, overshot, afterOne, run(m, afterOne, [NEXT]), misreadPass, completed, summarised]
    const seen = new Set<string>()
    for (const state of states) {
      const trial = currentTrial(state)
      const [hcl, naoh, summary] = forms(state)
      const asked: [form: typeof hcl, entered: boolean, again: boolean][] = [
        [hcl, state.hclRecordedE6 !== null, can(m, state, { type: 'recordHclMolarity', molarityE6: LABEL_E6 }) === null],
        [naoh, trial.molarityE6 !== null, can(m, state, { type: 'submitMolarity', molarityE6: trial.molarityE6 ?? 0 }) === null],
        [summary, state.summary !== null, can(m, state, { type: 'recordSummary', meanE6: 94900, deviationE2: 47 }) === null],
      ]
      for (const [form, entered, again] of asked) {
        if (!form) continue
        expect(form.buttons.includes('Change')).toBe(entered && again)
        // An entry that is made is shown in a disabled field, and no state leaves a field both empty and done.
        if (entered) for (const [, value, disabled] of form.fields) expect([value !== '', disabled]).toEqual([true, true])
        seen.add(`${entered}:${again}`)
      }
    }
    expect([...seen].sort()).toEqual(['false:false', 'false:true', 'true:false', 'true:true'])
  })

  // The screenshot of 2026-10-06: a refusal stood under a field of a trial that was over, beside "This trial is over.".
  it('a field that takes no entry shows its one reason, no refusal of an earlier entry, and no mark of an invalid one', () => {
    const field = (props: { disabled?: boolean; held?: string | null; error?: string }) =>
      renderToStaticMarkup(createElement(Field, { label: NOTEBOOK_TEXT.naoh, value: '0.0930', onChange: () => {}, noteId: 'note', ...props }))
    const refused = INVALID_ENTRY_TEXT.molarity
    // While it takes typing, a refusal is said and the field is marked.
    expect(field({ error: refused })).toContain(`<div id="note"><p role="alert">${refused}</p></div>`)
    expect(field({ error: refused })).toContain('aria-invalid="true"')
    // Once the trial is over, with that refusal still held by the form:
    const over = field({ disabled: true, held: BLOCKED_TEXT['trial-ended'], error: refused })
    expect(over).toContain(`<div id="note"><p class="${ROLE.held}">${BLOCKED_TEXT['trial-ended']}</p></div>`)
    expect(over).not.toContain(refused)
    expect(over).not.toContain('aria-invalid="')
    expect(over).not.toContain('role="alert"')
    // And a field that is done and can be changed has nothing under it.
    expect(field({ disabled: true, error: refused })).toContain('<div id="note"></div>')
    // The reason is the field's description.
    expect(/<input[^>]*>/.exec(over)![0]).toContain('aria-describedby="note"')
  })
})

describe('a Challenge learner who miscopied the label', () => {
  const panel = (state: TitrationState) =>
    renderToStaticMarkup(createElement(NotebookPanel, { m, state, onHclMolarity: () => ({ accepted: true, text: '' }), onMolarity: () => ({ accepted: true, text: '' }), onDiscard: () => {}, onNextTrial: () => {}, onSummary: () => ({ accepted: true, text: '' }) }))
  /** The HCl molarity's form: what its field shows, and its buttons. */
  const hcl = (state: TitrationState) => {
    const form = /<form.*?<\/form>/s.exec(panel(state))![0]
    return { shown: /value="([^"]*)"/.exec(form)![1], disabled: /<input[^>]* disabled=""/.test(form), buttons: [...form.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1]) }
  }
  const CORRECT: Action = { type: 'recordHclMolarity', molarityE6: 97600 }

  it('is shown the wrong entry in a disabled field with Change beside it, at every point of the run, and so can still correct it and reach three trials that count', () => {
    // The label reads 0.0976; 0.0967 is typed, and Challenge takes it.
    let s = run(m, createLab(1, 'challenge'), [{ type: 'recordHclMolarity', molarityE6: 96700 }])
    const changeable = () => {
      expect(hcl(s)).toEqual({ shown: '0.0967', disabled: true, buttons: [NOTEBOOK_TEXT.change] })
      // What Change leads to is the engine's to allow, and it does.
      expect(can(m, s, CORRECT)).toBeNull()
    }
    changeable()
    s = readyTrial(m, s, { condition: true, clearBubble: true, rinse: true })
    changeable()
    s = titrateCarefully(m, s).state
    changeable()
    s = finishHonestly(m, s)
    // The trial is over and does not count: its field of the NaOH molarity is shut, and the label's is not.
    expect(countingTrials(m, s)).toHaveLength(0)
    expect(read(panel(s))).toContain(CAUSE_TEXT['hcl-label-misrecorded'])
    changeable()
    s = run(m, s, [NEXT])
    changeable()
    s = run(m, s, [CORRECT])
    expect(hcl(s)).toEqual({ shown: '0.0976', disabled: true, buttons: [NOTEBOOK_TEXT.change] })
    for (let trial = 0; trial < 3; trial++) {
      if (trial > 0) s = run(m, s, [NEXT])
      s = carefulTrial(m, readyTrial(m, s))
    }
    expect(countingTrials(m, s)).toHaveLength(3)
    expect(s.status).toBe('completed')
    // Complete: the engine takes no molarity now, so there is no Change, and the field says why.
    expect(hcl(s)).toEqual({ shown: '0.0976', disabled: true, buttons: [NOTEBOOK_TEXT.record] })
    expect(can(m, s, CORRECT)).toBe('lab-completed')
    expect(read(panel(s))).toContain(BLOCKED_TEXT['lab-completed'])
  })

  it('who corrects it in the middle of the trial has that trial count', () => {
    let s = run(m, createLab(1, 'challenge'), [{ type: 'recordHclMolarity', molarityE6: 96700 }])
    s = titrateCarefully(m, readyTrial(m, s, { condition: true, clearBubble: true, rinse: true })).state
    s = finishHonestly(m, run(m, s, [CORRECT]))
    expect(countingTrials(m, s)).toHaveLength(1)
  })
})

describe('the guide', () => {
  const guide = (state: TitrationState) => renderToStaticMarkup(createElement(Guide, { steps: checklist(m, state), trialIndex: currentTrial(state).index }))
  const items = (html: string) => [...html.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((match) => ({ tag: match[0].slice(0, match[0].indexOf('>') + 1), text: read(match[1]!) }))
  const filledUnconditioned = run(m, createLab(1, 'guided'), [{ type: 'recordHclMolarity', molarityE6: 97600 }, { type: 'fillBurette' }])

  it('lists the eleven steps, each with a mark hidden from a screen reader, its label and its state in words, and one of them current', () => {
    const html = guide(filledUnconditioned)
    const list = items(html)
    expect(list).toHaveLength(11)
    expect(list.filter((item) => item.tag.includes('aria-current="step"'))).toHaveLength(1)
    expect(list[3]!.tag).toContain('aria-current="step"')
    expect(list.slice(0, 4).map((item) => item.text)).toEqual([
      '|✓|Record the HCl molarity from the bottle label|(Done)|',
      '|✕|Condition the burette with NaOH|(Skipped)|',
      '|✓|Fill the burette with NaOH|(Done)|',
      '|→|Clear the air bubble from the burette tip|(Next)|',
    ])
    expect(list[4]!.text).toBe('|○|Record the initial burette reading|(To do)|')
    // Before 2026-10-06 no mark had a class. The tick of a step done now carries the done role, and no other mark has one.
    expect(count(html, /<span aria-hidden="true"[^>]*>[✓✕→○]<\/span>/g)).toBe(11)
    expect([...html.matchAll(/<span aria-hidden="true"( class="[^"]*")?>([✓✕→○])<\/span>/g)].map((match) => [match[2], match[1] ?? ''])).toEqual(
      list.map((item) => (item.text.startsWith('|✓|') ? ['✓', ` class="${ROLE.done}"`] : [item.text[1], ''])),
    )
  })

  it('draws both forms in one render, the one line and the list, for the stylesheet to show one', () => {
    const html = guide(filledUnconditioned)
    expect(html).toMatch(/<p class="lab-guide-line[^"]*">Step 4 of 11, next: Clear the air bubble from the burette tip<\/p>/)
    expect(html).toMatch(/<div class="lab-guide-list[^"]*">.*<ol/s)
  })

  it('words a later trial as a refill into a clean flask', () => {
    const html = guide(run(m, afterOne, [NEXT]))
    expect(html).toContain('Refill the burette with NaOH')
    expect(html).toContain('Pipette 25.00 mL of HCl into a clean flask')
    expect(guide(filledUnconditioned)).toContain('Pipette 25.00 mL of HCl into the flask')
  })

  it('for a trial that has ended marks no step as current and says in both forms that the trial is over', () => {
    const html = guide(overshot)
    expect(html).not.toContain('aria-current')
    expect(count(html, new RegExp(GUIDE_TRIAL_OVER, 'g'))).toBe(2)
    expect(html).toMatch(new RegExp(`<p class="lab-guide-line[^"]*">${GUIDE_TRIAL_OVER}</p>`))
    expect(html).not.toContain('Step ')
  })
})

describe('lab.css', () => {
  it('defines each colour role once for the light theme and once for the dark, and a class for every role a component carries', () => {
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    const block = (selector: string) => [...css.matchAll(new RegExp(`(?:^|\\})\\s*${selector} \\{([^}]*)\\}`, 'g'))].map((match) => match[1]!)
    const [light, ...moreLight] = block(':root')
    const [dark, ...moreDark] = block('\\.dark')
    expect([moreLight, moreDark]).toEqual([[], []])
    const names = (declarations: string) => [...declarations.matchAll(/(--lab-[a-z-]+):/g)].map((match) => match[1]).sort()
    // The same six in each theme, each defined once; a failed result has none of its own and is the theme's destructive colour.
    expect(names(light!)).toEqual(['--lab-done', '--lab-entry', '--lab-held', '--lab-pink', '--lab-pink-deep', '--lab-value'])
    expect(names(dark!)).toEqual(names(light!))
    for (const role of Object.values(ROLE)) {
      const [rule, ...more] = block(`\\.${role}`)
      expect([role, more]).toEqual([role, []])
      expect([role, rule!.trim()]).toEqual([role, `color: var(--${role === ROLE.failed ? 'destructive' : role});`])
    }
    // A role is a colour of text and nothing else: no rule of the file hides, moves or sizes by one.
    expect(css.match(/\.lab-(?:value|entry|done|failed|pink|pink-deep|held)\b[^{]*\{[^}]*\}/g)).toHaveLength(7)
  })

  it('shows the guide as one line below 110rem of page and as the list from there, the other form not displayed', () => {
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    expect(css).toContain('.lab-guide-list { display: none; }')
    expect(css).toMatch(/@container lab \(min-width: 110rem\) \{[^@]*\.lab-guide-line \{ display: none; \} \.lab-guide-list \{ display: block; \}/)
  })
})
