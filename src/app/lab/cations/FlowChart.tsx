import { X } from 'lucide-react'
import { useState } from 'react'
import { Control } from '@/app/lab/Control'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Button } from '@/components/ui/button'
import { substanceOf, type CationsData, type StepId, type TubeId } from '@/chem-data/cations/data'
import type { PlaceView } from '@/engine/cations'
import { CHART_TEXT, placeLabel, tileLabel } from './messages'
import { chartTree, type ChartNode } from './tubeLook'

/** A place as the chart draws it: the engine's view of it in part 1, or a place of the finished map, which is neither open nor judged. */
export type ChartPlace = Pick<PlaceView, 'id' | 'step' | 'layer' | 'tiles'> & Partial<Pick<PlaceView, 'open' | 'slots' | 'right'>>

export interface FlowChartProps {
  data: CationsData
  places: readonly ChartPlace[]
  /** The five steps with the tube each is worked in, which is what makes the chart a tree. */
  steps: readonly { id: StepId; tube: TubeId }[]
  /**
   * Where the chart can be filled: the tiles it is filled from, why a tile cannot go in a place or come out of it
   * now, in words, or null, and the two things done. Without it the chart is read and not filled.
   */
  fill?:
    | {
        tiles: readonly string[]
        refusal(place: string, tile: string, out: boolean): string | null
        onPlace(place: string, tile: string): void
        onRemove(place: string, tile: string): void
      }
    | undefined
}

/** A tile as it is drawn: its name, then its formula and whether it is a solid or dissolved, which are the rest of its label. */
function TileWords({ data, tile }: { data: CationsData; tile: string }) {
  const { name } = substanceOf(data, tile)
  return (
    <span className="grid text-left leading-tight">
      <span className="font-medium">{name}</span>
      {/* A space, which the grid does not draw, so that the two lines are two words apart in the tile's text and not run together ("chlorideAgCl"). */}{' '}
      <span className="text-xs">{tileLabel(data, tile).slice(name.length + 2)}</span>
    </span>
  )
}

/**
 * The flow chart of the scheme (spec 17.3): a place for what each step leaves in its solid and in its liquid, drawn
 * as a tree, each place under the one it is made from. A place that is open is filled from the tiles under the
 * chart: a tile is tapped and then the place, or the place and then each tile; the keyboard does the same with the
 * same buttons, and nothing is dragged. A tile in an open place has a button that takes it out. Where one place
 * alone is open it is the chosen one from the start. A place that has been checked says in words whether it holds
 * what belongs in it.
 *
 * The chart keeps which tile is held and which place is chosen, and what its message line last said; what is in a
 * place is the engine's, and comes and goes through `fill`.
 */
