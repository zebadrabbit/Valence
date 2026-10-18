import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { Disclosure, Sources } from '@/app/explore/InspectorCard'
import { CHOICE } from '@/app/lab/ChoiceForm'
import { Control } from '@/app/lab/Control'
import { Hazards } from '@/app/lab/Hazards'
import { Line, Mark, useSaid } from '@/app/lab/Line'
import { MoleculeLink } from '@/app/lab/pagePieces'
import { ROLE } from '@/app/lab/roles'
import { BottleTile, Listed, Marked } from '@/app/lab/stationPieces'
import { mixingPartCitations, mixingTubeCitations } from '@/chem-data/citations'
import { LIQUID_IDS, PART_IDS, SOLID_IDS, isPairId, type LiquidId, type MixingData, type PairId, type PartId, type SolidId, type SolidTubeId, type TubeId } from '@/chem-data/mixing/data'
import type { Source } from '@/chem-data/schema'
import { Button } from '@/components/ui/button'
import { benchView, can, pairOf, ruleView, solidTubeOf, tubeView, type Action, type MixingModel, type MixingState, type Outcome } from '@/engine/mixing'
import {
  BLOCKED_TEXT,
  CHOOSE_TEXT,
  FAMILY_LABEL,
  GUIDED_TEXT,
  HAZARD_TEXT,
  LAB_TEXT,
  MOLECULE_LINK,
  NOTES_TEXT,
  PAGE_TEXT,
  PART_AIM,
  RULE_TEXT,
  SOURCES_TEXT,
  benchLines,
  choiceLabel,
  countText,
  hazardsText,
  liquidHolds,
  liquidName,
  markText,
  pairName,
  pairOffBenchText,
  partName,
  partNotes,
  partNumber,
  questionText,
  ruleOutcomeText,
  solidHolds,
  solidInName,
  solidName,
  solidOffBenchText,
  sortQuestion,
  sortedLine,
} from './messages'
import { OFF_BENCH, opening, partMarks, tubeMark, type Status } from './pageLook'
import { CARD, HEADING, SHEET, Sheet } from './sheets'
import { CheckedLine, TubeCard } from './TubeCard'
import './mixing.css'

export interface MixingBenchProps {
  data: MixingData
  m: MixingModel
  sources: readonly Source[]
  state: MixingState
  /** The actions done, in order, as one save. */
  act(...actions: Action[]): void
  /** The part and the tube shown when the bench mounts; where the stored record says the learner was, unless told. The markup tests draw the others with it. */
  opensAt?: { part: PartId; tube?: TubeId | null }
}

type Parts = Pick<MixingBenchProps, 'data' | 'm' | 'sources' | 'state' | 'act'> & { headingRef: RefObject<HTMLHeadingElement | null> }

/**
 * The Lab tab of the polarity and mixing lab: the line that says the lab is complete, the three parts to choose
 * between, and the part shown. One part is drawn at a time, and in the first two one tube at a time. Changing part
 * moves focus to the part's heading, and choosing a tube to the tube's. The part and the tube shown, which parts of
 * a picture have been looked at and what a line last said are the bench's and are not stored.
 */
