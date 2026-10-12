import { candidatesOf, unknownsOf, type DensityData, type PartId, type UnknownPartId } from '@/chem-data/density/data'
import { formatEntry, formatReading, isLevel, kindOf, READ_FROM, type BalanceView, type BenchView, type Blocked, type CylinderView, type DensityModel, type Expected, type Eye, type Field, type Figures, type Instrument, type Mode, type NoteView, type PartView, type Position, type ReadingProblem, type Reason, type RunOutcome, type ScaleView, type Slip, type Value, type Verdict, type Warning } from '@/engine/density'

// Every sentence the measurement and density lab's page shows, apart from the primer and the record's notes. The
// page's builder writes no learner sentence: it takes them from here. Nothing in this file gives what a scale
// reads as a number before the learner has typed it: a scale is put into words as it is seen, by the two marks
// its level stands between and whereabouts between them. Nothing says which liquid or which metal an unknown is
// until the engine hands that over, which it does once a run of the part counts.

const lower = (text: string) => `${text[0]!.toLowerCase()}${text.slice(1)}`
/** A hyphen in front of a number is written as a minus sign. */
const minus = (text: string) => text.replace(/^-/, '−')

// ---------------------------------------------------------------------------
// Figures as they are written

const UNIT: Record<Instrument, string> = { 'ruler-cm': 'cm', 'ruler-mm': 'cm', cylinder: 'mL', thermometer: '°C', balance: 'g' }

/** A reading with every figure and its unit: "6.0 cm", "24.30 g", "−0.4 °C". */
export const readingText = (m: DensityModel, instrument: Instrument, value: number) => `${minus(formatReading(m, instrument, value))} ${UNIT[instrument]}`

/** The unit of a field's number; none for a name. */
export const FIELD_UNIT: Record<Field, string> = {
  lengthCm: 'cm',
  widthCm: 'cm',
  lengthMm: 'cm',
  widthMm: 'cm',
  firstVolume: 'mL',
  temperature: '°C',
  firstMass: 'g',
  areaCm: 'cm²',
  areaMm: 'cm²',
  thermometerOff: '°C',
  emptyMass: 'g',
  liquidVolume: 'mL',
  fullMass: 'g',
  liquidMass: 'g',
  liquidDensity: 'g/mL',
  liquid: '',
  piecesMass: 'g',
  waterLevel: 'mL',
  finalLevel: 'mL',
  metalVolume: 'mL',
  metalDensity: 'g/mL',
  metal: '',
}

const rowName = (data: DensityData, id: string) => [...data.liquids, ...data.metals].find((row) => row.id === id)?.name ?? id

/** An entry as the number alone, as it was typed, so that the parsers read it back as the same entry; a name as the table has it. */
export function entryText(m: DensityModel, data: DensityData, field: Field, value: Value): string {
  const instrument = READ_FROM[field]
  if (typeof value === 'string') return rowName(data, value)
  if (instrument !== undefined) return formatReading(m, instrument, isLevel(value) ? value.value : (value as number))
  return formatEntry(value as Figures)
}

/** An entry as it is shown beside its label: the number with a true minus sign and its unit, or the name. */
export function enteredText(m: DensityModel, data: DensityData, field: Field, value: Value): string {
  const text = minus(entryText(m, data, field, value))
  return FIELD_UNIT[field] === '' ? text : `${text} ${FIELD_UNIT[field]}`
}

/** How many significant figures a number has, in words: "3 significant figures". */
export const figuresText = (figures: number) => `${figures} significant figure${figures === 1 ? '' : 's'}`

// ---------------------------------------------------------------------------
// The parts

export const PART_NUMBER: Record<PartId, string> = { reading: 'Part 1', liquid: 'Part 2', metal: 'Part 3' }
export const partTitle = (data: DensityData, part: PartId) => `${PART_NUMBER[part]}: ${data.parts.find((p) => p.id === part)!.name}`

/** What a part is for. Shown in Challenge too, so it gives no relation and no rule. */
export const PART_AIM: Record<PartId, string> = {
  reading: 'Read each instrument to its last figure. Then work out the area of the note from each ruler, and how far the thermometer is off.',
  liquid: 'Find the density of the unknown liquid, and name it from the table.',
  metal: 'Find the density of the unknown metal, and name it from the table.',
}

