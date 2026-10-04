"""Independent re-implementation of the Valence titration model (spec 7.3).

Standard library only. Written without reference to the first spike's code.
Volumes inside the run loop are integer microlitres; chemistry is in mol and L.
"""
import math

# ---------------------------------------------------------------- constants
PKW_DEFAULT = 13.99            # the first spike's cited value (IAPWS, molal basis, 2 dp)
PK1_PP, PK2_PP = 9.05, 9.50    # Tamura et al. 1996
PK_PP_ONE = 9.7                # Merck Index via PubChem
MW_PP = 318.3                  # g/mol
DROP_ML = 0.05
KH_CO2 = 0.034                 # mol/(kg bar)
X_CO2 = 425.62e-6              # NOAA global mean 2025
P_ATM_BAR = 1.01325
CO2_AIR = KH_CO2 * X_CO2 * P_ATM_BAR   # mol/L
PKA1_CO2, PKA2_CO2 = 6.35, 10.33


def indicator_molarity(percent_wv):
    return percent_wv * 10.0 / MW_PP    # % w/v -> g/L -> mol/L


# ---------------------------------------------------------------- rng
def mulberry32(seed):
    a = seed & 0xFFFFFFFF

    def imul(x, y):
        return (x * y) & 0xFFFFFFFF

    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        # JS: t ^= t + Math.imul(t ^ (t >>> 7), t | 61)   (t is int32 there; bits identical)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return nxt


def uniform(rng, lo, hi):
    return lo + rng() * (hi - lo)


def seeded(seed, trial=0):
    """HCl label (4 dp), true NaOH, then per trial: pipette delivery, burette start."""
    rng = mulberry32(seed)
    hcl = round(uniform(rng, 0.0850, 0.1050) * 1e4) / 1e4
    naoh = uniform(rng, 0.0950, 0.1050)
    pip = lvl = None
    for _ in range(trial + 1):
        pip = 25.0 + uniform(rng, -0.03, 0.03)
        lvl = round(uniform(rng, 0.0, 2.0) * 1000) / 1000
    return {"seed": seed, "hcl": hcl, "naoh": naoh, "pip": pip, "start": lvl}


# ---------------------------------------------------------------- solver
class Acid:
    """Polyprotic acid H_nA of total analytical concentration c (mol/L),
    with the fully protonated form carrying charge z0."""

    def __init__(self, c, pkas, z0=0):
        self.c = c
        self.ks = [10.0 ** (-p) for p in pkas]
        self.z0 = z0

    def fractions(self, h):
        n = len(self.ks)
        terms = [h ** n]
        prod = 1.0
        for i, k in enumerate(self.ks):
            prod *= k
            terms.append(prod * h ** (n - 1 - i))
        s = sum(terms)
        return [t / s for t in terms]

    def charge(self, h):
        fr = self.fractions(h)
        return self.c * sum((self.z0 - i) * f for i, f in enumerate(fr))


def solve_ph(strong_cation, strong_anion, acids, pkw=PKW_DEFAULT, lo=-2.0, hi=16.0):
    """Bisection on pH of the charge balance.
    strong_cation / strong_anion: mol/L of spectator positive / negative charge."""
    kw = 10.0 ** (-pkw)

    def f(ph):
        h = 10.0 ** (-ph)
        q = h - kw / h + strong_cation - strong_anion
        for a in acids:
            q += a.charge(h)
        return q            # positive when too acidic, decreasing in pH

    a, b = lo, hi
    for _ in range(200):
        m = 0.5 * (a + b)
        if f(m) > 0:
            a = m
        else:
            b = m
        if b - a < 1e-14:
            break
    return 0.5 * (a + b)


