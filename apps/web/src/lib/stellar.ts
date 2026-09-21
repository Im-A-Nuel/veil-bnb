// Stellar / Soroban plumbing untuk REGISTRY (Pola B).
// Contract IDs dari NEXT_PUBLIC_*. Kalau VERIFIER_ID kosong → CONTRACTS_CONFIGURED
// false dan UI jatuh ke mode demo lokal.
import {
  rpc,
  Networks,
  Contract,
  Address,
  Account,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Horizon,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk'
import type { Bounty } from './data'

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org'
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org'
export const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET

// VERIFIER_ID = alamat kontrak REGISTRY (bounty-verifier Pola B).
export const VERIFIER_ID = process.env.NEXT_PUBLIC_VERIFIER_ID || ''
export const TOKEN_ID = process.env.NEXT_PUBLIC_TOKEN_ID || ''

export const CONTRACTS_CONFIGURED = Boolean(VERIFIER_ID)

// Bounty id yang dipakai halaman Hunter buat demo claim (default 0).
export const DEMO_BOUNTY_ID = Number(process.env.NEXT_PUBLIC_DEMO_BOUNTY_ID || '0')

const server = () => new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') })

/** hex string → Uint8Array (untuk image_id / journal_digest / seal). */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

/** Native XLM balance untuk sebuah akun (0 kalau belum ada / unfunded). */
export async function getXlmBalance(address: string): Promise<number> {
  try {
    const horizon = new Horizon.Server(HORIZON_URL)
    const acct = await horizon.loadAccount(address)
    const native = acct.balances.find((b) => b.asset_type === 'native')
    return native ? Math.floor(parseFloat(native.balance)) : 0
  } catch {
    return 0
  }
}

type SignFn = (xdr: string, networkPassphrase: string) => Promise<string>

/** build → simulate → sign → submit invokasi kontrak (write). */
async function invoke(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  caller: string,
  sign: SignFn,
): Promise<{ result: unknown; hash: string }> {
  const srv = server()
  const source = await srv.getAccount(caller)
  const built = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(60)
    .build()

  const prepared = await srv.prepareTransaction(built)
  const signedXdr = await sign(prepared.toXDR(), NETWORK_PASSPHRASE)
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)

  const sent = await srv.sendTransaction(signed)
  if (sent.status === 'ERROR') {
    throw new Error('Transaction submission failed: ' + JSON.stringify(sent.errorResult))
  }
  let got = await srv.getTransaction(sent.hash)
  for (let i = 0; i < 30 && got.status === 'NOT_FOUND'; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    got = await srv.getTransaction(sent.hash)
  }
  if (got.status !== 'SUCCESS') {
    throw new Error('Transaction did not succeed: ' + got.status)
  }
  const result = got.returnValue ? scValToNative(got.returnValue) : null
  return { result, hash: sent.hash }
}

/** Read-only: simulasi tanpa tanda tangan (pakai akun acak sebagai source). */
async function simulateRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<unknown> {
  const srv = server()
  const source = new Account(Keypair.random().publicKey(), '0')
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(60)
    .build()
  const sim = await srv.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error)
  const retval = sim.result?.retval
  return retval ? scValToNative(retval) : null
}

// ===================== REGISTRY interface =====================

export interface OnChainBounty {
  creator: string
  token: string
  amount: bigint
  victim_id: string
  image_id: Uint8Array
  creator_pubkey: Uint8Array
  title?: string
  description?: string
  stake_amount: bigint
  reveal_window: bigint
  escape_window: bigint
  claimed: boolean
  claimer?: string | null
  fingerprint: Uint8Array
  claim_time: bigint
  revealed: boolean
  forfeited: boolean
}

/** Uint8Array → base64 (buat creator_pubkey yg dipakai reveal.ts). */
function bytesToB64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s)
}

/** Jumlah bounty di registry. */
export async function getCount(): Promise<number> {
  if (!CONTRACTS_CONFIGURED) return 0
  return (await simulateRead(VERIFIER_ID, 'count', [])) as number
}

