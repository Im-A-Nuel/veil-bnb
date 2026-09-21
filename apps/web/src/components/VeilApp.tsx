'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AppState, Screen, Filter, Token, Bounty, BOUNTIES, STEPS, INITIAL_STATE } from '@/lib/data'
import Landing from './screens/Landing'
import Features from './screens/Features'
import HowItWorks from './screens/HowItWorks'
import Hunt from './screens/Hunt'
import Submit from './screens/Submit'
import Verify from './screens/Verify'
import Create from './screens/Create'
import Detail from './screens/Detail'
import AppNav from './AppNav'
import Toast from './Toast'
import IntroOverlay from './IntroOverlay'
import WalletModal from './WalletModal'
import { useWallet } from '@/hooks/useWallet'
import { shortAddr } from '@/lib/wallet'
import { CONTRACTS_CONFIGURED, claim, listBounties, createBounty, fundBounty, confirmReveal, forfeitStake, proveReveal, hexToBytes } from '@/lib/stellar'
import type { Reveal } from '@/lib/reveal'

export default function VeilApp() {
  const [s, setS] = useState<AppState>(INITIAL_STATE)
  const [intro, setIntro] = useState(true)
  const [showTop, setShowTop] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const proofRef = useRef<{ journal: Uint8Array; seal: Uint8Array } | null>(null)
  const wallet = useWallet()
  const connected = wallet.status === 'connected'
  const [chainBounties, setChainBounties] = useState<Bounty[] | null>(null)
  const [claimTx, setClaimTx] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Direct-fetch daftar bounty dari registry (kalau kontrak dikonfigurasi).
  const loadBounties = useCallback(async () => {
    if (!CONTRACTS_CONFIGURED) return
    try { setChainBounties(await listBounties()) } catch { /* biarkan null → fallback mock */ }
  }, [])
  useEffect(() => { loadBounties() }, [loadBounties])

  const addTimer = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t) }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => () => clearTimers(), [])

  // Esc → step back one level
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setS(prev => {
        if (prev.screen === 'submit' || prev.screen === 'verify') return { ...prev, screen: 'hunt' }
        if (prev.screen === 'landing') return prev
        return { ...prev, screen: 'landing' }
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // scroll-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (screen: Screen) => {
    setS(prev => ({ ...prev, screen }))
    try { window.scrollTo(0, 0) } catch (_) {}
  }

  const showToast = (msg: string, ms = 3200) => {
    setS(prev => ({ ...prev, toast: msg }))
    addTimer(setTimeout(() => setS(prev => ({ ...prev, toast: null })), ms))
  }

  const connectWallet = () => setPickerOpen(true)

  const chooseWallet = async (id: string) => {
    setConnectingId(id)
    try {
      const w = await wallet.connectWith(id)
      setPickerOpen(false)
      showToast('Wallet connected · ' + shortAddr(w.address))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not connect', 4200)
    } finally {
      setConnectingId(null)
    }
  }

  const openSubmit = (id: string) => {
    clearTimers()
    setClaimTx(null)
    setS(prev => ({ ...prev, screen: 'submit', activeId: id, fileLoaded: false, fileName: '', verifyStep: 0, verified: false }))
    try { window.scrollTo(0, 0) } catch (_) {}
  }

  const openDetail = (id: string) => {
    clearTimers()
    setS(prev => ({ ...prev, screen: 'detail', activeId: id }))
    try { window.scrollTo(0, 0) } catch (_) {}
  }

  const loadFile = (name: string) => {
    setS(prev => ({ ...prev, fileLoaded: true, fileName: name || 'proof.json', dragging: false }))
  }

  // capture proof.json { journal, seal } (hex) → bytes, untuk claim on-chain
  const captureFile = async (file?: File) => {
    if (!file) { proofRef.current = null; loadFile('proof.json'); return }
    try {
      const txt = await file.text()
      const j = JSON.parse(txt)
      proofRef.current = { journal: hexToBytes(j.journal), seal: hexToBytes(j.seal) }
    } catch {
      proofRef.current = null
    }
    loadFile(file.name)
  }

  const startVerify = async () => {
    if (!s.fileLoaded) return
    if (!proofRef.current) { showToast('Upload a valid proof.json first', 4000); return }
    // belum connect → langsung munculin popup Freighter, lalu lanjut.
    let addr = wallet.address
    if (!addr) {
      try { addr = (await wallet.connect()).address; showToast('Wallet connected · ' + shortAddr(addr)) }
      catch (e) { showToast(e instanceof Error ? e.message : 'Connect cancelled'); return }
    }
    clearTimers()
    const activeId = s.activeId

    setS(prev => ({ ...prev, screen: 'verify', verifyStep: 1, verified: false }))
    try { window.scrollTo(0, 0) } catch (_) {}
    try {
      // bounty_id = id asli on-chain; kirim journal + seal dari proof.json.
      const { journal, seal } = proofRef.current!
      const hash = await claim(Number(activeId), addr, journal, seal, wallet.sign)
      setClaimTx(hash)
      setS(st => ({ ...st, verifyStep: STEPS.length, verified: true, claimed: { ...st.claimed, [activeId]: true } }))
      wallet.refreshBalance()
      loadBounties()
      showToast('Proof valid · reward released on-chain', 4200)
    } catch (e) {
      setS(st => ({ ...st, verifyStep: 0, screen: 'submit' }))
      showToast(e instanceof Error ? e.message : 'Claim failed on-chain', 5000)
    }
  }

  const backToBounties = () => {
    clearTimers()
    setS(prev => ({ ...prev, screen: 'hunt', verifyStep: 0, verified: false }))
    try { window.scrollTo(0, 0) } catch (_) {}
  }

  const submitCreate = async () => {
    const f = s.form
    if (!f.addr || !f.imageId || !f.reward || !f.description) {
      showToast('Fill all fields (contract, ImageID, description, reward)'); return
    }
    if (!f.creatorPubkey) {
      showToast('Generate a reveal key first (so hunters can send you the exploit)', 4500); return
    }
    // belum connect → langsung munculin popup Freighter, lalu lanjut.
    let addr = wallet.address
    if (!addr) {
      try { addr = (await wallet.connect()).address; showToast('Wallet connected · ' + shortAddr(addr)) }
      catch (e) { showToast(e instanceof Error ? e.message : 'Connect cancelled'); return }
    }
    setBusy(true)
    try {
      showToast('Opening bounty… approve 2 signatures in Freighter', 8000)
      const stakeXlm = Number(f.stake) || 0
      const revealWindow = Number(f.revealWindow) || 0
      const escapeWindow = Number(f.escapeWindow) || 0
      const id = await createBounty(
        addr, f.addr, f.imageId, f.creatorPubkey,
        f.title || 'ZK Bounty', f.description,
        stakeXlm, revealWindow, escapeWindow, wallet.sign,
      )
      const amount = BigInt(Math.round(Number(f.reward) * 1e7))
      await fundBounty(id, addr, amount, wallet.sign)
      await loadBounties()
      wallet.refreshBalance()
      showToast(`Bounty #${id} opened — ${f.reward} XLM locked`, 4200)
      go('hunt')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Open bounty failed', 5000)
    } finally {
      setBusy(false)
    }
  }

  // Creator konfirmasi reveal valid → stake balik ke hunter.
  const onConfirmReveal = async (bountyId: string) => {
    let addr = wallet.address
    if (!addr) {
      try { addr = (await wallet.connect()).address } catch { showToast('Connect wallet first'); return }
    }
    try {
      await confirmReveal(Number(bountyId), addr, wallet.sign)
      await loadBounties()
      showToast('Reveal confirmed — stake released to hunter', 4200)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Confirm failed', 5000)
    }
  }

  // Deadline reveal lewat → stake hangus ke creator.
  const onForfeit = async (bountyId: string) => {
    let addr = wallet.address
    if (!addr) {
      try { addr = (await wallet.connect()).address } catch { showToast('Connect wallet first'); return }
    }
    try {
      await forfeitStake(Number(bountyId), addr, wallet.sign)
      await loadBounties()
      showToast('Deadline passed — stake forfeited to creator', 4200)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Forfeit failed', 5000)
    }
  }

  // Escape hatch: hunter reveal on-chain (publik) → stake balik (kalau creator ngeyel).
  const onReclaimStake = async (bountyId: string, reveal: Reveal) => {
    let addr = wallet.address
    if (!addr) {
      try { addr = (await wallet.connect()).address } catch { showToast('Connect wallet first'); return }
    }
    try {
      await proveReveal(Number(bountyId), addr, reveal.a, reveal.b, reveal.salt, wallet.sign)
      await loadBounties()
      showToast('Revealed on-chain — stake reclaimed', 4200)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Reclaim failed', 5000)
    }
  }

  // Derived — pakai bounty on-chain kalau ada, kalau tidak fallback ke mock.
  const baseBounties = (CONTRACTS_CONFIGURED && chainBounties) ? chainBounties : BOUNTIES
  const allBounties = baseBounties.map(b => ({
    ...b,
    isOpen:    b.status === 'open' && !s.claimed[b.id],
    isClaimed: b.status === 'claimed' || !!s.claimed[b.id],
  }))

  let filtered = allBounties
  if (s.filter === 'open')    filtered = allBounties.filter(b => b.isOpen)
  if (s.filter === 'claimed') filtered = allBounties.filter(b => b.isClaimed)
  if (s.search.trim()) {
    const q = s.search.trim().toLowerCase()
    filtered = filtered.filter(b => b.title.toLowerCase().includes(q) || b.victim.toLowerCase().includes(q))
  }

  const openCount  = allBounties.filter(b => b.isOpen).length
  const totalPool  = allBounties.filter(b => b.isOpen).reduce((a, b) => a + b.rewardNum, 0).toLocaleString('en-US')
  const activeBounty = allBounties.find(b => b.id === s.activeId) ?? allBounties[0]

  const steps = STEPS.map((label, i) => {
    const done   = s.verifyStep > i
    const active = s.verifyStep === i && !s.verified
    return {
      label,
      idx: String(i + 1).padStart(2, '0'),
      glyph: done ? '✓' : '',
      dotBorder:  done ? 'rgba(20,184,138,.5)' : (active ? '#14B88A' : '#242424'),
      dotBg:      done ? '#14B88A' : (active ? 'rgba(20,184,138,.15)' : 'transparent'),
      labelColor: done || active ? '#EDEDED' : '#5A5A5A',
      tag:        done ? 'done' : (active ? 'verifying' : 'pending'),
      tagColor:   done ? '#4ADE9E' : (active ? '#14B88A' : '#5A5A5A'),
    }
  })

  const isApp      = ['hunt', 'submit', 'verify', 'create', 'detail'].includes(s.screen)
  const huntActive = ['hunt', 'submit', 'verify'].includes(s.screen)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#EDEDED', position: 'relative' }}>
      <div key={s.screen} className="screen-enter">
      {s.screen === 'landing'    && <Landing go={go} connectWallet={connectWallet} connected={connected} address={wallet.address} />}
      {s.screen === 'features'   && <Features go={go} connectWallet={connectWallet} />}
      {s.screen === 'howitworks' && <HowItWorks go={go} connectWallet={connectWallet} />}

      {isApp && (
        <>
          <AppNav
            go={go}
            huntActive={huntActive}
            createActive={s.screen === 'create'}
            connected={connected}
            address={wallet.address}
            connecting={wallet.status === 'connecting'}
            onConnect={connectWallet}
            onDisconnect={() => { wallet.disconnect(); showToast('Wallet disconnected') }}
            onSwitch={async () => {
              try { const w = await wallet.connect(); showToast('Account · ' + shortAddr(w.address)) }
              catch (e) { showToast(e instanceof Error ? e.message : 'Switch account cancelled') }
            }}
            balanceStr={(connected ? wallet.balance : s.balance).toLocaleString('en-US')}
          />

          {s.screen === 'hunt' && (
            <Hunt
              bounties={filtered}
              openCount={openCount}
              totalPool={totalPool}
              filter={s.filter}
              search={s.search}
              onFilter={(f: Filter) => setS(prev => ({ ...prev, filter: f }))}
              onSearch={(q: string) => setS(prev => ({ ...prev, search: q }))}
              onSubmit={openSubmit}
              onDetail={openDetail}
            />
          )}

          {s.screen === 'submit' && (
            <Submit
              bounty={activeBounty}
              fileLoaded={s.fileLoaded}
              fileName={s.fileName}
              dragging={s.dragging}
              go={go}
              onPickFile={() => (document.getElementById('veil-file') as HTMLInputElement | null)?.click()}
              onDragOver={(e) => { e.preventDefault(); if (!s.dragging) setS(prev => ({ ...prev, dragging: true })) }}
              onDragLeave={(e) => { e.preventDefault(); setS(prev => ({ ...prev, dragging: false })) }}
              onDrop={(e) => { e.preventDefault(); captureFile(e.dataTransfer?.files?.[0]) }}
              onPick={(e) => captureFile((e.target as HTMLInputElement).files?.[0] ?? undefined)}
              startVerify={startVerify}
            />
          )}

          {s.screen === 'verify' && (
            <Verify
              bounty={activeBounty}
              steps={steps}
              verified={s.verified}
              balanceStr={(connected ? wallet.balance : s.balance).toLocaleString('en-US')}
              backToBounties={backToBounties}
              hunterAddr={wallet.address}
              txHash={claimTx}
            />
          )}

          {s.screen === 'detail' && (
            <Detail
              bounty={activeBounty}
              backToBounties={backToBounties}
              walletAddr={wallet.address}
              onConfirmReveal={() => onConfirmReveal(activeBounty.id)}
              onForfeit={() => onForfeit(activeBounty.id)}
              onReclaim={(reveal) => onReclaimStake(activeBounty.id, reveal)}
            />
          )}

          {s.screen === 'create' && (
            <Create
              form={s.form}
              go={go}
              onAddrChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, addr: v } }))}
              onImageChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, imageId: v } }))}
              onTitleChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, title: v } }))}
              onDescChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, description: v } }))}
              onRewardChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, reward: v } }))}
              onToken={(t: Token) => setS(prev => ({ ...prev, form: { ...prev.form, token: t } }))}
              onStakeChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, stake: v } }))}
              onRevealWindowChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, revealWindow: v } }))}
              onEscapeWindowChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, escapeWindow: v } }))}
              onPubkey={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, creatorPubkey: v } }))}
              onSubmit={submitCreate}
              busy={busy}
            />
          )}
        </>
      )}
      </div>

      {s.toast && <Toast message={s.toast} />}

      {showTop && !intro && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="vbtn"
          aria-label="Scroll to top"
          style={{
            position: 'fixed', right: 22, bottom: 22, zIndex: 40,
            width: 42, height: 42, borderRadius: '50%',
            background: '#161616', color: '#EDEDED',
            border: '1px solid #2e2e2e', cursor: 'pointer',
            fontSize: 16, lineHeight: 1,
            boxShadow: '0 8px 24px -10px rgba(0,0,0,.7)',
          }}
        >↑</button>
      )}

      <WalletModal
        open={pickerOpen}
        connectingId={connectingId}
        onClose={() => setPickerOpen(false)}
        onChoose={chooseWallet}
      />

      {intro && <IntroOverlay onDone={() => setIntro(false)} />}
    </div>
  )
}
