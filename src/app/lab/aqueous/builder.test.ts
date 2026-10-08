import { describe, expect, it } from 'vitest'
import { aqueousData as data } from '@/chem-data/aqueous/data'
import { FORMS, can, checkEquation, createLab, stationView, type Form, type Term } from '@/engine/aqueous'
import { correctEntry } from '@/engine/aqueous/testkit'
import { EMPTY, MAX_COEFFICIENT, SIDES, changeTerm, entered, fit, formulaParts, move, nextEmpty, place, remove, sameEntry, setNoReaction, type At, type Counts, type Refused, type Row, type Side } from './builder'

const lab = createLab(data, 'guided')
const takes = (stationId: string, row: Row) => can(data, lab, { type: 'enterEquation', stationId, form: 'netIonic', entry: entered(row) })
const term = (speciesId: string, coefficient = 1, state: Term['state'] = 'aq'): Term => ({ speciesId, coefficient, state })
const at = (side: Side, index: number): At => ({ side, index })
/** A row as its species, a dot for an empty place: "iron-iii-ion . > iron-iii-hydroxide". */
const drawn = (row: Row) => [row.reactants, row.products].map((slots) => slots.map((slot) => slot?.speciesId ?? '.').join(' ')).join(' > ')
/** The row after a step that is not refused. */
const done = (result: Row | Refused): Row => {
  if ('speciesId' in result) throw new Error(`refused: ${result.speciesId} on ${result.side}`)
  return result
}
const TEMPLATE: Counts = { reactants: 2, products: 1 }

