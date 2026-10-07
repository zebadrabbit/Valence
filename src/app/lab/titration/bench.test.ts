// The markup the bench's drawings and controls put their names, states and words in. What a key press does, where
// focus goes, the timer and the sizes on screen are checked in a browser.
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sources from '@/chem-data/sources.json'
import { titrationData } from '@/chem-data/titration/data'
import { createLab, modelFrom, type TitrationState } from '@/engine/titration'
import { learner } from '@/engine/titration/testkit'
import { Bottle, Dropper, Pipette, WashBottle } from './apparatus'
import { ACTION_TEXT, flaskStatus, SLOW_DOWN_TEXT, streamMessage, swirlText, undoneText } from './benchText'
import { benchViewOf, type BenchAction } from './benchView'
import { standY } from './buretteGeometry'
import { DARK_PINK, PINK, type FlaskColour } from './flaskColour'
import { meniscusText } from './meniscusText'
import { BLOCKED_TEXT, INVALID_ENTRY_TEXT, invalidReadingText, OUTCOME_TEXT } from './messages'
import { ReadingInput, recordReading, type ReadingInputProps } from './ReadingInput'
import { MeniscusWords, ReadingView } from './ReadingView'
import { StopcockControls, type StopcockControlsProps } from './StopcockControls'
import { CLOSED, CLOSED_UNSEEN, openStream, POUR_ADDITIONS } from './stream'
import { messageLine, TitrationBench, type TitrationBenchProps } from './TitrationBench'
import { plumeToDraw, TitrationStand, type TitrationStandProps } from './TitrationStand'

const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** The text nodes of the drawing's own lettering. */
const svgTexts = (html: string) => [...html.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ' ').trim())
const attribute = (html: string, tag: string, name: string) => new RegExp(`<${tag}[^>]* ${name}="([^"]*)"`).exec(html)?.[1]
/** Everything a learner can read in it: the markup with its tags and their attributes taken out. */
const words = (html: string) => html.replace(/<[^>]+>/g, ' ')
/** The text of the element with this id. */
const textOf = (html: string, id: string) => new RegExp(`<p[^>]* id="${id}"[^>]*>([^<]*)</p>`).exec(html)?.[1]

describe('the reading view', () => {
  const reading = (levelUl: number, filled = true, running = false) =>
    renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(ReadingView, { levelUl, filled, running, describedBy: 'words' }),
        createElement(MeniscusWords, { id: 'words', levelUl, filled, running }),
      ),
    )

  it('at 24.37 mL is a named drawing of twelve graduations, one of them numbered, described by the meniscus in words', () => {
    const html = reading(24370)
    expect(html).toMatch(/<svg[^>]* role="img"[^>]* aria-label="The burette scale at the meniscus, enlarged"/)
    expect(count(html, /<line /g)).toBe(12)
    expect(svgTexts(html).filter((text) => /\d/.test(text))).toEqual(['24'])
    expect(attribute(html, 'svg', 'aria-describedby')).toBe('words')
    expect(textOf(html, 'words')).toBe(meniscusText(24370))
  })

  it('draws a graduation one screen pixel thick, and a whole or half mL two', () => {
    const html = reading(24370)
    const widths = [...html.matchAll(/<line [^>]*stroke-width="(\d)"[^>]*vector-effect="non-scaling-stroke"/g)].map((match) => match[1])
    // 23.8 to 24.9: the whole mL is the third mark and the half the eighth.
    expect(widths).toEqual(['1', '1', '2', '1', '1', '1', '1', '2', '1', '1', '1', '1'])
  })

  it('shows the words to every learner in a closed disclosure, and to assistive technology outside it', () => {
    const html = reading(24370)
    expect(html).toContain(`<details><summary`)
    expect(html).toMatch(/<summary[^>]*>The meniscus in words<\/summary>/)
    // The description is a hidden copy: a browser does not read one out of a closed disclosure.
    expect(html).toMatch(/<p[^>]* id="words"[^>]* hidden=""/)
    expect(count(html, new RegExp(meniscusText(24370).replaceAll('.', '\\.'), 'g'))).toBe(2)
  })

  it('shows no scale while the stopcock is open, and says so in the drawing and in the words', () => {
    const html = reading(24370, true, true)
    expect(count(html, /<line /g)).toBe(0)
    expect(svgTexts(html).join(' ')).toContain('Stopcock open.')
    expect(svgTexts(html).some((text) => /\d/.test(text))).toBe(false)
    expect(textOf(html, 'words')).toBe('The stopcock is open. Close it to read the burette.')
    expect(html).not.toContain('24.3')
  })

  it('says an empty burette is empty, and draws no liquid in it', () => {
    const html = reading(0, false)
    expect(textOf(html, 'words')).toBe('The burette is empty.')
    expect(svgTexts(html)).toContain('empty')
    expect(count(html, /<path /g)).toBe(count(reading(0), /<path /g) - 2)
  })

  it('never writes the level out, at any of a spread of levels', () => {
    for (const levelUl of [0, 987, 1963, 12563, 24370, 28263, 49999, 50000]) {
      const html = reading(levelUl)
      expect(words(html)).not.toMatch(/\d\.\d\d/)
      for (const text of svgTexts(html)) expect(text).toMatch(/^(\d{1,2}|mL)$/)
    }
  })
})

