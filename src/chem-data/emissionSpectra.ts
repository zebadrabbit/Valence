import data from './emission-spectra.json'
import { emissionSpectraSchema, type ElementSpectrum } from './schema'

// emission-spectra.json is written by `npm run build:data` from the saved responses of NIST's lines query under
// docs/research/emission-spectra/, by the rule in scripts/emission-lib.mjs; edit the script or its inputs, not
// that file. Hydrogen, sodium and xenon are in it as they are in elements.json.
/** For each of the 118 elements, by atomic number: its emission spectrum, or the sentence that says why there is none. */
export const emissionSpectra: readonly ElementSpectrum[] = emissionSpectraSchema.parse(data)

/** The entry of one element. */
export function spectrumOf(symbol: string): ElementSpectrum {
  const spectrum = emissionSpectra.find((entry) => entry.symbol === symbol)
  if (!spectrum) throw new Error(`no emission spectrum entry for "${symbol}"`)
  return spectrum
}