export function FlowChart({ data, places, steps, fill }: FlowChartProps) {
  const [held, setHeld] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [said, say] = useSaid()
  const open = fill ? places.filter((place) => place.open) : []
  // A place that was chosen and has since been checked is chosen no longer; one open place alone needs no choosing.
  const chosen = open.find((place) => place.id === picked)?.id ?? (open.length === 1 ? open[0]!.id : null)

  const put = (place: string, tile: string) => {
    const refused = fill!.refusal(place, tile, false)
    if (refused !== null) return say(refused, true)
    say('')
    fill!.onPlace(place, tile)
  }
  const tapTile = (tile: string) => {
    if (chosen !== null) return put(chosen, tile)
    say('')
    setHeld(held === tile ? null : tile)
  }
  const tapPlace = (place: string) => {
    if (held === null) return setPicked(chosen === place ? null : place)
    put(place, held)
    setHeld(null)
  }
  const takeOut = (place: string, tile: string, button: HTMLElement) => {
    const refused = fill!.refusal(place, tile, true)
    if (refused !== null) return say(refused, true)
    say('')
    // The button goes with its tile, and focus goes to the place the tile leaves.
    button.closest('[data-place]')?.querySelector<HTMLElement>('button[aria-pressed]')?.focus()
    fill!.onRemove(place, tile)
  }

  const node = ({ place, children }: ChartNode<ChartPlace>) => {
    const isOpen = open.includes(place)
    const isChosen = place.id === chosen
    const result = place.right != null && (
      <span className="text-xs font-medium whitespace-nowrap">
        <Mark ok={place.right} />
        {place.right ? CHART_TEXT.right : CHART_TEXT.notRight}
      </span>
    )
    return (
      <li key={place.id} className="grid gap-1">
        {isOpen ? (
          // A whole edge where it is the chosen one and a dashed one where it is not: told by the line, not by a colour.
          <div data-place={place.id} className={`grid gap-1 rounded-md border-2 px-2 py-1.5 ${isChosen ? 'border-foreground' : 'border-dashed border-muted-foreground'}`}>
            {/* The place itself is the target: a tile that is held goes in at a press, and with none held the press chooses the place for the tiles pressed after it. */}
            <Button type="button" variant="ghost" aria-pressed={isChosen} className={`lab-tap h-auto min-h-9 justify-start px-1 text-left font-medium whitespace-normal ${ROLE.entry}`} onClick={() => tapPlace(place.id)}>
              {placeLabel(place)}
            </Button>
            {/* What the place holds, said again to a screen reader as a tile goes in or comes out. */}
            <ul aria-live="polite" aria-label={placeLabel(place)} className="flex flex-wrap gap-1.5">
              {place.tiles.map((tile) => (
                <li key={tile} className="flex items-center gap-1 rounded-md border bg-background py-0.5 pr-0.5 pl-2">
                  <TileWords data={data} tile={tile} />
                  <Button type="button" variant="ghost" aria-label={CHART_TEXT.remove(substanceOf(data, tile).name)} className="lab-tap size-8" onClick={(event) => takeOut(place.id, tile, event.currentTarget)}>
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
              {place.tiles.length === 0 && <li className="text-muted-foreground">{CHART_TEXT.empty}</li>}
            </ul>
            {place.slots != null && <p className="text-xs text-muted-foreground">{CHART_TEXT.slots(place.slots)}</p>}
          </div>
        ) : (
          // A place that is not being filled is a line: its name, what it holds, and once it is checked whether that is what belongs in it.
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border px-2 py-1">
            <p className="text-xs font-medium text-muted-foreground">{placeLabel(place)}</p>
            <ul aria-label={placeLabel(place)} className="flex flex-wrap gap-x-2 gap-y-0.5">
              {place.tiles.map((tile) => (
                <li key={tile} className="rounded-sm bg-muted px-1.5">
                  {tileLabel(data, tile)}
                </li>
              ))}
              {place.tiles.length === 0 && <li className="text-muted-foreground">{CHART_TEXT.empty}</li>}
            </ul>
            {result}
          </div>
        )}
        {children.length > 0 && <ul className="ml-2 grid gap-1 border-l-2 pl-3">{children.map(node)}</ul>}
      </li>
    )
  }

  return (
    <div className="grid w-full gap-3">
      <ul className="grid gap-1">{chartTree(places, steps).map(node)}</ul>
      {open.length > 0 && (
        <div className="grid gap-1.5">
          <p className="max-w-prose text-xs">
            <span className="font-medium">{CHART_TEXT.tiles}.</span> <span className="text-muted-foreground">{CHART_TEXT.how}</span>
          </p>
          <div role="group" aria-label={CHART_TEXT.tiles} className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-1.5">
            {fill!.tiles.map((tile) => (
              <Control key={tile} unavailable={false} aria-label={tileLabel(data, tile)} aria-pressed={held === tile} className={`h-auto min-h-11 justify-start px-2.5 py-1 whitespace-normal ${held === tile ? 'border-foreground inset-ring-2 inset-ring-foreground' : ''}`} onClick={() => tapTile(tile)}>
                <TileWords data={data} tile={tile} />
              </Control>
            ))}
          </div>
        </div>
      )}
      {fill && <Line said={said} />}
    </div>
  )
}
