import type { ReactNode } from 'react'

// Small drawings for the shelf. Each is hidden from assistive technology: its tile names the apparatus and says its
// state in text. The glass follows the theme; a paper label is white with dark lettering in both.

const frame = (children: ReactNode) => (
  <svg viewBox="0 0 80 110" aria-hidden="true" className="h-full w-full text-foreground">
    {children}
  </svg>
)
const GLASS = { fill: 'currentColor', fillOpacity: 0.04, stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' } as const
const LIQUID = { fill: 'currentColor', fillOpacity: 0.16 } as const
const PAPER = { fill: '#ffffff', stroke: '#3f3f46', strokeWidth: 1 } as const
const LETTERING = { textAnchor: 'middle', dominantBaseline: 'central', fontWeight: 700, fill: '#18181b' } as const

/** A reagent bottle with a paper label of one or two lines. */
export function Bottle({ lines }: { lines: readonly string[] }) {
  return frame(
    <>
      <rect x={29} y={3} width={22} height={11} rx={2} fill="currentColor" fillOpacity={0.6} />
      <path d="M 31 14 L 31 26 Q 10 30 10 44 L 10 100 Q 10 106 16 106 L 64 106 Q 70 106 70 100 L 70 44 Q 70 30 49 26 L 49 14 Z" {...GLASS} />
      <path d="M 11.5 50 L 68.5 50 L 68.5 100 Q 68.5 104.5 64 104.5 L 16 104.5 Q 11.5 104.5 11.5 100 Z" {...LIQUID} />
      <rect x={13} y={58} width={54} height={34} rx={2} {...PAPER} />
      {lines.map((line, i) => (
        <text key={line} x={40} y={lines.length === 1 ? 75 : 68 + i * 14} fontSize={i === 0 ? 12 : 10.5} className="tabular-nums" {...LETTERING}>
          {line}
        </text>
      ))}
    </>,
  )
}

/** The wash bottle of distilled water, with its bent spout. */
export function WashBottle() {
  return frame(
    <>
      <path d="M 40 20 L 40 8 Q 40 4 46 5 L 72 14" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <rect x={30} y={18} width={20} height={9} rx={2} fill="currentColor" fillOpacity={0.6} />
      <path d="M 32 27 Q 14 34 14 50 L 14 100 Q 14 106 20 106 L 60 106 Q 66 106 66 100 L 66 50 Q 66 34 48 27 Z" {...GLASS} />
      <path d="M 15.5 56 L 64.5 56 L 64.5 100 Q 64.5 104.5 60 104.5 L 20 104.5 Q 15.5 104.5 15.5 100 Z" {...LIQUID} />
      <rect x={20} y={64} width={40} height={22} rx={2} {...PAPER} />
      <text x={40} y={75} fontSize={12} {...LETTERING}>
        H₂O
      </text>
    </>,
  )
}

/** The 25 mL volumetric pipette with its filler. */
export function Pipette() {
  return frame(
    <>
      <circle cx={40} cy={11} r={9} fill="currentColor" fillOpacity={0.6} />
      <path d="M 38 20 L 38 46 Q 30 50 30 58 L 30 70 Q 30 78 38 82 L 38.8 106 L 41.2 106 L 42 82 Q 50 78 50 70 L 50 58 Q 50 50 42 46 L 42 20 Z" {...GLASS} />
      {/* The single mark the pipette is filled to. */}
      <line x1={35} x2={45} y1={32} y2={32} stroke="currentColor" strokeWidth={1.5} />
      <text x={58} y={64} dominantBaseline="central" fontSize={10.5} fill="currentColor">
        25
      </text>
    </>,
  )
}

/** The indicator's dropper bottle. */
export function Dropper() {
  return frame(
    <>
      <path d="M 34 4 Q 40 0 46 4 L 46 22 L 34 22 Z" fill="currentColor" fillOpacity={0.6} />
      <rect x={31} y={22} width={18} height={8} rx={1.5} fill="currentColor" fillOpacity={0.35} />
      <path d="M 33 30 L 33 40 Q 18 44 18 56 L 18 100 Q 18 106 24 106 L 56 106 Q 62 106 62 100 L 62 56 Q 62 44 47 40 L 47 30 Z" {...GLASS} />
      <path d="M 19.5 70 L 60.5 70 L 60.5 100 Q 60.5 104.5 56 104.5 L 24 104.5 Q 19.5 104.5 19.5 100 Z" {...LIQUID} />
      <rect x={21} y={62} width={38} height={30} rx={2} {...PAPER} />
      <text x={40} y={72} fontSize={8.5} {...LETTERING}>
        phenol-
      </text>
      <text x={40} y={83} fontSize={8.5} {...LETTERING}>
        phthalein
      </text>
    </>,
  )
}
