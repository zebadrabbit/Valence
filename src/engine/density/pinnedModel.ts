import type { DensityModel } from './model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these numbers, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: DensityModel = {
  liquids: [
    { id: 'ethanol-95', densityE3: 804 }, // 0.80567 relative to water at 20 °C x 0.99821 g/mL
    { id: 'ethanol-50', densityE3: 914 },
    { id: 'water', densityE3: 998 },
    { id: 'nacl-10', densityE3: 1070 },
    { id: 'nacl-20', densityE3: 1150 },
  ],
  unknownLiquids: ['ethanol-95', 'nacl-20'],
  metals: [
    { id: 'aluminium', densityE3: 2700 },
    { id: 'zinc', densityE3: 7140 },
    { id: 'iron', densityE3: 7870 },
    { id: 'copper', densityE3: 8960 },
  ],
  unknownMetals: ['aluminium', 'zinc', 'copper'],
  icePointTenths: 0,
  scales: {
    'ruler-cm': { unit: 'cm', markE3: 1000, numberE3: 1000, fromE3: 0, toE3: 20000, decimals: 1 },
    'ruler-mm': { unit: 'cm', markE3: 100, numberE3: 1000, fromE3: 0, toE3: 20000, decimals: 2 },
    cylinder: { unit: 'mL', markE3: 1000, numberE3: 5000, fromE3: 0, toE3: 50000, decimals: 1 },
    thermometer: { unit: '°C', markE3: 1000, numberE3: 10000, fromE3: -10000, toE3: 110000, decimals: 1 },
  },
  balanceDecimals: 2,
  readingAllowance: 2,
  eyeShiftTenthMl: 5,
  tolerancePercent: 3,
  noteLengthRangeE2: [1200, 1549],
  noteWidthRangeE2: [400, 589],
  firstVolumeRangeTenthMl: [150, 450],
  thermometerOffRangeTenths: [3, 8],
  firstMassRangeCg: [1500, 9500],
  emptyCylinderRangeCg: [6000, 9500],
  liquidRangeTenthMl: [200, 450],
  waterRangeTenthMl: [200, 270],
  piecesRangeTenthMl: [150, 200],
  wetWaterRangeCg: [60, 120],
  splashRangeTenthMl: [8, 15],
}
