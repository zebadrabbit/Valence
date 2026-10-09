import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/flame/flame.json'
import hazardsFile from '../../../docs/research/flame/hazards.json'
import { flameCitations } from '../citations'
import { emissionSpectra } from '../emissionSpectra'
import sources from '../sources.json'
import { validateFlame } from '../validate'
import { brightestOf, extentOf, flameData, flameSchema, rangeId, rangeOf, type FlameData } from './data'
import stored from './flame.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

// The saved tables of the NIST Atomic Spectra Database, as text: the emission spectra's, and the one this lab keeps.
const tables = {
  ...import.meta.glob<string>('../../../docs/research/emission-spectra/sources/nist-asd-lines-*.txt', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob<string>('../../../docs/research/flame/sources/nist-asd-lines-*.txt', { eager: true, query: '?raw', import: 'default' }),
}
const table = (name: string) => Object.entries(tables).find(([path]) => path.endsWith(`/${name}`))![1]
/** The first cell of every row of a saved table, without its quotation marks: the wavelengths NIST prints. */
const printed = (name: string) => table(name).split('\n').map((row) => row.split('\t')[0]!.replace(/^"(.*)"$/, '$1'))

const copy = (): FlameData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: FlameData) => void) => {
  const data = copy()
  edit(data)
  return validateFlame(data, sources).join('\n')
}
const salt = (id: string) => flameData.salts.find((s) => s.id === id)!

