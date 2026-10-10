import { Tube as ExploredTube, contentsEnd } from '@/app/lab/Tube'
import type { Look, ToolUse } from '@/engine/aqueous'
import { PAGE_TEXT, TOOL_LABEL } from './messages'
import type { TubeLook } from './stationLook'
import './aqueous.css'

// The aqueous reactions lab's tube: the shared tube that is explored (src/app/lab/Tube.tsx), 300 of its units tall,
// with this lab's three sections and its bubbles.
const HEIGHT = 300
const SURFACE = 104
/**
 * The three sections of what is in the tube, from the top, each by where it begins and ends: the liquid's surface,
 * where bubbles rise and break; the body of the liquid; and the bottom, where a solid settles. Each is the target
 * of its look, and is 58 px or more tall at full size, the bottom with no solid in it and the surface with no
 * bubbles too. They lie just inside the glass.
 */
const SECTIONS: readonly (readonly [look: Look, top: number, bottom: number])[] = [
  ['look-surface', 92, 152],
  ['look-liquid', 152, 216],
  ['look-bottom', 216, contentsEnd(HEIGHT)],
]
/** Where the solid's layer begins. */
const SOLID_TOP = SECTIONS[2]![1]

/** The looks of a tube in the order they are drawn in, from the top. */
export const STACK: readonly Look[] = SECTIONS.map(([look]) => look)

export interface TubeProps {
  look: TubeLook
  reducedMotion: boolean
  /** The id of the line beside the picture that says what to do with it. */
  describedBy: string
  /** The station's uses of its tools, and those made: the looks among them are the sections drawn as buttons and those looked at. */
  uses: readonly ToolUse[]
  used: readonly ToolUse[]
  /** What is seen in a section, in words. Asked for only when the section is looked at, so that nothing of it is on the page before. */
  seen(look: Look): string
  /** A section has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook(look: Look): void
}

/**
 * A station's tube once it is mixed, to be explored: the liquid in its colour, a layer of solid in its colour
 * where one forms, and bubbles where a gas comes off, with a button laid over each section of it. The bubbles move
 * only where `reducedMotion` is false; under it they are drawn at rest. Nothing else here moves.
 */
export function Tube({ look, reducedMotion, describedBy, uses, used, seen, onLook }: TubeProps) {
  return (
    <ExploredTube
      name={PAGE_TEXT.tubePicture}
      describedBy={describedBy}
      height={HEIGHT}
      layers={{
        liquid: { hex: look.liquid.hex, surface: SURFACE },
        solid: look.solid && { hex: look.solid.hex, top: SOLID_TOP },
        bubbles: look.bubbles ? { moving: reducedMotion ? undefined : 'aq-bubble' } : null,
      }}
      words={{ liquid: PAGE_TEXT.liquidLayer, solid: PAGE_TEXT.solidLayer }}
      sections={SECTIONS.filter(([part]) => uses.includes(part)).map(([part, top, bottom]) => {
        const looked = used.includes(part)
        return { part, top, bottom, name: looked ? `${TOOL_LABEL[part]}, ${PAGE_TEXT.lookedAt}` : TOOL_LABEL[part], looked, foot: part === 'look-bottom' }
      })}
      seen={seen}
      onLook={onLook}
    />
  )
}
