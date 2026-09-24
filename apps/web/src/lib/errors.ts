import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

const REVERT_MESSAGES: Record<string, string> = {
  InvalidVictim: 'Victim contract address is invalid.',
  InvalidImageId: 'vkHash must be a non-zero 32-byte value.',
  InvalidReward: 'Reward must be greater than zero.',
  InvalidWindow: 'Reveal and escape windows are inconsistent with the stake.',
  InvalidExpiry: 'Expiry must be in the future.',
  EmptyTitle: 'Title is empty, or title/description is too long.',
  WrongNativeValue: 'Sent BNB does not match the required amount.',
  UnsupportedFeeToken: 'This reward token is not supported.',
  BountyNotFound: 'Bounty not found.',
  BountyNotOpen: 'This bounty is no longer open.',
  BountyExpired: 'This bounty has expired.',
  BountyNotExpired: 'This bounty has not expired yet.',
  NotCreator: 'Only the bounty creator can do this.',
  NotHunter: 'Only the hunter who claimed this bounty can do this.',
  InvalidJournal: 'Proof is not valid for this bounty.',
  InvalidReveal: 'Reveal does not match the proof fingerprint.',
  EscapeWindowClosed: 'The escape window is not open.',
  RevealDeadlineOpen: 'The reveal deadline has not passed yet.',
  StakeAlreadyResolved: 'The stake for this bounty is already resolved.',
  NoStake: 'This bounty has no stake.',
  ReentrantCall: 'Transaction rejected by the contract.',
}

const MAX_LEN = 180

function clip(message: string) {
  const oneLine = message.split('\n')[0].trim()
  return oneLine.length > MAX_LEN ? `${oneLine.slice(0, MAX_LEN - 1)}…` : oneLine
}

/** Turn wallet/RPC/contract errors into a short, safe, user-facing message. */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = Number((error as { code?: number } | null)?.code)
  if (code === 4001) return 'Request rejected in your wallet.'
  if (code === -32002) return 'Your wallet already has a pending request. Open it to continue.'

  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return 'Request rejected in your wallet.'

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name && REVERT_MESSAGES[name]) return REVERT_MESSAGES[name]
      if (revert.reason) return clip(revert.reason)
      return 'Transaction reverted by the contract.'
    }

    const detail = `${error.shortMessage} ${error.details ?? ''}`.toLowerCase()
    if (detail.includes('insufficient funds')) return 'Not enough BNB to cover the amount plus gas.'
    if (detail.includes('user rejected') || detail.includes('user denied')) return 'Request rejected in your wallet.'
    if (detail.includes('chain') && detail.includes('mismatch')) return 'Switch your wallet to BSC Testnet and try again.'
    if (error.name === 'HttpRequestError' || error.name === 'TimeoutError') return 'Network error reaching BSC Testnet. Try again.'
    return clip(error.shortMessage || fallback)
  }

  if (error instanceof Error && error.message) return clip(error.message)
  return fallback
}
