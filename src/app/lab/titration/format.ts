// The lab's numbers as text. The engine holds whole numbers; these are the only places one is written out.

/** A burette reading in microlitres, to 0.01 mL: 24370 is "24.37". */
export const readingText = (ul: number) => (ul / 1000).toFixed(2)

/** A molarity x 1 000 000, to four decimal places: 94900 is "0.0949". */
export const molarityText = (e6: number) => (e6 / 1e6).toFixed(4)

/** A signed percent error to two decimal places, with a real minus sign: "−2.13%", "+1.87%". */
export const percentErrorText = (percent: number) => `${percent < 0 ? '−' : '+'}${Math.abs(percent).toFixed(2)}%`

/** The notebook's own relative deviation, in tenths of a part per thousand, to one decimal place: 4 is "0.4". */
export const deviationText = (tenths: number) => (tenths / 10).toFixed(1)

/** The learner's own relative deviation, in hundredths of a part per thousand, as it was typed, with no trailing zero: 130 is "1.3". */
export const deviationE2Text = (e2: number) => String(e2 / 100)
