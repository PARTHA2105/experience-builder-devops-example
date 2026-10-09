import {
  arcgisUserId,
  canCreateScenario,
  canReviewPlans,
  isAuthenticated,
  isCommunityUser,
  isDeveloperBuild,
  isUsingPlannerTestOverride,
  TEST_ROLE_OVERRIDE,
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

  it('grants review access only to configured planner IDs', () => {
    const plannerIds = ['planner-456']
    const planner = { id: 'planner-456', username: 'planner-user' }

    expect(canReviewPlans(planner, plannerIds)).toBe(true)
    expect(canReviewPlans(communityUser, plannerIds)).toBe(false)
    expect(isCommunityUser(communityUser, plannerIds)).toBe(true)
    expect(isCommunityUser(planner, plannerIds)).toBe(false)
    expect(canCreateScenario(communityUser)).toBe(true)
  })

  it('grants reviewer access to authenticated ArcGIS organization administrators', () => {
    const administrator = { id: 'admin-789', username: 'hub-admin', role: 'org_admin' as const }
    const registeredMember = { id: 'member-789', username: 'hub-member', role: 'org_user' as const }

    expect(canReviewPlans(administrator)).toBe(true)
    expect(isCommunityUser(administrator)).toBe(false)
    expect(canReviewPlans(registeredMember)).toBe(false)
    expect(isCommunityUser(registeredMember)).toBe(true)
    expect(canReviewPlans({ ...administrator, username: 'anonymous' })).toBe(false)
  })

  it('uses an explicit development role override only for authenticated users', () => {
    if (isDeveloperBuild && TEST_ROLE_OVERRIDE) {
      expect(canReviewPlans(communityUser)).toBe(TEST_ROLE_OVERRIDE === 'planner')
      expect(isCommunityUser(communityUser)).toBe(TEST_ROLE_OVERRIDE === 'community')
    } else {
      expect(canReviewPlans(communityUser, ['user-123'])).toBe(true)
      expect(isCommunityUser(communityUser, ['user-123'])).toBe(false)
    }
    expect(canReviewPlans(undefined)).toBe(false)
  })

  it('allows a developer testing as a planner to review their own submitted test plan', () => {
    expect(isUsingPlannerTestOverride()).toBe(isDeveloperBuild && TEST_ROLE_OVERRIDE === 'planner')
  })
})
