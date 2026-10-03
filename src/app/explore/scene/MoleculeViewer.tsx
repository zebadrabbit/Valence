// The 3D scene. Three.js lives only under a scene/ folder (ESLint enforces it), and this file is
// loaded with React.lazy, so three and @react-three/fiber stay in their own chunk.

import { useEffect, useImperativeHandle, useMemo, useRef, type Dispatch, type ReactNode, type Ref } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { BackSide, setConsoleFunction, type DirectionalLight, type Mesh } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Vec3 } from '@/chem-data/geometry'
import { registry } from '@/chem-data/registry'
import type { Molecule } from '@/chem-data/schema'
import type { Selection, SelectionAction } from '../selection'
import { VIEWS, type ViewId } from '../views'
import { framingDistance, type Quat, type Stick } from './sceneMath'
import { sceneModel, type SceneAtom, type SceneBond } from './sceneModel'

// @react-three/fiber 9.8 still constructs a THREE.Clock, which three r183 and later report as
// deprecated with a console warning on every Canvas mount. Nothing here can act on it, so drop
// that one message and pass everything else through. Remove this filter when an R3F release
// stops using THREE.Clock (check by deleting it and watching the console on a molecule page).
setConsoleFunction((type, message, ...params) => {
  if (type === 'warn' && message.startsWith('THREE.Clock:')) return
  console[type](message, ...params)
})

const FOV = 45
/** The direction the camera starts in: a little to the right and above, so depth shows at once. */
const HOME: Vec3 = [0.35, 0.3, 1]
const ROTATE_STEP = Math.PI / 12 // 15 degrees per button press
const ZOOM_STEP = 1.2
/** A click that moved further than this many pixels was a drag to rotate, not a pick. */
const CLICK_SLOP = 4

// The dark edge round every shape keeps white hydrogens visible on the light theme.
const OUTLINE_COLOR = '#1f2937'
// The selection ring is blue with a white inner edge, so it shows against any atom and both themes.
const RING_COLOR = '#2563eb'
const RING_EDGE_COLOR = '#ffffff'

/** What the DOM buttons beside the canvas can ask the camera to do. */
export interface ViewHandle {
  /** Turns the model, in 15 degree steps: positive is to the right and downwards. */
  rotate(right: number, down: number): void
  /** Positive steps zoom in, negative zoom out. */
  zoom(steps: number): void
  reset(): void
}

export interface MoleculeViewerProps {
  molecule: Molecule
  view: ViewId
  selection: Selection
  dispatch: Dispatch<SelectionAction>
  reducedMotion: boolean
  /** Text alternative: the id of an element that describes the molecule. */
  describedBy: string
  viewRef?: Ref<ViewHandle>
  onContextLost?(lost: boolean): void
}

export function MoleculeViewer(props: MoleculeViewerProps) {
  const { molecule, view, selection, dispatch, reducedMotion, describedBy, viewRef, onContextLost } = props
  const model = useMemo(() => sceneModel(molecule, registry.elements, view), [molecule, view])
  const label = VIEWS.find((v) => v.id === view)?.label.toLowerCase()

  return (
    <Canvas
      // Render only when something changed (a prop, a camera move), not 60 times a second.
      frameloop="demand"
      // No tone mapping: the element colours are shown as stored.
      flat
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 500, position: [...HOME] }}
      gl={{ antialias: true, alpha: true }}
      // These land on the wrapper <div> that R3F puts around the <canvas>.
      role="img"
      aria-label={`3D ${label} model of ${molecule.name}`}
      aria-describedby={describedBy}
      // A click on empty space clears the selection. R3F does not fire this after a drag.
      onPointerMissed={() => dispatch({ type: 'clear' })}
    >
      <ambientLight intensity={1.4} />
      <Headlight />
      <Controls radius={model.radius} reducedMotion={reducedMotion} viewRef={viewRef} />
      <ContextLossWatcher onChange={onContextLost} />
      {/* The model's centre is the origin, which the camera orbits. */}
      <group>
        {model.atoms.map((atom, i) => (
          <AtomShape key={i} atom={atom} outline={model.outline} onPick={() => dispatch({ type: 'toggleAtom', index: i })} />
        ))}
        {model.bonds.map((bond, i) => (
          <BondShape key={i} bond={bond} outline={model.outline} onPick={() => dispatch({ type: 'toggleBond', index: i })} />
        ))}
        {selection.atoms.map((i) => {
          const atom = model.atoms[i]
          return atom && <AtomRing key={i} atom={atom} unit={model.outline} />
        })}
        {selection.bond !== null && model.bonds[selection.bond] && <BondRing bond={model.bonds[selection.bond]!} unit={model.outline} />}
      </group>
    </Canvas>
  )
}

