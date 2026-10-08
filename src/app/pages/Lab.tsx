import { PageHeader } from '@/app/PageHeader'
import { ActivityList } from './ActivityList'

/** #/lab: the labs, each with its status as Home shows it. */
export function Lab() {
  return (
    <>
      <PageHeader title="Lab" />
      <ActivityList kind="Lab" />
    </>
  )
}
