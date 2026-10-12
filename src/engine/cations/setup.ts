import { ION_IDS, type IonId, type PartId } from '@/chem-data/cations/data'
import { mulberry32 } from '../rng'

// What the seed fixes: which ions each sample holds. The known of part 1 holds all three whatever the seed. An
// unknown of part 2 holds one, two or all three, and which of the seven it is, is hidden until its ions are
// named: nothing in this file is part of the engine's public surface.

/** The seven unknowns (spec 17.1): every choice of one, two or three of the ions, in the ions' order. */
export const UNKNOWNS: readonly (readonly IonId[])[] = [['silver'], ['lead'], ['mercury-i'], ['silver', 'lead'], ['silver', 'mercury-i'], ['lead', 'mercury-i'], ['silver', 'lead', 'mercury-i']]

/**
 * The order the seed deals the seven unknowns in: a shuffle of their places, by six draws from the seed's stream,
 * read in a fixed order. Every unknown of a lab depends on this order; changing it changes every lab.
 */
export function unknownOrder(seed: number): number[] {
  const rng = mulberry32(seed)
  const order = UNKNOWNS.map((_, place) => place)
  for (let last = order.length - 1; last > 0; last--) {
    const pick = Math.floor(rng() * (last + 1))
    ;[order[last], order[pick]] = [order[pick]!, order[last]!]
  }
  return order
}

/**
 * The ions the sample of run `index` (from 0) of a part holds. It takes no state, so it cannot depend on what the
 * learner did before. The runs of part 2 go through the seven unknowns in the seed's order and then round again,
 * so a new run never has the unknown of the run before it.
 */
export function sampleOf(seed: number, part: PartId, index: number): readonly IonId[] {
  if (part === 'known') return ION_IDS
  return UNKNOWNS[unknownOrder(seed)[index % UNKNOWNS.length]!]!
}
