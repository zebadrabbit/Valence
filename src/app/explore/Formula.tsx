import { formulaParts, type FormulaPart } from '@/chem-data/formula'
import type { Molecule } from '@/chem-data/schema'

/** Formula parts with real subscripts and superscripts. */
export function FormulaParts({ parts }: { parts: readonly FormulaPart[] }) {
  return (
    <span>
      {parts.map((part, i) =>
        part.kind === 'subscript' ? <sub key={i}>{part.text}</sub> : part.kind === 'superscript' ? <sup key={i}>{part.text}</sup> : part.text,
      )}
    </span>
  )
}

/** A molecule's formula with real subscripts and superscript charges. */
export function Formula({ molecule }: { molecule: Molecule }) {
  return <FormulaParts parts={formulaParts(molecule.displayFormula ?? molecule.formula, molecule.charge)} />
}
