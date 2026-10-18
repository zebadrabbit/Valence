import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ACTIVITIES } from '@/app/activities'
import { createMemoryStore, NOT_SAVING_TEXT, storageKey, type KeyValueStore } from '@/app/progress/storage'
import { titrationCitations } from '@/chem-data/citations'
import sources from '@/chem-data/sources.json'
import { titrationData } from '@/chem-data/titration/data'
import { READ_FIRST, termIndex, TITRATION_PRIMER } from '@/chem-data/titration/primer'
import { aqueousData } from '@/chem-data/aqueous/data'
import { flameData } from '@/chem-data/flame/data'
import { Hazards } from './Hazards'
import labCss from './lab.css?raw'
import { LabShell, openingTab, tabShift, type LabShellProps } from './LabShell'
import { ModeSwitch } from './ModeSwitch'
import { openingStation } from './openingStation'
import { pieces, Primer, subscriptParts } from './Primer'
import { HAZARDS_TEXT, NARROW_NOTICE, PRIMER_TEXT, SHELL_TEXT } from './shellText'
import { LAYER_LINE, Tube, type LayerWords, type TubeLayers } from './Tube'
import { liquidHex } from './tubeDrawing'
import { labProgress, writtenElsewhere } from './useLabProgress'

// The markup the shell puts its wording and its slots in. Focus, keys, which tab a press shows, the confirm on
// Restart and the layout at each width are checked in a browser: a markup render mounts the page and runs no state.

const routed = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
// React escapes these five in text and attributes.
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const sourceUrl = (id: string) => sources.find((source) => source.id === id)!.url
const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((match) => match[1])

/** The three panels in the order of their tabs: each one's opening tag and what it holds. */
const panels = (html: string) => html.split(/(?=<div[^>]*role="tabpanel")/).slice(1).map((panel) => ({ tag: panel.slice(0, panel.indexOf('>') + 1), body: panel.slice(panel.indexOf('>') + 1) }))
const tabs = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].map((match) => ({ name: match[1], selected: match[0].includes('aria-selected="true"') }))
const selectedTab = (html: string) => tabs(html).filter((tab) => tab.selected).map((tab) => tab.name)
/** Every button that is not a tab, by its text. */
const pressed = (html: string) => [...html.matchAll(/<button(?![^>]*role="tab")[^>]*>(.*?)<\/button>/gs)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))

