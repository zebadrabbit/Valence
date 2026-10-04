// Parsers and exact-decimal helpers for the saved periodic-table sources. build-chem-data.mjs uses
// the PubChem, CIAAW and NIST parsers; the cross-check (cross-check-periodic-table.mjs) uses all of it.
// No dependencies; everything reads saved copies, nothing is fetched here.

// ---------------------------------------------------------------------------
// Exact decimal arithmetic on published strings. Floats are never used to
// decide whether two published numbers agree.

export function parseDec(text) {
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(String(text).trim())
  if (!m) throw new Error(`not a plain decimal: ${JSON.stringify(text)}`)
  return { negative: m[1] === '-', digits: BigInt(m[2] + (m[3] ?? '')), scale: (m[3] ?? '').length }
}

export const decimals = (text) => parseDec(text).scale

function format(digits, scale, negative) {
  let s = digits.toString().padStart(scale + 1, '0')
  if (scale > 0) s = s.slice(0, -scale) + '.' + s.slice(-scale)
  return (negative && digits !== 0n ? '-' : '') + s
}

// Rounds a decimal string to `places` decimals. Returns the half-up result, the
// half-down result (they differ only on an exact tie), and whether it was a tie.
export function roundDec(text, places) {
  const p = parseDec(text)
  if (p.scale <= places) {
    const padded = format(p.digits * 10n ** BigInt(places - p.scale), places, p.negative)
    return { up: padded, down: padded, tie: false }
  }
  const factor = 10n ** BigInt(p.scale - places)
  const q = p.digits / factor
  const r = p.digits % factor
  const half = factor / 2n
  const tie = r === half
  const up = r >= half ? q + 1n : q
  const down = r > half ? q + 1n : q
  return { up: format(up, places, p.negative), down: format(down, places, p.negative), tie }
}

// Do two published values agree once the more precise one is rounded to the
// decimals of the less precise one? 'tie' means they agree only under one of
// the two rounding conventions (the dropped digits are exactly 5).
export function agreement(a, b) {
  const places = Math.min(decimals(a), decimals(b))
  const ra = roundDec(a, places)
  const rb = roundDec(b, places)
  if (ra.up === rb.up) return { verdict: 'agree', places, a: ra.up, b: rb.up }
  if (ra.down === rb.down || ra.up === rb.down || ra.down === rb.up)
    return { verdict: 'tie', places, a: ra.up, b: rb.up }
  return { verdict: 'differ', places, a: ra.up, b: rb.up }
}

// ---------------------------------------------------------------------------
// PubChem periodic table download

export function parsePubChem(json) {
  const columns = json.Table.Columns.Column
  return json.Table.Row.map((row) => Object.fromEntries(columns.map((c, i) => [c, row.Cell[i]])))
}

// ---------------------------------------------------------------------------
// CIAAW abridged standard atomic weights (saved HTML page)

const unescape = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&plusmn;/g, '±')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim()

export function parseCiaawAbridged(html) {
  const title = /Abridged Standard Atomic Weights \d{4}/.exec(html)?.[0] ?? null
  const rows = []
  const re = /<tr><td>(\d+)<\/td><td>(\w+)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g
  for (const m of html.matchAll(re)) {
    const text = unescape(m[4])
    const v = /^([\d.]+)\s*±\s*([\d.]+)$/.exec(text)
    rows.push({
      z: Number(m[1]),
      symbol: m[2],
      name: unescape(m[3]),
      text,
      value: v ? v[1] : null,
      uncertainty: v ? v[2] : null,
      notes: unescape(m[5]).split(/\s+/).filter(Boolean),
    })
  }
  return { title, rows }
}

