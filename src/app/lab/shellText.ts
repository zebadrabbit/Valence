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
}

/** What a window too narrow for the bench shows in its place: the title, the body, then one of the two closing sentences. */
export const NARROW_NOTICE = {
  title: 'This lab needs a wider window.',
  body: 'The bench is shown in windows at least 768 pixels wide. Use a wider window, a tablet turned sideways, or a computer; if the page is zoomed in, zooming out brings the bench back. Progress is kept in the browser it was made in, so a run started on another device will not appear here.',
  withRun: 'Below are the primer and the notebook of your saved run.',
  withoutRun: 'Below is the primer.',
}
