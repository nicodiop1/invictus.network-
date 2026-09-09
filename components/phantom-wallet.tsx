'use client'

import { useCallback, useEffect, useState } from 'react'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Wallet, LogOut, Loader2, ExternalLink, Copy, Check } from 'lucide-react'

/**
 * Minimal shape of the Phantom provider we rely on. Phantom injects a much
 * larger object, but these are the members we actually use.
 */
type PhantomProvider = {
  isPhantom?: boolean
  publicKey?: { toString(): string } | null
  isConnected?: boolean
  connect: (opts?: {
    onlyIfTrusted?: boolean
  }) => Promise<{ publicKey: { toString(): string } }>
  disconnect: () => Promise<void>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void
}

type SolanaWindow = Window & {
  phantom?: { solana?: PhantomProvider }
  solana?: PhantomProvider
}

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com'

/**
 * Resolve the Phantom provider client-side only, preferring the modern
 * `window.phantom.solana` namespace and falling back to legacy `window.solana`.
 */
function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null

  const w = window as SolanaWindow
  const fromNamespace = w.phantom?.solana
  if (fromNamespace?.isPhantom) {
    console.log('[v0] Phantom detected via window.phantom.solana')
    return fromNamespace
  }

  const legacy = w.solana
  if (legacy?.isPhantom) {
    console.log('[v0] Phantom detected via window.solana fallback')
    return legacy
  }

  console.log('[v0] Phantom provider not found on window')
  return null
}

function shorten(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function PhantomWallet() {
  const [mounted, setMounted] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [registered, setRegistered] = useState(false)

  // Detect the provider after mount so this never runs during SSR.
  useEffect(() => {
    setMounted(true)
    const provider = getPhantomProvider()
    setHasProvider(Boolean(provider))

    if (!provider) return

    // Silently restore a previously trusted connection.
    provider
      .connect({ onlyIfTrusted: true })
      .then((res) => {
        console.log('[v0] Restored trusted connection')
        setAddress(res.publicKey.toString())
      })
      .catch(() => {
        // Not previously trusted — expected, no action needed.
      })

    const handleDisconnect = () => {
      console.log('[v0] Phantom disconnect event')
      setAddress(null)
      setBalance(null)
      setRegistered(false)
    }
    provider.on?.('disconnect', handleDisconnect)
    return () => provider.removeListener?.('disconnect', handleDisconnect)
  }, [])

  // Load SOL balance whenever the connected address changes.
  useEffect(() => {
    if (!address) {
      setBalance(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed')
        const lamports = await connection.getBalance(new PublicKey(address))
        if (!cancelled) {
          setBalance(lamports / LAMPORTS_PER_SOL)
          console.log('[v0] Balance loaded:', lamports / LAMPORTS_PER_SOL)
        }
      } catch (err) {
        console.log('[v0] Failed to load balance:', err)
        if (!cancelled) setBalance(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address])

  // Register the address with the backend once connected.
  useEffect(() => {
    if (!address || registered) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/wallet/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        const data = await res.json()
        console.log('[v0] /api/wallet/register response:', data)
        if (!cancelled && data?.ok) setRegistered(true)
      } catch (err) {
        console.log('[v0] Failed to register wallet:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address, registered])

  const connect = useCallback(async () => {
    setError(null)
    const provider = getPhantomProvider()
    if (!provider) {
      setError('Phantom not detected. Install it, then reload this page.')
      window.open('https://phantom.app/download', '_blank', 'noopener')
      return
    }
    try {
      setConnecting(true)
      const res = await provider.connect()
      const pk = res.publicKey.toString()
      console.log('[v0] Connected:', pk)
      setAddress(pk)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connection request rejected.'
      console.log('[v0] Connect error:', message)
      setError(message)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider()
    try {
      await provider?.disconnect()
    } catch (err) {
      console.log('[v0] Disconnect error:', err)
    }
    setAddress(null)
    setBalance(null)
    setRegistered(false)
  }, [])

  const copyAddress = useCallback(async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [address])

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  if (!mounted) {
    return (
      <Button size="lg" disabled className="min-w-56">
        <Wallet className="size-4" />
        Connect Phantom
      </Button>
    )
  }

  if (address) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Connected
          </span>
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            {registered ? 'Registered' : 'Registering…'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Address
            </span>
            <span className="font-mono text-lg text-foreground">
              {shorten(address)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Balance
            </span>
            <span className="font-mono text-lg text-foreground">
              {balance === null ? '—' : `${balance.toFixed(4)} SOL`}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={copyAddress}
            className="flex-1"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy address'}
          </Button>
          <a
            href={`https://explorer.solana.com/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'flex-1',
            )}
          >
            <ExternalLink className="size-4" />
            Explorer
          </a>
          <Button variant="ghost" size="sm" onClick={disconnect}>
            <LogOut className="size-4" />
            <span className="sr-only sm:not-sr-only">Disconnect</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        onClick={connect}
        disabled={connecting}
        className="min-w-56"
      >
        {connecting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Wallet className="size-4" />
        )}
        {connecting ? 'Requesting…' : 'Connect Phantom'}
      </Button>
      {!hasProvider && (
        <p className="text-xs text-muted-foreground">
          Phantom not detected — you&apos;ll be sent to install it.
        </p>
      )}
      {error && (
        <p className="max-w-xs text-center text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
