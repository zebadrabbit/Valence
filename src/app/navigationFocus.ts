/**
 * Whether focus goes to the new page's h1 after a navigation, so that keyboard and screen-reader users land on
 * the page they asked for (v1 spec 11). Not when the app first loads. Not when the link that was followed asked
 * to stay put with the router state `keepFocus`: a toggle within one page, or a cell of the periodic table
 * (periodic table spec 8). Back or Forward to such an address arrives from another page, where that link has
 * no focus to keep: without the h1, focus would be left on nothing.
 */
export function focusesHeading(navigationType: 'POP' | 'PUSH' | 'REPLACE', state: unknown, firstLocation: boolean): boolean {
  if (firstLocation) return false
  return navigationType === 'POP' || !(state as { keepFocus?: boolean } | null)?.keepFocus
}