// CIAAW "Radioactive elements" page: most stable known isotopes (from NUBASE2020).
export function parseCiaawRadioactive(html) {
  const out = new Map()
  let z = null
  for (const m of html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
    const cells = [...m[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((c) => unescape(c[1]))
    if (cells.length === 5 && /^\d+$/.test(cells[0])) {
      z = Number(cells[0])
      out.set(z, [{ a: Number(cells[3]), halfLife: cells[4] }])
    } else if (cells.length === 2 && z !== null && /^\d+$/.test(cells[0])) {
      out.get(z).push({ a: Number(cells[0]), halfLife: cells[1] })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// NIST ASD ground states and ionization energies (tab-delimited response)

export function parseNistIe(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const f = line.split('\t').map((c) => c.replace(/^"|"$/g, ''))
    if (!/^\d+$/.test(f[0])) continue
    const flag = f[9] === '(' ? 'theoretical' : f[9] === '[' ? 'semi-empirical' : 'measured'
    rows.push({
      z: Number(f[0]), spectrum: f[1], charge: Number(f[2]), name: f[3],
      groundShells: f[5], groundLevel: f[7], energy: f[10], flag, uncertainty: f[12], references: f[13],
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Electron configurations

const CORES = {
  He: { '1s': 2 },
  Ne: { '1s': 2, '2s': 2, '2p': 6 },
  Ar: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6 },
  Kr: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '3d': 10, '4s': 2, '4p': 6 },
  Cd: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '3d': 10, '4s': 2, '4p': 6, '4d': 10, '5s': 2 },
  Xe: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '3d': 10, '4s': 2, '4p': 6, '4d': 10, '5s': 2, '5p': 6 },
  Hg: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '3d': 10, '4s': 2, '4p': 6, '4d': 10, '5s': 2, '5p': 6, '4f': 14, '5d': 10, '6s': 2 },
  Rn: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '3d': 10, '4s': 2, '4p': 6, '4d': 10, '5s': 2, '5p': 6, '4f': 14, '5d': 10, '6s': 2, '6p': 6 },
}

// Returns { subshells: {'1s': 2, ...}, core, outer: [['4s', 2], ...], suffix } or throws.
export function parseConfiguration(text, { separator = /\s+/, impliedOne = false } = {}) {
  const suffix = /\(([a-z]+)\)\s*$/.exec(text)?.[1] ?? null
  let rest = text.replace(/\([a-z]+\)\s*$/, '').trim()
  const subshells = {}
  let core = null
  const c = /^\[(\w+)\][.\s]*/.exec(rest)
  if (c) {
    core = c[1]
    if (!CORES[core]) throw new Error(`unknown core [${core}] in ${text}`)
    Object.assign(subshells, CORES[core])
    rest = rest.slice(c[0].length)
  }
  const outer = []
  for (const token of rest.split(separator).filter(Boolean)) {
    const m = /^(\d)([spdf])(\d*)$/.exec(token)
    if (!m || (m[3] === '' && !impliedOne)) throw new Error(`bad subshell ${JSON.stringify(token)} in ${text}`)
    const n = m[3] === '' ? 1 : Number(m[3])
    const key = m[1] + m[2]
    if (key in subshells) throw new Error(`subshell ${key} given twice in ${text}`)
    subshells[key] = n
    outer.push([key, n])
  }
  return { subshells, core, outer, suffix }
}

export function shellCounts(subshells) {
  const shells = []
  for (const [key, n] of Object.entries(subshells)) {
    const i = Number(key[0]) - 1
    shells[i] = (shells[i] ?? 0) + n
  }
  return Array.from(shells, (v) => v ?? 0)
}

export const electronCount = (subshells) => Object.values(subshells).reduce((a, b) => a + b, 0)

// ---------------------------------------------------------------------------
// Position by atomic number, for the sanity scan only (the app's own
// elementPosition is specified separately in the plan).

const NOBLE = [0, 2, 10, 18, 36, 54, 86, 118]
export function position(z) {
  const period = NOBLE.findIndex((n) => z <= n)
  const offset = z - NOBLE[period - 1]
  if (period === 1) return { period, group: z === 1 ? 1 : 18 }
  if (period <= 3) return { period, group: offset <= 2 ? offset : offset + 10 }
  if (period <= 5) return { period, group: offset }
  if (offset <= 2) return { period, group: offset }
  if (offset <= 17) return { period, group: null } // La–Lu, Ac–Lr drawn as the detached rows
  return { period, group: offset - 14 }
}
