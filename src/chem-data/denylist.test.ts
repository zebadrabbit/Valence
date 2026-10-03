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
  ])('passes legitimate text: %s', (text) => {
    expect(findInstitutionText(text, [])).toBeNull()
  })

  it.each(['Room 214', 'CHEM 1411', 'CHEM1411', 'Chem 1411', 'CHEM-1411', 'CHEM_1411', 'cabinet B3', 'Stored in stockroom 4', 'building C-12'])(
    'flags institution-specific text: %s',
    (text) => {
      expect(findInstitutionText(text, [])).not.toBeNull()
    },
  )

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