export function MixingBench({ data, m, sources, state, act, opensAt }: MixingBenchProps) {
  const [start] = useState(() => ({ ...opening(m, state), ...opensAt }))
  const [part, setPart] = useState<PartId>(start.part)
  // The tube shown in each of the first two parts: none until one is chosen, and then the part comes back to it.
  const [tubes, setTubes] = useState<{ liquids: PairId | null; solids: SolidTubeId | null }>(() => ({
    liquids: start.tube != null && isPairId(start.tube) ? start.tube : null,
    solids: start.tube != null && !isPairId(start.tube) ? start.tube : null,
  }))
  const [intro, setIntro] = useState(() => state.status !== 'completed' && benchView(m, state).countedTubes.length === 0 && start.tube == null)
  const heading = useRef<HTMLHeadingElement>(null)
  const status = partMarks(m, state)
  const was = useRef(part)
  useEffect(() => {
    if (was.current !== part) heading.current?.focus()
    was.current = part
  }, [part])
  const parts = { data, m, sources, state, act, headingRef: heading }

  return (
    <div className="grid gap-3">
      {/* Always there, and empty until the lab is complete, so that a screen reader says it when it comes; while it is empty it takes no room, the gap under it neither. */}
      <p role="status" className={`max-w-prose text-sm font-medium ${state.status === 'completed' ? '' : '-mb-3'}`}>
        {state.status === 'completed' && <Marked mark="✓" done>{LAB_TEXT.completed}</Marked>}
      </p>
      {/* What the lab is, over a lab that is not begun, until a tube or another part is chosen: the page is then another one, and the tube has the room. */}
      {intro && (part === 'rule' || tubes[part] === null) && <p className="max-w-prose text-sm">{LAB_TEXT.aim}</p>}
      {/* Three to a row at every width the bench has, each as wide as its words ask and a share of what is left. */}
      <nav aria-label={PAGE_TEXT.parts} className="flex gap-1.5 text-sm">
        {PART_IDS.map((partId) => (
          <button
            key={partId}
            type="button"
            aria-current={partId === part ? 'true' : undefined}
            onClick={() => {
              setPart(partId)
              setIntro(false)
              // The part already shown: its heading takes focus all the same.
              if (partId === part) heading.current?.focus()
            }}
            className="group grid min-h-11 flex-auto content-start rounded-md border border-l-4 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
          >
            {/* The number and the progress are grey on the page's ground, and the text's own colour on the grey ground of the part shown or under the pointer, as in the other labs' lists. */}
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">{partNumber(partId)}</span>
            <span>{partName(data, partId)}</span>
            <span className="text-xs font-normal text-muted-foreground group-hover:text-foreground group-aria-[current]:text-foreground">
              <Marked mark={status[partId].mark} done={status[partId].done}>{status[partId].text}</Marked>
            </span>
          </button>
        ))}
      </nav>
      {part === 'liquids' && <TubesPart {...parts} part="liquids" tube={tubes.liquids} onTube={(tube) => setTubes({ ...tubes, liquids: tube as PairId })} />}
      {part === 'solids' && <TubesPart {...parts} part="solids" tube={tubes.solids} onTube={(tube) => setTubes({ ...tubes, solids: tube as SolidTubeId })} />}
      {part === 'rule' && <RulePart {...parts} />}
    </div>
  )
}

/** The head of a part: which part it is and how it stands, and its name, which takes focus when the part comes to be shown. */
function PartHead({ data, part, status, headingId, headingRef }: { data: MixingData; part: PartId; status: Status; headingId: string; headingRef: Ref<HTMLHeadingElement> }) {
  const placeId = useId()
  return (
    <div className="grid gap-1">
      <p id={placeId} className="text-xs text-muted-foreground">
        {partNumber(part)}
        {' · '}
        <span className="font-medium text-foreground">
          <Marked mark={status.mark} done={status.done}>{status.text}</Marked>
        </span>
      </p>
      <h2 ref={headingRef} id={headingId} tabIndex={-1} aria-describedby={placeId} className="w-fit rounded-sm text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {partName(data, part)}
      </h2>
    </div>
  )
}

/** The notes of a part that is done, shown outright. */
function PartNotes({ data, part }: { data: MixingData; part: PartId }) {
  const notesId = useId()
  return (
    <section aria-labelledby={notesId} className="grid max-w-[75ch] gap-2 leading-relaxed">
      <h3 id={notesId} className={HEADING}>{NOTES_TEXT.part}</h3>
      {partNotes(data, part).map((note) => <p key={note}>{note}</p>)}
    </section>
  )
}

/**
 * The bench, one place that every part and every tube has: what stands on it, in words; what each thing is, with the
 * way to its molecule in the explorer where the library holds it; the tiles of the rubbing alcohol and the mineral
 * oil with their hazards, closed; and the one note that everything else on the bench shares (spec 25.3). The mineral
 * oil is the oil itself, with no strength, so its note is headed as it is used.
 */
