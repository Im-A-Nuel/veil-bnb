'use client'

import { Screen } from '@/lib/data'
import Nav from '../Nav'
import CanvasBurst from '../CanvasBurst'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

const FEATURES = [
  { title: 'Zero-knowledge proofs',   desc: "Prove the exploit is real without revealing a single byte of how you did it." },
  { title: 'On-chain verification',   desc: "RISC Zero receipts are verified inside the Soroban contract — no trusted middleman." },
  { title: 'Automatic payout',        desc: "A valid proof releases the escrow in the same transaction. No negotiation, no delay." },
  { title: 'Open-source rules',       desc: "Each bounty's ImageID pins the exact guest program that defines a valid break." },
  { title: 'No disclosure risk',      desc: "The vulnerability is proven, not published. Nothing leaks to the contract or the chain." },
  { title: 'Permissionless',          desc: "Anyone can open a bounty or claim one. The contract is the only arbiter." },
]

interface Props {
  go: (s: Screen) => void
  connectWallet: () => void
}

export default function Features({ go, connectWallet }: Props) {
  return (
    <div>
      <Nav active="features" go={go} connectWallet={connectWallet} />

      {/* hero */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #242424' }}>
        <CanvasBurst />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 72% 88% at 50% 50%,transparent 22%,#0A0A0A 78%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 840, margin: '0 auto', padding: '94px 40px 82px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid #242424', background: 'rgba(10,10,10,.5)', padding: '6px 12px', borderRadius: 2, marginBottom: 26 }}>
            <span style={{ width: 5, height: 5, background: '#14B88A', display: 'inline-block' }} />
            <span style={{ font: `11px ${MONO}`, color: '#8A8A8A', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: MONO }}>Features</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 62, lineHeight: 1.02, letterSpacing: '-.01em', margin: '0 0 22px', color: '#EDEDED' }}>
            Everything the proof needs.<br />Nothing it doesn&apos;t.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#8A8A8A', maxWidth: 560, margin: '0 auto', fontFamily: SANS }}>
            Veil turns a private exploit into an on-chain payout — without the vulnerability ever leaving the hunter&apos;s machine.
          </p>
        </div>
      </div>

      {/* feature grid */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px 94px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: '#242424', border: '1px solid #242424', borderTop: 'none' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#0A0A0A', padding: '38px 30px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: '1px solid #242424', borderRadius: 2, marginBottom: 22 }}>
                <span style={{ font: `13px ${MONO}`, color: '#14B88A', fontFamily: MONO }}>&lt;&gt;</span>
              </div>
              <div style={{ font: `600 18px ${SANS}`, marginBottom: 10, fontFamily: SANS, color: '#EDEDED' }}>{f.title}</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#8A8A8A', margin: 0, fontFamily: SANS }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #242424' }}>
        <CanvasBurst />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 90% at 50% 50%,transparent 18%,#0A0A0A 76%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', padding: '100px 40px' }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 52, lineHeight: 1.02, margin: '0 0 30px', color: '#EDEDED' }}>
            Prove the exploit. Reveal nothing.
          </h1>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button onClick={() => go('hunt')} style={{ background: '#EDEDED', color: '#0A0A0A', border: 'none', padding: '14px 24px', font: `600 14px ${SANS}`, borderRadius: 2, cursor: 'pointer', fontFamily: SANS }}>Explore bounties</button>
            <button onClick={() => go('howitworks')} style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '14px 24px', font: `500 14px ${SANS}`, borderRadius: 2, cursor: 'pointer', fontFamily: SANS }}>How it works</button>
          </div>
        </div>
      </div>
    </div>
  )
}
