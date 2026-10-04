// A location word followed by a number or a letter-number code: "Room 214", "cabinet B3".
const LOCATION = /\b(room|building|cabinet|shelf|stockroom)\s+(?=[A-Za-z-]*\d)[A-Za-z0-9-]+/i

// A course-number shape: two to four letters, an optional space, hyphen or underscore, then
// three or four digits ("CHEM 1411", "Chem-1411"). Digits followed by a unit ("KOH 250 mL",
// "At 298 K") are measurements, not course numbers.
const COURSE = /\b([A-Za-z]{2,4})[\s_-]?(\d{3,4})\b/g
// Letters that start with a capital are a course number whatever they spell. Letters that do not
// ("chem 1411") are one only when they spell a subject below: ordinary prose puts lower-case words
// before numbers all the time ("the 282 whose mass", "low spin 139 pm", "elements 1 to 108").
// ponytail: a lower-case code of a subject not listed here passes. The list was chosen by running
// the rule over every authored string in the repository, where a rule for any lower-case word
// flagged hundreds of ordinary phrases and this one flags no ordinary phrase.
const LOWER_CASE_SUBJECTS = new Set(['chem', 'chm', 'che', 'bio', 'biol', 'bsc', 'phy', 'phys', 'math', 'mat', 'mth', 'sci', 'engl', 'geol'])
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
    if (!/^[A-Z]/.test(letters) && !LOWER_CASE_SUBJECTS.has(letters.toLowerCase())) continue
    if (UNIT_AFTER.test(text.slice(match.index + whole.length))) continue
    if (IDENTIFIER_PREFIXES.has(letters) || isYear(digits)) continue
    return `looks like a course number ("${whole}")`
  }
  return findName(text, names)
}
