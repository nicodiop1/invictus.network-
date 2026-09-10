"use client";

import { address, formatDecimalFixedPoint, lamportsToSol } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { publicEnv } from "../../lib/config/env";
import { useBalance } from "../../lib/hooks/use-balance";
import { useTokenBalance } from "../../lib/hooks/use-token-balance";

const solFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 5,
});

export function PortfolioCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const walletAddress = connected?.account.address;
  const { lamports, isLoading } = useBalance(
    walletAddress ? address(walletAddress) : undefined
  );
  const { balance: oneBalance, isLoading: isOneLoading } =
    useTokenBalance(walletAddress);

  return (
    <article className="rounded-2xl border border-border-low bg-card p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Portfolio
      </p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-border-low bg-cream/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>SOL</span>
            <span>Live RPC balance</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {isLoading
              ? "..."
              : lamports != null
                ? formatDecimalFixedPoint(solFormatter, lamportsToSol(lamports))
                : "-"}{" "}
            SOL
          </p>
        </div>
        <div className="rounded-xl border border-border-low bg-cream/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{publicEnv.oneSymbol}</span>
            <span>
              {publicEnv.oneMintAddress
                ? "Live Token-2022 balance"
                : "Awaiting mint"}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {isOneLoading ? "..." : (oneBalance?.uiAmountString ?? "0")}{" "}
            {publicEnv.oneSymbol}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Read from the connected wallet&apos;s Token-2022 accounts.
          </p>
        </div>
      </div>
    </article>
  );
}
