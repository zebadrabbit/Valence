import { Component, type ReactNode } from 'react'
import { viewerFailure } from './views'

// What a page that holds a 3D scene needs before and around it, kept outside scene/ so that it loads without Three.js.

/**
 * Whether the browser can give the WebGL 2 context three needs. Asked once, before the first
 * Canvas, so a browser without it gets a plain message and no renderer errors in its console.
 */
let webgl: boolean | undefined
export function hasWebgl(): boolean {
  if (webgl === undefined) {
    const context = document.createElement('canvas').getContext('webgl2')
    webgl = context !== null
    // Browsers allow only a few contexts at a time; hand this one back.
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return webgl
}

/** Catches a failed chunk load, a data error in the scene, and the renderer failing to start. */
export class ViewerBoundary extends Component<{ onFail(why: 'webgl' | 'other'): void; children: ReactNode }, { failed: boolean }> {
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
