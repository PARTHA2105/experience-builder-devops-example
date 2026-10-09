import { React } from 'jimu-core'

interface Props {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}

export function IconButton({ icon, label, onClick, disabled, active }: Props) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, padding: 0,
        border: active ? '2px solid #185FA5' : '1px solid #d1d5db',
        borderRadius: 6,
        background: active ? '#E6F1FB' : 'white',
        color: active ? '#185FA5' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
    </button>
  )
}