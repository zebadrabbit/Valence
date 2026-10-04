"""Solver spot values, titration curve, grading worst case, technique errors, IAPWS pKw, derived constants."""
import math
from itertools import product
from model import (Config, Acid, solve_ph, seeded, flask_state, v_eq_ml, v_eq_nominal_ml, careful_run,
                   judge, excess_to_threshold)

SEEDS = range(1, 101)


def hdr(t):
    print("\n=== " + t + " ===")


# ------------------------------------------------------------ independent exact solutions
def newton_poly(coeffs, x0):
    """Root of polynomial (highest power first) by Newton from x0, in plain floats."""
    x = x0
    for _ in range(200):
        f = 0.0
        df = 0.0
        for c in coeffs:
            df = df * x + f
            f = f * x + c
        if df == 0:
            break
        nx = x - f / df
        if abs(nx - x) <= 1e-17 * abs(x):
            x = nx
            break
        x = nx
    return x


def exact_strong(c_acid_minus_base, kw):
    d = c_acid_minus_base
    return (d + math.sqrt(d * d + 4 * kw)) / 2


def exact_mono(ca, cb, ka, kw):
    # weak acid HA at ca with its sodium salt at cb:  h^3 + (ka+cb) h^2 - (kw + ka*ca) h - ka*kw = 0
    return newton_poly([1.0, ka + cb, -(kw + ka * ca), -ka * kw], 1.0)


def exact_triprotic(c, k1, k2, k3, kw):
    # h^5 + k1 h^4 + (k1k2 - kw - c k1) h^3 + (k1k2k3 - k1 kw - 2 c k1k2) h^2 - (k1k2 kw + 3 c k1k2k3) h - k1k2k3 kw = 0
    co = [1.0, k1, k1 * k2 - kw - c * k1, k1 * k2 * k3 - k1 * kw - 2 * c * k1 * k2,
          -(k1 * k2 * kw + 3 * c * k1 * k2 * k3), -k1 * k2 * k3 * kw]
    return newton_poly(co, 1.0)


def solver_checks():
    hdr("Solver spot values (spec 7.4)")
    pka_ac = 4.756
    pk_p = (2.148, 7.198, 12.375)
    for pkw in (14.0, 13.995, 13.997, 13.99):
        kw = 10 ** -pkw
        rows = []
        rows.append(("0.0100 M HCl", solve_ph(0, 0.01, [], pkw), -math.log10(exact_strong(0.01, kw)), "2.00"))
        rows.append(("1e-8 M HCl", solve_ph(0, 1e-8, [], pkw), -math.log10(exact_strong(1e-8, kw)), "6.98"))
        rows.append(("0.10 M acetic", solve_ph(0, 0, [Acid(0.1, [pka_ac])], pkw),
                     -math.log10(exact_mono(0.1, 0, 10 ** -pka_ac, kw)), "2.87-2.88"))
        rows.append(("0.10 M acetic + 0.10 M acetate", solve_ph(0.1, 0, [Acid(0.2, [pka_ac])], pkw),
                     -math.log10(exact_mono(0.1, 0.1, 10 ** -pka_ac, kw)), "pKa 4.756"))
        rows.append(("0.10 M H3PO4", solve_ph(0, 0, [Acid(0.1, list(pk_p))], pkw),
                     -math.log10(exact_triprotic(0.1, *(10 ** -p for p in pk_p), kw)), "~1.63"))
        print(f"pKw {pkw}:")
        for name, a, b, spec in rows:
            print(f"  {name}: solver {a:.4f} | exact {b:.4f} | diff {a-b:+.1e} | spec {spec} | {'PASS' if abs(a-b) < 0.01 else 'FAIL'}")