describe('the reading field', () => {
  const props: ReadingInputProps = { wanted: 'initial', blockedText: null, onReading: () => ({ accepted: true, text: '' }) }
  const field = (patch: Partial<ReadingInputProps> = {}) => renderToStaticMarkup(createElement(ReadingInput, { ...props, ...patch }))
  const labelOf = (html: string) => /<label[^>]* for="([^"]*)"[^>]*>([^<]*)<\/label>/.exec(html)!
  const BLOCKED = 'Fill the burette first.'

  it('is labelled by the reading that is wanted, with a reason for being unavailable or without one', () => {
    for (const blockedText of [null, BLOCKED]) {
      for (const [wanted, name] of [['initial', 'Initial burette reading (mL)'], ['final', 'Final burette reading (mL)']] as const) {
        const html = field({ wanted, blockedText })
        const [, target, text] = labelOf(html)
        expect(text).toBe(name)
        expect(attribute(html, 'input', 'id')).toBe(target)
      }
    }
  })

  it('is a text field with a decimal keypad, not a number field, and Record submits it', () => {
    const html = field()
    expect(attribute(html, 'input', 'type')).toBe('text')
    expect(html).toMatch(/<input[^>]* inputMode="decimal"/i)
    expect(html).not.toContain('type="number"')
    expect(html).not.toMatch(/<input[^>]* disabled=/)
    expect(html).toMatch(/<form[^>]*>.*<button[^>]* type="submit"[^>]*>Record<\/button>.*<\/form>/s)
  })

  it('is described by its reply, a status under it', () => {
    const html = field()
    const describedBy = attribute(html, 'input', 'aria-describedby')!
    expect(html).toMatch(new RegExp(`<p[^>]* id="${describedBy}"[^>]* role="status"|<p[^>]* role="status"[^>]* id="${describedBy}"`))
  })

  it('with a reason is disabled, with the reason visible and tied to it and to Record, which stays focusable', () => {
    const html = field({ blockedText: BLOCKED })
    expect(html).toMatch(/<input[^>]* disabled=""/)
    const describedBy = attribute(html, 'input', 'aria-describedby')!
    expect(textOf(html, describedBy)).toBe(BLOCKED)
    expect(html).not.toMatch(new RegExp(`<p[^>]* id="${describedBy}"[^>]* hidden`))
    const record = /<button[^>]*>Record<\/button>/.exec(html)![0]
    expect(record).toContain('aria-disabled="true"')
    expect(record).toContain(`aria-describedby="${describedBy}"`)
    expect(record).not.toMatch(/ disabled=|tabindex="-1"/)
  })
})

describe('what Record does with the text in the field', () => {
  const sent: number[] = []
  const onReading = (readingUl: number) => {
    sent.push(readingUl)
    return { accepted: true, text: 'Recorded.' }
  }

  it('sends a reading written to two decimal places, as whole microlitres', () => {
    sent.length = 0
    expect(recordReading('24.37', onReading)).toEqual({ accepted: true, text: 'Recorded.', invalid: false })
    expect(recordReading(' 0.05 ', onReading)).toEqual({ accepted: true, text: 'Recorded.', invalid: false })
    expect(sent).toEqual([24370, 50])
  })

  it('refuses any other text with the reading sentence, marks it invalid and sends nothing', () => {
    sent.length = 0
    for (const text of ['24,37', '24.370', '', 'abc', '-1.00', '1e1'])
      expect(recordReading(text, onReading)).toEqual({ accepted: false, text: INVALID_ENTRY_TEXT.reading, invalid: true })
    expect(sent).toEqual([])
  })

  it('refuses a reading written short of two decimals with the hint on significant figures, naming what was typed', () => {
    sent.length = 0
    for (const text of ['48.4', '1.6', ' 24.3 ', '24', '24.']) {
      const reply = recordReading(text, onReading)
      expect(reply).toEqual({ accepted: false, text: invalidReadingText(text), invalid: true })
      expect(reply.text).toContain(`${text.trim()} has too few significant figures`)
      expect(reply.text).not.toBe(INVALID_ENTRY_TEXT.reading)
    }
    // The hint does not finish the reading for the learner: it never offers the typed value with a zero added.
    expect(invalidReadingText('48.4')).not.toContain('48.40')
    expect(invalidReadingText('24.37x')).toBe(INVALID_ENTRY_TEXT.reading)
    expect(sent).toEqual([])
  })

  it('hands back a refusal or a hold as the page gave it, and does not call it invalid: the text was a reading', () => {
    expect(recordReading('27.67', () => ({ accepted: false, text: 'Read again.' }))).toEqual({ accepted: false, text: 'Read again.', invalid: false })
    expect(recordReading('27.67', () => ({ accepted: false, text: '' }))).toEqual({ accepted: false, text: '', invalid: false })
  })
})

