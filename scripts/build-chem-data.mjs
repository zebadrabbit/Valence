// Builds the committed chemistry data from the verified research files.
//
//   npm run build:data
//
// Reads docs/research/phase-2/ and writes, under src/chem-data/:
//   elements.json, sources.json, mo-diagrams.json, library-index.json, molecules/<id>.json, molecules/index.ts
// Reads docs/research/periodic-table/ (saved downloads and decisions.json) and writes:
//   periodic-table.json, element-index.json, and into sources.json its sources and the ones the group, period and
//   block descriptions cite
// Reads docs/research/phase-3/ (titration.json and the saved copies its sources/MANIFEST.json lists) and writes:
//   titration/titration.json, and into sources.json the titration lab's sources
// Reads docs/research/phase-4/ (aqueous.json, hazards.json, the two manifests under sources/ and the one kept copy)
// and writes:
//   aqueous/aqueous.json, and into sources.json the aqueous reactions lab's sources
// Reads docs/research/phase-5/ (mechanism.json, choreography.json and sources/MANIFEST.json) and writes, under
// src/mechanisms/:
//   hcl-nahco3.json, the mechanism timeline's record with its keyframes, and into sources.json its sources
// Reads docs/research/emission-spectra/sources/ (the saved responses of NIST's lines query and their MANIFEST.json)
// and writes:
//   emission-spectra.json, the emission spectrum on each element's card or the sentence that says why there is
//   none, and into sources.json its sources
// Reads docs/research/flame/ (flame.json, hazards.json, the two manifests under sources/ and the one kept table)
// and writes:
//   flame/flame.json, and into sources.json the flame test lab's sources
// Reads docs/research/calorimetry/ (calorimetry.json, hazards.json and the two manifests under sources/), with the
// hazards of the two bottles it shares with the aqueous reactions lab from docs/research/phase-4/, and writes:
//   calorimetry/calorimetry.json, and into sources.json the calorimetry lab's sources
// Reads docs/research/cations/ (cations.json, hazards.json and the two manifests under sources/), with the hazards
// of the one bottle it shares with the aqueous reactions lab from docs/research/phase-4/, and writes:
//   cations/cations.json, and into sources.json the Group I cations lab's sources
// Reads docs/research/lechatelier/ (lechatelier.json, hazards.json and the two manifests under sources/), with the
// hazards of the two bottles it shares with the aqueous reactions lab from docs/research/phase-4/, and writes:
//   lechatelier/lechatelier.json, and into sources.json the Le Chatelier's principle lab's sources
// Reads docs/research/clock/ (clock.json, hazards.json and the two manifests under sources/) and writes:
//   clock/clock.json, and into sources.json the clock reaction lab's sources
// Reads docs/research/cabbage/ (cabbage.json, hazards.json and the two manifests under sources/) and writes:
//   cabbage/cabbage.json, and into sources.json the red cabbage pH lab's sources
//
// Reads docs/research/density/ (density.json, hazards.json and the two manifests under sources/), with the copy
// of the handbooks' densities kept for the periodic table, and writes:
//   density/density.json, and into sources.json the measurement and density lab's sources
//
// Reads docs/research/reactions/ (reactions.json, hazards.json and the two manifests under sources/), with the
//   aqueous reactions lab's hazards for the two bottles shared with it. Writes src/chem-data/reactions/reactions.json,
//   and into sources.json the types of reactions lab's sources
// Reads docs/research/mixing/ (mixing.json, hazards.json and the two manifests under sources/), with the red
//   cabbage pH lab's record for the note the foods share and the library's molecules for the links. Writes
//   src/chem-data/mixing/mixing.json, and into sources.json the polarity and mixing lab's sources
// Reads docs/research/hotcold/ (hotcold.json, hazards.json and the two manifests under sources/), with the
//   periodic table's record for the atomic weights. Writes src/chem-data/hotcold/hotcold.json, and into
//   sources.json the endothermic and exothermic lab's sources
// Reads docs/research/freezing/ (freezing.json, hazards.json and the two manifests under sources/), with the
// periodic table's record for the atomic weights, and writes:
//   freezing/freezing.json, and into sources.json the freezing point depression lab's sources
// Reads docs/research/acetone/ (acetone.json, hazards.json and the two manifests under sources/), with the
// aqueous lab's hazards for the bottle the two labs share, and writes:
//   acetone/acetone.json, and into sources.json the iodination of acetone lab's sources
//
// Deterministic: the same inputs give byte-identical outputs. Anything
// unexpected in the inputs stops the build with a message and writes nothing.
//
// ponytail: nothing checks that the committed outputs match a fresh run. When
// there is CI, add `npm run build:data && git diff --exit-code src/chem-data`.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseSdf } from './parse-sdf.mjs'
import { checkConfiguration, noteProblem, parseCiaawAbridged, parseNistIe, parsePubChem } from './periodic-table-lib.mjs'
import { checkReagents, checkSupported, mergeHazards, newSources } from './aqueous-lib.mjs'
import { buildMechanism } from './mechanism-lib.mjs'
import { observedLines, parseNistLines, spectrumFromSaved } from './emission-lib.mjs'
import { checkFlameLines } from './flame-lib.mjs'
import { checkMolarMasses, checkWorkedOut, withSharedHazards, withSharedSheets } from './calorimetry-lib.mjs'
import { checkAtomicWeights, checkBench, checkWorkedOut as checkCationsWorkedOut } from './cations-lib.mjs'
import { checkBench as checkLechatelierBench, checkWorkedOut as checkLechatelierWorkedOut } from './lechatelier-lib.mjs'
import { checkMixtures, checkRateRecord, checkReactions, checkUsedUp } from './clock-lib.mjs'
import { checkEstimates, checkScale, checkWorkedOut as checkCabbageWorkedOut } from './cabbage-lib.mjs'
import { checkMetalDensities, checkTellApart, checkWorkedOut as checkDensityWorkedOut } from './density-lib.mjs'
import { checkMeasured, checkMolarMasses as checkFreezingMolarMasses, checkNumbers } from './freezing-lib.mjs'
import { checkBench as checkReactionsBench, checkEquations, checkOrder, checkSeen, checkTiles } from './reactions-lib.mjs'
import { checkBench as checkMixingBench, checkLayers, checkMolecules, checkParts as checkMixingParts, checkSourced, withSharedNote } from './mixing-lib.mjs'
import { checkChange, checkDilution, checkDirections, checkDissolves, checkMolarMasses as checkHotcoldMolarMasses, checkWorkedOut as checkHotcoldWorkedOut } from './hotcold-lib.mjs'
import { checkExcess, checkMixtures as checkAcetoneMixtures, checkRateRecord as checkAcetoneRateRecord, checkReaction as checkAcetoneReaction } from './acetone-lib.mjs'
import { checkAnnualMean, checkMolecularWeight, checkPublished, checkSha256, checkSheetHazards, checkWikipediaCopy } from './titration-lib.mjs'

const root = join(import.meta.dirname, '..')
const research = join(root, 'docs/research/phase-2')
const periodicResearch = join(root, 'docs/research/periodic-table')
const titrationResearch = join(root, 'docs/research/phase-3')
const aqueousResearch = join(root, 'docs/research/phase-4')
const mechanismResearch = join(root, 'docs/research/phase-5')
const emissionResearch = join(root, 'docs/research/emission-spectra')
const flameResearch = join(root, 'docs/research/flame')
const calorimetryResearch = join(root, 'docs/research/calorimetry')
const cationsResearch = join(root, 'docs/research/cations')
const lechatelierResearch = join(root, 'docs/research/lechatelier')
const clockResearch = join(root, 'docs/research/clock')
const cabbageResearch = join(root, 'docs/research/cabbage')
const densityResearch = join(root, 'docs/research/density')
const freezingResearch = join(root, 'docs/research/freezing')
const reactionsResearch = join(root, 'docs/research/reactions')
const mixingResearch = join(root, 'docs/research/mixing')
const hotcoldResearch = join(root, 'docs/research/hotcold')
const acetoneResearch = join(root, 'docs/research/acetone')
const out = join(root, 'src/chem-data')

function fail(message) {
  throw new Error(message)
}
const readJson = (name) => JSON.parse(readFileSync(join(research, name), 'utf8'))
const toJson = (value) => JSON.stringify(value, null, 2) + '\n'

// ---------------------------------------------------------------------------
// Authored tables. These are authored structure and display text, which the
// spec exempts from citation.

// id, PubChem CID, display name, formula, topic. The order here is the library order.
// The formula is written the way general chemistry texts write it (condensed
// for organic molecules), in plain digits and without the charge; the build
// checks it against the atom list.
const LIBRARY = [
  ['water', 962, 'Water', 'H2O', 'basics'],
  ['carbon-dioxide', 280, 'Carbon dioxide', 'CO2', 'basics'],
  ['ammonia', 222, 'Ammonia', 'NH3', 'basics'],
  ['methane', 297, 'Methane', 'CH4', 'basics'],
  ['oxygen', 977, 'Oxygen (O₂)', 'O2', 'basics'],
  ['nitrogen', 947, 'Nitrogen (N₂)', 'N2', 'basics'],
  ['hydrogen-chloride', 313, 'Hydrogen chloride', 'HCl', 'basics'],
  ['hydrogen-peroxide', 784, 'Hydrogen peroxide', 'H2O2', 'basics'],
  ['hydrogen', 783, 'Hydrogen (H₂)', 'H2', 'basics'],
  ['chlorine', 24526, 'Chlorine (Cl₂)', 'Cl2', 'basics'],
  ['hydrogen-fluoride', 14917, 'Hydrogen fluoride', 'HF', 'basics'],
  ['carbon-monoxide', 281, 'Carbon monoxide', 'CO', 'basics'],
  ['ozone', 24823, 'Ozone', 'O3', 'basics'],
  ['hydrogen-sulfide', 402, 'Hydrogen sulfide', 'H2S', 'basics'],
  ['hydrogen-cyanide', 768, 'Hydrogen cyanide', 'HCN', 'basics'],
  ['nitric-acid', 944, 'Nitric acid', 'HNO3', 'basics'],
  ['sulfuric-acid', 1118, 'Sulfuric acid', 'H2SO4', 'basics'],
  ['phosphoric-acid', 1004, 'Phosphoric acid', 'H3PO4', 'basics'],
  ['hydroxide', 961, 'Hydroxide ion', 'OH', 'basics'],
  ['ammonium', 223, 'Ammonium ion', 'NH4', 'basics'],
  ['nitrate', 943, 'Nitrate ion', 'NO3', 'basics'],
  ['carbonate', 19660, 'Carbonate ion', 'CO3', 'basics'],
  ['sulfate', 1117, 'Sulfate ion', 'SO4', 'basics'],
  ['phosphate', 1061, 'Phosphate ion', 'PO4', 'basics'],
  ['acetate', 175, 'Acetate ion', 'CH3COO', 'basics'],
  ['boron-trifluoride', 6356, 'Boron trifluoride', 'BF3', 'vsepr'],
  ['sulfur-dioxide', 1119, 'Sulfur dioxide', 'SO2', 'vsepr'],
  ['sulfur-hexafluoride', 17358, 'Sulfur hexafluoride', 'SF6', 'vsepr'],
  ['xenon-tetrafluoride', 123324, 'Xenon tetrafluoride', 'XeF4', 'vsepr'],
  ['phosphorus-pentachloride', 24819, 'Phosphorus pentachloride', 'PCl5', 'vsepr'],
  ['sulfur-trioxide', 24682, 'Sulfur trioxide', 'SO3', 'vsepr'],
  ['phosphorus-trichloride', 24387, 'Phosphorus trichloride', 'PCl3', 'vsepr'],
  ['carbon-tetrachloride', 5943, 'Carbon tetrachloride', 'CCl4', 'vsepr'],
  ['dichloromethane', 6344, 'Dichloromethane', 'CH2Cl2', 'vsepr'],
  ['chloroform', 6212, 'Chloroform', 'CHCl3', 'vsepr'],
  ['sulfur-tetrafluoride', 24555, 'Sulfur tetrafluoride', 'SF4', 'vsepr'],
  ['chlorine-trifluoride', 24637, 'Chlorine trifluoride', 'ClF3', 'vsepr'],
  ['xenon-difluoride', 83674, 'Xenon difluoride', 'XeF2', 'vsepr'],
  ['ethane', 6324, 'Ethane', 'C2H6', 'organic'],
  ['ethene', 6325, 'Ethene', 'C2H4', 'organic'],
  ['ethyne', 6326, 'Ethyne', 'C2H2', 'organic'],
  ['ethanol', 702, 'Ethanol', 'C2H5OH', 'organic'],
  ['acetic-acid', 176, 'Acetic acid', 'CH3COOH', 'organic'],
  ['acetone', 180, 'Acetone', 'CH3COCH3', 'organic'],
  ['formaldehyde', 712, 'Formaldehyde', 'CH2O', 'organic'],
  ['methylamine', 6329, 'Methylamine', 'CH3NH2', 'organic'],
  ['ethyl-acetate', 8857, 'Ethyl acetate', 'CH3COOC2H5', 'organic'],
  ['acetamide', 178, 'Acetamide', 'CH3CONH2', 'organic'],
  ['benzene', 241, 'Benzene', 'C6H6', 'organic'],
  ['methanol', 887, 'Methanol', 'CH3OH', 'organic'],
  ['dimethyl-ether', 8254, 'Dimethyl ether', 'CH3OCH3', 'organic'],
  ['propane', 6334, 'Propane', 'C3H8', 'organic'],
  ['butane', 7843, 'Butane', 'CH3CH2CH2CH3', 'organic'],
  ['isobutane', 6360, '2-Methylpropane (isobutane)', 'CH(CH3)3', 'organic'],
  ['cyclohexane', 8078, 'Cyclohexane', 'C6H12', 'organic'],
  ['propene', 8252, 'Propene', 'C3H6', 'organic'],
  ['acetaldehyde', 177, 'Acetaldehyde', 'CH3CHO', 'organic'],
  ['formic-acid', 284, 'Formic acid', 'HCOOH', 'organic'],
  ['toluene', 1140, 'Toluene', 'C6H5CH3', 'organic'],
  ['phenol', 996, 'Phenol', 'C6H5OH', 'organic'],
  ['acetonitrile', 6342, 'Acetonitrile', 'CH3CN', 'organic'],
  ['diethyl-ether', 3283, 'Diethyl ether', 'C2H5OC2H5', 'organic'],
  ['beta-d-glucopyranose', 64689, 'β-D-Glucopyranose', 'C6H12O6', 'biomolecules'],
  ['glycine', 750, 'Glycine', 'NH2CH2COOH', 'biomolecules'],
  ['glycine-zwitterion', 5257127, 'Glycine', 'NH3CH2COO', 'biomolecules'],
  ['alanine', 5950, 'L-Alanine', 'CH3CH(NH2)COOH', 'biomolecules'],
  ['alanine-zwitterion', 7311724, 'L-Alanine', 'CH3CH(NH3)COO', 'biomolecules'],
  ['urea', 1176, 'Urea', 'CO(NH2)2', 'biomolecules'],
  ['glycerol', 753, 'Glycerol', 'C3H5(OH)3', 'biomolecules'],
  ['lactic-acid', 107689, 'L-Lactic acid', 'CH3CH(OH)COOH', 'biomolecules'],
  ['citric-acid', 311, 'Citric acid', 'C6H8O7', 'biomolecules'],
  ['serine', 5951, 'L-Serine', 'HOCH2CH(NH2)COOH', 'biomolecules'],
  ['serine-zwitterion', 6857581, 'L-Serine', 'HOCH2CH(NH3)COO', 'biomolecules'],
  ['cysteine', 5862, 'L-Cysteine', 'HSCH2CH(NH2)COOH', 'biomolecules'],
  ['cysteine-zwitterion', 6419722, 'L-Cysteine', 'HSCH2CH(NH3)COO', 'biomolecules'],
  ['adenine', 190, 'Adenine', 'C5H5N5', 'biomolecules'],
  ['thymine', 1135, 'Thymine', 'C5H6N2O2', 'biomolecules'],
  ['beta-d-fructofuranose', 439709, 'Fructose (β-D-fructofuranose)', 'C6H12O6', 'biomolecules'],
  ['sucrose', 5988, 'Sucrose', 'C12H22O11', 'biomolecules'],
  ['palmitic-acid', 985, 'Palmitic acid', 'CH3(CH2)14COOH', 'biomolecules'],
  ['caffeine', 2519, 'Caffeine', 'C8H10N4O2', 'everyday'],
  ['aspirin', 2244, 'Aspirin (acetylsalicylic acid)', 'C9H8O4', 'everyday'],
  ['acetaminophen', 1983, 'Acetaminophen (paracetamol)', 'C8H9NO2', 'everyday'],
  ['ibuprofen', 3672, 'Ibuprofen', 'C13H18O2', 'everyday'],
  ['vanillin', 1183, 'Vanillin', 'C8H8O3', 'everyday'],
  ['menthol', 16666, 'Menthol', 'C10H20O', 'everyday'],
  ['limonene', 440917, 'Limonene', 'C10H16', 'everyday'],
  ['capsaicin', 1548943, 'Capsaicin', 'C18H27NO3', 'everyday'],
  ['cinnamaldehyde', 637511, 'Cinnamaldehyde', 'C9H8O', 'everyday'],
  ['ascorbic-acid', 54670067, 'Ascorbic acid (vitamin C)', 'C6H8O6', 'everyday'],
  ['theobromine', 5429, 'Theobromine', 'C7H8N4O2', 'everyday'],
  ['nicotine', 89594, 'Nicotine', 'C10H14N2', 'everyday'],
  ['isoamyl-acetate', 31276, 'Isoamyl acetate', 'C7H14O2', 'everyday'],
  ['methyl-salicylate', 4133, 'Methyl salicylate', 'C8H8O3', 'everyday'],
  ['benzaldehyde', 240, 'Benzaldehyde', 'C6H5CHO', 'everyday'],
  ['geosmin', 29746, 'Geosmin', 'C12H22O', 'everyday'],
  ['dopamine', 681, 'Dopamine', 'C8H11NO2', 'everyday'],
  ['serotonin', 5202, 'Serotonin', 'C10H12N2O', 'everyday'],
  ['adrenaline', 5816, 'Adrenaline (epinephrine)', 'C9H13NO3', 'everyday'],
  ['indigo', 5318432, 'Indigo', 'C16H10N2O2', 'everyday'],
  ['isooctane', 10907, '2,2,4-Trimethylpentane (isooctane)', '(CH3)3CCH2CH(CH3)2', 'everyday'],
  ['aspartame', 134601, 'Aspartame', 'C14H18N2O5', 'everyday'],
  ['hydronium', 123332, 'Hydronium ion', 'H3O', 'mechanism'],
  ['bicarbonate', 769, 'Bicarbonate ion', 'HCO3', 'mechanism'],
  ['carbonic-acid', 767, 'Carbonic acid', 'H2CO3', 'mechanism'],
]

