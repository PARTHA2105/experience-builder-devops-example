import { React } from 'jimu-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { NotificationPanel } from '../src/runtime/NotificationPanel'
import type { PlanNotification } from '../src/runtime/types'

const notification: PlanNotification = {
  activityId: 'activity-1',
  planId: 'plan-id-hidden-from-user',
  planName: 'Eastside scenario',
  status: 'Rejected',
  actorName: 'Reviewer',
  activityDate: new Date('2026-10-07T08:41:02Z').getTime(),
  comment: 'Please review the boundary around the school area.',
}

describe('NotificationPanel', () => {
  it('shows readable scenario and review details without exposing internal IDs', () => {
    render(
      <NotificationPanel
        notifications={[notification]}
        onOpenPlan={jest.fn()}
        onRefresh={jest.fn()}
        isRefreshing={false}
      />,
    )

    expect(screen.getByText('Eastside scenario')).toBeTruthy()
    expect(screen.getByText('Reviewer comment')).toBeTruthy()
    expect(screen.getByText(notification.comment)).toBeTruthy()
    expect(screen.getByText(/· Reviewer/)).toBeTruthy()
    expect(screen.queryByText(/plan-id-hidden-from-user/)).toBeNull()
  })

  it('refreshes notifications from the icon button', () => {
    const onRefresh = jest.fn()
    render(
      <NotificationPanel
        notifications={[]}
        onOpenPlan={jest.fn()}
        onRefresh={onRefresh}
        isRefreshing={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Refresh notifications' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
