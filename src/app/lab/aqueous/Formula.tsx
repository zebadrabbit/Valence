import { Fragment } from 'react'
import type { AqueousData } from '@/chem-data/aqueous/data'
import type { Entry } from '@/engine/aqueous'
import { formulaParts } from './builder'
import { BENCH_TEXT } from './messages'

/** A formula of the record with its subscripts and its charge drawn as such. */
export function Formula({ text }: { text: string }) {
  return formulaParts(text).map((part, i) => (part.at === 'below' ? <sub key={i}>{part.text}</sub> : part.at === 'above' ? <sup key={i}>{part.text}</sup> : part.text))
}

/** The formula of a species of the record; its id where the record has no such species, which a stored entry is held not to have. */
export const formulaOf = (data: AqueousData, speciesId: string) => data.species.find((s) => s.id === speciesId)?.formula ?? speciesId

/**
 * An equation in one line, as it is built or as it was entered: "Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)", with a gap
 * where a side has nothing on it yet, or "No reaction". The same line as messages.equationText writes, drawn.
 */
export function EquationLine({ data, entry }: { data: AqueousData; entry: Entry }) {
  if (entry.noReaction) return BENCH_TEXT.noReaction
  const side = (terms: Entry['reactants']) =>
    terms.length === 0
      ? '…'
      : terms.map((term, i) => (
          <Fragment key={term.speciesId}>
            {i > 0 && ' + '}
            <span className="whitespace-nowrap">
              {term.coefficient === 1 ? '' : term.coefficient}
              <Formula text={formulaOf(data, term.speciesId)} />({term.state})
            </span>
          </Fragment>
        ))
  return (
    <>
      {side(entry.reactants)} → {side(entry.products)}
    </>
  )
}
