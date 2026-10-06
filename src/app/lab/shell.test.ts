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
import { TITRATION_PRIMER } from '@/chem-data/titration/primer'
import { Hazards } from './Hazards'
import { LabShell, type LabShellProps } from './LabShell'
import { ModeSwitch } from './ModeSwitch'
import { Primer, subscriptParts } from './Primer'
import { NARROW_NOTICE, SHELL_TEXT } from './shellText'
import { labProgress, writtenElsewhere } from './useLabProgress'

// The markup the shell puts its wording and its slots in. Focus, keys, the confirm on Restart and the layout at
// each width are checked in a browser.

const routed = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
// React escapes these five in text and attributes.
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const sourceUrl = (id: string) => sources.find((source) => source.id === id)!.url
const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((match) => match[1])

const PRIMER_OPEN = `<details open=""><summary[^>]*>${SHELL_TEXT.primer}</summary>`
const PRIMER_CLOSED = `<details><summary[^>]*>${SHELL_TEXT.primer}</summary>`

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
    // The real primer, with the `open` the shell hands it.
    primer: (open) => createElement('div', { id: 'primer' }, createElement(Primer, { sections: TITRATION_PRIMER, sources, open })),
    guide: slot('guide'),
    bench: slot('bench'),
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

  it('names the docked notebook, and keeps primer, guide, bench, notebook and record in that order', () => {
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

  it('before Start shows Start, the primer open and the mode switch, with no bench and no Restart', () => {
    const html = shell({ started: false })
    expect(html).toContain(`>${SHELL_TEXT.start}</button>`)
    expect(html).not.toContain(SHELL_TEXT.restart)
    expect(html).toMatch(new RegExp(PRIMER_OPEN))
    expect(count(html, /<fieldset/g)).toBe(1)
    expect(has(html, ['primer', 'guide', 'bench', 'notebook', 'record'])).toEqual([true, false, false, false, false])
    expect(html).not.toContain('<aside')
  })

  it('after Start shows Restart and the bench, with no Start and the primer closed', () => {
    const html = shell()
    expect(html).toContain(`>${SHELL_TEXT.restart}</button>`)
    expect(html).not.toContain(SHELL_TEXT.start)
    expect(html).toMatch(new RegExp(PRIMER_CLOSED))
    expect(html).not.toMatch(new RegExp(PRIMER_OPEN))
    expect(count(html, /<fieldset/g)).toBe(1)
    expect(has(html, ['primer', 'bench'])).toEqual([true, true])
  })

  it('in a narrow window with a run shows the notice, the primer open and the record, and nothing to work with', () => {
    const html = shell({ narrow: true })
    const notice = html.match(/<div role="note"[^>]*>(.*?)<\/div>/s)?.[1] ?? ''
    expect(notice).toContain(NARROW_NOTICE.title)
    expect(notice).toContain(NARROW_NOTICE.body)
    expect(notice).toContain('zooming out brings the bench back')
    expect(notice).toContain(NARROW_NOTICE.withRun)
    expect(notice).not.toContain(NARROW_NOTICE.withoutRun)
    expect(html).toMatch(new RegExp(PRIMER_OPEN))
    expect(has(html, ['primer', 'record', 'guide', 'bench', 'notebook'])).toEqual([true, true, false, false, false])
    for (const excluded of ['<fieldset', '<input', '<button', '<aside', '<select', '<textarea']) expect([excluded, html.includes(excluded)]).toEqual([excluded, false])
    expect(html).not.toContain(SHELL_TEXT.restart)
  })

  it('in a narrow window before Start shows no record either, and says so', () => {
    const html = shell({ narrow: true, started: false })
    expect(has(html, ['primer', 'record'])).toEqual([true, false])
    expect(html).toContain(NARROW_NOTICE.withoutRun)
    expect(html).not.toContain(NARROW_NOTICE.withRun)
    expect(html).not.toContain('<button')
  })

  it('says in one status paragraph that progress is not being saved, and nothing of it otherwise', () => {
    for (const narrow of [false, true]) {
      const html = shell({ persistent: false, narrow })
      expect([...html.matchAll(/<p role="status"[^>]*>([^<]*)<\/p>/g)].map((match) => match[1])).toEqual([NOT_SAVING_TEXT])
      expect(shell({ narrow })).not.toContain('role="status"')
      expect(shell({ narrow })).not.toContain(NOT_SAVING_TEXT)
    }
  })

  it('says in one status paragraph that a saved run was set aside, on the wide page and the narrow, and nothing of it otherwise', () => {
    for (const narrow of [false, true]) {
      const html = shell({ started: false, setAside: true, narrow })
      expect([...html.matchAll(/<p role="status"[^>]*>([^<]*)<\/p>/g)].map((match) => match[1])).toEqual([escaped(SHELL_TEXT.setAside)])
      expect(shell({ started: false, narrow })).not.toContain('role="status"')
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

  it('is a fieldset named Mode with two radio buttons of one group, the mode in force checked', () => {
    const html = draw()
    expect(html).toMatch(/^<fieldset[^>]*><legend[^>]*>Mode<\/legend>/)
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

describe('the primer', () => {
  const draw = (open: boolean, model = false) =>
    renderToStaticMarkup(createElement(Primer, { sections: TITRATION_PRIMER, sources, open, modelCitations: model ? titrationCitations(titrationData, sources) : undefined }))
  const html = draw(true)
  const MODEL_SUMMARY = escaped("Sources for this lab's model")

  it('is one native disclosure, open or closed as it is told', () => {
    expect(html).toMatch(new RegExp(`^${PRIMER_OPEN}`))
    expect(html).toMatch(/<\/details>$/)
    expect(draw(false)).toMatch(new RegExp(`^${PRIMER_CLOSED}`))
    // Nothing in it but the cards' own Sources controls.
    expect(count(html, /<details/g)).toBe(1 + TITRATION_PRIMER.length)
  })

  it('has twelve cards, each a section named by its h2, in order, each with its Sources control', () => {
    expect(TITRATION_PRIMER).toHaveLength(12)
    expect([...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((match) => match[1])).toEqual(TITRATION_PRIMER.map((section) => escaped(section.heading)))
    const cards = [...html.matchAll(/<section aria-labelledby="[^"]+".*?<\/section>/gs)].map((match) => match[0])
    expect(cards).toHaveLength(12)
    for (const card of cards) expect(count(card, /<summary[^>]*>Sources<\/summary>/g)).toBe(1)
  })

  it('lists under each card every source its paragraphs cite, once', () => {
    const cards = [...html.matchAll(/<section aria-labelledby="[^"]+".*?<\/section>/gs)].map((match) => match[0])
    TITRATION_PRIMER.forEach((section, i) => {
      const cited = [...new Set(section.paragraphs.flatMap((paragraph) => paragraph.sourceIds))]
      expect(cited.length).toBeGreaterThan(0)
      expect(hrefs(cards[i]!)).toEqual(cited.map((id) => escaped(sourceUrl(id))))
    })
  })

  it('shows every paragraph and equation, with M_NaOH as M and a subscript', () => {
    expect(html).toContain('M<sub>NaOH</sub> = M<sub>HCl</sub> × V<sub>HCl</sub> ÷ V<sub>NaOH</sub>')
    expect(html).not.toContain('M_')
    expect(html).not.toContain('V_')
    const marked = (text: string) => escaped(text).replace(/_([A-Za-z]+)/g, '<sub>$1</sub>')
    const paragraphs = TITRATION_PRIMER.flatMap((section) => section.paragraphs)
    for (const { text, equation } of paragraphs) expect(html).toContain(`>${marked(text)}</p>${equation === undefined ? '</div>' : `<p class="pl-4 font-medium">${marked(equation)}</p></div>`}`)
    expect(paragraphs.filter((paragraph) => paragraph.equation !== undefined).length).toBeGreaterThan(1)
    expect(count(html, /<sub>/g)).toBe(TITRATION_PRIMER.flatMap((s) => s.paragraphs).reduce((n, p) => n + count(`${p.text} ${p.equation ?? ''}`, /_[A-Za-z]+/g), 0))
  })

  it('shows nothing of what a paragraph rests on, which is kept for review', () => {
    expect(html).not.toContain('This lab:')
  })

  it('gives every link an https address and a new tab', () => {
    const links = [...draw(true, true).matchAll(/<a [^>]*>/g)].map((match) => match[0])
    expect(links.length).toBeGreaterThan(12)
    for (const link of links) {
      expect(link).toMatch(/href="https:\/\//)
      expect(link).toContain('target="_blank"')
    }
  })

  it("lists each source of the lab's model once, in a disclosure of its own at the foot, when given them", () => {
    expect(html).not.toContain(MODEL_SUMMARY)
    const withModel = draw(true, true)
    expect(count(withModel, /<details/g)).toBe(2 + TITRATION_PRIMER.length)
    const [above, foot, ...rest] = withModel.split(new RegExp(`<details><summary[^>]*>${MODEL_SUMMARY}</summary>`))
    expect(rest).toEqual([])
    expect(count(above!, /<h2/g)).toBe(12)
    const model = titrationCitations(titrationData, sources)
    expect(model.length).toBeGreaterThan(8)
    expect(hrefs(foot!)).toEqual(model.map((citation) => escaped(citation.source.url)))
    expect(new Set(model.map((citation) => citation.source.id)).size).toBe(model.length)
    for (const { source, covers } of model) {
      expect(count(foot!, new RegExp(`>${escaped(source.citation).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`, 'g'))).toBe(1)
      expect(foot).toContain(`${escaped(covers.join(', '))}: `)
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
    expect(html).toContain(`>${escaped(hcl.hazards.note.value)}</p>`)
    expect(html.indexOf('At the strength used here')).toBeLessThan(html.indexOf(escaped(hcl.hazards.note.value)))
    expect(html.indexOf(escaped(hcl.hazards.note.value))).toBeLessThan(html.indexOf('>Sources</summary>'))
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
    expect(html).toContain(`>${escaped(indicator.hazards.note.value)}</p>`)
  })

  it('draws a line that begins with two codes as it is stored, whatever the bottle', () => {
    const hazards = { ...naoh.hazards, statements: ['H999+H998+H997: Third, second, first', 'H001: Before it in a sorted list'] }
    expect(statements(draw({ ...naoh, hazards }))).toEqual(hazards.statements)
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
