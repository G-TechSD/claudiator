import { describe, it, expect } from 'vitest'

// Mirror the utils functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

describe('generateId', () => {
  it('should generate non-empty string', () => {
    const id = generateId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('should generate alphanumeric IDs', () => {
    const id = generateId()
    expect(id).toMatch(/^[a-z0-9]+$/)
  })

  it('should generate IDs of reasonable length', () => {
    const id = generateId()
    expect(id.length).toBeGreaterThanOrEqual(10)
    expect(id.length).toBeLessThanOrEqual(13)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    // Should have high uniqueness (allow for tiny collision chance)
    expect(ids.size).toBeGreaterThanOrEqual(99)
  })
})