/** What is set out for a part, a line for each thing. */
export function benchLines(data: DensityData, part: PartId): string[] {
  if (part === 'reading') return ['A paper note, with a ruler marked in centimetres and one marked in millimetres.', 'A 50 mL graduated cylinder with water in it, marked each millilitre.', 'A thermometer marked each degree, standing in a beaker of ice and water.', 'A balance that shows hundredths of a gram, with an object on it.']
  if (part === 'liquid') return ['A 50 mL graduated cylinder, empty and dry.', `A bottle of the unknown liquid: ${data.parts[1].unknown.appearance}.`, 'A balance that shows hundredths of a gram.', 'A table of the densities of five liquids.']
  return ['A 50 mL graduated cylinder with distilled water in it.', `The unknown metal: ${data.parts[2].unknown.appearance}, dry.`, 'A balance that shows hundredths of a gram.', 'A table of the densities of four metals.']
}

// ---------------------------------------------------------------------------
// The table beside an unknown, and its hazards

/** The rows of the table shown beside an unknown: each name with its density. */
export const candidateLines = (data: DensityData, part: UnknownPartId): string[] => candidatesOf(data, part).map((row) => `${row.name}: ${row.density.value.toPrecision(3)} ${row.density.unit}`)

export const TABLE_HEADING: Record<UnknownPartId, string> = { liquid: 'Densities of liquids', metal: 'Densities of metals' }
/** What the figures of a table are for: their temperature and, for the liquids, how a strength is counted. */
export const TABLE_CAPTION: Record<UnknownPartId, string> = {
  liquid: 'At 20 °C. A percentage is by mass: grams of ethanol or of salt in every 100 g of the liquid.',
  metal: 'Near room temperature, for the pure metal.',
}

/** The choices for an unknown's name: every row of its table. */
export const nameChoices = (data: DensityData, part: UnknownPartId) => candidatesOf(data, part).map((row) => ({ value: row.id, label: row.name }))

/** The heading over the hazards of an unknown: every thing it may be until it is named, so that the tiles do not say which it is. */
export function hazardsHeading(data: DensityData, part: UnknownPartId, expected: Expected | null): string {
  if (expected?.kind === 'unknown') return `The unknown ${part} was ${lower(rowName(data, expected.id))}. Its hazards:`
  const count = unknownsOf(data, part).length
  return part === 'liquid' ? `The unknown liquid may be ${count === 2 ? 'either' : 'any'} of these. Until it is named, handle it as ${count === 2 ? 'both' : 'all'} say.` : `The unknown metal may be any of these ${count === 3 ? 'three' : count}. Until it is named, handle the pieces as all of them say.`
}

// ---------------------------------------------------------------------------
// The instruments in words (spec 22.6): as they are seen, never as a number

export const INSTRUMENT_NAME: Record<Instrument, string> = { 'ruler-cm': 'Ruler marked in centimetres', 'ruler-mm': 'Ruler marked in millimetres', cylinder: 'Graduated cylinder', thermometer: 'Thermometer', balance: 'Balance' }

/** How an instrument is marked and what it is read to. */
export const INSTRUMENT_HELP: Record<Instrument, string> = {
  'ruler-cm': 'Marked each centimetre. Read it to a tenth of a centimetre: the tenths are your estimate between two marks.',
  'ruler-mm': 'Marked each millimetre, which is a tenth of a centimetre. Read it to a hundredth of a centimetre: the hundredths are your estimate between two marks.',
  cylinder: 'Marked each millilitre. Read the bottom of the curve to a tenth of a millilitre, with your eye level with it.',
  thermometer: 'Marked each degree. Read the top of the thread to a tenth of a degree.',
  balance: 'Shows hundredths of a gram. Copy every figure it shows, a final zero included.',
}

/** A mark of a scale as it is numbered: "13 cm", "13.8 cm", "−1 °C". */
export function markText(view: Pick<ScaleView, 'markE3' | 'unit'>, atE3: number): string {
  const decimals = view.markE3 >= 1000 ? 0 : view.markE3 >= 100 ? 1 : 2
  return `${minus((atE3 / 1000).toFixed(decimals))} ${view.unit}`
}

/** Whereabouts between two marks, in words. A ruler runs along and a cylinder or a thermometer runs up. */
function whereabouts(view: ScaleView): string {
  const up = view.instrument === 'cylinder' || view.instrument === 'thermometer'
  const [low, high] = [markText(view, view.lowerE3), markText(view, view.upperE3)]
  const between = `between the ${low} and ${high} marks`
  const places: Record<Position, string> = {
    'on-lower': `on the ${low} mark`,
    'just-past': `${between}, just ${up ? 'above' : 'past'} the ${low} mark`,
    quarter: `${between}, about a quarter of the way ${up ? 'up ' : ''}from the ${low} mark`,
    half: `${between}, about halfway between them`,
    'three-quarters': `${between}, about three quarters of the way ${up ? 'up ' : ''}from the ${low} mark`,
    'just-short': `${between}, just ${up ? 'below' : 'short of'} the ${high} mark`,
    'on-upper': `on the ${high} mark`,
  }
  return places[view.position]
}

