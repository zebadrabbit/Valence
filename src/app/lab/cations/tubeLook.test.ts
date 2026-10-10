import { describe, expect, it } from 'vitest'
import { contentsEnd } from '@/app/lab/Tube'
import { cationsData as data, PART_IDS, STEP_IDS } from '@/chem-data/cations/data'
import { createLab, modelFrom, partView, reduce, type CationsState, type TubeShows } from '@/engine/cations'
import { run, wholeRun, workStep } from '@/engine/cations/testkit'
import { placeLabel } from './messages'
import { TUBE_HEIGHT, TUBE_IDS, chartTree, fullMicrolitres, liquidHex, openingEntry, openingPart, sectionsOf, solidHex, surfaceOf, tubeLayers, type ChartNode } from './tubeLook'

const m = modelFrom(data)
const END = contentsEnd(TUBE_HEIGHT)
const views = (state: CationsState) => ({ known: partView(m, state, 'known'), unknown: partView(m, state, 'unknown') })
const liquid = (colour: string, microlitres = 1000, cloudy = false) => ({ colour, cloudy, microlitres })

describe('what is drawn in a tube', () => {
  it("has a colour of its own for every word the record has for a solid and for a liquid, and grey for one it does not know", () => {
    const solids = m.solidChoices.filter((choice) => choice !== 'none').map(solidHex)
    const liquids = m.liquidChoices.map(liquidHex)
    for (const hex of [...solids, ...liquids]) expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    expect(new Set([...solids, ...liquids, solidHex('puce')]).size).toBe(solids.length + liquids.length + 1)
    expect(solidHex('puce')).toBe(liquidHex('puce'))
    // The yellow solid and the yellow to orange liquid are not one colour; and they are told apart by more than colour (page.test.ts).
    expect(solidHex('yellow')).not.toBe(liquidHex('yellow to orange'))
  })

  it('draws a tube not yet used, and one with nothing in it, as empty', () => {
    expect(tubeLayers(m, null)).toEqual({ liquid: null, solid: null, spread: null })
    expect(tubeLayers(m, { liquid: null, solid: null })).toEqual({ liquid: null, solid: null, spread: null })
  })

  it('draws a solid that has settled as a layer at the bottom, and one that has not as specks through the liquid, never both', () => {
    const settled = tubeLayers(m, { liquid: liquid('yellow to orange'), solid: { colour: 'yellow', settled: true } })
    expect(settled.solid).toEqual({ hex: solidHex('yellow'), top: expect.any(Number) })
    // The grain is the ink's, but over the one solid too dark for the ink to show on.
    expect(tubeLayers(m, { liquid: liquid('colourless'), solid: { colour: 'grey to black', settled: true } }).solid).toEqual({ hex: solidHex('grey to black'), top: expect.any(Number), grain: '#ffffff' })
    expect(settled.spread).toBeNull()
    expect(settled.liquid!.hex).toBe(liquidHex('yellow to orange'))
    const spread = tubeLayers(m, { liquid: liquid('yellow to orange', 1000, true), solid: { colour: 'yellow', settled: false } })
    expect(spread.solid).toBeNull()
    expect(spread.spread).toEqual({ hex: solidHex('yellow') })
    const dry = tubeLayers(m, { liquid: null, solid: { colour: 'white', settled: true } })
    expect([dry.liquid, dry.solid?.hex, dry.spread]).toEqual([null, solidHex('white'), null])
  })

  it('draws every solid at one height, whatever the run and the sample: the engine gives no amounts of solid', () => {
    const tops = new Set<number>()
    const keep = (state: CationsState) => {
      for (const part of PART_IDS) {
        const view = partView(m, state, part)
        for (const shows of [...view.steps.map((step) => step.shows), ...TUBE_IDS.map((tube) => view.rack[tube])]) {
          const top = tubeLayers(m, shows).solid?.top
          if (top !== undefined) tops.add(top)
        }
      }
      return state
    }
    let state = wholeRun(m, createLab(1, 'challenge'), 'known', {}, keep)
    for (let unknown = 0; unknown < 7; unknown++) state = reduce(m, wholeRun(m, state, 'unknown', {}, keep), { type: 'runAgain', part: 'unknown' })
    expect(tops.size).toBe(1)
  })

  it('draws more liquid higher, the most this bench puts in a tube at the top, and the least a step works with tall enough to be looked at over a solid', () => {
    const full = fullMicrolitres(m)
    expect(full).toBe(m.ammoniaMicrolitres + m.nitricAcidAdditions * m.nitricAcidMicrolitres)
    const volumes = [m.waterMicrolitres, m.waterMicrolitres + m.aceticAcidMicrolitres + m.chromateMicrolitres, m.sampleMicrolitres, m.sampleMicrolitres + m.hydrochloricAcidMicrolitres, full]
    const surfaces = volumes.map((microlitres) => surfaceOf(m, microlitres))
    for (let i = 1; i < surfaces.length; i++) expect(surfaces[i]!).toBeLessThan(surfaces[i - 1]!)
    // Each addition of nitric acid shows.
    const acid = [0, 1, 2, 3, 4].map((additions) => surfaceOf(m, m.ammoniaMicrolitres + additions * m.nitricAcidMicrolitres))
    for (let i = 1; i < acid.length; i++) expect(acid[i - 1]! - acid[i]!).toBeGreaterThanOrEqual(5)
    // Over a settled solid the least liquid is 30 units deep or more; and nothing is drawn above the tube's mouth or over the rack's names.
    const { solid } = tubeLayers(m, { liquid: liquid('colourless', m.waterMicrolitres), solid: { colour: 'white', settled: true } })
    expect(solid!.top - surfaces[0]!).toBeGreaterThanOrEqual(30)
    expect(END - solid!.top).toBeGreaterThanOrEqual(30)
    expect(surfaceOf(m, full)).toBeGreaterThanOrEqual(90)
    expect(surfaceOf(m, 10 * full)).toBe(surfaceOf(m, full))
  })

  it('has two sections to look at, the liquid over the bottom, each 58 units tall or more whatever the tube holds, and inside the glass', () => {
    const tubes: (TubeShows | null)[] = [null, { liquid: liquid('colourless', m.waterMicrolitres), solid: null }, { liquid: liquid('colourless', fullMicrolitres(m)), solid: { colour: 'white', settled: true } }, { liquid: null, solid: { colour: 'white', settled: true } }]
    for (const shows of tubes) {
      const layers = tubeLayers(m, shows)
      const [first, second] = sectionsOf(layers)
      expect([first![0], second![0]]).toEqual(['liquid', 'bottom'])
      expect(first![2]).toBe(second![1])
      expect(second![2]).toBe(END)
      for (const [, top, bottom] of [first!, second!]) {
        expect(bottom - top).toBeGreaterThanOrEqual(58)
        expect(top).toBeGreaterThanOrEqual(20)
      }
      // The liquid's section takes in its surface.
      if (layers.liquid) expect(first![1]).toBeLessThan(layers.liquid.surface)
    }
  })
})

