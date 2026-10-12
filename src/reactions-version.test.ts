import { describe, expect, it } from 'vitest'
import { ACTIVITIES, REACTIONS_PROGRESS } from './app/activities'
import { FIELD_AT, KIND_ANSWERS, reactionsData } from './chem-data/reactions/data'
import { modelFrom } from './engine/reactions/model'
import { PINNED_MODEL } from './engine/reactions/pinnedModel'
import { createLab } from './engine/reactions/state'

// A stored lab holds, for each run of each station, the list of things the learner did, not what each vessel
// showed or whether an answer was right: those are worked out again from the model each time the lab is loaded,
// and every run is judged again against it. So a change to what a vessel shows, to the choices or the looks, to a
// kind, an equation, a species' atoms or states, to the tiles, the order of the metals or the stored shape would
// regrade a lab that is already stored, or refuse it, unless the stored entry's version changes with it.
describe('the types of reactions lab', () => {
  it("pins the model, the answers a kind is said from, the looks, the stored shape and the stored entry's version together: changing any of them means raising the reactions entry's version in src/app/activities.ts", () => {
    expect({
      entry: REACTIONS_PROGRESS.entry,
      version: REACTIONS_PROGRESS.version,
      model: modelFrom(reactionsData),
      kinds: KIND_ANSWERS,
      fieldAt: FIELD_AT,
      state: createLab('guided'),
    }).toEqual({
      entry: 'lab:types-of-reactions',
      version: 1,
      model: PINNED_MODEL,
      kinds: ['combination', 'decomposition', 'single-replacement', 'double-replacement', 'none'],
      fieldAt: { coating: 'metal', bubbles: 'metal', liquid: 'liquid', gas: 'liquid', solid: 'solid', light: 'flame', warmth: 'touch' },
      state: {
        mode: 'guided',
        status: 'in-progress',
        stations: {
          'zinc-copper-sulfate': [{ index: 0, events: [] }],
          'magnesium-flame': [{ index: 0, events: [] }],
          'metals-in-acid': [{ index: 0, events: [] }],
          'two-solutions': [{ index: 0, events: [] }],
          peroxide: [{ index: 0, events: [] }],
        },
      },
    })
  })

  it('pins what the pinned model itself holds: the right answers of every vessel, the tiles and the order', () => {
    expect(PINNED_MODEL.stations.map((station) => [station.id, station.order, station.tiles.length, station.vessels.map((v) => [v.id, v.kind, v.after, v.equation === null ? null : [v.equation.reactants.map((t) => `${t.coefficient} ${t.speciesId}`), v.equation.products.map((t) => `${t.coefficient} ${t.speciesId}`)], v.catalyst])])).toEqual([
      ['zinc-copper-sulfate', null, 7, [['tube', 'single-replacement', { coating: 'red-brown', liquid: 'paler blue' }, [['1 zinc', '1 copper-ii-sulfate'], ['1 zinc-sulfate', '1 copper']], null]]],
      ['magnesium-flame', null, 6, [['strip', 'combination', { solid: 'white', light: 'white light' }, [['2 magnesium', '1 oxygen'], ['2 magnesium-oxide']], null]]],
      [
        'metals-in-acid',
        ['magnesium', 'zinc', 'copper'],
        10,
        [
          ['magnesium', 'single-replacement', { liquid: 'colourless', bubbles: 'fast' }, [['1 magnesium', '2 hydrochloric-acid'], ['1 magnesium-chloride', '1 hydrogen']], null],
          ['zinc', 'single-replacement', { liquid: 'colourless', bubbles: 'slow' }, [['1 zinc', '2 hydrochloric-acid'], ['1 zinc-chloride', '1 hydrogen']], null],
          ['copper', 'none', { liquid: 'colourless', bubbles: 'none' }, null, null],
        ],
      ],
      ['two-solutions', null, 7, [['tube', 'double-replacement', { liquid: 'colourless', solid: 'white' }, [['1 calcium-chloride', '1 sodium-carbonate'], ['1 calcium-carbonate', '2 sodium-chloride']], null]]],
      ['peroxide', null, 6, [['tube', 'decomposition', { liquid: 'pale yellow', gas: 'bubbles', warmth: 'warmer' }, [['2 hydrogen-peroxide'], ['2 water', '1 oxygen']], 'iron-iii-chloride']]],
    ])
    expect(PINNED_MODEL.species.map((s) => `${s.formula}(${s.states.join('/')})`).join(' ')).toBe(
      'Zn(s) Cu(s) Mg(s) CuSO₄(aq) ZnSO₄(aq) HCl(aq) MgCl₂(aq) ZnCl₂(aq) CuCl₂(aq) H₂(g) O₂(g) Cl₂(g) H₂O(l) CO₂(g) MgO(s) CaCl₂(aq) Na₂CO₃(aq) CaCO₃(s) NaCl(aq) NaOH(aq) H₂O₂(aq/l) FeCl₃(aq)',
    )
  })

  it('has a stored entry of its own, which no activity yet lists: the lab has no page', () => {
    expect(ACTIVITIES.some((activity) => (activity.entry as string) === REACTIONS_PROGRESS.entry)).toBe(false)
  })
})
