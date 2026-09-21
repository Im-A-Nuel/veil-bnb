export type Screen = 'landing' | 'features' | 'howitworks' | 'hunt' | 'submit' | 'verify' | 'create' | 'detail'
export type Filter = 'all' | 'open' | 'claimed'
export type Token = 'BNB' | 'USDT'

export interface Bounty {
  id: string
  status: 'open' | 'claimed' | 'refunded'
  reward: string
  rewardNum: number
  tokenSymbol?: Token
  title: string
  desc: string
  victim: string
  victimFull?: string    // alamat victim lengkap (buat link explorer)
  creator?: string       // alamat pembuat bounty (on-chain)
  claimer?: string | null // alamat yang berhasil klaim (on-chain), null kalau belum
  // --- Level 1.5 + stake (on-chain) ---
  creatorPubkey?: string // X25519 pubkey base64 — hunter enkripsi reveal ke sini
  stakeNum?: number      // stake dalam token bounty yang dikunci saat claim
  revealWindow?: number  // detik utk reveal setelah claim
  escapeWindow?: number  // detik sebelum deadline saat escape hatch on-chain kebuka
  fingerprintHex?: string // sidik jari sha256(a,b,salt) dari journal pemenang
  claimTime?: number     // unix ts saat claim
  revealed?: boolean     // creator sudah konfirmasi reveal valid → stake balik
  forfeited?: boolean    // deadline lewat → stake hangus ke creator
}

export interface AppState {
  screen: Screen
  filter: Filter
  search: string
  activeId: string
  fileLoaded: boolean
  fileName: string
  dragging: boolean
  verifyStep: number
  verified: boolean
  balance: number
  claimed: Record<string, boolean>
  form: { addr: string; imageId: string; title: string; description: string; reward: string; token: Token; stake: string; revealWindow: string; escapeWindow: string; creatorPubkey: string }
  toast: string | null
}

export const BOUNTIES: Bounty[] = [
  { id: 'factoring', status: 'open', reward: '0.5 BNB', rewardNum: 0.5, tokenSymbol: 'BNB', title: 'Demo · Factoring guard', desc: 'Local preview: prove knowledge of non-trivial factors without revealing them.', victim: '0x1111…1111' },
  { id: 'overflow', status: 'open', reward: '250 USDT', rewardNum: 250, tokenSymbol: 'USDT', title: 'Demo · Overflow check', desc: 'Local preview: prove an arithmetic edge case while keeping the triggering input private.', victim: '0x2222…2222' },
]

export const STEPS = [
  'Submitting receipt to contract',
  'Verifying proof on-chain (RISC Zero)',
  'Checking victim binding',
  'Releasing reward',
]

export const INITIAL_STATE: AppState = {
  screen: 'landing',
  filter: 'all',
  search: '',
  activeId: 'factoring',
  fileLoaded: false,
  fileName: '',
  dragging: false,
  verifyStep: 0,
  verified: false,
  balance: 0,
  claimed: {},
  form: {
    addr: '',
    imageId: '',
    title: '',
    description: '',
    reward: '',
    token: 'BNB',
    stake: '',
    revealWindow: '3600',  // detik; default 1 jam
    escapeWindow: '1800',  // detik; escape hatch kebuka 30 menit sebelum deadline
    creatorPubkey: '',
  },
  toast: null,
}
