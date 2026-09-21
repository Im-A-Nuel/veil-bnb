import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  encodeAbiParameters,
  erc20Abi,
  formatEther,
  http,
  isAddress,
  isHex,
  parseEther,
  parseUnits,
  zeroAddress,
  type Address,
  type Hex,
} from 'viem'
import { bsc, bscTestnet, foundry } from 'viem/chains'
import type { Bounty, Token } from './data'
import type { Reveal } from './reveal'
import { getActiveProvider } from './wallet'

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '97')
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-dataseed.bnbchain.org'
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://testnet.bscscan.com'
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '') as Address
export const USDT_ADDRESS = (process.env.NEXT_PUBLIC_USDT_ADDRESS || '') as Address
export const CONTRACTS_CONFIGURED = isAddress(REGISTRY_ADDRESS)

const chain = CHAIN_ID === 31337 ? foundry : CHAIN_ID === 56 ? bsc : bscTestnet
const publicClient = createPublicClient({ chain, transport: http(RPC_URL) })

const bountyComponents = [
  { name: 'creator', type: 'address' },
  { name: 'victim', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'rewardAmount', type: 'uint256' },
  { name: 'stakeAmount', type: 'uint256' },
  { name: 'imageId', type: 'bytes32' },
  { name: 'creatorPubkey', type: 'bytes32' },
  { name: 'fingerprint', type: 'bytes32' },
  { name: 'hunter', type: 'address' },
  { name: 'revealWindow', type: 'uint64' },
  { name: 'escapeWindow', type: 'uint64' },
  { name: 'expiresAt', type: 'uint64' },
  { name: 'claimedAt', type: 'uint64' },
  { name: 'status', type: 'uint8' },
  { name: 'revealed', type: 'bool' },
  { name: 'forfeited', type: 'bool' },
  { name: 'title', type: 'string' },
  { name: 'description', type: 'string' },
] as const

const createComponents = [
  { name: 'victim', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'rewardAmount', type: 'uint256' },
  { name: 'stakeAmount', type: 'uint256' },
  { name: 'imageId', type: 'bytes32' },
  { name: 'creatorPubkey', type: 'bytes32' },
  { name: 'revealWindow', type: 'uint64' },
  { name: 'escapeWindow', type: 'uint64' },
  { name: 'expiresAt', type: 'uint64' },
  { name: 'title', type: 'string' },
  { name: 'description', type: 'string' },
] as const