describe('the lab shell', () => {
  const slot = (id: string) => createElement('div', { id })
  const props: LabShellProps = {
    title: 'Standardization of a base by titration',
    narrow: false,
    started: true,
    persistent: true,
    mode: 'guided',
    onMode: () => {},
    onStart: () => {},
    onRestart: () => {},
    // The real primer.
    primer: createElement('div', { id: 'primer' }, createElement(Primer, { sections: TITRATION_PRIMER, sources, readFirst: READ_FIRST })),
    guide: slot('guide'),
    bench: (shown) => createElement('div', { id: 'bench', 'data-shown': String(shown) }),
    notebook: slot('notebook'),
    record: slot('record'),
  }
  const shell = (patch: Partial<LabShellProps> = {}) => routed(createElement(LabShell, { ...props, ...patch }))
  const has = (html: string, ids: string[]) => ids.map((id) => html.includes(`id="${id}"`))

  it('has the lab as its heading, under a breadcrumb that links to the list of labs', () => {
    const html = shell()
    expect(html).toMatch(/<nav aria-label="Breadcrumb"[^>]*>.*<a [^>]*href="\/lab"[^>]*>Lab<\/a>.*<\/nav>/s)
    expect(html).toMatch(/<h1 tabindex="-1"[^>]*>Standardization of a base by titration<\/h1>/)
  })

  it('has one tab list of three tabs, Primer, Lab and Record, one of them selected, under the heading, the mode and Start, with a panel for each', () => {
    for (const html of [shell(), shell({ started: false }), shell({ narrow: true }), shell({ narrow: true, started: false })]) {
      expect(count(html, /role="tablist"/g)).toBe(1)
      expect(tabs(html).map((tab) => tab.name)).toEqual([SHELL_TEXT.tabs.primer, SHELL_TEXT.tabs.lab, SHELL_TEXT.tabs.record])
      expect(tabs(html).map((tab) => tab.name)).toEqual(['Primer', 'Lab', 'Record'])
      expect(selectedTab(html)).toHaveLength(1)
      expect(count(html, /role="tabpanel"/g)).toBe(3)
      // Every tab is a button, so it is worked by the keyboard; the arrow keys and the one tab stop are checked in a browser.
      expect(count(html, /<button[^>]*role="tab"/g)).toBe(3)
    }
    const html = shell({ started: false })
    // The list is named by the lab.
    expect(html).toMatch(/<div[^>]*role="tablist"[^>]*aria-label="Standardization of a base by titration"/)
    const order = ['<h1', '<fieldset', `>${SHELL_TEXT.start}</button>`, 'role="tablist"', 'role="tabpanel"'].map((mark) => html.indexOf(mark))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('has in the tab bar, at every width and before and after Start, one link to the periodic table that opens in a new browser tab and says so', () => {
    for (const html of [shell(), shell({ started: false }), shell({ narrow: true })]) {
      const links = [...html.matchAll(/<a [^>]*href="#\/explore\/elements"[^>]*>(.*?)<\/a>/gs)]
      expect(links).toHaveLength(1)
      expect(links[0]![0]).toMatch(/target="_blank"/)
      expect(links[0]![0]).toMatch(/rel="noopener"/)
      expect(links[0]![1]).toContain('Periodic table')
      expect(links[0]![1]).toContain('(opens in a new tab)')
    }
  })

  it('opens on the Primer tab while there is no run, and on the Lab tab when there is one', () => {
    expect([openingTab(false), openingTab(true)]).toEqual(['primer', 'lab'])
    expect(selectedTab(shell({ started: false }))).toEqual(['Primer'])
    expect(selectedTab(shell())).toEqual(['Lab'])
    // In a narrow window too: with a run, the tab that says why there is no bench.
    expect(selectedTab(shell({ narrow: true, started: false }))).toEqual(['Primer'])
    expect(selectedTab(shell({ narrow: true }))).toEqual(['Lab'])
  })

  it('keeps a panel that is not shown mounted, hidden and inert, so that it is in no tab order and is not read out; the one shown is neither', () => {
    const shownOf = (html: string) => panels(html).map(({ tag }) => !tag.includes('hidden=""') && !tag.includes('inert=""'))
    const hiddenOf = (html: string) => panels(html).map(({ tag }) => tag.includes('hidden=""') && tag.includes('inert=""'))
    expect(shownOf(shell())).toEqual([false, true, false])
    expect(hiddenOf(shell())).toEqual([true, false, true])
    expect(shownOf(shell({ started: false }))).toEqual([true, false, false])
    expect(hiddenOf(shell({ started: false }))).toEqual([false, true, true])
    // Mounted all the same, each in its own panel: what was typed or said in one is still there after a visit to another.
    const [primer, lab, record] = panels(shell())
    expect([has(primer!.body, ['primer']), has(lab!.body, ['guide', 'bench', 'notebook']), has(record!.body, ['record'])]).toEqual([[true], [true, true, true], [true]])
    expect(has(primer!.body, ['bench', 'record'])).toEqual([false, false])
    expect(has(lab!.body, ['primer', 'record'])).toEqual([false, false])
  })

  it('takes the panel that is being left out of the layout at once, so that the one shown is in its place when focus and the window are moved', () => {
    // Base UI leaves the panel that is left laid out for one more frame, marked data-ending-style, with the next panel under it:
    // a place measured in that frame is one whole panel too far down the page. That it is so is checked in a browser.
    for (const html of [shell(), shell({ started: false }), shell({ narrow: true })]) {
      expect(panels(html).map(({ tag }) => /class="[^"]* data-ending-style:hidden[ "]/.test(tag))).toEqual([true, true, true])
    }
  })

  it('moves the window, when a tab comes to be shown, back to where that tab was left under the bar, or else to the top of its panel; and on Start puts the bar at the top', () => {
    // tabShift(where the top of the tabs is in the window, how far under the bar the tab was left, whether Start was pressed): how far to scroll.
    // Left some way under the bar: back to that place, wherever the window is now.
    expect([tabShift(-300, 480, false), tabShift(0, 480, false), tabShift(150, 480, false)]).toEqual([180, 480, 630])
    // Not seen yet, or left while the bar was not stuck: from its top where the bar is stuck now, and not moved where it is not.
    expect([tabShift(-300, 0, false), tabShift(150, 0, false)]).toEqual([-300, 0])
    // Start, from above the tabs or from the Lab tab: the bar at the top of the window, the checklist's line and the shelf under it,
    // whatever place was kept for the Lab tab while it had no run.
    expect([tabShift(150, 0, true), tabShift(-300, 0, true), tabShift(-300, 480, true)]).toEqual([150, -300, -300])
  })

  // Before the tabs this case held one order down the page: primer, guide, bench, notebook, record.
  it('names the docked notebook, keeps guide, bench and notebook in that order on the Lab tab, and puts the primer before it and the record after it, each on its own tab', () => {
    const html = shell()
    expect(html).toMatch(/<aside[^>]*aria-label="Lab notebook"[^>]*><div id="notebook">/)
    const order = ['primer', 'guide', 'bench', 'notebook', 'record'].map((id) => html.indexOf(`id="${id}"`))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('leaves out the guide where the lab hands it none', () => {
    const html = shell({ guide: undefined })
    expect(has(html, ['guide', 'bench', 'notebook', 'record'])).toEqual([false, true, true, true])
  })

  it('leaves out the notebook where the lab hands it none: the bench alone, with no docked notebook named and none of the grid that places one', () => {
    const html = shell({ guide: undefined, notebook: undefined })
    expect(has(html, ['guide', 'bench', 'notebook', 'record'])).toEqual([false, true, false, true])
    expect(html).not.toContain('<aside')
    expect(html).not.toContain('lab-grid')
    expect(html).toContain('<div class="lab-page"><div class="lab-bench"><div id="bench" data-shown="true">')
  })

  it("hands the mode switch the lab's own words for its two modes, where the lab has them", () => {
    const html = shell({ modeText: { guided: 'Guided: with hints.', challenge: 'Challenge: without.' } })
    expect(html).toContain('Guided: with hints.')
    expect(html).toContain('Challenge: without.')
    expect(html).not.toContain(escaped(SHELL_TEXT.guided))
  })

  it('tells the bench that its tab is the one shown', () => {
    // That it is told otherwise on another tab is state, and is checked in a browser.
    expect(shell()).toContain('<div id="bench" data-shown="true">')
  })

  // Before the tabs this case held the primer to being an open disclosure before Start.
  it('before Start shows the mode switch and Start above the tabs, and on the Lab tab says that no run has been started and offers the same Start, with no bench and no Restart', () => {
    const html = shell({ started: false })
    expect(html).not.toContain(SHELL_TEXT.restart)
    expect(count(html, /<fieldset/g)).toBe(1)
    expect(has(html, ['primer', 'guide', 'bench', 'notebook', 'record'])).toEqual([true, false, false, false, false])
    expect(html).not.toContain('<aside')
    const [primer, lab, record] = panels(html)
    expect(count(html, new RegExp(`>${SHELL_TEXT.start}</button>`, 'g'))).toBe(2)
    expect(html.split('role="tablist"')[0]).toContain(`>${SHELL_TEXT.start}</button>`)
    expect(lab!.body).toContain(`<p>${SHELL_TEXT.notStarted}</p>`)
    expect(lab!.body).toContain(`>${SHELL_TEXT.start}</button>`)
    expect(primer!.body).not.toContain(SHELL_TEXT.start)
    // The Record tab says that there is nothing to show yet.
    expect(record!.body).toContain(`>${SHELL_TEXT.noRecord}</p>`)
    expect(pressed(record!.body)).toEqual([])
  })

  // Before the tabs this case also held the primer to being a closed disclosure once the lab was started.
  it('after Start shows Restart above the tabs and the bench on the Lab tab, with no Start and neither of the two not-started sentences', () => {
    const html = shell()
    expect(html.split('role="tablist"')[0]).toContain(`>${SHELL_TEXT.restart}</button>`)
    expect(html).not.toContain(SHELL_TEXT.start)
    expect(html).not.toContain(SHELL_TEXT.notStarted)
    expect(html).not.toContain(SHELL_TEXT.noRecord)
    expect(count(html, /<fieldset/g)).toBe(1)
    expect(has(html, ['primer', 'bench'])).toEqual([true, true])
  })

  // Before the tabs the narrow page was the notice, the primer open and the record down one page, with no button at all.
  it('in a narrow window with a run holds the notice on the Lab tab in place of the bench and the record on the Record tab, with nothing that changes a run', () => {
    const html = shell({ narrow: true })
    const [primer, lab, record] = panels(html)
    const notice = lab!.body.match(/<div role="note"[^>]*>(.*?)<\/div>/s)?.[1] ?? ''
    expect(notice).toContain(NARROW_NOTICE.title)
    expect(notice).toContain(NARROW_NOTICE.body)
    expect(notice).toContain('zooming out brings the bench back')
    expect(notice).toContain(NARROW_NOTICE.withRun)
    expect(notice).not.toContain(NARROW_NOTICE.withoutRun)
    expect(has(html, ['primer', 'record', 'guide', 'bench', 'notebook'])).toEqual([true, true, false, false, false])
    expect([has(primer!.body, ['primer']), has(record!.body, ['record'])]).toEqual([[true], [true]])
    for (const excluded of ['<fieldset', '<input', '<aside', '<select', '<textarea']) expect([excluded, html.includes(excluded)]).toEqual([excluded, false])
    expect(html).not.toContain(SHELL_TEXT.restart)
    expect(html).not.toContain(SHELL_TEXT.start)
    // The only buttons are the tabs and the primer's own: its list of topics and the way to the next one.
    expect(pressed(lab!.body)).toEqual([])
    expect(pressed(record!.body)).toEqual([])
    expect(pressed(html)).toEqual(pressed(primer!.body))
    expect(pressed(primer!.body)).toHaveLength(1 + TITRATION_PRIMER.length + 1)
  })

  it('in a narrow window before Start says on the Lab tab where the primer is, offers no Start, and has no record', () => {
    const html = shell({ narrow: true, started: false })
    const [, lab, record] = panels(html)
    expect(has(html, ['primer', 'record'])).toEqual([true, false])
    expect(lab!.body).toContain(NARROW_NOTICE.withoutRun)
    expect(html).not.toContain(NARROW_NOTICE.withRun)
    expect(html).not.toContain(SHELL_TEXT.start)
    expect(html).not.toContain(SHELL_TEXT.notStarted)
    expect(record!.body).toContain(`>${SHELL_TEXT.noRecord}</p>`)
  })

  it('says in the narrow notice where the primer and the record are by the names of their tabs, not as below it', () => {
    expect(NARROW_NOTICE.withoutRun).toContain(`the ${SHELL_TEXT.tabs.primer} tab`)
    expect(NARROW_NOTICE.withRun).toMatch(/the other two tabs/)
    for (const sentence of [NARROW_NOTICE.withRun, NARROW_NOTICE.withoutRun]) expect(sentence).not.toMatch(/[Bb]elow/)
    expect(SHELL_TEXT.notStarted).toMatch(/above/)
  })

  it('says in one status paragraph that progress is not being saved, and nothing of it otherwise', () => {
    for (const narrow of [false, true]) {
      const html = shell({ persistent: false, narrow })
      expect([...html.matchAll(/<p role="status"[^>]*>([^<]*)<\/p>/g)].map((match) => match[1])).toEqual([NOT_SAVING_TEXT])
      expect(shell({ narrow })).not.toContain('role="status"')
      expect(shell({ narrow })).not.toContain(NOT_SAVING_TEXT)
      // Above the tabs, so it is there whichever is shown.
      expect(html.indexOf(NOT_SAVING_TEXT)).toBeLessThan(html.indexOf('role="tablist"'))
    }
  })

  it('says in one status paragraph that a saved run was set aside, on the wide page and the narrow, and nothing of it otherwise', () => {
    for (const narrow of [false, true]) {
      const html = shell({ started: false, setAside: true, narrow })
      expect([...html.matchAll(/<p role="status"[^>]*>([^<]*)<\/p>/g)].map((match) => match[1])).toEqual([escaped(SHELL_TEXT.setAside)])
      expect(shell({ started: false, narrow })).not.toContain('role="status"')
      expect(html.indexOf('role="status"')).toBeLessThan(html.indexOf('role="tablist"'))
    }
    // It says what became of the run and where it can be had, and makes no promise of opening it.
    expect(SHELL_TEXT.setAside).toMatch(/kept/)
    expect(SHELL_TEXT.setAside).toContain('Export my progress')
  })

  it('hands the reason the mode is locked to the mode switch', () => {
    expect(shell({ modeLocked: SHELL_TEXT.modeLocked })).toContain(SHELL_TEXT.modeLocked)
    expect(shell()).not.toContain(SHELL_TEXT.modeLocked)
  })
})

describe('the mode switch', () => {
  const draw = (disabled?: string) => renderToStaticMarkup(createElement(ModeSwitch, { mode: 'challenge', onChange: () => {}, disabled }))
  const inputs = (html: string) => [...html.matchAll(/<input[^>]*>/g)].map((match) => match[0])

  // Until 2026-10-07 the fieldset stood open over the tabs, its legend the visible word "Mode" and its two sentences
  // always on the page. The owner asked for it collapsed, in as little room as it can have: it is now a disclosure,
  // closed until it is opened, whose summary says which mode is in force.
  it('is a disclosure, closed, whose summary names the mode in force, with a finger\'s hit area', () => {
    const html = draw()
    expect(html).toMatch(/^<details[^>]*><summary class="[^"]*\blab-tap\b[^"]*">Mode: <span[^>]*>Challenge<\/span><\/summary>/)
    expect(html.slice(0, html.indexOf('>'))).not.toContain('open')
    expect(renderToStaticMarkup(createElement(ModeSwitch, { mode: 'guided', onChange: () => {} }))).toMatch(/<summary[^>]*>Mode: <span[^>]*>Guided<\/span><\/summary>/)
    expect(SHELL_TEXT.modeName).toEqual({ guided: 'Guided', challenge: 'Challenge' })
    // The name in the summary is the word each mode's sentence begins with, in the shell's words and in a lab's own.
    for (const mode of ['guided', 'challenge'] as const) expect(SHELL_TEXT[mode].startsWith(`${SHELL_TEXT.modeName[mode]}: `), mode).toBe(true)
    // Opened, the area stands on the summary's foot and reaches upward, clear of the first choice under it.
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    expect(css).toMatch(/details\[open\] > summary\.lab-tap::after \{ top: auto; bottom: 0; transform: translateX\(-50%\); \}/)
  })

  it('holds, in the disclosure, a fieldset named Mode with two radio buttons of one group, the mode in force checked', () => {
    const html = draw()
    expect(html).toMatch(/<\/summary><fieldset[^>]*><legend class="sr-only">Mode<\/legend>/)
    expect(html.endsWith('</fieldset></details>')).toBe(true)
    const [guided, challenge, ...rest] = inputs(html)
    expect(rest).toEqual([])
    expect(guided).toMatch(/type="radio"/)
    expect(challenge).toMatch(/type="radio"/)
    expect(guided).toContain('value="guided"')
    expect(challenge).toContain('value="challenge"')
    expect(guided).not.toContain('checked')
    expect(challenge).toContain('checked=""')
    expect(guided!.match(/name="([^"]+)"/)?.[1]).toBe(challenge!.match(/name="([^"]+)"/)?.[1])
    expect(html).not.toContain('disabled')
    expect(html).not.toContain('aria-describedby')
  })

  it('labels each radio button with what its mode does', () => {
    const labels = [...draw().matchAll(/<label[^>]*>(.*?)<\/label>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))
    expect(labels).toEqual([SHELL_TEXT.guided, SHELL_TEXT.challenge])
  })

  it("labels each with the lab's own words where it is handed them", () => {
    const html = renderToStaticMarkup(createElement(ModeSwitch, { mode: 'guided', onChange: () => {}, text: { guided: 'One.', challenge: 'Two.' } }))
    expect([...html.matchAll(/<label[^>]*>(.*?)<\/label>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))).toEqual(['One.', 'Two.'])
  })

  it('locked, disables both and ties the reason to each', () => {
    const html = draw(SHELL_TEXT.modeLocked)
    const reason = html.match(/<p id="([^"]+)"[^>]*>([^<]*)<\/p>/)
    expect(reason?.[2]).toBe(SHELL_TEXT.modeLocked)
    const drawn = inputs(html)
    expect(drawn).toHaveLength(2)
    for (const input of drawn) {
      expect(input).toContain('disabled=""')
      expect(input).toContain(`aria-describedby="${reason?.[1]}"`)
    }
    expect(drawn[1]).toContain('checked=""')
  })
})

// Before the tabs the primer was one native disclosure holding all twelve cards, open before Start and closed after
// it; these cases held that, and the twelve cards in one piece of markup. It is now one topic at a time.
describe('the primer', () => {
  const MODEL = titrationCitations(titrationData, sources)
  /** The primer as it mounts on topic `at`, the first unless told. */
  const draw = (at = 0, { model = false, readFirst = READ_FIRST as readonly string[] } = {}) =>
    renderToStaticMarkup(createElement(Primer, { sections: TITRATION_PRIMER, sources, readFirst, opensAt: at, modelCitations: model ? MODEL : undefined }))
  const html = draw()
  /** Each of the twelve topics, shown. */
  const each = TITRATION_PRIMER.map((_, i) => draw(i))
  const MODEL_SUMMARY = escaped("Sources for this lab's model")
  const cardOf = (drawn: string) => drawn.match(/<section aria-labelledby="[^"]+".*?<\/section>/s)![0]
  const text = (markup: string) => markup.replace(/<[^>]+>/g, '')
  const topics = (drawn: string) => [...drawn.match(/<ol[^>]*>(.*?)<\/ol>/s)![1]!.matchAll(/<li><button([^>]*)>(.*?)<\/button><\/li>/gs)].map(([, tag, body]) => ({ current: tag!.includes('aria-current="true"'), spans: [...body!.matchAll(/<span[^>]*>([^<]*)/g)].map((span) => span[1]) }))
  const marked = (words: string) => escaped(words).replace(/_([A-Za-z]+)/g, '<sub>$1</sub>')
  /** A card's paragraphs as they are drawn: each one's text paragraph, and the equation under it if it has one. */
  const drawnParagraphs = (card: string) => [...card.matchAll(/<div class="grid gap-1"><p class="max-w-\[75ch\][^"]*">(.*?)<\/p>(?:<p class="pl-4 font-medium">(.*?)<\/p>)?<\/div>/gs)].map(([, body, equation]) => ({ body: body!, equation }))

  it('shows one topic at a time, the first when it opens: one card, a section named by its h2, which can take focus, with its Sources control', () => {
    expect(TITRATION_PRIMER).toHaveLength(12)
    each.forEach((drawn, i) => {
      expect([...drawn.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((match) => match[1])).toEqual([escaped(TITRATION_PRIMER[i]!.heading)])
      expect(count(drawn, /<section aria-labelledby=/g)).toBe(1)
      const [, labelledBy] = /<section aria-labelledby="([^"]+)"/.exec(drawn)!
      // Changing topic moves focus to this heading (in a browser); its place in the primer is its description.
      const [h2, describedBy] = new RegExp(`<h2 id="${labelledBy}" tabindex="-1" aria-describedby="([^"]+)"`).exec(drawn)!
      expect(h2).toBeDefined()
      expect(text(new RegExp(`<p id="${describedBy}"[^>]*>(.*?)</p>`).exec(drawn)![1]!)).toContain(PRIMER_TEXT.place(i + 1, 12))
      expect(count(cardOf(drawn), /<summary[^>]*>Sources<\/summary>/g)).toBe(1)
      // No disclosure but the card's own Sources.
      expect(count(drawn, /<details/g)).toBe(1)
      expect(drawn).not.toContain('<details open')
    })
  })

  it('says where the topic shown stands, as "Topic 7 of 12"', () => {
    expect(PRIMER_TEXT.place(7, 12)).toBe('Topic 7 of 12')
    expect(cardOf(each[6]!)).toContain('>Topic 7 of 12')
    expect(cardOf(html)).toContain('>Topic 1 of 12<')
    expect(cardOf(each[11]!)).toContain('>Topic 12 of 12<')
  })

  it('lists the twelve topics in order in a navigation named Topics, numbered, the one shown marked as current in more than colour', () => {
    expect(count(html, /<nav aria-label="Topics"/g)).toBe(1)
    each.forEach((drawn, i) => {
      const listed = topics(drawn)
      expect(listed.map(({ spans }) => spans.slice(0, 2))).toEqual(TITRATION_PRIMER.map((section, n) => [`${n + 1}.`, escaped(section.heading)]))
      expect(listed.map(({ current }) => current)).toEqual(TITRATION_PRIMER.map((_, n) => n === i))
    })
    // aria-current for a screen reader; for the eye a bar down the side and a heavier weight as well as the tint.
    expect(html).toMatch(/<button type="button" aria-current="true" class="[^"]*aria-\[current\]:border-foreground[^"]*aria-\[current\]:font-medium/)
  })

  it('puts the list behind a button named Topics that says whether the list is out and which list it is; lab.css shows the button or the list by the width of the primer', () => {
    const [button, controls] = /<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>(?:.*?)<\/button>/s.exec(html)!
    expect(text(button!)).toBe(PRIMER_TEXT.topics)
    expect(button).toContain('primer-topics-button')
    expect(html).toContain(`<ol id="${controls}" class="primer-topics `)
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    // Narrow: the list is displayed only while the button has it out. Wide: always, and the button not at all.
    expect(css).toContain('.primer-topics { display: none;')
    expect(css).toContain('.primer-topics-listed { display: grid; }')
    expect(css).toMatch(/@container primer \(min-width: 46rem\) \{[^@]*\.primer-topics-button \{ display: none; \} \.primer-topics \{ display: grid;/)
    expect(css.indexOf('.primer-topics-listed {')).toBeGreaterThan(css.indexOf('.primer-topics {'))
  })

  it('gives a control drawn smaller than a finger a hit area of 44 px that draws nothing and moves nothing: lab.css lays it over the control', () => {
    const css = labCss.replace(/\/\*.*?\*\//gs, '').replace(/\s+/g, ' ')
    // The class, and every disclosure of a lab page: Hazards and Sources among them.
    expect(css).toContain('.lab-tap, .lab-panel summary { position: relative; }')
    const [, area] = /\.lab-tap::after, \.lab-panel summary::after \{([^}]*)\}/.exec(css)!
    expect(area).toContain("content: '';")
    expect(area).toContain('position: absolute;')
    // 2.75rem is 44 px, each way; a control that is larger keeps its own size.
    expect(area).toContain('width: max(100%, 2.75rem);')
    expect(area).toContain('height: max(100%, 2.75rem);')
    // Nothing is drawn and nothing takes room: no colour, no border, no size on the control itself.
    expect(area).not.toMatch(/background|border|outline|shadow/)
    expect(css).not.toMatch(/\.lab-tap \{[^}]*(height|width|padding|margin)/)
    // The list's button and the two ways on carry the class, in the primer and wherever else the paged list is used.
    const paged = draw(1)
    const tagged = [...paged.matchAll(/<button[^>]*class="[^"]*\blab-tap\b[^"]*"[^>]*>(.*?)<\/button>/gs)].map((match) => text(match[1]!).replace(/[←→]/g, '').trim())
    expect(tagged).toEqual([PRIMER_TEXT.topics, PRIMER_TEXT.previous(TITRATION_PRIMER[0]!.heading), PRIMER_TEXT.next(TITRATION_PRIMER[2]!.heading)])
  })

  it('marks with the words "Read first" the four topics the first paragraph says to read first, in the list and on the card, and no other', () => {
    expect(PRIMER_TEXT.readFirst).toBe('Read first')
    const first = TITRATION_PRIMER[0]!.paragraphs[0]!.text
    const named = TITRATION_PRIMER.filter((section) => first.includes(section.heading)).map((section) => section.id)
    expect(named).toHaveLength(4)
    expect([...READ_FIRST].sort()).toEqual([...named].sort())
    const inList = topics(html).map(({ spans }) => spans.includes(PRIMER_TEXT.readFirst))
    expect(TITRATION_PRIMER.filter((_, i) => inList[i]).map((section) => section.id)).toEqual(named)
    const onCard = each.map((drawn) => cardOf(drawn).split('<h2')[0]!.includes(`>${PRIMER_TEXT.readFirst}<`))
    expect(TITRATION_PRIMER.filter((_, i) => onCard[i]).map((section) => section.id)).toEqual(named)
    // The mark is the shell's to draw and the lab's to give: a primer handed no list marks nothing.
    expect(draw(6, { readFirst: [] })).not.toContain(PRIMER_TEXT.readFirst)
  })

  it('offers Previous and Next, each named by the topic it goes to, in the order of the cards; at the first topic there is no Previous and at the last no Next', () => {
    const pager = (drawn: string) => pressed(drawn.split('</section>')[1]!).map((name) => name.replace(/[←→]/g, '').trim())
    each.forEach((drawn, i) => {
      const before = TITRATION_PRIMER[i - 1]
      const after = TITRATION_PRIMER[i + 1]
      expect(pager(drawn)).toEqual([...(before ? [`Previous: ${escaped(before.heading)}`] : []), ...(after ? [`Next: ${escaped(after.heading)}`] : [])])
    })
    expect(pager(html)).toEqual(['Next: Molarity'])
    expect(pager(each[6]!)).toEqual(['Previous: Why phenolphthalein', 'Next: The calculation'])
    expect(pager(each[11]!)).toEqual(['Previous: How closely the trials agree'])
    // The arrows are for the eye only.
    expect(each[6]).toContain('<span aria-hidden="true">←</span>')
    expect(each[6]).toContain('<span aria-hidden="true">→</span>')
  })

  it('lists under each card every source its paragraphs cite, once', () => {
    TITRATION_PRIMER.forEach((section, i) => {
      const cited = [...new Set(section.paragraphs.flatMap((paragraph) => paragraph.sourceIds))]
      expect(cited.length).toBeGreaterThan(0)
      expect(hrefs(cardOf(each[i]!))).toEqual(cited.map((id) => escaped(sourceUrl(id))))
    })
  })

  it('shows every paragraph and equation of each card with not a word added or dropped but the label at its head, with M_NaOH as M and a subscript', () => {
    const calculation = each[TITRATION_PRIMER.findIndex((section) => section.id === 'calculation')]!
    expect(calculation).toContain('M<sub>NaOH</sub> = M<sub>HCl</sub> × V<sub>HCl</sub> ÷ V<sub>NaOH</sub>')
    TITRATION_PRIMER.forEach((section, i) => {
      const card = cardOf(each[i]!)
      expect(card).not.toContain('M_')
      expect(card).not.toContain('V_')
      const drawn = drawnParagraphs(card)
      expect(drawn).toHaveLength(section.paragraphs.length)
      section.paragraphs.forEach(({ label, text: words, equation }, n) => {
        // The label, a full stop and a space, then the text as it is stored.
        expect(text(drawn[n]!.body)).toBe(`${escaped(label!)}. ${escaped(words).replaceAll('_', '')}`)
        expect(drawn[n]!.body.replace(/<\/?(strong|span)[^>]*>/g, '')).toBe(`${escaped(label!)}. ${marked(words)}`)
        expect(drawn[n]!.equation).toBe(equation === undefined ? undefined : marked(equation))
      })
    })
    const paragraphs = TITRATION_PRIMER.flatMap((section) => section.paragraphs)
    expect(paragraphs.filter((paragraph) => paragraph.equation !== undefined).length).toBeGreaterThan(1)
    expect(each.reduce((n, drawn) => n + count(drawn, /<sub>/g), 0)).toBe(paragraphs.reduce((n, p) => n + count(`${p.text} ${p.equation ?? ''}`, /_[A-Za-z]+/g), 0))
  })

  it("draws bold the label at the head of each paragraph and each term it defines, once, where the term first stands as a word; and nothing else", () => {
    TITRATION_PRIMER.forEach((section, i) => {
      const drawn = drawnParagraphs(cardOf(each[i]!))
      section.paragraphs.forEach(({ label, terms = [], text: words }, n) => {
        const bold = [...drawn[n]!.body.matchAll(/<strong class="font-semibold">(.*?)<\/strong>/g)].map((match) => match[1])
        const inOrder = [...terms].sort((a, b) => termIndex(words, a) - termIndex(words, b))
        expect([section.id, n, bold]).toEqual([section.id, n, [`${escaped(label!)}.`, ...inOrder]])
        expect(drawn[n]!.body.startsWith(`<strong class="font-semibold">${escaped(label!)}.</strong> `)).toBe(true)
      })
    })
    // "A mole is", not the "moles" before it.
    expect(each[1]).toContain('in moles. A <strong class="font-semibold">mole</strong> is a fixed number')
    expect(each[6]).toContain('That volume is called the <strong class="font-semibold">titre</strong>.')
  })

  it("sets off each sentence on the simulation's own rules in a block inside its paragraph, with a rule down its side as well as a tint, sentences that adjoin as one block, and no word added", () => {
    const blocks = (body: string) => [...body.matchAll(/<span class="([^"]*)">(.*?)<\/span>/g)].map(([, classes, inner]) => ({ classes: classes!, words: text(inner!) }))
    let total = 0
    TITRATION_PRIMER.forEach((section, i) => {
      const drawn = drawnParagraphs(cardOf(each[i]!))
      section.paragraphs.forEach(({ labRules = [] }, n) => {
        const setOff = blocks(drawn[n]!.body)
        total += setOff.length
        // Every stored sentence is in a block, whole, and a block holds nothing but stored sentences.
        expect([section.id, n, setOff.map(({ words }) => words).join(' ')]).toEqual([section.id, n, labRules.map(escaped).join(' ')])
        for (const { classes } of setOff) expect(classes).toMatch(/\bblock\b.*\bborder-l-4\b.*\bbg-muted/)
      })
    })
    // Eleven sentences in eight paragraphs, in nine blocks: the card on the three mistakes has four in two.
    expect(total).toBe(9)
    // The card on the three mistakes: three sentences that adjoin are one block, the fourth another, and what lies between is not set off.
    const mistakes = blocks(drawnParagraphs(cardOf(each[9]!))[3]!.body).map(({ words }) => words)
    expect(mistakes).toEqual([
      'This lab makes each of them cost more than it does at a real bench. A real burette tip holds less air than the bubble in this lab. And a real burette that was not conditioned is less diluted each time it is refilled; in this lab it stays diluted until you condition it.',
      'So a trial with one of these mistakes in it does not count toward the three trials this lab asks for, even when its result is close.',
    ])
    expect(each[9]).toContain('</span> Even so, a mistake does not always show in the result: two of them can push it in opposite directions and cancel. <span')
  })

  it('cuts a paragraph into pieces that join back into its text, each marked as a term, as part of a set-off sentence, as both or as neither', () => {
    for (const paragraph of TITRATION_PRIMER.flatMap((section) => section.paragraphs)) {
      const cut = pieces(paragraph)
      expect(cut.map((piece) => piece.text).join('')).toBe(paragraph.text)
      expect(cut.filter((piece) => piece.term).map((piece) => piece.text).sort()).toEqual([...(paragraph.terms ?? [])].sort())
      expect(cut.every((piece) => piece.text !== '')).toBe(true)
    }
    expect(pieces({ text: 'One. Here two. Here three. Four.', terms: ['two'], labRules: ['Here two.', 'Here three.'] })).toEqual([
      { text: 'One. ', term: false, labRule: false },
      { text: 'Here ', term: false, labRule: true },
      { text: 'two', term: true, labRule: true },
      { text: '.', term: false, labRule: true },
      // The space between two set-off sentences goes with them.
      { text: ' ', term: false, labRule: true },
      { text: 'Here three.', term: false, labRule: true },
      { text: ' Four.', term: false, labRule: false },
    ])
    expect(pieces({ text: 'Plain.' })).toEqual([{ text: 'Plain.', term: false, labRule: false }])
    // What is not in the text is not drawn; a test of the primer holds every stored term and sentence to being there.
    expect(pieces({ text: 'Plain.', terms: ['absent'], labRules: ['Not here.'] })).toEqual([{ text: 'Plain.', term: false, labRule: false }])
  })

  it('shows nothing of what a paragraph rests on, which is kept for review', () => {
    for (const drawn of each) expect(drawn).not.toContain('This lab:')
  })

  it('gives every link an https address and a new tab', () => {
    const links = TITRATION_PRIMER.flatMap((_, i) => [...draw(i, { model: true }).matchAll(/<a [^>]*>/g)].map((match) => match[0]))
    expect(links.length).toBeGreaterThan(12 * MODEL.length)
    for (const link of links) {
      expect(link).toMatch(/href="https:\/\//)
      expect(link).toContain('target="_blank"')
    }
  })

  it("lists each source of the lab's model once, in a disclosure of its own under the card and the way on, whichever topic is shown, when given them", () => {
    expect(html).not.toContain(MODEL_SUMMARY)
    expect(MODEL.length).toBeGreaterThan(8)
    expect(new Set(MODEL.map((citation) => citation.source.id)).size).toBe(MODEL.length)
    for (const at of [0, 6, 11]) {
      const withModel = draw(at, { model: true })
      expect(count(withModel, /<details/g)).toBe(2)
      const [above, foot, ...rest] = withModel.split(new RegExp(`<details><summary[^>]*>${MODEL_SUMMARY}</summary>`))
      expect(rest).toEqual([])
      expect(count(above!, /<h2/g)).toBe(1)
      expect(above).toContain(at === 0 ? 'Next: ' : 'Previous: ')
      expect(hrefs(foot!)).toEqual(MODEL.map((citation) => escaped(citation.source.url)))
      for (const { source, covers } of MODEL) {
        expect(count(foot!, new RegExp(`>${escaped(source.citation).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`, 'g'))).toBe(1)
        expect(foot).toContain(`${escaped(covers.join(', '))}: `)
      }
    }
  })

  it('splits text at each underscore into what stands on the line and what goes below it', () => {
    expect(subscriptParts('M_NaOH × V_NaOH = 1')).toEqual([
      { text: 'M', sub: false },
      { text: 'NaOH', sub: true },
      { text: ' × V', sub: false },
      { text: 'NaOH', sub: true },
      { text: ' = 1', sub: false },
    ])
    expect(subscriptParts('No subscript here.')).toEqual([{ text: 'No subscript here.', sub: false }])
  })
})

describe('the hazards of a bottle', () => {
  const { hcl, naoh, indicator } = titrationData.bottles
  const draw = ({ classifiedAs, hazards }: typeof hcl) => renderToStaticMarkup(createElement(Hazards, { classifiedAs, hazards, sources }))
  const headings = (html: string) => [...html.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map((match) => match[1])
  const statements = (html: string) => [...(html.match(/<ul[^>]*>(.*?)<\/ul>/s)?.[1] ?? '').matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((match) => match[1])

  it('is a closed disclosure named Hazards', () => {
    expect(draw(hcl)).toMatch(/^<details><summary[^>]*>Hazards<\/summary>/)
  })

  it('on the acid shows what is classified, then under that heading its signal word and each statement whole and in the stored order', () => {
    const html = draw(hcl)
    expect(html).toContain('Signal word: Danger')
    expect(headings(html)).toEqual([escaped(hcl.classifiedAs), 'At the strength used here'])
    expect(headings(html)[0]).not.toContain('pure substance')
    // The signal word belongs to the classification the heading names, not to the solution on the bench: it is
    // read after that heading and before the heading of the note on the bench's strength.
    const [classified, signalWord, list, strength] = [escaped(hcl.classifiedAs), 'Signal word', '<ul', 'At the strength used here'].map((part) => html.indexOf(part))
    expect([classified, signalWord, list, strength]).toEqual([...[classified, signalWord, list, strength]].sort((a, b) => a! - b!))
    expect(classified).toBeGreaterThan(-1)
    const drawn = statements(html)
    expect(drawn).toEqual(hcl.hazards.statements)
    expect(drawn).toHaveLength(3)
    expect(drawn[0]).toMatch(/^H314\+H318: /)
    expect(drawn[1]).toMatch(/^H332\+H302: /)
  })

  it('on the acid shows the note on the strength used and three sources: the classification, and the two under the note', () => {
    const html = draw(hcl)
    // The note is three short paragraphs (spec 5.2), each drawn whole, between its heading and the sources.
    const paragraphs = hcl.hazards.note.value.split('\n\n')
    expect(paragraphs).toHaveLength(3)
    for (const paragraph of paragraphs) expect(html).toContain(`<p>${escaped(paragraph)}</p>`)
    expect(html.indexOf('At the strength used here')).toBeLessThan(html.indexOf(escaped(paragraphs[0]!)))
    expect(html.indexOf(escaped(paragraphs[2]!))).toBeLessThan(html.indexOf('>Sources</summary>'))
    expect(hrefs(html)).toEqual(['flinn-sds-395', 'flinn-sds-395.2', 'flinn-sds-395.3'].map(sourceUrl))
    expect(hcl.hazards.note.alsoSourceId).toBe('flinn-sds-395.3')
  })

  it('on the base shows two sources, and its heading as stored', () => {
    const html = draw(naoh)
    expect(hrefs(html)).toEqual(['flinn-sds-734', 'flinn-sds-735.2'].map(sourceUrl))
    expect(statements(html)).toEqual(naoh.hazards.statements)
    expect(headings(html)[0]).toBe(escaped(naoh.classifiedAs))
    expect(headings(html)[0]).toContain('pure substance')
  })

  it('on the indicator shows its heading as stored', () => {
    const html = draw(indicator)
    expect(statements(html)).toEqual(indicator.hazards.statements)
    expect(headings(html)[0]).toBe(escaped(indicator.classifiedAs))
    expect(headings(html)[0]).toContain('pure substance')
    for (const paragraph of indicator.hazards.note.value.split('\n\n')) expect(html).toContain(`<p>${escaped(paragraph)}</p>`)
  })

  it('draws a line that begins with two codes as it is stored, whatever the bottle', () => {
    const hazards = { ...naoh.hazards, statements: ['H999+H998+H997: Third, second, first', 'H001: Before it in a sorted list'] }
    expect(statements(draw({ ...naoh, hazards }))).toEqual(hazards.statements)
  })

  it('on a bottle whose sheet lists no statement says so in a sentence, with no signal word line and no empty list, and still shows the heading and the note', () => {
    const caco3 = aqueousData.reagents.find((r) => r.id === 'caco3')!
    expect(caco3.hazards).toMatchObject({ signalWord: 'None', statements: [] })
    const html = renderToStaticMarkup(createElement(Hazards, { classifiedAs: caco3.classifiedAs!, hazards: caco3.hazards, sources, solid: true }))
    expect(headings(html)).toEqual([escaped(caco3.classifiedAs!), 'As it is used here'])
    expect(html).toContain(`<p>${HAZARDS_TEXT.none}</p>`)
    expect(html).not.toContain('Signal word:')
    expect(html).not.toContain('<ul class="grid list-disc')
    for (const paragraph of caco3.hazards.note.value.split('\n\n')) expect(html).toContain(`<p>${escaped(paragraph)}</p>`)
    expect(hrefs(html)).toEqual([sourceUrl('flinn-sds-195')])
  })

  it('heads the note of a solid or a metal "As it is used here", and of a solution "At the strength used here"', () => {
    const [mg, hcl3] = ['mg', 'hcl-3m'].map((id) => aqueousData.reagents.find((r) => r.id === id)!)
    const of = (r: typeof mg, solid: boolean) => renderToStaticMarkup(createElement(Hazards, { classifiedAs: r!.classifiedAs!, hazards: r!.hazards, sources, solid }))
    expect(headings(of(mg, true))[1]).toBe('As it is used here')
    expect(of(mg, true)).toContain('Signal word: Danger')
    expect(of(mg, true)).not.toContain('strength used here')
    expect(headings(of(hcl3, false))[1]).toBe('At the strength used here')
  })
})

describe("the note under a bottle's hazards", () => {
  const heading = '<h4 class="font-medium">At the strength used here</h4>'
  const noteOf = (html: string, at = heading) => html.slice(html.indexOf(at) + at.length, html.indexOf('<details>', 1))

  it('is one paragraph where its text holds no blank line', () => {
    const { hazards } = titrationData.bottles.naoh
    const one = { ...hazards, note: { ...hazards.note, value: 'A dilute solution. It irritates the eyes.' } }
    const html = renderToStaticMarkup(createElement(Hazards, { classifiedAs: 'Hazards of a solution', hazards: one, sources }))
    expect(html).toContain('</h4><p>A dilute solution. It irritates the eyes.</p><details>')
  })

  it('is drawn as its three short paragraphs on every bottle of the titration lab and of the aqueous reactions lab, whose notes took that form on 2026-10-18', () => {
    const older = [...Object.values(titrationData.bottles).map((bottle) => ({ ...bottle, solid: false })), ...aqueousData.reagents.map((r) => ({ classifiedAs: r.classifiedAs ?? r.name, hazards: r.hazards, solid: r.form !== 'solution' }))]
    expect(older).toHaveLength(3 + aqueousData.reagents.length)
    for (const { classifiedAs, hazards, solid } of older) {
      const paragraphs = hazards.note.value.split('\n\n')
      expect(paragraphs).toHaveLength(3)
      expect(hazards.note.moreSourceIds).toBeUndefined()
      const html = renderToStaticMarkup(createElement(Hazards, { classifiedAs, hazards, sources, solid }))
      expect(noteOf(html, solid ? '<h4 class="font-medium">As it is used here</h4>' : heading)).toBe(paragraphs.map((paragraph) => `<p>${escaped(paragraph)}</p>`).join(''))
    }
  })

  it('is drawn as short paragraphs where its text holds blank lines: the three of each bottle of the flame test lab', () => {
    for (const salt of flameData.salts) {
      const paragraphs = salt.hazards.note.value.split('\n\n')
      expect(paragraphs).toHaveLength(3)
      const html = renderToStaticMarkup(createElement(Hazards, { classifiedAs: salt.classifiedAs, hazards: salt.hazards, sources }))
      expect(noteOf(html)).toBe(paragraphs.map((paragraph) => `<p>${escaped(paragraph)}</p>`).join(''))
      expect(html).not.toContain('\n')
    }
  })

  it('lists every source of the note: the third and any after it too', () => {
    const [barium, , , potassium] = flameData.salts
    const { hazards } = barium!
    expect(hazards.note.moreSourceIds).toEqual(['fisher-sds-bacl2-dihydrate', 'noaa-cameo-19847'])
    const html = renderToStaticMarkup(createElement(Hazards, { classifiedAs: barium!.classifiedAs, hazards, sources }))
    expect(hrefs(html)).toEqual([hazards.sourceId, hazards.note.sourceId, hazards.note.alsoSourceId!, ...hazards.note.moreSourceIds!].map((id) => escaped(sourceUrl(id))))
    // Each of the note's sources is listed under the note's heading.
    expect(count(html, /<span class="font-medium">At the strength used here: <\/span>/g)).toBe(4)
    // A note that rests on two lists two, as the older labs' do.
    const two = renderToStaticMarkup(createElement(Hazards, { classifiedAs: potassium!.classifiedAs, hazards: potassium!.hazards, sources }))
    expect(potassium!.hazards.note.moreSourceIds).toBeUndefined()
    expect(hrefs(two)).toEqual([potassium!.hazards.sourceId, potassium!.hazards.note.sourceId, potassium!.hazards.note.alsoSourceId!].map((id) => escaped(sourceUrl(id))))
  })
})

describe('labProgress', () => {
  const [activity] = ACTIVITIES
  const schema = z.strictObject({ status: z.string(), n: z.number() })
  /** A memory store that counts what is written to it. */
  const counting = () => {
    const store = createMemoryStore()
    const written: string[] = []
    const counted: KeyValueStore = {
      ...store,
      get length() {
        return store.length
      },
      setItem: (key, value) => {
        written.push(key)
        store.setItem(key, value)
      },
    }
    return { store: counted, written }
  }

  it('loads nothing before any save, and writes nothing by loading', () => {
    const { store, written } = counting()
    expect(labProgress(store, activity, schema).load()).toBeNull()
    expect(written).toEqual([])
    expect(store.length).toBe(0)
  })

  it("saves once for each save, under the activity's entry and with its version, and loads what was saved", () => {
    const { store, written } = counting()
    const progress = labProgress(store, activity, schema)
    const first = { status: 'in-progress', n: 1 }
    expect(progress.save(first)).toBe(true)
    expect(written).toEqual([storageKey(activity.entry)])
    expect(JSON.parse(store.getItem(storageKey(activity.entry))!)).toEqual({ version: activity.version, data: first })
    expect(progress.load()).toEqual(first)
    const second = { status: 'completed', n: 2 }
    progress.save(second)
    expect(written).toHaveLength(2)
    expect(labProgress(store, activity, schema).load()).toEqual(second)
  })

  describe('a write of the entry by another tab', () => {
    const key = storageKey(activity.entry)
    const theirs = { status: 'in-progress', n: 7 }
    const raw = JSON.stringify({ version: activity.version, data: theirs })

    it('is taken: the record the other tab saved is what this tab shows next', () => {
      const { store, written } = counting()
      labProgress(store, activity, schema).save({ status: 'in-progress', n: 1 })
      store.setItem(key, raw)
      written.length = 0
      expect(writtenElsewhere(store, activity, schema, raw)).toEqual(theirs)
      // Taking it writes nothing.
      expect(written).toEqual([])
    })

    it('is taken as "not started" where the other tab removed the entry', () => {
      const { store } = counting()
      expect(writtenElsewhere(store, activity, schema, null)).toBeNull()
    })

    it('is left alone, and left in place, where this version cannot read it: it may be a newer version that wrote it', () => {
      const { store, written } = counting()
      for (const other of [JSON.stringify({ version: activity.version + 1, data: theirs }), JSON.stringify({ version: activity.version, data: { other: 1 } }), '{not json']) {
        store.setItem(key, other)
        written.length = 0
        expect(writtenElsewhere(store, activity, schema, other)).toBeUndefined()
        expect(written).toEqual([])
        expect(store.getItem(key)).toBe(other)
        expect(store.length).toBe(1)
      }
    })

    it('is left alone where this tab\'s own store does not hold it: a browser that is not saving shows no stored progress', () => {
      const { store } = counting()
      expect(writtenElsewhere(store, activity, schema, raw)).toBeUndefined()
      labProgress(store, activity, schema).save({ status: 'in-progress', n: 1 })
      expect(writtenElsewhere(store, activity, schema, raw)).toBeUndefined()
      expect(writtenElsewhere(store, activity, schema, null)).toBeUndefined()
    })
  })

  it('sets aside what does not fit the schema, as loadEntry does', () => {
    const { store } = counting()
    labProgress(store, activity, z.strictObject({ other: z.number() })).save({ other: 1 })
    expect(labProgress(store, activity, schema).load()).toBeNull()
  })
})

describe('the station a lab with stations opens on', () => {
  it('is the first one begun and not done, whatever word a lab has for begun; where none is, the first not done; and the first of all once every one is done', () => {
    expect(openingStation(['not-started', 'not-started', 'not-started'])).toBe(0)
    expect(openingStation(['done', 'done', 'not-started'])).toBe(2)
    // The aqueous reactions lab's two words for a station begun, and the flame test lab's three.
    expect(openingStation(['done', 'not-started', 'started', 'observed'])).toBe(2)
    expect(openingStation(['done', 'not-started', 'done', 'observed'])).toBe(3)
    expect(openingStation(['done', 'not-counted', 'started'])).toBe(1)
    expect(openingStation(['done', 'not-started', 'not-correct'])).toBe(2)
    expect(openingStation(['done', 'done', 'done'])).toBe(0)
  })
})

describe('the tube that is explored, with a second liquid lying on the first', () => {
  const draw = (layers: TubeLayers, sections: readonly ['upper' | 'lower' | 'liquid', number, number][], words: LayerWords = { liquid: sections.length === 2 ? 'Bottom layer' : 'Liquid', above: 'Top layer', solid: 'Solid' }) =>
    renderToStaticMarkup(
      createElement(Tube<'upper' | 'lower' | 'liquid'>, {
        name: 'A tube',
        describedBy: 'how',
        height: 300,
        layers,
        words,
        sections: sections.map(([part, top, bottom]) => ({ part, top, bottom, name: part, looked: false })),
        seen: () => 'never in the markup',
        onLook: () => undefined,
      }),
    )
  const grey = liquidHex('colourless')
  const lines = (html: string) => [...html.matchAll(/<line [^>]*>/g)].map((match) => match[0])
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)

  it('draws one liquid as before: one band, the one faint line at its surface, one bracket', () => {
    const html = draw({ liquid: { hex: grey, surface: 70 }, solid: null }, [['liquid', 58, 274]])
    expect(count(html, /<rect x="48"/g)).toBe(1)
    expect(lines(html)).toEqual(['<line x1="48" x2="128" y1="70" y2="70" stroke="#3f3f46" stroke-opacity="0.5" stroke-width="1.5">'])
    expect(count(html, /<text /g)).toBe(1)
    expect(html).toContain('>Liquid</text>')
    expect(html).not.toContain('Top layer')
  })

  it('draws two liquids as two bands, each as tall as it is given, with a whole dark line between them and a bracket and a word for each', () => {
    const html = draw({ liquid: { hex: grey, surface: 138 }, above: { hex: grey, surface: 70 }, solid: null }, [['upper', 58, 138], ['lower', 138, 274]])
    // The lower band from where the two meet down, and the upper from its own surface down to there: 68 units over 136.
    expect(html).toContain(`<rect x="48" y="138" width="80" height="162" fill="${grey}">`)
    expect(html).toContain(`<rect x="48" y="70" width="80" height="68" fill="${grey}">`)
    expect(lines(html)).toEqual([
      '<line x1="48" x2="128" y1="70" y2="70" stroke="#3f3f46" stroke-opacity="0.5" stroke-width="1.5">',
      // The line between the two: the whole ink, with no opacity taken off it, and heavier than a surface's.
      '<line x1="48" x2="128" y1="138" y2="138" stroke="#3f3f46" stroke-width="2">',
    ])
    expect([...html.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((match) => match[1])).toEqual(['Top layer', 'Bottom layer'])
    // Each layer is a button of its own to look at, and nothing of what is seen is in the page.
    expect([...html.matchAll(/data-part="(\w+)"/g)].map((match) => match[1])).toEqual(['upper', 'lower'])
    expect(html).not.toContain('never in the markup')
  })

  it('keeps that line plain to see on a liquid with no colour and on a pale yellow one, on a card that is white in both themes: 7 to 1 or more', () => {
    expect(LAYER_LINE).toEqual({ stroke: '#3f3f46', width: 2 })
    // Two liquids with no colour are two bands of one grey: the line is all that sets them apart in the drawing.
    expect(contrast(LAYER_LINE.stroke, grey)).toBeGreaterThanOrEqual(7)
    expect(contrast(LAYER_LINE.stroke, liquidHex('pale yellow'))).toBeGreaterThanOrEqual(7)
    expect([contrast(LAYER_LINE.stroke, grey), contrast(LAYER_LINE.stroke, liquidHex('pale yellow'))].map((ratio) => ratio.toFixed(1))).toEqual(['8.9', '9.3'])
  })

  it('draws no bracket for a layer whose word is null, and the picture and the parts to look at all the same', () => {
    const two: TubeLayers = { liquid: { hex: grey, surface: 138 }, above: { hex: grey, surface: 70 }, solid: { hex: '#ffffff', top: 232 } }
    const sections: ['upper' | 'lower', number, number][] = [['upper', 58, 138], ['lower', 138, 274]]
    const words = (html: string) => [...html.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((match) => match[1])
    const whole = draw(two, sections)
    expect(words(whole)).toEqual(['Top layer', 'Bottom layer', 'Solid'])
    const none = draw(two, sections, { liquid: null, above: null, solid: null })
    expect(words(none)).toEqual([])
    expect(draw(two, sections, { liquid: null, above: 'Top layer', solid: null })).toContain('>Top layer</text>')
    expect(words(draw(two, sections, { liquid: 'Bottom layer', above: null, solid: null }))).toEqual(['Bottom layer'])
    expect(words(draw(two, sections, { liquid: null, above: null, solid: 'Solid' }))).toEqual(['Solid'])
    // Taking the brackets away takes nothing else: the same picture and the same buttons, less each bracket's group.
    const bracket = /<g><path d="M 136 [^"]*" fill="none" stroke="#3f3f46" stroke-width="1.5" stroke-linecap="round"><\/path><text [^>]*>[^<]*<\/text><\/g>/g
    expect(count(whole, bracket)).toBe(3)
    expect(whole.replace(bracket, '')).toBe(none)
  })

  it('draws no second liquid in a tube with no first', () => {
    const html = draw({ liquid: null, above: { hex: grey, surface: 70 }, solid: null }, [])
    expect(count(html, /<rect x="48"/g)).toBe(0)
    expect(lines(html)).toEqual([])
  })
})