function Bench({ data, sources }: { data: MixingData; sources: readonly Source[] }) {
  return (
    <div className="grid gap-3">
      <Listed items={benchLines(data)} />
      <ul className="grid max-w-prose gap-1">
        {data.liquids.map((liquid) => (
          <li key={liquid.id}>
            <span className="font-medium">{liquid.name}:</span> {liquidHolds(data, liquid.id)}
          </li>
        ))}
        {data.solids.map((solid) => (
          <li key={solid.id}>
            <span className="font-medium">{solid.name}:</span> {solidHolds(data, solid.id)}
          </li>
        ))}
      </ul>
      <Molecules of={[...LIQUID_IDS, ...SOLID_IDS]} data={data} />
      <h3 className="font-medium">{HAZARD_TEXT.heading}</h3>
      <div className="grid w-full max-w-2xl gap-2">
        {data.reagents.map((reagent) => (
          <BottleTile key={reagent.id} name={reagent.name} lines={reagent.name.split(' ').slice(0, 2)} rows={[]}>
            <p>{reagent.holds}</p>
            <Hazards classifiedAs={reagent.classifiedAs} hazards={reagent.hazards} sources={sources} solid={reagent.id === 'mineral-oil'} />
          </BottleTile>
        ))}
      </div>
      <div className="grid max-w-prose gap-1 rounded-md border p-2">
        <h4 className="font-medium">{HAZARD_TEXT.others}</h4>
        <p>{hazardsText(data, {}).text}</p>
      </div>
    </div>
  )
}

/** The way to the explorer for each of some liquids and solids that the record links to a molecule (spec 25.2): there from the start, since the picture of a molecule is not an answer. */
function Molecules({ data, of }: { data: MixingData; of: readonly (LiquidId | SolidId)[] }) {
  const linked = [...data.liquids, ...data.solids].filter((item) => of.includes(item.id) && item.moleculeId !== undefined && MOLECULE_LINK[item.id] !== undefined)
  return (
    <ul aria-label={PAGE_TEXT.molecules} className="-mx-2 flex flex-wrap gap-x-2">
      {linked.map((item) => (
        <li key={item.id}>
          <MoleculeLink id={item.moleculeId!}>{MOLECULE_LINK[item.id]}</MoleculeLink>
        </li>
      ))}
    </ul>
  )
}

/** Under a part or a tube: its sources, closed, and the bench. The two are lines of words with a hit area a finger tall laid over each, and stand 36 px apart and 16 px under what is over them, so that no area lies over another control. */
function Foot({ data, sources, cited, derived }: { data: MixingData; sources: readonly Source[]; cited: ReturnType<typeof mixingPartCitations>; derived: string }) {
  return (
    <div className="mt-4 grid gap-9 text-sm">
      <Sources citations={cited} derived={derived} />
      <Disclosure summary={PAGE_TEXT.bench}>
        <Bench data={data} sources={sources} />
      </Disclosure>
    </div>
  )
}

/** One place of the table the tubes are chosen from: a button a finger tall that says how its tube stands, beside a mark, and is named by what is in the tube. */
function Place({ name, status, current, off, onPress }: { name: string; status: Status; current: boolean; off: boolean; onPress(): void }) {
  return (
    <button
      type="button"
      aria-label={`${name}: ${status.text}`}
      aria-current={current ? 'true' : undefined}
      // A place the bench has no tube for stays focusable, and says why when it is pressed.
      aria-disabled={off || undefined}
      onClick={onPress}
      className="grid min-h-11 w-full place-items-center rounded-md border px-1 py-1 text-center text-xs leading-tight outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-disabled:border-dashed aria-[current]:border-foreground aria-[current]:bg-muted aria-[current]:font-medium"
    >
      {/* The mark over the words, so that the words of every place stand in one line where the place is narrow. */}
      <span className="grid justify-items-center">
        {status.mark !== '' && (
          <span aria-hidden="true" className={status.done ? ROLE.done : undefined}>
            {status.mark}
          </span>
        )}
        <span>{status.text}</span>
      </span>
    </button>
  )
}

/**
 * The tubes of part 1 or of part 2 to choose from, as a table: for part 1 a liquid down the side and a liquid along
 * the top, so that each pair of the five has one place, and for part 2 the two solids down the side and the five
 * liquids along the top. Each place is a button that says how its tube stands; one the bench has no tube for says
 * so, and when it is pressed, why (spec 25.1). Under the table, how far the count has come, and the ways to the
 * explorer.
 */
