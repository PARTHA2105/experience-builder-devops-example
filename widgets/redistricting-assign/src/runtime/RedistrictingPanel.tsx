import { React, getAppStore, observeStore } from 'jimu-core'
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import type MapView from '@arcgis/core/views/MapView'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type { IMConfig } from '../config'
import type { AssignmentState, Plan, PlanActivity, PlanDistrict, PlanNotification } from './types'
import { colorForDistrictId, verifyBaselinePlan, createDraftPlan, commitPlan, fetchPlansForUser, fetchAllAssignmentsForUser, fetchDistricts, fetchAssignments, fetchNotifications, fetchPlanActivity, reviewPlan, deleteScenario } from './PlanService'
import { useAssignmentTool } from './useAssignmentTool'
import { ScenarioForm } from './ScenarioForm'
import { PlanList } from './PlanList'
import { Icons } from './Icons'
import { NotificationPanel } from './NotificationPanel'
import { arcgisUserId, canCreateScenario, canReviewPlans, isAuthenticated, isCommunityUser, roleLabelForUser, PLANNER_USER_IDS } from './authorization'
import { getOrCreateAssignmentOverlay } from './AssignmentOverlay'
const { useState, useEffect, useRef, useCallback } = React

function errorDetails(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Unknown service error.'
}

interface Props {
  view: MapView
  baseLayer: FeatureLayer
  serviceUrl: string
  config: IMConfig
}

