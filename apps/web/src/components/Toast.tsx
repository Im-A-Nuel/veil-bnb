'use client'

interface Props { message: string }

export default function Toast({ message }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: '#161616', border: '1px solid rgba(20,184,138,.4)',
      borderRadius: 2, padding: '13px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 60, animation: 'veilup .4s ease both',
    }}>
      <span style={{ color: '#14B88A', font: '14px monospace' }}>✓</span>
      <span style={{ font: "12px 'JetBrains Mono',monospace", color: '#EDEDED', fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>{message}</span>
    </div>
  )
}
