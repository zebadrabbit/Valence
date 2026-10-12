// What is seen of a test tube, as an engine hands it to a page: the one shape for every lab that draws a tube and
// lets it be explored (the Group I cations lab and the Le Chatelier's principle lab), so that one drawing serves
// them. It holds the record's words for colours and nothing of what anything is.
//
// A tube may hold a second liquid lying on the first (the polarity and mixing lab): `above`, which no other lab
// sets. Each layer has its own volume, so its share of the height the liquids fill is its volume over the sum of
// the two, and the tube is filled to the sum.

/** What is seen of a tube, in the record's words for colours, and nothing of what it is. */
export interface TubeShows {
  /** Null for a tube with no liquid in it. `cloudy` where a solid is spread through it. */
  liquid: { colour: string; cloudy: boolean; microlitres: number } | null
  /** A second liquid lying on `liquid`, which is then the lower layer. Absent from a tube of one liquid or of none: never set without `liquid`. */
  above?: { colour: string; cloudy: boolean; microlitres: number }
  /** Null for a tube with no solid in it. `settled` once it is at the bottom; false while it is spread through the liquid. */
  solid: { colour: string; settled: boolean } | null
}
