import { React } from 'jimu-core'

const { useState } = React

interface Props {
  planName: string
  rationale: string
  ownerDisplayName: string
  onConfirm: () => void
  onCancel: () => void
}

export function SubmitConfirmModal({ planName, rationale, ownerDisplayName, onConfirm, onCancel }: Props) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 16, width: 300 }}>
        <h4 style={{ margin: '0 0 8px' }}>Submit "{planName}"?</h4>
        <p style={{ fontSize: 12, color: '#6b7280' }}>Once submitted, this plan locks and moves to staff review.</p>
        <p style={{ fontSize: 12 }}><strong>Rationale:</strong> {rationale || <em>(none provided)</em>}</p>
        <p style={{ fontSize: 12 }}><strong>Submitted by:</strong> {ownerDisplayName}</p>
        <p style={{ fontSize: 12 }}><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onCancel} style={{ fontSize: 12 }}>Cancel</button>
          <button onClick={onConfirm} style={{ fontSize: 12 }}>Confirm submit</button>
        </div>
      </div>
    </div>
  )
}