# ---------------------------------------------------------------- flask
class Config:
    def __init__(self, **kw):
        self.percent = 0.5          # indicator % w/v
        self.drops = 2
        self.drop_ml = DROP_ML
        self.indicator = "two"      # "two" (9.05/9.50) or "one" (single pKa)
        self.pk_one = PK_PP_ONE
        self.pk1, self.pk2 = PK1_PP, PK2_PP
        self.co2_mult = 1.0         # multiple of air-equilibrium CO2 in the aliquot
        self.co2_scope = "aliquot"  # "aliquot": only the pipetted HCl carries CO2;
                                    # "all": every mL in the flask does (aliquot, titrant, drops)
        self.pkw = PKW_DEFAULT
        self.pka1c, self.pka2c = PKA1_CO2, PKA2_CO2
        self.water_ml = 0.0         # distilled water added to the flask
        self.water_co2 = False      # does that water carry air-equilibrium CO2
        self.titrant_carbonate = 0.0  # Na2CO3 molarity as a fraction of NaOH molarity
        self.aliquot_factor = 1.0   # 0.98 = pipette not rinsed
        self.titrant_factor = 1.0   # 0.98 = burette not conditioned
        self.threshold = 3e-6
        self.__dict__.update(kw)


def flask_state(s, cfg, v_added_ml):
    """Fully mixed flask after v_added_ml of titrant. Returns (pH, pink conc M, total indicator M)."""
    n_cl = s["hcl"] * cfg.aliquot_factor * s["pip"] * 1e-3
    c_base = s["naoh"] * cfg.titrant_factor
    n_na = c_base * v_added_ml * 1e-3
    n_ind = indicator_molarity(cfg.percent) * cfg.drops * cfg.drop_ml * 1e-3
    v_ind = cfg.drops * cfg.drop_ml
    v_tot_ml = s["pip"] + v_added_ml + v_ind + cfg.water_ml
    co2 = CO2_AIR * cfg.co2_mult
    if cfg.co2_scope == "aliquot":
        n_c = co2 * s["pip"] * 1e-3
    else:
        n_c = co2 * (s["pip"] + v_added_ml + v_ind) * 1e-3
    if cfg.water_co2:
        n_c += co2 * cfg.water_ml * 1e-3
    # carbonate carried in by the titrant: Na2CO3 adds 2 Na+ and one carbonate
    n_carb_t = cfg.titrant_carbonate * c_base * v_added_ml * 1e-3
    n_na += 2 * n_carb_t
    n_c += n_carb_t
    v = v_tot_ml * 1e-3
    acids = []
    if n_ind > 0:
        if cfg.indicator == "two":
            ind = Acid(n_ind / v, [cfg.pk1, cfg.pk2])
        else:
            ind = Acid(n_ind / v, [cfg.pk_one])
        acids.append(ind)
    if n_c > 0:
        acids.append(Acid(n_c / v, [cfg.pka1c, cfg.pka2c]))
    ph = solve_ph(n_na / v, n_cl / v, acids, cfg.pkw)
    pink = 0.0
    if n_ind > 0:
        pink = ind.fractions(10.0 ** (-ph))[-1] * n_ind / v
    return ph, pink, (n_ind / v if n_ind else 0.0)


def v_eq_ml(s, cfg):
    """Stoichiometric HCl/NaOH equivalence volume of this flask with this titrant."""
    return s["hcl"] * cfg.aliquot_factor * s["pip"] / (s["naoh"] * cfg.titrant_factor)


def v_eq_nominal_ml(s):
    return s["hcl"] * s["pip"] / s["naoh"]


def excess_to_threshold(s, cfg, thr=None, hi=1.0):
    """e*: mL past V_eq where the mixed flask first reaches the threshold (inf if never within hi)."""
    thr = cfg.threshold if thr is None else thr
    ve = v_eq_ml(s, cfg)
    if flask_state(s, cfg, ve)[1] >= thr:
        return 0.0
    if flask_state(s, cfg, ve + hi)[1] < thr:
        return math.inf
    a, b = 0.0, hi
    for _ in range(60):
        m = 0.5 * (a + b)
        if flask_state(s, cfg, ve + m)[1] >= thr:
            b = m
        else:
            a = m
    return b


