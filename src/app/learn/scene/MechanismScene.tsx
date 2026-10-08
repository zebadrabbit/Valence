// The 3D scene of a mechanism timeline. Three.js lives only under a scene/ folder (ESLint enforces it), and this
// file is loaded with React.lazy, so three and @react-three/fiber stay out of the page's own chunk.
//
// Everything drawn is worked out from `state` in drawing.ts, at every render, and nothing is eased or kept from
// the frame before: the same scrub position gives the same picture whichever way it was reached (spec 9.1). The
// camera is the one thing a learner moves, and it goes back to the chapter's own framing when the timeline moves.

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BackSide, CanvasTexture, SRGBColorSpace, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Vec3 } from '@/chem-data/geometry'
import { registry } from '@/chem-data/registry'
import type { MechanismState } from '@/mechanisms'
import { framingDistance } from '@/app/explore/scene/sceneMath'
import { STICK_COLOR } from '@/app/explore/scene/sceneModel'
import { Ball, ContextLossWatcher, Headlight, OUTLINE_COLOR, PickTarget, StickShape, noRaycast } from '@/app/explore/scene/shapes'
import { PAIR_DOT_RADIUS, drawing, type DrawnArrow } from './drawing'

const FOV = 45
/** The direction the camera looks from: a little to the right and above, as the explorer's does at first. */
const HOME: Vec3 = [0.35, 0.3, 1]
// An electron pair and its arrow, in the colour the explorer draws a lone pair in. The arrow's shape says what it is.
const ELECTRON_COLOR = '#fde047'
// An ion's charge is written in dark letters with a white edge, so it reads on a sphere of any colour.
const LABEL_INK = '#18181b'
const LABEL_EDGE = '#ffffff'

export interface MechanismSceneProps {
  /** `state(mechanism, t)`, and nothing else of the timeline. */
  state: MechanismState
  /** The species that is looked at, by its place in `state.species`, or null. */
  looked: number | null
  onLook(index: number | null): void
  /** What the callout says of the species looked at. */
  callout: string
  /** The picture's name, and the id of the element that describes it. */
  label: string
  describedBy: string
  onContextLost?(lost: boolean): void
}

export function MechanismScene({ state, looked, onLook, callout, label, describedBy, onContextLost }: MechanismSceneProps) {
  const drawn = drawing(state, registry.elements)
  const calloutRef = useRef<HTMLDivElement>(null)
  const lookedAt = looked === null ? undefined : drawn.species[looked]

  return (
    <div className="relative h-full">
      <Canvas
        // Render only when something changed (the scrub position, a camera move), not 60 times a second.
        frameloop="demand"
        // No tone mapping: the element colours are shown as stored.
        flat
        dpr={[1, 2]}
        camera={{ fov: FOV, near: 0.1, far: 500, position: [...HOME] }}
        gl={{ antialias: true, alpha: true }}
        role="img"
        aria-label={label}
        aria-describedby={describedBy}
        // A tap on empty space puts the callout away.
        onPointerMissed={() => onLook(null)}
      >
        <ambientLight intensity={1.4} />
        <Headlight />
        <Framing target={drawn.camera.target} radius={drawn.camera.radius} />
        <ContextLossWatcher onChange={onContextLost} />
        {drawn.atoms.map((atom) => (
          <Ball key={atom.id} position={atom.position} radius={atom.radius} color={atom.color} outline={drawn.outline} />
        ))}
        {drawn.sticks.map((stick, i) => (
          <StickShape key={i} stick={stick} color={STICK_COLOR} outline={drawn.outline} />
        ))}
        {drawn.arrows.map((arrow, i) => (
          <Arrow key={i} arrow={arrow} outline={drawn.outline} />
        ))}
        {drawn.labels.map((ion) => (
          <IonLabel key={ion.text} {...ion} />
        ))}
        {drawn.species.map((sphere, i) => (
          <PickTarget key={i} position={sphere.center} scale={sphere.radius} onPick={() => onLook(looked === i ? null : i)} onOver={() => onLook(i)} onOut={() => onLook(null)}>
            <sphereGeometry args={[1, 12, 8]} />
          </PickTarget>
        ))}
        {lookedAt && <Anchor at={lookedAt.center} lift={lookedAt.radius} target={calloutRef} />}
      </Canvas>
      {lookedAt && (
        // Placed by Anchor at each frame, over the species it names; hidden until it has a place.
        <div ref={calloutRef} style={{ visibility: 'hidden' }} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full pb-1.5">
          <span className="block rounded-md border-2 border-[#18181b] bg-white px-2 py-1 text-sm leading-snug font-medium whitespace-nowrap text-[#18181b]">{callout}</span>
        </div>
      )}
    </div>
  )
}

