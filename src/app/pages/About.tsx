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
          <p className="mb-2">
            The aqueous reactions lab takes the solubility of each pair of ions, the forms of an equation and the place
            of magnesium above hydrogen from OpenStax Chemistry 2e; its enthalpies of formation from the NBS tables of
            chemical thermodynamic properties of 1982, as NIST serves them; its molar masses from PubChem; and its
            colours, textures and odours from pages on the characteristic reactions of metal ions, a page of Chemguide,
            a university's instruction sheet and Wikipedia. The hazard statements on its fifteen reagents are those of
            Flinn Scientific's safety data sheets for the concentrated or the pure substance, and the note under each
            rests on a sheet for the reagent as it is on the bench; where no sheet covers that strength, the note says
            so. The sheets were read on the dates their citations give, and no copy of them is kept. The lab's primer
            also rests on Prudent Practices in the Laboratory and on a laboratory manual, and quotes none of its
            sources. None of these publishers is connected with Valence or has reviewed it.
          </p>
          <p className="mb-2">
            The flame test lab takes the wavelengths of its atomic lines from the NIST Atomic Spectra Database; the
            bands of CaOH, SrOH and BaOH from a paper in Spectrochimica Acta Part B, read as a scanned copy in a
            university's repository, and from the abstracts in English of two papers in Bunko Kenkyu; the bands of
            CuCl and CuOH from a doctoral dissertation; and the colours of its flames from a page of Chemguide and an
            open textbook on qualitative analysis. Which line or band of a flame it calls the brightest follows what
            those sources' instruments recorded, which is not always what an eye would find. The hazard statements on
            its six bottles are those of Flinn Scientific's safety data sheets for the solid salts. The note under
            each rests on the same supplier's sheet for the solution and, where a sheet of Ward's Science or of Fisher
            Scientific or a record of NOAA's database of chemicals says something stricter of the substance, on that
            too. The documents were read on the dates their citations give, and no copy of them is kept. The lab's
            primer also rests on pages of NASA, of two universities and of a college, on a paper on the Bunsen
            burner, and on the paper of Kirchhoff and Bunsen of 1860, read in translation, and quotes none of its
            sources. None of these publishers is connected with Valence or has reviewed it. At a real bench, follow
            the safety data sheet of the product in hand and the laboratory's own rules.
          </p>
          <p className="mb-2">
            The calorimetry lab works out the two enthalpies its results are held to from the enthalpies of formation
            in the NBS tables of chemical thermodynamic properties of 1982, as NIST serves them, in the rows for
            solutions of about the strength on the bench, and the specific heats of its four metals from the heat
            capacities in the same tables and the standard atomic weights of IUPAC's commission on them. The molar
            mass of ammonium nitrate is PubChem's. The specific heat and the density of water are the NIST Chemistry
            WebBook's, and the lab gives them to every solution too, which is an idealisation. The hazard statements
            of its acid and base are those of the aqueous reactions lab. Those of solid ammonium nitrate and of the
            four metals as pieces are Flinn Scientific's safety data sheets, and the note under each rests on that
            supplier's sheets and, where a sheet of Ward's Science, of Fisher Scientific or of ESPI Metals or a
            record of NOAA's database of chemicals says something stricter of the substance, on that too. The
            documents were read on the dates their citations give, and no copy of them is kept. The lab's primer
            also rests on pages of Chemguide, of NASA, of two universities and of a college, on a page of a
            university's laboratory manual and on a set of revision notes, and quotes none of its sources. How fast
            its cup trades heat with the room is Valence's own model and not a measurement. None of these publishers
            is connected with Valence or has reviewed it. At a real bench, follow the safety data sheet of the
            product in hand and the laboratory's own rules.
          </p>
          <p className="mb-2">
            The Group I cations lab works out the solubility products of its three chlorides and the formation
            constant of the silver-ammonia ion from the Gibbs energies of formation in the NBS tables of chemical
            thermodynamic properties of 1982, as NIST serves them. The solubility of lead chloride in cold and in hot
            water is from a page on the reactions of the lead ion, and the solubility product of lead chromate from a
            university's handout, which gives no source for it. Its scheme, the rules its steps follow and what each
            solid and each liquid looks like are from an open textbook of qualitative analysis, a set of pages on the
            reactions of metal ions, a college's laboratory experiment, a university's handout and a college's
            pre-lab notes. The hazard statements of its hydrochloric acid are those of the aqueous reactions lab.
            Those of its other four reagents, of silver nitrate and of lead nitrate are those of Flinn Scientific's
            safety data sheets: for the concentrated acid, for the solid salt and, for the ammonia, for solutions of
            1.1 M to 14.8 M. That supplier has no sheet for mercury(I) nitrate, whose statements are those of a sheet
            of Fisher Scientific's for the solid. The note under each rests on a sheet for the solution where one
            could be read and, where a sheet of Ward's Science or of Fisher Scientific or a record of NOAA's database
            of chemicals says something stricter of the substance, on that too. The documents were read on the dates their citations give, and no copy of them is kept. The
            lab's primer quotes none of its sources. How much of anything is in a tube is Valence's own model, with
            amounts that are fixed. None of these publishers is connected with Valence or has reviewed it. At a real
            bench, follow the safety data sheet of the product in hand and the laboratory's own rules.
          </p>
          <p className="mb-2">
            The mechanism timeline takes its enthalpies and free energies of formation from the NBS tables of chemical
            thermodynamic properties of 1982, as NIST serves them; the acid constant of the carbonic acid molecule,
            how long that molecule lasts and the timescales of its two middle steps from a paper in the Journal of
            Physical Chemistry B, read as the authors' manuscript in PubMed Central; three constants from NIST's
            listing of the 2022 CODATA values; the radii of its two ions from Shannon's table of ionic radii, checked
            through a transcription; and the shapes of its molecules from the explorer's library. Two of its energies
            are worked out here from those values and are marked as derived, and one barrier has no value and is drawn
            not to scale. Where the atoms are between and around the reacting molecules is Valence's own choreography,
            not a measured or computed path. None of these publishers is connected with Valence or has reviewed it.
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
