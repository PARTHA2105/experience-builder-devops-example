import { React, getAppStore, observeStore } from 'jimu-core'
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import type MapView from '@arcgis/core/views/MapView'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type { IMConfig } from '../config'
import type { AssignmentState, Plan, PlanActivity, PlanDistrict, PlanNotification } from './types'
import { colorForDistrictId, verifyBaselinePlan, createDraftPlan, commitPlan, fetchPlansForUser, fetchAllAssignmentsForUser, fetchDistricts, fetchAssignments, fetchNotifications, fetchPlanActivity, reviewPlan, deleteScenario, type PlanServiceSource } from './PlanService'
import { useAssignmentTool } from './useAssignmentTool'
import { ScenarioForm } from './ScenarioForm'
import { PlanList } from './PlanList'
import { Icons } from './Icons'
import { NotificationPanel } from './NotificationPanel'
import { arcgisUserId, canCreateScenario, canReviewPlans, isAuthenticated, isCommunityUser } from './authorization'
import { getOrCreateAssignmentOverlay } from './AssignmentOverlay'
import { errorDetails } from './error-details'
const { useState, useEffect, useRef, useCallback } = React

interface Props {
  view: MapView
  baseLayer: FeatureLayer
  serviceUrl: PlanServiceSource
  config: IMConfig
  onSignIn: () => Promise<void>
  onSwitchAccount: () => Promise<void>
  onSignOut: () => Promise<void>
  isAccountActionPending: boolean
  accountActionError?: string
}

