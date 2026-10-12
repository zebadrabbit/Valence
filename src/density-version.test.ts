import { describe, expect, it } from 'vitest'
import { ACTIVITIES, DENSITY_PROGRESS } from './app/activities'
import { densityData } from './chem-data/density/data'
import { modelFrom } from './engine/density/model'
import { PINNED_MODEL } from './engine/density/pinnedModel'
import { labSetup, runSetup } from './engine/density/setup'
import { createLab } from './engine/density/state'
import { FIELDS, READ_FROM, WORKED_FROM } from './engine/density/worksheet'

// A stored lab holds a seed, what the learner did at each bench and what the learner typed, not the lengths, the
// levels, the masses or which liquid and which metal: those are worked out again from the seed each time the lab
// is loaded, and every reading and entry is judged again against the model. So a change to the draw, to a stored
// density, to the allowance, the eye's shift or the tolerance, to the notebook or to the stored shape would
// regrade a lab that is already stored, or refuse it, unless the stored entry's version changes with it.
describe('the measurement and density lab', () => {
  it("pins the model, the draw, the notebook, the stored shape and the stored entry's version together: changing any of them means raising the density entry's version in src/app/activities.ts", () => {
    const state = createLab(1, 'guided')
    expect({
      entry: DENSITY_PROGRESS.entry,
      version: DENSITY_PROGRESS.version,
      model: modelFrom(densityData),
      lab: labSetup(PINNED_MODEL, 1),
      run: runSetup(PINNED_MODEL, 1, 0),
      second: runSetup(PINNED_MODEL, 1, 1),
      fields: FIELDS,
      readFrom: READ_FROM,
      workedFrom: WORKED_FROM,
      state: { ...state, parts: { reading: state.parts.reading } },
    }).toEqual({
      entry: 'lab:measurement-and-density',
      version: 1,
      model: {
        liquids: [
          { id: 'ethanol-95', densityE3: 804 },
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
      },
      lab: { liquidIndex: 1, metalIndex: 0 },
      run: { noteLengthE2: 1384, noteWidthE2: 586, firstVolumeTenthMl: 441, thermometerTenths: 4, firstMassCg: 7266, emptyCylinderCg: 7490, liquidTenthMl: 449, waterTenthMl: 232, piecesTenthMl: 174, wetWaterCg: 68, splashTenthMl: 11 },
      second: { noteLengthE2: 1286, noteWidthE2: 429, firstVolumeTenthMl: 297, thermometerTenths: -3, firstMassCg: 7637, emptyCylinderCg: 7000, liquidTenthMl: 247, waterTenthMl: 203, piecesTenthMl: 171, wetWaterCg: 96, splashTenthMl: 14 },
      fields: {
        reading: ['lengthCm', 'widthCm', 'lengthMm', 'widthMm', 'firstVolume', 'temperature', 'firstMass', 'areaCm', 'areaMm', 'thermometerOff'],
        liquid: ['emptyMass', 'liquidVolume', 'fullMass', 'liquidMass', 'liquidDensity', 'liquid'],
        metal: ['piecesMass', 'waterLevel', 'finalLevel', 'metalVolume', 'metalDensity', 'metal'],
      },
      readFrom: { lengthCm: 'ruler-cm', widthCm: 'ruler-cm', lengthMm: 'ruler-mm', widthMm: 'ruler-mm', firstVolume: 'cylinder', temperature: 'thermometer', firstMass: 'balance', emptyMass: 'balance', liquidVolume: 'cylinder', fullMass: 'balance', piecesMass: 'balance', waterLevel: 'cylinder', finalLevel: 'cylinder' },
      workedFrom: {
        areaCm: ['lengthCm', 'widthCm'],
        areaMm: ['lengthMm', 'widthMm'],
        thermometerOff: ['temperature'],
        liquidMass: ['fullMass', 'emptyMass'],
        liquidDensity: ['liquidMass', 'liquidVolume'],
        liquid: ['liquidDensity'],
        metalVolume: ['finalLevel', 'waterLevel'],
        metalDensity: ['piecesMass', 'metalVolume'],
        metal: ['metalDensity'],
      },
      state: {
        seed: 1,
        mode: 'guided',
        status: 'in-progress',
        parts: {
          reading: [
            {
              index: 0,
              eye: 'above',
              bench: [],
              entries: {
                lengthCm: null,
                widthCm: null,
                lengthMm: null,
                widthMm: null,
                firstVolume: null,
                temperature: null,
                firstMass: null,
                areaCm: null,
                areaMm: null,
                thermometerOff: null,
                emptyMass: null,
                liquidVolume: null,
                fullMass: null,
                liquidMass: null,
                liquidDensity: null,
                liquid: null,
                piecesMass: null,
                waterLevel: null,
                finalLevel: null,
                metalVolume: null,
                metalDensity: null,
                metal: null,
              },
              closed: false,
            },
          ],
        },
      },
    })
    // The model the tests are pinned against is the one the stored record gives.
    expect(modelFrom(densityData)).toEqual(PINNED_MODEL)
  })

  it('has a stored entry of its own, and is not yet among the activities that have a page', () => {
    expect(ACTIVITIES.some((activity) => (activity.entry as string) === DENSITY_PROGRESS.entry)).toBe(false)
    expect(new Set([...ACTIVITIES.map((activity) => activity.entry as string), DENSITY_PROGRESS.entry]).size).toBe(ACTIVITIES.length + 1)
  })
})
