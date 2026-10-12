import { describe, expect, it } from 'vitest'
import { PART_IDS, type PartId } from '@/chem-data/calorimetry/data'
import { contentsCg, fullChangeMicro, readings, waterFormedMicromol, type Timeline } from './cup'
import { PINNED_MODEL as m } from './pinnedModel'
import { labSetup, runSetup } from './setup'

const lab = labSetup(m, 1)
const curve = (part: PartId, timeline: Partial<Timeline> = {}) => readings(m, part, lab, runSetup(m, 1, part, 0), { lidFrom: 2, stirFrom: 2, changedAt: 2, steps: 14, ...timeline })

describe("the cup's contents", () => {
  it('are both solutions, the water with the salt, or the water alone, with every liquid at 1.00 g/mL', () => {
    const run = runSetup(m, 1, 'dissolving', 0)
    expect(contentsCg(m, 'neutralisation', run)).toBe(10000)
    expect(contentsCg(m, 'dissolving', run)).toBe(5000 + run.saltCg)
    expect(contentsCg(m, 'metal', run)).toBe(5000)
    // 50.0 mL of 1.00 M acid and of base: 0.0500 mol of water.
    expect(waterFormedMicromol(m)).toBe(50000)
  })

  it('would change, with no heat traded with the room, by the heat over their mass times the specific heat of water', () => {
    // 0.0500 mol x 57 706 J/mol = 2885.3 J into 100.0 g x 4.18 J/(g·°C) = 418 J/°C.
    expect(fullChangeMicro(m, 'neutralisation', lab, runSetup(m, 1, 'neutralisation', 0))).toBe(6902632)
    // 4.20 g / 80.044 g/mol x 24 405 J/mol = 1280.6 J out of 54.20 g x 4.18.
    expect(fullChangeMicro(m, 'dissolving', lab, runSetup(m, 1, 'dissolving', 0))).toBe(-5652281)
    // Zinc: 49.12 g x 0.388 = 19.06 J/°C at 99.6 °C with 209 J/°C of water at 23.9 °C.
    expect(fullChangeMicro(m, 'metal', lab, runSetup(m, 1, 'metal', 0))).toBe(6326151)
    expect(m.candidates[lab.metalIndex]!.id).toBe('zinc-piece')
  })
})

describe("the logger's readings", () => {
  it('are level at the starting temperature until the change is started, whatever is done to the cup', () => {
    for (const part of PART_IDS) {
      const start = runSetup(m, 1, part, 0).startTenths
      expect(curve(part, { changedAt: null })).toEqual(Array(15).fill(start))
      expect(curve(part, { changedAt: null, lidFrom: null, stirFrom: null })).toEqual(Array(15).fill(start))
      expect(curve(part).slice(0, 3)).toEqual([start, start, start])
    }
  })

  it('pin a careful run of each part of seed 1: a quick change, a peak, and a slow drift back', () => {
    expect(curve('neutralisation').join(' ')).toBe('200 200 200 258 267 268 268 267 267 267 266 266 266 265 265')
    expect(curve('dissolving').join(' ')).toBe('221 221 221 173 166 165 166 166 166 166 167 167 167 167 168')
    expect(curve('metal').join(' ')).toBe('239 239 239 293 300 301 301 301 300 300 300 300 299 299 299')
  })

  it('peak lower and drift back faster with the lid off', () => {
    expect(curve('neutralisation', { lidFrom: null }).join(' ')).toBe('200 200 200 256 263 261 259 257 254 252 250 248 246 244 243')
    expect(curve('dissolving', { lidFrom: null }).join(' ')).toBe('221 221 221 175 170 171 173 175 176 178 180 182 183 185 186')
    expect(curve('metal', { lidFrom: null }).join(' ')).toBe('239 239 239 291 296 295 293 291 289 287 285 283 281 280 278')
  })

  it('change slowly with the stirrer still', () => {
    expect(curve('neutralisation', { stirFrom: null }).join(' ')).toBe('200 200 200 210 219 226 233 238 242 246 249 251 254 255 257')
    expect(curve('dissolving', { stirFrom: null }).join(' ')).toBe('221 221 221 213 205 199 194 190 186 183 181 179 177 176 174')
    expect(curve('metal', { stirFrom: null }).join(' ')).toBe('239 239 239 248 256 263 269 274 278 281 284 286 288 290 291')
  })

  it('take up the lid and the stirrer from the step after they are put to use', () => {
    // The lid on from step 5: the first three steps after the change are an open cup's, the rest a closed one's.
    const late = curve('neutralisation', { lidFrom: 5 })
    expect(late.slice(0, 6)).toEqual(curve('neutralisation', { lidFrom: null }).slice(0, 6))
    expect(late[14]!).toBeGreaterThan(curve('neutralisation', { lidFrom: null })[14]!)
    // The stirrer started late hurries what is left of the change.
    const stirred = curve('neutralisation', { stirFrom: 5 })
    expect(stirred.slice(0, 6)).toEqual(curve('neutralisation', { stirFrom: null }).slice(0, 6))
    expect(stirred[6]! - stirred[5]!).toBeGreaterThan(30)
  })

  it('never reach the temperature a cup with no leak would, and come nearest it in a careful run', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const part of PART_IDS) {
        const run = runSetup(m, seed, part, 0)
        const full = Math.abs(fullChangeMicro(m, part, labSetup(m, seed), run)) / 1e5
        const peak = (timeline: Partial<Timeline>) => Math.max(...readings(m, part, labSetup(m, seed), run, { lidFrom: 0, stirFrom: 0, changedAt: 0, steps: 60, ...timeline }).map((t) => Math.abs(t - run.startTenths)))
        const careful = peak({})
        expect(careful, `${part} ${seed}`).toBeLessThan(full)
        expect(careful / full, `${part} ${seed}`).toBeGreaterThan(0.96)
        expect(peak({ lidFrom: null }), `${part} ${seed}`).toBeLessThan(careful)
        expect(peak({ stirFrom: null }), `${part} ${seed}`).toBeLessThan(careful)
      }
    }
  }, 60_000)

  it('are the same every time for the same run', () => {
    expect(curve('metal')).toEqual(curve('metal'))
    expect(curve('metal', { steps: 240 }).slice(0, 15)).toEqual(curve('metal'))
  })
})
