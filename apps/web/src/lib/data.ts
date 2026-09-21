export type Screen = 'landing' | 'features' | 'howitworks' | 'hunt' | 'submit' | 'verify' | 'create' | 'detail'
export type Filter = 'all' | 'open' | 'claimed'
export type Token = 'XLM' | 'USDC'

export interface Bounty {
  id: string
  status: 'open' | 'claimed'
  reward: string
  rewardNum: number
  title: string
  desc: string
  victim: string
  victimFull?: string    // alamat victim lengkap (buat link explorer)
  creator?: string       // alamat pembuat bounty (on-chain)
  claimer?: string | null // alamat yang berhasil klaim (on-chain), null kalau belum
  // --- Level 1.5 + stake (on-chain) ---
  creatorPubkey?: string // X25519 pubkey base64 — hunter enkripsi reveal ke sini
  stakeNum?: number      // stake XLM yg dikunci hunter saat claim
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
  { id: 'factoring', status: 'open',    reward: '500 XLM',   rewardNum: 500,  title: 'Factoring guard',  desc: 'Break the multiplication invariant without revealing the factors.',      victim: 'CA4F…9XQ2' },
  { id: 'overflow',  status: 'open',    reward: '750 XLM',   rewardNum: 750,  title: 'Overflow check',   desc: 'Trigger an arithmetic overflow the guard fails to catch.',              victim: 'CB18…7K4D' },
  { id: 'access',    status: 'claimed', reward: '1,200 XLM', rewardNum: 1200, title: 'Access bypass',    desc: 'Call a privileged path without the admin signature.',                   victim: 'CC93…0XR1' },
  { id: 'rounding',  status: 'open',    reward: '300 XLM',   rewardNum: 300,  title: 'Rounding drain',   desc: 'Drain value through repeated rounding in the fee math.',                victim: 'CD52…2M8F' },
  { id: 'reentry',   status: 'claimed', reward: '900 XLM',   rewardNum: 900,  title: 'Re-entrancy',      desc: "Re-enter settle() before balances update.",                             victim: 'CE77…1QP6' },
  { id: 'oracle',    status: 'open',    reward: '650 XLM',   rewardNum: 650,  title: 'Oracle skew',      desc: 'Push a price the bounds check should reject.',                          victim: 'CF04…9ZB3' },
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
  balance: 2450,
  claimed: {},
  form: {
    addr: '',
    imageId: '',
    title: '',
    description: '',
    reward: '',
    token: 'XLM',
    stake: '',
    revealWindow: '3600',  // detik; default 1 jam
    escapeWindow: '1800',  // detik; escape hatch kebuka 30 menit sebelum deadline
    creatorPubkey: '',
  },
  toast: null,
}
