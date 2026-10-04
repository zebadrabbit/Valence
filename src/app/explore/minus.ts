// The real minus sign (U+2212), not a hyphen. Kept apart from format.ts so that the periodic table, which
// needs only this, does not load the molecule explorer's formatters with it.
export const MINUS = '−'

/** Published text with a real minus sign for each hyphen, for a list of oxidation states such as "+5, +3, -3". */
export function minusSigns(text: string): string {
  return text.replaceAll('-', MINUS)
}
