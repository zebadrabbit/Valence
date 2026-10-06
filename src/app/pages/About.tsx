import { PageHeader } from '@/app/PageHeader'
// The sources alone: importing the registry here would pull every molecule into the main chunk.
import sources from '@/chem-data/sources.json'

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
            Every chemistry value in Valence has a cited source. The values of the molecule explorer were curated by
            hand and are checked by automated tests. The periodic table is built by a script from saved copies of its
            sources, which were compared with each other; where a value needs a caution, the element's card carries a
            note.
          </p>
          <p className="mb-2">
            Valence relies on data published by PubChem (National Library of Medicine, National Center for
            Biotechnology Information), by the IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW) and by
            the National Institute of Standards and Technology (NIST). None of them is connected with Valence or has
            reviewed it. Where data comes from PubChem, it is provided by the National Library of Medicine without
            warranty; see the{' '}
            <a
              href="https://www.ncbi.nlm.nih.gov/home/about/policies/"
              className="underline underline-offset-4"
              rel="noreferrer"
            >
              NCBI policies and disclaimers
            </a>
            .
          </p>
          <p className="mb-2">
            The titration lab's model takes its constants from the International Association for the Properties of
            Water and Steam (IAPWS), NIST, the NOAA Global Monitoring Laboratory, PubChem, a paper in Analytical
            Sciences and a supplier's catalogue page, and, for the size of a drop and the two constants of carbonic
            acid, from two Wikipedia pages. The hazard statements on its bottles are those of Flinn Scientific's safety
            data sheets for the concentrated or the pure substance. The note under each rests on a safety data sheet
            for a solution of the strength on the bench, the indicator's from a different supplier, Ricca Chemical
            Company. The sheets were read on the dates their citations give, and no copy of them is kept. The lab's
            primer rests on OpenStax Chemistry 2e, David Harvey's Analytical Chemistry 2.1 and pages on laboratory
            technique, and quotes none of them. None of these publishers is connected with Valence or has reviewed it.
            At a real bench, follow the safety data sheet of the product in hand and the laboratory's own rules.
          </p>
          <ul className="list-disc pl-5">
            {sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} className="underline underline-offset-4" rel="noreferrer">
                  {source.citation}
                </a>
              </li>
            ))}
          </ul>
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
