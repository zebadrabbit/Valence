import type { ThingId } from '@/chem-data/cabbage/data'
import type { CabbageModel, ThingModel } from './model'

/** A thing: its range in tenths, its liquid before the indicator goes in, whether that is cloudy, and its solid. */
const t = (id: ThingId, lowTenths: number, highTenths: number, liquid = 'colourless', cloudy = false, solid: string | null = null, bleaches = false): ThingModel => ({ id, lowTenths, highTenths, before: { liquid, cloudy, solid }, bleaches })

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these values, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: CabbageModel = {
  phs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  colours: ['red', 'dark pink', 'rose', 'lavender', 'purple', 'blue-violet', 'dark blue', 'blue', 'teal', 'emerald', 'greenish-yellow', 'yellow'],
  edgesTenths: [15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 120],
  bleached: 'colourless',
  things: [
    t('vinegar', 24, 34),
    t('lemon-juice', 20, 26, 'pale yellow', true),
    t('apple-juice', 34, 40, 'pale yellow'),
    t('ammonia', 112, 114),
    t('shampoo', 55, 68),
    t('conditioner', 35, 35, 'white', true),
    t('laundry-detergent', 95, 105),
    t('lab-detergent', 95, 95),
    t('mouthwash', 60, 80),
    t('antacid', 70, 90, 'white', true, 'white'),
    t('aspirin', 35, 35, 'white', true, 'white'),
    t('bleach', 96, 98, 'colourless', false, null, true),
    t('drain-cleaner', 121, 128),
    t('epsom-salt', 50, 82),
  ],
  questions: [
    { id: 'acid-end', kind: 'colour-of-tube', ph: 1 },
    { id: 'neutral', kind: 'colour-of-tube', ph: 7 },
    { id: 'same-pair', kind: 'same-colour-pair' },
  ],
  unrinsedSharePercent: 20,
  estimateWithinTenths: 10,
  neededToCount: 8,
  sampleMicrolitres: 3000,
  indicatorMicrolitres: 500,
}
