// What a lab with stations works out for its list of them, whatever the lab: the aqueous reactions lab's and the
// flame test lab's. It is beside the shell, and takes a station's progress as a word, so that neither lab's page
// loads anything of the other's.

/**
 * The station the Lab tab shows when the page opens: the one the learner was in the middle of, as far as the
 * stored record can tell. The first that is begun and not done, whatever word a lab has for begun; where none is,
 * the first not done; else the first.
 * ponytail: the station shown is state of the page and is not stored or in the address, so a reload in the middle
 * of the second of two stations begun opens on the first. Store it, or put it in the address, if that is asked for.
 */
export function openingStation(progress: readonly string[]): number {
  const begun = progress.findIndex((p) => p !== 'not-started' && p !== 'done')
  return Math.max(0, begun >= 0 ? begun : progress.findIndex((p) => p !== 'done'))
}
