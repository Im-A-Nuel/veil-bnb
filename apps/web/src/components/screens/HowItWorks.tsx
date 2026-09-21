'use client'

import { Screen } from '@/lib/data'
import Nav from '../Nav'
import CanvasBurst from '../CanvasBurst'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

const STEPS = [
  { n: '01', title: 'Open a bounty',   body: <>A creator locks a reward against a deployed contract and publishes the guest <span style={{ fontFamily: MONO, color: '#EDEDED' }}>ImageID</span> that defines a valid break.</> },
  { n: '02', title: 'Break it locally', body: "A hunter finds the exploit and runs the open-source guest program on their own machine — the secret input never leaves it." },
  { n: '03', title: 'Generate a proof', body: <>RISC Zero produces a receipt — a <span style={{ fontFamily: MONO, color: '#EDEDED' }}>journal + seal</span> — that proves the break happened, with nothing about how.</> },
  { n: '04', title: 'Verify on-chain',  body: <>The hunter submits the receipt; the Soroban contract verifies it against the <span style={{ fontFamily: MONO, color: '#EDEDED' }}>ImageID</span> and the victim binding.</> },
  { n: '05', title: 'Get paid',         body: "On a valid proof, the contract releases the escrow to the hunter automatically — in the same transaction." },
]

interface Props {
  go: (s: Screen) => void
  connectWallet: () => void
}

export default function HowItWorks({ go, connectWallet }: Props) {
  const pill = (label: string, teal: boolean) => (
    <span key={label} style={{
      font: `11px ${MONO}`, color: teal ? '#14B88A' : '#8A8A8A',
      border: `1px solid ${teal ? 'rgba(20,184,138,.35)' : '#242424'}`,
      background: teal ? 'rgba(20,184,138,.06)' : 'transparent',
      padding: '6px 11px', borderRadius: 2, fontFamily: MONO,
    }}>
      {label}
    </span>
  )

  return (
    <div>
      <Nav active="howitworks" go={go} connectWallet={connectWallet} />

      {/* hero */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #242424' }}>
        <CanvasBurst />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 72% 88% at 50% 50%,transparent 22%,#0A0A0A 78%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 840, margin: '0 auto', padding: '84px 40px 58px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid #242424', background: 'rgba(10,10,10,.5)', padding: '6px 12px', borderRadius: 2, marginBottom: 26 }}>
            <span style={{ width: 5, height: 5, background: '#14B88A', display: 'inline-block' }} />
            <span style={{ font: `11px ${MONO}`, color: '#8A8A8A', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: MONO }}>How it works</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 58, lineHeight: 1.02, letterSpacing: '-.01em', margin: '0 0 30px', color: '#EDEDED' }}>
            From exploit to payout,<br />in five steps.
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {pill('secret input', true)}
            <span style={{ color: '#5A5A5A', font: '13px monospace' }}>→</span>
            {pill('zk proof', false)}
            <span style={{ color: '#5A5A5A', font: '13px monospace' }}>→</span>
            {pill('receipt', false)}
            <span style={{ color: '#5A5A5A', font: '13px monospace' }}>→</span>
            {pill('on-chain verify', false)}
            <span style={{ color: '#5A5A5A', font: '13px monospace' }}>→</span>
            {pill('payout', true)}
          </div>
        </div>
      </div>

      {/* steps */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '30px 40px 90px' }}>
        {STEPS.map((step, i) => (
          <div key={step.n} style={{
            display: 'grid', gridTemplateColumns: '72px 1fr', gap: 28,
            padding: '30px 0',
            borderBottom: i < STEPS.length - 1 ? '1px solid #1c1c1c' : 'none',
          }}>
            <div style={{ fontFamily: SERIF, fontSize: 42, color: '#14B88A', lineHeight: 1 }}>{step.n}</div>
            <div>
              <div style={{ font: `600 19px ${SANS}`, marginBottom: 8, fontFamily: SANS, color: '#EDEDED' }}>{step.title}</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#8A8A8A', margin: 0, fontFamily: SANS }}>{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #242424' }}>
        <CanvasBurst />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 90% at 50% 50%,transparent 18%,#0A0A0A 76%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', padding: '100px 40px' }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 52, lineHeight: 1.02, margin: '0 0 30px', color: '#EDEDED' }}>
            Ready to break something?
          </h1>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button onClick={() => go('hunt')}   style={{ background: '#EDEDED', color: '#0A0A0A', border: 'none', padding: '14px 24px', font: `600 14px ${SANS}`, borderRadius: 2, cursor: 'pointer', fontFamily: SANS }}>Explore bounties</button>
            <button onClick={() => go('create')} style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '14px 24px', font: `500 14px ${SANS}`, borderRadius: 2, cursor: 'pointer', fontFamily: SANS }}>Open a bounty</button>
          </div>
        </div>
      </div>
    </div>
  )
}
