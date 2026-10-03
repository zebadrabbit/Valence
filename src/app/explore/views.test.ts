import { describe, expect, it } from 'vitest'
import { viewerFailure } from './views'

describe('viewerFailure', () => {
  it('recognises the renderer failing to get a WebGL context', () => {
    expect(viewerFailure(new Error('THREE.WebGLRenderer: Error creating WebGL context.'))).toBe('webgl')
  })

  it('does not blame the browser for a data error or a failed download', () => {
    expect(viewerFailure(new Error('cannot normalize a zero vector'))).toBe('other')
    expect(viewerFailure(new TypeError('Failed to load module script'))).toBe('other')
    expect(viewerFailure('nope')).toBe('other')
  })
})