# ---------------------------------------------------------------- careful run
def careful_run(s, cfg, stream_ul=250, literal=False, offset_ul=None):
    """Spec 7.4: stream to 2.00 mL before equivalence, dropwise to 0.20 mL before,
    half-drops until persistent.

    literal=True: one pour to exactly V_eq-2.00 (float), 36 drops, then half-drops.
    Otherwise integer microlitres: stream in stream_ul steps while the next step
    stays at or before V_eq-2.00; drops (50 uL) while the next stays at or before
    V_eq-0.20; then half-drops (25 uL).
    offset_ul: force the first grid point past V_eq to sit this many uL past it
    (float allowed) by shifting the whole schedule.
    Returns dict with endpoint delivered mL, pink_before_eq flag, additions list.
    """
    ve = v_eq_ml(s, cfg)
    thr = cfg.threshold
    adds = []       # (delivered mL, mode)
    if literal:
        v = ve - 2.0
        adds.append((v, "stream"))
        for i in range(36):
            v = ve - 2.0 + 0.05 * (i + 1)
            adds.append((v, "drop"))
        base = ve - 0.20
        k = 0
        pink_before = any(flask_state(s, cfg, a)[1] >= thr for a, _ in adds if a < ve)
        while True:
            k += 1
            v = base + 0.025 * k
            ph, pink, _ = flask_state(s, cfg, v)
            adds.append((v, "half"))
            if pink >= thr:
                if v < ve - 1e-9:
                    pink_before = True
                return {"end": v, "ve": ve, "pink_before": pink_before, "adds": adds,
                        "ph": ph, "pink": pink}
            if k > 4000:
                return {"end": math.inf, "ve": ve, "pink_before": pink_before, "adds": adds,
                        "ph": ph, "pink": pink}
    shift = 0.0
    if offset_ul is not None:
        # choose a float shift so that some multiple of 25 uL + shift = ve + offset
        shift = ((ve * 1000 + offset_ul) % 25) / 1000.0   # mL, in [0, 0.025)
    ve_ul = (ve - shift) * 1000.0
    d = 0   # delivered, integer uL (plus the constant float shift)
    pink_before = False
    ph = pink = None

    def step(n, mode):
        nonlocal d, pink_before, ph, pink
        d += n
        v = d / 1000.0 + shift
        ph, pink, _ = flask_state(s, cfg, v)
        adds.append((v, mode))
        if pink >= thr:
            if v < ve:
                pink_before = True
            return True
        return False

    while d + stream_ul <= ve_ul - 2000:
        if step(stream_ul, "stream"):
            return {"end": d / 1000 + shift, "ve": ve, "pink_before": pink_before, "adds": adds, "ph": ph, "pink": pink}
    while d + 50 <= ve_ul - 200:
        if step(50, "drop"):
            return {"end": d / 1000 + shift, "ve": ve, "pink_before": pink_before, "adds": adds, "ph": ph, "pink": pink}
    while d < 50000:
        if step(25, "half"):
            return {"end": d / 1000 + shift, "ve": ve, "pink_before": pink_before, "adds": adds, "ph": ph, "pink": pink}
    return {"end": math.inf, "ve": ve, "pink_before": pink_before, "adds": adds, "ph": ph, "pink": pink}


def judge(run, overshoot_ref=None):
    """Spec 7.4 endpoint acceptance for one run. Returns (ok, reason, past)."""
    ve = run["ve"]
    past = run["end"] - ve
    ref = ve if overshoot_ref is None else overshoot_ref
    if run["pink_before"]:
        return False, "pink before V_eq", past
    if past < -1e-9:
        return False, "endpoint before V_eq", past
    if past > 0.05 + 1e-9:
        return False, "later than 0.05 mL", past
    if run["end"] - ref > 0.10 + 1e-9:
        return False, "overshoot flag", past
    return True, "", past
