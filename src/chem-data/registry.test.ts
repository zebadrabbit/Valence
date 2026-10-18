import { describe, expect, it } from 'vitest'
import { angleDeg } from './geometry'
import { formulaElements } from './formula'
import { registry } from './registry'
import { validateRegistry } from './validate'

// Optional, untracked: src/chem-data/denylist.local.json, a JSON array of names
// (for example ["Example State"]). Absent on a fresh clone, which is fine.
const local = import.meta.glob<string[]>('./denylist.local.json', { eager: true, import: 'default' })
const institutionNames = Object.values(local).flat()

// Spec 6.1: 101 library entries; glycine, alanine, serine and cysteine each have a neutral and a zwitterion file.
// The first 33 structures, then the 72 added on 2026-10-09.
const LIBRARY_IDS = [
  'acetamide',
  'acetic-acid',
  'acetone',
  'alanine',
  'alanine-zwitterion',
  'ammonia',
  'benzene',
  'beta-d-glucopyranose',
  'bicarbonate',
  'boron-trifluoride',
  'carbon-dioxide',
  'carbonic-acid',
  'ethane',
  'ethanol',
  'ethene',
  'ethyl-acetate',
  'ethyne',
  'formaldehyde',
  'glycine',
  'glycine-zwitterion',
  'hydrogen-chloride',
  'hydrogen-peroxide',
  'hydronium',
  'methane',
  'methylamine',
  'nitrogen',
  'oxygen',
  'phosphorus-pentachloride',
  'sulfur-dioxide',
  'sulfur-hexafluoride',
  'urea',
  'water',
  'xenon-tetrafluoride',
  'acetaldehyde',
  'acetaminophen',
  'acetate',
  'acetonitrile',
  'adenine',
  'adrenaline',
  'ammonium',
  'ascorbic-acid',
  'aspartame',
  'aspirin',
  'benzaldehyde',
  'beta-d-fructofuranose',
  'butane',
  'caffeine',
  'capsaicin',
  'carbon-monoxide',
  'carbon-tetrachloride',
  'carbonate',
  'chlorine',
  'chlorine-trifluoride',
  'chloroform',
  'cinnamaldehyde',
  'citric-acid',
  'cyclohexane',
  'cysteine',
  'cysteine-zwitterion',
  'dichloromethane',
  'diethyl-ether',
  'dimethyl-ether',
  'dopamine',
  'formic-acid',
  'geosmin',
  'glycerol',
  'hydrogen',
  'hydrogen-cyanide',
  'hydrogen-fluoride',
  'hydrogen-sulfide',
  'hydroxide',
  'ibuprofen',
  'indigo',
  'isoamyl-acetate',
  'isobutane',
  'isooctane',
  'lactic-acid',
  'limonene',
  'menthol',
  'methanol',
  'methyl-salicylate',
  'nicotine',
  'nitrate',
  'nitric-acid',
  'ozone',
  'palmitic-acid',
  'phenol',
  'phosphate',
  'phosphoric-acid',
  'phosphorus-trichloride',
  'propane',
  'propene',
  'serine',
  'serine-zwitterion',
  'serotonin',
  'sucrose',
  'sulfate',
  'sulfur-tetrafluoride',
  'sulfur-trioxide',
  'sulfuric-acid',
  'theobromine',
  'thymine',
  'toluene',
  'vanillin',
  'xenon-difluoride',
].sort()