describe('the row of places an equation is built in', () => {
  it('starts, as a template, with the places it is given, all empty, the first of them the next to fill; the engine does not take it', () => {
    const row = fit(EMPTY, TEMPLATE)
    expect(row).toEqual({ noReaction: false, reactants: [null, null], products: [null] })
    expect(nextEmpty(row)).toEqual(at('reactants', 0))
    expect(entered(row)).toEqual({ noReaction: false, reactants: [], products: [] })
    expect(takes('aq-01', row)).toBe('invalid-entry')
  })

  it('starts, with no template, with one empty place on each side', () => {
    expect(fit(EMPTY, null)).toEqual({ noReaction: false, reactants: [null], products: [null] })
    expect(nextEmpty(fit(EMPTY, null))).toEqual(at('reactants', 0))
  })

  it('puts a species in a place with a coefficient of 1 and as dissolved, and in a template leaves the other places where they are', () => {
    let row = done(place(fit(EMPTY, TEMPLATE), at('reactants', 1), 'hydroxide-ion', TEMPLATE))
    expect(row.reactants).toEqual([null, term('hydroxide-ion')])
    row = done(place(row, at('products', 0), 'iron-iii-hydroxide', TEMPLATE))
    row = done(place(row, at('reactants', 0), 'iron-iii-ion', TEMPLATE))
    expect(drawn(row)).toBe('iron-iii-ion hydroxide-ion > iron-iii-hydroxide')
    expect(entered(row)).toEqual({ noReaction: false, reactants: [term('iron-iii-ion'), term('hydroxide-ion')], products: [term('iron-iii-hydroxide')] })
    expect(takes('aq-01', row)).toBeNull()
  })

  it('moves on to the next empty place as the row is read, going round to the start, and to none when every place is full', () => {
    let row = done(place(fit(EMPTY, TEMPLATE), at('reactants', 1), 'hydroxide-ion', TEMPLATE))
    expect(nextEmpty(row, at('reactants', 1))).toEqual(at('products', 0))
    row = done(place(row, at('products', 0), 'iron-iii-hydroxide', TEMPLATE))
    expect(nextEmpty(row, at('products', 0))).toEqual(at('reactants', 0))
    row = done(place(row, at('reactants', 0), 'iron-iii-ion', TEMPLATE))
    expect(nextEmpty(row, at('reactants', 0))).toBeNull()
    expect(nextEmpty(row)).toBeNull()
    // A place that is itself empty is the next one.
    expect(nextEmpty(remove(row, at('reactants', 1), TEMPLATE), at('reactants', 1))).toEqual(at('reactants', 1))
  })

  it('with no template gives a side a new empty place each time its last is filled, and the next place to fill stays on that side', () => {
    let row = fit(EMPTY, null)
    for (const [i, speciesId] of ['iron-iii-ion', 'chloride-ion', 'sodium-ion'].entries()) {
      row = done(place(row, at('reactants', i), speciesId, null))
      expect(row.reactants).toHaveLength(i + 2)
      expect(row.reactants.at(-1)).toBeNull()
      expect(row.products).toEqual([null])
      expect(nextEmpty(row, at('reactants', i))).toEqual(at('reactants', i + 1))
    }
    expect(drawn(row)).toBe('iron-iii-ion chloride-ion sodium-ion . > .')
  })

  it('with no template closes up a side when a place is emptied, so that it never shows two empty places', () => {
    let row = fit({ noReaction: false, reactants: [term('iron-iii-ion'), term('chloride-ion'), term('sodium-ion')], products: [] }, null)
    row = remove(row, at('reactants', 1), null)
    expect(drawn(row)).toBe('iron-iii-ion sodium-ion . > .')
    expect(nextEmpty(row, at('reactants', 1))).toEqual(at('reactants', 2))
    row = remove(remove(row, at('reactants', 0), null), at('reactants', 0), null)
    expect(drawn(row)).toBe('. > .')
  })

  it('in a template empties a place where it is', () => {
    const row = fit({ noReaction: false, reactants: [term('iron-iii-ion'), term('hydroxide-ion')], products: [term('iron-iii-hydroxide')] }, TEMPLATE)
    expect(drawn(remove(row, at('reactants', 0), TEMPLATE))).toBe('. hydroxide-ion > iron-iii-hydroxide')
    expect(drawn(remove(row, at('products', 0), TEMPLATE))).toBe('iron-iii-ion hydroxide-ion > .')
  })

  it('refuses a species that is already on that side in another place, and takes it on the other side', () => {
    const row = done(place(fit(EMPTY, null), at('reactants', 0), 'sodium-ion', null))
    expect(place(row, at('reactants', 1), 'sodium-ion', null)).toEqual({ speciesId: 'sodium-ion', side: 'reactants' })
    // A spectator stands on both sides: the bank's tile is not used up.
    expect(drawn(done(place(row, at('products', 0), 'sodium-ion', null)))).toBe('sodium-ion . > sodium-ion .')
    // Put where it already is, nothing changes: not its coefficient either.
    const three = changeTerm(row, at('reactants', 0), { coefficient: 3 })
    expect(place(three, at('reactants', 0), 'sodium-ion', null)).toBe(three)
  })

  it('puts a species in a full place in place of what was there, as a new term', () => {
    const row = changeTerm(done(place(fit(EMPTY, TEMPLATE), at('reactants', 0), 'chloride-ion', TEMPLATE)), at('reactants', 0), { coefficient: 3, state: 's' })
    expect(done(place(row, at('reactants', 0), 'hydroxide-ion', TEMPLATE)).reactants).toEqual([term('hydroxide-ion'), null])
  })

  it('moves a term to an empty place, exchanges two terms, and across the arrow refuses what would be twice on a side', () => {
    const row = fit({ noReaction: false, reactants: [term('iron-iii-ion', 2), term('sodium-ion')], products: [term('sodium-ion'), term('iron-iii-hydroxide', 1, 's'), null] }, { reactants: 2, products: 3 })
    const counts = { reactants: 2, products: 3 }
    expect(drawn(done(move(row, at('reactants', 0), at('products', 2), counts)))).toBe('. sodium-ion > sodium-ion iron-iii-hydroxide iron-iii-ion')
    expect(done(move(row, at('reactants', 0), at('products', 2), counts)).products[2]).toEqual(term('iron-iii-ion', 2))
    expect(drawn(done(move(row, at('reactants', 0), at('reactants', 1), counts)))).toBe('sodium-ion iron-iii-ion > sodium-ion iron-iii-hydroxide .')
    expect(drawn(done(move(row, at('reactants', 0), at('products', 1), counts)))).toBe('iron-iii-hydroxide sodium-ion > sodium-ion iron-iii-ion .')
    // Sodium ion is among the products already, in another place.
    expect(move(row, at('reactants', 1), at('products', 2), counts)).toEqual({ speciesId: 'sodium-ion', side: 'products' })
    // Exchanged with the iron ion, the products' sodium ion would be twice among the reactants.
    expect(move(row, at('reactants', 0), at('products', 0), counts)).toEqual({ speciesId: 'sodium-ion', side: 'reactants' })
    expect(move(row, at('products', 0), at('reactants', 0), counts)).toEqual({ speciesId: 'sodium-ion', side: 'reactants' })
    // The same species on both sides changes places with itself.
    expect(drawn(done(move(row, at('reactants', 1), at('products', 0), counts)))).toBe(drawn(row))
    // An empty place moves nothing, and a term moved onto itself stays.
    expect(move(row, at('products', 2), at('reactants', 0), counts)).toBe(row)
    expect(move(row, at('reactants', 0), at('reactants', 0), counts)).toBe(row)
  })

  it('with no template closes a side up after a move, and gives the other its new empty place', () => {
    const row = fit({ noReaction: false, reactants: [term('iron-iii-ion'), term('sodium-ion')], products: [] }, null)
    expect(drawn(done(move(row, at('reactants', 0), at('products', 0), null)))).toBe('sodium-ion . > iron-iii-ion .')
    expect(drawn(done(move(row, at('reactants', 0), at('reactants', 2), null)))).toBe('sodium-ion iron-iii-ion . > .')
  })

  it('changes the coefficient of a term within 1 to 9, and its state, and leaves the other terms as they are', () => {
    const row = fit({ noReaction: false, reactants: [term('iron-iii-ion'), term('hydroxide-ion')], products: [] }, TEMPLATE)
    expect(MAX_COEFFICIENT).toBe(9)
    expect(changeTerm(row, at('reactants', 1), { coefficient: 3 }).reactants).toEqual([term('iron-iii-ion'), term('hydroxide-ion', 3)])
    expect(changeTerm(row, at('reactants', 1), { coefficient: 0 })).toBe(row)
    expect(changeTerm(row, at('reactants', 1), { coefficient: 10 })).toBe(row)
    expect(changeTerm(row, at('reactants', 0), { state: 's' }).reactants[0]).toEqual(term('iron-iii-ion', 1, 's'))
    expect(changeTerm(row, at('products', 0), { state: 's' })).toBe(row)
  })

  it('fits a stored equation to a template without dropping a term: empty places at the end of a side that is short, none on a side that is over', () => {
    const stored = { noReaction: false, reactants: [term('iron-iii-ion')], products: [term('iron-iii-hydroxide'), term('sodium-ion'), term('chloride-ion')] }
    expect(drawn(fit(stored, { reactants: 2, products: 1 }))).toBe('iron-iii-ion . > iron-iii-hydroxide sodium-ion chloride-ion')
    // A row built with no template, shown as one (the mode was changed): its spare empty places go, from the end.
    expect(drawn(fit(fit(stored, null), { reactants: 2, products: 3 }))).toBe('iron-iii-ion . > iron-iii-hydroxide sodium-ion chloride-ion')
    expect(drawn(fit({ ...stored, reactants: [null, term('iron-iii-ion'), null] }, { reactants: 2, products: 3 }))).toBe('. iron-iii-ion > iron-iii-hydroxide sodium-ion chloride-ion')
    // And a template shown as none: closed up.
    expect(drawn(fit({ ...stored, reactants: [null, term('iron-iii-ion')] }, null))).toBe('iron-iii-ion . > iron-iii-hydroxide sodium-ion chloride-ion .')
    for (const counts of [null, TEMPLATE]) expect(fit(fit(stored, counts), counts)).toEqual(fit(stored, counts))
  })

  it('keeps what was built while "No reaction" is chosen, and enters "No reaction" alone', () => {
    const built = done(place(done(place(fit(EMPTY, null), at('reactants', 0), 'cobalt-ii-ion', null)), at('products', 0), 'cobalt-ii-ion', null))
    const none = setNoReaction(built, true)
    expect(none.reactants).toEqual(built.reactants)
    expect(entered(none)).toEqual({ noReaction: true, reactants: [], products: [] })
    expect(takes('aq-05', none)).toBeNull()
    expect(setNoReaction(none, false)).toEqual(built)
  })

  // A tap is one press of a tile, of a place, of the stepper, of a state or of Check. In a template the next place
  // to fill moves on by itself; with none it stays on the reactants, so the first product costs a tap on its place.
  const build = (stationId: string, form: Form, counts: Counts) => {
    const wanted = correctEntry(data, stationId, form)
    if (wanted.noReaction) return { row: setNoReaction(fit(EMPTY, counts), true), taps: 2 }
    let row = fit(EMPTY, counts)
    let next = nextEmpty(row)
    let taps = 1
    for (const side of SIDES) {
      for (const wantedTerm of wanted[side]) {
        if (next?.side !== side) {
          next = nextEmpty(row, at(side, 0))
          taps++
        }
        const here = next!
        row = changeTerm(done(place(row, here, wantedTerm.speciesId, counts)), here, { coefficient: wantedTerm.coefficient, state: wantedTerm.state })
        taps += 1 + (wantedTerm.coefficient - 1) + (wantedTerm.state === 'aq' ? 0 : 1)
        next = nextEmpty(row, here)
      }
    }
    return { row, taps }
  }

  it('can build every curated equation of every station, tile by tile, to one the check passes, as a template and with none', () => {
    for (const station of data.stations) {
      for (const form of FORMS) {
        const view = stationView(data, lab, station.id)
        for (const counts of [view.template[form], null]) {
          const wanted = correctEntry(data, station.id, form)
          for (const side of SIDES) for (const wantedTerm of wanted[side]) expect(station.paletteSpecies, station.id).toContain(wantedTerm.speciesId)
          const { row } = build(station.id, form, counts)
          expect(entered(row), `${station.id} ${form}`).toEqual(wanted)
          expect(checkEquation(data, station, form, entered(row)), `${station.id} ${form}`).toBeNull()
          // A template is exactly full when the equation is right.
          if (counts !== null) expect(nextEmpty(row)).toBeNull()
        }
      }
    }
  })

  it('takes 246 taps for the thirty equations of a faultless lab as templates, 273 with none, where it took 378', () => {
    const taps = (counts: (stationId: string, form: Form) => Counts) => data.stations.flatMap((station) => FORMS.map((form) => build(station.id, form, counts(station.id, form)).taps))
    const guided = taps((stationId, form) => stationView(data, lab, stationId).template[form])
    expect(guided.slice(0, 3)).toEqual([10, 19, 7])
    expect(guided.reduce((a, b) => a + b)).toBe(246)
    expect(taps(() => null).reduce((a, b) => a + b)).toBe(273)
  })

  it('tells two rows apart by what they hold', () => {
    const one = done(place(fit(EMPTY, null), at('reactants', 0), 'water', null))
    expect(sameEntry(one, done(place(fit(EMPTY, null), at('reactants', 0), 'water', null)))).toBe(true)
    expect(sameEntry(one, changeTerm(one, at('reactants', 0), { state: 'l' }))).toBe(false)
    expect(sameEntry(null, null)).toBe(true)
    expect(sameEntry(one, null)).toBe(false)
  })
})