/** Baca satu bounty by id. */
export async function getBounty(id: number): Promise<OnChainBounty> {
  return (await simulateRead(VERIFIER_ID, 'get_bounty', [
    nativeToScVal(id, { type: 'u32' }),
  ])) as OnChainBounty
}

/** base64 → Uint8Array (creator pubkey dari form). */
function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s.trim())
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * create_bounty(creator, token, victim_id, image_id, creator_pubkey, title,
 *   description, stake_amount, reveal_window, expiry) → bounty_id
 */
export async function createBounty(
  creator: string,
  victimId: string,
  imageIdHex: string,
  creatorPubkeyB64: string,
  title: string,
  description: string,
  stakeXlm: number,
  revealWindowSecs: number,
  escapeWindowSecs: number,
  sign: SignFn,
  expiry = 0,
): Promise<number> {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  const pub = b64ToBytes(creatorPubkeyB64)
  if (pub.length !== 32) throw new Error('Public key creator tidak valid (harus 32 byte / base64).')
  const stakeI128 = BigInt(Math.round(stakeXlm * 1e7))
  const { result } = await invoke(
    VERIFIER_ID,
    'create_bounty',
    [
      new Address(creator).toScVal(),
      new Address(TOKEN_ID).toScVal(),
      new Address(victimId).toScVal(),
      nativeToScVal(hexToBytes(imageIdHex), { type: 'bytes' }),
      nativeToScVal(pub, { type: 'bytes' }),
      nativeToScVal(title, { type: 'string' }),
      nativeToScVal(description, { type: 'string' }),
      nativeToScVal(stakeI128, { type: 'i128' }),
      nativeToScVal(BigInt(revealWindowSecs), { type: 'u64' }),
      nativeToScVal(BigInt(escapeWindowSecs), { type: 'u64' }),
      nativeToScVal(BigInt(expiry), { type: 'u64' }),
    ],
    creator,
    sign,
  )
  return result as number
}

/** prove_reveal(bounty_id, a, b, salt) — escape hatch: hunter reveal on-chain → stake balik. */
export async function proveReveal(
  bountyId: number,
  caller: string,
  a: string,
  b: string,
  saltHex: string,
  sign: SignFn,
) {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  return invoke(
    VERIFIER_ID,
    'prove_reveal',
    [
      nativeToScVal(bountyId, { type: 'u32' }),
      nativeToScVal(BigInt(a), { type: 'u128' }),
      nativeToScVal(BigInt(b), { type: 'u128' }),
      nativeToScVal(hexToBytes(saltHex), { type: 'bytes' }),
    ],
    caller,
    sign,
  )
}

/** confirm_reveal(bounty_id) — creator konfirmasi reveal valid → stake balik ke hunter. */
export async function confirmReveal(bountyId: number, creator: string, sign: SignFn) {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  return invoke(VERIFIER_ID, 'confirm_reveal', [nativeToScVal(bountyId, { type: 'u32' })], creator, sign)
}

/** forfeit_stake(bounty_id) — deadline reveal lewat → stake hangus ke creator. */
export async function forfeitStake(bountyId: number, caller: string, sign: SignFn) {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  return invoke(VERIFIER_ID, 'forfeit_stake', [nativeToScVal(bountyId, { type: 'u32' })], caller, sign)
}

/** withdraw(bounty_id) — creator tarik balik hadiah setelah bounty expired. */
export async function withdraw(bountyId: number, creator: string, sign: SignFn) {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  return invoke(VERIFIER_ID, 'withdraw', [nativeToScVal(bountyId, { type: 'u32' })], creator, sign)
}

/** fund(bounty_id, from, amount) — kunci hadiah ke laci. */
export async function fundBounty(bountyId: number, from: string, amount: bigint, sign: SignFn) {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  return invoke(
    VERIFIER_ID,
    'fund',
    [nativeToScVal(bountyId, { type: 'u32' }), new Address(from).toScVal(), nativeToScVal(amount, { type: 'i128' })],
    from,
    sign,
  )
}

function toHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
const shortC = (a: string) => (a.length > 9 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a)

// Judul/desk ramah per image_id (on-chain nggak nyimpan teks). Fallback generik.
const FACTORING = {
  title: 'Factoring guard',
  desc: 'A vault assumes target=1,000,000 has no non-trivial factors. Prove you know two factors (a×b=target, a≠1, b≠1, a≠target, b≠target) — without revealing them.',
}
const TITLES: Record<string, { title: string; desc: string }> = {
  '2faaf29ce60a8d2087e5f7e5337b491d619f10dfcfd619376c4d0c377a78b8da': FACTORING,
  d122d691978b4034df7875d42e86c21b3db212d00b83625496df0020e0814fdd: FACTORING,
}

/** Baca SEMUA bounty dari registry → bentuk siap-tampil (direct fetch). */
export async function listBounties(): Promise<Bounty[]> {
  const n = await getCount()
  const out: Bounty[] = []
  for (let i = 0; i < n; i++) {
    const b = await getBounty(i)
    const imgHex = toHex(new Uint8Array(b.image_id as Uint8Array))
    const meta = TITLES[imgHex] ?? {
      title: `ZK Bounty #${i}`,
      desc: 'Submit a valid RISC Zero proof to claim the reward.',
    }
    const rewardNum = Number(b.amount) / 1e7
    const fpHex = b.fingerprint ? toHex(new Uint8Array(b.fingerprint as Uint8Array)) : ''
    const isZeroFp = !fpHex || /^0+$/.test(fpHex)
    out.push({
      id: String(i),
      status: b.claimed ? 'claimed' : 'open',
      reward: `${rewardNum.toLocaleString('en-US')} XLM`,
      rewardNum,
      // deskripsi/judul dari ON-CHAIN (fallback ke peta kalau kosong)
      title: b.title || meta.title,
      desc: b.description || meta.desc,
      victim: shortC(b.victim_id),
      victimFull: b.victim_id,
      creator: b.creator,
      claimer: b.claimer ?? null,
      // --- Level 1.5 + stake ---
      creatorPubkey: b.creator_pubkey ? bytesToB64(new Uint8Array(b.creator_pubkey as Uint8Array)) : undefined,
      stakeNum: b.stake_amount != null ? Number(b.stake_amount) / 1e7 : undefined,
      revealWindow: b.reveal_window != null ? Number(b.reveal_window) : undefined,
      escapeWindow: b.escape_window != null ? Number(b.escape_window) : undefined,
      fingerprintHex: isZeroFp ? undefined : fpHex,
      claimTime: b.claim_time != null ? Number(b.claim_time) : undefined,
      revealed: b.revealed ?? false,
      forfeited: b.forfeited ?? false,
    })
  }
  return out
}

/** claim(bounty_id, hunter, journal, seal) — verifikasi proof on-chain → bayar. Return tx hash. */
export async function claim(
  bountyId: number,
  hunter: string,
  journal: Uint8Array,
  seal: Uint8Array,
  sign: SignFn,
): Promise<string> {
  if (!CONTRACTS_CONFIGURED) throw new Error('Registry belum dikonfigurasi (NEXT_PUBLIC_VERIFIER_ID).')
  const { hash } = await invoke(
    VERIFIER_ID,
    'claim',
    [
      nativeToScVal(bountyId, { type: 'u32' }),
      new Address(hunter).toScVal(),
      nativeToScVal(journal, { type: 'bytes' }),
      nativeToScVal(seal, { type: 'bytes' }),
    ],
    hunter,
    sign,
  )
  return hash
}

/** URL explorer untuk sebuah tx hash di stellar.expert. */
export function explorerTxUrl(hash: string): string {
  const net = NETWORK_PASSPHRASE.includes('Public') ? 'public' : 'testnet'
  return `https://stellar.expert/explorer/${net}/tx/${hash}`
}
