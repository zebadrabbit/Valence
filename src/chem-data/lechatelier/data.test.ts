import { describe, expect, it } from 'vitest'
import authored from '../../../docs/research/lechatelier/lechatelier.json'
import ownHazards from '../../../docs/research/lechatelier/hazards.json'
import aqueousHazards from '../../../docs/research/phase-4/hazards.json'
import { lechatelierCitations } from '../citations'
import periodicTable from '../periodic-table.json'
import sources from '../sources.json'
import { validateLechatelier } from '../validate'
import { CAUSES, DISTURBANCE_IDS, SYSTEM_IDS, TUBE_IDS, WAYS, disturbanceOf, equilibriumOf, lechatelierData, lechatelierSchema, parameterOf, reagentOf, systemOf, type Disturbance, type LechatelierData, type Stage } from './data'
import stored from './lechatelier.json'

const local = import.meta.glob<string[]>('../denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

const copy = (): LechatelierData => JSON.parse(JSON.stringify(stored))
const errorsWith = (edit: (data: LechatelierData) => void) => {
  const data = copy()
  edit(data)
  return validateLechatelier(data, sources).join('\n')
}
const disturbances = lechatelierData.systems.flatMap((system) => system.disturbances.map((disturbance) => ({ system, disturbance })))
const constant = (id: string) => lechatelierData.equilibriumConstants.find((c) => c.id === id)!

/** The atoms and the charge of a formula as the record writes it: "[Zn(NH₃)₄]²⁺", "PbCl₂", "OH⁻". */
function composition(formula: string): { atoms: Record<string, number>; charge: number } {
  const SUB = '₀₁₂₃₄₅₆₇₈₉'
  const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const [, body, digits, sign] = /^(.*?)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻]?)$/.exec(formula)!
  const charge = sign === '' ? 0 : (sign === '⁺' ? 1 : -1) * (digits === '' ? 1 : Number([...digits!].map((c) => SUPER.indexOf(c)).join('')))
  let at = 0
  const count = () => {
    let text = ''
    while (at < body!.length && SUB.includes(body![at]!)) text += SUB.indexOf(body![at++]!)
    return text === '' ? 1 : Number(text)
  }
  const group = (close: string): Record<string, number> => {
    const atoms: Record<string, number> = {}
    const add = (element: string, n: number) => void (atoms[element] = (atoms[element] ?? 0) + n)
    while (at < body!.length && body![at] !== close) {
      const c = body![at]!
      if (c === '(' || c === '[') {
        at++
        const inner = group(c === '(' ? ')' : ']')
        at++
        const times = count()
        for (const [element, n] of Object.entries(inner)) add(element, n * times)
      } else {
        const [element] = /^[A-Z][a-z]?/.exec(body!.slice(at)) ?? []
        if (!element) throw new Error(`cannot read "${formula}" at ${at}`)
        at += element.length
        add(element, count())
      }
    }
    return atoms
  }
  return { atoms: group(''), charge }
}

/** The atoms and the charge on one side of an equation as written. */
function totals(side: string) {
  const atoms: Record<string, number> = {}
  let charge = 0
  for (const term of side.split(' + ')) {
    const [, coefficient, formula] = /^(\d*)(.+)\((aq|s|l|g)\)$/.exec(term) ?? []
    if (!formula) throw new Error(`cannot read the term "${term}"`)
    const n = coefficient === '' ? 1 : Number(coefficient)
    const { atoms: own, charge: ownCharge } = composition(formula)
    for (const [element, count] of Object.entries(own)) atoms[element] = (atoms[element] ?? 0) + count * n
    charge += ownCharge * n
  }
  return { atoms, charge }
}

