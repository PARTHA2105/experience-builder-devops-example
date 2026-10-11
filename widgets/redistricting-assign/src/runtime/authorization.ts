export interface ArcGISUserIdentity {
  id?: string
  username?: string
  email?: string
  fullName?: string
  role?: 'org_admin' | 'org_publisher' | 'org_user'
}

export function arcgisUserId(user: ArcGISUserIdentity | undefined): string | undefined {
  return user?.id?.trim() || undefined
}

export function isAuthenticated(user: ArcGISUserIdentity | undefined): boolean {
  const username = user?.username?.trim()
  const email = user?.email?.trim()
  const hasAccountName = Boolean(username && username.toLowerCase() !== 'anonymous')
  return Boolean(arcgisUserId(user) && username?.toLowerCase() !== 'anonymous' && (hasAccountName || email))
}

export function isSchoolSitePlanner(user: ArcGISUserIdentity | undefined): boolean {
  return isAuthenticated(user) && user?.role === 'org_admin'
}

export function isCommunityUser(user: ArcGISUserIdentity | undefined): boolean {
  return isAuthenticated(user) && !isSchoolSitePlanner(user)
}

export function canReviewPlans(user: ArcGISUserIdentity | undefined): boolean {
  return isSchoolSitePlanner(user)
}

export function canCreateScenario(user: ArcGISUserIdentity | undefined): boolean {
  return isAuthenticated(user)
}

export function roleLabelForUser(user: ArcGISUserIdentity | undefined): string {
  if (!isAuthenticated(user)) return 'Not signed in'
  if (canReviewPlans(user)) return 'Administrator/reviewer'
  return 'Community user'
}