describe('the stand', () => {
  const FAINT: FlaskColour = { name: 'faint pink', label: 'faint pink', strength: 0.4321, fill: PINK }
  const props: TitrationStandProps = {
    burette: { conditioned: true, filled: true, tipBubble: false, levelUl: 12563, atBottom: false },
    flask: { hasAliquot: true, indicatorDrops: 2, waterPortions: 0, volumeUl: 50802, pinkConcentration: 5.6e-6, pink: true, overshot: false },
    plume: 'persists',
    plumeKey: 25700,
    plumeFadeSeconds: { atOnce: 0.5, slowly: 3 },
    colour: FAINT,
    stopcockOpen: false,
    reducedMotion: false,
    describedBy: 'stand-words',
  }
  const stand = (patch: Partial<TitrationStandProps> = {}) => renderToStaticMarkup(createElement(TitrationStand, { ...props, ...patch }))

  it('is a named drawing, described by the paragraph it is handed', () => {
    const html = stand()
    expect(html).toMatch(/^<svg[^>]* role="img"[^>]* aria-label="Burette on its stand over the conical flask"/)
    expect(attribute(html, 'svg', 'aria-describedby')).toBe('stand-words')
  })

  it('has a mark at every mL, numbered at the tens, and the solution as a column from its level', () => {
    const html = stand()
    expect(count(html, /<line [^>]*vector-effect="non-scaling-stroke"/g)).toBe(51)
    expect(svgTexts(html).filter((text) => /^\d+$/.test(text))).toEqual(['0', '10', '20', '30', '40', '50'])
    // The glass is a rect of the same width from the top of the tube; the column starts at the level.
    expect(html).toContain(`<rect x="139" y="${standY(12563)}"`)
    expect(stand({ burette: { ...props.burette, levelUl: 0 } })).toContain(`<rect x="139" y="${standY(0)}"`)
    expect(stand({ burette: { ...props.burette, filled: false, levelUl: 0 } })).not.toContain(`<rect x="139" y="${standY(0)}"`)
  })

  it('shows the stopcock closed or open by the handle and by the word', () => {
    const closed = stand()
    const open = stand({ stopcockOpen: true })
    expect(svgTexts(closed)).toContain('closed')
    expect(svgTexts(closed)).not.toContain('open')
    expect(svgTexts(open)).toContain('open')
    expect(svgTexts(open)).not.toContain('closed')
    const handle = (html: string) => /<g transform="(rotate\([^"]*\))"/.exec(html)![1]
    expect(handle(closed)).toMatch(/^rotate\(0 /)
    expect(handle(open)).toMatch(/^rotate\(90 /)
  })

  it('names the air bubble in the tip while there is one', () => {
    expect(svgTexts(stand())).not.toContain('air bubble')
    const html = stand({ burette: { ...props.burette, tipBubble: true } })
    expect(svgTexts(html)).toContain('air bubble')
    expect(count(html, /<ellipse /g)).toBe(count(stand(), /<ellipse /g) + 1)
  })

  it('draws no plume and no drop on a first render, whatever the last addition was', () => {
    for (const reducedMotion of [false, true])
      for (const plume of ['fades-at-once', 'fades-slowly', 'persists', null] as const)
        for (const plumeKey of [0, 250, 25700])
          for (const stopcockOpen of [false, true]) {
            const html = stand({ reducedMotion, plume, plumeKey, stopcockOpen })
            expect(html).not.toContain('bench-plume')
            expect(html).not.toContain('bench-drop')
          }
  })

  it('draws the pink as a layer at the strength it is given, and an overshot flask in the darker colour', () => {
    expect(stand()).toContain(`fill="${PINK}" fill-opacity="0.4321"`)
    expect(stand({ colour: { name: 'dark pink', label: 'dark pink (overshot)', strength: 1, fill: DARK_PINK } })).toContain(`fill="${DARK_PINK}" fill-opacity="1"`)
    expect(stand({ colour: { name: 'colourless', label: 'colourless', strength: 0, fill: PINK } })).toContain(`fill="${PINK}" fill-opacity="0"`)
  })

  it('draws the flask on a white card, with liquid only once it holds the acid, higher for a larger volume', () => {
    const empty = stand({ flask: { ...props.flask, hasAliquot: false, volumeUl: 0 }, colour: { name: 'empty', label: 'empty', strength: 0, fill: PINK } })
    expect(empty).toContain('fill="#ffffff"')
    expect(empty).not.toContain(`fill="${PINK}"`)
    // The colourless liquid under the pink layer: its top edge is the surface.
    const surface = (volumeUl: number) => Number(/<rect [^>]*y="([\d.]+)"[^>]*fill="#e8edf2"/.exec(stand({ flask: { ...props.flask, volumeUl } }))![1])
    expect(surface(25102)).toBeGreaterThan(surface(35102))
    expect(surface(35102)).toBeGreaterThan(surface(50802))
  })

  it('never writes out the strength, the volume in the flask or the volume delivered', () => {
    for (const stopcockOpen of [false, true]) {
      const html = stand({ stopcockOpen })
      const readable = [words(html), ...[...html.matchAll(/ (?:title|aria-[a-z]+|data-[a-z-]+)="([^"]*)"/g)].map((match) => match[1]!)].join(' ')
      for (const hidden of ['4321', '50802', '25700']) expect(readable).not.toContain(hidden)
      expect(html).not.toContain('<title')
      expect(html).not.toContain('50802')
      expect(html).not.toContain('25700')
    }
  })
})

