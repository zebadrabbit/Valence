import { ELECTRON_RADIUS, bohrLayout } from './bohrLayout'

/**
 * A Bohr diagram drawn from electrons-per-shell counts, innermost shell first, with its caption. The picture is
 * hidden from a screen reader: whatever shows it also gives the counts as text.
 */
export function BohrDiagram({ symbol, shells, caption }: { symbol: string; shells: readonly number[]; caption: string }) {
  const { size, nucleus, rings } = bohrLayout(shells)
  return (
    <figure className="grid justify-items-center gap-1">
      <svg aria-hidden="true" width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="max-w-full text-foreground">
        <circle r={nucleus} className="fill-muted" stroke="currentColor" />
        <text fontSize={13} fontWeight={500} textAnchor="middle" dominantBaseline="central" fill="currentColor">
          {symbol}
        </text>
        {rings.map((ring, i) => (
          <g key={i}>
            <circle r={ring.radius} fill="none" stroke="currentColor" strokeOpacity={0.45} />
            {ring.electrons.map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={ELECTRON_RADIUS} fill="currentColor" />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  )
}
