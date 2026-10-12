import type { Family, LiquidId, PairId, SolidTubeId } from '@/chem-data/mixing/data'
import type { LiquidModel, MixingModel, PairModel, SolidTubeModel } from './model'

const liquid = (id: LiquidId, density: number, family: Family, colour = 'colourless'): LiquidModel => ({ id, colour, density, family })
const pair = (a: LiquidId, b: LiquidId, mix: boolean): PairModel => ({ id: `${a}+${b}` as PairId, liquids: [a, b], mix })
const solidIn = (solid: 'salt' | 'sugar', into: LiquidId, dissolves: boolean): SolidTubeModel => ({ id: `${solid}-in-${into}` as SolidTubeId, solid, liquid: into, dissolves })

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these values, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: MixingModel = {
  liquids: [liquid('water', 998, 'water'), liquid('rubbing-alcohol', 870, 'water'), liquid('vinegar', 1010, 'water'), liquid('vegetable-oil', 923, 'oil', 'pale yellow'), liquid('mineral-oil', 822, 'oil')],
  solids: [
    { id: 'salt', colour: 'white' },
    { id: 'sugar', colour: 'white' },
  ],
  pairs: [
    pair('water', 'rubbing-alcohol', true),
    pair('water', 'vinegar', true),
    pair('water', 'vegetable-oil', false),
    pair('water', 'mineral-oil', false),
    pair('rubbing-alcohol', 'vinegar', true),
    pair('rubbing-alcohol', 'vegetable-oil', false),
    pair('vinegar', 'vegetable-oil', false),
    pair('vinegar', 'mineral-oil', false),
    pair('vegetable-oil', 'mineral-oil', true),
  ],
  solidTubes: [
    solidIn('salt', 'water', true),
    solidIn('salt', 'vinegar', true),
    solidIn('salt', 'vegetable-oil', false),
    solidIn('salt', 'mineral-oil', false),
    solidIn('sugar', 'water', true),
    solidIn('sugar', 'vinegar', true),
    solidIn('sugar', 'vegetable-oil', false),
    solidIn('sugar', 'mineral-oil', false),
  ],
  questions: [
    { id: 'grease', choices: ['mixes', 'stays-apart'], answer: 'stays-apart' },
    { id: 'epsom-salt', choices: ['dissolves', 'stays-solid'], answer: 'stays-solid' },
  ],
  neededPairs: 6,
  neededSolids: 6,
  moreMicrolitres: 3000,
  lessMicrolitres: 1500,
  solidTubeMicrolitres: 3000,
}
