// Where the keyboard and the two step buttons move to in a picture whose places stand in a row and are looked at
// one at a time: the calorimetry lab's graph of readings and the clock reaction lab's line. Nothing here is
// chemistry: a place's number comes in and another comes out.

/** The reading a key moves to from reading `at` of `count`: the arrow keys one reading back or on, Home and End to the first and the last. Null for any other key, and where there is no reading that way. */
export function keyTarget(key: string, at: number, count: number): number | null {
  const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: count - 1 }[key]
  return to === undefined || to === at || to < 0 || to >= count ? null : to
}

/** The reading a step back or on from the one last looked at lands on; from none, the first going on and the latest going back. Null where there is no reading that way. */
export function stepTarget(by: -1 | 1, at: number | null, count: number): number | null {
  const to = at === null ? (by === 1 ? 0 : count - 1) : at + by
  return to < 0 || to >= count ? null : to
}
