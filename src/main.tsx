import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppStateProvider } from '@/app/AppState'
import { Layout } from '@/app/Layout'
import { About } from '@/app/pages/About'
import { Home } from '@/app/pages/Home'
import { Lab } from '@/app/pages/Lab'
import { Learn } from '@/app/pages/Learn'
import { NotFound } from '@/app/pages/NotFound'
import { Settings } from '@/app/pages/Settings'

// The Explore routes load lazily so the molecule data and the periodic table stay out of the main chunk.
// The router finishes a navigation only once the chunk has loaded.
const router = createHashRouter([
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
      { path: 'learn', element: <Learn /> },
      { path: 'settings', element: <Settings /> },
      { path: 'about', element: <About /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <AppStateProvider>
      <RouterProvider router={router} />
    </AppStateProvider>
  </StrictMode>,
)