describe('the real chem-data registry', () => {
  it('passes validation', () => {
    expect(validateRegistry(registry, { institutionNames })).toEqual([])
  })

  it('contains exactly the 105 library structures', () => {
    expect(LIBRARY_IDS).toHaveLength(105)
    expect(registry.molecules.map((m) => m.id).sort()).toEqual(LIBRARY_IDS)
  })

  it('holds no molecule of more than about 60 atoms', () => {
    const largest = registry.molecules.reduce((big, m) => (m.atoms.length > big.atoms.length ? m : big))
    expect([largest.id, largest.atoms.length]).toEqual(['palmitic-acid', 50])
  })

  it('stores emission lines for hydrogen, sodium and xenon only, between 400 and 700 nm, longest first, in the digits NIST prints', () => {
    // Hydrogen's and sodium's are written by hand. Xenon's are the ones the rule of the periodic table's spectra
    // picks from NIST's saved response, by relative intensity (emissionSpectra.test.ts holds them to it).
    const withLines = registry.elements.filter((e) => e.emission)
    expect(withLines.map((e) => e.symbol)).toEqual(['H', 'Na', 'Xe'])
    for (const e of withLines) {
      const values = e.emission!.lines.map((line) => line.value)
      expect(values).toEqual([...values].sort((a, b) => b - a))
      for (const line of e.emission!.lines) {
        expect(line.value).toBeGreaterThan(400)
        expect(line.value).toBeLessThan(700)
        expect(Number(line.published)).toBe(line.value)
      }
    }
    const published = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)!.emission!.lines.map((line) => line.published)
    expect(published('H')).toEqual(['656.279', '486.135', '434.0472', '410.1734'])
    expect(published('Na')).toEqual(['589.592424', '588.995095'])
    expect(published('Xe')).toEqual(['631.8062', '492.3152', '491.6507', '482.9708', '480.70190', '473.41518'])
  })

  it('says with the data that the two sodium D lines are too close to draw apart', () => {
    const sodium = registry.elements.find((e) => e.symbol === 'Na')!.emission!
    expect(sodium.lines.map((line) => line.transition)).toEqual(['3p → 3s', '3p → 3s'])
    expect(sodium.selection).toContain('D lines')
    // Sodium is a silvery metal. What is yellow is its light: a sodium lamp, or a flame with sodium in it.
    expect(sodium.selection).toBe('The two D lines, which give a sodium lamp, and a flame that holds sodium, their yellow colour. NIST lists other, weaker lines of the neutral atom between 400 and 700 nm.')
    // That the D lines are what lights a sodium lamp and a sodium flame, and that the light is yellow, is not in NIST's table.
    expect(sodium.selectionSourceIds).toEqual(['hyperphysics-sodium-spectrum', 'hyperphysics-flame-colors', 'wikipedia-sodium-vapor-lamp'])
    for (const id of sodium.selectionSourceIds!) expect(registry.sources.map((s) => s.id)).toContain(id)
    expect(sodium.note).toContain('too close to draw separately')
    // Only an element whose lines overlap on the strip carries a note. Two of xenon's are 0.7 nm apart, and its note is the build's.
    expect(registry.elements.find((e) => e.symbol === 'H')!.emission!.note).toBeUndefined()
    expect(registry.elements.find((e) => e.symbol === 'Xe')!.emission!.note).toBe('Some of these lines are too close together to draw separately on this strip, which shows them as one. The table lists each of them.')
  })

  it('contains exactly the 11 elements', () => {
    expect(registry.elements.map((e) => e.symbol)).toEqual(['H', 'B', 'C', 'N', 'O', 'F', 'Na', 'P', 'S', 'Cl', 'Xe'])
  })

  it('stores every atomic weight as published, trailing zeros included', () => {
    for (const e of registry.elements) expect([e.symbol, Number(e.atomicWeight.published)]).toEqual([e.symbol, e.atomicWeight.value])
    const published = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)?.atomicWeight.published
    expect([published('H'), published('Na')]).toEqual(['1.0080', '22.990'])
  })

  it('stores every electronegativity as PubChem prints it', () => {
    for (const e of registry.elements) expect([e.symbol, Number(e.electronegativity.published)]).toEqual([e.symbol, e.electronegativity.value])
    const published = (symbol: string) => registry.elements.find((e) => e.symbol === symbol)?.electronegativity.published
    // PubChem prints these two to one decimal.
    expect([published('H'), published('Xe'), published('C')]).toEqual(['2.2', '2.6', '2.55'])
  })

  it('stores every cited length, angle and dihedral as its source prints it', () => {
    const cited = registry.molecules.flatMap((m) => {
      const { lengths = [], angles = [], dihedrals = [] } = m.measurements ?? {}
      return [...lengths, ...angles, ...dihedrals].map((entry) => ({ id: m.id, ...entry }))
    })
    // The source's table has no row for the angles of PCl5, which follow from its point group.
    const unpublished = cited.filter((entry) => entry.published === undefined)
    expect(unpublished.map((entry) => [entry.id, entry.atoms.length, entry.value])).toEqual([
      ...Array(3).fill(['phosphorus-pentachloride', 3, 120]),
      ...Array(6).fill(['phosphorus-pentachloride', 3, 90]),
      ['phosphorus-pentachloride', 3, 180],
    ])
    // Each is stored with the point group it follows from.
    expect(unpublished.map((entry) => entry.symmetry)).toEqual(Array(10).fill('D3h'))
    // So is every angle the source prints a figure for that the point group fixes all the same: the card says both.
    const fixed = cited.filter((entry) => entry.published !== undefined && entry.symmetry !== undefined)
    const counted = new Map<string, number>()
    for (const entry of fixed) {
      const key = `${entry.id} ${entry.symmetry} ${entry.published}`
      counted.set(key, (counted.get(key) ?? 0) + 1)
    }
    expect(fixed.every((entry) => entry.atoms.length === 3)).toBe(true)
    expect([...counted]).toEqual([
      ['carbon-dioxide D∞h 180', 1],
      ['methane Td 109.471', 6],
      ['boron-trifluoride D3h 120', 3],
      ['sulfur-hexafluoride Oh 90', 12],
      ['sulfur-hexafluoride Oh 180', 3],
      ['xenon-tetrafluoride D4h 90', 4],
      ['xenon-tetrafluoride D4h 180', 2],
      ['xenon-difluoride D∞h 180', 1],
    ])
    // An angle that had to be measured carries no point group: that of water, ammonia, sulfur dioxide or hydrogen peroxide.
    // Nor do the 174.9° between the axial fluorines of ClF₃ and the 87.81° of SF₄, which follow from the other rows of
    // their pages and not from the point group alone.
    for (const id of ['water', 'ammonia', 'sulfur-dioxide', 'hydrogen-peroxide', 'chlorine-trifluoride', 'sulfur-tetrafluoride']) {
      expect([id, cited.filter((entry) => entry.id === id && entry.symmetry !== undefined)]).toEqual([id, []])
    }
    const published = (id: string) => [...new Set(cited.filter((entry) => entry.id === id).map((entry) => entry.published))]
    expect(published('chlorine-trifluoride')).toEqual(['1.597', '1.697', '87.45', '174.9'])
    expect(published('sulfur-tetrafluoride')).toEqual(['1.646', '1.545', '173.07', '101.55', '87.81'])
    expect(published('hydrogen')).toEqual(['0.741'])
    expect(published('carbon-monoxide')).toEqual(['1.128'])
    expect(published('water')).toEqual(['0.958', '104.4776'])
    expect(published('hydrogen-peroxide')).toEqual(['1.475', '0.950', '94.8', '119.8'])
    expect(published('phosphorus-pentachloride')).toEqual(['2.124', '2.020', undefined])
    expect(published('carbon-dioxide')).toEqual(['1.162', '180'])
  })

  it('pairs each neutral amino acid with its zwitterion', () => {
    const variants = registry.molecules.filter((m) => m.variantGroup).map((m) => [m.id, m.variantGroup, m.variantLabel])
    expect(variants).toEqual([
      ['glycine', 'glycine', 'Neutral'],
      ['glycine-zwitterion', 'glycine', 'Zwitterion'],
      ['alanine', 'alanine', 'Neutral'],
      ['alanine-zwitterion', 'alanine', 'Zwitterion'],
      ['serine', 'serine', 'Neutral'],
      ['serine-zwitterion', 'serine', 'Zwitterion'],
      ['cysteine', 'cysteine', 'Neutral'],
      ['cysteine-zwitterion', 'cysteine', 'Zwitterion'],
    ])
  })

  it('cites experimental geometry for the first 13 of the Basics and VSEPR groups and for six added later, and PubChem for the rest', () => {
    // Spec 5.2. The six: PubChem has no conformer for H₂, ClF₃ and XeF₂; its conformer of SF₄ is tetrahedral, that
    // of ozone has two different O–O lengths, and that of carbon monoxide a bond 0.07 Å too short.
    const experimental = registry.molecules.filter((m) => m.geometrySource === 'cited-experimental').map((m) => m.id)
    expect(experimental).toEqual([
      'water',
      'carbon-dioxide',
      'ammonia',
      'methane',
      'oxygen',
      'nitrogen',
      'hydrogen-chloride',
      'hydrogen-peroxide',
      'hydrogen',
      'carbon-monoxide',
      'ozone',
      'boron-trifluoride',
      'sulfur-dioxide',
      'sulfur-hexafluoride',
      'xenon-tetrafluoride',
      'phosphorus-pentachloride',
      'sulfur-tetrafluoride',
      'chlorine-trifluoride',
      'xenon-difluoride',
    ])
    for (const m of registry.molecules) {
      expect([m.id, m.measurements !== undefined]).toEqual([m.id, experimental.includes(m.id)])
      expect([m.id, m.sourceId.startsWith('cccbdb-')]).toEqual([m.id, experimental.includes(m.id)])
    }
  })

  it('gives every molecule of the Everyday topic one note that says what it is', () => {
    for (const m of registry.molecules.filter((m) => m.topic === 'everyday')) {
      expect([m.id, m.notes?.length ?? 0]).toEqual([m.id, expect.any(Number)])
      expect(m.notes?.[0], m.id).toMatch(/^[A-Z].*\.$/)
    }
  })

  it('pins the names that must not be mistaken for an element or another ion', () => {
    const name = (id: string) => registry.molecules.find((m) => m.id === id)?.name
    expect([name('oxygen'), name('nitrogen'), name('bicarbonate')]).toEqual(['Oxygen (O₂)', 'Nitrogen (N₂)', 'Bicarbonate ion'])
  })

  it('gives no molecule the name of an element', () => {
    const elementNames = new Set(registry.elements.map((e) => e.name))
    for (const m of registry.molecules) expect(elementNames.has(m.name), m.id).toBe(false)
  })

  it('writes every formula with the element counts of its atom list, parentheses included', () => {
    expect(formulaElements('CO(NH2)2').sort()).toEqual(['C', 'H', 'H', 'H', 'H', 'N', 'N', 'O'])
    expect(() => formulaElements('C((OH)2)3')).toThrow()
    for (const m of registry.molecules) {
      expect(formulaElements(m.formula).sort(), m.id).toEqual(m.atoms.map((a) => a.element).sort())
    }
  })

  it('writes the organic molecules in condensed form', () => {
    const formula = (id: string) => registry.molecules.find((m) => m.id === id)?.formula
    expect(['ethanol', 'urea', 'alanine-zwitterion', 'ethyl-acetate', 'glycine'].map(formula)).toEqual([
      'C2H5OH',
      'CO(NH2)2',
      'CH3CH(NH3)COO',
      'CH3COOC2H5',
      'NH2CH2COOH',
    ])
  })

  it('draws sulfur dioxide bent and carbon dioxide straight in 2D', () => {
    const angle2d = (id: string, centre: string) => {
      const atoms = registry.molecules.find((m) => m.id === id)!.atoms
      const at = (element: string) => atoms.filter((a) => a.element === element).map((a) => [...a.position2d, 0] as const)
      const [o1, o2] = at('O')
      return angleDeg(o1!, at(centre)[0]!, o2!)
    }
    expect(angle2d('sulfur-dioxide', 'S')).toBeGreaterThan(110)
    expect(angle2d('sulfur-dioxide', 'S')).toBeLessThan(130)
    expect(Math.abs(angle2d('carbon-dioxide', 'C') - 180)).toBeLessThan(1)
  })

  it('carries the caveat about the xenon electronegativity on the value itself', () => {
    const noted = registry.elements.filter((e) => e.electronegativity.note)
    expect(noted.map((e) => e.symbol)).toEqual(['Xe'])
    expect(noted[0]!.electronegativity.note).toMatch(/no primary source was traced/)
    expect(noted[0]!.notes?.join(' ')).not.toMatch(/electronegativity/i)
  })

  it('keeps the 90°, 120° and 180° angles of PCl5 (spec 6.5)', () => {
    const pcl5 = registry.molecules.find((m) => m.id === 'phosphorus-pentachloride')
    const counts: Record<number, number> = {}
    for (const { value } of pcl5?.measurements?.angles ?? []) counts[value] = (counts[value] ?? 0) + 1
    expect(counts).toEqual({ 90: 6, 120: 3, 180: 1 })
  })
})
