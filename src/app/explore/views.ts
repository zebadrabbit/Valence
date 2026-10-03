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
