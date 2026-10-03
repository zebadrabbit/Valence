// A location word followed by a number or a letter-number code: "Room 214", "cabinet B3".
const LOCATION = /\b(room|building|cabinet|shelf|stockroom)\s+(?=[A-Za-z-]*\d)[A-Za-z0-9-]+/i

// A course-number shape: a capital plus one to three letters, an optional space, hyphen or
// underscore, then three or four digits ("CHEM 1411", "Chem-1411"). Digits followed by a
// unit ("KOH 250 mL", "At 298 K") are measurements, not course numbers.
const COURSE = /\b([A-Z][A-Za-z]{1,3})[\s_-]?(\d{3,4})\b/g
const UNIT_AFTER = /^\s?(K|nm|mL|g|mg|ppm|°C|M)(?![A-Za-z0-9])/
const IDENTIFIER_PREFIXES = new Set(['CID', 'CAS'])

function isYear(digits: string): boolean {
  const n = Number(digits)
  return digits.length === 4 && n >= 1800 && n <= 2099
}

export function findName(text: string, names: readonly string[]): string | null {
  const lower = text.toLowerCase()
  for (const name of names) {
    const needle = name.trim().toLowerCase()
    if (needle && lower.includes(needle)) return `contains the name "${needle}"`
  }
  return null
}

export function findInstitutionText(text: string, names: readonly string[]): string | null {
  const location = LOCATION.exec(text)
  if (location) return `looks like a location ("${location[0]}")`
  for (const match of text.matchAll(COURSE)) {
    const [whole, letters, digits] = match
    if (!letters || !digits) continue
    if (UNIT_AFTER.test(text.slice(match.index + whole.length))) continue
    if (IDENTIFIER_PREFIXES.has(letters) || isYear(digits)) continue
    return `looks like a course number ("${whole}")`
  }
  return findName(text, names)
}
