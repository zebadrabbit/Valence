import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppStateProvider } from '@/app/AppState'
import { Layout } from '@/app/Layout'
import { About } from '@/app/pages/About'
import { Explore } from '@/app/pages/Explore'
import { Home } from '@/app/pages/Home'
import { Lab } from '@/app/pages/Lab'
import { Learn } from '@/app/pages/Learn'
import { NotFound } from '@/app/pages/NotFound'
import { Settings } from '@/app/pages/Settings'

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'explore', element: <Explore /> },
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
