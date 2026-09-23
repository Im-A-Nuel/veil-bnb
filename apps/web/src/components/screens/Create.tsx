'use client'

import { useState } from 'react'
import { Screen, Token } from '@/lib/data'
import { RevealKeyGen } from '@/components/RevealBox'

const MONO  = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS  = "var(--font-sans,'Inter',sans-serif)"


interface Props {
  form: { addr: string; vkHash: string; title: string; description: string; reward: string; token: Token; stake: string; revealWindow: string; escapeWindow: string; creatorPubkey: string }
  go: (s: Screen) => void
  onAddrChange: (v: string) => void
  onImageChange: (v: string) => void
  onTitleChange: (v: string) => void
  onDescChange: (v: string) => void
  onRewardChange: (v: string) => void
  onToken: (t: Token) => void
  onStakeChange: (v: string) => void
  onRevealWindowChange: (v: string) => void
  onEscapeWindowChange: (v: string) => void
  onPubkey: (v: string) => void
  onSubmit: () => void
  busy?: boolean
}

export default function Create({ form, go: _go, onAddrChange, onImageChange, onTitleChange, onDescChange, onRewardChange, onToken, onStakeChange, onRevealWindowChange, onEscapeWindowChange, onPubkey, onSubmit, busy }: Props) {
  const tokenBg  = (t: Token) => form.token === t ? '#1c1c1c' : 'transparent'
  const tokenClr = (t: Token) => form.token === t ? '#EDEDED' : '#8A8A8A'

  const [aiDesc, setAiDesc] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState<string | null>(null)

  const onGenerate = async () => {
    if (!aiDesc.trim()) { setGenMsg('✗ describe the contract first'); return }
    setGenerating(true)
    setGenMsg('AI is drafting the circuit description… (a few seconds)')
    try {
      const base = process.env.NEXT_PUBLIC_AGENT_URL?.replace(/\/$/, '')
      const r = await fetch(base ? `${base}/generate-guest` : '/api/generate-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: form.addr, sourceOrDescription: aiDesc }),
      })
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error || 'generate failed')
      setGenMsg(`Draft ready for review. ${j.riskSummary || ''}`)
    } catch (e) {
      setGenMsg('✗ ' + (e instanceof Error ? e.message : 'generate failed'))
    } finally {
      setGenerating(false)
    }
  }

  const inputCls = "vinput w-full"
  const inputSty: React.CSSProperties = {
    width: '100%', background: '#0A0A0A', border: '1px solid #242424',
    color: '#EDEDED', fontFamily: MONO, fontSize: 13, padding: '13px 14px', borderRadius: 2,
  }

  return (
    <div className="max-w-[600px] mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-16 md:pb-20">
      <div className="p-6 md:p-10" style={{ background: '#111111', border: '1px solid #242424' }}>
        <h1 className="text-[34px] md:text-[42px] mb-3"
          style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1, color: '#EDEDED', margin: 0 }}
        >Open a bounty</h1>
        <p className="text-[13px] md:text-[14px] mb-7 md:mb-9"
          style={{ lineHeight: 1.55, color: '#8A8A8A', fontFamily: SANS, margin: 0 }}
        >
          Lock a reward against a contract. Hunters prove the exploit privately; the contract pays out automatically.
        </p>

        <div className="mb-5 md:mb-6">
          <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
            Victim contract address
          </label>
          <input className={inputCls} value={form.addr} onChange={e => onAddrChange(e.target.value)} placeholder="0x…" style={inputSty} />
          <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>the deployed contract being tested</div>
        </div>

        <div className="mb-5 md:mb-6">
          <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
            Title
          </label>
          <input className={inputCls} value={form.title} onChange={e => onTitleChange(e.target.value)} placeholder="e.g. Factoring guard" style={inputSty} />
          <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>short name shown on the bounty card</div>
        </div>

        <div className="mb-5 md:mb-6">
          <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
            Description
          </label>
          <textarea className={inputCls} value={form.description} onChange={e => onDescChange(e.target.value)} rows={3} placeholder="what the bug is, what a hunter must prove…" style={{ ...inputSty, resize: 'vertical' }} />
          <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>stored on-chain — hunters read this to understand the challenge</div>
        </div>

        {/* AI generate circuit description */}
        <div className="mb-5 md:mb-6" style={{ border: '1px solid #1f2f29', background: '#0c1411', borderRadius: 2, padding: 14 }}>
          <div style={{ fontFamily: SANS, fontSize: 12, color: '#14B88A', marginBottom: 6 }}>Draft circuit description with the agent</div>
          <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={3}
            placeholder="Paste the Solidity source or describe the exact invariant the proof must check."
            style={{ ...inputSty, fontSize: 12, lineHeight: 1.5, resize: 'vertical' }} />
          <div className="flex items-center gap-3 mt-2">
            <button type="button" onClick={onGenerate} disabled={generating}
              style={{ background: 'transparent', color: '#14B88A', border: '1px solid #14B88A', padding: '8px 14px', fontFamily: SANS, fontWeight: 600, fontSize: 12, borderRadius: 2, cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? 'Drafting…' : 'Draft circuit'}
            </button>
            {genMsg && <span style={{ fontFamily: MONO, fontSize: 11, color: genMsg.startsWith('✗') ? '#E06A6A' : '#8A8A8A' }}>{genMsg}</span>}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 10, color: '#5A5A5A', marginTop: 6 }}>The agent writes a draft. Review before building and generating the vkHash.</div>
        </div>

        <div className="mb-5 md:mb-6">
          <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
            Verification Key Hash (vkHash)
          </label>
          <input className={inputCls} value={form.vkHash} onChange={e => onImageChange(e.target.value)} placeholder="0x… (64 hex)" style={inputSty} />
          <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>sha256 of the circuit&apos;s verification_key.json — binds hunter to the correct proving circuit</div>
        </div>

        <div className="mb-7">
          <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
            Reward
          </label>
          <div className="flex gap-2 md:gap-3">
            <input className="vinput" value={form.reward} onChange={e => onRewardChange(e.target.value)} placeholder="500"
              style={{ ...inputSty, flex: 1, width: 'auto' }} />
            <div className="flex" style={{ border: '1px solid #242424', borderRadius: 2, overflow: 'hidden' }}>
              {(['BNB', 'USDT'] as Token[]).map((t, i) => (
                <button type="button" key={t} onClick={() => onToken(t)}
                  className="vlink text-[11px] md:text-[12px] px-3 md:px-4 py-3 cursor-pointer"
                  style={{
                    fontFamily: MONO, background: tokenBg(t), color: tokenClr(t),
                    borderLeft: i > 0 ? '1px solid #242424' : 'none',
                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  }}
                >{t}</button>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>locked in escrow until a valid proof is submitted</div>
        </div>

        {/* Stake + reveal deadline (Level 1.5 economic layer) */}
        <div className="flex gap-3 mb-7">
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
              Hunter stake ({form.token})
            </label>
            <input className="vinput w-full" value={form.stake} onChange={e => onStakeChange(e.target.value)} placeholder="100" style={inputSty} />
            <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>locked on claim · returned when the hunter reveals the real exploit</div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
              Reveal deadline (sec)
            </label>
            <input className="vinput w-full" value={form.revealWindow} onChange={e => onRevealWindowChange(e.target.value)} placeholder="3600" style={inputSty} />
            <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>after claim · miss it → stake forfeited to you</div>
          </div>
        </div>

        <div className="mb-7">
          <label style={{ display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 13, color: '#EDEDED', marginBottom: 8 }}>
            Escape window (sec)
          </label>
          <input className="vinput w-full" value={form.escapeWindow} onChange={e => onEscapeWindowChange(e.target.value)} placeholder="1800" style={inputSty} />
          <div style={{ fontFamily: SANS, fontSize: 11, color: '#5A5A5A', marginTop: 7 }}>
            anti-griefing: this many seconds before the deadline, if you haven&apos;t confirmed, the hunter may reveal on-chain to reclaim their stake
          </div>
        </div>

        <div className="mb-7"><RevealKeyGen onChange={onPubkey} /></div>

        <div className="flex gap-3 items-start mb-7 p-4"
          style={{ border: '1px solid #242424', background: '#161616', borderRadius: 2 }}
        >
          <span style={{ fontSize: 13, color: '#8A8A8A', marginTop: 1 }}>ⓘ</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#8A8A8A', lineHeight: 1.55 }}>
            Native BNB opens the bounty in one transaction. BEP-20 rewards require an approval followed by the bounty transaction.
          </span>
        </div>

        <button onClick={onSubmit} disabled={busy} className="vbtn"
          style={{ width: '100%', background: busy ? '#5A5A5A' : '#EDEDED', color: '#0A0A0A', border: 'none', padding: 16, fontFamily: SANS, fontWeight: 600, fontSize: 15, borderRadius: 2, cursor: busy ? 'not-allowed' : 'pointer' }}
        >{busy ? 'Opening…' : 'Open bounty & lock reward'}</button>
      </div>
    </div>
  )
}