describe('lechatelierData', () => {
  it('is the generated file, with nothing dropped or added by the schema', () => {
    expect(lechatelierData).toEqual(stored)
    expect(lechatelierSchema.safeParse(stored).success).toBe(true)
  })

  it('validates against the sources it cites, and holds no institution text', () => {
    expect(validateLechatelier(stored, sources, { institutionNames })).toEqual([])
  })

  it('is the authored record with the bottles\' hazards merged in: its own eight, and the two it shares with the aqueous reactions lab unchanged', () => {
    const { reagents, ...rest } = stored
    const { reagents: authoredReagents, ...authoredRest } = authored
    expect(rest).toEqual(authoredRest)
    expect(reagents.map((r) => Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'classifiedAs' && key !== 'hazards')))).toEqual(authoredReagents)
    const own: Record<string, unknown> = ownHazards
    const shared: Record<string, unknown> = aqueousHazards
    expect(Object.keys(own)).toEqual(['pbno32-0.3m', 'hcl-0.3m', 'hcl-12m', 'methyl-violet', 'cocl2-solid', 'znno32-0.1m', 'mgno32-0.1m', 'nh3-6m'])
    for (const reagent of reagents) {
      const entry = (own[reagent.id] ?? shared[reagent.id]) as { classifiedAs: string; hazards: unknown }
      expect({ classifiedAs: reagent.classifiedAs, hazards: reagent.hazards }, reagent.id).toEqual(entry)
    }
    for (const id of ['hcl-6m', 'naoh-6m']) expect(own[id], id).toBeUndefined()
  })

  it('has the ten bottles of spec 18.1, in order, each a solution with its strength but the indicator and the solid', () => {
    expect(lechatelierData.reagents.map((r) => [r.id, r.form, r.molarity])).toEqual([
      ['pbno32-0.3m', 'solution', 0.3],
      ['hcl-0.3m', 'solution', 0.3],
      ['hcl-6m', 'solution', 6],
      ['hcl-12m', 'solution', 12],
      ['methyl-violet', 'indicator', undefined],
      ['cocl2-solid', 'solid', undefined],
      ['znno32-0.1m', 'solution', 0.1],
      ['mgno32-0.1m', 'solution', 0.1],
      ['naoh-6m', 'solution', 6],
      ['nh3-6m', 'solution', 6],
    ])
    // Every bottle is used: a tube is made up from it, or a disturbance adds from it.
    const used = new Set(lechatelierData.systems.flatMap((s) => [...s.tubes.flatMap((t) => ('contents' in t ? t.contents.map((c) => c.reagentId) : [])), ...s.disturbances.flatMap((d) => (d.action.kind === 'add' ? [d.action.reagentId] : []))]))
    for (const reagent of lechatelierData.reagents) expect(used.has(reagent.id), reagent.id).toBe(true)
  })

  it('has the four systems of spec 18.2 with their disturbances in order, and the seventeen disturbances named once', () => {
    expect(lechatelierData.systems.map((s) => [s.id, s.heldBy, s.disturbances.map((d) => d.id)])).toEqual([
      ['lead-chloride', 'numbers', ['lead-acid', 'lead-heat', 'lead-cool', 'lead-water']],
      ['methyl-violet', 'numbers', ['indicator-acid', 'indicator-base']],
      ['cobalt', 'observation', ['cobalt-water', 'cobalt-heat', 'cobalt-cool']],
      ['hydroxides', 'numbers', ['zinc-drop', 'zinc-acid', 'zinc-base', 'zinc-ammonia', 'magnesium-drop', 'magnesium-acid', 'magnesium-base', 'magnesium-ammonia']],
    ])
    expect(disturbances.map(({ disturbance }) => disturbance.id)).toEqual([...DISTURBANCE_IDS])
    expect(lechatelierData.systems.map((s) => s.id)).toEqual([...SYSTEM_IDS])
    expect(lechatelierData.systems.flatMap((s) => s.tubes.map((t) => t.id))).toEqual([...TUBE_IDS])
  })

  it('writes each equilibrium one way, the solid or the second colour on the right, and every equation balances in atoms and charge', () => {
    expect(lechatelierData.equilibria.map((e) => [e.id, e.equation])).toEqual([
      ['lead-chloride', 'Pb²⁺(aq) + 2Cl⁻(aq) ⇌ PbCl₂(s)'],
      ['methyl-violet', 'HMV(aq) ⇌ H⁺(aq) + MV⁻(aq)'],
      ['cobalt', '[Co(H₂O)₆]²⁺(aq) + 4Cl⁻(aq) ⇌ [CoCl₄]²⁻(aq) + 6H₂O(l)'],
      ['zinc-hydroxide', 'Zn²⁺(aq) + 2OH⁻(aq) ⇌ Zn(OH)₂(s)'],
      ['magnesium-hydroxide', 'Mg²⁺(aq) + 2OH⁻(aq) ⇌ Mg(OH)₂(s)'],
    ])
    const written = [
      // The indicator's two letters stand for a dye whose formula the record does not give: its equation is left out.
      ...lechatelierData.equilibria.filter((e) => e.id !== 'methyl-violet').map((e) => e.equation),
      ...lechatelierData.heats.map((h) => h.equation),
      ...disturbances.flatMap(({ disturbance }) => (disturbance.equations ?? []).map((e) => e.value)),
    ]
    expect(written.length).toBeGreaterThan(9)
    for (const equation of written) {
      const [left, right] = equation.split(/ ⇌ | → /)
      expect(totals(left!), equation).toEqual(totals(right!))
    }
  })

  it('names for each side of an equilibrium what stands there, with the colour that tells it', () => {
    for (const equilibrium of lechatelierData.equilibria) {
      const { seenBy, left, right } = equilibrium
      if (seenBy.kind === 'colour') {
        expect(left, equilibrium.id).toContain(seenBy.left)
        expect(right, equilibrium.id).toContain(seenBy.right)
      } else {
        const solid = lechatelierData.substances.find((s) => s.id === equilibrium.id)!
        expect(solid.state).toBe('s')
        expect(seenBy.side === 'right' ? right : left, equilibrium.id).toContain(`solid ${solid.name.toLowerCase()}`)
        expect(seenBy.side === 'right' ? right : left, equilibrium.id).toContain(solid.look!.value)
        expect(seenBy.side === 'right' ? left : right, equilibrium.id).toContain('dissolved')
      }
    }
  })
})

