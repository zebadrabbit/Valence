import { describe, expect, it } from 'vitest'
import { configurationParts, coreAndSubshells, EMISSION_NOTE, EMISSION_SCOPE_NOTE, evToKjPerMol, valenceElectrons } from './element'
import { periodicTable } from './periodic'
import { registry } from './registry'

const element = (symbol: string) => {
  const found = registry.elements.find((e) => e.symbol === symbol)
  if (!found) throw new Error(`no element ${symbol}`)
  return found
}

describe('evToKjPerMol', () => {
  it('converts the first ionization energy of oxygen (13.618055 eV) to 1313.9 kJ/mol', () => {
    expect(evToKjPerMol(element('O').ionizationEnergiesEv.value[0]!)).toBeCloseTo(1313.9, 1)
  })
})

describe('valenceElectrons', () => {
  it.each([
    ['H', 1],
    ['B', 3],
    ['C', 4],
    ['N', 5],
    ['O', 6],
    ['F', 7],
    ['Na', 1],
    ['P', 5],
    ['S', 6],
    ['Cl', 7],
    ['Xe', 8],
  ])('%s has %i', (symbol, expected) => {
    expect(valenceElectrons(element(symbol))).toBe(expected)
  })
})

describe('configurationParts', () => {
  it('splits each subshell from its electron count', () => {
    expect(configurationParts('1s2 2s2 2p2')).toEqual([
      { subshell: '1s', electrons: '2' },
      { subshell: '2s', electrons: '2' },
      { subshell: '2p', electrons: '2' },
    ])
  })

  it('keeps a two-digit count whole', () => {
    expect(configurationParts(element('Xe').configuration.value).at(2 + 3)).toEqual({ subshell: '3d', electrons: '10' })
  })

  it('reads every stored configuration, and the counts sum to the atomic number', () => {
    for (const e of registry.elements) {
      const total = configurationParts(e.configuration.value).reduce((sum, part) => sum + Number(part.electrons), 0)
      expect([e.symbol, total]).toEqual([e.symbol, e.atomicNumber])
    }
  })

  it('rejects text that is not a configuration', () => {
    expect(() => configurationParts('[He] 2s2')).toThrow(/unreadable/)
  })
})

describe('coreAndSubshells', () => {
  it('splits a configuration written with a noble-gas core into the core and the subshells after it', () => {
    expect(coreAndSubshells('[He]2s2 2p5')).toEqual({
      core: '[He]',
      parts: [
        { subshell: '2s', electrons: '2' },
        { subshell: '2p', electrons: '5' },
      ],
    })
  })

  it('reads a core followed by a space, and a configuration with no core', () => {
    expect(coreAndSubshells('[He] 2s2 2p3').core).toBe('[He]')
    expect(coreAndSubshells('[He] 2s2 2p3').parts.length).toBe(2)
    expect(coreAndSubshells('1s1')).toEqual({ core: undefined, parts: [{ subshell: '1s', electrons: '1' }] })
  })

  it('keeps subshells in the order written and a two-digit count whole', () => {
    expect(coreAndSubshells('[Ar]4s1 3d10').parts).toEqual([
      { subshell: '4s', electrons: '1' },
      { subshell: '3d', electrons: '10' },
    ])
  })

  it('reads the configuration of every element in the periodic table, losing nothing', () => {
    for (const e of periodicTable) {
      const { core, parts } = coreAndSubshells(e.configuration.text)
      expect([e.symbol, (core ?? '') + parts.map((p) => p.subshell + p.electrons).join(' ')]).toEqual([e.symbol, e.configuration.text.replace('] ', ']')])
    }
  })

  it('rejects text that is not a configuration', () => {
    expect(() => coreAndSubshells('[He]')).toThrow(/unreadable/)
    expect(() => coreAndSubshells('2s2 [He]')).toThrow(/unreadable/)
  })
})

describe('the note shown with every emission spectrum', () => {
  it('holds for an element that is not a gas at room temperature: sodium glows as a vapour', () => {
    expect(EMISSION_NOTE).toBe('These lines come from isolated atoms in a glowing gas or vapour, as in a discharge lamp. An atom bonded in a molecule does not emit them.')
    expect(registry.elements.filter((e) => e.emission).map((e) => e.symbol)).toEqual(['H', 'Na', 'Xe'])
  })
})

describe('the note on what an emission spectrum leaves out', () => {
  const { text, sourceIds, support } = EMISSION_SCOPE_NOTE

  it('says that the lines are those of the neutral atom, that ions and molecules give light too, and how far the intensities go', () => {
    expect(text).toBe(
      "The strip shows lines of the single neutral atom, as a database lists them. A real lamp or flame can look different, because ions and molecules give light too: in a flame, calcium, strontium and barium give strong bands of light as molecules with oxygen and hydrogen (CaOH, SrOH and BaOH). The strip does not show how strong each line is. Where the lines shown are an element's strongest, that is by NIST's relative intensities, which are rough, depend on the lamp they were measured with, and compare the lines of one element with each other, not with those of another element.",
    )
  })

  it('cites sources the registry holds, and stores beside each where the passage is and what it establishes, in words of its own', () => {
    expect(sourceIds).toEqual(['nist-asd-lines-help', 'bulewicz-1956'])
    for (const id of sourceIds) expect(registry.sources.map((s) => s.id)).toContain(id)
    const lines = support.split('\n')
    expect(lines.map((line) => line.split(': ')[0])).toEqual(['nist-asd-lines-help', 'nist-asd-lines-help', 'bulewicz-1956'])
    for (const line of lines) {
      expect(line).toMatch(/^[a-z0-9-]+: not quoted; see .+, https:\/\/\S+\. It establishes that .+\.$/)
      expect(line).not.toMatch(/["“”]/)
    }
    // Only the abstract of the paper was read, and the citation and the support both say so.
    expect(registry.sources.find((s) => s.id === 'bulewicz-1956')!.citation).toContain('only its abstract was read')
    expect(lines[2]).toContain('the abstract, which is all of the paper that was read')
  })
})
