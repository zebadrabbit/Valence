import { Atom, FlaskConical, GraduationCap, House, Info, Settings } from 'lucide-react'

/** The app pages, as the navigation rail and the command palette list them. */
export const NAV = [
  { to: '/', label: 'Home', icon: House },
  { to: '/explore', label: 'Explore', icon: Atom },
  { to: '/lab', label: 'Lab', icon: FlaskConical },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info },
]
