import type { EIP1193Provider } from 'viem'

export type WalletInfo = {
  address: `0x${string}`
  network: string
  chainId: number
}

export type WalletOption = {
  id: string
  name: string
  icon: string
  isAvailable: boolean
  url: string
}

type AnnouncedProvider = {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: EIP1193Provider
}

type EthereumWindow = Window & typeof globalThis & { ethereum?: EIP1193Provider }

const providers = new Map<string, EIP1193Provider>()
let activeProvider: EIP1193Provider | null = null

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '97')
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-dataseed.bnbchain.org'
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://testnet.bscscan.com'

const walletIcon = (label: string, color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="${color}"/><text x="20" y="25" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#fff">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function chainName(id: number) {
  if (id === 97) return 'BSC Testnet'
  if (id === 56) return 'BSC Mainnet'
  if (id === 31337) return 'Anvil'
  return `Chain ${id}`
}

async function ensureTargetChain(provider: EIP1193Provider) {
  const current = Number(await provider.request({ method: 'eth_chainId' }))
  if (current === chainId) return

  const hexId = `0x${chainId.toString(16)}`
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] })
  } catch (error) {
    const code = Number((error as { code?: number })?.code)
    if (code !== 4902) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: hexId,
        chainName: chainName(chainId),
        nativeCurrency: {
          name: chainId === 31337 ? 'Anvil Ether' : 'BNB',
          symbol: chainId === 31337 ? 'ETH' : chainId === 97 ? 'tBNB' : 'BNB',
          decimals: 18,
        },
        rpcUrls: [rpcUrl],
        blockExplorerUrls: chainId === 31337 ? [] : [explorerUrl],
      }],
    })
  }
}

export async function listWallets(): Promise<WalletOption[]> {
  if (typeof window === 'undefined') return []
  const discovered = new Map<string, AnnouncedProvider>()
  const receive = (event: Event) => {
    const detail = (event as CustomEvent<AnnouncedProvider>).detail
    if (detail?.info?.uuid && detail.provider) discovered.set(detail.info.uuid, detail)
  }

  window.addEventListener('eip6963:announceProvider', receive)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  await new Promise((resolve) => setTimeout(resolve, 120))
  window.removeEventListener('eip6963:announceProvider', receive)

  const options: WalletOption[] = []
  for (const { info, provider } of discovered.values()) {
    providers.set(info.uuid, provider)
    options.push({ id: info.uuid, name: info.name, icon: info.icon, isAvailable: true, url: '' })
  }

  const injected = (window as EthereumWindow).ethereum
  if (injected && options.length === 0) {
    providers.set('injected', injected)
    options.push({ id: 'injected', name: 'Browser wallet', icon: walletIcon('W', '#1b6f54'), isAvailable: true, url: '' })
  }

  if (options.length === 0) {
    options.push(
      { id: 'metamask', name: 'MetaMask', icon: walletIcon('M', '#e2761b'), isAvailable: false, url: 'https://metamask.io/download/' },
      { id: 'binance', name: 'Binance Wallet', icon: walletIcon('B', '#f0b90b'), isAvailable: false, url: 'https://www.binance.com/en/web3wallet' },
    )
  }
  return options
}

export async function connectWith(id: string): Promise<WalletInfo> {
  if (!providers.has(id)) await listWallets()
  const provider = providers.get(id)
  if (!provider) throw new Error('Wallet provider is no longer available.')

  await ensureTargetChain(provider)
  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
  const address = accounts?.[0] as `0x${string}` | undefined
  if (!address) throw new Error('The wallet did not return an account.')
  activeProvider = provider
  return { address, network: chainName(chainId), chainId }
}

export async function connect(): Promise<WalletInfo> {
  const wallets = await listWallets()
  const available = wallets.find((wallet) => wallet.isAvailable)
  if (!available) throw new Error('Install an EVM wallet such as MetaMask or Binance Wallet first.')
  return connectWith(available.id)
}

export async function getConnected(): Promise<WalletInfo | null> {
  const wallets = await listWallets()
  for (const wallet of wallets.filter((item) => item.isAvailable)) {
    const provider = providers.get(wallet.id)
    if (!provider) continue
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
    if (accounts?.[0]) {
      activeProvider = provider
      const currentChain = Number(await provider.request({ method: 'eth_chainId' }))
      return { address: accounts[0] as `0x${string}`, network: chainName(currentChain), chainId: currentChain }
    }
  }
  return null
}

export async function getActiveProvider(): Promise<EIP1193Provider> {
  if (activeProvider) {
    await ensureTargetChain(activeProvider)
    return activeProvider
  }
  await connect()
  if (!activeProvider) throw new Error('Connect an EVM wallet first.')
  return activeProvider
}

export function disconnectWallet() {
  activeProvider = null
}

export function shortAddr(address: string) {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
