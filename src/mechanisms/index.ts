// The mechanism timeline as src/app/ may use it. A lint rule keeps the app out of every file below this one.
export { hclNahco3 } from './data'
export type { Chapter, EasingName, ElectronSite, Energy, Keyframe, Mechanism, Question, Step } from './schema'
export { EASINGS, chapterAt, chapterStart, state, stepsOf, type MechanismState, type SceneAtom, type SceneBond, type ScenePath, type SceneSpecies } from './state'
export { energyAt, energyCurves, overallEnergy, type EnergyStretch } from './energy'
export { describeMechanismState, mechanismDescription, type MechanismDescription } from './describe'
export { can, createProgress, mechanismProgressSchema, pendingPrediction, predictionResults, predictionsOf, reduce, type Action, type Blocked, type MechanismProgress, type Mode, type Prediction } from './progress'
export { ENERGY_PANEL, PREDICTION, chapterAnnouncement, chapterHeading, energyLines, energyPanelNotes, kJ, predictionFeedback, stepNotes, timescaleLabel, type EnergyLine } from './wording'
export { mechanismCitations } from './citations'
