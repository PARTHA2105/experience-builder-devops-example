import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import Graphic from '@arcgis/core/Graphic'
import type { AssignmentState, MergedAssignment, Plan, PlanActivity, PlanAssignmentRow, PlanDistrict, PlanNotification } from './types'
import { canReviewPlans, isAuthenticated, isUsingPlannerTestOverride, type ArcGISUserIdentity } from './authorization'
import { colorForDistrictId as generateDistrictColor } from './AssignmentSymbols'

export const LAYER_INDEX = { BASE: 0, PLANS: 1, DISTRICTS: 2, ASSIGNMENTS: 3, ACTIVITY_LOG: 4 } as const
const EDIT_BATCH_SIZE = 200

export function resolveServiceUrl(baseLayer: FeatureLayer): string {
  return baseLayer.url.replace(/\/\d+\/?$/, '')
}
function layer(serviceUrl: string, index: number): FeatureLayer {
  return new FeatureLayer({ url: `${serviceUrl}/${index}` })
}

async function queryAllFeatures(target: FeatureLayer, query: __esri.QueryProperties): Promise<__esri.Graphic[]> {
  await target.load()
  const objectIds = await target.queryObjectIds({ where: query.where ?? '1=1' }) ?? []
  const features: __esri.Graphic[] = []
  for (let start = 0; start < objectIds.length; start += 200) {
    const result = await target.queryFeatures({ ...query, objectIds: objectIds.slice(start, start + 200) })
    features.push(...result.features)
  }
  return features
}

interface FeatureEditResult {
  objectId?: number
  error?: { message?: string }
}

interface FeatureEditsResponse {
  addFeatureResults?: FeatureEditResult[]
  updateFeatureResults?: FeatureEditResult[]
  deleteFeatureResults?: FeatureEditResult[]
}

function assertEditsSucceeded(response: FeatureEditsResponse, operation: string): void {
  const failedResult = [
    ...(response.addFeatureResults ?? []),
    ...(response.updateFeatureResults ?? []),
    ...(response.deleteFeatureResults ?? []),
  ].find((result) => result.error)
  if (failedResult) throw new Error(`${operation} failed: ${failedResult.error?.message ?? 'Feature Service rejected an edit.'}`)
}

async function planIdExists(serviceUrl: string, planId: string): Promise<boolean> {
  const result = await layer(serviceUrl, LAYER_INDEX.PLANS).queryFeatures({
    where: `plan_id = ${sqlString(planId)}`,
    outFields: ['plan_id'],
    returnGeometry: false,
  })
  return result.features.length > 0
}

export function getAvailableDistricts(): Array<{ district_id: number; district_name: string }> {
  return Array.from({ length: 12 }, (_, i) => ({ district_id: i + 1, district_name: `District ${i + 1}` }))
}

export async function createDraftPlan(
  serviceUrl: string,
  ownerUserId: string,
  ownerUsername: string,
  ownerDisplayName: string,
  parentPlanId?: string,
): Promise<{ plan: Plan; districts: PlanDistrict[] }> {
  if (!ownerUserId.trim() || !ownerUsername.trim()) throw new Error('A signed-in ArcGIS user is required to create a scenario.')

  const planId = crypto.randomUUID()
  const now = Date.now()
  const result = await layer(serviceUrl, LAYER_INDEX.PLANS).applyEdits({
    addFeatures: [new Graphic({ attributes: {
      plan_id: planId,
      plan_name: 'Untitled scenario',
      description: '',
      owner_user_id: ownerUserId,
      owner_display_name: ownerDisplayName,
      status: 'Draft',
      visibility: 'Private',
      created_date: now,
      last_updated_date: now,
      is_locked: false,
      parent_plan_id: parentPlanId ?? null,
    }})],
  })
  assertEditsSucceeded(result, 'Scenario creation')
  const planObjectId = result.addFeatureResults?.[0]?.objectId
  if (planObjectId == null) throw new Error('Scenario creation did not return a server object id.')

  const districts = getAvailableDistricts().map((district) => ({
    plan_district_id: crypto.randomUUID(),
    plan_id: planId,
    district_id: district.district_id,
    district_name: district.district_name,
    district_color: colorForDistrictId(district.district_id),
    isPersisted: true,
  }))
  const districtResult = await layer(serviceUrl, LAYER_INDEX.DISTRICTS).applyEdits({
    addFeatures: districts.map((district) => new Graphic({ attributes: {
      plan_district_id: district.plan_district_id,
      plan_id: district.plan_id,
      district_id: district.district_id,
      district_name: district.district_name,
      district_color: district.district_color,
    }})),
  })
  assertEditsSucceeded(districtResult, 'Scenario district creation')
  const activityResult = await layer(serviceUrl, LAYER_INDEX.ACTIVITY_LOG).applyEdits({
    addFeatures: [new Graphic({ attributes: {
      activity_id: crypto.randomUUID(),
      plan_id: planId,
      actor_user_id: ownerUserId,
      activity_type: 'Plan created',
      activity_date: now,
      affected_unit_count: 0,
      notes: '',
    }})],
  })
  assertEditsSucceeded(activityResult, 'Scenario creation activity')
  return {
    plan: {
      OBJECTID: planObjectId,
      plan_id: planId,
      plan_name: 'Untitled scenario',
      description: '',
      owner_user_id: ownerUserId,
      owner_display_name: ownerDisplayName,
      status: 'Draft',
      visibility: 'Private',
      created_date: now,
      last_updated_date: now,
      is_locked: false,
      parent_plan_id: parentPlanId,
    },
    districts,
  }
}

