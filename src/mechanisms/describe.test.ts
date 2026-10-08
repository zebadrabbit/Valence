import { describe, expect, it } from 'vitest'
import { registry } from '@/chem-data/registry'
import { hclNahco3 as mechanism } from './data'
import { describeMechanismState } from './describe'
import { stepsOf } from './state'
import { kJ } from './wording'

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
      'Step 1 of 4: Dissolving. 25% of the way through. In the scene: a sodium ion, a hydrogen carbonate ion, a hydronium ion, a water molecule and a chloride ion. Taking part: the sodium ion and the hydrogen carbonate ion, 3.8 Å apart, centre to centre. Over the whole of this step, free energy changes by +2.3 kJ/mol and enthalpy by +18.7 kJ/mol.',
    )
    expect(said(0.28)).toContain('the sodium ion and the hydrogen carbonate ion, 5.9 Å apart')
    // At the start of step 1 nothing has been counted yet, so there is no total to give.
    expect(said(0.16)).toMatch(/centre to centre\. Over the whole of this step, free energy changes by \+2\.3 kJ\/mol and enthalpy by \+18\.7 kJ\/mol\.$/)
  })

  it('in step 2, as the proton moves: the bond that is breaking and the bond that is forming, each with how far it has gone', () => {
    expect(said(0.445)).toBe(
      'Step 2 of 4: Proton transfer. 63% of the way through. In the scene: a sodium ion, a hydrogen carbonate ion, a hydronium ion, a water molecule and a chloride ion. Taking part: the hydrogen carbonate ion and the hydronium ion, 3.8 Å apart, centre to centre. The bond between the oxygen and a hydrogen of the hydronium ion is breaking: 84% of it is left. A bond between an oxygen of the hydrogen carbonate ion and a hydrogen of the hydronium ion is forming: 16% formed. Over the whole of this step, free energy changes by −19.9 kJ/mol. Its enthalpy is counted with step 3.',
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
        'Over the whole of this step, free energy changes by −16.4 kJ/mol, and enthalpy by −7.6 kJ/mol over steps 2 and 3 together.',
    )
  })

  it('in step 4: the carbon dioxide and how far it has got from its nearest neighbour', () => {
    expect(said(0.76)).toContain('In the scene: a sodium ion, a carbon dioxide molecule, three water molecules and a chloride ion. Taking part: the carbon dioxide molecule, 3.6 Å from its nearest neighbour, a water molecule.')
    expect(said(0.85)).toContain('the carbon dioxide molecule, 4.9 Å from its nearest neighbour')
  })

  it('at the end: the two spectator ions, and the totals', () => {
    expect(said(1)).toBe(
      'Back in the beaker. At its end. In the scene: a sodium ion, a carbon dioxide molecule, three water molecules and a chloride ion. Taking part: the sodium ion and the chloride ion, 8.0 Å apart, centre to centre. Over the four steps together, free energy changes by −42.4 kJ/mol and enthalpy by +31.4 kJ/mol.',
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

  it('gives energies only as a step\'s whole change and, at the start of a chapter, the total of the steps before it', () => {
    const energies = (t: number) => said(t).slice(said(t).search(/Up to here|Over the/))
    expect(energies(0.32)).toBe('Up to here, from the start of step 1, free energy has changed by +2.3 kJ/mol and enthalpy by +18.7 kJ/mol. Over the whole of this step, free energy changes by −19.9 kJ/mol. Its enthalpy is counted with step 3.')
    // The enthalpy of steps 2 and 3 is one change, so there is no total of it to give between them.
    expect(energies(0.52)).toBe('Up to here, from the start of step 1, free energy has changed by −17.6 kJ/mol. Over the whole of this step, free energy changes by −16.4 kJ/mol, and enthalpy by −7.6 kJ/mol over steps 2 and 3 together.')
    expect(energies(0.76)).toBe('Up to here, from the start of step 1, free energy has changed by −34.0 kJ/mol and enthalpy by +11.1 kJ/mol. Over the whole of this step, free energy changes by −8.4 kJ/mol and enthalpy by +20.3 kJ/mol.')
    expect(energies(0.94)).toBe('Over the four steps together, free energy changes by −42.4 kJ/mol and enthalpy by +31.4 kJ/mol.')
    expect(energies(0.97)).toBe(energies(0.94))
    // Inside a step the sentence does not change with the position: nothing is read off the drawn curve.
    expect(energies(0.33)).toBe('Over the whole of this step, free energy changes by −19.9 kJ/mol. Its enthalpy is counted with step 3.')
    expect(energies(0.47)).toBe(energies(0.33))
    expect(energies(0.69)).toBe(energies(0.53))
  })

  it('never prints a figure that is only a point on the drawn curve: every energy said is a step\'s own or a sum of whole steps', () => {
    const steps = stepsOf(mechanism)
    const own = steps.flatMap((step) => [step.deltaG.value, ...(step.deltaH ? [step.deltaH.value] : [])])
    const sums = steps.flatMap((_, i) => [steps.slice(0, i + 1).reduce((sum, step) => sum + step.deltaG.value, 0), steps.slice(0, i + 1).reduce((sum, step) => sum + (step.deltaH?.value ?? 0), 0)])
    const allowed = new Set([...own, ...sums].map(kJ))
    for (let i = 0; i <= 1000; i++) {
      const figures = said(i / 1000).match(/[+−]?\d+\.\d kJ\/mol/g) ?? []
      for (const figure of figures) expect([i, allowed.has(figure) ? 'a whole step or a sum of them' : figure]).toEqual([i, 'a whole step or a sum of them'])
      // Before step 1 no energy is said at all.
      if (i < 160) expect(figures).toEqual([])
    }
    // The top of the barrier of step 3 is 48.4 on the curve, and is said nowhere.
    expect(said(0.69)).not.toContain('48.4')
  })

  it('tells a partial bond only where the picture draws one', () => {
    for (const t of [0.05, 0.3, 0.4, 0.55, 0.61, 0.8, 0.95]) expect(said(t)).not.toMatch(/breaking|forming|turning/)
  })
})