describe('the plume to draw', () => {
  const given = { plume: 'fades-at-once', plumeKey: 500, plumeFadeSeconds: { atOnce: 0.5, slowly: 3 }, reducedMotion: false } as const

  it('is none while the key is still the one the stand was mounted with: a reload makes no addition', () => {
    for (const plume of ['fades-at-once', 'fades-slowly', 'persists'] as const) expect(plumeToDraw(500, { ...given, plume })).toBeNull()
    expect(plumeToDraw(0, { ...given, plumeKey: 0 })).toBeNull()
  })

  it('is none under reduced motion, whatever the key', () => {
    for (const plumeKey of [0, 500, 750]) expect(plumeToDraw(500, { ...given, plumeKey, reducedMotion: true })).toBeNull()
  })

  it('once the key differs is the status, with the fade of that status and none for a plume that persists', () => {
    expect(plumeToDraw(250, given)).toEqual({ status: 'fades-at-once', fadeSeconds: 0.5 })
    expect(plumeToDraw(250, { ...given, plume: 'fades-slowly' })).toEqual({ status: 'fades-slowly', fadeSeconds: 3 })
    expect(plumeToDraw(250, { ...given, plume: 'persists' })).toEqual({ status: 'persists', fadeSeconds: null })
    expect(plumeToDraw(250, { ...given, plumeFadeSeconds: { atOnce: 0.8, slowly: 5 } })).toEqual({ status: 'fades-at-once', fadeSeconds: 0.8 })
  })

  it('is none when the last addition has no status left: after a swirl and wait, or a wash', () => {
    expect(plumeToDraw(250, { ...given, plume: null })).toBeNull()
  })
})

describe('the shelf drawings', () => {
  it('are each hidden from assistive technology: the tile says the same in text', () => {
    for (const drawing of [createElement(Bottle, { lines: ['HCl', '0.0976 M'] }), createElement(WashBottle), createElement(Pipette), createElement(Dropper)])
      expect(renderToStaticMarkup(drawing)).toMatch(/^<svg[^>]* aria-hidden="true"/)
  })

  it('a bottle carries the lines of its label', () => {
    expect(svgTexts(renderToStaticMarkup(createElement(Bottle, { lines: ['HCl', '0.0976 M'] })))).toEqual(['HCl', '0.0976 M'])
  })
})

