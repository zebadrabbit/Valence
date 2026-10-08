import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { hclNahco3 as mechanism } from './data'
import { describeMechanismState } from './describe'

const said = (t: number) => describeMechanismState(mechanism, t, registry.elements)

describe('describeMechanismState: the scene in words, for a reader who cannot see it (spec 11)', () => {
  it('at the start: the chapter, and what is in the scene; no energies before step 1', () => {
    expect(said(0)).toBe('In the beaker. At its start. In the scene: a sodium ion, a hydrogen carbonate ion, a hydronium ion, a water molecule and a chloride ion.')
  })

  it('in the prologue: the two ions of the acid, and how far apart', () => {
    expect(said(0.1)).toBe(
      'Before mixing. 40% of the way through. In the scene: a sodium ion, a hydrogen carbonate ion, a hydronium ion, a water molecule and a chloride ion. Taking part: the hydronium ion and the chloride ion, 6.1 Å apart, centre to centre.',
    )
  })

  it('in step 1: the two ions of the solid move apart, and the energies begin', () => {
    expect(said(0.2)).toBe(
      'Step 1 of 4: Dissolving. 25% of the way through. In the scene: a sodium ion, a hydrogen carbonate ion, a hydronium ion, a water molecule and a chloride ion. Taking part: the sodium ion and the hydrogen carbonate ion, 3.8 Å apart, centre to centre. Free energy is at +0.4 kJ/mol and enthalpy at +2.9 kJ/mol, counted from the start of step 1.',
    )
    expect(said(0.28)).toContain('the sodium ion and the hydrogen carbonate ion, 5.9 Å apart')
    expect(said(0.16)).toContain('Free energy is at 0.0 kJ/mol and enthalpy at 0.0 kJ/mol')
  })

  it('in step 2, as the proton moves: the bond that is breaking and the bond that is forming, each with how far it has gone', () => {
    expect(said(0.445)).toBe(
      'Step 2 of 4: Proton transfer. 63% of the way through. In the scene: a sodium ion, a hydrogen carbonate ion, a hydronium ion, a water molecule and a chloride ion. Taking part: the hydrogen carbonate ion and the hydronium ion, 3.8 Å apart, centre to centre. The bond between the oxygen and a hydrogen of the hydronium ion is breaking: 84% of it is left. A bond between an oxygen of the hydrogen carbonate ion and a hydrogen of the hydronium ion is forming: 16% formed. Free energy is at +7.3 kJ/mol and enthalpy at +17.2 kJ/mol, counted from the start of step 1.',
    )
    // The two approach before any bond changes.
    expect(said(0.37)).toContain('the hydrogen carbonate ion and the hydronium ion, 5.1 Å apart')
    expect(said(0.37)).not.toMatch(/breaking|forming/)
  })

  it('in step 3: which of the two waters takes part, and all six bonds that change, the two carbon-oxygen bonds told apart', () => {
    expect(said(0.52)).toContain('In the scene: a sodium ion, a carbonic acid molecule, two water molecules and a chloride ion. Taking part: the carbonic acid molecule and one of the two water molecules, 3.3 Å apart, centre to centre.')
    expect(said(0.69)).toBe(
      'Step 3 of 4: Decomposition. 71% of the way through. In the scene: a sodium ion, a carbonic acid molecule, two water molecules and a chloride ion. Taking part: the carbonic acid molecule and one of the two water molecules, 2.7 Å apart, centre to centre. ' +
        'The bond between an oxygen and the carbon of the carbonic acid molecule is turning from a single bond into a double bond: 50% of the way. ' +
        'The bond between an oxygen and a hydrogen of the carbonic acid molecule is breaking: 50% of it is left. ' +
        'Another bond between an oxygen and the carbon of the carbonic acid molecule is breaking: 50% of it is left. ' +
        'The bond between the oxygen and a hydrogen of the water molecule is breaking: 50% of it is left. ' +
        'A bond between an oxygen of the carbonic acid molecule and a hydrogen of the water molecule is forming: 50% formed. ' +
        'A bond between the oxygen of the water molecule and a hydrogen of the carbonic acid molecule is forming: 50% formed. ' +
        'Free energy is at +48.4 kJ/mol and enthalpy at +11.6 kJ/mol, counted from the start of step 1.',
    )
  })

  it('in step 4: the carbon dioxide and how far it has got from its nearest neighbour', () => {
    expect(said(0.76)).toContain('In the scene: a sodium ion, a carbon dioxide molecule, three water molecules and a chloride ion. Taking part: the carbon dioxide molecule, 3.6 Å from its nearest neighbour, a water molecule.')
    expect(said(0.85)).toContain('the carbon dioxide molecule, 4.9 Å from its nearest neighbour')
  })

  it('at the end: the two spectator ions, and the totals', () => {
    expect(said(1)).toBe(
      'Back in the beaker. At its end. In the scene: a sodium ion, a carbon dioxide molecule, three water molecules and a chloride ion. Taking part: the sodium ion and the chloride ion, 8.0 Å apart, centre to centre. Free energy is at −42.4 kJ/mol and enthalpy at +31.4 kJ/mol, counted from the start of step 1.',
    )
  })

  it('says something at every position, the same thing each time it is asked, and never an id or an empty name', () => {
    for (let i = 0; i <= 400; i++) {
      const text = said(i / 400)
      expect(text).toBe(said(i / 400))
      expect(text).toMatch(/^[A-Z].*\.$/)
      expect(text).not.toMatch(/undefined|NaN|null|o-|h-|bicarbonate| {2}/)
    }
    expect(said(-1)).toBe(said(0))
    expect(said(2)).toBe(said(1))
  })

  it('tells a partial bond only where the picture draws one', () => {
    for (const t of [0.05, 0.3, 0.4, 0.55, 0.61, 0.8, 0.95]) expect(said(t)).not.toMatch(/breaking|forming|turning/)
  })
})
