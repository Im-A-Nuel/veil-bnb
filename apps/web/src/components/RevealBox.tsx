'use client'

import { useState } from 'react'
import { generateKeypair, encryptForCreator, verifyReveal, type Reveal } from '@/lib/reveal'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

const box: React.CSSProperties = { border: '1px solid #242424', background: '#0d0d0d', borderRadius: 2, padding: 14 }
const label: React.CSSProperties = { display: 'block', fontFamily: SANS, fontWeight: 500, fontSize: 12, color: '#EDEDED', marginBottom: 6 }
const field: React.CSSProperties = { width: '100%', background: '#0A0A0A', border: '1px solid #242424', color: '#EDEDED', fontFamily: MONO, fontSize: 11.5, padding: '9px 11px', borderRadius: 2, resize: 'vertical' }
const btn: React.CSSProperties = { background: '#14B88A', color: '#06241B', border: 'none', padding: '8px 14px', fontFamily: SANS, fontWeight: 600, fontSize: 12, borderRadius: 2, cursor: 'pointer' }
const heading: React.CSSProperties = { fontFamily: MONO, fontSize: 10, color: '#14B88A', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }
const hint: React.CSSProperties = { fontFamily: SANS, fontSize: 10.5, color: '#5A5A5A', marginTop: 6 }

const copy = (t: string) => { try { navigator.clipboard.writeText(t) } catch {} }