describe('a formula as it is drawn', () => {
  it('is cut into what stands on the line, what goes below it and what goes above it, with plain digits and signs', () => {
    expect(formulaParts('Fe³⁺')).toEqual([{ text: 'Fe', at: 'line' }, { text: '3+', at: 'above' }])
    expect(formulaParts('SO₄²⁻')).toEqual([{ text: 'SO', at: 'line' }, { text: '4', at: 'below' }, { text: '2−', at: 'above' }])
    expect(formulaParts('Fe(OH)₃')).toEqual([{ text: 'Fe(OH)', at: 'line' }, { text: '3', at: 'below' }])
    expect(formulaParts('Co(NO₃)₂')).toEqual([{ text: 'Co(NO', at: 'line' }, { text: '3', at: 'below' }, { text: ')', at: 'line' }, { text: '2', at: 'below' }])
    expect(formulaParts('Cl⁻')).toEqual([{ text: 'Cl', at: 'line' }, { text: '−', at: 'above' }])
    expect(formulaParts('Mg')).toEqual([{ text: 'Mg', at: 'line' }])
  })

  it('draws every formula of the record with no raised or lowered character left on the line, and loses none', () => {
    for (const { formula } of data.species) {
      const parts = formulaParts(formula)
      for (const part of parts) expect(part.text, formula).toMatch(part.at === 'line' ? /^[A-Za-z()]+$/ : part.at === 'below' ? /^\d+$/ : /^\d*[+−]$/)
      expect(parts.map((part) => part.text).join('').length, formula).toBe([...formula].length)
    }
  })
})
