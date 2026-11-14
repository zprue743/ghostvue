import { describe, expect, it } from 'vitest'

import { deriveGhostAvatarInitials } from './use-ghost-avatar'

describe('deriveGhostAvatarInitials', () => {
  it('returns empty for blank input', () => {
    expect(deriveGhostAvatarInitials('')).toBe('')
    expect(deriveGhostAvatarInitials('   ')).toBe('')
  })

  it('uses two words when present', () => {
    expect(deriveGhostAvatarInitials('Jane Doe')).toBe('JD')
  })

  it('uses the first two graphemes for a single word', () => {
    expect(deriveGhostAvatarInitials('Ghost')).toBe('GH')
  })
})
