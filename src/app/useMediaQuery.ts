import { useSyncExternalStore } from 'react'

/** Whether the media query matches now, kept up to date. It reads the browser, so it has no value on a server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}
