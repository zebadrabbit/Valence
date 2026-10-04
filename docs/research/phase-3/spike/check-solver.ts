// Item 5: solver against independently computed exact solutions (spec 7.4, solver and titration curve).
// The independent solutions use Newton's method on the mass-balance polynomial in [H+], or the
// closed-form quadratic, never the charge-balance bisection under test.
import { solvePH } from './model.ts'

const KW = 1.0e-14 // pinned for the spot values (the spec's 6.98 for 1e-8 M HCl assumes this)
const PKA_ACETIC = 4.756
const PKAS_PHOSPHORIC = [2.148, 7.198, 12.375]

function newton(f: (h: number) => number, h0: number): number {
  let h = h0
  for (let i = 0; i < 200; i++) {
    const d = h * 1e-7
    const step = (f(h) * 2 * d) / (f(h + d) - f(h - d))
    h -= step
    if (h <= 0) h = (h + step) / 2
    if (Math.abs(step) < 1e-15 * h) break
  }
  return h
}

const rows: [string, number, number, string][] = []

// strong acid: h^2 - C h - Kw = 0
const strong = (c: number) => (c + Math.sqrt(c * c + 4 * KW)) / 2
rows.push(['0.0100 M HCl', solvePH({ strongCharge: -0.01, acids: [], kw: KW }), -Math.log10(strong(0.01)), '2.00'])
rows.push(['1e-8 M HCl', solvePH({ strongCharge: -1e-8, acids: [], kw: KW }), -Math.log10(strong(1e-8)), '6.98'])

// monoprotic weak acid, cubic: h^3 + Ka h^2 - (Kw + Ka C) h - Ka Kw = 0
const ka = Math.pow(10, -PKA_ACETIC)
const hAc = newton((h) => h * h * h + ka * h * h - (KW + ka * 0.1) * h - ka * KW, 1e-3)
rows.push([
  '0.10 M acetic acid',
  solvePH({ strongCharge: 0, kw: KW, acids: [{ total: 0.1, pKas: [PKA_ACETIC], chargeProtonated: 0 }] }),
  -Math.log10(hAc),
  '2.87-2.88',
])

// buffer: h^3 + (Ka + Cs) h^2 - (Kw + Ka Ca) h - Ka Kw = 0  with Ca = acid, Cs = salt
const hBuf = newton((h) => h * h * h + (ka + 0.1) * h * h - (KW + ka * 0.1) * h - ka * KW, 1e-5)
rows.push([
  '0.10 M acetic acid + 0.10 M sodium acetate',
  solvePH({ strongCharge: 0.1, kw: KW, acids: [{ total: 0.2, pKas: [PKA_ACETIC], chargeProtonated: 0 }] }),
  -Math.log10(hBuf),
  `pKa ${PKA_ACETIC}`,
])

// triprotic: proton condition written out with explicit species concentrations
const [k1, k2, k3] = PKAS_PHOSPHORIC.map((p) => Math.pow(10, -p))
const hP = newton((h) => {
  const D = h * h * h + k1 * h * h + k1 * k2 * h + k1 * k2 * k3
  return h - KW / h - (0.1 * (k1 * h * h + 2 * k1 * k2 * h + 3 * k1 * k2 * k3)) / D
}, 0.02)
rows.push([
  '0.10 M H3PO4',
  solvePH({ strongCharge: 0, kw: KW, acids: [{ total: 0.1, pKas: PKAS_PHOSPHORIC, chargeProtonated: 0 }] }),
  -Math.log10(hP),
  'about 1.63',
])

console.log(`Solver spot values (Kw pinned ${KW}, acetic pKa ${PKA_ACETIC}, phosphoric pKas ${PKAS_PHOSPHORIC.join('/')})`)
console.log('case | solver pH | independent pH | difference | spec value | pass (<0.01)')
let allOk = true
for (const [name, got, exact, spec] of rows) {
  const ok = Math.abs(got - exact) < 0.01
  allOk &&= ok
  console.log(`${name} | ${got.toFixed(4)} | ${exact.toFixed(4)} | ${(got - exact).toExponential(1)} | ${spec} | ${ok ? 'PASS' : 'FAIL'}`)
}

// Titration curve, HCl + NaOH only. Closed form: delta = (nA - nB)/V, h = (delta + sqrt(delta^2 + 4Kw))/2
console.log('\nTitration curve, HCl with NaOH, no indicator, no CO2')
let worst = 0
let worstAt = ''
let points = 0
let worstCross = 0
for (const cA of [0.085, 0.095, 0.105]) {
  for (const cB of [0.095, 0.1, 0.105]) {
    const vA = 25
    const vEq = (cA * vA) / cB
    const pH = (v: number) => solvePH({ strongCharge: (cB * v - cA * vA) / (vA + v), acids: [], kw: KW })
    for (let v = 0; v <= 50 + 1e-9; v += 0.025) {
      if (Math.abs(v - vEq) <= 0.5) continue
      const delta = (cA * vA - cB * v) / (vA + v)
      // root of h^2 - delta h - Kw = 0; on the basic side take the OH- root so nothing cancels
      const root = (Math.abs(delta) + Math.sqrt(delta * delta + 4 * KW)) / 2
      const exact = -Math.log10(delta >= 0 ? root : KW / root)
      const diff = Math.abs(pH(v) - exact)
      points++
      if (diff > worst) {
        worst = diff
        worstAt = `cA=${cA} cB=${cB} v=${v.toFixed(3)}`
      }
    }
    let lo = vEq - 1
    let hi = vEq + 1
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if (pH(mid) < 7) lo = mid
      else hi = mid
    }
    worstCross = Math.max(worstCross, Math.abs(hi - vEq))
  }
}
console.log(`points more than 0.5 mL from equivalence: ${points}; worst |pH - closed form| = ${worst.toExponential(2)} at ${worstAt} -> ${worst < 0.01 ? 'PASS' : 'FAIL'}`)
console.log(`worst |V(pH 7.00) - V_stoich| over 9 concentration pairs = ${worstCross.toExponential(2)} mL -> ${worstCross < 0.01 ? 'PASS' : 'FAIL'}`)

// pH 7.00 crossing with the cited Kw the flask model uses (neutral is then pH 6.995, not 7.00)
{
  const kw = Math.pow(10, -13.99)
  const cA = 0.085, cB = 0.105, vA = 25, vEq = (cA * vA) / cB
  let lo = vEq - 1, hi = vEq + 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (solvePH({ strongCharge: (cB * mid - cA * vA) / (vA + mid), acids: [], kw }) < 7) lo = mid
    else hi = mid
  }
  console.log(`with pKw 13.99: V(pH 7.00) - V_stoich = ${(hi - vEq).toExponential(2)} mL`)
}
// The same spot value with the cited Kw the flask model uses
for (const pKw of [13.99, 13.995, 14.0]) {
  const kw = Math.pow(10, -pKw)
  console.log(`1e-8 M HCl with pKw ${pKw}: solver pH ${solvePH({ strongCharge: -1e-8, acids: [], kw }).toFixed(4)}`)
}
console.log(allOk && worst < 0.01 && worstCross < 0.01 ? '\nALL SOLVER CHECKS PASS' : '\nSOLVER CHECK FAILURE')
