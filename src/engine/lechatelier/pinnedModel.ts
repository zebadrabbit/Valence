import type { LechatelierModel, StageModel, Temperature } from './model'

/** A tube at one point: the colour of its liquid, its solid or 'none', its microlitres, and where it stands (the rack, unless said). */
const s = (liquid: string, solid: string, microlitres: number, temperature: Temperature = 'room'): StageModel => ({ liquid, solid, microlitres, temperature })

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these values, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: LechatelierModel = {
  solidChoices: ['none', 'white'],
  liquidChoices: ['colourless', 'yellow', 'between blue and yellow', 'blue', 'violet', 'pink'],
  systems: [
    {
      id: 'lead-chloride',
      disturbances: [
        { id: 'lead-acid', tube: 'lead', kind: 'add', portions: 3, before: s('colourless', 'none', 1500), stages: [s('colourless', 'none', 1600), s('colourless', 'white', 1700), s('colourless', 'white', 1800)], ask: 'direction', right: 'right' },
        { id: 'lead-heat', tube: 'lead', kind: 'heat', portions: 1, before: s('colourless', 'white', 1800), stages: [s('colourless', 'none', 1800, 'hot')], ask: 'direction', right: 'left' },
        { id: 'lead-cool', tube: 'lead', kind: 'cool', portions: 1, before: s('colourless', 'none', 1800, 'hot'), stages: [s('colourless', 'white', 1800, 'cold')], ask: 'direction', right: 'right' },
        { id: 'lead-water', tube: 'lead', kind: 'add', portions: 1, before: s('colourless', 'white', 1800, 'cold'), stages: [s('colourless', 'none', 4800)], ask: 'direction', right: 'left' },
      ],
    },
    {
      id: 'methyl-violet',
      disturbances: [
        { id: 'indicator-acid', tube: 'indicator', kind: 'add', portions: 2, before: s('violet', 'none', 1100), stages: [s('between blue and yellow', 'none', 1250), s('yellow', 'none', 1400)], ask: 'direction', right: 'left' },
        { id: 'indicator-base', tube: 'indicator', kind: 'add', portions: 2, before: s('yellow', 'none', 1400), stages: [s('between blue and yellow', 'none', 1550), s('violet', 'none', 1700)], ask: 'direction', right: 'right' },
      ],
    },
    {
      id: 'cobalt',
      disturbances: [
        { id: 'cobalt-water', tube: 'cobalt', kind: 'add', portions: 2, before: s('blue', 'none', 2000), stages: [s('violet', 'none', 4000), s('pink', 'none', 6000)], ask: 'direction', right: 'left' },
        { id: 'cobalt-heat', tube: 'cobalt', kind: 'heat', portions: 1, before: s('pink', 'none', 6000), stages: [s('blue', 'none', 6000, 'hot')], ask: 'direction', right: 'right' },
        { id: 'cobalt-cool', tube: 'cobalt', kind: 'cool', portions: 1, before: s('blue', 'none', 6000, 'hot'), stages: [s('pink', 'none', 6000, 'cold')], ask: 'direction', right: 'left' },
      ],
    },
    {
      id: 'hydroxides',
      disturbances: [
        { id: 'zinc-drop', tube: 'zinc', kind: 'add', portions: 1, before: s('colourless', 'none', 3000), stages: [s('colourless', 'white', 3050)], ask: 'direction', right: 'right' },
        { id: 'zinc-acid', tube: 'zinc-acid', kind: 'add', portions: 1, before: s('colourless', 'white', 500), stages: [s('colourless', 'none', 550)], ask: 'direction', right: 'left' },
        { id: 'zinc-base', tube: 'zinc-base', kind: 'add', portions: 1, before: s('colourless', 'white', 500), stages: [s('colourless', 'none', 1500)], ask: 'cause', right: 'hydroxide' },
        { id: 'zinc-ammonia', tube: 'zinc-ammonia', kind: 'add', portions: 1, before: s('colourless', 'white', 500), stages: [s('colourless', 'none', 4500)], ask: 'cause', right: 'ammonia' },
        { id: 'magnesium-drop', tube: 'magnesium', kind: 'add', portions: 1, before: s('colourless', 'none', 3000), stages: [s('colourless', 'white', 3050)], ask: 'direction', right: 'right' },
        { id: 'magnesium-acid', tube: 'magnesium-acid', kind: 'add', portions: 1, before: s('colourless', 'white', 500), stages: [s('colourless', 'none', 550)], ask: 'direction', right: 'left' },
        { id: 'magnesium-base', tube: 'magnesium-base', kind: 'add', portions: 1, before: s('colourless', 'white', 500), stages: [s('colourless', 'white', 1500)], ask: 'cause', right: 'nothing' },
        { id: 'magnesium-ammonia', tube: 'magnesium-ammonia', kind: 'add', portions: 1, before: s('colourless', 'white', 500), stages: [s('colourless', 'white', 4500)], ask: 'cause', right: 'nothing' },
      ],
    },
  ],
}