def curve_checks():
    hdr("Titration curve, HCl + NaOH only (pKw 14.00)")
    pkw = 14.0
    kw = 1e-14
    worst = 0.0
    n = 0
    worst_cross = 0.0
    for ca, cb in product((0.085, 0.095, 0.105), (0.095, 0.100, 0.105)):
        va = 25.0
        ve = ca * va / cb
        v = 0.0
        while v <= 50.0:
            if abs(v - ve) > 0.5:
                vt = (va + v) * 1e-3
                ph = solve_ph(cb * v * 1e-3 / vt, ca * va * 1e-3 / vt, [], pkw)
                d = (ca * va - cb * v) * 1e-3 / vt
                ex = -math.log10(exact_strong(d, kw))
                worst = max(worst, abs(ph - ex))
                n += 1
            v += 0.05
        # volume at which solver pH crosses 7.00
        a, b = ve - 1, ve + 1
        for _ in range(80):
            m = (a + b) / 2
            vt = (va + m) * 1e-3
            if solve_ph(cb * m * 1e-3 / vt, ca * va * 1e-3 / vt, [], pkw) < 7.0:
                a = m
            else:
                b = m
        worst_cross = max(worst_cross, abs(b - ve))
    print(f"{n} points > 0.5 mL from equivalence: worst |pH - closed form| = {worst:.2e} -> {'PASS' if worst < 0.01 else 'FAIL'}")
    print(f"worst |V(pH 7.00) - V_stoich| = {worst_cross:.2e} mL -> {'PASS' if worst_cross < 0.01 else 'FAIL'}")
    for pkw in (13.99, 13.995, 13.997):
        ca, cb, va = 0.085, 0.105, 25.0
        ve = ca * va / cb
        a, b = ve - 1, ve + 1
        for _ in range(80):
            m = (a + b) / 2
            vt = (va + m) * 1e-3
            if solve_ph(cb * m * 1e-3 / vt, ca * va * 1e-3 / vt, [], pkw) < 7.0:
                a = m
            else:
                b = m
        print(f"pKw {pkw}: V(pH 7.00) - V_stoich = {b - ve:+.2e} mL")


# ------------------------------------------------------------ grading
def r2(x):
    return math.floor(x * 100 + 0.5) / 100


def learner_error(s, delivered_ml, recorded_extra=0.0, d_init=0.0, d_final=0.0, honest_round=True):
    """Percent error of the learner's NaOH molarity. Learner uses label HCl and 25.00 mL."""
    vi_true = s["start"]
    vf_true = s["start"] + delivered_ml + recorded_extra
    vi = (r2(vi_true) if honest_round else vi_true) + d_init
    vf = (r2(vf_true) if honest_round else vf_true) + d_final
    m = s["hcl"] * 25.00 / (vf - vi)
    return (m / s["naoh"] - 1) * 100


def grading():
    for thr in (3e-6, 1e-6):
        hdr(f"Careful run, no technique error, threshold {thr:g}; seeds 1-100 x trials 1-3 x (2,3 drops)")
        errs, worst_lo, worst_hi, late = [], [], [], []
        for k, t, drops in product(SEEDS, (0, 1, 2), (2, 3)):
            s = seeded(k, t)
            cfg = Config(drops=drops, threshold=thr)
            run = careful_run(s, cfg)
            assert judge(run)[0], (k, t, drops, judge(run))
            late.append(run["end"] - run["ve"])
            errs.append(learner_error(s, run["end"]))
            # misreadings at the edge of the +-0.02 mL tolerance (on the unrounded meniscus), both the same way
            worst_lo.append(learner_error(s, run["end"], d_init=-0.02, d_final=+0.02, honest_round=False))
            worst_hi.append(learner_error(s, run["end"], d_init=+0.02, d_final=-0.02, honest_round=False))
        print(f"endpoint lateness: mean {sum(late)/len(late):.4f}, max {max(late):.4f} mL  ({len(errs)} runs)")
        print(f"honest readings: {min(errs):+.3f}% .. {max(errs):+.3f}% ; outside +-1.0%: {sum(abs(e) > 1 for e in errs)}")
        print(f"readings 0.02 mL off against the learner: {min(worst_lo):+.3f}% .. {max(worst_hi):+.3f}% ; "
              f"outside +-1.0%: {sum(abs(e) > 1 for e in worst_lo + worst_hi)}")
    hdr("Analytic bound over the whole seeded box (any grid offset)")
    # molarity = HCl*25.00/(titre_read); true titre = HCl*pip/NaOH + lateness; read error +-0.04 (two readings, 0.02 each)
    lo = hi = 0.0
    for h, n, p in product((0.085, 0.105), (0.095, 0.105), (24.97, 25.03)):
        ve = h * p / n
        for late, rd in product((0.0, 0.05), (-0.04, 0.04)):
            e = (h * 25.0 / (ve + late + rd) / n - 1) * 100
            lo, hi = min(lo, e), max(hi, e)
    print(f"pipette +-0.03, endpoint 0..0.05 late, titre misread +-0.04: {lo:+.3f}% .. {hi:+.3f}%")
    print("Grading boundary: +0.9% ->", "pass" if abs(0.9) <= 1.0 else "fail", "; +1.1% ->", "pass" if abs(1.1) <= 1.0 else "fail")


