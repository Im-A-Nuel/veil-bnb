'use client'

import { useState, useEffect } from 'react'
import { Screen } from '@/lib/data'
import { shortAddr } from '@/lib/wallet'
import CanvasDiamond from '../CanvasDiamond'
import CanvasBurst from '../CanvasBurst'
import CanvasDiagGrid from '../CanvasDiagGrid'
import Reveal from '../Reveal'
import FlowDiagram from '../FlowDiagram'

const MONO  = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS  = "var(--font-sans,'Inter',sans-serif)"

const FEATURES = [
  { title: 'Zero-knowledge proofs',  desc: "Prove the exploit is real without revealing a single byte of how you did it." },
  { title: 'On-chain verification',  desc: "RISC Zero receipts are verified inside the Soroban contract — no trusted middleman." },
  { title: 'Automatic payout',       desc: "A valid proof releases the escrow in the same transaction. No negotiation, no delay." },
  { title: 'Open-source rules',      desc: "Each bounty's ImageID pins the exact guest program that defines a valid break." },
  { title: 'No disclosure risk',     desc: "The vulnerability is proven, not published. Nothing leaks to the contract or the chain." },
  { title: 'Permissionless',         desc: "Anyone can open a bounty or claim one. The contract is the only arbiter." },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

interface Props {
  go: (s: Screen) => void
  connectWallet: () => void
  connected: boolean
  address: string | null
}

export default function Landing({ go, connectWallet, connected, address }: Props) {
  const [active, setActive] = useState<'features' | 'howitworks' | ''>('')
  const [menuOpen, setMenuOpen] = useState(false)

  // scroll-spy: highlight nav link for the section in view
  useEffect(() => {
    const ids = ['features', 'howitworks']
    const els = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const obs = new IntersectionObserver(
      entries => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (vis) setActive(vis.target.id as 'features' | 'howitworks')
        else if (window.scrollY < 300) setActive('')
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const navLink = (id: string) => ({
    color: active === id ? '#EDEDED' : '#8A8A8A',
  })

  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED' }}>

      {/* ─── NAV ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #242424' }}
        className="flex items-center justify-between px-5 md:px-12 py-[18px]"
      >
        {/* left: logo + links */}
        <div className="flex items-center gap-8 md:gap-12">
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="vbtn"
            style={{ fontFamily: MONO, fontWeight: 700, letterSpacing: '.34em', cursor: 'pointer', color: '#EDEDED', fontSize: 17 }}
          >
            VEIL
          </div>
          {/* nav links — desktop only */}
          <div className="hidden md:flex gap-[30px]">
            {[
              { label: 'Features',     id: 'features',   fn: () => scrollTo('features') },
              { label: 'How it works', id: 'howitworks', fn: () => scrollTo('howitworks') },
              { label: 'Bounties',     id: '',           fn: () => go('hunt') },
              { label: 'Docs',         id: '',           fn: () => {} },
            ].map(({ label, id, fn }) => (
              <span key={label} onClick={fn} className="vlink"
                style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '.02em', cursor: 'pointer', ...navLink(id) }}
              >{label}</span>
            ))}
          </div>
        </div>

        {/* desktop: Connect wallet / connected → enter app */}
        <button onClick={connected ? () => go('hunt') : connectWallet}
          className="vbtn vbtn-ghost hidden md:inline-flex items-center gap-2"
          style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '10px 18px', fontFamily: MONO, fontSize: 13, letterSpacing: '.02em', borderRadius: 2, cursor: 'pointer' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B88A', display: 'inline-block' }} />
          {connected && address ? shortAddr(address) : 'Connect wallet'}
        </button>

        {/* mobile: hamburger menu */}
        <button onClick={() => setMenuOpen(o => !o)}
          className="vbtn flex md:hidden items-center justify-center"
          aria-label="Menu" aria-expanded={menuOpen}
          style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', width: 40, height: 38, borderRadius: 2, cursor: 'pointer', fontSize: 16 }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* mobile menu sheet */}
      {menuOpen && (
        <div className="md:hidden screen-enter" style={{ position: 'sticky', top: 73, zIndex: 29, background: '#0E0E0E', borderBottom: '1px solid #242424' }}>
          {[
            { label: 'Features',     fn: () => { scrollTo('features'); setMenuOpen(false) } },
            { label: 'How it works', fn: () => { scrollTo('howitworks'); setMenuOpen(false) } },
            { label: 'Bounties',     fn: () => go('hunt') },
            { label: 'Create bounty',fn: () => go('create') },
          ].map(({ label, fn }) => (
            <div key={label} onClick={fn} className="vlink px-5 py-4"
              style={{ fontFamily: MONO, fontSize: 14, color: '#8A8A8A', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}
            >{label}</div>
          ))}
        </div>
      )}

      {/* ─── HERO ─── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* grid bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .35,
          backgroundImage: 'linear-gradient(#161616 1px,transparent 1px),linear-gradient(90deg,#161616 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <div className="relative max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_600px] items-center gap-10 px-5 md:px-12 pt-12 md:pt-24 pb-10 md:pb-20">
          {/* text */}
          <div>
            <Reveal delay={0} y={14} className="inline-flex items-center gap-2 mb-6 md:mb-9"
              style={{ border: '1px solid #242424', padding: '6px 12px', borderRadius: 2 }}
            >
              <span style={{ width: 5, height: 5, background: '#14B88A', display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                Trustless proof-of-exploit · Stellar
              </span>
            </Reveal>
            <Reveal delay={80} y={16}>
              <h1
                className="text-[48px] md:text-[84px] mb-5 md:mb-7"
                style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: .98, letterSpacing: '-.01em', color: '#EDEDED', margin: 0 }}
              >
                Prove the exploit.<br />Reveal nothing.
              </h1>
            </Reveal>
            <Reveal delay={160} y={16}>
              <p
                className="text-[15px] md:text-[17px]"
                style={{ lineHeight: 1.6, color: '#8A8A8A', maxWidth: 480, fontFamily: SANS, margin: 0 }}
              >
                Hunters prove they broke your contract without leaking how. The contract verifies the zero-knowledge proof on-chain and pays out automatically.
              </p>
            </Reveal>
            <Reveal delay={240} y={16} className="flex flex-col sm:flex-row gap-3 md:gap-[14px] mt-9 md:mt-12">
              <button onClick={() => go('hunt')} className="vbtn"
                style={{ background: '#EDEDED', color: '#0A0A0A', border: 'none', padding: '14px 24px', fontFamily: SANS, fontWeight: 600, fontSize: 14, borderRadius: 2, cursor: 'pointer' }}
              >Explore bounties</button>
              <button onClick={() => scrollTo('howitworks')} className="vbtn vbtn-ghost"
                style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '14px 24px', fontFamily: SANS, fontWeight: 500, fontSize: 14, borderRadius: 2, cursor: 'pointer' }}
              >How it works</button>
            </Reveal>
          </div>

          {/* diamond — desktop only (no inline display, controlled by Tailwind) */}
          <Reveal delay={120} y={20} className="hidden md:flex relative items-center justify-center"
            style={{ width: 600, height: 560 }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.14em' }}>ENCRYPTED · ZK-RECEIPT</div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderLeft: '1px solid #333', borderTop: '1px solid #333' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRight: '1px solid #333', borderTop: '1px solid #333' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, borderLeft: '1px solid #333', borderBottom: '1px solid #333' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRight: '1px solid #333', borderBottom: '1px solid #333' }} />
            <CanvasDiamond width={540} height={540} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.14em' }}>SEAL VALID ✓</div>
          </Reveal>
        </div>

        {/* diamond — mobile only */}
        <Reveal y={20} className="flex md:hidden justify-center relative px-5 pb-10">
          <div style={{ position: 'absolute', top: 8, left: 20, fontFamily: MONO, fontSize: 9, color: '#5A5A5A', letterSpacing: '.12em' }}>ENCRYPTED · ZK-RECEIPT</div>
          <CanvasDiamond width={300} height={300} />
        </Reveal>
      </div>

      {/* ─── TECH BAR ─── */}
      <Reveal y={12} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-5 md:px-12 py-7 md:py-8"
        style={{ borderTop: '1px solid #242424', background: 'linear-gradient(180deg,#0C0C0C,#0A0A0A)' }}
      >
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', letterSpacing: '.2em', textTransform: 'uppercase', flexShrink: 0 }}>Built on</span>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {['Stellar', 'Soroban', 'RISC Zero', 'Zero-Knowledge'].map((t) => (
            <span key={t} className="vlink inline-flex items-center gap-2"
              style={{
                fontFamily: MONO, fontSize: 13, color: '#EDEDED', letterSpacing: '.01em',
                border: '1px solid #242424', background: '#121212',
                padding: '8px 14px', borderRadius: 999, cursor: 'default',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#14B88A', display: 'inline-block', boxShadow: '0 0 6px rgba(20,184,138,.7)' }} />
              {t}
            </span>
          ))}
        </div>
      </Reveal>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ scrollMarginTop: 64, borderTop: '1px solid #242424' }}>
        {/* section header */}
        <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #242424' }}>
          <CanvasBurst />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 72% 88% at 50% 50%,transparent 22%,#0A0A0A 78%)' }} />
          <Reveal className="relative text-center max-w-[840px] mx-auto px-5 md:px-10 py-12 md:py-[80px]">
            <div className="inline-flex items-center gap-2 mb-6"
              style={{ border: '1px solid #242424', background: 'rgba(10,10,10,.5)', padding: '6px 12px', borderRadius: 2 }}
            >
              <span style={{ width: 5, height: 5, background: '#14B88A', display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A', letterSpacing: '.14em', textTransform: 'uppercase' }}>Features</span>
            </div>
            <h2 className="text-[38px] md:text-[62px] mb-5 md:mb-6"
              style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.02, letterSpacing: '-.01em', color: '#EDEDED', margin: 0 }}
            >
              Everything the proof needs.<br />Nothing it doesn&apos;t.
            </h2>
            <p className="text-[15px] md:text-[17px] max-w-[560px] mx-auto"
              style={{ lineHeight: 1.6, color: '#8A8A8A', fontFamily: SANS }}
            >
              Veil turns a private exploit into an on-chain payout — without the vulnerability ever leaving the hunter&apos;s machine.
            </p>
          </Reveal>
        </div>

        {/* feature cards — 2-col, Image #5 style */}
        <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-10 md:py-14 pb-16 md:pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 2) * 90} className="h-full">
              <div className="vcard flex flex-col h-full p-6 md:p-8"
                style={{ background: '#111111', border: '1px solid #242424', borderRadius: 12 }}
              >
                {/* header: <> Title inline */}
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontFamily: MONO, fontSize: 15, color: '#14B88A', flexShrink: 0 }}>&lt;&gt;</span>
                  <span className="text-[22px] md:text-[26px]"
                    style={{ fontFamily: SERIF, fontWeight: 400, color: '#EDEDED', lineHeight: 1.1 }}
                  >{f.title}</span>
                </div>
                <p className="text-[13px] md:text-[14px] mb-5"
                  style={{ lineHeight: 1.65, color: '#8A8A8A', margin: '0 0 20px', fontFamily: SANS }}
                >{f.desc}</p>
                {/* illustration */}
                <div className="mt-auto" style={{ background: '#0D0D0D', border: '1px solid #1c1c1c', borderRadius: 8, overflow: 'hidden' }}>
                  {i === 0 && (
                    /* ZK proof: secret → zkVM → receipt */
                    <div className="grid grid-cols-[1fr_44px_1fr] items-center gap-0 p-4 md:p-5">
                      <div style={{ border: '1px solid rgba(20,184,138,.28)', borderRadius: 6, padding: '14px 12px', background: 'rgba(20,184,138,.04)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#14B88A', letterSpacing: '.1em', marginBottom: 10 }}>SECRET INPUT</div>
                        <div style={{ fontFamily: MONO, fontSize: 14, color: '#EDEDED', marginBottom: 5 }}>a = <span style={{ color: '#3A3A3A' }}>████</span></div>
                        <div style={{ fontFamily: MONO, fontSize: 14, color: '#EDEDED', marginBottom: 10 }}>b = <span style={{ color: '#3A3A3A' }}>████</span></div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A4A4A' }}>never transmitted</div>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span style={{ fontFamily: MONO, fontSize: 9, color: '#4A4A4A' }}>zkVM</span>
                        <span style={{ color: '#333', fontSize: 16 }}>→</span>
                      </div>
                      <div style={{ border: '1px solid #242424', borderRadius: 6, padding: '14px 12px', background: '#161616' }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#5A5A5A', letterSpacing: '.1em', marginBottom: 10 }}>RECEIPT</div>
                        <div style={{ fontFamily: MONO, fontSize: 12, color: '#EDEDED', marginBottom: 6 }}>journal&nbsp;&nbsp;<span style={{ color: '#14B88A' }}>✓</span></div>
                        <div style={{ fontFamily: MONO, fontSize: 12, color: '#EDEDED', marginBottom: 10 }}>seal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#14B88A' }}>✓</span></div>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A4A4A' }}>submitted on-chain</div>
                      </div>
                    </div>
                  )}
                  {i === 1 && (
                    /* On-chain verification: contract call result */
                    <div className="p-4 md:p-5" style={{ fontFamily: MONO }}>
                      <div style={{ fontSize: 10, color: '#4A4A4A', marginBottom: 14, letterSpacing: '.06em' }}>bounty-verifier.claim()</div>
                      {[
                        { k: 'image_id',   v: '0x9a3f…bc1d' },
                        { k: 'victim_id',  v: 'CA4F…9XQ2'   },
                        { k: 'not claimed',v: 'true'         },
                      ].map(r => (
                        <div key={r.k} className="flex justify-between py-2" style={{ borderBottom: '1px solid #1a1a1a', fontSize: 11.5 }}>
                          <span style={{ color: '#5A5A5A' }}>{r.k}</span>
                          <span style={{ color: '#EDEDED' }}>{r.v}&nbsp;<span style={{ color: '#14B88A' }}>✓</span></span>
                        </div>
                      ))}
                      <div className="mt-3 px-3 py-2" style={{ background: 'rgba(20,184,138,.07)', border: '1px solid rgba(20,184,138,.25)', borderRadius: 4, fontSize: 11, color: '#14B88A' }}>
                        PROOF VALID → transfer 2,500 XLM
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    /* Automatic payout: wallet tx */
                    <div className="p-4 md:p-5" style={{ fontFamily: MONO }}>
                      <div className="flex items-center gap-2 mb-4">
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#14B88A', display: 'inline-block' }} />
                        <span style={{ fontSize: 10, color: '#14B88A' }}>confirmed · block #8,247,391</span>
                      </div>
                      <div style={{ fontSize: 28, color: '#EDEDED', fontWeight: 600, letterSpacing: '-.01em', marginBottom: 3 }}>+2,500 XLM</div>
                      <div style={{ fontSize: 11, color: '#4A4A4A', marginBottom: 16 }}>≈ $412.50 USD</div>
                      <div style={{ fontSize: 11, color: '#5A5A5A' }}>
                        <div style={{ marginBottom: 5 }}>From: bounty-verifier CA4F…</div>
                        <div>To:&nbsp;&nbsp;&nbsp;GD7X…K2P9</div>
                      </div>
                    </div>
                  )}
                  {i === 3 && (
                    /* Open-source rules: code block */
                    <div className="p-4 md:p-5">
                      {[
                        ['1', 'fn is_broken(',                   '#8A8A8A'],
                        ['2', '  a: u128, b: u128,',             '#8A8A8A'],
                        ['3', '  target: u128) -> bool {',       '#8A8A8A'],
                        ['4', '  a * b == target',               '#EDEDED'],
                        ['5', '  && a != 1 && b != 1',           '#EDEDED'],
                        ['6', '}',                               '#8A8A8A'],
                      ].map(([n, code, clr]) => (
                        <div key={n} className="flex gap-4" style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.85 }}>
                          <span style={{ color: '#333', width: 12, flexShrink: 0 }}>{n}</span>
                          <span style={{ color: clr as string }}>{code}</span>
                        </div>
                      ))}
                      <div className="mt-3 px-3 py-2" style={{ background: '#161616', border: '1px solid #1c1c1c', borderRadius: 4, fontFamily: MONO, fontSize: 10.5, color: '#5A5A5A' }}>
                        image_id: <span style={{ color: '#EDEDED' }}>0x9a3f…bc1d</span>
                      </div>
                    </div>
                  )}
                  {i === 4 && (
                    /* No disclosure risk: hunter vs chain view */
                    <div className="grid grid-cols-2 gap-3 p-4 md:p-5">
                      <div style={{ border: '1px solid rgba(20,184,138,.22)', borderRadius: 6, padding: '12px 11px', background: 'rgba(20,184,138,.03)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#14B88A', letterSpacing: '.1em', marginBottom: 10 }}>HUNTER (LOCAL)</div>
                        {['a = 1000', 'b = 1000', 't = 1_000_000'].map(l => (
                          <div key={l} style={{ fontFamily: MONO, fontSize: 11.5, color: '#EDEDED', marginBottom: 5 }}>{l}</div>
                        ))}
                      </div>
                      <div style={{ border: '1px solid #1c1c1c', borderRadius: 6, padding: '12px 11px', background: '#161616' }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A4A4A', letterSpacing: '.1em', marginBottom: 10 }}>CHAIN SEES</div>
                        {['a = [hidden]', 'b = [hidden]'].map(l => (
                          <div key={l} style={{ fontFamily: MONO, fontSize: 11.5, color: '#2E2E2E', marginBottom: 5 }}>{l}</div>
                        ))}
                        <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#14B88A', marginBottom: 5 }}>valid = true ✓</div>
                      </div>
                    </div>
                  )}
                  {i === 5 && (
                    /* Permissionless: open access table */
                    <div className="p-4 md:p-5" style={{ fontFamily: MONO }}>
                      {[
                        { role: 'Creator ', action: 'fund(reward)',         teal: false },
                        { role: 'Hunter  ', action: 'submit(receipt)',      teal: false },
                        { role: 'Contract', action: 'verify() → pay()',     teal: true  },
                      ].map((r, j) => (
                        <div key={j} className="flex items-center justify-between py-3"
                          style={{ borderBottom: j < 2 ? '1px solid #1a1a1a' : 'none', fontSize: 11.5 }}
                        >
                          <span style={{ color: '#5A5A5A' }}>{r.role}</span>
                          <span style={{ color: '#333', fontSize: 11 }}>→</span>
                          <span style={{ color: r.teal ? '#14B88A' : '#EDEDED' }}>{r.action}</span>
                        </div>
                      ))}
                      <div className="mt-3" style={{ fontSize: 9, color: '#383838', letterSpacing: '.12em' }}>
                        NO KYC · NO APPROVAL · NO TRUST REQUIRED
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="howitworks" style={{ scrollMarginTop: 64, borderTop: '1px solid #242424' }}>
        {/* section header */}
        <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #242424' }}>
          <CanvasBurst />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 72% 88% at 50% 50%,transparent 22%,#0A0A0A 78%)' }} />
          <Reveal className="relative text-center max-w-[840px] mx-auto px-5 md:px-10 py-12 md:py-[80px]">
            <div className="inline-flex items-center gap-2 mb-6"
              style={{ border: '1px solid #242424', background: 'rgba(10,10,10,.5)', padding: '6px 12px', borderRadius: 2 }}
            >
              <span style={{ width: 5, height: 5, background: '#14B88A', display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A', letterSpacing: '.14em', textTransform: 'uppercase' }}>How it works</span>
            </div>
            <h2 className="text-[36px] md:text-[58px] mb-5"
              style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.02, letterSpacing: '-.01em', color: '#EDEDED', margin: 0 }}
            >
              From exploit to payout,<br />in one flow.
            </h2>
            <p className="text-[14px] md:text-[16px] max-w-[520px] mx-auto mt-5"
              style={{ lineHeight: 1.6, color: '#8A8A8A', fontFamily: SANS }}
            >
              The secret exploit flows into the proof and never past it. Everything downstream is public and verifiable on-chain.
            </p>
          </Reveal>
        </div>

        {/* flow diagram */}
        <Reveal className="max-w-[1180px] mx-auto px-4 md:px-10 py-10 md:py-16">
          <FlowDiagram />
        </Reveal>
      </section>

      {/* ─── CTA ─── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #242424' }}>
        <CanvasDiagGrid />
        {/* subtle center darkening so text stays legible */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 75% at 50% 50%, rgba(10,10,10,.72) 0%, rgba(10,10,10,.18) 62%, transparent 100%)' }} />
        <Reveal className="relative text-center px-5 md:px-10 py-20 md:py-32">
          <h2 className="text-[32px] md:text-[58px]"
            style={{ fontFamily: SANS, fontWeight: 800, lineHeight: 1.05, color: '#FFFFFF', margin: 0, letterSpacing: '-.02em' }}
          >
            Prove the exploit.<br />Reveal nothing.
          </h2>
          <p className="text-[14px] md:text-[16px] max-w-[460px] mx-auto"
            style={{ lineHeight: 1.65, color: 'rgba(255,255,255,.48)', fontFamily: SANS, margin: '18px auto 36px' }}
          >
            ZK proof on your machine. Stellar escrow. Automatic payout when the contract verifies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <button onClick={() => go('hunt')}
              className="vbtn w-full sm:w-auto"
              style={{ background: '#EDEDED', color: '#0A0A0A', border: 'none', padding: '14px 36px', fontFamily: SANS, fontWeight: 600, fontSize: 15, borderRadius: 9999, cursor: 'pointer' }}
            >Explore bounties</button>
            <button onClick={() => go('create')}
              className="vbtn vbtn-ghost w-full sm:w-auto"
              style={{ background: 'transparent', color: '#EDEDED', border: '1px solid rgba(237,237,237,.32)', padding: '14px 36px', fontFamily: SANS, fontWeight: 500, fontSize: 15, borderRadius: 9999, cursor: 'pointer' }}
            >Open a bounty</button>
          </div>
        </Reveal>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid #1c1c1c', background: '#080808' }}>
        <Reveal className="max-w-[1240px] mx-auto px-5 md:px-12 py-12 md:py-16" y={12}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-24 items-start">

            {/* left: brand */}
            <div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, letterSpacing: '.34em', color: '#EDEDED', marginBottom: 14 }}>VEIL</div>
              <p style={{ fontFamily: SANS, fontSize: 13, color: '#5A5A5A', lineHeight: 1.65, maxWidth: 300, margin: 0 }}>
                Trustless proof-of-exploit on Stellar.<br />
                Zero-knowledge proofs. Automatic payout.
              </p>
            </div>

            {/* right: link columns */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-14">
              {/* Navigate */}
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: '#EDEDED', marginBottom: 18 }}>Navigate</div>
                {[
                  { label: 'Features',     fn: () => scrollTo('features') },
                  { label: 'How it works', fn: () => scrollTo('howitworks') },
                  { label: 'Bounties',     fn: () => go('hunt') },
                  { label: 'Create bounty',fn: () => go('create') },
                ].map(({ label, fn }) => (
                  <div key={label} onClick={fn} className="vlink w-fit"
                    style={{ fontFamily: SANS, fontSize: 13, color: '#5A5A5A', marginBottom: 12, cursor: 'pointer', lineHeight: 1 }}
                  >{label}</div>
                ))}
              </div>

              {/* Social */}
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: '#EDEDED', marginBottom: 18 }}>Social</div>
                {['GitHub', 'Twitter / X', 'Discord'].map(l => (
                  <div key={l} className="vlink w-fit" style={{ fontFamily: SANS, fontSize: 13, color: '#5A5A5A', marginBottom: 12, cursor: 'pointer', lineHeight: 1 }}>{l}</div>
                ))}
              </div>

              {/* Legal */}
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: '#EDEDED', marginBottom: 18 }}>Legal</div>
                {['MIT License', 'Open source'].map(l => (
                  <div key={l} className="vlink w-fit" style={{ fontFamily: SANS, fontSize: 13, color: '#5A5A5A', marginBottom: 12, cursor: 'pointer', lineHeight: 1 }}>{l}</div>
                ))}
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-12 pt-6"
            style={{ borderTop: '1px solid #1c1c1c' }}
          >
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#383838', letterSpacing: '.02em' }}>© 2025 Veil · Stellar Hackathon</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#383838', letterSpacing: '.02em' }}>RISC Zero · Soroban · ZK</div>
          </div>
        </Reveal>
      </footer>

    </div>
  )
}
