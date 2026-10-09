import { React } from 'jimu-core'

interface Props {
  selectedCount: number
  selectedPopulation: number
}

export function SelectedAreaStats({ selectedCount, selectedPopulation }: Props) {
  if (selectedCount === 0) {
    return <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Select one or more study areas to see their original population.</div>
  }
  const barH = selectedPopulation > 0 ? 100 : 4

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 10, marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Selected study areas — original population (base layer)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <svg width={60} height={116}>
          <rect x={10} y={116 - barH} width={40} height={barH} fill="#9CA3AF" />
        </svg>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{selectedPopulation.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{selectedCount} study area{selectedCount === 1 ? '' : 's'} selected</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            Independent of assignment status — this is the raw Population value from the base feature layer for whatever's currently selected.
          </div>
        </div>
      </div>
    </div>
  )
}