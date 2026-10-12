// The checks the build makes on the measurement and density lab's record (docs/research/density/density.json)
// that no other lab's record needs: the densities it works out from cited figures, the metals' figures against
// the copy the periodic table keeps, and the numbers of spec 22.6: that the candidates of each table are far
// enough apart to tell at the figures the instruments give, and that every seeded amount keeps the figures the
// lab teaches. The record's other checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge
// of the reagents' hazards and the list of sources. build-chem-data.mjs runs them;
// src/chem-data/density/build.test.ts tests them on inputs they must refuse. Nothing is fetched here.

/** A number to three significant figures. */
export const threeFigures = (value) => Number(value.toPrecision(3))

/** The unit of a density that a source prints as a multiple of the density of water at the same temperature. */
export const RELATIVE = 'relative to water at 20 °C'

/**
 * Throws unless every density the record stores is what its cited figure gives, to three significant figures: the
 * figure itself where the source prints grams for each millilitre or cubic centimetre, and the figure times the
 * density of water where it prints a relative density. The working must show each figure it uses and its result.
 */
export function checkWorkedOut(record) {
  const water = record.water.density
  for (const [table, rows] of [['liquids', record.liquids], ['metals', record.metals]]) {
    for (const row of rows) {
      const where = `${table}[${row.id}].density`
      const relative = row.printed.unit === RELATIVE
      if (!relative && !['g/mL', 'g/cm³'].includes(row.printed.unit)) throw new Error(`${where}: the unit "${row.printed.unit}" of the printed figure is none the build can work from`)
      if (relative && row.temperature !== water.temperature) throw new Error(`${where}: a density relative to water at ${row.temperature} cannot be worked out with the density of water at ${water.temperature}`)
      const worked = threeFigures(row.printed.value * (relative ? water.value : 1))
      if (worked !== row.density.value) throw new Error(`${where}: ${row.density.value} is not ${row.printed.published}${relative ? ` × ${water.published}` : ''} to three significant figures, ${worked}`)
      for (const figure of [row.printed.published, ...(relative ? [water.published] : []), row.density.value.toPrecision(3)]) {
        if (!row.density.working.includes(figure)) throw new Error(`${where}: the working does not show ${figure}`)
      }
    }
  }
}

/**
 * Throws unless every metal's printed density is the figure of the kept copy of the handbooks' transcription
 * (the periodic table's copy of Wikipedia's data page): the row marked CRC in the block for the element, among
 * the solids, in g/cm³, given for near room temperature.
 */
export function checkMetalDensities(record, wikitext) {
  const solids = wikitext.split(/\n==[^=]/)[1] ?? wikitext
  for (const metal of record.metals) {
    const where = `metals[${metal.id}].printed`
    const block = new RegExp(`<!-- \\d+ ${metal.formula} -->[^\\n]*\\n((?:(?!\\n!)[\\s\\S])*)`).exec(solids)?.[1]
    if (!block) throw new Error(`${where}: the kept copy has no block for ${metal.formula}`)
    const row = /^\|CRC \|\|\(near r\.t\.\) ([\d.]+) g\/cm<sup>3<\/sup>$/m.exec(block)
    if (!row) throw new Error(`${where}: the kept copy has no CRC row for ${metal.formula} near room temperature`)
    if (row[1] !== metal.printed.published || metal.printed.unit !== 'g/cm³' || metal.temperature !== 'near room temperature') {
      throw new Error(`${where}: the kept copy gives ${metal.formula} ${row[1]} g/cm³ near room temperature, not the stored ${metal.printed.published} ${metal.printed.unit} for ${metal.temperature}`)
    }
  }
}

const sorted = (rows) => [...rows].sort((a, b) => a.density.value - b.density.value)
/** How far a figure is from the stored one, in percent of the stored one. */
const off = (found, stored) => (Math.abs(found - stored) / stored) * 100

/**
 * The numbers of spec 22.6 for one table: how far a learner whose every reading is at the edge of the allowance
 * can come out from the stored density of an unknown, with the case that gives it; and how near the two nearest
 * candidates are, in percent of the lower. `readings` is how many level readings the volume is made of: one for
 * the liquid, two for the rise of the metal.
 */
export function tellApart(rows, unknownIds, [low, high], allowance, readings) {
  let worst = { percent: 0 }
  for (const row of rows.filter((r) => unknownIds.includes(r.id))) {
    for (let volume = low; volume <= high; volume++) {
      // What the balance shows for this volume of it, in hundredths of a gram.
      const mass = Math.round(row.density.value * volume * 10)
      for (const slip of [-allowance * readings, allowance * readings]) {
        const found = threeFigures(mass / 100 / ((volume + slip) / 10))
        const percent = off(found, row.density.value)
        if (percent > worst.percent) worst = { percent, id: row.id, volumeTenthMl: volume, readTenthMl: volume + slip, massCg: mass, found }
      }
    }
  }
  const inOrder = sorted(rows)
  const gaps = inOrder.slice(1).map((upper, i) => ({ lower: inOrder[i].id, upper: upper.id, percent: off(upper.density.value, inOrder[i].density.value) }))
  return { worst, nearest: gaps.reduce((a, b) => (a.percent <= b.percent ? a : b)), gaps }
}