// Where a molecule's coordinates come from (spec 5.2). The first 13 of the Basics and VSEPR groups use cited
// experimental geometry and every other molecule of the first 33 its PubChem 3D conformer. A molecule added
// later (its pubchem.json entry has its own retrieval date) uses its PubChem conformer, and cited experimental
// geometry only where PubChem has none, or where the conformer does not have the molecule's shape or its one
// length: those are named here with the reason, which docs/research/phase-2/README.md gives in full.
const EXPERIMENTAL_TOPICS = new Set(['basics', 'vsepr'])
const CONFORMER_NOT_USED = {
  'carbon-monoxide': 'the bond of the computed conformer is 0.07 Å shorter than the measured one, and a diatomic molecule has no other geometry',
  ozone: 'the two O–O bonds of the computed conformer differ by 0.2 Å, and the real ones are equal',
  'sulfur-tetrafluoride': 'the computed conformer is tetrahedral, not a seesaw',
}

// id -> [variantGroup, variantLabel]
const VARIANTS = {
  glycine: ['glycine', 'Neutral'],
  'glycine-zwitterion': ['glycine', 'Zwitterion'],
  alanine: ['alanine', 'Neutral'],
  'alanine-zwitterion': ['alanine', 'Zwitterion'],
  serine: ['serine', 'Neutral'],
  'serine-zwitterion': ['serine', 'Zwitterion'],
  cysteine: ['cysteine', 'Neutral'],
  'cysteine-zwitterion': ['cysteine', 'Zwitterion'],
}

// A zwitterion's net charge is zero, so its formula alone would hide the two charges.
// The display formula marks each charged group; the build checks it against the formula.
const DISPLAY_FORMULAS = {
  'glycine-zwitterion': '+NH3CH2COO-',
  'alanine-zwitterion': 'CH3CH(NH3+)COO-',
  'serine-zwitterion': 'HOCH2CH(NH3+)COO-',
  'cysteine-zwitterion': 'HSCH2CH(NH3+)COO-',
}

// 33 in the first library (spec 6.1) and the 72 added on 2026-10-09.
const STRUCTURES = 105

const CONFORMER = 'One conformer of many.'
const ZWITTERION = 'The form found in water and in the solid; the model is a computed conformer.'
/** The note of a molecule stored in the octet-obeying form where PubChem's record draws an expanded valence shell. */
const octetNote = (drawn, pubchemDraws, centre, kind = '') =>
  `Drawn in the octet-obeying ${kind}form (${drawn}), as sulfur dioxide is. Both drawings are in use: PubChem's record draws ${pubchemDraws} instead, which lowers the formal charges and gives ${centre} more than eight electrons.`
const NOTES = {
  'phosphorus-pentachloride': ['Gas-phase structure. The axial and equatorial P–Cl bond lengths differ.'],
  'hydrogen-peroxide': [
    'The H–O–O angle of 94.8° is the 1962 measurement NIST lists; later measurements give about 100–102°.',
  ],
  'sulfur-dioxide': [
    'Drawn in the octet-obeying resonance form (one S=O, one S–O, formal charges +1 on S and −1 on one O), as in OpenStax Chemistry 2e.',
  ],
  bicarbonate: [
    'The two unprotonated C–O bonds are equivalent in the real ion; the computed conformer shows them at different lengths.',
  ],
  'glycine-zwitterion': [ZWITTERION],
  'alanine-zwitterion': [ZWITTERION],
  'serine-zwitterion': [ZWITTERION],
  'cysteine-zwitterion': [ZWITTERION],
  // What NIST's page for each prints, read on 2026-10-09 (docs/research/phase-2/README.md).
  'nitric-acid': [
    'The two N–O bonds to the oxygens that carry no hydrogen are close to equal in the real molecule, not equal: NIST lists 1.199 Å and 1.211 Å.',
  ],
  'sulfur-tetrafluoride': ['Gas-phase structure. The axial S–F bonds are longer than the equatorial ones.'],
  'chlorine-trifluoride': ['Gas-phase structure. The two axial Cl–F bonds are longer than the equatorial one.'],
  // Drawn as sulfur dioxide is (spec 6.1). PubChem's record of each was read for how it draws it.
  'sulfur-trioxide': [octetNote('one S=O and two S–O, formal charges +2 on S and −1 on two O', 'three S=O double bonds', 'sulfur', 'resonance ')],
  sulfate: [octetNote('four S–O single bonds, formal charges +2 on S and −1 on each O', 'two S=O double bonds', 'sulfur')],
  phosphate: [octetNote('four P–O single bonds, formal charges +1 on P and −1 on each O', 'one P=O double bond', 'phosphorus')],
  'sulfuric-acid': [
    octetNote('four S–O single bonds, formal charges +2 on S and −1 on the two oxygens that carry no hydrogen', 'two S=O double bonds', 'sulfur'),
  ],
  'phosphoric-acid': [
    octetNote('four P–O single bonds, formal charges +1 on P and −1 on the oxygen that carries no hydrogen', 'one P=O double bond', 'phosphorus'),
  ],
  // One sentence that says what each molecule of the Everyday topic is, written from what its PubChem record
  // says: docs/research/phase-2/notes.json holds, for each, where in the record it was read and what was found there.
  caffeine: ['The stimulant in coffee and tea.'],
  aspirin: ['A medicine for pain, fever and inflammation.'],
  acetaminophen: ['A medicine for pain and fever.'],
  ibuprofen: ['An anti-inflammatory medicine, also used against pain and fever.'],
  vanillin: ['A flavouring with the smell of vanilla.'],
  menthol: ['The form of menthol most common in nature; it smells of peppermint.'],
  limonene: ['A plant compound with the smell of citrus.'],
  capsaicin: ['The compound that gives chili peppers their heat.'],
  cinnamaldehyde: ['A flavouring with the smell of cinnamon.'],
  'ascorbic-acid': ['Vitamin C, also added to food as an antioxidant.'],
  theobromine: ['An alkaloid of the cacao plant, found in chocolate.'],
  nicotine: ['The form of nicotine found in nature, in the tobacco plant.'],
  'isoamyl-acetate': ['An ester with the smell of bananas.'],
  'methyl-salicylate': ['An ester with the smell of wintergreen, used as a flavouring.'],
  benzaldehyde: ['A flavouring and fragrance with the smell of bitter almonds.'],
  geosmin: ['A compound with an earthy smell.'],
  dopamine: ['A neurotransmitter of the brain.'],
  serotonin: ['A neurotransmitter found in the human body.'],
  adrenaline: ['The "fight or flight" hormone, made by the adrenal glands.'],
  indigo: ['A dye. PubChem keeps that name on another record, CID 10215, which draws another form of the same molecule.'],
  isooctane: ['Used in finding the octane number of a fuel.'],
  aspartame: ['An artificial sweetener.'],
  ethanol: [CONFORMER],
  'beta-d-glucopyranose': [CONFORMER],
  'ethyl-acetate': [CONFORMER],
}

// In these structures the bonds to the terminal oxygens (the oxygens with one bond) are a resonance set, of
// two or of three: one of them drawn double, the rest drawn single.
const RESONANCE_NOTES = {
  2: 'one of two equivalent resonance structures; effective order 1.5',
  3: 'one of three equivalent resonance structures; effective order 1.33',
}
const RESONANCE_SET = {
  'sulfur-dioxide': 2,
  'glycine-zwitterion': 2,
  'alanine-zwitterion': 2,
  'serine-zwitterion': 2,
  'cysteine-zwitterion': 2,
  bicarbonate: 2,
  ozone: 2,
  'nitric-acid': 2,
  acetate: 2,
  nitrate: 3,
  carbonate: 3,
  'sulfur-trioxide': 3,
}

// How many benzene rings each of these structures has: a ring of six carbons drawn with alternating double and
// single bonds. Every bond of such a ring is aromatic, and no other bond is.
// ponytail: a benzene ring only. A ring that holds nitrogen (the pyridine ring of nicotine, the rings of adenine,
// caffeine and theobromine, the five-membered ring of serotonin) is aromatic too and is stored as drawn, because
// "order 1.5" is the textbook statement for benzene and not for those. Flag them when the bond card can say
// something truer of them than 1.5.
const BENZENE_RINGS = {
  benzene: 1,
  toluene: 1,
  phenol: 1,
  aspirin: 1,
  acetaminophen: 1,
  ibuprofen: 1,
  vanillin: 1,
  capsaicin: 1,
  cinnamaldehyde: 1,
  'methyl-salicylate': 1,
  benzaldehyde: 1,
  dopamine: 1,
  serotonin: 1,
  adrenaline: 1,
  indigo: 2,
  aspartame: 1,
}

// PubChem draws these with S=O or P=O double bonds and more than eight electrons on the central atom. They are
// stored in the octet-obeying form, as sulfur dioxide is (spec 6.1): every double bond from the sulfur or
// phosphorus atom to a terminal oxygen beyond the number kept here is drawn single, its oxygen takes a formal
// charge of -1 and the central atom +1 for each.
const OCTET_FORM = { 'sulfur-trioxide': 1, sulfate: 0, phosphate: 0, 'sulfuric-acid': 0, 'phosphoric-acid': 0 }

// Sulfur dioxide is stored in the octet resonance form (spec 6.1), not the
// two-double-bond form of the research file. Atom order is S, O, O.
const SO2 = { atoms: 'S,O,O', bonds: '0-1:2,0-2:2', orders: [2, 1], formalCharges: [1, 0, -1] }

// Authored 2D drawings, where PubChem's 2D record would teach the wrong picture in the Lewis
// view. Unit bond lengths, y up, in the drawing units of the other files; `atoms` is the atom
// order the positions are written for, which the build checks.
// - Sulfur dioxide: PubChem draws it as a straight line. Here the oxygens are at 120° to each other.
// - Ammonia and hydronium: PubChem draws a flat Y, which reads as trigonal planar. Here the three
//   hydrogens are to the sides and below, which leaves the top for the lone pair.
// - Carbon dioxide: PubChem draws it on a slant. Here it is horizontal.
const SIDES_AND_BELOW = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
]
const DRAWINGS = {
  'sulfur-dioxide': {
    atoms: SO2.atoms,
    positions: [
      [0, 0],
      [-0.866, -0.5],
      [0.866, -0.5],
    ],
  },
  ammonia: { atoms: 'N,H,H,H', positions: SIDES_AND_BELOW },
  hydronium: { atoms: 'O,H,H,H', positions: SIDES_AND_BELOW },
  'carbon-dioxide': {
    atoms: 'C,O,O',
    positions: [
      [0, 0],
      [1, 0],
      [-1, 0],
    ],
  },
  // Xenon difluoride: PubChem draws it bent. Here it is straight, as carbon dioxide is.
  'xenon-difluoride': {
    atoms: 'Xe,F,F',
    positions: [
      [0, 0],
      [1, 0],
      [-1, 0],
    ],
  },
  // Phosphorus trichloride: PubChem draws a flat Y. Here it is drawn as ammonia is, with the top left for the lone pair.
  'phosphorus-trichloride': {
    atoms: 'Cl,Cl,Cl,P',
    positions: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 0],
    ],
  },
}

// The element sources this app cites, by their id in the research file.
// `readVia` names the research source for the copy that was actually read
// when the cited paper was not; the link then goes to that copy.
const ELEMENT_SOURCES = [
  { id: 'ciaaw-abridged-2024' },
  { id: 'nist-asd-ie' },
  { id: 'pubchem-ptable' },
  {
    id: 'cordero-2008',
    readVia: 'wikipedia-covalent-radius',
    said: "The paper is paywalled and was not read: the values were checked only through secondary transcriptions that agree with each other (Wikipedia's covalent radius table, linked here, and the Open Babel element table).",
  },
  {
    id: 'mantina-2009',
    readVia: 'mantina-2009-pmc',
    said: 'Read as the free author manuscript (PMC3658832), linked here.',
  },
  {
    id: 'shannon-1976',
    readVia: 'shannon-db-imperial',
    said: 'The paper was not read: the values were checked only through a secondary transcription, the Database of Ionic Radii (Atomistic Simulation Group, Imperial College London), linked here.',
  },
  { id: 'jmol-pal-source' },
]

// Shown under the electronegativity itself, not among the element's other notes.
const ELECTRONEGATIVITY_NOTES = {
  Xe: "The value PubChem lists. It is a later estimate, not part of Pauling's original scale, and no primary source was traced.",
}

// ---------------------------------------------------------------------------
// Elements

function buildElements() {
  const file = readJson('elements.json')
  const known = new Map(file.sources.map((s) => [s.id, s]))
  const lookup = (id) => known.get(id) ?? fail(`elements.json has no source "${id}"`)
  const sources = ELEMENT_SOURCES.map(({ id, readVia, said }) => {
    const source = lookup(id)
    // dataUrl, where the research file has one, is the page that shows the values.
    if (!readVia) return { id, url: source.dataUrl ?? source.url, citation: source.citation }
    return { id, url: lookup(readVia).url, citation: `${source.citation} (${source.url}) ${said}` }
  })
  // Emission lines are their own research file, with one source per element's NIST query. An entry marked
  // superseded is kept there as history (xenon's first six lines): that element's lines are picked, as for the
  // periodic table's cards, by the rule from NIST's saved response, and the entry's source is no longer cited.
  const spectra = readJson('emission-lines.json')
  const byHand = spectra.elements.filter((x) => !x.superseded)
  sources.push(...spectra.sources.filter((source) => byHand.some((x) => x.sourceId === source.id)).map(({ id, url, citation }) => ({ id, url, citation })))
  const allowed = new Set(sources.map((s) => s.id))
  const emission = (symbol, name) => {
    const entry = spectra.elements.find((x) => x.symbol === symbol)
    if (!entry) return {}
    if (entry.superseded) {
      const { emission } = ruleSpectrum(symbol, name, savedEmissionResponses().saved)
      return { emission: emission ?? fail(`element ${symbol}: the rule finds no emission lines to replace the ones written by hand`) }
    }
    const lines = entry.lines.map((line) => {
      if (line.wavelengthNm !== Number(line.valueAsPublished)) fail(`element ${symbol}: emission line ${line.valueAsPublished} differs from the published text`)
      if (!allowed.has(entry.sourceId)) fail(`element ${symbol}: unexpected source "${entry.sourceId}"`)
      return { value: line.wavelengthNm, sourceId: entry.sourceId, published: line.valueAsPublished, ...(line.transition ? { transition: line.transition } : {}) }
    })
    if (lines.some((line, i) => i > 0 && line.value >= lines[i - 1].value)) fail(`element ${symbol}: emission lines are not longest first`)
    return { emission: { selection: entry.selection, ...(entry.note ? { note: entry.note } : {}), lines } }
  }

  const elements = file.elements.map((e) => {
    const where = `element ${e.symbol}`
    const cite = (value, sourceId) => {
      if (value === undefined || value === null) fail(`${where}: missing value`)
      if (!allowed.has(sourceId)) fail(`${where}: unexpected source "${sourceId}"`)
      return { value, sourceId }
    }

    e.ionizationEnergiesEV.forEach((ie, i) => {
      if (ie.order !== i + 1) fail(`${where}: ionization energies are out of order`)
      if (ie.value !== Number(ie.valueAsPublished)) fail(`${where}: ionization energy ${i + 1} differs from the published text`)
      if (ie.sourceId !== e.ionizationEnergiesEV[0].sourceId) fail(`${where}: ionization energies have mixed sources`)
    })
    for (const [label, cited] of [['atomic weight', e.atomicWeight], ['electronegativity', e.electronegativity]]) {
      if (typeof cited.valueAsPublished !== 'string' || cited.value !== Number(cited.valueAsPublished)) fail(`${where}: ${label} differs from the published text`)
    }
    if (e.shells.reduce((sum, n) => sum + n, 0) !== e.atomicNumber) fail(`${where}: shells do not sum to Z`)
    if (e.shells.at(-1) !== e.valenceElectrons) fail(`${where}: valence electrons are not the outer shell count`)

    // Van der Waals radii follow Mantina 2009 throughout. The research file
    // records Bondi's value first and Mantina's as an alternative where they
    // differ (hydrogen); elsewhere Mantina's table repeats Bondi's value.
    const mantina = e.vdwRadiusAlternatives?.find((a) => a.sourceId === 'mantina-2009')
    const viaMantina = e.vdwRadiusA.sourceId === 'mantina-2009' || e.vdwRadiusA.verifiedVia?.includes('mantina-2009-pmc')
    if (!viaMantina) fail(`${where}: van der Waals radius was not checked against Mantina 2009`)

    const notes = []
    if (e.covalentRadiusAlternatives) {
      const label = (a) => a.label.replace('sp3', 'sp³').replace('sp2', 'sp²')
      const list = e.covalentRadiusAlternatives.map((a) => `${label(a)} ${a.value.toFixed(2)} Å`).join(', ')
      notes.push(`The source gives one covalent radius per hybridization: ${list}. The sp³ value is stored.`)
    }
    const flagged = Object.groupBy(
      e.ionizationEnergiesEV.filter((ie) => ie.nistFlag !== 'measured'),
      (ie) => ie.nistFlag,
    )
    for (const [flag, list] of Object.entries(flagged)) {
      const orders = list.map((ie) => ie.order)
      const which = orders.length === 1 ? `energy ${orders[0]}` : `energies ${orders.slice(0, -1).join(', ')} and ${orders.at(-1)}`
      notes.push(`NIST marks ionization ${which} as ${flag}, not measured.`)
    }

    return {
      symbol: e.symbol,
      name: e.name,
      atomicNumber: e.atomicNumber,
      atomicWeight: { ...cite(e.atomicWeight.value, e.atomicWeight.sourceId), published: e.atomicWeight.valueAsPublished },
      electronegativity: {
        ...cite(e.electronegativity.value, e.electronegativity.sourceId),
        published: e.electronegativity.valueAsPublished,
        ...(ELECTRONEGATIVITY_NOTES[e.symbol] ? { note: ELECTRONEGATIVITY_NOTES[e.symbol] } : {}),
      },
      configuration: cite(e.configuration, e.configurationSourceId),
      shells: cite(e.shells, e.configurationSourceId),
      ionizationEnergiesEv: cite(
        e.ionizationEnergiesEV.map((ie) => ie.value),
        e.ionizationEnergiesEV[0].sourceId,
      ),
      covalentRadius: cite(e.covalentRadiusA.value, e.covalentRadiusA.sourceId),
      vdwRadius: cite(mantina?.value ?? e.vdwRadiusA.value, 'mantina-2009'),
      ionicRadii: e.ionicRadii.map((r) => ({
        charge: r.charge,
        coordination: r.coordination,
        ...cite(r.valueA, r.sourceId),
      })),
      color: cite(e.colorHex, e.colorSourceId),
      ...emission(e.symbol, e.name),
      ...(notes.length > 0 ? { notes } : {}),
      sourceId: cite(e.atomicNumber, e.atomicNumberSourceId).sourceId,
    }
  })
  elements.sort((a, b) => a.atomicNumber - b.atomicNumber)
  if (elements.length !== 11) fail(`expected 11 elements, found ${elements.length}`)
  return { elements, sources }
}

// ---------------------------------------------------------------------------
// Structures

function readSdf(fileId, kind) {
  const name = `${fileId}-${kind}.sdf`
  const records = parseSdf(readFileSync(join(research, 'sdf', name), 'utf8'))
  if (records.length !== 1) fail(`${name}: expected 1 record, found ${records.length}`)
  const [record] = records
  const flat = record.atoms.every((a) => a.z === 0)
  if (kind === '2d' && !flat) fail(`${name}: a 2D record with non-zero z`)
  if (kind === '3d' && flat && record.atoms.length > 3) fail(`${name}: a 3D record with every z equal to 0`)
  return record
}