describe('what each tube shows', () => {
  it('is, for the three systems the numbers decide, the procedure of spec 18.2', () => {
    const shown = (id: (typeof DISTURBANCE_IDS)[number]) => disturbanceOf(lechatelierData, id).disturbance.stages.map((s) => `${s.liquid}/${s.solid}`)
    // Lead chloride: no solid after the first portion, a solid after enough of them, none hot, a solid again cold, none after the water.
    expect(shown('lead-acid')).toEqual(['colourless/none', 'colourless/white', 'colourless/white'])
    expect(shown('lead-heat')).toEqual(['colourless/none'])
    expect(shown('lead-cool')).toEqual(['colourless/white'])
    expect(shown('lead-water')).toEqual(['colourless/none'])
    // Methyl violet: to yellow with acid, back to violet with base, through a colour between on the way.
    expect(shown('indicator-acid')).toEqual(['between blue and yellow/none', 'yellow/none'])
    expect(shown('indicator-base')).toEqual(['between blue and yellow/none', 'violet/none'])
    // The hydroxides: a drop gives a white solid with each; acid dissolves both; more base and ammonia dissolve zinc's and not magnesium's.
    for (const metal of ['zinc', 'magnesium'] as const) {
      expect(shown(`${metal}-drop`)).toEqual(['colourless/white'])
      expect(shown(`${metal}-acid`)).toEqual(['colourless/none'])
    }
    expect([shown('zinc-base'), shown('zinc-ammonia')]).toEqual([['colourless/none'], ['colourless/none']])
    expect([shown('magnesium-base'), shown('magnesium-ammonia')]).toEqual([['colourless/white'], ['colourless/white']])
  })

  it('is, for cobalt, a stored observation with its source at each of the four states: blue in the concentrated acid, pink diluted, blue hot, pink cold', () => {
    const cobalt = systemOf(lechatelierData, 'cobalt')
    const tube = cobalt.tubes[0]!
    expect('contents' in tube && [tube.shows.liquid, tube.shows.sourceId, tube.shows.alsoSourceId]).toEqual(['blue', 'nuffield-cobalt-equilibrium', 'chemguide-ligand-exchange'])
    expect(cobalt.disturbances.map((d) => d.stages.map((s) => [s.liquid, s.solid, s.sourceId]))).toEqual([
      [
        ['violet', 'none', 'nuffield-cobalt-equilibrium'],
        ['pink', 'none', 'nuffield-cobalt-equilibrium'],
      ],
      [['blue', 'none', 'nuffield-cobalt-equilibrium']],
      [['pink', 'none', 'nuffield-cobalt-equilibrium']],
    ])
    // The systems held by numbers carry no source on a stage: their source is the rules and the numbers.
    for (const { system, disturbance } of disturbances) if (system.heldBy === 'numbers') for (const stage of disturbance.stages) expect(stage.sourceId, disturbance.id).toBeUndefined()
  })

  it('has one stage for each portion, and only looks an observation can record', () => {
    for (const { disturbance } of disturbances) {
      const { action } = disturbance
      const portions = action.kind === 'add' && action.portions !== undefined ? parameterOf(lechatelierData, action.portions) : 1
      expect(disturbance.stages.length, disturbance.id).toBe(portions)
      for (const stage of disturbance.stages) {
        expect(lechatelierData.choices.liquid, disturbance.id).toContain(stage.liquid)
        expect(lechatelierData.choices.solid, disturbance.id).toContain(stage.solid)
      }
    }
    expect(lechatelierData.choices.solid[0]).toBe('none')
  })
})

