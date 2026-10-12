import { useId, useRef, useState } from 'react'
import { keyTarget } from '@/app/lab/exploreKeys'
import { liquidHex } from '@/app/lab/tubeDrawing'
import { useExplore } from '@/app/lab/useExplore'
import { CANNOT_SAY, type Estimate, type RackTube } from '@/engine/cabbage'
import { SAMPLE_TEXT, bufferLabel, rackTubeText } from './messages'

const INK = '#3f3f46'
/** The glass of a tube of the rack, in a picture 32 wide and 74 tall: from its mouth down to a round foot. */
const GLASS = 'M 5 5 V 58 A 11 11 0 0 0 27 58 V 5'

/** A tube of the rack as it is drawn: its liquid in the drawing's value for the colour word, up to a surface, and the glass over it. For the eye: the button it is in has the tube's name, and a look says the colour in words. */
function Glass({ hex }: { hex: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 74" aria-hidden="true" className="cabbage-rack-tube block h-auto">
      <clipPath id={id}>
        <path d={`${GLASS} Z`} />
      </clipPath>
      <rect x={0} y={22} width={32} height={52} fill={hex} clipPath={`url(#${id})`} />
      <line x1={5} x2={27} y1={22} y2={22} stroke={INK} strokeOpacity={0.5} strokeWidth={1.2} />
      <path d={GLASS} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M 2 5 H 30" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

export interface RackProps {
  /** The rack's name, and the id of the line beside it that says what to do with it. */
  name: string
  describedBy: string
  /** The thirteen tubes in order, each as it is seen now. */
  tubes: readonly RackTube[]
  /** The rack kept in view beside a sample: its tubes are drawn smaller. */
  small?: boolean
  /** A tube has come to be looked at: by a pointer over it, by focus on it, or by a tap or a press. */
  onLook?(ph: number): void
  /**
   * Where a tube of the rack is chosen, as the one a sample is nearest: the one chosen now, and what a press on a
   * tube, or on the choice that the indicator cannot say, does. `unavailable` is whether that choice is drawn faint.
   */
  pick?: { chosen: Estimate | null; unavailable: boolean; onPick(estimate: Estimate): void }
}

/**
 * The rack of the scale: thirteen tubes in order on a white card, as every tube of the labs stands, so that the
 * colours are judged against white in the dark theme too. Each tube is a button with its pH under it. A mouse
 * pointer over a tube, keyboard focus on it or a tap looks at it: its edge is drawn, and the line under the rack
 * says its colour in words, and stays until another tube is looked at. The rack is one stop of the Tab key: the
 * arrow keys, Home and End move along it, and each tube they come to is looked at. Nothing of a colour is in the
 * rack's own markup but the drawing's value for it.
 */
export function Rack({ name, describedBy, tubes, small = false, onLook, pick }: RackProps) {
  const [said, setSaid] = useState<number | null>(null)
  const [stop, setStop] = useState(() => Math.max(0, tubes.findIndex((tube) => tube.ph === pick?.chosen)))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const { open, part } = useExplore<string>((ph) => {
    setSaid(Number(ph))
    onLook?.(Number(ph))
  })
  const seen = tubes.find((tube) => tube.ph === said)

  return (
    <div className="cabbage-rack w-full rounded-lg border border-[#3f3f46]/35 bg-white p-2 text-[#18181b]">
      <div role="group" aria-label={name} aria-describedby={describedBy} className={`cabbage-rack-grid ${small ? 'cabbage-rack-small' : ''}`}>
        {tubes.map(({ ph, shows }, at) => {
          const looking = part(String(ph))
          const chosen = pick?.chosen === ph
          return (
            <button
              key={ph}
              {...looking}
              ref={(element) => void (buttons.current[at] = element)}
              tabIndex={at === stop ? 0 : -1}
              aria-pressed={pick ? chosen : undefined}
              onFocus={() => {
                setStop(at)
                looking.onFocus()
              }}
              onClick={() => {
                looking.onClick()
                pick?.onPick(ph)
              }}
              onKeyDown={(event) => {
                looking.onKeyDown(event)
                const to = keyTarget(event.key, at, tubes.length)
                if (to === null) return
                event.preventDefault()
                buttons.current[to]?.focus()
              }}
              // The edge is dashed while the tube is looked at, and whole with a grey ground for the tube that is chosen: the name of its button says that too.
              className={`flex min-h-11 cursor-pointer flex-col items-center gap-0.5 rounded-md border-2 ${small ? 'py-0.5' : 'py-1'} text-xs tabular-nums outline-offset-2 outline-[#18181b] focus-visible:outline-3 ${chosen ? 'border-[#18181b] bg-[#e4e4e7] font-semibold' : open === String(ph) ? 'border-dashed border-[#18181b]' : 'border-transparent'}`}
            >
              <Glass hex={liquidHex(shows.liquid?.colour ?? '')} />
              {bufferLabel(ph)}
            </button>
          )
        })}
        {pick && (
          <button
            type="button"
            aria-pressed={pick.chosen === CANNOT_SAY}
            aria-disabled={pick.unavailable || undefined}
            onClick={() => pick.onPick(CANNOT_SAY)}
            className={`cabbage-rack-rest min-h-11 cursor-pointer rounded-md border-2 px-0.5 py-1 text-xs leading-tight outline-offset-2 outline-[#18181b] focus-visible:outline-3 ${pick.chosen === CANNOT_SAY ? 'border-[#18181b] bg-[#e4e4e7] font-semibold' : 'border-[#3f3f46]/40'} ${pick.unavailable ? 'opacity-50' : ''}`}
          >
            {SAMPLE_TEXT.cannotSay}
          </button>
        )}
      </div>
      {/* What the tube last looked at shows, in words: always there, as tall as a line while it is empty, so that nothing under the rack moves when a tube is looked at. */}
      <p role="status" className="min-h-5 px-1 pt-1 text-sm font-medium">
        {seen ? rackTubeText(seen.ph, seen.shows) : ''}
      </p>
    </div>
  )
}
