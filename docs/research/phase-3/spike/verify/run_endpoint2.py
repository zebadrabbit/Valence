"""Sections C-G: threshold feasible region, brute-force scan, endpoint look, sensitivity, water, BP test.
Parallel over worker processes (standard library multiprocessing)."""
import math
from itertools import product
from multiprocessing import Pool
from model import (Config, seeded, flask_state, v_eq_ml, careful_run, judge)

SEEDS = list(range(1, 101))


def corners():
    return [{"seed": None, "hcl": h, "naoh": n, "pip": p, "start": 0.0}
            for h, n, p in product((0.0850, 0.0950, 0.1050), (0.0950, 0.1000, 0.1050), (24.97, 25.00, 25.03))]


PTS = [seeded(k) for k in SEEDS] + corners()


def hdr(t):
    print("\n=== " + t + " ===", flush=True)


def estar(s, cfg, thr, hi=1.0, iters=30):
    ve = v_eq_ml(s, cfg)
    if flask_state(s, cfg, ve)[1] >= thr:
        return 0.0
    if flask_state(s, cfg, ve + hi)[1] < thr:
        return math.inf
    a, b = 0.0, hi
    for _ in range(iters):
        m = 0.5 * (a + b)
        if flask_state(s, cfg, ve + m)[1] >= thr:
            b = m
        else:
            a = m
    return b


def job_region(args):
    ind, pct, co2, drops = args
    cfg = Config(indicator=ind, percent=pct, drops=drops, co2_mult=co2)
    lo = max(flask_state(s, cfg, v_eq_ml(s, cfg))[1] for s in PTS)
    hi = min(flask_state(s, cfg, v_eq_ml(s, cfg) + 0.025)[1] for s in PTS)
    return args, lo, hi


def trajectory(s, cfg, stream_ul=250, full=True):
    """Additions of the careful schedule (threshold-independent) through V_eq+0.20 mL with the mixed-flask pink.
    full=False evaluates only additions from V_eq-0.30 mL on (earlier ones are far below any threshold scanned)."""
    ve = v_eq_ml(s, cfg)
    ve_ul = ve * 1000.0
    d = 0
    out = []

    def rec():
        v = d / 1000.0
        if full or v >= ve - 0.30:
            out.append((v, flask_state(s, cfg, v)[1]))
    while d + stream_ul <= ve_ul - 2000:
        d += stream_ul
        rec()
    while d + 50 <= ve_ul - 200:
        d += 50
        rec()
    while d <= ve_ul + 200:
        d += 25
        rec()
    return ve, out


def endpoint_from(traj, thr):
    ve, pts = traj
    for v, pink in pts:
        if pink >= thr:
            return v
    return math.inf


def ok_from(traj, thr):
    ve = traj[0]
    v = endpoint_from(traj, thr)
    return (v >= ve - 1e-9) and (v - ve <= 0.05 + 1e-9)   # <=0.05 also implies no overshoot flag


def job_scan(args):
    kw, k, drops, thrs = args
    traj = trajectory(seeded(k), Config(drops=drops, **kw), full=True)
    return [ok_from(traj, t) for t in thrs]


def job_sens(args):
    name, kw, thr, drops = args
    cfg = Config(drops=drops, **kw)
    return name, thr, drops, max(estar(p, cfg, thr) for p in PTS)


def job_e2(args):
    thr, pct, drops = args
    cfg = Config(percent=pct, drops=drops)
    return args, max(estar(p, cfg, thr) for p in PTS)


def job_water(args):
    w, c, k, drops = args
    s = seeded(k)
    a = trajectory(s, Config(drops=drops), full=False)
    b = trajectory(s, Config(drops=drops, water_ml=w, water_co2=c), full=False)
    return w, c, [(endpoint_from(a, t), endpoint_from(b, t), ok_from(b, t)) for t in (3e-6, 1e-6)]


def job_look(args):
    pct, drops, thr = args
    cfg = Config(percent=pct, drops=drops, threshold=thr)
    phs, pinks, fr, over, late, tot = [], [], [], [], [], 0
    for k in SEEDS:
        s = seeded(k)
        run = careful_run(s, cfg)
        ph, pink, tot = flask_state(s, cfg, run["end"])
        phs.append(ph); pinks.append(pink); fr.append(pink / tot); late.append(run["end"] - run["ve"])
        over.append(flask_state(s, cfg, run["ve"] + 0.10)[1])
    return (f"{thr:g} | {pct}% | {drops} | lands {min(late):.4f}..{sum(late)/100:.4f}..{max(late):.4f} | pH {min(phs):.2f}..{max(phs):.2f} | "
            f"pink {min(pinks):.2e}..{max(pinks):.2e} | fraction {min(fr):.3f}..{max(fr):.3f} | at V_eq+0.10 {min(over):.2e}..{max(over):.2e} | "
            f"total {tot:.2e} | max endpoint / min overshoot-line {max(pinks)/min(over):.2f}")


