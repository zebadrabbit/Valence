// Items 3 and 4: the 7.4 endpoint acceptance test and the feasible region for faintPinkConcentration.
import {
  BASE,
  CO2_AQ,
  PP_ONE_STEP_950,
  PP_ONE_STEP_MERCK,
  PP_TWO_STEP,
  equivalenceMl,
  excessToThreshold,
  flask,
  indicatorMolarity,
  judge,
  seededTrial,
  trajectory,
} from './model.ts'
import type { Scenario, Trial } from './model.ts'

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1)
const T0 = 3e-6
const fmt = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : String(x))
const sci = (x: number) => x.toExponential(2)

const MODELS: [string, readonly number[]][] = [
  ['two-step 9.05/9.50 (Tamura)', PP_TWO_STEP],
  ['one-step 9.7 (Merck)', PP_ONE_STEP_MERCK],
  ['one-step 9.50', PP_ONE_STEP_950],
]
const STREAMS: [string, number][] = [
  ['literal (one pour to V_eq-2.00)', 0],
  ['0.10 mL steps', 100],
  ['0.25 mL steps', 250],
  ['0.50 mL steps', 500],
  ['0.37 mL steps (off-grid)', 370],
]

/** All corners and centres of the seeded box, independent of any draw order. */
function boxTrials(): Trial[] {
  const out: Trial[] = []
  for (const cHCl of [0.085, 0.095, 0.105])
    for (const cNaOH of [0.095, 0.1, 0.105])
      for (const pipetteMl of [24.97, 25, 25.03])
        out.push({ seed: 0, cHCl, cNaOH, pipetteMl, buretteStartMl: 0, aliquotFactor: 1, titrantFactor: 1 })
  return out
}

console.log(`CO2(aq) at air equilibrium = ${sci(CO2_AQ)} mol/L; indicator 0.5% = ${sci(indicatorMolarity(0.5))} mol/L`)
{
  const trials = SEEDS.map((s) => seededTrial(s))
  const veq = trials.map(equivalenceMl)
  console.log(`seeds 1-100: V_eq range ${fmt(Math.min(...veq), 3)} to ${fmt(Math.max(...veq), 3)} mL`)
}

