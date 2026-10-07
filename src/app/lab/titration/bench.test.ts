// The markup the bench's drawings and controls put their names, states and words in. What a key press does, where
// focus goes, the timer and the sizes on screen are checked in a browser.
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import sources from '@/chem-data/sources.json'
import { titrationData } from '@/chem-data/titration/data'
import { ROLE } from '@/app/lab/roles'
import { can, createLab, currentTrial, modelFrom, type TitrationState } from '@/engine/titration'
import { calculatedMolarityE6, honestReading, learner } from '@/engine/titration/testkit'
import { Bottle, Dropper, Pipette, WashBottle } from './apparatus'
import { ACTION_TEXT, ALREADY_CONDITIONED, FLASK, flaskStatus, SLOW_DOWN_TEXT, STEP_BUTTON, stepsDone, streamMessage, swirlText, undoneText } from './benchText'
import { benchViewOf, type BenchAction } from './benchView'
import { standY } from './buretteGeometry'
import { DARK_PINK, PINK, type FlaskColour } from './flaskColour'
import { meniscusText } from './meniscusText'
import { entryKey, fieldState } from './entry'
import { BLOCKED_TEXT, INVALID_ENTRY_TEXT, invalidReadingText, NOTEBOOK_TEXT, OUTCOME_TEXT } from './messages'
import { ReadingInput, recordReading, replyUnder, type ReadingInputProps } from './ReadingInput'
import { MeniscusWords, ReadingView } from './ReadingView'
import { StopcockControls, type StopcockControlsProps } from './StopcockControls'
import { CLOSED, CLOSED_UNSEEN, openStream, POUR_ADDITIONS } from './stream'
import { benchAnswer, messageLine, TitrationBench, type TitrationBenchProps } from './TitrationBench'
import { plumeToDraw, TitrationStand, type TitrationStandProps } from './TitrationStand'

const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length
/** The text nodes of the drawing's own lettering. */
const svgTexts = (html: string) => [...html.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1]!.replace(/<[^>]+>/g, ' ').trim())
const attribute = (html: string, tag: string, name: string) => new RegExp(`<${tag}[^>]* ${name}="([^"]*)"`).exec(html)?.[1]
/** Everything a learner can read in it: the markup with its tags and their attributes taken out. */
const words = (html: string) => html.replace(/<[^>]+>/g, ' ')
/** The same as a reader meets it: the tags gone and nothing put in their place, so words in a span of their own still read on. */
const text = (html: string) => html.replace(/<[^>]+>/g, '')
/** The text of the element with this id. */
const textOf = (html: string, id: string) => new RegExp(`<p[^>]* id="${id}"[^>]*>([^<]*)</p>`).exec(html)?.[1]
const escaped = (words: string) => words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The class of the span that holds exactly these words: '' when it has none, undefined when no span holds them. */
const roleOf = (html: string, held: string) => {
  const match = new RegExp(`<span(?: class="([^"]*)")?>${escaped(held)}</span>`).exec(html)
  return match ? (match[1] ?? '') : undefined
}

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

  const buttonNames = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1])
  const labelTag = (html: string) => /<label[^>]*>/.exec(html)![0]

  it('once its reading is recorded is disabled and shows it, and the button reads Change, described by the label of the field it is of', () => {
    const html = field({ recorded: 2560 })
    expect(html).toMatch(/<input[^>]* disabled=""/)
    expect(attribute(html, 'input', 'value')).toBe('2.56')
    expect(buttonNames(html)).toEqual([NOTEBOOK_TEXT.change])
    const change = /<button[^>]*>Change<\/button>/.exec(html)![0]
    // Still the form's own button, so the one that had focus as Record keeps it as Change.
    expect(change).toContain('type="submit"')
    expect(change).not.toContain('aria-disabled="')
    expect(change).toContain(`aria-describedby="${/<label id="([^"]*)"/.exec(html)![1]}"`)
    // Nothing is under it but its reply, which is empty.
    expect(html).not.toContain(ROLE.held)
  })

  it('once its reading is recorded and no reading can be taken again, shows it with the one reason under it and no Change', () => {
    const html = field({ recorded: 28260, wanted: 'final', blockedText: BLOCKED_TEXT['trial-ended'] })
    expect(html).toMatch(/<input[^>]* disabled=""/)
    expect(attribute(html, 'input', 'value')).toBe('28.26')
    expect(buttonNames(html)).toEqual([NOTEBOOK_TEXT.record])
    expect(/<button[^>]*>Record<\/button>/.exec(html)![0]).toContain('aria-disabled="true"')
    expect(textOf(html, attribute(html, 'input', 'aria-describedby')!)).toBe(BLOCKED_TEXT['trial-ended'])
    // The reply's paragraph is there for a reader to hear it arrive, and is empty.
    expect([...html.matchAll(/<p[^>]*>([^<]*)<\/p>/g)].map((match) => match[1])).toEqual([BLOCKED_TEXT['trial-ended'], ''])
    expect(html).not.toContain('aria-invalid="')
  })

  it('carries the entry role on its label only while it waits for typing, and the held role on its reason', () => {
    expect(labelTag(field())).toContain(ROLE.entry)
    expect(labelTag(field({ blockedText: BLOCKED }))).not.toContain(ROLE.entry)
    expect(labelTag(field({ recorded: 2560 }))).not.toContain(ROLE.entry)
    expect(labelTag(field({ recorded: 2560, blockedText: BLOCKED }))).not.toContain(ROLE.entry)
    expect(field({ blockedText: BLOCKED })).toMatch(new RegExp(`<p id="[^"]*" class="${ROLE.held}">${escaped(BLOCKED)}</p>`))
    // The words are the same with the roles taken off: the label names the field and the sentence gives the reason.
    expect(text(field({ blockedText: BLOCKED }))).toBe(`Initial burette reading (mL)Record${BLOCKED}`)
  })

  // The screenshot of 2026-10-06: "Write the reading to two decimal places..." stood under a field of a trial that
  // was over, beside "This trial is over.", and the field had the outline of an invalid entry.
  it('says nothing of an earlier entry, and marks nothing invalid, under a field that takes no reading now', () => {
    const refused = { wanted: 'final', text: INVALID_ENTRY_TEXT.reading, invalid: true } as const
    expect(replyUnder(refused, 'final', false)).toBe(refused)
    expect(replyUnder(refused, 'final', true)).toBeNull()
    // And a reply is of the reading it answered: an initial reading's is not said of the final one.
    expect(replyUnder({ ...refused, wanted: 'initial' }, 'final', false)).toBeNull()
  })
})

