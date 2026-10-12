// The checks the build makes on the red cabbage pH lab's record (docs/research/cabbage/cabbage.json) that no other
// lab's record needs (spec 21.3 and 21.6): that the table of the indicator's colours covers the scale with no gap
// and its edges lie between the pH values its sources name; that every household thing's range lies inside the
// scale; that each pH the record works out is what its cited figures give; and that a careful estimate by eye is
// within a unit of the meter for every thing but the one that destroys the dye. The record's other checks are the
// aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the bottles' hazards and the list of sources.
// build-chem-data.mjs runs them; src/chem-data/cabbage/build.test.ts tests them on inputs they must refuse.
// Nothing is fetched here.

function fail(message) {
  throw new Error(message)
}

/** The ends of the scale, in tenths of a pH unit: the first and the last buffer. */
const scaleOf = (record) => [record.scale.buffers[0].ph * 10, record.scale.buffers.at(-1).ph * 10]

/**
 * The colour the indicator shows at a pH given in tenths: the first colour of the table whose edge the pH does not
 * pass, and the last colour above every edge. The edges are the model's own (parameters.colourEdgesTenths). The
 * engine works this out the same way (src/engine/cabbage/model.ts), and a test holds the two to each other.
 */
export function colourAt(record, tenths) {
  const edges = record.parameters.colourEdgesTenths.value
  const at = edges.findIndex((edge) => tenths <= edge)
  return record.indicator.colours[at === -1 ? edges.length : at].colour
}

/**
 * The lowest and the highest reading of a rinsed probe in a thing, in tenths: what the seed draws between. A range
 * that a document prints is narrowed to the tenths inside it (3.35 to 4.00 is 3.4 to 4.0); one that is worked out
 * is stored to the tenth already.
 */
export function rangeTenths(thing) {
  const { ph } = thing
  return ph.basis === 'document' ? [Math.ceil(ph.low.value * 10 - 1e-9), Math.floor(ph.high.value * 10 + 1e-9)] : [Math.round(ph.low.value * 10), Math.round(ph.high.value * 10)]
}

/**
 * Throws unless the scale is the buffers of pH 1 to pH 13, one for each whole number; the table of colours covers
 * those thirteen with no gap and no overlap, in order; each edge lies at or above the last pH its colour is named
 * for and below the first pH of the next; every buffer shows the colour its source names for it; exactly one pair
 * of neighbouring buffers shares a colour, which the scale's third question asks for; and every thing's range runs
 * upward and lies inside the scale.
 */
export function checkScale(record) {
  const phs = record.scale.buffers.map((buffer) => buffer.ph)
  if (phs.join() !== Array.from({ length: 13 }, (_, i) => i + 1).join()) fail('scale.buffers: the buffers are not those of pH 1 to pH 13, in order')
  const { colours } = record.indicator
  const edges = record.parameters.colourEdgesTenths.value
  if (edges.length !== colours.length - 1) fail(`parameters.colourEdgesTenths: ${edges.length} edges for ${colours.length} colours; there is one between each two neighbours`)
  if (colours[0].from !== phs[0]) fail(`indicator.colours: the table begins at pH ${colours[0].from}, not at pH ${phs[0]}`)
  if (colours.at(-1).to !== phs.at(-1)) fail(`indicator.colours: the table ends at pH ${colours.at(-1).to}, not at pH ${phs.at(-1)}`)
  colours.forEach((row, i) => {
    if (row.from > row.to) fail(`indicator.colours[${row.id}]: its range runs downward`)
    const next = colours[i + 1]
    if (next === undefined) return
    if (next.from !== row.to + 1) fail(`indicator.colours[${next.id}]: it begins at pH ${next.from}, which leaves a gap or an overlap after pH ${row.to}`)
    if (next.colour === row.colour) fail(`indicator.colours[${next.id}]: the same word as the colour before it; one row holds a colour that two pH values share`)
    if (!(edges[i] >= row.to * 10 && edges[i] < next.from * 10)) fail(`parameters.colourEdgesTenths[${i}]: ${edges[i]} is not from ${row.to * 10} to under ${next.from * 10}, between ${row.colour} and ${next.colour}`)
  })
  for (const ph of phs) {
    const named = colours.find((row) => row.from <= ph && ph <= row.to).colour
    if (colourAt(record, ph * 10) !== named) fail(`scale.buffers: the pH ${ph} buffer shows ${colourAt(record, ph * 10)} by the edges, and its source names ${named}`)
  }
  const shared = phs.filter((ph, i) => i > 0 && colourAt(record, ph * 10) === colourAt(record, phs[i - 1] * 10))
  if (shared.length !== 1) fail(`scale: ${shared.length} pairs of neighbouring buffers share a colour; the scale's question on the pair that does needs exactly one`)
  const [bottom, top] = scaleOf(record)
  for (const thing of record.things) {
    const [low, high] = rangeTenths(thing)
    if (low > high) fail(`things[${thing.id}].ph: no tenth of a pH unit lies from ${thing.ph.low.value} to ${thing.ph.high.value}`)
    if (low < bottom || high > top) fail(`things[${thing.id}].ph: ${low / 10} to ${high / 10} does not lie inside the scale, pH ${bottom / 10} to pH ${top / 10}`)
  }
}

