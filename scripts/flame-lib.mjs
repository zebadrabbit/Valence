// The check the build makes on the flame test lab's record (docs/research/flame/flame.json) that no other lab's
// record needs: its atomic lines against the saved tables of the NIST Atomic Spectra Database. The record's other
// checks are the aqueous lab's (aqueous-lib.mjs): the manifest's rows, the merge of the bottles' hazards and the
// list of sources. build-chem-data.mjs runs them; src/chem-data/flame/build.test.ts tests them on inputs they must
// refuse. Nothing is fetched here.

import { observedLines, parseNistLines } from './emission-lib.mjs'

/**
 * Throws unless every atomic line the record stores is printed, digit for digit, in the saved table its citation
 * names, for the neutral atom of the line's own element. A line is a feature's `wavelengthNm` and, where it stands
 * for a close pair, its `pairedWithNm`. `tableOf(sourceId, symbol)` hands back the saved response, or nothing where
 * that source keeps no table for that element; `range` is the lab's scale, which every stored line lies on.
 */
export function checkFlameLines(record, tableOf, range) {
  for (const salt of record.salts) {
    for (const feature of salt.features) {
      if (feature.kind !== 'line') continue
      const where = `salts[${salt.id}].features[${feature.id}]`
      if (feature.emitter?.kind !== 'atom') throw new Error(`${where}: a line is an atom's, and this one names no atom`)
      if (feature.emitter.symbol !== salt.metal.symbol) throw new Error(`${where}: the line is given to ${feature.emitter.symbol}, which is not this salt's metal`)
      for (const name of ['wavelengthNm', 'pairedWithNm']) {
        const line = feature[name]
        if (line === undefined) continue
        const text = tableOf(line.sourceId, feature.emitter.symbol)
        if (typeof text !== 'string') throw new Error(`${where}.${name}: the source "${line.sourceId}" keeps no table of ${feature.emitter.symbol} I`)
        const rows = parseNistLines(text)
        const printed = new Set(rows === null ? [] : observedLines(rows, range).map((row) => row.published))
        if (!printed.has(line.published)) throw new Error(`${where}.${name}: the saved table of ${feature.emitter.symbol} I prints no line at ${line.published} nm`)
        if (Number(line.published) !== line.value) throw new Error(`${where}.${name}: the stored ${line.value} is not the printed ${line.published}`)
      }
    }
  }
}
