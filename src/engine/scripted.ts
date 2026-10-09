// For tests only: nothing in the app imports this file.

/**
 * A scripted learner's run. The function it returns applies the actions in order and throws on one that cannot be
 * done, so a script cannot skip a step unseen. `through` is applied to the state after every action: the resume
 * tests pass a round trip through JSON. Each lab's testkit hands in its own `can` and `reduce`.
 */
export const scripted =
  <Data, State, Action extends { type: string }>(can: (data: Data, state: State, action: Action) => string | null, reduce: (data: Data, state: State, action: Action) => State) =>
  (data: Data, state: State, actions: readonly Action[], through: (state: State) => State = (s) => s): State => {
    for (const action of actions) {
      const blocked = can(data, state, action)
      if (blocked) throw new Error(`${action.type}: ${blocked}`)
      state = through(reduce(data, state, action))
    }
    return state
  }
