// The lab calculator's arithmetic: a sum typed as text is worked out here, never by eval.
// Numbers, + - * /, the signs a learner would write (×, ÷, −), brackets and a leading minus.

/** The value of a sum such as "0.0865 × 25.00 ÷ (22.75 − 1.05)"; null when it is not a sum or has no finite value. */
export function evaluate(sum: string): number | null {
  const text = sum.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
  let at = 0
  const take = (sign: string) => (text[at] === sign ? (at++, true) : false)

  const factor = (): number => {
    if (take('-')) return -factor()
    if (take('(')) {
      const inside = terms()
      return take(')') ? inside : NaN
    }
    const number = /^(\d+\.?\d*|\.\d+)/.exec(text.slice(at))
    if (!number) return NaN
    at += number[0].length
    return Number(number[0])
  }
  const products = (): number => {
    let value = factor()
    for (;;) {
      if (take('*')) value *= factor()
      else if (take('/')) value /= factor()
      else return value
    }
  }
  const terms = (): number => {
    let value = products()
    for (;;) {
      if (take('+')) value += products()
      else if (take('-')) value -= products()
      else return value
    }
  }

  if (text === '') return null
  const value = terms()
  return at === text.length && Number.isFinite(value) ? value : null
}

/**
 * A result as the calculator shows it: every digit it has, with nothing rounded for the learner, who rounds the
 * final answer themselves (the primer's rule).
 * ponytail: binary floating point shown to 10 significant figures, which hides its noise (0.1 + 0.2 reads 0.3);
 * exact decimal arithmetic if a lab ever needs more than 10 figures.
 */
export function resultText(value: number): string {
  return String(Number(value.toPrecision(10))).replace('-', '−')
}

/** Where the panel may sit: wholly inside the window, whatever it was dragged to. */
export function clampToWindow(x: number, y: number, panel: { width: number; height: number }, window: { width: number; height: number }) {
  const within = (value: number, most: number) => Math.max(0, Math.min(value, Math.max(0, most)))
  return { x: within(x, window.width - panel.width), y: within(y, window.height - panel.height) }
}
