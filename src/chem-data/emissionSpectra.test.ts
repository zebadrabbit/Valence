import { describe, expect, it } from 'vitest'
import manifest from '../../docs/research/emission-spectra/sources/MANIFEST.json'
import { emissionSpectra, spectrumOf } from './emissionSpectra'
import { periodicTable } from './periodic'
import { registry } from './registry'
import type { ElementSpectrum, Emission } from './schema'
import { checkProse, checkPublished, checkSourceIds } from './validate'

// emission-spectra.json against the saved responses of NIST's lines query it is built from, and the functions of
// scripts/emission-lib.mjs that build it. The rule is worked out again here, its own way, from the saved files.

type Line = { published: string; value: number; intensity: number | null }
type Picked = { shown: Line[] | number; rated: number; total: number; tied: number }
type Lib = {
  STRONGEST: number
  RANGE_NM: { min: number; max: number }
  DRAWN_AS_ONE_NM: number
  OVERLAP_NOTE: string
  parseNistLines(text: string): Record<string, string>[] | null
  observedLines(rows: Record<string, string>[]): Line[]
  strongestLines(lines: Line[]): Picked & { shown: Line[] }
  selectionSentence(picked: Picked & { shown: number }): string
  spectrumFromSaved(saved: { name: string; neutral: string; all: string | undefined; sourceId: string }): Omit<ElementSpectrum, 'symbol'>
}
const [lib] = Object.values(import.meta.glob<Lib>('../../scripts/emission-lib.mjs', { eager: true }))
const { STRONGEST, RANGE_NM, DRAWN_AS_ONE_NM, OVERLAP_NOTE, parseNistLines, observedLines, strongestLines, selectionSentence, spectrumFromSaved } = lib!

// Every saved response, by its file name.
const files = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../docs/research/emission-spectra/sources/nist-asd-*', { eager: true, query: '?raw', import: 'default' })).map(([path, text]) => [path.split('/').at(-1)!, text]),
)
const saved = (symbol: string, query: 'neutral-visible' | 'all') => {
  const entry = manifest.files.find((f) => f.symbol === symbol && f.query === query)
  return entry && files[entry.file]
}