// ---------------------------------------------------------------------------
console.log('\n=== A. Acceptance test, seeds 1-100, 2 and 3 drops, faintPinkConcentration 3e-6 M, CO2 at 1x air ===')
console.log('indicator model | strength | stream | drops | pass/100 | landing past V_eq mL (min..max) | landed on 1st/2nd/3rd+ addition past V_eq | failure reasons')
for (const [mName, pKas] of MODELS) {
  for (const pct of [0.1, 0.5, 1.0]) {
    for (const [sName, streamUl] of STREAMS) {
      for (const drops of [2, 3]) {
        const sc: Scenario = { ...BASE, indicatorPKas: pKas, indicatorPercent: pct, drops }
        let pass = 0
        const reasons = new Map<string, number>()
        const nth = [0, 0, 0]
        let lo = Infinity
        let hi = -Infinity
        for (const seed of SEEDS) {
          const r = trajectory(seededTrial(seed), sc, streamUl)
          const e = judge(r, T0)
          if (e.ok) pass++
          else reasons.set(e.reason, (reasons.get(e.reason) ?? 0) + 1)
          if (Number.isFinite(e.pastEqMl)) {
            lo = Math.min(lo, e.pastEqMl)
            hi = Math.max(hi, e.pastEqMl)
            // which addition at or past V_eq was the endpoint (1 = first)
            const firstPast = r.additions.findIndex((a) => a.ul >= r.vEqMl * 1000 - 1e-6)
            const endIdx = r.additions.findIndex((a) => Math.abs(a.ul / 1000 - e.endMl) < 1e-9)
            nth[Math.min(endIdx - firstPast, 2)]++
          }
        }
        const why = [...reasons].map(([k, v]) => `${k}: ${v}`).join('; ') || '-'
        console.log(`${mName} | ${pct}% | ${sName} | ${drops} | ${pass} | ${fmt(lo)}..${fmt(hi)} | ${nth.join('/')} | ${why}`)
      }
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== B. Excess titrant e* past V_eq at which the mixed flask reaches 3e-6 M pink (mL) ===')
console.log('Offset-independent pass condition: 0 < e* <= 0.025 mL (then the first half-drop at or after e* is always within 0.05 mL).')
console.log('indicator model | strength | drops | CO2 | e* min | e* mean | e* max (seeds 1-100) | e* max (box corners) | holds for every offset')
for (const [mName, pKas] of MODELS) {
  for (const pct of [0.1, 0.5, 1.0]) {
    for (const drops of [2, 3]) {
      for (const co2 of [1, 0]) {
        const sc: Scenario = { ...BASE, indicatorPKas: pKas, indicatorPercent: pct, drops, co2Multiple: co2 }
        const es = SEEDS.map((s) => excessToThreshold(seededTrial(s), sc, T0))
        const eb = boxTrials().map((t) => excessToThreshold(t, sc, T0))
        const mean = es.reduce((a, b) => a + b, 0) / es.length
        const worst = Math.max(...es, ...eb)
        const least = Math.min(...es, ...eb)
        console.log(
          `${mName} | ${pct}% | ${drops} | ${co2}x | ${fmt(Math.min(...es), 5)} | ${fmt(mean, 5)} | ${fmt(Math.max(...es), 5)} | ${fmt(Math.max(...eb), 5)} | ${least > 0 && worst <= 0.025 ? 'yes' : 'NO'}`,
        )
      }
    }
  }
}

// explicit offset sweep for the base scenario: place the half-drop grid at offset d past V_eq
console.log('\nOffset sweep, two-step, 0.5%, CO2 1x: first grid point past V_eq is d mL past; runs = 100 seeds x (2,3 drops)')
console.log('d (mL) | pass/200 | landing min..max (mL past V_eq)')
for (const d of [0.0001, 0.001, 0.0025, 0.005, 0.0075, 0.01, 0.0125, 0.015, 0.0175, 0.02, 0.0225, 0.025]) {
  let pass = 0
  let lo = Infinity
  let hi = -Infinity
  for (const drops of [2, 3]) {
    const sc: Scenario = { ...BASE, drops }
    for (const seed of SEEDS) {
      const t = seededTrial(seed)
      const vEq = equivalenceMl(t)
      let before = true
      let land = NaN
      for (let k = -8; k < 40; k++) {
        const past = d + 0.025 * k
        const pink = flask(t, sc, vEq + past).pinkConc
        if (pink >= T0) {
          land = past
          if (past < 0) before = false
          break
        }
      }
      if (before && land >= 0 && land <= 0.05 + 1e-9) pass++
      lo = Math.min(lo, land)
      hi = Math.max(hi, land)
    }
  }
  console.log(`${fmt(d)} | ${pass} | ${fmt(lo)}..${fmt(hi)}`)
}

// ---------------------------------------------------------------------------
console.log('\n=== C. Feasible region for faintPinkConcentration (offset-independent) ===')
console.log('T_low = largest pink concentration at V_eq itself (threshold must be above it);')
console.log('T_high = smallest pink concentration at V_eq + 0.025 mL (threshold must be at or below it).')
console.log('Both taken over seeds 1-100 and the 27 box corners.')
function region(sc: Scenario): [number, number] {
  const trials = [...SEEDS.map((s) => seededTrial(s)), ...boxTrials()]
  let lo = 0
  let hi = Infinity
  for (const t of trials) {
    const vEq = equivalenceMl(t)
    lo = Math.max(lo, flask(t, sc, vEq).pinkConc)
    hi = Math.min(hi, flask(t, sc, vEq + 0.025).pinkConc)
  }
  return [lo, hi]
}
for (const [mName, pKas] of MODELS) {
  for (const pct of [0.1, 0.5, 1.0]) {
    console.log(`\n-- ${mName}, indicator ${pct}% w/v --`)
    console.log('CO2 multiple | drops=1 | drops=2 | drops=3 | drops=4 | common to 2 and 3 drops | common to 1-4 drops')
    for (const co2 of [0, 1, 2, 3, 5, 10]) {
      const cells: string[] = []
      const regs: [number, number][] = []
      for (const drops of [1, 2, 3, 4]) {
        const reg = region({ ...BASE, indicatorPKas: pKas, indicatorPercent: pct, drops, co2Multiple: co2 })
        regs.push(reg)
        cells.push(reg[0] < reg[1] ? `${sci(reg[0])}..${sci(reg[1])}` : `none (needs <=${sci(reg[1])})`)
      }
      const common = (rs: [number, number][]) => {
        const lo = Math.max(...rs.map((r) => r[0]))
        const hi = Math.min(...rs.map((r) => r[1]))
        return lo < hi ? `${sci(lo)}..${sci(hi)}${hi >= T0 && lo < T0 ? ' (3e-6 inside)' : ' (3e-6 OUTSIDE)'}` : 'none'
      }
      console.log(`${co2}x | ${cells.join(' | ')} | ${common([regs[1], regs[2]])} | ${common(regs)}`)
    }
  }
}

// brute-force confirmation with the real half-drop grid
console.log('\n=== C2. Brute-force scan with the real grid (0.25 mL stream steps), 100 seeds x (2,3 drops) = 200 runs ===')
console.log('threshold (M) | two-step 0.5% CO2 1x | two-step 0.5% no CO2 | two-step 1% CO2 1x | two-step 0.1% CO2 1x | one-step 9.7 0.5% CO2 1x')
{
  const cols: Scenario[] = [
    { ...BASE },
    { ...BASE, co2Multiple: 0 },
    { ...BASE, indicatorPercent: 1 },
    { ...BASE, indicatorPercent: 0.1 },
    { ...BASE, indicatorPKas: PP_ONE_STEP_MERCK },
  ]
  const trajs = cols.map((c) => [2, 3].flatMap((drops) => SEEDS.map((s) => trajectory(seededTrial(s), { ...c, drops }, 250))))
  for (let e = -10; e <= -4.0001; e += 0.25) {
    const T = Math.pow(10, e)
    const cells = trajs.map((rs) => `${rs.filter((r) => judge(r, T).ok).length}`)
    console.log(`${sci(T)} | ${cells.join(' | ')}`)
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== D. What the careful endpoint looks like (two-step, CO2 1x, threshold 3e-6, 0.25 mL stream steps) ===')
console.log('strength | drops | pH at endpoint min..max | pink conc at endpoint min..max (M) | as multiple of threshold | pink fraction min..max | pink at V_eq+0.10 (overshoot line) min..max | indicator total (M)')
for (const pct of [0.1, 0.5, 1.0]) {
  for (const drops of [2, 3]) {
    const sc: Scenario = { ...BASE, indicatorPercent: pct, drops }
    const pH: number[] = []
    const pk: number[] = []
    const fr: number[] = []
    const ov: number[] = []
    let tot = 0
    for (const seed of SEEDS) {
      const t = seededTrial(seed)
      const r = trajectory(t, sc, 250)
      const e = judge(r, T0)
      if (!Number.isFinite(e.endMl)) continue
      const f = flask(t, sc, e.endMl)
      pH.push(f.pH)
      pk.push(f.pinkConc)
      fr.push(f.pinkFraction)
      tot = f.indicatorConc
      ov.push(flask(t, sc, r.vEqMl + 0.1).pinkConc)
    }
    const mm = (a: number[], f: (x: number) => string) => `${f(Math.min(...a))}..${f(Math.max(...a))}`
    console.log(
      `${pct}% | ${drops} | ${mm(pH, (x) => x.toFixed(2))} | ${mm(pk, sci)} | ${mm(pk.map((p) => p / T0), (x) => x.toFixed(1))} | ${mm(fr, (x) => x.toFixed(3))} | ${mm(ov, sci)} | ${sci(tot)}`,
    )
  }
}

// colour along one run, to show the jump
console.log('\nSeed 1, two-step 0.5%, 2 drops, CO2 1x: mixed flask around equivalence')
{
  const t = seededTrial(1)
  const vEq = equivalenceMl(t)
  console.log(`V_eq = ${vEq.toFixed(4)} mL (HCl ${t.cHCl}, NaOH ${t.cNaOH.toFixed(5)}, pipette ${t.pipetteMl.toFixed(4)})`)
  console.log('mL past V_eq | pH | pink fraction | pink conc (M) | multiple of 3e-6')
  for (const past of [-2, -0.2, -0.05, -0.025, -0.001, 0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.05, 0.075, 0.1, 0.2, 0.5, 1]) {
    const f = flask(t, BASE, vEq + past)
    console.log(`${past} | ${f.pH.toFixed(3)} | ${f.pinkFraction.toExponential(2)} | ${sci(f.pinkConc)} | ${(f.pinkConc / T0).toFixed(2)}`)
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== E. Sensitivity (two-step, 0.5%, threshold 3e-6): worst e* over seeds 1-100 and box corners, mL ===')
function worstE(sc: Scenario, T = T0, trialIndex = 0): number {
  const trials = [...SEEDS.map((s) => seededTrial(s, trialIndex)), ...boxTrials()]
  return Math.max(...trials.map((t) => excessToThreshold(t, sc, T)))
}
const line = (name: string, f: (drops: number) => number) =>
  console.log(`${name} | ${fmt(f(2), 5)} | ${fmt(f(3), 5)} | ${f(2) <= 0.025 && f(3) <= 0.025 ? 'passes' : 'FAILS'}`)
console.log('case | worst e* at 2 drops | worst e* at 3 drops | offset-independent result')
line('base (closed flask, CO2 1x, carbonate-free NaOH)', (d) => worstE({ ...BASE, drops: d }))
line('no CO2', (d) => worstE({ ...BASE, drops: d, co2Multiple: 0 }))
for (const m of [2, 3, 5, 10]) line(`CO2 ${m}x air`, (d) => worstE({ ...BASE, drops: d, co2Multiple: m }))
for (const f of [0.0005, 0.001, 0.002, 0.005, 0.01]) line(`titrant carries carbonate = ${(f * 100).toFixed(2)}% of NaOH molarity`, (d) => worstE({ ...BASE, drops: d, titrantCarbonate: f }))
line('pKw 14.00 instead of 13.99', (d) => worstE({ ...BASE, drops: d, kw: 1e-14 }))
for (const ti of [1, 2, 4]) line(`trial index ${ti} (later pipette draws)`, (d) => worstE({ ...BASE, drops: d }, T0, ti))
for (const w of [5, 10, 25, 50, 100]) line(`${w} mL CO2-free distilled water added`, (d) => worstE({ ...BASE, drops: d, waterMl: w }))
for (const w of [5, 10, 25, 50]) line(`${w} mL air-equilibrated distilled water added`, (d) => worstE({ ...BASE, drops: d, waterMl: w, waterCarriesCo2: true }))

// open flask: CO2(aq) pinned at air equilibrium, so bicarbonate grows without limit as pH rises
{
  const t = seededTrial(1)
  const vEq = equivalenceMl(t)
  const V = (t.pipetteMl + 0.1 + vEq) / 1000
  // moles of OH- needed to hold pH 8.9 against an open carbonate system: [HCO3-] = K1 [CO2]/h
  const h = Math.pow(10, -8.9)
  const hco3 = (Math.pow(10, -6.35) * CO2_AQ) / h
  const co3 = (hco3 * Math.pow(10, -10.33)) / h
  const extraMl = ((hco3 + 2 * co3) * V) / t.cNaOH * 1000
  console.log(`\nOpen flask at full air equilibrium, pH 8.9: bicarbonate ${sci(hco3)} M, needing about ${extraMl.toFixed(2)} mL more titrant -> the test cannot pass; the flask must be closed.`)
}

// does added water move the careful endpoint?
console.log('\n=== F. Distilled water added to the flask (misconception check: result must change by 0) ===')
console.log('water mL | carries CO2 | threshold | seeds (of 100) x drops (2,3) whose careful endpoint volume changed | largest change mL')
for (const T of [3e-6, 1e-6]) {
  for (const carries of [false, true]) {
    for (const w of [5, 10, 25, 50, 100]) {
      let changed = 0
      let biggest = 0
      for (const drops of [2, 3]) {
        for (const seed of SEEDS) {
          const t = seededTrial(seed)
          const a = judge(trajectory(t, { ...BASE, drops }, 250), T)
          const b = judge(trajectory(t, { ...BASE, drops, waterMl: w, waterCarriesCo2: carries }, 250), T)
          if (Math.abs(a.endMl - b.endMl) > 1e-9) {
            changed++
            biggest = Math.max(biggest, Math.abs(a.endMl - b.endMl))
          }
        }
      }
      console.log(`${w} | ${carries ? 'yes' : 'no'} | ${sci(T)} | ${changed}/200 | ${biggest.toFixed(3)}`)
    }
  }
}
