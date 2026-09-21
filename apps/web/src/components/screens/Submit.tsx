'use client'

import { Bounty, Screen } from '@/lib/data'

const MONO  = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS  = "var(--font-sans,'Inter',sans-serif)"

interface Props {
  bounty: Bounty
  fileLoaded: boolean
  fileName: string
  dragging: boolean
  go: (s: Screen) => void
  onPickFile: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void
  startVerify: () => void
}

export default function Submit({ bounty, fileLoaded, fileName, dragging, go, onPickFile, onDragOver, onDragLeave, onDrop, onPick, startVerify }: Props) {
  const btnBg   = fileLoaded ? '#14B88A' : '#1c1c1c'
  const btnClr  = fileLoaded ? '#06241B' : '#5A5A5A'
  const dropBorder = dragging ? '#14B88A' : '#333'
  const dropBg     = dragging ? 'rgba(20,184,138,.05)' : 'transparent'

  return (
    <div className="max-w-[880px] mx-auto px-5 md:px-10 pt-8 md:pt-10 pb-16 md:pb-20">
      <div onClick={() => go('hunt')} className="vlink inline-block"
        style={{ fontFamily: MONO, fontSize: 12, color: '#8A8A8A', cursor: 'pointer', marginBottom: 20 }}
      >← back to bounties</div>

      <div style={{ background: '#111111', border: '1px solid #242424' }}>
        {/* header */}
        <div className="flex items-start justify-between px-5 md:px-8 py-5 md:py-7"
          style={{ borderBottom: '1px solid #242424' }}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>Submit proof</div>
            <h1 className="text-[28px] md:text-[38px]"
              style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1, color: '#EDEDED', margin: 0 }}
            >{bounty.title}</h1>
          </div>
          <div className="text-right ml-4">
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Reward</div>
            <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 22, color: '#14B88A' }}>{bounty.reward}</div>
          </div>
        </div>

        {/* the challenge + how to claim */}
        <div className="px-5 md:px-8 py-5 md:py-7" style={{ borderBottom: '1px solid #242424' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>The challenge</div>
          <p style={{ fontFamily: SANS, fontSize: 14, color: '#CDCDCD', margin: '0 0 12px', lineHeight: 1.55 }}>{bounty.desc}</p>
          {bounty.victimFull && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#8A8A8A', marginBottom: 18 }}>
              victim contract:{' '}
              <a href={`https://stellar.expert/explorer/testnet/contract/${bounty.victimFull}`} target="_blank" rel="noreferrer" style={{ color: '#14B88A' }}>{bounty.victim} ↗</a>
            </div>
          )}

          <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>How to claim</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontFamily: SANS, fontSize: 13.5, color: '#BDBDBD', lineHeight: 1.7 }}>
            <li>Read the rule (guest) — it defines what counts as a valid exploit.</li>
            <li>Poke the victim contract above → find the secret input that breaks it.</li>
            <li>Generate the proof <b style={{ color: '#EDEDED' }}>on your own machine</b> (your secret never leaves):
              <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 12, color: '#8A8A8A' }}>
                • have toolchain → <a href="/api/guest" download style={{ color: '#14B88A' }}>download project</a> → extract → <code style={{ color: '#CDCDCD' }}>cargo run --release --bin host -- &lt;a&gt; &lt;b&gt;</code><br />
                • no toolchain → <a href="/api/prover" download style={{ color: '#14B88A' }}>download prover</a> (needs Docker)
              </div>
            </li>
            <li>It writes <code style={{ color: '#EDEDED' }}>proof.json</code> → drop it below → claim.</li>
          </ol>
        </div>

        {/* privacy diagram */}
        <div className="px-5 md:px-8 py-5 md:py-8" style={{ borderBottom: '1px solid #242424' }}>
          {/* desktop: 3-col | mobile: stacked */}
          <div className="hidden md:grid md:grid-cols-[1fr_56px_1fr] items-stretch">
            <div style={{ border: '1px solid rgba(20,184,138,.35)', background: 'rgba(20,184,138,.04)', padding: '22px 24px', borderRadius: 2 }}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: 14, color: '#14B88A' }}>⊘</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#14B88A', letterSpacing: '.12em' }}>YOUR SECRET INPUT</span>
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 24, color: '#EDEDED', letterSpacing: '.04em', marginBottom: 6 }}>a = •••&nbsp;&nbsp;&nbsp;b = •••</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A' }}>never leaves your machine</div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <div style={{ fontFamily: MONO, fontSize: 13, color: '#5A5A5A' }}>zk</div>
              <div style={{ fontFamily: MONO, fontSize: 18, color: '#8A8A8A' }}>→</div>
            </div>
            <div style={{ border: '1px solid #242424', background: '#161616', padding: '22px 24px', borderRadius: 2 }}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: 14, color: '#8A8A8A' }}>◳</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#8A8A8A', letterSpacing: '.12em' }}>RECEIPT (PUBLIC)</span>
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 19, color: '#EDEDED', marginBottom: 6 }}>journal + seal</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A' }}>this is what gets uploaded</div>
            </div>
          </div>

          {/* mobile: stacked */}
          <div className="flex flex-col gap-2 md:hidden">
            <div style={{ border: '1px solid rgba(20,184,138,.35)', background: 'rgba(20,184,138,.04)', padding: '18px', borderRadius: 2 }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: '#14B88A' }}>⊘</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#14B88A', letterSpacing: '.12em' }}>YOUR SECRET INPUT</span>
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 20, color: '#EDEDED', marginBottom: 5 }}>a = •••&nbsp;&nbsp;b = •••</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#8A8A8A' }}>never leaves your machine</div>
            </div>
            <div className="text-center py-1" style={{ fontFamily: MONO, fontSize: 14, color: '#8A8A8A' }}>↓ <span style={{ fontSize: 10, color: '#5A5A5A' }}>zk</span></div>
            <div style={{ border: '1px solid #242424', background: '#161616', padding: '18px', borderRadius: 2 }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: '#8A8A8A' }}>◳</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#8A8A8A', letterSpacing: '.12em' }}>RECEIPT (PUBLIC)</span>
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 16, color: '#EDEDED', marginBottom: 5 }}>journal + seal</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#8A8A8A' }}>this is what gets uploaded</div>
            </div>
          </div>
        </div>

        {/* dropzone */}
        <div className="px-5 md:px-8 py-5 md:py-8" style={{ borderBottom: '1px solid #242424' }}>
          {!fileLoaded ? (
            <div onClick={onPickFile} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              className="vinput text-center cursor-pointer py-8 md:py-10 px-5"
              style={{ border: `1px dashed ${dropBorder}`, background: dropBg, borderRadius: 2 }}
            >
              <div style={{ fontSize: 22, color: '#5A5A5A', marginBottom: 12 }}>⤓</div>
              <div style={{ fontFamily: MONO, fontSize: 14, color: '#EDEDED', marginBottom: 6 }}>
                drop <span style={{ color: '#14B88A' }}>proof.json</span> or click to browse
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A' }}>RISC Zero proof · journal + seal</div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 md:px-5 py-4"
              style={{ border: '1px solid rgba(20,184,138,.35)', background: 'rgba(20,184,138,.04)', borderRadius: 2 }}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 16, color: '#14B88A' }}>◳</span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: '#EDEDED' }}>{fileName}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A' }}>2.4 MB · loaded locally</div>
                </div>
              </div>
              <span onClick={onPickFile} style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A', cursor: 'pointer', textDecoration: 'underline' }}>replace</span>
            </div>
          )}
          <input id="veil-file" type="file" onChange={onPick} style={{ display: 'none' }} />
        </div>

        {/* checklist */}
        <div className="px-5 md:px-8 py-5 md:py-7" style={{ borderBottom: '1px solid #242424' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14 }}>The contract will check</div>
          <div className="flex flex-col gap-2 md:gap-3">
            {[
              ['proof valid against ', 'image_id'],
              ['journal binds to ', 'victim_id'],
              ['bounty not yet claimed', null],
            ].map(([prefix, code]) => (
              <div key={String(prefix)} className="flex items-center gap-2 md:gap-3"
                style={{ fontFamily: MONO, fontSize: 13, color: '#8A8A8A' }}
              >
                <span style={{ color: '#5A5A5A' }}>○</span>
                {prefix}
                {code && <span style={{ color: '#EDEDED' }}>{code}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* action */}
        <div className="px-5 md:px-8 py-5 md:py-7">
          <button onClick={startVerify} disabled={!fileLoaded}
            className={fileLoaded ? 'vbtn' : ''}
            style={{ width: '100%', background: btnBg, color: btnClr, border: 'none', padding: '16px', fontFamily: SANS, fontWeight: 600, fontSize: 15, borderRadius: 2, cursor: fileLoaded ? 'pointer' : 'not-allowed', opacity: fileLoaded ? 1 : 0.55 }}>
            Verify &amp; claim reward
          </button>
          <div className="text-center mt-4" style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A' }}>
            Proving runs locally on your machine. Your inputs are never transmitted.
          </div>
        </div>
      </div>
    </div>
  )
}
