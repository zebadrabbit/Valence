// The analysis half of the periodic-table cross-check: reads saved copies only
// and returns plain data. cross-check-periodic-table.mjs renders it as the report.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  agreement, decimals, roundDec, parsePubChem, parseCiaawAbridged, parseCiaawFull, parseCiaawRadioactive, parseAme2020,
  parseNubase2020, parseNistIe, parseWikipediaPauling, parseWikipediaVdw, parseConfiguration, shellCounts,
  electronCount, position, parseWikipediaMasterList, parseWikipediaBoiling, kelvinValues, densityValues,
} from './periodic-table-lib.mjs'

const NUMERIC = ['AtomicMass', 'Electronegativity', 'AtomicRadius', 'IonizationEnergy', 'ElectronAffinity', 'MeltingPoint', 'BoilingPoint', 'Density']
const ROOM = 298.15 // K

export function analyse({ pubchemPath, sourcesDir, curatedPath, libraryPath }) {
  const read = (name) => readFileSync(join(sourcesDir, name), 'utf8')
  const pub = parsePubChem(JSON.parse(readFileSync(pubchemPath, 'utf8')))
  const R = { pub }

  // -------------------------------------------------------------------------
  // 0. The download itself
  if (pub.length !== 118 || pub.some((e, i) => Number(e.AtomicNumber) !== i + 1)) throw new Error('PubChem download is not rows 1 to 118')
  const columns = Object.keys(pub[0])
  R.empties = Object.fromEntries(columns.map((c) => [c, pub.filter((e) => e[c] === '').map((e) => e.Symbol)]))
  R.notPlainNumbers = []
  for (const e of pub) for (const c of NUMERIC) if (e[c] !== '' && !/^\d+(\.\d+)?$/.test(e[c])) R.notPlainNumbers.push([e.Symbol, c, e[c]])
  const tally = (key) => {
    const t = {}
    for (const e of pub) t[e[key]] = (t[e[key]] ?? 0) + 1
    return t
  }
  R.states = tally('StandardState')
  R.categories = tally('GroupBlock')
  R.years = { ancient: pub.filter((e) => e.YearDiscovered === 'Ancient').map((e) => e.Symbol), other: pub.filter((e) => !/^(\d{4}|Ancient)$/.test(e.YearDiscovered)).map((e) => [e.Symbol, e.YearDiscovered]) }
  R.cpkOdd = pub.filter((e) => e.CPKHexColor !== '' && !/^[0-9A-F]{6}$/.test(e.CPKHexColor)).map((e) => [e.Symbol, e.CPKHexColor])

  // -------------------------------------------------------------------------
  // 1. Atomic mass against CIAAW
  const ciaaw = parseCiaawAbridged(read('ciaaw-abridged-atomic-weights.html'))
  if (ciaaw.rows.length !== 118) throw new Error(`CIAAW page: expected 118 rows, parsed ${ciaaw.rows.length}`)
  const full = parseCiaawFull(read('ciaaw-atomic-weights.html'))
  if (full.length !== 118) throw new Error(`CIAAW full table: expected 118 rows, parsed ${full.length}`)
  const radioactive = parseCiaawRadioactive(read('ciaaw-radioactive-elements.html'))
  const ame = parseAme2020(read('ame2020-mass_1.mas20.txt'))
  const nubase = parseNubase2020(read('nubase2020-nubase_4.mas20.txt'))
  R.ciaawTitle = ciaaw.title
  R.mass = []
  R.massNoStandard = []
  R.names = []
  for (const e of pub) {
    const z = Number(e.AtomicNumber)
    const c = ciaaw.rows[z - 1]
    if (c.z !== z || c.symbol !== e.Symbol) throw new Error(`CIAAW row ${z} is ${c.symbol}, PubChem has ${e.Symbol}`)
    if (c.name !== e.Name.toLowerCase()) R.names.push({ z, symbol: e.Symbol, pubchem: e.Name, ciaaw: c.name })
    if (c.value) {
      const a = agreement(e.AtomicMass, c.value)
      const diff = Math.abs(Number(e.AtomicMass) - Number(c.value))
      // Tolerate float noise in the difference; the comparison is of published digits.
      const within = diff <= Number(c.uncertainty) * (1 + 1e-9)
      R.mass.push({
        z, symbol: e.Symbol, pubchem: e.AtomicMass, ciaaw: c.value, uncertainty: c.uncertainty, notes: c.notes,
        ...a, lessPrecise: decimals(e.AtomicMass) < decimals(c.value) ? 'PubChem' : decimals(e.AtomicMass) > decimals(c.value) ? 'CIAAW' : 'same',
        diff, withinUncertainty: within,
        full: (() => {
          const f = full[z - 1]
          if (f.value) return { text: f.text, kind: 'value', verdict: agreement(e.AtomicMass, f.value).verdict }
          if (f.low) {
            // PubChem's value is abridged, so the ends are rounded to its digits before testing.
            const d = decimals(e.AtomicMass)
            return { text: f.text, kind: 'interval', inside: Number(e.AtomicMass) >= Number(roundDec(f.low, d).up) && Number(e.AtomicMass) <= Number(roundDec(f.high, d).up) }
          }
          throw new Error(`CIAAW full table has no value for ${e.Symbol} but the abridged table does`)
        })(),
      })
    } else {
      const isotopes = ame.filter((n) => n.z === z)
      const matches = isotopes.filter((n) => roundDec(n.mass, decimals(e.AtomicMass)).up === e.AtomicMass || roundDec(n.mass, decimals(e.AtomicMass)).down === e.AtomicMass)
      const halfLives = nubase.filter((n) => n.z === z && Number.isFinite(n.seconds)).sort((p, q) => q.seconds - p.seconds)
      const nearest = isotopes.map((n) => ({ ...n, d: Math.abs(Number(n.mass) - Number(e.AtomicMass)) })).sort((p, q) => p.d - q.d)[0]
      R.massNoStandard.push({
        z, symbol: e.Symbol, pubchem: e.AtomicMass,
        matches: matches.map((n) => ({ a: n.a, mass: n.mass, estimated: n.estimated, halfLife: nubase.find((h) => h.z === z && h.a === n.a)?.halfLife ?? null })),
        nearest: { a: nearest.a, mass: nearest.mass },
        ciaawMostStable: radioactive.get(z) ?? null,
        // Longest half-lives NUBASE2020 gives from measurement (values from systematics, marked #, left out)
        nubaseLongest: halfLives.filter((h) => !h.systematics).slice(0, 2).map((h) => ({ a: h.a, halfLife: h.halfLife, seconds: h.seconds })),
        isLongestMeasured: (() => {
          const measured = halfLives.filter((h) => !h.systematics)
          if (matches.length !== 1 || !measured.length) return null
          const own = measured.find((h) => h.a === matches[0].a)
          return own ? (own.seconds === measured[0].seconds ? (measured.filter((h) => h.seconds === own.seconds).length > 1 ? 'tied' : 'yes') : 'no') : 'no'
        })(),
      })
    }
  }

  // Elements CIAAW gives a standard atomic weight although NUBASE2020 lists no stable isotope
  R.weightWithoutStableIsotope = R.mass.filter((m) => !nubase.some((n) => n.z === m.z && n.seconds === Infinity)).map((m) => m.symbol)
  R.massNumberByRounding = R.massNoStandard.every((m) => m.matches.length === 1 && Math.round(Number(m.pubchem)) === m.matches[0].a)
  R.coresUsed = [...new Set(pub.map((e) => /^\[(\w+)\]/.exec(e.ElectronConfiguration)?.[1] ?? '(none)'))]

  // -------------------------------------------------------------------------
  // 2. First ionization energy against NIST ASD
  const nist = parseNistIe(read('nist-asd-ie-neutral.txt'))
  if (nist.some((n) => n.charge !== 0)) throw new Error('NIST file holds a row that is not a neutral atom')
  const nistByZ = new Map(nist.map((n) => [n.z, n]))
  R.nistCoverage = { count: nist.length, min: Math.min(...nist.map((n) => n.z)), max: Math.max(...nist.map((n) => n.z)), missing: pub.filter((e) => !nistByZ.has(Number(e.AtomicNumber))).map((e) => e.Symbol) }
  R.nistFlags = nist.filter((n) => n.flag !== 'measured').map((n) => ({ z: n.z, symbol: pub[n.z - 1].Symbol, flag: n.flag, energy: n.energy, uncertainty: n.uncertainty }))
  R.ie = []
  R.ieOnlyNist = []
  R.ieNeither = []
  for (const e of pub) {
    const z = Number(e.AtomicNumber)
    const n = nistByZ.get(z)
    if (e.IonizationEnergy !== '' && n) {
      const a = agreement(e.IonizationEnergy, n.energy)
      R.ie.push({ z, symbol: e.Symbol, pubchem: e.IonizationEnergy, nist: n.energy, nistUncertainty: n.uncertainty, flag: n.flag, ...a, diff: Number(e.IonizationEnergy) - Number(n.energy) })
    } else if (n) R.ieOnlyNist.push({ z, symbol: e.Symbol, nist: n.energy, nistUncertainty: n.uncertainty, flag: n.flag })
    else if (e.IonizationEnergy === '') R.ieNeither.push(e.Symbol)
    else throw new Error(`PubChem has an ionization energy for ${e.Symbol} and NIST does not`)
  }

  // 2b. Ground-state configuration against NIST (same file)
  R.config = []
  for (const e of pub) {
    const z = Number(e.AtomicNumber)
    const row = { z, symbol: e.Symbol, pubchem: e.ElectronConfiguration }
    try {
      const p = parseConfiguration(e.ElectronConfiguration)
      row.suffix = p.suffix
      row.electrons = electronCount(p.subshells)
      row.shells = shellCounts(p.subshells)
      row.spaceAfterCore = /^\[\w+\]\s/.test(e.ElectronConfiguration)
      row.outerOrder = p.outer.map(([k]) => k).join(' ')
      const n = nistByZ.get(z)
      if (n) {
        const q = parseConfiguration(n.groundShells, { separator: '.', impliedOne: true })
        row.nist = n.groundShells
        row.nistShells = shellCounts(q.subshells)
        const keys = new Set([...Object.keys(p.subshells), ...Object.keys(q.subshells)])
        row.differences = [...keys].filter((k) => (p.subshells[k] ?? 0) !== (q.subshells[k] ?? 0)).map((k) => `${k}: PubChem ${p.subshells[k] ?? 0}, NIST ${q.subshells[k] ?? 0}`)
      }
    } catch (error) {
      row.error = error.message
    }
    R.config.push(row)
  }

  // -------------------------------------------------------------------------
  // 3. Pauling electronegativity against the Wikipedia data page
  const wiki = parseWikipediaPauling(read('wikipedia-electronegativities-data-page.wikitext'))
  R.wikiRevisions = JSON.parse(read('wikipedia-revisions.json')).query.pages
  R.en = []
  for (const e of pub) {
    const z = Number(e.AtomicNumber)
    const entries = wiki.get(z) ?? []
    const numeric = (v) => (v && /^\d+(\.\d+)?$/.test(v) ? v : null)
    const use = entries.map((x) => numeric(x.use)).filter(Boolean)
    const perSource = { webElements: numeric(entries[0]?.webElements), crc: numeric(entries[0]?.crc), lange: numeric(entries[0]?.lange) }
    const row = { z, symbol: e.Symbol, pubchem: e.Electronegativity || null, wikipedia: use, perSource, listed: entries.length > 0 }
    if (row.pubchem && use.length === 1) row.verdict = agreement(row.pubchem, use[0]).verdict
    else if (row.pubchem && use.length > 1) row.verdict = 'range'
    else if (row.pubchem && !use.length) row.verdict = Object.values(perSource).some(Boolean) ? 'only-in-a-source-column' : 'only-pubchem'
    else if (!row.pubchem && (use.length || Object.values(perSource).some(Boolean))) row.verdict = 'only-wikipedia'
    else row.verdict = 'neither'
    // Agreement with each of the three transcribed sources, where they differ from the "use" column.
    row.sourceVerdicts = Object.fromEntries(Object.entries(perSource).map(([k, v]) => [k, row.pubchem && v ? agreement(row.pubchem, v).verdict : null]))
    R.en.push(row)
  }

  // -------------------------------------------------------------------------
  // 4. Sanity scan
  const num = (e, c) => (e[c] === '' ? null : Number(e[c]))
  const stateOf = (e) => e.StandardState.replace(/^Expected to be a /, '')

  R.meltAboveBoil = pub.filter((e) => num(e, 'MeltingPoint') !== null && num(e, 'BoilingPoint') !== null && num(e, 'MeltingPoint') >= num(e, 'BoilingPoint')).map((e) => ({ symbol: e.Symbol, mp: e.MeltingPoint, bp: e.BoilingPoint }))
  R.narrowLiquidRange = pub.filter((e) => num(e, 'MeltingPoint') !== null && num(e, 'BoilingPoint') !== null && num(e, 'BoilingPoint') > num(e, 'MeltingPoint') && num(e, 'BoilingPoint') / num(e, 'MeltingPoint') < 1.1 && stateOf(e) !== 'Gas').map((e) => ({ symbol: e.Symbol, mp: e.MeltingPoint, bp: e.BoilingPoint }))

  R.stateCheck = { consistent: 0, contradictions: [], unchecked: [], borderline: [] }
  for (const e of pub) {
    const mp = num(e, 'MeltingPoint')
    const bp = num(e, 'BoilingPoint')
    let implied = null
    if (mp !== null && mp > ROOM) implied = 'Solid'
    else if (bp !== null && bp <= ROOM) implied = 'Gas'
    else if (mp !== null && bp !== null && mp <= ROOM && ROOM < bp) implied = 'Liquid'
    if (implied === null) R.stateCheck.unchecked.push({ symbol: e.Symbol, state: e.StandardState, mp: e.MeltingPoint, bp: e.BoilingPoint })
    else if (implied !== stateOf(e)) R.stateCheck.contradictions.push({ symbol: e.Symbol, state: e.StandardState, implied, mp: e.MeltingPoint, bp: e.BoilingPoint })
    else R.stateCheck.consistent++
    if (mp !== null && Math.abs(mp - ROOM) < 10) R.stateCheck.borderline.push({ symbol: e.Symbol, state: e.StandardState, mp: e.MeltingPoint })
  }
  R.stateNotMarkedExpected = pub.filter((e) => !e.StandardState.startsWith('Expected') && e.MeltingPoint === '' && e.BoilingPoint === '' && e.Density === '').map((e) => e.Symbol)

  // Density: do the gases follow the ideal-gas value at 0 °C and 1 atm, in g/cm³?
  const DIATOMIC = new Set(['H', 'N', 'O', 'F', 'Cl'])
  R.gasDensity = pub.filter((e) => stateOf(e) === 'Gas' && e.Density !== '').map((e) => {
    const molar = Number(e.AtomicMass) * (DIATOMIC.has(e.Symbol) ? 2 : 1)
    const ideal0 = molar / 22.414 // g/L at 273.15 K, 101.325 kPa
    const perLitre = Number(e.Density) * 1000
    return { symbol: e.Symbol, density: e.Density, perLitre, atoms: DIATOMIC.has(e.Symbol) ? 2 : 1, ideal0, ratio0: perLitre / ideal0, ratio25: perLitre / (molar / 24.465) }
  })
  const dens = pub.filter((e) => e.Density !== '').map((e) => ({ symbol: e.Symbol, value: Number(e.Density), text: e.Density, state: stateOf(e) }))
  const condensed = dens.filter((d) => d.state !== 'Gas')
  R.density = {
    min: dens.reduce((a, b) => (a.value < b.value ? a : b)),
    max: dens.reduce((a, b) => (a.value > b.value ? a : b)),
    condensedMin: condensed.reduce((a, b) => (a.value < b.value ? a : b)),
    gasMax: dens.filter((d) => d.state === 'Gas').reduce((a, b) => (a.value > b.value ? a : b)),
    gasCount: dens.filter((d) => d.state === 'Gas').length,
    oneFigure: dens.filter((d) => /^\d{1,2}$/.test(d.text)).map((d) => [d.symbol, d.text]),
  }

  // Radius: against the Wikipedia van der Waals column, and for breaks in the trend.
  const vdw = parseWikipediaVdw(read('wikipedia-atomic-radii-data-page.wikitext'))
  R.radius = { rows: [], periods: {}, jumps: [], groupReversals: [] }
  for (const e of pub) {
    const z = Number(e.AtomicNumber)
    const w = vdw.get(z) ?? []
    const { period, group } = position(z)
    R.radius.rows.push({ z, symbol: e.Symbol, pubchem: e.AtomicRadius || null, wikipedia: w, match: e.AtomicRadius === '' ? null : w.includes(e.AtomicRadius), period, group })
    ;(R.radius.periods[period] ??= []).push(`${e.Symbol} ${e.AtomicRadius || '–'}`)
  }
  for (let i = 1; i < pub.length; i++) {
    const a = R.radius.rows[i - 1]
    const b = R.radius.rows[i]
    if (!a.pubchem || !b.pubchem || a.period !== b.period) continue
    const change = Number(b.pubchem) / Number(a.pubchem) - 1
    if (Math.abs(change) >= 0.12) R.radius.jumps.push({ from: a.symbol, to: b.symbol, a: a.pubchem, b: b.pubchem, change })
  }
  for (const b of R.radius.rows) {
    if (!b.pubchem || b.group === null) continue
    const above = R.radius.rows.filter((a) => a.group === b.group && a.period === b.period - 1 && a.pubchem)[0]
    if (above && Number(b.pubchem) < Number(above.pubchem)) R.radius.groupReversals.push({ group: b.group, upper: above.symbol, upperValue: above.pubchem, lower: b.symbol, lowerValue: b.pubchem })
  }

  // Melting point, boiling point and density against the Wikipedia data pages
  // (each transcribes WebElements, the CRC Handbook and Lange's Handbook). This
  // is a plausibility check: the nearest transcribed value, and how far off it is.
  const meltBlocks = parseWikipediaMasterList(read('wikipedia-melting-points-of-the-elements-data-page.wikitext'))
  const boilBlocks = parseWikipediaBoiling(read('wikipedia-boiling-points-of-the-elements-data-page.wikitext'))
  const densText = read('wikipedia-densities-of-the-elements-data-page.wikitext')
  const cut = (from, to) => densText.slice(densText.indexOf(from), densText.indexOf(to))
  const densBlocks = {
    solid: parseWikipediaMasterList(cut('==Density, solid phase==', '== Density, liquid phase ==')),
    liquid: parseWikipediaMasterList(cut('== Density, liquid phase ==', '== Density, gas phase ==')),
    gas: parseWikipediaMasterList(cut('== Density, gas phase ==', '== Notes ==')),
  }
  const nearest = (value, candidates) => candidates.map((c) => ({ ...c, diff: Math.abs(c.value - value), rel: Math.abs(c.value - value) / value })).sort((a, b) => a.diff - b.diff)[0] ?? null
  const collect = (blocks, z, extract, where) => blocks.filter((b) => b.z === z).flatMap((b) => b.rows.flatMap((r) => extract(r.text).map((value) => ({ value, label: r.label, heading: b.heading, where, text: r.text.replace(/\s+/g, ' ').trim() }))))
  R.quoted = {
    arsenicMelting: meltBlocks.filter((b) => b.z === 33).flatMap((b) => b.rows.map((r) => `${r.label}: ${r.text.replace(/\s+/g, ' ').trim()}`)),
    arsenicBoiling: boilBlocks.filter((b) => b.z === 33).flatMap((b) => b.rows.map((r) => `${r.label}: ${r.text.replace(/\s+/g, ' ').trim()}`)),
    heliumMelting: meltBlocks.filter((b) => b.z === 2).flatMap((b) => b.rows.map((r) => `${r.label}: ${r.text.replace(/\s+/g, ' ').trim()}`)),
    carbonBoiling: boilBlocks.filter((b) => b.z === 6).flatMap((b) => b.rows.map((r) => `${r.label}: ${r.text.replace(/\s+/g, ' ').trim()}`)),
  }
  R.thermal = { MeltingPoint: [], BoilingPoint: [], Density: [] }
  for (const e of pub) {
    const z = Number(e.AtomicNumber)
    for (const [column, candidates, limit] of [
      ['MeltingPoint', collect(meltBlocks, z, kelvinValues, 'melting'), (v) => Math.max(1, v * 0.005)],
      ['BoilingPoint', collect(boilBlocks, z, kelvinValues, 'boiling'), (v) => Math.max(1, v * 0.005)],
      ['Density', [...collect(densBlocks.solid, z, densityValues, 'solid'), ...collect(densBlocks.gas, z, densityValues, 'gas'), ...(stateOf(e) === 'Liquid' ? collect(densBlocks.liquid, z, densityValues, 'liquid') : [])], (v) => v * 0.01],
    ]) {
      if (e[column] === '') { if (candidates.length) R.thermal[column].push({ symbol: e.Symbol, pubchem: null, candidates: candidates.length }); continue }
      const value = Number(e[column])
      const n = nearest(value, candidates)
      R.thermal[column].push({ symbol: e.Symbol, pubchem: e[column], nearest: n, ok: n !== null && n.diff <= limit(value), all: candidates.map((c) => `${c.label} ${c.value}`) })
    }
  }

  // The ends of each trend scale as the download gives them
  R.trendEnds = Object.fromEntries(['Electronegativity', 'AtomicRadius', 'IonizationEnergy', 'MeltingPoint', 'Density'].map((c) => {
    const have = pub.filter((e) => e[c] !== '')
    const by = (pick) => have.reduce((a, b) => (pick(Number(a[c]), Number(b[c])) ? a : b))
    const low = by((x, y) => x <= y)
    const high = by((x, y) => x >= y)
    return [c, { count: have.length, low: [low.Symbol, low[c]], high: [high.Symbol, high[c]], longest: have.reduce((a, b) => (a[c].length >= b[c].length ? a : b))[c] }]
  }))
  R.longestText = Object.fromEntries(columns.map((c) => [c, pub.reduce((a, b) => (a[c].length >= b[c].length ? a : b))[c]]))

  // Oxidation states text
  R.oxidation = { empty: [], onlyZero: [], unsigned: [], spacing: [], other: [], includesZero: [] }
  for (const e of pub) {
    const t = e.OxidationStates
    if (t === '') { R.oxidation.empty.push(e.Symbol); continue }
    const tokens = t.split(',').map((s) => s.trim())
    if (t === '0') R.oxidation.onlyZero.push(e.Symbol)
    if (tokens.some((s) => /^\d+$/.test(s) && s !== '0')) R.oxidation.unsigned.push([e.Symbol, t])
    if (t !== tokens.join(', ')) R.oxidation.spacing.push([e.Symbol, t])
    if (tokens.some((s) => !/^[+-]?\d+$/.test(s))) R.oxidation.other.push([e.Symbol, t])
    if (tokens.includes('0') && t !== '0') R.oxidation.includesZero.push(e.Symbol)
  }

  // Configuration text
  R.configText = {
    suffixes: R.config.filter((c) => c.suffix).map((c) => [c.symbol, c.suffix]),
    spaceAfterCore: R.config.filter((c) => c.spaceAfterCore).map((c) => [c.symbol, c.pubchem]),
    errors: R.config.filter((c) => c.error).map((c) => [c.symbol, c.error]),
    wrongCount: R.config.filter((c) => !c.error && c.electrons !== c.z).map((c) => [c.symbol, c.electrons]),
    // Outer subshells written lowest n first is PubChem's usual order; list the exceptions.
    // PubChem usually writes the outermost s subshell first after the core; list the exceptions.
    sNotFirst: R.config.filter((c) => !c.error && c.outerOrder.split(' ').findIndex((k) => k[1] === 's') > 0).map((c) => [c.symbol, c.pubchem]),
    // ... and usually writes f before d before p; these put p before f and d.
    pBeforeD: R.config.filter((c) => !c.error && /p .*[df]/.test(c.outerOrder.replace(/\d/g, ''))).map((c) => [c.symbol, c.pubchem]),
  }

  // Category table, with the position each element has
  R.categoryRows = pub.map((e) => ({ z: Number(e.AtomicNumber), symbol: e.Symbol, category: e.GroupBlock, ...position(Number(e.AtomicNumber)) }))

  // -------------------------------------------------------------------------
  // 5. Where each table value comes from on PubChem's own element pages
  const pages = JSON.parse(read('pubchem-element-pages-extract.json'))
  const FIELD = {
    IonizationEnergy: { heading: 'Ionization Energy' },
    Electronegativity: { heading: 'Electronegativity', name: 'Pauling Scale Electronegativity' },
    AtomicRadius: { heading: 'Atomic Radius', name: 'Van der Waals Atomic Radius' },
    ElectronAffinity: { heading: 'Electron Affinity' },
    MeltingPoint: { heading: 'Melting Point' },
    BoilingPoint: { heading: 'Boiling Point' },
    Density: { heading: 'Density' },
  }
  R.provenance = {}
  R.qualified = []
  for (const [column, { heading, name }] of Object.entries(FIELD)) {
    const tallyBy = {}
    const unmatched = []
    const absentButOnPage = []
    for (const e of pub) {
      const lines = pages[e.AtomicNumber].lines.filter((l) => l.heading === heading && (!name || l.name === name))
      if (e[column] === '') {
        if (lines.length) absentButOnPage.push({ symbol: e.Symbol, lines: lines.map((l) => `${l.text} (${short(l.source)})`) })
        continue
      }
      // A line matches when its first number equals the table's value.
      const hit = lines
        .map((l) => ({ l, m: /^([^\d-]*?)\[?(-?\d+(?:\.\d+)?)\]?(.*)$/.exec(l.text) }))
        .filter(({ m }) => m && Number(m[2]) === Number(e[column]))[0]
      if (!hit) { unmatched.push({ symbol: e.Symbol, table: e[column], lines: lines.map((l) => `${l.text} (${short(l.source)})`) }); continue }
      const unit = hit.m[3].trim().replace(/\s*\(-?\d.*$/, '').replace(/^±.*?(?=[a-zA-Z])/, '')
      const key = `${short(hit.l.source)} — ${unit || '(no unit)'}`
      tallyBy[key] = (tallyBy[key] ?? 0) + 1
      const prefix = hit.m[1].trim()
      if (prefix || /predict|estimat|extrapolat|approx|about|~/i.test(hit.l.text)) R.qualified.push({ symbol: e.Symbol, column, table: e[column], page: hit.l.text, source: short(hit.l.source) })
    }
    R.provenance[column] = { tally: tallyBy, unmatched, absentButOnPage }
  }
  // The three text columns: which cited line on the element page is the same text?
  const squash = (s) => s.replace(/\s+/g, '')
  const TEXT_FIELD = {
    ElectronConfiguration: { heading: 'Electron Configuration', same: (a, b) => squash(a) === squash(b) },
    OxidationStates: { heading: 'Oxidation States', same: (a, b) => squash(a) === squash(b.replace(/\s*\([^)]*\)\s*$/, '')) },
    StandardState: { heading: 'Physical Description', same: (a, b) => a === b },
  }
  for (const [column, { heading, same }] of Object.entries(TEXT_FIELD)) {
    const tallyBy = {}
    const unmatched = []
    for (const e of pub) {
      if (e[column] === '') continue
      const lines = pages[e.AtomicNumber].lines.filter((l) => l.heading === heading)
      const hit = lines.find((l) => same(e[column], l.text))
      if (!hit) { unmatched.push({ symbol: e.Symbol, table: e[column], lines: lines.map((l) => `${l.text} (${short(l.source)})`) }); continue }
      tallyBy[short(hit.source)] = (tallyBy[short(hit.source)] ?? 0) + 1
      ;(R.textSource ??= {})[`${column}:${e.Symbol}`] = short(hit.source)
    }
    R.provenance[column] = { tally: tallyBy, unmatched, absentButOnPage: [] }
  }
  // The fuller oxidation-state list Los Alamos gives, for the elements the periodic table shows only "0"
  R.oxidationFuller = pub.filter((e) => ['0', '-2', '-1'].includes(e.OxidationStates)).map((e) => ({
    symbol: e.Symbol, table: e.OxidationStates,
    losAlamos: pages[e.AtomicNumber].lines.find((l) => l.heading === 'Oxidation States' && short(l.source) === 'Los Alamos')?.text ?? null,
  }))
  // Electron affinity lines where the table is empty
  R.affinityEmpty = pub.filter((e) => e.ElectronAffinity === '').map((e) => {
    const lines = pages[e.AtomicNumber].lines.filter((l) => l.heading === 'Electron Affinity').map((l) => l.text)
    return { symbol: e.Symbol, lines, first: lines[0] ?? null, second: lines[1] ?? null }
  })

  // Second opinions carried on the same pages
  R.pageNist = []
  R.pageHints = []
  for (const e of pub) {
    const lines = pages[e.AtomicNumber].lines
    for (const l of lines) {
      if ((l.heading === 'Melting Point' || l.heading === 'Boiling Point') && /predict|estimat|extrapolat|sublim|atm|pressure|~|about|\?/i.test(l.text))
        R.pageHints.push({ symbol: e.Symbol, heading: l.heading, text: l.text, source: short(l.source), table: e[l.heading === 'Melting Point' ? 'MeltingPoint' : 'BoilingPoint'] || '(empty)' })
    }
  }
  R.classification = pub.map((e) => {
    const lines = pages[e.AtomicNumber].lines
    return {
      symbol: e.Symbol, category: e.GroupBlock,
      jlab: lines.find((l) => l.heading === 'Element Classification')?.text ?? null,
      groupText: lines.find((l) => l.heading === 'Element Group Number')?.text ?? null,
      periodText: lines.find((l) => l.heading === 'Element Period Number')?.text ?? null,
    }
  })

  // The covalent radius the element pages carry (first number of the line), for comparison with the van der Waals column
  R.covalent = pub.map((e) => {
    const line = pages[e.AtomicNumber].lines.find((l) => l.heading === 'Atomic Radius' && l.name === 'Covalent Atomic Radius')
    return { symbol: e.Symbol, ...position(Number(e.AtomicNumber)), text: line?.text ?? null, value: line ? /^(\d+)/.exec(line.text)?.[1] ?? null : null }
  })

  // What the element pages say about melting and boiling for the elements whose state is marked "Expected"
  R.expectedStates = pub.filter((e) => e.StandardState.startsWith('Expected')).map((e) => ({
    symbol: e.Symbol, state: e.StandardState,
    lines: pages[e.AtomicNumber].lines.filter((l) => l.heading === 'Melting Point' || l.heading === 'Boiling Point').map((l) => `${l.heading.toLowerCase()} ${l.text} (${short(l.source)})`),
  }))

  // PubChem's own unit labels, from the script its periodic table page loads
  const labels = JSON.parse(read('pubchem-ptable-column-labels.json'))
  R.unitLabels = Object.fromEntries(columns.filter((c) => c in labels).map((c) => [c, labels[c]]))

  // -------------------------------------------------------------------------
  // 6. The elements already curated in the app
  const curated = JSON.parse(readFileSync(curatedPath, 'utf8'))
  R.curated = curated.map((c) => {
    const e = pub[c.atomicNumber - 1]
    const n = nistByZ.get(c.atomicNumber)
    const ie1 = String(c.ionizationEnergiesEv.value[0])
    const pShells = shellCounts(parseConfiguration(e.ElectronConfiguration).subshells)
    return {
      symbol: c.symbol,
      mass: { app: c.atomicWeight.published, appSource: c.atomicWeight.sourceId, pubchem: e.AtomicMass, ...agreement(c.atomicWeight.published, e.AtomicMass) },
      en: { app: c.electronegativity?.published ?? null, appSource: c.electronegativity?.sourceId ?? null, pubchem: e.Electronegativity || null, verdict: c.electronegativity && e.Electronegativity ? agreement(c.electronegativity.published, e.Electronegativity).verdict : 'n/a' },
      ie: { app: ie1, appSource: c.ionizationEnergiesEv.sourceId, pubchem: e.IonizationEnergy, ...agreement(ie1, e.IonizationEnergy), nistNow: n.energy, appMatchesNistNow: Number(ie1) === Number(n.energy) },
      vdw: { appAngstrom: c.vdwRadius?.value ?? null, appSource: c.vdwRadius?.sourceId ?? null, appPm: c.vdwRadius ? Math.round(c.vdwRadius.value * 100) : null, pubchemPm: e.AtomicRadius || null },
      covalent: { appPm: c.covalentRadius ? Math.round(c.covalentRadius.value * 100) : null, appSource: c.covalentRadius?.sourceId ?? null, pagePm: R.covalent[c.atomicNumber - 1].value },
      shells: { app: c.shells.value, pubchem: pShells, same: JSON.stringify(c.shells.value) === JSON.stringify(pShells) },
      configuration: { app: c.configuration.value, pubchem: e.ElectronConfiguration },
    }
  })

  // Library molecules per element, for the oxidation-state remark
  R.library = JSON.parse(readFileSync(libraryPath, 'utf8')).map((m) => ({ id: m.id, formula: m.formula }))

  return R
}

function short(source) {
  if (!source) return 'unknown'
  if (source.startsWith('Jefferson')) return 'Jefferson Lab'
  if (source.startsWith('Los Alamos')) return 'Los Alamos'
  if (source.startsWith('NIST')) return 'NIST'
  if (source.startsWith('IUPAC Commission')) return 'CIAAW'
  return source
}
