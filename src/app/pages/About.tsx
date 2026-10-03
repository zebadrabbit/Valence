import { PageHeader } from '@/app/PageHeader'
import { registry } from '@/chem-data/registry'

export function About() {
  return (
    <>
      <PageHeader title="About" />
      <div className="grid max-w-prose grid-cols-[minmax(0,1fr)] gap-6 break-words">
        <section aria-labelledby="independence-heading">
          <h2 id="independence-heading" className="mb-1 text-lg font-medium">
            Independent project
          </h2>
          <p>
            Valence is an independent personal project for anyone learning chemistry. It is not an official tool of any
            school, has no connection to any school's systems or student records, and does not replace bench labs or
            laboratory safety training.
          </p>
        </section>

        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="mb-1 text-lg font-medium">
            Your data
          </h2>
          <p>
            Valence has no accounts and no server. It collects no personal information and uses no analytics. Your
            progress and settings are stored only in this browser, and you can export or clear them in Settings.
          </p>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="mb-1 text-lg font-medium">
            Data sources
          </h2>
          <p className="mb-2">
            Every chemistry value in Valence is curated by hand with a cited source and checked by automated tests.
            Where data comes from PubChem, it is provided by the National Library of Medicine without warranty; see the{' '}
            <a
              href="https://www.ncbi.nlm.nih.gov/home/about/policies/"
              className="underline underline-offset-4"
              rel="noreferrer"
            >
              NCBI policies and disclaimers
            </a>
            .
          </p>
          {registry.sources.length === 0 ? (
            <p className="text-muted-foreground">No chemistry data is bundled yet.</p>
          ) : (
            <ul className="list-disc pl-5">
              {registry.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} className="underline underline-offset-4" rel="noreferrer">
                    {source.citation}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="licence-heading">
          <h2 id="licence-heading" className="mb-1 text-lg font-medium">
            Licence
          </h2>
          <p>Valence is free software under the MIT licence.</p>
        </section>
      </div>
    </>
  )
}
