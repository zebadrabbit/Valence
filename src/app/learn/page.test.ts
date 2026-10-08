import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITIES } from '@/app/activities'
import { VIEWER_FAILURE_TEXT } from '@/app/explore/views'
import { PRIMER_TEXT, SHELL_TEXT } from '@/app/lab/shellText'
import { Home } from '@/app/pages/Home'
import { Learn } from '@/app/pages/Learn'
import { createMemoryStore, NOT_SAVING_TEXT, saveEntry, storageKey, type KeyValueStore } from '@/app/progress/storage'
import { registry } from '@/chem-data/registry'
import sources from '@/chem-data/sources.json'
import {
  ENERGY_PANEL,
  PREDICTION,
  chapterAnnouncement,
  chapterHeading,
  createProgress,
  describeMechanismState,
  energyLines,
  energyPanelNotes,
  hclNahco3 as mechanism,
  kJ,
  mechanismCitations,
  predictionFeedback,
  predictionsOf,
  reduce,
  state,
  stepNotes,
  stepsOf,
  timescaleLabel,
  type Action,
  type MechanismProgress,
} from '@/mechanisms'
import { Beaker } from './Beaker'
import { Energy } from './EnergyPanel'
import { MechanismPage } from './MechanismPage'
import { BEAKER_TEXT, ENERGY_TEXT, MODE_TEXT, PAGE_TEXT, speciesLabel, withheld } from './text'

// The mechanism timeline's page as markup, on a store the test holds. AppStateProvider builds its store from the
// browser, the check for WebGL asks the document for a canvas, and the 3D scene is three.js: each is given
// directly. What a press does (Play, Previous and Next, the slider, an answer, a look at a species, the energy
// panel opened) is state, and is checked in a browser: a markup render mounts the page and no more.
const app = vi.hoisted(() => ({ store: undefined as unknown as KeyValueStore, persistent: true, reducedMotion: false, webgl: true }))
vi.mock('@/app/AppState', () => ({ useAppState: () => ({ store: app.store, persistent: app.persistent, reducedMotion: app.reducedMotion }) }))
vi.mock('@/app/explore/webgl', () => ({ hasWebgl: () => app.webgl, ViewerBoundary: ({ children }: { children: unknown }) => children }))
// In place of the 3D scene, a mark that carries what the scene was handed.
vi.mock('./scene/MechanismScene', async () => {
  const { createElement } = await import('react')
  return { MechanismScene: (props: { state: { t: number }; label: string; describedBy: string }) => createElement('div', { 'data-scene': props.label, 'data-t': props.state.t, 'data-described-by': props.describedBy }) }
})

const [, , activity] = ACTIVITIES
const escaped = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
const text = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')
const page = (address = '/learn/hcl-nahco3') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [address] }, createElement(MechanismPage)))
const draw = (element: ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const run = (from: MechanismProgress, ...actions: Action[]) => actions.reduce((progress, action) => reduce(mechanism, progress, action), from)
const store = (progress: MechanismProgress) => saveEntry(app.store, activity.entry, activity.version, progress)
const at = (t: number, mode: 'guided' | 'challenge' = 'guided') => store(run(createProgress(mode), { type: 'seek', t }))
const slider = (html: string) => html.match(/<input[^>]*type="range"[^>]*>/)![0]
/** Every button of the page with its words, and whether it says it cannot be used now. */
const buttons = (html: string) => [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)].map((match) => ({ words: match[2]!.replace(/<[^>]+>/g, '').trim(), unavailable: match[1]!.includes('aria-disabled="true"'), tag: match[1]! }))
const button = (html: string, words: string) => buttons(html).find((one) => one.words.includes(words))
/** Every energy the markup prints. */
const figures = (html: string) => html.match(/[+−]?\d+(\.\d)? kJ\/mol/g) ?? []
const steps = stepsOf(mechanism)
const wholeSteps = new Set([
  ...steps.flatMap((step) => [step.deltaG.value, ...(step.deltaH ? [step.deltaH.value] : [])]),
  ...steps.flatMap((_, i) => [steps.slice(0, i + 1).reduce((sum, step) => sum + step.deltaG.value, 0), steps.slice(0, i + 1).reduce((sum, step) => sum + (step.deltaH?.value ?? 0), 0)]),
].map(kJ))

// The scene is loaded lazily: the first render asks for it and shows the loading line. It is asked for here, and
// has arrived before the tests that look at the scene itself.
let firstRender = ''
beforeAll(async () => {
  app.store = createMemoryStore()
  saveEntry(app.store, activity.entry, activity.version, reduce(mechanism, createProgress('guided'), { type: 'seek', t: 0.2 }))
  firstRender = page()
  await import('./scene/MechanismScene')
  await new Promise((resolve) => setTimeout(resolve, 0))
})

beforeEach(() => {
  app.store = createMemoryStore()
  app.persistent = true
  app.reducedMotion = false
  app.webgl = true
})

