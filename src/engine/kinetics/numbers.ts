// The two functions of the kinetics engine that are not whole-number arithmetic: e to a power, for the Arrhenius
// equation, and the natural logarithm, for the graph of part 3. Each is worked here with + - x / alone, on doubles:
// those four give the same bits in every engine, which Math.exp and Math.log are not promised to, so the same
// seed gives the same time, to the millisecond, wherever the lab is run. No entry a learner types is judged on
// either: the times they give are rounded to whole milliseconds, and the logarithms to whole thousandths, before
// anything is worked from them.

/** e to the power x. The power is halved ten times, the series is summed, and the sum is squared ten times. */
export function exp(x: number): number {
  const small = x / 1024
  let term = 1
  let sum = 1
  for (let n = 1; n <= 14; n++) {
    term = (term * small) / n
    sum += term
  }
  for (let i = 0; i < 10; i++) sum *= sum
  return sum
}

const LN2 = 0.6931471805599453

/** The natural logarithm of a number above zero. The number is halved or doubled into the stretch from 1 to 2, and the rest is a series. */
export function ln(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) throw new Error(`no logarithm of ${x}`)
  let halvings = 0
  while (x >= 2) {
    x /= 2
    halvings++
  }
  while (x < 1) {
    x *= 2
    halvings--
  }
  // ln x = 2 atanh((x - 1) / (x + 1)), and (x - 1) / (x + 1) is under a third here.
  const z = (x - 1) / (x + 1)
  const square = z * z
  let power = z
  let sum = 0
  for (let n = 1; n <= 59; n += 2) {
    sum += power / n
    power *= square
  }
  return halvings * LN2 + 2 * sum
}
