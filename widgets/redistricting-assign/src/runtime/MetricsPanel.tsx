import { React } from 'jimu-core'
import type { PlanMetrics } from './types'

interface Props { metrics: PlanMetrics | undefined }

export function MetricsPanel({ metrics }: Props) {
  if (!metrics || metrics.districts.length === 0) {
    return <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Assign study areas to see population metrics.</div>
  }
  const flagged = metrics.deviationPercent > 10

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 10, marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
        <Stat label="Ideal population" value={Math.round(metrics.idealPopulation).toLocaleString()} />
        <Stat label="Highest district" value={metrics.highest.toLocaleString()} />
        <Stat label="Lowest district" value={metrics.lowest.toLocaleString()} />
        <Stat label="Max deviation from ideal" value={`${metrics.deviationPercent.toFixed(1)}%`} warn={flagged} />
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
        Study area: {metrics.studyAreaPopulation.toLocaleString()} people · Assigned: {metrics.assignedPopulation.toLocaleString()} · Unassigned: {metrics.unassignedPopulation.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
        High-low population spread: {(metrics.highest - metrics.lowest).toLocaleString()} people
      </div>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: 4 }}>District</th><th style={{ padding: 4 }}>Population</th>
          </tr>
        </thead>
        <tbody>
          {metrics.districts.map((d) => (
            <tr key={d.district_id}>
              <td style={{ padding: 4 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: d.color, marginRight: 6 }} />{d.district_name}</td>
              <td style={{ padding: 4 }}>{d.populationAfter.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
        Reference metrics only. This does not certify legal compliance with federal or state voting rights requirements.
      </p>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ background: '#f4f6f8', borderRadius: 6, padding: '6px 8px' }}>
      <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: warn ? '#b45309' : undefined }}>{value}</div>
    </div>
  )
}