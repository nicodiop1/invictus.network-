import { NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'

export const runtime = 'nodejs'

type RegisterBody = {
  address?: unknown
}

/**
 * In-memory registry. This is intentionally ephemeral: it keeps the endpoint
 * functional without inventing a database/credentials. Swap for a real store
 * (Neon, Supabase, etc.) when persistence is required.
 */
const registered = new Set<string>()

function isValidSolanaAddress(address: string): boolean {
  try {
    // PublicKey throws if the base58 string is not a valid on-curve key.
    // eslint-disable-next-line no-new
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  let body: RegisterBody
  try {
    body = (await request.json()) as RegisterBody
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 },
    )
  }

  const address = typeof body.address === 'string' ? body.address.trim() : ''

  if (!address) {
    return NextResponse.json(
      { ok: false, error: 'Missing wallet address.' },
      { status: 400 },
    )
  }

  if (!isValidSolanaAddress(address)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid Solana address.' },
      { status: 422 },
    )
  }

  const alreadyRegistered = registered.has(address)
  registered.add(address)

  return NextResponse.json({
    ok: true,
    address,
    alreadyRegistered,
    registeredCount: registered.size,
  })
}

export async function GET() {
  return NextResponse.json({ ok: true, registeredCount: registered.size })
}