def technique():
    hdr("Technique errors, each alone, threshold 3e-6 and 1e-6, seeds 1-100, trial 1, 2 and 3 drops")
    cases = [
        ("unconditioned burette (titrant x0.98)", dict(titrant_factor=0.98), 0.0),
        ("tip bubble (0.60 mL recorded, not delivered)", dict(), 0.60),
        ("pipette not rinsed (aliquot x0.98)", dict(aliquot_factor=0.98), 0.0),
        ("distilled water 10 mL CO2-free", dict(water_ml=10), 0.0),
        ("distilled water 25 mL CO2-free", dict(water_ml=25), 0.0),
        ("distilled water 25 mL air-equilibrated", dict(water_ml=25, water_co2=True), 0.0),
    ]
    for thr in (3e-6, 1e-6):
        print(f"-- threshold {thr:g}")
        for name, kw, extra in cases:
            shift, absolute, toward = [], [], []
            ov_actual = ov_nominal = bad = 0
            for k, drops in product(SEEDS, (2, 3)):
                s = seeded(k)
                base_cfg = Config(drops=drops, threshold=thr)
                cfg = Config(drops=drops, threshold=thr, **kw)
                base = careful_run(s, base_cfg)
                run = careful_run(s, cfg)   # the learner still titrates carefully, against the flask as it really is
                e0 = learner_error(s, base["end"])
                e1 = learner_error(s, run["end"], recorded_extra=extra)
                shift.append(e1 - e0)
                absolute.append(e1)
                # readings pushed 0.02 mL each toward passing
                sign = 1 if e1 < 0 else -1      # molarity low -> make titre smaller
                toward.append(learner_error(s, run["end"], recorded_extra=extra, d_init=0.02 * sign,
                                            d_final=-0.02 * sign, honest_round=False))
                if run["end"] - run["ve"] > 0.10 + 1e-9:
                    ov_actual += 1
                if run["end"] - v_eq_nominal_ml(s) > 0.10 + 1e-9:
                    ov_nominal += 1
                if not judge(run)[0]:
                    bad += 1
            closest = min(toward, key=abs)
            print(f"{name} | shift {min(shift):+.3f}%..{max(shift):+.3f}% | absolute {min(absolute):+.3f}%..{max(absolute):+.3f}% | "
                  f"closest to zero with readings pushed toward passing {closest:+.3f}% | "
                  f"overshoot vs flask's own V_eq {ov_actual}/200 | vs nominal V_eq {ov_nominal}/200 | endpoint test failures {bad}/200")


# ------------------------------------------------------------ IAPWS R11-24
def iapws_pkw(T, rho):
    n = 6
    a0, a1, a2 = -0.702132, 8681.05, -24145.1
    b0, b1, b2 = 0.813876, -51.4471, -0.469920
    Mw = 18.015268
    pkg = 0.61415 + 48251.33 / T - 67707.93 / T ** 2 + 10102100 / T ** 3
    Z = rho * math.exp(a0 + a1 / T + a2 / T ** 2 * rho ** (2 / 3))
    return -2 * n * (math.log10(1 + Z) - Z / (Z + 1) * rho * (b0 + b1 / T + b2 * rho)) + pkg + 2 * math.log10(Mw / 1000)