export async function verifyBaselinePlan(serviceUrl: string, baselinePlanId: string): Promise<void> {
  const existing = await layer(serviceUrl, LAYER_INDEX.PLANS).queryFeatures({
    where: `plan_id = ${sqlString(baselinePlanId)}`,
    outFields: ['plan_id'],
    returnGeometry: false,
  })
  if (existing.features.length === 0) {
    throw new Error(`Baseline plan ${baselinePlanId} was not found. Configure an existing baseline plan ID.`)
  }
}

export function districtNameForId(districtId: number): string {
  return getAvailableDistricts().find((d) => d.district_id === districtId)?.district_name ?? `District ${districtId}`
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function colorForDistrictId(districtId: number): string {
  return generateDistrictColor(districtId)
}

export async function fetchMyPlans(serviceUrl: string, ownerUserId: string, legacyUsername?: string): Promise<Plan[]> {
  const ownerIds = Array.from(new Set([ownerUserId, legacyUsername].filter((value): value is string => Boolean(value?.trim()))))
  if (ownerIds.length === 0) return []
  const features = await queryAllFeatures(layer(serviceUrl, LAYER_INDEX.PLANS), {
    where: `owner_user_id IN (${ownerIds.map(sqlString).join(', ')})`,
    outFields: ['*'],
    orderByFields: ['last_updated_date DESC'],
    returnGeometry: false,
  })
  const plansById = new Map<string, Plan>()
  for (const feature of features) {
    const plan = feature.attributes as Plan
    plansById.set(plan.plan_id, plan)
  }
  return Array.from(plansById.values()).sort((a, b) => (b.last_updated_date ?? 0) - (a.last_updated_date ?? 0))
}

export async function fetchPlansForReview(serviceUrl: string): Promise<Plan[]> {
  const features = await queryAllFeatures(layer(serviceUrl, LAYER_INDEX.PLANS), {
    where: "status IN ('Submitted', 'Under Review')",
    outFields: ['*'],
    orderByFields: ['submitted_date DESC'],
    returnGeometry: false,
  })
  return features
    .map((feature) => feature.attributes as Plan)
    .sort((a, b) => (b.submitted_date ?? 0) - (a.submitted_date ?? 0))
}

export async function fetchPlansForUser(
  serviceUrl: string,
  ownerUserId: string,
  ownerUsername: string | undefined,
  reviewer: ArcGISUserIdentity | undefined,
  plannerUserIds: string[] = [],
): Promise<Plan[]> {
  const ownPlans = await fetchMyPlans(serviceUrl, ownerUserId, ownerUsername)
  if (!canReviewPlans(reviewer, plannerUserIds)) return ownPlans

  const reviewPlans = await fetchPlansForReview(serviceUrl)
  return reviewPlans
    .filter((plan) => isUsingPlannerTestOverride() || (plan.owner_user_id !== ownerUserId && plan.owner_user_id !== ownerUsername))
    .sort((a, b) => (b.submitted_date ?? 0) - (a.submitted_date ?? 0))
}

export async function fetchNotifications(serviceUrl: string, ownerUserId: string, legacyUsername?: string): Promise<PlanNotification[]> {
  const plans = await fetchMyPlans(serviceUrl, ownerUserId, legacyUsername)
  const notifications: PlanNotification[] = []
  for (const plan of plans) {
    const planReviewStatuses = new Set<'Approved' | 'Rejected'>()
    const features = await queryAllFeatures(layer(serviceUrl, LAYER_INDEX.ACTIVITY_LOG), {
      where: `plan_id = ${sqlString(plan.plan_id)}`,
      outFields: ['*'],
      orderByFields: ['activity_date DESC'],
      returnGeometry: false,
    })
    for (const feature of features) {
      const activityType = String(feature.attributes.activity_type ?? '').trim().toLowerCase()
      if (activityType !== 'review approved' && activityType !== 'review rejected') continue
      const notes = String(feature.attributes.notes ?? '').trim()
      notifications.push({
        activityId: String(feature.attributes.activity_id),
        planId: plan.plan_id,
        planName: plan.plan_name,
        status: activityType === 'review approved' ? 'Approved' : 'Rejected',
        actorName: 'Reviewer',
        activityDate: Number(feature.attributes.activity_date) || 0,
        comment: notes.toLowerCase().startsWith('batch ') ? '' : notes,
      })
      planReviewStatuses.add(activityType === 'review approved' ? 'Approved' : 'Rejected')
    }

    const planStatus = String(plan.status ?? '').trim()
    if ((planStatus === 'Approved' || planStatus === 'Rejected') && !planReviewStatuses.has(planStatus)) {
      notifications.push({
        activityId: `plan-status-${plan.plan_id}-${planStatus}`,
        planId: plan.plan_id,
        planName: plan.plan_name,
        status: planStatus,
        actorName: 'Reviewer',
        activityDate: plan.last_updated_date ?? plan.submitted_date ?? 0,
        comment: '',
      })
    }
  }
  return notifications.sort((a, b) => b.activityDate - a.activityDate)
}

export async function fetchDistricts(serviceUrl: string, planId: string): Promise<PlanDistrict[]> {
  const features = await queryAllFeatures(layer(serviceUrl, LAYER_INDEX.DISTRICTS), {
    where: `plan_id = ${sqlString(planId)}`,
    outFields: ['*'],
    returnGeometry: false,
  })
  return features.map((f) => ({
    ...(f.attributes as PlanDistrict),
    district_id: Number(f.attributes.district_id),
    isPersisted: true,
  }))
}

export async function fetchAssignments(serviceUrl: string, planId: string): Promise<Map<string, PlanAssignmentRow>> {
  const features = await queryAllFeatures(layer(serviceUrl, LAYER_INDEX.ASSIGNMENTS), {
    where: `plan_id = ${sqlString(planId)}`,
    outFields: ['*'],
    returnGeometry: false,
  })
  const byGeoid = new Map<string, PlanAssignmentRow>()
  for (const f of features) {
    byGeoid.set(String(f.attributes.GEOID20), {
      ...(f.attributes as PlanAssignmentRow),
      district_id: Number(f.attributes.district_id),
    })
  }
  return byGeoid
}

export async function fetchPlanActivity(serviceUrl: string, planId: string): Promise<PlanActivity[]> {
  const features = await queryAllFeatures(layer(serviceUrl, LAYER_INDEX.ACTIVITY_LOG), {
    where: `plan_id = ${sqlString(planId)}`,
    outFields: ['*'],
    orderByFields: ['activity_date DESC'],
    returnGeometry: false,
  })
  return features
    .map((feature) => ({
      ...(feature.attributes as PlanActivity),
      activity_date: Number(feature.attributes.activity_date) || 0,
      affected_unit_count: Number(feature.attributes.affected_unit_count) || 0,
    }))
    .sort((a, b) => b.activity_date - a.activity_date)
}

export async function deleteScenario(
  serviceUrl: string,
  plan: Plan,
  ownerUserId: string,
  ownerAliases: string[] = [],
): Promise<void> {
  if (!plan.plan_id || !plan.OBJECTID || !ownerUserId.trim()) {
    throw new Error('A saved scenario and signed-in owner are required for deletion.')
  }
  if (!['Draft', 'Rejected'].includes(plan.status)) {
    throw new Error('Only your Draft or Rejected scenarios can be deleted. Submitted and reviewed plans are retained for audit history.')
  }

  const planLayer = layer(serviceUrl, LAYER_INDEX.PLANS)
  const storedPlans = await queryAllFeatures(planLayer, {
    where: `plan_id = ${sqlString(plan.plan_id)}`,
    outFields: ['OBJECTID', 'owner_user_id', 'status'],
    returnGeometry: false,
  })
  const storedPlan = storedPlans.find((feature) => Number(feature.attributes.OBJECTID) === plan.OBJECTID)
  if (!storedPlan) throw new Error('The scenario could not be verified on the Feature Service.')

  const owners = new Set([ownerUserId, ...ownerAliases].map((value) => value.trim()).filter(Boolean))
  if (!owners.has(String(storedPlan.attributes.owner_user_id ?? ''))) {
    throw new Error('You can only delete scenarios that belong to your ArcGIS account.')
  }
  if (!['Draft', 'Rejected'].includes(String(storedPlan.attributes.status))) {
    throw new Error('This scenario is no longer deletable because its status changed.')
  }

  const relatedTables = [LAYER_INDEX.ASSIGNMENTS, LAYER_INDEX.DISTRICTS, LAYER_INDEX.ACTIVITY_LOG]
  for (const index of relatedTables) {
    const target = layer(serviceUrl, index)
    const relatedFeatures = await queryAllFeatures(target, {
      where: `plan_id = ${sqlString(plan.plan_id)}`,
      outFields: ['OBJECTID'],
      returnGeometry: false,
    })
    const objectIds = relatedFeatures
      .map((feature) => Number(feature.attributes.OBJECTID))
      .filter(Number.isFinite)
    for (let start = 0; start < objectIds.length; start += EDIT_BATCH_SIZE) {
      const result = await target.applyEdits({
        deleteFeatures: objectIds.slice(start, start + EDIT_BATCH_SIZE).map((objectId) => new Graphic({ attributes: { OBJECTID: objectId } })),
      })
      assertEditsSucceeded(result, 'Scenario data deletion')
    }
  }

  const planDeleteResult = await planLayer.applyEdits({
    deleteFeatures: [new Graphic({ attributes: { OBJECTID: plan.OBJECTID } })],
  })
  assertEditsSucceeded(planDeleteResult, 'Scenario deletion')
}

export async function reviewPlan(
  serviceUrl: string,
  plan: Plan,
  reviewer: ArcGISUserIdentity | undefined,
  plannerUserIds: string[],
  status: 'Approved' | 'Rejected',
  comment: string,
): Promise<void> {
  const reviewerUserId = reviewer?.id?.trim()
  if (!reviewerUserId || !isAuthenticated(reviewer) || !canReviewPlans(reviewer, plannerUserIds)) {
    throw new Error('Planner authorization is required to review scenarios.')
  }
  if (!comment.trim()) throw new Error('A comment is required to review a scenario.')
  if (!plan.OBJECTID) throw new Error('The selected plan has no server object id.')
  if (plan.status !== 'Submitted' && plan.status !== 'Under Review') {
    throw new Error('Only submitted scenarios can be reviewed.')
  }
  const now = Date.now()
  const updateResult = await layer(serviceUrl, LAYER_INDEX.PLANS).applyEdits({
    updateFeatures: [new Graphic({ attributes: {
      OBJECTID: plan.OBJECTID,
      status,
      is_locked: true,
      last_updated_date: now,
    }})],
  })
  assertEditsSucceeded(updateResult, 'Review status update')
  const activityResult = await layer(serviceUrl, LAYER_INDEX.ACTIVITY_LOG).applyEdits({
    addFeatures: [new Graphic({ attributes: {
      activity_id: crypto.randomUUID(),
      plan_id: plan.plan_id,
      actor_user_id: reviewerUserId,
      activity_type: status === 'Approved' ? 'Review approved' : 'Review rejected',
      activity_date: now,
      affected_unit_count: 0,
      notes: comment.trim(),
    }})],
  })
  assertEditsSucceeded(activityResult, 'Review activity creation')
}

// Later-updated plans win for any block claimed by more than one plan —
// see the comment in useAssignmentTool's merge effect for the alternative
// if you'd rather the currently open plan always win instead.
export async function fetchAllAssignmentsForUser(
  serviceUrl: string,
  ownerUserId: string,
  plans?: Plan[],
): Promise<{ plans: Plan[]; merged: Map<string, MergedAssignment>; assignmentsByPlan: Map<string, Map<string, PlanAssignmentRow>> }> {
  // Kept for callers outside the widget; the panel now loads only the active plan.
  const selectedPlans = plans ?? await fetchMyPlans(serviceUrl, ownerUserId)
  const sortedOldestFirst = [...selectedPlans].sort((a, b) => (a.last_updated_date ?? 0) - (b.last_updated_date ?? 0))
  const rowsPerPlan = await Promise.all(sortedOldestFirst.map((p) => fetchAssignments(serviceUrl, p.plan_id)))
  const assignmentsByPlan = new Map(sortedOldestFirst.map((plan, index) => [plan.plan_id, rowsPerPlan[index]]))

  const merged = new Map<string, MergedAssignment>()
  sortedOldestFirst.forEach((plan, idx) => {
    for (const [geoid, row] of rowsPerPlan[idx]) {
      merged.set(geoid, {
        planId: plan.plan_id,
        district_id: row.district_id,
        color: colorForDistrictId(row.district_id),
        objectId: row.OBJECTID,
        assignmentId: row.assignment_id,
      })
    }
  })
  return { plans: selectedPlans, merged, assignmentsByPlan }
}

interface CommitArgs {
  serviceUrl: string
  existingPlanId: string | undefined
  existingPlanObjectId: number | undefined
  planName: string
  description: string
  ownerUserId: string
  ownerUserAliases?: string[]
  ownerDisplayName: string
  status: 'Draft' | 'Submitted'
  districts: PlanDistrict[]
  assignments: Map<string, AssignmentState>
  serverSnapshot: Map<string, PlanAssignmentRow>
  parentPlanId?: string
}

export async function commitPlan({
  serviceUrl, existingPlanId, existingPlanObjectId, planName, description,
  ownerUserId, ownerUserAliases = [], ownerDisplayName, status, districts, assignments, serverSnapshot,
  parentPlanId,
}: CommitArgs) {
  if (!ownerUserId.trim()) throw new Error('A signed-in ArcGIS user is required to save a scenario.')
  if (status === 'Submitted' && !description.trim()) {
    throw new Error('A scenario rationale is required before submission.')
  }

  const now = Date.now()
  let planId = existingPlanId
  let planObjectId = existingPlanObjectId

  if (!planId || planObjectId == null) {
    let inserted = false
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      planId = crypto.randomUUID()
      if (await planIdExists(serviceUrl, planId)) continue
      let result
      try {
        result = await layer(serviceUrl, LAYER_INDEX.PLANS).applyEdits({
          addFeatures: [new Graphic({ attributes: {
            plan_id: planId, plan_name: planName, description, owner_user_id: ownerUserId,
            owner_display_name: ownerDisplayName, status: 'Draft', visibility: 'Private',
            created_date: now, last_updated_date: now,
            submitted_date: null,
            is_locked: false, parent_plan_id: parentPlanId ?? null,
          }})],
        })
      } catch (error) {
        if (await planIdExists(serviceUrl, planId)) continue
        throw error
      }
      const addResult = result.addFeatureResults?.[0]
      if (addResult?.error) {
        if (await planIdExists(serviceUrl, planId)) continue
        throw new Error(`Scenario creation failed: ${addResult.error.message ?? 'Feature Service rejected the insert.'}`)
      }
      if (addResult?.objectId == null) throw new Error('Scenario creation did not return a server object id.')
      planObjectId = addResult.objectId
      inserted = true
    }
    if (!inserted) throw new Error('Could not allocate a unique scenario ID. Please retry.')
  } else {
    const storedPlan = await layer(serviceUrl, LAYER_INDEX.PLANS).queryFeatures({
      where: `plan_id = ${sqlString(planId)}`,
      outFields: ['OBJECTID', 'owner_user_id', 'status'],
      returnGeometry: false,
    })
    const storedPlanAttributes = storedPlan.features[0]?.attributes
    if (!storedPlanAttributes || Number(storedPlanAttributes.OBJECTID) !== planObjectId) {
      throw new Error('The selected scenario could not be verified on the Feature Service.')
    }
    const allowedOwners = new Set([ownerUserId, ...ownerUserAliases].map((value) => value.trim()).filter(Boolean))
    if (!allowedOwners.has(String(storedPlanAttributes.owner_user_id ?? ''))) {
      throw new Error('You do not own this scenario.')
    }
    if (!['Draft', 'Rejected'].includes(String(storedPlanAttributes.status))) {
      throw new Error('This scenario is locked and cannot be edited.')
    }
  }

  // Auto-create any PlanDistricts row that's missing for a district_id
  // actually used in this commit — replaces the old "+ Create new
  // district" step entirely. Name/color are always the deterministic
  // ones, so this self-heals even if a row already existed with a
  // different color for some reason.
  const usedDistrictIds = new Set(Array.from(assignments.values()).map((a) => a.district_id))
  const knownIds = new Set(districts.filter((d) => d.isPersisted && d.plan_id === planId).map((d) => d.district_id))
  const districtsToAdd = Array.from(usedDistrictIds)
    .filter((id) => !knownIds.has(id))
    .map((id) => ({
      plan_district_id: crypto.randomUUID(),
      plan_id: planId,
      district_id: String(id),
      district_name: districtNameForId(id),
      district_color: colorForDistrictId(id),
    }))
  if (districtsToAdd.length > 0) {
    const districtResult = await layer(serviceUrl, LAYER_INDEX.DISTRICTS).applyEdits({
      addFeatures: districtsToAdd.map((attrs) => new Graphic({ attributes: attrs })),
    })
    assertEditsSucceeded(districtResult, 'District creation')
  }

  const adds: Graphic[] = []
  const updates: Graphic[] = []
  const deletes: Graphic[] = []
  const changeBatchId = crypto.randomUUID()

  for (const [geoid, state] of assignments) {
    const prior = serverSnapshot.get(geoid)
    const attributes = { plan_id: planId, GEOID20: geoid, district_id: String(state.district_id), assigned_by_user_id: ownerUserId, assigned_date: prior?.assigned_date ?? now, last_updated_date: now, change_batch_id: changeBatchId, assignment_method: 'Interactive map' }
    if (prior?.OBJECTID) {
      if (prior.district_id !== state.district_id) updates.push(new Graphic({ attributes: { ...attributes, OBJECTID: prior.OBJECTID } }))
    } else {
      adds.push(new Graphic({ attributes: { ...attributes, assignment_id: crypto.randomUUID() } }))
    }
  }
  for (const [geoid, row] of serverSnapshot) {
    if (!assignments.has(geoid) && row.OBJECTID) deletes.push(new Graphic({ attributes: { OBJECTID: row.OBJECTID } }))
  }

  const assignmentLayer = layer(serviceUrl, LAYER_INDEX.ASSIGNMENTS)
  const batchCount = Math.ceil(Math.max(adds.length, updates.length, deletes.length) / EDIT_BATCH_SIZE)
  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const start = batchIndex * EDIT_BATCH_SIZE
    const assignmentResult = await assignmentLayer.applyEdits({
      addFeatures: adds.slice(start, start + EDIT_BATCH_SIZE),
      updateFeatures: updates.slice(start, start + EDIT_BATCH_SIZE),
      deleteFeatures: deletes.slice(start, start + EDIT_BATCH_SIZE),
    })
    assertEditsSucceeded(assignmentResult, 'Assignment save')
  }

  const planUpdateResult = await layer(serviceUrl, LAYER_INDEX.PLANS).applyEdits({
    updateFeatures: [new Graphic({ attributes: {
      OBJECTID: planObjectId,
      owner_user_id: ownerUserId,
      plan_name: planName,
      description,
      status,
      last_updated_date: now,
      submitted_date: status === 'Submitted' ? now : undefined,
      is_locked: status === 'Submitted',
    }})],
  })
  assertEditsSucceeded(planUpdateResult, 'Scenario status update')

  const activityResult = await layer(serviceUrl, LAYER_INDEX.ACTIVITY_LOG).applyEdits({
    addFeatures: [new Graphic({ attributes: {
      activity_id: crypto.randomUUID(),
      plan_id: planId,
      actor_user_id: ownerUserId,
      activity_type: status === 'Submitted' ? 'Plan submitted' : 'Plan saved',
      activity_date: now,
      affected_unit_count: adds.length + updates.length + deletes.length,
      notes: `Batch ${changeBatchId}`,
    }})],
  })
  assertEditsSucceeded(activityResult, status === 'Submitted' ? 'Submission activity creation' : 'Draft activity creation')

  return { planId, planObjectId }
}