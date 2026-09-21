'use client'

import { Screen } from '@/lib/data'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"

interface Props {
  active: Screen
  go: (s: Screen) => void
  connectWallet: () => void
}

export default function Nav({ active, go, connectWallet }: Props) {
  const link = (label: string, target: Screen) => (
    <span
      onClick={() => go(target)}
      style={{
        font: `13px/1 ${MONO}`, letterSpacing: '.02em', cursor: 'pointer',
        color: active === target ? '#EDEDED' : '#8A8A8A',
      }}
    >
      {label}
    </span>
  )

  return (
    <div style={{
      position: 'relative', zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 48px', borderBottom: '1px solid #242424',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
        <div
          onClick={() => go('landing')}
          style={{ font: `700 18px ${MONO}`, letterSpacing: '.34em', cursor: 'pointer', color: '#EDEDED' }}
        >
          VEIL
        </div>
        <div style={{ display: 'flex', gap: 30 }}>
          {link('Features', 'features')}
          {link('How it works', 'howitworks')}
          {link('Bounties', 'hunt')}
          <span style={{ font: `13px ${MONO}`, color: '#8A8A8A', letterSpacing: '.02em', cursor: 'pointer' }}>Docs</span>
        </div>
      </div>
      <button
        onClick={connectWallet}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'transparent', color: '#EDEDED', border: '1px solid #333',
          padding: '10px 18px', font: `13px ${MONO}`, letterSpacing: '.02em',
          borderRadius: 2, cursor: 'pointer', fontFamily: MONO,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B88A', display: 'inline-block' }} />
        Connect wallet
      </button>
    </div>
  )
}
