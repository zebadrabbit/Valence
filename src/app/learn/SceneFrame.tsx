import { lazy, Suspense, useState } from 'react'
import { VIEWER_FAILURE_TEXT } from '@/app/explore/views'
import { ViewerBoundary, hasWebgl } from '@/app/explore/webgl'
import { Button } from '@/components/ui/button'
import type { Mechanism, MechanismState } from '@/mechanisms'
import { Beaker } from './Beaker'
import { PAGE_TEXT, speciesLabel } from './text'

// The dynamic import is the chunk boundary: three and @react-three/fiber are fetched when the page first shows a scene.
const MechanismScene = lazy(() => import('./scene/MechanismScene').then((m) => ({ default: m.MechanismScene })))

export interface SceneFrameProps {
  mechanism: Mechanism
  /** `state(mechanism, t)`: all that is drawn comes from it. */
  state: MechanismState
  /** The scene in words, and the id of the element that holds them for the picture's description. */
  description: string
  describedBy: string
  /** The species looked at, by its place in `state.species`, or null; and a look at one, or at none. */
  looked: number | null
  onLook(index: number | null): void
  /** The dark theme is in effect. */
  dark: boolean
}

/** Whether the frame draws the scene in 3D: false where the browser has no WebGL, where the description stands in the scene's place. */
export function useScene(): { failed: 'webgl' | 'other' | null; onFail(why: 'webgl' | 'other'): void } {
  const [failed, onFail] = useState<'webgl' | 'other' | null>(() => (hasWebgl() ? null : 'webgl'))
  return { failed, onFail }
}

/**
 * The centre of the page: the 3D scene, or at a bookend the drawn beaker laid over it. The canvas stays mounted
 * under the beaker, so that the scene is there at once when the timeline leaves the bookend. Where the 3D scene
 * cannot start or be drawn, the frame holds the scene in words, and the page works as it does with it.
 */
export function SceneFrame({ mechanism, state, description, describedBy, looked, onLook, dark, failed, onFail }: SceneFrameProps & ReturnType<typeof useScene>) {
  const [contextLost, setContextLost] = useState(false)
  // The learner's own turn or zoom of the scene, and their asking for the chapter's view back.
  const [ownView, setOwnView] = useState(false)
  const [viewReset, setViewReset] = useState(0)
  const { chapter } = state
  const bookend = chapter.kind === 'bookend'
  const lookedAt = looked === null ? undefined : state.species[looked]
  return (
    <>
      {/* data-look: a tap inside the frame is the scene's own to answer, and does not put a callout away. */}
      <div data-look className="relative h-80 overflow-hidden rounded-lg border bg-muted @2xl:h-96">
        {failed ? (
          !bookend && (
            <div className="h-full overflow-auto p-4 text-sm">
              <p className="font-medium">
                {VIEWER_FAILURE_TEXT[failed]} {PAGE_TEXT.noScene}
              </p>
              <p className="mt-2 max-w-prose">{description}</p>
            </div>
          )
        ) : (
          // Hidden, not unmounted, under the beaker.
          <div className={bookend ? 'invisible h-full' : 'h-full'}>
            <ViewerBoundary onFail={onFail}>
              <Suspense fallback={<p className="flex h-full items-center justify-center p-4 text-center text-sm">{PAGE_TEXT.loading}</p>}>
                <MechanismScene
                  state={state}
                  looked={lookedAt ? looked : null}
                  onLook={onLook}
                  callout={lookedAt ? speciesLabel(mechanism, lookedAt) : ''}
                  dark={dark}
                  label={PAGE_TEXT.scene}
                  describedBy={describedBy}
                  onContextLost={setContextLost}
                  viewReset={viewReset}
                  onOwnView={setOwnView}
                />
              </Suspense>
            </ViewerBoundary>
          </div>
        )}
        {ownView && !bookend && !failed && (
          <Button type="button" variant="outline" className="absolute right-2 bottom-2 h-11" onClick={() => setViewReset(viewReset + 1)}>
            {PAGE_TEXT.resetView}
          </Button>
        )}
        {bookend && (
          <div className="absolute inset-0">
            <Beaker after={chapter.range[1] === 1} through={(state.t - chapter.range[0]) / (chapter.range[1] - chapter.range[0])} />
          </div>
        )}
      </div>
      {/* Always in the page, so that filling it is announced. */}
      <p role="status" className="mt-2 text-sm empty:mt-0">
        {contextLost && !bookend && !failed && PAGE_TEXT.paused}
      </p>
    </>
  )
}

/**
 * What is in the scene, by name, for a learner who is not using the picture: those that take part in the chapter,
 * then those that look on; while a question waits (`asked`), all of them in one list. Pointing at one, focusing it or tapping it looks at it, which puts its callout on it in
 * the scene, as pointing at it there does.
 */
export function SceneList({ mechanism, state, looked, onLook, asked }: Pick<SceneFrameProps, 'mechanism' | 'state' | 'looked' | 'onLook'> & { asked: boolean }) {
  const members = state.species.map((one, index) => ({ one, index }))
  // Which of them the step is about is part of the answer to its question: while one waits, they are one list.
  const groups = asked ? [[PAGE_TEXT.inScene, null] as const] : [[PAGE_TEXT.takingPart, true] as const, [PAGE_TEXT.lookingOn, false] as const]
  return (
    <section aria-label={PAGE_TEXT.inScene} className="grid gap-1.5 text-sm">
      {groups.map(([heading, active]) => {
        const group = members.filter(({ one }) => active === null || one.active === active)
        return (
          group.length > 0 && (
            <div key={heading} className="grid gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
              <ul className="flex flex-wrap gap-1.5">
                {group.map(({ one, index }) => (
                  <li key={index}>
                    <button
                      type="button"
                      data-look
                      // The one looked at has a heavy edge, as its callout has in the scene.
                      className={`min-h-11 cursor-pointer rounded-md border px-3 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${looked === index ? 'border-foreground bg-muted font-medium' : ''}`}
                      onPointerEnter={(event) => event.pointerType === 'mouse' && onLook(index)}
                      onPointerLeave={(event) => event.pointerType === 'mouse' && onLook(null)}
                      onFocus={() => onLook(index)}
                      onBlur={() => onLook(null)}
                      onClick={() => onLook(index)}
                      onKeyDown={(event) => event.key === 'Escape' && onLook(null)}
                    >
                      {speciesLabel(mechanism, one)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        )
      })}
    </section>
  )
}
