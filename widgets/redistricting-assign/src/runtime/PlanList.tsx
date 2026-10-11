import { React } from 'jimu-core'
import type { Plan } from './types'

interface Props {
  plans: Plan[]
  onSelect: (plan: Plan) => void
  onDelete: (plans: Plan[]) => Promise<void>
  isPlanner: boolean
  summaries: Map<string, { assignedAreaCount: number; districtCount: number }>
}

const { useState } = React

function formatDate(value?: number): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export function PlanList({ plans, onSelect, onDelete, isPlanner, summaries }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const deletablePlans = isPlanner ? [] : plans.filter((plan) => plan.status === 'Draft' || plan.status === 'Rejected')
  const selectedPlans = plans.filter((plan) => selectedIds.has(plan.plan_id) && deletablePlans.includes(plan))
  const allSelected = deletablePlans.length > 0 && selectedPlans.length === deletablePlans.length

  function togglePlan(planId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(planId)) next.delete(planId)
      else next.add(planId)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(deletablePlans.map((plan) => plan.plan_id)))
  }

  async function deleteSelected() {
    setIsDeleting(true)
    setDeleteError(undefined)
    try {
      await onDelete(selectedPlans)
      setSelectedIds(new Set())
      setConfirmDelete(false)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The selected scenarios could not be deleted.')
    } finally {
      setIsDeleting(false)
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: '8px 7px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left',
    verticalAlign: 'middle',
    fontSize: 11,
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <strong style={{ display: 'block', fontSize: 14 }}>{isPlanner ? 'Review plans' : 'My scenarios'}</strong>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{isPlanner ? 'Open a submitted plan to inspect it on the map' : 'Select editable scenarios to remove, or open one to continue editing'}</span>
        </div>
        <span style={{ minWidth: 20, padding: '2px 6px', borderRadius: 10, background: '#e5e7eb', color: '#374151', fontSize: 11, textAlign: 'center' }}>{plans.length}</span>
      </div>

      {!isPlanner && deletablePlans.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, margin: '8px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151' }}>
            <input type='checkbox' checked={allSelected} onChange={toggleAll} aria-label='Select all deletable scenarios' />
            Select all editable
          </label>
          <button type='button' disabled={selectedPlans.length === 0 || isDeleting} onClick={() => { setDeleteError(undefined); setConfirmDelete(true) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', color: selectedPlans.length ? '#b42318' : '#6b7280' }}>
            <svg width='14' height='14' viewBox='0 0 16 16' aria-hidden='true'><path d='M3 4h10M6 4V2.5h4V4m2 0-.6 9H4.6L4 4m2.5 2v5m3-5v5' fill='none' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' /></svg>
            Delete selected {selectedPlans.length > 0 ? `(${selectedPlans.length})` : ''}
          </button>
        </div>
      )}

      {deleteError && <div role='alert' style={{ padding: 8, margin: '8px 0', background: '#fef2f2', color: '#b42318', fontSize: 11 }}>{deleteError}</div>}

      {plans.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <table style={{ width: '100%', minWidth: isPlanner ? 510 : 470, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#4b5563' }}>
                {!isPlanner && <th scope='col' style={{ ...cellStyle, width: 30 }} aria-label='Select scenario' />}
                <th scope='col' style={cellStyle}>Plan</th>
                <th scope='col' style={cellStyle}>Status</th>
                {isPlanner && <th scope='col' style={cellStyle}>Submitted by</th>}
                <th scope='col' style={cellStyle}>Areas / districts</th>
                <th scope='col' style={cellStyle}>Updated</th>
                <th scope='col' style={{ ...cellStyle, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const summary = summaries.get(plan.plan_id)
                const canDelete = deletablePlans.includes(plan)
                const isAwaitingReview = plan.status === 'Submitted' || plan.status === 'Under Review'
                return (
                  <tr key={plan.plan_id}>
                    {!isPlanner && (
                      <td style={cellStyle}>
                        <input type='checkbox' checked={selectedIds.has(plan.plan_id)} disabled={!canDelete} onChange={() => { togglePlan(plan.plan_id) }} aria-label={`Select ${plan.plan_name || 'untitled scenario'}`} />
                      </td>
                    )}
                    <td style={{ ...cellStyle, maxWidth: 140 }}>
                      <strong style={{ display: 'block', color: '#1f2937', overflowWrap: 'anywhere' }}>{plan.plan_name || 'Untitled scenario'}</strong>
                      {isAwaitingReview && <span style={{ display: 'block', marginTop: 3, color: '#92400e', fontSize: 10 }}>Awaiting review</span>}
                    </td>
                    <td style={cellStyle}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: plan.status === 'Approved' ? '#d1fae5' : plan.status === 'Rejected' ? '#fee2e2' : isAwaitingReview ? '#fef3c7' : '#e5e7eb',
                        color: plan.status === 'Approved' ? '#047857' : plan.status === 'Rejected' ? '#b42318' : '#374151',
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>{plan.status}</span>
                    </td>
                    {isPlanner && <td style={{ ...cellStyle, maxWidth: 120, overflowWrap: 'anywhere' }}>{plan.owner_display_name || plan.owner_user_id || 'Community member'}</td>}
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{summary?.assignedAreaCount ?? '…'} / {summary?.districtCount ?? '…'}</td>
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{formatDate(plan.last_updated_date ?? plan.submitted_date)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <button type='button' onClick={() => { onSelect(plan) }} style={{ display: 'inline-flex', minWidth: 72, alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 10px', border: '1px solid #98a2b3', borderRadius: 4, background: '#fff', color: '#185FA5', fontSize: 12, lineHeight: 1.2, whiteSpace: 'nowrap', cursor: 'pointer' }} aria-label={`Open ${plan.plan_name || 'untitled scenario'}`}>
                        <svg width='14' height='14' viewBox='0 0 16 16' aria-hidden='true'><path d='M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z' fill='none' stroke='currentColor' strokeWidth='1.3' /><circle cx='8' cy='8' r='1.7' fill='none' stroke='currentColor' strokeWidth='1.3' /></svg>
                        {canDelete ? 'Open' : 'View'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {plans.length === 0 && <div style={{ padding: 14, border: '1px dashed #d1d5db', borderRadius: 8, color: '#6b7280', fontSize: 12 }}>{isPlanner ? 'No submitted community plans await review.' : 'No scenarios yet. Select New scenario to begin.'}</div>}

      {confirmDelete && (
        <div role='presentation' style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(17, 24, 39, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div role='alertdialog' aria-modal='true' aria-labelledby='delete-scenarios-title' style={{ width: '100%', maxWidth: 360, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            <h3 id='delete-scenarios-title' style={{ margin: '0 0 6px', fontSize: 15 }}>Delete selected scenarios?</h3>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4b5563' }}>This permanently removes {selectedPlans.length} selected {selectedPlans.length === 1 ? 'scenario' : 'scenarios'}, their assignments and districts, and their activity history. Submitted, under-review, and approved plans cannot be deleted.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type='button' onClick={() => { setConfirmDelete(false) }} disabled={isDeleting}>Cancel</button>
              <button type='button' onClick={deleteSelected} disabled={isDeleting} style={{ color: '#b42318' }}>{isDeleting ? 'Deleting…' : 'Delete permanently'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