/** Maps each atom of `from` to an atom of `to` with the same element and the same connectivity, or returns null. */
// ponytail: the first match wins and geometry is ignored, so atoms that are
// trans in 3D (SF6, PCl5) need not be drawn opposite in 2D. Fine for a Lewis
// drawing of equivalent atoms; a drawing that must show axial and equatorial
// positions needs a per-molecule atom map.
function matchAtoms(from, to) {
  if (from.atoms.length !== to.atoms.length || from.bonds.length !== to.bonds.length) return null
  const neighbours = (m) =>
    m.atoms.map((_, i) => new Set(m.bonds.flatMap(({ a, b }) => (a === i ? [b] : b === i ? [a] : []))))
  const fromN = neighbours(from)
  const toN = neighbours(to)
  const map = []
  const used = new Set()
  const place = (i) => {
    if (i === from.atoms.length) return true
    for (let j = 0; j < to.atoms.length; j++) {
      if (used.has(j) || to.atoms[j].element !== from.atoms[i].element || toN[j].size !== fromN[i].size) continue
      if (map.some((mapped, k) => fromN[i].has(k) !== toN[j].has(mapped))) continue
      map[i] = j
      used.add(j)
      if (place(i + 1)) return true
      used.delete(j)
      map.length = i
    }
    return false
  }
  return place(0) ? map : null
}

// A 2D record writes a wedge bond starting at its stereocentre, so the two ends are compared in sorted order.
const bondTable = (m) => m.bonds.map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}:${b.order}`).join(',')
const elementList = (m) => m.atoms.map((a) => a.element).join(',')

/** Atoms as { element, position, formalCharge }, bonds as { a, b, order }, and each atom's index in the 2D record. */
function experimentalStructure(id, geo, drawing) {
  // A formal charge in the research file is authored structure, given only where it is not zero (ozone).
  const atoms = geo.atoms.map((a) => ({ element: a.element, position: [a.x, a.y, a.z], formalCharge: a.formalCharge ?? 0 }))
  const bonds = geo.bondList.map(({ a, b, order }) => ({ a, b, order }))
  if (id === 'sulfur-dioxide') {
    if (elementList({ atoms }) !== SO2.atoms || bondTable({ bonds }) !== SO2.bonds) {
      fail('sulfur-dioxide: the research structure is not the S, O, O with two double bonds this script rewrites')
    }
    bonds.forEach((bond, i) => (bond.order = SO2.orders[i]))
    atoms.forEach((atom, i) => (atom.formalCharge = SO2.formalCharges[i]))
  }
  const to2d = matchAtoms({ atoms, bonds }, drawing) ?? fail(`${id}: no atom match between the experimental structure and the 2D record`)
  return { atoms, bonds, to2d }
}

function pubchemStructure(id, model, drawing) {
  const same =
    elementList(model) === elementList(drawing) &&
    bondTable(model) === bondTable(drawing) &&
    model.atoms.every((a, i) => a.charge === drawing.atoms[i].charge)
  if (!same) fail(`${id}: the 2D and 3D records differ in atom order, bonds or charges`)
  const atoms = model.atoms.map((a) => ({ element: a.element, position: [a.x, a.y, a.z], formalCharge: a.charge }))
  const bonds = model.bonds.map(({ a, b, order }) => ({ a, b, order }))
  return { atoms, bonds, to2d: atoms.map((_, i) => i) }
}

function measurements(id, geo, sourceId) {
  const entries = (list, size, valueKey) =>
    list.flatMap((m) => {
      const sets = m.appliesTo ?? [m.atoms]
      if (!sets.some((set) => set.join() === m.atoms.join())) fail(`${id}: ${m.label} does not list its own atoms`)
      return sets.map((atoms) => {
        if (atoms.length !== size || typeof m[valueKey] !== 'number') fail(`${id}: malformed measurement ${m.label}`)
        // A value the molecule's point group fixes is stored with that point group, whether or not the source
        // prints a figure for it, so that the card says so of every such value.
        if (m.fixedBySymmetry === true && !geo.pointGroup) fail(`${id}: ${m.label} is marked as fixed by symmetry but the molecule has no point group`)
        const symmetry = m.fixedBySymmetry === true ? { symmetry: geo.pointGroup } : {}
        // The text the source prints for the value, or null where its table has no row for it. Such a value
        // must be one the point group fixes.
        const published = m.valueAsPublished
        if (published === null) {
          if (m.fixedBySymmetry !== true) fail(`${id}: ${m.label} has no published text and is not marked as fixed by symmetry`)
          return { atoms, value: m[valueKey], sourceId, ...symmetry }
        }
        if (typeof published !== 'string' || Number(published) !== m[valueKey]) fail(`${id}: ${m.label} differs from the published text`)
        return { atoms, value: m[valueKey], sourceId, published, ...symmetry }
      })
    })
  return {
    lengths: entries(geo.bonds, 2, 'lengthA'),
    angles: entries(geo.angles, 3, 'degrees'),
    dihedrals: entries(geo.dihedrals, 4, 'degrees'),
  }
}

// One source per CCCBDB page. A page can cite a different reference for each
// row, so the citation names which measurement each reference supports.
function cccbdbSource(id, geo) {
  const rows = [...geo.bonds, ...geo.angles, ...geo.dihedrals]
  const urls = new Set(rows.map((r) => r.sourceUrl))
  if (urls.size !== 1) fail(`${id}: expected one CCCBDB page, found ${urls.size}`)
  const byCitation = Object.groupBy(rows, (r) => r.citation)
  const citations = Object.keys(byCitation)
  const page = /^NIST CCCBDB, Standard Reference Database 101, experimental geometry page \(retrieved [\d-]+\)/
  let citation = citations[0]
  if (citations.length > 1) {
    const prefix = page.exec(citation)?.[0] ?? fail(`${id}: unrecognised CCCBDB citation "${citation}"`)
    const parts = citations.map((text) => {
      if (!text.startsWith(prefix)) fail(`${id}: unrecognised CCCBDB citation "${text}"`)
      const reference = text.slice(prefix.length).replace(/^[,:]\s*(citing:\s*)?/, '')
      return `${byCitation[text].map((r) => r.label).join(', ')}: ${reference}`
    })
    citation = `${prefix}. ${parts.join(' | ')}`
  }
  return { id: `cccbdb-${id}`, url: [...urls][0], citation }
}

/** Rewrites a structure named in OCTET_FORM to its octet-obeying form, in place. */
function toOctetForm(id, { atoms, bonds }) {
  const centres = atoms.flatMap((a, i) => (a.element === 'S' || a.element === 'P' ? [i] : []))
  if (centres.length !== 1) fail(`${id}: expected one sulfur or phosphorus atom`)
  const [centre] = centres
  const far = (bond) => (bond.a === centre ? bond.b : bond.a)
  const degree = (i) => bonds.filter((b) => b.a === i || b.b === i).length
  const doubles = bonds.filter((b) => b.order === 2 && (b.a === centre || b.b === centre) && atoms[far(b)].element === 'O' && degree(far(b)) === 1)
  if (doubles.length <= OCTET_FORM[id]) fail(`${id}: no double bond from the central atom to rewrite`)
  for (const bond of doubles.slice(OCTET_FORM[id])) {
    bond.order = 1
    atoms[far(bond)].formalCharge -= 1
    atoms[centre].formalCharge += 1
  }
}

/** The bonds of every benzene ring of a structure, one list per ring: six carbons joined in a ring by alternating double and single bonds. */
function benzeneRings({ atoms, bonds }) {
  const isCarbon = (i) => atoms[i].element === 'C'
  const carbonBonds = (i) => bonds.filter((b) => (b.a === i || b.b === i) && isCarbon(b.a) && isCarbon(b.b))
  // A ring is found from each of its atoms in both directions, so rings are kept by their sorted atoms.
  const rings = new Map()
  const extend = (path, used) => {
    const last = path.at(-1)
    for (const bond of carbonBonds(last)) {
      if (used.includes(bond)) continue
      const next = bond.a === last ? bond.b : bond.a
      if (used.length === 5 && next === path[0]) {
        const ring = [...used, bond]
        if (ring.every((b, k) => b.order === (k % 2 === 0 ? ring[0].order : 3 - ring[0].order))) rings.set([...path].sort((p, q) => p - q).join(), ring)
      } else if (used.length < 5 && !path.includes(next)) extend([...path, next], [...used, bond])
    }
  }
  atoms.forEach((_, i) => isCarbon(i) && extend([i], []))
  return [...rings.values()]
}

// The Lewis view fits a drawing to a frame about 1.9 times as wide as it is tall, and never draws a bond longer
// than it would in a drawing of 4.4 by 3.1 bond lengths (MIN_WIDTH and MIN_HEIGHT of src/app/explore/lewisLayout.ts).
const LEWIS_FRAME = { width: 1.9, height: 1, minWidth: 4.4, minHeight: 3.1, margin: 1 }
// A turn by a multiple of 30° keeps the bonds of a PubChem layout on the directions they were drawn in. The smaller turn comes first.
const LEWIS_TURNS = [0, 30, -30, 60, -60, 90]

/**
 * 2D positions turned as a whole, by the one of LEWIS_TURNS that lets the Lewis view draw them largest; not
 * turned unless that gains a tenth, so a small molecule, and one that already lies along the frame, stays as PubChem drew it.
 */
function turnedToFit(positions) {
  const turn = (degrees) => {
    const [cos, sin] = [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)]
    return positions.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
  }
  const size = (values) => Math.max(...values) - Math.min(...values)
  const scale = (points) => {
    const width = Math.max(size(points.map((p) => p[0])) + LEWIS_FRAME.margin, LEWIS_FRAME.minWidth)
    const height = Math.max(size(points.map((p) => p[1])) + LEWIS_FRAME.margin, LEWIS_FRAME.minHeight)
    return Math.min(LEWIS_FRAME.width / width, LEWIS_FRAME.height / height)
  }
  const asDrawn = scale(positions)
  const best = LEWIS_TURNS.map(turn).reduce((a, b) => (scale(b) > scale(a) * 1.0001 ? b : a))
  if (scale(best) < asDrawn * 1.1) return positions
  // PubChem writes its 2D positions to four decimals.
  return best.map(([x, y]) => [Number(x.toFixed(4)) + 0, Number(y.toFixed(4)) + 0])
}

function pubchemSource(cid, entry, pattern, retrieved) {
  if (!pattern.includes('<cid>')) fail('pubchem.json: perRecordCitationPattern has no <cid>')
  const wording = pattern.replace(/ \(or [^)]*\)$/, '').replaceAll('<cid>', String(cid))
  return {
    id: `pubchem-cid-${cid}`,
    url: entry.recordUrl,
    citation: `PubChem, National Library of Medicine (NCBI). ${wording} (retrieved ${retrieved})`,
  }
}

/** A canonical, order-free summary of a structure, for comparing with the research table. */
function summary(atoms, bonds, elementOf) {
  return [
    ...atoms.map((a) => `atom ${a.element} charge ${a.formalCharge} lone pairs ${a.lonePairs}`),
    ...bonds.map((b) => {
      const ends = [elementOf(b.a), elementOf(b.b)].sort().join('-')
      return `bond ${ends} order ${b.order} aromatic ${b.aromatic} note ${b.resonanceNote ?? 'none'}`
    }),
  ]
    .sort()
    .join('\n')
}

// Keep in step with formulaElements in src/chem-data/formula.ts; registry.test.ts cross-checks the two.
/** The element symbols a formula writes, one per atom. Handles one level of parentheses with a multiplier, as in CO(NH2)2. */
function formulaElements(formula) {
  const expand = (text) =>
    [...text.matchAll(/([A-Z][a-z]?)(\d*)/g)].flatMap(([, element, count]) => Array(Number(count || 1)).fill(element))
  const outside = formula.replace(/\([^()]*\)\d*/g, '')
  if (/[()]/.test(outside)) fail(`the formula ${formula} has unbalanced or nested parentheses`)
  const groups = [...formula.matchAll(/\(([^()]*)\)(\d*)/g)].flatMap(([, inner, times]) =>
    Array.from({ length: Number(times || 1) }, () => expand(inner)).flat(),
  )
  return [...expand(outside), ...groups]
}

function buildMolecules(elements) {
  const geometry = readJson('geometry.json').molecules
  const pubchem = readJson('pubchem.json')
  const expected = readJson('expected.json').molecules
  const valence = new Map(elements.map((e) => [e.symbol, e.shells.value.at(-1)]))

  const expectedIds = expected.map((m) => m.id).sort().join()
  if (LIBRARY.map(([id]) => id).sort().join() !== expectedIds) fail('the library table and expected.json list different ids')

  const sources = []
  const molecules = LIBRARY.map(([id, cid, name, formula, topic]) => {
    const entry = pubchem.entries.find((e) => e.cid === cid) ?? fail(`${id}: no pubchem.json entry for CID ${cid}`)
    if (entry.id !== id && entry.retrieved !== undefined) fail(`${id}: its pubchem.json entry is named "${entry.id}"`)
    const drawing = readSdf(entry.id, '2d')
    const geo = geometry.find((g) => g.pubchemCid === cid)
    const isExperimental = geo !== undefined
    // See EXPERIMENTAL_TOPICS for the rule; an entry of the first 33 has no retrieval date of its own.
    const wantExperimental = entry.retrieved === undefined ? EXPERIMENTAL_TOPICS.has(topic) : !entry.has3d || id in CONFORMER_NOT_USED
    if (isExperimental !== wantExperimental) fail(`${id}: geometry.json ${geo ? 'holds' : 'does not hold'} it, against the rule for where its coordinates come from`)
    if (id in CONFORMER_NOT_USED && !entry.has3d) fail(`${id}: named as a conformer that is not used, but PubChem has none`)

    const source = isExperimental ? cccbdbSource(id, geo) : pubchemSource(cid, entry, pubchem.perRecordCitationPattern, entry.retrieved ?? pubchem.retrieved)
    sources.push(source)
    const structure = isExperimental
      ? experimentalStructure(id, geo, drawing)
      : pubchemStructure(id, readSdf(entry.id, '3d'), drawing)
    if (id in OCTET_FORM) toOctetForm(id, structure)

    const degree = structure.atoms.map(() => 0)
    const orderSum = structure.atoms.map(() => 0)
    for (const bond of structure.bonds) {
      if (![1, 2, 3].includes(bond.order)) fail(`${id}: bond ${bond.a}-${bond.b} has order ${bond.order}`)
      for (const end of [bond.a, bond.b]) {
        degree[end] += 1
        orderSum[end] += bond.order
      }
    }
    const elementOf = (i) => structure.atoms[i].element
    const authored = DRAWINGS[id]
    if (authored && elementList(structure) !== authored.atoms) fail(`${id}: the authored drawing is written for the atoms ${authored.atoms}`)

    const atoms = structure.atoms.map((atom, i) => {
      const electrons = valence.get(atom.element) ?? fail(`${id}: element ${atom.element} is not in elements.json`)
      const lonePairs = (electrons - atom.formalCharge - orderSum[i]) / 2
      if (!Number.isInteger(lonePairs) || lonePairs < 0) {
        fail(`${id}: atom ${i} (${atom.element}) would have ${lonePairs} lone pairs`)
      }
      const flat = drawing.atoms[structure.to2d[i]]
      // 2D positions are PubChem drawing units with y pointing up.
      const position2d = authored ? authored.positions[i] : [flat.x, flat.y]
      return { element: atom.element, position: atom.position, position2d, formalCharge: atom.formalCharge, lonePairs }
    })
    // PubChem's layout of a long molecule can stand on end or on a slant (aspartame, capsaicin), and the Lewis
    // view's frame is wider than it is tall. The layout of a molecule added after the first 33 is turned to lie along it.
    if (!authored && entry.retrieved !== undefined) {
      const turned = turnedToFit(atoms.map((a) => a.position2d))
      atoms.forEach((atom, i) => (atom.position2d = turned[i]))
    }

    const isTerminalO = (i) => elementOf(i) === 'O' && degree[i] === 1
    const rings = benzeneRings(structure)
    if (rings.length !== (BENZENE_RINGS[id] ?? 0)) fail(`${id}: found ${rings.length} benzene rings, expected ${BENZENE_RINGS[id] ?? 0}`)
    const ringBonds = new Set(rings.flat())
    const bonds = structure.bonds.map((bond) => ({
      a: bond.a,
      b: bond.b,
      order: bond.order,
      aromatic: ringBonds.has(bond),
      ...(id in RESONANCE_SET && (isTerminalO(bond.a) || isTerminalO(bond.b)) ? { resonanceNote: RESONANCE_NOTES[RESONANCE_SET[id]] } : {}),
    }))
    const noted = bonds.filter((b) => b.resonanceNote)
    if (id in RESONANCE_SET) {
      const centres = noted.flatMap((b) => [b.a, b.b]).filter((i) => !isTerminalO(i))
      if (noted.map((b) => b.order).sort().join() !== (RESONANCE_SET[id] === 2 ? '1,2' : '1,1,2') || new Set(centres).size !== 1) {
        fail(`${id}: expected a resonance set of ${RESONANCE_SET[id]} bonds from one atom, one of them double`)
      }
    }

    const written = formulaElements(formula)
    if (written.sort().join() !== atoms.map((a) => a.element).sort().join()) {
      fail(`${id}: the formula ${formula} does not match the atom list`)
    }

    const charge = atoms.reduce((sum, a) => sum + a.formalCharge, 0)
    const table = expected.find((m) => m.id === id)
    const element = (label) => label.replace(/\d+$/, '')
    const tableSummary = summary(
      table.atoms,
      table.bonds.map((b) => ({ ...b, a: element(b.a), b: element(b.b) })),
      (e) => e,
    )
    if (charge !== table.charge || charge !== entry.charge || summary(atoms, bonds, elementOf) !== tableSummary) {
      fail(`${id}: the built Lewis structure differs from expected.json`)
    }

    const displayFormula = DISPLAY_FORMULAS[id]
    if (displayFormula && displayFormula.replace(/[+-]/g, '') !== formula) {
      fail(`${id}: the display formula ${displayFormula} is not ${formula} with charge markers`)
    }

    const variant = VARIANTS[id]
    // A molecule added after the first 33 says that its model is one conformer of many where PubChem lists more
    // than one conformer for its record. (Of the first 33, the three that say so are named in NOTES.)
    const oneOfMany = entry.retrieved !== undefined && !isExperimental && entry.conformerCount3D > 1 && !NOTES[id]?.includes(ZWITTERION)
    const notes = [...(NOTES[id] ?? []), ...(oneOfMany ? [CONFORMER] : [])]
    if (topic === 'everyday' && !NOTES[id]) fail(`${id}: a molecule of the Everyday topic needs the sentence that says what it is`)
    return {
      id,
      name,
      formula,
      ...(displayFormula ? { displayFormula } : {}),
      pubchemCid: cid,
      topic,
      ...(variant ? { variantGroup: variant[0], variantLabel: variant[1] } : {}),
      charge,
      atoms,
      bonds,
      geometrySource: isExperimental ? 'cited-experimental' : 'pubchem-computed',
      ...(isExperimental ? { measurements: measurements(id, geo, source.id) } : {}),
      ...(notes.length > 0 ? { notes } : {}),
      sourceId: source.id,
    }
  })

  for (const id of [VARIANTS, DISPLAY_FORMULAS, NOTES, DRAWINGS, RESONANCE_SET, BENZENE_RINGS, OCTET_FORM, CONFORMER_NOT_USED].flatMap(Object.keys)) {
    if (!molecules.some((m) => m.id === id)) fail(`an authored table names "${id}", which is not in the library`)
  }
  if (molecules.length !== STRUCTURES) fail(`expected ${STRUCTURES} structures, built ${molecules.length}`)
  return { molecules, sources }
}

// ---------------------------------------------------------------------------
// Molecular orbital diagrams

const MO_SOURCE_ID = 'openstax-chem2e-8.4'
// OpenStax Chemistry 2e is licensed CC BY 4.0, which is what lets the descriptions in src/chem-data/periodic.ts keep
// the passages read there. Every citation of the book carries the licence and the attribution OpenStax asks for.
const OPENSTAX_LICENCE =
  'Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction'
// The research file spells the labels out; the app shows the symbols.
const MO_LABELS = { sigma2s: 'σ2s', 'sigma*2s': 'σ*2s', sigma2p: 'σ2p', 'sigma*2p': 'σ*2p', pi2p: 'π2p', 'pi*2p': 'π*2p' }

// The research note on a molecule's Lewis structure that its MO diagram must carry as a callout
// (spec 6.4). The note points at the research file's own mo[] list, which the app text leaves out.
const MO_CALLOUT_FOR = ['oxygen']
const MO_CALLOUT_POINTER = ' (see mo[])'

function moCallout(expected, id) {
  const note = expected.molecules.find((m) => m.id === id)?.notes
  if (typeof note !== 'string' || !note.includes(MO_CALLOUT_POINTER)) fail(`expected.json: ${id} has no Lewis and MO note`)
  return `The ${note.replace(MO_CALLOUT_POINTER, '')}`
}

function buildMoDiagrams(molecules) {
  const expected = readJson('expected.json')
  const research = expected.mo
  if (research.map((d) => d.id).join() !== 'oxygen,nitrogen') fail('expected.json: expected MO diagrams for oxygen and nitrogen')
  const [{ sourceUrl: url, citation }] = research
  if (!citation.includes('OpenStax')) fail('expected.json: the MO diagrams are expected to cite OpenStax, whose licence line is added below')
  const diagrams = research.map((d) => {
    if (!molecules.some((m) => m.id === d.id)) fail(`MO diagram ${d.id}: not in the library`)
    if (d.sourceUrl !== url || d.citation !== citation) fail(`MO diagram ${d.id}: expected one source for both diagrams`)
    // The research file's own bond order and unpaired count, recomputed from its levels.
    const signed = d.levels.reduce((sum, l) => sum + (l.type === 'bonding' ? l.electrons : -l.electrons), 0)
    const unpaired = d.levels.reduce((sum, l) => sum + Math.min(l.electrons, 2 * l.degeneracy - l.electrons), 0)
    if (signed / 2 !== d.bondOrder || unpaired !== d.unpaired) fail(`MO diagram ${d.id}: the levels do not give the stated bond order and unpaired count`)
    return {
      moleculeId: d.id,
      levels: d.levels.map((l) => ({
        label: MO_LABELS[l.label] ?? fail(`MO diagram ${d.id}: unknown level "${l.label}"`),
        degeneracy: l.degeneracy,
        electrons: l.electrons,
        type: l.type,
      })),
      ...(MO_CALLOUT_FOR.includes(d.id) ? { callout: moCallout(expected, d.id) } : {}),
      sourceId: MO_SOURCE_ID,
    }
  })
  return { diagrams, sources: [{ id: MO_SOURCE_ID, url, citation: `${citation} ${OPENSTAX_LICENCE}` }] }
}

// ---------------------------------------------------------------------------
// Periodic table
//
// Which source fills which field (periodic table spec 5.1):
// - PubChem's periodic table download: number, symbol, name, category, configuration, state, oxidation
//   states, year, and the quantities in PUBCHEM_QUANTITIES; for the 34 elements with no standard atomic
//   weight, also the mass of one isotope.
// - CIAAW's abridged table: the standard atomic weight of the other 84. Each row reads "value ± uncertainty",
//   one conventional value even where the full table gives an interval; the value is stored as printed
//   ("1.0080", "6.94") and the uncertainty is not kept.
// - NIST ASD: the first ionization energy of elements 1 to 108, with NIST's marking of how it was obtained.
// - PubChem's element pages: the covalent radius of elements 1 to 96.
// Notes and choices come from decisions.json and nowhere else.

// The unit of every quantity. Read from PubChem's own page and recorded in docs/research/periodic-table/units.md;
// NIST's file gives the ionization energy in eV. Electronegativity (Pauling scale) is the only one with no unit.
const PERIODIC_UNITS = {
  atomicMass: 'u',
  electronegativity: '',
  covalentRadius: 'pm',
  vdwRadius: 'pm',
  ionizationEnergy: 'eV',
  electronAffinity: 'eV',
  meltingPoint: 'K',
  boilingPoint: 'K',
  density: 'g/cm³',
}

// PubChem column -> field. "AtomicRadius" is a van der Waals radius. "IonizationEnergy" is not used (NIST's is),
// and "CPKHexColor" is not used at all.
const PUBCHEM_QUANTITIES = {
  Electronegativity: 'electronegativity',
  AtomicRadius: 'vdwRadius',
  ElectronAffinity: 'electronAffinity',
  MeltingPoint: 'meltingPoint',
  BoilingPoint: 'boilingPoint',
  Density: 'density',
}
const PUBCHEM_COLUMNS = 'AtomicNumber,Symbol,Name,AtomicMass,CPKHexColor,ElectronConfiguration,Electronegativity,AtomicRadius,IonizationEnergy,ElectronAffinity,OxidationStates,StandardState,MeltingPoint,BoilingPoint,Density,GroupBlock,YearDiscovered'
const CATEGORIES = ['Alkali metal', 'Alkaline earth metal', 'Transition metal', 'Post-transition metal', 'Metalloid', 'Nonmetal', 'Halogen', 'Noble gas', 'Lanthanide', 'Actinide']
// The rows of the element card a note can qualify: field names of the record.
const NOTE_ROWS = ['category', 'configuration', 'standardState', 'oxidationStates', 'yearDiscovered', ...Object.keys(PERIODIC_UNITS)]

const PUBCHEM_TABLE_ID = 'pubchem-periodic-table'
const PUBCHEM_PAGES_ID = 'pubchem-element-pages'
const NIST_ALL_ID = 'nist-asd-ie-all'
const CIAAW_ID = 'ciaaw-abridged-2024'
const CIAAW_TITLE = 'Abridged Standard Atomic Weights 2024'
// Cited by the density notes that quote a handbook: the elements the cross-check found far from other
// tabulations, and the two whose density is that of one form of the element.
const DENSITIES_ID = 'handbook-densities-wikipedia'
// Cited by the atomic-mass notes of the elements whose isotope is not the one this list gives.
const CIAAW_RADIOACTIVE_ID = 'ciaaw-radioactive-elements'
const PUBCHEM = 'PubChem [Internet]. Bethesda (MD): National Library of Medicine (US), National Center for Biotechnology Information; 2004-.'

// What the group, period and block descriptions, the group 3 note and the legend notes in src/chem-data/periodic.ts cite, and
// (section 6.5) the element card's sentence on electron affinity in src/chem-data/periodicCard.ts. Each
// page was read on the retrieval date of the saved downloads. Beside the sentence it supports, there, is the passage
// read (OpenStax, which is CC BY 4.0, and lines of PubChem's pages) or, for any other source, where the passage
// is and what it establishes in this project's words. The pages themselves are not saved.
const OPENSTAX = 'Flowers, P.; Theopold, K.; Langley, R.; Robinson, W. R. Chemistry 2e; OpenStax: Houston, TX, 2019;'
const OPENSTAX_SECTIONS = [
  ['2.5', 'The Periodic Table', '2-5-the-periodic-table'],
  ['6.4', 'Electronic Structure of Atoms (Electron Configurations)', '6-4-electronic-structure-of-atoms-electron-configurations'],
  ['6.5', 'Periodic Variations in Element Properties', '6-5-periodic-variations-in-element-properties'],
  ['18.1', 'Periodicity', '18-1-periodicity'],
  ['18.3', 'Structure and General Properties of the Metalloids', '18-3-structure-and-general-properties-of-the-metalloids'],
  ['18.4', 'Structure and General Properties of the Nonmetals', '18-4-structure-and-general-properties-of-the-nonmetals'],
  ['18.11', 'Occurrence, Preparation, and Properties of Halogens', '18-11-occurrence-preparation-and-properties-of-halogens'],
  ['18.12', 'Occurrence, Preparation, and Properties of the Noble Gases', '18-12-occurrence-preparation-and-properties-of-the-noble-gases'],
  ['19.1', 'Occurrence, Preparation, and Properties of Transition Metals and Their Compounds', '19-1-occurrence-preparation-and-properties-of-transition-metals-and-their-compounds'],
]

function descriptionSources(retrieved) {
  return [
    ...OPENSTAX_SECTIONS.map(([section, title, page]) => ({
      id: `openstax-chem2e-${section}`,
      url: `https://openstax.org/books/chemistry-2e/pages/${page}`,
      citation: `${OPENSTAX} Section ${section} ${title} (${retrieved}). ${OPENSTAX_LICENCE}`,
    })),
    {
      id: 'iupac-red-book-2005',
      url: 'https://iupac.org/wp-content/uploads/2016/07/Red_Book_2005.pdf',
      citation: 'Connelly, N. G.; Damhus, T.; Hartshorn, R. M.; Hutton, A. T., Eds. Nomenclature of Inorganic Chemistry: IUPAC Recommendations 2005; RSC Publishing: Cambridge, 2005; Section IR-3.5 Elements in the periodic table (p 51).',
    },
    {
      id: 'iupac-periodic-table',
      url: 'https://iupac.org/what-we-do/periodic-table-of-elements/',
      citation: `International Union of Pure and Applied Chemistry (IUPAC). Periodic Table of Elements, the section "Group 3" (${retrieved}; read again on 2026-10-17, when the section still put the question as open and the page gave 2022-09-12 as the date it was last changed).`,
    },
    {
      id: 'rsc-periodic-table',
      url: 'https://periodic-table.rsc.org/',
      citation: `Royal Society of Chemistry. Periodic Table: how the table is drawn, its notes on the blocks, and its element pages (https://periodic-table.rsc.org/element/<atomic number>/; ${retrieved}).`,
    },
    {
      id: 'iupac-group-3-report-2021',
      url: 'https://doi.org/10.1515/ci-2021-0115',
      citation: `Scerri, E. Provisional Report on Discussions on Group 3 of The Periodic Table. Chem. Int. 2021, 43 (1), 31-34 (${retrieved}). A progress report from the task group of the IUPAC project "The constitution of group 3 of the periodic table" (https://iupac.org/project/2015-039-2-200).`,
    },
  ]
}

