'use client'

export type ToastKind = 'success' | 'error' | 'info'

interface Props { message: string; kind?: ToastKind; onClose?: () => void }

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"

const THEME: Record<ToastKind, { border: string; color: string; glyph: string }> = {
  success: { border: 'rgba(20,184,138,.45)', color: '#14B88A', glyph: '✓' },
  error:   { border: 'rgba(224,106,106,.5)', color: '#E06A6A', glyph: '!' },
  info:    { border: '#333333',              color: '#8A8A8A', glyph: 'i' },
}

export default function Toast({ message, kind = 'info', onClose }: Props) {
  const t = THEME[kind]
  return (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 32, zIndex: 60,
        display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none',
      }}
    >
      <div
        role={kind === 'error' ? 'alert' : 'status'}
        aria-live={kind === 'error' ? 'assertive' : 'polite'}
        style={{
          pointerEvents: 'auto', maxWidth: 480, width: 'fit-content',
          background: '#161616', border: `1px solid ${t.border}`, borderRadius: 4,
          padding: '12px 14px 12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 20px 50px -20px rgba(0,0,0,.85)', animation: 'veilup .3s ease both',
        }}
      >
        <span aria-hidden="true" style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: `1px solid ${t.border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: t.color, fontFamily: MONO, fontSize: 11, fontWeight: 700,
        }}>{t.glyph}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.5, color: '#EDEDED', overflowWrap: 'anywhere' }}>{message}</span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Dismiss notification" className="vlink"
            style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A5A5A', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
          >✕</button>
        )}
      </div>
    </div>
  )
}
