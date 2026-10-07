import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOSED, CLOSED_UNSEEN, openStream, STREAM_INTERVAL_MS, streamTick, type Stream } from './stream'

/**
 * The open stopcock: the only clock on the bench. While a stream or a measured pour is open it asks streamTick once
 * every STREAM_INTERVAL_MS, the first time one interval after opening, and calls `deliver` for each addition; how
 * much an addition is belongs to the engine. `canDeliver` is the engine's word that an addition can be made.
 *
 * The stopcock closes itself when the engine can take no more, when a pour is done, when the page is hidden (a
 * hidden tab runs its timers late and unseen), when the bench unmounts, and when `slowDown` turns true while it is
 * open: Guided's hint. A stream opened again while the hint still shows stays open. Escape closes it wherever
 * focus is on the page.
 *
 * It also closes itself when `shown` turns false, which is the lab page showing another of its tabs with the bench
 * still mounted: nothing runs in unseen. That it was closed for the learner is said when the bench is shown again,
 * not before, so that the message line changes where it can be seen and heard.
 *
 * `closedBySelfAt` is when it last closed itself, as performance.now() gives it, and null after a close the learner
 * made: a press aimed at closing a stream can land just after it has closed itself, and must not open it again.
 */
export function useStream(
  canDeliver: boolean,
  deliver: () => void,
  slowDown: boolean,
  shown = true,
): { stream: Stream; open(pour: number | null): void; close(): void; closedBySelfAt: number | null } {
  const [state, setState] = useState<{ stream: Stream; closedBySelfAt: number | null }>({ stream: CLOSED, closedBySelfAt: null })
  // What the timer reads when it fires: the stream as it is at that moment, rendered or not, and the engine's latest word.
  const live = useRef({ stream: CLOSED, canDeliver, deliver })
  useEffect(() => {
    live.current.canDeliver = canDeliver
    live.current.deliver = deliver
  })
  const set = useCallback((stream: Stream, bySelf = false) => {
    live.current.stream = stream
    setState({ stream, closedBySelfAt: bySelf ? performance.now() : null })
  }, [])
  const closeItself = useCallback(() => {
    if (live.current.stream.open) set(CLOSED, true)
  }, [set])

  const isOpen = state.stream.open
  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => {
      const { deliver, next } = streamTick(live.current.stream, live.current.canDeliver)
      if (deliver) live.current.deliver()
      if (next !== live.current.stream) set(next, !next.open)
    }, STREAM_INTERVAL_MS)
    const onHidden = () => {
      if (document.hidden) closeItself()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') set(CLOSED)
    }
    document.addEventListener('visibilitychange', onHidden)
    document.addEventListener('keydown', onKey)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHidden)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, set, closeItself])

  // At once, not at the next tick: an overshot flask or an empty burette is not drawn under an open stopcock.
  useEffect(() => {
    if (!canDeliver) closeItself()
  }, [canDeliver, closeItself])
  // Only when the hint turns on, so a stream opened again while it still shows is left open.
  useEffect(() => {
    if (slowDown) closeItself()
  }, [slowDown, closeItself])

  const closedUnseen = useRef(false)
  useEffect(() => {
    if (!shown) {
      closedUnseen.current ||= live.current.stream.open
      closeItself()
    } else if (closedUnseen.current) {
      closedUnseen.current = false
      set(CLOSED_UNSEEN)
    }
  }, [shown, set, closeItself])

  return {
    stream: state.stream,
    open: (pour) => {
      if (!live.current.stream.open) set(openStream(pour))
    },
    close: () => {
      if (live.current.stream.open) set(CLOSED)
    },
    closedBySelfAt: state.closedBySelfAt,
  }
}
