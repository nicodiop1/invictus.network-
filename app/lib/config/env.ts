/**
 * Centralized environment configuration.
 *
 * This is the ONLY place environment variables should be read from. Never
 * read `process.env` directly elsewhere — import from here so every value
 * has one documented source of truth, a safe default, and a single place to
 * audit before enabling anything against real funds.
 */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value.trim().toLowerCase() === "true";
}

function num(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Public, client-safe configuration. Never place secrets here. */
export const publicEnv = {
  /** SPL mint address for the ONE token. Empty until deployed/configured. */
  oneMintAddress: process.env.NEXT_PUBLIC_ONE_MINT_ADDRESS ?? "",
  oneDecimals: num(process.env.NEXT_PUBLIC_ONE_DECIMALS, 9),
  oneSymbol: process.env.NEXT_PUBLIC_ONE_SYMBOL ?? "ONE",
  oneName: process.env.NEXT_PUBLIC_ONE_NAME ?? "Invictus ONE",

  /** Invictus-owned liquidity treasury (public key only). */
  invictusTreasuryAddress:
    process.env.NEXT_PUBLIC_INVICTUS_TREASURY_ADDRESS ?? "",

  /** Default cluster the app boots into. Defaults to devnet for safety. */
  defaultCluster: (process.env.NEXT_PUBLIC_DEFAULT_CLUSTER ??
    "devnet") as string,
} as const;

/** Server-only configuration. Never import this from a client component. */
export const serverEnv = {
  /**
   * Master safety switch. Live, funds-moving trade execution is refused by
   * the API unless this is explicitly "true". Quotes, simulation, and the
   * review UI keep working regardless so the product feels real in every
   * environment except real execution.
   */
  tradingLiveExecutionEnabled: bool(
    process.env.TRADING_LIVE_EXECUTION_ENABLED,
    false
  ),
  feeAccount: process.env.INVICTUS_FEE_ACCOUNT ?? "",

  /** Base58 secret key for the Invictus treasury signer (server-only, never logged). */
  treasurySecretKey: process.env.INVICTUS_TREASURY_SECRET_KEY ?? "",

  /** Comma-separated list of mainnet RPC endpoints, tried in order (failover). */
  mainnetRpcUrls: (
    process.env.SOLANA_MAINNET_RPC_URLS ?? "https://api.mainnet-beta.solana.com"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  devnetRpcUrls: (
    process.env.SOLANA_DEVNET_RPC_URLS ?? "https://api.devnet.solana.com"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /** Invictus-owned constant-product pool reserves, in whole units. 0 = no seeded liquidity. */
  invictusPoolSolReserve: num(process.env.INVICTUS_POOL_SOL_RESERVE, 0),
  invictusPoolOneReserve: num(process.env.INVICTUS_POOL_ONE_RESERVE, 0),

  /** Secret used to HMAC-sign quote tokens and session cookies. Required in production. */
  appSecret: process.env.APP_SECRET ?? "dev-insecure-secret-do-not-use-in-prod",

  /** Postgres connection string. When unset, a dev in-memory store is used. */
  databaseUrl: process.env.DATABASE_URL ?? "",

  /** SMS provider selection: "console" (dev, logs code) or "twilio". */
  smsProvider: (process.env.SMS_PROVIDER ?? "console") as "console" | "twilio",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",

  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;

export const INVICTUS_SPREAD_BPS = 100; // 1.00% — Invictus revenue, always disclosed pre-signature.

export function isProduction() {
  return serverEnv.nodeEnv === "production";
}
