import { describe, expect, it } from 'vitest'
import { ION_IDS, type IonId } from '@/chem-data/cations/data'
import { SOLID_IDS, type CationsModel } from './model'
import { PINNED_MODEL as m } from './pinnedModel'
import { UNKNOWNS } from './setup'
import { addAmmonia, addChromate, addHydrochloricAcid, addNitricAcid, addWater, centrifuge, EMPTY_TUBE, hasSolid, heat, litmusOf, pourOff, sampleTube, showsOf, type Tube } from './tube'

// What each action does to a tube (spec 17.4), rule by rule, on the pinned amounts: 50 000 nmol of each ion a
// sample holds, in 1 500 µL. Every expected figure is worked out here by hand from the bench's amounts.

const solids = (tube: Tube) => Object.fromEntries(SOLID_IDS.filter((id) => tube.solids[id] > 0).map((id) => [id, tube.solids[id]]))
const KNOWN = ION_IDS
/** The first tube after step 1, centrifuged and with its liquid poured away. */
const chlorides = (ions: readonly IonId[]) => pourOff(centrifuge(addHydrochloricAcid(m, sampleTube(m, ions))), EMPTY_TUBE)[0]
/** The first and second tubes after step 2, with the water heated or not. */
const extracted = (ions: readonly IonId[], heated = true) => {
  const watered = addWater(m, chlorides(ions))
  return pourOff(centrifuge(heated ? heat(m, watered) : watered), EMPTY_TUBE)
}
/** The first and third tubes after step 4. */
const separated = (ions: readonly IonId[], heated = true) => pourOff(centrifuge(addAmmonia(m, extracted(ions, heated)[0])), EMPTY_TUBE)

describe('a sample', () => {
  it('holds the same amount of each ion it does hold, in the same volume whatever it holds', () => {
    expect(sampleTube(m, KNOWN)).toMatchObject({ microlitres: 1500, silver: 50000, lead: 50000, mercury: 50000, chloride: 0, suspended: false })
    expect(sampleTube(m, ['lead'])).toMatchObject({ microlitres: 1500, silver: 0, lead: 50000, mercury: 0 })
    for (const ions of UNKNOWNS) expect(showsOf(m, sampleTube(m, ions)), ions.join()).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1500 }, solid: null })
  })
})

describe('hydrochloric acid (rule chlorides-form)', () => {
  it('brings each ion down whole as its chloride: one chloride ion for silver, two for each of the others', () => {
    const tube = addHydrochloricAcid(m, sampleTube(m, KNOWN))
    expect(solids(tube)).toEqual({ 'silver-chloride': 50000, 'lead-chloride': 50000, 'mercury-i-chloride': 50000 })
    // 1 200 000 nmol of chloride went in, and the three took 50 000 + 100 000 + 100 000.
    expect(tube).toMatchObject({ microlitres: 1700, silver: 0, lead: 0, mercury: 0, chloride: 950000, suspended: true })
    expect(solids(addHydrochloricAcid(m, sampleTube(m, ['mercury-i'])))).toEqual({ 'mercury-i-chloride': 50000 })
  })

  it('makes the liquid cloudy with a white solid, which the centrifuge packs at the bottom', () => {
    const tube = addHydrochloricAcid(m, sampleTube(m, ['silver']))
    expect(showsOf(m, tube)).toEqual({ liquid: { colour: 'colourless', cloudy: true, microlitres: 1700 }, solid: { colour: 'white', settled: false } })
    expect(showsOf(m, centrifuge(tube))).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1700 }, solid: { colour: 'white', settled: true } })
  })

  it('respects the limiting reagent: with too little chloride, silver is served first and what is left over stays dissolved', () => {
    const scarce: CationsModel = { ...m, chlorideNanomoles: 120000 }
    const tube = addHydrochloricAcid(scarce, sampleTube(scarce, KNOWN))
    expect(solids(tube)).toEqual({ 'silver-chloride': 50000, 'lead-chloride': 35000 })
    expect(tube).toMatchObject({ silver: 0, lead: 15000, mercury: 50000, chloride: 0 })
  })
})

