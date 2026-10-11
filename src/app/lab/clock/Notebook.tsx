import { useId } from 'react'
import { Disclosure } from '@/app/explore/InspectorCard'
import { Calculator } from '@/app/lab/Calculator'
import { Entries, enterIn, Foot, made, Outcome, type SheetProps } from '@/app/lab/kinetics/Notebook'
import { Line, useSaid } from '@/app/lab/Line'
import { ROLE } from '@/app/lab/roles'
import { Step } from '@/app/lab/stationPieces'
import type { ClockData, RunId } from '@/chem-data/clock/data'
import { can, kindOf, temperatureView, type Action } from '@/engine/clock'
import { ClockGraph } from './ClockGraph'
import { GRAPH_TEXT, NOTEBOOK_TEXT, SHEET_TABLE_TEXT, blockedText, describeGraph, figuresText, inverseText, kelvinText, logText, placeCallout, placeChoices, runTitle, temperatureExpectedText, temperatureText } from './messages'
import { Table } from './tables'

// Part 2's notebook, on the rate law, is the shared piece (src/app/lab/kinetics/Notebook.tsx), which the iodination
// of acetone lab has too; so are the entries, the check and the card that says how a notebook came out, which
// part 3's notebook below is made of. The graph is this lab's own.

/**
 * Part 3's notebook (spec 19.3). The graph's card holds the table the notebook fills, which the page says it
 * filled, and under it the graph, to be explored, with its description in words behind a disclosure that is
 * closed; the notebook's card, right under the picture, holds the four entries: the two places, each chosen among
 * the places that have been looked at, the slope and the activation energy.
 */
export function TemperatureNotebook({ data, lab, state, shown, act }: SheetProps & { data: ClockData }) {
  const { m } = lab
  const view = temperatureView(m, state)
  const enter = enterIn(lab, state, 'temperature', act)
  const seenId = useId()
  const [lookSaid, sayOfLook] = useSaid()
  if (view.rows === null || view.graph === null) return <p className={`max-w-prose text-sm ${ROLE.held}`}>{blockedText(data, view.blocked === 'rate-law-first' ? 'rate-law-first' : 'runs-missing')}</p>
  const { graph } = view
  const over = view.blocked !== null
  const first = made(view.entries, 'first')
  /** A place is looked at: stored the first time, where the engine takes it, and said each time. A sheet that is over stores nothing and can still be looked at. */
  const look = (place: number) => {
    const action: Action = { type: 'look', place }
    if (!graph.places[place]!.looked && can(m, state, action) === null) act([action])
    sayOfLook(placeCallout(graph.places[place]!))
  }
  return (
    <>
      {/* What the place looked at shows, for a screen reader: the eye has the callout on the graph. */}
      <div className="sr-only">
        <Line said={lookSaid} />
      </div>
      <Step heading={GRAPH_TEXT.graph}>
        <p className="max-w-prose">{NOTEBOOK_TEXT.filledTemperatures}</p>
        <Table
          wide
          caption={SHEET_TABLE_TEXT.temperatureCaption}
          head={[SHEET_TABLE_TEXT.run, SHEET_TABLE_TEXT.celsius, SHEET_TABLE_TEXT.kelvin, SHEET_TABLE_TEXT.inverse, SHEET_TABLE_TEXT.constant, SHEET_TABLE_TEXT.log]}
          rows={view.rows.map((row) => [runTitle(data, row.runId as RunId), temperatureText(row.tenths), kelvinText(row.centiKelvin), inverseText(row.xMicro), figuresText(row.constant), logText(row.yMilli)])}
        />
        <div id={seenId} className="grid max-w-prose gap-1">
          <p>{GRAPH_TEXT.explore}</p>
          <p className="text-muted-foreground">{GRAPH_TEXT.arrows}</p>
        </div>
        <ClockGraph graph={graph} describedBy={seenId} onLook={look} />
        {/* Closed: it gives the two ends of the line outright, which the learner is to read off the graph. */}
        <Disclosure summary={GRAPH_TEXT.inWords}>
          <p className="max-w-prose">{describeGraph(data, view)}</p>
        </Disclosure>
      </Step>
      <Step heading={NOTEBOOK_TEXT.notebook}>
        {shown && <Calculator />}
        <Entries
          lab={lab}
          places={graph.places}
          over={over}
          mode={state.mode}
          enter={enter}
          entries={view.entries}
          from={0}
          // The second place is chosen among the others: the first is not offered twice.
          choicesOf={(field) => placeChoices(graph).filter((choice) => kindOf(field) === 'first' || choice.value !== first)}
        />
        <Foot lab={lab} state={state} sheet="temperature" entries={view.entries} over={over} act={act} />
      </Step>
      <Outcome lab={lab} state={state} part="temperature" outcome={view.outcome} expected={view.expected && temperatureExpectedText(view.expected)} act={act} />
    </>
  )
}
