// The shapes every 3D scene of the app is drawn with: the molecule explorer's and the mechanism timeline's.
// Three.js lives only under a scene/ folder (ESLint enforces it), and each scene is loaded with React.lazy.

import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { BackSide, setConsoleFunction, type DirectionalLight } from 'three'
import type { Vec3 } from '@/chem-data/geometry'
import type { Quat, Stick } from './sceneMath'

// @react-three/fiber 9.8 still constructs a THREE.Clock, which three r183 and later report as
// deprecated with a console warning on every Canvas mount. Nothing here can act on it, so drop
// that one message and pass everything else through. Remove this filter when an R3F release
// stops using THREE.Clock (check by deleting it and watching the console on a molecule page).
setConsoleFunction((type, message, ...params) => {
  if (type === 'warn' && message.startsWith('THREE.Clock:')) return
  console[type](message, ...params)
})

/** A click that moved further than this many pixels was a drag to rotate, not a pick. */
const CLICK_SLOP = 4
// The dark edge round every shape keeps white hydrogens visible on the light theme.
export const OUTLINE_COLOR = '#1f2937'

export const noRaycast = () => null

/**
 * How an overlay is drawn: a mark on the picture (a mechanism's curved arrow) that nothing in the scene hides. Its
 * shapes ignore depth and are drawn last, every outline before every fill, so that one overlay shape lies over
 * another with no edge between them.
 */
const OVERLAY = { outline: 10, fill: 11 }

/** A sphere with its outline: a slightly larger shell drawn from its inside faces. Not a click target. `overlay` draws it over everything else in the scene. */
export function Ball({ position, radius, color, outline, segments = 32, overlay = false }: { position: Vec3; radius: number; color: string; outline: number; segments?: number; overlay?: boolean }) {
  return (
    <group position={position}>
      <mesh scale={radius} raycast={noRaycast} renderOrder={overlay ? OVERLAY.fill : 0}>
        <sphereGeometry args={[1, segments, segments / 2]} />
        <meshStandardMaterial color={color} roughness={0.5} depthTest={!overlay} />
      </mesh>
      <mesh scale={radius + outline} raycast={noRaycast} renderOrder={overlay ? OVERLAY.outline : 0}>
        <sphereGeometry args={[1, segments, segments / 2]} />
        <meshBasicMaterial color={OUTLINE_COLOR} side={BackSide} depthTest={!overlay} />
      </mesh>
    </group>
  )
}

/** A cylinder with its outline. Not a click target. `overlay` draws it over everything else in the scene. */
export function StickShape({ stick, color, outline, overlay = false }: { stick: Stick; color: string; outline: number; overlay?: boolean }) {
  return (
    <group position={stick.position} quaternion={stick.quaternion}>
      <mesh scale={[stick.radius, stick.length, stick.radius]} raycast={noRaycast} renderOrder={overlay ? OVERLAY.fill : 0}>
        {/* Unit cylinder along +Y. */}
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} depthTest={!overlay} />
      </mesh>
      <mesh scale={[stick.radius + outline, stick.length + 2 * outline, stick.radius + outline]} raycast={noRaycast} renderOrder={overlay ? OVERLAY.outline : 0}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshBasicMaterial color={OUTLINE_COLOR} side={BackSide} depthTest={!overlay} />
      </mesh>
    </group>
  )
}

/**
 * A cone with its outline, its point at the top of +Y. Not a click target. `overlay` as for a ball.
 */
export function ConeShape({ position, quaternion, radius, length, color, outline, overlay = false }: { position: Vec3; quaternion: Quat; radius: number; length: number; color: string; outline: number; overlay?: boolean }) {
  return (
    <group position={position} quaternion={quaternion}>
      <mesh scale={[radius, length, radius]} raycast={noRaycast} renderOrder={overlay ? OVERLAY.fill : 0}>
        <coneGeometry args={[1, 1, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} depthTest={!overlay} />
      </mesh>
      <mesh scale={[radius + outline, length + 2 * outline, radius + outline]} raycast={noRaycast} renderOrder={overlay ? OVERLAY.outline : 0}>
        <coneGeometry args={[1, 1, 16]} />
        <meshBasicMaterial color={OUTLINE_COLOR} side={BackSide} depthTest={!overlay} />
      </mesh>
    </group>
  )
}

/**
 * An invisible shape that takes the clicks, so what is drawn can be thinner than what can be hit. `onOver` and
 * `onOut` are a mouse pointer coming over it and leaving; a finger has neither, and picks.
 */
export function PickTarget(props: { position?: Vec3; quaternion?: Quat; scale: number | Vec3; onPick(): void; onOver?(): void; onOut?(): void; children: ReactNode }) {
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
        if (e.pointerType === 'mouse') props.onOver?.()
      }}
      // A pointer that rests on the shape while what it stands for changes is over it still: a move says so again.
      onPointerMove={(e) => {
        e.stopPropagation()
        if (e.pointerType === 'mouse') props.onOver?.()
      }}
      onPointerOut={(e) => {
        canvas.style.cursor = ''
        if (e.pointerType === 'mouse') props.onOut?.()
      }}
    >
      {props.children}
    </mesh>
  )
}

/** A light that stays behind the camera, so the lit side always faces the viewer and edges shade darker. */
export function Headlight() {
  const light = useRef<DirectionalLight>(null)
  useFrame(({ camera }) => {
    light.current?.position.copy(camera.position)
  })
  return <directionalLight ref={light} intensity={1.9} />
}

/** Tells the page when the browser takes the WebGL context away (GPU reset, too many contexts). */
export function ContextLossWatcher({ onChange }: { onChange?: ((lost: boolean) => void) | undefined }) {
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
