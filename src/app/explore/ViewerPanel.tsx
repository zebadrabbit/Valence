import { Component, lazy, Suspense, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { useAppState } from '@/app/AppState'
import { Button } from '@/components/ui/button'
import type { Molecule } from '@/chem-data/schema'
import { LewisView } from './LewisView'
import type { ViewHandle } from './scene/MoleculeViewer'
import type { Selection, SelectionAction } from './selection'
import { VIEWS, type ViewId } from './views'

// The dynamic import is the chunk boundary: three and @react-three/fiber are fetched the first
// time a molecule page renders. (The type-only import above is erased and loads nothing.)
const MoleculeViewer = lazy(() => import('./scene/MoleculeViewer').then((m) => ({ default: m.MoleculeViewer })))

const CAMERA_BUTTONS: readonly { label: string; icon: LucideIcon; act(view: ViewHandle): void }[] = [
  { label: 'Rotate left', icon: ArrowLeft, act: (v) => v.rotate(-1, 0) },
  { label: 'Rotate right', icon: ArrowRight, act: (v) => v.rotate(1, 0) },
  { label: 'Rotate up', icon: ArrowUp, act: (v) => v.rotate(0, -1) },
  { label: 'Rotate down', icon: ArrowDown, act: (v) => v.rotate(0, 1) },
  { label: 'Zoom in', icon: ZoomIn, act: (v) => v.zoom(1) },
  { label: 'Zoom out', icon: ZoomOut, act: (v) => v.zoom(-1) },
  { label: 'Reset view', icon: RotateCcw, act: (v) => v.reset() },
]

/** The model with its view switch and camera buttons. Without WebGL the 3D views show a plain message; the 2D Lewis view still works. */
export function ViewerPanel(props: { molecule: Molecule; selection: Selection; dispatch: Dispatch<SelectionAction>; describedBy: string }) {
  const { reducedMotion, prefs } = useAppState()
  const [view, setView] = useState<ViewId>('ball-and-stick')
  const [failed, setFailed] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const camera = useRef<ViewHandle>(null)

  return (
    <>
      <div role="group" aria-label="View" className="mb-2 flex flex-wrap gap-1">
        {VIEWS.map(({ id, label }) => (
          <Button key={id} variant={view === id ? 'secondary' : 'outline'} size="sm" aria-pressed={view === id} onClick={() => setView(id)}>
            {/* The tick, not the colour alone, marks the current view. */}
            {view === id && <Check aria-hidden="true" />}
            {label}
          </Button>
        ))}
      </div>

      <ViewerFrame>
        {view === 'lewis' ? (
          <LewisView {...props} />
        ) : failed ? (
          <ViewerMessage>
            The 3D model could not start in this browser. The 2D Lewis view, the atom and bond list and the text description still
            work.
          </ViewerMessage>
        ) : (
          <ViewerBoundary onFail={() => setFailed(true)}>
            <Suspense fallback={<ViewerMessage>Loading the 3D model…</ViewerMessage>}>
              <MoleculeViewer
                {...props}
                view={view}
                level={prefs.valenceLevel}
                reducedMotion={reducedMotion}
                viewRef={camera}
                onContextLost={setContextLost}
              />
            </Suspense>
          </ViewerBoundary>
        )}
      </ViewerFrame>

      {view !== 'lewis' && contextLost && (
        <p role="status" className="mt-2 text-sm">
          The browser paused the 3D model. It usually comes back by itself; if it does not, reload the page. The atom and bond
          list still works.
        </p>
      )}

      {/* The camera belongs to the 3D views; the Lewis drawing does not turn. */}
      {view !== 'lewis' && !failed && (
        <div role="group" aria-label="Camera" className="mt-2 flex flex-wrap gap-1">
          {CAMERA_BUTTONS.map(({ label, icon: Icon, act }) => (
            <Button
              key={label}
              variant="outline"
              size="icon-sm"
             
              aria-label={label}
              title={label}
              onClick={() => camera.current && act(camera.current)}
            >
              <Icon aria-hidden="true" />
            </Button>
          ))}
        </div>
      )}
    </>
  )
}

/** The Canvas fills its parent, so the parent sets the height. */
function ViewerFrame({ children }: { children: ReactNode }) {
  return <div className="h-72 overflow-hidden rounded-lg border bg-muted lg:h-[420px]">{children}</div>
}

function ViewerMessage({ children }: { children: ReactNode }) {
  return <p className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{children}</p>
}

/** Catches a failed chunk load and "WebGL is not available" from the renderer. */
class ViewerBoundary extends Component<{ onFail(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