describe('the stopcock controls', () => {
  const props: StopcockControlsProps = {
    stream: CLOSED,
    controls: { clearTipBubble: null, deliver: null, swirlAndWait: null },
    onClearTip: () => {},
    onAdd: () => {},
    onToggle: () => {},
    onSwirl: () => {},
  }
  const controls = (patch: Partial<StopcockControlsProps> = {}) => renderToStaticMarkup(createElement(StopcockControls, { ...props, ...patch }))
  /** Each button's opening tag and its name, in the order of the markup. */
  const buttons = (html: string) => [...html.matchAll(/(<button[^>]*>)([^<]*)<\/button>/g)].map((match) => ({ tag: match[1]!, name: match[2]! }))
  const names = (html: string) => buttons(html).map((button) => button.name)
  const unavailable = (html: string) => buttons(html).filter((button) => button.tag.includes('aria-disabled="true"')).map((button) => button.name)
  const FINE_FIRST = ['Add half-drop', 'Add drop', 'Run in 1 mL', 'Run in 5 mL', 'Open stopcock']

  it('are seven buttons: Clear the tip, the five of the group named Stopcock with the fine ones first, then the swirl', () => {
    const html = controls()
    expect(names(html)).toEqual(['Clear the tip', ...FINE_FIRST, 'Swirl and wait 30 s'])
    const group = /<div role="group" aria-label="Stopcock"[^>]*>(.*?)<\/div>/s.exec(html)![1]!
    expect(names(group)).toEqual(FINE_FIRST)
    expect(unavailable(html)).toEqual([])
  })

  it('mark a button the engine has no use for as unavailable, and leave it focusable', () => {
    const html = controls({ controls: { clearTipBubble: 'no-tip-bubble', deliver: 'needs-indicator', swirlAndWait: 'flask-empty' } })
    expect(unavailable(html)).toEqual(['Clear the tip', ...FINE_FIRST, 'Swirl and wait 30 s'])
    for (const { tag } of buttons(html)) {
      expect(tag).not.toMatch(/ disabled=|tabindex="-1"/)
      expect(tag).toContain('type="button"')
    }
    expect(unavailable(controls({ controls: { clearTipBubble: 'no-tip-bubble', deliver: null, swirlAndWait: null } }))).toEqual(['Clear the tip'])
    expect(unavailable(controls({ controls: { clearTipBubble: null, deliver: null, swirlAndWait: 'flask-empty' } }))).toEqual(['Swirl and wait 30 s'])
  })

  it('say whether the stopcock is open by the name of its button alone: no button carries a pressed state beside a name that changes', () => {
    const toggle = (html: string) => buttons(html)[5]!.name
    expect(toggle(controls())).toBe('Open stopcock')
    expect(toggle(controls({ stream: openStream(null) }))).toBe('Close stopcock')
    // "Close stopcock, pressed" is heard as closed while it is open.
    for (const stream of [CLOSED, openStream(null), openStream(POUR_ADDITIONS[0])]) expect(controls({ stream })).not.toContain('aria-pressed')
  })

  it('while a stream runs, leave only the button that started it, which then closes the stopcock', () => {
    const others = (mine: string) => ['Clear the tip', ...FINE_FIRST, 'Swirl and wait 30 s'].map((name) => (name === mine ? 'Close stopcock' : name))
    const running = [
      [openStream(null), 'Open stopcock'],
      [openStream(POUR_ADDITIONS[0]), 'Run in 1 mL'],
      [openStream(POUR_ADDITIONS[1]), 'Run in 5 mL'],
      // A pour part-way through is still that pour's.
      [{ open: true, pour: POUR_ADDITIONS[1], remaining: 7 }, 'Run in 5 mL'],
    ] as const
    for (const [stream, mine] of running) {
      // Mid-titration the engine has no use for clearing the tip.
      const html = controls({ stream, controls: { clearTipBubble: 'mid-titration', deliver: null, swirlAndWait: null } })
      expect(names(html)).toEqual(others(mine))
      expect(unavailable(html)).toEqual(others(mine).filter((name) => name !== 'Close stopcock'))
    }
  })

  it('leave the button that closes a running stream usable when the engine can take no more', () => {
    const html = controls({ stream: openStream(null), controls: { clearTipBubble: 'trial-ended', deliver: 'trial-ended', swirlAndWait: 'trial-ended' } })
    expect(unavailable(html)).not.toContain('Close stopcock')
    expect(names(html)).toContain('Close stopcock')
  })

  it('print no number but the two pours', () => {
    expect(words(controls()).match(/\d+/g)).toEqual(['1', '5', '30'])
  })
})

// The whole bench, on views of real engine states: the stored record's model, seed 1.
const m = modelFrom(titrationData)
const P = titrationData.parameters
const display = {
  pinkDisplayScale: P.pinkDisplayScale.value,
  faintPinkNameLimit: P.faintPinkNameLimit.value,
  plumeFadeAtOnceSeconds: P.plumeFadeAtOnceSeconds.value,
  plumeFadeSlowlySeconds: P.plumeFadeSlowlySeconds.value,
}
const { run, prepared, titrateCarefully } = learner()
const deliver = (amount: 'stream' | 'drop' | 'half'): BenchAction => ({ type: 'deliver', amount })
const WASH: BenchAction = { type: 'addWater' }
const SWIRL: BenchAction = { type: 'swirlAndWait' }