// Optional, untracked: see registry.test.ts.
const local = import.meta.glob<string[]>('./denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const LINES_ID = 'nist-asd-lines-neutral'
// Written by hand in docs/research/phase-2/emission-lines.json, and kept as they were.
const BY_HAND = ['H', 'Na', 'Xe']
const drawn = emissionSpectra.flatMap((entry) => ('emission' in entry ? [entry] : []))
const undrawn = emissionSpectra.flatMap((entry) => ('none' in entry ? [entry] : []))
const byRule = drawn.filter((entry) => !BY_HAND.includes(entry.symbol))
const emissionOf = (symbol: string): Emission => {
  const entry = spectrumOf(symbol)
  if (!('emission' in entry)) throw new Error(`${symbol} has no spectrum`)
  return entry.emission
}
const nameOf = (symbol: string) => periodicTable.find((e) => e.symbol === symbol)!.name.toLowerCase()

/** A saved table read without the library: each row's observed wavelength and what its intensity column holds. */
const cells = (table: string) => {
  const [heading, ...rows] = table.split('\n').filter((row) => row !== '')
  const columns = heading!.split('\t')
  const [wavelength, intensity] = [columns.indexOf('obs_wl_air(nm)'), columns.indexOf('intens')]
  const bare = (cell: string) => cell.replace(/^"|"$/g, '')
  return rows.map((row) => row.split('\t')).map((row) => ({ published: bare(row[wavelength]!), intensity: bare(row[intensity]!) }))
}

describe('the saved responses', () => {
  it('are listed in the manifest, every one, with the query that returned each', () => {
    expect(Object.keys(files).sort()).toEqual(manifest.files.map((f) => f.file).sort())
    expect(manifest.retrieved).toBe('2026-10-08')
    for (const f of manifest.files) {
      expect(f.url, f.file).toBe(manifest.queries[f.query as 'neutral-visible' | 'all'].replace('<symbol>', f.symbol))
      expect(f.file, f.file).toBe(`nist-asd-${f.query === 'all' ? 'all-' : ''}lines-${f.symbol.toLowerCase()}.${f.returned === 'table' ? 'txt' : 'html'}`)
    }
  })

  it('hold one response for the neutral atom of each of the 118 elements, and one for all the lines of each element that had none', () => {
    const neutral = manifest.files.filter((f) => f.query === 'neutral-visible')
    expect(neutral.map((f) => f.symbol)).toEqual(periodicTable.map((e) => e.symbol))
    expect(neutral.filter((f) => f.returned === 'table').length).toBe(98)
    const withNone = neutral.filter((f) => f.returned !== 'table').map((f) => f.symbol)
    expect(manifest.files.filter((f) => f.query === 'all').map((f) => f.symbol)).toEqual(withNone)
    expect(withNone).toEqual(['At', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
  })

  it('are each a table of lines or the page that says NIST has none, as the manifest says', () => {
    for (const f of manifest.files) expect([f.file, parseNistLines(files[f.file]!) === null ? 'no-lines page' : 'table']).toEqual([f.file, f.returned])
  })
})

describe('emission-spectra.json', () => {
  it('holds one entry for each element, in the order of the table: 97 with a spectrum and 21 with a sentence', () => {
    expect(emissionSpectra.map((entry) => entry.symbol)).toEqual(periodicTable.map((e) => e.symbol))
    expect(drawn.length).toBe(97)
    expect(undrawn.length).toBe(21)
    expect(undrawn.map((entry) => entry.symbol)).toEqual(['At', 'Fr', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'])
  })

  it('cites sources the registry holds, prints every wavelength as its number, and holds no institution-specific text', () => {
    expect(checkSourceIds(emissionSpectra, 'emissionSpectra', registry.sources)).toEqual([])
    expect(checkPublished(emissionSpectra, 'emissionSpectra')).toEqual([])
    expect(checkProse(emissionSpectra, 'emissionSpectra', institutionNames)).toEqual([])
    for (const { symbol, emission } of byRule) expect([symbol, ...new Set(emission.lines.map((line) => line.sourceId))]).toEqual([symbol, LINES_ID])
    for (const { symbol, none } of undrawn) expect([symbol, none.sourceId]).toEqual([symbol, LINES_ID])
  })

  it('keeps every line between 400 and 700 nm, longest first, none twice, each with the digits NIST prints for it', () => {
    for (const { symbol, emission } of drawn) {
      const values = emission.lines.map((line) => line.value)
      expect([symbol, values]).toEqual([symbol, [...new Set(values)].sort((a, b) => b - a)])
      const printed = new Set(cells(saved(symbol, 'neutral-visible')!).map((cell) => cell.published))
      for (const line of emission.lines) {
        expect([symbol, line.value >= 400 && line.value <= 700]).toEqual([symbol, true])
        expect([symbol, line.published, printed.has(line.published!)]).toEqual([symbol, line.published, true])
      }
    }
  })

  it('holds, for every element but the three written by hand, the lines the rule picks from its saved response', () => {
    expect(byRule.length).toBe(94)
    for (const { symbol, emission } of byRule) {
      // The rule, worked out here without the library: the largest number each wavelength's intensity starts with,
      // the six largest of those, and every line that is no weaker than the sixth.
      const intensities = new Map<string, number>()
      for (const { published, intensity } of cells(saved(symbol, 'neutral-visible')!)) {
        const number = /^[\d.]+/.exec(intensity)?.[0]
        if (number !== undefined) intensities.set(published, Math.max(Number(number), intensities.get(published) ?? 0))
      }
      const ranked = [...intensities.values()].sort((a, b) => b - a)
      const sixth = ranked[Math.min(6, ranked.length) - 1]!
      const picked = [...intensities].filter(([, intensity]) => intensity >= sixth).map(([published]) => published)
      expect([symbol, emission.lines.map((line) => line.published)]).toEqual([symbol, picked.sort((a, b) => Number(b) - Number(a))])
      expect([symbol, emission.lines.length >= Math.min(6, ranked.length)]).toEqual([symbol, true])
      // No transition is named: only the lines written by hand have one.
      expect([symbol, emission.lines.some((line) => line.transition !== undefined)]).toEqual([symbol, false])
    }
  })

  it('is what the build writes from the saved responses today', () => {
    for (const entry of emissionSpectra) {
      if (BY_HAND.includes(entry.symbol)) continue
      const built = spectrumFromSaved({ name: nameOf(entry.symbol), neutral: saved(entry.symbol, 'neutral-visible')!, all: saved(entry.symbol, 'all'), sourceId: LINES_ID })
      expect(entry).toEqual({ symbol: entry.symbol, ...built })
    }
  })

  it('shows more than six lines only where lines tie with the sixth, and never leaves out a line as strong as one it shows', () => {
    const more = byRule.filter(({ emission }) => emission.lines.length > 6).map(({ symbol, emission }) => `${symbol} ${emission.lines.length}`)
    expect(more).toEqual([
      ...['Be 7', 'F 7', 'Ne 8', 'Si 7', 'Ar 8', 'Ca 9', 'Mn 7', 'Cu 8', 'Ge 7', 'Se 8', 'Br 8', 'Mo 7', 'Tc 13', 'Ag 7', 'Cd 7', 'Nd 7', 'Pm 10', 'Sm 8', 'Gd 7', 'Tb 7', 'Dy 7', 'Er 7', 'Yb 7'],
      ...['Hf 10', 'W 7', 'Au 8', 'Ra 9', 'Pa 10', 'Np 28', 'Pu 49', 'Am 10', 'Cm 27', 'Bk 25', 'Cf 13'],
    ])
    expect(byRule.filter(({ emission }) => emission.lines.length < 6).map(({ symbol, emission }) => `${symbol} ${emission.lines.length}`)).toEqual(['As 5', 'Cs 3', 'Tl 4', 'Es 3'])
  })
})

describe('the three spectra written by hand', () => {
  it('are in the file as they are in the curated record of the element, to the letter', () => {
    for (const symbol of BY_HAND) expect(emissionOf(symbol)).toEqual(registry.elements.find((e) => e.symbol === symbol)!.emission)
  })

  it('keeps hydrogen and sodium as they were', () => {
    expect(emissionOf('H')).toEqual({
      selection: 'All four Balmer lines between 400 and 700 nm.',
      lines: [
        { value: 656.279, sourceId: 'nist-asd-lines-h', published: '656.279', transition: 'n = 3 → 2' },
        { value: 486.135, sourceId: 'nist-asd-lines-h', published: '486.135', transition: 'n = 4 → 2' },
        { value: 434.0472, sourceId: 'nist-asd-lines-h', published: '434.0472', transition: 'n = 5 → 2' },
        { value: 410.1734, sourceId: 'nist-asd-lines-h', published: '410.1734', transition: 'n = 6 → 2' },
      ],
    })
    expect(emissionOf('Na')).toEqual({
      selection: 'The two D lines, which give a sodium lamp, and a flame that holds sodium, their yellow colour. NIST lists other, weaker lines of the neutral atom between 400 and 700 nm.',
      note: 'Both lines come from an electron falling from the 3p subshell to the 3s subshell. The 3p level is split into two levels very close in energy, so there are two lines. They are 0.6 nm apart, too close to draw separately on this strip, which shows them as one.',
      lines: [
        { value: 589.592424, sourceId: 'nist-asd-lines-na', published: '589.592424', transition: '3p → 3s' },
        { value: 588.995095, sourceId: 'nist-asd-lines-na', published: '588.995095', transition: '3p → 3s' },
      ],
    })
  })

  it("keeps xenon's six as they were", () => {
    expect(emissionOf('Xe').lines).toEqual(
      [
        [697.6182, '697.6182'],
        [688.2155, '688.2155'],
        [491.6507, '491.6507'],
        [480.7019, '480.70190'],
        [467.12258, '467.12258'],
        [462.42756, '462.42756'],
      ].map(([value, published]) => ({ value, sourceId: 'nist-asd-lines-xe', published })),
    )
  })

  it("would give hydrogen the same four lines by the rule: they are the only ones NIST gives an intensity", () => {
    const { shown } = strongestLines(observedLines(parseNistLines(saved('H', 'neutral-visible')!)!))
    expect(shown.map((line) => line.published)).toEqual(emissionOf('H').lines.map((line) => line.published))
  })

  // Found when the responses were saved (docs/research/emission-spectra/README.md). The sentence stored with
  // xenon says its six are the strongest by relative intensity. In the saved response they are not: they are the
  // six with the largest transition probabilities, the next column of NIST's table, and two of them have no
  // relative intensity at all. Neither the six nor the rule was changed to fit the other; the owner decides.
  it("does not get xenon's six from the rule: they are the six of largest transition probability, not of largest relative intensity", () => {
    const stored = emissionOf('Xe').lines.map((line) => line.published)
    const byIntensity = strongestLines(observedLines(parseNistLines(saved('Xe', 'neutral-visible')!)!)).shown.map((line) => line.published)
    expect(byIntensity).toEqual(['631.8062', '492.3152', '491.6507', '482.9708', '480.70190', '473.41518'])
    expect(stored.filter((published) => byIntensity.includes(published!))).toEqual(['491.6507', '480.70190'])

    const rows = parseNistLines(saved('Xe', 'neutral-visible')!)!
    const byProbability = rows
      .filter((row) => row['Aki(s^-1)'] !== '')
      .sort((a, b) => Number(b['Aki(s^-1)']) - Number(a['Aki(s^-1)']))
      .slice(0, 6)
      .map((row) => row['obs_wl_air(nm)']!)
    expect(byProbability.sort((a, b) => Number(b) - Number(a))).toEqual(stored)
    expect(rows.filter((row) => stored.includes(row['obs_wl_air(nm)']!) && row.intens === '').map((row) => row['obs_wl_air(nm)'])).toEqual(['462.42756', '467.12258'])
  })
})

describe('the sentence of an element with no spectrum', () => {
  const sentence = (symbol: string) => undrawn.find((entry) => entry.symbol === symbol)!.none.value

  it('says, for francium, that NIST lists lines of the neutral atom in the range and gives none an intensity', () => {
    const rows = cells(saved('Fr', 'neutral-visible')!)
    expect(new Set(rows.map((row) => row.published)).size).toBe(87)
    expect(rows.every((row) => row.intensity === '')).toBe(true)
    expect(sentence('Fr')).toBe(
      "NIST's Atomic Spectra Database lists 87 lines of the neutral francium atom between 400 and 700 nm, but gives none of them a relative intensity, so the strongest cannot be picked out and no spectrum is drawn.",
    )
  })

  it('says, for astatine and fermium, that NIST lists lines of the element but none of the neutral atom in the range', () => {
    for (const symbol of ['At', 'Fm']) {
      expect(parseNistLines(saved(symbol, 'neutral-visible')!)).toBeNull()
      expect(parseNistLines(saved(symbol, 'all')!)!.length).toBeGreaterThan(0)
      expect(sentence(symbol)).toBe(`NIST's Atomic Spectra Database lists lines of ${nameOf(symbol)}, but none of the neutral atom between 400 and 700 nm, so no spectrum is drawn.`)
    }
  })

  it('says, for the 18 elements from mendelevium on, that NIST lists no lines of the element at all', () => {
    const rest = undrawn.filter((entry) => !['Fr', 'At', 'Fm'].includes(entry.symbol))
    expect(rest.map((entry) => entry.symbol)).toEqual(periodicTable.filter((e) => e.atomicNumber >= 101).map((e) => e.symbol))
    for (const { symbol, none } of rest) {
      expect(parseNistLines(saved(symbol, 'neutral-visible')!)).toBeNull()
      expect(parseNistLines(saved(symbol, 'all')!)).toBeNull()
      expect(none.value).toBe(`NIST's Atomic Spectra Database lists no lines of ${nameOf(symbol)}, so no spectrum is drawn.`)
    }
  })
})

describe('the sentence that says which lines are shown', () => {
  const selection = (symbol: string) => emissionOf(symbol).selection

  it('states the rule as it came out for the element', () => {
    expect(selection('Fe')).toBe('The six strongest of the 2,098 lines of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity.')
    expect(selection('Hg')).toBe('The six strongest of the 62 lines of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity. NIST lists 36 more lines there with no intensity, and they are not shown.')
    expect(selection('Ne')).toBe(
      'The 8 strongest of the 557 lines of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity. Six would be shown, but the last 4 of these have the same intensity, so none of them is left out.',
    )
    expect(selection('Tl')).toBe('All 4 lines of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity.')
    expect(selection('Cs')).toBe('All 3 lines of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity. NIST lists 53 more lines there with no intensity, and they are not shown.')
    expect(selection('Pu')).toBe('All 49 lines of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity. NIST gives every one of them the same intensity, so no six of them are the strongest.')
  })

  it('is built from the counts alone', () => {
    const where = 'of the neutral atom between 400 and 700 nm that NIST lists with a relative intensity'
    expect(selectionSentence({ shown: 1, rated: 1, total: 1, tied: 1 })).toBe(`The one line ${where}.`)
    expect(selectionSentence({ shown: 6, rated: 7, total: 8, tied: 1 })).toBe(`The six strongest of the 7 lines ${where}. NIST lists 1 more line there with no intensity, and it is not shown.`)
    expect(selectionSentence({ shown: 10, rated: 10, total: 10, tied: 9 })).toBe(`All 10 lines ${where}. Six would be shown, but the last 9 of these have the same intensity, so none of them is left out.`)
  })

  it('reads as one or more whole sentences for every element', () => {
    for (const { symbol, emission } of byRule) expect([symbol, emission.selection]).toEqual([symbol, expect.stringMatching(/^(The|All) [^.]+ that NIST lists with a relative intensity\.( [A-Z][^.]+\.)*$/)])
  })
})

describe('the note under a strip that cannot show every line apart', () => {
  // That the distance is the width of a line on the strip is tested with the strip, in src/app/explore/spectrum.test.ts.
  it('is on exactly the spectra with two lines closer than the distance the build takes for drawn as one', () => {
    for (const { symbol, emission } of byRule) {
      const overlap = emission.lines.some((line, i) => i > 0 && emission.lines[i - 1]!.value - line.value < DRAWN_AS_ONE_NM)
      expect([symbol, emission.note]).toEqual([symbol, overlap ? OVERLAP_NOTE : undefined])
    }
    expect(byRule.filter(({ emission }) => emission.note).length).toBe(67)
    expect(OVERLAP_NOTE).toBe('Some of these lines are too close together to draw separately on this strip, which shows them as one. The table lists each of them.')
  })
})

describe('the rule', () => {
  const line = (published: string, intensity: number | null): Line => ({ published, value: Number(published), intensity })

  it('asks for six lines between 400 and 700 nm', () => {
    expect([STRONGEST, RANGE_NM]).toEqual([6, { min: 400, max: 700 }])
  })

  it('reads the number an intensity starts with and not the letters after it; an intensity with no number is none', () => {
    const table = ['obs_wl_air(nm)\tintens\tAki(s^-1)\tAcc\tType\t', '"500.10"\t"500bl"\t""\t\t\t', '"510.2"\t"bl"\t""\t\t\t', '"520.3"\t""\t"1.0e+06"\tB\t\t', '"530.4"\t"1.3"\t""\t\t\t', '"540.5"\t"20h*"\t""\t\t\t'].join('\n')
    expect(observedLines(parseNistLines(table)!)).toEqual([line('500.10', 500), line('510.2', null), line('520.3', null), line('530.4', 1.3), line('540.5', 20)])
  })

  it('takes rows that share a wavelength as one line, with the larger intensity', () => {
    const table = ['obs_wl_air(nm)\tintens\t', '"657.910"\t"23"\t', '"657.910"\t"24"\t', '"400.455"\t"10*"\t', '"400.455"\t"10*"\t'].join('\n')
    expect(observedLines(parseNistLines(table)!)).toEqual([line('657.910', 24), line('400.455', 10)])
  })

  it('reads each row of a response for several spectra by the heading above it', () => {
    const rows = parseNistLines(saved('At', 'all')!)!
    expect(rows.map((row) => [row.sp_num, row['obs_wl_vac(nm)'] ?? row['obs_wl_air(nm)']])).toEqual([
      ['83', '0.399751'],
      ['83', '5.0434'],
      ['1', '216.225'],
      ['1', '224.401'],
    ])
  })

  it('refuses a response that is neither a table of lines nor the page that says there are none, and a wavelength it cannot read', () => {
    expect(() => parseNistLines('<html><body>Access denied</body></html>')).toThrow(/not a table of lines/)
    expect(() => parseNistLines('')).toThrow(/not a table of lines/)
    expect(() => observedLines([{ 'obs_wl_air(nm)': '500.1+x', intens: '5' }])).toThrow(/unreadable wavelength/)
    expect(() => observedLines([{ 'obs_wl_vac(nm)': '150.1', intens: '5' }])).toThrow(/unreadable wavelength/)
    expect(() => observedLines([{ 'obs_wl_air(nm)': '399.9', intens: '5' }])).toThrow(/outside the range/)
  })

  it('picks the six strongest, longest wavelength first', () => {
    const lines = [9, 1, 8, 2, 7, 3, 6, 4].map((intensity, i) => line(String(500 + i), intensity))
    expect(strongestLines(lines)).toEqual({ shown: [507, 506, 505, 504, 502, 500].map((nm) => lines[nm - 500]), rated: 8, total: 8, tied: 1 })
  })

  it('shows every line that ties with the sixth, and all the lines where there are six or fewer', () => {
    const tied = [9, 8, 7, 6, 5, 4, 4, 4, 3].map((intensity, i) => line(String(500 + i), intensity))
    expect(strongestLines(tied)).toMatchObject({ rated: 9, total: 9, tied: 3 })
    expect(strongestLines(tied).shown.length).toBe(8)
    const few = [line('500', 2), line('501', null), line('502', 2)]
    expect(strongestLines(few)).toEqual({ shown: [few[2], few[0]], rated: 2, total: 3, tied: 2 })
    expect(strongestLines([line('500', null)])).toEqual({ shown: [], rated: 0, total: 1, tied: 0 })
  })
})

describe('the sources of the spectra', () => {
  const source = (id: string) => registry.sources.find((s) => s.id === id)!

  it('are the database, read on the day the manifest gives, its help page, and the paper on flame bands', () => {
    expect(source(LINES_ID)).toEqual({
      id: LINES_ID,
      url: 'https://physics.nist.gov/PhysRefData/ASD/lines_form.html',
      citation:
        'Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database, Lines Data for the neutral atom of each element (the spectrum <symbol> I): observed wavelengths in air, 400 to 700 nm, with relative intensities; and, for an element with no such lines, every line the database lists for it (retrieved 2026-10-08). National Institute of Standards and Technology. https://doi.org/10.18434/T4W30F',
    })
    for (const id of [LINES_ID, 'nist-asd-lines-help', 'bulewicz-1956']) expect(source(id).citation).toContain(manifest.retrieved)
    expect(source('nist-asd-lines-help').url).toBe('https://physics.nist.gov/PhysRefData/ASD/Html/lineshelp.html#OUTRELINT')
    expect(source('bulewicz-1956').url).toBe('https://doi.org/10.1038/177670a0')
  })

  it('leave the sources of hydrogen, sodium and xenon as they were', () => {
    expect(['h', 'na', 'xe'].map((symbol) => source(`nist-asd-lines-${symbol}`).citation.match(/retrieved [\d-]+/)![0])).toEqual(['retrieved 2026-10-03', 'retrieved 2026-10-04', 'retrieved 2026-10-03'])
  })
})
