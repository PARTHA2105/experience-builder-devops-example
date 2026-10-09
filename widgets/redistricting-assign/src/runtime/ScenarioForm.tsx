import { React } from 'jimu-core'
import { getAvailableDistricts } from './PlanService'
import { SelectionToolbar } from './SelectionToolbar'
import { IconButton } from './IconButton'
import { Icons } from './Icons'
import type { SelectionMode } from './useAssignmentTool'
import { SelectedAreaStats } from './SelectedAreaStats'
import { MetricsPanel } from './MetricsPanel'
import { PopulationChangeChart } from './PopulationChangeChart'
import { ValidationPanel } from './ValidationPanel'
import { SubmitConfirmModal } from './SubmitConfirmModel'
import type { AssignmentState, Plan, PlanActivity, PlanDistrict, PlanMetrics } from './types'
import { colorForDistrictId } from './PlanService'

const { useState, useEffect } = React

interface Props {
  plan: Plan
  districts: PlanDistrict[]
  metrics: PlanMetrics | undefined
  activity: PlanActivity[]
  assignments: Map<string, AssignmentState>
  onFocusAssignment: (geoid: string) => void
  ownerDisplayName: string
  onClose: () => void
  targetDistrictId: number | 'unassign'
  onChangeTarget: (value: number | 'unassign') => void
  isSelecting: boolean
  selectionMode: SelectionMode
  onSelectTool: (mode: SelectionMode) => void
  onClearSelection: () => void
  selectedCount: number
  previouslyAssignedCount: number
  unassignedCount: number
  isSaving: boolean
  onSaveAssignments: () => void
  onSaveDraft: (name: string, description: string) => void
  onPersistAssignments: () => void
  canPersistAssignments: boolean
  onSubmit: (name: string, description: string) => void
  selectedPopulation: number
  readOnly: boolean
}

