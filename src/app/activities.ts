import { ENTRY } from './progress/storage'

/** The labs and the mechanism, as Home and the command palette list them. */
export const ACTIVITIES = [
  { entry: ENTRY.titration, kind: 'Lab', title: 'Standardization of a base by titration', to: '/lab' },
  { entry: ENTRY.aqueous, kind: 'Lab', title: 'Reactions in aqueous solution', to: '/lab' },
  { entry: ENTRY.mechanism, kind: 'Mechanism', title: 'HCl + NaHCO₃, step by step', to: '/learn' },
] as const
