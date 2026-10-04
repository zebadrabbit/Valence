import { Link } from 'react-router'
import { Disclosure } from '@/app/explore/InspectorCard'
import { CATEGORIES, periodicTable } from '@/chem-data/periodic'
import type { PeriodicElement } from '@/chem-data/schema'
import { quantityText, TRENDS, type TrendProperty } from './trend'

/**
 * Every element in atomic-number order, as plain links: the alternative to the grid (periodic table spec 8).
 * The chosen property's value is beside each name, so a trend can be read down the list without the shading.
 */
export function ElementList({ selected, property }: { selected: PeriodicElement | undefined; property: TrendProperty | null }) {
  return (
    <Disclosure summary={`All 118 elements as a list, each with its ${property ? TRENDS[property].name : 'chemical family'}`}>
      <ol className="list-decimal columns-[15rem] gap-x-8 pl-8 text-sm">
        {periodicTable.map((element) => (
          <li key={element.symbol} className="py-0.5">
            <Link
              to={`/explore/elements/${element.symbol}`}
              replace
              state={{ keepFocus: true }}
              aria-current={element === selected ? 'page' : undefined}
              className="underline underline-offset-4 aria-[current]:font-semibold"
            >
              {element.name}
            </Link>{' '}
            ({element.symbol}): {property ? quantityText(element[property]) : CATEGORIES.find((c) => c.category === element.category)?.member}
          </li>
        ))}
      </ol>
    </Disclosure>
  )
}