export function RedistrictingPanel({ view, baseLayer, serviceUrl, config }: Props) {
  const [currentUser, setCurrentUser] = useState(() => getAppStore().getState().user)
  const currentUserId = arcgisUserId(currentUser) ?? 'anonymous'
  const accessContextRef = useRef('')
  const effectiveUser = currentUser
  const currentUserName = currentUser?.fullName?.trim() || currentUser?.username?.trim() || currentUserId
  const authenticated = isAuthenticated(currentUser)
  const [activePlan, setActivePlan] = useState<{ plan: Plan; objectId?: number } | undefined>(undefined)
  const plannerUserIds = PLANNER_USER_IDS
  const accessContext = `${currentUserId}|${plannerUserIds.join(',')}`
  accessContextRef.current = accessContext
  const isCommunity = isCommunityUser(effectiveUser, plannerUserIds)
  const isPlanner = canReviewPlans(effectiveUser, plannerUserIds)
  const canCreate = canCreateScenario(effectiveUser)
  const activePlanVisible = activePlan && (
    activePlan.plan.owner_user_id === currentUserId ||
    activePlan.plan.owner_user_id === currentUser?.username ||
    (isPlanner && ['Submitted', 'Under Review'].includes(activePlan.plan.status))
  ) ? activePlan : undefined

  const overlayLayerRef = useRef<GraphicsLayer | undefined>(undefined)
  const [overlayLayerReady, setOverlayLayerReady] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [planSummaries, setPlanSummaries] = useState<Map<string, { assignedAreaCount: number; districtCount: number }>>(new Map())
  const [initialAssignments, setInitialAssignments] = useState<Map<string, AssignmentState>>(new Map())
  const [notifications, setNotifications] = useState<PlanNotification[]>([])
  const [isRefreshingNotifications, setIsRefreshingNotifications] = useState(false)
  const [notificationError, setNotificationError] = useState<string>()
  const [operationError, setOperationError] = useState<string>()
  const [isOpeningPlan, setIsOpeningPlan] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected' | undefined>(undefined)
  const [reviewComment, setReviewComment] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [activeTab, setActiveTab] = useState<'plans' | 'notifications'>('plans')
  const [planActivity, setPlanActivity] = useState<PlanActivity[]>([])
  const [districts, setDistricts] = useState<PlanDistrict[]>([])
  const [totalBlockCount, setTotalBlockCount] = useState(0)

  useEffect(() => {
    return observeStore(() => {
      setCurrentUser(getAppStore().getState().user)
    }, ['user'])
  }, [])

  useEffect(() => {
    const hubUrl = config.hubUrl?.trim()
    if (!authenticated && hubUrl) window.location.replace(hubUrl)
  }, [authenticated, config.hubUrl])

  useEffect(() => {
    setActivePlan(undefined)
    setPlanActivity([])
    setDistricts([])
    setPlans([])
    setPlanSummaries(new Map())
    setInitialAssignments(new Map())
    setNotifications([])
    setReviewStatus(undefined)
    setReviewComment('')
    setOperationError(undefined)
  }, [accessContext])

 useEffect(() => {
  overlayLayerRef.current = getOrCreateAssignmentOverlay(view)
  setOverlayLayerReady(true)

  const handle = view.map.layers.on('change', () => {
    const currentOverlay = overlayLayerRef.current
    const restored = getOrCreateAssignmentOverlay(view)
    if (restored !== currentOverlay) {
      const priorGraphics = currentOverlay?.graphics.toArray() ?? []
      overlayLayerRef.current = restored
      if (priorGraphics.length) restored.addMany(priorGraphics)
    }
  })

  return () => {
    handle.remove()
    overlayLayerRef.current = undefined
    setOverlayLayerReady(false)
  }
}, [view])

  useEffect(() => { baseLayer.queryFeatureCount().then(setTotalBlockCount) }, [baseLayer])

  // Points 2, 3, 5: loads on mount, and again after every save/submit —
  // this is what makes previously assigned areas reappear automatically.
  const refreshAllAssignments = useCallback(async () => {
    const accessContext = accessContextRef.current
    if (!authenticated) {
      setPlans([])
      setPlanSummaries(new Map())
      return
    }
    const p = await fetchPlansForUser(serviceUrl, currentUserId, currentUser?.username, effectiveUser, plannerUserIds)
    if (accessContext !== accessContextRef.current) return
    setPlans(p)
    const visiblePlanAssignments = await fetchAllAssignmentsForUser(serviceUrl, currentUserId, p)
    if (accessContext !== accessContextRef.current) return
    const summaryEntries = p.map((plan) => {
      const assignments = visiblePlanAssignments.assignmentsByPlan.get(plan.plan_id) ?? new Map()
      const districtIds = new Set(Array.from(assignments.values()).map((assignment) => assignment.district_id))
      return [plan.plan_id, { assignedAreaCount: assignments.size, districtCount: districtIds.size }] as const
    })
    setPlanSummaries(new Map(summaryEntries))
    window.dispatchEvent(new Event('redistricting:assignments-updated'))
  }, [serviceUrl, currentUserId, currentUser?.username, effectiveUser, plannerUserIds.join(','), authenticated])

  const refreshNotifications = useCallback(async () => {
    const accessContext = accessContextRef.current
    if (!isCommunity) {
      setNotifications([])
      return
    }
    setIsRefreshingNotifications(true)
    try {
      const result = await fetchNotifications(serviceUrl, currentUserId, currentUser?.username)
      if (accessContext === accessContextRef.current) setNotifications(result)
      if (accessContext === accessContextRef.current) setNotificationError(undefined)
    } catch (error) {
      console.warn('Notification load failed', error)
      if (accessContext === accessContextRef.current) setNotificationError('Review updates could not be loaded. Check the signed-in user and table permissions.')
    } finally {
      if (accessContext === accessContextRef.current) setIsRefreshingNotifications(false)
    }
  }, [serviceUrl, currentUserId, currentUser?.username, isCommunity])

  useEffect(() => {
    let cancelled = false
    refreshAllAssignments().catch((error) => {
      if (cancelled) return
      console.warn('Saved assignment load failed', error)
      setPlans([])
      setPlanSummaries(new Map())
    })
    return () => { cancelled = true }
  }, [refreshAllAssignments])

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  const tool = useAssignmentTool({
    view, baseLayer, overlayLayer: overlayLayerReady ? overlayLayerRef.current : undefined, serviceUrl,
    planId: activePlanVisible?.plan.plan_id, planObjectId: activePlanVisible?.objectId,
    districts, currentUsername: currentUser?.username, initialAssignments,
    parentPlanId: activePlanVisible?.plan.parent_plan_id,
    readonly: activePlanVisible ? !['Draft', 'Rejected'].includes(activePlanVisible.plan.status) : false,
  })

  const unassignedCount = Math.max(totalBlockCount - tool.assignments.size, 0)

  async function handleNewScenario() {
    if (!canCreate || isOpeningPlan) return
    setIsOpeningPlan(true)
    setOperationError(undefined)
    try {
      const baselinePlanId = config.baselinePlanId?.trim()
      const baselineAssignments = new Map<string, AssignmentState>()
      if (baselinePlanId) {
        await verifyBaselinePlan(serviceUrl, baselinePlanId)
        const loadedRows = await fetchAssignments(serviceUrl, baselinePlanId)
        for (const [geoid, row] of loadedRows) {
          baselineAssignments.set(geoid, {
            district_id: row.district_id,
            color: colorForDistrictId(row.district_id),
            assignmentId: crypto.randomUUID(),
          })
        }
      }
      if (arcgisUserId(getAppStore().getState().user) !== currentUserId) {
        throw new Error('The signed-in account changed. Reopen the widget before creating a scenario.')
      }
      const created = await createDraftPlan(
        serviceUrl,
        currentUserId,
        currentUser?.username ?? '',
        currentUserName,
        baselinePlanId || undefined,
      )
      if (baselineAssignments.size > 0) {
        await commitPlan({
          serviceUrl,
          existingPlanId: created.plan.plan_id,
          existingPlanObjectId: created.plan.OBJECTID,
          planName: created.plan.plan_name,
          description: '',
          ownerUserId: currentUserId,
          ownerUserAliases: currentUser?.username ? [currentUser.username] : [],
          ownerDisplayName: currentUserName,
          status: 'Draft',
          districts: created.districts,
          assignments: baselineAssignments,
          serverSnapshot: new Map(),
          parentPlanId: baselinePlanId || undefined,
        })
      }
      setDistricts(created.districts)
      setInitialAssignments(new Map())
      setPlanActivity([])
      setActivePlan({ plan: created.plan, objectId: created.plan.OBJECTID })
    } catch (error) {
      console.error('Scenario initialization failed', error)
      setOperationError(`A new scenario could not be initialized: ${errorDetails(error)}`)
      refreshAllAssignments().catch((refreshError) => {
        console.error('Scenario list refresh failed after initialization error', refreshError)
      })
    } finally {
      setIsOpeningPlan(false)
    }
  }

  async function handleOpenPlan(plan: Plan) {
    if (isOpeningPlan) return
    setIsOpeningPlan(true)
    setOperationError(undefined)
    try {
      const [d, activity] = await Promise.all([
        fetchDistricts(serviceUrl, plan.plan_id),
        fetchPlanActivity(serviceUrl, plan.plan_id),
      ])
      setDistricts(d)
      setPlanActivity(activity)
      setInitialAssignments(new Map())
      setActivePlan({ plan, objectId: plan.OBJECTID })
    } catch (error) {
      console.error('Scenario load failed', error)
      setOperationError('The selected scenario could not be loaded. Please try again.')
    } finally {
      setIsOpeningPlan(false)
    }

  }

  async function handleDeletePlans(selectedPlans: Plan[]) {
    if (isPlanner || selectedPlans.length === 0) return
    setOperationError(undefined)
    const failures: string[] = []
    for (const plan of selectedPlans) {
      try {
        await deleteScenario(serviceUrl, plan, currentUserId, currentUser?.username ? [currentUser.username] : [])
      } catch (error) {
        failures.push(`${plan.plan_name || 'Untitled scenario'}: ${errorDetails(error)}`)
      }
    }
    try {
      await refreshAllAssignments()
    } catch (error) {
      console.error('Scenario deletion failed', error)
      setOperationError(`Scenario deletion failed: ${errorDetails(error)}`)
      throw error
    }
    if (failures.length > 0) {
      const error = new Error(failures.join(' '))
      console.error('One or more scenario deletions failed', error)
      setOperationError(`Some scenarios could not be deleted: ${error.message}`)
      throw error
    }
  }

  async function handleOpenNotificationPlan(planId: string) {
    const plan = plans.find((candidate) => candidate.plan_id === planId)
    if (plan) {
      // Notification navigation is read-only until the plan status is loaded;
      // this path performs no applyEdits or scenario creation.
      setActiveTab('plans')
      setInitialAssignments(new Map())
      await handleOpenPlan(plan)
    }
  }

  function handleFocusAssignment(geoid: string) {
    tool.focusAssignment(geoid).catch((error) => {
      console.error('Assignment focus failed', error)
      setOperationError('The selected study area could not be highlighted.')
    })
  }

  async function handleSaveDraft(name: string, description: string) {
    if (!activePlan) return
    setOperationError(undefined)
    try {
      const result = await tool.commitToServer({ planName: name, description, status: 'Draft', ownerUserId: currentUserId, ownerDisplayName: currentUserName })
      setActivePlan({ plan: { ...activePlan.plan, plan_id: result.planId, plan_name: name, description, status: 'Draft' }, objectId: result.planObjectId })
    } catch (error) {
      console.error('Draft save failed', error)
      setOperationError('The draft could not be saved. Your editor remains open; please try again.')
      return
    }
    try { await refreshAllAssignments() } catch (error) {
      console.error('Scenario list refresh failed after draft save', error)
      setOperationError('Draft saved, but the scenario list could not be refreshed.')
    }
  }

  async function handlePersistAssignments() {
    if (!activePlan?.plan.plan_id || !['Draft', 'Rejected'].includes(activePlan.plan.status)) return
    setOperationError(undefined)
    try {
      await tool.commitToServer({
        planName: activePlan.plan.plan_name,
        description: activePlan.plan.description ?? '',
        status: 'Draft',
        ownerUserId: currentUserId,
        ownerDisplayName: currentUserName,
      })
    } catch (error) {
      console.error('Assignment save failed', error)
      setOperationError('Assignments could not be saved. Your editor remains open; please try again.')
      return
    }
    try { await refreshAllAssignments() } catch (error) {
      console.error('Scenario list refresh failed after assignment save', error)
      setOperationError('Assignments saved, but the scenario list could not be refreshed.')
    }
  }

  async function handleSubmit(name: string, description: string) {
    if (!activePlan || !['Draft', 'Rejected'].includes(activePlan.plan.status)) return
    if (!description.trim()) {
      setOperationError('Add a scenario description before submitting.')
      return
    }
    if (tool.assignments.size === 0) {
      setOperationError('Assign at least one study area before submitting.')
      return
    }
    if (!tool.metrics) {
      setOperationError('Population metrics are still loading. Try submitting again when they appear.')
      return
    }
    if (tool.metrics.deviationPercent > 10) {
      setOperationError(`Submission requires deviation at or below 10%. Current deviation is ${tool.metrics.deviationPercent.toFixed(1)}%.`)
      return
    }
    setOperationError(undefined)
    try {
      await tool.commitToServer({ planName: name, description, status: 'Submitted', ownerUserId: currentUserId, ownerDisplayName: currentUserName })
      setActivePlan(undefined)
      setDistricts([])
      setInitialAssignments(new Map())
    } catch (error) {
      console.error('Scenario submission failed', error)
      setOperationError(`Submission failed: ${errorDetails(error)}`)
      return
    }
    try { await refreshAllAssignments() } catch (error) {
      console.error('Scenario list refresh failed after submission', error)
      setOperationError('Scenario submitted, but the scenario list could not be refreshed.')
    }
  }

  function openReviewDialog(status: 'Approved' | 'Rejected') {
    setReviewComment('')
    setReviewStatus(status)
  }

  async function handleReview() {
    if (!isPlanner || !reviewStatus || !activePlan || !['Submitted', 'Under Review'].includes(activePlan.plan.status) || !reviewComment.trim()) return
    setIsReviewing(true)
    setOperationError(undefined)
    try {
      await reviewPlan(serviceUrl, activePlan.plan, effectiveUser, plannerUserIds, reviewStatus, reviewComment.trim())
      setActivePlan(undefined)
      setDistricts([])
      setPlanActivity([])
      setReviewStatus(undefined)
      await refreshAllAssignments()
      await refreshNotifications()
      window.dispatchEvent(new Event('redistricting:review-queue-updated'))
    } catch (error) {
      console.error('Scenario review failed', error)
      setOperationError('The review decision could not be saved. Please try again.')
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <div style={{ position: 'relative', padding: 12 }}>
      <div role="status" style={{ padding: '7px 9px', marginBottom: 10, borderRadius: 6, background: isPlanner ? '#eff6ff' : authenticated ? '#f0fdf4' : '#fff7ed', color: isPlanner ? '#1d4ed8' : authenticated ? '#166534' : '#9a3412', fontSize: 12 }}>
        {authenticated
          ? <>Signed in as <strong>{currentUser?.username}</strong> · Access: <strong>{isPlanner ? 'Planner/reviewer' : 'Community member'}</strong></>
          : <>Access: <strong>{roleLabelForUser(currentUser)}</strong></>}
      </div>
      {!authenticated && (
        <div style={{ padding: 10, marginBottom: 10, background: '#fff7ed', color: '#9a3412', fontSize: 12 }}>
          Sign in through the ArcGIS Hub page before creating or saving a scenario.
        </div>
      )}
      {authenticated && isCommunity && (
        <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db', marginBottom: 10 }}>
          <button onClick={() => { setActiveTab('plans') }} style={{ flex: 1, padding: '8px 6px', border: 0, borderBottom: activeTab === 'plans' ? '2px solid #185FA5' : '2px solid transparent', background: 'transparent', color: activeTab === 'plans' ? '#185FA5' : '#6b7280', fontWeight: activeTab === 'plans' ? 600 : 400 }}>My plans</button>
          <button onClick={() => { setActiveTab('notifications'); setActivePlan(undefined) }} style={{ flex: 1, padding: '8px 6px', border: 0, borderBottom: activeTab === 'notifications' ? '2px solid #185FA5' : '2px solid transparent', background: 'transparent', color: activeTab === 'notifications' ? '#185FA5' : '#6b7280', fontWeight: activeTab === 'notifications' ? 600 : 400 }}>Notifications {notifications.length > 0 ? `(${notifications.length})` : ''}</button>
        </div>
      )}
      {activeTab === 'notifications' && authenticated && isCommunity && <NotificationPanel notifications={notifications} onOpenPlan={handleOpenNotificationPlan} onRefresh={refreshNotifications} isRefreshing={isRefreshingNotifications} error={notificationError} />}
      {operationError && <div role="alert" style={{ padding: 8, margin: '8px 0', background: '#fef2f2', color: '#b42318', fontSize: 12 }}>{operationError}</div>}
      {isOpeningPlan && <div role="status" style={{ padding: 8, color: '#6b7280', fontSize: 12 }}>Loading scenario…</div>}
      {activeTab === 'plans' && !activePlan && !isPlanner && (
        <button
          type='button'
          onClick={handleNewScenario}
          disabled={!canCreate || isOpeningPlan}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '7px 11px', border: '1px solid #0b5cad', borderRadius: 6, background: '#0b5cad', color: '#fff', fontSize: 12, fontWeight: 600, cursor: !canCreate || isOpeningPlan ? 'not-allowed' : 'pointer', opacity: !canCreate || isOpeningPlan ? 0.6 : 1, boxShadow: '0 1px 2px rgba(16,24,40,0.12)' }}
        >
          {Icons.newPlan}
          Create new scenario
        </button>
      )}
    {activeTab === 'plans' && activePlanVisible && (
      <>
      <ScenarioForm
        plan={activePlanVisible.plan}
        districts={districts}
        metrics={tool.metrics}
        activity={planActivity}
        assignments={tool.assignments}
        onFocusAssignment={handleFocusAssignment}
        ownerDisplayName={currentUserName}
        onClose={() => { setActivePlan(undefined) }}
        targetDistrictId={tool.targetDistrictId}
        onChangeTarget={tool.setTargetDistrictId}
        isSelecting={tool.isSelecting}
        selectionMode={tool.selectionMode}
        onSelectTool={tool.selectTool}
        onClearSelection={tool.clearSelection}
        selectedCount={tool.selectedCount}
        previouslyAssignedCount={tool.previouslyAssignedCount}
        unassignedCount={unassignedCount}
        isSaving={tool.isSaving}
        onSaveAssignments={tool.applyLocalAssignment}
        onPersistAssignments={handlePersistAssignments}
        canPersistAssignments={Boolean(activePlanVisible.plan.plan_id) && ['Draft', 'Rejected'].includes(activePlanVisible.plan.status)}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        selectedPopulation={tool.selectedPopulation}
        readOnly={!['Draft', 'Rejected'].includes(activePlanVisible.plan.status)}
      />
      {isPlanner && ['Submitted', 'Under Review'].includes(activePlanVisible.plan.status) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button title="Approve this submitted plan" onClick={() => { openReviewDialog('Approved') }} style={{ fontSize: 12 }}>Approve plan</button>
          <button title="Reject this submitted plan and return it to the owner" onClick={() => { openReviewDialog('Rejected') }} style={{ fontSize: 12 }}>Reject plan</button>
        </div>
      )}
      </>
    )}
      {reviewStatus && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(17, 24, 39, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div style={{ width: '100%', maxWidth: 360, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>{reviewStatus === 'Approved' ? 'Approve scenario' : 'Reject scenario'}</h3>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280' }}>
              {reviewStatus === 'Approved' ? 'The owner will receive an approval notification and the plan will become read-only.' : 'The owner will receive a rejection notification and can revise and resubmit the plan.'}
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }} htmlFor="review-comment">Comment (required)</label>
            <textarea id="review-comment" value={reviewComment} onChange={(event) => { setReviewComment(event.target.value) }} placeholder="Add review notes for the plan owner" rows={4} style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => { setReviewStatus(undefined) }} disabled={isReviewing}>Cancel</button>
              <button onClick={handleReview} disabled={isReviewing || !reviewComment.trim()}>{isReviewing ? 'Saving...' : `Confirm ${reviewStatus.toLowerCase()}`}</button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'plans' && !activePlan && <PlanList plans={plans} onSelect={handleOpenPlan} onDelete={handleDeletePlans} isPlanner={isPlanner} summaries={planSummaries} />}
    </div>
  )
}