describe('the flow chart as a tree', () => {
  const view = partView(m, createLab(1, 'guided'), 'known')
  const drawn = (nodes: ChartNode<{ id: string; step: (typeof STEP_IDS)[number]; layer: 'solid' | 'liquid' }>[], depth = 0): string[] => nodes.flatMap((node) => [`${'  '.repeat(depth)}${placeLabel(node.place)}`, ...drawn(node.children, depth + 1)])

  it('puts each place under the one it is made from: a solid that stays in its tube, or the liquid a new tube was filled with', () => {
    expect(drawn(chartTree(view.chart!.places, view.steps))).toEqual([
      'Step 1: in the solid',
      '  Step 2: in the liquid',
      '    Step 3: in the solid',
      '  Step 2: in the solid',
      '    Step 4: in the solid',
      '    Step 4: in the liquid',
      '      Step 5: in the solid',
    ])
  })

  it('holds every place of the record once, each under a place of an earlier step', () => {
    const tree = chartTree(view.chart!.places, view.steps)
    expect(drawn(tree).map((line) => line.trim()).sort()).toEqual(view.chart!.places.map(placeLabel).sort())
    const at = (node: (typeof tree)[number]) => STEP_IDS.indexOf(node.place.step)
    const held = (nodes: typeof tree, parent: number): void => nodes.forEach((node) => (expect(at(node)).toBeGreaterThan(parent), held(node.children, at(node))))
    held(tree, -1)
  })

  it('is the same tree for the finished map of part 2', () => {
    const map = partView(m, wholeRun(m, createLab(1, 'guided'), 'known'), 'unknown').map!
    expect(drawn(chartTree(map, view.steps))).toEqual(drawn(chartTree(view.chart!.places, view.steps)))
  })
})

describe('where the Lab tab opens', () => {
  const fresh = createLab(1, 'challenge')

  it('is part 1 and its first step for a lab just started', () => {
    expect(openingPart(views(fresh))).toBe('known')
    expect(openingEntry(views(fresh).known)).toBe(0)
  })

  it('is the part whose run is begun and not over, on the step that run has reached', () => {
    const state = run(m, workStep(m, workStep(m, fresh, 'unknown'), 'unknown'), [{ type: 'add', part: 'unknown' }])
    expect(openingPart(views(state))).toBe('unknown')
    expect(openingEntry(views(state).unknown)).toBe(2)
  })

  it('is the first part not done where none is under way, and the entry after the five steps once they are done', () => {
    const state = wholeRun(m, fresh, 'known')
    expect(openingPart(views(state))).toBe('unknown')
    expect(openingEntry(views(state).known)).toBe(STEP_IDS.length)
    // The five steps of part 2 done and its ions still to be named: the naming is where the learner was.
    let named = state
    for (let at = 0; at < STEP_IDS.length; at++) named = workStep(m, named, 'unknown')
    expect(openingPart(views(named))).toBe('unknown')
    expect(openingEntry(views(named).unknown)).toBe(STEP_IDS.length)
  })

  it('is, in a lab that is complete, the part that is being run again, and else the first', () => {
    const complete = wholeRun(m, wholeRun(m, fresh, 'known'), 'unknown')
    expect(complete.status).toBe('completed')
    expect(openingPart(views(complete))).toBe('known')
    const again = run(m, reduce(m, complete, { type: 'runAgain', part: 'unknown' }), [{ type: 'add', part: 'unknown' }])
    expect(again.status).toBe('completed')
    expect(openingPart(views(again))).toBe('unknown')
    expect(openingEntry(views(again).unknown)).toBe(0)
  })
})