export function RedistrictingPanel({ view, baseLayer, serviceUrl, config, onSignIn, onSwitchAccount, onSignOut, isAccountActionPending, accountActionError }: Props) {
  const [currentUser, setCurrentUser] = useState(() => getAppStore().getState().user)
  const currentUserId = arcgisUserId(currentUser) ?? 'anonymous'
  const accessContextRef = useRef('')
  const effectiveUser = currentUser
  const currentUserName = currentUser?.fullName?.trim() || currentUser?.username?.trim() || currentUser?.email?.trim() || currentUserId
  const authenticated = isAuthenticated(currentUser)
  const [activePlan, setActivePlan] = useState<{ plan: Plan; objectId?: number } | undefined>(undefined)
  const accessContext = `${currentUserId}|${currentUser?.role ?? ''}`
  accessContextRef.current = accessContext
  const isCommunity = isCommunityUser(effectiveUser)
  const isPlanner = canReviewPlans(effectiveUser)
  const canCreate = canCreateScenario(effectiveUser)
  const activePlanVisible = activePlan && (
    activePlan.plan.owner_user_id === currentUserId ||
    activePlan.plan.owner_user_id === currentUser?.username ||
    (isPlanner && ['Submitted', 'Under Review'].includes(activePlan.plan.status))
  ) ? activePlan : undefined

  const overlayLayerRef = useRef<GraphicsLayer | undefined>(undefined)
  const [overlayLayerReady, setOverlayLayerReady] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [planLoadError, setPlanLoadError] = useState<string>()
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [planActivity, setPlanActivity] = useState<PlanActivity[]>([])
  const [districts, setDistricts] = useState<PlanDistrict[]>([])
  const [totalBlockCount, setTotalBlockCount] = useState(0)
  const [hoveredAccountControl, setHoveredAccountControl] = useState<'trigger' | 'switch' | 'signout'>()
  const [focusedAccountControl, setFocusedAccountControl] = useState<'trigger' | 'switch' | 'signout'>()

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
  const map = view.map
  if (!map) {
    overlayLayerRef.current = undefined
    setOverlayLayerReady(false)
    return
  }
  overlayLayerRef.current = getOrCreateAssignmentOverlay(view)
  setOverlayLayerReady(true)

  const handle = map.layers.on('change', () => {
    if (view.map !== map) return
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

  useEffect(() => {
    let cancelled = false
    baseLayer.queryFeatureCount()
      .then((count) => {
        if (!cancelled) setTotalBlockCount(count)
      })
      .catch((error) => {
        if (cancelled) return
        console.warn('Study-area feature count could not be loaded', error)
        setOperationError('Map layer access is unavailable. Check the signed-in account and map permissions.')
      })
    return () => { cancelled = true }
  }, [baseLayer])

  // Points 2, 3, 5: loads on mount, and again after every save/submit —
  // this is what makes previously assigned areas reappear automatically.
  const refreshAllAssignments = useCallback(async () => {
    const accessContext = accessContextRef.current
    if (!authenticated) {
      setPlans([])
      setPlanSummaries(new Map())
      setPlanLoadError(undefined)
      return
    }
    const p = await fetchPlansForUser(serviceUrl, currentUserId, currentUser?.username, effectiveUser)
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
    setPlanLoadError(undefined)
    window.dispatchEvent(new Event('redistricting:assignments-updated'))
  }, [serviceUrl, currentUserId, currentUser?.username, effectiveUser, authenticated])

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
      setPlanLoadError(`Scenarios could not be loaded: ${errorDetails(error)} Check the signed-in account and Feature Service permissions.`)
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
      await reviewPlan(serviceUrl, activePlan.plan, effectiveUser, reviewStatus, reviewComment.trim())
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
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <button
          type="button"
          aria-label={authenticated ? `Account menu for ${currentUserName}` : 'Sign in to ArcGIS'}
          aria-expanded={isAccountMenuOpen}
          aria-controls="redistricting-account-menu"
          onMouseEnter={() => { setHoveredAccountControl('trigger') }}
          onMouseLeave={() => { setHoveredAccountControl(undefined) }}
          onFocus={() => { setFocusedAccountControl('trigger') }}
          onBlur={() => { setFocusedAccountControl(undefined) }}
          onClick={() => {
            if (!authenticated) {
              void onSignIn()
              return
            }
            setIsAccountMenuOpen((open) => !open)
          }}
          style={{ display: 'grid', width: '100%', gridTemplateColumns: '38px minmax(0, 1fr) 20px', alignItems: 'center', columnGap: 10, padding: '11px 12px', border: `1px solid ${authenticated ? '#bbebce' : '#f1d6a8'}`, borderRadius: 9, background: hoveredAccountControl === 'trigger' || focusedAccountControl === 'trigger' ? (authenticated ? '#e7f8ed' : '#fff0d9') : (authenticated ? 'linear-gradient(120deg, #f2fbf5 0%, #ffffff 100%)' : 'linear-gradient(120deg, #fff8ed 0%, #ffffff 100%)'), boxShadow: hoveredAccountControl === 'trigger' || focusedAccountControl === 'trigger' ? '0 4px 12px rgba(16,24,40,0.14)' : '0 1px 3px rgba(16,24,40,0.06)', outline: focusedAccountControl === 'trigger' ? '2px solid #2563eb' : undefined, outlineOffset: 2, transform: hoveredAccountControl === 'trigger' ? 'translateY(-1px)' : undefined, transition: 'background 140ms ease, box-shadow 140ms ease, transform 140ms ease', textAlign: 'left', cursor: 'pointer' }}
        >
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: authenticated ? '#dcfce7' : '#ffedd5', color: authenticated ? '#15803d' : '#c2410c', fontSize: 15, fontWeight: 700 }}>
            {authenticated ? currentUserName.charAt(0).toUpperCase() : '!'}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <strong style={{ color: '#1f2937', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authenticated ? currentUserName : 'Sign in to ArcGIS'}
            </strong>
            <span style={{ color: authenticated ? '#15803d' : '#9a3412', fontSize: 11, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authenticated ? currentUser?.username?.trim() || (isPlanner ? 'Administrator / reviewer' : 'Community member') : 'Access your plans and tools'}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>{isAccountMenuOpen ? '▴' : '▾'}</span>
        </button>
        {isAccountMenuOpen && authenticated && (
          <div id="redistricting-account-menu" aria-label="ArcGIS account actions" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 6px)', left: 0, right: 0, padding: 12, border: '1px solid #dbe3ec', borderRadius: 9, background: '#fff', boxShadow: '0 8px 24px rgba(15,23,42,0.16)' }}>
            <div style={{ padding: '2px 3px 10px', borderBottom: '1px solid #e5eaf0' }}>
              <strong style={{ display: 'block', color: '#1f2937', fontSize: 12 }}>{currentUserName}</strong>
              {currentUser?.username && <span style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 11 }}>{currentUser.username}</span>}
              <span style={{ display: 'block', marginTop: 4, color: '#15803d', fontSize: 10 }}>{isPlanner ? 'Administrator / reviewer' : 'Community member'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 10 }}>
              <button type="button" disabled={isAccountActionPending} onMouseEnter={() => { setHoveredAccountControl('switch') }} onMouseLeave={() => { setHoveredAccountControl(undefined) }} onFocus={() => { setFocusedAccountControl('switch') }} onBlur={() => { setFocusedAccountControl(undefined) }} onClick={() => { void onSwitchAccount() }} style={{ minHeight: 36, border: 0, borderRadius: 5, background: hoveredAccountControl === 'switch' || focusedAccountControl === 'switch' ? '#06649e' : '#0878bd', color: '#fff', fontSize: 11, fontWeight: 600, cursor: isAccountActionPending ? 'wait' : 'pointer', outline: focusedAccountControl === 'switch' ? '2px solid #2563eb' : undefined, outlineOffset: 2, boxShadow: hoveredAccountControl === 'switch' || focusedAccountControl === 'switch' ? '0 2px 7px rgba(8,120,189,0.3)' : undefined, transform: hoveredAccountControl === 'switch' ? 'translateY(-1px)' : undefined, transition: 'background 140ms ease, box-shadow 140ms ease, transform 140ms ease', opacity: isAccountActionPending ? 0.65 : 1 }}>
                {isAccountActionPending ? 'Please wait…' : 'Switch account'}
              </button>
              <button type="button" disabled={isAccountActionPending} onMouseEnter={() => { setHoveredAccountControl('signout') }} onMouseLeave={() => { setHoveredAccountControl(undefined) }} onFocus={() => { setFocusedAccountControl('signout') }} onBlur={() => { setFocusedAccountControl(undefined) }} onClick={() => { void onSignOut(); setIsAccountMenuOpen(false) }} style={{ minHeight: 36, border: `1px solid ${hoveredAccountControl === 'signout' || focusedAccountControl === 'signout' ? '#fca5a5' : '#cbd5e1'}`, borderRadius: 5, background: hoveredAccountControl === 'signout' || focusedAccountControl === 'signout' ? '#fff1f0' : '#fff', color: hoveredAccountControl === 'signout' || focusedAccountControl === 'signout' ? '#b42318' : '#334155', fontSize: 11, fontWeight: 600, cursor: isAccountActionPending ? 'wait' : 'pointer', outline: focusedAccountControl === 'signout' ? '2px solid #2563eb' : undefined, outlineOffset: 2, boxShadow: hoveredAccountControl === 'signout' || focusedAccountControl === 'signout' ? '0 2px 7px rgba(180,35,24,0.12)' : undefined, transform: hoveredAccountControl === 'signout' ? 'translateY(-1px)' : undefined, transition: 'background 140ms ease, box-shadow 140ms ease, transform 140ms ease', opacity: isAccountActionPending ? 0.65 : 1 }}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
      {isAccountActionPending && (
        <div role="status" style={{ padding: '8px 10px', marginBottom: 12, borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontSize: 11 }}>
          Complete sign-in in the ArcGIS window. Your current session remains active until sign-in succeeds.
        </div>
      )}
      {accountActionError && (
        <div role="alert" style={{ padding: '9px 11px', marginBottom: 12, border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', color: '#b42318', fontSize: 12 }}>
          {accountActionError}
        </div>
      )}
      {planLoadError && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', marginBottom: 12, border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', color: '#b42318', fontSize: 12 }}>
          <span>{planLoadError}</span>
          <button type="button" onClick={() => {
            refreshAllAssignments().catch((error) => {
              console.warn('Scenario retry failed', error)
              setPlanLoadError(`Scenarios are still unavailable: ${errorDetails(error)} Verify the account and service permissions.`)
            })
          }} style={{ flex: '0 0 auto' }}>Retry</button>
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