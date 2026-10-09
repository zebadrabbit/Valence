import { Pause, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { Control } from '@/app/lab/Control'
import { PRIMER_TEXT } from '@/app/lab/shellText'
import { chapterAt, stepsOf, timescaleLabel, type Mechanism } from '@/mechanisms'
import { PAGE_TEXT, chapterBrief, chapterName, positionText } from './text'
import { SLIDER_STEP, TRACK, fromSlider, sliderValue, ways } from './timeline'

export interface TimelineProps {
  mechanism: Mechanism
  t: number
  /** The steps whose names Challenge keeps back. */
  kept: ReadonlySet<string>
  playing: boolean
  reducedMotion: boolean
  /** A question waits: Play and Next stay where they are and say why when pressed. Scrubbing is never held. */
  held: boolean
  onSeek(t: number): void
  onPrevious(): void
  onNext(): void
  onPlay(): void
  /** The message line, under the buttons. */
  line: ReactNode
}

const BUTTON = 'min-h-11 h-auto max-w-full py-1.5 text-left whitespace-normal'

/**
 * The timeline under the scene: Play or Pause, Previous and Next named by where they go, a native range input over
 * the whole track, and under it the seven chapters, each as wide as its share of the track, with the real timescale
 * of the step the timeline is in as its label (spec 9.1). The track is not linear in time. Under the reduced-motion setting there is no
 * Play: nothing moves unless the learner moves it. A button that cannot be used now stays focusable.
 */
export function Timeline({ mechanism, t, kept, playing, reducedMotion, held, onSeek, onPrevious, onNext, onPlay, line }: TimelineProps) {
  const current = chapterAt(mechanism, t)
  const { previous, next } = ways(mechanism, t)
  const steps = stepsOf(mechanism)
  const brief = (chapterId: string) => chapterBrief(mechanism, chapterId, kept)
  const realTime = timescaleLabel(current)
  return (
    // data-timeline: the energy panel opens under it in a narrow window.
    <div data-timeline className="grid gap-1">
      <div className="flex flex-wrap items-start gap-2">
        {!reducedMotion && (
          <Control unavailable={held && !playing} className={BUTTON} onClick={onPlay}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {playing ? PAGE_TEXT.pause : t >= 1 ? PAGE_TEXT.replay : PAGE_TEXT.play}
          </Control>
        )}
        <Control unavailable={previous === null} className={BUTTON} onClick={onPrevious}>
          <span aria-hidden="true">←</span> {previous?.chapter ? PRIMER_TEXT.previous(brief(previous.chapter.id)) : PAGE_TEXT.toStart}
        </Control>
        <Control unavailable={next === null || held} className={`${BUTTON} ml-auto`} onClick={onNext}>
          {next?.chapter ? PRIMER_TEXT.next(brief(next.chapter.id)) : PAGE_TEXT.toEnd} <span aria-hidden="true">→</span>
        </Control>
      </div>
      {line}
      {reducedMotion && <p className="text-sm text-muted-foreground">{PAGE_TEXT.noPlay}</p>}
      <input
        type="range"
        aria-label={PAGE_TEXT.timeline}
        aria-valuetext={positionText(mechanism, t, kept)}
        min={0}
        max={TRACK}
        step={SLIDER_STEP}
        value={sliderValue(t)}
        onChange={(event) => onSeek(fromSlider(Number(event.target.value)))}
        className="h-11 w-full cursor-pointer accent-foreground"
      />
      {/* The thumb's travel stops half a thumb short of each end of the input, and so do the chapters. */}
      <ol aria-label={PAGE_TEXT.chapters} className="flex px-2 text-xs leading-tight">
        {mechanism.chapters.map((chapter) => {
          const number = steps.findIndex((step) => step.id === chapter.id) + 1
          const label = timescaleLabel(chapter)
          const here = chapter === current
          return (
            <li
              key={chapter.id}
              aria-current={here ? 'step' : undefined}
              style={{ flexGrow: chapter.range[1] - chapter.range[0] }}
              // The chapter the timeline is in has a heavy edge over it and a bold number, not a colour alone.
              className={`min-h-6 min-w-0 basis-0 border-l px-1 pt-1 text-center last:border-r ${here ? 'border-t-4 border-t-foreground font-bold' : 'border-t'}`}
            >
              {/* A share of the track is too narrow for a name: a step shows its number, and the heading has the rest. A screen reader is given the name, and a step's real time with it. */}
              {number > 0 && <span aria-hidden="true">{number}</span>}
              <span className="sr-only">
                {chapterName(mechanism, chapter.id, kept)}
                {/* The prologue's label says what its title says. */}
                {label !== null && !kept.has(chapter.id) && label.toLowerCase() !== chapter.title.toLowerCase() && `. ${PAGE_TEXT.realTime(label)}`}
              </span>
            </li>
          )
        })}
      </ol>
      {/* The label of the step the timeline is in (spec 9.1); not while its question waits, which it could help to answer. Always there, so that the page does not jump as chapters go by. */}
      <p className="min-h-5 px-2 text-sm text-muted-foreground">{realTime !== null && !held && realTime.toLowerCase() !== current.title.toLowerCase() && PAGE_TEXT.realTime(realTime)}</p>
    </div>
  )
}
