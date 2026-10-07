// The colour roles of a lab page: the class of lab.css that each kind of text carries. Colour here is an added cue
// and never the carrier: whatever carries a role says the same in its words or by a mark, and the page reads the
// same with every one of these classes taken off.

export const ROLE = {
  /** A figure or a name the learner reads off the bench or the notebook and uses. */
  value: 'lab-value',
  /** The label of a field that is waiting for an entry now. A field that is done, or cannot be used, does not carry it. */
  entry: 'lab-entry',
  /** The tick of a step that is done, and a result that is good. */
  done: 'lab-done',
  /** A result that is not: a trial that failed or has no usable titre. The theme's own destructive colour. */
  failed: 'lab-failed',
  /** The flask's status words while the flask is pink, and deeper once it is overshot. */
  pink: 'lab-pink',
  deepPink: 'lab-pink-deep',
  /** The sentence that says why something cannot be done now. */
  held: 'lab-held',
} as const
