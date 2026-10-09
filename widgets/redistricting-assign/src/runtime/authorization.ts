export interface ArcGISUserIdentity {
  id?: string
  username?: string
  fullName?: string
}

export const isDeveloperBuild = process.env.NODE_ENV === 'development'

// In development, change this to 'planner' or 'community' to test either UI.
// This only affects the widget; it does not grant Feature Service permissions.
export const TEST_ROLE_OVERRIDE: 'planner' | 'community' | undefined = 'planner'
export const PLANNER_USER_IDS: string[] = []

export function isUsingPlannerTestOverride(): boolean {
  return isDeveloperBuild && TEST_ROLE_OVERRIDE === 'planner'
}

export function arcgisUserId(user: ArcGISUserIdentity | undefined): string | undefined {
  return user?.id?.trim() || undefined
}

function matches(userId: string | undefined, configuredUserIds: string[]): boolean {
  return Boolean(userId && configuredUserIds.some((value) => value.trim() === userId))
}

export function isAuthenticated(user: ArcGISUserIdentity | undefined): boolean {
  const username = user?.username?.trim()
  return Boolean(arcgisUserId(user) && username && username.toLowerCase() !== 'anonymous')
}

export function isSchoolSitePlanner(user: ArcGISUserIdentity | undefined, plannerUserIds: string[] = []): boolean {
  if (isAuthenticated(user) && isDeveloperBuild && TEST_ROLE_OVERRIDE) {
    return TEST_ROLE_OVERRIDE === 'planner'
  }
  return isAuthenticated(user) && matches(arcgisUserId(user), plannerUserIds)
}

export function isCommunityUser(user: ArcGISUserIdentity | undefined, plannerUserIds: string[] = []): boolean {
  return isAuthenticated(user) && !isSchoolSitePlanner(user, plannerUserIds)
}

export function canReviewPlans(user: ArcGISUserIdentity | undefined, plannerUserIds: string[] = []): boolean {
  return isSchoolSitePlanner(user, plannerUserIds)
}

export function canCreateScenario(user: ArcGISUserIdentity | undefined): boolean {
  return isAuthenticated(user)
}

export function roleLabelForUser(user: ArcGISUserIdentity | undefined, plannerUserIds: string[] = []): string {
  if (!isAuthenticated(user)) return 'Not signed in'
  if (canReviewPlans(user, plannerUserIds)) return 'Planner/reviewer'
  return 'Community user'
}