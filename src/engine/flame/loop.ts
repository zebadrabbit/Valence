import { extentOf, type Feature, type FlameData, type Salt } from '@/chem-data/flame/data'

// The loop, and what the flame and the spectroscope show for what is on it (spec 15.2). All of the chemistry is
// the record's: which salt gives which colour, lines and bands, what a handled loop carries, and whose colour
// hides the others. What is here is the model's bookkeeping, and its two rules for a loop that carries more than
// one salt, which the record's parameters state with their rationales.

/** What a loop carries that came from no well: the trace left on it by handling. */
export const HANDLING = 'handling'

/**
 * What is on the loop: the ids of the salts it was dipped in since it was last cleaned, each once, in the order
 * they came onto it, with HANDLING first on a loop that has never been cleaned. A cleaned loop carries nothing.
 */
export type Loop = readonly string[]

export interface Flame {
  /** The colours the flame is called by, each with a colour to draw it in: none where nothing on the loop gives light. */
  colours: { name: string; hex: string }[]
  /** True when sodium's yellow is all that is seen and another salt's colour is hidden under it. */
  hidden: boolean
}

/** A line or a band as the spectroscope shows it: the salt it is from, and where it is drawn on the scale. */
export interface Seen {
  saltId: string
  feature: Feature
  fromNm: number
  toNm: number
}

/** True when the loop carries this salt and nothing else: the one loop an observation of the salt counts with. */
export const isClean = (loop: Loop, saltId: string): boolean => loop.length === 1 && loop[0] === saltId

/** Why a loop is not clean for a salt: it was handled and never cleaned, it still carries other salts, or both. */
export const uncleanCause = (loop: Loop, saltId: string): { handled: boolean; carried: string[] } => ({
  handled: loop.includes(HANDLING),
  carried: loop.filter((entry) => entry !== HANDLING && entry !== saltId),
})

/** The salts whose light a loop gives, each once, in the order they came onto it. The handling trace gives the light of the salt the record says it carries, where the model shows the trace at all. */
export function saltsOn(data: FlameData, loop: Loop): Salt[] {
  const ids = loop.flatMap((entry) => (entry !== HANDLING ? [entry] : data.parameters.handlingTraceShows.value ? [data.handling.value] : []))
  return [...new Set(ids)].flatMap((id) => data.salts.filter((salt) => salt.id === id))
}

/**
 * The flame for what is on the loop. One salt gives its own colour. With the masking salt among several, the flame
 * is that salt's colour alone, which the record has from a source. Otherwise it is called by the colour of each
 * salt, in order: the model's rule (parameters.mixedFlame), which picks no one colour over another.
 */
export function flameOf(data: FlameData, loop: Loop): Flame {
  const salts = saltsOn(data, loop)
  const masking = salts.find((salt) => salt.id === data.masking.value)
  if (masking && salts.length > 1) return { colours: [masking.flame.value], hidden: true }
  return { colours: salts.map((salt) => salt.flame.value), hidden: false }
}

/**
 * The spectroscope for what is on the loop: every line and band of every salt on it, as that salt alone gives
 * them, along the scale from the short end. The model does not rank one salt's light against another's.
 */
export function spectrumOf(data: FlameData, loop: Loop): Seen[] {
  return saltsOn(data, loop)
    .flatMap((salt) => salt.features.map((feature): Seen => ({ saltId: salt.id, feature, ...extentOf(data, feature) })))
    .sort((a, b) => a.fromNm - b.fromNm || a.toNm - b.toNm)
}
