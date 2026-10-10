import type { CationsModel } from './model'

/**
 * The model as a literal, for tests only: the engine's expected values are pinned against these values, so a
 * change to the stored record cannot move them unseen. The app's model is built from the sourced record.
 */
export const PINNED_MODEL: CationsModel = {
  leadChlorideColdPerMillilitre: 35958, // 10 g/L over 278.10 g/mol, in nmol for each mL
  leadChlorideHotPerMillilitre: 120460, // 33.5 g/L
  solidLook: {
    'silver-chloride': 'white',
    'lead-chloride': 'white',
    'mercury-i-chloride': 'white',
    'lead-chromate': 'yellow',
    'mercury-and-amidochloride': 'grey to black',
    'lead-hydroxide': 'white',
  },
  plainLook: 'colourless',
  chromateLook: 'yellow to orange',
  solidChoices: ['none', 'white', 'yellow', 'grey to black'],
  liquidChoices: ['colourless', 'yellow to orange'],
  sampleMicrolitres: 1500,
  ionNanomoles: 50000, // 10 drops of 0.1 M
  hydrochloricAcidMicrolitres: 200,
  chlorideNanomoles: 1200000, // 4 drops of 6 M
  waterMicrolitres: 750,
  aceticAcidMicrolitres: 50,
  chromateMicrolitres: 200,
  chromateNanomoles: 100000, // 4 drops of 0.5 M
  ammoniaMicrolitres: 750,
  ammoniaNanomoles: 4500000, // 15 drops of 6 M
  nitricAcidMicrolitres: 400,
  nitricAcidNanomoles: 2400000, // 8 drops of 6 M
  nitricAcidAdditions: 4,
  tiles: ['silver-chloride', 'lead-chloride', 'mercury-i-chloride', 'lead-chromate', 'mercury-and-amidochloride', 'silver-ion', 'lead-ion', 'mercury-i-ion', 'silver-ammonia-ion'],
  places: [
    { id: 'precipitate-solid', step: 0, layer: 'solid', holds: ['silver-chloride', 'lead-chloride', 'mercury-i-chloride'] },
    { id: 'extract-lead-solid', step: 1, layer: 'solid', holds: ['silver-chloride', 'mercury-i-chloride'] },
    { id: 'extract-lead-liquid', step: 1, layer: 'liquid', holds: ['lead-ion'] },
    { id: 'confirm-lead-solid', step: 2, layer: 'solid', holds: ['lead-chromate'] },
    { id: 'separate-solid', step: 3, layer: 'solid', holds: ['mercury-and-amidochloride'] },
    { id: 'separate-liquid', step: 3, layer: 'liquid', holds: ['silver-ammonia-ion'] },
    { id: 'confirm-silver-solid', step: 4, layer: 'solid', holds: ['silver-chloride'] },
  ],
}