describe('the bench', () => {
  const bench = (state: TitrationState, patch: Partial<TitrationBenchProps> = {}) =>
    renderToStaticMarkup(
      createElement(TitrationBench, {
        view: benchViewOf(m, state),
        display,
        bottles: titrationData.bottles,
        sources,
        reducedMotion: false,
        onAction: () => 'done' as const,
        onReading: () => ({ accepted: true, text: '' }),
        ...patch,
      }),
    )
  /** The shelf's tiles in the order of the markup: each one's heading and its markup. */
  const tiles = (html: string) => {
    const shelf = /<div role="group" aria-label="Reagents and glassware"[^>]*>(.*)<div role="group" aria-label="Burette and flask"/s.exec(html)![1]!
    return shelf
      .split(/<div role="group" aria-labelledby=/)
      .slice(1)
      .map((tile) => ({ heading: /<h3[^>]*>([^<]*)<\/h3>/.exec(tile)![1]!, html: tile }))
  }
  const buttons = (html: string) => [...html.matchAll(/(<button[^>]*>)([^<]*)<\/button>/g)].map((match) => ({ tag: match[1]!, name: match[2]! }))
  const names = (html: string) => buttons(html).map((button) => button.name)
  const hazards = (html: string) => count(html, /<summary[^>]*>Hazards<\/summary>/g)
  const fresh = createLab(1, 'guided')
  const filled = run(m, fresh, [{ type: 'fillBurette' }])
  const ready = prepared(m, 1, { mode: 'guided' })

  it('is a region named Bench holding three groups in order: the shelf, the burette and flask, the reading', () => {
    const html = bench(fresh)
    expect(html).toMatch(/^<section aria-label="Bench"/)
    expect([...html.matchAll(/role="group" aria-label="([^"]*)"/g)].map((match) => match[1])).toEqual(['Reagents and glassware', 'Burette and flask', 'Stopcock', 'Burette reading'])
  })

  it('has five tiles in order, each a group named by its heading, with its controls', () => {
    const shelf = tiles(bench(fresh))
    expect(shelf.map((tile) => tile.heading)).toEqual(['Hydrochloric acid', 'Sodium hydroxide', 'Pipette, 25.00 mL, with filler', 'Phenolphthalein indicator', 'Distilled water'])
    for (const tile of shelf) expect(tile.html).toMatch(new RegExp(`^"([^"]*)"[^>]*>.*<h3 id="\\1"`, 's'))
    expect(shelf.map((tile) => names(tile.html))).toEqual([[], ['Condition burette', 'Fill burette'], ['Rinse pipette with HCl', 'Pipette HCl into flask'], ['Add 1 drop of indicator'], ['Rinse down flask']])
    // Each drawing is hidden: the tile says the same in text.
    for (const tile of shelf) expect(count(tile.html, /<svg[^>]* aria-hidden="true"/g)).toBe(1)
  })

  it('has three Hazards disclosures, one in each bottle\'s tile, the indicator\'s among them', () => {
    const html = bench(fresh)
    expect(hazards(html)).toBe(3)
    expect(tiles(html).map((tile) => hazards(tile.html))).toEqual([1, 1, 0, 1, 0])
    const [hcl, naoh, , indicator] = tiles(html)
    expect(hcl!.html).toContain(titrationData.bottles.hcl.classifiedAs.replaceAll("'", '&#x27;'))
    expect(naoh!.html).toContain(titrationData.bottles.naoh.classifiedAs.replaceAll("'", '&#x27;'))
    expect(indicator!.html).toContain(titrationData.bottles.indicator.classifiedAs.replaceAll("'", '&#x27;'))
    for (const tile of [hcl!, naoh!, indicator!]) expect(tile.html).toMatch(/<summary[^>]*>Sources<\/summary>/)
  })

  it('shows the label of the HCl bottle as text, as the drawing has it', () => {
    const [hcl] = tiles(bench(fresh))
    expect(words(hcl!.html.replace(/<svg.*?<\/svg>/s, ''))).toContain('Label: HCl, 0.0976 M. Standardized.')
    expect(svgTexts(hcl!.html)).toEqual(['HCl', '0.0976 M'])
  })

  it('says what has been done in words beside a tick, and counts the drops and the rinses as text', () => {
    const state = (html: string) => tiles(html).map((tile) => [...tile.html.matchAll(/<p[^>]*><span aria-hidden="true">✓ <\/span>([^<]*)<\/p>/g)].map((match) => match[1]))
    expect(state(bench(fresh))).toEqual([[], [], [], [], []])
    expect(names(bench(filled))).toContain('Refill burette')
    expect(names(bench(filled))).not.toContain('Fill burette')
    // Filled without conditioning: the tile does not say it was conditioned.
    expect(state(bench(filled))[1]).toEqual(['Burette filled.'])
    expect(state(bench(ready))).toEqual([[], ['Burette conditioned.', 'Burette filled.'], ['Pipette wet with HCl.', 'HCl is in the flask.'], [], []])
    expect(words(tiles(bench(ready))[3]!.html)).toContain('Drops in the flask: 2')
    expect(words(tiles(bench(run(m, ready, [WASH, WASH])))[4]!.html)).toContain('Rinses of this flask: 2')
    // Conditioning leaves the burette empty.
    expect(state(bench(run(m, fresh, [{ type: 'conditionBurette' }])))[1]).toEqual(['Burette conditioned.'])
  })

  it('marks a control the engine has blocked as unavailable and leaves it focusable', () => {
    const view = benchViewOf(m, filled)
    const html = bench(filled)
    const unavailable = buttons(html)
      .filter((button) => button.tag.includes('aria-disabled="true"'))
      .map((button) => button.name)
    // Record is the field's own, and is tied to its reason.
    expect(unavailable).toEqual(['Add 1 drop of indicator', 'Rinse down flask', 'Add half-drop', 'Add drop', 'Run in 1 mL', 'Run in 5 mL', 'Open stopcock', 'Swirl and wait 30 s'])
    expect(view.controls).toMatchObject({ conditionBurette: null, fillBurette: null, clearTipBubble: null, rinsePipette: null, pipetteAliquot: null, addIndicatorDrop: 'flask-empty', addWater: 'flask-empty', deliver: 'flask-empty', swirlAndWait: 'flask-empty' })
    for (const { tag } of buttons(html)) expect(tag).not.toMatch(/ disabled=|tabindex="-1"/)
    // A trial that is over: every control says so.
    const over = run(m, ready, [{ type: 'discardTrial' }])
    expect(buttons(bench(over)).filter((button) => !button.tag.includes('aria-disabled="true"'))).toEqual([])
  })

  it('puts the status line, the slow-down line, the message line and the notice under the stopcock in that order, before the reading', () => {
    const { additions } = titrateCarefully(m, ready)
    const near = run(m, ready, additions.slice(0, -3).map((addition) => deliver(addition.amount)))
    const view = benchViewOf(m, near)
    expect(view.slowDown).toBe(true)
    const html = bench(near, { notice: createElement('div', { id: 'notice' }) })
    const at = [
      html.indexOf('>Swirl and wait 30 s</button>'),
      html.indexOf(`<p role="status">${flaskStatus(view, display)}</p>`),
      html.indexOf(`<p role="status">${SLOW_DOWN_TEXT.replaceAll("'", '&#x27;')}</p>`),
      html.indexOf('<p role="status"></p>'),
      html.indexOf('<div id="notice">'),
      html.indexOf('aria-label="Burette reading"'),
    ]
    expect(at.every((index) => index > 0)).toBe(true)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    // The slow-down line is there and empty when the hint does not apply, so that a reader hears it arrive.
    const quiet = bench(ready)
    expect(count(quiet, /<p role="status"><\/p>/g)).toBe(2)
    expect(quiet).not.toContain('Slow down')
  })

  it('describes the stand in a hidden paragraph and in a closed disclosure, and the reading view by the meniscus in words', () => {
    const html = bench(ready)
    const standId = attribute(html, 'svg', 'aria-describedby')!
    expect(textOf(html, standId)).toContain('The stopcock is closed.')
    expect(html).toMatch(/<summary[^>]*>Text description of the burette and flask<\/summary>/)
    expect(html).toContain(meniscusText(benchViewOf(m, ready).burette.levelUl))
    expect(html).toMatch(/<label[^>]*>Initial burette reading \(mL\)<\/label>/)
  })

  it('gives the reading field its reason when no reading can be recorded', () => {
    const html = bench(fresh)
    expect(html).toMatch(/<input[^>]* disabled=""/)
    expect(words(html)).toContain(BLOCKED_TEXT['burette-empty'])
    expect(bench(filled)).not.toMatch(/<input[^>]* disabled=""/)
  })

  it("holds no number with two decimals, the nominal volume of the pipette and the stored text of the bottles' hazards apart", () => {
    // A hazard note is the record's own text, the same in every state, and one gives a strength in percent.
    const HAZARDS = /<details><summary[^>]*>Hazards<\/summary>.*?(?=<div role="group")/gs
    const { state: atEndpoint } = titrateCarefully(m, ready)
    let overshot = atEndpoint
    while (benchViewOf(m, overshot).trialEnd === 'open') overshot = run(m, overshot, [deliver('drop')])
    expect(benchViewOf(m, overshot).trialEnd).toBe('overshot')
    for (const state of [fresh, filled, ready, atEndpoint, overshot]) {
      const html = bench(state)
      expect(count(html, HAZARDS)).toBe(3)
      const read = words(html.replace(HAZARDS, '')).replaceAll('25.00 mL', '')
      expect(read).not.toMatch(/\d\.\d\d(?!\d)/)
    }
  })

  it('draws no plume and no drop under reduced motion, given as a prop', () => {
    expect(bench(ready, { reducedMotion: true })).not.toMatch(/bench-plume|bench-drop/)
  })
})

describe('the message line', () => {
  const view = (state: TitrationState) => benchViewOf(m, state)
  const ready = prepared(m, 1, { mode: 'guided' })
  const { state: confirmedEndpoint } = titrateCarefully(m, ready)
  const done = (before: TitrationState, action: BenchAction, text = '') => ({ text, done: { action, before: view(before) } })

  it('is the text it was given when nothing was done: a reason, or nothing yet', () => {
    expect(messageLine({ text: '' }, view(ready), CLOSED)).toBe('')
    expect(messageLine({ text: BLOCKED_TEXT['flask-empty'] }, view(ready), CLOSED)).toBe(BLOCKED_TEXT['flask-empty'])
  })

  it('says what a prep action did', () => {
    const before = createLab(1, 'guided')
    const action: BenchAction = { type: 'conditionBurette' }
    expect(messageLine(done(before, action, ACTION_TEXT.conditionBurette), view(run(m, before, [action])), CLOSED)).toBe(ACTION_TEXT.conditionBurette)
  })

  it('says what a swirl and wait found, from the view after it', () => {
    expect(messageLine(done(ready, SWIRL), view(run(m, ready, [SWIRL])), CLOSED)).toBe(swirlText('faded'))
    const pink = run(m, confirmedEndpoint, [deliver('half')])
    expect(messageLine(done(pink, SWIRL), view(run(m, pink, [SWIRL])), CLOSED)).toBe(swirlText('persisted'))
  })

  it('says a sentence that is already showing with "Again:" before it, and plainly the time after, so that a live region speaks on every press', () => {
    const reason = BLOCKED_TEXT['burette-empty']
    const fresh = view(createLab(1, 'challenge'))
    // A refusal, by the same button or by another with the same reason.
    expect(messageLine({ text: reason, previous: '' }, fresh, CLOSED)).toBe(reason)
    expect(messageLine({ text: reason, previous: reason }, fresh, CLOSED)).toBe(`Again: ${reason}`)
    expect(messageLine({ text: reason, previous: `Again: ${reason}` }, fresh, CLOSED)).toBe(reason)
    // An action that says the same each time it is done: the second and third drops of indicator.
    const INDICATOR: BenchAction = { type: 'addIndicatorDrop' }
    const oneDrop = prepared(m, 1, { drops: 1 })
    const twoDrops = run(m, oneDrop, [INDICATOR])
    const second = messageLine({ ...done(oneDrop, INDICATOR, ACTION_TEXT.addIndicatorDrop), previous: ACTION_TEXT.addIndicatorDrop }, view(twoDrops), CLOSED)
    expect(second).toBe(`Again: ${ACTION_TEXT.addIndicatorDrop}`)
    expect(messageLine({ ...done(twoDrops, INDICATOR, ACTION_TEXT.addIndicatorDrop), previous: second }, view(run(m, twoDrops, [INDICATOR])), CLOSED)).toBe(ACTION_TEXT.addIndicatorDrop)
    // A second swirl that finds the same, whose sentence is worded from the view.
    const swirled = run(m, ready, [SWIRL])
    expect(messageLine({ ...done(swirled, SWIRL), previous: swirlText('faded') }, view(run(m, swirled, [SWIRL])), CLOSED)).toBe(`Again: ${swirlText('faded')}`)
    // Nothing said is nothing said again.
    expect(messageLine({ text: '', previous: '' }, fresh, CLOSED)).toBe('')
  })

  it('follows the stopcock for a stream: open, a pour, and closed again however it closed', () => {
    const said = done(ready, deliver('stream'))
    const after = view(run(m, ready, [deliver('stream')]))
    expect(messageLine(said, after, openStream(null))).toBe(streamMessage(openStream(null)))
    expect(messageLine(said, after, openStream(POUR_ADDITIONS[0]))).toBe(streamMessage(openStream(POUR_ADDITIONS[0])))
    expect(messageLine(said, after, CLOSED)).toBe('Stopcock closed.')
    // Closed for the learner when they left the Lab tab: the line says that, once the bench is shown again.
    expect(messageLine(said, after, CLOSED_UNSEEN)).toBe(streamMessage(CLOSED_UNSEEN))
    expect(messageLine(said, after, CLOSED_UNSEEN)).toMatch(/^Stopcock closed: .*left the Lab tab\.$/)
  })

  it('adds, after a drop or a wash that undid a pink that had lasted, that the wait no longer counts', () => {
    for (const action of [deliver('half'), deliver('drop'), WASH]) {
      const after = view(run(m, confirmedEndpoint, [action]))
      const undone = undoneText(view(confirmedEndpoint), after)
      expect(undone).not.toBe('')
      expect(messageLine(done(confirmedEndpoint, action, 'Said.'), after, CLOSED)).toBe(`Said. ${undone}`)
    }
    // An ordinary drop says nothing of it.
    expect(messageLine(done(ready, deliver('drop'), 'Drop added.'), view(run(m, ready, [deliver('drop')])), CLOSED)).toBe('Drop added.')
  })

  it('gives the ran-out sentence when the action ended the trial at the last mark, and the wash\'s own when a wash did', () => {
    // Trial 2 without a refill: the burette reaches the 50 mL mark before the endpoint.
    let low = run(m, confirmedEndpoint, [{ type: 'discardTrial' }, { type: 'startNextTrial' }])
    low = learner().readyTrial(m, low, { fill: false })
    let before = low
    while (view(low).trialEnd === 'open') {
      before = low
      low = run(m, low, [deliver('stream')])
    }
    expect(view(low).trialEnd).toBe('ran-out')
    expect(messageLine(done(before, deliver('stream')), view(low), CLOSED)).toBe(OUTCOME_TEXT['ran-out'])
    expect(messageLine(done(before, deliver('drop'), 'Drop added.'), view(low), CLOSED)).toBe(OUTCOME_TEXT['ran-out'])
    expect(messageLine(done(before, WASH, ACTION_TEXT.addWater), view(low), CLOSED)).toBe(OUTCOME_TEXT['washed-out'])
    // Once the trial has ended, a later press is told only its own reason.
    expect(messageLine({ text: BLOCKED_TEXT['trial-ended'] }, view(low), CLOSED)).toBe(BLOCKED_TEXT['trial-ended'])
  })
})
