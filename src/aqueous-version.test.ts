import { describe, expect, it } from 'vitest'
import { ACTIVITIES } from './app/activities'
import { aqueousData } from './chem-data/aqueous/data'
import { expectedObservation } from './engine/aqueous/check'
import { stationResult } from './engine/aqueous/react'
import { createLab } from './engine/aqueous/state'
import { correctEntry } from './engine/aqueous/testkit'

// A stored run holds what the learner did and entered, and nothing of what is right: that is worked out again
// each time the run is loaded, against the stations as they then are. So a change to what a station expects, to
// its equations or to the stored shape would regrade a run that is already stored, or refuse it, unless the
// stored entry's version changes with it. Everything a stored entry is judged against is pinned here, with the
// engine's result for each station, which the expected record is held to elsewhere.
describe('the aqueous reactions lab', () => {
  it("pins the stored shape, what each station expects, its equations and the stored entry's version together: changing any of them means raising the aqueous entry's version in src/app/activities.ts", () => {
    const { entry, version } = ACTIVITIES[1]
    const term = (t: { speciesId: string; coefficient: number; state: string }) => `${t.coefficient} ${t.speciesId}(${t.state})`
    const written = (stationId: string) => {
      const { noReaction, reactants, products } = correctEntry(aqueousData, stationId, 'netIonic')
      return noReaction ? 'no reaction' : `${reactants.map(term).join(' + ')} -> ${products.map(term).join(' + ')}`
    }
    expect({
      entry,
      version,
      state: { ...createLab(aqueousData, 'guided'), stations: createLab(aqueousData, 'guided').stations.slice(0, 1) },
      stations: aqueousData.stations.map((station) => {
        const result = stationResult(aqueousData, station.id)
        return [station.id, result.rules.join(), result.limiting.join(), result.temperatureRiseC.toFixed(2), JSON.stringify(expectedObservation(station)), written(station.id)].join(' | ')
      }),
    }).toEqual({
      entry: 'lab:aqueous',
      version: 1,
      state: { mode: 'guided', status: 'in-progress', stations: [{ mixed: false, used: [], observation: null, equations: { molecular: null, completeIonic: null, netIonic: null } }] },
      stations: [
        'aq-01 | precipitation | hydroxide-ion | 0.00 | {"solid":"rust-brown","liquid":"yellow-orange","bubbles":"none"} | 1 iron-iii-ion(aq) + 3 hydroxide-ion(aq) -> 1 iron-iii-hydroxide(s)',
        'aq-02 | precipitation | copper-ii-ion,carbonate-ion | 0.00 | {"solid":"blue-green","liquid":"colourless","bubbles":"none"} | 1 copper-ii-ion(aq) + 1 carbonate-ion(aq) -> 1 copper-ii-carbonate(s)',
        'aq-03 | precipitation | nickel-ii-ion,carbonate-ion | 0.00 | {"solid":"pale green","liquid":"colourless","bubbles":"none"} | 1 nickel-ii-ion(aq) + 1 carbonate-ion(aq) -> 1 nickel-ii-carbonate(s)',
        'aq-04 | precipitation | barium-ion,sulfate-ion | 0.00 | {"solid":"white","liquid":"blue","bubbles":"none"} | 1 barium-ion(aq) + 1 sulfate-ion(aq) -> 1 barium-sulfate(s)',
        'aq-05 |  |  | 0.00 | {"solid":"none","liquid":"orange","bubbles":"none"} | no reaction',
        'aq-06 | ammonia | ammonium-ion | 0.00 | {"solid":"none","liquid":"colourless","bubbles":"none","odor":"sharp and pungent","litmusInLiquid":"turns blue","litmusInVapour":"turns blue"} | 1 ammonium-ion(aq) + 1 hydroxide-ion(aq) -> 1 ammonia(g) + 1 water(l)',
        'aq-07 | acid-carbonate | calcium-carbonate | 0.00 | {"solid":"none","liquid":"colourless","bubbles":"bubbles"} | 1 calcium-carbonate(s) + 2 hydrogen-ion(aq) -> 1 calcium-ion(aq) + 1 water(l) + 1 carbon-dioxide(g)',
        'aq-08 | neutralisation | hydrogen-ion,hydroxide-ion | 40.07 | {"solid":"none","liquid":"colourless","bubbles":"none","temperature":"hot"} | 1 hydrogen-ion(aq) + 1 hydroxide-ion(aq) -> 1 water(l)',
        'aq-09 | precipitation | silver-ion | 0.00 | {"solid":"white","liquid":"pink","bubbles":"none"} | 1 silver-ion(aq) + 1 chloride-ion(aq) -> 1 silver-chloride(s)',
        'aq-10 | metal-acid | magnesium | 11.03 | {"solid":"none","liquid":"colourless","bubbles":"bubbles","temperature":"warm","splint":"pop"} | 1 magnesium(s) + 2 hydrogen-ion(aq) -> 1 magnesium-ion(aq) + 1 hydrogen(g)',
      ],
    })
  })
})
