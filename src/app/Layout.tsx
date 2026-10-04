import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NAV } from './nav'
import { focusesHeading } from './navigationFocus'
import { CommandPalette } from './palette/CommandPalette'

export function Layout() {
  // The rail starts collapsed on narrow screens.
  const [expanded, setExpanded] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  // After each navigation, focus the new page's h1, unless focusesHeading says to leave focus where it is.
  const location = useLocation()
  const navigationType = useNavigationType()
  const [firstLocation] = useState(location)
  useEffect(() => {
    if (focusesHeading(navigationType, location.state, location === firstLocation)) document.querySelector<HTMLElement>('main h1')?.focus()
  }, [location, firstLocation, navigationType])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <button
        type="button"
        onClick={(e) => {
          // Hash router: an href="#main" would be read as the route /main.
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2"
      >
        Skip to content
      </button>

      <nav
        id="rail"
        aria-label="Main"
        className={`flex shrink-0 flex-col gap-1 border-r bg-sidebar p-2 ${expanded ? 'w-52' : 'w-14'}`}
      >
        <Button
          variant="ghost"
          className="justify-start"
          aria-expanded={expanded}
          aria-controls="rail"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          <span className={expanded ? '' : 'sr-only'}>{expanded ? 'Collapse menu' : 'Expand menu'}</span>
        </Button>

        <CommandPalette expanded={expanded} />

        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={expanded ? undefined : label}
            className={({ isActive }) =>
              `flex h-9 items-center gap-2 rounded-md px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/60'
              }`
            }
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className={expanded ? '' : 'sr-only'}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-6 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
