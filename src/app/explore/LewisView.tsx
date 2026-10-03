import { useMemo, type Dispatch } from 'react'
import type { Molecule } from '@/chem-data/schema'
import { CHARGE_RADIUS, DOT_RADIUS, FONT_SIZE, lewisLayout } from './lewisLayout'
import type { Selection, SelectionAction } from './selection'

const LINE_WIDTH = 3.5
/** The selection mark is an outline round the atom or bond: a shape, in a colour that shows on both themes. */
const MARK = 'fill-none stroke-blue-600 dark:stroke-blue-400'
const MARK_WIDTH = 4.5
/** The mark round a bond stands this far off its outermost lines. */
const MARK_GAP = 9
const BOND_TARGET = 34

/**
 * The 2D Lewis structure (spec 6.2): symbols, bond lines, lone-pair dots and formal charges, drawn
 * from the stored 2D positions. Atoms and bonds are clicked to select, as in the 3D views; the
 * Atoms and bonds list is the keyboard way to the same selection.
 */
export function LewisView(props: { molecule: Molecule; selection: Selection; dispatch: Dispatch<SelectionAction>; describedBy: string }) {
  const { molecule, selection, dispatch, describedBy } = props
  const { viewBox, atoms, bonds } = useMemo(() => lewisLayout(molecule), [molecule])

  return (
    <svg
      role="img"
      aria-label={`Lewis structure of ${molecule.name}`}
      aria-describedby={describedBy}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      className="h-full w-full text-foreground select-none"
      // A click on empty space clears the selection.
      onClick={() => dispatch({ type: 'clear' })}
    >
      {bonds.map((bond, i) => (
        <g
          key={i}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'toggleBond', index: i })
          }}
        >
          {bond.lines.map((line, k) => (
            <line
              key={k}
              x1={line.from[0]}
              y1={line.from[1]}
              x2={line.to[0]}
              y2={line.to[1]}
              stroke="currentColor"
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={line.dashed ? '7 7' : undefined}
            />
          ))}
          <g transform={`translate(${bond.middle[0]} ${bond.middle[1]}) rotate(${bond.angle})`}>
            {/* The click target, wider than the lines. */}
            <rect x={-bond.length / 2} y={-BOND_TARGET / 2} width={bond.length} height={BOND_TARGET} fill="none" pointerEvents="all" />
            {selection.bond === i && (
              <rect
                x={-bond.length / 2}
                y={-bond.width / 2 - MARK_GAP}
                width={bond.length}
                height={bond.width + 2 * MARK_GAP}
                rx={MARK_GAP}
                strokeWidth={MARK_WIDTH}
                className={MARK}
              />
            )}
          </g>
        </g>
      ))}
      {atoms.map((atom, i) => (
        <g
          key={i}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'toggleAtom', index: i })
          }}
        >
          <circle
            cx={atom.position[0]}
            cy={atom.position[1]}
            r={atom.clear + 2}
            strokeWidth={MARK_WIDTH}
            className={selection.atoms.includes(i) ? MARK : 'fill-none'}
            pointerEvents="all"
          />
          <text x={atom.position[0]} y={atom.position[1]} fontSize={FONT_SIZE} textAnchor="middle" dominantBaseline="central" fill="currentColor">
            {atom.symbol}
          </text>
          {atom.lonePairs.flat().map((dot, k) => (
            <circle key={k} cx={dot[0]} cy={dot[1]} r={DOT_RADIUS} fill="currentColor" />
          ))}
          {atom.charge && (
            // ponytail: the circle fits "+" and "−", the only formal charges in the library. A "2−" needs a wider shape.
            <>
              <circle cx={atom.charge.position[0]} cy={atom.charge.position[1]} r={CHARGE_RADIUS} fill="none" stroke="currentColor" strokeWidth={2} />
              <text
                x={atom.charge.position[0]}
                y={atom.charge.position[1]}
                fontSize={FONT_SIZE * 0.7}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
              >
                {atom.charge.text}
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  )
}
