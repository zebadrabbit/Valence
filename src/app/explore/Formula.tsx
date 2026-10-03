import { formulaParts } from '@/chem-data/formula'
import type { Molecule } from '@/chem-data/schema'

/** A molecule's formula with real subscripts and superscript charges. */
export function Formula({ molecule }: { molecule: Molecule }) {
  return (
    <span>
      {formulaParts(molecule.displayFormula ?? molecule.formula, molecule.charge).map((part, i) =>
        part.kind === 'subscript' ? <sub key={i}>{part.text}</sub> : part.kind === 'superscript' ? <sup key={i}>{part.text}</sup> : part.text,
      )}
    </span>
  )
}
