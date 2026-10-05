/**
 * A passage of a source whose words are not this project's to copy: where it is (the heading or section, and the
 * address) and, in this project's own words, what it establishes. `establishes` completes "It establishes that".
 */
export function located(url: string, where: string, establishes: string): string {
  return `not quoted; see ${where}, ${url}. It establishes that ${establishes}`
}
