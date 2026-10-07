import { useId } from 'react'
import { useAppState } from '@/app/AppState'
import { PageHeader } from '@/app/PageHeader'
import { VALENCE_LEVELS, type Prefs, type Tri } from '@/app/preferences'
import { exportAll, NOT_SAVING_TEXT } from '@/app/progress/storage'
import { Button } from '@/components/ui/button'

const SELECT_CLASS = 'h-9 rounded-md border bg-background px-2 text-sm'

function TriSelect({ label, value, onChange }: { label: string; value: Tri; onChange: (value: Tri) => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id}>{label}</label>
      <select id={id} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value as Tri)}>
        <option value="system">System</option>
        <option value="on">On</option>
        <option value="off">Off</option>
      </select>
    </div>
  )
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Settings() {
  const { store, persistent, prefs, updatePrefs, resetAll } = useAppState()
  const levelId = useId()

  return (
    <>
      <PageHeader title="Settings" />

      {!persistent && (
        <p role="status" className="mb-6 max-w-prose rounded-md border p-3 text-sm">
          {NOT_SAVING_TEXT}
        </p>
      )}

      <section aria-labelledby="display-heading" className="mb-8 grid max-w-md gap-3">
        <h2 id="display-heading" className="text-lg font-medium">
          Display
        </h2>
        <TriSelect label="Dark mode" value={prefs.darkMode} onChange={(darkMode) => updatePrefs({ darkMode })} />
        <TriSelect
          label="Reduced motion"
          value={prefs.reducedMotion}
          onChange={(reducedMotion) => updatePrefs({ reducedMotion })}
        />
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={levelId}>Valence display level</label>
          <select
            id={levelId}
            className={SELECT_CLASS}
            value={prefs.valenceLevel}
            onChange={(e) => updatePrefs({ valenceLevel: Number(e.target.value) as Prefs['valenceLevel'] })}
          >
            {VALENCE_LEVELS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">System follows your operating system's setting.</p>
      </section>

      <section aria-labelledby="progress-heading" className="grid max-w-md gap-3">
        <h2 id="progress-heading" className="text-lg font-medium">
          My progress
        </h2>
        <p className="text-sm text-muted-foreground">
          Progress is saved only in this browser. On a shared computer, the next person using this browser can see it;
          clear it when you finish.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download('valence-progress.json', exportAll(store))}>
            Export my progress
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm('Clear all Valence progress and settings in this browser? This cannot be undone.')) {
                resetAll()
              }
            }}
          >
            Clear my progress
          </Button>
        </div>
      </section>
    </>
  )
}
