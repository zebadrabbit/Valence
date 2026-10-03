import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p className="max-w-prose text-muted-foreground">
        There is nothing at this address.{' '}
        <Link to="/" className="underline underline-offset-4">
          Go to the home page
        </Link>
        .
      </p>
    </>
  )
}
