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
