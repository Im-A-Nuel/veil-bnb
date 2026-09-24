'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { connect as libConnect, connectWith as libConnectWith, getConnected, disconnectWallet, watchActiveWallet, chainLabel, type WalletInfo } from '@/lib/wallet'
import { getNativeBalance } from '@/lib/chain'
import { friendlyError } from '@/lib/errors'

export type WalletStatus = 'idle' | 'connecting' | 'connected'

export type UseWallet = {
  status: WalletStatus
  address: `0x${string}` | null
  network: string | null
  balance: number
  error: string | null
  connect: () => Promise<WalletInfo>
  connectWith: (id: string) => Promise<WalletInfo>
  disconnect: () => void
  refreshBalance: () => void
}

export function useWallet(): UseWallet {
  const [status, setStatus] = useState<WalletStatus>('idle')
  const [info, setInfo] = useState<WalletInfo | null>(null)
  const [balance, setBalance] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const loadBalance = useCallback(async (addr: `0x${string}`) => {
    try {
      const bal = await getNativeBalance(addr)
      if (mounted.current) setBalance(bal)
    } catch { /* keep last known balance; RPC may be briefly unavailable */ }
  }, [])

  // re-attach on mount if the site is already authorised
  useEffect(() => {
    mounted.current = true
    getConnected().then((w) => {
      if (!mounted.current || !w) return
      setInfo(w)
      setStatus('connected')
      loadBalance(w.address)
    }).catch(() => { /* wallet locked or unavailable: stay disconnected */ })
    return () => { mounted.current = false }
  }, [loadBalance])

  // keep UI in sync when the user switches account/network inside the wallet
  const connected = status === 'connected'
  useEffect(() => {
    if (!connected) return
    return watchActiveWallet({
      onAccounts: (accounts) => {
        const next = accounts[0] as `0x${string}` | undefined
        if (!next) {
          disconnectWallet()
          setInfo(null)
          setStatus('idle')
          setBalance(0)
          return
        }
        setInfo((prev) => (prev ? { ...prev, address: next } : prev))
        loadBalance(next)
      },
      onChain: (id) => {
        setInfo((prev) => (prev ? { ...prev, chainId: id, network: chainLabel(id) } : prev))
      },
    })
  }, [connected, loadBalance])

  const connectWith = useCallback(async (id: string) => {
    setError(null)
    setStatus('connecting')
    try {
      const w = await libConnectWith(id)
      if (mounted.current) {
        setInfo(w)
        setStatus('connected')
        loadBalance(w.address)
      }
      return w
    } catch (e) {
      if (mounted.current) {
        setStatus('idle')
        setError(friendlyError(e, 'Failed to connect wallet.'))
      }
      throw e
    }
  }, [loadBalance])

  const connect = useCallback(async () => {
    setError(null)
    setStatus('connecting')
    try {
      const w = await libConnect()
      if (mounted.current) {
        setInfo(w)
        setStatus('connected')
        loadBalance(w.address)
      }
      return w
    } catch (e) {
      if (mounted.current) {
        setStatus('idle')
        setError(friendlyError(e, 'Failed to connect wallet.'))
      }
      throw e
    }
  }, [loadBalance])

  const disconnect = useCallback(() => {
    disconnectWallet()
    setInfo(null)
    setStatus('idle')
    setBalance(0)
    setError(null)
  }, [])

  const refreshBalance = useCallback(() => {
    if (info?.address) loadBalance(info.address)
  }, [info, loadBalance])

  return {
    status,
    address: info?.address ?? null,
    network: info?.network ?? null,
    balance,
    error,
    connect,
    connectWith,
    disconnect,
    refreshBalance,
  }
}