describe('pouring off', () => {
  it('takes all the liquid and leaves a packed solid behind', () => {
    const [left, filled] = pourOff(centrifuge(addHydrochloricAcid(m, sampleTube(m, KNOWN))), EMPTY_TUBE)
    expect(left).toMatchObject({ microlitres: 0, chloride: 0, suspended: false })
    expect(solids(left)).toEqual({ 'silver-chloride': 50000, 'lead-chloride': 50000, 'mercury-i-chloride': 50000 })
    expect(filled).toMatchObject({ microlitres: 1700, chloride: 950000, suspended: false })
    expect(hasSolid(filled)).toBe(false)
    expect(showsOf(m, left)).toEqual({ liquid: null, solid: { colour: 'white', settled: true } })
  })

  it('takes a solid that is still spread through the liquid over with it, and leaves the tube empty', () => {
    const [left, filled] = pourOff(addHydrochloricAcid(m, sampleTube(m, KNOWN)), EMPTY_TUBE)
    expect(left).toEqual(EMPTY_TUBE)
    expect(solids(filled)).toEqual({ 'silver-chloride': 50000, 'lead-chloride': 50000, 'mercury-i-chloride': 50000 })
    expect(showsOf(m, filled)).toEqual({ liquid: { colour: 'colourless', cloudy: true, microlitres: 1700 }, solid: { colour: 'white', settled: false } })
    expect(showsOf(m, left)).toEqual({ liquid: null, solid: null })
  })
})

describe('water, cold and hot (rule lead-chloride-in-water)', () => {
  it('dissolves lead chloride cold only as far as 750 µL of cold water holds it: 26 968 of the 50 000 nmol', () => {
    const cold = addWater(m, chlorides(['lead']))
    // 35 958 nmol in a millilitre, in 0.75 mL, rounded down.
    expect(cold).toMatchObject({ microlitres: 750, lead: 26968, chloride: 53936, hot: false, suspended: true })
    expect(solids(cold)).toEqual({ 'lead-chloride': 23032 })
  })

  it('dissolves all of it hot, since 750 µL of hot water holds 90 345 nmol', () => {
    const hot = heat(m, addWater(m, chlorides(['lead'])))
    expect(hot).toMatchObject({ lead: 50000, chloride: 100000, hot: true, suspended: false })
    expect(solids(hot)).toEqual({})
    expect(Math.floor((m.leadChlorideHotPerMillilitre * m.waterMicrolitres) / 1000)).toBe(90345)
  })

  it('leaves silver chloride and mercury(I) chloride solid, hot or cold', () => {
    for (const tube of [addWater(m, chlorides(KNOWN)), heat(m, addWater(m, chlorides(KNOWN)))]) {
      expect(tube.solids['silver-chloride']).toBe(50000)
      expect(tube.solids['mercury-i-chloride']).toBe(50000)
      expect(tube.silver + tube.mercury).toBe(0)
    }
  })

  it('sends the lead on in the hot liquid, and less of it in the cold', () => {
    expect(extracted(KNOWN)[1]).toMatchObject({ microlitres: 750, lead: 50000, hot: true })
    expect(solids(extracted(KNOWN)[0])).toEqual({ 'silver-chloride': 50000, 'mercury-i-chloride': 50000 })
    expect(extracted(KNOWN, false)[1]).toMatchObject({ lead: 26968, hot: false })
    expect(solids(extracted(KNOWN, false)[0])).toEqual({ 'silver-chloride': 50000, 'lead-chloride': 23032, 'mercury-i-chloride': 50000 })
  })
})

describe('acetic acid and potassium chromate (rule lead-chromate-forms)', () => {
  it('bring the lead down as a yellow solid and leave chromate over to colour the liquid', () => {
    const tube = addChromate(m, extracted(KNOWN)[1])
    expect(tube).toMatchObject({ microlitres: 1000, lead: 0, chromate: 50000, suspended: true })
    expect(solids(tube)).toEqual({ 'lead-chromate': 50000 })
    expect(showsOf(m, centrifuge(tube))).toEqual({ liquid: { colour: 'yellow to orange', cloudy: false, microlitres: 1000 }, solid: { colour: 'yellow', settled: true } })
  })

  it('give a liquid of the same colour and no solid where there is no lead', () => {
    const tube = addChromate(m, extracted(['silver', 'mercury-i'])[1])
    expect(tube).toMatchObject({ chromate: 100000, suspended: false })
    expect(showsOf(m, tube)).toEqual({ liquid: { colour: 'yellow to orange', cloudy: false, microlitres: 1000 }, solid: null })
  })

  it('still give the solid with the lead that cold water carried', () => {
    expect(solids(addChromate(m, extracted(['lead'], false)[1]))).toEqual({ 'lead-chromate': 26968 })
  })
})

