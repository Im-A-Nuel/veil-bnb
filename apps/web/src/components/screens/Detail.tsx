'use client'

import { useState } from 'react'
import { Bounty } from '@/lib/data'
import { shortAddr } from '@/lib/wallet'
import { parseReveal, type Reveal } from '@/lib/reveal'
import { RevealDecrypt, RevealEncrypt } from '@/components/RevealBox'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

interface Props {
  bounty: Bounty
  backToBounties: () => void
  walletAddr?: string | null
  onConfirmReveal?: () => void | Promise<void>
  onForfeit?: () => void | Promise<void>
  onReclaim?: (reveal: Reveal) => void | Promise<void>
}

export default function Detail({ bounty, backToBounties, walletAddr, onConfirmReveal, onForfeit, onReclaim }: Props) {
  const [revealText, setRevealText] = useState('')
  const [reclaimErr, setReclaimErr] = useState<string | null>(null)
  const claimed = bounty.status === 'claimed'
  const isCreator = !!walletAddr && !!bounty.creator && walletAddr === bounty.creator
  const isClaimer = !!walletAddr && !!bounty.claimer && walletAddr === bounty.claimer
  const settled = !!bounty.revealed || !!bounty.forfeited
  const hasStake = (bounty.stakeNum ?? 0) > 0
  const nowSec = Math.floor(Date.now() / 1000)
  const deadline = (bounty.claimTime ?? 0) + (bounty.revealWindow ?? 0)
  const deadlinePassed = claimed && !!bounty.revealWindow && nowSec >= deadline
  const escapeOpenAt = (bounty.escapeWindow ?? 0) >= (bounty.revealWindow ?? 0)
    ? (bounty.claimTime ?? 0)
    : deadline - (bounty.escapeWindow ?? 0)
  const escapeOpen = claimed && !!bounty.revealWindow && nowSec >= escapeOpenAt

  const reclaim = () => {
    setReclaimErr(null)
    try {
      const r = parseReveal(revealText)
      onReclaim?.(r)
    } catch (e) {
      setReclaimErr(e instanceof Error ? e.message : 'invalid reveal.json')
    }
  }

  // status reveal/stake utk ditampilkan
  let revealStatus = '— (not claimed)'
  let revealColor = '#5A5A5A'
  if (claimed) {
    if (bounty.revealed) { revealStatus = 'REVEALED · stake returned to hunter'; revealColor = '#4ADE9E' }
    else if (bounty.forfeited) { revealStatus = 'FORFEITED · stake to creator'; revealColor = '#E0A26A' }
    else if (deadlinePassed) { revealStatus = 'AWAITING · deadline passed'; revealColor = '#E06A6A' }
    else { revealStatus = 'AWAITING REVEAL'; revealColor = '#14B88A' }
  }

  const rows: [string, string, string][] = [
    ['Status', claimed ? 'CLAIMED' : 'OPEN', claimed ? '#5A8A75' : '#14B88A'],
    ['Reward', bounty.reward, '#14B88A'],
    ['Victim contract', bounty.victim, '#EDEDED'],
    ['Created by', bounty.creator ? shortAddr(bounty.creator) : '—', '#EDEDED'],
    ['Claimed by', bounty.claimer ? shortAddr(bounty.claimer) : '— (not yet claimed)', claimed ? '#EDEDED' : '#5A5A5A'],
  ]
  if (hasStake) {
    rows.push(['Hunter stake', `${bounty.stakeNum!.toLocaleString('en-US')} XLM`, '#EDEDED'])
    rows.push(['Reveal / stake', revealStatus, revealColor])
  }

  return (
    <div className="max-w-[720px] mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-16 md:pb-20">
      <div style={{ background: '#111111', border: '1px solid #242424' }}>
        <div className="px-5 md:px-8 py-7 md:py-9" style={{ borderBottom: '1px solid #242424' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Bounty #{bounty.id}
          </div>
          <h2 className="text-[28px] md:text-[40px]" style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.05, color: '#EDEDED', margin: 0 }}>
            {bounty.title}
          </h2>
          <p style={{ fontFamily: SANS, fontSize: 14, color: '#8A8A8A', margin: '10px 0 0' }}>{bounty.desc}</p>
        </div>

        <div className="px-5 md:px-8 py-5 md:py-7">
          {rows.map(([k, v, c]) => (
            <div key={k} className="flex justify-between py-3 gap-4" style={{ borderBottom: '1px solid #1c1c1c' }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A' }}>{k}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: c, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
          <p style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', margin: '14px 0 0', lineHeight: 1.6 }}>
            {claimed
              ? 'The hunter proved the exploit in zero-knowledge — the secret input was never revealed. The contract verified the proof on-chain and released the reward automatically.'
              : 'Bounty is still open. A hunter can submit a valid proof to claim the reward.'}
          </p>
        </div>
      </div>

      {/* Banner: masih ada stake yang belum di-reveal/unlock */}
      {claimed && hasStake && !settled && (
        <div className="mt-4 md:mt-5 p-4 flex gap-3 items-start"
          style={{ border: '1px solid #4a3a25', background: '#15110b', borderRadius: 2 }}>
          <span style={{ fontSize: 14, marginTop: 1 }}>🔒</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#E0A26A', lineHeight: 1.55 }}>
            <b style={{ color: '#EDEDED' }}>{bounty.stakeNum!.toLocaleString('en-US')} XLM still staked</b> — held by the contract, not yet returned.
            The hunter reveals the exploit → the creator confirms → stake returns to the hunter.
            Miss the deadline → stake forfeited to the creator.
          </span>
        </div>
      )}

      {/* Banner: stake sudah diselesaikan */}
      {claimed && hasStake && settled && (
        <div className="mt-4 md:mt-5 p-4 flex gap-3 items-start"
          style={{ border: bounty.revealed ? '1px solid #1f3a2e' : '1px solid #4a3a25', background: bounty.revealed ? '#0c1712' : '#15110b', borderRadius: 2 }}>
          <span style={{ fontSize: 14, marginTop: 1 }}>{bounty.revealed ? '✅' : '⚠️'}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: bounty.revealed ? '#4ADE9E' : '#E0A26A', lineHeight: 1.55 }}>
            {bounty.revealed
              ? `Reveal confirmed — ${bounty.stakeNum!.toLocaleString('en-US')} XLM stake returned to the hunter.`
              : `Deadline passed without reveal — ${bounty.stakeNum!.toLocaleString('en-US')} XLM stake forfeited to the creator.`}
          </span>
        </div>
      )}

      {/* Creator: dekripsi + verifikasi sidik jari (selalu bisa baca ulang).
          Tombol Confirm/Forfeit cuma muncul kalau stake belum diselesaikan. */}
      {claimed && hasStake && isCreator && (
        <div className="mt-4 md:mt-5">
          <RevealDecrypt
            expectedFingerprint={bounty.fingerprintHex}
            onConfirm={settled ? undefined : onConfirmReveal}
          />
          {!settled && deadlinePassed && (
            <button onClick={onForfeit} className="vbtn mt-3"
              style={{ width: '100%', background: 'transparent', color: '#E0A26A', border: '1px solid #4a3a25', padding: '12px 20px', fontFamily: SANS, fontWeight: 600, fontSize: 13, borderRadius: 2, cursor: 'pointer' }}>
              Deadline passed — forfeit stake to creator →
            </button>
          )}
        </div>
      )}

      {/* Hunter (claimer): encrypt reveal ke creator (jalur normal, kapan aja) */}
      {claimed && hasStake && isClaimer && !settled && (
        <div className="mt-4 md:mt-5"><RevealEncrypt creatorPubkey={bounty.creatorPubkey} /></div>
      )}

      {/* Hunter (claimer): escape hatch — reveal on-chain kalau creator ngeyel */}
      {claimed && hasStake && isClaimer && !settled && (
        <div className="mt-4 md:mt-5 p-4" style={{ border: '1px solid #242424', background: '#0d0d0d', borderRadius: 2 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#14B88A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            ⛓ Reclaim stake (escape hatch)
          </div>
          {escapeOpen ? (
            <>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: '#8A8A8A', lineHeight: 1.55, marginBottom: 10 }}>
                Creator hasn&apos;t confirmed and the escape window is open. Reveal on-chain to reclaim your stake — note this makes the exploit <b style={{ color: '#E0A26A' }}>public</b>. Prefer the private reveal if the creator will confirm.
              </div>
              <textarea rows={3} value={revealText} onChange={e => setRevealText(e.target.value)} placeholder='paste reveal.json — {"a":"1000","b":"1000","salt":"…"}'
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #242424', color: '#EDEDED', fontFamily: MONO, fontSize: 11.5, padding: '9px 11px', borderRadius: 2, resize: 'vertical' }} />
              <label style={{ fontFamily: SANS, fontSize: 10.5, color: '#14B88A', cursor: 'pointer', display: 'inline-block', marginTop: 6 }}>
                load reveal.json
                <input type="file" accept=".json,application/json" hidden onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return
                  const rd = new FileReader(); rd.onload = () => setRevealText(String(rd.result || '')); rd.readAsText(f)
                }} />
              </label>
              <button onClick={reclaim} className="vbtn" style={{ display: 'block', marginTop: 10, background: '#14B88A', color: '#06241B', border: 'none', padding: '9px 16px', fontFamily: SANS, fontWeight: 600, fontSize: 13, borderRadius: 2, cursor: 'pointer' }}>
                Reveal on-chain & reclaim stake →
              </button>
              {reclaimErr && <div style={{ fontFamily: SANS, fontSize: 10.5, color: '#E06A6A', marginTop: 6 }}>✗ {reclaimErr}</div>}
            </>
          ) : (
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: '#8A8A8A', lineHeight: 1.55 }}>
              Send your encrypted reveal to the creator and wait for them to confirm. If they don&apos;t, the on-chain escape hatch opens closer to the deadline.
            </div>
          )}
        </div>
      )}

      {/* Non-creator non-claimer melihat bounty ter-claim */}
      {claimed && hasStake && !isCreator && !isClaimer && (
        <div className="mt-4 md:mt-5 p-4" style={{ border: '1px solid #242424', background: '#0d0d0d', borderRadius: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#8A8A8A', lineHeight: 1.6 }}>
            🔒 Only the creator can decrypt &amp; verify the revealed exploit (needs their private key).
          </span>
        </div>
      )}

      <button onClick={backToBounties} className="vbtn vbtn-ghost mt-4 md:mt-5"
        style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '13px 24px', fontFamily: SANS, fontWeight: 500, fontSize: 14, borderRadius: 2, cursor: 'pointer' }}>
        ← Back to bounties
      </button>
    </div>
  )
}
