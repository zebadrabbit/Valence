import { citations, type Citation } from '@/chem-data/citations'
import type { Molecule, Source } from '@/chem-data/schema'
import type { Mechanism } from './schema'

type Entry = readonly [covers: string, sourceId: string]

/**
 * What the mechanism's "Sources" control lists (spec 5.1): each source once, with what it covers: the formation
 * values and what standard conditions are, the acid constant and the lifetime of carbonic acid, the rate of the
 * proton's move, the constants, each chapter's timescale that has a source, the radii of the two ions, and the
 * shape of each species, which is its library record's.
 */
export function mechanismCitations(mechanism: Mechanism, library: readonly Molecule[], sources: readonly Source[]): Citation[] {
  const { thermo } = mechanism
  return citations(
    [
      ...thermo.formation.flatMap((f): Entry[] => [
        ['Enthalpies of formation', f.enthalpy.sourceId],
        ['Gibbs energies of formation', f.gibbs.sourceId],
      ]),
      ['Standard conditions', thermo.standardState.sourceId],
      ['Acid constant of the carbonic acid molecule', thermo.carbonicAcid.pKa.sourceId],
      ['How long a carbonic acid molecule lasts', thermo.carbonicAcid.lifetime.sourceId],
      ['How fast a proton moves to a hydrogen carbonate ion', thermo.protonTransfer.onContactRate.sourceId],
      ...Object.values(thermo.constants).map((constant): Entry => ['Gas constant, Boltzmann constant and Planck constant', constant.sourceId]),
      ...mechanism.chapters.flatMap((chapter): Entry[] => (chapter.timescale && 'sourceId' in chapter.timescale ? [[`Timescale of ${chapter.title.toLowerCase()}`, chapter.timescale.sourceId]] : [])),
      ...mechanism.actors.flatMap((actor): Entry[] => (actor.ion ? [['Ionic radii of the sodium ion and the chloride ion', actor.ion.radius.sourceId]] : [])),
      ...mechanism.species.flatMap((species): Entry[] => {
        const molecule = library.find((m) => m.id === species.id)
        return molecule ? [[`Shape of the ${species.name}`, molecule.sourceId]] : []
      }),
    ],
    sources,
  )
}
