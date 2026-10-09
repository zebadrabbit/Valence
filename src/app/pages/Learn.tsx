import { PageHeader } from '@/app/PageHeader'
import { ActivityList } from './ActivityList'

/** #/learn: the mechanism timelines, each with its status as Home shows it. */
export function Learn() {
  return (
    <>
      <PageHeader title="Learn" />
      <ActivityList kind="Mechanism" />
    </>
  )
}
