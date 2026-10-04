import { EMISSION_NOTE, EMISSION_READING_NOTE } from '@/chem-data/element'
import type { Element } from '@/chem-data/schema'
import { Note } from './InspectorCard'
import { colourName, spectrumText, STRIP, stripPosition, wavelengthColor } from './spectrum'

const WIDTH = 300
const HEIGHT = 30
const TICKS = [400, 500, 600, 700]

/** The emission lines of an isolated atom: a strip to look at and a table that says the same in text. */
export function EmissionSpectrum({ element }: { element: Element }) {
  const { emission } = element
  if (!emission) return null
  const x = (nm: number) => stripPosition(nm) * WIDTH
  return (
    <div className="grid max-w-md gap-2">
      <h3 className="font-medium">Emission spectrum of the isolated atom</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 14}`} role="img" aria-label={spectrumText(element)} className="w-full">
        {/* Dark in both themes: the lines are light on darkness, as in a spectroscope. */}
        <rect width={WIDTH} height={HEIGHT} fill="#000" stroke="currentColor" strokeOpacity={0.4} />
        {emission.lines.map((line) => (
          <rect key={line.value} x={x(line.value) - 1} width={2} height={HEIGHT} fill={wavelengthColor(line.value)} />
        ))}
        {TICKS.map((nm) => (
          <text key={nm} x={x(nm)} y={HEIGHT + 11} textAnchor="middle" fontSize={9} fill="currentColor" aria-hidden="true">
            {nm}
          </text>
        ))}
      </svg>
      <table className="w-full text-left tabular-nums">
        <caption className="sr-only">
          Emission lines of {element.name.toLowerCase()} from {STRIP.min} to {STRIP.max} nm
        </caption>
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="font-normal">
              Wavelength
            </th>
            <th scope="col" className="font-normal">
              Colour
            </th>
            {emission.lines.some((line) => line.transition) && (
              <th scope="col" className="font-normal">
                Electron falls
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {emission.lines.map((line) => (
            <tr key={line.value}>
              <td className="pr-3">{line.published ?? line.value} nm</td>
              <td className="pr-3">{colourName(line.value)}</td>
              {line.transition && <td>{line.transition}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <Note>{EMISSION_NOTE}</Note>
      <Note>Lines shown: {emission.selection}</Note>
      <Note>{EMISSION_READING_NOTE}</Note>
    </div>
  )
}
