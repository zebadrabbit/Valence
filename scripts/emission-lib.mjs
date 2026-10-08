// The saved responses of the NIST Atomic Spectra Database's lines query (docs/research/emission-spectra/sources),
// read, and the one rule for which lines of an element the periodic table's card shows. build-chem-data.mjs writes
// src/chem-data/emission-spectra.json with these; src/chem-data/emissionSpectra.test.ts tests them and works the
// rule out again, its own way, from the saved responses. No dependencies; nothing is fetched here.

/** The rule asks for this many lines. Lines that tie with the last of them are shown too. */
export const STRONGEST = 6
/** The range the query asks for, in nm. */
export const RANGE_NM = { min: 400, max: 700 }

/**
 * Two lines closer than this, in nm, are drawn over each other: the strip is 300 units wide for 380 to 750 nm and
 * a line is 2 units wide (src/app/explore/spectrum.ts and EmissionSpectrum.tsx; the test holds the two together).
 */
export const DRAWN_AS_ONE_NM = (2 * (750 - 380)) / 300
export const OVERLAP_NOTE = 'Some of these lines are too close together to draw separately on this strip, which shows them as one. The table lists each of them.'

// What NIST's page says where it has nothing for a query. Read in the saved responses, not shown.
const NO_LINES = 'No lines are available in ASD with the parameters selected'
const WAVELENGTH = 'obs_wl_air(nm)'
const INTENSITY = 'intens'

/**
 * The rows of a saved response, each by the names of its columns, or null where the response is NIST's page saying
 * it has no lines for the query. A response for several spectra repeats its heading, and each row is read by the
 * heading above it. Throws on a response that is neither.
 */
export function parseNistLines(text) {
  if (text.includes(NO_LINES)) return null
  let columns
  const rows = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    const cells = line.split('\t').map((cell) => cell.replace(/^"(.*)"$/, '$1'))
    if (cells.includes(INTENSITY)) columns = cells
    else if (!columns) throw new Error('the saved response is not a table of lines')
    else rows.push(Object.fromEntries(columns.map((column, i) => [column, cells[i] ?? ''])))
  }
  if (!columns) throw new Error('the saved response is not a table of lines')
  return rows
}

/**
 * The lines of a neutral atom's table, one for each observed wavelength: the wavelength in NIST's digits, and the
 * number its relative intensity starts with, or null where NIST gives none. NIST follows the number with letters
 * that describe the line ("500bl", "200h"); they are not read. Rows that share a wavelength are one line, and it
 * takes the larger of their intensities.
 */
export function observedLines(rows) {
  const lines = new Map()
  for (const row of rows) {
    const published = row[WAVELENGTH]
    if (typeof published !== 'string' || !/^\d+(\.\d+)?$/.test(published)) throw new Error(`unreadable wavelength ${JSON.stringify(published)}`)
    const value = Number(published)
    if (value < RANGE_NM.min || value > RANGE_NM.max) throw new Error(`the wavelength ${published} nm is outside the range asked for`)
    const number = /^\d+(\.\d+)?/.exec(row[INTENSITY])?.[0]
    const intensity = number === undefined ? null : Number(number)
    const seen = lines.get(value)
    if (!seen || (intensity ?? -1) > (seen.intensity ?? -1)) lines.set(value, { published: seen?.published ?? published, value, intensity })
  }
  return [...lines.values()]
}

/**
 * The rule. Of the lines NIST gives a relative intensity for: the six of largest intensity, and every line that
 * ties with the sixth; all of them where there are six or fewer. Longest wavelength first. Also how many lines
 * have an intensity, how many are listed, and how many of those shown have the smallest intensity shown.
 *
 * ponytail: a tie is never cut, so there is no upper limit: plutonium, whose 49 lines NIST rates alike, shows 49,
 * and its card has a table of 49 rows. If that is too long for a card, cap what the card draws, not this rule.
 * ponytail: the letters after an intensity are ignored, so a line NIST marks as blended, or as observed in
 * absorption, counts like any other. Leaving such lines out would be a second rule, and it would need a chemist.
 */
export function strongestLines(lines) {
  const rated = lines.filter((line) => line.intensity !== null).sort((a, b) => b.intensity - a.intensity)
  const least = rated[Math.min(STRONGEST, rated.length) - 1]?.intensity
  const shown = rated.filter((line) => line.intensity >= least).sort((a, b) => b.value - a.value)
  return { shown, rated: rated.length, total: lines.length, tied: shown.filter((line) => line.intensity === least).length }
}

const count = (n) => n.toLocaleString('en-US')

/** The sentence a card gives after "Lines shown:", which states the rule as it came out for this element. */
export function selectionSentence({ shown, rated, total, tied }) {
  const where = `of the neutral atom between ${RANGE_NM.min} and ${RANGE_NM.max} nm that NIST lists with a relative intensity`
  const which =
    shown === rated
      ? rated === 1
        ? `The one line ${where}.`
        : `All ${count(rated)} lines ${where}.`
      : `The ${shown === STRONGEST ? 'six' : count(shown)} strongest of the ${count(rated)} lines ${where}.`
  const ties =
    shown <= STRONGEST
      ? ''
      : tied === rated
        ? ' NIST gives every one of them the same intensity, so no six of them are the strongest.'
        : ` Six would be shown, but the last ${count(tied)} of these have the same intensity, so none of them is left out.`
  const unrated = total - rated
  const left = unrated === 0 ? '' : unrated === 1 ? ' NIST lists 1 more line there with no intensity, and it is not shown.' : ` NIST lists ${count(unrated)} more lines there with no intensity, and they are not shown.`
  return which + ties + left
}

const DATABASE = "NIST's Atomic Spectra Database"

/**
 * What an element's card holds, from its saved responses: `{ emission }`, the lines the rule picks with the
 * sentence that says so, or `{ none }`, the sentence that says why no spectrum is drawn. `neutral` is the response
 * for the neutral atom between 400 and 700 nm; `all`, kept only where that one has no lines, is the response for
 * every line the database lists for the element. `name` is the element's name as a sentence writes it.
 */
export function spectrumFromSaved({ name, neutral, all, sourceId }) {
  const none = (value) => ({ none: { value, sourceId } })
  const rows = parseNistLines(neutral)
  if (rows === null) {
    if (all === undefined) throw new Error('no lines of the neutral atom, and no saved response for all the lines of the element')
    const listed = parseNistLines(all)
    if (listed !== null && listed.length === 0) throw new Error('the saved response for all the lines of the element is an empty table')
    return none(
      listed === null
        ? `${DATABASE} lists no lines of ${name}, so no spectrum is drawn.`
        : `${DATABASE} lists lines of ${name}, but none of the neutral atom between ${RANGE_NM.min} and ${RANGE_NM.max} nm, so no spectrum is drawn.`,
    )
  }
  if (rows.length === 0) throw new Error('the saved response is an empty table')
  const picked = strongestLines(observedLines(rows))
  if (picked.rated === 0) {
    return none(
      `${DATABASE} lists ${count(picked.total)} lines of the neutral ${name} atom between ${RANGE_NM.min} and ${RANGE_NM.max} nm, but gives none of them a relative intensity, so the strongest cannot be picked out and no spectrum is drawn.`,
    )
  }
  const lines = picked.shown.map(({ value, published }) => ({ value, sourceId, published }))
  const overlap = lines.some((line, i) => i > 0 && lines[i - 1].value - line.value < DRAWN_AS_ONE_NM)
  return { emission: { selection: selectionSentence({ ...picked, shown: lines.length }), ...(overlap ? { note: OVERLAP_NOTE } : {}), lines } }
}
