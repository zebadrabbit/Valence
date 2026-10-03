import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

createRoot(root).render(
  <StrictMode>
    <h1 className="p-6 text-2xl font-semibold">Valence</h1>
  </StrictMode>,
)