// The retrieval date and the NIST query are the ones recorded beside the saved copies.
function periodicSources(manifest) {
  const saved = (file) => manifest.files.find((f) => f.file === file) ?? fail(`MANIFEST.json does not list ${file}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.retrieved)) fail('MANIFEST.json has no retrieval date')
  const retrieved = `retrieved ${manifest.retrieved}`
  // The page was read at this revision, and the copy kept in sources/ is that revision (sources/README.md).
  const revision = /^Wikipedia, Densities of the elements \(data page\), revision (\d+)$/.exec(saved('wikipedia-densities-of-the-elements-data-page.wikitext').what)?.[1] ?? fail('MANIFEST.json does not give the revision of the densities page')
  return [
    {
      id: PUBCHEM_TABLE_ID,
      url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/',
      citation: `${PUBCHEM} Periodic Table of Elements (data: https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON, ${retrieved}). PubChem compiles the table from other sources, named on each element's page: Jefferson Lab, Los Alamos National Laboratory, IUPAC CIAAW, the IAEA Atomic Mass Data Center, and journal papers. Source: National Library of Medicine.`,
    },
    {
      id: NIST_ALL_ID,
      url: saved('nist-asd-ie-neutral.txt').url,
      citation: `Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database, Ground States and Ionization Energies: the neutral atoms, hydrogen to hassium (${retrieved}). National Institute of Standards and Technology. https://doi.org/10.18434/T4W30F`,
    },
    {
      id: PUBCHEM_PAGES_ID,
      url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/',
      citation: `${PUBCHEM} Element pages, one per element, opened from the Periodic Table of Elements (data: https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/<atomic number>/JSON, ${retrieved}). The covalent radii carried there are those of Cordero, B. et al. Covalent radii revisited. Dalton Trans. 2008, (21), 2832-2838 (https://doi.org/10.1039/b801115j): they equal Cordero's values for the 11 elements this app checked one by one; the paper is paywalled and was not read. Source: National Library of Medicine.`,
    },
    {
      id: DENSITIES_ID,
      url: `https://en.wikipedia.org/w/index.php?title=Densities_of_the_elements_(data_page)&oldid=${revision}`,
      citation: `Lide, D. R., Ed. CRC Handbook of Chemistry and Physics, 84th ed.; CRC Press: Boca Raton, FL, 2003; Section 4, Physical Constants of Inorganic Compounds. Dean, J. A., Ed. Lange's Handbook of Chemistry, 15th ed.; McGraw-Hill: New York, 1999; Table 3.2. Neither handbook was read: their densities were taken from a secondary transcription, Wikipedia's Densities of the elements (data page), revision ${revision}, linked here (${retrieved}).`,
    },
    {
      id: CIAAW_RADIOACTIVE_ID,
      url: saved('ciaaw-radioactive-elements.html').url,
      citation: `IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW), Radioactive elements: the most stable known isotopes of the radioactive elements, compiled from the NUBASE2020 evaluation (${retrieved}).`,
    },
    ...descriptionSources(retrieved),
  ]
}

const PLAIN_NUMBER = /^\d+(\.\d+)?$/

/** A quantity in the source's own digits. Fails on anything that is not a plain positive number. */
function quantity(published, field, sourceId, where) {
  if (typeof published !== 'string' || !PLAIN_NUMBER.test(published) || !(Number(published) > 0)) {
    fail(`${where}: ${field} ${JSON.stringify(published)} is not a positive number`)
  }
  return { value: Number(published), published, unit: PERIODIC_UNITS[field], sourceId }
}

const onlyKeys = (object, keys, where, optional = []) => {
  const unknown = Object.keys(object).filter((key) => !keys.includes(key) && !optional.includes(key))
  const missing = keys.filter((key) => !(key in object))
  if (unknown.length > 0 || missing.length > 0) fail(`${where}: expected exactly the keys ${keys.join(', ')}`)
}

/** decisions.json, checked: { isotopes, covalentChoice, notesFor(symbol) }. A note comes back with its valueAbsent mark. */
function readDecisions(symbols, sourceIds) {
  const decisions = JSON.parse(readFileSync(join(periodicResearch, 'decisions.json'), 'utf8'))
  onlyKeys(decisions, ['about', 'isotopeMasses', 'covalentRadius', 'notes'], 'decisions.json')
  const known = (symbol, where) => symbols.has(symbol) || fail(`decisions.json: ${where} names "${symbol}", which is not an element symbol`)

  for (const [symbol, isotope] of Object.entries(decisions.isotopeMasses)) {
    known(symbol, 'isotopeMasses')
    onlyKeys(isotope, ['massNumber', 'estimated'], `decisions.json: isotopeMasses.${symbol}`)
    if (!Number.isInteger(isotope.massNumber) || typeof isotope.estimated !== 'boolean') fail(`decisions.json: isotopeMasses.${symbol} is malformed`)
  }
  for (const [symbol, value] of Object.entries(decisions.covalentRadius)) {
    known(symbol, 'covalentRadius')
    if (typeof value !== 'string') fail(`decisions.json: covalentRadius.${symbol} must be the published text`)
  }

  const notes = new Map()
  decisions.notes.forEach((note, i) => {
    const where = `decisions.json: notes[${i}]`
    // valueAbsent marks a note about a value the source leaves empty. It is checked against the record and not written out.
    onlyKeys(note, ['symbols', 'row', 'text', 'sourceId'], where, ['valueAbsent'])
    if ('valueAbsent' in note && note.valueAbsent !== true) fail(`${where}: valueAbsent, where given, must be true`)
    if (!Array.isArray(note.symbols) || note.symbols.length === 0 || new Set(note.symbols).size !== note.symbols.length) fail(`${where}: symbols must be a list with no repeats`)
    if (!NOTE_ROWS.includes(note.row)) fail(`${where}: unknown row "${note.row}"`)
    if (typeof note.text !== 'string' || note.text.trim() === '' || note.text !== note.text.trim()) fail(`${where}: text is empty or padded`)
    if (!sourceIds.has(note.sourceId)) fail(`${where}: unknown source "${note.sourceId}"`)
    for (const symbol of note.symbols) {
      known(symbol, `notes[${i}]`)
      const list = notes.get(symbol) ?? []
      if (list.some((other) => other.row === note.row && other.text === note.text)) fail(`${where}: repeats a note on ${symbol}`)
      notes.set(symbol, [...list, { row: note.row, text: note.text, sourceId: note.sourceId, valueAbsent: note.valueAbsent === true }])
    }
  })
  return { isotopes: decisions.isotopeMasses, covalentChoice: decisions.covalentRadius, notesFor: (symbol) => notes.get(symbol) ?? [] }
}

/** The covalent radii an element page lists, as published: [] or ['31'] or, for a few elements, several. */
function covalentRadii(page, where) {
  const lines = page.lines.filter((line) => line.name === 'Covalent Atomic Radius')
  if (lines.length === 0) return []
  if (lines.length > 1) fail(`${where}: more than one covalent radius line`)
  // "31(5) pm (Covalent)", "28 pm (Covalent)", "76(1)[sp3], 73(2)[sp2], 69(1)[sp] pm (Covalent)":
  // a value, its uncertainty in the last digits, and a label where there are several.
  const list = /^(.+) pm \(Covalent\)$/.exec(lines[0].text)?.[1] ?? fail(`${where}: unreadable covalent radius "${lines[0].text}"`)
  return list.split(', ').map((entry) => /^(\d+)(\(\d+\))?(\[[^\]]+\])?$/.exec(entry)?.[1] ?? fail(`${where}: unreadable covalent radius "${lines[0].text}"`))
}

