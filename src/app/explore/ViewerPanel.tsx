import { Component, lazy, Suspense, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react'
import { useAppState } from '@/app/AppState'
import { Button } from '@/components/ui/button'
import type { Molecule } from '@/chem-data/schema'
import { LewisView } from './LewisView'
import type { ViewHandle } from './scene/MoleculeViewer'
import type { Selection, SelectionAction } from './selection'
import { VIEWER_FAILURE_TEXT, VIEWS, viewerFailure, type SceneViewId, type ViewId } from './views'

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

/**
 * Whether the browser can give the WebGL 2 context three needs. Asked once, before the first
 * Canvas, so a browser without it gets the message below and no renderer errors in its console.
 */
let webgl: boolean | undefined
function hasWebgl(): boolean {
  if (webgl === undefined) {
    const context = document.createElement('canvas').getContext('webgl2')
    webgl = context !== null
    // Browsers allow only a few contexts at a time; hand this one back.
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return webgl
}

/** The model with its view switch and camera buttons. Without WebGL the 3D views show a plain message; the 2D Lewis view still works. */
export function ViewerPanel(props: { molecule: Molecule; selection: Selection; dispatch: Dispatch<SelectionAction>; describedBy: string }) {
  const { reducedMotion, prefs } = useAppState()
  const [view, setView] = useState<ViewId>('ball-and-stick')
  // The 3D view under the Lewis drawing: the Canvas stays mounted, so the camera is where it was left.
  const [sceneView, setSceneView] = useState<SceneViewId>('ball-and-stick')
  const [failed, setFailed] = useState<'webgl' | 'other' | null>(() => (hasWebgl() ? null : 'webgl'))
  const [contextLost, setContextLost] = useState(false)
  const camera = useRef<ViewHandle>(null)

  return (
    <>
      <div role="group" aria-label="View" className="mb-2 flex flex-wrap gap-1">
        {VIEWS.map(({ id, label }) => (
          <Button
            key={id}
            variant={view === id ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={view === id}
            onClick={() => {
              setView(id)
              if (id !== 'lewis') setSceneView(id)
            }}
          >
            {/* The tick, not the colour alone, marks the current view. */}
            {view === id && <Check aria-hidden="true" />}
            {label}
          </Button>
        ))}
      </div>

      <ViewerFrame>
        {/* Hidden, not unmounted, under the Lewis drawing. */}
        <div className={view === 'lewis' ? 'invisible h-full' : 'h-full'}>
          {failed ? (
            <ViewerMessage>{VIEWER_FAILURE_TEXT[failed]} The 2D Lewis view, the atom and bond list and the text description still work.</ViewerMessage>
          ) : (
            <ViewerBoundary onFail={setFailed}>
              <Suspense fallback={<ViewerMessage>Loading the 3D model…</ViewerMessage>}>
                <MoleculeViewer
                  {...props}
                  view={sceneView}
                  level={prefs.valenceLevel}
                  reducedMotion={reducedMotion}
                  viewRef={camera}
                  onContextLost={setContextLost}
                />
              </Suspense>
            </ViewerBoundary>
          )}
        </div>
        {view === 'lewis' && (
          <div className="absolute inset-0">
            <LewisView {...props} />
          </div>
        )}
      </ViewerFrame>

      {/* Always in the page, so that filling it is announced. */}
      <p role="status" className="mt-2 text-sm empty:mt-0">
        {view !== 'lewis' &&
          contextLost &&
          'The browser paused the 3D model. It usually comes back by itself; if it does not, reload the page. The atom and bond list still works.'}
      </p>

      {/* The camera belongs to the 3D views; the Lewis drawing does not turn. */}
      {view !== 'lewis' && !failed && (
        <div role="group" aria-label="Camera" className="mt-2 flex flex-wrap gap-1">
          {CAMERA_BUTTONS.map(({ label, icon: Icon, act }) => (
            <Button
              key={label}
              variant="outline"
              size="icon-sm"
              // Larger on a touch screen.
              className="pointer-coarse:size-9"
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
  return <div className="relative h-72 overflow-hidden rounded-lg border bg-muted lg:h-[420px]">{children}</div>
}

function ViewerMessage({ children }: { children: ReactNode }) {
  return <p className="flex h-full items-center justify-center p-4 text-center text-sm">{children}</p>
}

/** Catches a failed chunk load, a data error in the scene, and the renderer failing to start. */
class ViewerBoundary extends Component<{ onFail(why: 'webgl' | 'other'): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    this.props.onFail(viewerFailure(error))
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