describe('the mechanism page: its head', () => {
  it('has the timeline as its heading, under a breadcrumb that links to the Learn page', () => {
    const html = page()
    expect(html).toMatch(/<nav aria-label="Breadcrumb"[^>]*>.*<a [^>]*href="\/learn"[^>]*>Learn<\/a>.*<\/nav>/s)
    expect(html).toContain(`<h1 tabindex="-1" class="w-fit rounded-sm text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">${activity.title}</h1>`)
    expect(mechanism.title).toBe(activity.title)
  })

  it('has the mode in one line that opens, with what each mode does on a timeline, the button of the energy panel, and the periodic table in a new tab', () => {
    const html = page()
    expect(html).toMatch(/<details[^>]*><summary[^>]*>Mode: <span[^>]*>Guided<\/span><\/summary>/)
    expect(html).toContain(escaped(MODE_TEXT.guided))
    expect(html).toContain(escaped(MODE_TEXT.challenge))
    expect(html).not.toContain(escaped(SHELL_TEXT.guided))
    expect(count(html, /<input type="radio"/g)).toBe(2)
    expect(button(html, ENERGY_PANEL.title)!.tag).toContain('aria-expanded="false"')
    expect(html).toMatch(/<a href="#\/explore\/elements" target="_blank"[^>]*>Periodic table/)
    // The panel is closed, so nothing of it is on the page.
    expect(html).not.toContain(ENERGY_TEXT.caption)
    expect(html).not.toContain(ENERGY_TEXT.chart)
  })

  it('has Start again beside the mode once there is a run to start again, a button a finger can press, which asks first; and none on a page where nothing has been done', () => {
    expect(button(page(), PAGE_TEXT.startAgain)).toBeUndefined()
    expect(button(page('/learn/hcl-nahco3?step=decomposition'), PAGE_TEXT.startAgain)).toBeUndefined()
    at(0.4)
    const html = page()
    expect(button(html, PAGE_TEXT.startAgain)).toMatchObject({ words: PAGE_TEXT.startAgain, unavailable: false })
    expect(button(html, PAGE_TEXT.startAgain)!.tag).toContain('min-h-11')
    // Next to the mode, before the energy panel's button.
    expect(html).toMatch(new RegExp(`</details><button[^>]*>${PAGE_TEXT.startAgain}</button>`))
    expect(html.indexOf(`>${PAGE_TEXT.startAgain}<`)).toBeLessThan(html.indexOf(`${ENERGY_PANEL.title}</button>`))
    // What it asks before it does anything, and what it says when it has.
    expect(PAGE_TEXT.startAgainConfirm).toMatch(/^Start this timeline again\? .*place.*answers.*erased.*no way to bring them back\.$/)
    expect(PAGE_TEXT.startedAgain).toMatch(/start.*nothing answered/)
    // It stays once a run is stored, at the start too: a press does not take the button from under the finger or the focus.
    store(createProgress('challenge'))
    expect(button(page(), PAGE_TEXT.startAgain)).toBeDefined()
  })

  it('shows no notice while progress is being kept, and says so when it is not', () => {
    expect(page()).not.toContain('role="status" class="mb-4')
    app.persistent = false
    expect(page()).toContain(escaped(NOT_SAVING_TEXT))
  })

  it('says that a stored run which does not fit was set aside, in a sentence about a timeline and not about a lab', () => {
    saveEntry(app.store, activity.entry, activity.version, { mode: 'guided', status: 'in-progress', position: 3, answers: [] })
    const html = page()
    expect(html).toContain(escaped(PAGE_TEXT.setAside))
    expect(PAGE_TEXT.setAside).toMatch(/saved run of this timeline.*has been kept.*Export my progress.*starts fresh/)
    // The page starts at the beginning.
    expect(slider(html)).toContain('value="0"')
  })

  it('saves nothing by being opened, with a deep link or without, so Home goes on saying Not started', () => {
    page()
    page('/learn/hcl-nahco3?step=decomposition')
    expect(app.store.length).toBe(0)
    expect(text(draw(createElement(Home)))).toContain(`|${activity.title}|Not started|`)
  })
})