/**
 * Throws unless the record's numbers hold together as spec 22.6 asks, each by number:
 * - no two candidates of a table are so near that 3% (the tolerance) on either side of one reaches the tolerance
 *   on either side of the other, so a density within tolerance of one is nearest to it;
 * - a learner whose every reading is at the edge of the allowance is within the tolerance at every seeded amount;
 * - a volume found by difference keeps three significant figures (10.0 mL or more) with both levels read at the
 *   edge of the allowance, the liquid's volume has three, and every mass has four or more;
 * - a level read from above or below is never within the allowance of the true level, and stays on the scale;
 * - the thermometer is off by more than the allowance;
 * - the note's width has two figures on the centimetre ruler and its length three, and no area the allowance
 *   takes reaches 99.5 cm² or falls under 10, so every area can be written with its figures and no power of ten.
 * Returns the numbers, for the record's README and the tests.
 */
export function checkTellApart(record) {
  const p = Object.fromEntries(Object.entries(record.parameters).map(([key, parameter]) => [key, parameter.value]))
  const [, liquidPart, metalPart] = record.parts
  const cylinder = record.instruments.find((i) => i.id === 'cylinder')
  const top = Math.round(cylinder.to * 10)
  const A = p.readingAllowance
  const result = {}
  for (const [name, rows, part, range, readings] of [['liquid', record.liquids, liquidPart, p.liquidRangeTenthMl, 1], ['metal', record.metals, metalPart, p.piecesRangeTenthMl, 2]]) {
    const table = rows.filter((r) => part.candidateIds.includes(r.id))
    if (table.length !== part.candidateIds.length || part.unknownIds.some((id) => !part.candidateIds.includes(id))) throw new Error(`parts[${part.id}]: the candidates and the unknowns are not rows of the table`)
    const numbers = tellApart(table, part.unknownIds, range, A, readings)
    for (const gap of numbers.gaps) {
      const [lower, upper] = [table.find((r) => r.id === gap.lower).density.value, table.find((r) => r.id === gap.upper).density.value]
      if (lower * (100 + p.tolerancePercent) >= upper * (100 - p.tolerancePercent)) throw new Error(`parts[${part.id}]: ${gap.lower} and ${gap.upper} are ${gap.percent.toFixed(1)}% apart, too near to tell with a tolerance of ${p.tolerancePercent}% on each`)
    }
    if (numbers.worst.percent > p.tolerancePercent) throw new Error(`parts[${part.id}]: a careful learner can be ${numbers.worst.percent.toFixed(2)}% out (${JSON.stringify(numbers.worst)}), outside the tolerance of ${p.tolerancePercent}%`)
    if (2 * numbers.worst.percent >= numbers.nearest.percent) throw new Error(`parts[${part.id}]: the instruments tell densities ${(2 * numbers.worst.percent).toFixed(1)}% apart, and ${numbers.nearest.lower} and ${numbers.nearest.upper} are only ${numbers.nearest.percent.toFixed(1)}% apart`)
    const lightest = Math.min(...table.filter((r) => part.unknownIds.includes(r.id)).map((r) => r.density.value))
    if (Math.round(lightest * range[0] * 10) < 1000) throw new Error(`parts[${part.id}]: the lightest sample weighs under 10.00 g, so its mass has fewer than four figures`)
    if (range[0] - A * readings < 100) throw new Error(`parts[${part.id}]: a volume of ${range[0] / 10} mL read ${(A * readings) / 10} mL low has fewer than three figures`)
    result[name] = numbers
  }
  if (p.eyeShiftTenthMl <= 2 * A) throw new Error(`parameters.eyeShiftTenthMl: a level read from above or below must be more than twice the allowance from the true level`)
  const highest = Math.max(p.firstVolumeRangeTenthMl[1], p.liquidRangeTenthMl[1], p.waterRangeTenthMl[1] + p.piecesRangeTenthMl[1])
  const lowest = Math.min(p.firstVolumeRangeTenthMl[0], p.liquidRangeTenthMl[0], p.waterRangeTenthMl[0])
  if (highest + p.eyeShiftTenthMl + A > top || lowest - p.eyeShiftTenthMl - A < 100) throw new Error('parameters: a level, read from above or below, must stay on the cylinder\'s scale and keep three figures')
  if (p.splashRangeTenthMl[1] >= p.piecesRangeTenthMl[0] - 100 - 2 * A) throw new Error('parameters.splashRangeTenthMl: a rise that reads low for the splash must still have three figures')
  if (p.thermometerOffRangeTenths[0] <= A) throw new Error('parameters.thermometerOffRangeTenths: the thermometer must be off by more than the reading allowance')
  if ([p.firstMassRangeCg[0], p.emptyCylinderRangeCg[0]].some((cg) => cg < 1000)) throw new Error('parameters: every mass has four figures or more')
  // The note, in hundredths of a centimetre; a reading of the centimetre ruler may be 20 of them out, of the millimetre ruler 2.
  const [length, width] = [p.noteLengthRangeE2, p.noteWidthRangeE2]
  const out = A * 10
  if (length[0] - out < 1000 || width[1] + out >= 1000 || width[0] - out < 100) throw new Error('parameters: the note\'s length must have three figures on the centimetre ruler and its width two')
  const [largest, smallest] = [(Math.round((length[1] + out) / 10) * Math.round((width[1] + out) / 10)) / 100, (Math.round((length[0] - out) / 10) * Math.round((width[0] - out) / 10)) / 100]
  if (largest >= 99.5 || smallest < 10) throw new Error(`parameters: the note's area must stay from 10 cm² to under 99.5 cm² at every reading the allowance takes; it runs from ${smallest} to ${largest}`)
  return { ...result, area: { smallest, largest } }
}
