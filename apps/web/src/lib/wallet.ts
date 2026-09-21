// Wallet layer built on @creit.tech/stellar-wallets-kit (v2).
// The kit detects + signs for many wallets; we drive it with our OWN dark modal
// (the kit's bundled modal is light-themed and clashes with the Veil UI).
// Loaded via dynamic import so none of its browser-only code runs during SSR.

import { getNetwork, requestAccess, setAllowed, signTransaction } from '@stellar/freighter-api'

export type WalletInfo = {
  address: string
  network: string
  networkPassphrase: string
}

export type WalletOption = {
  id: string
  name: string
  icon: string
  isAvailable: boolean
  url: string
}

const PASSPHRASE_TESTNET = 'Test SDF Network ; September 2015'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let KitRef: any = null
let inited = false
let activeWalletSource: 'kit' | 'freighter' | null = null

async function getKit() {
  const mod = await import('@creit.tech/stellar-wallets-kit')
  const { StellarWalletsKit, Networks } = mod
  if (!inited) {
    const [fr, xb, al, ra, lo, ha] = await Promise.all([
      import('@creit.tech/stellar-wallets-kit/modules/freighter'),
      import('@creit.tech/stellar-wallets-kit/modules/xbull'),
      import('@creit.tech/stellar-wallets-kit/modules/albedo'),
      import('@creit.tech/stellar-wallets-kit/modules/rabet'),
      import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
      import('@creit.tech/stellar-wallets-kit/modules/hana'),
    ])
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: [
        new fr.FreighterModule(),
        new xb.xBullModule(),
        new al.AlbedoModule(),
        new ra.RabetModule(),
        new lo.LobstrModule(),
        new ha.HanaModule(),
      ],
    })
    inited = true
  }
  KitRef = StellarWalletsKit
  return StellarWalletsKit
}

/** Supported wallets with detected-availability + icons, for the custom modal. */
export async function listWallets(): Promise<WalletOption[]> {
  const kit = await getKit()
  const list = await kit.refreshSupportedWallets()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (list as any[]).map((w) => ({
    id: w.id,
    name: w.name,
    icon: w.icon,
    isAvailable: !!w.isAvailable,
    url: w.url,
  }))
}

/** Activate the chosen wallet and fetch its address (prompts the wallet). */
export async function connectWith(id: string): Promise<WalletInfo> {
  const kit = await getKit()
  try {
    kit.setWallet(id)
    const { address } = await kit.fetchAddress()
    if (!address) throw new Error('No address returned from wallet.')
    activeWalletSource = 'kit'
    return { address, network: 'TESTNET', networkPassphrase: PASSPHRASE_TESTNET }
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message
    throw new Error(msg || 'Connection cancelled.')
  }
}

/**
 * No silent auto-reconnect: re-fetching on load can pop an unexpected wallet
 * prompt. Users reconnect once per session via the modal.
 */
export async function getConnected(): Promise<WalletInfo | null> {
  return null
}

/** Prompt the user to connect with Freighter. */
export async function connect(): Promise<WalletInfo> {
  await setAllowed()
  const access = await requestAccess()
  if (access.error || !access.publicKey) {
    throw new Error(typeof access.error === 'string' ? access.error : 'Connection rejected in Freighter.')
  }
  const net = await getNetwork()
  activeWalletSource = 'freighter'
  return {
    address: access.publicKey,
    network: net.network || 'TESTNET',
    networkPassphrase: net.networkPassphrase || PASSPHRASE_TESTNET,
  }
}

/** Sign a transaction XDR with the active wallet; returns signed XDR. */
export async function sign(xdr: string, networkPassphrase: string): Promise<string> {
  if (activeWalletSource === 'freighter') {
    const res = await signTransaction(xdr, { networkPassphrase })
    if (res.error || !res.signedTxXdr) {
      throw new Error(typeof res.error === 'string' ? res.error : 'Signing rejected in Freighter.')
    }
    return res.signedTxXdr
  }

  const kit = await getKit()
  const res = await kit.signTransaction(xdr, { networkPassphrase })
  if (!res?.signedTxXdr) throw new Error('Signing rejected in wallet.')
  return res.signedTxXdr
}

/** Clear the kit's active session. */
export async function disconnectWallet(): Promise<void> {
  try { if (KitRef) await KitRef.disconnect() } catch { /* noop */ }
  activeWalletSource = null
}

/** GD7X…K2P9 style truncation for display. */
export function shortAddr(a: string): string {
  return a.length > 9 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a
}
