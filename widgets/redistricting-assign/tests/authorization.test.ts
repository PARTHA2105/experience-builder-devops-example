import {
  arcgisUserId,
  canCreateScenario,
  canReviewPlans,
  isAuthenticated,
  isCommunityUser,
} from '../src/runtime/authorization'

describe('ArcGIS user authorization', () => {
  const communityUser = { id: 'user-123', username: 'community-user' }

  it('uses the ArcGIS user ID without substituting a development identity', () => {
    expect(arcgisUserId(communityUser)).toBe('user-123')
    expect(arcgisUserId({ id: '', username: 'community-user' })).toBeUndefined()
  })

  it('requires an authenticated ArcGIS identity with a stable ID', () => {
    expect(isAuthenticated(communityUser)).toBe(true)
    expect(isAuthenticated({ username: 'community-user' })).toBe(false)
    expect(isAuthenticated({ id: 'anonymous-id', username: 'anonymous' })).toBe(false)
  })

  it('classifies authenticated non-administrator accounts as community members', () => {
    expect(canReviewPlans(communityUser)).toBe(false)
    expect(isCommunityUser(communityUser)).toBe(true)
    expect(canCreateScenario(communityUser)).toBe(true)
  })

  it('classifies authenticated ArcGIS organization administrators as reviewers', () => {
    const administrator = { id: 'admin-789', username: 'hub-admin', role: 'org_admin' as const }

    expect(canReviewPlans(administrator)).toBe(true)
    expect(isCommunityUser(administrator)).toBe(false)
    expect(canReviewPlans({ ...administrator, username: 'anonymous' })).toBe(false)
  })

  it('treats a signed-in community member with an email identity as a community user', () => {
    const gmailMember = { id: 'member-456', email: 'member@gmail.com' }

    expect(isAuthenticated(gmailMember)).toBe(true)
    expect(canReviewPlans(gmailMember)).toBe(false)
    expect(isCommunityUser(gmailMember)).toBe(true)
    expect(canCreateScenario(gmailMember)).toBe(true)
    expect(isAuthenticated({ email: 'member@gmail.com' })).toBe(false)
    expect(isAuthenticated({ id: 'anonymous-id', username: 'anonymous', email: 'member@gmail.com' })).toBe(false)
  })
})