function buildPeriodicTable(otherSourceIds) {
  const read = (name) => readFileSync(join(periodicResearch, name), 'utf8')
  const sources = periodicSources(JSON.parse(read('sources/MANIFEST.json')))
  const sourceIds = new Set([...otherSourceIds, ...sources.map((s) => s.id)])
  if (!sourceIds.has(CIAAW_ID)) fail(`no source "${CIAAW_ID}"`)

  const download = JSON.parse(read('pubchem-periodic-table.json'))
  if (download.Table.Columns.Column.join() !== PUBCHEM_COLUMNS) fail('the PubChem download does not have the expected columns')
  const rows = parsePubChem(download)
  if (rows.length !== 118) fail(`the PubChem download has ${rows.length} rows, expected 118`)

  // The units in the table above are the ones PubChem's page labels its columns with.
  const labels = JSON.parse(read('sources/pubchem-ptable-column-labels.json'))
  for (const [column, field] of [['AtomicMass', 'atomicMass'], ...Object.entries(PUBCHEM_QUANTITIES)]) {
    if ((labels[column]?.unit ?? '') !== PERIODIC_UNITS[field]) fail(`PubChem labels ${column} with the unit "${labels[column]?.unit}", not "${PERIODIC_UNITS[field]}"`)
  }

  const ciaaw = parseCiaawAbridged(read('sources/ciaaw-abridged-atomic-weights.html'))
  if (ciaaw.title !== CIAAW_TITLE || ciaaw.rows.length !== 118) fail(`the saved CIAAW page is not "${CIAAW_TITLE}" with 118 rows`)
  const nistText = read('sources/nist-asd-ie-neutral.txt')
  if (!nistText.includes('Ionization Energy (eV)')) fail('the saved NIST file does not give the ionization energy in eV')
  const nist = parseNistIe(nistText)
  if (nist.length !== 108) fail(`the saved NIST file has ${nist.length} rows, expected 108`)
  const pages = JSON.parse(read('sources/pubchem-element-pages-extract.json'))
  if (Object.keys(pages).length !== 118) fail('the saved PubChem element pages are not 118 records')

  // The download's symbols and names are checked before decisions.json is read against them, so that a fault
  // in the download is not reported as a fault in decisions.json.
  rows.forEach((row, i) => {
    const where = `periodic table row ${i + 1}`
    if (row.AtomicNumber !== String(i + 1)) fail(`${where}: atomic number is "${row.AtomicNumber}"`)
    if (!/^[A-Z][a-z]?$/.test(row.Symbol)) fail(`${where}: symbol is "${row.Symbol}"`)
    if (row.Name.trim() === '' || row.Name !== row.Name.trim()) fail(`${where}: name is empty or padded`)
  })
  if (new Set(rows.map((row) => row.Symbol)).size !== 118 || new Set(rows.map((row) => row.Name)).size !== 118) fail('the PubChem download repeats a symbol or a name')

  const decisions = readDecisions(new Set(rows.map((row) => row.Symbol)), sourceIds)

  const elements = rows.map((row, i) => {
    const atomicNumber = i + 1
    const where = `periodic table row ${atomicNumber}`
    const { Symbol: symbol, Name: name } = row
    if (!CATEGORIES.includes(row.GroupBlock)) fail(`${where}: unknown category "${row.GroupBlock}"`)

    // "(predicted)" and "(calculated)" are the source's own markings; the rest of the text is kept as published.
    const marked = /^(.*?)(?: \((predicted|calculated)\))?$/.exec(row.ElectronConfiguration)
    const [, text, qualifier] = marked
    if (text === '' || /[()]/.test(text)) fail(`${where}: configuration "${row.ElectronConfiguration}" is empty or carries an unknown marking`)
    // The text is kept as published, so it must be text the app can read: its electrons sum to the atomic number.
    try {
      checkConfiguration(text, atomicNumber)
    } catch (error) {
      fail(`${where}: ${error.message}`)
    }

    const state = /^(Expected to be a )?(Solid|Liquid|Gas)$/.exec(row.StandardState) ?? fail(`${where}: unknown state "${row.StandardState}"`)
    if (row.YearDiscovered !== 'Ancient' && !/^\d{3,4}$/.test(row.YearDiscovered)) fail(`${where}: year is "${row.YearDiscovered}"`)

    // Atomic mass: CIAAW's standard atomic weight where there is one, otherwise the isotope mass PubChem prints.
    const weight = ciaaw.rows[i]
    if (weight.z !== atomicNumber || weight.symbol !== symbol) fail(`${where}: the CIAAW row is ${weight.z} ${weight.symbol}`)
    if (weight.value === null && weight.text !== '—') fail(`${where}: unreadable CIAAW entry "${weight.text}"`)
    const isotope = decisions.isotopes[symbol]
    if ((weight.value === null) !== (isotope !== undefined)) fail(`${where}: decisions.json must name an isotope for exactly the elements with no standard atomic weight`)
    const pubchemMass = quantity(row.AtomicMass, 'atomicMass', PUBCHEM_TABLE_ID, where)
    if (isotope && Math.round(pubchemMass.value) !== isotope.massNumber) fail(`${where}: mass ${row.AtomicMass} does not round to mass number ${isotope.massNumber}`)
    const atomicMass = isotope
      ? { ...pubchemMass, kind: 'isotope-mass', massNumber: isotope.massNumber, estimated: isotope.estimated }
      : { ...quantity(weight.value, 'atomicMass', CIAAW_ID, where), kind: 'standard-atomic-weight' }

    const fromPubChem = Object.fromEntries(
      Object.entries(PUBCHEM_QUANTITIES).flatMap(([column, field]) => (row[column] === '' ? [] : [[field, quantity(row[column], field, PUBCHEM_TABLE_ID, where)]])),
    )
    // The column is not shown, but an unreadable value still means the download is not what this script expects.
    if (row.IonizationEnergy !== '') quantity(row.IonizationEnergy, 'ionizationEnergy', PUBCHEM_TABLE_ID, where)

    const page = pages[atomicNumber]
    if (page?.title !== name) fail(`${where}: the saved element page is "${page?.title}"`)
    const radii = covalentRadii(page, where)
    const choice = decisions.covalentChoice[symbol]
    if ((radii.length > 1) !== (choice !== undefined)) fail(`${where}: decisions.json must choose a covalent radius for exactly the elements with several`)
    if (choice !== undefined && choice !== radii[0]) fail(`${where}: the covalent radius chosen is not the first listed (${radii[0]})`)

    const ie = nist[i]
    if (ie && (ie.z !== atomicNumber || ie.charge !== 0 || ie.spectrum !== `${symbol} I`)) fail(`${where}: the NIST row is ${ie.spectrum}`)

    const authored = decisions.notesFor(symbol)
    if (radii.length > 1 && !authored.some((note) => note.row === 'covalentRadius')) fail(`${where}: a chosen covalent radius needs a note saying so`)
    const notes = authored.map(({ row, text, sourceId }) => ({ row, text, sourceId }))

    const record = {
      atomicNumber,
      symbol,
      name,
      category: row.GroupBlock,
      configuration: { text, ...(qualifier ? { qualifier } : {}) },
      standardState: { state: state[2], expected: state[1] !== undefined },
      ...(row.OxidationStates === '' ? {} : { oxidationStates: row.OxidationStates }),
      yearDiscovered: row.YearDiscovered === 'Ancient' ? 'Ancient' : Number(row.YearDiscovered),
      atomicMass,
      ...(fromPubChem.electronegativity ? { electronegativity: fromPubChem.electronegativity } : {}),
      ...(radii.length > 0 ? { covalentRadius: quantity(radii[0], 'covalentRadius', PUBCHEM_PAGES_ID, where) } : {}),
      ...(fromPubChem.vdwRadius ? { vdwRadius: fromPubChem.vdwRadius } : {}),
      ...(fromPubChem.electronAffinity ? { electronAffinity: fromPubChem.electronAffinity } : {}),
      ...(ie ? { ionizationEnergy: { ...quantity(ie.energy, 'ionizationEnergy', NIST_ALL_ID, where), flag: ie.flag } } : {}),
      ...(fromPubChem.meltingPoint ? { meltingPoint: fromPubChem.meltingPoint } : {}),
      ...(fromPubChem.boilingPoint ? { boilingPoint: fromPubChem.boilingPoint } : {}),
      ...(fromPubChem.density ? { density: fromPubChem.density } : {}),
      ...(notes.length > 0 ? { notes } : {}),
      sourceId: PUBCHEM_TABLE_ID,
    }
    for (const note of authored) {
      const problem = noteProblem(record, note)
      if (problem) fail(`decisions.json: a note on ${note.row}: ${problem}`)
    }
    return record
  })
  return { elements, sources }
}

// ---------------------------------------------------------------------------
// Titration lab
//
// The record is authored in docs/research/phase-3/titration.json: three bottles, the cited constants of the flask
// model, and the model's parameters with their rationales. Every source is in sources/MANIFEST.json, and the ones
// with a `file` have their copy kept beside it. A value whose source is kept is checked against the copy here. A
// value read from a page or a PDF that is not kept cannot be: the manifest records what the source prints and
// where, for a person to check, and src/chem-data/titration/inputs.test.ts holds the record to the manifest. The
// three bottles' hazard statements are of that kind, each a sheet's that is read and not kept, and for them the
// build itself holds the record to the manifest's rows. That is agreement between the record and the manifest. With
// no copy kept, the build cannot check the record against the sheets themselves.

const BOTTLES = ['hcl', 'naoh', 'indicator']
const CONSTANTS = ['waterIonProduct', 'indicatorPKas', 'indicatorMolarMass', 'indicatorStrength', 'indicatorDropVolume', 'henryCo2', 'atmosphericCo2', 'carbonicPKas']
// The sources whose kept copy a constant is checked against: the constant must cite that source and no other.
const NOAA_ID = 'noaa-gml-co2-annmean-gl'
const CARBONIC_ID = 'perrin-1982-wikipedia'
const DROP_ID = 'drop-unit-wikipedia'
const INDICATOR_RECORD_ID = 'pubchem-cid-4764'
// No bottle's statements are read from a PubChem record (D4, as the owner confirmed and widened it on 2026-10-05:
// the supplier's safety data sheets are the lab's reference for hazards). Each bottle carries the signal word and
// the statements of that supplier's sheet for the concentrated or the pure substance: concentrated hydrochloric
// acid, and sodium hydroxide and phenolphthalein themselves, the solids. The sheets were read and are not kept, so
// each bottle must cite its own sheet and is held to the manifest's rows for it.
const STATEMENT_SHEETS = { hcl: 'flinn-sds-395', naoh: 'flinn-sds-734', indicator: 'flinn-sds-591' }
// "Toxic if inhaled". PubChem's record for CID 313, as it was read on 2026-10-04, printed this code under entries
// named hydrogen chloride, the gas. D4 keeps the gas's statements off the acid's bottle, and its sheet does not
// print the code, so the build refuses it there.
const NEVER_ON = { hcl: ['H331'] }

function buildTitration(otherSourceIds) {
  const read = (name) => readFileSync(join(titrationResearch, name))
  const input = JSON.parse(read('titration.json'))
  const manifest = JSON.parse(read('sources/MANIFEST.json'))

  const sources = manifest.sources.map(({ id, url, citation }) => {
    if ([id, url, citation].some((text) => typeof text !== 'string' || text.trim() === '')) fail(`phase-3 MANIFEST.json: the source "${id}" needs an id, a url and a citation`)
    if (otherSourceIds.includes(id)) fail(`phase-3 MANIFEST.json: the source id "${id}" is already in use`)
    return { id, url, citation }
  })
  if (new Set(sources.map((s) => s.id)).size !== sources.length) fail('phase-3 MANIFEST.json repeats a source id')
  const sourceOf = ({ sourceId }, where) => manifest.sources.find((s) => s.id === sourceId) ?? fail(`${where}: unknown source "${sourceId}"`)

  // The kept copy of each source that has one, as text. It is the file the manifest hashed, so a check below reads
  // what was read when the record was written.
  const kept = new Map(
    manifest.sources.map((source) => [
      source.id,
      [source]
        .filter((copy) => copy.file !== undefined)
        .map(({ file, sha256 }) => {
          const bytes = read(join('sources', file))
          checkSha256(bytes, sha256, file)
          return bytes.toString('utf8')
        }),
    ]),
  )
  /** The kept copies of the source a value cites, which must be the source `id` where one is given. */
  const copies = (cited, where, id = cited.sourceId) => {
    if (cited.sourceId !== id) fail(`${where}: cites "${cited.sourceId}", but is checked against the kept copy of "${id}"`)
    const texts = kept.get(sourceOf(cited, where).id)
    if (texts.length === 0) fail(`${where}: the source "${id}" has no kept copy to check the value against`)
    return texts
  }

  onlyKeys(input, ['bottles', 'constants', 'parameters'], 'titration.json')
  onlyKeys(input.bottles, BOTTLES, 'titration.json: bottles')
  onlyKeys(input.constants, CONSTANTS, 'titration.json: constants')

  // Each bottle's statements are its sheet's. No bottle names an entry of a PubChem record any more, so none has a
  // `reference`, and the record is written out as it is authored.
  const bottles = Object.fromEntries(
    BOTTLES.map((key) => {
      const where = `titration.json: bottles.${key}`
      onlyKeys(input.bottles[key], ['name', 'formula', 'pubchemCid', 'classifiedAs', 'hazards'], where)
      const bottle = input.bottles[key]
      onlyKeys(bottle.hazards, ['signalWord', 'statements', 'note', 'sourceId'], `${where}.hazards`)
      // A note rests on one sheet, or on two that between them cover the strength: the second is `alsoSourceId`.
      const { note } = bottle.hazards
      onlyKeys(note, ['value', 'sourceId'], `${where}.hazards.note`, ['alsoSourceId'])
      sourceOf(note, `${where}.hazards.note`)
      if (note.alsoSourceId !== undefined) {
        if (note.alsoSourceId === note.sourceId) fail(`${where}.hazards.note: alsoSourceId names "${note.alsoSourceId}", the source the note already cites`)
        sourceOf({ sourceId: note.alsoSourceId }, `${where}.hazards.note.alsoSourceId`)
      }
      if (bottle.hazards.sourceId !== STATEMENT_SHEETS[key]) fail(`${where}.hazards: cites "${bottle.hazards.sourceId}", but this bottle's statements are those of the sheet "${STATEMENT_SHEETS[key]}"`)
      const sheet = sourceOf(bottle.hazards, `${where}.hazards`)
      if (kept.get(sheet.id).length > 0) fail(`${where}.hazards: the sheet "${sheet.id}" is cited as read and not kept, but the manifest lists a copy of it`)
      checkSheetHazards(sheet, `bottles.${key}.hazards`, bottle.hazards, NEVER_ON[key] ?? [])
      return [key, bottle]
    }),
  )

  const { constants } = input
  const where = (key) => `titration.json: constants.${key}`
  for (const key of CONSTANTS) {
    for (const constant of [constants[key]].flat()) {
      onlyKeys(constant, ['value', 'unit', 'sourceId'], where(key), ['published', 'note', ...(key === 'atmosphericCo2' ? ['year'] : [])])
      checkPublished(constant, where(key))
      sourceOf(constant, where(key))
    }
  }
  // The checks against the kept copies. Each compares the figure the record says its source prints, digit for digit.
  const figure = (key, constant = constants[key]) => constant.published ?? fail(`${where(key)}: a value checked against a kept copy needs the figure its source prints`)
  const { atmosphericCo2, indicatorMolarMass, indicatorDropVolume, carbonicPKas } = constants
  checkAnnualMean(copies(atmosphericCo2, where('atmosphericCo2'), NOAA_ID)[0], atmosphericCo2.year, figure('atmosphericCo2'))
  // The kept copy of PubChem's record for the indicator is its table of computed properties.
  const properties = JSON.parse(copies(indicatorMolarMass, where('indicatorMolarMass'), INDICATOR_RECORD_ID)[0])
  if (!properties.PropertyTable) fail(`${where('indicatorMolarMass')}: the kept copy is not PubChem's property table`)
  checkMolecularWeight(properties, bottles.indicator.pubchemCid, figure('indicatorMolarMass'))
  // The indicator's strength is not among them: its catalogue listing was read and is not kept, like the papers and
  // the NIST pages, so it rests on what the manifest says the page printed on the day it was read.
  for (const [key, list, id] of [['carbonicPKas', carbonicPKas, CARBONIC_ID], ['indicatorDropVolume', [indicatorDropVolume], DROP_ID]]) {
    const [copy] = list.map((constant) => copies(constant, where(key), id)[0])
    checkWikipediaCopy(JSON.parse(copy), sourceOf(list[0], where(key)).citation, list.map((constant) => figure(key, constant)))
  }

  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `titration.json: parameters.${key}`)

  return { titration: { bottles, constants, parameters: input.parameters }, sources }
}

// ---------------------------------------------------------------------------
// Aqueous reactions lab
//
// The record is authored in docs/research/phase-4/aqueous.json: the species, the fifteen reagents, the solubility
// of each pair of ions the stations can bring together, the activity series, the observation rows, the constants
// and parameters of the temperature rise, the choices an observation is recorded from, the two cautions and the
// ten stations. Every source is in sources/MANIFEST.json, each row of which names the stored values it supports;
// the build holds the record to those rows, and checks the reagents against the one kept copy, PubChem's table.
// The reagents' hazards are authored apart, in hazards.json with sources/hazard-manifest.json, and merged in here:
// like the titration lab's bottles they are a supplier's safety data sheets, read and not kept, so the build holds
// them to that manifest's rows and cannot check them against the sheets themselves.

const AQUEOUS_KEYS = ['species', 'reagents', 'solubility', 'activitySeries', 'observations', 'constants', 'parameters', 'choices', 'cautions', 'stations']
const AQUEOUS_REAGENTS = ['fecl3-0.5m', 'naoh-1m', 'naoh-6m', 'na2co3-0.5m', 'cuso4-0.5m', 'nicl2-0.5m', 'bacl2-0.5m', 'cocl2-0.5m', 'nh4no3-0.5m', 'caco3', 'hcl-1m', 'hcl-3m', 'hcl-6m', 'agno3-0.1m', 'mg']
const AQUEOUS_REAGENTS_ID = 'pubchem-aqueous-reagents'
// As on the titration bench (D4): the statements of hydrogen chloride gas are kept off a bottle of the acid.
const AQUEOUS_NEVER = { 'hcl-1m': ['H331'], 'hcl-3m': ['H331'], 'hcl-6m': ['H331'] }

function buildAqueous(earlierSources) {
  const read = (name) => readFileSync(join(aqueousResearch, name))
  const json = (name) => JSON.parse(read(name))
  const input = json('aqueous.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, AQUEOUS_KEYS, 'aqueous.json')
  if (input.reagents.map((r) => r.id).join() !== AQUEOUS_REAGENTS.join()) fail('aqueous.json: the reagents are not the fifteen of spec 8.2, in their order')
  if (input.stations.length !== 10) fail(`aqueous.json: expected 10 stations, found ${input.stations.length}`)

  const labSources = newSources(manifest.sources, earlierSources, 'phase-4 MANIFEST.json')
  if (labSources.length !== manifest.sources.length) fail('phase-4 MANIFEST.json: a source id is already in use')
  const sheetSources = newSources(hazardManifest.sources, [...earlierSources, ...labSources], 'phase-4 hazard-manifest.json')

  const copy = manifest.sources.find((s) => s.id === AQUEOUS_REAGENTS_ID) ?? fail(`phase-4 MANIFEST.json: no source "${AQUEOUS_REAGENTS_ID}"`)
  for (const source of manifest.sources) {
    if ((source.file !== undefined) !== (source.id === AQUEOUS_REAGENTS_ID)) fail(`phase-4 MANIFEST.json: "${AQUEOUS_REAGENTS_ID}" is the one source with a kept copy`)
  }
  const bytes = read(join('sources', copy.file))
  checkSha256(bytes, copy.sha256, copy.file)
  checkReagents(input, JSON.parse(bytes.toString('utf8')))

  const aqueous = { ...input, reagents: mergeHazards(input.reagents, json('hazards.json'), hazardManifest.sources, AQUEOUS_NEVER) }
  checkSupported(aqueous, manifest.sources, hazardManifest.sources)
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `aqueous.json: parameters.${key}`)

  return { aqueous, sources: [...labSources, ...sheetSources] }
}