def iapws():
    hdr("IAPWS R11-24 equation (molal standard state)")
    for T, rho, want in ((300, 1.0, 13.906672), (600, 0.07, 20.161651), (600, 0.7, 11.147093), (800, 0.2, 14.487671),
                         (800, 1.2, 6.4058649), (1270, 0.0, 35.081557)):
        print(f"T={T} rho={rho}: {iapws_pkw(T, rho):.7f} (release: {want})")
    rho25 = 0.997047   # g/cm3, water at 25 C, 0.1 MPa (IAPWS-95 value; from memory, not fetched)
    pm = iapws_pkw(298.15, rho25)
    pc = pm - 2 * math.log10(rho25)
    print(f"25 C, rho {rho25}: pKw (molal basis) = {pm:.4f} -> Kw = {10**-pm:.4e}")
    print(f"converted to the molar (mol/L) basis the model works in: pKw = {pc:.4f} -> Kw = {10**-pc:.4e}")
    print(f"10^-13.99 = {10**-13.99:.4e}")


def derived():
    hdr("Derived constants")
    kh, x = 0.034, 425.62e-6
    print(f"CO2(aq) = 0.034 x 425.62e-6 x 1.01325 = {kh*x*1.01325:.4e} mol/kg ; in 25 mL: {kh*x*1.01325*25e-3:.3e} mol "
          f"= {kh*x*1.01325*25e-3/0.1*1e3:.4f} mL of 0.1 M NaOH (to bicarbonate)")
    print(f"with water-vapour correction (p_H2O 0.0317 bar at 25 C): {kh*x*(1.01325-0.0317):.4e}")
    print(f"Sander 3.3e-4..3.4e-4 mol/(m3 Pa) = {3.3e-4*1e5/1e3:.4f}..{3.4e-4*1e5/1e3:.4f} mol/(L bar)")
    print(f"0.5% w/v phenolphthalein = {5/318.3:.5f} mol/L ; per 0.05 mL drop {5/318.3*0.05e-3:.3e} mol ; "
          f"0.1% = {1/318.3:.5f} ; 1% = {10/318.3:.5f}")
    k1, k2 = 10 ** -9.05, 10 ** -9.50
    h = (-k1 + math.sqrt(k1 * k1 + 4 * k1 * k2)) / 2
    print(f"two-step 9.05/9.50: half of the indicator is pink at pH {-math.log10(h):.3f}")
    for ph in (8.0, 8.2, 8.3, 9.0, 9.6, 9.8, 10.0):
        h = 10 ** -ph
        f2 = k1 * k2 / (h * h + k1 * h + k1 * k2)
        f1 = 1 / (1 + 10 ** (9.7 - ph))
        print(f"  pH {ph}: pink fraction two-step {f2:.4f} | one-step 9.7 {f1:.4f}")
    h = 10 ** -9.8
    f2 = k1 * k2 / (h * h + k1 * h + k1 * k2)
    print(f"Merck spec check: A(1%,1cm) at pH 9.8 predicted from Tamura = 37500 x {f2:.3f} x 10/318.3 = {37500*f2*10/318.3:.0f} "
          f"(Merck 1.07233 specification: 700-750); one-step 9.7: {37500/(1+10**(9.7-9.8))*10/318.3:.0f}")
    print(f"  epsilon implied by Merck 700-750 with Tamura fraction: {700*31.83/f2:.0f}..{750*31.83/f2:.0f} L/(mol cm)")
    hdr("Beer-Lambert: absorbance at 553 nm for a given pink concentration and path")
    print("pink M | eps 30000: 1 cm, 2 cm, 5 cm | eps 37500: 1 cm, 2 cm, 5 cm")
    for c in (3e-7, 5e-7, 1e-6, 2e-6, 3e-6, 5e-6, 1e-5, 2.4e-5):
        print(f"{c:g} | " + ", ".join(f"{30000*c*l:.3f}" for l in (1, 2, 5)) + " | " + ", ".join(f"{37500*c*l:.3f}" for l in (1, 2, 5)))


if __name__ == "__main__":
    solver_checks()
    curve_checks()
    iapws()
    derived()
    grading()
    technique()
