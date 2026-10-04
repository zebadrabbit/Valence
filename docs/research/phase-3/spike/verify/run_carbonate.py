"""Titrant that has absorbed CO2: 2 NaOH + CO2 -> Na2CO3 + H2O. Sodium is conserved at the seeded molarity,
a fraction f (of the NaOH molarity) is present as carbonate, so hydroxide = c(1-2f). V_eq stays the seeded-NaOH value.
(run_endpoint2 section E used a different convention, carbonate ADDED on top of the NaOH, which makes the endpoint early.)"""
import math, sys
from itertools import product
from model import Config, Acid, solve_ph, seeded, v_eq_ml, indicator_molarity, CO2_AIR
from run_endpoint2 import PTS

def pink_at(s, drops, v_ml, f, thr_cfg=None, pct=0.5):
    n_cl = s["hcl"] * s["pip"] * 1e-3
    n_na = s["naoh"] * v_ml * 1e-3
    n_ind = indicator_molarity(pct) * drops * 0.05e-3
    n_c = CO2_AIR * s["pip"] * 1e-3 + f * s["naoh"] * v_ml * 1e-3
    v = (s["pip"] + v_ml + drops * 0.05) * 1e-3
    ind = Acid(n_ind / v, [9.05, 9.50])
    ph = solve_ph(n_na / v, n_cl / v, [ind, Acid(n_c / v, [6.35, 10.33])], 13.99)
    return ind.fractions(10 ** -ph)[-1] * n_ind / v, ph

def estar(s, drops, f, thr):
    ve = s["hcl"] * s["pip"] / s["naoh"]
    if pink_at(s, drops, ve, f)[0] >= thr: return 0.0
    a, b = 0.0, 2.0
    for _ in range(32):
        m = (a + b) / 2
        if pink_at(s, drops, ve + m, f)[0] >= thr: b = m
        else: a = m
    return b

for f in (0.0, 0.0005, 0.001, 0.002, 0.005, 0.01):
    row = []
    for thr, drops in product((3e-6, 1e-6), (2, 3)):
        row.append(max(estar(p, drops, f, thr) for p in PTS))
    print(f"carbonate = {f*100:.2f}% of NaOH molarity (sodium conserved) | thr 3e-6: {row[0]:.5f} / {row[1]:.5f} | thr 1e-6: {row[2]:.5f} / {row[3]:.5f} | "
          f"{'passes' if max(row[:2]) <= 0.025 else 'FAILS'} at 3e-6, {'passes' if max(row[2:]) <= 0.025 else 'FAILS'} at 1e-6")
# open flask at full air equilibrium, pH 8.9
h = 10 ** -8.9; k1 = 10 ** -6.35; k2 = 10 ** -10.33
hco3 = k1 * CO2_AIR / h; co3 = k2 * hco3 / h
print(f"open flask at full air equilibrium at pH 8.9: HCO3- {hco3:.3e} M, CO3-- {co3:.3e} M, alkalinity {hco3+2*co3:.3e} M "
      f"= {(hco3+2*co3)*0.0535/0.1*1e3:.2f} mL of 0.1 M NaOH in a 53.5 mL flask")
