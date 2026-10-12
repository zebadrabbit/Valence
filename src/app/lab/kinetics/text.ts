// What the two labs on the kinetics engine write the same way: how a temperature, a time on the watch, a volume
// and the units of a rate and of a rate constant are written. The clock reaction lab's wording module and the
// iodination of acetone lab's both hand these on under the names their pages use (src/app/lab/clock/messages.ts,
// src/app/lab/acetone/messages.ts); every sentence of chemistry is each lab's own. Nothing here reads an engine.

export const listed = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
export const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
/** A number with a true minus sign in front of it where it is negative. */
export const minus = (text: string) => text.replace(/^-/, '−')

/** A temperature as a thermometer shows it: "21.6 °C". */
export const temperatureText = (tenths: number) => `${minus((tenths / 10).toFixed(1))} °C`
/** A time as the table of times holds it, in seconds: "124.4 s". */
export const secondsText = (tenths: number) => `${(tenths / 10).toFixed(1)} s`
/** A time as the face of the watch shows it, in minutes and seconds: "2:04.4". */
export function watchText(tenths: number): string {
  const [minutes, rest] = [Math.floor(tenths / 600), tenths % 600]
  return `${minutes}:${(rest / 10).toFixed(1).padStart(4, '0')}`
}
/** A measured volume: "10.0 mL". */
export const volumeText = (millilitres: number) => `${millilitres.toFixed(1)} mL`

/** The units of a rate constant a learner chooses among, by the power of mol/L in each. */
export const UNIT_LABEL: Record<number, string> = { 0: '1/s', [-1]: 'L/(mol·s)', [-2]: 'L²/(mol²·s)', [-3]: 'L³/(mol³·s)', [-4]: 'L⁴/(mol⁴·s)' }
export const RATE_UNIT = 'mol/(L·s)'
export const CONCENTRATION_UNIT = 'mol/L'
