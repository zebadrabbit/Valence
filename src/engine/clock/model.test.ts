import { describe, expect, it } from 'vitest'
import { clockData, RUN_IDS } from '@/chem-data/clock/data'
import { modelFrom } from './model'
import { PINNED_MODEL } from './pinnedModel'

// The model the app runs on is the one the engine's tests are pinned against.

describe('the model made from the stored record', () => {
  it('is the pinned model, number for number', () => {
    expect(modelFrom(clockData)).toEqual(PINNED_MODEL)
  })

  it("names its runs as the record's module does: a mixture by its own id, a bath's run with \"bath-\" in front", () => {
    expect(modelFrom(clockData).runs.map((run) => run.id)).toEqual([...RUN_IDS])
  })

  it('takes the reference temperature of the rate constant in kelvin: 25 °C and 273.15', () => {
    expect(clockData.rateLaw.rateConstant.celsius + clockData.constants.zeroCelsius.value).toBe(298.15)
    expect(modelFrom(clockData).referenceCentiKelvin).toBe(29815)
    expect(modelFrom(clockData).gasConstantE9).toBe(8314462618)
  })

  it('refuses a record that holds no reaction the engine can run', () => {
    const broken = JSON.parse(JSON.stringify(clockData))
    broken.rateLaw.reactants[2].order.value = 5
    expect(() => modelFrom(broken)).toThrow(/the record does not hold a reaction the engine can run: the order of "hydrogen-ion" is not one of the choices/)
    const noRange = JSON.parse(JSON.stringify(clockData))
    noRange.baths[0].range = 'nothing'
    expect(() => modelFrom(noRange)).toThrow(/no range "nothing"/)
  })
})
