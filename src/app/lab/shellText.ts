// The lab shell's own wording, shared by every lab.

export const SHELL_TEXT = {
  guided: 'Guided: a checklist of the steps, a warning before you skip one that matters, and hints as you go.',
  challenge: 'Challenge: no checklist, warnings or hints. Mistakes carry into your result and are named afterwards.',
  /** The mode's choice is closed until it is opened: the one line that stands for it, and the name of each mode in that line. */
  mode: 'Mode',
  modeName: { guided: 'Guided', challenge: 'Challenge' },
  start: 'Start the lab',
  restart: 'Restart lab',
  restartConfirm: 'Restart this lab? Everything recorded in this run will be erased. This cannot be undone.',
  /** The three tabs of a lab page, at every width. */
  tabs: { primer: 'Primer', lab: 'Lab', record: 'Record' },
  /** A link in the tab bar, which opens the periodic table in a new browser tab. */
  periodicTable: 'Periodic table',
  newTab: '(opens in a new tab)',
  /** On the Lab tab and on the Record tab, before a run is started. */
  notStarted: 'No run of this lab has been started. Choose a mode above, then start the lab.',
  noRecord: 'No run of this lab has been started, so there is no record yet.',
  modeLocked: 'The mode can be changed between trials, not during one.',
  planned: 'Planned. Not built yet.',
  setAside:
    'A saved run of this lab could not be opened in this version of Valence. It has been kept, and "Export my progress" on the Settings page includes it. The lab starts fresh here.',
}

/**
 * A sentence for a message line, never the same text as `previous`, the line as it stands: a live region speaks
 * only when its text changes, so a sentence that is said twice running says that it is said again.
 */
export const saidAgain = (text: string, previous: string) => (text !== '' && text === previous ? `Again: ${text}` : text)

/** A panel that floats over a lab's page: the name of its grip and of its close button, from the panel's own name. */
export const PANEL_TEXT = {
  move: (name: string) => `${name}. Drag, or use the arrow keys, to move it`,
  close: (name: string) => `Close ${name[0]!.toLowerCase()}${name.slice(1)}`,
}

/** The calculator that floats over a lab's page. */
export const CALCULATOR_TEXT = {
  name: 'Calculator',
  sum: 'Sum',
  clear: 'Clear',
  back: 'Delete the last character',
  equals: 'Equals',
  notASum: 'That is not a sum the calculator can work out.',
  note: 'Every digit is shown: round only your final answer.',
}

/** The primer's own controls: the list of its topics, where the card shown stands in it, the mark on a topic to read before the bench, and the two ways on. */
export const PRIMER_TEXT = {
  topics: 'Topics',
  place: (number: number, total: number) => `Topic ${number} of ${total}`,
  readFirst: 'Read first',
  previous: (heading: string) => `Previous: ${heading}`,
  next: (heading: string) => `Next: ${heading}`,
  ruleKey: 'A sentence set off like this one is a rule of this simulation, not of a real bench.',
}

/** What each Sources control of a lab says about what it shows that no source is cited for. */
export const UNSOURCED_TEXT = {
  primer: "What a card says about this lab's own set-up, rules and model, and the arithmetic of its examples, is Valence's own and is read in no source.",
  model: "The model's other values are this lab's own choices, each stored with its reason, and are read in no source.",
  hazards: 'The note on the strength used here is written by Valence from the sources listed for it.',
  hazardsSolid: 'The note on the reagent as it is used here is written by Valence from the sources listed for it.',
}

/** The headings and the one sentence of a bottle's Hazards that are not the record's. */
export const HAZARDS_TEXT = {
  strength: 'At the strength used here',
  /** Over the note of a solid or a metal, which has no strength. */
  asUsed: 'As it is used here',
  none: 'This safety data sheet lists no signal word and no hazard statement.',
}

/** What a window too narrow for the bench shows on the Lab tab in its place: the title, the body, then one of the two closing sentences. */
export const NARROW_NOTICE = {
  title: 'This lab needs a wider window.',
  body: 'The bench is shown in windows at least 768 pixels wide. Use a wider window, a tablet turned sideways, or a computer; if the page is zoomed in, zooming out brings the bench back. Progress is kept in the browser it was made in, so a run started on another device will not appear here.',
  withRun: 'The primer and the record of your saved run are on the other two tabs.',
  withoutRun: 'The primer is on the Primer tab.',
}
