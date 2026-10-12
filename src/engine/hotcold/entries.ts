// What the learner types in this lab's notebook: two temperatures and the change between them, each to 0.1 °C.
// They are read as the calorimetry lab reads its own, from the characters and never through a float.
export { parseChange, parseTemperature } from '../calorimetry/entries'

/** A temperature or a change as it is written, to 0.1 °C, a negative one with a hyphen in front: "21.4", "-2.8". */
export function formatTenths(tenths: number): string {
  const size = Math.abs(tenths)
  return `${tenths < 0 ? '-' : ''}${Math.floor(size / 10)}.${size % 10}`
}
