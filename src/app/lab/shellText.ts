// The lab shell's own wording, shared by every lab.

export const SHELL_TEXT = {
  guided: 'Guided: a checklist of the steps, a warning before you skip one that matters, and hints as you go.',
  challenge: 'Challenge: no checklist, warnings or hints. Mistakes carry into your result and are named afterwards.',
  start: 'Start the lab',
  restart: 'Restart lab',
  restartConfirm: 'Restart this lab? Everything recorded in this run will be erased. This cannot be undone.',
  primer: 'Primer: the ideas behind this lab',
  modeLocked: 'The mode can be changed between trials, not during one.',
  planned: 'Planned. Not built yet.',
  setAside:
    'A saved run of this lab could not be opened in this version of Valence. It has been kept, and "Export my progress" on the Settings page includes it. The lab starts fresh here.',
}

/** What each Sources control of a lab says about what it shows that no source is cited for. */
export const UNSOURCED_TEXT = {
  primer: "What a card says about this lab's own set-up, rules and model, and the arithmetic of its examples, is Valence's own and is read in no source.",
  model: "The model's other values are this lab's own choices, each stored with its reason, and are read in no source.",
  hazards: 'The note on the strength used here is written by Valence from the sources listed for it.',
}

/** What a window too narrow for the bench shows in its place: the title, the body, then one of the two closing sentences. */
export const NARROW_NOTICE = {
  title: 'This lab needs a wider window.',
  body: 'The bench is shown in windows at least 768 pixels wide. Use a wider window, a tablet turned sideways, or a computer; if the page is zoomed in, zooming out brings the bench back. Progress is kept in the browser it was made in, so a run started on another device will not appear here.',
  withRun: 'Below are the primer and the record of your saved run.',
  withoutRun: 'Below is the primer.',
}
