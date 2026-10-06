// The markup the bench's drawings and controls put their names, states and words in. What a key press does, where
// focus goes, the timer and the sizes on screen are checked in a browser.
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { meniscusText } from './meniscusText'
import { INVALID_ENTRY_TEXT } from './messages'
import { ReadingInput, recordReading, type ReadingInputProps } from './ReadingInput'
import { MeniscusWords, ReadingView } from './ReadingView'

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
