// What is selected in the explorer: up to four atoms in the order they were
// picked (three give an angle, four a dihedral), or one bond, never both.
// Indices are into the molecule's atoms and bonds.

export type Selection = { readonly atoms: readonly number[]; readonly bond: number | null }

export type SelectionAction =
  | { type: 'toggleAtom'; index: number }
  | { type: 'toggleBond'; index: number }
  | { type: 'clear' }

export const MAX_SELECTED_ATOMS = 4

export const EMPTY_SELECTION: Selection = { atoms: [], bond: null }

export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'toggleAtom': {
      const atoms = state.atoms.includes(action.index)
        ? state.atoms.filter((i) => i !== action.index)
        : [...state.atoms, action.index].slice(-MAX_SELECTED_ATOMS)
      return { atoms, bond: null }
    }
    case 'toggleBond':
      return { atoms: [], bond: state.bond === action.index ? null : action.index }
    case 'clear':
      return EMPTY_SELECTION
  }
}

/** The selection in words, for the status line. Names come from atomNames and bondNames. */
export function selectionStatus(selection: Selection, atomNames: readonly string[], bondNames: readonly string[]): string {
  if (selection.bond !== null) return `Selected bond: ${bondNames[selection.bond]}.`
  if (selection.atoms.length === 0) return 'Nothing selected.'
  const names = selection.atoms.map((i) => atomNames[i]).join(', ')
  return `Selected ${selection.atoms.length === 1 ? 'atom' : `${selection.atoms.length} atoms, in order`}: ${names}.`
}