describe('the right answer of every disturbance follows from the equilibrium as written and from what the tube shows', () => {
  /** What a tube shows before a disturbance: the last stage of the disturbance before it on the same tube, or what the tube (or the tube it is a share of) shows to begin with. */
  function before(systemId: (typeof SYSTEM_IDS)[number], disturbance: Disturbance): Stage {
    const system = systemOf(lechatelierData, systemId)
    const earlier = system.disturbances.slice(0, system.disturbances.indexOf(disturbance))
    const tube = system.tubes.find((t) => t.id === disturbance.tube)!
    const onTube = earlier.filter((d) => d.tube === disturbance.tube).at(-1)
    if (onTube) return onTube.stages.at(-1)!
    if ('shareOf' in tube) return earlier.filter((d) => d.tube === tube.shareOf).at(-1)!.stages.at(-1)!
    return tube.shows
  }
  const other = (side: 'left' | 'right') => (side === 'left' ? 'right' : 'left')

  it.each(disturbances.map(({ system, disturbance }) => [disturbance.id, system.id, disturbance] as const))('%s', (id, systemId, disturbance) => {
    const equilibrium = equilibriumOf(lechatelierData, id)
    const [was, is] = [before(systemId, disturbance), disturbance.stages.at(-1)!]
    const { seenBy } = equilibrium
    if (disturbance.ask.kind === 'direction') {
      // The way the tube went: toward the solid's side where a solid came, away from it where one went; toward the side whose colour the liquid now has.
      let went: string
      if (seenBy.kind === 'solid') {
        expect(was.solid === 'none', `${id}: the solid must come or go for a way to be seen`).not.toBe(is.solid === 'none')
        went = is.solid === 'none' ? other(seenBy.side) : seenBy.side
        expect(is.liquid).toBe(was.liquid)
      } else {
        expect([seenBy.left, seenBy.right], `${id}: the liquid ends at the colour of one side`).toContain(is.liquid)
        expect(is.liquid).not.toBe(was.liquid)
        went = is.liquid === seenBy.left ? 'left' : 'right'
      }
      expect(disturbance.ask.right).toBe(went)
      // Heating goes the way that takes heat in, and cooling the other way.
      if (disturbance.action.kind !== 'add') {
        const takesIn = equilibrium.heat!.takenInToward
        expect(disturbance.ask.right).toBe(disturbance.action.kind === 'heat' ? takesIn : other(takesIn))
      }
    } else {
      // What took the metal ion away: what was added, where the solid has gone; nothing, where it is still there.
      expect(seenBy.kind).toBe('solid')
      expect(was.solid).not.toBe('none')
      const added = reagentOf(lechatelierData, id)!.id
      const gone = is.solid === 'none'
      expect(disturbance.ask.right).toBe(gone ? { 'naoh-6m': 'hydroxide', 'nh3-6m': 'ammonia' }[added] : 'nothing')
      // And the equilibrium names a constant for that complex ion exactly where the solid goes.
      expect(equilibrium.numbers?.[added === 'naoh-6m' ? 'withHydroxide' : 'withAmmonia'] !== undefined, id).toBe(gone)
    }
  })

  it('asks which way at thirteen disturbances and what took the ion away at four, and has every answer among the choices', () => {
    expect(disturbances.filter(({ disturbance }) => disturbance.ask.kind === 'cause').map(({ disturbance }) => disturbance.id)).toEqual(['zinc-base', 'zinc-ammonia', 'magnesium-base', 'magnesium-ammonia'])
    for (const { disturbance } of disturbances) expect(disturbance.ask.kind === 'direction' ? WAYS : CAUSES, disturbance.id).toContain(disturbance.ask.right)
    // No disturbance leaves its equilibrium where it was.
    expect(disturbances.filter(({ disturbance }) => disturbance.ask.right === 'none')).toEqual([])
  })
})