// ---------------------------------------------------------------------------
// Mechanism timeline

// The record is authored in docs/research/phase-5/: mechanism.json holds the cited values the energies are worked
// out from, the chapters with their words, bonds and questions; choreography.json places library species at each
// keyframe and maps their atoms to actors. Every source is in sources/MANIFEST.json, each row of which names the
// stored values it supports, and the build holds the record to those rows as it does the aqueous lab's. None of
// the sources is kept, so the build cannot check a value against its source: it holds the record and the manifest
// to one account. The keyframes, the step energies and the checks between the two files are scripts/mechanism-lib.mjs.
function buildMechanismRecord(earlierSources, molecules, elements) {
  const json = (name) => JSON.parse(readFileSync(join(mechanismResearch, name), 'utf8'))
  const record = json('mechanism.json')
  const manifest = json('sources/MANIFEST.json')
  if (manifest.sources.some((source) => source.file !== undefined)) fail('phase-5 MANIFEST.json: no source of the mechanism has a kept copy')
  const sources = newSources(manifest.sources, earlierSources, 'phase-5 MANIFEST.json')
  checkSupported(record, manifest.sources)
  for (const [key, parameter] of Object.entries(record.thermo.parameters)) onlyKeys(parameter, ['value', 'rationale'], `mechanism.json: parameters.${key}`)
  return { mechanism: buildMechanism(record, json('choreography.json'), molecules, elements), sources }
}

// ---------------------------------------------------------------------------
// Emission spectra of the periodic table
//
// One for each element NIST's Atomic Spectra Database gives lines with a relative intensity for, picked by the one
// rule of scripts/emission-lib.mjs from the saved responses in docs/research/emission-spectra/sources/; for every
// other element, a sentence that says what the saved responses show instead. Hydrogen and sodium keep the lines
// and the sentences written for them by hand in docs/research/phase-2/emission-lines.json. An element of the
// molecule explorer that has a spectrum has here the one its curated record holds, so the two cannot differ:
// hydrogen's and sodium's by hand, xenon's by the rule (buildElements). Each of those lines is held to the saved
// response: its digits must be the ones NIST prints.

const EMISSION_LINES_ID = 'nist-asd-lines-neutral'
const NIST_ASD = 'Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database'
const NIST_ASD_DOI = 'National Institute of Standards and Technology. https://doi.org/10.18434/T4W30F'

// ponytail: one source for the 95 spectra the rule makes, linked to NIST's lines form and not to each element's own
// query, so that the list of sources on the About page does not grow by one near-identical entry for each element.
// The exact address for each element is in the manifest beside the saved responses.
// The second is cited by the note shown with every spectrum (EMISSION_SCOPE_NOTE in src/chem-data/element.ts),
// where what it was read for is stored beside the sentence; the page is not kept. What that note says of flames
// rests on three sources of the flame test lab, which that lab's manifest lists (buildFlame).
function emissionSources(retrieved) {
  return [
    {
      id: EMISSION_LINES_ID,
      url: 'https://physics.nist.gov/PhysRefData/ASD/lines_form.html',
      citation: `${NIST_ASD}, Lines Data for the neutral atom of each element (the spectrum <symbol> I): observed wavelengths in air, 400 to 700 nm, with relative intensities; and, for an element with no such lines, every line the database lists for it (retrieved ${retrieved}). ${NIST_ASD_DOI}`,
    },
    {
      id: 'nist-asd-lines-help',
      url: 'https://physics.nist.gov/PhysRefData/ASD/Html/lineshelp.html#OUTRELINT',
      citation: `${NIST_ASD}, help page of the lines form: how a spectrum is named, and the section Relative Intensity, linked here (read ${retrieved}). ${NIST_ASD_DOI}`,
    },
  ]
}

/** The saved responses, by element and query, and the day they were retrieved. */
function savedEmissionResponses() {
  const read = (name) => readFileSync(join(emissionResearch, 'sources', name), 'utf8')
  const manifest = JSON.parse(read('MANIFEST.json'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.retrieved)) fail('emission-spectra MANIFEST.json has no retrieval date')
  const saved = (symbol, query) => {
    const copies = manifest.files.filter((f) => f.symbol === symbol && f.query === query)
    if (copies.length > 1) fail(`emission-spectra MANIFEST.json lists ${symbol} twice for the query "${query}"`)
    return copies[0] && read(copies[0].file)
  }
  return { retrieved: manifest.retrieved, saved }
}

/** What the rule gives an element from its saved responses: `{ emission }` or `{ none }`. */
function ruleSpectrum(symbol, name, saved) {
  const where = `emission spectrum of ${symbol}`
  const neutral = saved(symbol, 'neutral-visible') ?? fail(`${where}: MANIFEST.json lists no saved response`)
  try {
    return spectrumFromSaved({ name: name.toLowerCase(), neutral, all: saved(symbol, 'all'), sourceId: EMISSION_LINES_ID })
  } catch (error) {
    fail(`${where}: ${error.message}`)
  }
}

function buildEmissionSpectra(periodicTable, curated) {
  const { retrieved, saved } = savedEmissionResponses()
  const spectra = periodicTable.map(({ symbol, name }) => {
    const kept = curated.find((e) => e.symbol === symbol)?.emission
    if (!kept) return { symbol, ...ruleSpectrum(symbol, name, saved) }
    const printed = new Set(observedLines(parseNistLines(saved(symbol, 'neutral-visible') ?? '') ?? []).map((line) => line.published))
    for (const line of kept.lines) if (!printed.has(line.published)) fail(`emission spectrum of ${symbol}: NIST's saved response prints no line at ${line.published} nm`)
    return { symbol, emission: kept }
  })
  return { spectra, sources: emissionSources(retrieved) }
}

// ---------------------------------------------------------------------------
// Flame test lab
//
// The record is authored in docs/research/flame/flame.json: the six solutions, each with the colour of its flame,
// the lines and bands its flame shows in a spectroscope, what the strip leaves out and the notes shown when its
// station is done; what a handled loop carries and whose colour hides the others; the closing question's answer;
// and the model's parameters. Every source is in sources/MANIFEST.json, each row of which names the stored values
// it supports, and the build holds the record to those rows as it does the aqueous lab's. Every atomic line is held
// to a saved table of the NIST Atomic Spectra Database: the emission spectra's tables for 400 to 700 nm, and the
// one table kept here, potassium from 700 to 780 nm. The bottles' hazards are authored apart, in hazards.json with
// sources/hazard-manifest.json, and merged in as the aqueous lab's are: every document under them was read and is
// not kept, so the build holds them to that manifest's rows and cannot check them against the documents.

const FLAME_KEYS = ['scale', 'salts', 'handling', 'masking', 'closing', 'parameters']
const FLAME_SALTS = ['bacl2-0.1m', 'cacl2-0.1m', 'cucl2-0.1m', 'kcl-0.1m', 'nacl-0.1m', 'srcl2-0.1m']
const FLAME_LINES_ID = 'nist-asd-lines-k-700-780'

