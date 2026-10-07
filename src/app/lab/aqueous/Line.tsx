import { useState, type ReactNode } from 'react'
import { ROLE } from '@/app/lab/roles'
import { saidAgain } from '@/app/lab/shellText'

export interface Said {
  text: string
  /** The text is why a press did nothing: the line is drawn in the role of a held reason. */
  held: boolean
}

/**
 * What a card's message line says, and the way to say the next thing in it. A sentence said twice running says
 * that it is said again, so that the line, a live region, changes and is spoken. `initial` is what the line holds
 * when the card is first drawn, which is not spoken.
 */
export function useSaid(initial = ''): [said: Said, say: (text: string, held?: boolean) => void] {
  const [said, setSaid] = useState<Said>({ text: initial, held: false })
  return [said, (text, held = false) => setSaid((was) => ({ text: saidAgain(text, was.text), held }))]
}

/** The mark in front of a feedback sentence: a tick for a correct entry, a cross for one that is not. For the eye; the sentence says it. */
export const Mark = ({ ok }: { ok: boolean }) => (
  <span aria-hidden="true" className={ok ? ROLE.done : ROLE.failed}>
    {ok ? '✓ ' : '✕ '}
  </span>
)

/** A card's message line: a status paragraph that is always there, and empty until there is something to say. `mark` goes in front of the words and is for the eye. */
export function Line({ said, mark }: { said: Said; mark?: ReactNode }) {
  return (
    <p role="status" className={said.held ? ROLE.held : undefined}>
      {said.text !== '' && mark}
      {said.text}
    </p>
  )
}