export const registryAbi = [
  { type: 'function', name: 'bountyCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getBounty', stateMutability: 'view', inputs: [{ name: 'bountyId', type: 'uint256' }], outputs: [{ name: 'bounty', type: 'tuple', components: bountyComponents }] },
  { type: 'function', name: 'createBounty', stateMutability: 'payable', inputs: [{ name: 'params', type: 'tuple', components: createComponents }], outputs: [{ name: 'bountyId', type: 'uint256' }] },
  { type: 'function', name: 'claim', stateMutability: 'payable', inputs: [{ name: 'bountyId', type: 'uint256' }, { name: 'journal', type: 'bytes' }, { name: 'seal', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'confirmReveal', stateMutability: 'nonpayable', inputs: [{ name: 'bountyId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'forfeitStake', stateMutability: 'nonpayable', inputs: [{ name: 'bountyId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'proveReveal', stateMutability: 'nonpayable', inputs: [{ name: 'bountyId', type: 'uint256' }, { name: 'revealPreimage', type: 'bytes' }], outputs: [] },
  {
    type: 'event', name: 'BountyCreated', anonymous: false,
    inputs: [
      { name: 'bountyId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'victim', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'rewardAmount', type: 'uint256', indexed: false },
      { name: 'imageId', type: 'bytes32', indexed: false },
    ],
  },
] as const

function requireRegistry() {
  if (!CONTRACTS_CONFIGURED) throw new Error('Set NEXT_PUBLIC_REGISTRY_ADDRESS before using on-chain mode.')
}

function asBytes32(value: string, label: string): Hex {
  const hex = value.startsWith('0x') ? value : `0x${value}`
  if (!isHex(hex, { strict: true }) || hex.length !== 66) throw new Error(`${label} must be exactly 32 bytes.`)
  return hex
}

function b64ToBytes32(value: string): Hex {
  const bytes = Uint8Array.from(atob(value.trim()), (character) => character.charCodeAt(0))
  if (bytes.length !== 32) throw new Error('Creator reveal public key must be exactly 32 bytes.')
  return `0x${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function bytes32ToB64(value: Hex) {
  const bytes = value.slice(2).match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
  return btoa(String.fromCharCode(...bytes))
}

async function walletClient(account: Address) {
  return createWalletClient({ account, chain, transport: custom(await getActiveProvider()) })
}

async function approveIfNeeded(token: Address, account: Address, amount: bigint) {
  if (token === zeroAddress || amount === BigInt(0)) return
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, REGISTRY_ADDRESS],
  })
  if (allowance >= amount) return
  const client = await walletClient(account)
  const hash = await client.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [REGISTRY_ADDRESS, amount],
  })
  await publicClient.waitForTransactionReceipt({ hash })
}

export async function getNativeBalance(address: Address) {
  return Number(formatEther(await publicClient.getBalance({ address })))
}

export async function listBounties(): Promise<Bounty[]> {
  requireRegistry()
  const count = await publicClient.readContract({ address: REGISTRY_ADDRESS, abi: registryAbi, functionName: 'bountyCount' })
  const records = await Promise.all(
    Array.from({ length: Number(count) }, (_, id) => publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: registryAbi,
      functionName: 'getBounty',
      args: [BigInt(id)],
    })),
  )

  return records.map((record, id) => {
    const token = record.token === zeroAddress ? 'BNB' : 'USDT'
    const rewardNum = Number(formatEther(record.rewardAmount))
    return {
      id: String(id),
      status: Number(record.status) === 0 ? 'open' : Number(record.status) === 1 ? 'claimed' : 'refunded',
      reward: `${rewardNum.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${token}`,
      rewardNum,
      tokenSymbol: token,
      title: record.title,
      desc: record.description,
      victim: shortAddress(record.victim),
      victimFull: record.victim,
      creator: record.creator,
      claimer: record.hunter === zeroAddress ? null : record.hunter,
      creatorPubkey: bytes32ToB64(record.creatorPubkey),
      stakeNum: Number(formatEther(record.stakeAmount)),
      revealWindow: Number(record.revealWindow),
      escapeWindow: Number(record.escapeWindow),
      fingerprintHex: record.fingerprint === `0x${'0'.repeat(64)}` ? undefined : record.fingerprint,
      claimTime: Number(record.claimedAt),
      revealed: record.revealed,
      forfeited: record.forfeited,
    }
  })
}

export async function createBounty(input: {
  account: Address
  victim: string
  imageId: string
  creatorPubkey: string
  title: string
  description: string
  reward: string
  stake: string
  token: Token
  revealWindow: number
  escapeWindow: number
}) {
  requireRegistry()
  if (!isAddress(input.victim)) throw new Error('Victim contract must be a valid EVM address.')
  const reward = input.token === 'BNB' ? parseEther(input.reward) : parseUnits(input.reward, 18)
  const stake = input.token === 'BNB' ? parseEther(input.stake || '0') : parseUnits(input.stake || '0', 18)
  const token = input.token === 'BNB' ? zeroAddress : USDT_ADDRESS
  if (input.token === 'USDT' && !isAddress(token)) throw new Error('Set NEXT_PUBLIC_USDT_ADDRESS to use USDT bounties.')
  await approveIfNeeded(token, input.account, reward)

  const client = await walletClient(input.account)
  const hash = await client.writeContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: 'createBounty',
    args: [{
      victim: input.victim,
      token,
      rewardAmount: reward,
      stakeAmount: stake,
      imageId: asBytes32(input.imageId, 'ImageID'),
      creatorPubkey: b64ToBytes32(input.creatorPubkey),
      revealWindow: BigInt(input.stake && Number(input.stake) > 0 ? input.revealWindow : 0),
      escapeWindow: BigInt(input.stake && Number(input.stake) > 0 ? input.escapeWindow : 0),
      expiresAt: BigInt(0),
      title: input.title,
      description: input.description,
    }],
    value: token === zeroAddress ? reward : BigInt(0),
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: registryAbi, data: log.data, topics: log.topics })
      if (decoded.eventName === 'BountyCreated') return { bountyId: decoded.args.bountyId, hash }
    } catch { /* another contract's event */ }
  }
  throw new Error('Bounty transaction succeeded but its creation event was not found.')
}

export async function claim(bountyId: number, account: Address, journal: Hex, seal: Hex) {
  requireRegistry()
  const bounty = await publicClient.readContract({ address: REGISTRY_ADDRESS, abi: registryAbi, functionName: 'getBounty', args: [BigInt(bountyId)] })
  await approveIfNeeded(bounty.token, account, bounty.stakeAmount)
  const client = await walletClient(account)
  const hash = await client.writeContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: 'claim',
    args: [BigInt(bountyId), journal, seal],
    value: bounty.token === zeroAddress ? bounty.stakeAmount : BigInt(0),
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

export async function confirmReveal(bountyId: number, account: Address) {
  return writeSimple('confirmReveal', bountyId, account)
}

export async function forfeitStake(bountyId: number, account: Address) {
  return writeSimple('forfeitStake', bountyId, account)
}

export async function proveReveal(bountyId: number, account: Address, reveal: Reveal) {
  requireRegistry()
  const preimage = encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' }],
    [BigInt(reveal.a), BigInt(reveal.b), asBytes32(reveal.salt, 'Salt')],
  )
  const client = await walletClient(account)
  const hash = await client.writeContract({ address: REGISTRY_ADDRESS, abi: registryAbi, functionName: 'proveReveal', args: [BigInt(bountyId), preimage] })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

async function writeSimple(functionName: 'confirmReveal' | 'forfeitStake', bountyId: number, account: Address) {
  requireRegistry()
  const client = await walletClient(account)
  const hash = await client.writeContract({ address: REGISTRY_ADDRESS, abi: registryAbi, functionName, args: [BigInt(bountyId)] })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

export function asHex(value: string): Hex {
  if (!isHex(value, { strict: true })) throw new Error('Expected a 0x-prefixed hex value.')
  return value
}

export function explorerTxUrl(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`
}

export function explorerAddressUrl(address: string) {
  return `${EXPLORER_URL}/address/${address}`
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