describe('flameData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(flameData).toEqual(stored)
    expect(flameSchema.safeParse({ ...stored, extra: 1 }).success).toBe(false)
  })

  it('passes validation against the stored sources', () => {
    expect(validateFlame(stored, sources, { institutionNames })).toEqual([])
  })

  it("is the authored record with each solution's hazards merged in from hazards.json, and nothing else changed", () => {
    const { salts, ...rest } = stored
    const { salts: authoredSalts, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(salts.map((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredSalts)
    expect(Object.fromEntries(salts.map((s) => [s.id, { classifiedAs: s.classifiedAs, hazards: s.hazards }]))).toEqual(hazardsFile)
  })

  it('holds the six solutions of spec 15.1, each a chloride at 0.1 M, one of them coloured in its bottle', () => {
    expect(flameData.salts.map((s) => `${s.id} | ${s.name} | ${s.formula} | ${s.metal.name} | ${s.appearance.value.name}`)).toEqual([
      'bacl2-0.1m | Barium chloride solution, 0.1 M | BaCl₂ | barium | colourless',
      'cacl2-0.1m | Calcium chloride solution, 0.1 M | CaCl₂ | calcium | colourless',
      'cucl2-0.1m | Copper(II) chloride solution, 0.1 M | CuCl₂ | copper | light blue-green',
      'kcl-0.1m | Potassium chloride solution, 0.1 M | KCl | potassium | colourless',
      'nacl-0.1m | Sodium chloride solution, 0.1 M | NaCl | sodium | colourless',
      'srcl2-0.1m | Strontium chloride solution, 0.1 M | SrCl₂ | strontium | colourless',
    ])
    for (const s of flameData.salts) {
      expect(s.molarity, s.id).toBe(0.1)
      expect(s.formula, s.id).toMatch(new RegExp(`^${s.metal.symbol}Cl₂?$`))
      // Only a coloured solution has a colour to draw it in.
      expect(s.appearance.value.hex === undefined, s.id).toBe(s.appearance.value.name === 'colourless')
      expect(s.classifiedAs, s.id).toMatch(/^Hazards of solid .+, the pure substance, from a supplier's safety data sheet$/)
      expect(s.hazards.note.value, s.id).toMatch(/decided by the laboratory's own rules and by local regulations; ask the laboratory's supervisor\.$/)
    }
  })

  it('gives each flame a colour of its own, as its source names it', () => {
    expect(Object.fromEntries(flameData.salts.map((s) => [s.metal.name, s.flame.value.name]))).toEqual({ barium: 'pale green', calcium: 'orange-red', copper: 'blue-green', potassium: 'lilac', sodium: 'yellow', strontium: 'red' })
  })

  it("stores the lines and bands of each flame: where each is, its colour, its rank and what gives it", () => {
    const said = (id: string) =>
      salt(id).features.map((f) => `${f.prominence}. ${f.kind === 'line' ? `line ${f.wavelengthNm.published}${f.pairedWithNm ? ` with ${f.pairedWithNm.published}` : ''}` : `band ${f.fromNm}-${f.toNm}${f.approximate ? ' approximate' : ''}`}, ${f.colour}, ${f.emitter.kind === 'atom' ? f.emitter.symbol : f.emitter.formula}`)
    expect(said('bacl2-0.1m')).toEqual(['1. band 480-550, green, BaOH', '2. line 553.5481, green, Ba'])
    expect(said('cacl2-0.1m')).toEqual(['1. band 614-640, orange-red, CaOH', '2. band 540-568, green, CaOH', '3. line 422.673, violet, Ca'])
    expect(said('cucl2-0.1m')).toEqual(['1. band 400-470, blue, CuCl', '2. band 550-550 approximate, green, CuOH'])
    expect(said('kcl-0.1m')).toEqual(['1. line 766.489913 with 769.896456, deep red, K', '2. line 404.4136 with 404.7208, violet, K'])
    expect(said('nacl-0.1m')).toEqual(['1. line 588.995095 with 589.592424, yellow, Na'])
    expect(said('srcl2-0.1m')).toEqual(['1. band 671-686 approximate, red, SrOH', '2. band 606-606 approximate, orange, SrOH', '3. line 460.7331, blue, Sr'])
  })

  it('gives the flame of calcium, strontium, barium and copper a molecule for its brightest feature, and that of sodium and potassium the atom', () => {
    expect(Object.fromEntries(flameData.salts.map((s) => [s.metal.symbol, brightestOf(s).emitter.kind]))).toEqual({ Ba: 'molecule', Ca: 'molecule', Cu: 'molecule', K: 'atom', Na: 'atom', Sr: 'molecule' })
    // A line is an atom's and a band a molecule's, at every feature.
    for (const s of flameData.salts) for (const f of s.features) expect(f.emitter.kind, f.id).toBe(f.kind === 'line' ? 'atom' : 'molecule')
  })
})

describe('the atomic lines', () => {
  const lines = flameData.salts.flatMap((s) => s.features.flatMap((f) => (f.kind === 'line' ? [f.wavelengthNm, ...(f.pairedWithNm ? [f.pairedWithNm] : [])].map((line) => ({ symbol: s.metal.symbol, id: f.id, ...line })) : [])))

  it('are each the digits a saved NIST table prints for the neutral atom of that metal', () => {
    expect(lines.length).toBe(9)
    for (const line of lines) {
      const file = line.sourceId === 'nist-asd-lines-k-700-780' ? 'nist-asd-lines-k-700-780.txt' : `nist-asd-lines-${line.symbol.toLowerCase()}.txt`
      expect(printed(file), `${line.id}: ${line.published}`).toContain(line.published)
      expect(Number(line.published), line.id).toBe(line.value)
    }
  })

  it('cite the table of 700 to 780 nm for the two lines beyond the emission spectra, and the emission spectra\'s tables for the rest', () => {
    for (const line of lines) expect(line.sourceId, line.published).toBe(line.value > 700 ? 'nist-asd-lines-k-700-780' : 'nist-asd-lines-neutral')
    expect(lines.filter((line) => line.value > 700).map((line) => line.published)).toEqual(['766.489913', '769.896456'])
    // The kept table: the two lines NIST gives an intensity, and six it marks with letters alone.
    expect(printed('nist-asd-lines-k-700-780.txt').filter((cell) => /^\d/.test(cell))).toEqual(['766.489913', '769.896456', '774.107', '774.107', '774.246', '779.517', '779.517', '779.656'])
  })

  it('stand for a pair only where NIST prints the two closer than the spectroscope separates, the stronger one first by NIST\'s intensity', () => {
    const intensity = (file: string, wavelength: string) => Number(/^\d+/.exec(table(file).split('\n').find((row) => row.startsWith(`"${wavelength}"`))!.split('\t').at(file.includes('-na') ? 2 : 1)!.replaceAll('"', ''))![0])
    const pairs = flameData.salts.flatMap((s) => s.features.flatMap((f) => (f.kind === 'line' && f.pairedWithNm ? [[f.id, f.wavelengthNm, f.pairedWithNm] as const] : [])))
    expect(pairs.map(([id]) => id)).toEqual(['k-766', 'k-404', 'na-589'])
    for (const [id, line, partner] of pairs) expect(Math.abs(line.value - partner.value), id).toBeLessThan(flameData.parameters.unresolvedWithinNm.value)
    expect([intensity('nist-asd-lines-k-700-780.txt', '766.489913'), intensity('nist-asd-lines-k-700-780.txt', '769.896456')]).toEqual([25, 24])
    expect([intensity('nist-asd-lines-k.txt', '404.4136'), intensity('nist-asd-lines-k.txt', '404.7208')]).toEqual([18, 17])
    expect([intensity('nist-asd-lines-na.txt', '588.995095'), intensity('nist-asd-lines-na.txt', '589.592424')]).toEqual([80000, 40000])
  })

  it("are, for sodium, the two lines its card of the periodic table shows; potassium's card has the violet pair and stops short of the red one", () => {
    const card = (symbol: string) => {
      const spectrum = emissionSpectra.find((e) => e.symbol === symbol)!
      return 'emission' in spectrum ? spectrum.emission.lines.map((line) => line.published) : []
    }
    expect([...card('Na')].sort()).toEqual(['588.995095', '589.592424'])
    expect(card('K')).toEqual(expect.arrayContaining(['404.4136', '404.7208']))
    expect(card('K').some((published) => Number(published) > 700)).toBe(false)
    // The cards of the four whose flame is mostly a molecule's hold lines of the atom that the strip does not show.
    for (const symbol of ['Ba', 'Ca', 'Cu', 'Sr']) {
      const stored = flameData.salts.find((s) => s.metal.symbol === symbol)!.features.flatMap((f) => (f.kind === 'line' ? [f.wavelengthNm.published] : []))
      expect(card(symbol).filter((published) => !stored.includes(published)).length, symbol).toBeGreaterThan(4)
    }
  })
})

describe('the brightest feature of each salt', () => {
  it('is one feature, of rank 1, and no other of that salt has the rank', () => {
    for (const s of flameData.salts) expect(s.features.filter((f) => f.prominence === 1).map((f) => f.id), s.id).toEqual([brightestOf(s).id])
  })

  it('lies inside exactly one answer range, 5 nm or more from each boundary it could be mistaken across', () => {
    const ranges = flameData.parameters.ranges.value
    expect(ranges.map(rangeId)).toEqual(['400-475', '475-570', '570-600', '600-650', '650-700', '700-780'])
    const inside = flameData.salts.map((s) => {
      const { fromNm, toNm } = extentOf(flameData, brightestOf(s))
      const holding = ranges.filter(([from, to]) => fromNm >= from && toNm <= to)
      expect(holding.length, s.id).toBe(1)
      const [from, to] = holding[0]!
      if (from !== flameData.scale.fromNm) expect(fromNm - from, s.id).toBeGreaterThanOrEqual(5)
      if (to !== flameData.scale.toNm) expect(to - toNm, s.id).toBeGreaterThanOrEqual(5)
      expect(rangeOf(flameData, brightestOf(s)), s.id).toEqual(holding[0])
      return `${s.metal.symbol} ${rangeId(holding[0]!)}`
    })
    // Each of the six in a range of its own.
    expect(inside).toEqual(['Ba 475-570', 'Ca 600-650', 'Cu 400-475', 'K 700-780', 'Na 570-600', 'Sr 650-700'])
  })

  it('is drawn wider than its sources place it only where they give no limits', () => {
    const drawn = (saltId: string, featureId: string) => extentOf(flameData, salt(saltId).features.find((f) => f.id === featureId)!)
    expect(drawn('srcl2-0.1m', 'sroh-red')).toEqual({ fromNm: 666, toNm: 691 })
    expect(drawn('srcl2-0.1m', 'sroh-orange')).toEqual({ fromNm: 601, toNm: 611 })
    expect(drawn('cacl2-0.1m', 'caoh-orange-red')).toEqual({ fromNm: 614, toNm: 640 })
    expect(drawn('nacl-0.1m', 'na-589')).toEqual({ fromNm: 588.995095, toNm: 589.592424 })
  })
})

describe('validateFlame', () => {
  it('refuses a record that is not the shape, without throwing', () => {
    for (const input of [null, undefined, 3, 'flame', [], {}]) expect(validateFlame(input, sources).length, String(input)).toBeGreaterThan(0)
    expect(validateFlame(stored, null as unknown as []).length).toBeGreaterThan(0)
    expect(validateFlame(stored, sources, { institutionNames: null as unknown as [] })).toEqual([])
  })

  it('refuses two features of one rank, a rank left out, and a brightest feature that crosses a boundary or sits against one', () => {
    expect(errorsWith((d) => void (d.salts[1]!.features[1]!.prominence = 1))).toMatch(/salt "cacl2-0.1m": the ranks of its features must be 1, 2, 3/)
    expect(errorsWith((d) => void (d.salts[1]!.features[2]!.prominence = 5))).toMatch(/the ranks of its features must be/)
    expect(errorsWith((d) => void (d.parameters.ranges.value = [[400, 475], [475, 570], [570, 600], [600, 630], [630, 700], [700, 780]]))).toMatch(/salt "cacl2-0.1m": its brightest feature, "caoh-orange-red", does not lie plainly inside one answer range/)
    expect(errorsWith((d) => void (d.parameters.ranges.value = [[400, 475], [475, 570], [570, 600], [600, 642], [642, 700], [700, 780]]))).toMatch(/"caoh-orange-red", does not lie plainly inside/)
  })

  it('refuses ranges that leave a gap, overlap or stop short of the scale', () => {
    for (const ranges of [[[400, 475], [480, 780]], [[400, 500], [475, 780]], [[400, 475], [475, 700]], [[410, 475], [475, 780]]] as [number, number][][]) {
      expect(errorsWith((d) => void (d.parameters.ranges.value = ranges)), JSON.stringify(ranges)).toMatch(/the answer ranges must cover the scale from end to end/)
    }
  })

  it('refuses a feature off the scale, a band written backwards, a pair too far apart to be one line, and two lines too close to be two', () => {
    expect(errorsWith((d) => void (d.scale.toNm = 760))).toMatch(/feature "k-766" is not on the scale/)
    expect(errorsWith((d) => Object.assign(d.salts[1]!.features[0]!, { fromNm: 640, toNm: 614 }))).toMatch(/a band runs from a shorter wavelength to a longer one/)
    expect(errorsWith((d) => Object.assign(d.salts[1]!.features[0]!, { fromNm: 620, toNm: 620 }))).toMatch(/a band runs from a shorter wavelength to a longer one/)
    expect(errorsWith((d) => void (d.parameters.unresolvedWithinNm.value = 3))).toMatch(/feature "k-766": its pair is 3 nm or more apart, which is two lines/)
    expect(
      errorsWith((d) => {
        const [red] = d.salts[3]!.features
        d.salts[3]!.features.push({ ...red!, id: 'k-770', prominence: 3, wavelengthNm: { value: 772, published: '772', sourceId: 'nist-asd-lines-k-700-780' }, pairedWithNm: undefined } as (typeof d.salts)[number]['features'][number])
      }),
    ).toMatch(/the lines "k-766" and "k-770" are closer than 5 nm, which is one feature/)
  })

  it('refuses an id given twice, two flames of one colour, a trace or a mask that is no salt, an answer that is no choice, and a source that does not exist', () => {
    expect(errorsWith((d) => void (d.salts[1]!.features[0]!.id = 'baoh-green'))).toMatch(/features: duplicate id "baoh-green"/)
    expect(errorsWith((d) => void (d.salts[5]!.flame.value.name = 'orange-red'))).toMatch(/flame colours: duplicate id "orange-red"/)
    expect(errorsWith((d) => void (d.handling.value = 'salt'))).toMatch(/handling: unknown salt "salt"/)
    expect(errorsWith((d) => void (d.masking.value = 'salt'))).toMatch(/masking: unknown salt "salt"/)
    expect(errorsWith((d) => void (d.closing.answer.value = 'flame'))).toMatch(/closing: the answer "flame" is not one of the choices/)
    expect(errorsWith((d) => void (d.salts[0]!.features[0]!.sourceId = 'a-book'))).toMatch(/unknown source "a-book"/)
    expect(errorsWith((d) => void (d.salts[0]!.hazards.note.moreSourceIds = ['a-sheet']))).toMatch(/moreSourceIds\[0\]: unknown source "a-sheet"/)
  })

  it('refuses a line whose printed digits are not its number, and institution text in a note', () => {
    expect(errorsWith((d) => void ((d.salts[4]!.features[0] as { wavelengthNm: { value: number } }).wavelengthNm.value = 589))).toMatch(/published "588.995095" is not the stored value 589/)
    expect(errorsWith((d) => void (d.salts[0]!.notes[0]!.value = 'Ask in Room 214.'))).toMatch(/looks like a location/)
  })
})

describe('flameCitations', () => {
  it('lists for each station every source its values cite, each once, with what it covers', () => {
    for (const s of flameData.salts) {
      const listed = flameCitations(flameData, s.id, sources)
      const ids = listed.map((c) => c.source.id)
      expect(new Set(ids).size, s.id).toBe(ids.length)
      const cited = new Set<string>()
      JSON.stringify(s, (key, value) => {
        if ((key === 'sourceId' || key === 'alsoSourceId') && typeof value === 'string') cited.add(value)
        if (key === 'moreSourceIds') for (const id of value as string[]) cited.add(id)
        return value
      })
      for (const id of [flameData.handling.sourceId, flameData.handling.alsoSourceId!, flameData.masking.sourceId]) cited.add(id)
      expect([...ids].sort(), s.id).toEqual([...cited].sort())
    }
    const barium = flameCitations(flameData, 'bacl2-0.1m', sources)
    expect(barium.find((c) => c.source.id === 'nist-asd-lines-neutral')!.covers).toEqual(['Wavelengths of the atomic lines', 'Notes on this station'])
    // A note under a bottle's hazards that rests on four documents lists all four.
    expect(barium.filter((c) => c.covers.includes('Barium chloride solution, 0.1 M: hazards at the strength used')).map((c) => c.source.id)).toEqual(['flinn-sds-94.01', 'wards-sds-bb0041', 'fisher-sds-bacl2-dihydrate', 'noaa-cameo-19847'])
    expect(() => flameCitations(flameData, 'licl', sources)).toThrow(/no salt "licl"/)
  })
})