describe('the mechanism page: the timeline', () => {
  it('is one native range input over the whole track, named, with where it stands in words', () => {
    const html = page()
    expect(count(html, /<input[^>]*type="range"/g)).toBe(1)
    const input = slider(html)
    for (const attribute of [`aria-label="${PAGE_TEXT.timeline}"`, 'min="0"', 'max="1000"', 'step="5"', 'value="0"', 'aria-valuetext="In the beaker, at its start"']) expect(input).toContain(attribute)
    at(0.42)
    expect(slider(page())).toContain('value="420"')
    expect(slider(page())).toContain('aria-valuetext="Step 2 of 4: Proton transfer, 50% of the way through"')
  })

  it('marks the seven chapters along it, each as wide as its share of the track, with the one the timeline is in marked as current', () => {
    at(0.6)
    const html = page()
    const list = html.match(/<ol aria-label="Chapters"[^>]*>(.*?)<\/ol>/s)![1]!
    const items = [...list.matchAll(/<li([^>]*)>(.*?)<\/li>/gs)]
    expect(items).toHaveLength(7)
    expect(items.map((item) => Number(item[1]!.match(/flex-grow:([\d.]+)/)![1]))).toEqual(mechanism.chapters.map((c) => expect.closeTo(c.range[1] - c.range[0], 10)))
    expect(items.map((item) => item[1]!.includes('aria-current="step"'))).toEqual([false, false, false, false, true, false, false])
    // A share of the track has room for a number and no more: each chapter's name, and a step's real time, are there for a screen reader.
    expect(items.map((item) => item[2]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())).toEqual([
      'In the beaker',
      'Before mixing',
      '1 Step 1 of 4: Dissolving. Real time: seconds, depending on particle size and stirring',
      '2 Step 2 of 4: Proton transfer. Real time: picoseconds to nanoseconds',
      '3 Step 3 of 4: Decomposition. Real time: tens of milliseconds; the slower of the two steps that change bonds',
      '4 Step 4 of 4: Gas escapes. Real time: seconds',
      'Back in the beaker',
    ])
    expect(items.map((item) => item[2]!.match(/<span aria-hidden="true">(\d)<\/span>/)?.[1] ?? '')).toEqual(['', '', '1', '2', '3', '4', ''])
  })

  it('labels the track with the real timescale of the step the timeline is in, as the record has it, and with nothing where a chapter has none of its own', () => {
    const label = (html: string) => html.match(/<p class="min-h-5 px-2 text-sm text-muted-foreground">(.*?)<\/p>/)![1]
    for (const step of steps) {
      at((step.range[0] + step.range[1]) / 2)
      expect([step.id, label(page())]).toEqual([step.id, escaped(PAGE_TEXT.realTime(timescaleLabel(step)!))])
    }
    // The prologue's label is its title, and a bookend has none.
    for (const t of [0, 0.1, 0.97]) {
      at(t)
      expect([t, label(page())]).toEqual([t, ''])
    }
  })

  it('has Previous and Next, each named by the chapter it goes to, and Play', () => {
    at(0.2)
    const html = page()
    expect(button(html, 'Previous')).toMatchObject({ words: `← ${PRIMER_TEXT.previous('Before mixing')}`, unavailable: false })
    expect(button(html, 'Next')).toMatchObject({ words: `${PRIMER_TEXT.next('Proton transfer')} →`, unavailable: false })
    expect(button(html, PAGE_TEXT.play)).toMatchObject({ words: PAGE_TEXT.play, unavailable: false })
    for (const one of [button(html, 'Previous')!, button(html, 'Next')!, button(html, PAGE_TEXT.play)!]) expect(one.tag).toContain('min-h-11')
  })

  it('keeps Previous on the page at the start and Next at the end, focusable, saying that it cannot be used', () => {
    const start = page()
    expect(button(start, PAGE_TEXT.toStart)).toMatchObject({ unavailable: true })
    expect(button(start, PAGE_TEXT.toStart)!.tag).not.toMatch(/ disabled=""/)
    expect(button(start, 'Next')).toMatchObject({ words: `${PRIMER_TEXT.next('Before mixing')} →`, unavailable: false })
    at(0.97)
    // Inside the last chapter Next goes to the end, which is where the timeline is completed.
    expect(button(page(), PAGE_TEXT.toEnd)).toMatchObject({ unavailable: false })
    store(run(createProgress('guided'), { type: 'seek', t: 1 }))
    const end = page()
    expect(button(end, PAGE_TEXT.toEnd)).toMatchObject({ unavailable: true })
    expect(button(end, PAGE_TEXT.replay)).toMatchObject({ unavailable: false })
    expect(text(draw(createElement(Home)))).toContain(`|${activity.title}|Completed|`)
  })

  it('offers no Play under the reduced-motion setting, and says why in one line', () => {
    app.reducedMotion = true
    at(0.2)
    const html = page()
    expect(button(html, PAGE_TEXT.play)).toBeUndefined()
    expect(html).toContain(escaped(PAGE_TEXT.noPlay))
    expect(button(html, 'Next')).toBeDefined()
    app.reducedMotion = false
    expect(page()).not.toContain(escaped(PAGE_TEXT.noPlay))
  })

  it('announces the chapter in one status line that is not drawn, which changes only with the chapter', () => {
    at(0.33)
    const first = page()
    expect(first).toContain(`<p role="status" class="sr-only">${escaped(chapterAnnouncement(mechanism, 'proton-transfer'))}</p>`)
    at(0.5)
    expect(page()).toContain(`<p role="status" class="sr-only">${escaped(chapterAnnouncement(mechanism, 'proton-transfer'))}</p>`)
    at(0.52)
    expect(page()).toContain(`<p role="status" class="sr-only">${escaped(chapterAnnouncement(mechanism, 'decomposition'))}</p>`)
  })
})

describe('the mechanism page: deep links and a returning learner', () => {
  it('opens each chapter at its start from its own link', () => {
    for (const chapter of mechanism.chapters) {
      const html = page(`/learn/hcl-nahco3?step=${chapter.id}`)
      expect([chapter.id, slider(html).match(/ value="(\d+)"/)![1]]).toEqual([chapter.id, String(Math.round(chapter.range[0] * 1000))])
      expect(html).toContain(`>${escaped(chapterHeading(mechanism, chapter.id))}</h2>`)
    }
  })

  it('gives each chapter a link to itself that can be followed or copied', () => {
    at(0.6)
    expect(page()).toMatch(new RegExp(`<a [^>]*href="/learn/hcl-nahco3\\?step=decomposition"[^>]*>${PAGE_TEXT.link}</a>`))
  })

  it('opens a link that names no chapter where the learner was', () => {
    at(0.45)
    expect(slider(page('/learn/hcl-nahco3?step=nowhere'))).toContain('value="450"')
  })

  it('comes back to where a stored run was left, in its mode, and a link moves it without changing the rest', () => {
    store(run(createProgress('challenge'), { type: 'seek', t: 0.45 }))
    const back = page()
    expect(slider(back)).toContain('value="450"')
    expect(back).toMatch(/Mode: <span[^>]*>Challenge<\/span>/)
    const linked = page('/learn/hcl-nahco3?step=gas-escapes')
    expect(slider(linked)).toContain('value="760"')
    expect(linked).toMatch(/Mode: <span[^>]*>Challenge<\/span>/)
    // The stored run is as it was: a link saves nothing.
    expect(JSON.parse(app.store.getItem(storageKey(activity.entry))!).data.position).toBe(0.45)
  })
})

