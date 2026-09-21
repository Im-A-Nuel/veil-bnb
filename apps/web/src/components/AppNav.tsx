'use client'

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

  return (
    <div className="flex items-center justify-between px-5 md:px-10 py-[14px] md:py-[18px]"
      style={{ borderBottom: '1px solid #242424', position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 20 }}
    >
      <div className="flex items-center gap-5 md:gap-10">
        <div onClick={() => go('landing')} className="vbtn"
          style={{ fontFamily: MONO, fontWeight: 700, fontSize: 17, letterSpacing: '.34em', cursor: 'pointer', color: '#EDEDED' }}
        >
          VEIL
        </div>
        <div className="flex gap-[3px] md:gap-[6px]"
          style={{ border: '1px solid #242424', borderRadius: 2, padding: 3 }}
        >
          <span onClick={() => go('hunt')}
            className="vlink text-[11px] md:text-[12px] px-3 md:px-[14px] py-[6px] md:py-[7px]"
            style={{ fontFamily: MONO, letterSpacing: '.02em', borderRadius: 1, cursor: 'pointer', background: tabBg(huntActive), color: tabClr(huntActive) }}
          >
            <span className="hidden sm:inline">Hunt bounties</span>
            <span className="inline sm:hidden">Hunt</span>
          </span>
          <span onClick={() => go('create')}
            className="vlink text-[11px] md:text-[12px] px-3 md:px-[14px] py-[6px] md:py-[7px]"
            style={{ fontFamily: MONO, letterSpacing: '.02em', borderRadius: 1, cursor: 'pointer', background: tabBg(createActive), color: tabClr(createActive) }}
          >
            <span className="hidden sm:inline">Create bounty</span>
            <span className="inline sm:hidden">Create</span>
          </span>
        </div>
      </div>

      {/* wallet badge / connect */}
      {connected ? (
        <div className="vbtn group flex items-center gap-2 md:gap-[9px] px-3 md:px-[14px] py-2 md:py-[8px]"
          style={{ border: '1px solid #242424', borderRadius: 2, background: 'transparent' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#14B88A', display: 'inline-block', boxShadow: '0 0 0 3px rgba(20,184,138,.12)' }} />
          <button onClick={onSwitch} title="Switch account" aria-label="Switch account"
            className="vlink hidden sm:inline"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 12, color: '#EDEDED', letterSpacing: '.02em', padding: 0 }}
          >{address ? shortAddr(address) : '—'}</button>
          <span className="hidden sm:inline" style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A' }}>·</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#8A8A8A' }}>{balanceStr} XLM</span>
          <span style={{ width: 1, height: 14, background: '#242424', display: 'inline-block', margin: '0 2px' }} />
          <button onClick={onDisconnect} title="Disconnect wallet" aria-label="Disconnect wallet"
            className="vlink flex items-center"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#14B88A', padding: 0, lineHeight: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17H7A5 5 0 0 1 7 7" />
              <path d="M15 7h2a5 5 0 0 1 4 7.54" />
              <line x1="8" y1="12" x2="12" y2="12" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </button>
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
