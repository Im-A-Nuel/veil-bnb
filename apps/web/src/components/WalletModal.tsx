'use client'

import { useEffect, useState } from 'react'
import { listWallets, type WalletOption } from '@/lib/wallet'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

interface Props {
  open: boolean
  connectingId: string | null
  onClose: () => void
  onChoose: (id: string) => void
}

export default function WalletModal({ open, connectingId, onClose, onChoose }: Props) {
  const [wallets, setWallets] = useState<WalletOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listWallets()
      .then(setWallets)
      .catch(() => setWallets([]))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const sorted = [...wallets].sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(5,5,5,.74)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="screen-enter"
        style={{ width: '100%', maxWidth: 400, background: '#0E0E0E', border: '1px solid #242424', borderRadius: 8, overflow: 'hidden', boxShadow: '0 30px 80px -24px rgba(0,0,0,.85)' }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1c1c1c' }}>
          <div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: '#EDEDED' }}>Connect a wallet</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', marginTop: 2 }}>Stellar · Testnet</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="vbtn"
            style={{ background: 'transparent', border: '1px solid #242424', borderRadius: 4, width: 30, height: 30, color: '#8A8A8A', cursor: 'pointer', fontSize: 14 }}
          >✕</button>
        </div>

        {/* list */}
        <div className="p-2.5" style={{ maxHeight: 380, overflowY: 'auto' }}>
          {loading && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A', textAlign: 'center', padding: '28px 0' }}>
              detecting wallets…
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A', textAlign: 'center', padding: '28px 0' }}>
              No wallets found.
            </div>
          )}

          {!loading && sorted.map((w) => {
            const busy = connectingId === w.id
            const row = (
              <>
                <span style={{ width: 30, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#161616', border: '1px solid #242424', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.icon} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
                </span>
                <span className="flex-1 text-left" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: '#EDEDED' }}>{w.name}</span>
                {busy ? (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: '#14B88A' }}>connecting…</span>
                ) : w.isAvailable ? (
                  <span className="inline-flex items-center gap-1.5" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#14B88A' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#14B88A', display: 'inline-block' }} />
                    DETECTED
                  </span>
                ) : (
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#5A5A5A' }}>INSTALL ↗</span>
                )}
              </>
            )

            const baseStyle: React.CSSProperties = {
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 6, marginBottom: 2,
              background: 'transparent', border: '1px solid transparent',
              cursor: busy ? 'wait' : 'pointer', textDecoration: 'none',
            }

            // available → connect; unavailable → open install page
            return w.isAvailable ? (
              <button key={w.id} onClick={() => !busy && onChoose(w.id)} disabled={busy}
                className="vlink wallet-row" style={baseStyle}
              >{row}</button>
            ) : (
              <a key={w.id} href={w.url} target="_blank" rel="noopener noreferrer"
                className="vlink wallet-row" style={baseStyle}
              >{row}</a>
            )
          })}
        </div>

        {/* footer */}
        <div className="px-5 py-3" style={{ borderTop: '1px solid #1c1c1c' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#5A5A5A', lineHeight: 1.5 }}>
            Your keys never leave your wallet. Veil only reads your address and asks you to sign.
          </span>
        </div>
      </div>
    </div>
  )
}
