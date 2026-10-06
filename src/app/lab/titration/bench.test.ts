// The markup the bench's drawings and controls put their names, states and words in. What a key press does, where
// focus goes, the timer and the sizes on screen are checked in a browser.
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Bottle, Dropper, Pipette, WashBottle } from './apparatus'
import { standY } from './buretteGeometry'
import { DARK_PINK, PINK, type FlaskColour } from './flaskColour'
import { meniscusText } from './meniscusText'
import { INVALID_ENTRY_TEXT } from './messages'
import { ReadingInput, recordReading, type ReadingInputProps } from './ReadingInput'
import { MeniscusWords, ReadingView } from './ReadingView'
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
    for (const text of ['24.3', '24', '24,37', '24.370', '', 'abc', '-1.00', '1e1'])
      expect(recordReading(text, onReading)).toEqual({ accepted: false, text: INVALID_ENTRY_TEXT.reading, invalid: true })
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
