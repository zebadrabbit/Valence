// The views of a molecule (spec 6.2). Kept outside scene/ so the page can
// build the view switch without loading Three.js.
export const VIEWS = [
  { id: 'ball-and-stick', label: 'Ball and stick' },
  { id: 'space-filling', label: 'Space filling' },
  { id: 'wireframe', label: 'Wireframe' },
  { id: 'lewis', label: '2D Lewis' },
] as const

export type ViewId = (typeof VIEWS)[number]['id']
/** The views the 3D scene draws; the Lewis view is SVG. */
export type SceneViewId = Exclude<ViewId, 'lewis'>

/** Why the 3D model could not be shown: the browser has no WebGL, or something else went wrong (a failed download, a data error). */
export function viewerFailure(error: unknown): 'webgl' | 'other' {
  return error instanceof Error && /webgl/i.test(error.message) ? 'webgl' : 'other'
}

export const VIEWER_FAILURE_TEXT = {
  webgl: 'The 3D model could not start in this browser.',
  other: 'The 3D model could not be drawn.',
} as const
