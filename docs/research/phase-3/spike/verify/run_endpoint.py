"""Acceptance test of spec 7.4 (endpoint), threshold scan, sensitivity."""
import math
import sys
from itertools import product
from model import (Config, seeded, flask_state, v_eq_ml, excess_to_threshold, careful_run,
                   judge, CO2_AIR, indicator_molarity, mulberry32)

SEEDS = range(1, 101)


def corners():
    """27 corner/mid points of the seeded box (HCl, NaOH, pipette)."""
    out = []
    for h, n, p in product((0.0850, 0.0950, 0.1050), (0.0950, 0.1000, 0.1050), (24.97, 25.00, 25.03)):
        out.append({"seed": None, "hcl": h, "naoh": n, "pip": p, "start": 0.0})
    return out


def hdr(t):
    print("\n=== " + t + " ===")


def acceptance(cfg_kw, layouts, label):
    for name, kw in layouts:
        for drops in (2, 3):
            cfg = Config(drops=drops, **cfg_kw)
            ok = 0
            pasts = []
            which = [0, 0, 0]
            reasons = {}
            for seed in SEEDS:
                s = seeded(seed)
                run = careful_run(s, cfg, **kw)
                good, why, past = judge(run)
                pasts.append(past)
                if good:
                    ok += 1
                else:
                    reasons[why] = reasons.get(why, 0) + 1
                # which half-drop grid point past V_eq did it land on
                n_past = sum(1 for a, _ in run["adds"] if a > run["ve"] + 1e-9)
                which[min(n_past, 3) - 1 if n_past >= 1 else 0] += 1 if n_past >= 1 else 0
            print(f"{label} | {name} | {drops} drops | pass {ok}/100 | past V_eq {min(pasts):.4f}..{max(pasts):.4f} "
                  f"mean {sum(pasts)/len(pasts):.4f} | 1st/2nd/3rd+ {which[0]}/{which[1]}/{which[2]} | "
                  f"{reasons if reasons else '-'}")


LAYOUTS = [
    ("literal pour", dict(literal=True)),
    ("0.10 mL stream", dict(stream_ul=100)),
    ("0.25 mL stream", dict(stream_ul=250)),
    ("0.50 mL stream", dict(stream_ul=500)),
    ("0.37 mL stream", dict(stream_ul=370)),
]

