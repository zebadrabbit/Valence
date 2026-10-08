import { ChartLine } from 'lucide-react'
import { Disclosure, Note, Sources } from '@/app/explore/InspectorCard'
import '@/app/lab/lab.css'
import { FloatingPanel } from '@/app/lab/FloatingPanel'
import { registry } from '@/chem-data/registry'
import sources from '@/chem-data/sources.json'
import { ENERGY_PANEL, chapterAt, energyAt, energyLines, energyPanelNotes, mechanismCitations, stepNotes, stepsOf, type Mechanism } from '@/mechanisms'
import { CHART, chartScale, curveLabels, curvePath } from './energyChart'
import { ENERGY_TEXT } from './text'

export interface EnergyProps {
  mechanism: Mechanism
  t: number
  /** A chapter as the page names it now: Challenge keeps the name of a step back. */
  name(chapterId: string): string
}

/**
 * The button that opens the energy panel, and the panel: it floats over the page and stays open while the timeline
 * moves. In a wide window it opens at the top right, over the chapter's words. In a narrow one, where the scene has
 * the window's whole width, it opens under the timeline, so that it covers neither the scene nor the slider.
 */
export function EnergyPanel(props: EnergyProps) {
  return (
    <FloatingPanel
      name={ENERGY_PANEL.title}
      icon={<ChartLine aria-hidden="true" />}
      width={340}
      height={470}
      fromTop={() => (window.innerWidth >= WIDE ? 96 : (document.querySelector('[data-timeline]')?.getBoundingClientRect().bottom ?? 96))}
    >
      {/* The class is lab.css's: it gives each summary below a finger's hit area. */}
      <div className="lab-panel grid gap-2">
        <Energy {...props} />
      </div>
    </FloatingPanel>
  )
}

/** From this width of window the scene and the chapter's words are side by side at any state of the menu. */
const WIDE = 1000

const minus = (value: number) => (value > 0 ? `+${value}` : String(value).replace('-', '−'))

/**
 * What the energy panel holds (spec 9.2): free energy as the main curve and enthalpy alongside, with a cursor
 * where the timeline is, and under them what the step the timeline is in changes. Closed until they are opened: a
 * table of all four steps, for anyone who cannot use the curves; the panel's notes; how each value was worked out;
 * and the sources. The curves and the cursor are drawn. Every figure that is printed is a step's own or the sum of
 * the four: where the cursor stands part-way through a step is a point on a drawing and is printed nowhere.
 */
