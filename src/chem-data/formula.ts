// Keep in step with formulaElements in scripts/build-chem-data.mjs; registry.test.ts cross-checks the two.
/**
 * The element counts of a written formula such as "C2H6", "CH3COOH" or
 * "CO(NH2)2": element symbols with optional counts, and one level of
 * parentheses with an optional multiplier.
 */
export function formulaElements(formula: string): string[] {
  const expand = (text: string): string[] =>
    [...text.matchAll(/([A-Z][a-z]?)(\d*)/g)].flatMap(([, symbol, count]) => Array<string>(Number(count || 1)).fill(symbol!))
  const groups = [...formula.matchAll(/\(([^()]*)\)(\d*)/g)]
  const outside = formula.replace(/\([^()]*\)\d*/g, '')
  if (/[()]/.test(outside)) throw new Error(`formula "${formula}" has unbalanced or nested parentheses`)
  return [...expand(outside), ...groups.flatMap(([, inner, times]) => Array.from({ length: Number(times || 1) }, () => expand(inner!)).flat())]
}

export type FormulaPart = { kind: 'text' | 'subscript' | 'superscript'; text: string }

/**
 * A written formula as display parts: every digit run is a subscript, a "+" or
 * "-" written inside the formula (a zwitterion's display formula) is a
 * superscript, and a net charge is added as a final superscript, "+", "−" or "2−".
 */
// ponytail: every digit is a count. A leading coefficient ("2H2O") or a hydrate dot would need a real tokenizer.
export function formulaParts(formula: string, charge = 0): FormulaPart[] {
  const parts = [...formula.matchAll(/\d+|[+-]|[^\d+-]+/g)].map(([text]): FormulaPart => {
    if (text === '+' || text === '-') return { kind: 'superscript', text: text === '+' ? '+' : '−' }
    return { kind: /\d/.test(text) ? 'subscript' : 'text', text }
  })
  if (charge !== 0) {
    const size = Math.abs(charge)
    parts.push({ kind: 'superscript', text: `${size === 1 ? '' : size}${charge > 0 ? '+' : '−'}` })
  }
  return parts
}