describe('ammonia', () => {
  it('takes silver chloride into the liquid as the silver-ammonia ion, two ammonia to each (rule silver-chloride-in-ammonia)', () => {
    const tube = addAmmonia(m, extracted(['silver'])[0])
    expect(tube).toMatchObject({ microlitres: 750, silverAmmonia: 50000, chloride: 50000, ammonia: 4400000, suspended: false })
    expect(showsOf(m, tube)).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 750 }, solid: null })
  })

  it('turns mercury(I) chloride into a grey to black solid that stays, and frees one chloride ion (rule mercury-chloride-with-ammonia)', () => {
    const tube = addAmmonia(m, extracted(['mercury-i'])[0])
    expect(solids(tube)).toEqual({ 'mercury-and-amidochloride': 50000 })
    expect(tube).toMatchObject({ silverAmmonia: 0, chloride: 50000, ammonia: 4400000 })
    expect(showsOf(m, centrifuge(tube)).solid).toEqual({ colour: 'grey to black', settled: true })
  })

  it('does both in one tube, and parts them when the liquid is poured off', () => {
    const [first, third] = separated(KNOWN)
    expect(solids(first)).toEqual({ 'mercury-and-amidochloride': 50000 })
    expect(third).toMatchObject({ microlitres: 750, silverAmmonia: 50000, chloride: 100000, ammonia: 4300000 })
    expect(hasSolid(third)).toBe(false)
  })

  it('leaves lead chloride that was left behind as a white solid, which grey to black hides (rule lead-chloride-with-ammonia)', () => {
    const lead = addAmmonia(m, extracted(['lead'], false)[0])
    expect(solids(lead)).toEqual({ 'lead-hydroxide': 23032 })
    expect(lead).toMatchObject({ ammonia: 4500000 - 2 * 23032, chloride: 2 * 23032 })
    expect(showsOf(m, centrifuge(lead)).solid).toEqual({ colour: 'white', settled: true })
    const withMercury = centrifuge(addAmmonia(m, extracted(['lead', 'mercury-i'], false)[0]))
    expect(solids(withMercury)).toEqual({ 'mercury-and-amidochloride': 50000, 'lead-hydroxide': 23032 })
    expect(showsOf(m, withMercury).solid).toEqual({ colour: 'grey to black', settled: true })
  })
})

describe('nitric acid and litmus (rules silver-chloride-returns and litmus)', () => {
  const third = (ions: readonly IonId[]) => separated(ions)[1]

  it('leaves ammonia over after one addition: the liquid is basic and holds its silver', () => {
    const once = addNitricAcid(m, third(['silver']))
    expect(once).toMatchObject({ microlitres: 1150, ammonia: 2000000, silverAmmonia: 50000, acid: 0, suspended: false })
    expect(litmusOf(once)).toBe('basic')
    expect(hasSolid(once)).toBe(false)
  })

  it('goes past the ammonia at the second addition: silver chloride comes back whole and the liquid is acid', () => {
    const twice = addNitricAcid(m, addNitricAcid(m, third(['silver'])))
    // 4 800 000 nmol of acid against 4 400 000 of free ammonia and 100 000 held by the silver.
    expect(twice).toMatchObject({ microlitres: 1550, ammonia: 0, silverAmmonia: 0, silver: 0, chloride: 0, acid: 300000, suspended: true })
    expect(solids(twice)).toEqual({ 'silver-chloride': 50000 })
    expect(litmusOf(twice)).toBe('acid')
    expect(showsOf(m, centrifuge(twice))).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 1550 }, solid: { colour: 'white', settled: true } })
  })

  it('makes the liquid acid at the second addition whatever the sample holds, and gives no solid without silver', () => {
    for (const ions of UNKNOWNS) {
      for (const heated of [true, false]) {
        const once = addNitricAcid(m, separated(ions, heated)[1])
        const twice = addNitricAcid(m, once)
        expect([litmusOf(separated(ions, heated)[1]), litmusOf(once), litmusOf(twice)], `${ions.join()} ${heated}`).toEqual(['basic', 'basic', 'acid'])
        expect(hasSolid(once), ions.join()).toBe(false)
        expect(solids(twice), ions.join()).toEqual(ions.includes('silver') ? { 'silver-chloride': 50000 } : {})
      }
    }
  })

  it('goes on taking acid once it is acid, and nothing more changes but the volume and the acid', () => {
    const twice = addNitricAcid(m, addNitricAcid(m, third(KNOWN)))
    const four = addNitricAcid(m, addNitricAcid(m, twice))
    expect(solids(four)).toEqual(solids(twice))
    expect(four).toMatchObject({ microlitres: twice.microlitres + 800, acid: twice.acid + 4800000 })
  })

  it('never breaks the silver-ammonia ion up in part at the bench amounts; where an addition would, the ion is broken two acid to each and the liquid is not yet acid', () => {
    const small: CationsModel = { ...m, nitricAcidNanomoles: 4450000 }
    const once = addNitricAcid(small, third(['silver']))
    // 4 400 000 used on the free ammonia; the 50 000 left break 25 000 of the 50 000 ions.
    expect(once).toMatchObject({ ammonia: 0, silverAmmonia: 25000, acid: 0 })
    expect(solids(once)).toEqual({ 'silver-chloride': 25000 })
    expect(litmusOf(once)).toBe('basic')
  })
})