/** Where a scale stands, in words: "between the 25 mL and 26 mL marks, about a quarter of the way up from the 25 mL mark". */
export const describeScale = (view: ScaleView) => whereabouts(view)

/** The note against one ruler, in words: where each of its far edges stands. */
export function describeNote(note: NoteView): string {
  return `The note lies with one corner on the zero mark. Along its long side, its far edge is ${whereabouts(note.length)}. Along its short side, its far edge is ${whereabouts(note.width)}.`
}

export const EYE_LABEL: Record<Eye, string> = { above: 'Eye above the level', level: 'Eye level with it', below: 'Eye below the level' }
/** What is seen from where the eye is. It does not say which way the level is off. */
export const EYE_TEXT: Record<Eye, string> = {
  above: "Your eye is above the level: you are looking down on the liquid's surface.",
  level: 'Your eye is level with the bottom of the curve.',
  below: "Your eye is below the level: you are looking up at the underside of the liquid's surface.",
}

const HOLDS: Record<CylinderView['holds'], string> = { nothing: 'The cylinder is empty and dry.', water: 'The cylinder holds water.', 'unknown-liquid': 'The cylinder holds the unknown liquid.' }

/** The cylinder in words: what is in it, where the eye is, and where the bottom of the curve stands as it looks from there. */
export function describeCylinder(cylinder: CylinderView): string {
  if (cylinder.scale === null) return HOLDS.nothing
  const holds = cylinder.pieces ? 'The cylinder holds water, with the pieces of metal under it.' : HOLDS[cylinder.holds]
  const seen = cylinder.eye === 'level' ? `The bottom of the curve is ${whereabouts(cylinder.scale)}.` : `From here the bottom of the curve looks to be ${whereabouts(cylinder.scale)}.`
  return `${holds} ${EYE_TEXT[cylinder.eye]} ${seen}`
}

/** The thermometer in ice and water, in words. */
export const describeThermometer = (view: ScaleView) => `The thermometer stands in ice and water. The top of its thread is ${whereabouts(view)}.`

const ON_PAN: Record<BalanceView['holds'], string> = {
  nothing: 'Nothing is on the balance.',
  object: 'The object is on the balance.',
  'empty-cylinder': 'The empty cylinder is on the balance.',
  'cylinder-with-liquid': 'The cylinder with the liquid in it is on the balance.',
  pieces: 'The dry pieces are on the balance.',
  'wet-pieces': 'The pieces are on the balance, wet from the cylinder.',
}

/** The balance in words: what is on it and what its display shows, every figure. A balance is read by copying it, so its figures are what is seen. */
export const describeBalance = (m: DensityModel, balance: BalanceView) => (balance.cg === null ? ON_PAN.nothing : `${ON_PAN[balance.holds]} Its display shows ${readingText(m, 'balance', balance.cg)}.`)

/** Where the pieces of part 3 are. */
export function describePieces(bench: BenchView): string {
  const { weighed, added } = bench.steps
  if (added === 'no') return weighed === 'dry' ? 'The pieces are dry, on the balance.' : 'The pieces are dry, beside the cylinder.'
  if (weighed === 'wet') return 'The pieces have been taken out of the cylinder, wet, and put on the balance.'
  return added === 'slid' ? 'The pieces are in the cylinder, under the water: they were slid down the tilted glass.' : 'The pieces are in the cylinder, under the water: they were dropped in, and water splashed out.'
}

/** A part's whole bench in words, a line for each instrument, as it stands now. */
export function describeBench(m: DensityModel, part: PartId, bench: BenchView): string[] {
  if (part === 'reading') return [`${INSTRUMENT_NAME['ruler-cm']}. ${describeNote(bench.rulerCm!)}`, `${INSTRUMENT_NAME['ruler-mm']}. ${describeNote(bench.rulerMm!)}`, describeCylinder(bench.cylinder), describeThermometer(bench.thermometer!), describeBalance(m, bench.balance)]
  return [describeCylinder(bench.cylinder), describeBalance(m, bench.balance), ...(part === 'metal' ? [describePieces(bench)] : [])]
}