/** A curved arrow with the pair of electrons on it: the shaft in pieces, a cone for its head, and two dots. */
function Arrow({ arrow, outline }: { arrow: DrawnArrow; outline: number }) {
  const { head } = arrow
  return (
    <>
      {arrow.shaft.map((stick, i) => (
        <StickShape key={i} stick={stick} color={ELECTRON_COLOR} outline={outline} />
      ))}
      <group position={head.position} quaternion={head.quaternion}>
        {/* A unit cone along +Y, its point at the top. */}
        <mesh scale={[head.radius, head.length, head.radius]} raycast={noRaycast}>
          <coneGeometry args={[1, 1, 16]} />
          <meshStandardMaterial color={ELECTRON_COLOR} roughness={0.6} />
        </mesh>
        <mesh scale={[head.radius + outline, head.length + 2 * outline, head.radius + outline]} raycast={noRaycast}>
          <coneGeometry args={[1, 1, 16]} />
          <meshBasicMaterial color={OUTLINE_COLOR} side={BackSide} />
        </mesh>
      </group>
      {arrow.pair.map((position, i) => (
        <Ball key={i} position={position} radius={PAIR_DOT_RADIUS} color={ELECTRON_COLOR} outline={outline} segments={16} />
      ))}
    </>
  )
}

/** An ion's symbol and charge, written on its sphere and always facing the viewer. */
function IonLabel({ position, text, height }: { position: Vec3; text: string; height: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const pen = canvas.getContext('2d')
    if (pen) {
      pen.font = '600 80px "Inter Variable", system-ui, sans-serif'
      pen.textAlign = 'center'
      pen.textBaseline = 'middle'
      pen.lineJoin = 'round'
      pen.lineWidth = 12
      pen.strokeStyle = LABEL_EDGE
      pen.strokeText(text, 128, 68)
      pen.fillStyle = LABEL_INK
      pen.fillText(text, 128, 68)
    }
    const made = new CanvasTexture(canvas)
    made.colorSpace = SRGBColorSpace
    return made
  }, [text])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={position} scale={[height * 2, height, 1]} renderOrder={5} raycast={noRaycast}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  )
}

/** Keeps the callout's element over the top of the sphere it names, inside the picture, as the camera moves. */
function Anchor({ at, lift, target }: { at: Vec3; lift: number; target: RefObject<HTMLDivElement | null> }) {
  const invalidate = useThree((s) => s.invalidate)
  const point = useMemo(() => new Vector3(), [])
  const [x, y, z] = at
  // Nothing in the scene changes when a species comes to be looked at, so the frame that places the callout is asked for.
  useEffect(() => invalidate(), [invalidate, x, y, z, lift])
  useFrame(({ camera, size }) => {
    const element = target.current
    if (!element) return
    // The top of the sphere as the camera sees it.
    point.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(lift).add({ x, y, z }).project(camera)
    const halfWidth = element.offsetWidth / 2 + 4
    element.style.left = `${Math.min(Math.max(((point.x + 1) / 2) * size.width, halfWidth), size.width - halfWidth)}px`
    element.style.top = `${Math.max(((1 - point.y) / 2) * size.height, element.offsetHeight + 4)}px`
    element.style.visibility = 'visible'
  })
  return null
}

// ponytail: a turn or a zoom lasts until the timeline next moves, so a learner cannot watch a whole step play from
// their own angle. Keeping the learner's direction across frames would need a control that gives the framing back.
/**
 * The camera. It frames what the chapter is about: it looks at the state's camera target from the home direction,
 * from as far as holds the radius the drawing gives it. A learner can turn and zoom it with a pointer, and their view holds
 * while the timeline is still. When the timeline moves, the camera is the chapter's again, at once and with no
 * glide; if it moves while the learner is holding the scene, that waits until they let go (spec 9.1).
 */
function Framing({ target, radius }: { target: Vec3; radius: number }) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const controls = useMemo(() => new OrbitControls(camera), [camera])
  const held = useRef(false)
  /** The framing that is waiting for the learner to let go, if the timeline moved meanwhile. */
  const waiting = useRef<(() => void) | null>(null)

  // With frameloop="demand" nothing draws unless asked, so every camera change requests one frame.
  useEffect(() => {
    const onChange = () => invalidate()
    const onStart = () => {
      held.current = true
    }
    const onEnd = () => {
      held.current = false
      waiting.current?.()
    }
    controls.enablePan = false
    // No inertia: nothing here moves but by the learner's hand or the timeline's.
    controls.enableDamping = false
    controls.connect(canvas)
    controls.addEventListener('change', onChange)
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('change', onChange)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      controls.disconnect()
    }
  }, [controls, canvas, invalidate])

  const [x, y, z] = target
  useEffect(() => {
    if (!(aspect > 0)) return
    const frame = () => {
      waiting.current = null
      const distance = framingDistance(radius, FOV, aspect)
      controls.minDistance = distance / 4
      controls.maxDistance = distance * 3
      controls.target.set(x, y, z)
      camera.position.set(...HOME).setLength(distance).add(controls.target)
      controls.update()
      invalidate()
    }
    if (held.current) waiting.current = frame
    else frame()
  }, [camera, controls, invalidate, x, y, z, radius, aspect])

  return null
}
