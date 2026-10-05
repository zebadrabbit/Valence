// The open stopcock, counted in additions and never in volumes: how much one addition is belongs to the engine, and
// no volume crosses to it from here. The bench's timer calls streamTick; nothing in this file reads a clock.

/** One addition every 400 ms. A starting value, judged by the owner in the browser. */
export const STREAM_INTERVAL_MS = 400
/** The measured pours, in additions: 1 mL and 5 mL at the model's 0.25 mL an addition. */
export const POUR_ADDITIONS = [4, 20] as const

/**
 * Closed, or open. `pour` is the measured pour that was asked for, null for a stream left open until it is closed,
 * and so also says which button opened it; `remaining` is how many additions of that pour are still to come.
 */
export type Stream = { open: false } | { open: true; pour: number | null; remaining: number | null }

export const CLOSED: Stream = { open: false }

export function openStream(pour: number | null): Stream {
  return { open: true, pour, remaining: pour }
}

/**
 * One tick of the timer: whether to deliver an addition now, and the stream afterwards. `canDeliver` is the engine's
 * word that an addition can be made; when it cannot, nothing is delivered and the stream closes.
 */
export function streamTick(stream: Stream, canDeliver: boolean): { deliver: boolean; next: Stream } {
  if (!stream.open || !canDeliver) return { deliver: false, next: CLOSED }
  if (stream.remaining === null) return { deliver: true, next: stream }
  const remaining = stream.remaining - 1
  return { deliver: true, next: remaining > 0 ? { ...stream, remaining } : CLOSED }
}