// ---------------------------------------------------------------------------
// The bench's controls

export const BENCH_TEXT = {
  closerLook: 'Look closer',
  closerLookOf: (instrument: Instrument) => `Look closer at the ${lower(INSTRUMENT_NAME[instrument])}`,
  closeLook: 'Close the closer look',
  eye: 'Where your eye is',
  moveEye: { above: 'Look from above', level: 'Bring your eye level', below: 'Look from below' } satisfies Record<Eye, string>,
  weighEmpty: 'Put the empty cylinder on the balance',
  pour: 'Pour the unknown liquid into the cylinder',
  weighFull: 'Put the cylinder with the liquid on the balance',
  weighPieces: 'Put the pieces on the balance',
  weighWetPieces: 'Take the pieces out and put them on the balance',
  slide: 'Tilt the cylinder and slide the pieces in',
  drop: 'Drop the pieces in',
  readingBox: (instrument: Instrument) => `Your reading of the ${lower(INSTRUMENT_NAME[instrument])}`,
  record: 'Record the reading',
  /** The name of the closer look's picture. */
  closerPicture: (instrument: Instrument) => `${INSTRUMENT_NAME[instrument]}, seen closer`,
  /** Over each of a ruler's two pictures: which side of the note lies along it. */
  side: { length: 'The long side of the note along the ruler', width: 'The short side of the note along the ruler' },
  inWords: 'What it shows, in words',
} as const

/** How far the readings of one instrument have come, in the list of a part's pages. */
export const readText = (made: number, of: number) => (made === of ? 'Read' : made === 0 ? 'Not read yet' : `${made} of ${of} read`)

/** The label of the one weighing a part's bench offers now. */
export function weighLabel(part: PartId, bench: BenchView): string {
  if (part === 'liquid') return bench.steps.poured ? BENCH_TEXT.weighFull : BENCH_TEXT.weighEmpty
  return bench.steps.added === 'no' ? BENCH_TEXT.weighPieces : BENCH_TEXT.weighWetPieces
}

// ---------------------------------------------------------------------------
// The notebook

const LABEL: Record<Field, string> = {
  lengthCm: 'Length of the note, centimetre ruler',
  widthCm: 'Width of the note, centimetre ruler',
  lengthMm: 'Length of the note, millimetre ruler',
  widthMm: 'Width of the note, millimetre ruler',
  firstVolume: 'Volume of water in the cylinder',
  temperature: 'Thermometer in ice and water',
  firstMass: 'Mass of the object',
  areaCm: 'Area of the note, from the centimetre ruler',
  areaMm: 'Area of the note, from the millimetre ruler',
  thermometerOff: 'How far the thermometer is off',
  emptyMass: 'Mass of the empty cylinder',
  liquidVolume: 'Volume of the liquid',
  fullMass: 'Mass of the cylinder with the liquid',
  liquidMass: 'Mass of the liquid',
  liquidDensity: 'Density of the liquid',
  liquid: 'The unknown liquid is',
  piecesMass: 'Mass of the pieces',
  waterLevel: 'Level of the water before the pieces',
  finalLevel: 'Level with the pieces in',
  metalVolume: 'Volume of the pieces',
  metalDensity: 'Density of the metal',
  metal: 'The unknown metal is',
}

/** An entry's label, with its unit: "Mass of the liquid (g)". */
export const fieldLabel = (field: Field) => (FIELD_UNIT[field] === '' ? LABEL[field] : `${LABEL[field]} (${FIELD_UNIT[field]})`)

/** How an entry is typed. The examples are fixed, and none is a figure a run can have. */
export function formatHelp(field: Field): string {
  const instrument = READ_FROM[field]
  if (instrument === 'ruler-cm') return 'To a tenth of a centimetre, for example 8.4.'
  if (instrument === 'ruler-mm') return 'To a hundredth of a centimetre, for example 8.43.'
  if (instrument === 'cylinder') return 'To a tenth of a millilitre, for example 9.6.'
  if (instrument === 'thermometer') return 'To a tenth of a degree, for example 1.2, or −0.9 below zero.'
  if (instrument === 'balance') return 'Every figure the balance shows, for example 7.30.'
  if (kindOf(field) === 'name') return 'Choose from the table.'
  return field === 'thermometerOff' ? 'A number with its sign: negative if the thermometer reads low.' : 'A number, rounded as its rule says.'
}

const SUM_RULE = 'A sum or a difference stops at the decimal place of its least exact term.'
const PRODUCT_RULE = 'A product or a quotient gets as many significant figures as its factor with the fewest.'

