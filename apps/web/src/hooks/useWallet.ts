'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { connect as libConnect, connectWith as libConnectWith, getConnected, sign as fSign, disconnectWallet, type WalletInfo } from '@/lib/wallet'
import { getXlmBalance } from '@/lib/stellar'

export type WalletStatus = 'idle' | 'connecting' | 'connected'

export type UseWallet = {
  status: WalletStatus
  address: string | null
  network: string | null
  balance: number
  error: string | null
  connect: () => Promise<WalletInfo>
  connectWith: (id: string) => Promise<WalletInfo>
  disconnect: () => void
  refreshBalance: () => void
  sign: (xdr: string, passphrase: string) => Promise<string>
}

export function useWallet(): UseWallet {
  const [status, setStatus] = useState<WalletStatus>('idle')
  const [info, setInfo] = useState<WalletInfo | null>(null)
  const [balance, setBalance] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const loadBalance = useCallback(async (addr: string) => {
    const bal = await getXlmBalance(addr)
    if (mounted.current) setBalance(bal)
  }, [])

  // re-attach on mount if the site is already authorised
  useEffect(() => {
    mounted.current = true
    getConnected().then((w) => {
      if (!mounted.current || !w) return
      setInfo(w)
      setStatus('connected')
      loadBalance(w.address)
    })
    return () => { mounted.current = false }
  }, [loadBalance])

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
        setError(e instanceof Error ? e.message : 'Failed to connect wallet.')
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
        setError(e instanceof Error ? e.message : 'Failed to connect wallet.')
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
    sign: fSign,
  }
}
