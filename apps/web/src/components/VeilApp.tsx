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
import Toast, { type ToastKind } from './Toast'
import IntroOverlay from './IntroOverlay'
import WalletModal from './WalletModal'
import { useWallet } from '@/hooks/useWallet'
import { shortAddr } from '@/lib/wallet'
import { CONTRACTS_CONFIGURED, claim, listBounties, createBounty, confirmReveal, forfeitStake, proveReveal, type Groth16Proof } from '@/lib/chain'
import { friendlyError } from '@/lib/errors'
import { validateCreateForm, parseProofFile, checkProofBinding } from '@/lib/validate'
import type { Reveal } from '@/lib/reveal'

export default function VeilApp() {
  const [s, setS] = useState<AppState>(INITIAL_STATE)
  const [intro, setIntro] = useState(true)
  const [showTop, setShowTop] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const proofRef = useRef<Groth16Proof | null>(null)
  const wallet = useWallet()
  const connected = wallet.status === 'connected'
  const [chainBounties, setChainBounties] = useState<Bounty[] | null>(null)
  const [chainLoading, setChainLoading] = useState(CONTRACTS_CONFIGURED)
  const [chainError, setChainError] = useState<string | null>(null)
  const [claimTx, setClaimTx] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Direct-fetch daftar bounty dari registry (kalau kontrak dikonfigurasi).
  const loadBounties = useCallback(async () => {
    if (!CONTRACTS_CONFIGURED) return
    setChainLoading(true)
    setChainError(null)
    try {
      setChainBounties(await listBounties())
    } catch (error) {
      setChainBounties([])
      setChainError(friendlyError(error, 'Could not read the registry. Check your connection and retry.'))
    } finally {
      setChainLoading(false)
    }
  }, [])
  useEffect(() => { loadBounties() }, [loadBounties])

  const addTimer = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t) }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => () => {
    clearTimers()
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

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

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = null
    setToast(null)
  }, [])

  const showToast = (msg: string, kind: ToastKind = 'info', ms?: number) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, kind })
    toastTimer.current = setTimeout(() => setToast(null), ms ?? (kind === 'error' ? 6000 : 3500))
  }
  const showError = (e: unknown, fallback: string) => showToast(friendlyError(e, fallback), 'error')

  const connectWallet = () => setPickerOpen(true)

  // Uses the connected account, or asks the wallet for one. Returns null if the user cancels.
  const requireAccount = async (): Promise<`0x${string}` | null> => {
    if (wallet.address) return wallet.address
    try {
      const w = await wallet.connect()
      showToast('Wallet connected · ' + shortAddr(w.address), 'success')
      return w.address
    } catch (e) {
      showError(e, 'Wallet connection cancelled.')
      return null
    }
  }

  const chooseWallet = async (id: string) => {
    setConnectingId(id)
    try {
      const w = await wallet.connectWith(id)
      setPickerOpen(false)
      showToast('Wallet connected · ' + shortAddr(w.address), 'success')
    } catch (e) {
      showError(e, 'Could not connect the wallet.')
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

  // capture proof.json { pi_a, pi_b, pi_c, publicSignals } (Groth16) → untuk claim on-chain
  const captureFile = async (file?: File) => {
    setS(prev => ({ ...prev, dragging: false }))
    if (!file) return
    try {
      proofRef.current = await parseProofFile(file)
      loadFile(file.name)
    } catch (e) {
      proofRef.current = null
      setS(prev => ({ ...prev, fileLoaded: false, fileName: '' }))
      showError(e, 'Could not read proof.json.')
    }
  }

  const startVerify = async () => {
    if (!s.fileLoaded) return
    const proof = proofRef.current
    if (!proof) { showToast('Upload a valid proof.json first.', 'error'); return }
    const target = allBounties.find(b => b.id === s.activeId)
    const bindingError = checkProofBinding(proof, s.activeId, target?.victimFull)
    if (bindingError) { showToast(bindingError, 'error'); return }

    const addr = await requireAccount()
    if (!addr) return
    clearTimers()
    const activeId = s.activeId

    setS(prev => ({ ...prev, screen: 'verify', verifyStep: 1, verified: false }))
    try { window.scrollTo(0, 0) } catch (_) {}
    try {
      const hash = await claim(Number(activeId), addr, proof)
      setClaimTx(hash)
      setS(st => ({ ...st, verifyStep: STEPS.length, verified: true, claimed: { ...st.claimed, [activeId]: true } }))
      wallet.refreshBalance()
      loadBounties()
      showToast('Proof valid · reward released on-chain', 'success')
    } catch (e) {
      setS(st => ({ ...st, verifyStep: 0, screen: 'submit' }))
      showError(e, 'Claim failed on-chain.')
    }
  }

  const backToBounties = () => {
    clearTimers()
    setS(prev => ({ ...prev, screen: 'hunt', verifyStep: 0, verified: false }))
    try { window.scrollTo(0, 0) } catch (_) {}
  }

  const submitCreate = async () => {
    if (busy) return
    const f = s.form
    const invalid = validateCreateForm(f)
    if (invalid) { showToast(invalid, 'error'); return }

    const addr = await requireAccount()
    if (!addr) return
    setBusy(true)
    try {
      showToast(f.token === 'USDT' ? 'Approve USDT, then confirm the bounty transaction.' : 'Confirm the bounty transaction in your wallet.', 'info', 15000)
      const hasStake = Number(f.stake || '0') > 0
      const { bountyId } = await createBounty({
        account: addr,
        victim: f.addr.trim(),
        vkHash: f.vkHash.trim(),
        creatorPubkey: f.creatorPubkey,
        title: f.title.trim(),
        description: f.description.trim(),
        reward: f.reward.trim(),
        stake: (f.stake || '0').trim(),
        token: f.token,
        revealWindow: hasStake ? Number(f.revealWindow) : 0,
        escapeWindow: hasStake ? Number(f.escapeWindow) : 0,
      })
      await loadBounties()
      wallet.refreshBalance()
      showToast(`Bounty #${bountyId} opened · ${f.reward.trim()} ${f.token} locked`, 'success')
      go('hunt')
    } catch (e) {
      showError(e, 'Opening the bounty failed.')
    } finally {
      setBusy(false)
    }
  }

  // Shared runner for single-transaction bounty actions.
  const runBountyAction = async (action: (addr: `0x${string}`) => Promise<unknown>, success: string, fallback: string) => {
    const addr = await requireAccount()
    if (!addr) return
    try {
      await action(addr)
      await loadBounties()
      wallet.refreshBalance()
      showToast(success, 'success')
    } catch (e) {
      showError(e, fallback)
    }
  }

  // Creator konfirmasi reveal valid → stake balik ke hunter.
  const onConfirmReveal = (bountyId: string) =>
    runBountyAction(addr => confirmReveal(Number(bountyId), addr), 'Reveal confirmed · stake released to hunter', 'Confirming the reveal failed.')

  // Deadline reveal lewat → stake hangus ke creator.
  const onForfeit = (bountyId: string) =>
    runBountyAction(addr => forfeitStake(Number(bountyId), addr), 'Deadline passed · stake forfeited to creator', 'Forfeiting the stake failed.')

  // Escape hatch: hunter reveal on-chain (publik) → stake balik (kalau creator ngeyel).
  const onReclaimStake = (bountyId: string, reveal: Reveal) =>
    runBountyAction(addr => proveReveal(Number(bountyId), addr, reveal), 'Revealed on-chain · stake reclaimed', 'Reclaiming the stake failed.')

  // Demo data is used only until a registry address is configured.
  const baseBounties = CONTRACTS_CONFIGURED ? (chainBounties ?? []) : BOUNTIES
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

  const balanceStr = (connected ? wallet.balance : s.balance).toLocaleString('en-US', { maximumFractionDigits: 4 })

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
            onDisconnect={() => { wallet.disconnect(); showToast('Wallet disconnected', 'info') }}
            onSwitch={() => setPickerOpen(true)}
            balanceStr={balanceStr}
          />

          {s.screen === 'hunt' && (
            <Hunt
              bounties={filtered}
              openCount={openCount}
              filter={s.filter}
              search={s.search}
              onFilter={(f: Filter) => setS(prev => ({ ...prev, filter: f }))}
              onSearch={(q: string) => setS(prev => ({ ...prev, search: q }))}
              onSubmit={openSubmit}
              onDetail={openDetail}
              loading={chainLoading}
              error={chainError}
              onRetry={loadBounties}
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
              onPick={(e) => {
                const input = e.target as HTMLInputElement
                captureFile(input.files?.[0] ?? undefined)
                input.value = ''
              }}
              startVerify={startVerify}
            />
          )}

          {s.screen === 'verify' && (
            <Verify
              bounty={activeBounty}
              steps={steps}
              verified={s.verified}
              balanceStr={balanceStr}
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
              onImageChange={(v: string) => setS(prev => ({ ...prev, form: { ...prev.form, vkHash: v } }))}
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

      {toast && <Toast message={toast.msg} kind={toast.kind} onClose={dismissToast} />}

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
