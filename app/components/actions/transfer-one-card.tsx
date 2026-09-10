"use client";

import { address, type Address } from "@solana/kit";
import { useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { toast } from "sonner";
import { useAppClient } from "../../lib/client-provider";
import { publicEnv } from "../../lib/config/env";
import { useSend } from "../../lib/hooks/use-send";
import { useCluster } from "../cluster-context";

const TOKEN_2022_PROGRAM = address(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

function toBaseUnits(value: string, decimals: number): bigint {
  const [whole, fraction = ""] = value.trim().split(".");
  if (
    !/^\d+$/.test(whole) ||
    fraction.length > decimals ||
    !/^\d*$/.test(fraction)
  ) {
    throw new Error("Invalid ONE amount");
  }
  return BigInt(`${whole}${fraction.padEnd(decimals, "0")}`);
}

export function TransferOneCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();
  const { run, isSending } = useSend();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");

  async function handleTransfer() {
    if (
      !connected?.signer ||
      !publicEnv.oneMintAddress ||
      cluster !== "mainnet"
    )
      return;
    let destination: Address;
    try {
      destination = address(recipient);
      const rawAmount = toBaseUnits(amount, publicEnv.oneDecimals);
      if (rawAmount <= 0n) throw new Error("Amount must be greater than zero");
      await run(
        () =>
          client.token.instructions
            .transferToATA(
              {
                mint: address(publicEnv.oneMintAddress),
                authority: connected.signer!,
                recipient: destination,
                amount: rawAmount,
                decimals: publicEnv.oneDecimals,
              },
              { tokenProgram: TOKEN_2022_PROGRAM }
            )
            .sendTransaction(),
        "ONE transfer sent"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid transfer");
    }
  }

  return (
    <article className="rounded-2xl border border-border-low bg-card p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Send ONE
      </p>
      <p className="mt-1 text-sm leading-6 text-muted">
        Transfer the verified Token-2022 asset to a wallet address. The
        recipient account is created when needed.
      </p>
      <div className="mt-4 space-y-3">
        <input
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          placeholder="Recipient wallet address"
          className="w-full rounded-xl border border-border-low bg-background px-3 py-2 font-mono text-xs outline-none focus:border-ring"
        />
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder={`Amount (${publicEnv.oneSymbol})`}
          className="w-full rounded-xl border border-border-low bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <button
          type="button"
          onClick={handleTransfer}
          disabled={
            isSending ||
            !recipient ||
            cluster !== "mainnet" ||
            !connected?.signer
          }
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSending ? "Sending..." : "Send ONE"}
        </button>
      </div>
      {cluster !== "mainnet" && (
        <p className="mt-3 text-xs text-muted">
          Switch to mainnet to send ONE.
        </p>
      )}
    </article>
  );
}