function AtomShape({ atom, outline, onPick }: { atom: SceneAtom; outline: number; onPick(): void }) {
  return (
    <group position={atom.position}>
      <mesh scale={atom.radius} raycast={noRaycast}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color={atom.color} roughness={0.5} />
      </mesh>
      {/* The outline: a slightly larger shell drawn from its inside faces. */}
      <mesh scale={atom.radius + outline} raycast={noRaycast}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color={OUTLINE_COLOR} side={BackSide} />
      </mesh>
      <PickTarget scale={atom.pickRadius} onPick={onPick}>
        <sphereGeometry args={[1, 12, 8]} />
      </PickTarget>
    </group>
  )
}

function BondShape({ bond, outline, onPick }: { bond: SceneBond; outline: number; onPick(): void }) {
  return (
    <>
      {bond.sticks.map((stick, i) => (
        <group key={i} position={stick.position} quaternion={stick.quaternion}>
          <mesh scale={[stick.radius, stick.length, stick.radius]} raycast={noRaycast}>
            {/* Unit cylinder along +Y. */}
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshStandardMaterial color={stick.color} roughness={0.6} />
          </mesh>
          <mesh scale={[stick.radius + outline, stick.length + 2 * outline, stick.radius + outline]} raycast={noRaycast}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshBasicMaterial color={OUTLINE_COLOR} side={BackSide} />
          </mesh>
        </group>
      ))}
      {bond.pick && (
        <PickTarget position={bond.pick.position} quaternion={bond.pick.quaternion} scale={stickScale(bond.pick)} onPick={onPick}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
        </PickTarget>
      )}
    </>
  )
}

const noRaycast = () => null
const stickScale = (stick: Stick): Vec3 => [stick.radius, stick.length, stick.radius]

/** An invisible shape that takes the clicks, so what is drawn can be thinner than what can be hit. */
function PickTarget(props: { position?: Vec3; quaternion?: Quat; scale: number | Vec3; onPick(): void; children: ReactNode }) {
  const canvas = useThree((s) => s.gl.domElement)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // The ray hits every shape along it; only the nearest one should react.
    e.stopPropagation()
    // R3F also fires onClick after an orbit drag that starts and ends on the same shape.
    if (e.delta > CLICK_SLOP) return
    props.onPick()
  }
  return (
    <mesh
      visible={false}
      position={props.position}
      quaternion={props.quaternion}
      scale={props.scale}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        canvas.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        canvas.style.cursor = ''
      }}
    >
      {props.children}
    </mesh>
  )
}

/**
 * The mark on a selected atom or bond: a flat double ring that always faces the camera and is drawn
 * over everything, so it is a shape (not a colour change) and shows even behind other atoms.
 */
function FacingRing({ position, inner, unit }: { position: Vec3; inner: number; unit: number }) {
  const ring = useRef<Mesh>(null)
  const edge = useRef<Mesh>(null)
  useFrame(({ camera }) => {
    ring.current?.quaternion.copy(camera.quaternion)
    edge.current?.quaternion.copy(camera.quaternion)
  })
  return (
    <group position={position}>
      <mesh ref={edge} renderOrder={10} raycast={noRaycast}>
        <ringGeometry args={[inner, inner + 2 * unit, 48]} />
        <meshBasicMaterial color={RING_EDGE_COLOR} depthTest={false} />
      </mesh>
      <mesh ref={ring} renderOrder={10} raycast={noRaycast}>
        <ringGeometry args={[inner + 2 * unit, inner + 5 * unit, 48]} />
        <meshBasicMaterial color={RING_COLOR} depthTest={false} />
      </mesh>
    </group>
  )
}

function AtomRing({ atom, unit }: { atom: SceneAtom; unit: number }) {
  // Wireframe joints are tiny, so the ring there is sized from the click target.
  return <FacingRing position={atom.position} inner={Math.max(atom.radius * 1.04, atom.pickRadius * 0.5) + unit} unit={unit} />
}

