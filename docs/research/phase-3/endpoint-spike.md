# Titration endpoint: feasibility spike

2026-10-04. The v1 spec (section 7.3) makes proving the endpoint acceptance test the first task of the titration phase. This is the record of that proof: a throwaway TypeScript model (`spike/`), its outputs (`spike/out/`), and an independent Python re-implementation that reproduced its numbers (`spike/verify/`). The code here is a spike, not app code; the engine is written test-first in the phase 3 plan.

Where the independent check corrects the first spike, the correction stands.

```
SPIKE verdict: passes-with-co2
Verdict: the 7.4 endpoint test passes with cited constants and dissolved CO2 in the flask. Keep CO2 in the model.

With two-step phenolphthalein (pK 9.05/9.50), 0.5% w/v indicator, 0.05 mL drops, CO2 at air equilibrium and faintPinkConcentration 3e-6 M, seeds 1-100 pass 100/100 at 2 drops and 100/100 at 3 drops for five stream layouts. No run is pink before equivalence or flagged overshoot; the endpoint lands 0.016 to 0.042 mL past V_eq (first or second half-drop). It passes for any grid offset: the excess needed to reach threshold is at most 0.0192 mL (limit 0.025), also at every corner of the seeded ranges. Without CO2 it passes too (0.0153 mL). One threshold serves 2 and 3 drops: anything from 5e-12 to 5.2e-6 M. I recommend 1e-6 M (more headroom, works for 0.1% to 1% indicator and 1 to 4 drops, nearer a real faint pink); 3e-6 M also passes. Solver spot values, titration curve, grading and the three technique errors all check out; a careful run always passes (worst -0.56% to +0.32%).

The phase 3 plan must:
- model a closed flask with carbonate-free titrant (carbonate at 0.05% of NaOH molarity already fails);
- judge overshoot against the flask's actual equivalence volume, or an unconditioned burette reads "overshot" in 200/200 runs;
- reword the distilled-water acceptance: dilution moves the endpoint one half-drop in 3 to 39 of 200 runs for 5 to 25 mL of water, so "changes it by 0" cannot hold;
- pin Kw = 1.0e-14 in the solver spot test (cited pKw 13.99 gives 6.97, not 6.98, for 1e-8 M HCl);
- hold volumes as integer microlitres;
- drive "dark pink" from the overshoot flag, since a careful endpoint already reaches up to 64% of the overshoot-line colour.

Not delivered: report.md was not written. The harness refused a report file from this subagent, so the findings are in this output; code and raw outputs are in the spike folder (model.ts, out/*.txt). The spec's CRC Handbook sources were unreachable; substitutes are listed. During the run three tracked files showed as modified in git status (the spec, eslint.config.js, src/lint-rules.test.ts); this spike did not touch them.
FILE: spike/out/endpoint.txt
CONSTANTS:
- Phenolphthalein acid constants (two-step, recommended): pK1 = 9.05, pK2 = 9.50; only the doubly deprotonated form In2- is red; pink fraction = K1K2/(h^2 + K1 h + K1K2) [Medium-high. Primary spectrophotometric ] Tamura, Abe, Ito, Maeda, Analytical Sciences 12, 927-930 (1996), doi 10.2116/analsci.12.927; full PDF read fro
- Phenolphthalein single quoted pKa (one-step alternative): 9.7 at 25 C [Medium. Secondary transcription; one num] PubChem CID 4764, Dissociation Constants (PUG View), transcribing the Merck Index 13th ed. p. 1300 via HSDB
- Phenolphthalein colour-change range: pH 8.2 (colourless) to 10.0 (red) [High] British Pharmacopoeia 2012, Appendix I A, Phenolphthalein Solution (mirror: https://drugfuture.com/Pharmacopoe
- Phenolphthalein molar mass: 318.3 g/mol (C20H14O4) [High] PubChem PUG REST, CID 4764, MolecularWeight
- Indicator solution strength: 0.5% w/v in 50:50 ethanol:water = 0.01571 mol/L (7.85e-7 mol per 0.05 mL drop). Alternatives in real use: 0.1% (British Pharmacopoeia: 0.1 g in 80 mL alcohol, to 100 mL) = 0.00314 mol/L; 1% (USP Phenolphthalein TS as sold) = 0.0314 mol/L [Medium. All three strengths are used; no] 0.5%: Atom Scientific product page (atomscientific.co.uk, 0.5% in 50:50 ethanol:water) and sciencenotes.org re
- Drop volume: 0.05 mL (20 drops per mL) [Medium. A 50% ethanol drop is smaller in] Wikipedia, Drop (unit): pharmacists round a drop to exactly 0.05 mL
- Henry's law constant, CO2 in water at 298.15 K: 0.034 mol/(kg bar) [High] NIST Chemistry WebBook, CO2, Henry's Law data (https://webbook.nist.gov/cgi/cbook.cgi?ID=C124389&Mask=10): 11 
- Atmospheric CO2 mole fraction: 425.62 ppm in dry air (global annual mean 2025); Mauna Loa 2025 is 427.35 ppm [High for outdoor air; indoor air is comm] NOAA GML, https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_gl.txt (file created 2026-09-05)
- Dissolved CO2 at air equilibrium (derived): 1.466e-5 mol/L = 0.034 x 425.62e-6 x 1.01325 bar; 3.7e-7 mol in a 25 mL aliquot [High] Derived from the two constants above; kg of water treated as L, no water-vapour correction (about 3%)
- Carbonic acid constants: pKa1 = 6.35 (apparent: dissolved CO2 and H2CO3 counted together), pKa2 = 10.33 [High for the values; read through a tran] Wikipedia Carbonic acid infobox, citing Perrin, Ionisation Constants of Inorganic Acids and Bases in Aqueous S
- Kw at 25 C: pKw = 13.99 (Kw = 1.02e-14) [High. Endpoint result is insensitive: pK] IAPWS R11-24 (2024), Table 3, https://iapws.org/documents/release/Ionization.download. The release's equation 
- Molar absorptivity of the red form (used only to sanity-check the threshold): 37,500 L/(mol cm) at 552.8 nm (absorbance 0.375 for 1e-5 M in a 1 cm cell) [Medium. Read from the paper's assumed fu] Tamura et al. 1996, Fig. 2 and Fig. 4
- faintPinkConcentration (model parameter, the only tunable): Recommended 1e-6 M; spec starting value 3e-6 M also passes. Passing range for 2 and 3 drops with 0.5% indicator and CO2: above 5.1e-12 M, up to 5.2e-6 M [High that the range is right for this mo] This spike (out/endpoint.txt section C, out/extras.txt)
PLAN INPUTS:
- Result at the spec's values: two-step indicator, 0.5% w/v, CO2 1x, threshold 3e-6 M: 100/100 seeds pass at 2 drops and 100/100 at 3 drops for stream layouts of one exact pour, 0.10, 0.25, 0.50 and 0.37 mL steps. Endpoint lands 0.0163 to 0.0423 mL past V_eq; on the first addition past V_eq in about 27% of runs, the second in 73%, never the third.
- Offset rule: let e* be the excess titrant past V_eq at which the mixed flask reaches threshold. The endpoint always lands between e* and e* + 0.025 mL, so the test passes for every grid offset exactly when 0 < e* <= 0.025 mL. Add this as an offset-proof engine test beside the seed test, evaluated at the corners of the seeded box (HCl 0.085/0.105, NaOH 0.095/0.105, pipette 24.97/25.03).
- e* at 3e-6 M, 0.5%, CO2 1x: 2 drops 0.0150 to 0.0179 mL over seeds (0.0184 at box corners); 3 drops 0.0159 to 0.0188 (0.0192 at corners). Without CO2: 0.0144 and 0.0153 worst. At 1e-6 M: 0.0116 and 0.0123 worst.
- Threshold ceilings (mol/L), two-step, CO2 1x: 0.5% indicator: 1 drop 4.52e-6, 2 drops 5.49e-6, 3 drops 5.21e-6, 4 drops 4.71e-6. 1% indicator: 2 and 3 drops 3.81e-6, 1 to 4 drops 3.15e-6. 0.1% indicator: 2 and 3 drops 2.38e-6, 1 to 4 drops 1.29e-6. Floor is never binding: 5.1e-12 M with CO2, 2.6e-10 M without.
- CO2 multiples, 0.5% indicator, ceiling for 2 and 3 drops: none 6.99e-6; 1x 5.21e-6; 2x 3.64e-6; 3x 2.30e-6; 5x 4.8e-7; 10x effectively none. So 3e-6 M passes to 2x and 1e-6 M passes to 3x.
- CO2 handling to implement: closed flask. Carbon moles = 1.466e-5 mol/L x the pipette's delivered volume, fixed for the trial and diluted by titrant. If written instead as concentration x whole flask volume it still passes at 3e-6 M but only just (worst e* 0.0236 mL).
- Titrant must be carbonate-free in the model. Carbonate equal to 0.05% of the NaOH molarity gives worst e* 0.033 mL (fail); 0.5% gives 0.16 mL; 1% gives 0.31 mL. A flask held at full air equilibrium would need about 3 mL more titrant. CO2 uptake by NaOH stays primer text only.
- With the British Pharmacopoeia 0.1% indicator at 3e-6 M, 2 drops fail: 5 of 100 seeds land at 0.050 to 0.0535 mL (worst e* 0.0324 mL). At 1e-6 M all of 0.1%, 0.5%, 1% pass at 1, 2, 3 and 4 drops.
- Overshoot, the before-equivalence checks and the Guided slow-down hint must use the flask's own equivalence volume: acid moles actually in the flask divided by titrant concentration actually in the burette. Judged against the seeded value, the unconditioned-burette trial is flagged overshoot in 200/200 runs (true equivalence is 0.41 to 0.55 mL later); judged against the actual flask, 0/200.
- Distilled water: the equivalence volume is unchanged but the careful endpoint moves by one half-drop (0.025 mL, at most 0.14% in molarity) in 3/200 runs for 5 mL, 11/200 for 10 mL, 39/200 for 25 mL, 99/200 for 50 mL (threshold 3e-6 M, CO2-free water); at 1e-6 M: 4, 8, 27, 44. Never changes pass or fail; up to 100 mL never triggers overshoot. The 7.4 line 'changes it by 0' cannot be met as written.
- Grading: careful run with honest readings (true meniscus rounded to 0.01 mL) errs -0.315% to +0.059% over 600 runs (seeds 1-100, trials 1-3, 2 and 3 drops); with both readings at the edge of the 0.02 mL tolerance -0.433% to +0.197%. Bound over the whole seeded box with a full 0.05 mL late endpoint, 0.03 mL pipette offset and 0.04 mL titre misread: -0.56% to +0.32%. A careful run always passes.
- Technique errors alone, 200 runs each: unconditioned burette (titrant x0.98) shifts molarity -2.10% to -1.88%; tip bubble 0.60 mL shifts -2.85% to -2.18%; unrinsed pipette (aliquot x0.98) shifts +1.92% to +2.13%. Each exceeds 1.5% at every seed and still fails grading even if both readings are pushed 0.02 mL toward passing (-1.81%, -2.12%, +1.60%). The spec's magnitudes are sufficient.
- Solver: one charge-balance function, bisection on pH over [-2, 16], 60 steps; spectator ions as one signed concentration; each acid as total concentration, pKa list and charge of the fully protonated form; Kw passed as an argument. Matches independent Newton or closed-form solutions to 1e-15 pH: 0.0100 M HCl 2.0000; 1e-8 M HCl 6.9783; 0.10 M acetic acid (pKa 4.756) 2.8809; acetate buffer 4.7562; 0.10 M H3PO4 (2.148/7.198/12.375) 1.6317.
- Solver spot test must pin Kw = 1.0e-14: with the cited pKw 13.99 the 1e-8 M HCl answer is 6.9735, which prints as 6.97, not the spec's 6.98. Titration curve: worst difference from the closed form 1.8e-15 pH over 17,649 points; pH 7.00 crossing within 1e-6 mL of stoichiometric. Compute the closed-form reference on the basic side from the hydroxide root, or it loses 5e-6 pH to cancellation.
- Hold delivered volume as integer microlitres (half-drop 25, drop 50, burette resolution 1). The literal careful run (one pour to exactly V_eq - 2.00) puts the grid exactly on V_eq and is fragile in floating point; define the stream as fixed chunks. Any chunk size passes, including ones off the 0.025 mL grid.
- Round the seeded HCl molarity to four decimals and use the rounded number as the true value, so the label is exact. V_eq spans 20.21 to 27.67 mL; with a late endpoint the titre can reach 27.71 mL, slightly over the spec's stated 27.7.
- Endpoint colour: at 3e-6 M a careful endpoint shows 3.3e-6 to 1.5e-5 M pink at 2 drops (pH 8.9 to 9.5, 10% to 45% of the indicator) and up to 1.7e-5 M at 3 drops. At V_eq + 0.10 mL (overshoot line) it is at least 2.35e-5 M (2 drops) or 3.33e-5 M (3 drops); total indicator is 3.3e-5 M (2 drops) or 4.9e-5 M (3 drops), so colour saturates. A careful endpoint is up to 64% of the overshoot-line colour: the 'dark pink, overshot' look must come from the
- Plume proposal: fraction = moles of NaOH in the last drop of the addition (min of the addition and 0.05 mL) divided by moles of excess strong acid in the flask before it, capped at 1 (1 at or past equivalence). Status: 'pink persists' when the mixed flask is at or above threshold (same test as the endpoint); else 'pink fades slowly' when fraction >= 0.10; else 'pink fades at once'. Fade time = fraction x 10 simulated seconds. Intensity = total in
- Plume along a careful run (seed 1): stream 0.003 to 0.023 (at once); dropwise 0.071 at 0.65 mL to go (at once), 0.111 at 0.40 mL (slowly), 0.198 at 0.20 mL; half-drops 0.124 at 0.18 mL, 0.324 at 0.05 mL, 0.919 at 0.002 mL (9.2 s fade), then persists. Over 200 runs: 'fades slowly' first appears with 0.45 to 0.50 mL to go, on 5 dropwise and 8 to 10 half-drop additions; status never steps backwards after the stream; 'persists' appears only at the en
- Mixed-flask pH around equivalence (seed 1, 2 drops, CO2 1x): 2.41 at 2 mL before; 3.43 at 0.2 mL before; 4.33 at 0.025 mL before; 5.80 at V_eq; 8.51 at +0.010 mL; 8.98 at +0.020; 9.13 at +0.025; 9.61 at +0.05; 10.08 at +0.10.
- Spec text that needs editing if the recommendations are taken: 7.3 'a weak acid' and 'the indicator's pKa' (two constants, two steps); 5.2 source rows for pKa, Kw and Henry's constant (CRC was not the source read); 7.3 threshold starting value; 7.4 distilled-water line; 7.3 'past the true equivalence volume' (say whose equivalence).
- Spike code and outputs: spike/model.ts (solver, flask, careful run, judge, plume), rng.ts (unchanged copy of src/engine/rng.ts), check-solver.ts, endpoint.ts (about 4 minutes), grading.ts, plume.ts, extras.ts, dropsize.ts, wholeflask.ts, iapws.ts; outputs in out/*.txt; fetched sources in sources/. Run with node --experimental-strip-types on Node 24.21, no dependencies.
- The spike's seed draw order (HCl, NaOH, then pipette offset and burette level per trial) is its own; the engine's seeds 1 to 100 will be different trials. The box-corner results are what carry over.
OWNER DECISIONS:
- Which indicator solution the app models. Options: 0.5% w/v in 50:50 ethanol:water (common teaching stock), 1% in alcohol (USP), 0.1% (British and European Pharmacopoeia). Recommendation: 0.5%, or whatever your own lab stocks if you would rather match it. 0.5% and 1% pass at 3e-6 M; 0.1% needs a threshold of 2.3e-6 M or lower.
- faintPinkConcentration: keep 3e-6 M or lower it to 1e-6 M. Recommendation: 1e-6 M. It doubles the headroom (worst excess 0.012 mL instead of 0.019 against a 0.025 limit), passes for every indicator strength and 1 to 4 drops, tolerates three times the CO2, and is closer to a real faint pink (the pharmacopoeia's sensitivity test corresponds to about 1.4e-6 M). 3e-6 M passes, so nothing breaks if it stays.
- Treat phenolphthalein as a two-step acid (pK 9.05 and 9.50, only the doubly deprotonated form pink, Tamura 1996) instead of one pKa. Recommendation: two-step. It is the primary source and matches the real chemistry at the faint-pink onset; the test passes either way. This changes the wording of spec 7.3 and the source row in 5.2.
- Sources for Henry's constant, Kw and the indicator pKa. Spec 5.2 names the CRC Handbook, which I could not read (paywalled). Recommendation: cite what was actually read (NIST WebBook / Sander for Henry's constant, IAPWS R11-24 for Kw, Tamura 1996 for phenolphthalein, Perrin 1982 as transcribed for carbonic acid) and update 5.2, unless you have CRC access and want to confirm the same numbers there.
- Distilled-water acceptance line in 7.4 ('changes it by 0'). It cannot hold exactly while colour depends on concentration: dilution moves the endpoint by one half-drop in a minority of runs. Recommendation: reword to 'the equivalence volume and the expected answer do not change; the calculated molarity moves by at most one half-drop (0.025 mL) and a careful run still passes', and keep each water addition small (about 10 mL).
- Which year of atmospheric CO2 to pin. Recommendation: NOAA global annual mean for 2025, 425.62 ppm, with the year stated in the source entry. The result does not depend on it up to twice that value.
- Plume feel: 'fades slowly' from a plume fraction of 0.10 (about the last 0.5 mL dropwise) and a 10 second full-mix time. Recommendation: start with these and adjust by eye in the running app; they are presentation parameters and do not affect grading or the endpoint.
UNVERIFIED:
- report.md was not written: the harness refused a report file from this subagent. The file path returned is the main raw output (out/endpoint.txt); the findings are in this structured output only.
- CRC Handbook values named in spec 5.2 (pKa, Kw, Henry's constant): not fetched, paywalled.
- Merck Index pKa 9.7 was read only through PubChem's transcription; Perrin 1982 carbonic acid values only through Wikipedia's transcription.
- USP text for Phenolphthalein TS (1%) was not read; the figure comes from supplier listings. No handbook or pharmacopoeia line was found for the 0.5% strength, only a supplier page and a general chemistry site.
- The real volume of a drop of 50% ethanol indicator from a dropper. 0.05 mL is the conventional figure; the test was checked down to 0.02 mL and still passes.
- Tamura's pK values at zero ionic strength; they were measured in 0.2 M phosphate buffer at 25 +/- 2 C and are applied here without activity correction.
- What pink concentration a person actually perceives as faint in a flask. The 1e-6 M recommendation rests on a Beer-Lambert estimate with an assumed 2 to 7 cm path and on the pharmacopoeia sensitivity test, not on a measu
- Water density at 25 C (0.99705 g/cm3) used to evaluate the IAPWS equation, and the acetic and phosphoric pKa values pinned in the solver check, were from memory. They do not feed the endpoint result.
- Nothing was run in the app or under Vitest; the engine and its seed draw order do not exist yet, so 'seeds 1 to 100' here are the spike's own trials.
- Not modelled and so not tested: CO2 uptake from air during the run (the real cause of a fading endpoint), slow fading of phenolphthalein above pH 12, activity corrections, temperatures other than 25 C, the ethanol in the
- Plume thresholds and fade time are proposals; no learner or UI check was done.
- Three tracked files showed as modified in git status partway through (docs/superpowers/specs/2026-10-03-valence-v1-design.md, eslint.config.js, src/lint-rules.test.ts, a lint-rule change about network APIs). This spike d

VERIFY agrees=true verdict=passes-with-co2
My independent Python model reproduces the first spike's verdict and its key numbers to the digits it printed: the 7.4 endpoint test passes with cited constants and dissolved CO2 in the flask. Keep CO2 in the model, and set `faintPinkConcentration` to 1e-6 M, not 3e-6 M.

**Endpoint test (seeds 1-100, two-step indicator 9.05/9.50, 0.5% indicator, 0.05 mL drops)**

| Case | 2 drops | 3 drops | Lands past V_eq (mL) | Worst excess needed (limit 0.025 mL) |
|---|---|---|---|---|
| CO2, threshold 3e-6 M | 100/100 | 100/100 | 0.016 to 0.042 | 0.0192 |
| No CO2, threshold 3e-6 M | 100/100 | 100/100 | 0.012 to 0.039 | 0.0153 |
| CO2, threshold 1e-6 M | 100/100 | 100/100 | 0.010 to 0.036 | 0.0123 |

- **Layouts:** all five stream layouts pass; no run is pink before equivalence or flagged overshoot.
- **Where it lands:** first or second half-drop past equivalence, 27/73 at 2 drops and 26/74 at 3 drops, the same split as the first spike.
- **Threshold range:** one threshold serves 2 and 3 drops anywhere from 5.1e-12 to 5.2e-6 M with CO2 (2.6e-10 to 7.0e-6 M without).
- **1e-6 M:** passes for 0.1% to 1% indicator and 1 to 4 drops.
- **Seeds:** I used the same mulberry32 generator and draw order as the first spike, so seed 1 gives the same flask (V_eq 25.6522 mL).

**Why 1e-6 M and not 3e-6 M**

3e-6 M passes only narrowly. It fails at:
- CO2 at 3 times outdoor air, which is ordinary indoor air;
- 25 mL of added water;
- 1 or 2 drops of 0.1% indicator;
- my rough estimate of the indicator constants at zero ionic strength.

1e-6 M passes all four. It is also closer to what a pharmacopoeia calls pink: the British Pharmacopoeia sensitivity test, run through the model, gives 1.4e-6 M.

**Solver, grading and technique errors**

- **Solver:** all five spot values and the titration curve pass.
- **Careful run:** always grades as a pass. Honest readings give -0.32% to +0.06%; the bound over the whole seeded range with 0.02 mL misreads is -0.56% to +0.32%.
- **Technique errors:** each moves the molarity the stated way by more than 1.5%.
  - Unconditioned burette: -2.10% to -1.88%.
  - Tip bubble: -2.85% to -2.18%.
  - Unrinsed pipette: +1.92% to +2.13%.
- **Overshoot:** an unconditioned burette is flagged "overshot" in 200/200 runs if judged against the nominal equivalence volume, and 0/200 against the flask's own.
- **Distilled water:** moves the endpoint by one half-drop in 3, 11 and 39 of 200 runs for 5, 10 and 25 mL.

**Constants**

I re-downloaded every cited source and all the quoted values are there. One is the wrong kind: the Kw figure is on the per-kilogram scale, and the model works per litre (see corrections). The others are the right kind:
- Henry's constant is in mol/(kg bar) and is multiplied by a pressure in bar.
- The carbonic acid 6.35 is the apparent constant for dissolved CO2, which is the species the model holds. Using 3.75 by mistake would change the result by 0.00001 mL.
- The indicator 9.7 and the 9.05/9.50 pair describe the same colourless-to-pink change, not the fading above pH 12.

**Chemistry judgement**

- **Indicator model:** treating phenolphthalein as a weak acid whose pink form's concentration is the colour signal is a sound teaching model. The two-step version is the better one: it matches the primary paper, and it predicts Merck's absorptivity specification (741 against 700-750), where a single pKa of 9.7 gives 657. A single pKa is still defensible and also passes.
- **Closed flask:** reasonable. A flask does not re-equilibrate with air during a few minutes of titration. What the model leaves out is the slow fading of the pink afterwards, which is why real procedures say "persists 30 seconds".
- **Boiled or unboiled water:** the model is right that it barely matters at 0.1 M. The CO2 in the aliquot is worth 0.004 mL of titrant, below the burette's reading resolution.
- **Threshold visibility:** with a molar absorptivity of 35,000 to 38,000 L/(mol cm), 1e-6 M gives an absorbance of 0.04 to 0.19 through 1 to 5 cm, a faint but definite pink. 3e-6 M gives 0.11 to 0.56, a clear light pink.

Files are in spike/verify/:
- src/model.py
- out/endpoint_A_B.txt
- out/endpoint_C_G.txt
- out/checks.txt
- out/carbonate.txt
CORRECTIONS:
- Kw at 25 C: pKw = 13.99 (Kw = 1.02e-14), with the advice to pin Kw = 1.0e-14 only in the solver spot test because the cited value gives pH 6.97 for 1e-8 M HCl -> Store Kw = 1.0e-14 (pKw 14.00, mol/L basis) as the app's constant, citing IAPWS R11-24 with the conversion noted. The unrounded IAPWS value is 13.994 on the mol/kg scale; on the mol/L scale the model uses it is 13.997 (Kw = 1.007e-14). The spec's 6.98 then holds with the cited constant and the test needs no separate pin.
- faintPinkConcentration starting value: Recommended 1e-6 M; "3e-6 M also passes" -> Use 1e-6 M and change the spec's starting value. 3e-6 M passes only at the exact base case and should not be offered as an equal alternative.
- List of changes the phase 3 plan must make: Six items; none about the spec's wording on the indicator or its sources -> Add: amend spec 7.3, which says "the indicator's pKa" (one value), to the two-step model (pK 9.05 and 9.50, only the doubly deprotonated form is pink). Amend spec 5.2, which names the CRC Handbook or IUPAC compilations for pKa, Kw and Henry's constant, to the sources actually used (Tamura 1996, IAPWS R11-24, NIST WebBook/Sander, NOAA, Perrin 1982 v
- Titrant carbonate claim: "carbonate at 0.05% of NaOH molarity already fails" -> True only under one convention: the titrant's sodium stays at the seeded molarity, some hydroxide has become carbonate, and V_eq is still computed from the seeded molarity. What breaks is the definition of the "true" NaOH concentration, not the endpoint chemistry. A carbonated titrant is weaker at a phenolphthalein endpoint by the carbonate fractio
- Source for the 0.5% indicator strength: Atom Scientific product page and a sciencenotes.org recipe; "no handbook line was found" -> Cite a major reagent catalogue: Sigma-Aldrich 319236 (0.5 wt.% in ethanol:water 1:1) or Ricca (0.5% w/v in 50% v/v alcohol). Sigma's is weight percent; in a liquid of about 0.93 g/mL that is roughly 7% less phenolphthalein per drop than 0.5% w/v. The test passes either way.
- Molar absorptivity of the pink form: 37,500 L/(mol cm) at 552.8 nm, confidence medium, from Tamura's assumed full-colour absorbance -> Same value, with an independent cross-check that raises confidence: 35,000 to 38,000 L/(mol cm).
- Acceptance test on a "literal" careful run: Literal layout (one pour to exactly V_eq - 2.00) reported as landing at exactly 0.0250 mL past in every run -> Write the acceptance test on the integer-microlitre grid only. In the literal layout the eighth half-drop lands exactly on V_eq, so whether it counts as "before equivalence" is decided by floating-point rounding.
VERIFY UNVERIFIED:
- Merck's absorptivity specification (700-750 at pH 9.8), the Sigma-Aldrich and Ricca 0.5% listings, the USP 1% test solution, and the 6.352/10.329 carbonic acid values on a second site were seen only as search-result summ
- The CRC Handbook, the Merck Index and Perrin 1982 were not read directly. The 9.7 pKa is PubChem's transcription; the carbonic acid values are Wikipedia's transcription of Perrin.
- Water density at 25 C (0.997047 g/cm3), used to convert Kw from the per-kilogram to the per-litre scale, is from memory.
- Phenolphthalein's constants at the flask's ionic strength. Tamura measured in 0.2 M phosphate buffer (ionic strength about 0.5). My figures for lower ionic strength (9.10/9.65 at 0.05, 9.18/9.90 at zero) come from a roug
- What concentration a person actually sees as faint pink. The 1e-6 M judgement rests on Beer-Lambert arithmetic with an assumed 1 to 5 cm path and on the pharmacopoeia sensitivity test, not on a measurement.
- The 0.05 mL drop: confirmed only in the same Wikipedia article; no second source was fetched. A drop of 50% ethanol is smaller in reality; the test still passes at 0.03 and 0.02 mL.
- Atmospheric CO2 (425.62 ppm) was checked against NOAA's own Mauna Loa series (427.35 ppm), not against a non-NOAA source.
- The first spike's plume thresholds and fade times were not rechecked.
- Nothing was run in the app or under Vitest; the engine does not exist yet. I matched the first spike's seed draw order (HCl, NaOH, then pipette and burette per trial) by looking at the few lines of its model.ts that draw
- Not modelled: CO2 uptake from air during or after the titration (the fading endpoint), activity corrections, temperatures other than 25 C, the ethanol in the indicator drops.
- out/endpoint_A_B.txt stops at the first line of section C because I stopped that slow run; section C onward is in out/endpoint_C_G.txt, produced by a faster script using the same model.
- Tracked files under src/app/ and docs/ showed as modified in git status during my run, a different set at two checks. I did not touch any tracked file and did not establish what changed them.
```
