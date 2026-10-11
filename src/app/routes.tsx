import type { RouteObject } from 'react-router'
import { Layout } from '@/app/Layout'
import { About } from '@/app/pages/About'
import { Home } from '@/app/pages/Home'
import { Lab } from '@/app/pages/Lab'
import { Learn } from '@/app/pages/Learn'
import { NotFound } from '@/app/pages/NotFound'
import { Settings } from '@/app/pages/Settings'

// Every address of the app. The Explore routes, each lab and the mechanism timeline load lazily so the molecule
// data, the periodic table, a lab's engine and primer and the mechanism's record stay out of the main chunk. The router finishes a navigation only once the chunk
// has loaded.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    // Shown only when the app is opened directly on a lazy route.
    hydrateFallbackElement: <p className="p-6 text-muted-foreground">Loading…</p>,
    children: [
      { index: true, element: <Home /> },
      { path: 'explore', lazy: async () => ({ Component: (await import('@/app/pages/Explore')).Explore }) },
      // One route for the table with and without an element, so choosing the first element does not remount the page.
      {
        path: 'explore/elements/:symbol?',
        lazy: async () => ({ Component: (await import('@/app/explore/elements/PeriodicTablePage')).PeriodicTablePage }),
      },
      {
        path: 'explore/:id',
        lazy: async () => ({ Component: (await import('@/app/pages/MoleculePage')).MoleculePage }),
      },
      { path: 'lab', element: <Lab /> },
      { path: 'lab/titration', lazy: async () => ({ Component: (await import('@/app/lab/titration/TitrationPage')).TitrationPage }) },
      { path: 'lab/aqueous', lazy: async () => ({ Component: (await import('@/app/lab/aqueous/AqueousPage')).AqueousPage }) },
      { path: 'lab/flame', lazy: async () => ({ Component: (await import('@/app/lab/flame/FlamePage')).FlamePage }) },
      { path: 'lab/calorimetry', lazy: async () => ({ Component: (await import('@/app/lab/calorimetry/CalorimetryPage')).CalorimetryPage }) },
      { path: 'lab/cations', lazy: async () => ({ Component: (await import('@/app/lab/cations/CationsPage')).CationsPage }) },
      { path: 'lab/le-chatelier', lazy: async () => ({ Component: (await import('@/app/lab/lechatelier/LechatelierPage')).LechatelierPage }) },
      { path: 'lab/clock-reaction', lazy: async () => ({ Component: (await import('@/app/lab/clock/ClockPage')).ClockPage }) },
      { path: 'learn', element: <Learn /> },
      { path: 'learn/hcl-nahco3', lazy: async () => ({ Component: (await import('@/app/learn/MechanismPage')).MechanismPage }) },
      { path: 'settings', element: <Settings /> },
      { path: 'about', element: <About /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
