import { React } from 'jimu-core'
import { IconButton } from './IconButton'
import { Icons } from './Icons'
import type { SelectionMode } from './useAssignmentTool'

interface Props {
  isSelecting: boolean
  selectionMode: SelectionMode
  onSelectTool: (mode: SelectionMode) => void
  disabled: boolean
  selectedCount: number
  onClearSelection: () => void
}

const TOOLS: Array<{ mode: SelectionMode; label: string }> = [
  { mode: 'point', label: 'Select by point' },
  { mode: 'polygon', label: 'Select by polygon' },
  { mode: 'freehand', label: 'Select freehand' },
  { mode: 'circle', label: 'Select by circle' },
  { mode: 'rectangle', label: 'Select by rectangle' },
]

export function SelectionToolbar({ isSelecting, selectionMode, onSelectTool, disabled, selectedCount, onClearSelection }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {TOOLS.map((t) => (
        <IconButton
          key={t.mode}
          icon={Icons[t.mode]}
          label={t.label}
          active={isSelecting && selectionMode === t.mode}
          disabled={disabled}
          onClick={() => { onSelectTool(t.mode) }}
        />
      ))}
      <button
        type='button'
        aria-label={`Clear selected areas${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
        title='Discard the current map selection without changing saved assignments'
        disabled={disabled || selectedCount === 0}
        onClick={onClearSelection}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 30,
          padding: '0 7px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          background: '#fff',
          color: '#374151',
          fontSize: 11,
          whiteSpace: 'nowrap',
          cursor: disabled || selectedCount === 0 ? 'not-allowed' : 'pointer',
          opacity: disabled || selectedCount === 0 ? 0.5 : 1,
        }}
      >
        {Icons.clearSelection}
        Clear selection{selectedCount > 0 ? ` (${selectedCount})` : ''}
      </button>
    </div>
  )
}