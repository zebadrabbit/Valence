// The 3D scene of a mechanism timeline. Three.js lives only under a scene/ folder (ESLint enforces it), and this
// file is loaded with React.lazy, so three and @react-three/fiber stay out of the page's own chunk.
//
// Everything drawn is worked out from `state` in drawing.ts, at every render, and nothing is eased or kept from
// the frame before: the same scrub position gives the same picture whichever way it was reached (spec 9.1). The
// camera is the one thing a learner moves, and it goes back to the chapter's own framing when the timeline moves.

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Vec3 } from '@/chem-data/geometry'
import { registry } from '@/chem-data/registry'
import type { MechanismState } from '@/mechanisms'
import { framingDistance } from '@/app/explore/scene/sceneMath'
import { STICK_COLOR } from '@/app/explore/scene/sceneModel'
import { Ball, ConeShape, ContextLossWatcher, Headlight, PickTarget, StickShape, noRaycast } from '@/app/explore/scene/shapes'
import { FOV, PAIR_DOT_RADIUS, VIEW_FROM, drawing, type DrawnArrow } from './drawing'

// An electron pair and its arrow, in the colour the explorer draws a lone pair in. The arrow's shape says what it is.
const ELECTRON_COLOR = '#fde047'
// An ion's charge is written beside its ball, over the page's own background: dark letters with a light edge in
// the light theme and light letters with a dark edge in the dark one, so that it reads over a ball behind it too.
const LABEL = { light: { ink: '#18181b', edge: '#ffffff' }, dark: { ink: '#fafafa', edge: '#18181b' } }

export interface MechanismSceneProps {
  /** `state(mechanism, t)`, and nothing else of the timeline. */
  state: MechanismState
  /** The species that is looked at, by its place in `state.species`, or null. */
  looked: number | null
  onLook(index: number | null): void
  /** What the callout says of the species looked at. */
  callout: string
  /** The dark theme is in effect: the writing beside an ion is light. */
  dark: boolean
  /** The picture's name, and the id of the element that describes it. */
  label: string
  describedBy: string
  onContextLost?(lost: boolean): void
}

export function MechanismScene({ state, looked, onLook, callout, dark, label, describedBy, onContextLost }: MechanismSceneProps) {
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
        camera={{ fov: FOV, near: 0.1, far: 500, position: [...VIEW_FROM] }}
        gl={{ antialias: true, alpha: true }}
        role="img"
        aria-label={label}
        aria-describedby={describedBy}
        // A tap on empty space puts the callout away.
        onPointerMissed={() => onLook(null)}
      >
        <ambientLight intensity={1.4} />
        <Headlight />
        <Framing target={drawn.camera.target} radius={drawn.camera.radius} at={state.t} />
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
          <IonLabel key={ion.text} {...ion} dark={dark} />
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

/** A curved arrow with the pair of electrons on it: the shaft in pieces, a cone for its head, and two dots. Drawn over everything else, as a mark on the picture is. */
function Arrow({ arrow, outline }: { arrow: DrawnArrow; outline: number }) {
  const { head } = arrow
  return (
    <>
      {arrow.shaft.map((stick, i) => (
        <StickShape key={i} stick={stick} color={ELECTRON_COLOR} outline={outline} overlay />
      ))}
      <ConeShape position={head.position} quaternion={head.quaternion} radius={head.radius} length={head.length} color={ELECTRON_COLOR} outline={outline} overlay />
      {arrow.pair.map((position, i) => (
        <Ball key={i} position={position} radius={PAIR_DOT_RADIUS} color={ELECTRON_COLOR} outline={outline} segments={16} overlay />
      ))}
    </>
  )
}

/** An ion's symbol and charge, written beside its ball and always facing the viewer. */
function IonLabel({ position, text, height, offset, dark }: { position: Vec3; text: string; height: number; offset: number; dark: boolean }) {
  const texture = useMemo(() => {
    const { ink, edge } = dark ? LABEL.dark : LABEL.light
    const canvas = document.createElement('canvas')
    // About the size the writing has on the screen, so that it is not blurred by being drawn much smaller than it was written.
    canvas.width = 128
    canvas.height = 64
    const pen = canvas.getContext('2d')
    if (pen) {
      pen.font = '700 42px "Inter Variable", system-ui, sans-serif'
      // From the left edge: the sprite's left edge is put beside the ball.
      pen.textAlign = 'left'
      pen.textBaseline = 'middle'
      pen.lineJoin = 'round'
      pen.lineWidth = 4
      pen.strokeStyle = edge
      pen.strokeText(text, 4, 34)
      pen.fillStyle = ink
      pen.fillText(text, 4, 34)
    }
    const made = new CanvasTexture(canvas)
    made.colorSpace = SRGBColorSpace
    return made
  }, [text, dark])
  useEffect(() => () => texture.dispose(), [texture])
  const width = height * 2
  return (
    // `center` is the point of the sprite that sits on `position`: left of the sprite by the offset, and at half its height.
    <sprite position={position} scale={[width, height, 1]} center={[-offset / width, 0.5]} renderOrder={5} raycast={noRaycast}>
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
 * glide; if it moves while the learner is holding the scene, that waits until they let go (spec 9.1). `at` is the
 * scrub position: the framing is the chapter's again at every move of it, also through a stretch of the track in
 * which the chapter's camera stands still.
 */
function Framing({ target, radius, at }: { target: Vec3; radius: number; at: number }) {
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
      camera.position.set(...VIEW_FROM).setLength(distance).add(controls.target)
      controls.update()
      invalidate()
    }
    if (held.current) waiting.current = frame
    else frame()
  }, [camera, controls, invalidate, x, y, z, radius, aspect, at])

  return null
}