describe('the stored numbers', () => {
  it('are the constants the tables give, to three significant figures', () => {
    expect(lechatelierData.equilibriumConstants.map((c) => [c.id, c.gibbs.value, c.constant.shown])).toEqual([
      ['zinc-hydroxide', 93.522, '4.13 × 10⁻¹⁷'],
      ['magnesium-hydroxide', 64.222, '5.61 × 10⁻¹²'],
      ['zincate-ion', -82.484, '2.82 × 10¹⁴'],
      ['zinc-ammonia-ion', -48.84, '3.60 × 10⁸'],
      ['ammonia-as-base', 27.075, '1.81 × 10⁻⁵'],
      ['water', 79.885, '1.01 × 10⁻¹⁴'],
    ])
    expect(constant('zinc-hydroxide').constant.value).toBe(4.13e-17)
    expect(lechatelierData.heats.map((h) => [h.id, h.enthalpy.value])).toEqual([['lead-chloride-dissolving', 23.392]])
    expect(lechatelierData.equilibria.find((e) => e.id === 'lead-chloride')!.heat).toEqual({ takenInToward: 'left', heatId: 'lead-chloride-dissolving', sourceId: 'nbs-tables-1982' })
  })

  it('are the solubility of lead chloride cold and hot, and the product at saturation each gives', () => {
    const lead = lechatelierData.leadChloride
    expect([lead.solubilityCold.published, lead.solubilityCold.celsius, lead.solubilityHot.published, lead.solubilityHot.celsius]).toEqual(['10', 20, '33.5', 100])
    expect([lead.molarMass.value, lead.saturationCold.shown, lead.saturationHot.shown]).toEqual([278.1, '1.86 × 10⁻⁴', '6.99 × 10⁻³'])
    for (const weight of lead.atomicWeights) expect(periodicTable.find((e) => e.symbol === weight.id)!.atomicMass.published).toBe(weight.published)
    expect([lechatelierData.parameters.coldCelsius.value, lechatelierData.parameters.boilingBathCelsius.value]).toEqual([lead.solubilityCold.celsius, lead.solubilityHot.celsius])
  })

  it("are the indicator's range and its three looks", () => {
    const { range, looks } = lechatelierData.indicator
    expect([range.from.published, range.to.published, looks.below.value, looks.within.value, looks.noAcid.value]).toEqual(['0.0', '1.6', 'yellow', 'between blue and yellow', 'violet'])
    const violet = lechatelierData.equilibria.find((e) => e.id === 'methyl-violet')!.seenBy
    expect(violet).toEqual({ kind: 'colour', left: looks.below.value, right: looks.noAcid.value })
  })

  it('gives every parameter a rationale of a sentence or more', () => {
    for (const [name, parameter] of Object.entries(lechatelierData.parameters)) expect(parameter.rationale.length, name).toBeGreaterThan(60)
  })
})

