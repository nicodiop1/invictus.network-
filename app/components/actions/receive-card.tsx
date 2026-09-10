"use client";

import { useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { ellipsify } from "../../lib/explorer";

export function ReceiveCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const [copied, setCopied] = useState(false);
  const walletAddress = connected?.account.address;

  async function copyAddress() {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="rounded-2xl border border-border-low bg-card p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Receive
      </p>
      <h2 className="mt-1 text-xl font-bold">Your wallet address</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Share this address to receive SOL or ONE directly. Invictus never takes
        custody.
      </p>
      <div className="mt-4 rounded-xl border border-border-low bg-cream/30 p-3">
        <p className="break-all font-mono text-xs text-foreground/80">
          {walletAddress ?? "Connect a wallet to reveal your address"}
        </p>
      </div>
      <button
        type="button"
        disabled={!walletAddress}
        onClick={copyAddress}
        className="mt-3 w-full cursor-pointer rounded-xl border border-border-low bg-background px-4 py-2.5 text-xs font-bold transition hover:bg-cream disabled:pointer-events-none disabled:opacity-50"
      >
        {copied
          ? "Copied address"
          : walletAddress
            ? `Copy ${ellipsify(walletAddress)}`
            : "Connect wallet"}
      </button>
    </article>
  );
}