/** The relation behind a worked-out entry, and the rule it is rounded by: Guided's closed hint. Empty for a reading. */
export function relationText(field: Field): string {
  switch (field) {
    case 'areaCm':
    case 'areaMm':
      return `Area = length × width, from this ruler's two readings. ${PRODUCT_RULE}`
    case 'thermometerOff':
      return `How far off = the thermometer's reading − 0.0 °C, the temperature of ice and water together. ${SUM_RULE} Keep the sign: negative if it reads low.`
    case 'liquidMass':
      return `Mass of the liquid = mass of the cylinder with the liquid − mass of the empty cylinder. ${SUM_RULE}`
    case 'liquidDensity':
      return `Density = mass of the liquid ÷ volume of the liquid. ${PRODUCT_RULE}`
    case 'metalVolume':
      return `Volume of the pieces = level with the pieces in − level before. ${SUM_RULE}`
    case 'metalDensity':
      return `Density = mass of the pieces ÷ volume of the pieces. ${PRODUCT_RULE}`
    case 'liquid':
    case 'metal':
      return 'Find the density in the table that is nearest your own.'
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Refusals and feedback

/** What a reading is read to, and a fixed example of a final zero that belongs to it. */
const READ_TO: Record<Instrument, { to: string; zero: string; why: string }> = {
  'ruler-cm': { to: '0.1 cm', zero: '7.0, not 7', why: 'Its marks are a centimetre apart, so the tenths are already your estimate' },
  'ruler-mm': { to: '0.01 cm', zero: '7.30, not 7.3', why: 'Its marks are a tenth of a centimetre apart, so the hundredths are already your estimate' },
  cylinder: { to: '0.1 mL', zero: '9.0, not 9', why: 'Its marks are a millilitre apart, so the tenths are already your estimate' },
  thermometer: { to: '0.1 °C', zero: '1.0, not 1', why: 'Its marks are a degree apart, so the tenths are already your estimate' },
  balance: { to: '0.01 g', zero: '7.30, not 7.3', why: 'It shows two decimal places' },
}
const SCALE_RANGE: Record<Instrument, string> = { 'ruler-cm': 'from 0 to 20 cm', 'ruler-mm': 'from 0 to 20 cm', cylinder: 'from 0 to 50 mL', thermometer: 'from −10 to 110 °C', balance: 'from 0 g up' }

/** Why a typed reading is not one its instrument can give (spec 22.2): the refusal says which, with the reason. */
export function readingRefusal(instrument: Instrument, problem: ReadingProblem, typed: string): string {
  const text = typed.trim()
  const name = lower(INSTRUMENT_NAME[instrument])
  const { to, zero, why } = READ_TO[instrument]
  switch (problem) {
    case 'not-a-number':
      return `Type the reading as a number, to ${to}.`
    case 'too-few-figures':
      return instrument === 'balance'
        ? `${text} has too few figures for the balance. Every figure it shows is part of the reading, a final zero included: ${zero}.`
        : `${text} has too few figures for the ${name}. It is read to ${to}: one figure beyond its finest mark, which you estimate between two marks. Write that figure even when it is a zero: ${zero}.`
    case 'too-many-figures':
      return instrument === 'balance' ? `${text} has more figures than the balance shows. ${why}: copy those and no more.` : `${text} has too many figures for the ${name}. ${why}: nobody can read a figure beyond that. Write it to ${to}.`
    case 'off-the-scale':
      return `${text} is not on the scale of the ${name}, which runs ${SCALE_RANGE[instrument]}.`
  }
}

/** The refusal of a worked-out entry that is not a plain number. */
export const ENTRY_NOT_A_NUMBER = 'Type a plain number, for example 2.4. No units, and no power of ten.'

const NOT_SHOWN: Record<Instrument, string> = {
  'ruler-cm': 'That is more than 0.2 cm from where the edge stands on this ruler. Find the two marks it is between, then judge the tenths.',
  'ruler-mm': 'That is more than 0.02 cm from where the edge stands on this ruler. Find the two millimetre marks it is between, then judge how far it is from one to the next.',
  cylinder: 'That is more than 0.2 mL from where the bottom of the curve stands on the scale, as you see it from where your eye is. Find the two marks it is between, then judge the tenths.',
  thermometer: 'That is more than 0.2 °C from where the top of the thread stands. Find the two marks it is between, then judge the tenths. Below zero the numbers run downward.',
  balance: 'That is not what the balance shows. Copy every figure of its display.',
}

const SLIP_TEXT: Record<Slip, (field: Field) => string> = {
  'eye-above': () => 'This level was read with your eye above it, so it was read wrong.',
  'eye-below': () => 'This level was read with your eye below it, so it was read wrong.',
  'decimals-too-many': () => `The arithmetic is right, but it has too many decimal places. ${SUM_RULE} Count the decimal places of the two numbers you took it from, and stop there.`,
  'decimals-too-few': () => `The arithmetic is right, but it has too few decimal places. ${SUM_RULE} Write every place the two numbers have, a final zero included.`,
  'figures-too-many': () => `The arithmetic is right, but it has too many significant figures. ${PRODUCT_RULE} Count the figures of the two numbers you worked it from, and round to the smaller count.`,
  'figures-too-few': () => `The arithmetic is right, but it has too few significant figures. ${PRODUCT_RULE} Keep as many as the factor with the fewest has, a final zero included.`,
  'cut-off': () => 'The figures are right as far as they go, but the number was cut off where it should have been rounded. When the first figure dropped is 5 or more, the last figure kept goes up by one.',
  'wrong-sign': (field) => (field === 'thermometerOff' ? 'The size is right and the sign is not. Take 0.0 °C from the reading: a thermometer that reads below zero in ice and water is off by a negative amount.' : field === 'liquidDensity' || field === 'metalDensity' ? 'A density is not negative.' : 'The size is right and the sign is not. Take the first from the second, not the second from the first.'),
  'upside-down': () => 'That is volume over mass. Density is mass divided by volume.',
  'cylinder-not-taken-off': () => 'That is the mass of the cylinder and the liquid together, over the volume. Use the mass of the liquid alone.',
  'level-not-rise': () => 'That is the mass over the last level. The volume of the pieces is the rise: the last level less the first.',
}

const NOT_FOLLOWING: Partial<Record<Field, string>> = {
  areaCm: 'This is not the length times the width as you read them on the centimetre ruler.',
  areaMm: 'This is not the length times the width as you read them on the millimetre ruler.',
  thermometerOff: 'This is not the thermometer’s reading less 0.0 °C.',
  liquidMass: 'This is not the mass of the cylinder with the liquid less the mass of the empty cylinder, as you read them.',
  liquidDensity: 'This is not your mass of the liquid divided by your volume of the liquid.',
  liquid: 'This is not the liquid of the table whose density is nearest your own.',
  metalVolume: 'This is not the level with the pieces in less the level before, as you read them.',
  metalDensity: 'This is not your mass of the pieces divided by your volume of the pieces.',
  metal: 'This is not the metal of the table whose density is nearest your own.',
}

/** What is said of an entry once its verdict may be shown. It names the slip, and which rule was broken, and never the value. */
export function entryFeedback(field: Field, verdict: Verdict): string {
  if (verdict.follows) return kindOf(field) === 'reading' ? 'This is what the instrument showed.' : 'This follows from your own numbers.'
  if (verdict.slip) return SLIP_TEXT[verdict.slip](field)
  const instrument = READ_FROM[field]
  return instrument !== undefined ? NOT_SHOWN[instrument].replace(', as you see it from where your eye is', '') : NOT_FOLLOWING[field]!
}

export const VERDICT_TEXT = { reading: { right: 'As shown', not: 'Not as shown' }, worked: { right: 'Follows', not: 'Does not follow' } } as const
export const verdictLabel = (field: Field, verdict: Verdict) => VERDICT_TEXT[kindOf(field) === 'reading' ? 'reading' : 'worked'][verdict.follows ? 'right' : 'not']

const NOT_SHOWN_YET: Partial<Record<Field, string>> = {
  emptyMass: 'Put the empty cylinder on the balance first.',
  liquidVolume: 'Pour the liquid into the cylinder first.',
  fullMass: 'Put the cylinder on the balance again, with the liquid in it, first.',
  piecesMass: 'Put the pieces on the balance first.',
  finalLevel: 'Put the pieces into the cylinder first.',
}
const NO_LONGER_SHOWN: Partial<Record<Field, string>> = {
  emptyMass: 'The liquid is in the cylinder now, so the balance cannot show the empty cylinder again. To change this reading, run the part again.',
  waterLevel: 'The pieces have been put into the water, so its first level is gone. To change this reading, run the part again.',
  finalLevel: 'The pieces have been taken out, so that level is gone. To change this reading, run the part again.',
}

/** Why an action cannot be done now, in a sentence. `field` is the entry it is about, where there is one. */
export function blockedText(part: PartId, blocked: Blocked, field?: Field): string {
  switch (blocked) {
    case 'lab-completed':
      return 'The lab is complete: all three parts count.'
    case 'unknown-part':
    case 'not-this-part':
      return 'That is not part of this part of the lab.'
    case 'already-done':
      return 'That has been done already.'
    case 'run-over':
      return 'This run has been checked. Run the part again to work it with new numbers.'
    case 'nothing-to-repeat':
      return 'Nothing has been done in this run yet.'
    case 'notebook-not-full':
      return 'Fill in every entry of the notebook before you check it.'
    case 'invalid-entry':
      return 'That is not something this entry can hold.'
    case 'not-shown-yet':
      return (field && NOT_SHOWN_YET[field]) ?? 'The bench does not show that yet.'
    case 'no-longer-shown':
      return (field && NO_LONGER_SHOWN[field]) ?? 'The bench no longer shows that.'
    case 'entry-above-missing':
      return 'Make the entries this one is worked from first.'
    case 'empty-not-weighed':
      return 'Weigh the empty cylinder first: once the liquid is in, its own mass cannot be found.'
    case 'reading-not-taken':
      return part === 'liquid' ? "Type the empty cylinder's mass into the notebook first: once the liquid is in, the balance cannot show it again." : field === 'finalLevel' || field === undefined ? 'Type the level into the notebook first: once the pieces are moved, that level is gone.' : 'Type the reading into the notebook first.'
    case 'not-what-is-shown':
      return field && READ_FROM[field] ? NOT_SHOWN[READ_FROM[field]!] : 'That is not what the instrument shows.'
    case 'does-not-follow':
      return (field && NOT_FOLLOWING[field]) ?? 'That does not follow from your own numbers.'
    default:
      return SLIP_TEXT[blocked](field ?? 'liquidDensity')
  }
}

// ---------------------------------------------------------------------------
// The warnings (Guided)

export const WARNING_TEXT: Record<Warning, { title: string; body: string; on: string }> = {
  'eye-above': { title: 'Your eye is above the level', body: 'Seen from above, the bottom of the curve lines up with the wrong part of the scale. A level read from here is wrong, and this run will not count. Bring your eye level with it first.', on: 'Record it from here anyway' },
  'eye-below': { title: 'Your eye is below the level', body: 'Seen from below, the bottom of the curve lines up with the wrong part of the scale. A level read from here is wrong, and this run will not count. Bring your eye level with it first.', on: 'Record it from here anyway' },
  'pieces-not-weighed': { title: 'The pieces have not been weighed', body: 'Once they have been in the water, the balance weighs the water on them too, and this run will not count. Weigh them dry first.', on: 'Put them in anyway' },
  dropping: { title: 'Dropping the pieces in', body: 'Dropped in, the pieces splash water out of the cylinder. The rise then reads low, and this run will not count. Tilt the cylinder and let them slide down the glass.', on: 'Drop them in anyway' },
  'pieces-wet': { title: 'The pieces are wet', body: 'The balance will weigh the water on them too, so this run will not count. You can finish it, then run the part again and weigh the pieces dry.', on: 'Weigh them anyway' },
}
export const WARNING_BACK = 'Go back'

// ---------------------------------------------------------------------------
// A run that is checked

const REASON_TEXT: Record<Reason, (m: DensityModel) => string> = {
  'eye-not-level': () => 'A level was read with your eye above it or below it, so it was read wrong.',
  'reading-not-shown': (m) => `A reading is not what its instrument showed: more than ${m.readingAllowance} in its last figure from it, or not the figures of the balance.`,
  'weighed-wet': () => 'The pieces were weighed after they had been in the water, so the water on them was weighed too.',
  'dropped-in': () => 'The pieces were dropped in. Water splashed out of the cylinder, so the rise read low.',
  'entries-do-not-follow': () => 'An entry does not follow from your own numbers, or is rounded by the wrong rule.',
  'outside-tolerance': (m) => `Your density is more than ${m.tolerancePercent}% from the figure the lab holds for the unknown.`,
}
export const reasonText = (m: DensityModel, reason: Reason) => REASON_TEXT[reason](m)

const offText = (percent: number) => (Math.abs(percent) < 0.05 ? 'equal to' : `${Math.abs(percent).toFixed(1)}% ${percent < 0 ? 'under' : 'over'}`)

/** What a checked run comes to. `again` is false where the part cannot be run again: once the lab is complete. */
export function outcomeText(m: DensityModel, part: PartId, outcome: RunOutcome, again = true): string {
  if (outcome.state === 'open') return ''
  if (outcome.state === 'counts') return part === 'reading' || outcome.percentOff === null ? 'This run counts: every reading is what its instrument showed, and every entry follows.' : `This run counts. Your density is ${offText(outcome.percentOff)} the figure the lab holds for the unknown, and you named it.`
  const why = outcome.reasons.map((reason) => `${reasonText(m, reason)}${reason === 'entries-do-not-follow' || reason === 'reading-not-shown' ? ' The notebook marks which.' : ''}`).join(' ')
  const off = outcome.percentOff === null ? '' : ` Its density was ${offText(outcome.percentOff)} the figure the lab holds.`
  return `This run does not count. ${why}${off}${again ? ' Run the part again: it is set up with new numbers.' : ''}`
}

/** What a part's result was held to, once the engine hands it over. */
export function expectedText(data: DensityData, part: PartId, expected: Expected): string {
  if (expected.kind === 'readings' || part === 'reading') return 'Part 1 has no figure to find: it counts when every reading and every entry is right.'
  const row = candidatesOf(data, part).find((r) => r.id === expected.id)!
  const at = part === 'liquid' ? `at ${row.temperature}` : row.temperature
  return `The unknown ${part} was ${lower(row.name)}: ${expected.density.toPrecision(3)} ${row.density.unit} ${at}.`
}

/** The notes of a part, shown once it is done. */
export const partNotes = (data: DensityData, part: PartId): string[] => data.parts.find((p) => p.id === part)!.notes.map((note) => note.value)

// ---------------------------------------------------------------------------
// Modes, progress and the page's own words

export const MODE_TEXT: Record<Mode, string> = {
  guided: 'Guided checks each reading and each entry as you make it, keeps the relation behind an entry in a hint, and warns you before an error of reading or of technique.',
  challenge: 'Challenge takes what you type and says nothing until you check the notebook. It gives no hints and no warnings.',
}

export type Progress = 'not-started' | 'bench' | 'notebook' | 'not-counted' | 'done'
/** How far a part has come. */
export function progressOf(view: Pick<PartView, 'notebook' | 'outcome' | 'done' | 'bench' | 'runs'>): Progress {
  if (view.done) return 'done'
  if (view.outcome.state === 'does-not-count') return 'not-counted'
  const entered = view.notebook.filter((e) => e.value !== null)
  if (entered.some((e) => e.kind !== 'reading')) return 'notebook'
  const { steps } = view.bench
  return entered.length > 0 || steps.emptyWeighed || steps.weighed !== 'no' || steps.added !== 'no' || view.runs > 1 ? 'bench' : 'not-started'
}
export const PROGRESS_TEXT: Record<Progress, string> = {
  'not-started': 'Not started',
  bench: 'Taking readings',
  notebook: 'Working out',
  'not-counted': 'Does not count yet: run it again',
  done: 'Done',
}

export const PAGE_TEXT = {
  title: 'Measurement and density',
  intro: 'Read real scales to the right last figure, then use two of them to find a density and name an unknown.',
  parts: 'The three parts',
  bench: 'On the bench',
  benchInWords: 'The bench in words',
  instruments: 'The instruments',
  notebook: 'Notebook',
  readings: 'Readings',
  workedOut: 'Worked out',
  hint: 'The relation and the rule',
  enter: 'Enter',
  change: 'Change',
  cancel: 'Cancel',
  changeNote: 'Changing an entry empties the entries worked from it.',
  check: 'Check the notebook',
  runAgain: 'Run this part again with new numbers',
  outcome: 'This run',
  notes: 'Notes on this part',
  hazards: 'Hazards',
  primer: 'Primer',
  sources: 'Sources',
  mode: 'Mode',
  complete: 'The lab is complete: all three parts count.',
  pages: 'Pages of this part',
  previous: (name: string) => `Previous: ${name}`,
  next: (name: string) => `Next: ${name}`,
  figures: (field: Field, figures: number) => `${LABEL[field]}: ${figuresText(figures)}`,
} as const

export const RECORD_TEXT = {
  heading: 'Runs of this part',
  run: (n: number) => `Run ${n}`,
  open: 'Not checked yet',
  counts: 'Counts',
  doesNotCount: 'Does not count',
} as const

export const SOURCES_TEXT = "What each scale shows, whether an entry is right and whether a run counts are worked out by Valence from these values and from the model's parameters. The parameters are Valence's own: the amounts set out, how near a reading must be, how a level looks from above or below, and how near a density must come."
