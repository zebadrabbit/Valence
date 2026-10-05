import { describe, expect, it } from 'vitest'
import { titrationData } from '@/chem-data/titration/data'
import { modelFrom, type TitrationModel } from './model'
import { PINNED_MODEL } from './pinnedModel'

describe('modelFrom', () => {
  const model = modelFrom(titrationData)
  const derived = ['indicatorMolarity', 'dissolvedCo2'] as const satisfies readonly (keyof TitrationModel)[]

  it('gives, from the stored record, the model the engine tests are pinned on, field for field', () => {
    expect(Object.keys(model).sort()).toEqual(Object.keys(PINNED_MODEL).sort())
    expect({ ...model, indicatorMolarity: 0, dissolvedCo2: 0 }).toEqual({ ...PINNED_MODEL, indicatorMolarity: 0, dissolvedCo2: 0 })
  })

  it('works out the two concentrations to 1 part in 10¹² of the pinned ones', () => {
    for (const key of derived) expect([key, Math.abs(model[key] / PINNED_MODEL[key] - 1) < 1e-12]).toEqual([key, true])
  })

  it('gives 1.5708 × 10⁻² mol/L of indicator and 1.4663 × 10⁻⁵ mol/L of dissolved CO₂', () => {
    expect(model.indicatorMolarity.toExponential(4)).toBe('1.5708e-2')
    expect(model.dissolvedCo2.toExponential(4)).toBe('1.4663e-5')
  })

  it('takes one drop of indicator as a whole number of microlitres', () => {
    expect(model.indicatorDropUl).toBe(50)
  })
})
