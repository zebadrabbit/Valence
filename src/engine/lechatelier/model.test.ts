import { describe, expect, it } from 'vitest'
import { DISTURBANCE_IDS, SYSTEM_IDS, lechatelierData } from '@/chem-data/lechatelier/data'
import { answersFor, modelFrom, showsOf } from './model'
import { PINNED_MODEL } from './pinnedModel'

describe('modelFrom', () => {
  const model = modelFrom(lechatelierData)

  it('gives, from the stored record, the model the tests are pinned against', () => {
    expect(model).toEqual(PINNED_MODEL)
  })

  it('has the four systems and the seventeen disturbances in their order', () => {
    expect(model.systems.map((s) => s.id)).toEqual([...SYSTEM_IDS])
    expect(model.systems.flatMap((s) => s.disturbances.map((d) => d.id))).toEqual([...DISTURBANCE_IDS])
  })

  it('holds whole microlitres at every stage, and one stage for each press', () => {
    for (const system of model.systems) {
      for (const d of system.disturbances) {
        expect(d.stages.length, d.id).toBe(d.portions)
        for (const stage of [d.before, ...d.stages]) expect(Number.isInteger(stage.microlitres) && stage.microlitres > 0, d.id).toBe(true)
        // Something added makes the tube fuller at each press; a bath changes nothing of its volume.
        const volumes = [d.before, ...d.stages].map((s) => s.microlitres)
        volumes.slice(1).forEach((v, i) => expect(d.kind === 'add' ? v > volumes[i]! : v === volumes[i]!, d.id).toBe(true))
      }
    }
  })

  it('carries each tube from one disturbance to the next, and begins a share at the volume of a share', () => {
    for (const system of model.systems) {
      const last = new Map<string, (typeof system.disturbances)[number]>()
      for (const d of system.disturbances) {
        const earlier = last.get(d.tube)
        if (earlier) expect(d.before, d.id).toEqual(earlier.stages.at(-1))
        last.set(d.tube, d)
      }
    }
    const share = lechatelierData.parameters.shareDrops.value * lechatelierData.parameters.dropMicrolitres.value
    const hydroxides = model.systems[3]!.disturbances
    for (const metal of ['zinc', 'magnesium']) {
      const drop = hydroxides.find((d) => d.id === `${metal}-drop`)!
      for (const kind of ['acid', 'base', 'ammonia']) {
        const d = hydroxides.find((other) => other.id === `${metal}-${kind}`)!
        expect(d.before, d.id).toEqual({ ...drop.stages[0], microlitres: share, temperature: 'room' })
      }
      // Three shares are no more than the tube holds.
      expect(3 * share).toBeLessThanOrEqual(drop.stages[0]!.microlitres)
    }
  })

  it('stands a heated tube in the boiling bath and a cooled one in the ice bath, and takes it back to the rack when something is added', () => {
    const places = model.systems.flatMap((s) => s.disturbances.map((d) => [d.kind, d.stages.at(-1)!.temperature]))
    for (const [kind, place] of places) expect(place).toBe({ add: 'room', heat: 'hot', cool: 'cold' }[kind as 'add' | 'heat' | 'cool'])
  })

  it('throws on a record whose stages are not one for each portion', () => {
    const data = JSON.parse(JSON.stringify(lechatelierData)) as typeof lechatelierData
    data.systems[0].disturbances[0]!.stages.pop()
    expect(() => modelFrom(data)).toThrow(/the disturbance "lead-acid" stores 2 stages for 3 portions/)
  })
})

describe('showsOf', () => {
  it('hands over a clear liquid with its colour and volume, and a solid at the bottom where there is one', () => {
    const [acid] = PINNED_MODEL.systems[0]!.disturbances
    expect(showsOf(PINNED_MODEL, acid!.before)).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1500 }, solid: null })
    expect(showsOf(PINNED_MODEL, acid!.stages[1]!)).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1700 }, solid: { colour: 'white', settled: true } })
  })
})

describe('answersFor', () => {
  it('gives the three ways for a question of direction and the three causes for the other', () => {
    expect(answersFor('direction')).toEqual(['left', 'right', 'none'])
    expect(answersFor('cause')).toEqual(['hydroxide', 'ammonia', 'nothing'])
    for (const system of PINNED_MODEL.systems) for (const d of system.disturbances) expect(answersFor(d.ask), d.id).toContain(d.right)
  })
})