const figure = (n, digits = 3) => Number(n.toPrecision(digits)).toString()

/**
 * Throws unless each pH the record works out is what its cited figures give, to a tenth, and its working shows the
 * figures it was made from. A strength in per cent is taken as grams in 100 mL of the product
 * (parameters.productDensity); the product is then diluted as the bench has it. A strong base gives all of its
 * hydroxide: pH = pKw + log c. A weak base, or the salt of a weak acid, gives pOH = (pKb − log c) ÷ 2, with the pKb
 * of the salt's ion pKw less the pKa of its acid.
 */
export function checkWorkedOut(record) {
  const { constants, parameters } = record
  const parts = { 'one-in-twenty': parameters.oneInTwenty.value, 'one-in-hundred': parameters.oneInHundred.value }
  const pKw = constants.pKw.value
  for (const thing of record.things) {
    const { ph } = thing
    if (ph.basis !== 'arithmetic') continue
    const where = `things[${thing.id}].ph`
    const dilution = parts[thing.onBench] ?? fail(`${where}: a pH is worked out only for a thing diluted one part in twenty or one in a hundred`)
    const pKb = ph.rule === 'weak-base' ? constants.ammoniaPKb.value : ph.rule === 'salt-of-weak-acid' ? pKw - constants.hypochlorousPKa.value : null
    for (const end of ['low', 'high']) {
      const percent = ph.percent[end]
      const molar = (percent.value * 10 * parameters.productDensity.value) / ph.solute.formulaWeight.value / dilution
      const value = ph.rule === 'strong-base' ? pKw + Math.log10(molar) : pKw - (pKb - Math.log10(molar)) / 2
      const rounded = Number(value.toFixed(1))
      if (rounded !== ph[end].value) fail(`${where}.${end}: ${ph[end].value} is not what ${percent.published}% of ${ph.solute.name} gives at one part in ${dilution}, ${value.toFixed(2)}`)
      for (const shown of [percent.published, ph.solute.formulaWeight.published, figure(molar), value.toFixed(2), rounded.toFixed(1), `one part in ${dilution}`]) {
        if (!ph[end].working.includes(shown)) fail(`${where}.${end}: the working does not show ${shown}`)
      }
    }
    if (ph.low.value > ph.high.value) fail(`${where}: the range runs downward`)
  }
}

/**
 * The check of spec 21.6: for every thing that does not destroy the dye, and every pH in its range to the tenth,
 * every buffer of the scale that shows the colour the thing shows is within a unit of that pH (the margin is
 * parameters.estimateWithinTenths). Where two buffers share a colour a careful learner may name either, so both
 * must be near enough. Throws on the first pH that fails, and where a thing shows a colour no buffer has. Returns,
 * for each thing, the buffers a careful learner may name over its range and the farthest any of them is from it.
 */
export function checkEstimates(record) {
  const within = record.parameters.estimateWithinTenths.value
  const phs = record.scale.buffers.map((buffer) => buffer.ph)
  return record.things
    .filter((thing) => !thing.bleaches)
    .map((thing) => {
      const [low, high] = rangeTenths(thing)
      const named = new Set()
      let farthest = 0
      for (let tenths = low; tenths <= high; tenths++) {
        const colour = colourAt(record, tenths)
        const tubes = phs.filter((ph) => colourAt(record, ph * 10) === colour)
        if (tubes.length === 0) fail(`things[${thing.id}]: at pH ${tenths / 10} it shows ${colour}, which no buffer of the scale shows`)
        for (const ph of tubes) {
          const off = Math.abs(ph * 10 - tenths)
          if (off > within) fail(`things[${thing.id}]: at pH ${tenths / 10} it shows ${colour}, as the pH ${ph} buffer does, which is ${off / 10} of a unit away: more than ${within / 10}`)
          farthest = Math.max(farthest, off)
          named.add(ph)
        }
      }
      return { id: thing.id, lowTenths: low, highTenths: high, tubes: [...named].sort((a, b) => a - b), farthestTenths: farthest }
    })
}
