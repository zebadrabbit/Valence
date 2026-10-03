import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Atom, FlaskConical, GraduationCap, House, Info, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NAV = [
  { to: '/', label: 'Home', icon: House },
  { to: '/explore', label: 'Explore', icon: Atom },
  { to: '/lab', label: 'Lab', icon: FlaskConical },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info },
]

export function Layout() {
  // The rail starts collapsed on narrow screens.
  const [expanded, setExpanded] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2"
      >
        Skip to content
      </a>

      <nav
        id="rail"
        aria-label="Main"
        className={`flex shrink-0 flex-col gap-1 border-r bg-sidebar p-2 ${expanded ? 'w-52' : 'w-14'}`}
      >
        <Button
          variant="ghost"
          className="mb-2 justify-start"
          aria-expanded={expanded}
          aria-controls="rail"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          <span className={expanded ? '' : 'sr-only'}>{expanded ? 'Collapse menu' : 'Expand menu'}</span>
        </Button>

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