describe('validateLechatelier', () => {
  it('refuses an id that names nothing', () => {
    expect(errorsWith((d) => void (d.systems[0].disturbances[0]!.ruleIds = ['no-such-rule']))).toMatch(/disturbance "lead-acid": unknown rule "no-such-rule"/)
    expect(errorsWith((d) => void (d.systems[0].disturbances[0]!.action = { kind: 'add', reagentId: 'hcl-1m', drops: 'leadAcidDrops' }))).toMatch(/unknown reagent "hcl-1m"/)
    expect(errorsWith((d) => void (d.systems[0].disturbances[0]!.action = { kind: 'add', reagentId: 'hcl-0.3m', drops: 'noSuchDrops' }))).toMatch(/unknown parameter "noSuchDrops"/)
    expect(errorsWith((d) => void (d.systems[3].disturbances[2]!.constantIds = ['zincate']))).toMatch(/disturbance "zinc-base": unknown constant "zincate"/)
    expect(errorsWith((d) => void (d.equilibriumConstants[0]!.terms[0]!.gibbsId = 'zinc'))).toMatch(/constant "zinc-hydroxide": unknown Gibbs energy "zinc"/)
    expect(errorsWith((d) => void (d.heats[0]!.terms[0]!.enthalpyId = 'lead'))).toMatch(/heat "lead-chloride-dissolving": unknown enthalpy "lead"/)
    expect(errorsWith((d) => void (d.systems[1].disturbances[0]!.equilibriumId = 'cobalt'))).toMatch(/disturbance "indicator-acid": unknown equilibrium "cobalt"/)
    expect(errorsWith((d) => void (d.equilibria[3]!.numbers!.withAmmonia = 'none'))).toMatch(/equilibrium "zinc-hydroxide": unknown constant "none"/)
    expect(errorsWith((d) => void (d.rules[0]!.sourceId = 'no-such-source'))).toMatch(/unknown source "no-such-source"/)
  })

  it('refuses a tube that shows what no observation can record, and stages that are not one for each portion', () => {
    expect(errorsWith((d) => void (d.systems[0].disturbances[0]!.stages[1]!.solid = 'cream'))).toMatch(/disturbance "lead-acid", stage 2: its solid, "cream", is not a choice of the observation/)
    expect(errorsWith((d) => void (d.systems[2].disturbances[1]!.stages[0]!.liquid = 'purple'))).toMatch(/disturbance "cobalt-heat", stage 1: its liquid, "purple", is not a choice of the observation/)
    expect(errorsWith((d) => void d.systems[0].disturbances[0]!.stages.pop())).toMatch(/disturbance "lead-acid": 2 stages are stored for 3 portions/)
    expect(errorsWith((d) => void (d.indicator.looks.within.value = 'green'))).toMatch(/indicator: its look "green" is not a choice of the observation/)
    expect(errorsWith((d) => void (d.substances[0]!.look!.value = 'cream'))).toMatch(/substance "lead-chloride": its look, "cream", is not a choice of the observation/)
  })

  it('refuses a stored observation with no source, a disturbance out of its place, and a question that does not fit its equilibrium', () => {
    expect(errorsWith((d) => void delete d.systems[2].disturbances[1]!.stages[0]!.sourceId)).toMatch(/disturbance "cobalt-heat", stage 1: what the tube shows is a stored observation and needs a source/)
    expect(errorsWith((d) => void d.systems[0].disturbances.reverse())).toMatch(/disturbances: they are not the seventeen the lab names/)
    expect(errorsWith((d) => void (d.systems[2].disturbances[0]!.ask = { kind: 'cause', right: 'nothing' }))).toMatch(/disturbance "cobalt-water": what took the ion away is asked only of a solid and its ions/)
    expect(errorsWith((d) => void (d.systems[1].disturbances[0]!.action = { kind: 'heat' }))).toMatch(/disturbance "indicator-acid": the tube is heated or cooled, and its equilibrium says nothing of heat/)
    expect(errorsWith((d) => void (d.systems[3].tubes[1] = { id: 'zinc-acid', shareOf: 'zinc-base' }))).toMatch(/tube "zinc-acid": it takes a share of a tube that is itself a share/)
  })

  it('refuses a published figure that is not the number beside it, institution text, and anything the schema does not know', () => {
    expect(errorsWith((d) => void (d.gibbs[0]!.published = '-147.6'))).toMatch(/published/)
    expect(errorsWith((d) => void (d.rules[0]!.says = 'Kept in Room 214.'))).toMatch(/lechatelier\.rules\[0\]\.says: looks like/)
    expect(validateLechatelier({ ...stored, extra: 1 }, sources).join()).toMatch(/^schema: /)
    expect(validateLechatelier({ ...stored, systems: stored.systems.slice(0, 3) }, sources).join()).toMatch(/^schema: systems/)
    expect(validateLechatelier(null, sources).join()).toMatch(/^schema: /)
    expect(() => validateLechatelier(stored, undefined as never)).not.toThrow()
  })
})