if __name__ == "__main__":
    print(f"CO2(aq) at air equilibrium = {CO2_AIR:.4e} mol/L; 0.5% indicator = {indicator_molarity(0.5):.5f} mol/L; "
          f"per 0.05 mL drop = {indicator_molarity(0.5)*0.05e-3:.3e} mol")
    r = mulberry32(1)
    print("mulberry32(1) first three:", r(), r(), r())
    s1 = seeded(1)
    print("seed 1:", s1, "V_eq", round(v_eq_ml(s1, Config()), 4))
    ves = [v_eq_ml(seeded(k), Config()) for k in SEEDS]
    print(f"seeds 1-100 V_eq range {min(ves):.3f} to {max(ves):.3f} mL")

    hdr("A. Acceptance, seeds 1-100, threshold 3e-6, two-step 9.05/9.50, 0.5% indicator")
    acceptance(dict(co2_mult=1.0), LAYOUTS, "CO2 1x")
    acceptance(dict(co2_mult=0.0), LAYOUTS, "no CO2")
    hdr("A2. Same at threshold 1e-6")
    acceptance(dict(co2_mult=1.0, threshold=1e-6), LAYOUTS[1:3], "CO2 1x")
    acceptance(dict(co2_mult=0.0, threshold=1e-6), LAYOUTS[1:3], "no CO2")
    hdr("A3. One-step pKa 9.7, threshold 3e-6, 0.5%")
    acceptance(dict(co2_mult=1.0, indicator="one"), LAYOUTS[1:3], "CO2 1x")
    acceptance(dict(co2_mult=0.0, indicator="one"), LAYOUTS[1:3], "no CO2")
    hdr("A4. Other indicator strengths, two-step, CO2 1x, threshold 3e-6")
    for pct in (0.1, 1.0):
        acceptance(dict(co2_mult=1.0, percent=pct), LAYOUTS[2:3], f"{pct}%")

    hdr("B. e* = excess titrant past V_eq to reach threshold (mL); offset-independent pass needs 0 < e* <= 0.025")
    print("indicator | % | drops | CO2 | thr | e* min | mean | max (seeds) | max (27 box points)")
    for ind, pct, drops, co2, thr in product(("two", "one"), (0.1, 0.5, 1.0), (2, 3), (1.0, 0.0), (3e-6,)):
        cfg = Config(indicator=ind, percent=pct, drops=drops, co2_mult=co2, threshold=thr)
        es = [excess_to_threshold(seeded(k), cfg) for k in SEEDS]
        ec = [excess_to_threshold(c, cfg) for c in corners()]
        print(f"{ind} | {pct}% | {drops} | {co2:g}x | {thr:g} | {min(es):.5f} | {sum(es)/len(es):.5f} | {max(es):.5f} | {max(ec):.5f}"
              f" | {'yes' if max(max(es), max(ec)) <= 0.025 and min(es) > 0 else 'NO'}")

    hdr("B2. Offset sweep (two-step 0.5% CO2 1x thr 3e-6): first grid point d mL past V_eq; 100 seeds x (2,3) drops")
    for d_ul in (0.1, 1, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25):
        ok = 0
        pasts = []
        for drops in (2, 3):
            cfg = Config(drops=drops)
            for k in SEEDS:
                run = careful_run(seeded(k), cfg, offset_ul=d_ul)
                g, why, past = judge(run)
                ok += g
                pasts.append(past)
        print(f"d={d_ul/1000:.4f} | pass {ok}/200 | landing {min(pasts):.4f}..{max(pasts):.4f}")

    hdr("C. Feasible threshold region (offset-independent): T_low = max pink at V_eq, T_high = min pink at V_eq+0.025")
    print("indicator | % | CO2 | drops=1 | 2 | 3 | 4 | common 2&3 | common 1-4")
    for ind, pct in (("two", 0.1), ("two", 0.5), ("two", 1.0), ("one", 0.5)):
        for co2 in (0.0, 1.0, 2.0, 3.0, 5.0, 10.0):
            cells = {}
            for drops in (1, 2, 3, 4):
                cfg = Config(indicator=ind, percent=pct, drops=drops, co2_mult=co2)
                pts = [seeded(k) for k in SEEDS] + corners()
                lo = max(flask_state(s, cfg, v_eq_ml(s, cfg))[1] for s in pts)
                hi = min(flask_state(s, cfg, v_eq_ml(s, cfg) + 0.025)[1] for s in pts)
                cells[drops] = (lo, hi)
            c23 = (max(cells[2][0], cells[3][0]), min(cells[2][1], cells[3][1]))
            c14 = (max(c[0] for c in cells.values()), min(c[1] for c in cells.values()))
            print(f"{ind} | {pct}% | {co2:g}x | " + " | ".join(f"{cells[d][0]:.2e}..{cells[d][1]:.2e}" for d in (1, 2, 3, 4))
                  + f" | {c23[0]:.2e}..{c23[1]:.2e} | {c14[0]:.2e}..{c14[1]:.2e}")

    hdr("C2. Brute-force threshold scan on the real 25 uL grid (0.25 mL stream), passes of 200 (100 seeds x 2,3 drops)")
    cols = [("two 0.5% CO2 1x", dict()), ("two 0.5% no CO2", dict(co2_mult=0.0)), ("two 1% CO2 1x", dict(percent=1.0)),
            ("two 0.1% CO2 1x", dict(percent=0.1)), ("one 9.7 0.5% CO2 1x", dict(indicator="one"))]
    print("threshold | " + " | ".join(c[0] for c in cols))
    for i in range(0, 24):
        thr = 10 ** (-10 + i * 0.25)
        row = []
        for _, kw in cols:
            ok = 0
            for drops in (2, 3):
                cfg = Config(drops=drops, threshold=thr, **kw)
                for k in SEEDS:
                    ok += judge(careful_run(seeded(k), cfg))[0]
            row.append(str(ok))
        print(f"{thr:.2e} | " + " | ".join(row))

    hdr("D. Endpoint appearance (two-step, CO2 1x, thr 3e-6, 0.25 mL stream)")
    print("% | drops | pH at endpoint | pink at endpoint (M) | pink fraction | pink at V_eq+0.10 | total indicator M | max endpoint/min overshoot-line")
    for pct, drops in product((0.1, 0.5, 1.0), (2, 3)):
        cfg = Config(percent=pct, drops=drops)
        phs, pinks, fr, over, tot = [], [], [], [], 0
        for k in SEEDS:
            s = seeded(k)
            run = careful_run(s, cfg)
            ph, pink, tot = flask_state(s, cfg, run["end"])
            phs.append(ph); pinks.append(pink); fr.append(pink / tot)
            over.append(flask_state(s, cfg, run["ve"] + 0.10)[1])
        print(f"{pct}% | {drops} | {min(phs):.2f}..{max(phs):.2f} | {min(pinks):.2e}..{max(pinks):.2e} | "
              f"{min(fr):.3f}..{max(fr):.3f} | {min(over):.2e}..{max(over):.2e} | {tot:.2e} | {max(pinks)/min(over):.2f}")

    hdr("D2. Seed 1, two-step 0.5%, 2 drops, CO2 1x: mixed flask around equivalence")
    cfg = Config()
    s = seeded(1)
    ve = v_eq_ml(s, cfg)
    for e in (-2, -0.2, -0.05, -0.025, -0.001, 0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.05, 0.075, 0.1, 0.2, 0.5, 1):
        ph, pink, tot = flask_state(s, cfg, ve + e)
        print(f"{e:>7} | pH {ph:.3f} | fraction {pink/tot:.3e} | pink {pink:.3e}")

    hdr("E. Sensitivity (two-step 0.5%, thr 3e-6): worst e* over seeds and 27 box points")
    cases = [
        ("base", {}), ("no CO2", dict(co2_mult=0)), ("CO2 2x", dict(co2_mult=2)), ("CO2 3x", dict(co2_mult=3)),
        ("CO2 5x", dict(co2_mult=5)), ("CO2 10x", dict(co2_mult=10)),
        ("CO2 in every mL (aliquot+titrant+drops)", dict(co2_scope="all")),
        ("titrant carbonate 0.05%", dict(titrant_carbonate=0.0005)),
        ("titrant carbonate 0.10%", dict(titrant_carbonate=0.001)),
        ("titrant carbonate 0.50%", dict(titrant_carbonate=0.005)),
        ("titrant carbonate 1.00%", dict(titrant_carbonate=0.01)),
        ("pKw 14.00", dict(pkw=14.0)), ("pKw 13.995", dict(pkw=13.995)),
        ("5 mL CO2-free water", dict(water_ml=5)), ("10 mL CO2-free water", dict(water_ml=10)),
        ("25 mL CO2-free water", dict(water_ml=25)), ("50 mL CO2-free water", dict(water_ml=50)),
        ("10 mL air-eq water", dict(water_ml=10, water_co2=True)),
        ("25 mL air-eq water", dict(water_ml=25, water_co2=True)),
        ("indicator pK 9.10/9.65 (rough I=0.05 estimate)", dict(pk1=9.10, pk2=9.65)),
        ("indicator pK 9.18/9.90 (rough I=0 estimate)", dict(pk1=9.18, pk2=9.90)),
        ("indicator pK 8.85/9.30", dict(pk1=8.85, pk2=9.30)),
        ("drop 0.03 mL", dict(drop_ml=0.03)), ("drop 0.02 mL", dict(drop_ml=0.02)),
    ]
    pts = [seeded(k) for k in SEEDS] + corners()
    for name, kw in cases:
        out = []
        for thr in (3e-6, 1e-6):
            for drops in (2, 3):
                cfg = Config(drops=drops, threshold=thr, **kw)
                out.append(max(excess_to_threshold(p, cfg) for p in pts))
        verdict = lambda a, b: "passes" if max(a, b) <= 0.025 else "FAILS"
        print(f"{name} | thr 3e-6: {out[0]:.5f} / {out[1]:.5f} {verdict(out[0], out[1])} | thr 1e-6: {out[2]:.5f} / {out[3]:.5f} {verdict(out[2], out[3])}")

    hdr("E2. Worst e* by threshold, strength and drops (two-step, CO2 1x), seeds + box")
    for thr in (5e-7, 1e-6, 2e-6, 3e-6, 4e-6, 5e-6):
        for pct in (0.1, 0.5, 1.0):
            row = []
            for drops in (1, 2, 3, 4):
                cfg = Config(percent=pct, drops=drops, threshold=thr)
                e = max(excess_to_threshold(p, cfg) for p in pts)
                row.append(f"{e:.4f}{'' if e <= 0.025 else ' FAIL'}")
            print(f"{thr:g} | {pct}% | " + " | ".join(row))

    hdr("F. Distilled water: does the careful endpoint volume change? (0.25 mL stream; 100 seeds x 2,3 drops)")
    for thr in (3e-6, 1e-6):
        for w, c in product((5, 10, 25, 50, 100), (False, True)):
            changed = 0
            big = 0.0
            for drops in (2, 3):
                for k in SEEDS:
                    s = seeded(k)
                    a = careful_run(s, Config(drops=drops, threshold=thr))["end"]
                    b = careful_run(s, Config(drops=drops, threshold=thr, water_ml=w, water_co2=c))["end"]
                    if abs(a - b) > 1e-9:
                        changed += 1
                        big = max(big, abs(a - b))
            print(f"thr {thr:g} | {w} mL | CO2 {'yes' if c else 'no'} | changed {changed}/200 | largest {big:.3f} mL")

    hdr("G. BP sensitivity test through the model: 0.1 mL of 0.1% in 100 mL CO2-free water + 0.2 mL 0.02 M NaOH")
    for ind in ("two", "one"):
        s = {"hcl": 0.0, "naoh": 0.02, "pip": 100.0, "start": 0}
        cfg = Config(indicator=ind, percent=0.1, drops=1, drop_ml=0.1, co2_mult=0.0)
        for v in (0.05, 0.1, 0.2):
            ph, pink, tot = flask_state(s, cfg, v)
            print(f"{ind}: {v} mL NaOH -> pH {ph:.2f}, pink fraction {pink/tot:.3f}, pink {pink:.2e} M (total {tot:.2e} M)")
