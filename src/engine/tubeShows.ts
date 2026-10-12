// What is seen of a test tube, as an engine hands it to a page: the one shape for every lab that draws a tube and
// lets it be explored (the Group I cations lab and the Le Chatelier's principle lab), so that one drawing serves
// them. It holds the record's words for colours and nothing of what anything is.

/** What is seen of a tube, in the record's words for colours, and nothing of what it is. */
export interface TubeShows {
  /** Null for a tube with no liquid in it. `cloudy` where a solid is spread through it. */
  liquid: { colour: string; cloudy: boolean; microlitres: number } | null
  /** Null for a tube with no solid in it. `settled` once it is at the bottom; false while it is spread through the liquid. */
  solid: { colour: string; settled: boolean } | null
}
