import { Check, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { FOCUS_RING } from '@/app/explore/focusRing'
import { Formula } from '@/app/explore/Formula'
import { MoleculeWorkspace } from '@/app/explore/MoleculeWorkspace'
import { PageHeader } from '@/app/PageHeader'
import { NotFound } from '@/app/pages/NotFound'
import { buttonVariants } from '@/components/ui/button'
import { GEOMETRY_SOURCE_LABEL, pubchemUrl, topicLabel, variantsOf } from '@/chem-data/library'
import { registry } from '@/chem-data/registry'

export function MoleculePage() {
  const { id } = useParams()
  const molecule = registry.molecules.find((m) => m.id === id)
  if (!molecule) return <NotFound />
  const variants = variantsOf(registry.molecules, molecule)

  return (
    <>
      <PageHeader title={molecule.name} parent={{ to: '/explore', label: 'Explore' }} />

      <dl className="mb-3 grid max-w-3xl grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Formula</dt>
        <dd className="text-base">
          <Formula molecule={molecule} />
        </dd>
        <dt className="text-muted-foreground">Topic</dt>
        <dd>{topicLabel(molecule.topic)}</dd>
        <dt className="text-muted-foreground">Geometry</dt>
        <dd>{GEOMETRY_SOURCE_LABEL[molecule.geometrySource]}</dd>
        {molecule.notes && (
          <>
            <dt className="text-muted-foreground">Notes</dt>
            <dd>
              {molecule.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </dd>
          </>
        )}
      </dl>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {variants.length > 0 && (
          <div role="group" aria-label="Form" className="flex items-center gap-1">
            <span aria-hidden="true" className="mr-1 text-muted-foreground">
              Form
            </span>
            {variants.map((variant) => {
              const current = variant.id === molecule.id
              return (
                // keepFocus: Layout leaves focus on the toggle instead of moving it to the h1.
                <Link
                  key={variant.id}
                  to={`/explore/${variant.id}`}
                  replace
                  state={{ keepFocus: true }}
                  aria-current={current ? 'true' : undefined}
                  className={buttonVariants({ variant: current ? 'secondary' : 'outline', size: 'sm', className: FOCUS_RING })}
                >
                  {current && <Check aria-hidden="true" />}
                  {variant.variantLabel}
                </Link>
              )
            })}
          </div>
        )}
        <a href={pubchemUrl(molecule)} rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
          PubChem record
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </div>

      {/* Keyed so the selection and panel state start fresh for each structure file. */}
      <MoleculeWorkspace key={molecule.id} molecule={molecule} />
    </>
  )
}
