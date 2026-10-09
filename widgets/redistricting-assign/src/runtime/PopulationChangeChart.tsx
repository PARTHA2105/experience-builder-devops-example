import { React } from 'jimu-core'
import type { PlanMetrics } from './types'

interface Props { metrics: PlanMetrics | undefined }

export function PopulationChangeChart({ metrics }: Props) {
  if (!metrics || metrics.districts.length === 0) return null
  const changedDistricts = metrics.districts.filter((district) => district.difference !== 0)
  if (changedDistricts.length === 0) {
    return <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Assign a study area to see how the affected districts change.</div>
  }
  const max = Math.max(1, ...changedDistricts.map((d) => Math.max(d.populationBefore, d.populationAfter)))
  const barW = 26, gap = 14, groupW = barW * 2 + 6, chartH = 120

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 10, marginTop: 10, overflowX: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Population by affected district</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        Max deviation from ideal: {metrics.deviationBeforePercent.toFixed(1)}% before → {metrics.deviationPercent.toFixed(1)}% after
      </div>
      <svg width={changedDistricts.length * (groupW + gap)} height={chartH + 30} role="img" aria-label="Population before and after assignment changes">
        {changedDistricts.map((d, i) => {
          const x = i * (groupW + gap)
          const beforeH = (d.populationBefore / max) * chartH
          const afterH = (d.populationAfter / max) * chartH
          return (
            <g key={d.district_id} transform={`translate(${x},0)`}>
              <rect x={0} y={chartH - beforeH} width={barW} height={beforeH} fill="#9CA3AF" />
              <rect x={barW + 6} y={chartH - afterH} width={barW} height={afterH} fill={d.color} />
              <text x={barW / 2} y={Math.max(10, chartH - beforeH - 3)} fontSize={8} textAnchor="middle" fill="#374151">{d.populationBefore.toLocaleString()}</text>
              <text x={barW + 6 + barW / 2} y={Math.max(10, chartH - afterH - 3)} fontSize={8} textAnchor="middle" fill="#374151">{d.populationAfter.toLocaleString()}</text>
              <title>{`${d.district_name}: ${d.populationBefore.toLocaleString()} before, ${d.populationAfter.toLocaleString()} after, ${d.difference >= 0 ? '+' : ''}${d.difference.toLocaleString()} change`}</title>
              <text x={groupW / 2} y={chartH + 14} fontSize={10} textAnchor="middle" fill="#374151">{d.district_name}</text>
              <text x={groupW / 2} y={chartH + 26} fontSize={9} textAnchor="middle" fill={d.difference >= 0 ? '#0F6E56' : '#993C1D'}>
                {d.difference >= 0 ? '+' : ''}{d.difference.toLocaleString()}
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280', marginTop: 4 }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#9CA3AF', marginRight: 4 }} />Saved plan</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: changedDistricts[0].color, marginRight: 4 }} />Current edits (district color)</span>
      </div>
    </div>
  )
}