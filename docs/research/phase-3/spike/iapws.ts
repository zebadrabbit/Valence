// IAPWS R11-24 (2024) ionization constant of water, Eqs. (2)-(4), parameters from Table 1.
// Checked against the release's own Table 2 test value before being used at 25 C.
const n = 6
const a0 = -0.702132, a1 = 8681.05, a2 = -24145.1
const b0 = 0.813876, b1 = -51.4471, b2 = -0.46992
const Mw = 18.015268

export function pKwIapws(T: number, rho: number): number {
  const Z = rho * Math.exp(a0 + a1 / T + (a2 / (T * T)) * Math.pow(rho, 2 / 3))
  const pKwG = 0.61415 + 48251.33 / T - 67707.93 / (T * T) + 10102100 / (T * T * T)
  return (
    -2 * n * (Math.log10(1 + Z) - (Z / (Z + 1)) * rho * (b0 + b1 / T + b2 * rho)) +
    pKwG +
    2 * Math.log10(Mw / 1000)
  )
}

if (import.meta.main) {
  console.log('IAPWS R11-24 Table 2 check: T=300 K, rho=1.0 -> expect 13.906672, got', pKwIapws(300, 1.0).toFixed(6))
  console.log('IAPWS R11-24 Table 2 check: T=600 K, rho=0.7 -> expect 11.147093, got', pKwIapws(600, 0.7).toFixed(6))
  console.log('IAPWS R11-24 Table 2 check: T=800 K, rho=1.2 -> expect 6.4058649, got', pKwIapws(800, 1.2).toFixed(7))
  // density of liquid water at 25 C, 0.1 MPa: 0.99705 g/cm3 (IAPWS-95; value from memory, not fetched)
  for (const rho of [0.9970, 0.99705, 0.9971]) {
    console.log(`pKw (molal basis) at 298.15 K, rho=${rho}:`, pKwIapws(298.15, rho).toFixed(4))
  }
}