describe('a field that takes one entry', () => {
  /** A key as the form is handed it, with whether its default was prevented. */
  const pressed = (key: string, repeat = false) => {
    const event = { key, repeat, dropped: false, preventDefault: () => void (event.dropped = true) }
    return event
  }

  it('waits for typing until the entry is made, and then only while it is being changed', () => {
    expect(fieldState(false, false, false)).toEqual({ editable: true, changeable: false, cancellable: false })
    expect(fieldState(true, false, false)).toEqual({ editable: false, changeable: true, cancellable: false })
    expect(fieldState(true, false, true)).toEqual({ editable: true, changeable: false, cancellable: true })
  })

  it('held by the engine is never editable and offers no change, whatever was entered and whatever was pressed', () => {
    for (const recorded of [false, true])
      for (const changing of [false, true]) expect(fieldState(recorded, true, changing)).toEqual({ editable: false, changeable: false, cancellable: false })
  })

  it('with nothing entered has nothing to cancel, even if a change was under way when the entry went', () => {
    expect(fieldState(false, false, true)).toEqual({ editable: true, changeable: false, cancellable: false })
  })

  // What the key does to the three forms, and where focus goes, is checked in a browser.
  it('takes Escape as its Cancel while a change is open, and as nothing while there is nothing to cancel', () => {
    let cancelled = 0
    const cancel = () => void cancelled++
    entryKey(pressed('Escape'), cancel)
    expect(cancelled).toBe(1)
    for (const key of ['Enter', 'Tab', ' ', 'Backspace', 'e']) entryKey(pressed(key), cancel)
    expect(cancelled).toBe(1)
    expect(() => entryKey(pressed('Escape'), null)).not.toThrow()
  })

  // Enter in the field records and moves focus to the button, which then reads Change: every repeat of a held key
  // would be a press on it, opening the field and recording again in turn.
  it('takes a held Enter as one press: the repeats are dropped, and no other key is', () => {
    const dropped = (key: string, repeat: boolean) => {
      const event = pressed(key, repeat)
      entryKey(event, null)
      return event.dropped
    }
    expect([dropped('Enter', false), dropped('Enter', true)]).toEqual([false, true])
    // A held digit or Backspace repeats as it does in any field.
    for (const key of ['1', '.', 'Backspace', 'ArrowLeft', 'Tab', 'Escape']) expect([key, dropped(key, true)]).toEqual([key, false])
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
const { run, prepared, readyTrial, carefulTrial, titrateCarefully } = learner()
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
      // Before 2026-10-06 a heading was text alone; the pipette's now holds its volume in a span of its own.
      .map((tile) => ({ heading: text(/<h3[^>]*>(.*?)<\/h3>/.exec(tile)![1]!), html: tile }))
  }
  const TICK = /<span aria-hidden="true"[^>]*>✓ <\/span>/
  /**
   * Each button's opening tag, its name and whether it shows a tick. The name is the words: the tick is hidden from
   * assistive technology and is no part of it. Before 2026-10-06 no button held anything but its name.
   */
  const buttons = (html: string) =>
    [...html.matchAll(/(<button[^>]*>)(.*?)<\/button>/gs)].map((match) => ({ tag: match[1]!, name: text(match[2]!.replace(TICK, '')), ticked: TICK.test(match[2]!) }))
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

  // Before 2026-10-06 the label was one run of text; what is read off it is now in a span of its own, in the role of a value.
  it('shows the label of the HCl bottle as text, as the drawing has it', () => {
    const [hcl] = tiles(bench(fresh))
    expect(text(hcl!.html.replace(/<svg.*?<\/svg>/s, ''))).toContain('Label: HCl, 0.0976 M. Standardized.')
    expect(svgTexts(hcl!.html)).toEqual(['HCl', '0.0976 M'])
  })

  // Before 2026-10-06 this case held each step done to a line of its own, a tick and words in a paragraph
  // ("Burette conditioned.", "Burette filled.", "Pipette wet with HCl.", "HCl is in the flask."), over a button that
  // kept the name of the action. The owner asked for the two as one control, so the lines are gone and the case
  // after this one holds the buttons. The counts are values, not steps, and are still text.
  it('has no status line of a step done, and counts the drops and the rinses as text', () => {
    for (const state of [fresh, filled, ready]) for (const tile of tiles(bench(state))) expect(tile.html).not.toMatch(/<p[^>]*><span aria-hidden="true"/)
    expect(text(tiles(bench(ready))[3]!.html)).toContain('Drops in the flask: 2')
    expect(text(tiles(bench(run(m, ready, [WASH, WASH])))[4]!.html)).toContain('Rinses of this flask: 2')
  })

  describe('the four steps that are one button each', () => {
    /** The four in the order of the shelf: the name, a tick or none, and whether a press can do anything. */
    const steps = (state: TitrationState) =>
      tiles(bench(state))
        .slice(1, 3)
        .flatMap((tile) => buttons(tile.html))
        .map((button) => `${button.ticked ? '✓ ' : ''}${button.name}${button.tag.includes('aria-disabled="true"') ? ' (unavailable)' : ''}`)
    const conditioned = run(m, fresh, [{ type: 'conditionBurette' }])
    const pipetted = run(m, fresh, [{ type: 'pipetteAliquot' }])
    const titrating = run(m, ready, [deliver('drop')])
    const over = run(m, ready, [{ type: 'discardTrial' }])
    const next = run(m, over, [{ type: 'startNextTrial' }])
    const overBeforePipetting = run(m, fresh, [{ type: 'discardTrial' }])

    it('are named for the action until the step is done, and from then for what is so, with a tick in front', () => {
      expect(steps(fresh)).toEqual(['Condition burette', 'Fill burette', 'Rinse pipette with HCl', 'Pipette HCl into flask'])
      // Conditioning leaves the burette empty: it is conditioned and not filled.
      expect(steps(conditioned)).toEqual(['✓ Burette conditioned (unavailable)', 'Fill burette', 'Rinse pipette with HCl', 'Pipette HCl into flask'])
      // Filled without conditioning: the button does not say it was conditioned, and conditioning is still to do.
      expect(steps(filled)).toEqual(['Condition burette', '✓ Burette filled. Refill', 'Rinse pipette with HCl', 'Pipette HCl into flask'])
      expect(steps(run(m, fresh, [{ type: 'rinsePipette' }]))).toEqual(['Condition burette', 'Fill burette', '✓ Pipette wet with HCl (unavailable)', 'Pipette HCl into flask'])
      expect(steps(ready)).toEqual(['✓ Burette conditioned (unavailable)', '✓ Burette filled. Refill', '✓ Pipette wet with HCl (unavailable)', '✓ HCl is in the flask (unavailable)'])
    })

    it('say of a pipette that drew its acid without the rinse what is true of it: wet with HCl, never rinsed', () => {
      expect(pipetted.pipetteRinsed).toBe(true)
      expect(steps(pipetted).slice(2)).toEqual(['✓ Pipette wet with HCl (unavailable)', '✓ HCl is in the flask (unavailable)'])
      expect(Object.values(STEP_BUTTON).map((words) => words.done).join(' ')).not.toMatch(/rinsed/i)
    })

    it('keep the fill both a state and an action: filled is said in every state where the burette can still deliver, and Refill is unavailable exactly when the engine cannot fill', () => {
      for (const state of [filled, ready, titrating, over, next]) {
        const view = benchViewOf(m, state)
        expect(view.burette.filled).toBe(true)
        expect(steps(state)[1]).toBe(`✓ Burette filled. Refill${view.controls.fillBurette === null ? '' : ' (unavailable)'}`)
      }
      expect([filled, ready, titrating, over, next].map((state) => benchViewOf(m, state).controls.fillBurette)).toEqual([null, null, 'mid-titration', 'trial-ended', null])
      // The word for the press is the only part drawn faint, and only then; "Burette filled." is never faint.
      const refill = (state: TitrationState) => /<span( class="[^"]*")?> Refill<\/span>/.exec(bench(state))![1] ?? ''
      expect([filled, titrating, over].map(refill)).toEqual(['', ' class="opacity-50"', ' class="opacity-50"'])
    })

    it('do not call a burette filled that has run to its last mark: the fill is named for its action again, with no tick, in the trial that ran out and in the next', () => {
      // Trial 2 with no refill: the stream runs to the 50 mL mark with no pink, and the trial is over.
      let ranOut = readyTrial(m, run(m, carefulTrial(m, ready), [{ type: 'startNextTrial' }]), { fill: false })
      while (currentTrial(ranOut).end === 'open') ranOut = run(m, ranOut, [deliver('stream')])
      const after = run(m, ranOut, [{ type: 'startNextTrial' }])
      expect(currentTrial(ranOut).end).toBe('ran-out')
      // The engine's burette still holds solution below the mark, and can deliver none of it.
      for (const state of [ranOut, after]) expect(benchViewOf(m, state).burette).toMatchObject({ filled: true, atBottom: true })
      expect([ranOut, after].map((state) => steps(state)[1])).toEqual(['Fill burette (unavailable)', 'Fill burette'])
      // The rest of the shelf is as in any trial that is over, and a fill puts the tick back.
      expect(steps(ranOut)[0]).toBe('✓ Burette conditioned (unavailable)')
      expect(steps(run(m, after, [{ type: 'fillBurette' }]))[1]).toBe('✓ Burette filled. Refill')
    })

    it('in a trial that is over and in the next one say what is still so: the burette and the pipette stay as they were, and the flask is a new one', () => {
      expect(steps(over)).toEqual(['✓ Burette conditioned (unavailable)', '✓ Burette filled. Refill (unavailable)', '✓ Pipette wet with HCl (unavailable)', '✓ HCl is in the flask (unavailable)'])
      expect(steps(next)).toEqual(['✓ Burette conditioned (unavailable)', '✓ Burette filled. Refill', '✓ Pipette wet with HCl (unavailable)', 'Pipette HCl into flask'])
      // A step not done in a trial that is over is still named for its action, and is unavailable like any other control.
      expect(steps(overBeforePipetting)).toEqual(['Condition burette (unavailable)', 'Fill burette (unavailable)', 'Rinse pipette with HCl (unavailable)', 'Pipette HCl into flask (unavailable)'])
    })

    it('are done exactly where the view says so, and every one that is done and cannot be done again is unavailable', () => {
      for (const state of [fresh, conditioned, filled, pipetted, ready, titrating, over, next, overBeforePipetting]) {
        const done = stepsDone(benchViewOf(m, state))
        const shown = steps(state)
        ;(['conditionBurette', 'fillBurette', 'rinsePipette', 'pipetteAliquot'] as const).forEach((step, at) => {
          expect([step, shown[at]!.startsWith('✓ ')]).toEqual([step, done[step]])
          if (done[step] && STEP_BUTTON[step].again === null) expect(shown[at]).toMatch(/ \(unavailable\)$/)
        })
      }
    })

    /** The class that draws a button faint, as its own and not as a variant's ("disabled:opacity-50" is in every button). */
    const FAINT = /[" ]opacity-50[" ]/

    it('a done button is focusable, is not drawn faint, and its tick is hidden from assistive technology and carries the done role', () => {
      const [condition, fill, rinse, aliquot] = tiles(bench(ready))
        .slice(1, 3)
        .flatMap((tile) => [...tile.html.matchAll(/<button[^>]*>.*?<\/button>/gs)].map((match) => match[0]))
      for (const button of [condition!, fill!, rinse!, aliquot!]) {
        expect(button).not.toMatch(/ disabled=|tabindex="-1"/)
        expect(button.slice(0, button.indexOf('>'))).not.toMatch(FAINT)
        expect(button).toContain(`<span aria-hidden="true" class="${ROLE.done}">✓ </span>`)
      }
      // A button that is unavailable and not done is drawn faint, as before.
      expect(/<button[^>]*>Add half-drop<\/button>/.exec(bench(fresh))![0]).toMatch(FAINT)
    })

    it('the engine has a reason for every done step but a conditioned burette between titrations, which the bench answers itself and does not condition again', () => {
      const CONDITION: BenchAction = { type: 'conditionBurette' }
      for (const state of [conditioned, ready, next]) {
        expect(benchViewOf(m, state).controls.conditionBurette).toBeNull()
        // What the bench withholds: the engine would do it, and it would only empty the burette.
        expect(run(m, state, [CONDITION]).burette).toMatchObject({ conditioned: true, filled: false })
        expect(benchAnswer(CONDITION, benchViewOf(m, state))).toBe(ALREADY_CONDITIONED)
      }
      // A burette not yet conditioned is conditioned by the press, and where the engine has a reason the engine's is said.
      for (const state of [fresh, filled, titrating, over]) expect(benchAnswer(CONDITION, benchViewOf(m, state))).toBeNull()
      expect([titrating, over].map((state) => benchViewOf(m, state).controls.conditionBurette)).toEqual(['mid-titration', 'trial-ended'])
      // Every other press goes to the page, a done step's among them: the engine refuses those with its own reason.
      for (const state of [pipetted, ready, titrating, over]) {
        const view = benchViewOf(m, state)
        expect(view.controls.rinsePipette).not.toBeNull()
        expect(view.controls.pipetteAliquot).not.toBeNull()
        for (const type of ['fillBurette', 'rinsePipette', 'pipetteAliquot', 'addIndicatorDrop', 'addWater', 'clearTipBubble', 'swirlAndWait'] as const) expect(benchAnswer({ type }, view)).toBeNull()
        expect(benchAnswer(deliver('drop'), view)).toBeNull()
      }
      // Its sentence is true: once conditioned, no fill is dilute, so conditioning again is never what is needed to go on.
      expect(ALREADY_CONDITIONED).toMatch(/already conditioned.*stays conditioned through every refill/)
      let state = ready
      for (let refill = 0; refill < 2; refill++) {
        state = readyTrial(m, run(m, carefulTrial(m, state), [{ type: 'startNextTrial' }]))
        expect([state.burette.conditioned, state.burette.diluted]).toEqual([true, false])
      }
    })
  })

  describe('carries each colour role on the kind of text it is for, beside words that say the same', () => {
    const { state: atEndpoint } = titrateCarefully(m, ready)
    let overshot = atEndpoint
    while (benchViewOf(m, overshot).trialEnd === 'open') overshot = run(m, overshot, [deliver('drop')])
    /** The status line: its words, and the role of what follows "Flask: ". */
    const status = (state: TitrationState) => {
      const [, role, said] = /<p role="status">Flask: <span(?: class="([^"]*)")?>([^<]*)<\/span><\/p>/.exec(bench(state))!
      return { role: role ?? '', line: `${FLASK}${said}` }
    }

    it('a value read off the shelf: the acid label, the volume of the pipette, the drops and the rinses', () => {
      const html = bench(run(m, ready, [WASH]))
      expect(roleOf(html, 'HCl, 0.0976 M. Standardized.')).toBe(ROLE.value)
      expect(roleOf(html, '25.00 mL')).toBe(ROLE.value)
      const [, , , indicator, water] = tiles(html)
      expect(indicator!.html).toContain(`Drops in the flask: <span class="${ROLE.value}">2</span>`)
      expect(water!.html).toContain(`Rinses of this flask: <span class="${ROLE.value}">1</span>`)
    })

    it('the flask: pink only while it is pink, deeper once overshot, and plain while it is colourless or empty, whatever its last addition did', () => {
      expect(status(fresh)).toEqual({ role: '', line: 'Flask: empty.' })
      expect(status(ready)).toEqual({ role: '', line: 'Flask: colourless.' })
      // A plume that fades says "pink" of a flask that is not: the words do, and the role does not.
      const streamed = run(m, ready, [deliver('stream')])
      expect(status(streamed)).toEqual({ role: '', line: 'Flask: colourless. Last addition: pink fades at once.' })
      expect(status(atEndpoint)).toEqual({ role: ROLE.pink, line: 'Flask: faint pink. Swirled 30 s: the pink has lasted.' })
      expect(status(overshot)).toEqual({ role: ROLE.deepPink, line: 'Flask: dark pink (overshot).' })
      // The line is the status line's own words in every state: the span takes nothing from it and adds nothing.
      for (const state of [fresh, ready, streamed, atEndpoint, overshot]) expect(status(state).line).toBe(flaskStatus(benchViewOf(m, state), display))
    })

    it('the reason a reading cannot be taken, held; and the label of the reading field, an entry, only while it waits', () => {
      const label = (state: TitrationState) => /<label[^>]*>(?:Initial|Final) burette reading \(mL\)<\/label>/.exec(bench(state))![0]
      expect(bench(fresh)).toContain(`class="${ROLE.held}">${BLOCKED_TEXT['burette-empty']}</p>`)
      expect(label(fresh)).not.toContain(ROLE.entry)
      expect(label(filled)).toContain(ROLE.entry)
      // Recorded: the field is done, and its label is plain again.
      expect(label(ready)).not.toContain(ROLE.entry)
      expect(bench(overshot)).toContain(`class="${ROLE.held}">${BLOCKED_TEXT['trial-ended']}</p>`)
    })

    it('reads the same with every role taken off: no role is on an element that has no words or mark of its own', () => {
      for (const state of [fresh, filled, ready, atEndpoint, overshot]) {
        const html = bench(state)
        for (const role of Object.values(ROLE)) for (const [, held] of html.matchAll(new RegExp(`<(?:span|p|label|h3)[^>]* class="[^"]*\\b${role}\\b[^"]*"[^>]*>([^<]*)<`, 'g'))) expect([role, held!.trim()]).not.toEqual([role, ''])
      }
    })
  })

  describe('the reading field after its entry', () => {
    const { state: confirmed } = titrateCarefully(m, ready)
    const recorded = run(m, confirmed, [{ type: 'recordFinalReading', readingUl: honestReading(confirmed.burette.levelUl) }])
    const graded = carefulTrial(m, ready)
    let overshot = confirmed
    while (benchViewOf(m, overshot).trialEnd === 'open') overshot = run(m, overshot, [deliver('drop')])
    /** The field as the bench draws it: its label, what it shows, whether it is disabled, its buttons, and the paragraphs under it. */
    const field = (state: TitrationState) => {
      const form = /<form.*<\/form>/s.exec(bench(state))![0]
      return {
        label: /<label[^>]*>([^<]*)<\/label>/.exec(form)![1],
        value: attribute(form, 'input', 'value'),
        disabled: /<input[^>]* disabled=""/.test(form),
        buttons: buttons(form).map((button) => `${button.name}${button.tag.includes('aria-disabled="true"') ? ' (unavailable)' : ''}`),
        under: [...form.matchAll(/<p[^>]*>([^<]*)<\/p>/g)].map((match) => match[1]).filter((said) => said !== ''),
      }
    }
    /** Whether the engine would take that reading again now, as the learner typed it. */
    const again = (state: TitrationState) => {
      const view = benchViewOf(m, state)
      const type = view.readingWanted === 'initial' ? 'recordInitialReading' : 'recordFinalReading'
      return view.readingRecorded !== null && can(m, state, { type, readingUl: view.readingRecorded }) === null
    }

    it('is disabled and shows the reading as the learner typed it, with Change while the engine would take the reading again', () => {
      // The initial reading, before any NaOH has run.
      expect(field(ready)).toEqual({ label: 'Initial burette reading (mL)', value: '2.56', disabled: true, buttons: ['Change'], under: [] })
      // The final reading, at an endpoint that has lasted the wait and before the molarity is checked.
      expect(field(recorded)).toEqual({ label: 'Final burette reading (mL)', value: '28.26', disabled: true, buttons: ['Change'], under: [] })
      expect([again(ready), again(recorded)]).toEqual([true, true])
    })

    it('in a trial that is over is disabled with that one reason and nothing else, shows what was entered, and has no Change', () => {
      const over = BLOCKED_TEXT['trial-ended']
      expect(field(graded)).toEqual({ label: 'Final burette reading (mL)', value: '28.26', disabled: true, buttons: ['Record (unavailable)'], under: [over] })
      // Ended with no final reading: an empty field, and the same one reason.
      expect(field(overshot)).toEqual({ label: 'Final burette reading (mL)', value: '', disabled: true, buttons: ['Record (unavailable)'], under: [over] })
      // Discarded before any NaOH ran: the initial reading it had is shown.
      expect(field(run(m, ready, [{ type: 'discardTrial' }]))).toEqual({ label: 'Initial burette reading (mL)', value: '2.56', disabled: true, buttons: ['Record (unavailable)'], under: [over] })
      expect([again(graded), again(overshot)]).toEqual([false, false])
    })

    it('has Change exactly when the engine would take the reading again, over a whole careful trial and the start of the next', () => {
      let state: TitrationState = createLab(1, 'challenge')
      const seen: boolean[] = []
      const look = () => {
        const { buttons: shown, value, disabled } = field(state)
        const view = benchViewOf(m, state)
        expect(shown.includes('Change')).toBe(again(state))
        // A reading that is recorded is shown and the field is disabled; one that is not leaves it empty.
        expect([value, disabled || view.readingBlocked === null]).toEqual([view.readingRecorded === null ? '' : (view.readingRecorded / 1000).toFixed(2), true])
        if (view.readingRecorded !== null) expect(disabled).toBe(true)
        seen.push(shown.includes('Change'))
      }
      const step = (...actions: Parameters<typeof run>[2]) => {
        state = run(m, state, actions)
        look()
      }
      look()
      step({ type: 'recordHclMolarity', molarityE6: 97600 }, { type: 'conditionBurette' }, { type: 'fillBurette' })
      step({ type: 'recordInitialReading', readingUl: honestReading(state.burette.levelUl) })
      // Clearing the tip moves the meniscus: the reading is gone, and the field waits again.
      step({ type: 'clearTipBubble' })
      step({ type: 'recordInitialReading', readingUl: honestReading(state.burette.levelUl) })
      step({ type: 'rinsePipette' }, { type: 'pipetteAliquot' }, { type: 'addIndicatorDrop' }, { type: 'addIndicatorDrop' })
      for (const { amount } of titrateCarefully(m, state).additions) step(deliver(amount))
      step(SWIRL)
      step({ type: 'recordFinalReading', readingUl: honestReading(state.burette.levelUl) })
      // One more half-drop undoes the wait and the final reading with it.
      step(deliver('half'))
      step(SWIRL)
      step({ type: 'recordFinalReading', readingUl: honestReading(state.burette.levelUl) })
      step({ type: 'submitMolarity', molarityE6: calculatedMolarityE6(m, state.hclRecordedE6!, currentTrial(state).finalReadingUl! - currentTrial(state).initialReadingUl!) })
      expect(currentTrial(state).end).toBe('graded')
      step({ type: 'startNextTrial' })
      // Both answers were met on the way.
      expect(new Set(seen)).toEqual(new Set([true, false]))
    })

    it("shows the learner's own reading and never the meniscus: a misread in Challenge is shown as it was typed", () => {
      const state = run(m, createLab(1, 'challenge'), [{ type: 'conditionBurette' }, { type: 'fillBurette' }, { type: 'clearTipBubble' }])
      const level = state.burette.levelUl
      const misread = run(m, state, [{ type: 'recordInitialReading', readingUl: 3000 }])
      expect(Math.abs(level - 3000)).toBeGreaterThan(m.readingToleranceUl)
      expect(field(misread).value).toBe('3.00')
      expect(bench(misread)).not.toContain((honestReading(level) / 1000).toFixed(2))
    })
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
      // Before 2026-10-06 the status line was one run of text; what follows "Flask: " is now in a span, for the flask's role.
      html.indexOf(`<p role="status">${FLASK}<span>${flaskStatus(view, display).slice(FLASK.length)}</span></p>`),
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
