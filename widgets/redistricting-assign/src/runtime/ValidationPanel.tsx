import { React } from 'jimu-core'
import jsPDF from 'jspdf'
import type { Plan, PlanMetrics } from './types'

const { useEffect, useState } = React
const PdfDocument = jsPDF

interface Props {
  plan: Plan
  metrics: PlanMetrics | undefined
  assignmentCount: number
  ownerDisplayName: string
  readOnly: boolean
}

export function ValidationPanel({ plan, metrics, assignmentCount, ownerDisplayName, readOnly }: Props) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setChecked(false)
  }, [plan.plan_id])

  const passed = metrics != null && assignmentCount > 0 && metrics.deviationPercent <= 10

  function downloadReport() {
    if (!metrics || !passed) return
    const doc = new PdfDocument()
    doc.setFontSize(14); doc.text('EquiZone Online - Plan Validation Report', 14, 18)
    doc.setFontSize(10)
    doc.text(`Plan: ${plan.plan_name}`, 14, 30)
    doc.text(`Plan ID: ${plan.plan_id}`, 14, 36)
    doc.text(`Prepared by: ${ownerDisplayName}`, 14, 42)
    doc.text(`Created: ${plan.created_date ? new Date(plan.created_date).toLocaleString() : 'Not available'}`, 14, 48)
    doc.text(`Submitted: ${plan.submitted_date ? new Date(plan.submitted_date).toLocaleString() : 'Not submitted'}`, 14, 54)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 60)
    doc.text(`Population deviation: ${metrics.deviationPercent.toFixed(2)}% (operating guideline: 10%)`, 14, 70)
    doc.text(`Ideal district population: ${Math.round(metrics.idealPopulation).toLocaleString()}`, 14, 76)
    doc.text(`Highest-lowest spread: ${(metrics.highest - metrics.lowest).toLocaleString()}`, 14, 82)
    let y = 94
    doc.text('District', 14, y); doc.text('Population', 80, y); y += 6
    for (const d of metrics.districts) { doc.text(d.district_name, 14, y); doc.text(String(d.populationAfter), 80, y); y += 6 }
    y += 6
    doc.setFontSize(9)
    doc.text('This report summarizes population metrics only. It does not certify legal compliance', 14, y); y += 5
    doc.text('with federal or state voting rights requirements and is not a substitute for legal review.', 14, y)
    const fileName = plan.plan_name.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '_').trim() || 'scenario'
    doc.save(`${fileName}_validation_report.pdf`)
  }

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 10, marginTop: 10 }}>
      <button onClick={() => { setChecked(true) }} disabled={readOnly || !metrics} style={{ fontSize: 12 }}>
        {readOnly ? 'Plan locked' : metrics ? 'Validate my plan' : 'Calculating population metrics...'}
      </button>
      {checked && !metrics && <p role="status" style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Population metrics are still loading. Try validation again when calculation completes.</p>}
      {checked && metrics && assignmentCount === 0 && (
        <p role="alert" style={{ marginTop: 8, fontSize: 12, color: '#993C1D' }}>Assign at least one study area before validating this scenario.</p>
      )}
      {checked && metrics && assignmentCount > 0 && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <p style={{ color: passed ? '#0F6E56' : '#993C1D' }}>
            {passed ? `Within the 10% maximum district deviation from ideal population guideline (${metrics.deviationPercent.toFixed(1)}%). You can download the validation report and submit this plan.` : `Above the 10% maximum district deviation from ideal population guideline (${metrics.deviationPercent.toFixed(1)}%). Save as Draft, adjust the assignments, and validate again before submitting.`}
          </p>
          {passed && <button onClick={downloadReport} style={{ fontSize: 12 }}>Download validation report (PDF)</button>}
        </div>
      )}
    </div>
  )
}