"use client";

import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useSignTransaction } from "@solana/react";
import { useState } from "react";
import { publicEnv } from "../../lib/config/env";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SPREAD_BPS = 100n;
const BPS = 10_000n;

type Quote = {
  inAmount: string;
  outAmount: string;
  priceImpactPct?: string;
  routePlan?: unknown[];
  liveExecutionEnabled?: boolean;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function formatUnits(value: bigint, decimals: number) {
  const whole = value / 10n ** BigInt(decimals);
  const fraction = (value % 10n ** BigInt(decimals))
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function SwapCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const signTransaction = useSignTransaction(
    connected?.account as NonNullable<typeof connected>["account"],
    "solana:mainnet"
  );
  const { cluster } = useCluster();
  const [direction, setDirection] = useState<"solToOne" | "oneToSol">(
    "solToOne"
  );
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "simulated" | "signing" | "submitting" | "success"
  >("idle");
  const [signature, setSignature] = useState<string | null>(null);

  const configured = Boolean(publicEnv.oneMintAddress);
  const isMainnet = cluster === "mainnet";
  const inputDecimals = direction === "solToOne" ? 9 : publicEnv.oneDecimals;
  const outputDecimals = direction === "solToOne" ? publicEnv.oneDecimals : 9;
  const inputMint =
    direction === "solToOne" ? SOL_MINT : publicEnv.oneMintAddress;
  const outputMint =
    direction === "solToOne" ? publicEnv.oneMintAddress : SOL_MINT;

  async function getQuote() {
    setError(null);
    setQuote(null);
    setSignature(null);
    setPhase("idle");
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!isMainnet) {
      setError("Switch to mainnet to request a production liquidity quote.");
      return;
    }
    if (!configured) {
      setError(
        "ONE mint configuration is required before live quotes are available."
      );
      return;
    }

    const [whole, fraction = ""] = amount.split(".");
    if (fraction.length > inputDecimals) {
      setError(`Use no more than ${inputDecimals} decimal places.`);
      return;
    }
    const rawAmount = `${whole}${fraction.padEnd(inputDecimals, "0")}`.replace(
      /^0+(?=\d)/,
      ""
    );

    setLoading(true);
    try {
      const response = await fetch(
        `/api/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}`
      );
      const body = (await response.json()) as Quote & { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "Unable to fetch a quote.");
      setQuote(body);
    } catch (quoteError) {
      setError(
        quoteError instanceof Error
          ? quoteError.message
          : "Unable to fetch a quote."
      );
    } finally {
      setLoading(false);
    }
  }

  async function simulateAndSign() {
    if (!quote || !connected?.account || !connected.signer) return;
    setError(null);
    setLoading(true);
    try {
      const buildResponse = await fetch("/api/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: connected.account.address,
        }),
      });
      const built = (await buildResponse.json()) as {
        swapTransaction?: string;
        liveExecutionEnabled?: boolean;
        error?: string;
      };
      if (!buildResponse.ok || !built.swapTransaction) {
        throw new Error(built.error ?? "Unable to build the swap transaction.");
      }

      const unsigned = base64ToBytes(built.swapTransaction);
      const simulation = await client.rpc
        .simulateTransaction(built.swapTransaction as never, {
          encoding: "base64",
          sigVerify: false,
          replaceRecentBlockhash: true,
        })
        .send();
      if (simulation.value.err) {
        throw new Error("Swap simulation failed before wallet signing.");
      }
      setPhase("simulated");
      if (!built.liveExecutionEnabled) return;

      setPhase("signing");
      const signed = await signTransaction({ transaction: unsigned });
      setPhase("submitting");
      const submitResponse = await fetch("/api/swap/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          signedTransaction: bytesToBase64(signed.signedTransaction),
        }),
      });
      const submitted = (await submitResponse.json()) as {
        signature?: string;
        error?: string;
      };
      if (!submitResponse.ok || !submitted.signature) {
        throw new Error(submitted.error ?? "Swap submission failed.");
      }
      setSignature(submitted.signature);
      setPhase("success");
    } catch (swapError) {
      setError(swapError instanceof Error ? swapError.message : "Swap failed.");
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }

  const grossOutput = quote ? BigInt(quote.outAmount) : null;
  const spread = grossOutput ? (grossOutput * SPREAD_BPS) / BPS : null;
  const netOutput = grossOutput && spread ? grossOutput - spread : null;

  return (
    <article className="rounded-2xl border border-border-low bg-card p-5 shadow-sm sm:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Swap
          </p>
          <h2 className="mt-1 text-xl font-bold">
            SOL ↔ {publicEnv.oneSymbol}
          </h2>
        </div>
        <span className="rounded-full border border-border-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Mainnet quote
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="block text-xs font-medium text-muted">
          You send
          <div className="mt-2 flex rounded-xl border border-input bg-background p-1">
            <input
              aria-label="Swap amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-foreground outline-none"
            />
            <span className="px-3 py-2 font-bold text-foreground">
              {direction === "solToOne" ? "SOL" : publicEnv.oneSymbol}
            </span>
          </div>
        </label>
        <button
          type="button"
          aria-label="Reverse swap direction"
          onClick={() => {
            setDirection((current) =>
              current === "solToOne" ? "oneToSol" : "solToOne"
            );
            setQuote(null);
            setError(null);
          }}
          className="mx-auto flex size-10 cursor-pointer items-center justify-center rounded-full border border-border-low bg-cream text-lg transition hover:bg-accent"
        >
          ↕
        </button>
        <div className="rounded-xl border border-border-low bg-cream/40 px-4 py-3 text-sm">
          <p className="text-xs text-muted">You receive</p>
          <p className="mt-1 font-bold tabular-nums">
            {netOutput != null ? formatUnits(netOutput, outputDecimals) : "—"}{" "}
            {direction === "solToOne" ? publicEnv.oneSymbol : "SOL"}
          </p>
        </div>
      </div>

      {quote && netOutput != null && spread != null && (
        <div className="mt-4 grid gap-2 rounded-xl border border-border-low bg-cream/30 p-4 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted">Market output</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatUnits(grossOutput!, outputDecimals)}{" "}
              {direction === "solToOne" ? publicEnv.oneSymbol : "SOL"}
            </p>
          </div>
          <div>
            <p className="text-muted">Invictus spread</p>
            <p className="mt-1 font-semibold">1.00% calculated</p>
          </div>
          <div>
            <p className="text-muted">Price impact</p>
            <p className="mt-1 font-semibold">{quote.priceImpactPct ?? "—"}%</p>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {phase === "simulated" && (
        <p className="mt-3 rounded-xl border border-border-low bg-cream/30 p-3 text-xs text-muted">
          Simulation passed. Live execution is disabled until the verified fee
          account and production validation are configured.
        </p>
      )}
      {phase === "success" && signature && (
        <p className="mt-3 text-xs text-green-600">
          Swap confirmed: {signature}
        </p>
      )}
      {!connected?.signer && connected && (
        <p className="mt-3 text-xs text-destructive">
          This wallet is read-only and cannot sign swaps.
        </p>
      )}
      <button
        type="button"
        onClick={quote ? simulateAndSign : getQuote}
        disabled={
          loading ||
          !connected ||
          !configured ||
          !connected.signer ||
          !isMainnet
        }
        className="mt-4 w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading
          ? phase === "signing"
            ? "Confirm in wallet..."
            : phase === "submitting"
              ? "Confirming swap..."
              : quote
                ? "Simulating swap..."
                : "Fetching live quote..."
          : quote
            ? "Simulate and review"
            : "Review live quote"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-5 text-muted">
        Quotes are fetched from Jupiter on Solana mainnet. The 1% Invictus
        spread is shown before signing; collection stays disabled until a
        verified fee account is configured.
      </p>
    </article>
  );
}
