// The lab shell's own wording, shared by every lab.

export const SHELL_TEXT = {
  guided: 'Guided: a checklist of the steps, a warning before you skip one that matters, and hints as you go.',
  challenge: 'Challenge: no checklist, warnings or hints. Mistakes carry into your result and are named afterwards.',
  start: 'Start the lab',
  restart: 'Restart lab',
  restartConfirm: 'Restart this lab? Everything recorded in this run will be erased. This cannot be undone.',
  /** The three tabs of a lab page, at every width. */
  tabs: { primer: 'Primer', lab: 'Lab', record: 'Record' },
  /** On the Lab tab and on the Record tab, before a run is started. */
  notStarted: 'No run of this lab has been started. Choose a mode above, then start the lab.',
  noRecord: 'No run of this lab has been started, so there is no record yet.',
  modeLocked: 'The mode can be changed between trials, not during one.',
  planned: 'Planned. Not built yet.',
  setAside:
    'A saved run of this lab could not be opened in this version of Valence. It has been kept, and "Export my progress" on the Settings page includes it. The lab starts fresh here.',
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
}

/** What a window too narrow for the bench shows on the Lab tab in its place: the title, the body, then one of the two closing sentences. */
export const NARROW_NOTICE = {
  title: 'This lab needs a wider window.',
  body: 'The bench is shown in windows at least 768 pixels wide. Use a wider window, a tablet turned sideways, or a computer; if the page is zoomed in, zooming out brings the bench back. Progress is kept in the browser it was made in, so a run started on another device will not appear here.',
  withRun: 'The primer and the record of your saved run are on the other two tabs.',
  withoutRun: 'The primer is on the Primer tab.',
}
