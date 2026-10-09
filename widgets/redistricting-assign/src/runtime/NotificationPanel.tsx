import { React } from 'jimu-core'
import type { PlanNotification } from './types'
import { Icons } from './Icons'

interface Props {
  notifications: PlanNotification[]
  onOpenPlan: (planId: string) => void
  onRefresh: () => void
  isRefreshing: boolean
  error?: string
}

export function NotificationPanel({ notifications, onOpenPlan, onRefresh, isRefreshing, error }: Props) {
  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12, marginBottom: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <strong style={{ display: 'block', fontSize: 14 }}>Review updates</strong>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Status changes for your submitted plans</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-label={`${notifications.length} review updates`} style={{ minWidth: 20, padding: '3px 7px', borderRadius: 12, background: '#e8eef5', color: '#344054', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>{notifications.length}</span>
          <button type='button' onClick={onRefresh} disabled={isRefreshing} aria-label={isRefreshing ? 'Refreshing notifications' : 'Refresh notifications'} title={isRefreshing ? 'Refreshing notifications' : 'Refresh notifications'} style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d0d5dd', borderRadius: 6, background: '#fff', color: '#344054', cursor: isRefreshing ? 'wait' : 'pointer', opacity: isRefreshing ? 0.6 : 1 }}>
            <span aria-hidden='true' style={{ display: 'inline-flex' }}>{Icons.refresh}</span>
          </button>
        </div>
      </div>
      {notifications.length === 0 && (
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 0 }}>No review updates yet.</p>
      )}
      {error && <p style={{ fontSize: 11, color: '#b42318' }}>{error}</p>}
      {notifications.map((notification) => (
        <button
          key={notification.activityId}
          onClick={() => { onOpenPlan(notification.planId) }}
          style={{ display: 'block', width: '100%', textAlign: 'left', border: '1px solid #dfe4ea', borderRadius: 8, background: '#fff', padding: 12, marginTop: 9, cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ padding: '3px 7px', borderRadius: 5, background: notification.status === 'Approved' ? '#d1fae5' : '#fee2e2', color: notification.status === 'Approved' ? '#047857' : '#b42318', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {notification.status}
            </span>
            <strong style={{ fontSize: 14, color: '#1f2937' }}>{notification.planName || 'Untitled scenario'}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#667085' }}>
            {new Date(notification.activityDate).toLocaleString()} · {notification.actorName}
          </div>
          <div style={{ marginTop: 9 }}>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Reviewer comment</span>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: '#344054', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {notification.comment || 'No comment was provided.'}
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', marginTop: 9 }}>
            {notification.status === 'Rejected' ? 'Open to revise and resubmit' : 'Open read-only approved plan'}
          </div>
        </button>
      ))}
    </div>
  )
}