function buildFlame(earlierSources) {
  const read = (name) => readFileSync(join(flameResearch, name))
  const json = (name) => JSON.parse(read(name))
  const input = json('flame.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, FLAME_KEYS, 'flame.json')
  if (input.salts.map((s) => s.id).join() !== FLAME_SALTS.join()) fail('flame.json: the salts are not the six of spec 15.1, in their order')

  // A source another lab lists too (the emission spectra's tables, a sheet the aqueous lab read) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'flame MANIFEST.json')
  const sheetSources = newSources(hazardManifest.sources, [...earlierSources, ...labSources], 'flame hazard-manifest.json')

  const copy = manifest.sources.find((s) => s.id === FLAME_LINES_ID) ?? fail(`flame MANIFEST.json: no source "${FLAME_LINES_ID}"`)
  for (const source of manifest.sources) {
    if ((source.file !== undefined) !== (source.id === FLAME_LINES_ID)) fail(`flame MANIFEST.json: "${FLAME_LINES_ID}" is the one source with a kept copy`)
  }
  const bytes = read(join('sources', copy.file))
  checkSha256(bytes, copy.sha256, copy.file)
  const { saved } = savedEmissionResponses()
  const tableOf = (sourceId, symbol) => (sourceId === EMISSION_LINES_ID ? saved(symbol, 'neutral-visible') : sourceId === FLAME_LINES_ID && symbol === 'K' ? bytes.toString('utf8') : undefined)
  checkFlameLines(input, tableOf, { min: input.scale.fromNm, max: input.scale.toNm })

  const flame = { ...input, salts: mergeHazards(input.salts, json('hazards.json'), hazardManifest.sources) }
  checkSupported(flame, manifest.sources, hazardManifest.sources)
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `flame.json: parameters.${key}`)

  // The hazard manifest also lists documents that were read and that no note carries anything from. They stay in
  // that record; the app lists only the documents a bottle's hazards cite.
  const underHazards = new Set(flame.salts.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  return { flame, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Calorimetry lab
//
// The record is authored in docs/research/calorimetry/calorimetry.json: the seven reagents, the water with its
// specific heat and density, the three parts, each with the enthalpy the model runs on and the notes shown when it
// is done, and the model's parameters. Every source is in sources/MANIFEST.json, each row of which names the
// stored values it supports, and the build holds the record to those rows as it does the aqueous lab's. No source
// has a copy in this lab's folder. The molar masses are held to copies other labs keep: the metals' to the
// periodic table's record, ammonium nitrate's to PubChem's table of the aqueous lab. What the record works out
// from cited values (each metal's specific heat, each enthalpy) is worked out again here. The hazards of solid
// ammonium nitrate and of the four metals are authored apart, in hazards.json with sources/hazard-manifest.json;
// the acid and the base carry the aqueous lab's records unchanged, with that lab's documents behind them. All are
// merged in as the aqueous lab's are: every document was read and is not kept, so the build holds them to the
// manifests' rows and cannot check them against the documents.

const CALORIMETRY_KEYS = ['reagents', 'water', 'parts', 'parameters']
const CALORIMETRY_REAGENTS = ['hcl-1m', 'naoh-1m', 'nh4no3-solid', 'aluminium-piece', 'iron-piece', 'zinc-piece', 'tin-piece']
const CALORIMETRY_PARTS = ['neutralisation', 'dissolving', 'metal']
/** The bottles whose hazards are the aqueous reactions lab's records (spec 16.4). */
const CALORIMETRY_SHARED = ['hcl-1m', 'naoh-1m']

function buildCalorimetry(earlierSources, periodicTable) {
  const json = (name, folder = calorimetryResearch) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const input = json('calorimetry.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, CALORIMETRY_KEYS, 'calorimetry.json')
  if (input.reagents.map((r) => r.id).join() !== CALORIMETRY_REAGENTS.join()) fail('calorimetry.json: the reagents are not the seven of spec 16.1, in their order')
  if (input.parts.map((p) => p.id).join() !== CALORIMETRY_PARTS.join()) fail('calorimetry.json: the parts are not the three of spec 16.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('calorimetry manifests: no source of this lab has a copy in its folder')

  // A source another lab lists too (the NBS tables, the atomic weights, PubChem's table, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'calorimetry MANIFEST.json')
  const sheets = withSharedSheets(hazardManifest.sources, json('sources/hazard-manifest.json', aqueousResearch).sources)
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'calorimetry hazard-manifest.json')

  checkWorkedOut(input)
  checkMolarMasses(input, periodicTable, json('sources/pubchem-aqueous-reagents.json', aqueousResearch))

  const hazards = withSharedHazards(json('hazards.json'), json('hazards.json', aqueousResearch), CALORIMETRY_SHARED)
  const calorimetry = { ...input, reagents: mergeHazards(input.reagents, hazards, sheets) }
  checkSupported(calorimetry, manifest.sources, sheets)
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `calorimetry.json: parameters.${key}`)

  // As for the flame test lab: the app lists only the documents a reagent's hazards cite.
  const underHazards = new Set(calorimetry.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  return { calorimetry, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Group I cations lab
//
// The record is authored in docs/research/cations/cations.json: the eight bottles (five reagents and the three
// nitrate solutions the samples are made from), the three ions, what each solid and each dissolved thing is and
// looks like, the rules the engine's actions follow, the Gibbs energies each solubility product and the formation
// constant are worked out from, the solubility of lead chloride cold and hot, the five steps with their net ionic
// equations and the notes shown when a step is done, the flow chart's places and tiles, and the model's
// parameters. Every source is in sources/MANIFEST.json, each row of which names the stored values it supports, and
// the build holds the record to those rows as it does the aqueous lab's. No source has a copy in this lab's folder.
// What the record works out from cited values is worked out again here, the two atomic weights are held to the
// periodic table's record, and the rules are checked against the numbers at the bench's amounts, as spec 17.4
// asks: the build stops where a number says the scheme would not go as the rules have it (scripts/cations-lib.mjs).
// The bottles' hazards are authored apart, in hazards.json with sources/hazard-manifest.json; the hydrochloric
// acid carries the aqueous lab's record unchanged, with that lab's documents behind it. All are merged in as the
// aqueous lab's are: every document was read and is not kept, so the build holds them to the manifests' rows and
// cannot check them against the documents.

const CATIONS_KEYS = ['reagents', 'water', 'ions', 'substances', 'rules', 'choices', 'constants', 'gibbs', 'equilibria', 'leadChromate', 'leadChloride', 'steps', 'chart', 'parameters']
const CATIONS_REAGENTS = ['hcl-6m', 'acetic-acid-6m', 'k2cro4-0.5m', 'nh3-6m', 'hno3-6m', 'agno3-0.1m', 'pbno32-0.1m', 'hg2no32-0.1m']
const CATIONS_STEPS = ['precipitate', 'extract-lead', 'confirm-lead', 'separate', 'confirm-silver']
/** The bottle whose hazards are the aqueous reactions lab's record. */
const CATIONS_SHARED = ['hcl-6m']
/**
 * The one line of a sheet that this lab's tiles do not store as printed (the owner's decision of 2026-10-09): the
 * supplier's sheet for potassium chromate prints one statement for a pair of codes with a word dropped, and the
 * tile stores the standard phrase of each code in its place. The manifest's two rows for it print the line and say so.
 */
const CATIONS_STANDARD_PHRASES = { 'k2cro4-0.5m': { 'Causes skin and serious irritation (H315+H319)': { H315: 'Causes skin irritation', H319: 'Causes serious eye irritation' } } }
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const CATIONS_PRIMER_SAFETY = 'primer.safety'

function buildCations(earlierSources, periodicTable) {
  const json = (name) => JSON.parse(readFileSync(join(cationsResearch, name), 'utf8'))
  const input = json('cations.json')
  const manifest = json('sources/MANIFEST.json')

  onlyKeys(input, CATIONS_KEYS, 'cations.json')
  if (input.reagents.map((r) => r.id).join() !== CATIONS_REAGENTS.join()) fail('cations.json: the reagents are not the eight of spec 17.1, in their order')
  if (input.steps.map((s) => s.id).join() !== CATIONS_STEPS.join()) fail('cations.json: the steps are not the five of spec 17.2, in their order')
  if (manifest.sources.some((source) => source.file !== undefined)) fail('cations MANIFEST.json: no source of this lab has a copy in its folder')

  // A source another lab lists too (the NBS tables, the constants, the atomic weights, a page of reactions) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'cations MANIFEST.json')

  checkCationsWorkedOut(input)
  checkAtomicWeights(input, periodicTable)
  checkBench(input)
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `cations.json: parameters.${key}`)

  // The bottle of hydrochloric acid carries the aqueous reactions lab's record unchanged, with that lab's documents behind it.
  const json2 = (name, folder) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const ownHazards = json('hazards.json')
  const hazardManifest = json('sources/hazard-manifest.json')
  if (hazardManifest.sources.some((source) => source.file !== undefined)) fail('cations hazard-manifest.json: no document of this lab has a copy in its folder')
  const sheets = withSharedSheets(hazardManifest.sources, json2('sources/hazard-manifest.json', aqueousResearch).sources)
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'cations hazard-manifest.json')
  const hazards = withSharedHazards(ownHazards, json2('hazards.json', aqueousResearch), CATIONS_SHARED)
  const cations = { ...input, reagents: mergeHazards(input.reagents, hazards, sheets, {}, CATIONS_STANDARD_PHRASES) }
  checkSupported(cations, manifest.sources, sheets)

  // As for the flame test lab, the app lists the documents a bottle's hazards cite; and with them those the hazard
  // manifest marks as read for the primer's safety topic, which no tile cites (their rows' field is `primer.safety`).
  const underHazards = new Set(cations.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === CATIONS_PRIMER_SAFETY)).map((source) => source.id))
  return { cations, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Le Chatelier's principle lab
//
// The record is authored in docs/research/lechatelier/lechatelier.json: the ten bottles; what each solid and each
// coloured thing is and looks like; the rules its tubes follow; the Gibbs energies and the constants worked out
// from them; the enthalpies behind the heat that dissolving lead chloride takes in; the solubility of lead chloride
// cold and hot, and the product at saturation each gives; the indicator's range and looks; the five equilibria as
// written; the four systems, each with its tubes and its disturbances in order, and for each disturbance what is
// done, what the tube shows after each portion, what is asked and what is right, and the notes shown when it is
// done; and the model's parameters. Every source is in sources/MANIFEST.json, each row of which names the stored
// values it supports, and the build holds the record to those rows as it does the aqueous lab's. No source has a
// copy in this lab's folder. What the record works out from cited values is worked out again here, the two atomic
// weights are held to the periodic table's record, and what each tube of a system held by numbers is stored as
// showing is worked out from the numbers at the bench's amounts, as spec 18.4 and 18.7 ask: the build stops where
// the two disagree, or where a number decides from too near its edge (scripts/lechatelier-lib.mjs). The bottles'
// hazards are authored apart, in hazards.json with sources/hazard-manifest.json; the 6 M acid and the 6 M sodium
// hydroxide carry the aqueous lab's records unchanged, with that lab's documents behind them. All are merged in as
// the aqueous lab's are: every document was read and is not kept, so the build holds them to the manifests' rows
// and cannot check them against the documents.

const LECHATELIER_KEYS = ['reagents', 'water', 'substances', 'rules', 'choices', 'constants', 'gibbs', 'equilibriumConstants', 'enthalpies', 'heats', 'leadChloride', 'indicator', 'equilibria', 'systems', 'parameters']
const LECHATELIER_REAGENTS = ['pbno32-0.3m', 'hcl-0.3m', 'hcl-6m', 'hcl-12m', 'methyl-violet', 'cocl2-solid', 'znno32-0.1m', 'mgno32-0.1m', 'naoh-6m', 'nh3-6m']
const LECHATELIER_SYSTEMS = ['lead-chloride', 'methyl-violet', 'cobalt', 'hydroxides']
/** The bottles whose hazards are the aqueous reactions lab's records. */
const LECHATELIER_SHARED = ['hcl-6m', 'naoh-6m']
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const LECHATELIER_PRIMER_SAFETY = 'primer.safety'

function buildLechatelier(earlierSources, periodicTable) {
  const json = (name, folder = lechatelierResearch) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const input = json('lechatelier.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, LECHATELIER_KEYS, 'lechatelier.json')
  if (input.reagents.map((r) => r.id).join() !== LECHATELIER_REAGENTS.join()) fail('lechatelier.json: the reagents are not the ten of spec 18.1, in their order')
  if (input.systems.map((s) => s.id).join() !== LECHATELIER_SYSTEMS.join()) fail('lechatelier.json: the systems are not the four of spec 18.2, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('lechatelier manifests: no source of this lab has a copy in its folder')

  // A source another lab lists too (the NBS tables, the constants, the atomic weights, a page of reactions, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'lechatelier MANIFEST.json')

  checkLechatelierWorkedOut(input)
  checkAtomicWeights(input, periodicTable)
  checkLechatelierBench(input)
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `lechatelier.json: parameters.${key}`)

  // The 6 M acid and the 6 M sodium hydroxide carry the aqueous reactions lab's records unchanged, with that lab's documents behind them.
  const sheets = withSharedSheets(hazardManifest.sources, json('sources/hazard-manifest.json', aqueousResearch).sources, LECHATELIER_SHARED)
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'lechatelier hazard-manifest.json')
  const hazards = withSharedHazards(json('hazards.json'), json('hazards.json', aqueousResearch), LECHATELIER_SHARED)
  const lechatelier = { ...input, reagents: mergeHazards(input.reagents, hazards, sheets) }
  checkSupported(lechatelier, manifest.sources, sheets)

  // As for the Group I cations lab: the app lists the documents a bottle's hazards cite, and with them those the
  // hazard manifest marks as read for the primer's safety topic, which no tile cites.
  const underHazards = new Set(lechatelier.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === LECHATELIER_PRIMER_SAFETY)).map((source) => source.id))
  return { lechatelier, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Clock reaction lab
//
// The record is authored in docs/research/clock/clock.json: the five bottles; the gas constant and the kelvin of
// 0 °C; the two reactions and the count between them; the reaction's rate record, which is what the kinetics
// engine takes (the order in each reactant, the rate constant at a stated temperature, the activation energy, and
// what ends a run); the five mixtures, each split between two flasks; the three baths; the three parts with the
// notes shown when each is done; and the model's parameters. Every source is in sources/MANIFEST.json, each row of
// which names the stored values it supports, and the build holds the record to those rows as it does the aqueous
// lab's. No source has a copy in this lab's folder. What the record states of its own chemistry is checked here
// (scripts/clock-lib.mjs): the reactions balance and give the stored count, the mixtures are those of spec 19.1
// and keep the reactants apart until they are mixed, what a run uses up is as small as the notes say, and the rate
// record holds together, with the activation energy marked as the lab's own. The bottles' hazards are authored
// apart, in hazards.json with sources/hazard-manifest.json, every one this lab's own; they are merged in as the
// Le Chatelier's principle lab's are, and a bottle that came to carry another lab's record would be named in
// CLOCK_SHARED. Every document was read and is not kept, so the build holds the hazards to the manifests' rows and
// cannot check them against the documents.

const CLOCK_KEYS = ['reagents', 'water', 'constants', 'reactions', 'count', 'rateLaw', 'mixtures', 'referenceMixtureId', 'baths', 'parts', 'parameters']
const CLOCK_REAGENTS = ['ki-0.01m', 'na2s2o3-0.001m', 'kbro3-0.04m', 'hcl-0.1m', 'starch']
const CLOCK_PARTS = ['runs', 'rate-law', 'temperature']
/** The bottles whose hazards are another lab's records: none. */
const CLOCK_SHARED = []
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const CLOCK_PRIMER_SAFETY = 'primer.safety'

function buildClock(earlierSources) {
  const json = (name, folder = clockResearch) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const input = json('clock.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, CLOCK_KEYS, 'clock.json')
  if (input.reagents.map((r) => r.id).join() !== CLOCK_REAGENTS.join()) fail('clock.json: the reagents are not the five of spec 19.1, in their order')
  if (input.parts.map((p) => p.id).join() !== CLOCK_PARTS.join()) fail('clock.json: the parts are not the three of spec 19.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('clock manifests: no source of this lab has a copy in its folder')

  // A source another lab lists too (NIST's listing of the constants, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'clock MANIFEST.json')

  checkReactions(input)
  checkMixtures(input)
  checkUsedUp(input)
  checkRateRecord(input)

  // Every bottle's record is this lab's own. A bottle named in CLOCK_SHARED would carry the aqueous reactions lab's record unchanged, with that lab's documents behind it.
  const shared = CLOCK_SHARED.length > 0
  const sheets = shared ? withSharedSheets(hazardManifest.sources, json('sources/hazard-manifest.json', aqueousResearch).sources, CLOCK_SHARED) : hazardManifest.sources
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'clock hazard-manifest.json')
  const hazards = shared ? withSharedHazards(json('hazards.json'), json('hazards.json', aqueousResearch), CLOCK_SHARED) : json('hazards.json')
  const clock = { ...input, reagents: mergeHazards(input.reagents, hazards, sheets) }
  checkSupported(clock, manifest.sources, sheets)

  // As for the Le Chatelier's principle lab: the app lists the documents a bottle's hazards cite, and with them
  // those the hazard manifest marks as read for the primer's safety topic, which no tile cites.
  const underHazards = new Set(clock.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === CLOCK_PRIMER_SAFETY)).map((source) => source.id))
  return { clock, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Iodination of acetone lab
//
// The record is authored in docs/research/acetone/acetone.json: the three bottles; the gas constant, the kelvin of
// 0 °C and the joules in a calorie; the reaction; the reaction's rate record, which is what the kinetics engine
// takes (the order in each reactant, the rate constant at a stated temperature, the activation energy, and what
// ends a run); the four mixtures, each with what is in the flask and what is poured in to start the run; the two
// parts with the notes shown when each is done; and the model's parameters. There are no baths, and so no part on
// temperature (spec 20.1). Every source is in sources/MANIFEST.json, each row of which names the stored values it
// supports, and the build holds the record to those rows as it does the aqueous lab's. No source has a copy in
// this lab's folder. What the record states of its own chemistry is checked here (scripts/acetone-lib.mjs): the
// reaction balances, the mixtures are those of spec 20.1 with the iodine kept apart until it is poured in, the
// acetone and the acid are in as large an excess as the notes say, and the rate record holds together. The
// bottles' hazards are authored apart, in hazards.json with sources/hazard-manifest.json; the 1 M hydrochloric
// acid carries the aqueous reactions lab's record unchanged, with that lab's documents behind it, as the
// calorimetry bench's does. All are merged in as the Le Chatelier's principle lab's are: every document was read
// and is not kept, so the build holds the hazards to the manifests' rows and cannot check them against the
// documents.

const ACETONE_KEYS = ['reagents', 'water', 'constants', 'reaction', 'rateLaw', 'mixtures', 'referenceMixtureId', 'parts', 'parameters']
const ACETONE_REAGENTS = ['acetone-4m', 'hcl-1m', 'iodine-0.005m']
const ACETONE_PARTS = ['runs', 'rate-law']
/** The bottle whose hazards are the aqueous reactions lab's record. */
const ACETONE_SHARED = ['hcl-1m']
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const ACETONE_PRIMER_SAFETY = 'primer.safety'

function buildAcetone(earlierSources) {
  const json = (name, folder = acetoneResearch) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const input = json('acetone.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, ACETONE_KEYS, 'acetone.json')
  if (input.reagents.map((r) => r.id).join() !== ACETONE_REAGENTS.join()) fail('acetone.json: the reagents are not the three of spec 20.1, in their order')
  if (input.parts.map((p) => p.id).join() !== ACETONE_PARTS.join()) fail('acetone.json: the parts are not the two of spec 20.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('acetone manifests: no source of this lab has a copy in its folder')

  // A source another lab lists too (three pages of Chemguide, NIST's listing of the constants and its page on temperature, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'acetone MANIFEST.json')

  checkAcetoneReaction(input)
  checkAcetoneMixtures(input)
  checkExcess(input)
  checkAcetoneRateRecord(input)

  // The 1 M hydrochloric acid carries the aqueous reactions lab's record unchanged, with that lab's documents behind it.
  const sheets = withSharedSheets(hazardManifest.sources, json('sources/hazard-manifest.json', aqueousResearch).sources, ACETONE_SHARED)
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'acetone hazard-manifest.json')
  const hazards = withSharedHazards(json('hazards.json'), json('hazards.json', aqueousResearch), ACETONE_SHARED)
  const acetone = { ...input, reagents: mergeHazards(input.reagents, hazards, sheets) }
  checkSupported(acetone, manifest.sources, sheets)

  // As for the clock reaction lab: the app lists the documents a bottle's hazards cite, and with them those the
  // hazard manifest marks as read for the primer's safety topic, which no tile cites.
  const underHazards = new Set(acetone.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === ACETONE_PRIMER_SAFETY)).map((source) => source.id))
  return { acetone, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Red cabbage pH lab
//
// The record is authored in docs/research/cabbage/cabbage.json: the seven bottles that are laboratory chemicals;
// the scale's thirteen buffers and its three questions; the indicator's colours, each with the pH or the range
// its source names it for; the fourteen household things, each with how it is on the bench, what it looks like
// before the indicator goes in, its range of pH and the note shown when its sample is done; the note that the
// things with no record of their own share; three constants; the three parts with the notes shown when each is
// done; and the model's parameters. Every source is in sources/MANIFEST.json, each row of which names the stored
// values it supports, and the build holds the record to those rows as it does the aqueous lab's. No source has a
// copy in this lab's folder. What the record states of its own chemistry is checked here (scripts/cabbage-lib.mjs):
// the colours cover the scale with no gap, every range lies inside the scale, each pH that is worked out is what
// its cited figures give, and a careful estimate by eye is within a unit of the meter for every thing but bleach
// (spec 21.6). The bottles' hazards are authored apart, in hazards.json with sources/hazard-manifest.json, and
// merged in as the clock reaction lab's are: every record is this lab's own, none being the same bottle at the
// same strength as another lab's, though seven of the documents behind them are ones earlier labs list too.

const CABBAGE_KEYS = ['reagents', 'water', 'scale', 'indicator', 'things', 'sharedNote', 'constants', 'parts', 'parameters']
const CABBAGE_REAGENTS = ['buffer-ph1', 'buffer-ph13', 'indicator', 'ammonia', 'bleach', 'drain-cleaner', 'lab-detergent']
const CABBAGE_PARTS = ['scale', 'things', 'unit']
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const CABBAGE_PRIMER_SAFETY = 'primer.safety'

function buildCabbage(earlierSources) {
  const json = (name) => JSON.parse(readFileSync(join(cabbageResearch, name), 'utf8'))
  const input = json('cabbage.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, CABBAGE_KEYS, 'cabbage.json')
  if (input.reagents.map((r) => r.id).join() !== CABBAGE_REAGENTS.join()) fail('cabbage.json: the reagents are not the seven laboratory chemicals of spec 21.4, in their order')
  if (input.parts.map((p) => p.id).join() !== CABBAGE_PARTS.join()) fail('cabbage.json: the parts are not the three of spec 21.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('cabbage manifests: no source of this lab has a copy in its folder')
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `cabbage.json: parameters.${key}`)
  const bottles = new Set(CABBAGE_REAGENTS)
  for (const item of [...input.things, ...input.scale.buffers]) if (item.reagentId !== undefined && !bottles.has(item.reagentId)) fail(`cabbage.json: unknown reagent "${item.reagentId}"`)

  const labSources = newSources(manifest.sources, earlierSources, 'cabbage MANIFEST.json')

  checkScale(input)
  checkCabbageWorkedOut(input)
  checkEstimates(input)

  const sheets = hazardManifest.sources
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'cabbage hazard-manifest.json')
  const cabbage = { ...input, reagents: mergeHazards(input.reagents, json('hazards.json'), sheets) }
  checkSupported(cabbage, manifest.sources, sheets)

  // As for the clock reaction lab: the app lists the documents a bottle's hazards cite, and with them those the
  // hazard manifest marks as read for the primer's safety topic, which no tile cites.
  const underHazards = new Set(cabbage.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === CABBAGE_PRIMER_SAFETY)).map((source) => source.id))
  return { cabbage, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Measurement and density lab
//
// The record is authored in docs/research/density/density.json: the two liquids and the three metals an unknown
// may be; the water; the five instruments; the table of liquids and the table of metals, each row with the figure
// its source prints, the temperature it is for and the density stored, worked out from it; the melting point of
// ice; the three parts with the notes shown when each is done; and the model's parameters. Every source is in
// sources/MANIFEST.json, each row of which names the stored values it supports, and the build holds the record to
// those rows as it does the aqueous lab's. No source has a copy in this lab's folder: the metals' densities are
// held to the copy of the handbooks' transcription that the periodic table keeps. What the record works out is
// worked out again here, and its numbers are held to spec 22.6 (scripts/density-lib.mjs): the candidates of each
// table far enough apart to tell at the figures the instruments give, and every seeded amount keeping its figures.
// The hazards are authored apart, in hazards.json with sources/hazard-manifest.json, and merged in as the clock
// reaction lab's are: every record is this lab's own, none being the same thing in the same form and amount as
// another lab's, though eight of the documents behind them are ones the calorimetry and flame test labs list too.

const DENSITY_KEYS = ['reagents', 'water', 'instruments', 'liquids', 'metals', 'constants', 'parts', 'parameters']
const DENSITY_REAGENTS = ['ethanol-95', 'nacl-20', 'aluminium-pieces', 'zinc-pieces', 'copper-pieces']
const DENSITY_PARTS = ['reading', 'liquid', 'metal']

function buildDensity(earlierSources) {
  const json = (name) => JSON.parse(readFileSync(join(densityResearch, name), 'utf8'))
  const input = json('density.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, DENSITY_KEYS, 'density.json')
  if (input.reagents.map((r) => r.id).join() !== DENSITY_REAGENTS.join()) fail('density.json: the reagents are not the two liquids and the three metals of spec 22.1, in their order')
  if (input.parts.map((p) => p.id).join() !== DENSITY_PARTS.join()) fail('density.json: the parts are not the three of spec 22.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('density manifests: no source of this lab has a copy in its folder')
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `density.json: parameters.${key}`)
  const rows = new Set([...input.liquids, ...input.metals].map((row) => row.id))
  for (const reagent of input.reagents) if (!rows.has(reagent.tableId)) fail(`density.json: the reagent "${reagent.id}" is no row of a table`)

  // A source another lab lists too (the handbooks' densities, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'density MANIFEST.json')

  checkDensityWorkedOut(input)
  checkMetalDensities(input, readFileSync(join(periodicResearch, 'sources/wikipedia-densities-of-the-elements-data-page.wikitext'), 'utf8'))
  checkTellApart(input)

  const sheets = hazardManifest.sources
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'density hazard-manifest.json')
  const density = { ...input, reagents: mergeHazards(input.reagents, json('hazards.json'), sheets) }
  checkSupported(density, manifest.sources, sheets)

  // As for the calorimetry lab: the app lists only the documents a reagent's hazards cite.
  const underHazards = new Set(density.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  return { density, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Freezing point depression lab
//
// The record is authored in docs/research/freezing/freezing.json: the three liquids the unknown may be, urea and
// the three salts, each with its composition, its molar mass worked out from the atomic weights, and the particles
// each formula unit gives (the ideal, or a measured figure with the row it is worked out from); the water with its
// freezing point constant; the atomic weights; the measured freezing points of solutions that were found; the
// three parts with the notes shown when each is done; and the model's parameters. Every source is in
// sources/MANIFEST.json, each row of which names the stored values it supports, and the build holds the record to
// those rows as it does the aqueous lab's. No source has a copy in this lab's folder: the atomic weights are held
// to the periodic table's record. What the record works out is worked out again here, and its numbers are held to
// spec 23.3 and 23.6 (scripts/freezing-lib.mjs): the three liquids far enough apart to tell at the figures the
// instruments give, ice left in a careful run at every seeded amount, and every fall of three figures. The hazards
// are authored apart, in hazards.json with sources/hazard-manifest.json, and merged in as the measurement and
// density lab's are: every record is this lab's own, none being the same thing in the same form as another lab's,
// though eight of the documents behind them are ones the iodination of acetone, flame test and density labs list.

const FREEZING_KEYS = ['reagents', 'water', 'atomicWeights', 'measured', 'parts', 'parameters']
const FREEZING_REAGENTS = ['acetone', 'ethanol', 'propan-2-ol', 'urea', 'nacl', 'kcl', 'nabr']
const FREEZING_PARTS = ['water', 'unknown', 'particles']

function buildFreezing(earlierSources, periodicTable) {
  const json = (name) => JSON.parse(readFileSync(join(freezingResearch, name), 'utf8'))
  const input = json('freezing.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, FREEZING_KEYS, 'freezing.json')
  if (input.reagents.map((r) => r.id).join() !== FREEZING_REAGENTS.join()) fail('freezing.json: the reagents are not the three liquids, urea and the three salts of spec 23.1, in their order')
  if (input.parts.map((p) => p.id).join() !== FREEZING_PARTS.join()) fail('freezing.json: the parts are not the three of spec 23.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('freezing manifests: no source of this lab has a copy in its folder')
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `freezing.json: parameters.${key}`)
  const [, unknown, particles] = input.parts
  if ([...unknown.candidateIds, ...particles.soluteIds].join() !== FREEZING_REAGENTS.join()) fail('freezing.json: the liquids the unknown may be and the solutes of part 3 are not the reagents, in their order')

  // A source another lab lists too (the atomic weights, a handbook table, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'freezing MANIFEST.json')

  checkFreezingMolarMasses(input, periodicTable)
  checkMeasured(input)
  checkNumbers(input)

  const sheets = hazardManifest.sources
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'freezing hazard-manifest.json')
  const freezing = { ...input, reagents: mergeHazards(input.reagents, json('hazards.json'), sheets) }
  checkSupported(freezing, manifest.sources, sheets)

  // As for the calorimetry lab: the app lists only the documents a reagent's hazards cite.
  const underHazards = new Set(freezing.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  return { freezing, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Types of reactions lab
//
// The record is authored in docs/research/reactions/reactions.json: the nine things on the benches; the species an
// equation is built from; the four kinds with their patterns in letters; the choices an observation is recorded
// from; the order of the three metals; the five stations, each with its vessels (what is there before, what is
// seen after, the words for each look, the kind, the equation and, at one, the catalyst), its tiles and the notes
// shown when it is done; and the model's parameters. Every source is in sources/MANIFEST.json, each row of which
// names the stored values it supports, and the build holds the record to those rows as it does the aqueous lab's.
// No source has a copy in this lab's folder. What the record states of its own chemistry is checked here
// (scripts/reactions-lib.mjs): every equation balances in atoms and in charge, every tile an equation needs is
// offered with some that are not needed, what is seen has stored words and stored choices, and the order of the
// metals is the order their tubes show (spec 24.5). The hazards are authored apart, in hazards.json with
// sources/hazard-manifest.json, and merged in as the iodination of acetone lab's are: the 1 M hydrochloric acid
// and the 0.5 M iron(III) chloride carry the aqueous reactions lab's records unchanged, with that lab's documents
// behind them; the other seven are this lab's own, though fourteen of the documents behind them are ones the
// aqueous reactions, flame test, calorimetry and density labs list too.

const REACTIONS_KEYS = ['reagents', 'species', 'kinds', 'choices', 'activity', 'stations', 'parameters']
const REACTIONS_REAGENTS = ['zinc-pieces', 'cuso4-1m', 'magnesium-ribbon', 'hcl-1m', 'copper-pieces', 'cacl2-1m', 'na2co3-1m', 'fecl3-0.5m', 'h2o2-3']
const REACTIONS_STATIONS = ['zinc-copper-sulfate', 'magnesium-flame', 'metals-in-acid', 'two-solutions', 'peroxide']
const REACTIONS_KINDS = ['combination', 'decomposition', 'single-replacement', 'double-replacement']
/** The bottles whose hazards are the aqueous reactions lab's records. */
const REACTIONS_SHARED = ['hcl-1m', 'fecl3-0.5m']
/** The field of a hazard manifest's row for a document read for the primer. */
const REACTIONS_PRIMER_SAFETY = 'primer.safety'

function buildReactions(earlierSources) {
  const json = (name, folder = reactionsResearch) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const input = json('reactions.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, REACTIONS_KEYS, 'reactions.json')
  if (input.reagents.map((r) => r.id).join() !== REACTIONS_REAGENTS.join()) fail('reactions.json: the reagents are not the nine of spec 24.1, in their order')
  if (input.stations.map((s) => s.id).join() !== REACTIONS_STATIONS.join()) fail('reactions.json: the stations are not the five of spec 24.1, in their order')
  if (input.kinds.map((k) => k.id).join() !== REACTIONS_KINDS.join()) fail('reactions.json: the kinds are not the four of spec 24.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('reactions manifests: no source of this lab has a copy in its folder')
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `reactions.json: parameters.${key}`)

  // A source another lab lists too (a page on one metal's ions, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'reactions MANIFEST.json')

  checkReactionsBench(input)
  checkEquations(input)
  checkTiles(input)
  checkSeen(input)
  checkOrder(input)

  // The two shared bottles carry the aqueous reactions lab's records unchanged, with that lab's documents behind them.
  const sheets = withSharedSheets(hazardManifest.sources, json('sources/hazard-manifest.json', aqueousResearch).sources, REACTIONS_SHARED)
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'reactions hazard-manifest.json')
  const hazards = withSharedHazards(json('hazards.json'), json('hazards.json', aqueousResearch), REACTIONS_SHARED)
  const reactions = { ...input, reagents: mergeHazards(input.reagents, hazards, sheets) }
  checkSupported(reactions, manifest.sources, sheets)

  // As for the clock reaction lab: the app lists the documents a reagent's hazards cite, and with them those the
  // hazard manifest marks as read for the primer, which no tile need cite.
  const underHazards = new Set(reactions.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === REACTIONS_PRIMER_SAFETY)).map((source) => source.id))
  return { reactions, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Polarity and mixing lab
//
// The record is authored in docs/research/mixing/mixing.json: the one bottle that is a laboratory chemical, the
// rubbing alcohol; the five liquids, each with what it holds, what it looks like, its density with the temperature
// its source gives it for, its family for the rule and the molecule of the library it links to; the two solids; each
// pair of liquids on the bench with whether the two mix, and each solid in a liquid with whether it dissolves, each
// with what it rests on and the note shown when its tube counts; the pairs and the solids in liquids left off the
// bench, with why; part 3's two questions; the three parts with the notes shown when each is done; and the model's
// parameters. Every source is in sources/MANIFEST.json, each row of which names the stored values it supports, and
// the build holds the record to those rows as it does the aqueous lab's. No source has a copy in this lab's folder.
// What the record states of its own bench is checked here (scripts/mixing-lib.mjs): every pair and every solid in a
// liquid is on the bench with a source or is listed as left off it; which liquid is on top follows from two stored
// densities that are far enough apart to say; a part's count can be reached; a linked molecule is in the library.
// The rubbing alcohol's hazards are authored apart, in hazards.json with sources/hazard-manifest.json, and merged in
// as the red cabbage pH lab's are; the record is this lab's own. The note the foods share is not authored here at
// all: it is the red cabbage pH lab's, copied from that lab's record.

const MIXING_KEYS = ['reagents', 'liquids', 'solids', 'pairs', 'solidInLiquid', 'offBench', 'rule', 'sharedNote', 'parts', 'parameters']
const MIXING_REAGENTS = ['rubbing-alcohol']
const MIXING_LIQUIDS = ['water', 'rubbing-alcohol', 'vinegar', 'vegetable-oil', 'mineral-oil']
const MIXING_SOLIDS = ['salt', 'sugar']
const MIXING_PARTS = ['liquids', 'solids', 'rule']
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const MIXING_PRIMER_SAFETY = 'primer.safety'

function buildMixing(earlierSources, molecules) {
  const json = (name, folder = mixingResearch) => JSON.parse(readFileSync(join(folder, name), 'utf8'))
  const input = json('mixing.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, MIXING_KEYS, 'mixing.json')
  if (input.reagents.map((r) => r.id).join() !== MIXING_REAGENTS.join()) fail('mixing.json: the one reagent is the rubbing alcohol (spec 25.3)')
  if (input.liquids.map((l) => l.id).join() !== MIXING_LIQUIDS.join()) fail('mixing.json: the liquids are not the five of spec 25.1, in their order')
  if (input.solids.map((s) => s.id).join() !== MIXING_SOLIDS.join()) fail('mixing.json: the solids are not the two of spec 25.1, in their order')
  if (input.parts.map((p) => p.id).join() !== MIXING_PARTS.join()) fail('mixing.json: the parts are not the three of spec 25.1, in their order')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('mixing manifests: no source of this lab has a copy in its folder')
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `mixing.json: parameters.${key}`)
  for (const liquid of input.liquids) if (liquid.reagentId !== undefined && !MIXING_REAGENTS.includes(liquid.reagentId)) fail(`mixing.json: unknown reagent "${liquid.reagentId}"`)

  // A source another lab lists too (the water's density, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'mixing MANIFEST.json')

  checkMixingBench(input)
  checkSourced(input)
  checkLayers(input)
  checkMixingParts(input)
  checkMolecules(input, molecules.map((m) => m.id))

  const sheets = hazardManifest.sources
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'mixing hazard-manifest.json')
  const mixing = { ...withSharedNote(input, json('cabbage.json', cabbageResearch)), reagents: mergeHazards(input.reagents, json('hazards.json'), sheets) }
  checkSupported(mixing, manifest.sources, sheets)

  // As for the red cabbage pH lab: the app lists the documents the bottle's hazards cite, and with them those the
  // hazard manifest marks as read for the primer's safety topic.
  const underHazards = new Set(mixing.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === MIXING_PRIMER_SAFETY)).map((source) => source.id))
  return { mixing, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// ---------------------------------------------------------------------------
// Endothermic and exothermic lab
//
// The record is authored in docs/research/hotcold/hotcold.json: the two salts, each with what it is, its
// composition, its molar mass worked out from the atomic weights, what it looks like and how much of it dissolves;
// the water with its specific heat and density; the atomic weights; the three parts, the two runs each with the
// enthalpy the model runs on, the row of the tables it is worked from and the notes shown when the run counts, the
// first with the dry magnesium sulfate's figure that its note gives, and part 3 with its notes; and the model's
// parameters. Every source is in sources/MANIFEST.json, each row of which names the stored values it supports, and
// the build holds the record to those rows as it does the aqueous lab's. No source has a copy in this lab's folder:
// the atomic weights are held to the periodic table's record. What the record works out is worked out again here,
// and its numbers are held to spec 26.3 and 26.5 (scripts/hotcold-lib.mjs): Epsom salt takes heat in where calcium
// chloride and the dry magnesium sulfate give it out, each row of the tables is the nearest to the strength on the
// bench, every portion dissolves, and the change in temperature can be read on the logger and takes no cup past
// what the record allows. The hazards are authored apart, in hazards.json with sources/hazard-manifest.json, and
// merged in as the freezing point depression lab's are: both records are this lab's own, the solids as they are
// used here, though four of the five documents behind them are ones the red cabbage pH and flame test labs list.

const HOTCOLD_KEYS = ['reagents', 'water', 'atomicWeights', 'parts', 'parameters']
const HOTCOLD_REAGENTS = ['epsom-salt', 'calcium-chloride']
const HOTCOLD_PARTS = ['epsom-salt', 'calcium-chloride', 'packs']
/** The field of a hazard manifest's row for a document read for the primer's safety topic. */
const HOTCOLD_PRIMER_SAFETY = 'primer.safety'

function buildHotcold(earlierSources, periodicTable) {
  const json = (name) => JSON.parse(readFileSync(join(hotcoldResearch, name), 'utf8'))
  const input = json('hotcold.json')
  const manifest = json('sources/MANIFEST.json')
  const hazardManifest = json('sources/hazard-manifest.json')

  onlyKeys(input, HOTCOLD_KEYS, 'hotcold.json')
  if (input.reagents.map((r) => r.id).join() !== HOTCOLD_REAGENTS.join()) fail('hotcold.json: the reagents are not the two salts of spec 26.1, in their order')
  if (input.parts.map((p) => p.id).join() !== HOTCOLD_PARTS.join()) fail('hotcold.json: the parts are not the three of spec 26.1, in their order')
  if (input.parts.map((p) => p.reagentId).join() !== [...HOTCOLD_REAGENTS, undefined].join()) fail('hotcold.json: each run is of its own salt, and part 3 of none')
  if ([...manifest.sources, ...hazardManifest.sources].some((source) => source.file !== undefined)) fail('hotcold manifests: no source of this lab has a copy in its folder')
  for (const [key, parameter] of Object.entries(input.parameters)) onlyKeys(parameter, ['value', 'rationale'], `hotcold.json: parameters.${key}`)

  // A source another lab lists too (the tables, the atomic weights, a page of the calorimetry lab's primer, a sheet) is listed once.
  const labSources = newSources(manifest.sources, earlierSources, 'hotcold MANIFEST.json')

  checkHotcoldMolarMasses(input, periodicTable)
  checkHotcoldWorkedOut(input)
  checkDirections(input)
  checkDilution(input)
  checkDissolves(input)
  checkChange(input)

  const sheets = hazardManifest.sources
  const sheetSources = newSources(sheets, [...earlierSources, ...labSources], 'hotcold hazard-manifest.json')
  const hotcold = { ...input, reagents: mergeHazards(input.reagents, json('hazards.json'), sheets) }
  checkSupported(hotcold, manifest.sources, sheets)

  // As for the polarity and mixing lab: the app lists the documents a salt's hazards cite, and with them those
  // the hazard manifest marks as read for the primer's safety topic.
  const underHazards = new Set(hotcold.reagents.flatMap(({ hazards: { sourceId, note } }) => [sourceId, note.sourceId, ...(note.alsoSourceId === undefined ? [] : [note.alsoSourceId]), ...(note.moreSourceIds ?? [])]))
  const forPrimer = new Set(hazardManifest.sources.filter((source) => source.supports.some((row) => row.field === HOTCOLD_PRIMER_SAFETY)).map((source) => source.id))
  return { hotcold, sources: [...labSources, ...sheetSources.filter((source) => underHazards.has(source.id) || forPrimer.has(source.id))] }
}

// A static import list keeps the registry free of bundler-only APIs.
function moleculeIndex(molecules) {
  const name = (id) => id.replace(/-(.)/g, (_, c) => c.toUpperCase())
  return [
    '// Generated by scripts/build-chem-data.mjs. Do not edit.',
    ...molecules.map((m) => `import ${name(m.id)} from './${m.id}.json'`),
    '',
    'export const moleculeFiles = [',
    ...molecules.map((m) => `  ${name(m.id)},`),
    ']',
    '',
  ].join('\n')
}

// What the search needs for each library entry, so the app shell can list the molecules without
// loading their structure files. One row per entry: the first file of a variant group stands for it.
function libraryIndex(molecules) {
  return molecules
    .filter((m, i) => !m.variantGroup || molecules.findIndex((other) => other.variantGroup === m.variantGroup) === i)
    .map(({ id, name, formula, charge, topic }) => ({ id, name, formula, charge, topic }))
}

// What the search needs for each element, so the app shell can list all 118 without loading the table.
function elementIndex(periodicTable) {
  return periodicTable.map(({ symbol, name, atomicNumber }) => ({ symbol, name, atomicNumber }))
}

function main() {
  const { elements, sources: elementSources } = buildElements()
  const { molecules, sources: moleculeSources } = buildMolecules(elements)
  const { diagrams, sources: moSources } = buildMoDiagrams(molecules)
  const otherSources = [...elementSources, ...moleculeSources, ...moSources]
  const { elements: periodicTable, sources: periodicTableSources } = buildPeriodicTable(otherSources.map((s) => s.id))
  const earlierSources = [...otherSources, ...periodicTableSources]
  const { titration, sources: titrationSources } = buildTitration(earlierSources.map((s) => s.id))
  const { aqueous, sources: aqueousSources } = buildAqueous([...earlierSources, ...titrationSources])
  const labSources = [...earlierSources, ...titrationSources, ...aqueousSources]
  const { mechanism, sources: mechanismSources } = buildMechanismRecord(labSources, molecules, elements)
  const { spectra, sources: emissionSpectraSources } = buildEmissionSpectra(periodicTable, elements)
  const beforeFlame = [...labSources, ...mechanismSources, ...emissionSpectraSources]
  const { flame, sources: flameSources } = buildFlame(beforeFlame)
  const beforeCalorimetry = [...beforeFlame, ...flameSources]
  const { calorimetry, sources: calorimetrySources } = buildCalorimetry(beforeCalorimetry, periodicTable)
  const beforeCations = [...beforeCalorimetry, ...calorimetrySources]
  const { cations, sources: cationsSources } = buildCations(beforeCations, periodicTable)
  const beforeLechatelier = [...beforeCations, ...cationsSources]
  const { lechatelier, sources: lechatelierSources } = buildLechatelier(beforeLechatelier, periodicTable)
  const beforeClock = [...beforeLechatelier, ...lechatelierSources]
  const { clock, sources: clockSources } = buildClock(beforeClock)
  const beforeAcetone = [...beforeClock, ...clockSources]
  const { acetone, sources: acetoneSources } = buildAcetone(beforeAcetone)
  const beforeCabbage = [...beforeAcetone, ...acetoneSources]
  const { cabbage, sources: cabbageSources } = buildCabbage(beforeCabbage)
  const beforeDensity = [...beforeCabbage, ...cabbageSources]
  const { density, sources: densitySources } = buildDensity(beforeDensity)
  const beforeFreezing = [...beforeDensity, ...densitySources]
  const { freezing, sources: freezingSources } = buildFreezing(beforeFreezing, periodicTable)
  const beforeReactions = [...beforeFreezing, ...freezingSources]
  const { reactions, sources: reactionsSources } = buildReactions(beforeReactions)
  const beforeMixing = [...beforeReactions, ...reactionsSources]
  const { mixing, sources: mixingSources } = buildMixing(beforeMixing, molecules)
  const beforeHotcold = [...beforeMixing, ...mixingSources]
  const { hotcold, sources: hotcoldSources } = buildHotcold(beforeHotcold, periodicTable)
  const sources = [...beforeHotcold, ...hotcoldSources]
  if (new Set(sources.map((s) => s.id)).size !== sources.length) fail('duplicate source ids')

  // Everything is built before anything is written.
  const moleculeDir = join(out, 'molecules')
  rmSync(moleculeDir, { recursive: true, force: true })
  mkdirSync(moleculeDir, { recursive: true })
  for (const molecule of molecules) writeFileSync(join(moleculeDir, `${molecule.id}.json`), toJson(molecule))
  writeFileSync(join(moleculeDir, 'index.ts'), moleculeIndex(molecules))
  writeFileSync(join(out, 'elements.json'), toJson(elements))
  writeFileSync(join(out, 'mo-diagrams.json'), toJson(diagrams))
  writeFileSync(join(out, 'library-index.json'), toJson(libraryIndex(molecules)))
  writeFileSync(join(out, 'periodic-table.json'), toJson(periodicTable))
  writeFileSync(join(out, 'element-index.json'), toJson(elementIndex(periodicTable)))
  writeFileSync(join(out, 'emission-spectra.json'), toJson(spectra))
  writeFileSync(join(out, 'titration/titration.json'), toJson(titration))
  mkdirSync(join(out, 'aqueous'), { recursive: true })
  writeFileSync(join(out, 'aqueous/aqueous.json'), toJson(aqueous))
  mkdirSync(join(out, 'flame'), { recursive: true })
  writeFileSync(join(out, 'flame/flame.json'), toJson(flame))
  mkdirSync(join(out, 'calorimetry'), { recursive: true })
  writeFileSync(join(out, 'calorimetry/calorimetry.json'), toJson(calorimetry))
  mkdirSync(join(out, 'cations'), { recursive: true })
  writeFileSync(join(out, 'cations/cations.json'), toJson(cations))
  mkdirSync(join(out, 'lechatelier'), { recursive: true })
  writeFileSync(join(out, 'lechatelier/lechatelier.json'), toJson(lechatelier))
  mkdirSync(join(out, 'clock'), { recursive: true })
  writeFileSync(join(out, 'clock/clock.json'), toJson(clock))
  mkdirSync(join(out, 'acetone'), { recursive: true })
  writeFileSync(join(out, 'acetone/acetone.json'), toJson(acetone))
  mkdirSync(join(out, 'cabbage'), { recursive: true })
  writeFileSync(join(out, 'cabbage/cabbage.json'), toJson(cabbage))
  mkdirSync(join(out, 'density'), { recursive: true })
  writeFileSync(join(out, 'density/density.json'), toJson(density))
  mkdirSync(join(out, 'freezing'), { recursive: true })
  writeFileSync(join(out, 'freezing/freezing.json'), toJson(freezing))
  mkdirSync(join(out, 'reactions'), { recursive: true })
  writeFileSync(join(out, 'reactions/reactions.json'), toJson(reactions))
  mkdirSync(join(out, 'mixing'), { recursive: true })
  writeFileSync(join(out, 'mixing/mixing.json'), toJson(mixing))
  mkdirSync(join(out, 'hotcold'), { recursive: true })
  writeFileSync(join(out, 'hotcold/hotcold.json'), toJson(hotcold))
  mkdirSync(join(root, 'src/mechanisms'), { recursive: true })
  writeFileSync(join(root, 'src/mechanisms', `${mechanism.id}.json`), toJson(mechanism))
  writeFileSync(join(out, 'sources.json'), toJson(sources))
  process.stdout.write(
    `Wrote ${elements.length} elements, ${molecules.length} structures, ${diagrams.length} MO diagrams, ${periodicTable.length} periodic table records, the titration lab's record, the aqueous reactions lab's record, the flame test lab's record, the calorimetry lab's record, the Group I cations lab's record, the Le Chatelier's principle lab's record, the clock reaction lab's record, the iodination of acetone lab's record, the red cabbage pH lab's record, the measurement and density lab's record, the freezing point depression lab's record, the types of reactions lab's record, the polarity and mixing lab's record, the endothermic and exothermic lab's record, the mechanism timeline's record, ${spectra.filter((s) => s.emission).length} emission spectra, ${sources.length} sources.\n`,
  )
}

try {
  main()
} catch (error) {
  process.stderr.write(`build-chem-data: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
