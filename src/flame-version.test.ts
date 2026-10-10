import { describe, expect, it } from 'vitest'
import { ACTIVITIES } from './app/activities'
import { extentOf, flameData } from './chem-data/flame/data'
import { FLAME, choicesFor, expectedObservation, looksOf } from './engine/flame/check'
import { HANDLING, flameOf } from './engine/flame/loop'
import { createLab } from './engine/flame/state'

// A stored run holds what the learner did and recorded, and nothing of what is right: that is worked out again
// each time the run is loaded, against the record as it then is. So a change to a salt's flame colour, to its
// lines and bands or their ranks, to the answer ranges, to the closing question or to the stored shape would
// regrade a run that is already stored, or refuse it, unless the stored entry's version changes with it.
// Everything a stored entry is judged against is pinned here.
describe('the flame test lab', () => {
  it("pins the stored shape, what each station shows and expects, the closing question and the stored entry's version together: changing any of them means raising the flame entry's version in src/app/activities.ts", () => {
    const state = createLab(flameData, 'guided')
    expect({
      entry: ACTIVITIES[2].entry,
      version: ACTIVITIES[2].version,
      state: { ...state, stations: state.stations.slice(0, 1) },
      // What a station's `looked` can hold: the flame, then the ids of the lines and bands its loop shows.
      look: FLAME,
      handling: [HANDLING, flameData.handling.value, flameData.parameters.handlingTraceShows.value, flameData.masking.value].join(' | '),
      choices: [choicesFor(flameData, 'colour').join(), choicesFor(flameData, 'range').join(), choicesFor(flameData, 'kind').join()],
      stations: flameData.salts.map((salt) => {
        const seen = salt.features.map((feature) => {
          const { fromNm, toNm } = extentOf(flameData, feature)
          return `${feature.prominence} ${feature.id} ${feature.kind} ${fromNm}-${toNm}`
        })
        return [salt.id, flameOf(flameData, [salt.id]).colours.map((colour) => colour.name).join(), looksOf(flameData, [salt.id]).slice(1).join(), seen.join('; '), Object.values(expectedObservation(flameData, salt.id)).join()].join(' | ')
      }),
      closing: `${flameData.closing.choices.join()} | ${flameData.closing.answer.value}`,
    }).toEqual({
      entry: 'lab:flame',
      version: 1,
      state: { mode: 'guided', status: 'in-progress', loop: ['handling'], stations: [{ held: null, looked: [], observation: null }], closing: null },
      look: 'flame',
      handling: 'handling | nacl-0.1m | true | nacl-0.1m',
      choices: ['blue-green,lilac,orange-red,pale green,red,yellow', '400-475,475-570,570-600,600-650,650-700,700-780', 'line,band'],
      stations: [
        'bacl2-0.1m | pale green | baoh-green,ba-553 | 1 baoh-green band 480-550; 2 ba-553 line 553.5481-553.5481 | pale green,475-570,band',
        'cacl2-0.1m | orange-red | ca-422,caoh-green,caoh-orange-red | 1 caoh-orange-red band 614-640; 2 caoh-green band 540-568; 3 ca-422 line 422.673-422.673 | orange-red,600-650,band',
        'cucl2-0.1m | blue-green | cucl-blue,cuoh-green | 1 cucl-blue band 400-470; 2 cuoh-green band 545-555 | blue-green,400-475,band',
        'kcl-0.1m | lilac | k-404,k-766 | 1 k-766 line 766.489913-769.896456; 2 k-404 line 404.4136-404.7208 | lilac,700-780,line',
        'nacl-0.1m | yellow | na-589 | 1 na-589 line 588.995095-589.592424 | yellow,570-600,line',
        'srcl2-0.1m | red | sr-460,sroh-orange,sroh-red | 1 sroh-red band 666-691; 2 sroh-orange band 601-611; 3 sr-460 line 460.7331-460.7331 | red,650-700,band',
      ],
      closing: 'chloride,gas,loop,metal,water | metal',
    })
  })
})