describe('what a tube shows', () => {
  it('is the colour of its liquid, which only chromate changes, and of its solid, with whether that has settled', () => {
    expect(showsOf(m, EMPTY_TUBE)).toEqual({ liquid: null, solid: null })
    expect(showsOf(m, { ...EMPTY_TUBE, microlitres: 10 })).toEqual({ liquid: { colour: 'colourless', cloudy: false, microlitres: 10 }, solid: null })
    expect(showsOf(m, { ...EMPTY_TUBE, microlitres: 10, chromate: 1 }).liquid?.colour).toBe('yellow to orange')
  })

  it('gives two solids in one tube the colour that comes later in the choices: white under yellow, and both under grey to black', () => {
    const tube = (held: Partial<Tube['solids']>): Tube => ({ ...EMPTY_TUBE, microlitres: 100, solids: { ...EMPTY_TUBE.solids, ...held } })
    expect(showsOf(m, tube({ 'silver-chloride': 1, 'lead-chromate': 1 })).solid?.colour).toBe('yellow')
    expect(showsOf(m, tube({ 'lead-hydroxide': 1, 'mercury-and-amidochloride': 1 })).solid?.colour).toBe('grey to black')
    expect(showsOf(m, tube({ 'lead-chromate': 1, 'mercury-and-amidochloride': 1, 'mercury-i-chloride': 1 })).solid?.colour).toBe('grey to black')
    expect(m.solidChoices).toEqual(['none', 'white', 'yellow', 'grey to black'])
  })

  it('never says how much solid there is: one ion or three give the same picture', () => {
    const shown = UNKNOWNS.map((ions) => JSON.stringify(showsOf(m, centrifuge(addHydrochloricAcid(m, sampleTube(m, ions))))))
    expect(new Set(shown).size).toBe(1)
  })
})

describe('the amounts', () => {
  it('stay whole numbers, never fall below zero, and lose no silver, lead or mercury, through every step of every sample, careful or not', () => {
    const whole = (tube: Tube, where: string) => {
      for (const [key, value] of Object.entries({ ...tube, ...tube.solids })) if (typeof value === 'number') expect(Number.isInteger(value) && value >= 0, `${where}: ${key} = ${value}`).toBe(true)
    }
    const metal = (tubes: Tube[]) => ({
      silver: tubes.reduce((sum, t) => sum + t.silver + t.silverAmmonia + t.solids['silver-chloride'], 0),
      lead: tubes.reduce((sum, t) => sum + t.lead + t.solids['lead-chloride'] + t.solids['lead-chromate'] + t.solids['lead-hydroxide'], 0),
      mercury: tubes.reduce((sum, t) => sum + t.mercury + t.solids['mercury-i-chloride'] + t.solids['mercury-and-amidochloride'], 0),
    })
    for (const ions of UNKNOWNS) {
      for (const heated of [true, false]) {
        const [first, second] = extracted(ions, heated)
        const tested = addChromate(m, second)
        const [left, third] = separated(ions, heated)
        const acid = addNitricAcid(m, addNitricAcid(m, third))
        for (const [name, tube] of Object.entries({ first, second, tested, left, third, acid })) whole(tube, `${ions.join()} ${heated} ${name}`)
        // Nothing of a metal is lost between the sample and the three tubes at the end.
        expect(metal([left, tested, acid]), ions.join()).toEqual({ silver: ions.includes('silver') ? 50000 : 0, lead: ions.includes('lead') ? 50000 : 0, mercury: ions.includes('mercury-i') ? 50000 : 0 })
      }
    }
  })
})