if __name__ == "__main__":
    with Pool(7) as pool:
        hdr("C. Feasible threshold region (offset-independent): T_low = max pink at V_eq, T_high = min pink at V_eq+0.025; seeds 1-100 + 27 box points")
        print("indicator | % | CO2 | drops=1 | 2 | 3 | 4 | common 2&3 | common 1-4")
        combos = [("two", 0.1), ("two", 0.5), ("two", 1.0), ("one", 0.5)]
        co2s = (0.0, 1.0, 2.0, 3.0, 5.0, 10.0)
        jobs = [(ind, pct, co2, d) for (ind, pct) in combos for co2 in co2s for d in (1, 2, 3, 4)]
        res = {a: (lo, hi) for a, lo, hi in pool.map(job_region, jobs)}
        for (ind, pct) in combos:
            for co2 in co2s:
                cells = {d: res[(ind, pct, co2, d)] for d in (1, 2, 3, 4)}
                c23 = (max(cells[2][0], cells[3][0]), min(cells[2][1], cells[3][1]))
                c14 = (max(c[0] for c in cells.values()), min(c[1] for c in cells.values()))
                print(f"{ind} | {pct}% | {co2:g}x | " + " | ".join(f"{cells[d][0]:.2e}..{cells[d][1]:.2e}" for d in (1, 2, 3, 4))
                      + f" | {c23[0]:.2e}..{c23[1]:.2e} | {c14[0]:.2e}..{c14[1]:.2e}", flush=True)

        hdr("C2. Brute-force threshold scan on the 25 uL grid (0.25 mL stream), passes of 200 (100 seeds x 2,3 drops)")
        thrs = [10 ** (-12 + i * 0.25) for i in range(0, 33)]
        cols = [("two 0.5% CO2 1x", dict()), ("two 0.5% no CO2", dict(co2_mult=0.0)), ("two 1% CO2 1x", dict(percent=1.0)),
                ("two 0.1% CO2 1x", dict(percent=0.1)), ("one 9.7 0.5% CO2 1x", dict(indicator="one"))]
        table = []
        for name, kw in cols:
            r = pool.map(job_scan, [(kw, k, d, thrs) for k in SEEDS for d in (2, 3)], chunksize=8)
            table.append([sum(x[i] for x in r) for i in range(len(thrs))])
        print("threshold | " + " | ".join(c[0] for c in cols))
        for i, t in enumerate(thrs):
            print(f"{t:.2e} | " + " | ".join(str(col[i]) for col in table), flush=True)

        hdr("D. Endpoint appearance (two-step, CO2 1x, 0.25 mL stream), seeds 1-100")
        for line in pool.map(job_look, [(pct, d, thr) for thr in (3e-6, 2e-6, 1e-6) for pct in (0.1, 0.5, 1.0) for d in (2, 3)]):
            print(line, flush=True)

        hdr("E. Sensitivity (two-step 0.5%): worst e* (mL) over seeds 1-100 and 27 box points, at 2 / 3 drops; limit 0.025")
        cases = [
            ("base", {}), ("no CO2", dict(co2_mult=0)), ("CO2 2x", dict(co2_mult=2)), ("CO2 3x", dict(co2_mult=3)),
            ("CO2 5x", dict(co2_mult=5)), ("CO2 10x", dict(co2_mult=10)),
            ("CO2 in every mL (aliquot+titrant+drops)", dict(co2_scope="all")),
            ("titrant carbonate 0.05%", dict(titrant_carbonate=0.0005)),
            ("titrant carbonate 0.10%", dict(titrant_carbonate=0.001)),
            ("titrant carbonate 0.50%", dict(titrant_carbonate=0.005)),
            ("titrant carbonate 1.00%", dict(titrant_carbonate=0.01)),
            ("pKw 14.00", dict(pkw=14.0)), ("pKw 13.997", dict(pkw=13.997)),
            ("5 mL CO2-free water", dict(water_ml=5)), ("10 mL CO2-free water", dict(water_ml=10)),
            ("25 mL CO2-free water", dict(water_ml=25)), ("50 mL CO2-free water", dict(water_ml=50)),
            ("10 mL air-eq water", dict(water_ml=10, water_co2=True)),
            ("25 mL air-eq water", dict(water_ml=25, water_co2=True)),
            ("indicator pK 9.10/9.65 (rough estimate for I=0.05)", dict(pk1=9.10, pk2=9.65)),
            ("indicator pK 9.18/9.90 (rough estimate for I=0)", dict(pk1=9.18, pk2=9.90)),
            ("indicator pK 8.85/9.30", dict(pk1=8.85, pk2=9.30)),
            ("indicator pK 9.25/9.70", dict(pk1=9.25, pk2=9.70)),
            ("one-step pKa 9.7", dict(indicator="one")),
            ("one-step pKa 9.4", dict(indicator="one", pk_one=9.4)),
            ("drop 0.03 mL", dict(drop_ml=0.03)), ("drop 0.02 mL", dict(drop_ml=0.02)),
            ("carbonic pKa1 3.75 (the wrong, 'true H2CO3' constant) ", dict(pka1c=3.75)),
        ]
        jobs = [(n, kw, thr, d) for n, kw in cases for thr in (3e-6, 1e-6) for d in (2, 3)]
        r = {(n, thr, d): e for n, thr, d, e in pool.map(job_sens, jobs, chunksize=1)}
        for n, _ in cases:
            a = [r[(n, 3e-6, 2)], r[(n, 3e-6, 3)], r[(n, 1e-6, 2)], r[(n, 1e-6, 3)]]
            v = lambda x, y: "passes" if max(x, y) <= 0.025 else "FAILS"
            print(f"{n} | thr 3e-6: {a[0]:.5f} / {a[1]:.5f} {v(a[0], a[1])} | thr 1e-6: {a[2]:.5f} / {a[3]:.5f} {v(a[2], a[3])}", flush=True)

        hdr("E2. Worst e* by threshold, strength and drops 1-4 (two-step, CO2 1x), seeds + box")
        jobs = [(thr, pct, d) for thr in (5e-7, 1e-6, 2e-6, 3e-6, 4e-6, 5e-6) for pct in (0.1, 0.5, 1.0) for d in (1, 2, 3, 4)]
        r = dict(pool.map(job_e2, jobs, chunksize=1))
        for thr in (5e-7, 1e-6, 2e-6, 3e-6, 4e-6, 5e-6):
            for pct in (0.1, 0.5, 1.0):
                print(f"{thr:g} | {pct}% | " + " | ".join(
                    f"{r[(thr, pct, d)]:.4f}{'' if r[(thr, pct, d)] <= 0.025 else ' FAIL'}" for d in (1, 2, 3, 4)), flush=True)

        hdr("F. Distilled water: does the careful endpoint volume change? (0.25 mL stream; 100 seeds x 2,3 drops)")
        jobs = [(w, c, k, d) for w in (5, 10, 25, 50, 100) for c in (False, True) for k in SEEDS for d in (2, 3)]
        agg = {}
        for w, c, rows in pool.map(job_water, jobs, chunksize=16):
            for i, (a, b, ok) in enumerate(rows):
                st = agg.setdefault((i, w, c), [0, 0.0, 0])
                if abs(a - b) > 1e-9:
                    st[0] += 1
                    st[1] = max(st[1], abs(a - b))
                if not ok:
                    st[2] += 1
        for i, thr in enumerate((3e-6, 1e-6)):
            for w in (5, 10, 25, 50, 100):
                for c in (False, True):
                    st = agg[(i, w, c)]
                    print(f"thr {thr:g} | {w} mL | carries CO2 {'yes' if c else 'no'} | endpoint moved {st[0]}/200 | largest {st[1]:.3f} mL | "
                          f"endpoint later than V_eq+0.05: {st[2]}/200", flush=True)

    hdr("G. BP sensitivity test through the model: 0.1 mL of 0.1% in 100 mL CO2-free water + up to 0.2 mL 0.02 M NaOH")
    for ind in ("two", "one"):
        s = {"hcl": 0.0, "naoh": 0.02, "pip": 100.0, "start": 0}
        cfg = Config(indicator=ind, percent=0.1, drops=1, drop_ml=0.1, co2_mult=0.0)
        for v in (0.05, 0.1, 0.2):
            ph, pink, tot = flask_state(s, cfg, v)
            print(f"{ind}: {v} mL NaOH -> pH {ph:.2f}, pink fraction {pink/tot:.3f}, pink {pink:.2e} M (total {tot:.2e} M)")
