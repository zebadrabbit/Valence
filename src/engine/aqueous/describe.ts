import type { AqueousData } from '@/chem-data/aqueous/data'
import { stationOf, stationResult } from './react'

// The text description of what is seen in a station's tube once it is mixed (spec 8.4, 11): what the eye can
// tell and nothing a tool has to be applied for. It names no formula and explains nothing, so that it gives a
// learner in Challenge mode what the picture gives and no more. It is worked out from the engine's result and the
// observation rows, not from the station's expected record, so that it says what the model does; the one thing
// taken from that record is the name of the colour two coloured ions blend to.

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'An' : 'A')

export function describeStationResult(data: AqueousData, stationId: string): string {
  const station = stationOf(data, stationId)
  const result = stationResult(data, stationId)
  const row = (id: string) => data.observations.find((o) => o.productId === id)
  const species = (id: string) => data.species.find((s) => s.id === id)!
  const sentences: string[] = []

  // A solid or a metal that went in: it is gone when the reaction has used it up.
  const solid = station.reagentIds.map((id) => data.reagents.find((r) => r.id === id)!).find((r) => r.form !== 'solution')
  const gas = result.gas === null ? undefined : row(result.gas)
  const bubbles = station.expected.bubbles && gas !== undefined
  const bubbling = gas ? `bubbles of ${gas.color === 'colourless' ? 'a colourless' : `${article(gas.color).toLowerCase()} ${gas.color}`} gas` : ''
  if (solid) {
    const left = result.remaining.some((amount) => amount.speciesId === solid.speciesId)
    const what = `The ${solid.appearance?.value ?? 'solid'}`
    if (bubbles) sentences.push(`${what} gives off ${bubbling} and ${left ? 'does not all dissolve' : 'dissolves completely'}.`)
    else sentences.push(left ? `${what} does not all dissolve.` : `${what} dissolves completely.`)
  }
  if (result.precipitate !== null) {
    const seen = row(result.precipitate)
    const look = seen ? [seen.color, seen.texture].filter(Boolean).join(', ') : 'new'
    sentences.push(`${article(look)} ${look} solid forms.`)
  } else if (!solid) {
    sentences.push('No solid forms.')
  }
  if (!solid) sentences.push(bubbles ? `${bubbling[0]!.toUpperCase()}${bubbling.slice(1)} rise through the liquid.` : 'No bubbles are seen.')

  // One coloured ion left gives the liquid its colour; none leaves it colourless; two blend to the colour curated for the station.
  const colours = result.colouredIons.map((id) => species(id).solutionColor!.value.name)
  const colour = colours.length === 0 ? 'colourless' : colours.length === 1 ? colours[0]! : station.expected.liquidColor
  sentences.push(`${result.precipitate !== null ? 'The liquid above it' : 'The liquid'} is ${colour}.`)
  return sentences.join(' ')
}
