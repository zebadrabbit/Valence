import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('runs in node, without a DOM', () => {
    expect(typeof document).toBe('undefined')
  })
})
