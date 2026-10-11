import { useId } from 'react'
import { Tube } from '@/app/lab/Tube'
import type { TubeId } from '@/chem-data/cations/data'
import type { CationsModel, Look, TubeShows } from '@/engine/cations'
import { PAGE_TEXT, TUBE_NAME, lookLabel } from './messages'
import { TUBE_HEIGHT, TUBE_IDS, sectionsOf, tubeLayers } from './tubeLook'

const INK = '#3f3f46'
// The rack: the three tubes small, in the room over the callouts, each over its name. A small tube is the large one
// brought down to a fifth: its mouth at 9 and its foot at 53 of the picture's units, 18 wide.
const RACK = { first: 178, apart: 54, mouth: 9, foot: 53, half: 9 }
/** A height of the large tube as the small one has it. */
const small = (y: number) => RACK.mouth + ((y - 20) * (RACK.foot - RACK.mouth)) / (TUBE_HEIGHT - 24 - 20)

/** One tube of the rack: what it holds, drawn small, over its name, which is bold for the step's own tube. */
function RackTube({ id, x, name, shows, m, current }: { id: string; x: number; name: string; shows: TubeShows; m: CationsModel; current: boolean }) {
  const { liquid, solid, spread } = tubeLayers(m, shows)
  const { mouth, foot, half } = RACK
  const glass = `M ${x - half} ${mouth} V ${foot - half} A ${half} ${half} 0 0 0 ${x + half} ${foot - half} V ${mouth}`
  const from = (y: number) => ({ x: x - half, y: small(y), width: 2 * half, height: foot })
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={`${glass} Z`} />
        </clipPath>
        {spread && (
          <pattern id={`${id}spread`} width={6} height={6} patternUnits="userSpaceOnUse">
            <circle cx={2} cy={2} r={1.2} fill={spread.hex} stroke={INK} strokeWidth={0.6} />
          </pattern>
        )}
        {solid && (
          <pattern id={`${id}grain`} width={4} height={4} patternUnits="userSpaceOnUse">
            <circle cx={1.2} cy={1.3} r={0.75} fill={solid.grain ?? INK} fillOpacity={0.6} />
          </pattern>
        )}
      </defs>
      <g clipPath={`url(#${id})`}>
        {liquid && <rect {...from(liquid.surface)} fill={liquid.hex} />}
        {liquid && spread && <rect {...from(liquid.surface)} fill={`url(#${id}spread)`} />}
        {solid && (
          <>
            <rect {...from(solid.top)} fill={solid.hex} stroke={INK} strokeWidth={0.8} />
            <rect {...from(solid.top)} fill={`url(#${id}grain)`} />
          </>
        )}
      </g>
      {liquid && <line x1={x - half} x2={x + half} y1={small(liquid.surface)} y2={small(liquid.surface)} stroke={INK} strokeOpacity={0.5} strokeWidth={1} />}
      <path d={glass} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      {/* Its name, a word to a line: the three stand closer than a name is wide. */}
      <text textAnchor="middle" fontSize={10.5} fontWeight={current ? 700 : 400} fill={INK}>
        {name.split(' ').map((word, line) => (
          <tspan key={word} x={x} y={foot + 13 + line * 11.5}>
            {word}
          </tspan>
        ))}
      </text>
    </g>
  )
}

export interface StepTubeProps {
  m: CationsModel
  /** Which of the three tubes the step is worked in, and what it shows. */
  tube: TubeId
  shows: TubeShows
  /** What each of the three tubes holds now, for the rack; null where the picture is of a tube as it was, which no rack stands beside. */
  rack: Readonly<Record<TubeId, TubeShows>> | null
  /** The parts of the tube looked at since it last changed. */
  looked: readonly Look[]
  /** The id of the line beside the picture that says what to do with it. */
  describedBy: string
  /** What is seen in a part, in words. Asked for only when the part is looked at, so that nothing of it is on the page before. */
  seen(look: Look): string
  onLook(look: Look): void
}

/**
 * The tube a step is worked in, to be explored (the shared tube, src/app/lab/Tube.tsx), with the rack of the three
 * tubes drawn small beside it. The liquid is drawn in its colour up to its surface, with a bracket that says it is
 * liquid; a solid that has settled is drawn at the bottom under a grain and with an edge, with a bracket that says
 * it is solid; a solid that has not settled is drawn as specks all through the liquid, with one bracket that says
 * so. So a coloured liquid is told from a solid of nearly its colour by an edge, a grain and a word, and not by the
 * colour. Every solid is one height: the engine gives no amounts of solid. Nothing here moves.
 */
export function StepTube({ m, tube, shows, rack, looked, describedBy, seen, onLook }: StepTubeProps) {
  const id = useId()
  const layers = tubeLayers(m, shows)
  return (
    <Tube
      name={rack ? PAGE_TEXT.tubePicture(TUBE_NAME[tube]) : PAGE_TEXT.tubeAsChecked(TUBE_NAME[tube])}
      describedBy={describedBy}
      height={TUBE_HEIGHT}
      layers={layers}
      words={{ liquid: PAGE_TEXT.liquidLayer, solid: PAGE_TEXT.solidLayer, spread: PAGE_TEXT.spreadLayer }}
      sections={sectionsOf(layers).map(([part, top, bottom]) => ({ part, top, bottom, name: lookLabel(part, looked.includes(part)), looked: looked.includes(part), foot: part === 'bottom' }))}
      seen={seen}
      onLook={onLook}
    >
      {rack && (
        <g data-rack="">
          {/* The ground the step's own tube stands on, which marks it; then the rack's two rails, behind the tubes. */}
          <rect x={RACK.first + TUBE_IDS.indexOf(tube) * RACK.apart - 24} y={3.5} width={48} height={78} rx={6} fill="#f4f4f5" stroke={INK} strokeWidth={1.5} />
          <rect x={RACK.first - 26} y={22} width={2 * RACK.apart + 52} height={3} fill={INK} fillOpacity={0.3} />
          <rect x={RACK.first - 26} y={RACK.foot} width={2 * RACK.apart + 52} height={3} fill={INK} fillOpacity={0.3} />
          {TUBE_IDS.map((one, i) => (
            <RackTube key={one} id={`${id}${one}`} x={RACK.first + i * RACK.apart} name={TUBE_NAME[one]} shows={rack[one]} m={m} current={one === tube} />
          ))}
        </g>
      )}
    </Tube>
  )
}