function BondRing({ bond, unit }: { bond: SceneBond; unit: number }) {
  const { position, quaternion, radius } = bond.ring
  // Where the bond is drawn as sticks, circle its middle.
  if (bond.pick) return <FacingRing position={position} inner={radius} unit={unit} />
  // Space-filling: a band round the seam where the two atoms meet, drawn over everything.
  return (
    <group position={position} quaternion={quaternion}>
      {/* A torus lies in the XY plane; turn its axis onto +Y, which the group turns onto the bond. */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh renderOrder={10} raycast={noRaycast}>
          <torusGeometry args={[radius + unit, 2.5 * unit, 12, 48]} />
          <meshBasicMaterial color={RING_EDGE_COLOR} depthTest={false} />
        </mesh>
        <mesh renderOrder={11} raycast={noRaycast}>
          <torusGeometry args={[radius + unit, 1.5 * unit, 12, 48]} />
          <meshBasicMaterial color={RING_COLOR} depthTest={false} />
        </mesh>
      </group>
    </group>
  )
}

/** A light that stays behind the camera, so the lit side always faces the viewer and edges shade darker. */
function Headlight() {
  const light = useRef<DirectionalLight>(null)
  useFrame(({ camera }) => {
    light.current?.position.copy(camera.position)
  })
  return <directionalLight ref={light} intensity={1.9} />
}

function Controls({ radius, reducedMotion, viewRef }: { radius: number; reducedMotion: boolean; viewRef?: Ref<ViewHandle> }) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const controls = useMemo(() => new OrbitControls(camera), [camera])

  // Attach to the canvas. With frameloop="demand" nothing draws unless asked,
  // so every camera change requests one frame.
  useEffect(() => {
    const onChange = () => invalidate()
    controls.enablePan = false
    controls.connect(canvas)
    controls.addEventListener('change', onChange)
    return () => {
      controls.removeEventListener('change', onChange)
      controls.disconnect()
    }
  }, [controls, canvas, invalidate])

  // Frame the molecule: on load, when the view changes its size, and when the canvas changes shape.
  // Only the distance is set, so the direction the learner has turned the model to is kept.
  useEffect(() => {
    if (!(aspect > 0)) return
    const distance = framingDistance(radius, FOV, aspect)
    camera.position.setLength(distance)
    controls.minDistance = radius * 1.1
    controls.maxDistance = distance * 4
    // What reset() goes back to.
    controls.target0.set(0, 0, 0)
    controls.position0.set(...HOME).setLength(distance)
    controls.update()
    invalidate()
  }, [camera, controls, invalidate, radius, aspect])

  // Reduced motion: no inertia after a drag, and the view buttons step at once. Dragging itself
  // still works, because that motion is directly driven by the learner.
  useEffect(() => {
    controls.enableDamping = !reducedMotion
  }, [controls, reducedMotion])

  // update() applies damping and fires 'change' while the camera is still moving, which
  // requests the next frame. When it stops firing, rendering stops.
  useFrame((_, delta) => {
    controls.update(delta)
  })

  useImperativeHandle(
    viewRef,
    () => ({
      // OrbitControls names these after the camera's movement; the buttons are named after the model's.
      rotate(right, down) {
        if (right !== 0) controls.rotateLeft(right * ROTATE_STEP)
        if (down !== 0) controls.rotateUp(down * ROTATE_STEP)
      },
      zoom(steps) {
        if (steps > 0) controls.dollyOut(ZOOM_STEP ** steps)
        else controls.dollyIn(ZOOM_STEP ** -steps)
      },
      reset() {
        // reset() does not clear inertia left over from a drag, so the view would drift away
        // again. An update with damping off applies and zeroes it first.
        const damping = controls.enableDamping
        controls.enableDamping = false
        controls.update()
        controls.reset()
        controls.enableDamping = damping
      },
    }),
    [controls],
  )

  return null
}

/** Tells the page when the browser takes the WebGL context away (GPU reset, too many contexts). */
function ContextLossWatcher({ onChange }: { onChange?: (lost: boolean) => void }) {
  const canvas = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault() // allows the browser to restore the context
      onChange?.(true)
    }
    const restored = () => {
      onChange?.(false)
      invalidate()
    }
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [canvas, invalidate, onChange])
  return null
}
