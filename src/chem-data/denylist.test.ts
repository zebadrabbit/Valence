import { describe, expect, it } from 'vitest'
import { findInstitutionText, findName } from './denylist'

describe('findInstitutionText', () => {
  it.each([
    'room temperature',
    'building block',
    'CID 962',
    'CAS 7732',
    'NIST 2022',
    'at 298 K',
    'about 800 nm',
    'KOH 250 mL',
    'UV 254 nm',
    'computed model (MMFF94s, PubChem3D)',
    'shelf life of 2 years',
    'White BaSO4; liquid stays blue',
    // Lower-case words before a number, as the notes and descriptions in this repository write them.
    'low spin 139 pm, high spin 161 pm',
    'not the 282 whose mass PubChem prints',
    'a boiling point of 350 ± 30 K',
    'known for elements 1 to 108',
    'for 107 of 108 elements',
    'angles 90 and 180 by symmetry',
    'bent 109 degrees',
    'each gas value is 1000 times smaller',
    'between 400 and 700 nm',
    'pubchem-cid-6324',
  ])('passes legitimate text: %s', (text) => {
    expect(findInstitutionText(text, [])).toBeNull()
  })

  it.each(['Room 214', 'CHEM 1411', 'CHEM1411', 'Chem 1411', 'CHEM-1411', 'CHEM_1411', 'cabinet B3', 'Stored in stockroom 4', 'building C-12'])(
    'flags institution-specific text: %s',
    (text) => {
      expect(findInstitutionText(text, [])).not.toBeNull()
    },
  )

  it.each(['chem 1411', 'chem1411', 'chem-1411', 'see chem 1411 for the procedure', 'cHEM 1411', 'chm 1045', 'biol 1406', 'phys 2425', 'math 1314', 'bio 101'])(
    'flags a lower-case course code: %s',
    (text) => {
      expect(findInstitutionText(text, [])).toBe(`looks like a course number ("${/[a-z]+[\s-]?\d+/i.exec(text)![0]}")`)
    },
  )

  it('still exempts a year and a measurement after a lower-case subject', () => {
    expect(findInstitutionText('bio 2020 review', [])).toBeNull()
    expect(findInstitutionText('mat 250 g', [])).toBeNull()
  })

  it('flags a configured name, ignoring case', () => {
    expect(findInstitutionText('as done at Example State College', ['example state'])).toContain('example state')
  })
})

describe('findName', () => {
  it('checks names only', () => {
    expect(findName('Room 214', [])).toBeNull()
    expect(findName('Example State lab manual', ['Example State'])).not.toBeNull()
  })

  it('ignores empty names', () => {
    expect(findName('anything', ['', '  '])).toBeNull()
  })
})
