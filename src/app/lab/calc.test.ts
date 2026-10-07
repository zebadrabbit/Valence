import { describe, expect, it } from 'vitest'
import { clampToWindow, evaluate, resultText } from './calc'

describe('the lab calculator', () => {
  it('works out a sum with the usual order, brackets, and the signs a learner writes', () => {
    expect(evaluate('1 + 2 * 3')).toBe(7)
    expect(evaluate('(1 + 2) * 3')).toBe(9)
    expect(evaluate('10 − 4 − 3')).toBe(3)
    expect(evaluate('8 ÷ 4 ÷ 2')).toBe(1)
    expect(evaluate('-2 × -3')).toBe(6)
    expect(evaluate('.5 + 2.')).toBe(2.5)
    // The lab's own sum: the primer's worked example.
    expect(resultText(evaluate('0.1200 × 25.00 ÷ (30.60 − 0.50)')!)).toBe('0.09966777409')
  })

  it('gives nothing for what is not a sum or has no value', () => {
    for (const sum of ['', '  ', '2 +', '(1 + 2', '1 + 2)', '2 ** 3', 'abc', '1,5', '1 / 0', '0 / 0', '1.2.3', 'alert(1)']) expect([sum, evaluate(sum)]).toEqual([sum, null])
  })

  it('shows every digit it has and rounds nothing for the learner, with the noise of binary arithmetic hidden', () => {
    expect(resultText(0.1 + 0.2)).toBe('0.3')
    expect(resultText(21.7)).toBe('21.7')
    expect(resultText(0.0865 * 25 / 21.7)).toBe('0.09965437788')
    expect(resultText(-1.5)).toBe('−1.5')
  })

  it('keeps the panel inside the window', () => {
    const panel = { width: 260, height: 380 }
    const window = { width: 1024, height: 768 }
    expect(clampToWindow(-50, -50, panel, window)).toEqual({ x: 0, y: 0 })
    expect(clampToWindow(2000, 2000, panel, window)).toEqual({ x: 764, y: 388 })
    expect(clampToWindow(100, 200, panel, window)).toEqual({ x: 100, y: 200 })
    // A window smaller than the panel: the panel's top left corner stays in view.
    expect(clampToWindow(50, 50, panel, { width: 200, height: 300 })).toEqual({ x: 0, y: 0 })
  })
})