export function ScenarioForm({
  plan, metrics, activity, assignments, onFocusAssignment, ownerDisplayName, onClose, targetDistrictId, onChangeTarget,
  isSelecting, selectionMode, onSelectTool, onClearSelection, selectedCount, previouslyAssignedCount,
  unassignedCount, isSaving, onSaveAssignments, onSaveDraft, onSubmit, selectedPopulation,
  onPersistAssignments, canPersistAssignments
}: Props) {
  const [name, setName] = useState(plan.plan_name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const canEdit = plan.status === 'Draft' || plan.status === 'Rejected'
  const validationPassed = assignments.size > 0 && Boolean(metrics && metrics.deviationPercent <= 10)

  useEffect(() => {
    setName(plan.plan_name)
    setDescription(plan.description ?? '')
  }, [plan.plan_id, plan.plan_name, plan.description])

  const districts = getAvailableDistricts()

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 12 }}>Scenario name</label>
        <IconButton icon={Icons.back} label="Back to list" onClick={onClose} disabled={isSaving} />
      </div>
      <input value={name} disabled={!canEdit} onChange={(e) => { setName(e.target.value) }} style={{ width: '100%', marginBottom: 8 }} />
      <label style={{ fontSize: 12 }}>Description</label>
      <textarea value={description} disabled={!canEdit} onChange={(e) => { setDescription(e.target.value) }} style={{ width: '100%', marginBottom: 8 }} />

      {plan.status !== 'Draft' && (
        <div style={{ background: '#f4f6f8', padding: 8, marginBottom: 10, fontSize: 12 }}>
          <strong>Submitted scenario detail</strong>
          <div>Status: {plan.status}</div>
          <div>Author: {plan.owner_display_name || plan.owner_user_id}</div>
          {plan.submitted_date && <div>Submitted: {new Date(plan.submitted_date).toLocaleString()}</div>}
          <div>Rationale: {plan.description || 'Not provided'}</div>
          {!canEdit && <div style={{ marginTop: 4, color: '#6b7280' }}>This {plan.status.toLowerCase()} version is locked for editing.</div>}
        </div>
      )}
      {plan.status !== 'Draft' && (
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12 }}>Activity history ({activity.length})</summary>
          {activity.map((entry) => (
            <div key={entry.activity_id} style={{ borderTop: '1px solid #e5e7eb', padding: '6px 0', fontSize: 11 }}>
              <strong>{entry.activity_type}</strong>
              <div>{entry.actor_user_id} · {entry.activity_date ? new Date(entry.activity_date).toLocaleString() : 'Date unavailable'}</div>
              {entry.notes && <div>{entry.notes}</div>}
            </div>
          ))}
        </details>
      )}

      <label style={{ fontSize: 12 }}>Target district</label>
      <select
        style={{ width: '100%', marginBottom: 10 }}
        value={targetDistrictId}
        disabled={!canEdit}
        onChange={(e) => {
          const v = e.target.value
          onChangeTarget(v === 'unassign' ? 'unassign' : Number(v))
        }}
      >
        {districts.map((d) => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
        <option value="unassign">Unassign this area</option>
      </select>

      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <SelectionToolbar isSelecting={isSelecting} selectionMode={selectionMode} onSelectTool={onSelectTool} selectedCount={selectedCount} onClearSelection={onClearSelection} disabled={isSaving} />
          <IconButton icon={Icons.assign} label="Assign selected" onClick={onSaveAssignments} disabled={selectedCount === 0 || isSaving} />
          <IconButton icon={Icons.saveDraft} label="Save assignments" onClick={() => { onPersistAssignments() }} disabled={!canPersistAssignments || isSaving} />
          <IconButton icon={Icons.saveDraft} label="Save as draft" onClick={() => { onSaveDraft(name, description) }} disabled={isSaving} />
          <IconButton icon={Icons.submit} label="Submit" onClick={() => { setShowSubmitConfirm(true) }} disabled={isSaving || !description.trim() || !validationPassed} />
          {!description.trim() && <span style={{ fontSize: 11, color: '#993C1D' }}>Add a scenario description to submit.</span>}
          {description.trim() && assignments.size === 0 && <span style={{ fontSize: 11, color: '#993C1D' }}>Assign at least one study area to submit.</span>}
          {description.trim() && !metrics && <span style={{ fontSize: 11, color: '#6b7280' }}>Waiting for population metrics.</span>}
          {metrics && metrics.deviationPercent > 10 && <span style={{ fontSize: 11, color: '#993C1D' }}>Maximum deviation from ideal is {metrics.deviationPercent.toFixed(1)}%; the operating guideline is 10%.</span>}
        </div>
      )}
      {!canEdit && <p style={{ fontSize: 11, color: '#6b7280' }}>This plan is {plan.status.toLowerCase()} and read-only.</p>}
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        {selectedCount} selected now ({selectedPopulation.toLocaleString()} people) · {previouslyAssignedCount} already assigned to this plan · {unassignedCount} unassigned overall
      </div>
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>Study-area assignments ({assignments.size})</summary>
        <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
          {Array.from(assignments, ([geoid, assignment]) => (
            <button key={geoid} onClick={() => { onFocusAssignment(geoid) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '6px 4px', cursor: 'pointer', fontSize: 11 }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, flex: '0 0 10px', background: colorForDistrictId(assignment.district_id) }} />
              <span style={{ flex: 1 }}>{geoid}</span>
              <span>{`District ${assignment.district_id}`}</span>
            </button>
          ))}
          {assignments.size === 0 && <div style={{ padding: 6, color: '#6b7280', fontSize: 11 }}>No study areas assigned.</div>}
        </div>
      </details>
      <SelectedAreaStats selectedCount={selectedCount} selectedPopulation={selectedPopulation} />
      <MetricsPanel metrics={metrics} />
      <PopulationChangeChart metrics={metrics} />
      <ValidationPanel plan={plan} metrics={metrics} assignmentCount={assignments.size} ownerDisplayName={ownerDisplayName} readOnly={!canEdit} />

      {showSubmitConfirm && (
        <SubmitConfirmModal
          planName={name}
          rationale={description}
          ownerDisplayName={ownerDisplayName}
          onCancel={() => { setShowSubmitConfirm(false) }}
          onConfirm={() => { setShowSubmitConfirm(false); onSubmit(name, description) }}
        />
      )}
      {isSaving && <div style={{ fontSize: 12, color: '#185FA5', marginTop: 4 }}>Saving…</div>}
    </div>
  )
}