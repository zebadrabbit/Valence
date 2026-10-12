import { describe, expect, it } from 'vitest'
import { ACTIVITIES } from './app/activities'
import { hclNahco3 as mechanism } from './mechanisms/data'
import { createProgress, predictionsOf } from './mechanisms/progress'

// A stored run of the mechanism holds a position on the track and the answers given to its predictions. Neither
// means anything apart from the record it was stored with: a position is a place between two chapter boundaries,
// and an answer is one of a question's own, right or wrong as the question then has it. So a change to the stored
// shape, to where a chapter begins, or to a question's answers would put a stored run in another place, or
// regrade it, unless the stored entry's version changes with it. Everything a stored entry is read against is
// pinned here.
describe('the mechanism timeline', () => {
  it("pins the stored shape, the track and the questions' answers with the stored entry's version: changing any of them means raising the mechanism entry's version in src/app/activities.ts", () => {
    const { entry, version } = ACTIVITIES[6]
    expect({
      entry,
      version,
      state: createProgress('guided'),
      track: mechanism.chapters.map((c) => `${c.id} ${c.range[0]}-${c.range[1]}`),
      predictions: predictionsOf(mechanism).map((p) => `${p.question.id} at ${p.at}: ${p.question.options.map((o) => (o.correct ? `[${o.id}]` : o.id)).join(' ')}`),
    }).toEqual({
      entry: 'mechanism:hcl-nahco3',
      version: 1,
      state: { mode: 'guided', status: 'in-progress', position: 0, answers: [] },
      track: ['beaker-start 0-0.06', 'prologue 0.06-0.16', 'dissolving 0.16-0.32', 'proton-transfer 0.32-0.52', 'decomposition 0.52-0.76', 'gas-escapes 0.76-0.94', 'beaker-end 0.94-1'],
      predictions: [
        'dissolving at 0.16: atoms [ions] molecules gas-first',
        'proton-transfer at 0.32: [to-hydrogen-carbonate] to-hydronium pair sodium-back',
        'decomposition at 0.52: carbonate hydrogen-gas [splits] stays',
        'gas-escapes at 0.76: salt-settles steam goes-back [bubbles]',
      ],
    })
    expect(mechanism.id).toBe('hcl-nahco3')
    expect(mechanism.title).toBe(ACTIVITIES[6].title)
  })
})
