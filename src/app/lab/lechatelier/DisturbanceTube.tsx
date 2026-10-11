import { Tube } from '@/app/lab/Tube'
import { TUBE_HEIGHT, sectionsOf, tubeLayers } from '@/app/lab/tubeDrawing'
import type { TubeId } from '@/chem-data/lechatelier/data'
import type { Look, Temperature, TubeShows } from '@/engine/lechatelier'
import { BATH_LABEL, PAGE_TEXT, TUBE_NAME, lookLabel } from './messages'

const INK = '#3f3f46'
// The bath: a beaker about the foot of the tube, its water up to a little under its rim. In the picture's units,
// of which the tube's glass has 48 to 128 across and ends at 24 over the picture's foot.
const BATH = { left: 22, right: 154, rim: 94, surface: 110, foot: 252 }
/** Where the brackets stand while the tube is in a bath: clear of the beaker's wall. */
const BRACES_BY_BATH = 160
const WATER = '#dbeafe'
const beaker = `M ${BATH.left - 5} ${BATH.rim - 3} L ${BATH.left} ${BATH.rim + 2} V ${BATH.foot - 8} Q ${BATH.left} ${BATH.foot} ${BATH.left + 8} ${BATH.foot} H ${BATH.right - 8} Q ${BATH.right} ${BATH.foot} ${BATH.right} ${BATH.foot - 8} V ${BATH.rim + 2} L ${BATH.right + 5} ${BATH.rim - 3}`
const water = `M ${BATH.left} ${BATH.surface} V ${BATH.foot - 8} Q ${BATH.left} ${BATH.foot} ${BATH.left + 8} ${BATH.foot} H ${BATH.right - 8} Q ${BATH.right} ${BATH.foot} ${BATH.right} ${BATH.foot - 8} V ${BATH.surface} Z`
/** Bubbles in the boiling water, either side of the tube and under it: where across, where down, how large. */
const BUBBLES = [
  [33, 148, 3],
  [39, 188, 2.5],
  [31, 224, 3.5],
  [141, 136, 2.5],
  [145, 176, 3.5],
  [138, 214, 3],
  [72, 245, 2.5],
  [104, 244, 3],
] as const
/** Steam over the boiling water, either side of the tube: where across each wisp rises. */
const STEAM = [35, 141] as const
/** Ice in the ice water, at its surface either side of the tube: where its corner is, and how far it is turned. */
const ICE = [
  [26, 101, -12],
  [30, 119, 9],
  [133, 102, 10],
  [135, 120, -8],
] as const

/**
 * The bath a tube stands in, drawn behind it. The two are told apart by what is drawn and by a word, and not by a
 * colour: bubbles through the water and steam over it, with "boiling water" beside the rim; or blocks of ice at
 * the surface, with "ice water". Nothing here moves.
 */
function Bath({ temperature }: { temperature: Exclude<Temperature, 'room'> }) {
  return (
    <g data-bath={temperature}>
      <path d={water} fill={WATER} />
      <line x1={BATH.left} x2={BATH.right} y1={BATH.surface} y2={BATH.surface} stroke={INK} strokeOpacity={0.5} strokeWidth={1.5} />
      {temperature === 'hot'
        ? [
            ...BUBBLES.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" stroke={INK} strokeWidth={1.2} />),
            ...STEAM.map((x) => <path key={x} d={`M ${x} ${BATH.surface - 6} c -7 -6 7 -12 0 -18 c -7 -6 7 -12 0 -18`} fill="none" stroke={INK} strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" />),
          ]
        : ICE.map(([x, y, turn]) => (
            <g key={`${x}-${y}`} transform={`rotate(${turn} ${x + 7} ${y + 7})`}>
              <rect x={x} y={y} width={14} height={14} rx={2} fill="#ffffff" stroke={INK} strokeWidth={1.2} />
              <path d={`M ${x + 3} ${y + 10} L ${x + 10} ${y + 3}`} stroke={INK} strokeOpacity={0.4} strokeWidth={1} strokeLinecap="round" />
            </g>
          ))}
      <path d={beaker} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <text x={BATH.right + 10} y={BATH.rim - 8} fontSize={13} fill={INK}>
        {BATH_LABEL[temperature]}
      </text>
    </g>
  )
}

export interface DisturbanceTubeProps {
  /** Which tube the disturbance is done in, what it shows, and where it stands. */
  tube: TubeId
  shows: TubeShows
  temperature: Temperature
  /** The most liquid a tube of this system comes to hold: the tube is drawn as full as that makes it. */
  full: number
  /** The parts of the tube looked at since it last changed. */
  looked: readonly Look[]
  /** The id of the line beside the picture that says what to do with it. */
  describedBy: string
  /** What is seen in a part, in words. Asked for only when the part is looked at, so that nothing of it is on the page before. */
  seen(look: Look): string
  onLook(look: Look): void
}

/**
 * The tube a disturbance is done in, to be explored (the shared tube, src/app/lab/Tube.tsx, drawn as the Group I
 * cations lab's is: src/app/lab/tubeDrawing.ts). The liquid is drawn in its colour up to its surface, with a
 * bracket that says it is liquid; a solid is drawn at the bottom under a grain and with an edge, with a bracket
 * that says it is solid. So whether a white solid is there, which two of the four systems turn on, is told by an
 * edge, a grain and a word, and the colour of a liquid is said in words when the liquid is looked at. A tube that
 * stands in a bath is drawn in it.
 */
export function DisturbanceTube({ tube, shows, temperature, full, looked, describedBy, seen, onLook }: DisturbanceTubeProps) {
  const layers = tubeLayers(shows, full)
  return (
    <Tube
      name={PAGE_TEXT.tubePicture(TUBE_NAME[tube])}
      describedBy={describedBy}
      height={TUBE_HEIGHT}
      layers={layers}
      words={{ liquid: PAGE_TEXT.liquidLayer, solid: PAGE_TEXT.solidLayer }}
      sections={sectionsOf(layers).map(([part, top, bottom]) => ({ part, top, bottom, name: lookLabel(part, looked.includes(part)), looked: looked.includes(part), foot: part === 'bottom' }))}
      seen={seen}
      onLook={onLook}
      behind={temperature === 'room' ? undefined : <Bath temperature={temperature} />}
      bracesAt={temperature === 'room' ? undefined : BRACES_BY_BATH}
    />
  )
}
