'use client'

import { useEffect, useRef, useState } from 'react'
import { Screen } from '@/lib/data'
import { shortAddr } from '@/lib/wallet'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

interface Props {
  go: (s: Screen) => void
  huntActive: boolean
  createActive: boolean
  balanceStr: string
  connected: boolean
  connecting: boolean
  address: string | null
  onConnect: () => void
  onDisconnect: () => void
  onSwitch: () => void
}

export default function AppNav({ go, huntActive, createActive, balanceStr, connected, connecting, address, onConnect, onDisconnect, onSwitch }: Props) {
  const tabBg  = (on: boolean) => on ? '#1c1c1c' : 'transparent'
  const tabClr = (on: boolean) => on ? '#EDEDED' : '#8A8A8A'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const copyAddress = () => { if (address) { try { navigator.clipboard.writeText(address) } catch {} } }

  return (
    <div className="flex items-center justify-between px-5 md:px-10 py-[14px] md:py-[18px]"
      style={{ borderBottom: '1px solid #242424', position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 20 }}
    >
      <div className="flex items-center gap-5 md:gap-10">
        <button type="button" onClick={() => go('landing')} className="vbtn"
          style={{ fontFamily: MONO, fontWeight: 700, fontSize: 17, letterSpacing: '.34em', cursor: 'pointer', color: '#EDEDED', background: 'transparent', border: 0, padding: 0 }}
        >
          VEIL
        </button>
        <div className="flex gap-[3px] md:gap-[6px]"
          style={{ border: '1px solid #242424', borderRadius: 2, padding: 3 }}
        >
          <button type="button" onClick={() => go('hunt')} aria-current={huntActive ? 'page' : undefined}
            className="vlink text-[11px] md:text-[12px] px-3 md:px-[14px] py-[6px] md:py-[7px]"
            style={{ fontFamily: MONO, letterSpacing: '.02em', borderRadius: 1, cursor: 'pointer', background: tabBg(huntActive), color: tabClr(huntActive), border: 0 }}
          >
            <span className="hidden sm:inline">Hunt bounties</span>
            <span className="inline sm:hidden">Hunt</span>
          </button>
          <button type="button" onClick={() => go('create')} aria-current={createActive ? 'page' : undefined}
            className="vlink text-[11px] md:text-[12px] px-3 md:px-[14px] py-[6px] md:py-[7px]"
            style={{ fontFamily: MONO, letterSpacing: '.02em', borderRadius: 1, cursor: 'pointer', background: tabBg(createActive), color: tabClr(createActive), border: 0 }}
          >
            <span className="hidden sm:inline">Create bounty</span>
            <span className="inline sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* wallet badge / connect */}
      {connected ? (
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button type="button" onClick={() => setMenuOpen(v => !v)}
            aria-haspopup="true" aria-expanded={menuOpen}
            className="vbtn group flex items-center gap-2 md:gap-[9px] px-3 md:px-[14px] py-2 md:py-[8px]"
            style={{ border: '1px solid #242424', borderRadius: 2, background: 'transparent', cursor: 'pointer' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#14B88A', display: 'inline-block', boxShadow: '0 0 0 3px rgba(20,184,138,.12)' }} />
            <span className="hidden sm:inline" style={{ fontFamily: MONO, fontSize: 12, color: '#EDEDED', letterSpacing: '.02em' }}>{address ? shortAddr(address) : '—'}</span>
            <span className="hidden sm:inline" style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A' }}>·</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: '#8A8A8A' }}>{balanceStr} BNB</span>
          </button>

          {menuOpen && (
            <div role="menu" className="screen-enter"
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 220,
                background: '#0E0E0E', border: '1px solid #242424', borderRadius: 4,
                boxShadow: '0 20px 50px -20px rgba(0,0,0,.85)', overflow: 'hidden', zIndex: 30,
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1c1c1c' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Address</div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontFamily: MONO, fontSize: 13, color: '#EDEDED' }}>{address ? shortAddr(address) : '—'}</span>
                  <button type="button" onClick={copyAddress} title="Copy address" aria-label="Copy address" className="vlink"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#14B88A', fontFamily: MONO, fontSize: 11 }}
                  >copy</button>
                </div>
              </div>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1c1c1c' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Balance</div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: '#EDEDED' }}>{balanceStr} BNB</div>
              </div>
              <button type="button" onClick={() => { setMenuOpen(false); onSwitch() }}
                className="vlink" role="menuitem"
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 16px', fontFamily: SANS, fontSize: 13, color: '#EDEDED' }}
              >Switch account</button>
              <button type="button" onClick={() => { setMenuOpen(false); onDisconnect() }}
                className="vlink" role="menuitem"
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 16px', fontFamily: SANS, fontSize: 13, color: '#E06A6A', borderTop: '1px solid #1c1c1c' }}
              >Disconnect wallet</button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={onConnect} disabled={connecting}
          className="vbtn vbtn-ghost flex items-center gap-2 px-3 md:px-[14px] py-2 md:py-[8px]"
          style={{ background: 'transparent', border: '1px solid #333', borderRadius: 2, cursor: connecting ? 'wait' : 'pointer', fontFamily: MONO, fontSize: 12, color: '#EDEDED', letterSpacing: '.02em' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B88A', display: 'inline-block' }} />
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      )}
    </div>
  )
}
