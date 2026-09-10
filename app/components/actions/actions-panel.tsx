"use client";

import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { AirdropCard } from "./airdrop-card";
import { TransferSolCard } from "./transfer-sol-card";
import { PortfolioCard } from "./portfolio-card";
import { ReceiveCard } from "./receive-card";
import { SwapCard } from "./swap-card";
import { TransferOneCard } from "./transfer-one-card";

export function ActionsPanel() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();

  if (!connected) {
    return (
      <div className="mt-8 rounded-2xl border border-border-low bg-card p-6 text-sm text-muted">
        Connect a wallet to try the on-chain actions.
      </div>
    );
  }

  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2">
      <PortfolioCard />
      <ReceiveCard />
      <SwapCard />
      {cluster !== "mainnet" && <AirdropCard />}
      <TransferSolCard />
      <TransferOneCard />
    </section>
  );
}
