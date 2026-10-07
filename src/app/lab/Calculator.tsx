import { Calculator as CalculatorIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { evaluate, resultText } from './calc'
import { FloatingPanel } from './FloatingPanel'
import { CALCULATOR_TEXT } from './shellText'

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '(', ')'] as const

/**
 * A calculator in a panel that floats over the page (FloatingPanel): a learner works a sum without leaving the lab.
 * It fills in no field: the learner reads the result and types it where it belongs. The sum is kept while the
 * panel is closed.
 */
export function Calculator() {
  const [sum, setSum] = useState('')
  const [shown, setShown] = useState('')
  const work = () => {
    const value = evaluate(sum)
    setShown(sum.trim() === '' ? '' : value === null ? CALCULATOR_TEXT.notASum : `${sum.trim()} = ${resultText(value)}`)
  }
  return (
    <FloatingPanel name={CALCULATOR_TEXT.name} icon={<CalculatorIcon aria-hidden="true" />} width={272}>
      <input
        type="text"
        // The panel's own keys do the typing on a tablet: its keyboard would cover the bench.
        inputMode="none"
        autoComplete="off"
        spellCheck={false}
        aria-label={CALCULATOR_TEXT.sum}
        value={sum}
        onChange={(event) => setSum(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') work()
        }}
        className="h-10 w-full rounded-md border bg-background px-2 text-right font-mono text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <output aria-live="polite" className="min-h-10 rounded-md bg-muted px-2 py-1 text-right font-mono break-all tabular-nums">
        {shown}
      </output>
      <div className="grid grid-cols-4 gap-1">
        {KEYS.map((key) => (
          <Button key={key} type="button" variant="outline" className="h-11 text-base" onClick={() => setSum(sum + key)}>
            {key}
          </Button>
        ))}
        <Button type="button" variant="outline" className="h-11" aria-label={CALCULATOR_TEXT.clear} onClick={() => (setSum(''), setShown(''))}>
          C
        </Button>
        <Button type="button" variant="outline" className="h-11" aria-label={CALCULATOR_TEXT.back} onClick={() => setSum(sum.slice(0, -1))}>
          ⌫
        </Button>
        <Button type="button" variant="outline" className="h-11 text-base" onClick={() => setSum(sum + '+')}>
          +
        </Button>
        <Button type="button" className="h-11 text-base" aria-label={CALCULATOR_TEXT.equals} onClick={work}>
          =
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{CALCULATOR_TEXT.note}</p>
    </FloatingPanel>
  )
}
