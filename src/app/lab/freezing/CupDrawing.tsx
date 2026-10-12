import { FOAM, FoamCup, LINE, LIQUID } from '@/app/lab/FoamCup'
import type { CupView, Ice } from '@/engine/freezing'

/** How high the ice and water stand in the cup, and the solution in the second cup once it is strained into it. */
const LEVEL = 104
const SECOND_LEVEL = 148

/** A cube of ice: where its corner is, how big it is and how far it is turned. */
type Cube = readonly [x: number, y: number, size: number, turn: number]
/**
 * The ice as it is seen, by how many cubes are drawn and never by a colour: six crowding the top of the water
 * while there is plenty, two small ones when only a little is left, and none when none is.
 */
const AFLOAT: Record<Ice, readonly Cube[]> = {
  'not-yet': [],
  plenty: [
    [94, 97, 13, -8],
    [113, 96, 13, 6],
    [129, 98, 13, -5],
    [152, 97, 13, 9],
    [100, 112, 13, 7],
    [133, 113, 13, -9],
  ],
  little: [
    [115, 99, 9, 8],
    [132, 100, 9, -6],
  ],
  none: [],
}
/** The same ice once the strainer holds it, over the second cup. */
const HELD: Record<Ice, readonly Cube[]> = {
  'not-yet': [],
  plenty: [
    [220, 114, 12, -8],
    [234, 117, 12, 5],
    [248, 114, 12, 10],
    [227, 102, 12, 9],
    [241, 104, 12, -6],
  ],
  little: [
    [230, 118, 9, 8],
    [243, 119, 9, -6],
  ],
  none: [],
}

/** Cubes of ice, each on the card's own colour so that it stands out of the water it floats in, in either theme. */
const Cubes = ({ cubes }: { cubes: readonly Cube[] }) =>
  cubes.map(([x, y, size, turn]) => <rect key={`${x} ${y}`} x={x} y={y} width={size} height={size} rx={2} fill="var(--card)" fillOpacity={0.9} stroke="currentColor" strokeWidth={1.4} transform={`rotate(${turn} ${x + size / 2} ${y + size / 2})`} />)

/**
 * The freezing point depression lab's cup as a cut-away drawing: the shell's foam cup (../FoamCup.tsx), which the
 * calorimetry lab draws too, with its lid, its stirrer, its probe and the logger; and this lab's own. In the cup,
 * once it is filled, the water with the ice afloat in it: six cubes while there is plenty, two small ones when a
 * little is left, none when none is. Beside it the second cup on the balance, with the wire strainer resting on
 * its rim. Once the cup has been poured through the strainer the cup is empty, the strainer holds the ice that was
 * left, and the solution stands in the second cup. Nothing in it says what the temperature does, and nothing in
 * it is a colour of its own.
 */
export function CupDrawing({ cup, reducedMotion }: { cup: CupView; reducedMotion: boolean }) {
  const inCup = cup.filled && !cup.strained
  return (
    <FoamCup
      level={inCup ? LEVEL : null}
      lidOn={cup.lidOn}
      stirring={cup.stirring}
      loggerStarted={cup.loggerStarted}
      reducedMotion={reducedMotion}
      inCup={
        inCup && (
          <g data-ice={cup.ice}>
            <Cubes cubes={AFLOAT[cup.ice]} />
          </g>
        )
      }
      beside={
        <>
          {/* The balance, and the second cup on it. */}
          <rect x={204} y={176} width={70} height={10} rx={2} {...FOAM} fillOpacity={0.12} />
          <line x1={228} y1={181} x2={250} y2={181} {...LINE} strokeWidth={1.2} strokeOpacity={0.6} />
          <path d="M 216 130 L 222 176 L 258 176 L 264 130" {...FOAM} />
          {cup.strained && (
            <g data-solution="">
              <path d={`M 219.3 ${SECOND_LEVEL} L 260.7 ${SECOND_LEVEL} L 257.2 175 L 222.8 175 Z`} {...LIQUID} />
              <line x1={219.3} y1={SECOND_LEVEL} x2={260.7} y2={SECOND_LEVEL} {...LINE} strokeWidth={1.2} strokeOpacity={0.6} />
            </g>
          )}
          {/* The strainer on the second cup's rim: its rim and handle, and its bowl of wire. */}
          <path d="M 210 128 L 270 128 L 277 122" {...LINE} />
          <path d="M 214 128 Q 240 150 266 128" {...LINE} strokeWidth={1.3} strokeDasharray="2 2.5" />
          {cup.strained && (
            <g data-held={cup.ice}>
              <Cubes cubes={HELD[cup.ice]} />
            </g>
          )}
        </>
      }
    />
  )
}
