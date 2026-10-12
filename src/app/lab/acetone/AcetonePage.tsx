import { ACTIVITIES } from '@/app/activities'
import { KineticsPage } from '@/app/lab/kinetics/Page'
import { KineticsRecord } from '@/app/lab/kinetics/Record'
import { Primer } from '@/app/lab/Primer'
import { acetoneData } from '@/chem-data/acetone/data'
import { ACETONE_PRIMER, READ_FIRST } from '@/chem-data/acetone/primer'
import sources from '@/chem-data/sources.json'
import * as engine from '@/engine/acetone'
import { AcetoneBench } from './AcetoneBench'
import { acetoneLab } from './lab'
import { MODE_TEXT } from './messages'

const [, , , , , , , ACETONE] = ACTIVITIES
const MODEL = engine.modelFrom(acetoneData)
// One schema for the page's life: the stored record is held to the model as it is read.
const SCHEMA = engine.acetoneStateSchema(MODEL)
const LAB = acetoneLab(acetoneData, MODEL)

/**
 * #/lab/iodination-of-acetone: the shared page of the two labs on the kinetics engine
 * (src/app/lab/kinetics/Page.tsx), with this lab's record, its model, its primer and its bench. The Record tab is
 * the shared record, for this lab's two parts.
 */
export function AcetonePage() {
  return (
    <KineticsPage
      activity={ACETONE}
      engine={engine}
      m={MODEL}
      schema={SCHEMA}
      modeText={MODE_TEXT}
      primer={<Primer sections={ACETONE_PRIMER} sources={sources} readFirst={READ_FIRST} />}
      bench={(about) => <AcetoneBench data={acetoneData} m={MODEL} sources={sources} {...about} />}
      record={(state) => <KineticsRecord lab={LAB} state={state} />}
    />
  )
}
