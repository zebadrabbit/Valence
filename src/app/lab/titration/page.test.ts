import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { NARROW_NOTICE, SHELL_TEXT } from '@/app/lab/shellText'
import { labProgress } from '@/app/lab/useLabProgress'
import { Lab } from '@/app/pages/Lab'
import { createMemoryStore, loadEntry, saveEntry, type KeyValueStore } from '@/app/progress/storage'
import { titrationData } from '@/chem-data/titration/data'
import { checklist, createLab, currentTrial, modelFrom, titrationStateSchema, type Action, type TitrationState } from '@/engine/titration'
import { honestReading, learner } from '@/engine/titration/testkit'
import { Guide } from './Guide'
import { BLOCKED_TEXT, CAUSE_TEXT, completedText, GUIDE_TRIAL_OVER, NOTEBOOK_TEXT, OUTCOME_TEXT, SUMMARY, WARNING_TEXT, workedLines } from './messages'
import { NotebookPanel, TrialRecord } from './Notebook'
import { TitrationPage } from './TitrationPage'
import labCss from '../lab.css?raw'

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
    expect(html).not.toMatch(/<input type="radio"[^>]*disabled/)
    expect(app.store.getItem('valence:lab:titration')).toBe(stored)
    expect(loadEntry(app.store, titration.entry, titration.version, titrationStateSchema)).toEqual(lab)
  })

  it('locks the mode while a trial is under way, with the reason', () => {
    const lab = createLab(1, 'guided')
    save({ ...lab, trials: [{ ...lab.trials[0]!, aliquot: 'clean' }] })
    const html = page()
    expect(count(html, /<input type="radio"[^>]*>/g)).toBe(2)
    expect(count(html, /<input type="radio"[^>]*disabled=""/g)).toBe(2)
    expect(html).toContain(SHELL_TEXT.modeLocked)
  })

  it("has the primer's twelve cards and, at its foot, the sources of the lab's model", () => {
    const html = page()
    expect(count(html, /<h2/g)).toBe(12)
    expect(html).toContain('Sources for this lab&#x27;s model</summary>')
  })

  it('prints the seed once, in the notebook', () => {
    save(createLab(1384, 'guided'))
    const html = page().replace(/<a [^>]*>.*?<\/a>/gs, '')
    expect(count(html, /1384/g)).toBe(1)
    expect(/<aside aria-label="Lab notebook"[^>]*>.*<\/aside>/s.exec(html)![0]).toContain('>Seed 1384<')
  })

  it('with a run has its four slots filled in order: the guide, the bench, the notebook and the record', () => {
    save(third)
    const challenge = page()
    const at = (html: string) => ['<section aria-label="Guided checklist"', '<section aria-label="Bench"', '<aside aria-label="Lab notebook"', `>${NOTEBOOK_TEXT.recordHeading}</h2>`].map((mark) => html.indexOf(mark))
    // Challenge has no guide.
    expect(at(challenge)[0]).toBe(-1)
    expect(at(challenge).slice(1).every((index) => index > 0)).toBe(true)
    save(run(m, createLab(1, 'guided'), [{ type: 'fillBurette' }]))
    const guided = page()
    expect(at(guided).every((index) => index > 0)).toBe(true)
    expect(at(guided)).toEqual([...at(guided)].sort((a, b) => a - b))
    // The bench is the run's: the label of its acid, and the field its next reading is typed in.
    expect(guided).toContain('Label: HCl, 0.0976 M. Standardized.')
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

  it('in a narrow window with a run shows the notice, the primer and the record with the trial under way, and no bench and no field', () => {
    app.wide = false
    save(third)
    const html = page()
    expect(html).toContain(NARROW_NOTICE.withRun)
    expect(html).toMatch(PRIMER(true))
    expect(html).toContain(`>${NOTEBOOK_TEXT.recordHeading}</h2>`)
    expect(html).toContain('>In progress</td>')
    expect(html).toContain('>Invalid: overshot</td>')
    expect(html).not.toContain('aria-label="Bench"')
    expect(html).not.toContain('<aside')
    expect(html).not.toMatch(/<(input|button|select|textarea)/)
  })

  it('a stored record that does not fit leaves the lab not started', () => {
    app.store.setItem('valence:lab:titration', JSON.stringify({ version: titration.version, data: { ...createLab(1, 'guided'), seed: -1 } }))
    const html = page()
    expect(html).toContain(`>${SHELL_TEXT.start}</button>`)
    expect(html).not.toContain('aria-label="Bench"')
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
  /** Each labelled field: its label's text and its input's tag. */
  const fields = (html: string) =>
    [...html.matchAll(/<label for="([^"]*)"[^>]*>([^<]*)<\/label>/g)].map(([, id, label]) => ({ label, input: new RegExp(`<input id="${id}"[^>]*>`).exec(html)![0] }))
  const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1])
  const textOf = (html: string, id: string) => read(new RegExp(`<(\\w+) id="${id}"[^>]*>(.*?)</\\1>`, 's').exec(html)![2]!)
  const guidedAtEndpoint = (() => {
    const s = titrateCarefully(m, prepared(m, 1, { mode: 'guided' })).state
    return run(m, s, [{ type: 'recordFinalReading', readingUl: honestReading(s.burette.levelUl) }])
  })()

  it('with a trial under way has two labelled fields, the second disabled and tied to its reason, and each a form of its own', () => {
    const html = panel(third)
    const [hcl, naoh, ...rest] = fields(html)
    expect(rest).toEqual([])
    expect([hcl!.label, naoh!.label]).toEqual(['HCl molarity, from the bottle label (M)', 'Your NaOH molarity (M)'])
    for (const { input } of [hcl!, naoh!]) expect(input).toMatch(/type="text" inputMode="decimal"/i)
    expect(hcl!.input).not.toContain('disabled=""')
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
    // The record names its figure as the notebook's, and the next trial starts from that one.
    expect(read(renderToStaticMarkup(createElement(TrialRecord, { m, state: s })))).toContain('|HCl molarity in the notebook (M): 0.0976|')
    expect(read(panel(run(m, s, [NEXT])))).toContain('|Trial 2|HCl molarity (M)|0.0976|')
    // A trial that ended with nothing calculated has no molarity of its own to show.
    expect(read(panel(overshot))).toContain('|Trial 2|HCl molarity (M)|0.0976|')
  })

  it('offers to discard the flask while the trial is open, and the next trial only once it has ended', () => {
    expect(buttons(panel(third))).toEqual([NOTEBOOK_TEXT.record, NOTEBOOK_TEXT.check, NOTEBOOK_TEXT.discard])
    const html = panel(overshot)
    expect(buttons(html)).toEqual([NOTEBOOK_TEXT.record, NOTEBOOK_TEXT.check, NOTEBOOK_TEXT.nextTrial])
    // The field of a trial that is over says so.
    expect(read(html)).toContain(BLOCKED_TEXT['trial-ended'])
  })

  it('holds the last result in a block that can take focus: the result in words, then its feedback', () => {
    const block = (html: string) => /<section tabindex="-1" aria-labelledby="([^"]*)"[^>]*>(.*?)<\/section>/s.exec(html)
    const [, headingId, body] = block(panel(overshot))!
    expect(body).toContain(`<h3 id="${headingId}"`)
    expect(read(body!)).toContain('|Result of trial 2: Invalid: overshot|')
    expect(read(body!)).toContain(OUTCOME_TEXT.overshot.replaceAll("'", '&#x27;'))
    // It stays while the next trial is run, and a lab with no trial ended has none.
    expect(read(block(panel(third))![2]!)).toContain('|Result of trial 2: Invalid: overshot|')
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
    expect(read(html)).toContain('|Result of trial 1: Passed, not counted|')
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
    expect(count(html, /<span aria-hidden="true">[✓✕→○]<\/span>/g)).toBe(11)
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
  it('shows the guide as one line below 110rem of page and as the list from there, the other form not displayed', () => {
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    expect(css).toContain('.lab-guide-list { display: none; }')
    expect(css).toMatch(/@container lab \(min-width: 110rem\) \{[^@]*\.lab-guide-line \{ display: none; \} \.lab-guide-list \{ display: block; \}/)
  })
})