/** Creator: generate reveal keypair. onChange dipanggil dgn public key (buat form bounty). */
export function RevealKeyGen({ onChange }: { onChange?: (publicKey: string) => void }) {
  const [kp, setKp] = useState<{ publicKey: string; secretKey: string } | null>(null)
  const gen = () => {
    const k = generateKeypair()
    setKp(k)
    onChange?.(k.publicKey)
  }
  return (
    <div style={box}>
      <div style={heading}>🔑 Reveal key (so the hunter can send you the exploit privately)</div>
      <button style={btn} onClick={gen}>{kp ? 'Regenerate' : 'Generate key'}</button>
      {kp && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <span style={label}>Public key <span style={{ color: '#5A5A5A' }}>· auto-attached to the bounty</span></span>
            <textarea readOnly rows={2} value={kp.publicKey} style={field} onFocus={e => e.target.select()} />
            <span onClick={() => copy(kp.publicKey)} style={{ ...hint, color: '#14B88A', cursor: 'pointer' }}>copy public key</span>
          </div>
          <div>
            <span style={label}>Private key <span style={{ color: '#E06A6A' }}>· SAVE SECRETLY — needed to read exploits & confirm reveals</span></span>
            <textarea readOnly rows={2} value={kp.secretKey} style={field} onFocus={e => e.target.select()} />
            <span onClick={() => copy(kp.secretKey)} style={{ ...hint, color: '#14B88A', cursor: 'pointer' }}>copy private key</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Hunter: encrypt reveal.json ({a,b,salt}) to creator's public key (pre-filled from bounty). */
export function RevealEncrypt({ creatorPubkey }: { creatorPubkey?: string }) {
  const [msg, setMsg] = useState('')
  const [pub, setPub] = useState(creatorPubkey ?? '')
  const [out, setOut] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const run = () => {
    setErr(null); setOut(null)
    try { setOut(encryptForCreator(msg, pub)) }
    catch (e) { setErr(e instanceof Error ? e.message : 'encrypt failed') }
  }
  const loadReveal = (file: File) => {
    const r = new FileReader()
    r.onload = () => setMsg(String(r.result || ''))
    r.readAsText(file)
  }
  return (
    <div style={box}>
      <div style={heading}>🔒 Reveal your exploit to the creator (encrypted)</div>
      <span style={label}>Reveal payload <span style={{ color: '#5A5A5A' }}>· paste / load reveal.json (a, b, salt)</span></span>
      <textarea rows={3} value={msg} onChange={e => setMsg(e.target.value)} placeholder='{"a":"1000","b":"1000","salt":"…"}' style={field} />
      <label style={{ ...hint, color: '#14B88A', cursor: 'pointer', display: 'inline-block' }}>
        load reveal.json
        <input type="file" accept=".json,application/json" hidden onChange={e => e.target.files?.[0] && loadReveal(e.target.files[0])} />
      </label>
      <span style={{ ...label, marginTop: 10 }}>Creator&apos;s public key {creatorPubkey && <span style={{ color: '#14B88A' }}>· auto-filled from bounty</span>}</span>
      <textarea rows={2} value={pub} onChange={e => setPub(e.target.value)} placeholder="creator public key" style={field} />
      <button style={{ ...btn, marginTop: 10 }} onClick={run}>Encrypt →</button>
      {err && <div style={{ ...hint, color: '#E06A6A' }}>✗ {err}</div>}
      {out && (
        <div className="mt-3">
          <span style={label}>Ciphertext <span style={{ color: '#5A5A5A' }}>· only the creator can read this</span></span>
          <textarea readOnly rows={3} value={out} style={field} onFocus={e => e.target.select()} />
          <span onClick={() => copy(out)} style={{ ...hint, color: '#14B88A', cursor: 'pointer' }}>copy ciphertext → send to creator</span>
        </div>
      )}
    </div>
  )
}

/**
 * Creator: decrypt reveal + VERIFIKASI sidik jari (Level 1.5).
 * Cocok dgn fingerprint di proof → tampil ✅ + tombol "Confirm & release stake".
 */
export function RevealDecrypt({
  expectedFingerprint,
  onConfirm,
}: {
  expectedFingerprint?: string
  onConfirm?: () => void | Promise<void>
}) {
  const [ct, setCt] = useState('')
  const [sec, setSec] = useState('')
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const run = async () => {
    setErr(null); setOk(null); setReveal(null)
    try {
      if (!expectedFingerprint) throw new Error('bounty ini belum diklaim (tidak ada sidik jari)')
      const res = await verifyReveal(ct, sec, expectedFingerprint)
      setReveal(res.reveal)
      setOk(res.ok)
    } catch (e) { setErr(e instanceof Error ? e.message : 'decrypt failed') }
  }
  const confirm = async () => {
    if (!onConfirm) return
    setConfirming(true)
    try { await onConfirm() } finally { setConfirming(false) }
  }

  return (
    <div style={box}>
      <div style={heading}>🔓 Read & verify revealed exploit</div>
      <span style={label}>Ciphertext (from hunter)</span>
      <textarea rows={3} value={ct} onChange={e => setCt(e.target.value)} placeholder="paste ciphertext" style={field} />
      <span style={{ ...label, marginTop: 10 }}>Your private key</span>
      <textarea rows={2} value={sec} onChange={e => setSec(e.target.value)} placeholder="paste your private key" style={field} />
      <button style={{ ...btn, marginTop: 10 }} onClick={run}>Decrypt & verify →</button>
      {err && <div style={{ ...hint, color: '#E06A6A' }}>✗ {err}</div>}

      {reveal && (
        <div className="mt-3">
          <span style={label}>Exploit <span style={{ color: '#5A5A5A' }}>· decrypted with your key</span></span>
          <textarea readOnly rows={3} value={`a = ${reveal.a}\nb = ${reveal.b}\nsalt = ${reveal.salt}`} style={{ ...field, color: '#4ADE9E' }} />
          {ok ? (
            <div style={{ ...hint, color: '#4ADE9E', fontSize: 12 }}>
              ✅ Verified — fingerprint matches the proof. This is the REAL exploit that won the bounty.
            </div>
          ) : (
            <div style={{ ...hint, color: '#E06A6A', fontSize: 12 }}>
              ❌ Mismatch — this reveal does NOT match the proof&apos;s fingerprint. Fake / wrong reveal.
            </div>
          )}
          {ok && onConfirm && (
            <button style={{ ...btn, marginTop: 10 }} disabled={confirming} onClick={confirm}>
              {confirming ? 'Confirming…' : 'Confirm & release stake →'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
