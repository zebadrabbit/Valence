// How this lab's page plays the time of a run. The playing itself is the shared piece of the two labs on the
// kinetics engine (src/app/lab/kinetics/play.ts), handed on here under the names this lab's page and its tests
// use: it reads no clock, and from the frame that shows the end of a run the watch adds true time. What is this
// lab's own is the speed.

/**
 * How many seconds of the lab's time pass in one true second while the colour of a run is still to be seen: one
 * figure for all four mixtures, so that what the lab is about is felt as well as read. The mixture with twice the
 * iodine takes twice as long to fade on the screen too, and the two with twice the acetone or twice the acid half
 * as long. The page's own: chosen so that the slowest run, the fourth mixture, whose fade takes up to 785 s of the
 * lab's time at any room and scatter the draw can give, is watched for about 14 true seconds at the most; the
 * fastest then takes a little over two (watch.test.ts holds both over seeds 1 to 100). The figure is not shown.
 */
export const SPEED = 56

export { endsItself, firstChanged, frame, handStop, labMsAt, PLAY, startPlay, tooSoon, type Play } from '@/app/lab/kinetics/play'
