import { ACTIVITIES } from '@/app/activities'
import { KineticsPage } from '@/app/lab/kinetics/Page'
import { Primer } from '@/app/lab/Primer'
import { clockData } from '@/chem-data/clock/data'
import { CLOCK_PRIMER, READ_FIRST } from '@/chem-data/clock/primer'
import sources from '@/chem-data/sources.json'
import * as engine from '@/engine/clock'
import { ClockBench } from './ClockBench'
import { ClockRecord } from './ClockRecord'
import { MODE_TEXT } from './messages'

const [, , , , , , CLOCK] = ACTIVITIES
const MODEL = engine.modelFrom(clockData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = engine.clockStateSchema(MODEL)

/**
 * #/lab/clock-reaction: the shared page of the two labs on the kinetics engine (src/app/lab/kinetics/Page.tsx),
 * with this lab's record, its model, its primer, its bench and its record tab.
 */
export function ClockPage() {
  return (
    <KineticsPage
      activity={CLOCK}
      engine={engine}
      m={MODEL}
      schema={SCHEMA}
      modeText={MODE_TEXT}
      primer={<Primer sections={CLOCK_PRIMER} sources={sources} readFirst={READ_FIRST} />}
      bench={(about) => <ClockBench data={clockData} m={MODEL} sources={sources} {...about} />}
      record={(state) => <ClockRecord data={clockData} m={MODEL} state={state} />}
    />
  )
}