function Chooser({ data, m, state, part, tube, onTube }: Pick<Parts, 'data' | 'm' | 'state'> & { part: 'liquids' | 'solids'; tube: TubeId | null; onTube(tube: TubeId): void }) {
  const [said, say] = useSaid()
  const bench = benchView(m, state)
  const done = part === 'liquids' ? bench.pairsDone : bench.solidsDone
  const place = (name: string, id: TubeId | null, why: string) => (
    <Place
      name={name}
      status={id === null ? OFF_BENCH : tubeMark(tubeView(m, state, id))}
      current={id !== null && id === tube}
      off={id === null}
      onPress={() => {
        if (id === null) return say(why, true)
        say('')
        onTube(id)
      }}
    />
  )
  const head = 'px-1 pb-1 text-center align-bottom text-xs leading-tight font-medium'
  const side = 'pr-2 text-left text-xs leading-tight font-medium'
  return (
    <>
      <table className="mixing-table w-full border-separate border-spacing-1">
        <caption className={`mb-1 text-left ${HEADING}`}>{part === 'liquids' ? CHOOSE_TEXT.pair : PAGE_TEXT.choose}</caption>
        {part === 'liquids' ? (
          <>
            <thead>
              <tr>
                <td className="w-24" />
                {LIQUID_IDS.slice(1).map((b) => <th key={b} scope="col" className={head}>{liquidName(data, b)}</th>)}
              </tr>
            </thead>
            <tbody>
              {LIQUID_IDS.slice(0, -1).map((a, row) => (
                <tr key={a}>
                  <th scope="row" className={side}>{liquidName(data, a)}</th>
                  {/* Each pair once: the places under the diagonal are the same pairs again, and are left empty. */}
                  {LIQUID_IDS.slice(1).map((b, column) => <td key={b}>{column >= row && place(pairName(data, a, b), pairOf(m, a, b), pairOffBenchText(data, a, b))}</td>)}
                </tr>
              ))}
            </tbody>
          </>
        ) : (
          <>
            <thead>
              <tr>
                <td className="w-16" />
                {LIQUID_IDS.map((liquid) => <th key={liquid} scope="col" className={head}>{liquidName(data, liquid)}</th>)}
              </tr>
            </thead>
            <tbody>
              {SOLID_IDS.map((solid) => (
                <tr key={solid}>
                  <th scope="row" className={side}>{solidName(data, solid)}</th>
                  {LIQUID_IDS.map((liquid) => <td key={liquid}>{place(solidInName(data, solid, liquid), solidTubeOf(m, solid, liquid), solidOffBenchText(data, solid, liquid))}</td>)}
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>
      <div className={said.text === '' ? '-mt-2' : 'max-w-prose'}>
        <Line said={said} />
      </div>
      {!done && <p className="max-w-prose">{countText(bench, part)}</p>}
      <Molecules of={part === 'liquids' ? LIQUID_IDS : [...LIQUID_IDS, ...SOLID_IDS]} data={data} />
    </>
  )
}

/**
 * Part 1 or part 2: the table its tubes are chosen from, and the tube chosen. Until a tube is chosen the table
 * stands alone. Once one is, the table is beside the tube where the part has the width, and behind a button where
 * it has not (mixing.css); choosing a tube there closes it again. Under a tube that counts, once the part's count
 * is reached, that the part is done, and its notes: a tube tried after that has the room to itself while it is
 * under way, as the first six had.
 */
function TubesPart({ data, m, sources, state, act, headingRef, part, tube, onTube }: Parts & { part: 'liquids' | 'solids'; tube: TubeId | null; onTube(tube: TubeId): void }) {
  const headingId = useId()
  const chooserId = useId()
  const bench = benchView(m, state)
  const done = part === 'liquids' ? bench.pairsDone : bench.solidsDone
  const view = tube === null ? null : tubeView(m, state, tube)
  const counts = view?.notesShown ?? false
  const [choosing, setChoosing] = useState(false)
  // What the part asks for, over a part in which nothing counts yet.
  const [intro] = useState(() => (part === 'liquids' ? bench.pairsCounted : bench.solidsCounted) === 0)
  const cited = useMemo(() => (tube === null ? mixingPartCitations(data, part, sources, done) : mixingTubeCitations(data, tube, sources, counts)), [data, part, tube, sources, done, counts])
  const derived = tube === null ? (done ? SOURCES_TEXT.partAfter : SOURCES_TEXT.partBefore) : counts ? SOURCES_TEXT.tubeAfter : SOURCES_TEXT.tubeBefore
  const focused = useRef<HTMLHeadingElement>(null)
  // A tube that is chosen takes focus at its heading; so does one set up again in a fresh tube, whose button has gone with the card before it, if focus was left on the page.
  const shown = tube === null ? '' : `${tube}:${view!.tries}`
  const wasShown = useRef(shown)
  useEffect(() => {
    if (wasShown.current !== shown && (wasShown.current.split(':')[0] !== tube || document.activeElement === document.body)) focused.current?.focus()
    wasShown.current = shown
  }, [shown, tube])

  return (
    <section aria-labelledby={headingId} className="mixing-part grid min-w-0 gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <PartHead data={data} part={part} status={partMarks(m, state)[part]} headingId={headingId} headingRef={headingRef} />
        {tube !== null && (
          <Button variant="outline" className="mixing-choose-button min-h-11" aria-expanded={choosing} aria-controls={chooserId} onClick={() => setChoosing(!choosing)}>
            {PAGE_TEXT.choose}
            {choosing ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
        )}
      </div>
      {/* What the part asks for, until a tube is chosen. */}
      {intro && tube === null && <p className="max-w-prose text-sm">{PART_AIM[part]}</p>}
      <div className="mixing-layout">
        <div id={chooserId} className={`mixing-chooser${tube === null || choosing ? ' mixing-chooser-open' : ''} ${CARD}`}>
          <div className={SHEET}>
            <Chooser
              data={data}
              m={m}
              state={state}
              part={part}
              tube={tube}
              onTube={(next) => {
                setChoosing(false)
                onTube(next)
                // The tube already shown: its heading takes focus all the same, as the table is closed over it.
                if (next === tube) focused.current?.focus()
              }}
            />
          </div>
        </div>
        {tube !== null && (
          <div className="grid min-w-0 gap-2">
            <TubeCard
              // A card of its own for each tube, each fresh tube of it and each mode: nothing looked at or said in the one before is carried over.
              key={`${shown}:${state.mode}`}
              data={data}
              m={m}
              state={state}
              tube={tube}
              act={act}
              headingRef={focused}
            />
            {/* Under the tube, so that the tube stays where it was: always there, and empty until the part's count is reached and this tube counts, so that a screen reader says it when it comes. */}
            <p role="status" className="max-w-prose text-sm font-medium empty:hidden">
              {done && counts && <Marked mark="✓" done>{countText(bench, part)}</Marked>}
            </p>
            {done && counts && (
              <div className="text-sm">
                <PartNotes data={data} part={part} />
              </div>
            )}
          </div>
        )}
      </div>
      {tube === null && done && (
        <div className="grid gap-2 text-sm">
          <p className="max-w-prose font-medium">
            <Marked mark="✓" done>{countText(bench, part)}</Marked>
          </p>
          <PartNotes data={data} part={part} />
        </div>
      )}
      <Foot data={data} sources={sources} cited={cited} derived={derived} />
    </section>
  )
}

/** A question answered by pressing one of its choices, which is recorded at once: its name, its mark once it is judged, the choices, and under them what Guided says of a choice it does not take. */
function Pick({ label, question, choices, answer, right, refused, beside = false, onPick }: { label: ReactNode; question: string; choices: readonly { value: string; label: string }[]; answer: string | null; right: boolean | null; refused: string; beside?: boolean; onPick(value: string): void }) {
  const labelId = useId()
  const name = useId()
  return (
    // With `beside`, a short name has its choices beside it, in one row a finger tall.
    <div role="radiogroup" aria-labelledby={labelId} className={beside ? 'grid w-full grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1' : 'grid w-full gap-1.5'}>
      <p id={labelId} className={answer === null ? ROLE.entry : undefined}>
        {right !== null && <Mark ok={right} />}
        {label}
        <span className="sr-only">
          {' '}
          {question}
          {right !== null && ` ${markText(right)}`}
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((choice) => (
          <label key={choice.value} className={CHOICE}>
            <input type="radio" name={name} value={choice.value} checked={answer === choice.value} onChange={() => onPick(choice.value)} />
            {choice.label}
          </label>
        ))}
      </div>
      {/* Always there, and empty until Guided refuses a choice, so that a screen reader says it when it comes. */}
      <p role="status" className={`col-span-full ${ROLE.held} empty:hidden`}>
        {refused}
      </p>
    </div>
  )
}

/**
 * How part 3 came out, the check where it is still to be asked for, the way to answer again, and once the part is
 * done its notes, shown outright. Guided checks the part by itself as its last answer is given, so the check is
 * there in Challenge, and in Guided only for answers that were given in Challenge. Focus goes here when the check
 * is made and its button goes.
 */
function RuleEnd({ data, open, outcome, notesShown, press }: { data: MixingData; open: boolean; outcome: Outcome; notesShown: boolean; press(action: Action): void }) {
  const ref = useRef<HTMLDivElement>(null)
  const over = outcome.state === 'counts' || outcome.state === 'does-not-count'
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current) {
      if (document.activeElement === document.body) ref.current?.focus()
      else ref.current?.scrollIntoView({ block: 'nearest' })
    }
    wasOver.current = over
  }, [over])
  return (
    <div ref={ref} tabIndex={-1} className={`grid justify-items-start gap-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${outcome.state === 'open' ? '' : 'border bg-card p-3'}`}>
      {/* Always there, and empty until everything is answered, so that a screen reader says it when it comes. */}
      <p role="status" className="max-w-prose font-medium">
        {outcome.state !== 'open' && (
          <>
            {over && <Mark ok={outcome.state === 'counts'} />}
            {ruleOutcomeText({ open, outcome })}
          </>
        )}
      </p>
      {outcome.state === 'to-check' && (
        <Control unavailable={false} className="min-h-11" onClick={() => press({ type: 'checkRule' })}>
          {RULE_TEXT.check}
        </Control>
      )}
      {outcome.state === 'does-not-count' && (
        <Control unavailable={false} className="min-h-11" onClick={() => press({ type: 'againRule' })}>
          {RULE_TEXT.again}
        </Control>
      )}
      {notesShown && <PartNotes data={data} part="rule" />}
    </div>
  )
}

/**
 * Part 3: the five liquids, each sorted into one of two families by pressing a choice, and then the two questions
 * the rule answers, each with its two choices. A choice is recorded as it is pressed: Guided takes only one that is
 * right and says so of one it does not take; Challenge takes any, marks nothing, and checks the seven together when
 * asked. The two questions come once all five liquids are sorted. Until parts 1 and 2 are done the part says what
 * opens it. No liquid's family is on the page before it is given and judged (spec 25.5).
 */
function RulePart({ data, m, sources, state, act, headingRef }: Parts) {
  const headingId = useId()
  const rule = ruleView(m, state)
  const guided = state.mode === 'guided'
  const [said, say] = useSaid()
  // The one choice Guided last refused, by what was asked: said under that question until another choice is pressed.
  const [refused, setRefused] = useState<{ at: string; text: string } | null>(null)
  // What the part asks for, while nothing is answered, and then for as long as the part is shown.
  const [intro] = useState(() => !rule.sorted.some((one) => one.family !== null) && !rule.questions.some((question) => question.answer !== null))
  const cited = useMemo(() => mixingPartCitations(data, 'rule', sources, rule.notesShown), [data, sources, rule.notesShown])
  // "Answer again" goes with the answers it clears: focus goes to the part's heading if it was left on the page, as it goes to a tube's when the tube is set up again.
  const wasTries = useRef(rule.tries)
  useEffect(() => {
    if (wasTries.current !== rule.tries && document.activeElement === document.body) headingRef.current?.focus()
    wasTries.current = rule.tries
  }, [rule.tries, headingRef])
  const press = (action: Action) => {
    const blocked = can(m, state, action)
    if (blocked !== null) return say(BLOCKED_TEXT[blocked], true)
    say('')
    setRefused(null)
    act(action)
  }
  const pick = (at: string, action: Action, taken: string) => {
    const blocked = can(m, state, action)
    // That the choice is not right is said, and never which is.
    if (blocked !== null) return setRefused({ at, text: BLOCKED_TEXT[blocked] })
    setRefused(null)
    // Guided says that it took the choice, which a screen reader hears; the eye has the tick beside the name too.
    say(guided ? taken : '')
    act(action)
  }
  const refusedAt = (at: string) => (refused?.at === at ? refused.text : '')
  const sorted = rule.sorted.every((one) => one.family !== null)
  let body: ReactNode = <p className={`max-w-prose text-sm ${ROLE.held}`}>{RULE_TEXT.closed}</p>
  if (rule.open) {
    body = rule.answersOpen ? (
      <div className={`mixing-rule-card ${CARD}`}>
        <Sheet heading={RULE_TEXT.sortHeading}>
          <p className="max-w-prose">{RULE_TEXT.sortIntro}</p>
          <div className="grid w-full gap-1.5">
            {rule.sorted.map((one) => (
              <Pick
                key={one.liquid}
                beside
                label={<span className="font-medium">{liquidName(data, one.liquid)}</span>}
                question={sortQuestion(data, one.liquid)}
                choices={rule.families.map((family) => ({ value: family, label: FAMILY_LABEL[family] }))}
                answer={one.family}
                right={one.right}
                refused={refusedAt(one.liquid)}
                onPick={(family) => pick(one.liquid, { type: 'sort', liquid: one.liquid, family: family as (typeof rule.families)[number] }, GUIDED_TEXT.sorted)}
              />
            ))}
          </div>
          {/* Closed, and Guided's alone, while a liquid is still to sort: how to go about it, and no liquid's family. */}
          {guided && !sorted && (
            <div className="pt-4 pb-1">
              <Disclosure summary={PAGE_TEXT.hint}>
                <p className="max-w-prose">{RULE_TEXT.sortHint}</p>
              </Disclosure>
            </div>
          )}
        </Sheet>
        {/* There once all five are sorted: one thing at a time. */}
        {sorted && (
          <Sheet heading={RULE_TEXT.questionsHeading}>
            {rule.questions.map((question) => (
              <Pick
                key={question.id}
                label={questionText(data, question.id)}
                question=""
                choices={question.choices.map((choice) => ({ value: choice, label: choiceLabel(choice) }))}
                answer={question.answer}
                right={question.right}
                refused={refusedAt(question.id)}
                onPick={(is) => pick(question.id, { type: 'answer', question: question.id, is }, GUIDED_TEXT.answered)}
              />
            ))}
            {guided && (
              <div className="pt-4 pb-1">
                <Disclosure summary={PAGE_TEXT.hint}>
                  <p className="max-w-prose">{RULE_TEXT.questionHint}</p>
                </Disclosure>
              </div>
            )}
          </Sheet>
        )}
      </div>
    ) : (
      <div className={`mixing-rule-card ${CARD}`}>
        <Sheet heading={RULE_TEXT.sortHeading}>
          <ul className="grid gap-1">
            {rule.sorted.map((one) => (
              <li key={one.liquid}>
                {one.right !== null && <Mark ok={one.right} />}
                {sortedLine(data, one.liquid, one.family)}
                {one.right !== null && <span className="sr-only"> {markText(one.right)}</span>}
              </li>
            ))}
          </ul>
        </Sheet>
        <Sheet heading={RULE_TEXT.questionsHeading}>
          <ul className="grid gap-1">{rule.questions.map((question) => <CheckedLine key={question.id} question={questionText(data, question.id)} answer={question.answer === null ? '' : choiceLabel(question.answer)} right={question.right} />)}</ul>
        </Sheet>
      </div>
    )
  }

  return (
    <section aria-labelledby={headingId} className="mixing-part grid min-w-0 gap-2">
      <PartHead data={data} part="rule" status={partMarks(m, state).rule} headingId={headingId} headingRef={headingRef} />
      {intro && <p className="max-w-prose text-sm">{PART_AIM.rule}</p>}
      {body}
      <div className={said.text === '' ? '-mt-2' : 'text-sm'}>
        <Line said={said} />
      </div>
      {rule.open && <RuleEnd data={data} open={rule.open} outcome={rule.outcome} notesShown={rule.notesShown} press={press} />}
      {state.status !== 'completed' && <p className="max-w-prose text-sm text-muted-foreground">{LAB_TEXT.complete}</p>}
      <Foot data={data} sources={sources} cited={cited} derived={rule.notesShown ? SOURCES_TEXT.partAfter : SOURCES_TEXT.partBefore} />
    </section>
  )
}