describe('the mechanism page: the scene and its words', () => {
  it('draws a bookend as a picture of the beaker, named, with no list of molecules', () => {
    const html = page()
    expect(html).toContain(`<svg viewBox="0 0 320 240" role="img" aria-label="${escaped(BEAKER_TEXT.before)}"`)
    expect(html).toContain(`>${BEAKER_TEXT.acid}</text>`)
    expect(html).toContain(`>${BEAKER_TEXT.powder}</text>`)
    expect(html).not.toContain(`aria-label="${PAGE_TEXT.inScene}"`)
    expect(html).not.toContain(escaped(PAGE_TEXT.sceneHint))
    at(0.97)
    const end = page()
    expect(end).toContain(`aria-label="${escaped(BEAKER_TEXT.after)}"`)
    expect(end).toContain(`>${BEAKER_TEXT.saltWater}</text>`)
  })

  it('moves the powder and thins the bubbles with the timeline, and with nothing else', () => {
    const beaker = (after: boolean, through: number) => renderToStaticMarkup(createElement(Beaker, { after, through }))
    expect(beaker(false, 0.3)).toBe(beaker(false, 0.3))
    expect(beaker(false, 0)).not.toBe(beaker(false, 1))
    // At the end of the last chapter the fizz has stopped.
    expect(count(beaker(true, 0), /opacity="1"/g)).toBe(4)
    expect(count(beaker(true, 1), /opacity="0"/g)).toBe(4)
    expect(beaker(true, 0.5)).not.toMatch(/animat|transition/)
  })

  it('holds the 3D scene from the prologue on, loaded apart from the page, with one helper line under it', () => {
    // Until the scene's chunk has arrived, the frame says that it is loading.
    expect(firstRender).toContain(PAGE_TEXT.loading)
    expect(firstRender).not.toContain('data-scene')
    at(0.2)
    const html = page()
    expect(html).not.toContain(PAGE_TEXT.loading)
    // The scene is handed the state at the scrub position, its name, and the id of the words that describe it.
    const described = html.match(/<p id="([^"]+)" hidden="">/)![1]
    expect(html).toContain(`<div data-scene="${PAGE_TEXT.scene}" data-t="0.2" data-described-by="${described}"></div>`)
    expect(html.split(escaped(PAGE_TEXT.sceneHint)).length - 1).toBe(1)
    expect(html).not.toContain('<svg viewBox="0 0 320 240"')
    // Under a bookend's beaker the scene stays mounted, hidden, so that it is there at once afterwards.
    app.store = createMemoryStore()
    expect(page()).toContain('<div class="invisible h-full"><div data-scene=')
  })

  it('lists what is in the scene by name, those that take part first, each a button a finger can press', () => {
    at(0.4)
    const html = page()
    const section = html.match(new RegExp(`<section aria-label="${PAGE_TEXT.inScene}"[^>]*>(.*?)</section>`, 's'))![1]!
    expect(text(section)).toBe(`|${PAGE_TEXT.takingPart}|hydrogen carbonate ion, HCO₃⁻|hydronium ion, H₃O⁺|${PAGE_TEXT.lookingOn}|sodium ion, Na⁺|water molecule, H₂O|chloride ion, Cl⁻|`)
    expect(count(section, /<button type="button" data-look="true"[^>]*min-h-11/g)).toBe(5)
    // The same names the callouts give, from the state at this position.
    for (const one of state(mechanism, 0.4).species) expect(section).toContain(`>${speciesLabel(mechanism, one)}</button>`)
  })

  it('lists nothing of the solid before it is added, and then the solid as one unit until it has come apart', () => {
    const listed = (t: number) => {
      at(t)
      return text(page().match(new RegExp(`<section aria-label="${PAGE_TEXT.inScene}"[^>]*>(.*?)</section>`, 's'))![1]!)
    }
    expect(listed(0.1)).toBe(`|${PAGE_TEXT.takingPart}|hydronium ion, H₃O⁺|chloride ion, Cl⁻|${PAGE_TEXT.lookingOn}|water molecule, H₂O|`)
    expect(listed(0.2)).toBe(`|${PAGE_TEXT.takingPart}|unit of solid sodium hydrogen carbonate, NaHCO₃|${PAGE_TEXT.lookingOn}|hydronium ion, H₃O⁺|water molecule, H₂O|chloride ion, Cl⁻|`)
    expect(listed(0.3)).toBe(`|${PAGE_TEXT.takingPart}|sodium ion, Na⁺|hydrogen carbonate ion, HCO₃⁻|${PAGE_TEXT.lookingOn}|hydronium ion, H₃O⁺|water molecule, H₂O|chloride ion, Cl⁻|`)
  })

  it('gives the chapter in words, one chapter at a time: its heading, its short text, and the longer text closed until it is opened', () => {
    at(0.4)
    const html = page()
    const chapter = mechanism.chapters.find((c) => c.id === 'proton-transfer')!
    expect(html).toContain('>Step 2 of 4: Proton transfer</h2>')
    expect(html).toContain(`<p class="max-w-prose">${escaped(chapter.explanation.intro)}</p>`)
    expect(html).toMatch(new RegExp(`<details><summary[^>]*>${PAGE_TEXT.more}</summary><div[^>]*><p>${escaped(chapter.explanation.expanded).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</p></div></details>`))
    for (const other of mechanism.chapters.filter((c) => c !== chapter)) expect(html).not.toContain(escaped(other.explanation.intro))
    // The notes on a step's energies are in the energy panel, not here.
    for (const note of stepNotes(mechanism, 'proton-transfer')) expect(html).not.toContain(escaped(note))
  })

  it('has the scene in words in a closed disclosure, and a hidden copy that the picture is described by', () => {
    at(0.445)
    const html = page()
    const words = escaped(describeMechanismState(mechanism, 0.445, registry.elements))
    expect(html).toMatch(new RegExp(`<details class="[^"]*"><summary[^>]*>${PAGE_TEXT.description}</summary>`))
    expect(count(html, new RegExp(words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toBe(2)
    expect(html).toMatch(/<p id="[^"]+" hidden="">Step 2 of 4: Proton transfer\. 63% of the way through\./)
    // Not a live region: it changes at every position, and only the chapter is announced.
    expect(html).not.toMatch(/role="status"[^>]*>Step 2 of 4: Proton transfer\. 63%/)
  })

  it('prints no energy that is only a point on a drawn curve', () => {
    for (const t of [0.2, 0.445, 0.47, 0.69, 0.8, 1]) {
      store(run(createProgress('guided'), { type: 'seek', t }))
      for (const figure of figures(page())) expect([t, wholeSteps.has(figure) ? 'a whole step' : figure]).toEqual([t, 'a whole step'])
    }
  })
})

describe('the mechanism page: a browser with no WebGL', () => {
  it('holds the scene in words where the scene would be, once, and everything else as it is', () => {
    app.webgl = false
    at(0.445)
    const html = page()
    expect(html).toContain(escaped(`${VIEWER_FAILURE_TEXT.webgl} ${PAGE_TEXT.noScene}`))
    expect(html).not.toContain('data-scene')
    expect(html).not.toContain(`>${PAGE_TEXT.description}</summary>`)
    expect(html).not.toContain(escaped(PAGE_TEXT.sceneHint))
    // In the frame, and in the hidden copy.
    expect(count(html, /The bond between the oxygen and a hydrogen of the hydronium ion is breaking/g)).toBe(2)
    expect(count(html, /<input[^>]*type="range"/g)).toBe(1)
    expect(html).toContain('>Step 2 of 4: Proton transfer</h2>')
    expect(html).toContain(`aria-label="${PAGE_TEXT.inScene}"`)
    expect(button(html, 'Next')).toBeDefined()
  })

  it('still draws the beaker at a bookend, with the words in their disclosure', () => {
    app.webgl = false
    const html = page()
    expect(html).toContain(`aria-label="${escaped(BEAKER_TEXT.before)}"`)
    expect(html).toContain(`>${PAGE_TEXT.description}</summary>`)
  })
})

describe('the mechanism page: Challenge', () => {
  const [dissolving] = predictionsOf(mechanism)
  const asked = run(createProgress('challenge'), { type: 'advance', t: 0.3 })

  it('stops at the start of a step and asks what happens next, with each answer a button that one press chooses', () => {
    expect(asked.position).toBe(0.16)
    store(asked)
    const html = page()
    expect(html).toContain(`<h2 class="text-base font-semibold">${PREDICTION.lead}</h2>`)
    expect(html).toContain(`<p class="max-w-prose">${escaped(dissolving!.question.prompt)}</p>`)
    for (const option of dissolving!.question.options) expect(button(html, option.text)).toMatchObject({ words: option.text, unavailable: false })
    expect(count(html, /<input type="radio"/g)).toBe(2)
    for (const option of dissolving!.question.options) expect(button(html, option.text)!.tag).toContain('min-h-11')
    expect(html).toContain(`<p role="status" class="sr-only">${escaped(`${PREDICTION.lead} ${dissolving!.question.prompt}`)}</p>`)
  })

  it('gives nothing of the answer away while the question waits: no name of the step, none of its text, and nothing said to be right', () => {
    store(asked)
    const html = page()
    const chapter = mechanism.chapters.find((c) => c.id === 'dissolving')!
    expect(html).not.toContain('Dissolving')
    expect(html).not.toContain(escaped(chapter.explanation.intro))
    expect(html).not.toContain(escaped(chapter.explanation.expanded))
    for (const option of dissolving!.question.options) expect(html).not.toContain(escaped(option.feedback))
    // Nor the names of the steps still ahead, on the track or on Next.
    expect(html).not.toMatch(/Proton transfer|Decomposition|Gas escapes/)
    expect(slider(html)).toContain('aria-valuetext="Step 1 of 4, at its start"')
    // Nor which of the species the step is about, nor how long it takes: the list is one list, and the track has no label.
    expect(html).not.toContain(PAGE_TEXT.takingPart)
    expect(html).not.toContain(PAGE_TEXT.lookingOn)
    const section = html.match(new RegExp(`<section aria-label="${PAGE_TEXT.inScene}"[^>]*>(.*?)</section>`, 's'))![1]!
    expect(text(section)).toBe(`|${PAGE_TEXT.inScene}|unit of solid sodium hydrogen carbonate, NaHCO₃|hydronium ion, H₃O⁺|water molecule, H₂O|chloride ion, Cl⁻|`)
    // Nor what the solid is made of: nowhere on the page is a sodium ion or a hydrogen carbonate ion named, but in the answers offered.
    const offered = dissolving!.question.options.reduce((rest, option) => rest.replace(escaped(option.text), ''), html)
    expect(offered).not.toMatch(/sodium ion|hydrogen carbonate ion|Na⁺|HCO₃⁻/)
    expect(html).not.toContain('Real time')
  })

  it('holds Play and Next until the question is answered, each still on the page and focusable; Previous and the slider are not held', () => {
    store(asked)
    const html = page()
    expect(button(html, PAGE_TEXT.play)).toMatchObject({ unavailable: true })
    expect(button(html, 'Next')).toMatchObject({ words: `${PRIMER_TEXT.next('Step 2')} →`, unavailable: true })
    expect(button(html, 'Previous')).toMatchObject({ unavailable: false })
    expect(slider(html)).not.toMatch(/disabled/)
  })

  it('says after an answer what was predicted and whether it was right, and then gives the chapter', () => {
    for (const option of dissolving!.question.options) {
      store(run(asked, { type: 'answer', questionId: dissolving!.question.id, optionId: option.id }))
      const html = page()
      const feedback = predictionFeedback(mechanism, dissolving!.question.id, option.id)!
      expect(html).toContain('>Step 1 of 4: Dissolving</h2>')
      expect(html).toContain(`${PAGE_TEXT.prediction}: ${escaped(option.text)}</p>`)
      expect(html).toContain(`<span aria-hidden="true" class="${option.correct ? 'lab-done' : 'lab-failed'}">${option.correct ? '✓ ' : '✕ '}</span>${escaped(feedback.text)}</p>`)
      expect(html).not.toContain(PREDICTION.lead)
      expect(button(html, 'Next')).toMatchObject({ words: `${PRIMER_TEXT.next('Step 2')} →`, unavailable: false })
      expect(button(html, PAGE_TEXT.play)).toMatchObject({ unavailable: false })
    }
  })

  it('asks nothing in Guided, at the start of a step or anywhere', () => {
    for (const prediction of predictionsOf(mechanism)) {
      at(prediction.at)
      const html = page()
      expect(html).not.toContain(PREDICTION.lead)
      expect(button(html, 'Next')!.unavailable).toBe(false)
    }
  })

  it('does not ask at a place reached by hand that is not the very start of a step', () => {
    store(run(createProgress('challenge'), { type: 'seek', t: 0.2 }))
    const html = page()
    expect(html).not.toContain(PREDICTION.lead)
    expect(html).toContain('>Step 1 of 4: Dissolving</h2>')
  })
})

describe('the energy panel', () => {
  const panel = (t: number, kept: ReadonlySet<string> = new Set()) => renderToStaticMarkup(createElement(Energy, { mechanism, t, kept }))

  it('draws free energy as the main curve and enthalpy alongside, each named in words on the chart, with a cursor', () => {
    const html = panel(0.445)
    expect(html).toContain(`<svg viewBox="0 0 360 250" role="img" aria-label="${ENERGY_TEXT.chart}"`)
    expect(count(html, /<path d="M [^"]+" fill="none"/g)).toBe(2)
    expect(html).toMatch(new RegExp(`>${ENERGY_PANEL.freeEnergy}</text>`))
    expect(html).toMatch(new RegExp(`>${ENERGY_PANEL.enthalpy}</text>`))
    expect(html).toContain(`>${ENERGY_PANEL.axis}</text>`)
    // The enthalpy curve is the broken line; free energy is whole and heavier.
    expect(html).toMatch(/stroke-width="1.5" stroke-dasharray="5 3"/)
    expect(html).toMatch(/stroke-width="2.5"/)
    expect(count(html, /<circle /g)).toBe(2)
  })

  it('says on the curve itself which barrier is not to scale and what is derived', () => {
    const html = panel(0.2)
    expect([...html.matchAll(/<text[^>]*>((?:barrier|level): [^<]*)<\/text>/g)].map((match) => match[1])).toEqual([
      ENERGY_TEXT.onBarrier(ENERGY_PANEL.notToScale),
      ENERGY_TEXT.onBarrier(ENERGY_PANEL.basis.derived),
      ENERGY_TEXT.onLevel(ENERGY_PANEL.basis.derived),
    ])
  })

  it('moves only its cursor and the mark of the current step with the timeline', () => {
    const strip = (html: string) => html.replace(/<line x1="[\d.]+" x2="[\d.]+" y1="48" y2="222" stroke="currentColor" stroke-width="1"><\/line>/, '').replace(/<circle [^>]*><\/circle>/g, '')
    expect(panel(0.35)).not.toBe(panel(0.45))
    expect(strip(panel(0.35))).toBe(strip(panel(0.45)))
  })

  it('gives, under the curves, what the step the timeline is in changes, one step at a time, with where each value is from', () => {
    for (const step of steps) {
      const html = panel((step.range[0] + step.range[1]) / 2)
      const block = html.match(/<section aria-label="[^"]*" class="grid gap-1">(.*?)<\/section>/s)![1]!
      expect(block).toContain(`<h3 class="font-medium">${escaped(chapterHeading(mechanism, step.id))}</h3>`)
      expect([...block.matchAll(/<li class="tabular-nums">(.*?)<\/li>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ''))).toEqual(energyLines(mechanism, step.id).map((line) => escaped(`${line.text}${line.tag ? ` (${line.tag})` : ''}`)))
    }
    // Outside a step there is no such block; after the last step the sum of the four is given in its place.
    expect(panel(0.1)).not.toContain('<section aria-label=')
    const totals = '<p>Over the whole change, ΔH = +31.4 kJ/mol and ΔG = −42.4 kJ/mol.</p>'
    // Once in the closed notes at any position, and once more in the open after the last step.
    expect(panel(0.1).split(totals).length - 1).toBe(1)
    expect(panel(0.5).split(totals).length - 1).toBe(1)
    expect(panel(0.97).split(totals).length - 1).toBe(2)
  })

  it('carries the note of spec 9.2 on step 1 where step 1 is shown, and on no other step', () => {
    expect(panel(0.2)).toContain('<p class="text-xs text-muted-foreground">Slightly uphill when both ions are at 1 M. It dissolves all the same: the ions start far more dilute than that, and the acid removes HCO₃⁻ as it forms.</p>')
    for (const t of [0.1, 0.4, 0.6, 0.8]) expect(panel(t)).not.toContain('<p class="text-xs text-muted-foreground">Slightly uphill')
  })

  it('has a real table of all four steps, closed until it is opened, in the words written for it, with where each value is from', () => {
    const html = panel(0.6)
    expect(html).toContain(`>${ENERGY_TEXT.caption}</summary>`)
    expect(html).toContain(`<caption class="sr-only">${ENERGY_TEXT.caption}</caption>`)
    expect([...html.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1])).toEqual([ENERGY_TEXT.steps, ENERGY_PANEL.freeEnergy, ENERGY_PANEL.enthalpy, ENERGY_TEXT.barrier])
    const rows = [...html.matchAll(/<tr([^>]*)><th scope="row"[^>]*>(.*?)<\/th>(.*?)<\/tr>/gs)]
    expect(rows).toHaveLength(4)
    steps.forEach((step, i) => {
      expect(rows[i]![2]).toContain(escaped(chapterHeading(mechanism, step.id)))
      for (const line of energyLines(mechanism, step.id)) {
        expect(rows[i]![3]).toContain(`>${escaped(line.text)}`)
        if (line.tag) expect(rows[i]![3]).toContain(`>${line.tag}</span>`)
      }
    })
    // A step that is not one move over a barrier says so in its cell.
    expect(count(html, new RegExp(`>${ENERGY_TEXT.noBarrier}</td>`, 'g'))).toBe(2)
    // The step the timeline is in is marked, in words too.
    expect(rows.map((row) => row[1]!.includes('aria-current="step"'))).toEqual([false, false, true, false])
    expect(count(html, new RegExp(`\\(${ENERGY_TEXT.now}\\)`, 'g'))).toBe(1)
    expect(panel(0.1)).not.toContain(ENERGY_TEXT.now)
  })

  it('prints only the steps\' own energies and their totals, wherever the cursor is', () => {
    const allowed = new Set([...wholeSteps, 'about 66 kJ/mol'])
    for (const t of [0, 0.2, 0.445, 0.47, 0.69, 0.8, 1]) {
      const html = panel(t)
      expect(figures(html).length).toBeGreaterThan(8)
      for (const figure of figures(html)) expect([t, allowed.has(figure) || figure === '66 kJ/mol' ? 'a whole step' : figure]).toEqual([t, 'a whole step'])
    }
    // The top of the barrier of step 3 on the drawing, and where the cursor stands on either curve half way up it, are printed nowhere.
    expect(text(panel(0.69))).not.toMatch(/48\.4|\+7\.3 kJ/)
  })

  it('has the panel\'s notes in a closed disclosure, with what of the curves is only drawn', () => {
    const html = panel(0.3)
    const about = html.match(new RegExp(`<details><summary[^>]*>${ENERGY_TEXT.about}</summary><div[^>]*>(.*?)</div></details>`, 's'))![1]!
    expect(about).toBe([...energyPanelNotes(mechanism), ENERGY_TEXT.drawn].map((note) => `<p>${escaped(note)}</p>`).join(''))
  })

  it('has how each value was worked out, and a Sources control with every source the timeline rests on', () => {
    const html = panel(0.3)
    expect(html).toContain(`>${ENERGY_TEXT.worked}</summary>`)
    for (const step of steps) for (const line of energyLines(mechanism, step.id)) expect(html).toContain(escaped(`${line.text}. ${line.method}`))
    // With them, what follows from how a step's values were obtained: every note of a step is here or beside the step itself.
    const worked = html.match(new RegExp(`>${ENERGY_TEXT.worked}</summary>(.*?)</details>`, 's'))![1]!
    for (const step of steps) for (const note of stepNotes(mechanism, step.id).filter((one) => !step.notes.includes(one))) expect([step.id, worked.includes(`<li>${escaped(note)}</li>`)]).toEqual([step.id, true])
    expect(stepNotes(mechanism, 'dissolving')).toEqual(steps[0]!.notes)
    expect(html).toContain('>Sources</summary>')
    const cited = mechanismCitations(mechanism, registry.molecules, sources)
    expect(cited.length).toBeGreaterThan(8)
    for (const { source } of cited) expect(html).toContain(`href="${escaped(source.url)}"`)
    expect(html).toContain(escaped(ENERGY_TEXT.unsourced))
  })

  it('names a step as the page does: by its number alone while Challenge keeps its name back', () => {
    const html = panel(0.3, new Set(['decomposition']))
    expect(html).not.toContain('Decomposition')
    expect(html).toContain('Step 3 of 4')
  })

  it('gives figures and no words while Challenge keeps any step back: no note, nothing of how a value was worked out, and no sources, each of which answers a question', () => {
    const all = new Set(steps.map((step) => step.id))
    // Where step 1's question is asked: the figures of the step, and of every step in the table.
    const asked = panel(0.16, all)
    for (const line of energyLines(mechanism, 'dissolving')) expect(asked).toContain(escaped(line.text))
    expect(figures(asked).length).toBeGreaterThan(8)
    // No step's name, no species a step makes, and no word of what a step does.
    expect(asked).not.toMatch(/Dissolving|Proton transfer|Decomposition|Gas escapes/)
    expect(asked).not.toMatch(/HCO₃|Na⁺|CO₂|H₂CO₃|carbonic acid|proton|hydrogen carbonate|sodium ion|decomposition|uphill|pKa|lasts|dissolving the solid|escaping|releasing/i)
    // The note on step 1 names the ion the solid gives, and the panel's own note says the solid dissolves and the gas escapes.
    expect(asked).not.toContain(escaped(steps[0]!.notes[0]!))
    expect(asked).not.toContain(escaped(mechanism.energyNote))
    // How each value was worked out names the change it was worked out over, and a source's title can be an answer.
    for (const step of steps) for (const line of energyLines(mechanism, step.id)) expect([step.id, asked.includes(escaped(line.method))]).toEqual([step.id, false])
    expect(asked).not.toContain(`>${ENERGY_TEXT.worked}</summary>`)
    expect(asked).not.toContain('>Sources</summary>')
    expect(asked).not.toContain('href="http')
    // One line says what waits, and why.
    expect(count(asked, new RegExp(`<p class="text-xs text-muted-foreground">${escaped(ENERGY_TEXT.later)}</p>`, 'g'))).toBe(1)
    // What the curves show keeps what answers nothing: the totals, what standard conditions are, and what is only drawn.
    const [, totals, standard] = energyPanelNotes(mechanism)
    const about = asked.match(new RegExp(`<details><summary[^>]*>${ENERGY_TEXT.about}</summary><div[^>]*>(.*?)</div></details>`, 's'))![1]!
    expect(about).toBe([totals!, standard!, ENERGY_TEXT.drawn].map((note) => `<p>${escaped(note)}</p>`).join(''))

    // It is the same while one step is still kept back: a step that is behind can answer one that is ahead.
    const last = panel(0.6, new Set(['gas-escapes']))
    expect(last).not.toContain('>Sources</summary>')
    expect(last).not.toContain(`>${ENERGY_TEXT.worked}</summary>`)
    expect(last).not.toContain(escaped(mechanism.energyNote))
    expect(panel(0.2, new Set(['proton-transfer', 'decomposition', 'gas-escapes']))).not.toContain(escaped(steps[0]!.notes[0]!))
    // With nothing kept back, everything is there.
    const open = panel(0.2)
    expect(open).toContain('>Sources</summary>')
    expect(open).toContain(`>${ENERGY_TEXT.worked}</summary>`)
    expect(open).toContain(escaped(mechanism.energyNote))
    expect(open).toContain(escaped(steps[0]!.notes[0]!))
    expect(open).not.toContain(escaped(ENERGY_TEXT.later))
  })

  it('is handed, by the page, the steps Challenge keeps back: on a page where step 1\'s question waits, the panel\'s button is there and the page names no step', () => {
    store(run(createProgress('challenge'), { type: 'advance', t: 0.3 }))
    expect(button(page(), ENERGY_PANEL.title)).toBeDefined()
    expect(withheld(mechanism, run(createProgress('challenge'), { type: 'advance', t: 0.3 }))).toEqual(new Set(steps.map((step) => step.id)))
  })
})

describe('the Learn page and Home', () => {
  it('lists the mechanism under the heading Learn, linked, with its status, and saves nothing', () => {
    const html = draw(createElement(Learn))
    expect(html).toMatch(/<h1[^>]*>Learn<\/h1>/)
    expect(html).toMatch(/<a [^>]*href="\/learn\/hcl-nahco3"[^>]*>HCl \+ NaHCO₃, step by step<\/a>/)
    expect(text(html)).toContain(`|${activity.title}|Not started|`)
    expect(html).not.toContain('/lab/')
    expect(html).not.toContain(SHELL_TEXT.planned)
    expect(app.store.length).toBe(0)
    at(0.3)
    expect(text(draw(createElement(Learn)))).toContain(`|${activity.title}|In progress|`)
  })

  it('Home links to it', () => {
    expect(draw(createElement(Home))).toMatch(/<a [^>]*href="\/learn\/hcl-nahco3"[^>]*>HCl \+ NaHCO₃, step by step<\/a>/)
  })
})