export function Energy({ mechanism, t, name }: EnergyProps) {
  const scale = chartScale(mechanism)
  const steps = stepsOf(mechanism)
  const current = chapterAt(mechanism, t)
  const cursor = energyAt(mechanism, t)
  const x = scale.x(t)
  const [top, bottom] = [CHART.top, CHART.height - CHART.bottom]
  // ponytail: the sum of the four steps is the second of the panel's notes, taken by its place. A test holds it to
  // being that sentence; the wording module naming its notes would end the reliance.
  const totals = energyPanelNotes(mechanism)[1]
  return (
    <>
      <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={ENERGY_TEXT.chart} className="block h-auto w-full text-foreground">
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line x1={CHART.left} x2={CHART.width - CHART.right} y1={scale.y(tick)} y2={scale.y(tick)} stroke="currentColor" strokeOpacity={tick === 0 ? 0.6 : 0.12} />
            <text x={CHART.left - 5} y={scale.y(tick)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="currentColor" className="tabular-nums">
              {minus(tick)}
            </text>
          </g>
        ))}
        <text x={2} y={10} fontSize={11} fill="currentColor">
          {ENERGY_PANEL.axis}
        </text>
        {/* The four steps along the track, each marked off and numbered. */}
        <text x={2} y={CHART.height - 8} fontSize={11} fill="currentColor">
          {ENERGY_TEXT.steps}
        </text>
        {steps.map((step, i) => (
          <g key={step.id}>
            {[...(i === 0 ? [step.range[0]] : []), step.range[1]].map((edge) => (
              <line key={edge} x1={scale.x(edge)} x2={scale.x(edge)} y1={top} y2={bottom + 4} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="2 3" />
            ))}
            <text x={scale.x((step.range[0] + step.range[1]) / 2)} y={CHART.height - 8} textAnchor="middle" fontSize={11} fontWeight={step === current ? 700 : 400} fill="currentColor" className="tabular-nums">
              {i + 1}
            </text>
          </g>
        ))}
        {/* Enthalpy is the thinner, broken line and free energy the heavy whole one; each also has its name at its end. */}
        <path d={curvePath(mechanism, 'h', scale)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 3" />
        <path d={curvePath(mechanism, 'g', scale)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
        <text x={CHART.width - CHART.right} y={scale.y(energyAt(mechanism, 1).h) - 6} textAnchor="end" fontSize={11} fill="currentColor">
          {ENERGY_PANEL.enthalpy}
        </text>
        <text x={CHART.width - CHART.right} y={scale.y(energyAt(mechanism, 1).g) + 13} textAnchor="end" fontSize={11} fontWeight={700} fill="currentColor">
          {ENERGY_PANEL.freeEnergy}
        </text>
        {curveLabels(mechanism).map((label, i) =>
          label.on === 'barrier' ? (
            // Over the top of the barrier, clear of the curves, with a line down to it: the two on two rows, so neither runs into the other.
            <g key={`${label.t}-barrier`}>
              <line x1={scale.x(label.t)} x2={scale.x(label.t)} y1={top - 6 - 12 * (i % 2)} y2={scale.y(label.value) - 3} stroke="currentColor" strokeOpacity={0.5} />
              <text x={scale.x(label.t)} y={top - 9 - 12 * (i % 2)} textAnchor="middle" fontSize={11} fill="currentColor">
                {ENERGY_TEXT.onBarrier(label.text)}
              </text>
            </g>
          ) : (
            <text key={`${label.t}-level`} x={scale.x(label.t) - 4} y={scale.y(label.value) + 12} textAnchor="end" fontSize={11} fill="currentColor">
              {ENERGY_TEXT.onLevel(label.text)}
            </text>
          ),
        )}
        {/* The cursor: where the timeline is, on both curves. It marks a place and gives no figure. */}
        <line x1={x} x2={x} y1={top} y2={bottom} stroke="currentColor" strokeWidth={1} />
        <circle cx={x} cy={scale.y(cursor.h)} r={3.5} fill="var(--card)" stroke="currentColor" strokeWidth={1.5} />
        <circle cx={x} cy={scale.y(cursor.g)} r={4} fill="currentColor" />
      </svg>
      {/* One step at a time: what the step the timeline is in changes, with where each value is from. */}
      {current.kind === 'step' && (
        <section aria-label={name(current.id)} className="grid gap-1">
          <h3 className="font-medium">{name(current.id)}</h3>
          <ul className="grid gap-0.5">
            {energyLines(mechanism, current.id).map((line) => (
              <li key={line.quantity} className="tabular-nums">
                {line.text}
                {line.tag && <span className="text-muted-foreground"> ({line.tag})</span>}
              </li>
            ))}
          </ul>
          {/* The record's own note on the step (spec 9.2). What follows from how a value was obtained is with how it was worked out. */}
          {current.notes.map((note) => (
            <Note key={note}>{note}</Note>
          ))}
        </section>
      )}
      {/* After the last step: the whole change. */}
      {current.kind !== 'step' && t >= steps.at(-1)!.range[1] && <p>{totals}</p>}
      <Disclosure summary={ENERGY_TEXT.caption}>
        <table className="w-full table-fixed border-collapse text-left text-xs">
          <caption className="sr-only">{ENERGY_TEXT.caption}</caption>
          <thead>
            <tr className="border-b align-bottom">
              {[ENERGY_TEXT.steps, ENERGY_PANEL.freeEnergy, ENERGY_PANEL.enthalpy, ENERGY_TEXT.barrier].map((heading) => (
                <th key={heading} scope="col" className="py-1 pr-2 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => {
              const lines = energyLines(mechanism, step.id)
              const here = step === current
              return (
                <tr key={step.id} aria-current={here ? 'step' : undefined} className={`border-b align-top ${here ? 'bg-muted' : ''}`}>
                  <th scope="row" className="py-1.5 pr-2 font-medium">
                    {name(step.id)}
                    {here && <span className="block font-normal text-muted-foreground">({ENERGY_TEXT.now})</span>}
                  </th>
                  {(['deltaG', 'deltaH', 'activationG'] as const).map((quantity) => {
                    const line = lines.find((one) => one.quantity === quantity)
                    return (
                      <td key={quantity} className="py-1.5 pr-2 tabular-nums">
                        {line ? line.text : ENERGY_TEXT.noBarrier}
                        {line?.tag && <span className="block font-normal text-muted-foreground">{line.tag}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Disclosure>
      <Disclosure summary={ENERGY_TEXT.about}>
        {energyPanelNotes(mechanism).map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>{ENERGY_TEXT.drawn}</p>
      </Disclosure>
      <Disclosure summary={ENERGY_TEXT.worked}>
        <ul className="grid gap-2 text-xs">
          {steps.map((step) => (
            <li key={step.id}>
              <span className="font-medium">{name(step.id)}</span>
              <ul className="mt-1 grid list-disc gap-1 pl-5">
                {energyLines(mechanism, step.id).map((line) => (
                  <li key={line.quantity}>
                    {line.text}. {line.method}
                  </li>
                ))}
                {stepNotes(mechanism, step.id)
                  .slice(step.notes.length)
                  .map((note) => (
                    <li key={note}>{note}</li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </Disclosure>
      <Sources citations={mechanismCitations(mechanism, registry.molecules, sources)} derived={ENERGY_TEXT.unsourced} />
    </>
  )
}
