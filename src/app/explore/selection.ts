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

export type InspectorCardKind = 'bond' | 'nothing-selected' | 'measure' | 'bohr' | 'atom' | 'hybrid-orbitals' | 'measure-hint' | 'mo-diagram'

/**
 * Which inspector cards show, in order (spec 6.3, 6.4). A bond, one atom, or a measurement of two
 * to four atoms; the Bohr model of a single atom at valence level 1; at level 3 that atom's hybrid
 * orbitals and, whatever is selected, the molecular orbital diagram of a molecule that has one.
 */
export function inspectorCards(selection: Selection, level: 1 | 2 | 3, hasMoDiagram: boolean): InspectorCardKind[] {
  const count = selection.atoms.length
  const cards: InspectorCardKind[] =
    selection.bond !== null
      ? ['bond']
      : count === 0
        ? ['nothing-selected']
        : count > 1
          ? ['measure']
          : [...(level === 1 ? (['bohr'] as const) : []), 'atom', ...(level === 3 ? (['hybrid-orbitals'] as const) : []), 'measure-hint']
  return level === 3 && hasMoDiagram ? [...cards, 'mo-diagram'] : cards
}
