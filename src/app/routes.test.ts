import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PeriodicTablePage } from '@/app/explore/elements/PeriodicTablePage'
import { AqueousPage } from '@/app/lab/aqueous/AqueousPage'
import { TitrationPage } from '@/app/lab/titration/TitrationPage'
import { Lab } from '@/app/pages/Lab'
import { periodicTable } from '@/chem-data/periodic'
import { registry } from '@/chem-data/registry'
import { routes } from './routes'

// The page an address opens: the last route matched, with the parameters read from the address.
const page = (path: string) => {
  const match = matchRoutes(routes, path)?.at(-1)
  if (!match) throw new Error(`no route for ${path}`)
  return { path: match.route.path, index: match.route.index === true, params: match.params, route: match.route }
}
const TABLE = 'explore/elements/:symbol?'

describe('the routes', () => {
  it('open the periodic table at #/explore/elements, with no element selected (periodic table spec 4)', () => {
    expect(page('/explore/elements')).toMatchObject({ path: TABLE, params: {} })
    expect(page('/explore/elements').params.symbol).toBeUndefined()
    expect(page('/explore/elements/')).toMatchObject({ path: TABLE })
  })

  it("open the same page at every element's address, with its symbol", () => {
    for (const element of periodicTable) {
      expect(page(`/explore/elements/${element.symbol}`)).toMatchObject({ path: TABLE, params: { symbol: element.symbol } })
    }
    expect(page('/explore/elements/xe')).toMatchObject({ path: TABLE, params: { symbol: 'xe' } })
  })

  it('load the periodic table page for that route, lazily', async () => {
    const { route } = page('/explore/elements/Xe')
    expect(typeof route.lazy).toBe('function')
    expect(route.element).toBeUndefined()
    const loaded = await (route.lazy as () => Promise<{ Component: unknown }>)()
    expect(loaded.Component).toBe(PeriodicTablePage)
  })

  it('still open every molecule at its own address, and the library at #/explore', () => {
    for (const molecule of registry.molecules) expect(page(`/explore/${molecule.id}`)).toMatchObject({ path: 'explore/:id', params: { id: molecule.id } })
    expect(page('/explore')).toMatchObject({ path: 'explore' })
  })

  it('send an address below an element, and any unknown address, to the not-found page', () => {
    expect(page('/explore/elements/Xe/more')).toMatchObject({ path: '*' })
    expect(page('/nowhere')).toMatchObject({ path: '*' })
  })

  it('load the titration lab at #/lab/titration, lazily', async () => {
    const { path, route } = page('/lab/titration')
    expect(path).toBe('lab/titration')
    expect(typeof route.lazy).toBe('function')
    expect(route.element).toBeUndefined()
    const loaded = await (route.lazy as () => Promise<{ Component: unknown }>)()
    expect(loaded.Component).toBe(TitrationPage)
  })

  it('load the aqueous reactions lab at #/lab/aqueous, lazily', async () => {
    const { path, route } = page('/lab/aqueous')
    expect(path).toBe('lab/aqueous')
    expect(typeof route.lazy).toBe('function')
    expect(route.element).toBeUndefined()
    const loaded = await (route.lazy as () => Promise<{ Component: unknown }>)()
    expect(loaded.Component).toBe(AqueousPage)
    expect(page('/lab/aqueous/3')).toMatchObject({ path: '*' })
  })

  it('still open the list of labs at #/lab, with no chunk to load, and send an address below a lab to the not-found page', () => {
    const { path, route } = page('/lab')
    expect(path).toBe('lab')
    expect(route.lazy).toBeUndefined()
    expect((route.element as { type: unknown }).type).toBe(Lab)
    expect(page('/lab/titration/more')).toMatchObject({ path: '*' })
    expect(page('/lab/nowhere')).toMatchObject({ path: '*' })
  })

  it('open Home at the root', () => {
    expect(page('/')).toMatchObject({ index: true })
  })
})
