import { useMemo } from 'react'
import { KineticsRecord } from '@/app/lab/kinetics/Record'
import type { ClockData } from '@/chem-data/clock/data'
import { temperatureView, type ClockModel, type ClockState } from '@/engine/clock'
import { clockLab } from './lab'

/**
 * The Record tab: the shared record of the two labs on the kinetics engine (src/app/lab/kinetics/Record.tsx), for
 * this lab's three parts, with the places on the line of part 3, which two of its entries name.
 */
export function ClockRecord({ data, m, state }: { data: ClockData; m: ClockModel; state: ClockState }) {
  const lab = useMemo(() => clockLab(data, m), [data, m])
  return <KineticsRecord lab={lab} state={state} places={temperatureView(m, state).graph?.places ?? []} />
}
