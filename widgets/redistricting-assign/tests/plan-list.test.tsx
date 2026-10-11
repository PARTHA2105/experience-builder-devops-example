import { React } from 'jimu-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PlanList } from '../src/runtime/PlanList'
import type { Plan } from '../src/runtime/types'

const draftPlan: Plan = {
  OBJECTID: 1,
  plan_id: 'private-plan-id',
  plan_name: 'Eastside plan',
  owner_user_id: 'community-user',
  owner_display_name: 'Community user',
  status: 'Draft',
  visibility: 'Private',
  created_date: 1,
  last_updated_date: 2,
  is_locked: false,
}

describe('PlanList', () => {
  it('confirms and deletes selected editable scenarios', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined)
    render(
      <PlanList
        plans={[draftPlan]}
        onSelect={jest.fn()}
        onDelete={onDelete}
        isPlanner={false}
        summaries={new Map()}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Eastside plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => { expect(onDelete).toHaveBeenCalledWith([draftPlan]) })
    expect(screen.queryByText('private-plan-id')).toBeNull()
  })

  it('does not offer checkboxes to reviewers for submitted plans', () => {
    const submittedPlan = { ...draftPlan, status: 'Submitted' as const }
    render(
      <PlanList
        plans={[submittedPlan]}
        onSelect={jest.fn()}
        onDelete={jest.fn().mockResolvedValue(undefined)}
        isPlanner
        summaries={new Map()}
      />,
    )

    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open Eastside plan' })).toBeTruthy()
    expect(screen.queryByText('private-plan-id')).toBeNull()
  })
})