describe('lechatelierCitations', () => {
  it.each(DISTURBANCE_IDS)('%s lists its sources, each once, with what it covers', (id) => {
    const cited = lechatelierCitations(lechatelierData, id, sources)
    expect(cited.length).toBeGreaterThan(3)
    expect(new Set(cited.map((c) => c.source.id)).size).toBe(cited.length)
    for (const { covers } of cited) expect(covers.length).toBeGreaterThan(0)
    // Every source the disturbance's own notes, stages and equations cite is in the list.
    const { disturbance } = disturbanceOf(lechatelierData, id)
    const own = [...disturbance.notes, ...(disturbance.equations ?? []), ...disturbance.stages].flatMap((c) => [c.sourceId, c.alsoSourceId, ...(c.moreSourceIds ?? [])]).filter((s): s is string => s !== undefined)
    for (const sourceId of own) expect(cited.map((c) => c.source.id), `${id}: ${sourceId}`).toContain(sourceId)
  })

  it('lists the hazards of every bottle that has gone into the tube, and of no other', () => {
    const labels = (id: (typeof DISTURBANCE_IDS)[number]) => lechatelierCitations(lechatelierData, id, sources).flatMap((c) => c.covers).filter((label) => label.includes('hazard classification'))
    expect(labels('lead-acid')).toEqual(['Lead(II) nitrate solution, 0.3 M: hazard classification', 'Hydrochloric acid, 0.3 M: hazard classification'])
    expect(labels('lead-water')).toEqual(labels('lead-acid'))
    expect(labels('cobalt-heat')).toEqual(['Cobalt(II) chloride hexahydrate, solid: hazard classification', 'Hydrochloric acid, 12 M: hazard classification'])
    expect(labels('zinc-ammonia')).toEqual(['Zinc nitrate solution, 0.1 M: hazard classification', 'Sodium hydroxide solution, 6 M: hazard classification', 'Ammonia solution, 6 M: hazard classification'])
    expect(labels('magnesium-acid')).toEqual(['Magnesium nitrate solution, 0.1 M: hazard classification', 'Sodium hydroxide solution, 6 M: hazard classification', 'Hydrochloric acid, 6 M: hazard classification'])
  })

  it('says in no label what a tube shows or which way an equilibrium goes, and throws on a disturbance that is not one', () => {
    const labels = DISTURBANCE_IDS.flatMap((id) => lechatelierCitations(lechatelierData, id, sources).flatMap((c) => c.covers))
    // A bottle is named by its label, and the indicator's name holds a colour: what is held to this is what the list says of it.
    const names = lechatelierData.reagents.map((r) => r.name)
    for (const label of labels) expect(names.reduce((text, name) => text.replace(name, ''), label)).not.toMatch(/white|pink|blue|violet|yellow|dissolves|left|right|complex/i)
    expect(() => lechatelierCitations(lechatelierData, 'no-such' as never, sources)).toThrow(/no disturbance "no-such"/)
  })
})
