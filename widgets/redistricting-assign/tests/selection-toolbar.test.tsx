import { React } from 'jimu-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { SelectionToolbar } from '../src/runtime/SelectionToolbar'

describe('SelectionToolbar', () => {
  it('lets the user discard a map selection without leaving the plan', () => {
    const onClearSelection = jest.fn()
    render(
      <SelectionToolbar
        isSelecting
        selectionMode='point'
        onSelectTool={jest.fn()}
        selectedCount={2}
        onClearSelection={onClearSelection}
        disabled={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear selected areas (2)' }))
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('disables clearing when there is no map selection', () => {
    render(
      <SelectionToolbar
        isSelecting={false}
        selectionMode='point'
        onSelectTool={jest.fn()}
        selectedCount={0}
        onClearSelection={jest.fn()}
        disabled={false}
      />,
    )

    expect((screen.getByRole('button', { name: 'Clear selected areas' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
