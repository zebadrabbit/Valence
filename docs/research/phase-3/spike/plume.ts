// Item 7: the plume engine value along a careful run.
import { BASE, PLUME_MIX_SECONDS, PLUME_SLOW_FROM, equivalenceMl, flask, plume, seededTrial, trajectory, judge } from './model.ts'

const T = 3e-6
const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
console.log(`plume fraction = moles of NaOH in the last drop of the addition / moles of excess strong acid before it (capped at 1)`)
console.log(`states: persists when the mixed flask >= threshold; else "fades slowly" when fraction >= ${PLUME_SLOW_FROM}; else "fades at once"`)
console.log(`fade time = fraction x ${PLUME_MIX_SECONDS} s of swirling; intensity = total indicator concentration in the flask\n`)

const t = seededTrial(1)
const sc = { ...BASE, drops: 2 }
const r = trajectory(t, sc, 250)
const end = judge(r, T)
console.log(`Seed 1, 2 drops, 0.25 mL stream steps. V_eq ${r.vEqMl.toFixed(4)} mL, endpoint at ${end.endMl.toFixed(3)} mL (${end.pastEqMl.toFixed(4)} past)`)
console.log('delivered mL | mL before V_eq | mode | plume fraction | fade s | status line | mixed pH | mixed pink (M)')
let prev = 0
let shown = 0
r.additions.forEach((a, i) => {
  const v = a.ul / 1000
  if (v > end.endMl + 0.051) return
  const p = plume(t, sc, prev, v - prev, T)
  const f = flask(t, sc, v)
  const before = r.vEqMl - v
  const next = r.additions[i + 1]
  const show = a.kind === 'half' || before < 0.56 || (a.kind === 'stream' && (i % 20 === 0 || next?.kind !== 'stream')) || (a.kind === 'drop' && (r.additions[i - 1].kind === 'stream' || Math.round(a.ul) % 500 < 50))
  if (show) {
    shown++
    console.log(`${v.toFixed(3)} | ${before.toFixed(4)} | ${a.kind} | ${p.fraction.toFixed(3)} | ${Number.isFinite(p.fadeSeconds) ? p.fadeSeconds.toFixed(1) : 'stays'} | ${p.state} | ${f.pH.toFixed(2)} | ${f.pinkConc.toExponential(1)}`)
  }
  prev = v
})

// over all seeds: how many additions of each status a careful run sees, and where "slowly" begins
console.log('\nOver seeds 1-100 (2 and 3 drops), careful run to the endpoint:')
let slowDrops = [Infinity, -Infinity], slowHalf = [Infinity, -Infinity], firstSlow = [Infinity, -Infinity], monotone = 0, persistsOnlyAtEnd = 0, n = 0
for (const drops of [2, 3]) {
  for (const seed of SEEDS) {
    const tt = seededTrial(seed)
    const s2 = { ...BASE, drops }
    const rr = trajectory(tt, s2, 250)
    const e = judge(rr, T)
    let p0 = 0, nd = 0, nh = 0, first = NaN, rank = 0, mono = true, persistsEarly = false
    for (const a of rr.additions) {
      const v = a.ul / 1000
      if (v > e.endMl + 1e-9) break
      const p = plume(tt, s2, p0, v - p0, T)
      const rk = p.state === 'pink persists' ? 2 : p.state === 'pink fades slowly' ? 1 : 0
      if (a.kind !== 'stream') {
        if (rk < rank) mono = false
        rank = rk
      }
      if (rk === 1) {
        if (a.kind === 'drop') nd++
        if (a.kind === 'half') nh++
        if (Number.isNaN(first) && a.kind !== 'stream') first = rr.vEqMl - p0
      }
      if (rk === 2 && Math.abs(v - e.endMl) > 1e-9) persistsEarly = true
      p0 = v
    }
    n++
    if (mono) monotone++
    if (!persistsEarly) persistsOnlyAtEnd++
    slowDrops = [Math.min(slowDrops[0], nd), Math.max(slowDrops[1], nd)]
    slowHalf = [Math.min(slowHalf[0], nh), Math.max(slowHalf[1], nh)]
    firstSlow = [Math.min(firstSlow[0], first), Math.max(firstSlow[1], first)]
  }
}
console.log(`"fades slowly" first shown (after the stream) with ${firstSlow[0].toFixed(3)} to ${firstSlow[1].toFixed(3)} mL still to go`)
console.log(`dropwise additions showing "fades slowly": ${slowDrops[0]} to ${slowDrops[1]}; half-drop additions showing it: ${slowHalf[0]} to ${slowHalf[1]}`)
console.log(`status never steps backwards after the stream phase: ${monotone}/${n}; "persists" shown only at the endpoint: ${persistsOnlyAtEnd}/${n}`)
const lastStream = (() => { let c = 0; for (const seed of SEEDS) { const tt = seededTrial(seed); const rr = trajectory(tt, BASE, 250); const ls = rr.additions.filter((a) => a.kind === 'stream').at(-1)!; const p = plume(tt, BASE, (ls.ul - 250) / 1000, 0.25, T); if (p.state !== 'pink fades at once') c++ } return c })()
console.log(`stream additions that end on anything but "fades at once" (2.00 to 2.25 mL before V_eq): ${lastStream}/100`)
void equivalenceMl
