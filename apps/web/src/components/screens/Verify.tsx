'use client'

import { Bounty } from '@/lib/data'
import { explorerTxUrl } from '@/lib/stellar'
import { shortAddr } from '@/lib/wallet'
import { RevealEncrypt } from '@/components/RevealBox'

const MONO  = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS  = "var(--font-sans,'Inter',sans-serif)"

interface Step {
  label: string; idx: string; glyph: string
  dotBorder: string; dotBg: string
  labelColor: string; tag: string; tagColor: string
}

interface Props {
  bounty: Bounty
  steps: Step[]
  verified: boolean
  balanceStr: string
  backToBounties: () => void
  hunterAddr?: string | null
  txHash?: string | null
}

export default function Verify({ bounty, steps, verified, balanceStr, backToBounties, hunterAddr, txHash }: Props) {
  return (
    <div className="max-w-[720px] mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-16 md:pb-20">
      {/* stepper */}
      <div className="p-5 md:p-8" style={{ background: '#111111', border: '1px solid #242424' }}>
        <div className="flex items-center justify-between mb-6 md:mb-7">
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase' }}>On-chain verification</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A' }}>{bounty.title}</div>
        </div>
        <div className="flex flex-col gap-0.5">
          {steps.map((st, i) => (
            <div key={st.idx} className="flex items-center gap-3 md:gap-4 py-4"
              style={{ borderBottom: i < steps.length - 1 ? '1px solid #1c1c1c' : 'none' }}
            >
              <span className="hidden md:inline" style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', width: 20 }}>{st.idx}</span>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${st.dotBorder}`, background: st.dotBg,
                color: '#06241B', fontSize: 11,
              }}>{st.glyph}</span>
              <span className="text-[12px] md:text-[13.5px]"
                style={{ fontFamily: MONO, color: st.labelColor, letterSpacing: '.01em' }}
              >{st.label}</span>
              <span className="ml-auto text-[9px] md:text-[10px]"
                style={{ fontFamily: MONO, letterSpacing: '.1em', textTransform: 'uppercase', color: st.tagColor }}
              >{st.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* success */}
      {verified && (
        <div className="mt-5 md:mt-6">
          <div style={{ background: '#111111', border: '1px solid rgba(20,184,138,.4)' }}>
            <div className="text-center px-5 md:px-8 py-8 md:py-10" style={{ borderBottom: '1px solid #242424' }}>
              <div className="flex items-center justify-center mx-auto mb-5 md:mb-6"
                style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(20,184,138,.4)', background: 'rgba(20,184,138,.08)' }}
              >
                <span style={{ fontSize: 24, color: '#14B88A' }}>✓</span>
              </div>
              <h2 className="text-[28px] md:text-[40px] mb-2 md:mb-3"
                style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.05, color: '#EDEDED', margin: 0 }}
              >Proof valid — reward released</h2>
              <p style={{ fontFamily: MONO, fontSize: 13, color: '#8A8A8A', margin: 0 }}>
                The contract verified your receipt and paid out automatically.
              </p>
            </div>

            <div className="px-5 md:px-8 py-5 md:py-7">
              {([
                ['Bounty', bounty.title, '#EDEDED'],
                ['Reward', bounty.reward, '#14B88A'],
                ['To',     hunterAddr ? shortAddr(hunterAddr) : 'GD7X…K2P9',  '#EDEDED'],
              ] as [string, string, string][]).map(([k, v, c]) => (
                <div key={k} className="flex justify-between py-3" style={{ borderBottom: '1px solid #1c1c1c' }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A' }}>{k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: c }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-3">
                <span style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A' }}>Tx</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: '#EDEDED' }}>
                  {txHash ? (
                    <>
                      {shortAddr(txHash)}{' '}
                      <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer"
                        style={{ color: '#14B88A', cursor: 'pointer' }}>view on explorer ↗</a>
                    </>
                  ) : (
                    <span style={{ color: '#5A5A5A' }}>demo — connect wallet for on-chain tx</span>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ borderTop: '1px solid #242424' }}>
              <div className="px-5 md:px-8 py-4 md:py-5" style={{ borderRight: '1px solid #242424' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Wallet balance</div>
                <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 18, color: '#EDEDED' }}>{balanceStr} XLM</div>
              </div>
              <div className="px-5 md:px-8 py-4 md:py-5">
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#5A5A5A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Bounty status</div>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', padding: '4px 9px', borderRadius: 2, border: '1px solid #242424', color: '#5A8A75' }}>CLAIMED</span>
              </div>
            </div>
          </div>

          {(bounty.stakeNum ?? 0) > 0 && (
            <div className="mt-4 md:mt-5 p-4 flex gap-3 items-start"
              style={{ border: '1px solid #4a3a25', background: '#15110b', borderRadius: 2 }}>
              <span style={{ fontSize: 14, marginTop: 1 }}>🔒</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#E0A26A', lineHeight: 1.55 }}>
                <b style={{ color: '#EDEDED' }}>{bounty.stakeNum!.toLocaleString('en-US')} XLM staked</b> — held by the contract.
                Reveal the exploit below (encrypt → send to creator) so the creator confirms and your stake is returned.
                Miss the deadline → stake forfeited to the creator.
              </span>
            </div>
          )}

          <div className="mt-4 md:mt-5"><RevealEncrypt creatorPubkey={bounty.creatorPubkey} /></div>

          <button onClick={backToBounties}
            className="vbtn vbtn-ghost mt-4 md:mt-5"
            style={{ background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '13px 24px', fontFamily: SANS, fontWeight: 500, fontSize: 14, borderRadius: 2, cursor: 'pointer' }}
          >← Back to bounties</button>
        </div>
      )}
    </div>
  )
}
