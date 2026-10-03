import { describe, expect, it } from 'vitest'
import { EMPTY_SELECTION, inspectorCards, selectionReducer, selectionStatus, type Selection, type SelectionAction } from './selection'

const run = (...actions: SelectionAction[]): Selection => actions.reduce(selectionReducer, EMPTY_SELECTION)
const atom = (index: number): SelectionAction => ({ type: 'toggleAtom', index })
const bond = (index: number): SelectionAction => ({ type: 'toggleBond', index })

describe('selectionReducer', () => {
  it('keeps atoms in the order they were selected', () => {
    expect(run(atom(2), atom(0), atom(5))).toEqual({ atoms: [2, 0, 5], bond: null })
  })

  it('drops the oldest atom when a fifth is selected', () => {
    expect(run(atom(0), atom(1), atom(2), atom(3), atom(4)).atoms).toEqual([1, 2, 3, 4])
  })

  it('deselects an atom that is selected again, keeping the order of the rest', () => {
    expect(run(atom(0), atom(1), atom(2), atom(1)).atoms).toEqual([0, 2])
  })

  it('holds at most one bond, and toggles it off', () => {
    expect(run(bond(1), bond(3))).toEqual({ atoms: [], bond: 3 })
    expect(run(bond(3), bond(3))).toEqual(EMPTY_SELECTION)
  })

  it('clears the atoms when a bond is selected, and the bond when an atom is', () => {
    expect(run(atom(0), atom(1), bond(0))).toEqual({ atoms: [], bond: 0 })
    expect(run(bond(0), atom(2))).toEqual({ atoms: [2], bond: null })
  })

  it('clears everything', () => {
    expect(run(atom(0), { type: 'clear' })).toEqual(EMPTY_SELECTION)
    expect(run(bond(0), { type: 'clear' })).toEqual(EMPTY_SELECTION)
  })

  it('does not mutate the state it is given', () => {
    const before: Selection = { atoms: [0, 1], bond: null }
    selectionReducer(before, atom(2))
    expect(before).toEqual({ atoms: [0, 1], bond: null })
  })
})

describe('selectionStatus', () => {
  const atoms = ['Carbon 1', 'Oxygen 1', 'Oxygen 2']
  const bonds = ['Carbon 1 to Oxygen 1, double bond', 'Carbon 1 to Oxygen 2, double bond']

  it('says when nothing is selected', () => {
    expect(selectionStatus(EMPTY_SELECTION, atoms, bonds)).toBe('Nothing selected.')
  })

  it('names one atom, or several in selection order', () => {
    expect(selectionStatus({ atoms: [1], bond: null }, atoms, bonds)).toBe('Selected atom: Oxygen 1.')
    expect(selectionStatus({ atoms: [2, 0], bond: null }, atoms, bonds)).toBe('Selected 2 atoms, in order: Oxygen 2, Carbon 1.')
  })

  it('names the bond', () => {
    expect(selectionStatus({ atoms: [], bond: 1 }, atoms, bonds)).toBe('Selected bond: Carbon 1 to Oxygen 2, double bond.')
  })
})

describe('inspectorCards', () => {
  it('shows one card for nothing, for a bond and for a measurement, at every level', () => {
    for (const level of [1, 2, 3] as const) {
      expect(inspectorCards(EMPTY_SELECTION, level, false)).toEqual(['nothing-selected'])
      expect(inspectorCards(run(bond(0)), level, false)).toEqual(['bond'])
      expect(inspectorCards(run(atom(0), atom(1)), level, false)).toEqual(['measure'])
      expect(inspectorCards(run(atom(0), atom(1), atom(2), atom(3)), level, false)).toEqual(['measure'])
    }
  })

  it('adds the Bohr model of one atom at level 1 and its hybrid orbitals at level 3', () => {
    expect(inspectorCards(run(atom(0)), 1, false)).toEqual(['bohr', 'atom', 'measure-hint'])
    expect(inspectorCards(run(atom(0)), 2, false)).toEqual(['atom', 'measure-hint'])
    expect(inspectorCards(run(atom(0)), 3, false)).toEqual(['atom', 'hybrid-orbitals', 'measure-hint'])
  })

  it('ends with the molecular orbital diagram at level 3 only, whatever is selected', () => {
    expect(inspectorCards(EMPTY_SELECTION, 3, true)).toEqual(['nothing-selected', 'mo-diagram'])
    expect(inspectorCards(run(bond(0)), 3, true)).toEqual(['bond', 'mo-diagram'])
    expect(inspectorCards(run(atom(0)), 3, true).at(-1)).toBe('mo-diagram')
    expect(inspectorCards(run(atom(0)), 2, true)).not.toContain('mo-diagram')
    expect(inspectorCards(run(atom(0)), 1, true)).not.toContain('mo-diagram')
  })
})
