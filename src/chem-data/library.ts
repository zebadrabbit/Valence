import type { Molecule } from './schema'

/** The library's topic headings, in display order (spec 6.1). */
export const TOPICS: readonly { id: Molecule['topic']; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'vsepr', label: 'VSEPR showcase' },
  { id: 'organic', label: 'Organic functional groups' },
  { id: 'biomolecules', label: 'Biomolecules' },
  { id: 'everyday', label: 'Everyday molecules' },
  { id: 'mechanism', label: 'Mechanism species' },
]

/** How a molecule's coordinates were obtained, as shown beside every length and angle (spec 5.2). */
export const GEOMETRY_SOURCE_LABEL: Readonly<Record<Molecule['geometrySource'], string>> = {
  'cited-experimental': 'experimental (gas phase)',
  'pubchem-computed': 'computed conformer (PubChem3D, MMFF94s force field); not an experimental structure',
}

export function topicLabel(topic: Molecule['topic']): string {
  return TOPICS.find((t) => t.id === topic)!.label
}

/**
 * The library entries under their topic headings, in file order. Files that
 * share a variantGroup are one entry, represented by the first of them.
 */
export function libraryGroups(molecules: readonly Molecule[]): { id: Molecule['topic']; label: string; entries: Molecule[] }[] {
  const entries = molecules.filter(
    (m, i) => !m.variantGroup || molecules.findIndex((other) => other.variantGroup === m.variantGroup) === i,
  )
  return TOPICS.map((topic) => ({ ...topic, entries: entries.filter((m) => m.topic === topic.id) }))
}

/** Every file of the molecule's variant group, in file order; empty when it has no variants. */
export function variantsOf(molecules: readonly Molecule[], molecule: Molecule): Molecule[] {
  return molecule.variantGroup ? molecules.filter((m) => m.variantGroup === molecule.variantGroup) : []
}

/** The molecule's PubChem compound page. An outbound link only: nothing is fetched. */
export function pubchemUrl(molecule: Molecule): string {
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.pubchemCid}`
}
